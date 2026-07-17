import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requireMembership } from "@/lib/access";
import { canGenerate } from "@/lib/permissions";
import { buildFullCompanyContext } from "@/lib/context";
import { roadmapPrompt } from "@/lib/prompts";
import { generate } from "@/lib/ai";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const membership = await requireMembership(user.userId, id);
  if (!canGenerate(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const context = await buildFullCompanyContext(id);
    const result = await generate({
      messages: [
        { role: "system", content: "Ты экспертный маркетолог. Всегда отвечай валидным JSON-массивом." },
        { role: "user", content: roadmapPrompt(context) },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(result.content);
    const tasks = Array.isArray(parsed) ? parsed : parsed.tasks || [];

    await prisma.roadmapTask.deleteMany({ where: { companyId: id } });

    await prisma.roadmapTask.createMany({
      data: tasks.map((task: any, index: number) => ({
        companyId: id,
        category: task.category || "Контент",
        title: task.title,
        reason: task.reason || "",
        priority: task.priority || "yellow",
        sortOrder: task.sortOrder ?? index,
      })),
    });

    await prisma.generationLog.create({
      data: {
        companyId: id,
        kind: "roadmap",
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        model: result.model,
      },
    });

    await prisma.activityEvent.create({
      data: {
        companyId: id,
        userId: user.userId,
        type: "roadmap_generated",
        payload: { tasksCount: tasks.length },
      },
    });

    const roadmap = await prisma.roadmapTask.findMany({
      where: { companyId: id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ roadmap });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Roadmap generation failed" }, { status: 500 });
  }
}
