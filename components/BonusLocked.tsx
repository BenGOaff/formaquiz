// components/BonusLocked.tsx
//
// L'écran d'un bonus qu'on n'a pas encore (campagne pub, 3 août 2026).
//
// On sert cette page plutôt qu'un 404 ou une redirection : au palier 7 €,
// l'élève doit comprendre CE QU'IL RATE, sinon il n'a aucune raison
// d'acheter l'upsell. On montre donc le titre réel du bonus, et rien de
// son contenu.
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BonusLocked({
  title,
  subtitle,
  ctaUrl,
}: {
  title: string;
  subtitle?: string | null;
  ctaUrl: string | null;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 py-12 text-center">
      <Link
        href="/dashboard"
        className="self-start inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Retour au parcours
      </Link>

      <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
        <Lock className="size-6 text-primary" aria-hidden="true" />
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/70">Bonus</p>
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
      </div>

      <p className="text-sm text-muted-foreground">
        Ce bonus fait partie de l&apos;offre complète, avec ta campagne (tes emails et tes modèles
        Systeme.io) et 15 jours de Tiquiz Plus offerts.
      </p>

      {/* Pas d'URL configurée : on le dit, on ne pose pas un bouton mort. */}
      {ctaUrl ? (
        <Button asChild size="lg">
          <a href={ctaUrl} target="_blank" rel="noopener noreferrer">
            Débloquer les bonus
          </a>
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">Le bon de commande arrive très vite.</p>
      )}
    </div>
  );
}
