import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download, LinkIcon } from "lucide-react";
import { getViewer, getDayDetail, getDaysWithProgress } from "@/lib/parcours";
import { isAdminEmail } from "@/lib/adminEmails";
import { resolveDayVideoSrc } from "@/lib/video/playback";
import { personalizeContent } from "@/lib/personalize";
import { resolvePersona, personaLabel } from "@/lib/personas";
import { getPersonaVocab, getDayPersonaExample } from "@/lib/personaContent";
import { Sparkles, Gem } from "lucide-react";
import { VideoPlayer } from "@/components/VideoPlayer";
import { RichContent } from "@/components/RichContent";
import { NoAccess } from "@/components/NoAccess";
import { Card, CardContent } from "@/components/ui/card";
import { QuizRunner } from "./QuizRunner";

export const dynamic = "force-dynamic";

export default async function DayPage({
  params,
}: {
  params: Promise<{ day: string }>;
}) {
  const { day } = await params;
  const dayNumber = Number.parseInt(day, 10);
  if (!Number.isFinite(dayNumber)) notFound();

  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.enrolled) return <NoAccess email={viewer.email} />;

  const detail = await getDayDetail(viewer.userId, dayNumber, {
    bypassLock: isAdminEmail(viewer.email),
  });
  // Jour inexistant, non publié, ou pas encore débloqué : on renvoie au
  // tableau de bord plutôt que d'exposer un 404 sec.
  if (!detail) redirect("/dashboard");

  const { day: d, questions, answers } = detail;

  // Jour suivant (pour le bouton de déblocage en fin de quiz). On chaine
  // uniquement dans le parcours ; les bonus ne s'enchainent pas.
  const allDays = await getDaysWithProgress(viewer.userId);
  const parcoursDays = allDays.filter((x) => !x.is_bonus);
  let nextDayNumber: number | null = null;
  if (!d.is_bonus) {
    const idx = parcoursDays.findIndex((x) => x.day_number === d.day_number);
    nextDayNumber =
      idx >= 0 && idx + 1 < parcoursDays.length ? parcoursDays[idx + 1].day_number : null;
  }

  const resources = d.resources ?? [];
  const { src: videoSrc } = await resolveDayVideoSrc(d);
  // Personnalisation : {prenom} + vocabulaire du persona ({offre}, {client}
  // ...), plus un encart d'exemples concrets dans le metier de l'eleve.
  const firstName = viewer.profile?.full_name?.split(" ")[0] ?? null;
  const persona = resolvePersona(viewer.profile?.activity_type);
  const vocab = await getPersonaVocab(persona);
  const introHtml = personalizeContent(d.intro_html, { firstName, vocab });
  const resultHtml = personalizeContent(d.result_html, { firstName, vocab });
  const pepiteHtml = personalizeContent(d.pepite_html, { firstName, vocab });
  const personaExample = personalizeContent(await getDayPersonaExample(d.id, persona), {
    firstName,
    vocab,
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link
        href="/dashboard"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Mon parcours
      </Link>

      <header className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-primary">
          {d.is_bonus ? "Bonus" : `Jour ${d.day_number}`}
        </span>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{d.title}</h1>
        {d.subtitle && <p className="text-muted-foreground">{d.subtitle}</p>}
      </header>

      <VideoPlayer src={videoSrc} />

      {introHtml && (
        <Card>
          <CardContent className="py-5">
            <RichContent html={introHtml} />
          </CardContent>
        </Card>
      )}

      {/* La pepite : nugget avance et actionnable (persuasion, growth). */}
      {pepiteHtml && (
        <Card className="border-l-4 border-l-amber-400 bg-amber-50/60">
          <CardContent className="flex flex-col gap-2 py-5">
            <span className="flex items-center gap-2 text-sm font-semibold text-amber-700">
              <Gem className="size-4" />
              La pépite
            </span>
            <RichContent html={pepiteHtml} />
          </CardContent>
        </Card>
      )}

      {/* Encart "Pour toi" : exemples concrets dans le metier de l'eleve. */}
      {personaExample && (
        <Card className="border-primary/30 bg-surface-soft">
          <CardContent className="flex flex-col gap-2 py-5">
            <span className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Sparkles className="size-4" />
              Pour toi, {personaLabel(persona).toLowerCase()}
            </span>
            <RichContent html={personaExample} />
          </CardContent>
        </Card>
      )}

      {resources.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-2 py-5">
            <h2 className="text-sm font-semibold">Ressources du jour</h2>
            <ul className="flex flex-col gap-1.5">
              {resources.map((r, i) => (
                <li key={i}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    {r.type === "download" ? (
                      <Download className="size-4" />
                    ) : (
                      <LinkIcon className="size-4" />
                    )}
                    {r.label}
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <QuizRunner
        dayNumber={d.day_number}
        questions={questions}
        initialAnswers={answers}
        alreadyCompleted={d.progress === "completed"}
        resultHtml={resultHtml}
        nextDayNumber={nextDayNumber}
        isBonus={d.is_bonus}
      />
    </div>
  );
}
