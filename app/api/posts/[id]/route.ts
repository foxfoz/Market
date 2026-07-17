import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/access";
import { canMutate } from "@/lib/permissions";
import { z } from "zod";

const updateSchema = z.object({
  text: z.string().optional(),
  status: z.enum(["draft", "published"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await requireMembership(user.userId, post.companyId);
  if (!canMutate(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const updateData: any = {};
  if (parsed.data.text !== undefined) updateData.text = parsed.data.text;
  if (parsed.data.status !== undefined) {
    updateData.status = parsed.data.status;
    if (parsed.data.status === "published") updateData.publishedAt = new Date();
  }

  const updated = await prisma.post.update({ where: { id }, data: updateData });

  if (parsed.data.status === "published") {
    await prisma.activityEvent.create({
      data: {
        companyId: post.companyId,
        userId: user.userId,
        type: "post_published",
        payload: { postId: post.id, topic: post.topic },
      },
    });
  }

  return NextResponse.json({ post: updated });
}
