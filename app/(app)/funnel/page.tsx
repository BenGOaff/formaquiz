import { redirect } from "next/navigation";
import { getViewer } from "@/lib/parcours";
import { getFunnelAssets, getFunnelIntentions } from "@/lib/generate/funnel";
import { fetchQuizProfiles } from "@/lib/integrations/tiquiz";
import { getEnabledSioTemplates } from "@/lib/sioTemplates";
import { NoAccess } from "@/components/NoAccess";
import { FunnelClient } from "./FunnelClient";
import { LockedSection } from "@/components/LockedSection";
import { canAccessSection } from "@/lib/access/tiers";
import { upsellUrl } from "@/lib/access/upsell";

export const dynamic = "force-dynamic";

export default async function FunnelPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.enrolled) return <NoAccess email={viewer.email} />;

  const locked = !canAccessSection(viewer.tier, "/funnel");
  const checkoutUrl = upsellUrl();

  const [{ assets, generatedAt }, templates, profiles, intentions] = await Promise.all([
    getFunnelAssets(viewer.userId),
    getEnabledSioTemplates(),
    fetchQuizProfiles(viewer.userId),
    getFunnelIntentions(viewer.userId),
  ]);

  const profileOptions = profiles.map((p) => ({
    title: p.title,
    hasCta: Boolean((p.ctaText && p.ctaText.trim()) || (p.ctaUrl && p.ctaUrl.trim())),
  }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Ta campagne</h1>
        <p className="text-sm text-muted-foreground">
          Tiquiz écrit ton quiz. Ici, on écrit tout l&apos;autour : tes emails et ton kit de lancement,
          à partir de ton carnet. Tu copies dans Systeme.io, tu personnalises, c&apos;est parti.
        </p>
      </header>
      {/* PALIER 7 EUR : on MONTRE la Campagne au lieu de la cacher (demande
          Bene). Le flou est une vitrine, pas une serrure : la vraie
          protection est dans les routes /api/me/funnel, qui refusent ce
          palier. Sans elles, il suffirait de retirer le blur dans
          l'inspecteur pour generer sa sequence. */}
      {locked ? (
        <LockedSection
          title="Ta campagne, c'est dans les bonus"
          description="Tes emails de bienvenue, une sequence complete de 5 emails pour CHAQUE profil de resultat, ta sequence de vente douce, ton kit de lancement et les modeles Systeme.io prets a importer. Ecrits a partir de ton carnet."
          ctaLabel="Debloquer ma campagne"
          ctaUrl={checkoutUrl}
        >
          <FunnelClient
            initialAssets={assets}
            generatedAt={generatedAt}
            templates={templates}
            profiles={profileOptions}
            initialIntentions={intentions}
          />
        </LockedSection>
      ) : (
        <FunnelClient
          initialAssets={assets}
          generatedAt={generatedAt}
          templates={templates}
          profiles={profileOptions}
          initialIntentions={intentions}
        />
      )}
    </div>
  );
}
