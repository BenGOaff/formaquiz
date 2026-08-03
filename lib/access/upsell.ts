// lib/access/upsell.ts
//
// L'URL DU BON DE COMMANDE DE L'UPSELL (campagne pub, 3 août 2026).
//
// Béné : "je te donnerai l'url du bon de commande quand je l'aurai".
// Elle est donc lue dans l'environnement, pas écrite dans le code : le
// jour où elle l'a, elle la renseigne et redémarre, sans attendre que je
// touche au repo.
//
// LUE AU RUNTIME, PAS AU BUILD. `NEXT_PUBLIC_*` est inliné par Next au
// moment du build : une valeur posée après coup n'a aucun effet, et c'est
// exactement ce qui avait gravé un `localhost:3002` dans les liens d'accès
// en prod (drame du 18 juin 2026). On lit donc une variable non publique,
// côté serveur, et on passe le résultat en prop aux composants.
import "server-only";

/**
 * L'URL du bon de commande, ou `null` tant qu'elle n'est pas configurée.
 *
 * `null` n'est pas un cas dégradé à cacher : c'est l'état normal jusqu'au
 * lancement. L'interface affiche alors le flou, le cadenas et le texte,
 * mais AUCUN bouton. Un bouton qui ne mène nulle part le jour du
 * lancement coûte plus cher que pas de bouton : le visiteur clique, rien
 * ne se passe, et il conclut que le produit est cassé.
 */
export function upsellUrl(): string | null {
  const raw = (process.env.ATELIER_UPSELL_URL ?? "").trim();
  if (!raw) return null;
  // On n'accepte qu'une adresse web complète : une valeur à moitié
  // renseignée ("tipote.fr/...", "à venir") produirait un lien mort.
  if (!/^https?:\/\/\S+$/i.test(raw)) {
    console.warn("[upsell] ATELIER_UPSELL_URL ignorée (ce n'est pas une URL http(s)) :", raw);
    return null;
  }
  return raw;
}
