// lib/checkout/brand.ts
//
// LES COULEURS DU TUNNEL DE VENTE, ÉCRITES UNE SEULE FOIS.
//
// Béné, 20 août, en voyant le premier bon de commande : "il est ultra
// moche, je veux un design plus accordé au design de la page tout en
// restant sobre, tout est sur fond clair, pas de fond foncé."
//
// Le fond foncé ne venait pas de notre page : il venait de Stripe. Le
// formulaire s'affiche dans une iframe hébergée par `js.stripe.com`, et
// la politique de même origine du navigateur fait que NOTRE CSS ne le
// traverse pas. Aucune classe, aucune variable, aucun réglage Tailwind
// n'a d'effet à l'intérieur. Le seul moyen est `branding_settings` sur la
// session (ou le tableau de bord, mais un réglage de tableau de bord
// n'est pas versionné et se perd).
//
// -- POURQUOI UN FICHIER POUR SIX COULEURS -----------------------------
//
// Parce qu'elles sont lues des DEUX côtés de la frontière : par notre
// page (en classes Tailwind) et par Stripe (en paramètres d'API). Deux
// endroits qui décident de la même couleur finissent toujours par se
// contredire, et cette fois la contradiction se verrait au pire moment,
// au milieu d'un paiement. C'est la leçon des réseaux de partage, du
// score, de l'alignement du sous-titre et de la disposition des réponses.
//
// Les valeurs sont RELEVÉES dans la page de vente en ligne
// (`content/sales/atelier-du-quiz.html`), pas inventées.

/** Le bleu nuit du texte et des titres. */
export const NUIT = "#16182e";
/** L'indigo des boutons et des liens. La couleur d'action. */
export const INDIGO = "#5a6ef6";
/** Le cyan des accents et des puces. */
export const CYAN = "#20bbe6";
/** Le gris bleuté du texte secondaire. */
export const GRIS = "#6a6f8c";
/** Le bleu très clair des cartes et des séparateurs. */
export const CLAIR = "#eef2fe";
/** Le bleu clair des bordures. */
export const BORDURE = "#e1e6f7";

/**
 * Ce qu'on envoie à Stripe pour que son formulaire ressemble à la page
 * qui l'entoure.
 *
 * `font_family` prend un identifiant de la liste de Stripe : Inter y est,
 * et c'est déjà la police de l'app comme de la page de vente.
 *
 * On ne touche PAS au nom affiché (`display_name`). Il vient du compte
 * Stripe, il doit rester celui qui apparaît sur le relevé bancaire, et
 * un écart entre les deux est une cause classique de contestation.
 */
/**
 * Le pied de page légal du bon de commande et de la page de merci.
 *
 * Il vit ici parce que les deux écrans en ont besoin, et qu'une liste de
 * liens recopiée à deux endroits finit avec un lien mort d'un côté et
 * pas de l'autre. C'est arrivé quand même, autrement : voir
 * `LIEN_SUPPORT`.
 *
 * -- DEUX LIENS ÉTAIENT MORTS (mesuré le 31 août 2026) ----------------
 *
 * `www.tipote.fr/affiliation` répond **404**, et il était affiché sous
 * le formulaire de paiement. Le programme d'affiliation a ses conditions
 * maintenues, servies par Tiquiz : c'est là qu'on envoie.
 *
 * Les quatre autres pages répondent 200 et restent chez Systeme.io.
 * **Elles y resteront tant que Béné n'aura pas écrit les siennes** :
 * recopier les conditions générales d'un autre produit, ou les
 * réinventer, serait pire qu'un lien vers une page qui marche. C'est un
 * point ouvert, pas un oubli.
 */
export const LIENS_LEGAUX: readonly { texte: string; href: string }[] = [
  { texte: "Politique de confidentialité", href: "https://www.tipote.fr/politique-de-confidentialite" },
  { texte: "Mentions légales", href: "https://www.tipote.fr/mentions-legales" },
  { texte: "Conditions générales de vente", href: "https://www.tipote.fr/cgv" },
  { texte: "Conditions générales d'utilisation", href: "https://www.tipote.fr/cgu" },
  { texte: "Politique de cookies", href: "https://www.tipote.fr/politique-de-cookies" },
  // Les conditions du programme, celles qui sont maintenues. L'ancienne
  // adresse `tipote.fr/affiliation` répond 404.
  { texte: "Affiliation", href: "https://quiz.tipote.com/affiliate?lang=fr" },
];

/**
 * LÀ OÙ ON RÉPOND QUAND QUELQUE CHOSE CLOCHE.
 *
 * C'était `www.tipote.com/contact`, qui répond **404** (mesuré le
 * 31 août 2026, pas déduit). Ce lien est affiché DEUX FOIS sur la page
 * qui suit le paiement : quelqu'un dont l'accès n'est pas arrivé
 * cliquait dessus et tombait sur une page d'erreur, au pire moment
 * possible.
 *
 * Le centre d'aide porte le formulaire depuis le 23 août, et le ticket
 * atterrit dans la file unique, rattaché à son adresse. `produit=atelier`
 * lui évite d'avoir à le préciser.
 *
 * L'en-tête de l'app importe cette constante au lieu de réécrire
 * l'adresse : c'est exactement la faute que ce fichier dit éviter, et
 * elle avait quand même été commise.
 */
export const LIEN_SUPPORT = "https://app.tipote.com/support?lang=fr&produit=atelier";

export const STRIPE_BRANDING: Readonly<Record<string, string>> = {
  "branding_settings[background_color]": "#ffffff",
  "branding_settings[button_color]": INDIGO,
  "branding_settings[font_family]": "inter",
  "branding_settings[border_style]": "rounded",
};
