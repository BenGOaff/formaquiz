// lib/email/accesAlerte.ts
//
// L'ENVOI de l'alerte « paiement sans accès » / « accès incomplet ». La
// décision (faut-il alerter, quoi dire) vit dans
// `lib/ventes/alerteAcces.ts`, module pur, identique dans les deux
// dépôts ; ici on ne fait que le brancher sur l'Atelier.
//
// Best-effort : une alerte qui échoue ne change jamais la réponse au
// webhook, ni le 502 qui fait réessayer le fournisseur.

import { getAppUrl } from "@/lib/appUrl";
import { alerteAccesNecessaire, contenuAlerteAcces, type AccesAlerte } from "@/lib/ventes/alerteAcces";
import { alerterAdmins } from "./alerteAdmin";

export type AccesAAlerter = Omit<AccesAlerte, "app" | "lienAdmin">;

export async function alerterAccesIncomplet(acces: AccesAAlerter): Promise<boolean> {
  try {
    if (!alerteAccesNecessaire(acces.octroi)) return false;
    const contenu = contenuAlerteAcces({
      ...acces,
      app: "L'Atelier du Quiz",
      lienAdmin: `${getAppUrl()}/admin/eleves`,
    });
    return await alerterAdmins({ subject: contenu.subject, html: contenu.html });
  } catch (e) {
    console.error(`[accesAlerte] ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}
