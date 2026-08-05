import { isAdminEmail } from "@/lib/adminEmails";
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
  // L'onglet du generateur de bonus n'existe que pour elle, le temps
  // du test (cf. app/(app)/labo-bonus).
  const isAdmin = isAdminEmail(viewer.email);
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
    // MEME LARGEUR QUE LE RESTE (retour Bene, 5 aout 2026). Cette page
    // portait un `mx-auto max-w-3xl` a elle, quand le tableau de bord,
    // les avancees, l'affiliation et les jours prennent toute la largeur
    // du container commun (app/(app)/layout.tsx). Les marges et le
    // padding vivent la-bas, une seule fois : une page ne definit que son
    // rythme vertical.
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Tes bonus</h1>
        <p className="text-sm text-muted-foreground">
          Tout ce qui s&apos;écrit à partir de ton carnet et de ton quiz : les emails que reçoit
          un visiteur après son résultat, de quoi faire connaître ton quiz, et les modèles à
          importer. Tu copies dans Systeme.io, tu personnalises, c&apos;est parti.
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
          description="Une sequence de 5 emails pour CHAQUE profil de resultat de ton quiz, et ton kit de lancement pour le faire connaitre. Ecrits a partir de ton carnet, avec ton ton et les mots de ta cible."
          ctaLabel="Debloquer ma campagne"
          ctaUrl={checkoutUrl}
        >
          <FunnelClient
            initialAssets={assets}
            generatedAt={generatedAt}
            templates={templates}
            profiles={profileOptions}
            initialIntentions={intentions}
            isAdmin={isAdmin}
          />
        </LockedSection>
      ) : (
        <FunnelClient
          initialAssets={assets}
          generatedAt={generatedAt}
          templates={templates}
          profiles={profileOptions}
          initialIntentions={intentions}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
