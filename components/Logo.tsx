import { cn } from "@/lib/utils";

/**
 * Wordmark FormaQuiz. Volontairement minimaliste : "Forma" en encre,
 * "Quiz" en indigo (accent centralisé). Béné pourra remplacer par un
 * vrai logo image plus tard sans toucher au reste.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-2xl font-bold tracking-tight", className)}>
      Forma<span className="text-primary">Quiz</span>
    </span>
  );
}
