import { cn } from "@/lib/utils";

/**
 * Logo FormaQuiz. Utilise public/formaquiz.png (fourni par Béné).
 * Hauteur par défaut h-8, surchargeable via className.
 */
export function Logo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/formaquiz.png" alt="FormaQuiz" className={cn("h-8 w-auto", className)} />
  );
}
