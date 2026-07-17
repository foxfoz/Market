"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { RoadmapTask } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RefreshCw } from "lucide-react";

const categoriesOrder = ["Присутствие", "Контент", "Репутация", "Реклама", "Аналитика"];

const priorityLabel: Record<string, string> = {
  red: "🔴 Высокий",
  yellow: "🟡 Средний",
  green: "🟢 Низкий",
};

export default function RoadmapPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [tasks, setTasks] = useState<RoadmapTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  async function fetchTasks() {
    const res = await fetch(`/api/companies/${companyId}/roadmap`);
    const data = await res.json();
    if (res.ok) setTasks(data.tasks);
    setLoading(false);
  }

  async function generateRoadmap() {
    setGenerating(true);
    setError("");
    const res = await fetch(`/api/companies/${companyId}/roadmap/generate`, { method: "POST" });
    const data = await res.json();
    setGenerating(false);
    if (!res.ok) {
      setError(data.error || "Ошибка генерации");
      return;
    }
    setTasks(data.roadmap);
  }

  async function updateStatus(taskId: string, status: string) {
    const res = await fetch(`/api/roadmap/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) fetchTasks();
  }

  useEffect(() => {
    fetchTasks();
  }, [companyId]);

  const grouped = tasks.reduce((acc, task) => {
    acc[task.category] = acc[task.category] || [];
    acc[task.category].push(task);
    return acc;
  }, {} as Record<string, RoadmapTask[]>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold">Дорожная карта</h1>
        <Button onClick={generateRoadmap} disabled={generating}>
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {generating ? "Генерация..." : "Обновить план"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="text-muted-foreground">Загрузка...</div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Дорожная карта ещё не создана.</p>
            <Button className="mt-4" onClick={generateRoadmap} disabled={generating}>
              Сгенерировать roadmap
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {categoriesOrder
            .filter((cat) => grouped[cat])
            .map((category) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle>{category}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {grouped[category].map((task) => (
                    <div key={task.id} className="flex flex-col gap-2 rounded-lg border p-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{task.title}</span>
                          <Badge variant="outline">{priorityLabel[task.priority] || task.priority}</Badge>
                        </div>
                        {task.reason && <p className="mt-1 text-sm text-muted-foreground">{task.reason}</p>}
                      </div>
                      <Select value={task.status} onValueChange={(val) => val && updateStatus(task.id, val)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">К выполнению</SelectItem>
                          <SelectItem value="in_progress">В работе</SelectItem>
                          <SelectItem value="done">Готово</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
