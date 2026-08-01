// app/(app)/affiliation/contenu/page.tsx
//
// Racine de l'espace Contenu : les cinq rayons du kit affilié.
// Présentation alignée sur affiliate.tipote.com/contenus (mêmes rayons,
// mêmes libellés, mêmes cartes), sans l'étage "produit" : ici, il n'y a
// que l'Atelier à promouvoir.

import Link from "next/link";
import { Mail, Share2, FileText, Palette, Wand2, ArrowLeft, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

import { ContentBreadcrumb, FolderCard } from "../components/ContentNav";
import { getContentContext } from "./context";
import {
  contentHref,
  SECTION_DESC,
  SECTION_LABEL,
  PRODUCT_NAME,
} from "@/lib/affiliateContentSpace";
import { QUIZING_COMMISSION_PCT } from "@/lib/affiliate";
import { SWIPE_EMAILS, ARTICLE_ANGLES, DEFAULT_ASSETS } from "@/lib/affiliateSwipe";
import { ATELIER_POSTS } from "@/lib/affiliateContent/posts";

export const metadata = { title: "Contenu affilié - L'Atelier du Quiz" };
export const dynamic = "force-dynamic";

export default async function ContenuHomePage() {
  const ctx = await getContentContext();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <ContentBreadcrumb
        trail={[{ label: "Affiliation", href: "/affiliation" }, { label: "Contenu" }]}
      />

      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          Promouvoir {PRODUCT_NAME}
        </h1>
        <p className="text-sm text-muted-foreground">
          Tout ton matériel de promotion, rangé par rayon. {QUIZING_COMMISSION_PCT}% de commission
          sur chaque vente, ton lien est déjà inséré dans les contenus.
        </p>
      </header>

      {!ctx.hasAffiliateId && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex items-start gap-2 py-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              Tu n&apos;as pas encore renseigné ton identifiant affilié. Sans lui, les contenus
              ci-dessous partent avec un lien non tracké et tu ne touches aucune commission.{" "}
              <Link href="/affiliation" className="font-medium underline">
                Le renseigner maintenant
              </Link>
              .
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FolderCard
          href={contentHref("emails")}
          icon={Mail}
          title={SECTION_LABEL.emails}
          description={SECTION_DESC.emails}
          meta={`${SWIPE_EMAILS.length} emails`}
        />
        <FolderCard
          href={contentHref("reseaux")}
          icon={Share2}
          title={SECTION_LABEL.reseaux}
          description={SECTION_DESC.reseaux}
          meta={`${ATELIER_POSTS.length} posts`}
        />
        <FolderCard
          href={contentHref("articles")}
          icon={FileText}
          title={SECTION_LABEL.articles}
          description={SECTION_DESC.articles}
          meta={`${ARTICLE_ANGLES.length} angles`}
        />
        <FolderCard
          href={contentHref("logo")}
          icon={Palette}
          title={SECTION_LABEL.logo}
          description={SECTION_DESC.logo}
          meta={`${DEFAULT_ASSETS.length} fichiers`}
        />
        <FolderCard
          href={contentHref("generer")}
          icon={Wand2}
          title={SECTION_LABEL.generer}
          description={SECTION_DESC.generer}
          meta="Sur mesure"
          highlight
        />
      </div>

      <Card className="border-dashed bg-surface-soft">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Tous ces contenus sont à toi : copie-les tels quels, ou réécris-les avec tes mots. Ta
          version personnalisée est enregistrée et remplace l&apos;originale pour toi seul, sans
          jamais toucher au kit des autres affiliés.
        </CardContent>
      </Card>

      <div>
        <Link
          href="/affiliation"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          <ArrowLeft className="size-4" />
          Retour à mon espace Affiliation
        </Link>
      </div>
    </div>
  );
}
