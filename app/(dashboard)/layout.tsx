import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: user.userId },
    include: { company: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const companies = memberships.map((m) => ({
    id: m.company.id,
    name: m.company.name,
    role: m.role,
  }));

  return (
    <AppShell user={user} companies={companies}>
      {children}
    </AppShell>
  );
}
