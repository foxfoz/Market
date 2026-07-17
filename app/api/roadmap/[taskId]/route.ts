import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/access";
import { canMutate } from "@/lib/permissions";
import { TaskStatus } from "@prisma/client";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["todo", "in_progress", "done"]),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const task = await prisma.roadmapTask.findUnique({ where: { id: taskId } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await requireMembership(user.userId, task.companyId);
  if (!canMutate(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const updated = await prisma.roadmapTask.update({
    where: { id: taskId },
    data: { status: parsed.data.status },
  });

  if (parsed.data.status === "done") {
    await prisma.activityEvent.create({
      data: {
        companyId: task.companyId,
        userId: user.userId,
        type: "task_done",
        payload: { taskId: task.id, taskTitle: task.title },
      },
    });
  }

  return NextResponse.json({ task: updated });
}
