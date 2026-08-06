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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Copy,
  Download,
  FileText,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BonusDocument } from "@/components/BonusDocument";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { failureCopy } from "@/lib/aiFailure";
import { hasStructure, parseBonusDoc } from "@/lib/bonus/document";
import { editorHtmlToMarkdown, markdownToEditorHtml } from "@/lib/bonus/markdownHtml";
import {
  analyzeOfferCoverage,
  hasOfferPerProfile,
  isPerProfile,
  type BonusOffer,
  type BonusPlan,
} from "@/lib/bonus/offers";
import { buildPrintableHtml } from "@/lib/bonus/printable";
import {
  projectProgress,
  type BonusProjectSummary,
} from "@/lib/bonus/project";
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
  /** Une seule offre dans le cas courant, plusieurs pour un quiz qui
   *  oriente vers l'offre adaptee (Monique, 5 aout 2026). */
  offers: BonusOffer[];
  trigger: "completion" | "share";
  plan: BonusPlan;
};

const OFFRE_VIDE: BonusOffer = {
  promise: "",
  kind: "formation en ligne",
  price: "",
  profileIndexes: [],
};

// `library` est le PREMIER ecran des qu'un bonus existe : Bene, 6 aout
// 2026, "on ne peut pas retrouver ce qu'on a cree ?". Un eleve qui
// revient doit tomber sur ce qu'il a fait, pas sur un formulaire vide.
type Step = "library" | "brief" | "pistes" | "produce";

/**
 * Le nombre de pistes au delà duquel on n'en propose plus.
 *
 * Trois au départ, trois de plus au maximum. Au delà, une liste ne fait
 * plus choisir : elle paralyse, et chaque clic supplémentaire coûte une
 * génération.
 */
const MAX_PISTES = 6;

/**
 * Les trois dossiers de l'écran de production.
 *
 * Même mécanique que "Mes projets" dans Tiquiz : `"folders"` affiche la
 * grille de cartes, un clic ouvre la catégorie, la flèche remonte. Béné
 * l'a demandée nommément, et c'est la bonne : trois documents longs
 * empilés sur une page, on ne voit plus où l'un finit.
 */
type Folder = "folders" | ProductionBlock;

const FOLDERS: Record<
  ProductionBlock,
  { icon: typeof BookOpen; fg: string; bg: string; hint: string; empty: string }
> = {
  guide: {
    icon: BookOpen,
    fg: "text-indigo-600 dark:text-indigo-300",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    hint: "Pour toi : ce que tu produis, avec quel outil, et comment il arrive chez ton visiteur.",
    empty: "Rien ici pour l'instant. Génère ton guide de création.",
  },
  content: {
    icon: FileText,
    fg: "text-violet-600 dark:text-violet-300",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    hint: "Pour ton visiteur : le texte du bonus lui-même, prêt à mettre en page.",
    empty: "Rien ici pour l'instant. Génère le contenu de ton bonus.",
  },
  presentation: {
    icon: Megaphone,
    fg: "text-amber-600 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    // La page de résultat n'est plus citée : elle mène déjà à l'offre,
    // et le bonus part par email (retour Béné, 5 août 2026).
    hint: "Titre, punchline et 5 puces promesses pour annoncer le bonus dans ta campagne et tes posts, plus l'email qui le livre.",
    empty: "Rien ici pour l'instant. Génère de quoi parler de ton bonus.",
  },
};

export function BonusLabClient({
  quizTitle,
  profiles,
  viralityEnabled,
  initialProjects,
}: {
  quizTitle: string | null;
  profiles: string[];
  viralityEnabled: boolean;
  /** Ce qu'il a deja cree, charge cote serveur pour eviter le clignotement. */
  initialProjects: BonusProjectSummary[];
}) {
  const [projects, setProjects] = useState<BonusProjectSummary[]>(initialProjects);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<BonusProjectSummary | null>(null);
  // Un premier venu n'a rien a retrouver : on ne lui montre pas une
  // etagere vide, on l'emmene directement au formulaire.
  const [step, setStep] = useState<Step>(initialProjects.length > 0 ? "library" : "brief");
  const [brief, setBrief] = useState<Brief>({
    offers: [{ ...OFFRE_VIDE }],
    trigger: "completion",
    // Un quiz a profils multiples gagne presque toujours a decliner son
    // bonus : c'est le defaut, elle peut simplifier en un clic.
    plan: profiles.length > 1 ? "per_profile" : "shared",
  });
  const [pistes, setPistes] = useState<Piste[]>([]);
  const [recommended, setRecommended] = useState(0);
  const [recommendedWhy, setRecommendedWhy] = useState("");
  const [chosen, setChosen] = useState<number | null>(null);
  const [profileIndex, setProfileIndex] = useState(0);
  const [blocks, setBlocks] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // Trois dossiers, un seul ouvert a la fois (cf. l'ecran 3 plus bas).
  const [folder, setFolder] = useState<Folder>("folders");

  const perResult = isPerProfile(brief.plan) && profiles.length > 0;
  // Chaque profil a-t-il exactement une offre ? On previent AVANT de
  // produire : un bonus ecrit pour un profil qui ne mene nulle part fait
  // travailler la creatrice pour rien.
  const coverage = useMemo(
    () => analyzeOfferCoverage(brief.plan, brief.offers, profiles.length),
    [brief.plan, brief.offers, profiles.length],
  );

  function setOffer(i: number, patch: Partial<BonusOffer>) {
    setBrief((b) => ({
      ...b,
      offers: b.offers.map((o, j) => (j === i ? { ...o, ...patch } : o)),
    }));
  }
  function addOffer() {
    setBrief((b) => ({ ...b, offers: [...b.offers, { ...OFFRE_VIDE }] }));
  }
  function removeOffer(i: number) {
    setBrief((b) => ({
      ...b,
      offers: b.offers.length > 1 ? b.offers.filter((_, j) => j !== i) : b.offers,
    }));
  }
  function toggleOfferProfile(i: number, p: number) {
    setBrief((b) => ({
      ...b,
      offers: b.offers.map((o, j) => {
        // Un profil n'appartient qu'a UNE offre : le cocher ailleurs le
        // retire d'ou il etait. Sans ca, on fabrique l'ambiguite qu'on
        // vient de rendre bloquante.
        const has = o.profileIndexes.includes(p);
        if (j === i) {
          return {
            ...o,
            profileIndexes: has
              ? o.profileIndexes.filter((x) => x !== p)
              : [...o.profileIndexes, p].sort((a, c) => a - c),
          };
        }
        return { ...o, profileIndexes: o.profileIndexes.filter((x) => x !== p) };
      }),
    }));
  }
  // Un bonus décliné a un contenu PAR profil : on garde les versions
  // séparément, sinon générer le deuxième effacerait le premier.
  const contentKey = useMemo(
    () => (perResult ? `content:${profileIndex}` : "content"),
    [perResult, profileIndex],
  );
  const keyFor = (b: ProductionBlock) => (b === "content" ? contentKey : b);

  /**
   * Ce que la carte du dossier annonce, sans l'ouvrir.
   *
   * Une carte qui ne dit pas où on en est oblige à entrer dans les trois
   * pour le savoir, ce qui est exactement le scroll qu'on vient de
   * supprimer. Le contenu décliné compte ses profils : c'est le seul
   * dossier qui peut être à moitié fait.
   */
  function folderStatus(b: ProductionBlock): string {
    if (b === "content" && perResult) {
      const done = profiles.filter((_, i) => blocks[`content:${i}`]).length;
      if (done === 0) return "À générer";
      return done === profiles.length
        ? `Les ${profiles.length} profils sont écrits`
        : `${done} profil${done > 1 ? "s" : ""} sur ${profiles.length} écrit${done > 1 ? "s" : ""}`;
    }
    return blocks[keyFor(b)] ? "Prêt" : "À générer";
  }

  // ── L'ENREGISTREMENT, SANS QUE PERSONNE N'Y PENSE ──────────────
  //
  // Pas de bouton "Enregistrer". Un eleve qui vient d'attendre une
  // generation ne doit pas avoir a penser a la garder : s'il fallait y
  // penser, on recreerait le probleme pour tous ceux qui n'y pensent
  // pas, c'est a dire exactement ceux qui viennent de le vivre.
  //
  // Et un echec d'enregistrement ne fait JAMAIS echouer une generation :
  // perdre la sauvegarde est ennuyeux, perdre le document parce que la
  // sauvegarde a rate serait absurde.
  //
  // `latest` porte l'etat au moment de l'appel : `save()` est declenche
  // juste apres un `setState`, dont la valeur n'est pas encore lisible.
  const stateRef = useRef({ brief, pistes, chosen, blocks, projectId });
  stateRef.current = { brief, pistes, chosen, blocks, projectId };

  const inFlight = useRef<Promise<void> | null>(null);

  const doSave = useCallback(
    async (patch: Partial<typeof stateRef.current> = {}) => {
      const st = { ...stateRef.current, ...patch };
      const piste = st.chosen === null ? null : st.pistes[st.chosen];
      try {
        const res = await fetch("/api/me/bonus/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: st.projectId,
            quizTitle,
            brief: st.brief,
            pistes: st.pistes,
            chosen: piste
              ? {
                  index: st.chosen,
                  format: piste.format,
                  title: piste.title,
                  punchline: piste.punchline,
                }
              : null,
            blocks: st.blocks,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (data?.ok && typeof data.id === "string") {
          setProjectId(data.id);
          stateRef.current.projectId = data.id;
        }
      } catch {
        // Silencieux et sans consequence : cf. le commentaire ci-dessus.
      }
    },
    [quizTitle],
  );

  const save = useCallback(
    async (patch: Partial<typeof stateRef.current> = {}) => {
      // On attend l'enregistrement precedent : deux appels concurrents
      // partis avant que le premier ait rendu son id creeraient DEUX
      // lignes pour le meme bonus.
      const precedent = inFlight.current;
      const travail = (async () => {
        if (precedent) await precedent.catch(() => undefined);
        await doSave(patch);
      })();
      inFlight.current = travail;
      await travail;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quizTitle],
  );

  // LES CORRECTIONS A LA MAIN SONT ENREGISTREES AUSSI.
  //
  // L'editeur emet a chaque frappe : enregistrer a chaque frappe serait
  // une requete par lettre. On attend que ca se calme. Sans ca, un eleve
  // qui relit et corrige son document pendant dix minutes, puis ferme
  // l'onglet, perdrait ses corrections tout en croyant que tout est
  // enregistre, ce qui est pire que pas d'enregistrement du tout.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (chosen === null && pistes.length === 0) return;
    const t = setTimeout(() => void save(), 1500);
    return () => clearTimeout(t);
  }, [blocks, chosen, save, pistes.length]);

  // La liste se rafraichit quand on revient dessus, pour que le titre et
  // l'avancement suivent ce qui vient d'etre genere.
  const refreshProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/me/bonus/projects");
      const data = await res.json().catch(() => ({}));
      if (data?.ok && Array.isArray(data.projects)) setProjects(data.projects);
    } catch {
      // On garde la liste affichee : mieux vaut une liste d'il y a une
      // minute qu'un ecran vide.
    }
  }, []);

  useEffect(() => {
    if (step === "library") void refreshProjects();
  }, [step, refreshProjects]);

  /** Repartir a zero, sans toucher a ce qui est deja enregistre. */
  function startNew() {
    setProjectId(null);
    setBrief({
      offers: [{ ...OFFRE_VIDE }],
      trigger: "completion",
      plan: profiles.length > 1 ? "per_profile" : "shared",
    });
    setPistes([]);
    setChosen(null);
    setBlocks({});
    setFolder("folders");
    setStep("brief");
  }

  /** Rouvrir un bonus : on remet l'ecran exactement ou il l'avait laisse. */
  async function openProject(id: string) {
    setOpening(id);
    try {
      const res = await fetch(`/api/me/bonus/projects?id=${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => ({}));
      if (!data?.ok || !data.project) {
        toast.error("Ce bonus n'a pas pu être ouvert. Réessaie dans un instant.");
        return;
      }
      const p = data.project;
      setProjectId(p.id);
      setBrief({
        offers: p.brief?.offers?.length ? p.brief.offers : [{ ...OFFRE_VIDE }],
        trigger: p.brief?.trigger === "share" ? "share" : "completion",
        plan: p.brief?.plan ?? "shared",
      });
      setPistes(Array.isArray(p.pistes) ? p.pistes : []);
      setChosen(typeof p.chosen?.index === "number" ? p.chosen.index : null);
      setBlocks(p.blocks ?? {});
      setProfileIndex(0);
      setFolder("folders");
      // Une piste retenue veut dire qu'il en etait a la production :
      // le renvoyer choisir sa piste lui ferait refaire un pas en
      // arriere sans raison.
      setStep(typeof p.chosen?.index === "number" ? "produce" : "pistes");
    } catch {
      toast.error("Ce bonus n'a pas pu être ouvert. Réessaie dans un instant.");
    } finally {
      setOpening(null);
    }
  }

  async function deleteProject(id: string) {
    try {
      const res = await fetch(`/api/me/bonus/projects?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      // Un `ok: false` produit TOUJOURS quelque chose a l'ecran : un
      // echec silencieux envoie chercher au mauvais endroit (drame du
      // 3 aout sur la suppression de projet).
      if (!data?.ok) {
        toast.error("La suppression n'a pas abouti. Réessaie dans un instant.");
        return;
      }
      setProjects((l) => l.filter((p) => p.id !== id));
      if (projectId === id) setProjectId(null);
      toast.success("Bonus supprimé.");
    } catch {
      toast.error("La suppression n'a pas abouti. Réessaie dans un instant.");
    } finally {
      setToDelete(null);
    }
  }

  async function call(body: Record<string, unknown>) {
    const res = await fetch("/api/me/bonus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json().catch(() => ({}));
  }

  async function askPistes() {
    if (brief.offers.some((o) => o.promise.trim().length < 10)) {
      toast.error("Décris chaque offre en une phrase pour que je puisse viser juste.");
      return;
    }
    if (!coverage.ok) {
      toast.error(failureCopy("offer_coverage"));
      return;
    }
    setBusy("pistes");
    try {
      const data = await call({ step: "pistes", brief });
      if (!data?.ok) {
        toast.error(failureCopy(String(data?.reason ?? "")));
        return;
      }
      const nouvelles = data.pistes as Piste[];
      setPistes(nouvelles);
      setRecommended(Number(data.recommended) || 0);
      setRecommendedWhy(String(data.recommendedWhy ?? ""));
      setChosen(null);
      setBlocks({});
      setStep("pistes");
      // Des pistes obtenues, c'est du travail : a partir d'ici, un
      // rafraichissement d'onglet ne perd plus rien.
      void save({ pistes: nouvelles, chosen: null, blocks: {} });
    } catch {
      toast.error("La génération n'a pas abouti. Réessaie dans un instant.");
    } finally {
      setBusy(null);
    }
  }

  /**
   * UNE PISTE DE PLUS, sur clic seulement.
   *
   * Béné, 6 août 2026 : "au cas où l'élève n'est pas convaincu par les
   * propositions. À générer UNIQUEMENT si l'user clique sur le bouton,
   * limiter la conso de token."
   *
   * Trois choses la limitent, et pas seulement le clic : le serveur rend
   * UNE piste (pas trois), on lui envoie ce qui est déjà affiché pour ne
   * pas payer un doublon, et le bouton disparaît au delà de MAX_PISTES.
   * Sans ce plafond, un clic répété devient une dépense sans fin, et une
   * liste de quinze pistes ne fait pas choisir : elle paralyse.
   */
  async function askOneMore() {
    if (pistes.length >= MAX_PISTES) return;
    setBusy("more");
    try {
      const data = await call({
        step: "more",
        brief,
        known: pistes.map((p) => ({ format: p.format, title: p.title })),
      });
      if (!data?.ok || !data.piste) {
        toast.error(failureCopy(String(data?.reason ?? "")));
        return;
      }
      const suivantes = [...pistes, data.piste as Piste];
      setPistes(suivantes);
      void save({ pistes: suivantes });
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
      const suivants = { ...blocks, [key]: String(data.markdown ?? "") };
      setBlocks(suivants);
      void save({ blocks: suivants });
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

  // ── Écran 0 : ce qu'il a déjà créé ──
  //
  // Béné, 6 août 2026 : "on ne peut pas retrouver ce qu'on a créé ? On
  // peut faire en sorte que l'étudiant puisse retrouver ce qu'il a créé
  // directement ? En plus du générateur actuel pour en générer
  // d'autres." Les deux comptent : la liste, ET le bouton qui en relance
  // un neuf sans quitter l'écran.
  if (step === "library") {
    return (
      <Shell
        title="Tes bonus"
        subtitle="Ils sont enregistrés au fur et à mesure. Rouvre-en un pour le relire, le corriger ou l'exporter, ou lance-en un nouveau."
      >
        <Button className="w-fit gap-2" onClick={startNew}>
          <Plus className="size-4" />
          Créer un nouveau bonus
        </Button>

        <div className="grid items-start gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex flex-col gap-3 py-5">
                <div className="flex flex-col gap-1">
                  <p className="font-medium leading-snug">{p.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {[p.format, p.quizTitle ? `Quiz : ${p.quizTitle}` : null]
                      .filter(Boolean)
                      .join(" . ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Modifié le {formatDate(p.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1.5"
                    disabled={opening === p.id}
                    onClick={() => void openProject(p.id)}
                  >
                    {opening === p.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <BookOpen className="size-4" />
                    )}
                    Ouvrir
                  </Button>
                  <button
                    type="button"
                    onClick={() => setToDelete(p)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                    aria-label={`Supprimer ${p.title}`}
                  >
                    <Trash2 className="size-3.5" />
                    Supprimer
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* La confirmation est en clair : une suppression sans retour en
            arriere doit nommer ce qu'elle emporte. */}
        {toDelete && (
          <Card className="border-destructive/40">
            <CardContent className="flex flex-col gap-3 py-5">
              <p className="text-sm">
                Supprimer <strong>{toDelete.title}</strong> ? Le brief, les pistes et les
                documents générés partent avec. C'est définitif.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => void deleteProject(toDelete.id)}
                >
                  Supprimer définitivement
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setToDelete(null)}>
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </Shell>
    );
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
        onBack={projects.length > 0 ? () => setStep("library") : undefined}
        backLabel="Tes bonus"
      >
        <Card>
          <CardContent className="flex flex-col gap-5 py-5">
            {/* LE PLAN D'ABORD (Béné, 5 août 2026) : "c'est ce que
                reçoit chaque profil qui doit aller en premier, avant les
                offres, c'est plus logique". Et ça règle une dépendance :
                ce choix décide si les pastilles de profils existent dans
                les cartes d'offre. Posé avant, elles apparaissent APRÈS
                lui, donc dans le sens de lecture. */}
            <Choice
              label="Ce que reçoit chaque profil"
              value={brief.plan}
              onChange={(v) => setBrief((b) => ({ ...b, plan: v as BonusPlan }))}
              options={[
                {
                  value: "shared",
                  title: "Le même bonus, la même offre",
                  hint: "Le plus simple à produire et à livrer.",
                },
                {
                  value: "per_profile",
                  title: "Un bonus par profil, une seule offre",
                  hint:
                    profiles.length > 0
                      ? `Chacun reçoit un texte qui parle de lui, et tous mènent à la même offre. ${profiles.length} profils sur ton quiz.`
                      : "Ton quiz n'a pas encore de profils de résultat.",
                },
                {
                  value: "per_profile_offer",
                  title: "Un bonus par profil, son offre à lui",
                  hint: "Ton quiz sert à orienter vers l'offre adaptée : chaque bonus ramène vers celle de son profil.",
                },
              ]}
            />

            {/* LES OFFRES (Monique, 5 aout 2026) : "je n'ai pas une offre
                a proposer, mais 3, chaque profil mene vers une offre
                differente". Une ligne par offre, et on dit a qui elle
                s'adresse quand il y en a plusieurs. */}
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-sm font-medium">Ton offre payante</p>
                <p className="text-xs text-muted-foreground">
                  {hasOfferPerProfile(brief.plan)
                    ? "Une ligne par offre, et pour chacune les profils qu'elle sert."
                    : "C'est vers elle que ton bonus doit ramener."}
                </p>
              </div>

              {brief.offers.map((offre, i) => (
                <Card key={i}>
                  <CardContent className="flex flex-col gap-3 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Offre {i + 1}
                      </span>
                      {brief.offers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOffer(i)}
                          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                        >
                          Retirer
                        </button>
                      )}
                    </div>

                    <textarea
                      rows={2}
                      value={offre.promise}
                      onChange={(e) => setOffer(i, { promise: e.target.value })}
                      placeholder="J'aide les personnes TDAH à apaiser leur stress quotidien en 1 mois grâce à des techniques simples et méconnues"
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      aria-label={`Promesse de l'offre ${i + 1}`}
                    />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <select
                        value={offre.kind}
                        onChange={(e) => setOffer(i, { kind: e.target.value as OfferKind })}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                        aria-label={`Format de l'offre ${i + 1}`}
                      >
                        {OFFER_KINDS.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                      <input
                        value={offre.price}
                        onChange={(e) => setOffer(i, { price: e.target.value })}
                        placeholder="97 euros, ou sur devis"
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                        aria-label={`Prix de l'offre ${i + 1}`}
                      />
                    </div>

                    {/* Les profils servis par CETTE offre. Visible
                        uniquement quand chaque profil a la sienne :
                        ailleurs, une seule offre s'adresse a tout le
                        monde et la question n'a pas de sens. */}
                    {hasOfferPerProfile(brief.plan) && profiles.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <p className="text-xs font-medium">Pour quels profils de résultat ?</p>
                        <div className="flex flex-wrap gap-1.5">
                          {profiles.map((p, pi) => {
                            const actif = offre.profileIndexes.includes(pi);
                            return (
                              <button
                                key={pi}
                                type="button"
                                onClick={() => toggleOfferProfile(i, pi)}
                                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                                  actif
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border text-muted-foreground hover:border-primary/40"
                                }`}
                              >
                                {p}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {hasOfferPerProfile(brief.plan) && (
                <Button variant="outline" size="sm" className="w-fit" onClick={addOffer}>
                  <Plus className="size-4" />
                  Ajouter une offre
                </Button>
              )}

              {/* On NOMME les profils concernes : "il manque une offre"
                  oblige a comparer soi-meme pour savoir lesquels. */}
              {!coverage.ok && (
                <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                  {coverage.missing.length > 0 && (
                    <>
                      Sans offre :{" "}
                      <strong>{coverage.missing.map((i) => profiles[i]).join(", ")}</strong>.{" "}
                    </>
                  )}
                  {coverage.duplicated.length > 0 && (
                    <>
                      Dans deux offres à la fois :{" "}
                      <strong>{coverage.duplicated.map((i) => profiles[i]).join(", ")}</strong>.{" "}
                    </>
                  )}
                  Chaque profil doit être relié à une offre, et à une seule.
                </p>
              )}
            </div>

            <Choice
              label="Quand vas-tu envoyer ce bonus ?"
              value={brief.trigger}
              onChange={(v) => setBrief((b) => ({ ...b, trigger: v as Brief["trigger"] }))}
              options={[
                {
                  value: "completion",
                  title: "Pour un quiz complété",
                  hint: "Il découvre son résultat, le bonus est la suite logique.",
                },
                {
                  value: "share",
                  title: "Pour un partage",
                  hint: viralityEnabled
                    ? "Il partage ton quiz, le bonus est sa récompense."
                    : "L'étape de partage n'est pas encore activée sur ton quiz.",
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
                    setFolder("folders");
                    setStep("produce");
                  }}
                >
                  Je prends celle-ci
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* AUCUNE NE TE CONVAINC ? (Béné, 6 août 2026)
            Le bouton dit ce qu'il coûte et ce qu'il rend : une idée, pas
            une nouvelle fournée. Sans ça, on cliquerait en craignant de
            perdre les trois qui sont à l'écran. */}
        {pistes.length < MAX_PISTES && (
          <div className="flex flex-col items-start gap-1.5">
            <Button
              variant="secondary"
              className="gap-2"
              disabled={busy !== null}
              onClick={askOneMore}
            >
              {busy === "more" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Aucune ne me convainc, propose-m'en une autre
            </Button>
            <p className="text-xs text-muted-foreground">
              Une idée de plus, dans un format différent. Celles du dessus restent.
            </p>
          </div>
        )}
      </Shell>
    );
  }

  // ── Écran 3 : les trois dossiers ──
  //
  // "Ces 3 blocs qui s'enchainent ça fait beaucoup scroller, on voit mal
  // la limite entre chacun. On peut faire 3 dossiers comme les dossiers
  // quiz / sondages de Tiquiz ?" (Béné, 5 août 2026). Oui, et c'est le
  // même mécanisme : une grille de cartes-catégories, un clic ouvre la
  // catégorie, une flèche remonte. Un seul contenu long à l'écran à la
  // fois, donc plus de frontière à deviner.
  const piste = chosen !== null ? pistes[chosen] : null;

  if (folder === "folders") {
    return (
      <Shell
        title={piste?.title ?? "Ton bonus"}
        subtitle={[piste?.punchline, projectProgress(blocks, profiles.length, perResult)]
          .filter(Boolean)
          .join(" . ")}
        onBack={() => setStep("pistes")}
      >
        <div className="grid items-start gap-4 sm:grid-cols-3">
          {PRODUCTION_BLOCKS.map((block) => {
            const f = FOLDERS[block];
            const Icon = f.icon;
            return (
              <button
                key={block}
                type="button"
                onClick={() => setFolder(block)}
                className="flex h-full flex-col gap-3 rounded-xl border border-border bg-background p-5 text-left transition-colors hover:border-primary/50"
              >
                <span className={`flex size-11 items-center justify-center rounded-xl ${f.bg}`}>
                  <Icon className={`size-5 ${f.fg}`} />
                </span>
                <span className="font-display font-semibold leading-snug">
                  {BLOCK_LABEL[block]}
                </span>
                <span className="text-sm text-muted-foreground">{f.hint}</span>
                <span className="mt-auto pt-1 text-xs font-medium text-muted-foreground">
                  {folderStatus(block)}
                </span>
              </button>
            );
          })}
        </div>
      </Shell>
    );
  }

  // ── Écran 3 bis : le contenu d'un dossier ──
  const block = folder;
  const key = keyFor(block);
  const value = blocks[key];
  const isEditing = editing === key;

  return (
    <Shell
      title={BLOCK_LABEL[block]}
      subtitle={FOLDERS[block].hint}
      onBack={() => setFolder("folders")}
      backLabel="Retour aux dossiers"
    >
      {/* Le sélecteur de profil ne concerne que le contenu : c'est le
          seul bloc qui s'écrit une fois par profil. */}
      {perResult && block === "content" && (
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

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={value ? "outline" : "default"}
          onClick={() => produce(block)}
          disabled={busy !== null}
        >
          {busy === key ? <Loader2 className="animate-spin" /> : <Wand2 />}
          {value ? "Refaire" : "Générer"}
        </Button>
        {value && (
          <>
            <Button size="sm" variant="ghost" onClick={() => setEditing(isEditing ? null : key)}>
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
      </div>

      {/* UN TEXTE GENERE EST UN BROUILLON, PAS UN LIVRABLE : elle
          corrige sur place, et l'export reprend sa version.
          "On tombe sur le markdown au lieu d'un bel editeur alors qu'on
          l'a partout cet editeur" (Bene, 5 aout 2026). C'est le MEME
          editeur que l'admin des jours. Le document reste stocke en
          markdown, `lib/bonus/markdownHtml.ts` fait le pont : le rendu et
          le PDF ne changent pas d'un pixel. */}
      {value && isEditing && (
        <RichTextEditor
          key={key}
          value={markdownToEditorHtml(value)}
          onChange={(html) => setBlocks((b) => ({ ...b, [key]: editorHtmlToMarkdown(html) }))}
          figures={false}
        />
      )}
      {value && !isEditing && <Rendered markdown={value} />}
      {!value && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {FOLDERS[block].empty}
          </CardContent>
        </Card>
      )}
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
/** "6 août 2026", en français, sans dépendance de date. */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function Shell({
  title,
  subtitle,
  onBack,
  backLabel = "Retour",
  children,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
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
            {backLabel}
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
      <div
        className={`grid gap-2 ${options.length > 2 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
      >
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
