"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#0f172a", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export default function OwnerDashboardPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function fetchStats() {
    const res = await fetch(`/api/companies/${companyId}/dashboard`);
    const result = await res.json();
    if (res.ok) setData(result);
    setLoading(false);
  }

  useEffect(() => {
    fetchStats();
  }, [companyId]);

  if (loading || !data) return <div className="text-muted-foreground">Загрузка...</div>;

  const { kpi, postsByChannel, activityByWeek } = data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Результат</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Постов опубликовано</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.publishedPosts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Задач выполнено</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.doneTasks} / {kpi.totalTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Прогресс roadmap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.progress}%</div>
            <Progress value={kpi.progress} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Материалов в базе знаний</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.knowledgeItems}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Активность по неделям</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityByWeek.reverse()}>
                <XAxis dataKey="week" tickFormatter={(v) => new Date(v).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="posts" name="Посты" fill="#0f172a" />
                <Bar dataKey="tasks" name="Задачи" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Распределение по каналам</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={postsByChannel} dataKey="count" nameKey="channel" cx="50%" cy="50%" outerRadius={80} label>
                  {postsByChannel.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
