"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Map,
  CalendarDays,
  FileText,
  BookOpen,
  ImageIcon,
  MessageSquare,
  Users,
  Settings,
  ChevronDown,
  Menu,
  X,
  LogOut,
  TrendingUp,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Role } from "@prisma/client";

export type UserInfo = {
  userId: string;
  email: string;
  name?: string | null;
};

export type CompanyInfo = {
  id: string;
  name: string;
  role: Role;
};

export function AppShell({
  user,
  companies,
  children,
}: {
  user: UserInfo;
  companies: CompanyInfo[];
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const companyId = params?.companyId as string | undefined;
  const activeCompany = companies.find((c) => c.id === companyId);
  const isOwner = activeCompany?.role === "owner";
  const [mobileOpen, setMobileOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const adminMarketerLinks = [
    { href: `/${companyId}`, label: "Обзор", icon: LayoutDashboard },
    { href: `/${companyId}/roadmap`, label: "Дорожная карта", icon: Map },
    { href: `/${companyId}/content-plan`, label: "Контент-план", icon: CalendarDays },
    { href: `/${companyId}/posts`, label: "Посты", icon: FileText },
    { href: `/${companyId}/knowledge`, label: "База знаний", icon: BookOpen },
    { href: `/${companyId}/media`, label: "Медиатека", icon: ImageIcon },
    { href: `/${companyId}/chat`, label: "Чат AI", icon: MessageSquare },
    { href: `/${companyId}/team`, label: "Команда", icon: Users },
    { href: `/${companyId}/settings`, label: "Настройки", icon: Settings },
  ];

  const ownerLinks = [
    { href: `/${companyId}/owner`, label: "Результат", icon: TrendingUp },
    { href: `/${companyId}/owner/activity`, label: "Что сделано", icon: CheckCircle },
    { href: `/${companyId}/owner/posts`, label: "Посты", icon: FileText },
  ];

  const links = isOwner ? ownerLinks : adminMarketerLinks;

  function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <nav className="flex flex-col gap-1 p-4">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Topbar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-white px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger className="lg:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex h-14 items-center border-b px-4 font-semibold">
                MarketPilot
              </div>
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <Link href="/" className="font-bold text-lg">
            MarketPilot
          </Link>
          {companyId && activeCompany && (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="outline" className="gap-2">
                  {activeCompany.name}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {companies.map((c) => (
                  <DropdownMenuItem key={c.id} onClick={() => router.push(`/${c.id}`)}>
                    <span className="flex-1">{c.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{c.role}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={() => router.push("/new-company")}>
                  + Создать компанию
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground md:inline">{user.email}</span>
          <Button variant="ghost" size="icon" onClick={logout} title="Выйти">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar desktop */}
        <aside className="hidden w-64 border-r bg-slate-50 lg:block">
          <NavLinks />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
