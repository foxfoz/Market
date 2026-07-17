"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ActivityEvent, User } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OwnerActivityPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [events, setEvents] = useState<(ActivityEvent & { user: User | null })[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchEvents() {
    const res = await fetch(`/api/companies/${companyId}/activity?take=50`);
    const data = await res.json();
    if (res.ok) setEvents(data.events);
    setLoading(false);
  }

  useEffect(() => {
    fetchEvents();
  }, [companyId]);

  function humanText(event: ActivityEvent) {
    const payload = event.payload as any;
    switch (event.type) {
      case "audit_generated":
        return "сгенерировал AI-аудит";
      case "roadmap_generated":
        return `сгенерировал дорожную карту (${payload?.tasksCount || 0} задач)`;
      case "task_done":
        return `выполнил задачу "${payload?.taskTitle || ""}"`;
      case "plan_generated":
        return `сгенерировал контент-план на ${payload?.days || 0} дней`;
      case "post_generated":
        return `сгенерировал пост "${payload?.topic || ""}"`;
      case "post_published":
        return `опубликовал пост "${payload?.topic || ""}"`;
      case "knowledge_added":
        return "добавил материал в базу знаний";
      case "media_synced":
        return `синхронизировал медиатеку (${payload?.count || 0} файлов)`;
      case "member_joined":
        return `присоединился как ${payload?.role || "участник"}`;
      default:
        return event.type;
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Что сделано</h1>

      <Card>
        <CardHeader>
          <CardTitle>Лента активности</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-muted-foreground">Загрузка...</div>
          ) : events.length === 0 ? (
            <div className="text-muted-foreground">Пока нет событий</div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="flex items-start justify-between rounded border p-3">
                <div>
                  <span className="font-medium">{event.user?.name || event.user?.email || "Система"}</span>{" "}
                  <span className="text-muted-foreground">{humanText(event)}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(event.createdAt).toLocaleString("ru-RU")}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
