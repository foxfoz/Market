import { Role } from "@prisma/client";

export type Permission =
  | "view"
  | "edit_company"
  | "manage_team"
  | "generate"
  | "mutate_content"
  | "delete_company";

export const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    "view",
    "edit_company",
    "manage_team",
    "generate",
    "mutate_content",
    "delete_company",
  ],
  marketer: ["view", "generate", "mutate_content"],
  owner: ["view"],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}

export function canGenerate(role: Role): boolean {
  return hasPermission(role, "generate");
}

export function canMutate(role: Role): boolean {
  return hasPermission(role, "mutate_content");
}
