import { privacy } from "./privacy";
import { legal } from "./legal-notice";
import { terms } from "./terms";
import { termsOfUse } from "./terms-of-use";
import { cookies } from "./cookies";
import type { LegalPage, LegalSlug } from "./types";

export { LEGAL_SLUGS, LEGAL_PATHS } from "./types";
export type { LegalPage, LegalSlug };

/**
 * MONOLINGUE, ET C'EST ASSUMÉ.
 *
 * Chez Tiquiz, `getLegalPage` prend une locale et retombe sur l'anglais.
 * Ici l'app est en français seulement : une signature avec locale
 * laisserait croire à des traductions qui n'existent pas.
 */
const parSlug: Record<LegalSlug, LegalPage> = {
  legal,
  terms,
  "terms-of-use": termsOfUse,
  privacy,
  cookies,
};

export function getLegalPage(slug: LegalSlug): LegalPage {
  return parSlug[slug];
}
