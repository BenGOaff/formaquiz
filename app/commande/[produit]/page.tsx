// app/commande/[produit]/page.tsx
//
// LE BON DE COMMANDE, PLEINE PAGE.
//
// Béné, 19 août : "ok pour bon de commande pleine page pour l'Atelier."
// Pas de popup, pas de saut sur un autre domaine : ce qu'elle achète est
// écrit à côté du formulaire, et le formulaire est dans la page.
//
// -- FERMÉ TANT QUE CE N'EST PAS ANNONCÉ -------------------------------
//
// Même porte que la page de vente en aperçu (`?k=`). Sans la clé, 404 :
// on ne dit même pas que la page existe. La porte vit dans
// `lib/sales/previewGate.ts`, jamais recopiée.
//
// -- LE PRIX VIENT DU CATALOGUE ----------------------------------------
//
// Jamais réécrit ici. Un prix affiché à un endroit et facturé à un autre
// est la faute la plus coûteuse qu'une page de commande puisse commettre,
// et un test interdit qu'un montant soit écrit en dur dans `app/`.

import { notFound } from "next/navigation";

import { findOwnerProduct, formatOwnerPrice } from "@/lib/checkout/catalog";
import { readOwnerStripe, readOwnerStripePublishable } from "@/lib/checkout/ownerAccount";
import { isSalesPreviewOpen } from "@/lib/sales/previewGate";
import CommandeClient from "./CommandeClient";

export const dynamic = "force-dynamic";

/** Jamais indexé : c'est un tunnel de paiement, pas une page de contenu. */
export const metadata = {
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ produit: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const { produit } = await params;
  const { k } = await searchParams;

  if (!isSalesPreviewOpen(k, process.env)) notFound();

  const product = findOwnerProduct(produit);
  if (!product) notFound();

  const prix = formatOwnerPrice(product);

  // Les deux clés doivent parler du MÊME monde. Une clé secrète live avec
  // une clé publiable test (ou l'inverse) donne un formulaire qui refuse
  // la session sans dire pourquoi : moitié de configuration, écran muet.
  const publiable = readOwnerStripePublishable(process.env);
  const secrete = readOwnerStripe(process.env);
  const modesDiscordants = !!publiable && !!secrete && publiable.mode !== secrete.mode;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="grid gap-10 md:grid-cols-2">
        <section className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Ta commande
            </p>
            <h1 className="mt-2 text-3xl font-bold">{product.label}</h1>
            <p className="mt-3 text-4xl font-bold">
              {prix}{" "}
              <span className="text-base font-medium text-muted-foreground">
                paiement unique, accès à vie
              </span>
            </p>
          </div>

          <ul className="space-y-3 text-sm">
            {[
              "Le parcours 7 jours, le coach IA, le Quiz Doctor et la méthode CAPTO.",
              "Ton quiz connecté à Systeme.io, tes leads taggés et tes emails automatisés.",
              "La communauté, l'accès Tiquiz gratuit et 5 bonus pour aller plus loin.",
            ].map((ligne) => (
              <li key={ligne} className="flex gap-3">
                <span aria-hidden className="mt-0.5 font-bold text-primary">
                  ✓
                </span>
                <span>{ligne}</span>
              </li>
            ))}
          </ul>

          <div className="rounded-lg border border-dashed px-4 py-3 text-sm">
            <p className="font-semibold">Garantie 30 jours</p>
            <p className="mt-1 text-muted-foreground">
              Zéro lead en 30 jours ? Je te rembourse, sans poser de questions.
            </p>
          </div>
        </section>

        <section>
          <CommandeClient
            produit={product.id}
            cle={String(k ?? "")}
            clePublique={modesDiscordants ? null : (publiable?.key ?? null)}
            modesDiscordants={modesDiscordants}
          />
        </section>
      </div>
    </main>
  );
}
