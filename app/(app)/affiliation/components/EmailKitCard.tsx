"use client";

// Un email de la campagne : objets A/B/C + corps RICHE (vrai gras, tailles,
// couleurs, interligne), éditable et enregistrable par l'affilié, copiable
// avec la mise en forme. Aucun markdown affiché : ce qui est à l'écran est
// exactement ce qui sera collé dans l'outil d'emailing.
//
// Extrait d'AffiliationClient pour que la page /affiliation/contenu/emails
// puisse l'utiliser. Comportement inchangé (mêmes overrides, même route
// /api/me/affiliate-emails) : un affilié qui avait déjà personnalisé ses
// emails les retrouve tels quels.

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Bold, Pencil, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyButton, CopyRichButton } from "./CopyButtons";
import { fillSwipe, type SwipeEmail } from "@/lib/affiliateSwipe";
import { renderSwipeEmailHtml } from "@/lib/affiliateEmailRender";

export type EmailOverride = { subject?: string | null; bodyHtml?: string | null };

export function EmailKitCard({
  mail,
  link,
  firstName,
  override,
}: {
  mail: SwipeEmail;
  link: string;
  firstName: string | null;
  override?: EmailOverride;
}) {
  const defaultHtml = useMemo(
    () => renderSwipeEmailHtml(fillSwipe(mail.body, { link, firstName })),
    [mail.body, link, firstName],
  );
  const [bodyHtml, setBodyHtml] = useState<string>(override?.bodyHtml || defaultHtml);
  const [customized, setCustomized] = useState<boolean>(!!override?.bodyHtml);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement | null>(null);

  async function patch(payload: { subject?: string | null; bodyHtml?: string | null }) {
    const res = await fetch("/api/me/affiliate-emails", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: mail.key, ...payload }),
    });
    if (!res.ok) throw new Error("save failed");
  }

  async function save() {
    const html = editorRef.current?.innerHTML ?? bodyHtml;
    setSaving(true);
    try {
      await patch({ bodyHtml: html });
      setBodyHtml(html);
      setCustomized(true);
      setEditing(false);
      toast.success("Ton email est enregistré.");
    } catch {
      toast.error("Enregistrement impossible. Réessaie.");
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    setSaving(true);
    try {
      await patch({ bodyHtml: null, subject: null });
      setBodyHtml(defaultHtml);
      setCustomized(false);
      setEditing(false);
      toast.success("Email réinitialisé.");
    } catch {
      toast.error("Réinitialisation impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">
              Email {mail.n}
              {customized ? " · personnalisé" : ""}
            </span>
            <span className="text-sm font-semibold">{mail.role}</span>
          </div>
          {!editing && <CopyRichButton html={bodyHtml} />}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Objets à tester (A / B / C)
          </span>
          <ul className="flex flex-col gap-1">
            {mail.subjects.map((s, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-1.5 text-sm"
              >
                <span className="min-w-0 truncate">{s}</span>
                <CopyButton text={s} label="" />
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border px-3 py-1.5">
          <span className="min-w-0 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Pré-en-tête : </span>
            {mail.preheader}
          </span>
          <CopyButton text={mail.preheader} label="" />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">Corps du mail</span>
          {editing ? (
            <>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onMouseDown={(e) => {
                    // Garde la sélection dans l'éditeur.
                    e.preventDefault();
                    document.execCommand("bold");
                  }}
                >
                  <Bold className="size-4" />
                  Gras
                </Button>
                <span className="text-xs text-muted-foreground">
                  Sélectionne du texte puis clique sur Gras.
                </span>
              </div>
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
                className="max-h-96 min-h-40 overflow-auto rounded-lg border border-input bg-background p-4 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="flex items-center gap-2">
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
                    Revenir au modèle
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <div
                className="max-h-96 overflow-auto rounded-lg border border-border bg-muted/20 p-4"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
              <div>
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="size-3.5" />
                  Personnaliser cet email
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
