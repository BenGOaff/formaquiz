// lib/env/expediteur.ts
//
// L'ADRESSE D'EXPÉDITION, VÉRIFIÉE AU DÉMARRAGE.
//
// Béné, 30 août 2026 : l'Atelier écrit désormais depuis
// `atelierduquiz.fr`, plus depuis le domaine de Tipote.
//
// Ici, contrairement à Tiquiz, une variable ABSENTE ne produit pas un
// repli silencieux : `lib/email/resend.ts` refuse d'envoyer et le dit.
// Le danger propre à cette app est ailleurs, et il est plus sournois :
// une adresse posée sur un domaine **pas encore vérifié chez Resend**.
// L'envoi part, l'API répond 200, et tout atterrit en spam. Aucun
// symptôme, sauf des clientes qui ne reçoivent pas leurs accès.
//
// C'est exactement la forme de la panne du 22 août : la valeur du
// FICHIER et la valeur du PROCESSUS peuvent différer, et seul un
// contrôle au démarrage voit celle que le processus a vraiment reçue.
//
// On JOURNALISE, on ne fait pas tomber le serveur : une app qui refuse
// de démarrer part en boucle sous PM2, ce qui est plus dur à lire qu'un
// message écrit une fois, en clair, au bon moment.
//
// Ce module est PUR : aucune lecture de `process.env`, aucun import qui
// exige une variable au chargement. C'est ce qui le rend testable, et
// c'est la leçon du verrou des webhooks du 24 août (la décision était
// enfermée dans un fichier qui importait `supabaseAdmin`, donc aucun
// test ne pouvait l'atteindre, donc c'est là que le bug s'est installé).

/** Ce qui cloche avec l'expéditeur, ou rien. */
export type DiagnosticExpediteur =
  | { ok: true }
  | { ok: false; genre: "absente"; adresse: string }
  | { ok: false; genre: "nom-en-double"; brut: string }
  | { ok: false; genre: "domaine-inattendu"; adresse: string; attendus: string[] };

/** Le domaine d'une adresse, en minuscules. Vide si l'adresse est illisible. */
export function domaineDe(adresse: string): string {
  const at = adresse.lastIndexOf("@");
  return at === -1 ? "" : adresse.slice(at + 1).trim().toLowerCase();
}

/**
 * Trois défauts, et ils n'appellent pas la même correction.
 *
 *   - `absente`     : personne n'a posé la variable, on écrit sous
 *                     l'ancienne marque sans le savoir ;
 *   - `nom-en-double`: le `.env` porte déjà un nom (`Tiquiz <...>`), et
 *                     le code en rajoute un. Resend refuse l'adresse,
 *                     donc **plus aucun email ne part**, liens de
 *                     connexion compris. C'est le plus grave des trois,
 *                     et c'est celui qu'on risque le jour d'une
 *                     bascule. `adresseNue` le rattrape à l'exécution ;
 *                     ce diagnostic sert à le faire corriger ;
 *   - `domaine-inattendu` : l'adresse part d'un domaine qui n'est
 *                     probablement pas vérifié chez Resend, donc en
 *                     spam. On ne peut pas le prouver sans interroger
 *                     Resend, donc on le SIGNALE, on ne tranche pas.
 */
export function verifierExpediteur(args: {
  /** La valeur BRUTE de la variable, telle que le processus l'a reçue. */
  brut: string | undefined;
  /** Les domaines depuis lesquels cette app a le droit d'écrire. */
  domainesAttendus: string[];
}): DiagnosticExpediteur {
  const brut = (args.brut ?? "").trim();
  const attendus = args.domainesAttendus.map((d) => d.toLowerCase());

  if (!brut) {
    return { ok: false, genre: "absente", adresse: "(aucune)" };
  }
  if (brut.includes("<")) {
    return { ok: false, genre: "nom-en-double", brut };
  }
  const domaine = domaineDe(brut);
  if (!attendus.includes(domaine)) {
    return { ok: false, genre: "domaine-inattendu", adresse: brut, attendus };
  }
  return { ok: true };
}

/**
 * Le message écrit dans `pm2 logs`, ou rien.
 *
 * Une adresse d'expédition n'est PAS un secret : c'est elle qui apparaît
 * dans la boîte de réception de chaque cliente. L'imprimer est ce qui
 * rend le diagnostic exploitable, contrairement aux clés d'API que les
 * contrôles du 22 août refusent d'afficher.
 */
export function formaterExpediteur(d: DiagnosticExpediteur, marque: string): string | null {
  if (d.ok) return null;
  const entete = `\n[${marque}] EXPÉDITEUR DES EMAILS`;
  if (d.genre === "absente") {
    return (
      `${entete}\n` +
      `  FORMAQUIZ_EMAIL_FROM n'est pas posée dans le processus.\n` +
      `  AUCUN email ne partira : ni accès après paiement, ni lien de\n` +
      `  connexion. Poser la variable dans le .env AVANT le build (le\n` +
      `  postbuild recopie les .env dans .next/standalone/).\n`
    );
  }
  if (d.genre === "nom-en-double") {
    return (
      `${entete}\n` +
      `  FORMAQUIZ_EMAIL_FROM contient un nom : ${d.brut}\n` +
      `  Le nom est écrit par le code (withBrandName), qui n'en garde que\n` +
      `  l'adresse. Rien n'est cassé, mais corriger le .env : l'adresse\n` +
      `  NUE, sans chevrons.\n`
    );
  }
  return (
    `${entete}\n` +
    `  Les emails partent de ${d.adresse}, hors des domaines attendus\n` +
    `  (${d.attendus.join(", ")}). Si ce domaine n'est pas vérifié chez\n` +
    `  Resend, tout part en spam sans autre symptôme.\n`
  );
}
