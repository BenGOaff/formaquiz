import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Lock, Play, Sparkles, Gift, Trophy } from "lucide-react";
import { getViewer, getDaysWithProgress } from "@/lib/parcours";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NoAccess } from "@/components/NoAccess";
import { cn } from "@/lib/utils";
import type { DayWithProgress } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.enrolled) return <NoAccess email={viewer.email} />;
  if (!viewer.profile?.diagnostic_completed_at) redirect("/diagnostic");

  const days = await getDaysWithProgress(viewer.userId);
  const parcours = days.filter((d) => !d.is_bonus);
  const bonus = days.filter((d) => d.is_bonus);

  const completed = parcours.filter((d) => d.progress === "completed").length;
  const total = parcours.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const current = parcours.find((d) => d.progress !== "completed" && d.unlocked) ?? null;
  const allDone = total > 0 && completed === total;
  const firstName = viewer.profile?.full_name?.split(" ")[0] ?? null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          {firstName ? `Salut ${firstName}, on continue ?` : "Ton parcours FormaQuiz"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Chaque jour : une vidéo qui enseigne, un quiz qui te fait avancer. Finis le quiz du jour
          pour débloquer le suivant.
        </p>
      </header>

      {/* Barre de progression du parcours */}
      <Card>
        <CardContent className="flex flex-col gap-3 py-5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium">
              <Trophy className="size-4 text-primary" />
              Ta progression
            </span>
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
              Reprendre : {dayLabel(current)} {current.title}
            </Link>
          )}
          {allDone && (
            <p className="mt-1 text-sm font-medium text-success">
              Parcours terminé, bravo ! Les bonus t'attendent plus bas.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section parcours : cartes "gaming" */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Le parcours
        </h2>
        <div className="flex flex-col gap-3">
          {parcours.map((d) => (
            <DayCard key={d.id} day={d} />
          ))}
          {parcours.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Le parcours arrive très vite.
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Section bonus : style distinct, toujours accessible */}
      {bonus.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Gift className="size-4" />
            Bonus, quand tu veux
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {bonus.map((d) => (
              <BonusCard key={d.id} day={d} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function dayLabel(d: DayWithProgress): string {
  return `J${d.day_number}`;
}

function DayCard({ day: d }: { day: DayWithProgress }) {
  const locked = d.progress === "locked";
  const done = d.progress === "completed";
  const current = d.progress === "in_progress";

  const card = (
    <Card
      className={cn(
        "transition-shadow",
        locked && "opacity-60",
        current && "ring-2 ring-primary",
        !locked && "hover:shadow-card-hover",
      )}
    >
      <CardContent className="flex items-center gap-4 py-4">
        {/* Pastille de niveau facon jeu */}
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-2xl text-base font-bold",
            done && "bg-success text-success-foreground",
            current && "bg-primary text-primary-foreground",
            locked && "bg-muted text-muted-foreground",
          )}
        >
          {done ? (
            <CheckCircle2 className="size-6" />
          ) : locked ? (
            <Lock className="size-5" />
          ) : (
            `J${d.day_number}`
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Jour {d.day_number}
            </span>
            {done && <Badge variant="success">Terminé</Badge>}
            {current && <Badge>À faire</Badge>}
          </div>
          <p className="truncate font-medium">{d.title}</p>
          {d.subtitle && <p className="truncate text-sm text-muted-foreground">{d.subtitle}</p>}
        </div>

        {!locked && <Play className="size-5 shrink-0 text-primary" />}
      </CardContent>
    </Card>
  );

  return locked ? (
    <div aria-disabled className="cursor-not-allowed">
      {card}
    </div>
  ) : (
    <Link href={`/jour/${d.day_number}`} className="block">
      {card}
    </Link>
  );
}

function BonusCard({ day: d }: { day: DayWithProgress }) {
  const done = d.progress === "completed";
  return (
    <Link href={`/jour/${d.day_number}`} className="block">
      <Card className="border-dashed border-primary/40 bg-surface-soft transition-shadow hover:shadow-card-hover">
        <CardContent className="flex items-start gap-3 py-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Gift className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Bonus</Badge>
              {done && <CheckCircle2 className="size-4 text-success" />}
            </div>
            <p className="mt-1 font-medium leading-snug">{d.title}</p>
            {d.subtitle && <p className="text-sm text-muted-foreground">{d.subtitle}</p>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
