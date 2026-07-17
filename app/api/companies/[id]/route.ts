import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/access";
import { canMutate } from "@/lib/permissions";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  industry: z.string().min(1).optional(),
  city: z.string().optional(),
  description: z.string().optional(),
  services: z.string().optional(),
  usp: z.string().optional(),
  audience: z.string().optional(),
  competitors: z.string().optional(),
  goals: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await requireMembership(user.userId, id);

  const company = await prisma.company.findUnique({
    where: { id },
    include: { channels: true, memberships: { include: { user: true } } },
  });

  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ company });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const membership = await requireMembership(user.userId, id);
  if (!canMutate(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const data = parsed.data;
  const company = await prisma.company.update({
    where: { id },
    data: {
      ...data,
      goals: data.goals ? (data.goals as any) : undefined,
    },
  });

  return NextResponse.json({ company });
}
