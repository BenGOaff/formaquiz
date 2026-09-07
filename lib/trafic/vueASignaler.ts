// lib/trafic/vueASignaler.ts
//
// COMBIEN DE MONDE ARRIVE SUR atelierduquiz.fr (Bene, 7 septembre 2026).
//
// "il me faut aussi le compteur de l'Atelier."
//
// Tiquiz compte son trafic depuis le 7 septembre, et le centre de
// pilotage montre le trafic et les ventes ensemble. L'Atelier vit dans
// ce depot, avec sa PROPRE base : sans compteur ici, son ecran de vente
// restait le seul dont personne ne savait combien de monde le lit.
//
// -- LE PILOTAGE VIENT LIRE, L'ATELIER NE POUSSE PAS ------------------
//
// C'est le motif deja etabli par `fetchAtelier` (21 aout) : Tiquiz va
// chercher chez nous avec `PARTNER_SHARED_SECRET`, et dit honnetement
// s'il a pu lire.
//
// Pousser vers Tiquiz a chaque vue serait plus court a ecrire et
// STRICTEMENT moins bon : une panne de Tiquiz ferait perdre les vues de
// l'Atelier POUR TOUJOURS, en silence. En gardant les vues dans notre
// base, une panne de Tiquiz ne coute que l'affichage.
//
// -- POURQUOI PAS GA4 -------------------------------------------------
//
// GA4 ne compte QUE les gens qui ont accepte le bandeau cookies, et pas
// ceux qui ont un bloqueur. Son trafic est donc SOUS-compte, alors que
// les ventes sont exactes : diviser l'un par l'autre donnerait un taux
// de conversion trop beau, affiche comme un fait (regle du 22 aout).
//
// -- CE QU'ON NE STOCKE PAS, ET C'EST LA CONDITION --------------------
//
// Ni adresse IP, ni cookie, ni identifiant, ni empreinte. Un compteur
// par (jour, hote, chemin, source). Rien ici ne designe une personne,
// donc rien n'y demande de consentement, donc le compteur voit AUSSI
// ceux qui refusent le bandeau.
//
// Corollaire assume : sans cookie, on ne distingue pas une personne
// d'une page. On compte des VUES DE PAGE, et l'ecran ecrit "vues",
// jamais "visiteurs".
//
// Ce module est PUR et sans dependance : il est importe par le
// middleware. Aucune decision ne vit ailleurs.

/** Les hotes dont on compte le trafic. */
import { SALES_HOSTS } from "@/lib/sales/salesHosts";

/**
 * LES ROBOTS NE SONT PAS DU TRAFIC.
 *
 * Sans ce filtre, le compteur additionne Googlebot, les sondes de
 * disponibilite et les aspirateurs, et le taux de conversion s'effondre
 * sans qu'aucune vente ait manque. C'est le meme defaut qu'un funnel
 * calcule sur trois visiteurs : le chiffre existe et il ne veut rien
 * dire.
 *
 * Liste volontairement LARGE sur le suffixe `bot`, plus les agents
 * connus qui ne le portent pas. Un robot compte comme une vue est une
 * erreur silencieuse ; un humain rate est une vue en moins, visible
 * seulement si le total s'effondre. Le sens du repli est donc d'exclure.
 */
const AGENTS_ROBOTS = [
  "bot",
  "spider",
  "crawler",
  "slurp",
  "curl",
  "wget",
  "python-requests",
  "headlesschrome",
  "lighthouse",
  "pingdom",
  "uptime",
  "monitor",
  "preview",
  "fetcher",
  "facebookexternalhit",
  "whatsapp",
  "telegram",
  "embedly",
  "quora link preview",
  "vercel",
  "node-fetch",
  "axios",
  "go-http-client",
  "java/",
  "postman",
] as const;

/** Cet agent est-il un robot ? */
export function estUnRobot(userAgent: string | null | undefined): boolean {
  const ua = String(userAgent ?? "").toLowerCase().trim();
  // Un agent VIDE n'est jamais un navigateur qui affiche une page.
  if (!ua) return true;
  return AGENTS_ROBOTS.some((motif) => ua.includes(motif));
}

/**
 * Cette requete vaut-elle une vue de page ?
 *
 * Les quatre gardes, dans l'ordre du moins cher au plus cher :
 * l'hote (on ne compte que le site public), le chemin (ni API ni
 * fichier), l'en-tete `accept` (un navigateur qui demande une PAGE dit
 * `text/html`), et l'agent.
 *
 * Meme forme que `clicASignaler` : c'est la seule decision de ce
 * fichier, donc la seule chose qui pouvait deriver.
 */
export function vueASignaler(args: {
  host: string | null | undefined;
  pathname: string;
  accept: string | null | undefined;
  userAgent: string | null | undefined;
}): boolean {
  const h = String(args.host ?? "").trim().toLowerCase().split(":")[0];
  if (!Object.prototype.hasOwnProperty.call(SALES_HOSTS, h)) return false;
  if (args.pathname.startsWith("/api/")) return false;
  // Un fichier a une extension ; une page n'en a pas.
  if (/\.[a-z0-9]{2,5}$/i.test(args.pathname)) return false;
  if (!String(args.accept ?? "").includes("text/html")) return false;
  return !estUnRobot(args.userAgent);
}

/**
 * LE CHEMIN, RAMENE A QUELQUE CHOSE QU'ON PEUT LIRE DANS UN TABLEAU.
 *
 * Le site public a une cardinalite naturellement bornee (10 articles,
 * 8 fonctionnalites, 7 integrations, 4 produits), donc on garde le
 * chemin REEL : agreger `/blog/<slug>` en `/blog/*` retirerait
 * justement la reponse a "quel article amene du monde".
 *
 * Les trois bornes ne servent qu'a empecher un scanner de remplir la
 * table de lignes uniques : minuscules, 3 segments au plus, 120
 * caracteres au plus. Un chemin plus profond est TRONQUE et marque,
 * jamais jete : une ligne bizarre dans le tableau se voit et se
 * comprend, une vue disparue ne se voit pas.
 */
export function cheminPourStats(pathname: string | null | undefined): string {
  let p = String(pathname ?? "/").trim().toLowerCase();
  if (!p.startsWith("/")) p = "/" + p;
  // La barre finale ne cree pas une deuxieme page.
  if (p.length > 1) p = p.replace(/\/+$/, "");
  if (p === "") p = "/";
  const segments = p.split("/").filter(Boolean);
  if (segments.length > 3) p = "/" + segments.slice(0, 3).join("/") + "/…";
  if (p.length > 120) p = p.slice(0, 119) + "…";
  return p;
}

/**
 * D'OU VIENT CETTE VUE.
 *
 * Trois etages, du plus explicite au plus devine :
 *
 * 1. le canal que l'affilie a pose lui meme (`?sc=youtube`) ou une
 *    campagne (`?utm_source=`). C'est ce que le referrer ne peut PAS
 *    voir : une newsletter, un lien en bio, un QR code ;
 * 2. le referrer, ramene a un nom lisible pour ce qu'on connait ;
 * 3. rien du tout -> `direct`.
 *
 * Un referrer sur NOTRE hote rend `interne` : c'est une navigation dans
 * le site, elle compte comme vue mais elle n'a amene personne. La
 * confondre avec `direct` gonflerait le seul chiffre qu'on regarde pour
 * juger si le referencement travaille.
 */
const SOURCES_CONNUES: Readonly<Record<string, string>> = {
  "google": "google",
  "bing": "bing",
  "duckduckgo": "duckduckgo",
  "ecosia": "ecosia",
  "qwant": "qwant",
  "yandex": "yandex",
  "pinterest": "pinterest",
  "facebook": "facebook",
  "instagram": "instagram",
  "linkedin": "linkedin",
  "youtube": "youtube",
  "tiktok": "tiktok",
  "reddit": "reddit",
  "threads": "threads",
  "x": "x",
  "twitter": "x",
  "t": "x",
  "whatsapp": "whatsapp",
  "systeme": "systeme.io",
  "chatgpt": "chatgpt",
  "perplexity": "perplexity",
  "claude": "claude",
};

/** Nettoie une valeur de source : minuscules, borne, jamais vide. */
function propre(brut: string | null | undefined, secours: string): string {
  const v = String(brut ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return v || secours;
}

export function sourceDeLaVue(args: {
  referrer: string | null | undefined;
  /** `?sc=` (le canal d'un affilie) et `?utm_source=`, dans cet ordre. */
  canal: string | null | undefined;
  utmSource: string | null | undefined;
  /** L'hote de NOTRE page, pour reconnaitre une navigation interne. */
  host: string | null | undefined;
}): string {
  const explicite = String(args.canal ?? "").trim() || String(args.utmSource ?? "").trim();
  if (explicite) return propre(explicite, "direct");

  const brut = String(args.referrer ?? "").trim();
  if (!brut) return "direct";

  let hoteRef = "";
  try {
    hoteRef = new URL(brut).hostname.toLowerCase();
  } catch {
    // Un referrer illisible n'est pas une source : on ne devine pas.
    return "direct";
  }
  if (!hoteRef) return "direct";

  const nous = String(args.host ?? "").trim().toLowerCase().split(":")[0];
  if (hoteRef === nous || hoteRef === "www." + nous || "www." + hoteRef === nous) return "interne";

  // `www.google.fr` et `com.google.android.gm` disent tous les deux
  // Google : on prend le nom de domaine, pas le sous-domaine.
  const morceaux = hoteRef.replace(/^www\./, "").split(".");
  const nom = morceaux.length >= 2 ? morceaux[morceaux.length - 2] : morceaux[0];
  return SOURCES_CONNUES[nom] ?? propre(hoteRef.replace(/^www\./, ""), "direct");
}
