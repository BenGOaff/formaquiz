// lib/email/alerteAdmin.ts
//
// PRÉVENIR L'ADMIN : UN SEUL ENVOI, TOUJOURS.
//
// Béné, 25 août 2026, capture à l'appui : "je reçois toujours ce genre de
// mails en double c'est normal ? On grille du fric pour rien là ?"
//
// Non, ce n'est pas normal. Trois chemins bouclaient sur `ADMIN_EMAILS` :
//
//     for (const to of ADMIN_EMAILS) await sendEmail({ to, ... })
//
// Deux adresses dans la liste, donc DEUX messages distincts, avec deux
// identifiants différents : aucune boîte de réception ne peut les
// regrouper. Elle en voyait deux parce qu'il y en avait deux.
//
// -- LA DISTINCTION QUI MANQUAIT --------------------------------------
//
// "Qui a le droit d'entrer" et "qui doit être prévenu" sont deux
// questions différentes, et une seule liste répondait aux deux. Elle
// avait déjà été séparée le jour où le coach envoyait ses escalades en
// double... et appliquée à ce seul endroit. Les deux autres chemins sont
// restés cassés.
//
// -- POURQUOI UNE FONCTION ET PAS UNE CONSIGNE ------------------------
//
// Une consigne ("n'oublie pas d'envoyer en un seul appel") est une
// demande. Ici, la boucle est simplement IMPOSSIBLE : il n'y a qu'un
// appel, et il prend la liste entière. C'est la même leçon que les
// listes blanches supprimées le 3 août : quand une erreur ne coûte rien
// à commettre et se voit des semaines plus tard, on la rend impossible,
// on ne demande pas d'y penser.
//
// -- ET LE COÛT ? -----------------------------------------------------
//
// Honnêtement : quelques centimes. Ce sont des alertes d'admin, pas des
// envois de masse. Ce que ça coûtait vraiment, c'est la confiance dans
// sa boîte de réception : un email en double se lit comme un bug, et on
// finit par ne plus les ouvrir.

import { ADMIN_ALERT_EMAILS } from "@/lib/adminEmails";
import { sendEmail } from "@/lib/email/resend";

/**
 * Envoie UNE alerte à l'équipe, en UN seul message.
 *
 * Ne jette jamais : une alerte qui échoue ne doit pas faire tomber le
 * traitement qui l'a déclenchée (une vente encaissée, un cron de nuit).
 */
export async function alerterAdmins(args: {
  subject: string;
  html: string;
}): Promise<boolean> {
  if (ADMIN_ALERT_EMAILS.length === 0) {
    console.warn("[alerteAdmin] aucun destinataire configure :", args.subject);
    return false;
  }
  try {
    const res = await sendEmail({
      to: [...ADMIN_ALERT_EMAILS],
      subject: args.subject,
      html: args.html,
    });
    return res.ok !== false;
  } catch (e) {
    console.error(`[alerteAdmin] ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}
