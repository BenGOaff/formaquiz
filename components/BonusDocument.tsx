// components/BonusDocument.tsx
//
// LE RENDU D'UN DOCUMENT GÉNÉRÉ.
//
// "Des cases, des couleurs, des blocs séparés, une logique, facile à
// lire et comprendre, visuellement agréable." (Béné, 5 août 2026)
//
// -- CE QUI DÉCIDE DE L'ALLURE, ET CE QUI N'EN DÉCIDE PAS -------------
//
// La STRUCTURE vient de `lib/bonus/document.ts`, en fonction pure et
// testée. Ce fichier ne fait que la peindre : il ne relit jamais le
// markdown, il ne devine rien. Deux mises en forme qui repartent du
// texte brut finissent toujours par ne plus se ressembler, et c'est
// exactement ce qui arriverait entre l'écran et le PDF.
//
// -- POURQUOI CE N'EST PAS UN ARC-EN-CIEL -----------------------------
//
// Le 3 août, la page de résultat en quatre temps a été refusée deux fois
// pour la même raison : "sans forcément créer 4 cartes de couleurs trop
// IA" et "il est de la même couleur que les boutons, ça entraîne de la
// confusion". La leçon vaut ici : le rythme se fait par la TAILLE, le
// GRAS et l'ESPACE, et une seule couleur, celle de la marque, sert de
// repère. Une section = une carte, un numéro dans une pastille, et de
// l'air. Pas six teintes.

import type { BonusDoc, DocBlock } from "@/lib/bonus/document";

export function BonusDocument({ doc }: { doc: BonusDoc }) {
  return (
    <div className="flex flex-col gap-4">
      {doc.title && (
        <h2 className="font-display text-xl font-bold leading-snug">{doc.title}</h2>
      )}
      {doc.lead.length > 0 && (
        <div className="flex flex-col gap-3 text-[15px] leading-relaxed">
          {doc.lead.map((b, i) => (
            <Block key={i} block={b} />
          ))}
        </div>
      )}

      {doc.sections.map((s, i) => (
        <section
          key={i}
          className="overflow-hidden rounded-xl border border-border bg-background"
        >
          <header className="flex items-start gap-3 border-b border-border bg-surface-soft px-4 py-3">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              {i + 1}
            </span>
            <h3 className="font-display text-[15px] font-semibold leading-snug">{s.title}</h3>
          </header>
          <div className="flex flex-col gap-3 px-4 py-4 text-[15px] leading-relaxed">
            {s.blocks.map((b, j) => (
              <Block key={j} block={b} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Block({ block }: { block: DocBlock }) {
  if (block.kind === "para") {
    return <p dangerouslySetInnerHTML={{ __html: inline(block.text) }} />;
  }

  if (block.kind === "list") {
    return (
      <ul className="flex flex-col gap-1.5">
        {block.items.map((it, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" />
            <span dangerouslySetInnerHTML={{ __html: inline(it) }} />
          </li>
        ))}
      </ul>
    );
  }

  // Les étapes portent leur numéro dans une pastille au lieu de le
  // laisser dans le texte : c'est ce qui rend un plan en 7 jours
  // parcourable d'un coup d'oeil au lieu de se lire comme un paragraphe.
  if (block.kind === "steps") {
    return (
      <ol className="flex flex-col gap-2.5">
        {block.items.map((it, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {it.label}
            </span>
            <span dangerouslySetInnerHTML={{ __html: inline(it.text) }} />
          </li>
        ))}
      </ol>
    );
  }

  // Un sous-titre : il porte son propre bloc, décalé par un filet à
  // gauche pour qu'on voie qu'il appartient à la section.
  return (
    <div className="flex flex-col gap-2 border-l-2 border-primary/25 pl-3">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
        {block.title}
      </p>
      {block.blocks.map((b, i) => (
        <Block key={i} block={b} />
      ))}
    </div>
  );
}

/**
 * Le gras et le code, et RIEN d'autre.
 *
 * Le texte vient d'un modèle, donc il finit dans un `innerHTML` : on
 * échappe d'abord, on remet le gras ensuite. L'inverse laisserait passer
 * une balise écrite par le modèle.
 */
export function inline(text: string): string {
  const safe = String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return safe
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}
