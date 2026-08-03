// app/api/systeme-io/webhook/atelier/route.ts
//
// BON DE COMMANDE 7 EUR de la campagne pub : l'Atelier, le coach et le
// Quiz Doctor. PAS les bonus, PAS le générateur d'emails, PAS les 15
// jours de Tiquiz Plus : c'est ce que l'upsell à 47 EUR ajoute.
//
// URL à coller dans Systeme.io :
//   https://quizing.tipote.com/api/systeme-io/webhook/atelier?secret=<SYSTEME_IO_WEBHOOK_SECRET>
// et, pour l'automatisation "Vente annulée" du MÊME produit :
//   ...&event=cancel
//
// Toute la mécanique (authentification, formes de payload, idempotence,
// classification des événements) vit dans lib/webhooks/sioAtelier.ts.
// Ce fichier ne fait que dire QUEL produit est vendu : c'est la seule
// façon d'être sûr que les trois bons de commande se comportent
// identiquement sur la partie fragile.
import { NextRequest } from "next/server";
import { handleSioAtelierWebhook } from "@/lib/webhooks/sioAtelier";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return handleSioAtelierWebhook(req, {
    tier: "standard",
    // Remboursement du produit d'entrée : il n'a plus rien acheté, on
    // coupe tout.
    onTerminal: "revoke",
    trial: "none",
    source: "sio_atelier_7",
  });
}
