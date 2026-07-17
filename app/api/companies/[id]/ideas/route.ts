import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requireMembership } from "@/lib/access";
import { canGenerate } from "@/lib/permissions";
import { buildFullCompanyContext } from "@/lib/context";
import { ideasPrompt } from "@/lib/prompts";
import { generate } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  request: z.string().min(1),
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

  try {
    const context = await buildFullCompanyContext(id, parsed.data.request);
    const result = await generate({
      messages: [
        { role: "system", content: "Ты экспертный SMM-стратег. Всегда отвечай валидным JSON." },
        { role: "user", content: ideasPrompt(context, parsed.data.request) },
      ],
      response_format: { type: "json_object" },
    });

    const parsedResult = JSON.parse(result.content);
    const ideas = parsedResult.ideas || [];

    await prisma.generationLog.create({
      data: {
        companyId: id,
        kind: "ideas",
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        model: result.model,
      },
    });

    return NextResponse.json({ ideas });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Ideas generation failed" }, { status: 500 });
  }
}
