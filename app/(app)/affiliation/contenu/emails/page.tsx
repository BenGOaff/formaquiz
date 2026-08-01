// Rayon "Emails de vente" : la campagne complète, un email par carte.

import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

import { ContentBreadcrumb } from "../../components/ContentNav";
import { EmailKitCard } from "../../components/EmailKitCard";
import { getContentContext } from "../context";
import { CONTENT_ROOT, SECTION_LABEL } from "@/lib/affiliateContentSpace";
import {
  SWIPE_EMAILS,
  ATELIER_EMAIL_PLAN_7,
  ATELIER_EMAIL_PLAN_3,
} from "@/lib/affiliateSwipe";

export const metadata = { title: "Emails de vente - Contenu affilié" };
export const dynamic = "force-dynamic";

export default async function EmailsPage() {
  const ctx = await getContentContext();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <ContentBreadcrumb
        trail={[
          { label: "Affiliation", href: "/affiliation" },
          { label: "Contenu", href: CONTENT_ROOT },
          { label: SECTION_LABEL.emails },
        ]}
      />

      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{SECTION_LABEL.emails}</h1>
        <p className="text-sm text-muted-foreground">
          {SWIPE_EMAILS.length} emails à copier-coller dans ton outil d&apos;emailing. Ton lien
          affilié est déjà inséré. Chaque email tient debout tout seul : envoie-les tous, ou
          n&apos;en garde que quelques-uns. Aucune urgence artificielle, aucune date de fermeture :
          la campagne reste vraie dans six mois.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-1.5 py-4 text-xs text-muted-foreground">
          <span className="flex items-start gap-2">
            <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span>
              <code className="rounded bg-muted px-1 py-0.5">{"{first_name}"}</code> reste tel
              quel : c&apos;est le champ de fusion de TON outil (il met le prénom du destinataire).
            </span>
          </span>
          <span className="flex items-start gap-2">
            <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span>3 objets par email : teste le A, garde B et C pour relancer les non-ouvreurs.</span>
          </span>
          <span className="flex items-start gap-2">
            <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span>
              Version 7 envois : {ATELIER_EMAIL_PLAN_7.map((n) => `#${n}`).join(" · ")}. Version 3
              envois, à trois jours d&apos;intervalle :{" "}
              {ATELIER_EMAIL_PLAN_3.map((n) => `#${n}`).join(" · ")}.
            </span>
          </span>
        </CardContent>
      </Card>

      {!ctx.hasAffiliateId && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex items-start gap-2 py-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              Ajoute d&apos;abord ton identifiant dans{" "}
              <Link href="/affiliation" className="font-medium underline">
                l&apos;onglet Mon lien
              </Link>{" "}
              : sans ça, tes emails partent avec un lien non tracké et tu ne touches aucune
              commission.
            </span>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {SWIPE_EMAILS.map((mail) => (
          <EmailKitCard
            key={mail.key}
            mail={mail}
            link={ctx.affiliateLink}
            firstName={ctx.firstName}
            override={ctx.emailOverrides[mail.key]}
          />
        ))}
      </div>
    </div>
  );
}
