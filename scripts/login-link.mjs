// scripts/login-link.mjs
//
// GÉNÈRE UN LIEN DE CONNEXION POUR UN COMPTE DE L'ATELIER, ET L'AFFICHE
// DANS LE TERMINAL. Aucun email n'est envoyé.
//
// -- POURQUOI CE SCRIPT EXISTE (4 août 2026) ---------------------------
//
// Jocelyne signalait un problème qu'aucun écran ne reproduisait de notre
// côté. On a diagnostiqué à l'aveugle, on lui a fait faire une manip qui
// n'a rien donné, et il a fallu quatre allers-retours pour comprendre que
// son Atelier était relié au mauvais compte Tiquiz. Voir SON écran aurait
// tranché en dix secondes.
//
// -- CE QUE ÇA FAIT, ET CE QUE ÇA NE FAIT PAS --------------------------
//
// `generateLink` fabrique un lien de connexion à usage unique et à durée
// limitée. Il N'ENVOIE RIEN : c'est l'application qui poste l'email dans
// le flux normal (app/api/auth/magic-link/route.ts). La personne
// concernée ne reçoit donc aucune notification.
//
// Ça ne touche NI son mot de passe, NI sa session en cours. Contrairement
// à une réinitialisation de mot de passe, qui la mettrait dehors de son
// propre compte.
//
// -- LES TROIS RÈGLES ---------------------------------------------------
//
// 1. FENÊTRE PRIVÉE, toujours. Dans un navigateur normal, ouvrir ce lien
//    REMPLACE ta propre session de l'Atelier par la sienne. Tu te
//    retrouves connectée à sa place sans t'en rendre compte.
// 2. On REGARDE, on ne touche à rien. Toute modification faite là serait
//    faite en son nom, sans qu'elle le sache.
// 3. On ferme la fenêtre privée en partant.
//
// -- USAGE --------------------------------------------------------------
//
//   cd <dossier de l'Atelier sur le serveur>
//   set -a; . .env; set +a
//   node scripts/login-link.mjs jocelyne@j-bacquet.fr

import { createClient } from "@supabase/supabase-js";

// Domaine canonique de l'Atelier, écrit en dur ET PAS LU DANS L'ENV.
//
// En prod, NEXT_PUBLIC_APP_URL vaut `http://localhost:3000` : c'est ce qui
// avait envoyé les liens de mot de passe de Véronique sur sa propre
// machine (2 août 2026). Un lien de connexion construit sur cette variable
// mènerait exactement au même mur.
const APP_URL = "https://quizing.tipote.com";

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Usage : node scripts/login-link.mjs <email du compte>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Variables manquantes. Charge le fichier .env d'abord :\n" +
      "  set -a; . .env; set +a",
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.generateLink({
  type: "magiclink",
  email,
  // `/bienvenue` consomme les jetons présents dans le hash et ouvre la
  // session (flux implicite, cf. app/bienvenue/Welcome.tsx).
  options: { redirectTo: `${APP_URL}/bienvenue` },
});

if (error || !data?.properties?.action_link) {
  // Le cas le plus fréquent : aucun compte ne porte cette adresse. On le
  // dit franchement plutôt que de laisser chercher.
  console.error(`Impossible de générer le lien pour ${email}.`);
  console.error(error?.message ?? "aucun lien renvoyé (ce compte existe-t-il ?)");
  process.exit(1);
}

console.log("");
console.log(`Lien de connexion pour ${email} :`);
console.log("");
console.log(data.properties.action_link);
console.log("");
console.log("À OUVRIR EN FENÊTRE PRIVÉE.");
console.log("Dans un onglet normal, tu remplaces ta propre session par la sienne.");
console.log("Usage unique, courte durée. On regarde, on ne modifie rien, on ferme en partant.");
console.log("");
