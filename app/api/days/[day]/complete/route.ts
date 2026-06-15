// app/api/days/[day]/complete/route.ts
// Valide le jour : vérifie que les questions obligatoires ont une
// réponse, puis pose le statut "completed" (ce qui débloque le jour
// suivant côté lib/parcours). Déblocage sur complétion, jamais sur
// score (cf. cahier des charges).
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ day: string }> },
) {
  const { day } = await params;
  const dayNumber = Number.parseInt(day, 10);
  if (!Number.isFinite(dayNumber)) {
    return NextResponse.json({ ok: false, reason: "bad_day" }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "unauth" }, { status: 401 });

  const { data: dayRow } = await supabase
    .from("days")
    .select("id")
    .eq("day_number", dayNumber)
    .maybeSingle();
  if (!dayRow) return NextResponse.json({ ok: false, reason: "no_day" }, { status: 404 });

  // Questions obligatoires de ce jour.
  const { data: requiredQuestions } = await supabase
    .from("questions")
    .select("id")
    .eq("day_id", dayRow.id)
    .eq("required", true);

  const requiredIds = (requiredQuestions ?? []).map((q) => q.id as string);

  if (requiredIds.length > 0) {
    const { data: answered } = await supabase
      .from("answers")
      .select("question_id, value_text, value_choice")
      .eq("user_id", user.id)
      .eq("day_id", dayRow.id)
      .in("question_id", requiredIds);

    const answeredOk = new Set(
      (answered ?? [])
        .filter(
          (a) =>
            (a.value_text && String(a.value_text).trim() !== "") ||
            (a.value_choice && String(a.value_choice).trim() !== ""),
        )
        .map((a) => a.question_id as string),
    );

    const missing = requiredIds.some((id) => !answeredOk.has(id));
    if (missing) {
      return NextResponse.json({ ok: false, reason: "incomplete" }, { status: 400 });
    }
  }

  const { error } = await supabase.from("progress").upsert(
    {
      user_id: user.id,
      day_id: dayRow.id,
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,day_id" },
  );

  if (error) {
    return NextResponse.json({ ok: false, reason: "db" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
