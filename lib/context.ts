import { prisma } from "./prisma";
import { searchKnowledgeChunks } from "./rag";
import { buildCompanyContext } from "./prompts";

function truncate(text: string | null | undefined, maxLength: number): string | undefined {
  if (!text) return undefined;
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export async function buildFullCompanyContext(companyId: string, query?: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { channels: true },
  });
  if (!company) throw new Error("Company not found");

  const completedTasks = await prisma.roadmapTask.findMany({
    where: { companyId, status: "done" },
    take: 20,
  });

  const mediaFiles = await prisma.mediaFile.findMany({
    where: { companyId },
    take: 30,
  });

  let knowledgeChunks: { content: string }[] = [];
  if (query) {
    try {
      knowledgeChunks = await searchKnowledgeChunks(companyId, query, 3);
    } catch (error: any) {
      console.warn("[RAG] Failed to fetch knowledge chunks:", error.message);
      knowledgeChunks = [];
    }
  }

  // Truncate long text fields to keep prompt size reasonable
  const trimmedCompany = {
    ...company,
    description: truncate(company.description, 500),
    services: truncate(company.services, 500),
    audience: truncate(company.audience, 500),
    competitors: truncate(company.competitors, 300),
  };

  return buildCompanyContext(
    trimmedCompany as any,
    company.channels,
    completedTasks,
    mediaFiles,
    knowledgeChunks
  );
}
