// lib/integrations/texteTiquiz.ts
//
// LE TEXTE QUI ARRIVE DE TIQUIZ, SANS SES BALISES NI SES ENTITES.
//
// Ce module est PUR : ni `server-only`, ni `supabaseAdmin`. C'est ce qui
// le rend testable, et c'est la seule raison pour laquelle il existe a
// part de `tiquiz.ts` (16 septembre 2026). La fonction y etait enfermee
// depuis le debut, donc aucun test ne pouvait la charger, donc aucun ne
// l'exercait -- et c'est exactement la ou les bugs s'installent.
//
// `tiquiz.ts` la reexporte : tous les appels existants marchent a
// l'identique.

/**
 * Les titres de quiz Tiquiz sont stockés en HTML riche (spans colorés,
 * alignement). Dans l'Atelier on les affiche en TEXTE seul, sinon le user
 * voit le balisage brut (drame Gwenn 19 juil 2026 : "Ton meilleur quiz :
 * <div style=...>"). On nettoie à l'ingestion, une seule fois.
 *
 * L'ATELIER NE PORTE PAS `lib/texteBrut.ts`, ET C'EST UNE DECISION
 * (16 septembre 2026). Les deux autres depots ont une porte unique vers
 * le texte brut parce qu'ils FABRIQUENT l'entite `&nbsp;` : leur
 * `sanitizeRichText` passe par DOMPurify, dont le serialiseur reencode
 * l'espace insecable que `lib/frenchTypography.ts` vient d'inserer.
 * L'Atelier n'a NI l'un NI l'autre (mesure : aucun DOMPurify, aucun
 * `frenchTypography.ts`). Il ne peut donc rien fabriquer ; il ne fait
 * qu'INGERER ce que Tiquiz lui envoie, et c'est ici que ca se decode.
 *
 * Ce qui manquait quand meme : les formes NUMERIQUES. `&#160;` et
 * `&#x00a0;` sont le MEME caractere que `&nbsp;`, et ils sortaient en
 * clair dans le titre d'un quiz affiche a un eleve.
 */
export function stripTiquizHtml(input: string | null | undefined): string {
  return String(input ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;|&rsquo;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    // Les formes numeriques, decimale et hexadecimale. Elles passent
    // APRES les nommees et AVANT `&amp;`, pour la meme raison que dans
    // `stripHtml` : sinon on double-decode `&amp;#39;`.
    .replace(/&#(\d+);/g, (_m, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, n) => {
      const code = parseInt(n, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    // `&amp;` en dernier, sinon on double-decode `&amp;nbsp;`.
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}
