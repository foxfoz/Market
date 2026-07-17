import { prisma } from "./prisma";
import { searchKnowledgeChunks } from "./rag";
import { buildCompanyContext } from "./prompts";

export async function buildFullCompanyContext(companyId: string, query?: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { channels: true },
  });
  if (!company) throw new Error("Company not found");

  const completedTasks = await prisma.roadmapTask.findMany({
    where: { companyId, status: "done" },
  });

  const mediaFiles = await prisma.mediaFile.findMany({
    where: { companyId },
  });

  let knowledgeChunks: { content: string }[] = [];
  if (query) {
    try {
      knowledgeChunks = await searchKnowledgeChunks(companyId, query, 5);
    } catch (error: any) {
      console.warn("[RAG] Failed to fetch knowledge chunks:", error.message);
      knowledgeChunks = [];
    }
  }

  return buildCompanyContext(
    company,
    company.channels,
    completedTasks,
    mediaFiles,
    knowledgeChunks
  );
}
