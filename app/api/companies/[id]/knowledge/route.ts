import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requireMembership } from "@/lib/access";
import { canMutate } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { processKnowledgeItem } from "@/lib/knowledge-processor";
import { z } from "zod";

const createSchema = z.object({
  type: z.enum(["link", "text", "file"]),
  title: z.string().optional(),
  sourceUrl: z.string().optional(),
  rawText: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await requireMembership(user.userId, id);

  const items = await prisma.knowledgeItem.findMany({
    where: { companyId: id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { chunks: true } } },
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const membership = await requireMembership(user.userId, id);
  if (!canMutate(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { type, title, sourceUrl, rawText } = parsed.data;

  const item = await prisma.knowledgeItem.create({
    data: {
      companyId: id,
      type,
      title: title || (type === "link" ? sourceUrl : "Без названия"),
      sourceUrl,
      rawText,
      status: "pending",
    },
  });

  // Process asynchronously to avoid blocking the request
  processKnowledgeItem(item.id).catch(console.error);

  await prisma.activityEvent.create({
    data: {
      companyId: id,
      userId: user.userId,
      type: "knowledge_added",
      payload: { itemId: item.id, type },
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const membership = await requireMembership(user.userId, id);
  if (!canMutate(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  await prisma.knowledgeItem.deleteMany({
    where: { id: itemId, companyId: id },
  });

  return NextResponse.json({ ok: true });
}
