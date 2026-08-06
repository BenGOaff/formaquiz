// app/api/me/bonus/projects/route.ts
//
// LES BONUS ENREGISTRÉS : la liste, la sauvegarde, la suppression.
//
// Béné, 6 août 2026 : "le générateur de bonus est top MAIS on ne peut pas
// retrouver ce qu'on a créé ?"
//
// Rien n'était enregistré du tout. Le brief, les pistes et les trois
// documents vivaient dans la mémoire de la page : rafraîchir l'onglet ou
// suivre un lien effaçait plusieurs minutes de génération, sans un mot.
//
// -- LA SAUVEGARDE EST AUTOMATIQUE ------------------------------------
//
// Pas de bouton "Enregistrer". Un élève qui vient de générer un document
// ne doit pas avoir à penser à le garder : s'il fallait y penser, on
// recréerait le problème pour tous ceux qui n'y pensent pas, c'est à
// dire exactement ceux qui viennent de le vivre.
//
// -- ET ELLE NE DOIT JAMAIS FAIRE ÉCHOUER UNE GÉNÉRATION --------------
//
// L'écran appelle cette route APRÈS avoir affiché le résultat, et ignore
// l'échec. Perdre la sauvegarde est ennuyeux ; perdre le document parce
// que la sauvegarde a échoué serait absurde.

import { NextRequest, NextResponse } from "next/server";

import { getViewer } from "@/lib/parcours";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import {
  projectTitle,
  sanitizeProject,
  worthSaving,
  type BonusProjectSummary,
} from "@/lib/bonus/project";

export const dynamic = "force-dynamic";

/** Au delà, la liste devient elle-même le problème. */
const MAX_PROJECTS = 60;

/** Les colonnes de la LISTE : tout sauf `blocks`, qui pèse le plus. */
const LIST_COLUMNS = "id, title, quiz_title, chosen, updated_at";

type Row = {
  id: string;
  title: string | null;
  quiz_title: string | null;
  chosen: { format?: string | null } | null;
  updated_at: string;
};

function toSummary(r: Row): BonusProjectSummary {
  return {
    id: r.id,
    title: r.title || "Bonus sans titre",
    quizTitle: r.quiz_title,
    format: r.chosen?.format ?? null,
    updatedAt: r.updated_at,
  };
}

/**
 * GET sans `id` : la liste. GET avec `id` : le bonus complet.
 *
 * La liste ne charge PAS les documents : trois documents markdown par
 * bonus, multipliés par le nombre de bonus, c'est plusieurs centaines de
 * kilo-octets pour afficher des titres.
 */
export async function GET(req: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });

  const supabase = await getSupabaseServerClient();
  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    const { data, error } = await supabase
      .from("bonus_projects")
      .select("*")
      .eq("id", id)
      .eq("user_id", viewer.userId)
      .maybeSingle();
    if (error) return NextResponse.json({ ok: false, reason: "unavailable" }, { status: 503 });
    if (!data) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, project: data });
  }

  const { data, error } = await supabase
    .from("bonus_projects")
    .select(LIST_COLUMNS)
    .eq("user_id", viewer.userId)
    .order("updated_at", { ascending: false })
    .limit(MAX_PROJECTS);

  // La table peut ne pas encore exister en prod (migration non appliquée).
  // On rend une liste VIDE plutôt qu'une erreur : le générateur continue
  // de fonctionner, et personne ne voit d'écran cassé.
  if (error) return NextResponse.json({ ok: true, projects: [], degraded: true });

  return NextResponse.json({ ok: true, projects: (data ?? []).map((r) => toSummary(r as Row)) });
}

/**
 * Crée ou met à jour un bonus. Renvoie son `id`, que l'écran garde pour
 * les enregistrements suivants.
 */
export async function POST(req: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  const payload = sanitizeProject(body);
  // Une page ouverte puis quittée sans rien générer ne devient pas une
  // ligne : la liste se remplirait de brouillons vides, et le vrai bonus
  // se perdrait au milieu.
  if (!worthSaving(payload)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const supabase = await getSupabaseServerClient();
  const id = typeof body.id === "string" && body.id ? body.id : null;

  const row = {
    user_id: viewer.userId,
    title: projectTitle(payload),
    quiz_title: payload.quizTitle,
    brief: payload.brief,
    pistes: payload.pistes,
    chosen: payload.chosen,
    blocks: payload.blocks,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    // `eq("user_id")` en plus de l'id : la politique RLS le fait déjà,
    // mais une requête qui ne peut pas viser la ligne d'un autre est
    // plus facile à relire qu'une politique qu'il faut aller vérifier.
    const { data, error } = await supabase
      .from("bonus_projects")
      .update(row)
      .eq("id", id)
      .eq("user_id", viewer.userId)
      .select("id")
      .maybeSingle();
    if (error) return NextResponse.json({ ok: false, reason: "unavailable" }, { status: 503 });
    if (data) return NextResponse.json({ ok: true, id: data.id });
    // La ligne a disparu (supprimée dans un autre onglet) : on n'échoue
    // pas, on en recrée une. Le travail en cours compte plus que l'id.
  }

  const { count } = await supabase
    .from("bonus_projects")
    .select("id", { count: "exact", head: true })
    .eq("user_id", viewer.userId);
  if ((count ?? 0) >= MAX_PROJECTS) {
    return NextResponse.json({ ok: false, reason: "too_many" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("bonus_projects")
    .insert(row)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ ok: false, reason: "unavailable" }, { status: 503 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}

export async function DELETE(req: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("bonus_projects")
    .delete()
    .eq("id", id)
    .eq("user_id", viewer.userId);
  // Un refus produit TOUJOURS quelque chose à l'écran : le client
  // traduit cette raison (drame du 3 août sur la suppression de projet).
  if (error) return NextResponse.json({ ok: false, reason: "unavailable" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
