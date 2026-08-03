// components/LockedSection.tsx
//
// LE VERROU VISIBLE (campagne pub, 3 août 2026).
//
// Béné : "pour les 7 € tu montres bien que c'est là, ça existe, tu blur et
// tu mets un cadenas + un bouton 'pour accéder aux bonus commande-les
// ici'."
//
// C'est un choix commercial, pas un choix technique : cacher le contenu
// réservé ne vend rien, alors qu'un contenu entrevu donne envie. Le
// composant enveloppe donc le VRAI contenu, le rend illisible, et pose le
// cadenas par dessus.
//
// TROIS PRÉCAUTIONS QUI COMPTENT :
//
// 1. LE FLOU N'EST PAS UNE SÉCURITÉ. Un `blur` CSS se retire en trois
//    secondes dans l'inspecteur du navigateur. Ce composant sert à
//    MONTRER, jamais à protéger : le contenu réellement sensible (le
//    texte généré, les modèles) n'est pas rendu ici, et les routes API
//    correspondantes refusent le palier 7 €. Le flou est une vitrine, la
//    serrure est côté serveur.
// 2. LE CONTENU FLOUTÉ SORT DE LA NAVIGATION AU CLAVIER (`inert`) et des
//    lecteurs d'écran (`aria-hidden`). Sans ça, une personne au clavier
//    tabule dans des champs qu'elle ne peut pas voir, et un lecteur
//    d'écran lit un contenu présenté comme verrouillé.
// 3. PAS DE BOUTON MORT. Tant que l'URL du bon de commande n'est pas
//    renseignée, on affiche le cadenas et le texte sans bouton.
"use client";

import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export interface LockedSectionProps {
  /** Titre du panneau (ce que l'élève n'a pas encore). */
  title: string;
  /** Une ou deux phrases : ce que ça lui apporte, pas ce que c'est. */
  description: string;
  /** Libellé du bouton. */
  ctaLabel?: string;
  /** Bon de commande. `null` = pas de bouton du tout (cf. précaution 3). */
  ctaUrl: string | null;
  /** Le vrai contenu, rendu flouté derrière le panneau. */
  children: ReactNode;
}

export function LockedSection({
  title,
  description,
  ctaLabel = "Débloquer les bonus",
  ctaUrl,
  children,
}: LockedSectionProps) {
  return (
    <div className="relative isolate">
      {/* Le contenu réel, illisible et hors d'atteinte. `select-none`
          évite qu'un copier-coller récupère le texte flouté. */}
      <div
        className="pointer-events-none select-none blur-[6px] saturate-50 opacity-60"
        aria-hidden="true"
        // @ts-expect-error -- `inert` n'est pas encore typé par React.
        inert=""
      >
        {children}
      </div>

      {/* Le panneau. `backdrop-blur` renforce le flou du contenu ET rend
          le texte du panneau lisible quel que soit ce qu'il y a derrière. */}
      <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border bg-background/85 p-6 text-center shadow-lg backdrop-blur-sm">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
          {ctaUrl ? (
            <Button asChild className="mt-4 w-full sm:w-auto">
              <a href={ctaUrl} target="_blank" rel="noopener noreferrer">
                {ctaLabel}
              </a>
            </Button>
          ) : (
            // Pas d'URL configurée : on le dit sobrement plutôt que de
            // poser un bouton qui ne mène nulle part.
            <p className="mt-4 text-xs text-muted-foreground">
              Le bon de commande arrive très vite.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Variante compacte pour une carte d'une grille (les bonus du tableau de
 * bord). Même principe, mais le panneau ne prend pas toute la carte :
 * l'élève doit continuer à lire le titre du bonus, sinon il ne sait pas
 * ce qu'il rate, et la vitrine ne vend rien.
 */
export function LockedCardBadge({ label = "Bonus" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
      <Lock className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}
