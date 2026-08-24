// lib/affiliate/memeAdresse.ts
//
// DEUX ADRESSES QUI VONT DANS LA MÊME BOÎTE.
//
// `bene+atelier@gmail.com`, `b.e.n.e@gmail.com` et `bene@gmail.com`
// arrivent toutes chez la même personne : chez Gmail, les points sont
// ignorés et tout ce qui suit un `+` aussi.
//
// -- POURQUOI CE FICHIER EXISTE (audit du 26 août 2026) ----------------
//
// `attributeQuizingSale` comparait les adresses BRUTES pour refuser
// l'auto-affiliation. Acheter l'Atelier avec `moi+1@gmail.com` suffisait
// donc à se payer 70 % de son propre achat.
//
// La règle existait déjà côté Tiquiz, mais elle ne gardait que le MOIS
// OFFERT : on protégeait le cadeau mieux que le versement. Le fichier
// vit maintenant sous le MÊME nom dans les trois dépôts.

/**
 * Les domaines où les points ne comptent pas.
 *
 * Le `+` est retiré chez tout le monde (la convention est générale) ;
 * les points ne le sont QUE chez Gmail, parce qu'ailleurs
 * `jean.dupont@` et `jeandupont@` peuvent être deux personnes
 * différentes, et les confondre refuserait une commission légitime.
 */
const DOMAINES_GMAIL = new Set(["gmail.com", "googlemail.com"]);

/** L'adresse ramenée à la boîte qu'elle désigne vraiment. */
export function normaliserAdresse(brut: unknown): string {
  const v = String(brut ?? "").trim().toLowerCase();
  const at = v.lastIndexOf("@");
  if (at <= 0) return v;
  let local = v.slice(0, at);
  const domaine = v.slice(at + 1);
  const plus = local.indexOf("+");
  if (plus > 0) local = local.slice(0, plus);
  if (DOMAINES_GMAIL.has(domaine)) {
    local = local.replace(/\./g, "");
    // `googlemail.com` EST `gmail.com` : Google livre les deux dans la
    // meme boite. Les garder distincts laisserait passer l'alias le plus
    // simple qui soit, celui qui ne demande meme pas de `+`.
    return `${local}@gmail.com`;
  }
  return `${local}@${domaine}`;
}

/**
 * Deux adresses qui désignent la même personne.
 *
 * Rend `false` sur une adresse vide : "je ne sais pas" n'est pas "c'est
 * la même", et refuser une commission sur une inconnue serait pire que
 * le risque qu'on couvre.
 */
export function memePersonne(a: unknown, b: unknown): boolean {
  const na = normaliserAdresse(a);
  const nb = normaliserAdresse(b);
  return na.length > 0 && na === nb;
}
