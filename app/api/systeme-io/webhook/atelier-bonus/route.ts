// app/api/systeme-io/webhook/atelier-bonus/route.ts
//
// LA DEUXIÈME CHANCE : commander les bonus hors du tunnel d'origine.
//
// Béné, 7 août 2026 : "je suis en train de créer l'upsell atelier augmenté
// pour mon tunnel meta, enfin la deuxième chance, pour qu'ils puissent
// commander les bonus en dehors du tunnel par lequel ils sont arrivés."
//
// Page de vente : https://www.tipote.fr/atelier-du-quiz-bonus
//
// URL à coller dans Systeme.io, sur l'automatisation "Vente confirmée" :
//   https://quizing.tipote.com/api/systeme-io/webhook/atelier-bonus?secret=<SYSTEME_IO_WEBHOOK_SECRET>
// et sur l'automatisation "Vente annulée" du MÊME produit :
//   https://quizing.tipote.com/api/systeme-io/webhook/atelier-bonus?secret=<SYSTEME_IO_WEBHOOK_SECRET>&event=cancel
//
// -- POURQUOI UNE ROUTE À ELLE, ET PAS `atelier-plus` ------------------
//
// Le produit vendu est le même, et tous les réglages métier le sont aussi.
// Une seule chose diffère, et elle change tout : à QUI ce bon de commande
// s'adresse.
//
// `atelier-plus` est l'upsell du tunnel pub. Il vend à quelqu'un qui vient
// d'acheter l'Atelier trente secondes plus tôt. Le compte peut très bien ne
// pas exister encore : les deux automatisations Systeme.io arrivent dans un
// ordre qu'on ne contrôle pas, et l'upsell crée alors légitimement le compte.
//
// Cette page-ci s'adresse à quelqu'un qui a DÉJÀ l'Atelier, arrivé par
// n'importe quel tunnel, parfois il y a des semaines. Une commande qui
// tombe sur une adresse SANS compte n'y est donc pas un nouveau client :
// c'est presque toujours une deuxième adresse ou une faute de frappe.
//
// Sans deux routes, ce cas serait indétectable : le même signal ("aucun
// compte pour cette adresse") veut dire "tout va bien" sur l'une et
// "quelque chose cloche" sur l'autre. D'où `expectsExistingAccount`, et
// d'où le `source` distinct, qui sépare aussi les journaux et l'idempotence.
//
// -- CE QU'ON FAIT DE CE CAS ------------------------------------------
//
// On ouvre l'accès QUAND MÊME, sur l'adresse de la commande : il a payé.
// L'email qu'il reçoit lui dit où sont ses bonus et lui propose de répondre
// avec l'adresse de son compte habituel. Béné reçoit une alerte pour
// pouvoir basculer le palier sur la bonne adresse.
//
// L'essai Tiquiz Plus est idempotent GLOBALEMENT (`maybeGrantPlusTrial`,
// premier verrou) : quelqu'un qui l'a déjà reçu par le tunnel pub ne le
// reçoit pas une seconde fois ici.
import { NextRequest } from "next/server";
import { handleSioAtelierWebhook } from "@/lib/webhooks/sioAtelier";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return handleSioAtelierWebhook(req, {
    tier: "plus",
    onTerminal: "downgrade",
    trial: "ads15",
    source: "sio_atelier_bonus",
    expectsExistingAccount: true,
  });
}
