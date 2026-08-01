"use client";

// Carte d'un post du kit : le visuel d'un côté, le texte prêt à coller de
// l'autre. Même présentation que l'espace affilié de Tipote, pour qu'un
// affilié qui connaît l'un s'y retrouve immédiatement dans l'autre.
//
// Le lien tracké ne va PAS dans le post : LinkedIn étouffe les
// publications sortantes. Il est proposé à part, à coller en premier
// commentaire (ou en bio sur Instagram et Facebook).

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, MessageSquare, Pencil, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "./CopyButtons";
import { CarouselViewer, SingleVisual } from "./CarouselViewer";
import { toHtml, toPlain, resolveVars } from "@/lib/markdownLite";
import type { AtelierPost } from "@/lib/affiliateContent/posts";

async function savePostOverride(key: string, value: string | null) {
  const res = await fetch("/api/me/affiliate-posts", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, body: value }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) throw new Error("save_failed");
}

export function AtelierPostCard({
  post,
  index,
  affiliateLink,
  displayName,
  override,
}: {
  post: AtelierPost;
  index: number;
  affiliateLink: string;
  displayName: string;
  override?: string;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState(override ?? post.body);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customized, setCustomized] = useState(override !== undefined);

  const resolved = resolveVars(body, { affiliateLink, name: displayName });
  const plain = toPlain(resolved);
  const html = toHtml(resolved);

  async function save() {
    setSaving(true);
    try {
      await savePostOverride(post.id, body);
      setCustomized(true);
      setEditing(false);
      toast.success("Ta version est enregistrée.");
    } catch {
      toast.error("Échec de l'enregistrement. Réessaie.");
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    setSaving(true);
    try {
      await savePostOverride(post.id, null);
      setBody(post.body);
      setCustomized(false);
      setEditing(false);
      toast.success("Texte d'origine rétabli.");
    } catch {
      toast.error("Échec de la réinitialisation. Réessaie.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                Post {index + 1}
              </span>
              <span className="text-sm font-semibold">{post.label}</span>
              <Badge variant="secondary" className="text-[10px]">
                {post.visual.kind === "carousel"
                  ? `Carrousel · ${post.visual.slides.length} images`
                  : "Visuel simple"}
              </Badge>
              {customized && (
                <Badge variant="outline" className="text-[10px]">
                  Ta version
                </Badge>
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.hook}</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setOpen((o) => !o)}
            className="shrink-0"
          >
            {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            {open ? "Fermer" : "Ouvrir"}
          </Button>
        </div>

        {open && (
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              {post.visual.kind === "carousel" ? (
                <CarouselViewer
                  postId={post.id}
                  slides={post.visual.slides}
                  captions={post.visual.captions}
                  pdf={post.visual.pdf}
                  alt={post.label}
                />
              ) : (
                <SingleVisual src={post.visual.png} alt={post.label} />
              )}
            </div>

            <div className="flex flex-col gap-3">
              {editing ? (
                <>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                    Réécris le post avec tes mots. Le gras s&apos;écrit avec des astérisques
                    (**comme ceci**). Ta version remplace l&apos;originale pour toi seul, et tu
                    peux revenir en arrière à tout moment.
                  </div>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={18}
                    className="text-sm leading-relaxed"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" onClick={save} disabled={saving}>
                      {saving ? "Enregistrement..." : "Enregistrer"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(false)}
                      disabled={saving}
                    >
                      Annuler
                    </Button>
                    {customized && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={reset}
                        disabled={saving}
                        className="ml-auto text-muted-foreground"
                      >
                        <RotateCcw className="size-3.5" />
                        Texte d&apos;origine
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="fq-rich max-h-[420px] overflow-y-auto rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <CopyButton text={plain} label="Copier le post" variant="default" />
                    <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                      <Pencil className="size-3.5" />
                      Personnaliser
                    </Button>
                  </div>
                </>
              )}

              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2.5">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium">
                  <MessageSquare className="size-3.5 text-primary" />
                  À coller en premier commentaire
                </p>
                <p className="mb-2 break-all font-mono text-xs text-muted-foreground">
                  {affiliateLink || "Ajoute ton identifiant affilié dans l'onglet Mon lien."}
                </p>
                {affiliateLink && <CopyButton text={affiliateLink} label="Copier le lien" />}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
