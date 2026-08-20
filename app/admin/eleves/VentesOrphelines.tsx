// app/admin/eleves/VentesOrphelines.tsx
//
// L'ARGENT EST ENTRÉ, ET PERSONNE N'APPARAÎT.
//
// Une vente encaissée qui ne se rattache à aucun compte, c'est quelqu'un
// qui a payé et qui n'a peut-être pas ses accès. C'est le drame Ivan du
// 7 août, et le pire qu'on puisse en faire est de l'écarter en silence
// pour garder un tableau propre.
//
// -- POURQUOI CE BLOC N'EST PAS DU BRUIT --------------------------------
//
// La règle du 8 juin interdit les buckets "Anciens profils" dans la
// distribution des leads : là, l'orphelin est du bruit visuel, il ne dit
// rien et il ne demande rien. Ici c'est l'inverse : chaque ligne est une
// action à faire, et une seule ligne peut valoir un client perdu.
//
// D'où la différence de traitement, et elle est assumée : ce bloc
// n'existe QUE s'il y a quelque chose dedans. Une liste vide ne
// s'affiche pas.
//
// -- LES DEUX CAUSES, ET ELLES N'APPELLENT PAS LE MÊME GESTE -----------
//
// 1. **Adresse connue mais aucun compte** : l'ouverture de l'accès a
//    échoué, ou l'acheteur a payé avec une autre adresse que celle de
//    son compte. On peut lui ouvrir l'accès à la main juste au dessus.
// 2. **Adresse inconnue de nous** : une vente PayPal dont la commande
//    n'a pas pu être relue. Il faut aller voir chez le fournisseur.

import { AlertTriangle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { Sale } from "@/lib/checkout/sales";
import { formatSaleAmount } from "@/lib/checkout/sales";

function jour(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function VentesOrphelines({ ventes }: { ventes: Sale[] }) {
  if (ventes.length === 0) return null;

  return (
    <Card className="border-amber-300 bg-amber-50">
      <CardContent className="py-4">
        <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
          <AlertTriangle className="size-4" aria-hidden />
          {ventes.length === 1
            ? "Une vente encaissée sans compte en face"
            : `${ventes.length} ventes encaissées sans compte en face`}
        </p>
        <p className="mt-1 text-xs text-amber-900">
          Ces personnes ont payé et n&apos;apparaissent dans aucun compte. Vérifie leur
          adresse : si elle est juste, ouvre leur l&apos;accès à la main avec le formulaire
          ci-dessous.
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-amber-900">
          {ventes.map((v) => (
            <li key={v.ref} className="flex flex-wrap items-center gap-x-3">
              <span className="font-semibold">
                {v.email ?? "adresse inconnue"}
              </span>
              <span>{formatSaleAmount(v)}</span>
              <span>{v.provider === "stripe" ? "par carte" : "en PayPal"}</span>
              <span>le {jour(v.paidAt)}</span>
              {v.refundedAt && <span className="font-semibold">(remboursée)</span>}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
