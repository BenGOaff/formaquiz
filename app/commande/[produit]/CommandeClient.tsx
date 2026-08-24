"use client";

// app/commande/[produit]/CommandeClient.tsx
//
// LE FORMULAIRE DE PAIEMENT, DANS NOTRE PAGE.
//
// Stripe s'affiche à l'intérieur, dans un cadre isolé qui reçoit le
// numéro de carte sans qu'il passe jamais par notre serveur. Tout ce qui
// l'entoure est à nous : le prix, la garantie, la promesse.
//
// -- UN ÉCHEC PRODUIT TOUJOURS QUELQUE CHOSE À L'ÉCRAN -----------------
//
// Règle du 3 août. Ici elle compte double : quelqu'un qui veut payer et
// qui voit un cadre vide ne se dit pas "le serveur a un problème", il se
// dit "ça ne marche pas" et il part. Chaque raison renvoyée par le
// serveur a donc sa phrase, en français, avec ce qu'il y a à faire.

import { useCallback, useEffect, useMemo, useState } from "react";

import ChampsFacturation, {
  ACHETEUR_FORM_VIDE,
  type ChampsAcheteur,
} from "@/components/facturation/ChampsFacturation";
import { manques } from "@/lib/facture/identite";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";

import { readSaFromBrowser } from "@/lib/affiliate/sa";

/** Les raisons du serveur, traduites ici et nulle part ailleurs. */
const RAISONS: Record<string, string> = {
  not_found: "Ce bon de commande n'est pas ouvert.",
  unknown_product: "Ce produit n'existe pas.",
  not_configured:
    "Le paiement n'est pas encore branché sur ce serveur. Rien n'a été débité.",
  tax_not_enabled:
    "La TVA automatique n'est pas activée sur le compte Stripe. Rien n'a été débité.",
  stripe_refused: "Stripe a refusé d'ouvrir le paiement. Rien n'a été débité.",
  network: "La connexion a coupé avant d'ouvrir le paiement. Rien n'a été débité.",
  live_without_webhook:
    "Le paiement en conditions réelles est bloqué tant que l'ouverture automatique des accès n'est pas branchée. Rien n'a été débité.",
  invalid_body: "Requête illisible.",
};

/** Les raisons propres à PayPal, avec la même règle : jamais un cadre muet. */
/**
 * Ce qui manque, dit en français et pas en noms de champs.
 *
 * Le serveur renvoie des RAISONS, l'écran dit comment les dire : même
 * règle que la suppression d'un quiz et l'import PDF.
 */
const MOTS_MANQUES: Record<string, string> = {
  nom: "ton nom",
  adresse: "ton adresse",
  ville: "ton code postal et ta ville",
  pays: "ton pays",
};

function LIBELLE_MANQUES(codes: string[]): string {
  const mots = codes.map((c) => MOTS_MANQUES[c] ?? c);
  if (mots.length === 1) return mots[0];
  return `${mots.slice(0, -1).join(", ")} et ${mots[mots.length - 1]}`;
}

const RAISONS_PAYPAL: Record<string, string> = {
  ...RAISONS,
  paypal_refused: "PayPal a refusé d'ouvrir le paiement. Rien n'a été débité.",
  live_without_webhook:
    "Le paiement PayPal est bloqué tant que l'ouverture automatique des accès n'est pas branchée. Rien n'a été débité.",
};

export default function CommandeClient({
  produit,
  cle,
  clePublique,
  modesDiscordants = false,
  paypalDisponible = false,
}: {
  produit: string;
  cle: string;
  clePublique: string | null;
  /** Clé secrète et clé publiable pas dans le même monde (live vs test). */
  modesDiscordants?: boolean;
  /** Le compte PayPal de Béné est branché sur ce serveur. */
  paypalDisponible?: boolean;
}) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const [paypalEnCours, setPaypalEnCours] = useState(false);
  // L'ADRESSE ET LA FACTURATION, DEMANDÉES AVANT PAYPAL.
  //
  // Stripe les collecte lui même (`billing_address_collection: required`
  // + la case entreprise). PayPal ne demande rien et ne rend rien
  // d'exploitable : sans ce bloc, une vente PayPal de l'Atelier n'a
  // AUCUNE adresse, donc aucune facture opposable.
  //
  // Et l'adresse email saisie ici GAGNE sur celle du compte PayPal :
  // c'est elle qui ouvre l'accès. Sans ça, quelqu'un qui paie avec le
  // compte PayPal de son conjoint reçoit ses accès sur une adresse qui
  // n'est pas la sienne (rencontré le 7 août sur les commandes de bonus).
  const [emailPaypal, setEmailPaypal] = useState("");
  const [facturation, setFacturation] = useState<ChampsAcheteur>(ACHETEUR_FORM_VIDE);
  const [erreurPaypal, setErreurPaypal] = useState<string | null>(null);

  // La clé publiable est indispensable au navigateur. Sans elle, le cadre
  // resterait vide sans dire pourquoi : on le dit, et on distingue les
  // deux causes, parce qu'elles n'appellent pas le même geste.
  useEffect(() => {
    if (modesDiscordants) {
      setErreur(
        "Les deux clés Stripe de ce serveur ne sont pas du même type : l'une est en conditions réelles, l'autre en test. Le formulaire reste fermé tant que les deux ne concordent pas.",
      );
      return;
    }
    if (!clePublique) {
      setErreur(
        "La clé publique Stripe n'est pas posée sur ce serveur. Le formulaire ne peut pas s'afficher.",
      );
    }
  }, [clePublique, modesDiscordants]);

  // ── L'AFFILIÉE QUI A ENVOYÉ CETTE ACHETEUSE ──
  //
  // Lu AU MOMENT DE L'APPEL, pas dans un `useEffect`, et c'est le coeur
  // du sujet.
  //
  // Un effet de CE composant s'exécute APRÈS les effets de ses enfants :
  // le fournisseur Stripe aurait donc déjà appelé `fetchClientSecret`
  // avant que l'identifiant soit connu, et la commission serait perdue
  // sans que rien ne s'affiche de travers. Et le mettre dans un état
  // changerait l'identité de la fonction, donc remonterait le formulaire
  // de paiement au premier rendu.
  //
  // Ici il n'y a ni état, ni dépendance, ni course : la fonction ne
  // tourne que dans le navigateur, au moment où on en a besoin.
  const refAffiliee = useCallback(
    () => readSaFromBrowser(window.location.search, document.cookie) ?? undefined,
    [],
  );

  const fetchClientSecret = useCallback(async () => {
    const r = await fetch("/api/commande/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produit, k: cle, ref: refAffiliee() }),
    });
    const data = (await r.json().catch(() => ({}))) as {
      ok?: boolean;
      clientSecret?: string;
      reason?: string;
      mode?: string;
    };
    if (!data.ok || !data.clientSecret) {
      const phrase = RAISONS[data.reason ?? ""] ?? "Le paiement n'a pas pu s'ouvrir.";
      setErreur(phrase);
      // Stripe attend une promesse résolue : on lève pour ne pas monter
      // un formulaire vide par dessus le message d'erreur.
      throw new Error(data.reason ?? "checkout_failed");
    }
    if (data.mode) setMode(data.mode);
    return data.clientSecret;
  }, [produit, cle, refAffiliee]);

  // PAYPAL : ON QUITTE LA PAGE, DONC ON DIT CE QUI SE PASSE.
  //
  // L'acheteur part approuver chez PayPal et revient sur notre page de
  // retour. Entre les deux il y a un temps mort, et un bouton qui ne
  // reagit pas pendant deux secondes se reclique : d'ou l'etat "en
  // cours", qui evite deux commandes pour un seul achat.
  const partirSurPaypal = useCallback(async () => {
    const adresse = emailPaypal.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adresse)) {
      setErreurPaypal("Indique l'adresse email sur laquelle tu veux recevoir tes accès.");
      return;
    }
    // On vérifie AVANT d'ouvrir PayPal : réclamer une adresse à
    // quelqu'un qui vient de payer est le meilleur moyen de ne jamais
    // l'obtenir. `manques()` est la MÊME fonction que celle qui décide,
    // à l'émission, si la facture est complète.
    const incomplet = manques({ ...facturation, email: adresse });
    if (incomplet.length > 0) {
      setErreurPaypal(
        "Il manque " + LIBELLE_MANQUES(incomplet) + " : la facture ne serait pas valable sans.",
      );
      return;
    }
    setErreurPaypal(null);
    setPaypalEnCours(true);
    try {
      const r = await fetch("/api/commande/paypal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produit, k: cle, ref: refAffiliee(), email: adresse, facturation }),
      });
      const data = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        approveUrl?: string;
        reason?: string;
      };
      if (!data.ok || !data.approveUrl) {
        setErreurPaypal(
          RAISONS_PAYPAL[data.reason ?? ""] ?? "PayPal n'a pas pu ouvrir le paiement.",
        );
        setPaypalEnCours(false);
        return;
      }
      window.location.assign(data.approveUrl);
    } catch {
      setErreurPaypal("La connexion a coupé avant d'ouvrir PayPal. Rien n'a été débité.");
      setPaypalEnCours(false);
    }
  }, [produit, cle, refAffiliee, emailPaypal, facturation]);

  // `loadStripe` rend une NOUVELLE promesse a chaque appel. Appelee dans
  // le JSX, elle en fabriquerait une par rendu, et le fournisseur Stripe
  // se remonterait a chaque fois : formulaire qui clignote, champs vides
  // au milieu d'une saisie. On la garde stable.
  const stripePromise = useMemo(
    () => (clePublique ? loadStripe(clePublique) : null),
    [clePublique],
  );

  // UNE PANNE DE CARTE NE DOIT PAS EMPORTER PAYPAL.
  //
  // Le premier jet sortait du composant des que Stripe echouait, donc une
  // cle Stripe absente faisait disparaitre AUSSI le bouton PayPal, et
  // l'acheteur se retrouvait devant une page sans aucun moyen de payer
  // alors qu'il en restait un qui marchait. Deux moyens de paiement, deux
  // sorts independants : le bloc PayPal est rendu dans TOUTES les
  // branches, y compris celle de l'erreur.
  const blocPaypal = paypalDisponible ? (
    <div className="mt-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-[#e1e6f7]" />
        <span className="text-xs font-semibold uppercase tracking-wide text-[#6a6f8c]">ou</span>
        <span className="h-px flex-1 bg-[#e1e6f7]" />
      </div>
      <label className="mb-3 block text-sm font-medium text-[#16182e]">
        Ton adresse email
        <input
          type="email"
          value={emailPaypal}
          onChange={(e) => setEmailPaypal(e.target.value)}
          placeholder="celle qui recevra tes accès"
          className="mt-1 w-full rounded-lg border border-[#e1e6f7] bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5D6CDB]/30"
        />
      </label>
      <div className="mb-4">
        <p className="mb-2 text-sm font-semibold text-[#16182e]">Informations de facturation</p>
        <ChampsFacturation valeur={facturation} onChange={setFacturation} />
      </div>
      <button
        type="button"
        onClick={partirSurPaypal}
        disabled={paypalEnCours}
        className="w-full rounded-lg border border-[#e1e6f7] bg-white px-4 py-3 text-sm font-bold text-[#16182e] transition hover:bg-[#f7f9ff] disabled:cursor-wait disabled:opacity-60"
      >
        {paypalEnCours ? "Ouverture de PayPal..." : "Payer avec PayPal"}
      </button>
      {erreurPaypal && (
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-900">{erreurPaypal}</p>
      )}
    </div>
  ) : null;

  if (erreur) {
    return (
      <div>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900">
          <p className="font-semibold">Le paiement par carte n&apos;a pas pu s&apos;ouvrir.</p>
          <p className="mt-1">{erreur}</p>
        </div>
        {blocPaypal}
      </div>
    );
  }

  if (!clePublique) return <div>{blocPaypal}</div>;

  return (
    <div>
      {mode === "test" && (
        <p className="mb-3 rounded-md bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">
          Mode test : aucun argent ne circule, aucune carte n&apos;est débitée.
        </p>
      )}
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ fetchClientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>

      {blocPaypal}
    </div>
  );
}
