// lib/prompts/systemeIoBloc.ts
//
// CE QU'UN CODE COLLÉ DANS UNE PAGE SYSTEME.IO A LE DROIT D'ÊTRE.
//
// Béné, 25 août 2026 : "le générateur de bonus doit donner un prompt
// adapté pour générer un code compatible systeme io : pas de balises
// html ou body, chargement dynamique des pages etc... il ne doit jamais
// proposer de créer un serveur ou autre non plus, juste un truc simple."
//
// -- POURQUOI CE N'ÉTAIT PAS UN DÉTAIL DE STYLE -----------------------
//
// Le prompt disait "UN SEUL fichier HTML autonome". Un fichier HTML
// autonome, ça commence par <!DOCTYPE html> et ça contient <html>,
// <head> et <body> : c'est la définition. Collé dans un bloc de code,
// c'est une page DANS une page. Le navigateur ne l'ouvre pas comme un
// document, il déplace ou ignore ces balises, et le CSS écrit pour un
// document nu (`body { ... }`, `h1 { ... }`, `button { ... }`) s'applique
// alors A TOUTE LA PAGE de la créatrice : son menu, son texte de vente,
// son bouton d'achat.
//
// Et le résultat n'est pas "rien ne marche", ce qui se verrait tout de
// suite. C'est "ça marche à peu près, et la page autour est abîmée" :
// le pire des symptômes, parce qu'on l'attribue à autre chose.
//
// -- LES DEUX PIÈGES QU'ON NE DEVINE PAS ------------------------------
//
// 1. L'ÉVÈNEMENT DÉJÀ PASSÉ. Une page Systeme.io charge son contenu
//    dynamiquement. Quand le bloc s'exécute, `DOMContentLoaded` est
//    souvent DÉJÀ tiré : un script qui l'attend ne démarre jamais, en
//    silence, sans une ligne dans la console. La créatrice voit un
//    encart vide et conclut que le prompt est mauvais.
// 2. LES NOMS QUI SE COGNENT. Un `id="resultat"` ou une classe `.card`
//    existent déjà dix fois sur une page de vente. D'où le préfixe
//    unique, sur l'identifiant ET sur chaque règle CSS.
//
// -- UN SEUL ENDROIT LE DIT -------------------------------------------
//
// Ces contraintes sont lues par le GÉNÉRATEUR (qui écrit le prompt que
// la créatrice copie) et par le COACH (qui l'accompagne ensuite). Écrites
// en deux exemplaires, elles divergeraient : c'est exactement ce qui
// vient d'arriver à la phrase "colle-le dans une page de blog ou de
// tunnel", corrigée à deux endroits le même jour.

/**
 * Les contraintes techniques, telles qu'elles doivent apparaître DANS le
 * prompt que la créatrice copiera dans Claude ou ChatGPT.
 *
 * Rédigées à la deuxième personne : le destinataire final n'est pas la
 * créatrice, c'est le modèle qui écrira le code.
 */
export const SYSTEME_IO_BLOC_CONTRAINTES = [
  "CE N'EST PAS UNE PAGE, C'EST UN MORCEAU DE PAGE. N'ecris ni <!DOCTYPE>, ni <html>, ni <head>, ni <body>, ni <meta>, ni <title>. Ton code sera colle A L'INTERIEUR d'une page qui existe deja : le navigateur deplace ou ignore ces balises, et la mise en page autour est abimee.",
  "TOUT TIENT DANS UN SEUL <div> qui porte un identifiant unique, par exemple <div id=\"outil-k7x2\">. Le <style> et le <script> vivent dans ce meme bloc.",
  "CHAQUE REGLE CSS COMMENCE PAR CET IDENTIFIANT (#outil-k7x2 h2 { ... }, #outil-k7x2 button { ... }). Aucune regle nue sur body, html, h1, h2, p, a, button, input, *, ni sur une classe generique comme .card ou .container : elle repeindrait toute la page de la creatrice, y compris son menu et son bouton d'achat.",
  "LE JAVASCRIPT S'EXECUTE TOUT DE SUITE. N'attends ni DOMContentLoaded ni window.onload : la page charge son contenu dynamiquement, donc cet evenement est souvent DEJA passe quand ton bloc s'execute, et un code qui l'attend ne demarre jamais, sans aucun message d'erreur. Enveloppe tout dans une fonction anonyme appelee immediatement, et sors sans rien faire si le div n'est pas trouve.",
  "TON SCRIPT NE TOUCHE A RIEN EN DEHORS DE SON DIV : pas de document.body, pas de style global, pas d'ecouteur pose sur document ou window. Tout part du div et reste dedans.",
  "AUCUNE BIBLIOTHEQUE, aucun CDN, aucune police a telecharger, aucune image externe : rien ne doit se charger depuis l'exterieur.",
  "AUCUN SERVEUR, aucune base de donnees, aucune API, aucune cle, aucun compte a creer, aucune installation, aucune etape de build (pas de npm, pas de React, pas de framework, pas de terminal). Tout se calcule dans le navigateur du visiteur, et aucune donnee ne part nulle part.",
  "LISIBLE SUR TELEPHONE D'ABORD.",
  "LA COULEUR PRINCIPALE est posee en variable CSS tout en haut du bloc, pour qu'elle la change en une ligne.",
].join("\n");

/**
 * La même chose en une phrase, pour le COACH.
 *
 * Le coach n'écrit pas le prompt (le générateur l'a déjà fait) : il
 * dépanne quelqu'un dont l'encart est vide ou dont la page est abîmée.
 * Ce sont donc les DEUX SYMPTÔMES qui sont nommés en premier, pas la
 * liste des règles : c'est par le symptôme que l'élève arrive.
 */
export const SYSTEME_IO_BLOC_DEPANNAGE = `

=== UN CODE COLLÉ DANS UNE PAGE SYSTEME.IO (les deux pannes, et leur cause) ===
Un bloc de code n'est pas une page : c'est un morceau inséré dans une page qui existe déjà. Deux pannes en découlent, et les deux ont l'air d'autre chose.

"MON ENCART EST VIDE, IL NE SE PASSE RIEN." La cause la plus fréquente n'est pas le code lui-même : c'est un script qui attend DOMContentLoaded ou window.onload. La page Systeme.io charge son contenu dynamiquement, donc cet évènement est souvent déjà passé quand le bloc s'exécute, et le script ne démarre jamais, sans le moindre message. Fais-lui retirer l'attente : le code doit s'exécuter tout de suite.

"MA PAGE EST TOUTE DÉFORMÉE DEPUIS QUE J'AI COLLÉ ÇA." Deux causes possibles. Soit le code contient des balises de document (<!DOCTYPE>, <html>, <head>, <body>) qui n'ont rien à faire au milieu d'une page. Soit son CSS porte des règles nues (body, h1, p, button, .card) qui s'appliquent à TOUTE la page, menu et bouton d'achat compris. Dans les deux cas la correction est la même : tout tient dans un seul div à identifiant unique, et chaque règle CSS commence par cet identifiant.

CE QU'IL NE DOIT JAMAIS AVOIR À FAIRE : monter un serveur, ouvrir un compte chez un hébergeur, installer quoi que ce soit, passer par un terminal, ou brancher une API avec une clé. Si le code qu'on lui a écrit demande ça, ce n'est pas le bon code : il redemande un bloc unique, autonome, qui calcule tout dans le navigateur. Et s'il te dit que le prompt de son guide ne donne rien, fais-lui d'abord vérifier qu'il a copié le bloc ENTIER.`;
