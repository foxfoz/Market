import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  industry: z.string().min(1),
  city: z.string().optional(),
  description: z.string().optional(),
  services: z.string().optional(),
  usp: z.string().optional(),
  audience: z.string().optional(),
  competitors: z.string().optional(),
  goals: z.array(z.string()).default([]),
  channels: z.array(z.object({ name: z.string().min(1), url: z.string().optional() })).default([]),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await prisma.membership.findMany({
    where: { userId: user.userId },
    include: { company: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ companies: memberships.map((m) => ({ ...m.company, role: m.role })) });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.format() }, { status: 400 });
  }

  const { channels, ...companyData } = parsed.data;

  const company = await prisma.company.create({
    data: {
      ...companyData,
      goals: companyData.goals as any,
      channels: { create: channels },
      memberships: { create: { userId: user.userId, role: "admin" } },
    },
  });

  return NextResponse.json({ company }, { status: 201 });
}
