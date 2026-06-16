import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { getViewer } from "@/lib/parcours";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { NoAccess } from "@/components/NoAccess";
import { Card, CardContent } from "@/components/ui/card";
import type { Question } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CarnetPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.enrolled) return <NoAccess email={viewer.email} />;

  const supabase = await getSupabaseServerClient();

  // Réponses de l'élève + jours + questions associées.
  const { data: answers } = await supabase
    .from("answers")
    .select("question_id, day_id, value_text, value_choice")
    .eq("user_id", viewer.userId);

  const dayIds = Array.from(new Set((answers ?? []).map((a) => a.day_id as string)));

  const [{ data: days }, { data: questions }] = await Promise.all([
    dayIds.length
      ? supabase.from("days").select("id, day_number, title").in("id", dayIds)
      : Promise.resolve({ data: [] as { id: string; day_number: number; title: string }[] }),
    dayIds.length
      ? supabase.from("questions").select("*").in("day_id", dayIds)
      : Promise.resolve({ data: [] as Question[] }),
  ]);

  const questionById = new Map((questions ?? []).map((q) => [q.id as string, q as Question]));
  const answersByDay = new Map<string, typeof answers>();
  for (const a of answers ?? []) {
    const list = answersByDay.get(a.day_id as string) ?? [];
    list.push(a);
    answersByDay.set(a.day_id as string, list);
  }

  const orderedDays = (days ?? []).sort((a, b) => a.day_number - b.day_number);

  function labelFor(q: Question, valueChoice: string | null): string | null {
    if (!valueChoice) return null;
    const opt = q.options.find((o) => o.value === valueChoice);
    return opt?.label ?? valueChoice;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Ton carnet de bord</h1>
        <p className="text-sm text-muted-foreground">
          Toutes tes réponses, rassemblées. C'est la matière de ton projet : ton quiz s'écrit ici,
          réponse après réponse.
        </p>
      </header>

      {orderedDays.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
            <BookOpen className="size-8" />
            <p className="text-sm">
              Ton carnet est encore vide. Réponds au quiz d'un jour et tes réponses apparaîtront ici.
            </p>
          </CardContent>
        </Card>
      ) : (
        orderedDays.map((d) => {
          const dayAnswers = (answersByDay.get(d.id) ?? [])
            .map((a) => ({ a, q: questionById.get(a.question_id as string) }))
            .filter((x): x is { a: NonNullable<typeof x.a>; q: Question } => !!x.q)
            .sort((x, y) => x.q.sort_order - y.q.sort_order);

          return (
            <Card key={d.id}>
              <CardContent className="flex flex-col gap-4 py-5">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-primary">
                    Jour {d.day_number}
                  </span>
                  <h2 className="font-display font-semibold">{d.title}</h2>
                </div>
                <ul className="flex flex-col gap-4">
                  {dayAnswers.map(({ a, q }) => {
                    const display =
                      q.type === "action" ? a.value_text : labelFor(q, a.value_choice as string);
                    if (!display) return null;
                    return (
                      <li key={q.id} className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-muted-foreground">{q.prompt}</p>
                        <p className="rounded-lg bg-surface-soft px-3 py-2 text-sm">{display}</p>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
