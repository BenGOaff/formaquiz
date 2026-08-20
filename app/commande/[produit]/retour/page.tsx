// app/commande/[produit]/retour/page.tsx
//
// APRÈS LE PAIEMENT : CE QUE L'ACHETEUR VOIT.
//
// Béné, 20 août : "la page merci est aussi éclatée, je veux le même
// style que la page avec toutes les infos de mes pages actuelles."
//
// Le contenu est donc celui de `tipote.fr/atelier-du-quiz-merci` :
// l'email qui arrive, le lien pour choisir son mot de passe, l'avertis-
// sement sur la désinscription, le délai de 15 minutes et le support.
// Ce ne sont pas des phrases décoratives : chacune évite un email de
// support, et celle sur le spam en évite beaucoup.
//
// -- CETTE PAGE N'OUVRE AUCUN ACCÈS ------------------------------------
//
// Elle affiche, elle ne décide pas. Deux raisons, les deux déjà payées
// ailleurs :
//
//   1. **Cette adresse est une URL comme une autre.** Quelqu'un peut
//      l'ouvrir sans avoir rien payé. Ouvrir un accès parce qu'un
//      navigateur est arrivé ici reviendrait à distribuer l'Atelier à
//      qui connaît l'adresse.
//   2. **Beaucoup d'acheteurs ne la voient jamais.** Paiement sur
//      mobile, onglet fermé, réseau qui coupe au retour : l'argent est
//      encaissé et personne n'arrive ici. Un accès qui dépend de cette
//      page, c'est le drame Ivan reproduit à l'identique.
//
// C'est donc le webhook qui ouvre l'accès : il arrive de Stripe, signé,
// il réessaie tout seul, et il n'a pas besoin que l'acheteur soit là.
// Corollaire assumé : les trois écrans ci-dessous disent tous que
// l'accès arrive, y compris celui où on n'a pas retrouvé la commande.

import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { LIENS_LEGAUX, LIEN_SUPPORT } from "@/lib/checkout/brand";
import { findOwnerProduct, formatOwnerPrice } from "@/lib/checkout/catalog";
import { readOwnerPaypal, readOwnerStripe } from "@/lib/checkout/ownerAccount";
import { captureOwnerPaypalOrder } from "@/lib/checkout/paypalOwner";
import { retrieveOwnerSession } from "@/lib/checkout/stripeCheckout";
import { isSalesOpen } from "@/lib/sales/previewGate";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ produit: string }>;
  // `token` est ajouté par PayPal en revenant : c'est l'identifiant de
  // la commande à encaisser. `session_id` est celui de Stripe.
  searchParams: Promise<{ session_id?: string; k?: string; token?: string }>;
}) {
  const { produit } = await params;
  const { session_id: sessionId, k, token: paypalOrderId } = await searchParams;

  // La porte s'ouvre par la cle OU par le domaine public.
  const host = (await headers()).get("host");
  if (!isSalesOpen(k, host, process.env)) notFound();
  const product = findOwnerProduct(produit);
  if (!product) notFound();

  const compte = readOwnerStripe(process.env);
  const parStripe =
    compte && sessionId ? await retrieveOwnerSession(compte.key, sessionId) : null;

  // ── LE RETOUR DE PAYPAL ENCAISSE, MAIS N'OUVRE RIEN ──
  //
  // PayPal renvoie une commande APPROUVÉE, pas encaissée : c'est nous qui
  // devons la capturer. C'est donc le seul endroit du tunnel où la page
  // de retour a un vrai travail à faire.
  //
  // Elle n'ouvre toujours AUCUN accès pour autant : c'est le webhook
  // `PAYMENT.CAPTURE.COMPLETED` qui s'en charge, parce que beaucoup
  // d'acheteurs ne voient jamais cette page. Et si personne n'arrive
  // jamais ici, PayPal annule la commande au bout de 3 jours : personne
  // n'est débité pour rien.
  const comptePaypal = readOwnerPaypal(process.env);
  const parPaypal =
    comptePaypal && paypalOrderId
      ? await captureOwnerPaypalOrder({ compte: comptePaypal, orderId: paypalOrderId })
      : null;

  // Un seul écran pour les deux moyens de paiement : l'acheteur se fiche
  // de savoir par quel tuyau son argent est passé.
  const session = parStripe ?? parPaypal;

  // Trois états, trois écrans. Le troisième est celui qu'on oublie
  // toujours, et c'est le seul où l'acheteur a besoin qu'on le rassure.
  const etat = !session ? "inconnu" : session.paid ? "paye" : "en_attente";

  return (
    <main className="min-h-screen bg-white text-[#16182e]">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        {etat === "paye" && (
          <>
            <p className="text-center text-4xl" aria-hidden>
              🎉
            </p>
            <h1 className="mt-3 text-center text-3xl font-extrabold sm:text-4xl">
              Félicitations !
            </h1>
            <p className="mt-3 text-center text-[15px] text-[#3a3e5c]">
              Ton paiement est bien passé. Bienvenue dans l&apos;Atelier du Quiz.
            </p>

            <div className="mt-8 rounded-2xl border border-[#e1e6f7] bg-[#eef2fe] px-5 py-4">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm font-semibold">Tout l&apos;Atelier du Quiz</span>
                <span className="text-lg font-extrabold">{formatOwnerPrice(product)}</span>
              </div>
              {session?.email && (
                <p className="mt-2 text-[13px] text-[#6a6f8c]">
                  Commande confirmée pour {session.email}
                </p>
              )}
            </div>

            <h2 className="mt-8 text-lg font-bold">
              Dans les prochaines minutes tu vas recevoir :
            </h2>
            <ol className="mt-4 space-y-4">
              {[
                {
                  titre: "Un email",
                  detail: session?.email
                    ? `Il arrive à l'adresse ${session.email}.`
                    : "Il arrive à l'adresse que tu viens de renseigner.",
                },
                {
                  titre: "Un lien à cliquer",
                  detail: "Il te permet de choisir un mot de passe sécurisé.",
                },
                {
                  titre: "Tes accès",
                  detail: "Et te voilà dans l'espace Quizing, à l'Atelier du Quiz.",
                },
              ].map((etape, i) => (
                <li key={etape.titre} className="flex gap-3">
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#5a6ef6] text-xs font-bold text-white"
                  >
                    {i + 1}
                  </span>
                  <span className="text-[15px] leading-snug">
                    <strong className="font-semibold">{etape.titre}</strong>
                    <span className="block text-[#6a6f8c]">{etape.detail}</span>
                  </span>
                </li>
              ))}
            </ol>

            <div className="mt-8 rounded-xl border-l-4 border-[#20bbe6] bg-[#f6fcfe] px-4 py-3">
              <p className="text-sm font-bold">Important</p>
              <p className="mt-1 text-[14px] leading-snug text-[#3a3e5c]">
                Ne te désinscris pas de mes emails et ne les marque pas comme
                indésirables : c&apos;est par là que passent tes accès et toutes les
                nouveautés de l&apos;Atelier.
              </p>
            </div>

            <p className="mt-6 text-[14px] leading-snug text-[#6a6f8c]">
              Rien reçu au bout de 15 minutes ? Regarde dans tes indésirables et dans
              l&apos;onglet Promotions. Si l&apos;email n&apos;y est pas non plus,{" "}
              <a
                href={LIEN_SUPPORT}
                className="font-semibold text-[#5a6ef6] underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                contacte le support en cliquant ici
              </a>
              .
            </p>

            <p className="mt-8 text-[15px] font-semibold">À tout de suite,</p>
            <p className="text-[15px] text-[#6a6f8c]">Béné</p>
          </>
        )}

        {etat === "en_attente" && (
          <>
            <h1 className="text-center text-3xl font-extrabold sm:text-4xl">
              Ton paiement est en cours.
            </h1>
            <p className="mt-4 text-center text-[15px] leading-relaxed text-[#3a3e5c]">
              Certaines banques prennent quelques minutes à confirmer. Tu n&apos;as rien
              à refaire : dès que c&apos;est validé, ton accès s&apos;ouvre tout seul et
              tu reçois ton email avec le lien pour choisir ton mot de passe.
            </p>
            <p className="mt-6 text-center text-[14px] text-[#6a6f8c]">
              Pense à regarder tes indésirables, et ne te désinscris pas de mes emails :
              c&apos;est par là que passent tes accès.
            </p>
          </>
        )}

        {etat === "inconnu" && (
          <>
            <h1 className="text-center text-3xl font-extrabold sm:text-4xl">
              On n&apos;a pas retrouvé cette commande.
            </h1>
            <p className="mt-4 text-center text-[15px] leading-relaxed text-[#3a3e5c]">
              Si tu as été débitée, ton accès s&apos;ouvre quand même : c&apos;est le
              paiement qui commande, pas cette page. Tu recevras ton email avec le lien
              pour choisir ton mot de passe.
            </p>
            <p className="mt-6 text-center text-[14px] text-[#6a6f8c]">
              Toujours rien d&apos;ici une heure ?{" "}
              <a
                href={LIEN_SUPPORT}
                className="font-semibold text-[#5a6ef6] underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Écris nous en cliquant ici
              </a>
              .
            </p>
          </>
        )}

        <footer className="mt-14 border-t border-[#e1e6f7] pt-6">
          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-[12px] text-[#6a6f8c]">
            {LIENS_LEGAUX.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="hover:text-[#5a6ef6] hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {l.texte}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-center text-[12px] text-[#6a6f8c]">
            © 2025-2026 Tipote. Le compagnon business qui te guide de zéro à la liberté !
          </p>
        </footer>
      </div>
    </main>
  );
}
