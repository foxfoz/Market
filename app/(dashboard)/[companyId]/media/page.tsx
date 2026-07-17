"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MediaFile } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RefreshCw, ImageIcon } from "lucide-react";

export default function MediaPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [folderUrl, setFolderUrl] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  async function fetchFiles() {
    const res = await fetch(`/api/companies/${companyId}/media`);
    const data = await res.json();
    if (res.ok) setFiles(data.files);
    setLoading(false);
  }

  async function sync() {
    setSyncing(true);
    setError("");
    const res = await fetch(`/api/companies/${companyId}/media/disk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderUrl }),
    });
    const data = await res.json();
    setSyncing(false);
    if (!res.ok) {
      setError(data.error || "Ошибка синхронизации");
      return;
    }
    setFiles(data.files);
  }

  useEffect(() => {
    fetchFiles();
  }, [companyId]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Медиатека</h1>

      <Card>
        <CardHeader>
          <CardTitle>Подключить Яндекс.Диск</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Публичная ссылка на папку</Label>
            <Input
              value={folderUrl}
              onChange={(e) => setFolderUrl(e.target.value)}
              placeholder="https://disk.yandex.ru/d/..."
            />
          </div>
          <Button onClick={sync} disabled={syncing || !folderUrl}>
            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {syncing ? "Синхронизация..." : "Синхронизировать"}
          </Button>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-muted-foreground">Загрузка...</div>
      ) : files.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Медиатека пуста. Подключите папку Яндекс.Диска.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          {files.map((file) => (
            <Card key={file.id} className="overflow-hidden">
              <CardContent className="p-0">
                {file.previewUrl ? (
                  <img src={file.previewUrl} alt={file.name} className="aspect-square w-full object-cover" />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-slate-100">
                    <ImageIcon className="h-8 w-8 text-slate-400" />
                  </div>
                )}
                <div className="p-2">
                  <p className="truncate text-xs font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{file.mimeType}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
