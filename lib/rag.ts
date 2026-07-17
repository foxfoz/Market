import { prisma } from "./prisma";
import { createEmbedding } from "./ai";

export async function searchKnowledgeChunks(companyId: string, query: string, limit = 5) {
  const embedding = await createEmbedding(query);
  const vector = JSON.stringify(embedding);

  const chunks = await prisma.$queryRawUnsafe<
    { id: string; itemId: string; content: string; distance: number }[]
  >(
    `
    SELECT id, "itemId", content, embedding <=> $1::vector as distance
    FROM "KnowledgeChunk"
    WHERE "itemId" IN (
      SELECT id FROM "KnowledgeItem" WHERE "companyId" = $2 AND status = 'ready'
    )
    ORDER BY embedding <=> $1::vector
    LIMIT $3
    `,
    vector,
    companyId,
    limit
  );

  return chunks.map((c) => ({ ...c, distance: Number(c.distance) }));
}

export function chunkText(text: string, maxChars = 1200, overlap = 100): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
    if (start >= end) break;
  }
  return chunks;
}
