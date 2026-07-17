"use client";

import Link from "next/link";
import { useState } from "react";
import { Company, Channel, RoadmapTask, Post, Role } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { hasPermission } from "@/lib/permissions";
import { Sparkles, Map, CalendarDays } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Props = {
  company: Company;
  channels: Channel[];
  role: Role;
  tasks: RoadmapTask[];
  posts: Post[];
  progress: number;
};

export function CompanyOverview({ company, channels, role, tasks, posts, progress }: Props) {
  const [audit, setAudit] = useState<any>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const canGenerate = hasPermission(role, "generate");
  const companyId = company.id;

  async function runAudit() {
    setAuditLoading(true);
    setAuditError("");
    const res = await fetch(`/api/companies/${companyId}/audit`, { method: "POST" });
    const data = await res.json();
    setAuditLoading(false);
    if (!res.ok) {
      setAuditError(data.error || "Ошибка аудита");
      return;
    }
    setAudit(data.audit);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{company.name}</h1>
          <p className="text-muted-foreground">
            {company.industry} {company.city ? `• ${company.city}` : ""}
          </p>
        </div>
        {canGenerate && (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${companyId}/roadmap`}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm hover:bg-muted"
            >
              <Map className="h-4 w-4" />
              Дорожная карта
            </Link>
            <Link
              href={`/${companyId}/content-plan`}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm hover:bg-muted"
            >
              <CalendarDays className="h-4 w-4" />
              Контент-план
            </Link>
            <Button onClick={runAudit} disabled={auditLoading}>
              <Sparkles className="mr-2 h-4 w-4" />
              {auditLoading ? "Аудит..." : "AI-аудит"}
            </Button>
          </div>
        )}
      </div>

      {auditError && (
        <Alert variant="destructive">
          <AlertDescription>{auditError}</AlertDescription>
        </Alert>
      )}

      {audit && (
        <Card>
          <CardHeader>
            <CardTitle>Результат AI-аудита</CardTitle>
            <CardDescription>{audit.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-green-700">Сильные стороны</h4>
              <ul className="list-disc pl-5 text-sm">
                {audit.strengths?.map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-red-700">Слабые стороны</h4>
              <ul className="list-disc pl-5 text-sm">
                {audit.weaknesses?.map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">Рекомендации</h4>
              <ul className="list-disc pl-5 text-sm">
                {audit.recommendations?.map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Прогресс roadmap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress}%</div>
            <Progress value={progress} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Задач</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tasks.filter((t) => t.status === "done").length} / {tasks.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Постов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{posts.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Каналы</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {channels.length === 0 && (
              <span className="text-sm text-muted-foreground">Каналы не добавлены</span>
            )}
            {channels.map((ch) => (
              <Badge key={ch.id} variant="secondary">
                {ch.name} {ch.url && <span className="ml-1 text-xs opacity-70">↗</span>}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Последние посты</CardTitle>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока нет сгенерированных постов.</p>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <div key={post.id} className="rounded border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{post.topic}</span>
                    <Badge variant={post.status === "published" ? "default" : "outline"}>
                      {post.status === "published" ? "Опубликован" : "Черновик"}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.text}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
