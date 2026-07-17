"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Membership, User, Invite } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, Trash2, Copy, Check } from "lucide-react";

type Member = Membership & { user: User };

export default function TeamPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"marketer" | "owner">("marketer");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  async function fetchData() {
    const [membersRes, invitesRes] = await Promise.all([
      fetch(`/api/companies/${companyId}/members`),
      fetch(`/api/companies/${companyId}/invites`),
    ]);
    const membersData = await membersRes.json();
    const invitesData = await invitesRes.json();
    if (membersRes.ok) setMembers(membersData.members);
    if (invitesRes.ok) setInvites(invitesData.invites);
    setLoading(false);
  }

  async function createInvite() {
    setCreating(true);
    setError("");
    const res = await fetch(`/api/companies/${companyId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error || "Ошибка создания приглашения");
      return;
    }
    fetchData();
  }

  async function revokeInvite(inviteId: string) {
    await fetch(`/api/companies/${companyId}/invites?inviteId=${inviteId}`, { method: "DELETE" });
    fetchData();
  }

  async function removeMember(membershipId: string) {
    await fetch(`/api/members/${membershipId}`, { method: "DELETE" });
    fetchData();
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  useEffect(() => {
    fetchData();
  }, [companyId]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Команда</h1>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Пригласить участника</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <Select value={role} onValueChange={(v) => setRole(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="marketer">Маркетолог</SelectItem>
              <SelectItem value="owner">Собственник</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={createInvite} disabled={creating}>
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Создать ссылку
          </Button>
        </CardContent>
      </Card>

      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Активные приглашения</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {invites.map((invite) => (
              <div key={invite.id} className="flex flex-col gap-2 rounded border p-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <Badge>{invite.role}</Badge>
                  <p className="text-xs text-muted-foreground">Действует до {new Date(invite.expiresAt).toLocaleDateString("ru-RU")}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyLink(invite.token)}>
                    {copiedToken === invite.token ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    {copiedToken === invite.token ? "Скопировано" : "Копировать ссылку"}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => revokeInvite(invite.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Участники</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-muted-foreground">Загрузка...</div>
          ) : members.length === 0 ? (
            <div className="text-muted-foreground">Нет участников</div>
          ) : (
            members.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded border p-3">
                <div>
                  <p className="font-medium">{member.user.name || member.user.email}</p>
                  <p className="text-sm text-muted-foreground">{member.user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{member.role}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => removeMember(member.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
