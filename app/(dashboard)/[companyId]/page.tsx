import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/access";
import { hasPermission } from "@/lib/permissions";
import { CompanyOverview } from "@/components/dashboard/company-overview";

export default async function CompanyPage({ params }: { params: Promise<{ companyId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { companyId } = await params;
  const membership = await requireMembership(user.userId, companyId).catch(() => null);
  if (!membership) return notFound();

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { channels: true },
  });
  if (!company) return notFound();

  const tasks = await prisma.roadmapTask.findMany({ where: { companyId } });
  const posts = await prisma.post.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const progress = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <CompanyOverview
      company={company}
      channels={company.channels}
      role={membership.role}
      tasks={tasks}
      posts={posts}
      progress={progress}
    />
  );
}
