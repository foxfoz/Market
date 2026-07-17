"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Post } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, Copy, Check, RefreshCw, Send } from "lucide-react";

export default function PostsPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const searchParams = useSearchParams();
  const initialTopic = searchParams.get("topic") || "";
  const initialChannel = searchParams.get("channel") || "ВК";
  const initialPlanEntryId = searchParams.get("planEntryId") || "";

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState(initialTopic);
  const [channel, setChannel] = useState(initialChannel);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [refineMode, setRefineMode] = useState<"shorter" | "emotional" | "expert">("shorter");
  const [refining, setRefining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ideasRequest, setIdeasRequest] = useState("10 идей для Reels в клинике");
  const [ideas, setIdeas] = useState<string[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(false);

  async function fetchPosts() {
    const res = await fetch(`/api/companies/${companyId}/posts`);
    const data = await res.json();
    if (res.ok) {
      setPosts(data.posts);
    }
    setLoading(false);
  }

  async function generatePost() {
    setGenerating(true);
    setError("");
    const res = await fetch(`/api/companies/${companyId}/posts/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, channel, planEntryId: initialPlanEntryId || undefined }),
    });
    const data = await res.json();
    setGenerating(false);
    if (!res.ok) {
      setError(data.error || "Ошибка генерации");
      return;
    }
    setActivePost(data.post);
    fetchPosts();
  }

  async function refinePost() {
    if (!activePost) return;
    setRefining(true);
    const res = await fetch(`/api/posts/${activePost.id}/refine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: refineMode }),
    });
    const data = await res.json();
    setRefining(false);
    if (!res.ok) {
      setError(data.error || "Ошибка улучшения");
      return;
    }
    const updated = { ...activePost, text: data.text };
    setActivePost(updated);
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  async function publishPost() {
    if (!activePost) return;
    const res = await fetch(`/api/posts/${activePost.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });
    if (res.ok) {
      const data = await res.json();
      setActivePost(data.post);
      fetchPosts();
    }
  }

  async function generateIdeas() {
    setIdeasLoading(true);
    setError("");
    const res = await fetch(`/api/companies/${companyId}/ideas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request: ideasRequest }),
    });
    const data = await res.json();
    setIdeasLoading(false);
    if (!res.ok) {
      setError(data.error || "Ошибка генерации идей");
      return;
    }
    setIdeas(data.ideas);
  }

  async function saveText() {
    if (!activePost) return;
    const res = await fetch(`/api/posts/${activePost.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: activePost.text }),
    });
    if (res.ok) fetchPosts();
  }

  function copyText() {
    if (!activePost) return;
    navigator.clipboard.writeText(activePost.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  useEffect(() => {
    fetchPosts();
  }, [companyId]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Генератор постов</h1>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Канал</Label>
              <Input value={channel} onChange={(e) => setChannel(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Тема</Label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
            </div>
          </div>
          <Button onClick={generatePost} disabled={generating || !topic || !channel}>
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {generating ? "Генерация..." : "Написать пост"}
          </Button>
        </CardContent>
      </Card>

      {activePost && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{activePost.topic}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyText}>
                  {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copied ? "Скопировано" : "Копировать"}
                </Button>
                <Button size="sm" onClick={publishPost} disabled={activePost.status === "published"}>
                  <Send className="mr-2 h-4 w-4" />
                  {activePost.status === "published" ? "Опубликован" : "Опубликовать"}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={activePost.text}
              onChange={(e) => setActivePost({ ...activePost, text: e.target.value })}
              onBlur={saveText}
              rows={10}
            />
            {activePost.visualHint && (
              <div className="rounded bg-slate-50 p-3 text-sm">
                <span className="font-medium">Визуал:</span> {activePost.visualHint}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Улучшить:</span>
              <select
                className="rounded border px-2 py-1 text-sm"
                value={refineMode}
                onChange={(e) => setRefineMode(e.target.value as any)}
              >
                <option value="shorter">Короче</option>
                <option value="emotional">Эмоциональнее</option>
                <option value="expert">Экспертнее</option>
              </select>
              <Button variant="outline" size="sm" onClick={refinePost} disabled={refining}>
                {refining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Применить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Идеи и сценарии съёмок</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={ideasRequest}
              onChange={(e) => setIdeasRequest(e.target.value)}
              placeholder="Например: 10 идей для Reels"
            />
            <Button onClick={generateIdeas} disabled={ideasLoading || !ideasRequest}>
              {ideasLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {ideasLoading ? "Генерация..." : "Придумать"}
            </Button>
          </div>
          {ideas.length > 0 && (
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              {ideas.map((idea, idx) => (
                <li key={idx}>{idea}</li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="drafts">
        <TabsList>
          <TabsTrigger value="drafts">Черновики</TabsTrigger>
          <TabsTrigger value="published">Опубликованные</TabsTrigger>
        </TabsList>
        <TabsContent value="drafts" className="space-y-3">
          {posts
            .filter((p) => p.status === "draft")
            .map((post) => (
              <Card key={post.id} className="cursor-pointer" onClick={() => setActivePost(post)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{post.topic}</span>
                    <Badge variant="outline">{post.channel}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.text}</p>
                </CardContent>
              </Card>
            ))}
        </TabsContent>
        <TabsContent value="published" className="space-y-3">
          {posts
            .filter((p) => p.status === "published")
            .map((post) => (
              <Card key={post.id} className="cursor-pointer" onClick={() => setActivePost(post)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{post.topic}</span>
                    <Badge>{post.channel}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.text}</p>
                </CardContent>
              </Card>
            ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
