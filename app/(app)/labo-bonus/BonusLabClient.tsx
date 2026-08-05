"use client";

// app/(app)/labo-bonus/BonusLabClient.tsx
//
// Le générateur de bonus post-quiz, écran de test.
//
// Trois étapes avec un arrêt franc entre chaque, comme dans le prompt
// d'origine : le cadrage, les trois pistes, la production. On ne saute
// jamais une étape, parce que c'est le seul moment où la créatrice peut
// corriger le tir avant qu'on écrive dix pages.
//
// LA PRODUCTION SE FAIT BLOC PAR BLOC, et chaque bloc a son propre appel.
// Le 3 août, la campagne email est sortie en JSON brut à l'écran parce
// qu'une réponse trop longue avait été coupée en plein milieu. Trois
// appels courts ne peuvent pas se couper l'un l'autre, et un bloc qui
// échoue laisse les deux autres intacts.

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Loader2, Sparkles, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toHtml } from "@/lib/markdownLite";
import { BLOCK_LABEL, PRODUCTION_BLOCKS, type ProductionBlock } from "@/lib/prompts/bonus";

type Piste = {
  format: string;
  title: string;
  punchline: string;
  why: string;
  needsHerTime: string;
};

type Brief = {
  audience: string;
  niche: string;
  tone: string;
  quizTheme: string;
  offer: string;
  trigger: "completion" | "share";
  variant: "single" | "per_result";
  results: string[];
};

const FIELDS: { key: keyof Brief; label: string; hint: string; rows?: number }[] = [
  {
    key: "audience",
    label: "Mon audience",
    hint: "À qui tu parles, et ce qu'elle cherche. Ex : coachs bien-être qui veulent remplir leur agenda sans pub.",
    rows: 2,
  },
  {
    key: "niche",
    label: "Ma niche",
    hint: "Ex : le coaching holistique pour femmes entrepreneures.",
  },
  {
    key: "tone",
    label: "Mon ton",
    hint: "Ex : direct et chaleureux, tutoiement, pointe d'humour.",
  },
  {
    key: "quizTheme",
    label: "Le thème de mon quiz",
    hint: "Ex : Quel est ton profil de vendeuse sur Instagram ?",
  },
  {
    key: "offer",
    label: "Mon offre payante",
    hint: "Celle vers laquelle le bonus doit mener. Ex : accompagnement 3 mois Agenda plein.",
    rows: 2,
  },
];

export function BonusLabClient({
  niche,
  knownResults,
}: {
  niche: string | null;
  knownResults: string[];
}) {
  const [brief, setBrief] = useState<Brief>({
    audience: "",
    niche: niche ?? "",
    tone: "",
    quizTheme: "",
    offer: "",
    trigger: "completion",
    variant: "single",
    results: knownResults,
  });
  const [pistes, setPistes] = useState<Piste[] | null>(null);
  const [recommended, setRecommended] = useState(0);
  const [recommendedWhy, setRecommendedWhy] = useState("");
  const [chosen, setChosen] = useState<number | null>(null);
  const [blocks, setBlocks] = useState<Partial<Record<ProductionBlock, string>>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const missing = FIELDS.filter((f) => !String(brief[f.key] ?? "").trim()).map((f) => f.label);

  async function askPistes() {
    if (missing.length > 0) {
      toast.error(`Il manque : ${missing.join(", ")}.`);
      return;
    }
    setBusy("pistes");
    setPistes(null);
    setChosen(null);
    setBlocks({});
    try {
      const res = await fetch("/api/me/bonus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "pistes", brief }),
      });
      const data = await res.json().catch(() => ({}));
      // UN `ok: false` PRODUIT TOUJOURS QUELQUE CHOSE A L'ECRAN.
      if (!data?.ok) {
        toast.error(
          data?.reason === "unreadable"
            ? "La génération n'a pas abouti. Relance, ça repart en général du premier coup."
            : "Génération impossible pour le moment. Réessaie dans un instant.",
        );
        return;
      }
      setPistes(data.pistes as Piste[]);
      setRecommended(Number(data.recommended) || 0);
      setRecommendedWhy(String(data.recommendedWhy ?? ""));
    } catch {
      toast.error("Génération impossible pour le moment. Réessaie dans un instant.");
    } finally {
      setBusy(null);
    }
  }

  async function produce(block: ProductionBlock) {
    if (chosen === null || !pistes) return;
    setBusy(block);
    try {
      const res = await fetch("/api/me/bonus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "produce",
          brief,
          block,
          chosen: {
            format: pistes[chosen].format,
            title: pistes[chosen].title,
            punchline: pistes[chosen].punchline,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data?.ok) {
        toast.error(`${BLOCK_LABEL[block]} n'a pas abouti. Relance ce bloc, les autres sont gardés.`);
        return;
      }
      setBlocks((b) => ({ ...b, [block]: String(data.markdown ?? "") }));
    } catch {
      toast.error(`${BLOCK_LABEL[block]} n'a pas abouti. Relance ce bloc, les autres sont gardés.`);
    } finally {
      setBusy(null);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copié.");
    } catch {
      toast.error("La copie a échoué. Sélectionne le texte et copie-le à la main.");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold">Le bonus parfait, après le quiz</h1>
        <p className="text-sm text-muted-foreground">
          Trois étapes : tu cadres, tu choisis une piste, on produit. En test, page non listée.
        </p>
      </header>

      {/* ── ÉTAPE 1 : le cadrage ── */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          1. Ton contexte
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.key} className="flex flex-col gap-1">
              <label htmlFor={f.key} className="text-sm font-medium">
                {f.label}
              </label>
              <textarea
                id={f.key}
                rows={f.rows ?? 1}
                value={String(brief[f.key] ?? "")}
                onChange={(e) => setBrief((b) => ({ ...b, [f.key]: e.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted-foreground">{f.hint}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="trigger" className="text-sm font-medium">
              Quand le bonus se débloque
            </label>
            <select
              id="trigger"
              value={brief.trigger}
              onChange={(e) =>
                setBrief((b) => ({ ...b, trigger: e.target.value as Brief["trigger"] }))
              }
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="completion">À la fin du quiz, avec le résultat</option>
              <option value="share">Après un partage, en récompense</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Ce ne sont pas les mêmes bonus. Après un partage, la personne a donné quelque chose
              et attend une contrepartie. À la fin du quiz, elle attend une suite.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="variant" className="text-sm font-medium">
              Une version, ou une par profil
            </label>
            <select
              id="variant"
              value={brief.variant}
              onChange={(e) =>
                setBrief((b) => ({ ...b, variant: e.target.value as Brief["variant"] }))
              }
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="single">Commun à tous les participants</option>
              <option value="per_result">Décliné par profil de résultat</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Décliné, c&apos;est plus fort : le participant reçoit un cadeau qui parle de lui. Tiquiz
              ne stocke qu&apos;un bonus par quiz, donc les versions se livrent par le tag Systeme.io
              du profil, ou par l&apos;URL de bouton propre à chaque profil.
            </p>
          </div>
        </div>

        {brief.variant === "per_result" && (
          <div className="flex flex-col gap-1">
            <label htmlFor="results" className="text-sm font-medium">
              Tes profils de résultat, un par ligne
            </label>
            <textarea
              id="results"
              rows={4}
              value={brief.results.join("\n")}
              onChange={(e) =>
                setBrief((b) => ({
                  ...b,
                  results: e.target.value.split("\n").map((l) => l.trim()).filter(Boolean),
                }))
              }
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
            {knownResults.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Pré-remplis depuis ton quiz Tiquiz relié. Corrige si ce n&apos;est pas le bon quiz.
              </p>
            )}
          </div>
        )}

        <Button onClick={askPistes} disabled={busy !== null} className="w-fit">
          {busy === "pistes" ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {busy === "pistes" ? "Je réfléchis..." : "Proposer 3 pistes"}
        </Button>
      </section>

      {/* ── ÉTAPE 2 : les trois pistes ── */}
      {pistes && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            2. Trois pistes, tu en choisis une
          </h2>
          {recommendedWhy && (
            <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
              <strong>Ma recommandation : la piste {recommended + 1}.</strong> {recommendedWhy}
            </p>
          )}
          <div className="grid gap-3 lg:grid-cols-3 items-start">
            {pistes.map((p, i) => (
              <Card
                key={i}
                className={
                  chosen === i ? "border-2 border-primary" : i === recommended ? "border-primary/40" : ""
                }
              >
                <CardContent className="flex flex-col gap-2 py-4">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {p.format}
                  </span>
                  <p className="font-semibold leading-snug">{p.title}</p>
                  <p className="text-sm">{p.punchline}</p>
                  <p className="text-sm text-muted-foreground">{p.why}</p>
                  {/* Ce qui coûte son temps se dit, ça ne se cache pas
                      derrière le mot "personnalisé". */}
                  {p.needsHerTime && (
                    <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                      {p.needsHerTime}
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant={chosen === i ? "default" : "outline"}
                    onClick={() => {
                      setChosen(i);
                      setBlocks({});
                    }}
                    className="mt-1 w-fit"
                  >
                    {chosen === i ? "Choisie" : "Je prends celle-ci"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ── ÉTAPE 3 : la production, bloc par bloc ── */}
      {chosen !== null && pistes && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            3. La production
          </h2>
          <p className="text-sm text-muted-foreground">
            Un bloc à la fois : c&apos;est plus long à lancer, et ça ne peut pas se couper en plein
            milieu comme la campagne email en juillet.
          </p>
          <div className="flex flex-col gap-4">
            {PRODUCTION_BLOCKS.map((block) => (
              <Card key={block}>
                <CardContent className="flex flex-col gap-3 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{BLOCK_LABEL[block]}</p>
                    <div className="flex gap-2">
                      {blocks[block] && (
                        <Button size="sm" variant="ghost" onClick={() => copy(blocks[block] ?? "")}>
                          <Copy />
                          Copier
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={blocks[block] ? "outline" : "default"}
                        onClick={() => produce(block)}
                        disabled={busy !== null}
                      >
                        {busy === block ? <Loader2 className="animate-spin" /> : <Wand2 />}
                        {blocks[block] ? "Refaire" : "Générer"}
                      </Button>
                    </div>
                  </div>
                  {blocks[block] && (
                    <div
                      className="prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: toHtml(blocks[block] ?? "") }}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
