import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requireMembership } from "@/lib/access";
import { canGenerate } from "@/lib/permissions";
import { buildFullCompanyContext } from "@/lib/context";
import { generate, ChatMessage as AiChatMessage } from "@/lib/ai";
import { systemPrompt } from "@/lib/prompts";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const postSchema = z.object({
  message: z.string().min(1),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await requireMembership(user.userId, id);

  const messages = await prisma.chatMessage.findMany({
    where: { companyId: id },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  return NextResponse.json({ messages });
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
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { message } = parsed.data;

  await prisma.chatMessage.create({
    data: {
      companyId: id,
      userId: user.userId,
      role: "user",
      content: message,
    },
  });

  try {
    const context = await buildFullCompanyContext(id, message);
    const recentMessages = await prisma.chatMessage.findMany({
      where: { companyId: id },
      orderBy: { createdAt: "desc" },
      take: 6,
    });

    const messages: AiChatMessage[] = [
      { role: "system", content: systemPrompt(context) },
      ...recentMessages.reverse().map((m) => ({ role: m.role as any, content: m.content })),
      { role: "user", content: message },
    ];

    const result = await generate({ messages });

    const assistantMessage = await prisma.chatMessage.create({
      data: {
        companyId: id,
        userId: user.userId,
        role: "assistant",
        content: result.content,
      },
    });

    await prisma.generationLog.create({
      data: {
        companyId: id,
        kind: "chat",
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        model: result.model,
      },
    });

    return NextResponse.json({ message: assistantMessage });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Chat failed" }, { status: 500 });
  }
}
