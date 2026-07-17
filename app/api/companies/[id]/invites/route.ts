import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requireMembership } from "@/lib/access";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { z } from "zod";

const createSchema = z.object({
  role: z.enum(["marketer", "owner"]),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const membership = await requireMembership(user.userId, id);
  if (!hasPermission(membership.role, "manage_team")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invites = await prisma.invite.findMany({
    where: { companyId: id, status: "active" },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ invites });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const membership = await requireMembership(user.userId, id);
  if (!hasPermission(membership.role, "manage_team")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invite = await prisma.invite.create({
    data: {
      companyId: id,
      token,
      role: parsed.data.role,
      createdById: user.userId,
      expiresAt,
    },
  });

  return NextResponse.json({ invite });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const membership = await requireMembership(user.userId, id);
  if (!hasPermission(membership.role, "manage_team")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const inviteId = searchParams.get("inviteId");
  if (!inviteId) return NextResponse.json({ error: "inviteId required" }, { status: 400 });

  await prisma.invite.updateMany({
    where: { id: inviteId, companyId: id },
    data: { status: "revoked" },
  });

  return NextResponse.json({ ok: true });
}
