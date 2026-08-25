// lib/adminEmails.ts
// Emails autorisés à accéder au back-office admin L'Atelier du Quiz.
// Le rôle admin est aussi vérifié côté serveur (jamais déduit du seul
// front) : voir middleware.ts et les routes /api/admin.

export const ADMIN_EMAILS: readonly string[] = [
  "blagardette@gmail.com",
  "hello@ethilife.fr",
];

// QUI ON PRÉVIENT, ET C'EST UNE AUTRE QUESTION QUE "QUI A LE DROIT".
//
// `ADMIN_EMAILS` dit qui peut ENTRER dans le back-office. Ça ne dit rien
// de qui doit être PRÉVENU : les deux adresses ci-dessus arrivent dans la
// même boîte, donc alerter les deux, c'est deux emails pour un seul
// évènement.
//
// -- BÉNÉ, 25 AOÛT 2026 -----------------------------------------------
//
// "Je reçois toujours ce genre de mails en double c'est normal ?"
//
// Non. Cette distinction avait été écrite le jour où le coach envoyait
// ses escalades en double, et elle n'a été appliquée QU'À CET
// ENDROIT-LÀ. Deux autres chemins bouclaient encore sur `ADMIN_EMAILS`
// (les candidats à mettre en avant, l'alerte de bonus non attribué), et
// ils envoyaient donc toujours deux messages.
//
// D'où le renommage : ce n'est pas une liste "d'escalade", c'est LA
// liste des alertes. Et `alerterAdmins()` (lib/email/alerteAdmin.ts) est
// le SEUL chemin : il fait UN envoi, donc plus personne ne peut boucler.
//
// Pour prévenir une autre personne, ajoute son adresse ici : elle
// recevra le même et unique message.
export const ADMIN_ALERT_EMAILS: readonly string[] = [
  "blagardette@gmail.com",
];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.some((e) => e.toLowerCase() === email.trim().toLowerCase());
}
