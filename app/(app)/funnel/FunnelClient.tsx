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

  const [busy, setBusy] = useState(false);
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

  const intentionsBlock =
    profiles.length > 0 ? (
      <IntentionsBlock profiles={profiles} intentions={intentions} onChange={saveIntentions} />
    ) : null;

  async function generate() {
    setBusy(true);
    try {
      const res = await fetch("/api/me/funnel", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.assets) throw new Error("gen failed");
      setAssets(json.assets as FunnelAssets);
      toast.success("Ta campagne est prête.");
      router.refresh();
    } catch {
      toast.error("Génération impossible pour le moment. Réessaie dans un instant.");
    } finally {
      setBusy(false);
    }
  }

  function downloadAll() {
    if (!assets) return;
    download("ma-campagne-quizing.md", toMarkdown(assets));
  }

  const templatesBlock = templates.length > 0 ? <SioTemplatesBlock templates={templates} /> : null;

  if (!assets) {
    return (
      <div className="flex flex-col gap-6">
        {templatesBlock}
        {intentionsBlock}
        <Card>
        <CardContent className="flex flex-col items-start gap-4 py-8">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Megaphone className="size-6" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-lg font-semibold">Génère ta campagne complète</h2>
            <p className="text-sm text-muted-foreground">
              À partir de ton carnet et de ton métier, on t&apos;écrit ta séquence de bienvenue, une
              séquence complète de 5 emails pour chaque profil de résultat, ta séquence de vente
              douce et ton kit de lancement (posts, DM, email partenaire). Plus ton carnet est rempli, meilleure est la campagne.
            </p>
          </div>
          <Button size="lg" onClick={generate} disabled={busy}>
            <Sparkles />
            {busy ? "Je rédige ta campagne..." : "Générer ma campagne"}
          </Button>
        </CardContent>
        </Card>
      </div>
    );
  }

  // Regroupement PAR PROFIL : chaque profil de resultat recoit son
  // dossier, contenant sa SEQUENCE COMPLETE. Un profil sans email
  // n'apparait pas plutot que d'afficher un dossier vide.
  //
  // Le tri suit `step` (le rang dans la sequence), pas l'ordre de la
  // reponse, et il vit dans `sortSequence` : la meme fonction sert au
  // fichier telecharge, sinon l'ecran et le .md finiraient par ne plus
  // raconter la meme sequence.
  const byProfile = (() => {
    const map = new Map<string, FunnelResultEmail[]>();
    for (const e of assets.byResult) {
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
  const launchCount =
    assets.launch.posts.length +
    (assets.launch.dm ? 1 : 0) +
    (assets.launch.partnerEmail ? 1 : 0);
  const isEmpty =
    assets.welcome.length === 0 &&
    assets.byResult.length === 0 &&
    assets.sales.length === 0 &&
    launchCount === 0;

  return (
    <div className="flex flex-col gap-6">
      {templatesBlock}
      {intentionsBlock}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {generatedAt ? `Générée le ${new Date(generatedAt).toLocaleDateString("fr-FR")}.` : ""} Tu
          peux la régénérer après avoir avancé dans ton carnet.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadAll}>
            <Download />
            Tout télécharger
          </Button>
          <Button variant="ghost" size="sm" onClick={generate} disabled={busy}>
            <RefreshCw className={busy ? "animate-spin" : undefined} />
            {busy ? "..." : "Régénérer"}
          </Button>
        </div>
      </div>

      {/* DES DOSSIERS, PAS UN MUR (retour Bene, 3 aout 2026 : "elle doit
          etre bien presentee : par profil, chaque profil a un dossier qui
          contient les emails ; par jour, numeroter les emails, quand on
          clique dessus ca developpe l'email a copier en un clic").
          Plus de branche `raw` : afficher du JSON brut, c'etait montrer
          notre panne a la creatrice et lui demander de la demeler. */}
      {isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm font-medium">La génération n&apos;a pas abouti.</p>
            <p className="text-sm text-muted-foreground">
              Ça arrive quand la réponse est trop longue. Relance, ça repart en général du
              premier coup.
            </p>
            <Button onClick={generate} disabled={busy}>
              <RefreshCw className="mr-2 size-4" />
              Relancer la génération
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Folder icon={Mail} title="Séquence de bienvenue" count={assets.welcome.length} defaultOpen>
            {assets.welcome.map((e, i) => (
              <EmailRow key={i} n={i + 1} subject={e.subject} body={e.body} />
            ))}
          </Folder>

          {/* UN DOSSIER PAR PROFIL, CONTENANT SA SEQUENCE COMPLETE.
              Chaque email porte son numero ET le role qu'il joue, lu
              depuis lib/funnelSequence : les cinq titres ne sont jamais
              retapes ici, sinon l'ecran finirait par annoncer un temps
              que le prompt ne demande plus. */}
          <section className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Users className="size-4" />
              La séquence de chaque profil de résultat
            </h2>
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
          </section>

          <Folder icon={Mail} title="Séquence de vente douce" count={assets.sales.length}>
            {assets.sales.map((e, i) => (
              <EmailRow key={i} n={i + 1} subject={e.subject} body={e.body} />
            ))}
          </Folder>

          <Folder icon={Megaphone} title="Kit de lancement" count={launchCount}>
            {assets.launch.posts.map((p, i) => (
              <EmailRow key={`p${i}`} n={i + 1} label="Post" subject={firstLine(p)} body={p} />
            ))}
            {assets.launch.dm && (
              <EmailRow n={0} label="Message direct" subject="Script de message direct" body={assets.launch.dm} />
            )}
            {assets.launch.partnerEmail && (
              <EmailRow n={0} label="Partenaire" subject="Email d'échange partenaire" body={assets.launch.partnerEmail} />
            )}
          </Folder>
        </>
      )}
    </div>
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

function toMarkdown(a: FunnelAssets): string {
  if (a.raw) return `# Ma campagne L'Atelier du Quiz\n\n${a.raw}\n`;
  const lines: string[] = ["# Ma campagne L'Atelier du Quiz", ""];
  const emailMd = (e: FunnelEmail) => `**Objet :** ${e.subject}\n\n${e.body}\n`;
  lines.push("## Séquence de bienvenue", "");
  a.welcome.forEach((e) => lines.push(emailMd(e), "---", ""));
  // Une SECTION par profil, pas un titre repete a chaque email : depuis
  // que la sequence fait 5 emails, repeter le nom du profil cinq fois de
  // suite rendrait le fichier illisible a coller.
  lines.push("## La séquence de chaque profil de résultat", "");
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
  lines.push("## Séquence de vente douce", "");
  a.sales.forEach((e) => lines.push(emailMd(e), "---", ""));
  lines.push("## Kit de lancement", "");
  a.launch.posts.forEach((p, i) => lines.push(`### Post ${i + 1}`, p, ""));
  if (a.launch.dm) lines.push("### Script de message direct", a.launch.dm, "");
  if (a.launch.partnerEmail) lines.push("### Email d'échange partenaire", a.launch.partnerEmail, "");
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
