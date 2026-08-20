// app/commande/[produit]/page.tsx
//
// LE BON DE COMMANDE DE L'ATELIER, PLEINE PAGE.
//
// Béné, 20 août, devant la première version : "il est ultra moche, je
// veux plus de puces promesses issues de la page originale, un design
// plus accordé au design de la page tout en restant sobre, des tailles
// adaptées à tous les écrans, pas besoin de scroll, tout est sur fond
// clair, pas de fond foncé."
//
// -- CE QUE LE PREMIER JET AVAIT RATÉ ----------------------------------
//
// Il empruntait les jetons de couleur de l'APP (`text-muted-foreground`,
// `border-primary`), qui sont ceux du tableau de bord de la créatrice.
// Or cette page n'est pas vue par une créatrice connectée : elle est vue
// par quelqu'un qui vient de lire la page de vente et qui doit sentir
// qu'il est toujours au même endroit. Une rupture visuelle au moment de
// sortir sa carte se paie en abandons.
//
// Les couleurs sont donc celles de la page de vente, relevées dedans et
// écrites une seule fois dans `lib/checkout/brand.ts`. Et elles sont
// posées EN DUR sur cette page, sans dépendre du thème de l'app : un
// acheteur en mode sombre ne doit pas voir un bon de commande sombre.
//
// -- LE FOND FONCÉ N'ÉTAIT PAS LE NÔTRE --------------------------------
//
// Le panneau bleu nuit de sa capture est le formulaire de Stripe, rendu
// dans une iframe de `js.stripe.com`. Notre CSS ne le traverse pas. Il se
// règle par `branding_settings` sur la session, cf. `brand.ts`.
//
// -- LES PROMESSES VIENNENT DE SA PAGE ---------------------------------
//
// Ce sont les 9 lignes de son bloc "RÉSUMÉ DE L'OFFRE", recopiées depuis
// `content/sales/atelier-du-quiz.html`, pas réécrites. Quelqu'un qui a
// lu la page doit retrouver les mêmes mots, sinon il se demande si c'est
// bien la même offre.

import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { findOwnerProduct, formatOwnerPrice } from "@/lib/checkout/catalog";
import {
  readOwnerPaypal,
  readOwnerStripe,
  readOwnerStripePublishable,
} from "@/lib/checkout/ownerAccount";
import { isSalesOpen } from "@/lib/sales/previewGate";
import CommandeClient from "./CommandeClient";

export const dynamic = "force-dynamic";

/** Jamais indexé : c'est un tunnel de paiement, pas une page de contenu. */
export const metadata = {
  robots: { index: false, follow: false },
};

/**
 * Le résumé de l'offre, mot pour mot celui de la page de vente.
 *
 * Court volontairement : la page de vente a déjà convaincu, ici on
 * rassure. Un bon de commande qui re-argumente donne l'impression qu'on
 * essaie encore de vendre à quelqu'un qui a déjà dit oui.
 */
const INCLUS: readonly { titre: string; detail: string }[] = [
  { titre: "Les 7 jours", detail: "Une action par jour. Au 7e jour ton quiz est en ligne. Accès à vie, mises à jour comprises." },
  { titre: "La méthode CAPTO®", detail: "Les 5 maillons d'un quiz qui vend, montés dans l'ordre, appliqués à ton offre." },
  { titre: "Le générateur d'emails", detail: "Il rédige la suite d'emails de chaque profil. Prête à importer dans Systeme.io." },
  { titre: "Le moment de l'email", detail: "Ce qu'il ne faut jamais faire quand tu demandes l'adresse, et le réglage du jour 3." },
  { titre: "Du trafic, sans pub", detail: "Amener des participants sans dépenser un euro, et leur donner envie de partager." },
  { titre: "Le Coach IA", detail: "Connecté aux vraies données de ton quiz. Tu bloques un dimanche soir, tu as ta réponse." },
  { titre: "Le Quiz Doctor", detail: "Le diagnostic question par question qui te dit où tes participants décrochent." },
  { titre: "La communauté", detail: "Tu échanges avec moi et les autres membres pour qu'on avance tous ensemble." },
  { titre: "Les 5 bonus", detail: "Trafic payant, vendre avec ton quiz, les sondages, les popquiz, les réseaux sociaux." },
];

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ produit: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const { produit } = await params;
  const { k } = await searchParams;

  // La porte s'ouvre par la cle OU par le domaine public.
  const host = (await headers()).get("host");
  if (!isSalesOpen(k, host, process.env)) notFound();

  const product = findOwnerProduct(produit);
  if (!product) notFound();

  const prix = formatOwnerPrice(product);

  // Les deux clés doivent parler du MÊME monde. Une clé secrète live avec
  // une clé publiable test (ou l'inverse) donne un formulaire qui refuse
  // la session sans dire pourquoi : moitié de configuration, écran muet.
  const publiable = readOwnerStripePublishable(process.env);
  const secrete = readOwnerStripe(process.env);
  const modesDiscordants = !!publiable && !!secrete && publiable.mode !== secrete.mode;

  // PayPal n'apparaît que s'il est vraiment branché sur CE serveur. Un
  // bouton qui mène à un message d'erreur est pire que pas de bouton :
  // il fait croire à un choix qui n'existe pas.
  const paypalDisponible = !!readOwnerPaypal(process.env);

  return (
    // Le fond clair est posé ici, pas hérité : cette page est publique et
    // ne doit rien devoir au thème de celui qui l'ouvre.
    <main className="min-h-screen bg-white text-[#16182e]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid items-start gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          {/* ---------------- Ce qu'on achète ---------------- */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5a6ef6]">
              Résumé de ta commande
            </p>
            <h1 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">
              Tout l&apos;Atelier du Quiz
            </h1>

            <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-4xl font-extrabold tracking-tight sm:text-5xl">{prix}</span>
              <span className="text-sm font-semibold text-[#6a6f8c]">
                paiement unique, accès à vie
              </span>
            </div>
            <p className="mt-2 text-sm text-[#6a6f8c]">
              Aucun frais caché. 15 jours offerts sur Tiquiz illimité, sans engagement.
            </p>

            <ul className="mt-6 space-y-2.5">
              {INCLUS.map((item, i) => (
                <li key={item.titre} className="flex gap-3">
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#eef2fe] text-[11px] font-bold text-[#5a6ef6]"
                  >
                    {i + 1}
                  </span>
                  <span className="text-[13px] leading-snug sm:text-sm">
                    <strong className="font-semibold">{item.titre}</strong>{" "}
                    <span className="text-[#6a6f8c]">{item.detail}</span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-xl border border-[#e1e6f7] bg-[#eef2fe] px-4 py-3">
              <p className="text-sm font-bold">Garantie 30 jours, sans poser de questions</p>
              <p className="mt-1 text-[13px] leading-snug text-[#3a3e5c]">
                Tu appliques, et si tu n&apos;attires pas de clients avec ton quiz, un email
                suffit : tu es remboursée dans la semaine, sur le moyen de paiement qui a
                servi à la commande.
              </p>
            </div>
          </section>

          {/* ---------------- Le paiement ---------------- */}
          <section className="lg:sticky lg:top-8">
            <div className="rounded-2xl border border-[#e1e6f7] bg-white p-3 shadow-[0_8px_30px_rgba(22,24,46,0.06)] sm:p-4">
              <CommandeClient
                produit={product.id}
                cle={String(k ?? "")}
                clePublique={modesDiscordants ? null : (publiable?.key ?? null)}
                modesDiscordants={modesDiscordants}
                paypalDisponible={paypalDisponible}
              />
            </div>
            <p className="mt-3 text-center text-xs text-[#6a6f8c]">
              Paiement sécurisé par Stripe. Accès immédiat. Facture envoyée par email.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
