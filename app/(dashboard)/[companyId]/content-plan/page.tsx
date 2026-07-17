"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ContentPlanEntry } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RefreshCw, FileText } from "lucide-react";
import Link from "next/link";

export default function ContentPlanPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [entries, setEntries] = useState<ContentPlanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [days, setDays] = useState(7);
  const [channelInput, setChannelInput] = useState("ВК, Telegram");

  async function fetchEntries() {
    const res = await fetch(`/api/companies/${companyId}/content-plan`);
    const data = await res.json();
    if (res.ok) setEntries(data.entries);
    setLoading(false);
  }

  async function generate() {
    setGenerating(true);
    setError("");
    const channels = channelInput.split(",").map((c) => c.trim()).filter(Boolean);
    const res = await fetch(`/api/companies/${companyId}/content-plan/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days, channels }),
    });
    const data = await res.json();
    setGenerating(false);
    if (!res.ok) {
      setError(data.error || "Ошибка генерации");
      return;
    }
    setEntries(data.entries);
  }

  useEffect(() => {
    fetchEntries();
  }, [companyId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold">Контент-план</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 дней</SelectItem>
              <SelectItem value="14">14 дней</SelectItem>
              <SelectItem value="30">30 дней</SelectItem>
            </SelectContent>
          </Select>
          <input
            className="h-9 rounded-md border px-3 text-sm"
            value={channelInput}
            onChange={(e) => setChannelInput(e.target.value)}
            placeholder="Каналы через запятую"
          />
          <Button onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {generating ? "Генерация..." : "Сгенерировать"}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="text-muted-foreground">Загрузка...</div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Контент-план ещё не создан.</p>
            <Button className="mt-4" onClick={generate} disabled={generating}>
              Сгенерировать план
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge>{entry.channel}</Badge>
                    <Badge variant="outline">{entry.format}</Badge>
                    <Badge variant="secondary">{entry.goal}</Badge>
                  </div>
                  <p className="mt-1 font-medium">{entry.topic}</p>
                  {entry.rubric && <p className="text-xs text-muted-foreground">Рубрика: {entry.rubric}</p>}
                  <p className="text-xs text-muted-foreground">{new Date(entry.date).toLocaleDateString("ru-RU")}</p>
                </div>
                <Link
                  href={`/${companyId}/posts?topic=${encodeURIComponent(entry.topic)}&channel=${encodeURIComponent(entry.channel)}&planEntryId=${entry.id}`}
                  className="inline-flex h-7 items-center gap-1 rounded-md border px-2.5 text-sm hover:bg-muted"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Написать пост
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
