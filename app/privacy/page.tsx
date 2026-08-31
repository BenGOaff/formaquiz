import type { Metadata } from "next";

import LegalPageView from "@/components/legal/LegalPageView";
import { getLegalPage } from "@/lib/legal";

const SLUG = "privacy" as const;

export const metadata: Metadata = {
  title: getLegalPage(SLUG).title,
  robots: { index: true, follow: true },
};

export default function LegalRoute() {
  return <LegalPageView page={getLegalPage(SLUG)} activeSlug={SLUG} />;
}
