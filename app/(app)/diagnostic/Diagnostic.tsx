"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Level = "debutant" | "intermediaire" | "avance";
type Objective = "capter" | "qualifier" | "segmenter" | "vendre";

const LEVEL_OPTIONS: { value: Level; label: string }[] = [
  { value: "debutant", label: "Je débute, je n'ai pas encore de quiz" },
  { value: "intermediaire", label: "J'ai des bases, j'ai déjà tenté des trucs" },
  { value: "avance", label: "Je suis à l'aise, je veux pousser" },
];

const OBJECTIVE_OPTIONS: { value: Objective; label: string }[] = [
  { value: "capter", label: "Capter des leads (faire grossir ma liste)" },
  { value: "qualifier", label: "Qualifier mes prospects (savoir qui ils sont)" },
  { value: "segmenter", label: "Segmenter mon audience (taguer finement)" },
  { value: "vendre", label: "Vendre directement (orienter vers mon offre)" },
];

const PLAN_BY_LEVEL: Record<Level, string> = {
  debutant:
    "On avance pas à pas, sans te noyer. Tu partiras d'un template et tu changeras juste les textes. L'objectif : ton quiz en ligne au jour 7, sans prise de tête.",
  intermediaire:
    "Tu as déjà des bases. On va structurer ton angle, soigner tes résultats, et publier vite. On ne perd pas de temps sur la théorie.",
  avance:
    "Tu peux pousser : un nom propriétaire pour ta méthode, une offre différente par profil de résultat, et la pub auto-liquidante au module promotion. On vise un vrai aiguilleur de ventes.",
};

const OBJECTIVE_LABEL: Record<Objective, string> = {
  capter: "capter des leads",
  qualifier: "qualifier tes prospects",
  segmenter: "segmenter ton audience",
  vendre: "vendre directement",
};

export function Diagnostic({ firstName }: { firstName: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [level, setLevel] = useState<Level | null>(null);
  const [niche, setNiche] = useState("");
  const [objective, setObjective] = useState<Objective | null>(null);
  const [phase, setPhase] = useState<"quiz" | "plan">("quiz");
  const [saving, setSaving] = useState(false);

  const total = 3;
  const canContinue =
    (step === 0 && level) || (step === 1 && niche.trim()) || (step === 2 && objective);

  async function finish() {
    if (!level || !objective || !niche.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/me/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, niche: niche.trim(), objective }),
      });
      if (!res.ok) throw new Error("save failed");
      setPhase("plan");
      router.refresh();
    } catch {
      toast.error("On n'a pas pu enregistrer. Réessaie dans un instant.");
    } finally {
      setSaving(false);
    }
  }

  function next() {
    if (!canContinue) {
      toast.error("Choisis une réponse pour continuer.");
      return;
    }
    if (step < total - 1) setStep(step + 1);
    else finish();
  }

  if (phase === "plan") {
    return (
      <div className="mx-auto max-w-2xl py-6">
        <Card>
          <CardContent className="flex flex-col gap-5 py-8">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="size-5" />
              <span className="font-semibold">Ton plan personnalisé</span>
            </div>
            <p className="text-sm leading-relaxed">{level && PLAN_BY_LEVEL[level]}</p>
            <div className="rounded-lg bg-surface-soft px-4 py-3 text-sm">
              <p>
                Ta niche : <strong>{niche.trim()}</strong>
              </p>
              <p>
                Ton objectif n°1 : <strong>{objective && OBJECTIVE_LABEL[objective]}</strong>
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Garde ça en tête, ton coach et tes missions vont s'appuyer dessus. On commence ?
            </p>
            <Button size="lg" onClick={() => router.replace("/dashboard")}>
              Commencer mon parcours
              <ArrowRight />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-6">
      <header className="mb-6 flex flex-col gap-1 text-center">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          {firstName ? `Bienvenue ${firstName} !` : "Bienvenue !"}
        </h1>
        <p className="text-sm text-muted-foreground">
          3 questions rapides pour adapter ton parcours et ton coach à TON projet.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-5 py-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Question {step + 1} sur {total}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: total }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 w-6 rounded-full transition-colors",
                    i <= step ? "bg-primary" : "bg-muted",
                  )}
                />
              ))}
            </div>
          </div>

          <div key={step} className="flex animate-quiz-step-in flex-col gap-4">
            {step === 0 && (
              <>
                <h2 className="font-display text-lg font-semibold">Où en es-tu aujourd'hui ?</h2>
                <div className="flex flex-col gap-2">
                  {LEVEL_OPTIONS.map((opt) => (
                    <OptionButton
                      key={opt.value}
                      label={opt.label}
                      selected={level === opt.value}
                      onClick={() => setLevel(opt.value)}
                    />
                  ))}
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h2 className="font-display text-lg font-semibold">
                  C'est quoi ton domaine ? Tu aides qui à faire quoi ?
                </h2>
                <p className="text-sm text-muted-foreground">
                  En une phrase, avec tes mots. Exemple : j'aide les coachs débordés à s'organiser sans culpabiliser.
                </p>
                <Textarea
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  rows={3}
                  placeholder="J'aide..."
                  autoFocus
                />
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="font-display text-lg font-semibold">
                  Ton objectif n°1 avec ton futur quiz ?
                </h2>
                <div className="flex flex-col gap-2">
                  {OBJECTIVE_OPTIONS.map((opt) => (
                    <OptionButton
                      key={opt.value}
                      label={opt.label}
                      selected={objective === opt.value}
                      onClick={() => setObjective(opt.value)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || saving}
            >
              <ArrowLeft />
              Retour
            </Button>
            <Button onClick={next} disabled={saving}>
              {saving ? "Un instant..." : step < total - 1 ? "Continuer" : "Voir mon plan"}
              {!saving && <ArrowRight />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OptionButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-4 py-3 text-left text-sm transition-colors",
        selected
          ? "border-primary bg-surface-soft font-medium ring-1 ring-primary"
          : "border-border bg-background hover:border-primary/50 hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}
