import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requireMembership } from "@/lib/access";
import { canGenerate } from "@/lib/permissions";
import { buildFullCompanyContext } from "@/lib/context";
import { postPrompt } from "@/lib/prompts";
import { generate } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  topic: z.string().min(1),
  channel: z.string().min(1),
  format: z.string().optional(),
  planEntryId: z.string().optional(),
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

  const { topic, channel, format, planEntryId } = parsed.data;

  try {
    const context = await buildFullCompanyContext(id, topic);
    const result = await generate({
      messages: [
        { role: "system", content: "Ты экспертный SMM-копирайтер. Всегда отвечай валидным JSON." },
        { role: "user", content: postPrompt(context, topic, channel, format) },
      ],
      response_format: { type: "json_object" },
    });

    const parsedResult = JSON.parse(result.content);

    const post = await prisma.post.create({
      data: {
        companyId: id,
        planEntryId: planEntryId || null,
        channel,
        topic,
        text: parsedResult.text || parsedResult.content || "",
        visualHint: parsedResult.visualHint || parsedResult.visual_hint || "",
        status: "draft",
      },
    });

    await prisma.generationLog.create({
      data: {
        companyId: id,
        kind: "post",
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        model: result.model,
      },
    });

    await prisma.activityEvent.create({
      data: {
        companyId: id,
        userId: user.userId,
        type: "post_generated",
        payload: { postId: post.id, topic, channel },
      },
    });

    return NextResponse.json({ post });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Post generation failed" }, { status: 500 });
  }
}
