// Rayon "Articles de blog" : les angles à développer, plus les idées de
// vidéos (même famille : du contenu long qu'on écrit soi-même à partir
// d'un plan, par opposition aux emails et posts qui se copient tels quels).

import Link from "next/link";
import { FileText, Video, Wand2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { ContentBreadcrumb } from "../../components/ContentNav";
import { getContentContext } from "../context";
import { CopyButton } from "../../components/CopyButtons";
import { contentHref, CONTENT_ROOT, SECTION_LABEL } from "@/lib/affiliateContentSpace";
import { ARTICLE_ANGLES, VIDEO_IDEAS } from "@/lib/affiliateSwipe";

export const metadata = { title: "Articles de blog - Contenu affilié" };
export const dynamic = "force-dynamic";

export default async function ArticlesPage() {
  const ctx = await getContentContext();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <ContentBreadcrumb
        trail={[
          { label: "Affiliation", href: "/affiliation" },
          { label: "Contenu", href: CONTENT_ROOT },
          { label: SECTION_LABEL.articles },
        ]}
      />

      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{SECTION_LABEL.articles}</h1>
        <p className="text-sm text-muted-foreground">
          Des angles prêts à développer, pas des articles pré-écrits : un article de blog signé de
          ton nom doit sonner comme toi. Prends l&apos;angle, écris-le avec tes exemples, et place
          ton lien en conclusion.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-3 py-5">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="size-4 text-primary" />
            Angles d&apos;articles
          </span>
          <ul className="flex flex-col gap-3">
            {ARTICLE_ANGLES.map((a, i) => (
              <li key={i} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{a.title}</p>
                  <CopyButton text={`${a.title}\n\n${a.angle}`} label="" />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{a.angle}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 py-5">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Video className="size-4 text-primary" />
            Idées de vidéos promo
          </span>
          <ul className="flex flex-col gap-3">
            {VIDEO_IDEAS.map((v, i) => (
              <li key={i} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {v.format}
                  </span>
                  <p className="text-sm font-semibold">{v.title}</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{v.outline}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col gap-3 py-5">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Wand2 className="size-4 text-primary" />
            Tu veux l&apos;article écrit ?
          </span>
          <p className="text-sm text-muted-foreground">
            Le rédacteur IA connaît l&apos;Atelier par coeur et écrit pour TON audience, article
            complet compris. Il place ton lien tout seul.
          </p>
          <div>
            <Button asChild size="sm">
              <Link href={contentHref("generer")}>Ouvrir le rédacteur</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {ctx.hasAffiliateId && (
        <Card className="border-dashed bg-surface-soft">
          <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
            <span className="min-w-0 break-all font-mono text-xs text-muted-foreground">
              {ctx.affiliateLink}
            </span>
            <CopyButton text={ctx.affiliateLink} label="Copier mon lien" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
