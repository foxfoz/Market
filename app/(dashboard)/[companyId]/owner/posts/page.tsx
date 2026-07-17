"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Post } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function OwnerPostsPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPosts() {
    const res = await fetch(`/api/companies/${companyId}/posts`);
    const data = await res.json();
    if (res.ok) setPosts(data.posts);
    setLoading(false);
  }

  useEffect(() => {
    fetchPosts();
  }, [companyId]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Посты</h1>

      {loading ? (
        <div className="text-muted-foreground">Загрузка...</div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">Пока нет постов</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{post.topic}</span>
                  <Badge variant={post.status === "published" ? "default" : "outline"}>
                    {post.status === "published" ? "Опубликован" : "Черновик"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{post.text}</p>
                {post.visualHint && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    <strong>Визуал:</strong> {post.visualHint}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
