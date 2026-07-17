import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/access";
import { hasPermission } from "@/lib/permissions";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ membershipId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { membershipId } = await params;
  const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const myMembership = await requireMembership(user.userId, membership.companyId);
  if (!hasPermission(myMembership.role, "manage_team")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.membership.delete({ where: { id: membershipId } });

  return NextResponse.json({ ok: true });
}
