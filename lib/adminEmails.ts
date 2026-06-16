// lib/adminEmails.ts
// Emails autorisés à accéder au back-office admin FormaQuiz.
// Le rôle admin est aussi vérifié côté serveur (jamais déduit du seul
// front) : voir middleware.ts et les routes /api/admin.

export const ADMIN_EMAILS: readonly string[] = [
  "blagardette@gmail.com",
  "hello@ethilife.fr",
];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.some((e) => e.toLowerCase() === email.trim().toLowerCase());
}
