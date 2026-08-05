"use client";

// components/TabBar.tsx
//
// La barre d'onglets de l'espace membre, écrite UNE fois.
//
// -- POURQUOI (demande Béné, 5 août 2026) -----------------------------
//
// "Système d'onglets comme les réglages pour trouver plus facilement."
//
// Le motif existait déjà, mais enfermé dans `ProfileTabs` : le reprendre
// à la main sur un deuxième écran, c'est la garantie que les deux
// finissent par ne plus se ressembler (le padding d'un côté, l'ombre de
// l'autre), et que la troisième page en invente une troisième version.
// C'est exactement ce que le repo corrige en boucle depuis juin.
//
// Deux formes d'entrée, parce que les deux existent déjà dans les
// réglages : un onglet qui bascule un panneau, et un onglet qui mène à
// une autre page (le certificat garde son studio dédié). Elles se
// ressemblent volontairement : pour la personne qui clique, c'est le
// même geste.

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function TabBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-1 rounded-xl border border-border bg-surface-soft p-1">
      {children}
    </div>
  );
}

export function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {children}
    </button>
  );
}

/** Un onglet qui mène ailleurs. Même allure, même geste. */
export function TabLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <Icon className="size-4" />
      {children}
    </a>
  );
}
