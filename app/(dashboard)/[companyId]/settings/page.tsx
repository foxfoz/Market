"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save } from "lucide-react";

export default function SettingsPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function fetchCompany() {
    const res = await fetch(`/api/companies/${companyId}`);
    const data = await res.json();
    if (res.ok) {
      setForm(data.company);
    }
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    setError("");
    setSuccess(false);
    const res = await fetch(`/api/companies/${companyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        industry: form.industry,
        city: form.city,
        description: form.description,
        services: form.services,
        usp: form.usp,
        audience: form.audience,
        competitors: form.competitors,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Ошибка сохранения");
      return;
    }
    setSuccess(true);
    setForm(data.company);
  }

  useEffect(() => {
    fetchCompany();
  }, [companyId]);

  if (loading) return <div className="text-muted-foreground">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Настройки компании</h1>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertDescription>Сохранено</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Сфера</Label>
              <Input value={form.industry || ""} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Город</Label>
              <Input value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Описание</Label>
            <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Услуги</Label>
            <Textarea value={form.services || ""} onChange={(e) => setForm({ ...form, services: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>УТП</Label>
            <Textarea value={form.usp || ""} onChange={(e) => setForm({ ...form, usp: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Аудитория</Label>
            <Textarea value={form.audience || ""} onChange={(e) => setForm({ ...form, audience: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Конкуренты</Label>
            <Textarea value={form.competitors || ""} onChange={(e) => setForm({ ...form, competitors: e.target.value })} />
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Сохранить
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
