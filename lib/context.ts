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

  const knowledgeChunks = query ? await searchKnowledgeChunks(companyId, query, 5) : [];

  return buildCompanyContext(
    company,
    company.channels,
    completedTasks,
    mediaFiles,
    knowledgeChunks
  );
}
