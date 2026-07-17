"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ChatMessage } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Send } from "lucide-react";

export default function ChatPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  async function fetchMessages() {
    const res = await fetch(`/api/companies/${companyId}/chat`);
    const data = await res.json();
    if (res.ok) setMessages(data.messages);
    setLoading(false);
  }

  async function sendMessage() {
    if (!input.trim()) return;
    setSending(true);
    setError("");
    const userMsg: ChatMessage = {
      id: "temp",
      companyId,
      userId: "",
      role: "user",
      content: input,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const res = await fetch(`/api/companies/${companyId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMsg.content }),
    });
    const data = await res.json();
    setSending(false);

    if (!res.ok) {
      setError(data.error || "Ошибка отправки");
      return;
    }

    setMessages((prev) => prev.filter((m) => m.id !== "temp"));
    fetchMessages();
  }

  useEffect(() => {
    fetchMessages();
  }, [companyId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
      <h1 className="text-2xl font-bold">Чат с AI-маркетологом</h1>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardContent className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          {loading ? (
            <div className="text-muted-foreground">Загрузка...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground">Задайте вопрос ассистенту</div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === "user" ? "self-end bg-slate-900 text-white" : "self-start bg-slate-100"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                <span className="mt-1 block text-[10px] opacity-70">
                  {new Date(msg.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </CardContent>
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Например: придумай акцию на май"
              rows={2}
              className="min-h-[60px] resize-none"
            />
            <Button onClick={sendMessage} disabled={sending || !input.trim()} className="self-end">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
