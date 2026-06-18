// components/figures/Figure.tsx
// Rend un schema SVG a partir de sa cle. Composant pur (pas de hooks),
// utilisable dans le rendu serveur (RichContent). Couleurs basees sur les
// tokens (primary, muted) pour rester sur la charte L'Atelier du Quiz.

function Frame({ children, caption }: { children: React.ReactNode; caption?: string }) {
  return (
    <figure className="my-5 rounded-xl border border-border bg-card p-4">
      {children}
      {caption && (
        <figcaption className="mt-2 text-center text-xs text-muted-foreground">{caption}</figcaption>
      )}
    </figure>
  );
}

function QuizMaths() {
  return (
    <Frame caption="Pour 100 visiteurs : une page de capture convertit peu, un quiz beaucoup plus.">
      <svg viewBox="0 0 320 160" className="w-full" role="img" aria-label="Comparaison page de capture contre quiz">
        <line x1="40" y1="130" x2="300" y2="130" stroke="hsl(var(--border))" strokeWidth="2" />
        {/* Page de capture : ~2 leads */}
        <rect x="80" y="120" width="50" height="10" rx="3" fill="hsl(var(--muted-foreground))" opacity="0.5" />
        <text x="105" y="112" textAnchor="middle" fontSize="12" fill="hsl(var(--foreground))">2</text>
        <text x="105" y="148" textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">Page de capture</text>
        {/* Quiz : ~30 leads */}
        <rect x="200" y="40" width="50" height="90" rx="3" fill="hsl(var(--primary))" />
        <text x="225" y="32" textAnchor="middle" fontSize="12" fill="hsl(var(--foreground))">30</text>
        <text x="225" y="148" textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">Quiz</text>
        <text x="20" y="46" fontSize="9" fill="hsl(var(--muted-foreground))">leads</text>
      </svg>
    </Frame>
  );
}

function Chaine() {
  const steps = ["Résultat", "Tag", "Segment", "Offre"];
  return (
    <Frame caption="La chaîne qui fait qu'un quiz rapporte : chaque résultat mène à une offre.">
      <svg viewBox="0 0 340 70" className="w-full" role="img" aria-label="Chaîne résultat tag segment offre">
        {steps.map((s, i) => {
          const x = 10 + i * 84;
          return (
            <g key={s}>
              <rect x={x} y="20" width="68" height="30" rx="15" fill="hsl(var(--surface-soft))" stroke="hsl(var(--primary))" strokeWidth="1.5" />
              <text x={x + 34} y="39" textAnchor="middle" fontSize="11" fill="hsl(var(--foreground))">{s}</text>
              {i < steps.length - 1 && (
                <text x={x + 78} y="40" textAnchor="middle" fontSize="14" fill="hsl(var(--primary))">{"→"}</text>
              )}
            </g>
          );
        })}
      </svg>
    </Frame>
  );
}

function PageResultat() {
  const temps = [
    "Le miroir : voici où tu en es",
    "La cause cachée : pourquoi tu bloques",
    "Le chemin : quoi faire maintenant",
    "Le pont vers l'offre",
  ];
  return (
    <Frame caption="Structure d'une page de résultat qui convertit, sans forcer.">
      <svg viewBox="0 0 320 168" className="w-full" role="img" aria-label="Page de résultat en quatre temps">
        {temps.map((t, i) => {
          const y = 6 + i * 40;
          return (
            <g key={i}>
              <rect x="10" y={y} width="300" height="32" rx="8" fill="hsl(var(--surface-soft))" />
              <circle cx="30" cy={y + 16} r="11" fill="hsl(var(--primary))" />
              <text x="30" y={y + 20} textAnchor="middle" fontSize="11" fill="hsl(var(--primary-foreground))">{i + 1}</text>
              <text x="52" y={y + 20} fontSize="11" fill="hsl(var(--foreground))">{t}</text>
            </g>
          );
        })}
      </svg>
    </Frame>
  );
}

function CapturePic() {
  return (
    <Frame caption="Place la demande d'email juste avant le résultat, quand la curiosité est au sommet.">
      <svg viewBox="0 0 320 120" className="w-full" role="img" aria-label="Capture au pic de curiosité">
        <path d="M20 100 Q 160 -10 300 100" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
        <line x1="250" y1="20" x2="250" y2="100" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" strokeDasharray="4 3" />
        <circle cx="250" cy="30" r="5" fill="hsl(var(--primary))" />
        <text x="250" y="16" textAnchor="middle" fontSize="10" fill="hsl(var(--foreground))">Email ici</text>
        <text x="30" y="114" fontSize="9" fill="hsl(var(--muted-foreground))">Début</text>
        <text x="280" y="114" fontSize="9" fill="hsl(var(--muted-foreground))">Résultat</text>
      </svg>
    </Frame>
  );
}

export function Figure({ name }: { name: string }) {
  switch (name) {
    case "quiz-maths":
      return <QuizMaths />;
    case "chaine-resultat":
      return <Chaine />;
    case "page-resultat":
      return <PageResultat />;
    case "capture-pic":
      return <CapturePic />;
    default:
      return null;
  }
}
