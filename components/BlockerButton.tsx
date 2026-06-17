"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Affordance discrète sur chaque jour : "Un blocage ?". L'élève dit ce
 * qui coince, on collecte pour améliorer le contenu (chantier D).
 */
export function BlockerButton({ dayNumber }: { dayNumber: number }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    if (message.trim().length < 2) {
      toast.error("Dis-nous en deux mots ce qui coince.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/me/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayNumber, message: message.trim(), kind: "blocage" }),
      });
      if (!res.ok) throw new Error("fail");
      setMessage("");
      setOpen(false);
      toast.success("Merci, c'est noté. Ça nous aide à améliorer la formation.");
    } catch {
      toast.error("Envoi impossible. Réessaie dans un instant.");
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        <LifeBuoy className="size-4" />
        Un blocage sur ce jour ?
      </button>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-2 rounded-xl border border-border bg-surface-soft p-4">
      <p className="text-sm font-medium">Qu'est-ce qui te bloque ?</p>
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder="En une ou deux phrases, ce qui coince ici."
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={sending}>
          Annuler
        </Button>
        <Button size="sm" onClick={send} disabled={sending}>
          {sending ? "Envoi..." : "Envoyer"}
        </Button>
      </div>
    </div>
  );
}
