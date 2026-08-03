// app/api/systeme-io/webhook/route.ts
//
// WEBHOOK HISTORIQUE de L'Atelier du Quiz : le bon de commande déjà en
// production. Son comportement ne change pas d'un pouce (palier complet,
// révocation sur remboursement, opération des 20 places).
//
// Ce qui change, c'est OÙ vit le code : la mécanique fragile
// (authentification, tolérance aux formes de payload Systeme.io,
// idempotence, classification des événements) a été sortie dans
// lib/webhooks/sioAtelier.ts et sert aux TROIS bons de commande.
//
// Pourquoi ce déplacement compte : recopiée par bon de commande, cette
// mécanique diverge. On corrige un bug d'un côté, pas de l'autre, et on
// ne le découvre qu'en voyant un client qui a payé sans avoir son accès.
// Ici, une correction profite d'office aux trois.
import { NextRequest } from "next/server";
import { handleSioAtelierWebhook } from "@/lib/webhooks/sioAtelier";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return handleSioAtelierWebhook(req, {
    tier: "plus",
    onTerminal: "revoke",
    trial: "legacy20",
    // Inchangé : c'est la valeur déjà écrite dans `enrollments.source` et
    // dans `webhook_logs`. La toucher casserait l'idempotence des events
    // déjà journalisés, donc rejouerait des ventes anciennes.
    source: "systeme_io",
  });
}
