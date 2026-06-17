"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  BookOpen,
  GraduationCap,
  Trophy,
  ShieldCheck,
  UserCircle,
  Settings,
  Link2,
  ChevronDown,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Formation", icon: GraduationCap },
  { href: "/avancees", label: "Avancées", icon: Trophy },
  { href: "/carnet", label: "Carnet", icon: BookOpen },
];

export function AppHeader({
  isAdmin = false,
  name,
  email,
  avatarUrl,
}: {
  isAdmin?: boolean;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Ferme le menu au clic exterieur + a la navigation.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-2">
        <Link href="/dashboard" aria-label="Tableau de bord">
          <Logo className="text-xl" />
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                size="sm"
                className={cn(active && "text-primary")}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              </Button>
            );
          })}
          {isAdmin && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin">
                <ShieldCheck />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            </Button>
          )}

          {/* Avatar + menu deroulant */}
          <div className="relative ml-1" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-1 rounded-full p-0.5 transition-colors hover:bg-muted"
              aria-label="Mon compte"
            >
              <Avatar src={avatarUrl} name={name} email={email} className="size-8 text-xs" />
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>

            {open && (
              <div className="absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
                <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                  <Avatar src={avatarUrl} name={name} email={email} className="size-9" />
                  <div className="min-w-0">
                    {name && <p className="truncate text-sm font-medium">{name}</p>}
                    {email && <p className="truncate text-xs text-muted-foreground">{email}</p>}
                  </div>
                </div>
                <div className="flex flex-col py-1">
                  <MenuLink href="/profil" icon={UserCircle}>
                    Mon profil
                  </MenuLink>
                  <MenuLink href="/profil?tab=reglages" icon={Settings}>
                    Réglages
                  </MenuLink>
                  <MenuLink href="/avancees" icon={Link2}>
                    Connexion Tiquiz
                  </MenuLink>
                  <button
                    type="button"
                    onClick={signOut}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <LogOut className="size-4" />
                    Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

function MenuLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: typeof UserCircle;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
    >
      <Icon className="size-4 text-muted-foreground" />
      {children}
    </Link>
  );
}
