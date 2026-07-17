import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requireMembership } from "@/lib/access";
import { canGenerate } from "@/lib/permissions";
import { buildFullCompanyContext } from "@/lib/context";
import { contentPlanPrompt } from "@/lib/prompts";
import { generate } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  days: z.number().int().min(1).max(30),
  channels: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const membership = await requireMembership(user.userId, id);
  if (!canGenerate(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { days, channels } = parsed.data;

  try {
    const context = await buildFullCompanyContext(id);
    const result = await generate({
      messages: [
        { role: "system", content: "Ты экспертный SMM-стратег. Всегда отвечай валидным JSON-массивом." },
        { role: "user", content: contentPlanPrompt(context, days, channels) },
      ],
      response_format: { type: "json_object" },
    });

    const parsedResult = JSON.parse(result.content);
    const entries = Array.isArray(parsedResult) ? parsedResult : parsedResult.entries || parsedResult.plan || [];

    await prisma.contentPlanEntry.deleteMany({ where: { companyId: id } });

    const baseDate = new Date();
    const createData = entries.map((entry: any, index: number) => {
      const dateStr = entry.date;
      let date: Date;
      if (dateStr && !isNaN(Date.parse(dateStr))) {
        date = new Date(dateStr);
      } else {
        date = new Date(baseDate);
        date.setDate(baseDate.getDate() + Math.floor(index / channels.length));
      }
      return {
        companyId: id,
        date,
        channel: entry.channel || channels[index % channels.length],
        format: entry.format || "post",
        topic: entry.topic || "Тема поста",
        goal: entry.goal || "reach",
        rubric: entry.rubric || "",
        status: "planned",
      };
    });

    await prisma.contentPlanEntry.createMany({ data: createData });

    await prisma.generationLog.create({
      data: {
        companyId: id,
        kind: "content_plan",
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        model: result.model,
      },
    });

    await prisma.activityEvent.create({
      data: {
        companyId: id,
        userId: user.userId,
        type: "plan_generated",
        payload: { days, channels, entriesCount: createData.length },
      },
    });

    const saved = await prisma.contentPlanEntry.findMany({
      where: { companyId: id },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ entries: saved });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Content plan generation failed" }, { status: 500 });
  }
}
