"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { KnowledgeItem } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, Trash2, Link as LinkIcon, FileText } from "lucide-react";

export default function KnowledgePage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [items, setItems] = useState<(KnowledgeItem & { _count?: { chunks: number } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  async function fetchItems() {
    const res = await fetch(`/api/companies/${companyId}/knowledge`);
    const data = await res.json();
    if (res.ok) setItems(data.items);
    setLoading(false);
  }

  async function addLink() {
    setAdding(true);
    setError("");
    const res = await fetch(`/api/companies/${companyId}/knowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "link", sourceUrl: url, title }),
    });
    const data = await res.json();
    setAdding(false);
    if (!res.ok) {
      setError(data.error || "Ошибка добавления");
      return;
    }
    setUrl("");
    setTitle("");
    fetchItems();
  }

  async function addText() {
    setAdding(true);
    setError("");
    const res = await fetch(`/api/companies/${companyId}/knowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "text", title, rawText: text }),
    });
    const data = await res.json();
    setAdding(false);
    if (!res.ok) {
      setError(data.error || "Ошибка добавления");
      return;
    }
    setText("");
    setTitle("");
    fetchItems();
  }

  async function deleteItem(id: string) {
    const res = await fetch(`/api/companies/${companyId}/knowledge?itemId=${id}`, { method: "DELETE" });
    if (res.ok) fetchItems();
  }

  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, 5000);
    return () => clearInterval(interval);
  }, [companyId]);

  const statusBadge: Record<string, string> = {
    pending: "secondary",
    processing: "default",
    ready: "default",
    error: "destructive",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">База знаний</h1>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Добавить материал</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="link">
            <TabsList>
              <TabsTrigger value="link"><LinkIcon className="mr-2 h-4 w-4" /> Ссылка</TabsTrigger>
              <TabsTrigger value="text"><FileText className="mr-2 h-4 w-4" /> Текст</TabsTrigger>
            </TabsList>
            <TabsContent value="link" className="space-y-4">
              <div className="space-y-2">
                <Label>URL</Label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Название (опционально)</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <Button onClick={addLink} disabled={adding || !url}>
                {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Добавить ссылку
              </Button>
            </TabsContent>
            <TabsContent value="text" className="space-y-4">
              <div className="space-y-2">
                <Label>Название</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Текст</Label>
                <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} />
              </div>
              <Button onClick={addText} disabled={adding || !text}>
                {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Добавить текст
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {loading ? (
          <div className="text-muted-foreground">Загрузка...</div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              База знаний пуста. Добавьте первый материал.
            </CardContent>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.title}</span>
                    <Badge variant={statusBadge[item.status] as any}>{item.status}</Badge>
                    {item._count && (
                      <span className="text-xs text-muted-foreground">{item._count.chunks} чанков</span>
                    )}
                  </div>
                  {item.sourceUrl && (
                    <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                      {item.sourceUrl}
                    </a>
                  )}
                  {item.error && <p className="text-sm text-red-600">{item.error}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
