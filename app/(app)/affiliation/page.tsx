// app/(app)/affiliation/page.tsx
// Espace Affiliation de l'Atelier du Quiz. Présente l'offre (70% sur la
// vente + 40% récurrent Tiquiz), affiche le lien affilié et les gains.
//
// LE LIEN VIENT DU REGISTRE CENTRAL (26 août 2026). Il portait
// `tipote.fr/atelier-du-quiz?sa=...`, donc un tunnel Systeme.io, alors
// que l'Atelier se vend chez nous depuis la veille : leur page ne nous
// transmet pas la query, donc ce lien ne pouvait plus rien
// commissionner chez nous. Le code public est demandé à Tipote, où vit
// la table `affiliates` ; le garder ici donnerait deux registres.
//
// Le kit de contenu (emails, posts, articles, logos, rédacteur IA) ne vit
// PLUS ici : il a son propre espace à dossiers sous /affiliation/contenu,
// aligné sur celui de affiliate.tipote.com.
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/parcours";
import { getAffiliateGains, type AffiliateGains } from "@/lib/affiliateTracking";
import { codePublicDeLEleve } from "@/lib/affiliate/codeEleve";
import { AffiliationClient } from "./AffiliationClient";

export const metadata = {
  title: "Affiliation - L'Atelier du Quiz",
};

export default async function AffiliationPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const p = viewer.profile;
  const sa = p?.sio_affiliate_id ?? "";
  // Vrais gains depuis les commissions attribuées par les webhooks Systeme.io.
  const gains: AffiliateGains | null = sa ? await getAffiliateGains(sa) : null;

  // Le code public de l'élève, créé au premier passage s'il n'en avait
  // pas. On ne le fabrique pas ici : deux registres finiraient par
  // donner deux codes pour la même personne, donc deux liens, donc des
  // statistiques coupées en deux.
  const code = viewer.email
    ? await codePublicDeLEleve({
        email: viewer.email,
        displayName: p?.full_name ?? null,
        sa: sa || null,
      })
    : ({ etat: "injoignable" } as const);

  return (
    <AffiliationClient
      firstName={p?.full_name ?? null}
      niche={p?.niche ?? null}
      activityType={p?.activity_type ?? null}
      initialAffiliateId={sa}
      refCode={code.etat === "ok" ? code.ref : null}
      refEtat={code.etat}
      gains={gains}
    />
  );
}
