// Contexte serveur partagé par toutes les pages de l'espace Contenu :
// qui est l'affilié, quel est son lien tracké, et quelles versions du kit
// il s'est personnalisées.
//
// Une seule lecture de profil par page, faite ici : sans ça, chaque rayon
// referait ses propres requêtes et finirait par diverger (un rayon qui
// affiche le lien, un autre qui l'oublie).

import { redirect } from "next/navigation";
import { getViewer } from "@/lib/parcours";
import { lienAffilieDeLEleve } from "@/lib/affiliate/lienEleve";

export type EmailOverride = { subject?: string | null; bodyHtml?: string | null };

export type ContentContext = {
  /** Lien tracké prêt à coller (`atelierduquiz.fr/?ref=...`). Chaîne
   *  vide si le code public n'a pas pu être obtenu : les pages le disent
   *  alors explicitement plutôt que de laisser copier un lien non
   *  tracké, qui se partagerait pareil et ne rapporterait rien. */
  affiliateLink: string;
  hasAffiliateId: boolean;
  /** Nom de signature utilisé dans les contenus ({NAME}). */
  displayName: string;
  firstName: string | null;
  emailOverrides: Record<string, EmailOverride>;
  postOverrides: Record<string, string>;
};

export async function getContentContext(): Promise<ContentContext> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const p = viewer.profile as
    | ({
        full_name?: string | null;
        sio_affiliate_id?: string | null;
        affiliate_email_overrides?: Record<string, EmailOverride> | null;
        affiliate_post_overrides?: Record<string, string> | null;
      })
    | null;

  const sa = p?.sio_affiliate_id ?? "";
  const fullName = (p?.full_name ?? "").trim();

  // Le lien porte le CODE PUBLIC, pas l'identifiant Systeme.io : c'est
  // le seul paramètre que notre bon de commande sait lire. `hasAffiliateId`
  // suit donc le LIEN et non plus le `sa`, sinon un élève sans compte
  // Systeme.io verrait "renseigne ton identifiant" avec son lien juste
  // au dessus.
  const { lien } = await lienAffilieDeLEleve({
    email: viewer.email,
    displayName: fullName || null,
    sa: sa || null,
  });

  return {
    affiliateLink: lien,
    hasAffiliateId: Boolean(lien),
    // Repli neutre : mieux vaut une signature générique qu'un "{NAME}"
    // brut collé tel quel dans un email envoyé à une liste.
    displayName: fullName || "Moi",
    firstName: fullName ? fullName.split(/\s+/)[0] : null,
    emailOverrides: p?.affiliate_email_overrides ?? {},
    postOverrides: p?.affiliate_post_overrides ?? {},
  };
}
