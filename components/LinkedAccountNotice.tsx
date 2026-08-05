"use client";

// components/LinkedAccountNotice.tsx
//
// L'encart qui dit QUEL compte on interroge, quand ce compte ne montre
// rien. Voir `lib/tiquizAccount.ts` pour le drame qui l'a produit.
//
// Un seul composant pour les quatre écrans (carte du tableau de bord,
// Quiz Doctor, panneau de résultats, conseils du coach) : quatre encarts
// écrits séparément auraient fini par dire quatre choses différentes,
// c'est le défaut que ce code passe son temps à corriger ailleurs.
//
// Il porte AUSSI le bouton de bascule, et pas seulement le texte : la
// phrase "va voir avec quelle adresse tu es connectée" sans le moyen
// d'en changer, c'est ce que Jocelyne a eu pendant six semaines.

import { useState } from "react";
import { toast } from "sonner";
import { Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { accountLine, silenceCopy, type SilenceReason } from "@/lib/tiquizAccount";

export function LinkedAccountNotice({
  reason,
  providerName,
  provider,
  email,
}: {
  reason: SilenceReason;
  /** "Tiquiz" ou "Tipote", via providerLabel(). */
  providerName: string;
  /** La valeur brute, pour construire l'URL de reconnexion. */
  provider: string;
  email: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const copy = silenceCopy(reason, providerName);

  /**
   * Relier un AUTRE compte : on coupe la connexion actuelle (ce qui pose
   * l'opt-out, donc la liaison automatique ne reprendra pas la main sur
   * l'ancienne adresse), puis on relance le consentement.
   *
   * Navigation DURE et pas `router.push` : la route de démarrage pose un
   * cookie anti-CSRF et redirige vers un autre domaine.
   */
  async function switchAccount() {
    setBusy(true);
    try {
      const res = await fetch("/api/integrations/tiquiz/disconnect", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      // Un refus doit produire quelque chose à l'écran : un échec
      // silencieux envoie chercher au mauvais endroit.
      if (!data?.ok) {
        toast.error("Impossible de délier le compte pour le moment. Réessaie dans un instant.");
        setBusy(false);
        return;
      }
      window.location.href = `/api/integrations/tiquiz/start${
        provider === "tipote" ? "?provider=tipote" : ""
      }`;
    } catch {
      toast.error("Impossible de délier le compte pour le moment. Réessaie dans un instant.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 text-left">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Compte {providerName} interrogé
        </span>
        <strong className="break-all text-sm">{accountLine(providerName, email)}</strong>
      </div>
      <p className="text-sm text-muted-foreground">
        {copy.lead} {copy.causes}
      </p>
      <p className="text-xs text-muted-foreground">{copy.action}</p>
      <Button size="sm" variant="outline" onClick={switchAccount} disabled={busy} className="w-fit">
        {busy ? <Loader2 className="animate-spin" /> : <Link2 />}
        Changer de compte
      </Button>
    </div>
  );
}
