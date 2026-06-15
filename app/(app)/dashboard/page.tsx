import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Lock, PlayCircle, Sparkles } from "lucide-react";
import { getViewer, getDaysWithProgress } from "@/lib/parcours";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NoAccess } from "@/components/NoAccess";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.enrolled) return <NoAccess email={viewer.email} />;

  const days = await getDaysWithProgress(viewer.userId);
  const completed = days.filter((d) => d.progress === "completed").length;
  const total = days.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const current = days.find((d) => d.progress !== "completed" && d.unlocked) ?? null;
  const firstName = viewer.profile?.full_name?.split(" ")[0] ?? null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          {firstName ? `Salut ${firstName}, on continue ?` : "Ton parcours FormaQuiz"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Chaque jour : une vidéo qui enseigne, un quiz qui te fait avancer sur ton projet.
          Finir le quiz du jour débloque le suivant.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-3 py-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Ta progression</span>
            <span className="text-muted-foreground">
              {completed} / {total} jours
            </span>
          </div>
          <Progress value={pct} />
          {current && (
            <Link
              href={`/jour/${current.day_number}`}
              className="mt-1 inline-flex w-fit items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <Sparkles className="size-4" />
              Reprendre au jour {current.day_number} : {current.title}
            </Link>
          )}
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        {days.map((d) => {
          const locked = d.progress === "locked";
          const done = d.progress === "completed";
          const inner = (
            <Card
              className={
                locked
                  ? "opacity-60"
                  : "transition-shadow hover:shadow-card-hover"
              }
            >
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-primary">
                  {done ? (
                    <CheckCircle2 className="size-5 text-success" />
                  ) : locked ? (
                    <Lock className="size-5 text-muted-foreground" />
                  ) : (
                    <PlayCircle className="size-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Jour {d.day_number}
                    </span>
                    {done && <Badge variant="success">Terminé</Badge>}
                  </div>
                  <p className="truncate font-medium">{d.title}</p>
                  {d.subtitle && (
                    <p className="truncate text-sm text-muted-foreground">{d.subtitle}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );

          return locked ? (
            <div key={d.id} aria-disabled className="cursor-not-allowed">
              {inner}
            </div>
          ) : (
            <Link key={d.id} href={`/jour/${d.day_number}`} className="block">
              {inner}
            </Link>
          );
        })}

        {days.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Le parcours arrive très vite. Reviens dans un instant.
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
