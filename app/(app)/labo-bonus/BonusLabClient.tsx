"use client";

// app/(app)/labo-bonus/BonusLabClient.tsx
//
// Le générateur de bonus post-quiz.
//
// -- UN ÉCRAN PAR ÉTAPE (retour Béné, 5 août 2026) --------------------
//
// "Simplifier l'UX UI : des écrans qui se suivent c'est mieux que de
// scroller indéfiniment, on peut faire un écran par étape."
//
// La première version empilait tout sur une page : le formulaire, les
// pistes, puis trois blocs de production. On finissait par faire défiler
// pour retrouver ce qu'on venait de générer.
//
// -- CE QU'ON NE DIT PLUS ---------------------------------------------
//
// "Tu penseras à enlever ce genre de choses pour les users : un bloc à
// la fois, ça ne peut pas se couper en plein milieu comme la campagne
// email en juillet." Nos incidents internes n'ont rien à faire à
// l'écran. Le découpage en trois appels reste, la justification part
// dans ce commentaire.
//
// -- ET ELLE PEUT CORRIGER AVANT D'EXPORTER ---------------------------
//
// "Proposer de l'éditer ? Avant de générer le PDF ?" Oui : un texte
// généré est un brouillon, pas un livrable. Chaque bloc s'édite sur
// place, et l'export reprend le texte corrigé.

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Loader2,
  Pencil,
  Sparkles,
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BonusDocument } from "@/components/BonusDocument";
import { failureCopy } from "@/lib/aiFailure";
import { hasStructure, parseBonusDoc } from "@/lib/bonus/document";
import { buildPrintableHtml } from "@/lib/bonus/printable";
import {
  BLOCK_LABEL,
  OFFER_KINDS,
  PRODUCTION_BLOCKS,
  type OfferKind,
  type ProductionBlock,
} from "@/lib/prompts/bonus";

type Piste = {
  format: string;
  title: string;
  punchline: string;
  why: string;
  needsHerTime: string;
};

type Brief = {
  offerPromise: string;
  offerKind: OfferKind;
  offerPrice: string;
  trigger: "completion" | "share";
  variant: "single" | "per_result";
};

type Step = "brief" | "pistes" | "produce";

export function BonusLabClient({
  quizTitle,
  profiles,
  viralityEnabled,
}: {
  quizTitle: string | null;
  profiles: string[];
  viralityEnabled: boolean;
}) {
  const [step, setStep] = useState<Step>("brief");
  const [brief, setBrief] = useState<Brief>({
    offerPromise: "",
    offerKind: "formation en ligne",
    offerPrice: "",
    trigger: "completion",
    variant: profiles.length > 1 ? "per_result" : "single",
  });
  const [pistes, setPistes] = useState<Piste[]>([]);
  const [recommended, setRecommended] = useState(0);
  const [recommendedWhy, setRecommendedWhy] = useState("");
  const [chosen, setChosen] = useState<number | null>(null);
  const [profileIndex, setProfileIndex] = useState(0);
  const [blocks, setBlocks] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const perResult = brief.variant === "per_result" && profiles.length > 0;
  // Un bonus décliné a un contenu PAR profil : on garde les versions
  // séparément, sinon générer le deuxième effacerait le premier.
  const contentKey = useMemo(
    () => (perResult ? `content:${profileIndex}` : "content"),
    [perResult, profileIndex],
  );
  const keyFor = (b: ProductionBlock) => (b === "content" ? contentKey : b);

  async function call(body: Record<string, unknown>) {
    const res = await fetch("/api/me/bonus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json().catch(() => ({}));
  }

  async function askPistes() {
    if (brief.offerPromise.trim().length < 10) {
      toast.error("Décris ton offre en une phrase pour que je puisse viser juste.");
      return;
    }
    setBusy("pistes");
    try {
      const data = await call({ step: "pistes", brief });
      if (!data?.ok) {
        toast.error(failureCopy(String(data?.reason ?? "")));
        return;
      }
      setPistes(data.pistes as Piste[]);
      setRecommended(Number(data.recommended) || 0);
      setRecommendedWhy(String(data.recommendedWhy ?? ""));
      setChosen(null);
      setBlocks({});
      setStep("pistes");
    } catch {
      toast.error("La génération n'a pas abouti. Réessaie dans un instant.");
    } finally {
      setBusy(null);
    }
  }

  async function produce(block: ProductionBlock) {
    if (chosen === null) return;
    const key = keyFor(block);
    setBusy(key);
    try {
      const data = await call({
        step: "produce",
        brief,
        block,
        ...(block === "content" && perResult ? { profileIndex } : {}),
        chosen: {
          format: pistes[chosen].format,
          title: pistes[chosen].title,
          punchline: pistes[chosen].punchline,
        },
      });
      if (!data?.ok) {
        toast.error(failureCopy(String(data?.reason ?? ""), BLOCK_LABEL[block]));
        return;
      }
      setBlocks((b) => ({ ...b, [key]: String(data.markdown ?? "") }));
      // Un texte coupe a la limite de longueur est utilisable, mais il
      // s'arrete au milieu d'une phrase : on le rend ET on le dit.
      if (data.truncated) {
        toast.warning(
          `${BLOCK_LABEL[block]} s'est arrêté avant la fin (limite de longueur). Relance-le, ou complète la dernière partie à la main.`,
        );
      }
    } catch {
      toast.error(failureCopy("", BLOCK_LABEL[block]));
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

  /**
   * Export : une page autonome, imprimee par le navigateur.
   *
   * Elle lit le MEME document que l'ecran (`parseBonusDoc`), donc le PDF
   * ne peut pas raconter autre chose que ce qu'elle vient de relire et
   * de corriger.
   */
  function exportPdf(block: ProductionBlock) {
    const md = blocks[keyFor(block)];
    if (!md) return;
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Ton navigateur a bloqué la fenêtre. Autorise les pop-ups pour cette page.");
      return;
    }
    const doc = parseBonusDoc(md);
    const titre =
      doc.title ||
      (block === "content" && piste ? piste.title : BLOCK_LABEL[block]);
    const profil = perResult && profiles[profileIndex] ? profiles[profileIndex] : "";
    win.document.write(
      buildPrintableHtml(doc, {
        title: titre,
        footer: profil ? `Profil : ${profil}` : undefined,
      }),
    );
    win.document.close();
    win.focus();
    win.print();
  }

  // ── Écran 1 : le contexte ──
  if (step === "brief") {
    return (
      <Shell
        title="Ton bonus post-quiz"
        subtitle={
          quizTitle
            ? `On part de ton quiz "${quizTitle}" : son thème, son ton et ses profils sont déjà repris. Il ne reste que ton offre.`
            : "On part de ton quiz relié. Il ne reste que ton offre à décrire."
        }
      >
        <Card>
          <CardContent className="flex flex-col gap-5 py-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="promise" className="text-sm font-medium">
                Décris la promesse principale de ton offre
              </label>
              <textarea
                id="promise"
                rows={3}
                value={brief.offerPromise}
                onChange={(e) => setBrief((b) => ({ ...b, offerPromise: e.target.value }))}
                placeholder="J'aide les personnes TDAH à apaiser leur stress quotidien en 1 mois grâce à des techniques simples et méconnues"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                C&apos;est vers elle que ton bonus doit ramener.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="kind" className="text-sm font-medium">
                  Format de ton offre
                </label>
                <select
                  id="kind"
                  value={brief.offerKind}
                  onChange={(e) => setBrief((b) => ({ ...b, offerKind: e.target.value as OfferKind }))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  {OFFER_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="price" className="text-sm font-medium">
                  Prix de ton offre
                </label>
                <input
                  id="price"
                  value={brief.offerPrice}
                  onChange={(e) => setBrief((b) => ({ ...b, offerPrice: e.target.value }))}
                  placeholder="97 euros, ou à partir de 1200 euros, ou sur devis"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <Choice
              label="Quand ton visiteur reçoit le bonus"
              value={brief.trigger}
              onChange={(v) => setBrief((b) => ({ ...b, trigger: v as Brief["trigger"] }))}
              options={[
                {
                  value: "completion",
                  title: "À la fin du quiz",
                  hint: "Il découvre son résultat, le bonus est la suite logique.",
                },
                {
                  value: "share",
                  title: "Après un partage",
                  hint: viralityEnabled
                    ? "Il partage ton quiz, le bonus est sa récompense."
                    : "L'étape de partage n'est pas encore activée sur ton quiz.",
                },
              ]}
            />

            <Choice
              label="Une version, ou une par profil"
              value={brief.variant}
              onChange={(v) => setBrief((b) => ({ ...b, variant: v as Brief["variant"] }))}
              options={[
                {
                  value: "single",
                  title: "Le même pour tout le monde",
                  hint: "Plus simple à produire et à livrer.",
                },
                {
                  value: "per_result",
                  title: "Un par profil de résultat",
                  hint:
                    profiles.length > 0
                      ? `Plus fort : chacun reçoit un bonus qui parle de lui. ${profiles.length} profils sur ton quiz.`
                      : "Ton quiz n'a pas encore de profils de résultat.",
                },
              ]}
            />

            <Button onClick={askPistes} disabled={busy !== null} className="w-fit">
              {busy === "pistes" ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {busy === "pistes" ? "Je cherche tes pistes..." : "Proposer 3 pistes"}
            </Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  // ── Écran 2 : les trois pistes ──
  if (step === "pistes") {
    return (
      <Shell
        title="Trois pistes, tu en choisis une"
        subtitle="Elles sont volontairement différentes. Prends celle qui te ressemble, pas la plus impressionnante."
        onBack={() => setStep("brief")}
      >
        {recommendedWhy && (
          <p className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            <strong>Ma recommandation : la piste {recommended + 1}.</strong> {recommendedWhy}
          </p>
        )}
        <div className="grid items-start gap-4 lg:grid-cols-3">
          {pistes.map((p, i) => (
            <Card key={i} className={i === recommended ? "border-primary/50" : ""}>
              <CardContent className="flex flex-col gap-2.5 py-5">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {p.format}
                </span>
                <p className="font-semibold leading-snug">{p.title}</p>
                <p className="text-sm">{p.punchline}</p>
                <p className="text-sm text-muted-foreground">{p.why}</p>
                {p.needsHerTime && (
                  <p className="rounded-md bg-amber-50 px-2.5 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                    {p.needsHerTime}
                  </p>
                )}
                <Button
                  size="sm"
                  className="mt-1 w-fit"
                  onClick={() => {
                    setChosen(i);
                    setBlocks({});
                    setStep("produce");
                  }}
                >
                  Je prends celle-ci
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </Shell>
    );
  }

  // ── Écran 3 : la production ──
  const piste = chosen !== null ? pistes[chosen] : null;
  return (
    <Shell
      title={piste?.title ?? "Ton bonus"}
      subtitle={piste?.punchline ?? ""}
      onBack={() => setStep("pistes")}
    >
      {perResult && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="profil" className="text-sm font-medium">
            Le profil que tu prépares
          </label>
          <select
            id="profil"
            value={profileIndex}
            onChange={(e) => setProfileIndex(Number(e.target.value))}
            className="w-full max-w-sm rounded-lg border bg-background px-3 py-2 text-sm"
          >
            {profiles.map((p, i) => (
              <option key={i} value={i}>
                {p}
                {blocks[`content:${i}`] ? " (écrit)" : ""}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Chaque profil a son propre texte. Tu les écris l&apos;un après l&apos;autre.
          </p>
        </div>
      )}

      {PRODUCTION_BLOCKS.map((block) => {
        const key = keyFor(block);
        const value = blocks[key];
        const isEditing = editing === key;
        return (
          <Card key={key}>
            <CardContent className="flex flex-col gap-3 py-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{BLOCK_LABEL[block]}</p>
                <div className="flex flex-wrap gap-2">
                  {value && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing(isEditing ? null : key)}
                      >
                        {isEditing ? <Check /> : <Pencil />}
                        {isEditing ? "Terminé" : "Modifier"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => copy(value)}>
                        <Copy />
                        Copier
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => exportPdf(block)}>
                        <Download />
                        PDF
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant={value ? "outline" : "default"}
                    onClick={() => produce(block)}
                    disabled={busy !== null}
                  >
                    {busy === key ? <Loader2 className="animate-spin" /> : <Wand2 />}
                    {value ? "Refaire" : "Générer"}
                  </Button>
                </div>
              </div>

              {/* UN TEXTE GENERE EST UN BROUILLON, PAS UN LIVRABLE : elle
                  corrige sur place, et l'export reprend sa version. */}
              {value && isEditing && (
                <textarea
                  value={value}
                  onChange={(e) => setBlocks((b) => ({ ...b, [key]: e.target.value }))}
                  rows={22}
                  className="w-full rounded-lg border bg-background px-3 py-2 font-mono text-xs leading-relaxed"
                />
              )}
              {value && !isEditing && <Rendered markdown={value} />}
              {!value && (
                <p className="text-sm text-muted-foreground">
                  {block === "guide" && "Ce que tu produis, avec quel outil, et comment il arrive chez ton visiteur."}
                  {block === "content" && "Le texte du bonus lui-même, prêt à mettre en page."}
                  {block === "presentation" && "L'annonce sur la page de résultat, et l'email de livraison."}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </Shell>
  );
}

/**
 * Le rendu d'un bloc généré.
 *
 * La STRUCTURE vient de `parseBonusDoc`, en fonction pure et testée ;
 * ce composant ne relit jamais le markdown lui-même. Un texte sans
 * aucune section retombe sur un rendu simple : forcer une carte unique
 * qui contient tout n'apporterait rien.
 */
function Rendered({ markdown }: { markdown: string }) {
  const doc = parseBonusDoc(markdown);
  if (!hasStructure(doc)) {
    return (
      <div className="flex flex-col gap-3 text-[15px] leading-relaxed">
        {doc.lead.map((b, i) => (
          <p key={i}>{b.kind === "para" ? b.text : ""}</p>
        ))}
      </div>
    );
  }
  return <BonusDocument doc={doc} />;
}

/** Le gabarit commun aux trois écrans : titre, sous-titre, retour. */
function Shell({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Retour
          </button>
        )}
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </header>
      {children}
    </div>
  );
}

/** Deux cartes cliquables : plus lisible qu'un menu déroulant pour un
 *  choix qui change le résultat en profondeur. */
function Choice({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; title: string; hint: string }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-colors ${
              value === o.value
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40"
            }`}
          >
            <span className="text-sm font-medium">{o.title}</span>
            <span className="text-xs text-muted-foreground">{o.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
