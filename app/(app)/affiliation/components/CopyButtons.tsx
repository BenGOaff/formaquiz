"use client";

// Boutons de copie partagés par tout l'espace Affiliation.
//
// Extraits d'AffiliationClient : l'espace Contenu (pages serveur) en a
// besoin aussi, et deux implémentations divergentes du même bouton, c'est
// la garantie qu'un jour l'une des deux perd la mise en forme au collage.

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyButton({
  text,
  label = "Copier",
  variant = "outline",
  size = "sm",
}: {
  text: string;
  label?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default";
}) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      toast.success("Copié !");
      setTimeout(() => setDone(false), 1800);
    } catch {
      toast.error("Impossible de copier. Sélectionne le texte à la main.");
    }
  }
  return (
    <Button variant={variant} size={size} onClick={copy} className="shrink-0">
      {done ? <Check className="size-4" /> : <Copy className="size-4" />}
      {done ? "Copié" : label}
    </Button>
  );
}

/** Texte brut (repli) depuis du HTML, pour le copier-coller sans HTML. */
export function htmlToPlain(html: string): string {
  if (typeof document === "undefined") return html;
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.innerText.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Copie qui préserve la mise en forme : on met text/html ET text/plain dans
 * le presse-papier. Le gras survit au collage dans Systeme.io, Notion ou
 * Google Docs ; les outils qui n'acceptent que du texte prennent le repli
 * sans afficher de balises.
 */
export function CopyRichButton({
  html,
  label = "Copier le mail",
}: {
  html: string;
  label?: string;
}) {
  const [done, setDone] = useState(false);
  async function copy() {
    const text = htmlToPlain(html);
    try {
      if (
        typeof window !== "undefined" &&
        "ClipboardItem" in window &&
        navigator.clipboard?.write
      ) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([text], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setDone(true);
      toast.success("Copié avec la mise en forme !");
      setTimeout(() => setDone(false), 1800);
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      } catch {
        toast.error("Impossible de copier. Sélectionne le texte à la main.");
      }
    }
  }
  return (
    <Button size="sm" onClick={copy} className="shrink-0">
      {done ? <Check className="size-4" /> : <Copy className="size-4" />}
      {done ? "Copié" : label}
    </Button>
  );
}
