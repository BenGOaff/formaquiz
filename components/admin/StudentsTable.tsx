"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, Send, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface StudentRow {
  userId: string;
  email: string;
  fullName: string | null;
  status: "active" | "revoked" | null;
  completedDays: number;
  createdAt: string;
  /** Dernière connexion (auth). null si jamais connecté. */
  lastSignInAt: string | null;
  /** L'élève a activé son affiliation (sio_affiliate_id renseigné). */
  isAffiliate: boolean;
  /** Personnes distinctes amenées via son lien affilié (conversions). */
  invitedCount: number;
  /**
   * CE QU'IL A PAYÉ, s'il a payé chez nous.
   *
   * Béné, 20 août : "tu peux pas centraliser ? Je vois les élèves, leurs
   * infos + le bouton rembourser ? Au lieu d'avoir deux écrans."
   *
   * Elle a raison, et l'écran séparé était un contresens : elle ne pense
   * pas en "ventes", elle pense en PERSONNES. Chercher un email dans un
   * tableau pour aller le rechercher dans un autre, c'est du travail
   * qu'on lui donnait sans raison.
   *
   * `null` = aucune vente encaissée par nous à cette adresse. Ça ne veut
   * PAS dire qu'elle n'a pas payé : les achats passés par Systeme.io ne
   * sont pas dans ce journal, et les accès offerts non plus.
   */
  payment: StudentPayment | null;
}

export interface StudentPayment {
  /** Ce qu'on rembourse : PaymentIntent chez Stripe, capture chez PayPal. */
  ref: string;
  provider: "stripe" | "paypal";
  amountCents: number;
  currency: string;
  paidAt: string;
  refundedAt: string | null;
}

/** Le montant, tel qu'on l'affiche. */
function euros(cents: number, currency: string): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/** Les raisons du serveur, traduites ici et nulle part ailleurs. */
const RAISONS_REMBOURSEMENT: Record<string, string> = {
  forbidden: "Tu n'as pas les droits pour rembourser.",
  invalid_body: "Demande illisible.",
  not_configured: "Le moyen de paiement n'est pas branché sur ce serveur. Rien n'a bougé.",
  missing_permission:
    "Ta clé Stripe n'a pas le droit de rembourser. Dans Stripe, ouvre ta clé restreinte et passe Remboursements en Écriture. Rien n'a été remboursé.",
  provider_refused:
    "Le fournisseur a refusé le remboursement. Rien n'a été remboursé, regarde le détail dans son tableau de bord.",
  network: "La connexion a coupé. Rien n'a été remboursé.",
};

/** "il y a 2 jours", "à l'instant"... FR, sans tiret long. */
function timeAgo(iso: string | null): string {
  if (!iso) return "jamais connecté";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "jamais connecté";
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `il y a ${d} j`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `il y a ${mo} mois`;
  return `il y a ${Math.floor(mo / 12)} an(s)`;
}

export function StudentsTable({
  initialRows,
  totalDays,
}: {
  initialRows: StudentRow[];
  totalDays: number;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<StudentRow[]>(initialRows);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const res = await fetch("/api/admin/students/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim() }),
    });
    setInviting(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.reason === "bad_email" ? "Email invalide." : "Invitation impossible.");
      return;
    }
    toast.success(
      json.created ? "Invitation envoyée, accès accordé." : "Accès accordé (compte déjà existant).",
    );
    setInviteEmail("");
    router.refresh();
  }

  const filtered = rows.filter(
    (r) =>
      r.email.toLowerCase().includes(query.toLowerCase()) ||
      (r.fullName ?? "").toLowerCase().includes(query.toLowerCase()),
  );

  /**
   * REMBOURSER, DEPUIS LA FICHE DE LA PERSONNE.
   *
   * Le bouton ne revoque RIEN lui-meme et n'envoie aucun email : il
   * demande le remboursement au fournisseur, et c'est le webhook qui
   * coupe l'acces et envoie le message d'au revoir. Ce webhook part de
   * toute facon, que le remboursement vienne d'ici ou du tableau de bord
   * de Stripe. Le faire aussi ici donnerait deux chemins pour une meme
   * decision, et la contradiction serait un acces coupe sans email, ou
   * un email envoye deux fois.
   *
   * Consequence assumee : quelques secondes entre le clic et la bascule
   * du statut. D'ou le message qui le DIT, au lieu de laisser Bene se
   * demander si son clic a pris (regle du 3 aout).
   */
  async function rembourser(row: StudentRow) {
    const p = row.payment;
    if (!p) return;
    const qui = row.fullName ?? row.email;
    if (
      !window.confirm(
        `Rembourser ${euros(p.amountCents, p.currency)} à ${qui} ?\n\n` +
          `Son accès sera coupé automatiquement et elle recevra ton email d'au revoir.`,
      )
    ) {
      return;
    }
    setBusyId(row.userId);
    try {
      const r = await fetch("/api/admin/ventes/rembourser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: p.ref, provider: p.provider }),
      });
      const data = (await r.json().catch(() => ({}))) as { ok?: boolean; reason?: string };
      if (!data.ok) {
        toast.error(
          RAISONS_REMBOURSEMENT[data.reason ?? ""] ?? "Le remboursement n'a pas pu se faire.",
        );
        return;
      }
      toast.success(
        `Remboursement envoyé à ${qui}. L'accès se coupe et l'email part dans quelques secondes.`,
      );
      router.refresh();
    } catch {
      toast.error("La connexion a coupé. Rien n'a été remboursé.");
    } finally {
      setBusyId(null);
    }
  }

  async function setAccess(row: StudentRow, action: "grant" | "revoke") {
    setBusyId(row.userId);
    const res = await fetch(`/api/admin/students/${row.userId}/access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyId(null);
    if (!res.ok) {
      toast.error("Action impossible.");
      return;
    }
    setRows((prev) =>
      prev.map((r) =>
        r.userId === row.userId ? { ...r, status: action === "grant" ? "active" : "revoked" } : r,
      ),
    );
    toast.success(action === "grant" ? "Accès accordé." : "Accès révoqué.");
  }

  async function resendLink(row: StudentRow) {
    setBusyId(row.userId);
    const res = await fetch(`/api/admin/students/${row.userId}/access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resend" }),
    });
    setBusyId(null);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.reason === "no_email" ? "Cet élève n'a pas d'email." : "Envoi impossible.");
      return;
    }
    toast.success("Lien d'accès renvoyé par email.");
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="py-5">
          <form onSubmit={invite} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="invite">Inviter un élève (accès offert ou test)</Label>
              <Input
                id="invite"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@exemple.com"
              />
            </div>
            <Button type="submit" disabled={inviting}>
              <UserPlus />
              {inviting ? "Envoi..." : "Inviter"}
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            Crée le compte si besoin (email d'invitation envoyé) et accorde l'accès tout de suite.
          </p>
        </CardContent>
      </Card>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher par email ou nom"
        className="max-w-sm"
      />

      <div className="flex flex-col gap-2">
        {filtered.map((r) => (
          <Card key={r.userId}>
            <CardContent className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{r.fullName ?? r.email}</p>
                  {r.status === "active" ? (
                    <Badge variant="success">Actif</Badge>
                  ) : r.status === "revoked" ? (
                    <Badge variant="muted">Révoqué</Badge>
                  ) : (
                    <Badge variant="outline">Sans accès</Badge>
                  )}
                  {r.isAffiliate && (
                    <Badge variant="outline" title="A activé son affiliation">
                      Affilié{r.invitedCount > 0 ? ` · ${r.invitedCount} amené${r.invitedCount > 1 ? "s" : ""}` : ""}
                    </Badge>
                  )}
                </div>
                {r.fullName && (
                  <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                )}
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span>
                    Progression : <strong className="text-foreground">{r.completedDays}/{totalDays}</strong> jour{totalDays > 1 ? "s" : ""}
                  </span>
                  <span aria-hidden>·</span>
                  <span>Connexion : {timeAgo(r.lastSignInAt)}</span>
                  {r.payment && (
                    <>
                      <span aria-hidden>·</span>
                      <span>
                        {r.payment.refundedAt ? "Remboursé" : "Payé"}{" "}
                        <strong className="text-foreground">
                          {euros(r.payment.amountCents, r.payment.currency)}
                        </strong>{" "}
                        {r.payment.provider === "stripe" ? "par carte" : "en PayPal"}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busyId === r.userId}
                  onClick={() => resendLink(r)}
                  title="Renvoyer le lien d'accès par email"
                >
                  <Send className="size-4" />
                  <span className="hidden sm:inline">Renvoyer le lien</span>
                </Button>
                {r.payment && !r.payment.refundedAt && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busyId === r.userId}
                    onClick={() => rembourser(r)}
                    title="Rembourser cette vente et couper l'accès"
                  >
                    <Undo2 className="size-4" />
                    <span className="hidden sm:inline">Rembourser</span>
                  </Button>
                )}
                {r.status === "active" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busyId === r.userId}
                    onClick={() => setAccess(r, "revoke")}
                  >
                    Révoquer
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === r.userId}
                    onClick={() => setAccess(r, "grant")}
                  >
                    Accorder l'accès
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Aucun élève {query ? "ne correspond à ta recherche" : "pour le moment"}.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
