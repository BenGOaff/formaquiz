// components/figures/registry.ts
// Schemas reutilisables, inserables dans le contenu des jours via un
// shortcode [[figure:cle]]. Pour en ajouter un : une entree ici + un cas
// dans Figure.tsx.

export interface FigureOption {
  key: string;
  label: string;
}

export const FIGURE_OPTIONS: FigureOption[] = [
  { key: "quiz-maths", label: "Maths du quiz (2% contre 30%)" },
  { key: "chaine-resultat", label: "Chaine resultat tag segment offre" },
  { key: "page-resultat", label: "Page de resultat en 4 temps" },
  { key: "capture-pic", label: "Capture au pic de curiosite" },
];

export const FIGURE_KEYS = FIGURE_OPTIONS.map((f) => f.key);
