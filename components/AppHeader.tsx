"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Award,
  BookOpen,
  ChevronDown,
  Gift,
  GraduationCap,
  LifeBuoy,
  Link2,
  LogOut,
  Rocket,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  Trophy,
  UserCircle,
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
  // "Campagne" ne disait rien a personne (retour Bene, 5 aout 2026).
  // C'est la page ou vivent les ressources offertes : les emails, le kit
  // de promo et les modeles a importer.
  { href: "/funnel", label: "Bonus", icon: Gift },
  { href: "/affiliation", label: "Affiliation", icon: Share2 },
];

// Raccourcis externes toujours accessibles (ouverts dans un nouvel
// onglet) : le groupe Telegram de l'Atelier et l'app Tiquiz. Rendus à
// part de la nav interne, avec un style d'accent pour ressortir.
const EXTERNAL_LINKS = [
  {
    href: "https://t.me/+QQoBxQL3l7U3NTE8",
    label: "Le groupe",
    title: "Rejoindre le groupe Telegram de l'Atelier",
    icon: Send,
  },
  {
    // Redirection intelligente : Tiquiz OU Tipote selon ou vit le compte
    // quiz de l'eleve (retour Maurice 29 juillet 2026).
    href: "/api/integrations/tiquiz/go",
    label: "Mon quiz",
    title: "Ouvrir mon tableau de bord quiz (Tiquiz ou Tipote)",
    icon: Rocket,
  },
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

          {/* Raccourcis externes (Telegram + Tiquiz), toujours visibles.
              Séparés visuellement de la nav interne, style accent. */}
          <span className="mx-0.5 hidden h-6 w-px bg-border sm:block" />
          {EXTERNAL_LINKS.map((item) => (
            <Button
              key={item.href}
              asChild
              variant="outline"
              size="sm"
              className="border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
            >
              <a href={item.href} target="_blank" rel="noopener noreferrer" title={item.title}>
                <item.icon />
                <span className="hidden md:inline">{item.label}</span>
              </a>
            </Button>
          ))}

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
                  {/* Rappel des raccourcis externes, surtout utile sur
                      mobile où seules les icônes sont visibles en haut. */}
                  {EXTERNAL_LINKS.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted md:hidden"
                    >
                      <item.icon className="size-4 text-primary" />
                      {item.label}
                    </a>
                  ))}
                  <MenuLink href="/profil" icon={UserCircle}>
                    Mon profil
                  </MenuLink>
                  <MenuLink href="/profil?tab=reglages" icon={Settings}>
                    Réglages
                  </MenuLink>
                  <MenuLink href="/certificat" icon={Award}>
                    Mon certificat
                  </MenuLink>
                  <MenuLink href="/profil?tab=connexion" icon={Link2}>
                    Connexion Tiquiz / Tipote
                  </MenuLink>
                  {/* Audit de l'aide, 6 aout 2026 : l'Atelier n'avait AUCUNE
                      porte de sortie pour un probleme que le coach ne peut
                      pas resoudre (acces, paiement, compte quiz relie au
                      mauvais endroit). Jocelyne a mis quatre allers-retours
                      a faire remonter exactement ca. Le coach et le groupe
                      Telegram repondent sur le CONTENU ; l'email repond sur
                      le COMPTE, et c'est une adresse reelle, deja utilisee
                      par Tiquiz pour les annulations. */}
                  <a
                    href="mailto:hello@ethilife.fr?subject=Atelier%20du%20Quiz%20-%20besoin%20d%27aide"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
                  >
                    <LifeBuoy className="size-4 text-muted-foreground" />
                    Besoin d&apos;aide ?
                  </a>
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
