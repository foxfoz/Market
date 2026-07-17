"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, X } from "lucide-react";

const industries = ["Медицина", "Красота", "Общепит", "Retail", "Услуги", "Образование", "Другое"];

const goalOptions = [
  "Увеличить число клиентов",
  "Повысить доверие",
  "Поднять узнаваемость",
  "Вернуть старых клиентов",
  "Запустить новую услугу",
];

export default function NewCompanyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    industry: "",
    city: "",
    description: "",
    services: "",
    usp: "",
    audience: "",
    competitors: "",
    goals: [] as string[],
    customGoal: "",
    channels: [] as { name: string; url: string }[],
    newChannelName: "",
    newChannelUrl: "",
  });

  function toggleGoal(goal: string) {
    setForm((prev) => ({
      ...prev,
      goals: prev.goals.includes(goal) ? prev.goals.filter((g) => g !== goal) : [...prev.goals, goal],
    }));
  }

  function addChannel() {
    if (!form.newChannelName) return;
    setForm((prev) => ({
      ...prev,
      channels: [...prev.channels, { name: prev.newChannelName, url: prev.newChannelUrl }],
      newChannelName: "",
      newChannelUrl: "",
    }));
  }

  function removeChannel(index: number) {
    setForm((prev) => ({
      ...prev,
      channels: prev.channels.filter((_, i) => i !== index),
    }));
  }

  async function onSubmit() {
    setError("");
    setLoading(true);

    const goals = [...form.goals];
    if (form.customGoal.trim()) goals.push(form.customGoal.trim());

    const payload = {
      name: form.name,
      industry: form.industry,
      city: form.city,
      description: form.description,
      services: form.services,
      usp: form.usp,
      audience: form.audience,
      competitors: form.competitors,
      goals,
      channels: form.channels,
    };

    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Ошибка создания компании");
      return;
    }

    router.push(`/${data.company.id}`);
    router.refresh();
  }

  const canNext =
    step === 1
      ? form.name && form.industry
      : step === 2
      ? true
      : step === 3
      ? true
      : form.goals.length > 0 || form.customGoal.trim();

  return (
    <div className="mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Создание компании</CardTitle>
          <CardDescription>Шаг {step} из 4</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название компании *</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Сфера *</Label>
                <div className="flex flex-wrap gap-2">
                  {industries.map((ind) => (
                    <Badge
                      key={ind}
                      variant={form.industry === ind ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setForm({ ...form, industry: ind })}
                    >
                      {ind}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Город</Label>
                <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Описание компании</Label>
                <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="services">Услуги</Label>
                <Textarea id="services" value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="usp">УТП</Label>
                <Textarea id="usp" value={form.usp} onChange={(e) => setForm({ ...form, usp: e.target.value })} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Каналы присутствия</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Название (например, ВК)"
                    value={form.newChannelName}
                    onChange={(e) => setForm({ ...form, newChannelName: e.target.value })}
                  />
                  <Input
                    placeholder="Ссылка"
                    value={form.newChannelUrl}
                    onChange={(e) => setForm({ ...form, newChannelUrl: e.target.value })}
                  />
                  <Button type="button" onClick={addChannel} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {form.channels.map((ch, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded border p-2">
                    <div>
                      <span className="font-medium">{ch.name}</span>
                      {ch.url && <span className="ml-2 text-sm text-muted-foreground">{ch.url}</span>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeChannel(idx)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="audience">Целевая аудитория</Label>
                <Textarea
                  id="audience"
                  placeholder="Пол, возраст, боли, возражения..."
                  value={form.audience}
                  onChange={(e) => setForm({ ...form, audience: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="competitors">Конкуренты</Label>
                <Textarea id="competitors" value={form.competitors} onChange={(e) => setForm({ ...form, competitors: e.target.value })} />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <Label>Цели маркетинга</Label>
              <div className="space-y-2">
                {goalOptions.map((goal) => (
                  <div key={goal} className="flex items-center gap-2">
                    <Checkbox id={goal} checked={form.goals.includes(goal)} onCheckedChange={() => toggleGoal(goal)} />
                    <label htmlFor={goal} className="text-sm">
                      {goal}
                    </label>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="customGoal">Своя цель</Label>
                <Input id="customGoal" value={form.customGoal} onChange={(e) => setForm({ ...form, customGoal: e.target.value })} />
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
            Назад
          </Button>
          {step < 4 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
              Далее
            </Button>
          ) : (
            <Button onClick={onSubmit} disabled={!canNext || loading}>
              {loading ? "Создание..." : "Создать компанию"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
