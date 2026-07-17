import { prisma } from "./prisma";
import { createEmbedding } from "./ai";
import { fetchPageText } from "./parser";
import { chunkText } from "./rag";

export async function processKnowledgeItem(itemId: string) {
  const item = await prisma.knowledgeItem.findUnique({ where: { id: itemId } });
  if (!item) return;

  await prisma.knowledgeItem.update({ where: { id: itemId }, data: { status: "processing" } });

  try {
    let text = "";

    if (item.type === "link") {
      if (!item.sourceUrl) throw new Error("No URL");
      text = await fetchPageText(item.sourceUrl);
      if (!text) throw new Error("No content extracted");
    } else if (item.type === "text") {
      text = item.rawText || "";
    } else if (item.type === "file") {
      // For MVP, file processing is limited to text files.
      // PDF/DOCX would require additional server-side handling.
      text = item.rawText || "";
    }

    await prisma.knowledgeItem.update({
      where: { id: itemId },
      data: { rawText: text },
    });

    const chunks = chunkText(text, 1200, 100);

    await prisma.knowledgeChunk.deleteMany({ where: { itemId } });

    for (const chunk of chunks) {
      const embedding = await createEmbedding(chunk);
      const vector = JSON.stringify(embedding);
      await prisma.$queryRawUnsafe(
        `INSERT INTO "KnowledgeChunk" (id, "itemId", content, embedding) VALUES (gen_random_uuid(), $1, $2, $3::vector)`,
        itemId,
        chunk,
        vector
      );
    }

    await prisma.knowledgeItem.update({ where: { id: itemId }, data: { status: "ready" } });
  } catch (error: any) {
    await prisma.knowledgeItem.update({
      where: { id: itemId },
      data: { status: "error", error: error.message || "Processing failed" },
    });
  }
}
