// Rayon "Générer du contenu" : le rédacteur IA, bridé sur l'Atelier.

import Link from "next/link";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

import { ContentBreadcrumb } from "../../components/ContentNav";
import { getContentContext } from "../context";
import { GeneratorClient } from "./GeneratorClient";
import { CONTENT_ROOT, SECTION_LABEL, PRODUCT_NAME } from "@/lib/affiliateContentSpace";

export const metadata = { title: "Générer du contenu - Contenu affilié" };
export const dynamic = "force-dynamic";

export default async function GenererPage() {
  const ctx = await getContentContext();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <ContentBreadcrumb
        trail={[
          { label: "Affiliation", href: "/affiliation" },
          { label: "Contenu", href: CONTENT_ROOT },
          { label: SECTION_LABEL.generer },
        ]}
      />

      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{SECTION_LABEL.generer}</h1>
        <p className="text-sm text-muted-foreground">
          Le kit couvre le cas général. Ici, tu obtiens du contenu écrit pour TON audience à toi :
          tu la décris, tu choisis un format, et le texte sort avec ton lien déjà placé.
        </p>
      </header>

      {!ctx.hasAffiliateId && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex items-start gap-2 py-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              Renseigne ton identifiant dans{" "}
              <Link href="/affiliation" className="font-medium underline">
                l&apos;onglet Mon lien
              </Link>{" "}
              : sinon le texte sortira sans lien tracké.
            </span>
          </CardContent>
        </Card>
      )}

      <Card className="border-dashed bg-surface-soft">
        <CardContent className="flex items-start gap-2 py-4 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            Ce rédacteur ne connaît que {PRODUCT_NAME} et ne sait parler que de lui. Il travaille à
            partir des faits vérifiés du programme : il n&apos;invente ni prix, ni garantie, ni
            chiffre, ni témoignage, et ne fabrique pas de fausse urgence. Relis quand même avant
            d&apos;envoyer : c&apos;est ta signature en bas.
          </span>
        </CardContent>
      </Card>

      <GeneratorClient affiliateLink={ctx.affiliateLink} displayName={ctx.displayName} />
    </div>
  );
}
