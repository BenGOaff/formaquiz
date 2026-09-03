// components/legal/LegalPageView.tsx
//
// LE RENDU D'UNE PAGE LÉGALE. Un seul composant pour les cinq.
//
// **Serveur, sans état ni gestionnaire d'événement**, donc pas de
// `"use client"` : c'est le choix déjà retenu ailleurs, et il évite le
// piège du 1er août (un composant client ne peut pas recevoir une
// référence de fonction depuis une page serveur).
//
// AUCUN APLAT DE COULEUR SOUS DU TEXTE (règle Béné, 31 août 2026 :
// "j'en veux pas, NULLE PART"). Fond blanc, texte à l'encre, et la
// couleur de marque ne sert qu'à un FILET HORIZONTAL. Un filet vertical
// déplacerait ce qu'il décore et casserait l'alignement des bords
// (règle du 3 août, mesurée à 20 px).

import Link from "next/link";

import type { LegalPage, LegalSlug } from "@/lib/legal";
import { LEGAL_PATHS } from "@/lib/legal";
import SansObfuscationEmail from "@/components/legal/SansObfuscationEmail";

const AUTRES: { slug: LegalSlug; texte: string }[] = [
  { slug: "terms", texte: "Conditions générales de vente" },
  { slug: "terms-of-use", texte: "Conditions générales d'utilisation" },
  { slug: "privacy", texte: "Politique de confidentialité" },
  { slug: "cookies", texte: "Politique de cookies" },
  { slug: "legal", texte: "Mentions légales" },
];

export default function LegalPageView({
  page,
  activeSlug,
}: {
  page: LegalPage;
  activeSlug: LegalSlug;
}) {
  return (
    <main className="min-h-screen bg-white px-5 py-12 text-[#16182e]">
      <article className="mx-auto max-w-3xl">
        <div className="h-[3px] w-12 rounded-full bg-[#5a6ef6]" />
        <h1 className="mt-5 text-3xl font-bold leading-tight sm:text-4xl">{page.title}</h1>
        <p className="mt-2 text-sm text-[#6a6f8c]">{page.lastUpdated}</p>

        {page.intro ? (
          <p className="mt-6 text-[15px] leading-relaxed text-[#3a3e5c]">{page.intro}</p>
        ) : null}

        <SansObfuscationEmail>
        <div className="mt-10 space-y-9">
          {page.sections.map((section) => (
            <section key={section.h}>
              <h2 className="text-lg font-semibold">{section.h}</h2>
              <div className="mt-3 space-y-3">
                {section.body.map((bloc, i) =>
                  Array.isArray(bloc) ? (
                    <ul key={i} className="list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-[#3a3e5c]">
                      {bloc.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p key={i} className="text-[15px] leading-relaxed text-[#3a3e5c]">
                      {bloc}
                    </p>
                  ),
                )}
              </div>
            </section>
          ))}
        </div>
        </SansObfuscationEmail>

        {/* La navigation ENTRE pages légales reste interne, et c'est
            voulu : la règle du nouvel onglet (24 août) vise les liens
            posés au milieu d'un parcours qu'on ne veut pas faire perdre
            (un quiz en cours, un paiement). Ici on ne perd rien, et
            forcer un onglet à chaque clic serait juste pénible. */}
        <nav className="mt-14 border-t border-[#e1e6f7] pt-6">
          <p className="text-sm font-semibold">Les autres pages</p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {AUTRES.filter((a) => a.slug !== activeSlug).map((a) => (
              <li key={a.slug}>
                <Link href={LEGAL_PATHS[a.slug]} className="text-[#5a6ef6] underline underline-offset-2">
                  {a.texte}
                </Link>
              </li>
            ))}
            <li>
              {/* Les conditions du programme d'affiliation vivent sur
                  l'espace affilié et n'ont PAS de copie ici : "on gère
                  tout sur affiliate et le reste montre seulement". Lien
                  externe, donc nouvel onglet. */}
              <a
                href="https://affiliate.tipote.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#5a6ef6] underline underline-offset-2"
              >
                Conditions du programme d&apos;affiliation
              </a>
            </li>
          </ul>
        </nav>
      </article>
    </main>
  );
}
