import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function DashboardHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const memberships = await prisma.membership.findMany({
    where: { userId: user.userId },
    include: { company: true },
    orderBy: { createdAt: "desc" },
  });

  if (memberships.length === 0) {
    redirect("/new-company");
  }

  const first = memberships[0];
  redirect(`/${first.company.id}`);
}
