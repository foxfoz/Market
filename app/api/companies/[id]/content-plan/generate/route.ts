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

function parseJsonResponse(content: string): any {
  if (!content || !content.trim()) {
    throw new Error("AI returned empty response");
  }

  // Try direct parse first
  try {
    return JSON.parse(content);
  } catch {
    // ignore
  }

  // Try to extract JSON from markdown code block
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch {
      // ignore
    }
  }

  // Try to find JSON array/object anywhere in the text
  const arrayMatch = content.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {
      // ignore
    }
  }

  const objectMatch = content.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      // ignore
    }
  }

  throw new Error(`AI response is not valid JSON: ${content.slice(0, 200)}`);
}

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
        { role: "system", content: "Ты экспертный SMM-стратег. Всегда отвечай валидным JSON-массивом без markdown и пояснений." },
        { role: "user", content: contentPlanPrompt(context, days, channels) },
      ],
      max_tokens: 4000,
    });

    console.log("[ContentPlan] Raw response:", result.content.slice(0, 500));

    const parsedResult = parseJsonResponse(result.content);
    const entries = Array.isArray(parsedResult) ? parsedResult : parsedResult.entries || parsedResult.plan || [];

    if (!Array.isArray(entries) || entries.length === 0) {
      throw new Error("AI returned empty content plan");
    }

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
    console.error("[ContentPlan] Generation failed:", error);
    return NextResponse.json(
      { error: error.message || "Content plan generation failed" },
      { status: 500 }
    );
  }
}
