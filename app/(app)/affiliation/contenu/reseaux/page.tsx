// Rayon "Réseaux sociaux" : un post par carte, avec SON visuel.
//
// Les carrousels ne sont plus affichés en double (PDF + images) : le
// carrousel défile sur place et les deux formats sont proposés en
// téléchargement dessous. Voir CarouselViewer.

import Link from "next/link";
import { AlertTriangle, Download, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { ContentBreadcrumb } from "../../components/ContentNav";
import { AtelierPostCard } from "../../components/AtelierPostCard";
import { getContentContext } from "../context";
import { CONTENT_ROOT, SECTION_LABEL } from "@/lib/affiliateContentSpace";
import { ATELIER_POSTS } from "@/lib/affiliateContent/posts";
import {
  ATELIER_POST_PLAN_5,
  POSTS_TEXT_DOC,
  SWIPE_POSTS,
  fillSwipe,
} from "@/lib/affiliateSwipe";
import { CopyButton } from "../../components/CopyButtons";

export const metadata = { title: "Réseaux sociaux - Contenu affilié" };
export const dynamic = "force-dynamic";

export default async function ReseauxPage() {
  const ctx = await getContentContext();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <ContentBreadcrumb
        trail={[
          { label: "Affiliation", href: "/affiliation" },
          { label: "Contenu", href: CONTENT_ROOT },
          { label: SECTION_LABEL.reseaux },
        ]}
      />

      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{SECTION_LABEL.reseaux}</h1>
        <p className="text-sm text-muted-foreground">
          {ATELIER_POSTS.length} posts aux couleurs de l&apos;Atelier : le visuel d&apos;un côté, la
          légende de l&apos;autre, prête à copier. Le lien ne va PAS dans le post (LinkedIn étouffe
          les publications sortantes) : colle-le en premier commentaire, ou mets-le en bio sur
          Instagram et Facebook. Si tu ne veux pas tout publier, commence par{" "}
          {ATELIER_POST_PLAN_5.map((n) => `#${n}`).join(" · ")}.
        </p>
        <div>
          <Button asChild variant="outline" size="sm">
            <a href={POSTS_TEXT_DOC.url} target="_blank" rel="noopener noreferrer" download>
              <Download className="size-4" />
              Tous les textes en Word
            </a>
          </Button>
        </div>
      </header>

      {!ctx.hasAffiliateId && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex items-start gap-2 py-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              Ajoute ton identifiant dans{" "}
              <Link href="/affiliation" className="font-medium underline">
                l&apos;onglet Mon lien
              </Link>{" "}
              pour que le lien à coller en commentaire soit tracké.
            </span>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {ATELIER_POSTS.map((post, i) => (
          <AtelierPostCard
            key={post.id}
            post={post}
            index={i}
            affiliateLink={ctx.affiliateLink}
            displayName={ctx.displayName}
            override={ctx.postOverrides[post.id]}
          />
        ))}
      </div>

      {/* Formats courts, sans visuel : de quoi publier vite entre deux
          posts du kit, quand on n'a pas cinq minutes pour choisir une
          image. Ceux-là portent le lien dans le texte. */}
      <Card>
        <CardContent className="flex flex-col gap-3 py-5">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="size-4 text-primary" />
            Textes courts par plateforme
          </span>
          {SWIPE_POSTS.map((post, i) => {
            const text = fillSwipe(post.body, {
              link: ctx.affiliateLink,
              firstName: ctx.firstName,
            });
            return (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {post.platform}
                    </span>
                    <p className="text-sm font-semibold">{post.hook}</p>
                  </div>
                  <CopyButton text={text} label="Copier" />
                </div>
                <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                  {text}
                </pre>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
