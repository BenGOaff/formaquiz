import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";

/**
 * Rend du HTML riche (intro de jour, page de résultat) après nettoyage
 * DOMPurify. Le contenu vient de l'admin, mais on sanitize quand même
 * (ceinture et bretelles). Classe .fq-rich = styles définis dans
 * globals.css.
 */
export function RichContent({ html, className }: { html: string | null; className?: string }) {
  if (!html) return null;
  const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  return (
    <div
      className={cn("fq-rich text-[0.95rem] leading-relaxed", className)}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
