"use client";

// Atelier d'écriture assisté, cadré sur un seul produit. L'affilié décrit
// SON audience, choisit un format, et récupère un texte qu'il peut
// retoucher avant de copier.
//
// Volontairement bridé : pas de prompt libre. Les faits produits, les
// règles d'écriture et le refus hors sujet vivent côté serveur
// (lib/affiliateGeneratorBrief). Un affilié ne doit jamais pouvoir faire
// dire n'importe quoi à une IA qui signe de son nom et parle de Béné.
//
// Le lien tracké est injecté à l'AFFICHAGE : le modèle écrit le marqueur
// {AFFILIATE_LINK}, jamais une URL inventée.

import { useState } from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton, CopyRichButton } from "../../components/CopyButtons";
import { toHtml, toPlain, resolveVars } from "@/lib/markdownLite";
import {
  FORMAT_LABEL,
  GENERATOR_FORMATS,
  type GeneratorFormat,
} from "@/lib/affiliateGeneratorBrief";

export function GeneratorClient({
  affiliateLink,
  displayName,
}: {
  affiliateLink: string;
  displayName: string;
}) {
  const [format, setFormat] = useState<GeneratorFormat>("post");
  const [audience, setAudience] = useState("");
  const [angle, setAngle] = useState("");
  const [tone, setTone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function generate() {
    if (audience.trim().length < 3) {
      setError("Décris d'abord ton audience en quelques mots.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/me/affiliate-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, audience, angle, tone }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        text?: string;
        reason?: string;
        retryAfterSec?: number;
      };
      if (!data.ok || !data.text) {
        setError(
          data.reason === "rate_limited"
            ? `Tu as atteint la limite de générations. Réessaie dans ${Math.ceil(
                (data.retryAfterSec ?? 600) / 60,
              )} minutes.`
            : "La génération a échoué. Réessaie dans un instant.",
        );
        return;
      }
      setResult(data.text);
    } catch {
      setError("Problème de connexion. Vérifie ton réseau et réessaie.");
    } finally {
      setLoading(false);
    }
  }

  const resolved = result ? resolveVars(result, { affiliateLink, name: displayName }) : "";
  const plain = toPlain(resolved);
  const html = toHtml(resolved);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-5 py-5">
          <div>
            <p className="mb-2 text-sm font-medium">Qu&apos;est-ce que tu veux écrire ?</p>
            <div className="flex flex-wrap gap-2">
              {GENERATOR_FORMATS.map((f) => (
                <Button
                  key={f}
                  type="button"
                  size="sm"
                  variant={format === f ? "default" : "outline"}
                  onClick={() => setFormat(f)}
                >
                  {FORMAT_LABEL[f]}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="gen-audience" className="text-sm font-medium">
              À qui tu parles ?
            </label>
            <Textarea
              id="gen-audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              rows={3}
              maxLength={600}
              placeholder="Ex : des thérapeutes installées depuis 2 à 5 ans, qui ont une page Instagram et pas de liste email, et qui trouvent que la prospection les épuise."
            />
            <p className="text-xs text-muted-foreground">
              Plus tu es précis sur leur situation, plus le texte leur parlera. C&apos;est le seul
              champ obligatoire.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="gen-angle" className="text-sm font-medium">
                Un angle en particulier ? (facultatif)
              </label>
              <Input
                id="gen-angle"
                value={angle}
                onChange={(e) => setAngle(e.target.value)}
                maxLength={600}
                placeholder="Ex : partir de zéro sans audience"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="gen-tone" className="text-sm font-medium">
                Ton ? (facultatif)
              </label>
              <Input
                id="gen-tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                maxLength={600}
                placeholder="Ex : direct, un peu cash"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div>
            <Button onClick={generate} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Rédaction en cours...
                </>
              ) : (
                <>
                  <Wand2 className="size-4" />
                  Écrire
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="flex flex-col gap-3 py-5">
            <div className="flex items-start justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="size-4 text-primary" />
                {FORMAT_LABEL[format]}
              </span>
              <div className="flex flex-wrap gap-2">
                <CopyButton text={plain} label="Copier le texte" />
                <CopyRichButton html={html} label="Copier avec le gras" />
              </div>
            </div>

            <Textarea
              value={result}
              onChange={(e) => setResult(e.target.value)}
              rows={20}
              className="text-sm leading-relaxed"
            />
            <p className="text-xs text-muted-foreground">
              Retouche le texte ici avant de copier. Relis-le toujours : c&apos;est toi qui le
              signes.
            </p>

            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2.5">
              <p className="mb-1 text-xs font-medium">Aperçu avec ton lien inséré</p>
              <div
                className="fq-rich max-h-72 overflow-y-auto text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
