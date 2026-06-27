// app/(app)/affiliation/page.tsx
// Espace Affiliation de l'Atelier du Quiz. Présente l'offre (100% sur la
// vente + 40% récurrent Tiquiz), construit le lien affilié Systeme.io, et
// affiche un kit de promo personnalisé selon le business de l'élève.
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/parcours";
import { AffiliationClient } from "./AffiliationClient";

export const metadata = {
  title: "Affiliation - L'Atelier du Quiz",
};

export default async function AffiliationPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const p = viewer.profile;
  return (
    <AffiliationClient
      firstName={p?.full_name ?? null}
      niche={p?.niche ?? null}
      activityType={p?.activity_type ?? null}
      initialAffiliateId={p?.sio_affiliate_id ?? ""}
    />
  );
}
