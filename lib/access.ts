import { prisma } from "./prisma";
import { Role } from "@prisma/client";

export async function getMembership(userId: string, companyId: string) {
  return prisma.membership.findUnique({
    where: { userId_companyId: { userId, companyId } },
  });
}

export async function requireMembership(userId: string, companyId: string) {
  const membership = await getMembership(userId, companyId);
  if (!membership) {
    throw new Error("Access denied");
  }
  return membership;
}

export async function requireRole(userId: string, companyId: string, role: Role) {
  const membership = await requireMembership(userId, companyId);
  if (membership.role !== role) {
    throw new Error("Insufficient permissions");
  }
  return membership;
}
