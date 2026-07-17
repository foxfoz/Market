import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requireMembership } from "@/lib/access";
import { canMutate } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { fetchPublicFolder } from "@/lib/yandex-disk";
import { z } from "zod";

const schema = z.object({
  folderUrl: z.string().url(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const membership = await requireMembership(user.userId, id);
  if (!canMutate(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  try {
    const files = await fetchPublicFolder(parsed.data.folderUrl);

    await prisma.mediaFile.deleteMany({ where: { companyId: id } });

    await prisma.mediaFile.createMany({
      data: files.map((f) => ({
        companyId: id,
        diskFolderUrl: parsed.data.folderUrl,
        name: f.name,
        mimeType: f.mime_type,
        previewUrl: f.preview,
        size: f.size,
      })),
    });

    await prisma.activityEvent.create({
      data: {
        companyId: id,
        userId: user.userId,
        type: "media_synced",
        payload: { count: files.length },
      },
    });

    return NextResponse.json({ files });
  } catch (error: any) {
    console.error("[Yandex.Disk] Sync failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync Yandex.Disk" },
      { status: 500 }
    );
  }
}
