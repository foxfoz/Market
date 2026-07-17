import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requireMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await requireMembership(user.userId, id);

  const totalTasks = await prisma.roadmapTask.count({ where: { companyId: id } });
  const doneTasks = await prisma.roadmapTask.count({ where: { companyId: id, status: "done" } });
  const totalPosts = await prisma.post.count({ where: { companyId: id } });
  const publishedPosts = await prisma.post.count({ where: { companyId: id, status: "published" } });
  const knowledgeItems = await prisma.knowledgeItem.count({ where: { companyId: id } });
  const contentPlanDays = await prisma.contentPlanEntry.count({ where: { companyId: id } });

  const postsByChannel = await prisma.$queryRaw<
    { channel: string; count: bigint }[]
  >`
    SELECT channel, COUNT(*) as count FROM "Post" WHERE "companyId" = ${id} GROUP BY channel
  `;

  const activityByWeek = await prisma.$queryRaw<
    { week: string; posts: bigint; tasks: bigint }[]
  >`
    WITH weeks AS (
      SELECT date_trunc('week', "createdAt") as week, type
      FROM "ActivityEvent"
      WHERE "companyId" = ${id}
    )
    SELECT week::text,
      COUNT(*) FILTER (WHERE type = 'post_published') as posts,
      COUNT(*) FILTER (WHERE type = 'task_done') as tasks
    FROM weeks
    GROUP BY week
    ORDER BY week DESC
    LIMIT 12
  `;

  return NextResponse.json({
    kpi: {
      totalTasks,
      doneTasks,
      totalPosts,
      publishedPosts,
      knowledgeItems,
      contentPlanDays,
      progress: totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0,
    },
    postsByChannel: postsByChannel.map((r) => ({ channel: r.channel, count: Number(r.count) })),
    activityByWeek: activityByWeek.map((r) => ({
      week: r.week,
      posts: Number(r.posts),
      tasks: Number(r.tasks),
    })),
  });
}
