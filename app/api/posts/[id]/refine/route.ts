import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/access";
import { canGenerate } from "@/lib/permissions";
import { refinePostPrompt } from "@/lib/prompts";
import { generate } from "@/lib/ai";
import { z } from "zod";

const schema = z.object({
  mode: z.enum(["shorter", "emotional", "expert"]),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await requireMembership(user.userId, post.companyId);
  if (!canGenerate(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  try {
    const result = await generate({
      messages: [
        { role: "system", content: "Ты экспертный SMM-копирайтер. Всегда отвечай валидным JSON." },
        { role: "user", content: refinePostPrompt(post.text, parsed.data.mode) },
      ],
      response_format: { type: "json_object" },
    });

    const parsedResult = JSON.parse(result.content);

    await prisma.generationLog.create({
      data: {
        companyId: post.companyId,
        kind: "post_refine",
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        model: result.model,
      },
    });

    return NextResponse.json({ text: parsedResult.text || parsedResult.content || "" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Refine failed" }, { status: 500 });
  }
}
