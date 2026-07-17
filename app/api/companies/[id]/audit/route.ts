import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requireMembership } from "@/lib/access";
import { canGenerate } from "@/lib/permissions";
import { buildFullCompanyContext } from "@/lib/context";
import { auditPrompt } from "@/lib/prompts";
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
        { role: "system", content: "Ты экспертный маркетолог. Всегда отвечай валидным JSON." },
        { role: "user", content: auditPrompt(context) },
      ],
      response_format: { type: "json_object" },
    });

    await prisma.generationLog.create({
      data: {
        companyId: id,
        kind: "audit",
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        model: result.model,
      },
    });

    await prisma.activityEvent.create({
      data: {
        companyId: id,
        userId: user.userId,
        type: "audit_generated",
        payload: { model: result.model },
      },
    });

    return NextResponse.json({ audit: JSON.parse(result.content), usage: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Audit failed" }, { status: 500 });
  }
}
