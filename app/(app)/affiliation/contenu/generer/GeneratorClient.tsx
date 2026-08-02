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
import { Check, Eraser, Loader2, Pencil, RefreshCw, Sparkles, Wand2 } from "lucide-react";
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
import { briefIsEmpty, type GeneratorBrief } from "@/lib/generatorBrief";

export function GeneratorClient({
  affiliateLink,
  displayName,
  savedBrief,
}: {
  affiliateLink: string;
  displayName: string;
  /** Brief de la derniere generation, repris pour ne pas tout retaper
   *  (demande Christelle sur Tipote, portee ici). Vide au premier passage. */
  savedBrief: GeneratorBrief;
}) {
  // Le FORMAT n'est jamais repris : c'est precisement ce qui change
  // quand on ecrit un mail, puis un post, puis un article sur le meme
  // sujet. Le contexte, lui, est repris.
  const [format, setFormat] = useState<GeneratorFormat>("post");
  const [audience, setAudience] = useState(savedBrief.audience ?? "");
  const [angle, setAngle] = useState(savedBrief.angle ?? "");
  const [tone, setTone] = useState(savedBrief.tone ?? "");
  // Un brief repris est ANNONCE, jamais restaure en douce : un contexte
  // perime applique en silence donne un texte a cote de la plaque sans
  // que personne ne le voie.
  const [restored, setRestored] = useState(!briefIsEmpty(savedBrief));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  // Le texte s'affiche MIS EN FORME par défaut. L'éditer est un geste
  // volontaire : afficher en permanence le markdown brut donnait
  // l'impression que le générateur rendait du code (retour Béné).
  const [editing, setEditing] = useState(false);

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
      setEditing(false);
      // On retient le brief QUI A SERVI, pas les frappes en cours.
      void saveBrief();
    } catch {
      setError("Problème de connexion. Vérifie ton réseau et réessaie.");
    } finally {
      setLoading(false);
    }
  }

  async function saveBrief() {
    try {
      await fetch("/api/me/brief", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "affiliate", brief: { audience, angle, tone } }),
      });
    } catch {
      // Confort : un brief non enregistre ne merite pas un message
      // d'erreur par-dessus un texte qui, lui, est bien la.
    }
  }

  function clearBrief() {
    setAudience("");
    setAngle("");
    setTone("");
    setRestored(false);
    void fetch("/api/me/brief", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "affiliate", brief: {} }),
    }).catch(() => {});
  }

  const resolved = result ? resolveVars(result, { affiliateLink, name: displayName }) : "";
  const plain = toPlain(resolved);
  const html = toHtml(resolved);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-5 py-5">
          {restored && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2">
              <p className="text-sm">
                Brief repris de ta dernière génération. Modifie ce qui a changé.
              </p>
              <Button type="button" size="sm" variant="ghost" onClick={clearBrief}>
                <Eraser className="mr-1.5 size-3.5" />
                Repartir de zéro
              </Button>
            </div>
          )}

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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="size-4 text-primary" />
                {FORMAT_LABEL[format]}
              </span>
              <div className="flex flex-wrap gap-2">
                <CopyRichButton html={html} label="Copier mis en forme" />
                <CopyButton text={plain} label="Copier en texte brut" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing((e) => !e)}
                >
                  {editing ? (
                    <>
                      <Check className="size-3.5" />
                      Terminé
                    </>
                  ) : (
                    <>
                      <Pencil className="size-3.5" />
                      Modifier
                    </>
                  )}
                </Button>
                <Button size="sm" variant="ghost" onClick={generate} disabled={loading}>
                  <RefreshCw className="size-3.5" />
                  Regénérer
                </Button>
              </div>
            </div>

            {editing ? (
              <>
                <Textarea
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  rows={22}
                  className="font-mono text-sm leading-relaxed"
                />
                <p className="text-xs text-muted-foreground">
                  Mise en forme : <code className="rounded bg-muted px-1">#</code> pour le titre,{" "}
                  <code className="rounded bg-muted px-1">##</code> pour un sous-titre,{" "}
                  <code className="rounded bg-muted px-1">**gras**</code>,{" "}
                  <code className="rounded bg-muted px-1">-</code> pour une puce. Clique sur
                  Terminé pour revoir le rendu.
                </p>
              </>
            ) : (
              <div className="fq-rich rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm leading-relaxed">
                <div dangerouslySetInnerHTML={{ __html: html }} />
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              &laquo; Copier mis en forme &raquo; garde les titres, le gras et les listes (pour ton
              blog, ton outil d&apos;emailing, Google Docs). &laquo; Copier en texte brut &raquo;
              enlève toute mise en forme, pour LinkedIn et Instagram qui n&apos;en acceptent
              aucune. Relis avant d&apos;envoyer : c&apos;est toi qui signes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
