"use client";

// app/(app)/affiliation/AffiliationClient.tsx
// UI de l'espace Affiliation. Présente l'offre, construit le lien affilié
// Systeme.io (saisie de l'ID), explique paiement + suivi des gains, et
// affiche un kit de promo personnalisé selon le business de l'élève.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  TrendingUp,
  Sparkles,
  Rocket,
  Lightbulb,
  Compass,
  Gift,
  Info,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  QUIZING_COMMISSION_PCT,
  TIQUIZ_RECURRING_PCT,
  ATELIER_SALES_URL,
  SIO_AFFILIATE_DASHBOARD_URL,
  SIO_AFFILIATE_SETTINGS_URL,
  buildAffiliateLink,
  normalizeAffiliateId,
  isValidAffiliateId,
  getAffiliatePlaybook,
  AFFILIATE_ARGUMENTS,
  affiliateIntro,
} from "@/lib/affiliate";

const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)));

const eurCents = (c: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Math.max(0, c) / 100);

// Type local (on n'importe pas lib/affiliateTracking qui est server-only).
type CommissionRow = {
  id: string;
  source_app: "quizing" | "tiquiz";
  product_name: string | null;
  sale_amount_cents: number;
  commission_cents: number;
  status: string;
  sale_at: string;
};
type Gains = {
  totalCents: number;
  pendingCents: number;
  approvedCents: number;
  paidCents: number;
  quizingCents: number;
  tiquizCents: number;
  salesCount: number;
  recent: CommissionRow[];
} | null;

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  approved: "Validé",
  paid: "Payé",
  cancelled: "Annulé",
  rejected: "Rejeté",
};

export function AffiliationClient({
  firstName,
  niche,
  activityType,
  initialAffiliateId,
  gains,
}: {
  firstName: string | null;
  niche: string | null;
  activityType: string | null;
  initialAffiliateId: string;
  gains: Gains;
}) {
  const router = useRouter();
  const [input, setInput] = useState(initialAffiliateId);
  const [savedId, setSavedId] = useState(initialAffiliateId);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const playbook = useMemo(() => getAffiliatePlaybook(activityType), [activityType]);
  const intro = useMemo(() => affiliateIntro({ firstName, niche }), [firstName, niche]);

  const normalized = normalizeAffiliateId(input);
  const inputValid = isValidAffiliateId(normalized);
  const inputTouchedInvalid = normalized.length > 0 && !inputValid;

  // Lien affiché : la saisie valide en priorité, sinon l'ID déjà enregistré.
  const effectiveId = inputValid ? normalized : savedId;
  const link = effectiveId ? buildAffiliateLink(effectiveId) : "";

  async function save() {
    if (inputTouchedInvalid) {
      toast.error("Cet identifiant ne ressemble pas à un ID affilié Systeme.io (sa...).");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/me/affiliate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ affiliateId: input }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        toast.error(
          data?.reason === "bad_format"
            ? "Format d'identifiant invalide."
            : "Échec de l'enregistrement. Réessaie.",
        );
        return;
      }
      setSavedId(data.affiliateId ?? "");
      setInput(data.affiliateId ?? "");
      toast.success(data.affiliateId ? "Lien affilié enregistré !" : "Identifiant retiré.");
      router.refresh();
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Lien copié !");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Impossible de copier. Sélectionne le lien à la main.");
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold sm:text-3xl">
          <Share2 className="size-7 text-primary" />
          Affiliation
        </h1>
        <p className="text-sm text-muted-foreground">{intro}</p>
      </header>

      {/* 1. Tes avantages */}
      <Card>
        <CardContent className="flex flex-col gap-4 py-5">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Gift className="size-4 text-primary" />
            Tes avantages
          </span>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-primary/10 p-4">
              <div className="font-display text-3xl font-bold text-primary">
                {QUIZING_COMMISSION_PCT}%
              </div>
              <p className="mt-1 text-sm">
                de commission sur <strong>chaque vente de l’Atelier du Quiz</strong>. Tu touches
                l’intégralité du prix.
              </p>
            </div>
            <div className="rounded-xl bg-success/10 p-4">
              <div className="font-display text-3xl font-bold text-success">
                {TIQUIZ_RECURRING_PCT}%
              </div>
              <p className="mt-1 text-sm">
                <strong>chaque mois</strong> sur chaque abonnement Tiquiz parrainé. Un revenu
                récurrent qui s’accumule.
              </p>
            </div>
          </div>
          <ul className="flex flex-col gap-2">
            {AFFILIATE_ARGUMENTS.map((a) => (
              <li key={a.title} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                <span>
                  <strong>{a.title}.</strong> {a.body}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* 2. Ton lien affilié */}
      <Card>
        <CardContent className="flex flex-col gap-4 py-5">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-primary" />
            Ton lien affilié
          </span>

          <ol className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <li>
              1. Ouvre ton{" "}
              <a
                href={SIO_AFFILIATE_DASHBOARD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                tableau de bord affilié Systeme.io
                <ExternalLink className="size-3.5" />
              </a>
              .
            </li>
            <li>
              2. Repère ton <strong>identifiant affilié</strong> (il commence par{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">sa</code> suivi d’une longue
              suite de caractères).
            </li>
            <li>3. Colle-le ci-dessous : on construit ton lien automatiquement.</li>
          </ol>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="aff-id">Ton identifiant affilié Systeme.io</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="aff-id"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="sa0007878317200141bbe3de2b6644176621db2c6580"
                className="font-mono text-xs sm:text-sm"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
              />
              <Button onClick={save} disabled={saving} className="shrink-0">
                {saving ? "..." : savedId ? "Mettre à jour" : "Valider"}
              </Button>
            </div>
            {inputTouchedInvalid ? (
              <p className="text-xs text-destructive">
                Hmm, ça ne ressemble pas à un ID Systeme.io. Tu peux aussi coller le lien complet
                (on en extrait le sa).
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Astuce : tu peux coller ton ID seul OU un lien Systeme.io contenant ?sa=...
              </p>
            )}
          </div>

          {link ? (
            <div className="flex flex-col gap-2">
              <Label>Ton lien affilié prêt à partager</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="flex-1 truncate rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
                  {link}
                </code>
                <Button variant="outline" onClick={copyLink} className="shrink-0">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? "Copié" : "Copier"}
                </Button>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Partage toujours CE lien (avec <code>?sa=</code>). Un lien nu vers{" "}
                  {ATELIER_SALES_URL} sans ton identifiant ne te crédite aucune commission.
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Ajoute ton identifiant ci-dessus pour générer ton lien.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 3. Paiement */}
      <Card>
        <CardContent className="flex flex-col gap-3 py-5">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="size-4 text-primary" />
            Configure ton paiement (une fois)
          </span>
          <p className="text-sm text-muted-foreground">
            Tu es payé directement par Systeme.io, en automatique, <strong>entre le 10 et le 13</strong>{" "}
            de chaque mois. Pour ça, complète tes infos de paiement (PayPal ou virement) dans tes
            réglages affilié.
          </p>
          <div>
            <Button asChild variant="outline" size="sm">
              <a href={SIO_AFFILIATE_SETTINGS_URL} target="_blank" rel="noopener noreferrer">
                Compléter mes infos de paiement
                <ExternalLink className="size-4" />
              </a>
            </Button>
          </div>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Sans infos de paiement renseignées, Systeme.io ne peut pas t’envoyer tes commissions.
          </p>
        </CardContent>
      </Card>

      {/* 4. Suivi des gains (vrais chiffres) */}
      <Card>
        <CardContent className="flex flex-col gap-4 py-5">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="size-4 text-primary" />
            Tes gains
          </span>

          {!savedId ? (
            <p className="text-sm text-muted-foreground">
              Ajoute ton identifiant affilié ci-dessus pour activer le suivi de tes commissions.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <GainStat label="Total gagné" cents={gains?.totalCents ?? 0} highlight />
                <GainStat label="En attente" cents={gains?.pendingCents ?? 0} />
                <GainStat label="Validé" cents={gains?.approvedCents ?? 0} />
                <GainStat label="Payé" cents={gains?.paidCents ?? 0} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-3 text-sm">
                  <div className="text-xs text-muted-foreground">Sur l’Atelier du Quiz (100%)</div>
                  <div className="font-display text-xl font-bold text-primary">
                    {eurCents(gains?.quizingCents ?? 0)}
                  </div>
                </div>
                <div className="rounded-lg border border-border p-3 text-sm">
                  <div className="text-xs text-muted-foreground">Sur Tiquiz (40% récurrent)</div>
                  <div className="font-display text-xl font-bold text-success">
                    {eurCents(gains?.tiquizCents ?? 0)}
                  </div>
                </div>
              </div>

              {gains && gains.recent.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Date</th>
                        <th className="py-2 pr-3 font-medium">Produit</th>
                        <th className="py-2 pr-3 font-medium">Vente</th>
                        <th className="py-2 pr-3 font-medium">Commission</th>
                        <th className="py-2 font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gains.recent.map((r) => (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                            {new Date(r.sale_at).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="py-2 pr-3">
                            {r.source_app === "quizing" ? "Atelier du Quiz" : "Tiquiz"}
                            {r.product_name ? (
                              <span className="block text-xs text-muted-foreground">{r.product_name}</span>
                            ) : null}
                          </td>
                          <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                            {eurCents(r.sale_amount_cents)}
                          </td>
                          <td className="py-2 pr-3 whitespace-nowrap font-medium">
                            {eurCents(r.commission_cents)}
                          </td>
                          <td className="py-2 whitespace-nowrap text-xs">
                            {STATUS_LABEL[r.status] ?? r.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Pas encore de commission. Dès qu’une vente passe par ton lien, elle apparaît ici.
                </p>
              )}

              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                Le détail officiel et les paiements restent sur Systeme.io.
              </p>
              <div>
                <Button asChild variant="outline" size="sm">
                  <a href={SIO_AFFILIATE_DASHBOARD_URL} target="_blank" rel="noopener noreferrer">
                    Voir le détail sur Systeme.io
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              </div>
            </>
          )}

          <Estimator />
        </CardContent>
      </Card>

      {/* 5. Kit de promo personnalisé */}
      <Card>
        <CardContent className="flex flex-col gap-4 py-5">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Rocket className="size-4 text-primary" />
            Ton kit pour promouvoir l’Atelier du Quiz
          </span>

          <div className="rounded-xl bg-primary/5 p-4 text-sm">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
              <Lightbulb className="size-3.5" />
              Ton angle
            </span>
            <p className="mt-1">{playbook.angle}</p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="size-4 text-primary" />
              3 idées de quiz pour vendre Quizing à ton audience
            </span>
            <ul className="flex flex-col gap-2">
              {playbook.quizIdeas.map((idea, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{idea}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <Compass className="size-4 text-primary" />
              À qui le recommander en priorité
            </span>
            <ul className="flex flex-col gap-2">
              {playbook.niches.map((n, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Estimateur de gains. Valeurs indicatives, ajustables par l'affilié (on
// n'invente aucun chiffre officiel : ce sont des hypothèses qu'il modifie).
function GainStat({ label, cents, highlight }: { label: string; cents: number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? "bg-primary/10" : "bg-muted/40"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-display text-2xl font-bold ${highlight ? "text-primary" : ""}`}>
        {eurCents(cents)}
      </div>
    </div>
  );
}

function Estimator() {
  const [quizSales, setQuizSales] = useState(5);
  const [quizPrice, setQuizPrice] = useState(47);
  const [tiquizSubs, setTiquizSubs] = useState(5);
  const [tiquizPrice, setTiquizPrice] = useState(9);

  const quizingEarn = quizSales * quizPrice * (QUIZING_COMMISSION_PCT / 100);
  const tiquizMonthly = tiquizSubs * tiquizPrice * (TIQUIZ_RECURRING_PCT / 100);
  const thisMonth = quizingEarn + tiquizMonthly;

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Estimateur (ajuste les valeurs)
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField label="Ventes Quizing / mois" value={quizSales} onChange={setQuizSales} />
        <NumberField label="Prix Atelier du Quiz (€)" value={quizPrice} onChange={setQuizPrice} />
        <NumberField label="Abonnés Tiquiz actifs" value={tiquizSubs} onChange={setTiquizSubs} />
        <NumberField label="Prix abonnement Tiquiz / mois (€)" value={tiquizPrice} onChange={setTiquizPrice} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-background p-3">
          <div className="text-xs text-muted-foreground">Ce mois-ci (ventes + récurrent)</div>
          <div className="font-display text-2xl font-bold text-primary">{eur(thisMonth)}</div>
        </div>
        <div className="rounded-lg bg-background p-3">
          <div className="text-xs text-muted-foreground">Récurrent Tiquiz (chaque mois)</div>
          <div className="font-display text-2xl font-bold text-success">{eur(tiquizMonthly)}</div>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Estimation indicative. Tes commissions réelles sont sur Systeme.io.
      </p>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
      />
    </div>
  );
}
