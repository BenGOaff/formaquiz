"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, BookOpen, LayoutDashboard, ShieldCheck, ExternalLink, UserCircle } from "lucide-react";

// App Tiquiz (creation des quiz) : l'eleve en a besoin pendant le parcours.
const TIQUIZ_URL = "https://quiz.tipote.com";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export function AppHeader({ isAdmin = false }: { isAdmin?: boolean }) {
  const router = useRouter();

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/dashboard" aria-label="Tableau de bord">
          <Logo className="text-xl" />
        </Link>
        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">
              <LayoutDashboard />
              <span className="hidden sm:inline">Parcours</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/carnet">
              <BookOpen />
              <span className="hidden sm:inline">Carnet</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/profil">
              <UserCircle />
              <span className="hidden sm:inline">Profil</span>
            </Link>
          </Button>
          {isAdmin && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin">
                <ShieldCheck />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <a href={TIQUIZ_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink />
              <span className="hidden sm:inline">Tiquiz</span>
            </a>
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut} aria-label="Se déconnecter">
            <LogOut />
            <span className="hidden sm:inline">Quitter</span>
          </Button>
        </nav>
      </div>
    </header>
  );
}
