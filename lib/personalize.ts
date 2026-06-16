// lib/personalize.ts
// Remplace les placeholders de prenom dans le contenu user-visible
// (intro/resultat des jours), pour personnaliser la formation.
// L'admin peut ecrire {prenom} (ou {prénom}, {name}) dans son contenu.

export function personalizeText(text: string | null, firstName: string | null): string | null {
  if (!text) return text;
  const name = (firstName ?? "").trim();
  // Sans prenom : on retire proprement le placeholder (et l'espace en trop).
  const replacement = name || "";
  let out = text.replace(/\{\s*(prenom|prénom|name)\s*\}/gi, replacement);
  if (!name) out = out.replace(/ {2,}/g, " ");
  return out;
}
