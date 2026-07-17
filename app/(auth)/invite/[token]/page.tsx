"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [invite, setInvite] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/invites/${token}/accept`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setInvite(data.invite);
        }
        setLoading(false);
      });
  }, [token]);

  async function accept() {
    setAccepting(true);
    setError("");
    const res = await fetch(`/api/invites/${token}/accept`, { method: "POST" });
    const data = await res.json();
    setAccepting(false);
    if (!res.ok) {
      setError(data.error || "Ошибка принятия приглашения");
      return;
    }
    router.push(`/${data.companyId}`);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Приглашение в команду</CardTitle>
          <CardDescription>{invite?.company.name}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Загрузка...
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <p>
                Вас пригласили как <strong>{invite?.role === "owner" ? "собственника" : "маркетолога"}</strong>.
              </p>
              <Button onClick={accept} disabled={accepting} className="w-full">
                {accepting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {accepting ? "Принятие..." : "Принять приглашение"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
