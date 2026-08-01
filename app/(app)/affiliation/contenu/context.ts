// Contexte serveur partagé par toutes les pages de l'espace Contenu :
// qui est l'affilié, quel est son lien tracké, et quelles versions du kit
// il s'est personnalisées.
//
// Une seule lecture de profil par page, faite ici : sans ça, chaque rayon
// referait ses propres requêtes et finirait par diverger (un rayon qui
// affiche le lien, un autre qui l'oublie).

import { redirect } from "next/navigation";
import { getViewer } from "@/lib/parcours";
import { buildAffiliateLink } from "@/lib/affiliate";

export type EmailOverride = { subject?: string | null; bodyHtml?: string | null };

export type ContentContext = {
  /** Lien tracké prêt à coller. Chaîne vide si l'affilié n'a pas encore
   *  renseigné son identifiant Systeme.io : les pages le disent alors
   *  explicitement plutôt que de laisser copier un lien non tracké. */
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

  return {
    affiliateLink: sa ? buildAffiliateLink(sa) : "",
    hasAffiliateId: Boolean(sa),
    // Repli neutre : mieux vaut une signature générique qu'un "{NAME}"
    // brut collé tel quel dans un email envoyé à une liste.
    displayName: fullName || "Moi",
    firstName: fullName ? fullName.split(/\s+/)[0] : null,
    emailOverrides: p?.affiliate_email_overrides ?? {},
    postOverrides: p?.affiliate_post_overrides ?? {},
  };
}
