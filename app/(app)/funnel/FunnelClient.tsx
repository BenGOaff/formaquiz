"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Sparkles,
  RefreshCw,
  Copy,
  Download,
  Mail,
  Megaphone,
  Users,
  ChevronDown,
  Boxes,
  ExternalLink,
  Target,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { FunnelAssets, FunnelEmail, FunnelResultEmail, SioTemplate } from "@/lib/types";
import {
  FUNNEL_INTENTIONS,
  DEFAULT_INTENTION,
  type IntentionMap,
  type FunnelIntention,
} from "@/lib/funnelIntentions";
import { sequenceBeatTitle, sortSequence } from "@/lib/funnelSequence";

interface ProfileOption {
  title: string;
  hasCta: boolean;
}

export function FunnelClient({
  initialAssets,
  generatedAt,
  templates = [],
  profiles = [],
  initialIntentions = {},
}: {
  initialAssets: FunnelAssets | null;
  generatedAt: string | null;
  templates?: SioTemplate[];
  profiles?: ProfileOption[];
  initialIntentions?: IntentionMap;
}) {
  const router = useRouter();
  const [assets, setAssets] = useState<FunnelAssets | null>(initialAssets);

  const [busy, setBusy] = useState<"" | "sequences" | "launch">("");
  // Ou en est la generation. Ecrire une sequence demande une bonne
  // minute : sans cette phrase, l'ecran ne se distingue pas d'un ecran
  // fige, et c'est la qu'on recharge la page en plein milieu.
  const [step, setStep] = useState("");
  const [intentions, setIntentions] = useState<IntentionMap>(initialIntentions);

  async function saveIntentions(next: IntentionMap) {
    setIntentions(next);
    try {
      await fetch("/api/me/funnel/intentions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentions: next }),
      });
    } catch {
      toast.error("Enregistrement impossible. Réessaie.");
    }
  }

  /** Enregistre UNE des deux moitiés. L'autre est conservée côté serveur. */
  async function persist(part: { byResult?: FunnelResultEmail[]; launch?: FunnelAssets["launch"] }) {
    const res = await fetch("/api/me/funnel", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(part),
    });
    const json = await res.json();
    if (!res.ok || !json.assets) throw new Error("save");
    setAssets(json.assets as FunnelAssets);
  }

  /**
   * GÉNÉRATION 1 : la séquence post-quiz de chaque profil.
   *
   * En plusieurs requêtes, et ce n'est pas un détail d'implémentation
   * (erreur 524, 3 août). Cloudflare coupe toute requête qui dépasse
   * ~100 secondes ; écrire 5 emails pour 4 profils en demande bien plus.
   * On demande d'abord la LISTE des profils, puis une requête par
   * profil, lancées EN PARALLÈLE : le temps total est celui du plus
   * lent, pas leur somme.
   */
  async function generateSequences() {
    setBusy("sequences");
    setStep("Je regarde tes profils de résultat...");
    try {
      const res = await fetch("/api/me/funnel/profiles", { method: "POST" });
      const json = await res.json();
      const titles: string[] = Array.isArray(json.profiles) ? json.profiles : [];
      if (!res.ok || titles.length === 0) throw new Error("profiles");

      let done = 0;
      setStep(`J'écris la séquence de tes ${titles.length} profils...`);

      const sequences = await Promise.all(
        titles.map(async (title) => {
          try {
            const r = await fetch("/api/me/funnel/sequence", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ profile: title }),
            });
            const j = await r.json();
            if (!r.ok || !Array.isArray(j.emails)) return [];
            return j.emails as FunnelResultEmail[];
          } catch {
            // Un profil qui echoue n'emporte pas les autres : ils
            // s'affichent, et relancer ne coute qu'un clic.
            return [];
          } finally {
            done += 1;
            setStep(`Profil ${done} sur ${titles.length} écrit...`);
          }
        }),
      );

      setStep("J'enregistre...");
      await persist({ byResult: sequences.flat() });

      const missing = titles.length - sequences.filter((s) => s.length > 0).length;
      if (missing > 0) {
        toast.warning(
          `C'est écrit, mais ${missing} profil${missing > 1 ? "s n'ont" : " n'a"} pas abouti. Relance pour compléter.`,
        );
      } else {
        toast.success("Tes séquences sont prêtes.");
      }
      router.refresh();
    } catch {
      toast.error("Génération impossible pour le moment. Réessaie dans un instant.");
    } finally {
      setBusy("");
      setStep("");
    }
  }

  /** GÉNÉRATION 2 : le kit pour faire connaître le quiz. Une requête. */
  async function generateLaunch() {
    setBusy("launch");
    setStep("J'écris tes posts et tes messages...");
    try {
      const res = await fetch("/api/me/funnel/launch", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.launch) throw new Error("launch");
      await persist({ launch: json.launch as FunnelAssets["launch"] });
      toast.success("Ton kit de lancement est prêt.");
      router.refresh();
    } catch {
      toast.error("Génération impossible pour le moment. Réessaie dans un instant.");
    } finally {
      setBusy("");
      setStep("");
    }
  }

  // Regroupement PAR PROFIL : chaque profil recoit son dossier,
  // contenant sa sequence complete. Le tri suit `step` via
  // `sortSequence`, la MEME fonction que le fichier telecharge : sinon
  // l'ecran et le .md finiraient par ne plus raconter la meme sequence.
  const byProfile = (() => {
    const map = new Map<string, FunnelResultEmail[]>();
    for (const e of assets?.byResult ?? []) {
      const key = (e.result || "Sans profil").trim();
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return [...map.entries()].map(([profile, emails]) => ({
      profile,
      emails: sortSequence(emails),
    }));
  })();

  const launch = assets?.launch ?? { posts: [], dm: "", partnerEmail: "" };
  const launchCount = launch.posts.length + (launch.dm ? 1 : 0) + (launch.partnerEmail ? 1 : 0);
  const hasSequences = byProfile.length > 0;
  const hasLaunch = launchCount > 0;

  return (
    <div className="flex flex-col gap-8">
      {/* DEUX GENERATIONS, PAS SEPT (retour Bene, 3 aout 2026 : "je veux
          JUSTE 5 mails par resultat. Pas ce truc j'en ai partout je ne
          sais meme pas quoi en faire"). La sequence de bienvenue et la
          sequence de vente douce ont ete retirees : elles s'empilaient
          sans que personne sache quand les envoyer. */}

      <Block
        icon={Users}
        title="La séquence post-quiz de chaque profil"
        blurb="5 emails par profil de résultat, écrits avec ton ton, le thème de ton quiz et les mots de ta cible. C'est ce que reçoit un visiteur juste après avoir eu son résultat."
        actionLabel={hasSequences ? "Régénérer les séquences" : "Générer mes séquences"}
        onGenerate={generateSequences}
        busy={busy === "sequences"}
        disabled={busy !== ""}
        step={step}
        hint="Compte une bonne minute, tu peux laisser cet onglet ouvert."
      >
        {profiles.length > 0 && (
          <IntentionsBlock profiles={profiles} intentions={intentions} onChange={saveIntentions} />
        )}
        {byProfile.map(({ profile, emails }) => (
          <Folder key={profile} icon={Target} title={profile} count={emails.length}>
            {emails.map((e, i) => (
              <EmailRow
                key={i}
                n={i + 1}
                label="Email"
                note={sequenceBeatTitle(i)}
                subject={e.subject}
                body={e.body}
              />
            ))}
          </Folder>
        ))}
      </Block>

      <Block
        icon={Megaphone}
        title="Ton kit de lancement"
        blurb="4 publications, un message privé et un email à un partenaire, pour faire connaître ton quiz et le remplir de leads."
        actionLabel={hasLaunch ? "Régénérer le kit" : "Générer mon kit"}
        onGenerate={generateLaunch}
        busy={busy === "launch"}
        disabled={busy !== ""}
        step={step}
        hint="Une trentaine de secondes."
      >
        {launch.posts.map((p, i) => (
          <EmailRow key={`p${i}`} n={i + 1} label="Post" subject={firstLine(p)} body={p} />
        ))}
        {launch.dm && (
          <EmailRow n={0} label="Message direct" subject="Script de message direct" body={launch.dm} />
        )}
        {launch.partnerEmail && (
          <EmailRow
            n={0}
            label="Partenaire"
            subject="Email d'échange partenaire"
            body={launch.partnerEmail}
          />
        )}
      </Block>

      {(hasSequences || hasLaunch) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            {generatedAt
              ? `Dernière génération le ${new Date(generatedAt).toLocaleDateString("fr-FR")}.`
              : ""}
          </p>
          <Button variant="outline" size="sm" onClick={downloadAll}>
            <Download />
            Tout télécharger
          </Button>
        </div>
      )}

      {templates.length > 0 && <SioTemplatesBlock templates={templates} />}
    </div>
  );

  function downloadAll() {
    if (!assets) return;
    download("ma-campagne-quizing.md", toMarkdown(assets));
  }
}

/**
 * Une des DEUX generations de la page : son titre, ce qu'elle produit,
 * son bouton, et ce qu'elle a deja produit.
 *
 * Le meme composant sert les deux, pour qu'elles se ressemblent
 * exactement : deux blocs qui se ressembleraient "presque" donneraient
 * l'impression que l'un est plus important que l'autre.
 */
function Block({
  icon: Icon,
  title,
  blurb,
  actionLabel,
  onGenerate,
  busy,
  disabled,
  step,
  hint,
  children,
}: {
  icon: typeof Mail;
  title: string;
  blurb: string;
  actionLabel: string;
  onGenerate: () => void;
  busy: boolean;
  disabled: boolean;
  step: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Icon className="size-5 shrink-0 text-primary" />
          {title}
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">{blurb}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onGenerate} disabled={disabled}>
          {busy ? <RefreshCw className="animate-spin" /> : <Sparkles />}
          {busy ? "J'écris..." : actionLabel}
        </Button>
        {busy && (
          <span className="text-sm text-muted-foreground">
            {step || "Je démarre..."} {hint}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}


/** Premiere ligne non vide : sert de titre repliable a un post. */
function firstLine(text: string): string {
  const l = String(text ?? "").split("\n").map((x) => x.trim()).find(Boolean) ?? "";
  return l.length > 80 ? l.slice(0, 79) + "…" : l;
}

/**
 * Un dossier repliable. Ouvert par defaut uniquement pour la premiere
 * sequence : sinon la page redevient le mur qu'elle voulait eviter.
 */
function Folder({
  icon: Icon,
  title,
  count,
  defaultOpen = false,
  children,
}: {
  icon: typeof Mail;
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;
  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <Icon className="size-4 shrink-0 text-primary" />
        <span className="flex-1 font-display text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground">{count}</span>
        <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="flex flex-col gap-2 border-t px-4 py-3">{children}</div>}
    </Card>
  );
}

/**
 * Un email : numerote, replie par defaut, avec sa copie en un clic.
 *
 * Le bouton Copier est DANS l'en-tete, donc accessible sans deplier :
 * quand on colle sa sequence dans Systeme.io, on veut enchainer les
 * copies, pas ouvrir puis refermer chaque email.
 */
function EmailRow({
  n,
  label = "Jour",
  note,
  subject,
  body,
}: {
  n: number;
  label?: string;
  /** Le role de cet email dans la sequence ("Ce qui le retient"). */
  note?: string;
  subject: string;
  body: string;
}) {
  const [open, setOpen] = useState(false);
  const full = `Objet : ${subject}\n\n${body}`;
  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex flex-1 items-center gap-2.5 text-left"
        >
          <span className="inline-flex shrink-0 items-center rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {n > 0 ? `${label} ${n}` : label}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{subject}</span>
            {note && <span className="block truncate text-xs text-muted-foreground">{note}</span>}
          </span>
          <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        <CopyButton text={full} />
      </div>
      {open && (
        <p className="whitespace-pre-wrap border-t px-3 py-3 text-sm text-muted-foreground">{body}</p>
      )}
    </div>
  );
}





function CopyButton({ text }: { text: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          toast.success("Copié.");
        } catch {
          toast.error("Copie impossible.");
        }
      }}
    >
      <Copy />
      Copier
    </Button>
  );
}

/** Le fichier telecharge suit EXACTEMENT les deux blocs de l'ecran. */
function toMarkdown(a: FunnelAssets): string {
  const lines: string[] = ["# Ma campagne L'Atelier du Quiz", ""];
  const emailMd = (e: FunnelEmail) => `**Objet :** ${e.subject}\n\n${e.body}\n`;

  if (a.byResult.length > 0) {
    // Une SECTION par profil, pas un titre repete a chaque email : avec
    // 5 emails par profil, repeter le nom cinq fois de suite rendrait le
    // fichier illisible a coller.
    lines.push("## La séquence post-quiz de chaque profil", "");
    const groups = new Map<string, FunnelResultEmail[]>();
    a.byResult.forEach((e) => {
      const key = (e.result || "Sans profil").trim();
      groups.set(key, [...(groups.get(key) ?? []), e]);
    });
    groups.forEach((emails, profile) => {
      lines.push(`### ${profile}`, "");
      sortSequence(emails).forEach((e, i) => {
        const beat = sequenceBeatTitle(i);
        lines.push(`#### Email ${i + 1}${beat ? ` : ${beat}` : ""}`, emailMd(e), "");
      });
      lines.push("---", "");
    });
  }

  const l = a.launch;
  if (l.posts.length > 0 || l.dm || l.partnerEmail) {
    lines.push("## Mon kit de lancement", "");
    l.posts.forEach((p, i) => lines.push(`### Post ${i + 1}`, p, ""));
    if (l.dm) lines.push("### Script de message direct", l.dm, "");
    if (l.partnerEmail) lines.push("### Email d'échange partenaire", l.partnerEmail, "");
  }
  return lines.join("\n");
}

function IntentionsBlock({
  profiles,
  intentions,
  onChange,
}: {
  profiles: ProfileOption[];
  intentions: IntentionMap;
  onChange: (next: IntentionMap) => void;
}) {
  return (
    <Card className="border-primary/30 bg-surface-soft">
      <CardContent className="flex flex-col gap-3 py-5">
        <div className="flex items-center gap-2">
          <Target className="size-5 text-primary" />
          <h2 className="font-display font-semibold">L&apos;objectif de chaque email</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Par défaut, chaque email suit le bouton (CTA) de ton résultat de quiz. Tu peux imposer une
          intention pour un profil : l&apos;IA écrira l&apos;email dans ce sens.
        </p>
        <div className="flex flex-col gap-2">
          {profiles.map((p) => (
            <div
              key={p.title}
              className="flex flex-col gap-2 rounded-xl border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{p.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {p.hasCta ? "Un CTA est défini sur ce résultat." : "Pas de CTA sur ce résultat."}
                </p>
              </div>
              <select
                value={intentions[p.title] ?? DEFAULT_INTENTION}
                onChange={(e) =>
                  onChange({ ...intentions, [p.title]: e.target.value as FunnelIntention })
                }
                className="h-9 shrink-0 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 sm:w-64"
              >
                {FUNNEL_INTENTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Régénère ta campagne après avoir changé une intention pour l&apos;appliquer.
        </p>
      </CardContent>
    </Card>
  );
}

function SioTemplatesBlock({ templates }: { templates: SioTemplate[] }) {
  return (
    <Card className="border-primary/30 bg-surface-soft">
      <CardContent className="flex flex-col gap-3 py-5">
        <div className="flex items-center gap-2">
          <Boxes className="size-5 text-primary" />
          <h2 className="font-display font-semibold">Modèles à importer en 1 clic</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Des modèles Systeme.io prêts à l&apos;emploi (séquences, tunnels). Clique, importe sur ton
          compte, puis personnalise avec les textes générés ci-dessous.
        </p>
        <div className="flex flex-col gap-2">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.label}</p>
                {t.description && (
                  <p className="truncate text-xs text-muted-foreground">{t.description}</p>
                )}
              </div>
              <Button asChild size="sm">
                <a href={t.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink />
                  Importer
                </a>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
