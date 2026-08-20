// app/admin/ventes/page.tsx
//
// TES VENTES, ET LE BOUTON POUR REMBOURSER.
//
// Béné, 20 août 2026 : "je vais avoir un truc dans mon dashboard admin
// pour gérer directement les refund etc. ? Sans avoir à passer par
// Stripe ou PayPal ?"
//
// Le tableau est construit à partir des confirmations reçues, donc il
// dit la même chose que Stripe et PayPal, et il le dit de la même façon
// pour les deux : c'est tout l'intérêt de le lire chez nous plutôt que
// d'aller chercher deux listes construites différemment.
//
// La page est un composant serveur qui ne fait rien d'autre que poser le
// titre : tout le reste est dans le client, parce que rembourser est une
// action et qu'une action a besoin d'états (en cours, réussi, refusé).

import VentesClient from "./VentesClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ventes",
};

export default function AdminVentesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ventes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tes ventes directes, carte et PayPal. Rembourser depuis ici coupe l&apos;accès et
          envoie ton email d&apos;au revoir, exactement comme si tu remboursais depuis Stripe
          ou PayPal.
        </p>
      </div>
      <VentesClient />
    </div>
  );
}
