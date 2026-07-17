import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await prisma.invite.findUnique({ where: { token }, include: { company: true } });

  if (!invite || invite.status !== "active" || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invite invalid or expired" }, { status: 400 });
  }

  return NextResponse.json({ invite: { company: invite.company, role: invite.role } });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await params;
  const invite = await prisma.invite.findUnique({ where: { token }, include: { company: true } });

  if (!invite || invite.status !== "active" || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invite invalid or expired" }, { status: 400 });
  }

  const existing = await prisma.membership.findUnique({
    where: { userId_companyId: { userId: user.userId, companyId: invite.companyId } },
  });

  if (!existing) {
    await prisma.membership.create({
      data: {
        userId: user.userId,
        companyId: invite.companyId,
        role: invite.role,
      },
    });
  }

  await prisma.invite.update({
    where: { id: invite.id },
    data: { status: "used", usedAt: new Date(), usedById: user.userId },
  });

  await prisma.activityEvent.create({
    data: {
      companyId: invite.companyId,
      userId: user.userId,
      type: "member_joined",
      payload: { role: invite.role },
    },
  });

  return NextResponse.json({ companyId: invite.companyId });
}
