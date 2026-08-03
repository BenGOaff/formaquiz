// app/api/systeme-io/webhook/atelier-plus/route.ts
//
// UPSELL 47 EUR de la campagne pub : les bonus, les templates, le
// générateur d'emails (/funnel) et 15 jours de Tiquiz Plus.
//
// URL à coller dans Systeme.io :
//   https://quizing.tipote.com/api/systeme-io/webhook/atelier-plus?secret=<SYSTEME_IO_WEBHOOK_SECRET>
// et, pour l'automatisation "Vente annulée" du MÊME produit :
//   ...&event=cancel
//
// DEUX CHOIX QUI COMPTENT LE JOUR DU LANCEMENT.
//
// 1. `onTerminal: "downgrade"`. Rembourser 47 ne rembourse pas 7 : le
//    client garde l'Atelier et perd les bonus. Révoquer lui retirerait un
//    produit qu'il n'a pas fait rembourser, et c'est le genre de message
//    qu'on reçoit un dimanche soir.
//
// 2. Ce webhook accorde AUSSI l'accès de base. Les deux appels de
//    Systeme.io peuvent arriver dans n'importe quel ordre, ou l'un des
//    deux se perdre : quelqu'un qui a payé 54 EUR ne doit jamais se
//    retrouver sans accès parce que deux webhooks se sont croisés.
//    `mergeTier` ne rétrograde jamais, donc l'ordre d'arrivée est sans
//    conséquence.
//
// Les 15 jours d'essai passent par le tunnel dédié `ADS_TRIAL_FUNNEL` et
// NE consomment PAS une des 20 places de l'opération historique.
import { NextRequest } from "next/server";
import { handleSioAtelierWebhook } from "@/lib/webhooks/sioAtelier";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return handleSioAtelierWebhook(req, {
    tier: "plus",
    onTerminal: "downgrade",
    trial: "ads15",
    source: "sio_atelier_47",
  });
}
