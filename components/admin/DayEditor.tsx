"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { VideoField } from "@/components/admin/VideoField";
import type { Day, DayResource } from "@/lib/types";

export function DayEditor({ day }: { day: Day }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    day_number: day.day_number,
    title: day.title,
    subtitle: day.subtitle ?? "",
    video_url: day.video_url ?? "",
    intro_html: day.intro_html ?? "",
    result_html: day.result_html ?? "",
  });
  const [resources, setResources] = useState<DayResource[]>(day.resources ?? []);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setBusy(true);
    const res = await fetch(`/api/admin/days/${day.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        day_number: form.day_number,
        title: form.title,
        subtitle: form.subtitle || null,
        video_url: form.video_url || null,
        intro_html: form.intro_html || null,
        result_html: form.result_html || null,
        resources: resources.filter((r) => r.label.trim() && r.url.trim()),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.reason === "duplicate" ? "Ce numéro de jour est déjà pris." : "Sauvegarde impossible.");
      return;
    }
    toast.success("Jour enregistré.");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 py-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="num">Jour n°</Label>
            <Input
              id="num"
              type="number"
              value={form.day_number}
              onChange={(e) => set("day_number", Number.parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="title">Titre</Label>
            <Input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="subtitle">Sous-titre</Label>
          <Input
            id="subtitle"
            value={form.subtitle}
            onChange={(e) => set("subtitle", e.target.value)}
            placeholder="Une phrase qui situe le jour"
          />
        </div>

        <VideoField value={form.video_url} onChange={(v) => set("video_url", v)} />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="intro">Contenu du jour</Label>
          <p className="text-xs text-muted-foreground">
            Le texte affiché sous la vidéo. HTML simple accepté (titres, listes, gras).
          </p>
          <Textarea
            id="intro"
            value={form.intro_html}
            onChange={(e) => set("intro_html", e.target.value)}
            rows={8}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="result">Page de résultat (fin de jour)</Label>
          <p className="text-xs text-muted-foreground">
            Le récap affiché une fois le quiz validé. HTML simple accepté.
          </p>
          <Textarea
            id="result"
            value={form.result_html}
            onChange={(e) => set("result_html", e.target.value)}
            rows={5}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Ressources</Label>
          {resources.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={r.label}
                onChange={(e) =>
                  setResources((prev) => prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                }
                placeholder="Nom de la ressource"
                className="flex-1"
              />
              <Input
                value={r.url}
                onChange={(e) =>
                  setResources((prev) => prev.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))
                }
                placeholder="https://..."
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setResources((prev) => prev.filter((_, j) => j !== i))}
                aria-label="Retirer"
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setResources((prev) => [...prev, { label: "", url: "", type: "link" }])}
            className="w-fit"
          >
            <Plus />
            Ajouter une ressource
          </Button>
        </div>

        <div className="flex justify-end pt-1">
          <Button onClick={save} disabled={busy}>
            <Save />
            {busy ? "Enregistrement..." : "Enregistrer le jour"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
