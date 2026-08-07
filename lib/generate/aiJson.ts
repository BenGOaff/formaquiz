// lib/generate/aiJson.ts
//
// LIRE LE JSON D'UN MODÈLE, Y COMPRIS QUAND IL A ÉTÉ COUPÉ.
//
// Ces deux fonctions vivaient dans `lib/generate/funnel.ts`, privées,
// donc intestables. Elles décident combien d'emails survivent quand la
// réponse est tronquée : c'est exactement le genre de règle qui doit
// être une fonction pure et testée (cf. le filet de tests logique).
//
// -- CE QUE LE DÉCOUPAGE COÛTAIT (Fabienne, 7 août 2026) ---------------
//
// "Deux des profils en ont bien 5 mais il y a toujours un profil qui
// n'en a qu'un."
//
// `extractJson` coupait au DERNIER `}` du texte. Sur une réponse
// tronquée, ce dernier `}` est celui du dernier email COMPLET, donc on
// jetait la moitié d'email en cours, ce qui est bien. Mais la réparation
// qui suivait, elle, remontait à la dernière virgule hors chaîne, qui se
// trouve À L'INTÉRIEUR du dernier email conservé (celle qui sépare
// `subject` de `body`). Elle sacrifiait donc un email complet de plus, et
// le rendait amputé de son corps.
//
// Vérifié sur des réponses tronquées à la main : une coupure dans le
// corps du 2e email ne laissait qu'UN email, sans corps.
//
// La réparation remonte maintenant à la dernière FIN D'OBJET COMPLET
// (`}` au niveau du tableau) : tout email entier est gardé, aucun email
// amputé n'est fabriqué.

/** Le JSON d'une réponse de modèle, ou null si rien d'exploitable. */
export function extractJson(text: string): unknown | null {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const s = t.indexOf("{");
  const e = t.lastIndexOf("}");
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  try {
    return JSON.parse(t);
  } catch {
    // Reponse coupee : on repare les delimiteurs restes ouverts pour
    // sauver les elements DEJA complets. Mieux vaut trois emails sur
    // cinq qu'un ecran de JSON brut.
    return tryRepairTruncatedJson(t);
  }
}

/** Position de fin de chaque objet/tableau complet, au niveau demandé. */
function scan(text: string) {
  let inString = false;
  let escaped = false;
  const stack: string[] = [];
  /** Index APRÈS le dernier `}` ou `]` qui referme un élément de liste. */
  let finDernierElement = -1;
  /** Index de la dernière virgule hors chaîne, tous niveaux confondus. */
  let derniereVirgule = -1;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (escaped) { escaped = false; continue; }
    if (c === "\\") { escaped = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{" || c === "[") {
      stack.push(c === "{" ? "}" : "]");
    } else if (c === "}" || c === "]") {
      stack.pop();
      // Profondeur 2 = un objet DANS un tableau DANS l'objet racine,
      // c'est à dire un email de la séquence. Sa fermeture est le seul
      // point de coupe qui ne perd aucun élément entier.
      if (stack.length === 2) finDernierElement = i + 1;
    } else if (c === ",") {
      derniereVirgule = i;
    }
  }
  return { finDernierElement, derniereVirgule };
}

/**
 * Répare un JSON tronqué en refermant ce qui reste ouvert.
 *
 * On coupe à la dernière FIN D'ÉLÉMENT COMPLET quand il y en a une, sinon
 * à la dernière virgule hors chaîne (le cas d'un objet plat, sans liste).
 * Puis on referme les tableaux et objets encore ouverts. Ce n'est pas un
 * parseur : c'est un filet, et il ne sert que quand le modèle a été coupé.
 */
export function tryRepairTruncatedJson(text: string): unknown | null {
  const { finDernierElement, derniereVirgule } = scan(text);

  // La fin d'élément passe AVANT la virgule : elle garde les éléments
  // entiers, là où la virgule en amputait toujours un.
  const coupe = finDernierElement > 0 ? finDernierElement : derniereVirgule;
  if (coupe < 0) return null;

  let candidate = text.slice(0, coupe);
  // On recalcule la pile sur le tronçon conservé.
  const closers: string[] = [];
  let inString = false;
  let escaped = false;
  for (let i = 0; i < candidate.length; i++) {
    const c = candidate[i];
    if (escaped) { escaped = false; continue; }
    if (c === "\\") { escaped = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{") closers.push("}");
    else if (c === "[") closers.push("]");
    else if (c === "}" || c === "]") closers.pop();
  }
  candidate += closers.reverse().join("");
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}
