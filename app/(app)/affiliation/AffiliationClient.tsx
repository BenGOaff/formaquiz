"use client";

// app/(app)/affiliation/AffiliationClient.tsx
// Espace Affiliation en onglets (lisibilité) : Mon lien / Mes gains /
// Promouvoir / Paiement. Affiche le lien affilié (code public) et les
// VRAIS gains (commissions attribuées par les webhooks) + un simulateur, et
// un kit de promo personnalisé selon le business de l'élève.

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Share2,
  Link2,
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
  Megaphone,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  QUIZING_COMMISSION_PCT,
  TIQUIZ_RECURRING_PCT,
  ATELIER_SALES_URL,
  SIO_AFFILIATE_DASHBOARD_URL,
  ESPACE_AFFILIE_URL,
  buildAffiliateLink,
  getAffiliatePlaybook,
  AFFILIATE_ARGUMENTS,
  affiliateIntro,
} from "@/lib/affiliate";

const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
    Math.max(0, Math.round(n)),
  );
const eurCents = (c: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Math.max(0, c) / 100);

// Types locaux (on n'importe pas lib/affiliateTracking qui est server-only).
type DisplayStatus = "guarantee" | "payable" | "paid" | "refunded";
type CommissionRow = {
  id: string;
  source_app: "quizing" | "tiquiz";
  product_name: string | null;
  sale_amount_cents: number;
  commission_cents: number;
  status: string;
  sale_at: string;
  refunded_at?: string | null;
  displayStatus: DisplayStatus;
};
type MonthRow = { key: string; label: string; salesCount: number; commissionCents: number };
type Gains = {
  visits: number;
  leads: number;
  salesCount: number;
  refundsCount: number;
  totalCents: number;
  guaranteeCents: number;
  payableCents: number;
  paidCents: number;
  refundedCents: number;
  quizingCents: number;
  tiquizCents: number;
  byMonth: MonthRow[];
  nextPayout: { amountCents: number; label: string } | null;
  recent: CommissionRow[];
} | null;

const STATUS_LABEL: Record<DisplayStatus, string> = {
  guarantee: "Garantie 30j",
  payable: "À verser",
  paid: "Versé",
  refunded: "Remboursé",
};
const STATUS_CLASS: Record<DisplayStatus, string> = {
  guarantee: "bg-amber-100 text-amber-800",
  payable: "bg-primary/10 text-primary",
  paid: "bg-success/15 text-success",
  refunded: "bg-muted text-muted-foreground line-through",
};

type Tab = "lien" | "gains" | "promo" | "paiement";

export function AffiliationClient({
  firstName,
  niche,
  activityType,
  initialAffiliateId,
  refCode,
  refEtat,
  gains,
}: {
  firstName: string | null;
  niche: string | null;
  activityType: string | null;
  initialAffiliateId: string;
  /** Le code public, fabriqué et gardé par le registre central. */
  refCode: string | null;
  /** Pourquoi il n'y a pas de code, quand il n'y en a pas. */
  refEtat: "ok" | "exclu" | "deja-affilie" | "injoignable";
  gains: Gains;
}) {
  const [tab, setTab] = useState<Tab>("lien");
  // `savedId` est LU, jamais écrit ici : plus rien ne se règle sur cet
  // écran (voir l'onglet Mon lien).
  const [savedId] = useState(initialAffiliateId);
  const [copied, setCopied] = useState(false);

  const playbook = useMemo(() => getAffiliatePlaybook(activityType), [activityType]);
  const intro = useMemo(() => affiliateIntro({ firstName, niche }), [firstName, niche]);

  // LE LIEN NE DÉPEND PLUS DE L'IDENTIFIANT SYSTEME.IO. Il porte le code
  // public du registre central, seul paramètre que notre bon de commande
  // sait lire. Le `sa` ne sert plus qu'à rattacher les ventes arrivées
  // par les anciens tunnels, et il est facultatif.
  const link = buildAffiliateLink(refCode);

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
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold sm:text-3xl">
          <Share2 className="size-7 text-primary" />
          Affiliation
        </h1>
        <p className="text-sm text-muted-foreground">{intro}</p>
      </header>

      {/* Onglets */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface-soft p-1">
        <TabBtn active={tab === "lien"} onClick={() => setTab("lien")} icon={Link2}>
          Mon lien
        </TabBtn>
        <TabBtn active={tab === "gains"} onClick={() => setTab("gains")} icon={TrendingUp}>
          Mes gains
        </TabBtn>
        <TabBtn active={tab === "promo"} onClick={() => setTab("promo")} icon={Rocket}>
          Promouvoir
        </TabBtn>
        <TabBtn active={tab === "paiement"} onClick={() => setTab("paiement")} icon={CheckCircle2}>
          Paiement
        </TabBtn>
        {/* Le kit de contenu a son propre espace à dossiers
            (/affiliation/contenu), aligné sur affiliate.tipote.com : il ne
            tient plus dans un onglet. Ce bouton y emmène. */}
        <Link
          href="/affiliation/contenu"
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        >
          <Megaphone className="size-4" />
          Contenu
        </Link>
      </div>

      {/* ───── Onglet Mon lien ───── */}
      {tab === "lien" && (
        <Card>
          <CardContent className="flex flex-col gap-4 py-5">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-primary" />
              Ton lien affilié
            </span>

            {/*
              LE LIEN EST DÉJÀ LÀ, il n'y a plus rien à aller chercher
              ailleurs. Avant le 26 août, cet écran demandait d'ouvrir
              Systeme.io, d'y repérer un identifiant et de le recoller
              ici : trois étapes pour obtenir un lien qui, depuis que
              l'Atelier se vend chez nous, ne pouvait plus rien
              commissionner.
            */}
            {link ? (
              <div className="flex flex-col gap-2">
                <Label>Ton lien, prêt à partager</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <code className="flex-1 truncate rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
                    {link}
                  </code>
                  <Button variant="outline" onClick={copyLink} className="shrink-0">
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copied ? "Copié" : "Copier"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Partage ce lien tel quel. Le cookie posé chez la personne dure{" "}
                  <strong>un an</strong>, et quelqu'un qui s'inscrit en gratuit par ce
                  lien te reste rattaché à vie, même s'il achète des mois plus tard.
                </p>
              </div>
            ) : (
              /*
                PAS DE LIEN PLUTÔT QU'UN LIEN MUET. Un lien sans code se
                partage quand même, et chaque partage est une vente
                perdue que personne ne peut plus retrouver. On dit donc
                ce qui se passe, au lieu d'afficher une adresse nue.
              */
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  {refEtat === "exclu" ? (
                    <>
                      Ton compte affilié est suspendu. Écris au support pour en
                      connaître la raison : tant qu'il l'est, aucun lien n'est
                      généré.
                    </>
                  ) : refEtat === "deja-affilie" ? (
                    <>
                      Ton adresse est déjà affiliée sous un autre identifiant.
                      Tes commissions y sont accrochées, donc on ne fusionne pas
                      deux comptes tout seuls : écris au support et on s'en
                      occupe.
                    </>
                  ) : (
                    <>
                      Ton lien n'a pas pu être récupéré à l'instant. Recharge la
                      page dans un moment : rien n'est perdu, ton code existe et
                      ne change pas.
                    </>
                  )}
                </span>
              </div>
            )}

            {/*
              ON NE GÈRE RIEN ICI (Béné, 31 août 2026) : "les élèves de
              l'Atelier doivent aller sur affiliate pour tout gérer. On
              gère tout sur affiliate et le reste montre seulement."

              Cet écran portait un champ pour enregistrer son identifiant
              Systeme.io. Il écrivait dans le registre HISTORIQUE de
              l'Atelier, pendant que l'espace affilié écrit dans le
              registre CENTRAL : deux endroits pour régler la même chose,
              avec deux effets différents. C'est la mécanique qui produit
              les contradictions les plus chères de ces dépôts.

              Le champ est donc parti. Ce qui est DÉJÀ enregistré reste
              lu (il sert de repli pour les ventes des anciens tunnels),
              et on le montre en lecture seule pour que personne ne le
              croie perdu.
            */}
            {savedId ? (
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  Identifiant Systeme.io rattaché à ce compte :{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono">{savedId}</code>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Il ne sert qu&apos;à retrouver tes ventes arrivées par les anciens
                  tunnels. Pour le changer, passe par ton espace affilié : c&apos;est
                  lui qui fait référence.
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* ───── Onglet Mes gains ───── */}
      {tab === "gains" && (
        <div className="flex flex-col gap-6">
          {!savedId ? (
            <Card>
              <CardContent className="flex flex-col items-start gap-3 py-5">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <TrendingUp className="size-4 text-primary" />
                  Tes gains réels
                </span>
                <p className="text-sm text-muted-foreground">
                  Les ventes passées par ton lien sont suivies dans ton espace
                  affilié, avec tes clics, tes filleuls et tes versements. Ce
                  compteur ci ne sert qu&apos;aux ventes arrivées par les anciens
                  tunnels Systeme.io, et tu n&apos;en as pas.
                </p>
                <Button size="sm" asChild>
                  <a href={ESPACE_AFFILIE_URL} target="_blank" rel="noopener noreferrer">
                    Ouvrir mon espace affilié
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/*
                CE QUE CES CHIFFRES SONT, ET CE QU'ILS NE SONT PAS.

                Béné, 31 août 2026 : "on gère tout sur affiliate et le
                reste montre seulement."

                `getAffiliateGains` lit le registre HISTORIQUE de
                l'Atelier (`affiliate_commissions` d'ICI), alimenté par
                le webhook Systeme.io. Il ne voit RIEN de ce qui passe
                par un lien `?ref=` d'aujourd'hui, qui remonte au
                registre central.

                Or les libellés disaient "Total gagné (net)", "Prêt à
                verser", "Versé (estimé)" : un élève qui vend par son
                lien actuel lisait un relevé qui a l'air complet et qui
                ne compte que ses vieilles ventes. Le dire une fois en
                haut, en gras, coûte moins cher qu'une réclamation.
              */}
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="flex flex-col items-start gap-2 py-4">
                  <p className="text-sm">
                    <strong>Ces chiffres ne comptent que tes ventes arrivées par les
                    anciens tunnels Systeme.io.</strong>{" "}
                    Tes clics, tes filleuls, tes commissions d&apos;aujourd&apos;hui et
                    tes versements vivent dans ton espace affilié, et c&apos;est lui
                    qui fait référence.
                  </p>
                  <Button size="sm" asChild>
                    <a href={ESPACE_AFFILIE_URL} target="_blank" rel="noopener noreferrer">
                      Ouvrir mon espace affilié
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                </CardContent>
              </Card>

              {/* Entonnoir : visites -> leads -> ventes -> remboursements */}
              <Card>
                <CardContent className="grid gap-3 py-5 sm:grid-cols-2 lg:grid-cols-4">
                  <CountStat label="Visites via ton lien" value={gains?.visits ?? 0} />
                  <CountStat label="Leads captés" value={gains?.leads ?? 0} />
                  <CountStat label="Ventes" value={gains?.salesCount ?? 0} />
                  <CountStat label="Remboursements" value={gains?.refundsCount ?? 0} muted />
                </CardContent>
              </Card>

              {/* Commissions par statut, sur le cycle de versement (J+30). */}
              <Card>
                <CardContent className="flex flex-col gap-4 py-5">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <TrendingUp className="size-4 text-primary" />
                    Tes commissions
                  </span>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <GainStat label="Gagné via Systeme.io (net)" cents={gains?.totalCents ?? 0} highlight />
                    <GainStat label="Garantie 30j en cours" cents={gains?.guaranteeCents ?? 0} />
                    <GainStat label="Prêt à verser" cents={gains?.payableCents ?? 0} />
                    <GainStat label="Versé par Systeme.io (estimé)" cents={gains?.paidCents ?? 0} />
                  </div>
                  {(gains?.refundsCount ?? 0) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Remboursé : {eurCents(gains?.refundedCents ?? 0)} ({gains?.refundsCount} vente
                      {(gains?.refundsCount ?? 0) > 1 ? "s" : ""}), déjà déduit de ton total.
                    </p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border p-3 text-sm">
                      <div className="text-xs text-muted-foreground">
                        Atelier du Quiz ({QUIZING_COMMISSION_PCT}% du HT)
                      </div>
                      <div className="font-display text-xl font-bold text-primary">
                        {eurCents(gains?.quizingCents ?? 0)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border p-3 text-sm">
                      <div className="text-xs text-muted-foreground">
                        Tiquiz ({TIQUIZ_RECURRING_PCT}% du HT, récurrent)
                      </div>
                      <div className="font-display text-xl font-bold text-success">
                        {eurCents(gains?.tiquizCents ?? 0)}
                      </div>
                    </div>
                  </div>

                  {gains?.nextPayout && (
                    <div className="flex items-start gap-2 rounded-lg bg-primary/5 p-3 text-sm">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>
                        <strong>
                          Prochain versement Systeme.io estimé :{" "}
                          {eurCents(gains.nextPayout.amountCents)}
                        </strong>
                        , {gains.nextPayout.label}. Ce sont tes commissions des anciens
                        tunnels dont la garantie 30 jours est passée. Les versements de
                        tes ventes actuelles sont annoncés dans ton espace affilié.
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Comment tu es payé, en toutes lettres. */}
              <Card>
                <CardContent className="flex flex-col gap-2 py-5">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Info className="size-4 text-primary" />
                    Comment tu es payé
                  </span>
                  <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      <span>
                        Tu touches <strong>{QUIZING_COMMISSION_PCT}% du montant HT</strong> de chaque
                        Atelier du Quiz vendu, et <strong>{TIQUIZ_RECURRING_PCT}% du HT</strong> chaque
                        mois sur chaque abonnement Tiquiz parrainé.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      <span>
                        Chaque vente est retenue <strong>30 jours</strong> : c'est la durée de la
                        garantie satisfait ou remboursé. Si l'acheteur se fait rembourser pendant ce
                        délai, la commission est annulée (c'est normal, et rare).
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      <span>
                        Passé ces 30 jours, la commission est acquise. Elle part
                        <strong> entre le 10 et le 13 du mois</strong>, par virement
                        ou PayPal selon ce que tu as choisi, dès 20 € cumulés.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      <span>
                        Ce compteur suit tes ventes arrivées par les anciens
                        tunnels Systeme.io. Celles passées par ton lien ci-dessus
                        sont comptées dans ton espace affilié, qui fait référence
                        pour le versement.
                      </span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Par mois */}
              {gains && gains.byMonth.length > 0 && (
                <Card>
                  <CardContent className="flex flex-col gap-3 py-5">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <TrendingUp className="size-4 text-primary" />
                      Par mois
                    </span>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground">
                            <th className="py-2 pr-3 font-medium">Mois</th>
                            <th className="py-2 pr-3 font-medium">Ventes</th>
                            <th className="py-2 font-medium">Commissions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gains.byMonth.map((m) => (
                            <tr key={m.key} className="border-b last:border-0">
                              <td className="py-2 pr-3 capitalize">{m.label}</td>
                              <td className="py-2 pr-3 text-muted-foreground">{m.salesCount}</td>
                              <td className="py-2 font-medium">{eurCents(m.commissionCents)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Détail des ventes */}
              <Card>
                <CardContent className="flex flex-col gap-3 py-5">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <TrendingUp className="size-4 text-primary" />
                    Détail de tes ventes
                  </span>
                  {gains && gains.recent.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground">
                            <th className="py-2 pr-3 font-medium">Date</th>
                            <th className="py-2 pr-3 font-medium">Produit</th>
                            <th className="py-2 pr-3 font-medium">Vente HT</th>
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
                              <td className="py-2 whitespace-nowrap">
                                <span
                                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[r.displayStatus]}`}
                                >
                                  {STATUS_LABEL[r.displayStatus]}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Pas encore de commission. Dès qu'une vente passe par ton lien, elle apparaît ici.
                    </p>
                  )}
                  <div>
                    <Button asChild variant="outline" size="sm">
                      <a href={ESPACE_AFFILIE_URL} target="_blank" rel="noopener noreferrer">
                        Voir le détail dans mon espace affilié
                        <ExternalLink className="size-4" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Estimator />
            </>
          )}
        </div>
      )}

      {/* ───── Onglet Promouvoir ───── */}
      {tab === "promo" && (
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="flex flex-col gap-4 py-5">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Gift className="size-4 text-primary" />
                Tes avantages
              </span>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-primary/10 p-4">
                  <div className="font-display text-3xl font-bold text-primary">{QUIZING_COMMISSION_PCT}%</div>
                  <p className="mt-1 text-sm">
                    de commission sur <strong>chaque vente de l’Atelier du Quiz</strong>.
                  </p>
                </div>
                <div className="rounded-xl bg-success/10 p-4">
                  <div className="font-display text-3xl font-bold text-success">{TIQUIZ_RECURRING_PCT}%</div>
                  <p className="mt-1 text-sm">
                    <strong>chaque mois</strong> sur chaque abonnement Tiquiz parrainé.
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

          {/* Porte d'entrée du kit. Sans cette carte, le seul accès à
              l'espace Contenu serait le petit lien de la barre d'onglets,
              et l'affilié qui vient de lire son angle ne saurait pas où
              trouver de quoi l'appliquer. */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col gap-3 py-5">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Megaphone className="size-4 text-primary" />
                Ton kit de contenu
              </span>
              <p className="text-sm text-muted-foreground">
                Emails de vente, posts et leurs visuels, angles d&apos;articles, logos, et un
                rédacteur IA qui écrit pour ton audience. Tout est rangé par rayon, ton lien est
                déjà inséré.
              </p>
              <div>
                <Button asChild>
                  <Link href="/affiliation/contenu">
                    Ouvrir mon espace Contenu
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}


      {/* ───── Onglet Paiement ───── */}
      {tab === "paiement" && (
        <Card>
          <CardContent className="flex flex-col gap-3 py-5">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="size-4 text-primary" />
              Configure ton paiement (une fois)
            </span>
            {/*
              LE CYCLE DE VERSEMENT VIT CHEZ NOUS DEPUIS LE 25 AOÛT.
              Cet écran envoyait encore régler ses coordonnées dans
              Systeme.io : quelqu'un qui les y remplissait aujourd'hui ne
              serait payé de rien pour ses ventes passées par notre bon de
              commande. C'est la faute déjà commise le 8 juin, dans
              l'autre sens ("arrête d'inventer n'importe quoi").
            */}
            <p className="text-sm text-muted-foreground">
              Tu choisis : <strong>virement ou PayPal</strong>. Les versements
              partent <strong>entre le 10 et le 13</strong> de chaque mois, pour
              les commissions dont les 30 jours sont passés, dès{" "}
              <strong>20 € cumulés</strong>. En dessous, l&apos;argent reste acquis
              et part au versement suivant. La facture est écrite à ta place
              chaque mois : tu n&apos;as rien à nous envoyer.
            </p>
            <div>
              <Button asChild variant="outline" size="sm">
                <a href={`${ESPACE_AFFILIE_URL}paiement`} target="_blank" rel="noopener noreferrer">
                  Renseigner mes coordonnées de versement
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            </div>
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              Sans coordonnées renseignées, ta ligne est écartée du versement du
              mois et son montant t&apos;est conservé. Les commissions de tes
              ventes arrivées par les anciens tunnels Systeme.io continuent, elles,
              d&apos;être versées par Systeme.io.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Link2;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {children}
    </button>
  );
}

function CountStat({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${muted ? "bg-muted/40" : "bg-primary/5"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

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

// Simulateur de gains. Valeurs indicatives, ajustables (Atelier du Quiz 47€,
// Tiquiz 17€/mois par défaut). On n'invente aucun chiffre officiel.
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
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Sparkles className="size-3.5" />
        Simulateur (ajuste les valeurs)
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField label="Ventes Quizing / mois" value={quizSales} onChange={setQuizSales} />
        <NumberField label="Prix Atelier du Quiz (€)" value={quizPrice} onChange={setQuizPrice} />
        <NumberField label="Abonnés Tiquiz actifs" value={tiquizSubs} onChange={setTiquizSubs} />
        <NumberField label="Prix abonnement Tiquiz / mois (€)" value={tiquizPrice} onChange={setTiquizPrice} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-background p-3">
          <div className="text-xs text-muted-foreground">
            Ventes Atelier ({QUIZING_COMMISSION_PCT}% de commission)
          </div>
          <div className="font-display text-2xl font-bold">{eur(quizingEarn)}</div>
        </div>
        <div className="rounded-lg bg-background p-3">
          <div className="text-xs text-muted-foreground">
            Récurrent Tiquiz ({TIQUIZ_RECURRING_PCT}%, chaque mois)
          </div>
          <div className="font-display text-2xl font-bold text-success">{eur(tiquizMonthly)}</div>
        </div>
        <div className="rounded-lg bg-background p-3">
          <div className="text-xs text-muted-foreground">Total ce mois-ci</div>
          <div className="font-display text-2xl font-bold text-primary">{eur(thisMonth)}</div>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Estimation indicative. Tes commissions réelles sont dans l’onglet Mes gains.
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
