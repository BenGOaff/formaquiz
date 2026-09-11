// lib/email/venteEncaisseeAlerte.ts
//
// L'ENVOI de l'alerte "vente encaissée". Le CONTENU vit dans
// `lib/ventes/alerteVente.ts`, module pur, identique dans les deux
// dépôts ; ici on ne fait que le brancher sur l'Atelier : son nom, sa
// liste d'élèves, ses destinataires.
//
// Best-effort de bout en bout, et APRÈS tout le reste : l'accès, la
// facture et la commission passent devant. Une alerte qui échoue ne
// change jamais la réponse au webhook.

import { getAppUrl } from "@/lib/appUrl";
import { contenuAlerteVente, type VenteAlertee } from "@/lib/ventes/alerteVente";
import { alerterAdmins } from "./alerteAdmin";

export type VenteAAlerter = Omit<VenteAlertee, "app" | "lienAdmin">;

export async function alerterVenteEncaissee(vente: VenteAAlerter): Promise<boolean> {
  try {
    const contenu = contenuAlerteVente({
      ...vente,
      app: "L'Atelier du Quiz",
      lienAdmin: `${getAppUrl()}/admin/eleves`,
    });
    return await alerterAdmins({ subject: contenu.subject, html: contenu.html });
  } catch (e) {
    console.error(`[venteEncaisseeAlerte] ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}
