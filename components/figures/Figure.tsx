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

// J1 : la trame d'un resultat qui vend sans vendre (5 leviers de Blair
// Warren). Chaque levier = une ligne numerotee ; en pied, la regle du
// coupable. Dual coding : numero + verbe d'action court.
function TrameResultat() {
  const leviers = [
    "Encourage le rêve",
    "Déculpabilise l'échec passé",
    "Apaise la peur",
    "Confirme un soupçon",
    "Désigne le vrai coupable",
  ];
  return (
    <Frame caption="La trame d'un résultat qui vend sans vendre : il retourne le couteau, gentiment.">
      <svg viewBox="0 0 320 232" className="w-full" role="img" aria-label="Les cinq leviers d'un résultat qui convertit">
        {leviers.map((t, i) => {
          const y = 6 + i * 34;
          return (
            <g key={i}>
              <rect x="10" y={y} width="300" height="28" rx="8" fill="hsl(var(--surface-soft))" />
              <circle cx="28" cy={y + 14} r="10" fill="hsl(var(--primary))" />
              <text x="28" y={y + 18} textAnchor="middle" fontSize="11" fill="hsl(var(--primary-foreground))">{i + 1}</text>
              <text x="48" y={y + 18} fontSize="11.5" fill="hsl(var(--foreground))">{t}</text>
            </g>
          );
        })}
        <rect x="10" y="182" width="300" height="42" rx="8" fill="hsl(var(--primary)/0.12)" stroke="hsl(var(--primary))" strokeWidth="1" />
        <text x="160" y="200" textAnchor="middle" fontSize="10.5" fill="hsl(var(--foreground))">Le coupable : une méthode, un mythe.</text>
        <text x="160" y="215" textAnchor="middle" fontSize="10.5" fontWeight="600" fill="hsl(var(--primary))">Jamais ton client.</text>
      </svg>
    </Frame>
  );
}

// J1 : les deux sortes de quiz (profil contre score).
function ProfilVsScore() {
  return (
    <Frame caption="Deux sortes de quiz, deux usages : révéler une identité, ou situer un niveau.">
      <svg viewBox="0 0 320 150" className="w-full" role="img" aria-label="Quiz de profil contre quiz de score">
        {/* Profil */}
        <rect x="8" y="8" width="146" height="134" rx="12" fill="hsl(var(--surface-soft))" stroke="hsl(var(--primary))" strokeWidth="1.5" />
        <text x="81" y="32" textAnchor="middle" fontSize="13" fontWeight="600" fill="hsl(var(--primary))">Profil</text>
        <text x="81" y="58" textAnchor="middle" fontSize="10.5" fill="hsl(var(--foreground))">Range dans un type</text>
        <text x="81" y="74" textAnchor="middle" fontSize="10.5" fill="hsl(var(--muted-foreground))">"Le Bâtisseur"</text>
        <text x="81" y="104" textAnchor="middle" fontSize="10" fill="hsl(var(--foreground))">Fait pour être</text>
        <text x="81" y="118" textAnchor="middle" fontSize="10" fontWeight="600" fill="hsl(var(--foreground))">partagé</text>
        {/* Score */}
        <rect x="166" y="8" width="146" height="134" rx="12" fill="hsl(var(--surface-soft))" stroke="hsl(var(--primary))" strokeWidth="1.5" />
        <text x="239" y="32" textAnchor="middle" fontSize="13" fontWeight="600" fill="hsl(var(--primary))">Score</text>
        <text x="239" y="58" textAnchor="middle" fontSize="10.5" fill="hsl(var(--foreground))">Situe sur un niveau</text>
        <text x="239" y="74" textAnchor="middle" fontSize="10.5" fill="hsl(var(--muted-foreground))">Débutant, Expert</text>
        <text x="239" y="104" textAnchor="middle" fontSize="10" fill="hsl(var(--foreground))">Donne envie de</text>
        <text x="239" y="118" textAnchor="middle" fontSize="10" fontWeight="600" fill="hsl(var(--foreground))">progresser</text>
      </svg>
    </Frame>
  );
}

// J0 : la boucle "apprendre en faisant" (video -> action -> deblocage).
function BoucleApprendre() {
  const nodes = ["Vidéo : tu comprends", "Quiz : tu agis sur TON projet", "Jour suivant débloqué"];
  return (
    <Frame caption="Ici, tu n'apprends pas en regardant : chaque jour, tu comprends puis tu agis, et ça débloque la suite.">
      <svg viewBox="0 0 320 120" className="w-full" role="img" aria-label="La boucle apprendre en faisant">
        {nodes.map((t, i) => {
          const x = 10 + i * 104;
          return (
            <g key={i}>
              <rect x={x} y="34" width="92" height="40" rx="10" fill="hsl(var(--surface-soft))" stroke="hsl(var(--primary))" strokeWidth="1.5" />
              <text x={x + 46} y="50" textAnchor="middle" fontSize="9.5" fill="hsl(var(--foreground))">{t.split(":")[0]}:</text>
              <text x={x + 46} y="63" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">{t.split(":")[1]?.trim()}</text>
              {i < nodes.length - 1 && (
                <text x={x + 98} y="58" textAnchor="middle" fontSize="16" fill="hsl(var(--primary))">{"→"}</text>
              )}
            </g>
          );
        })}
        {/* Boucle de retour */}
        <path d="M300 74 Q 300 100 160 100 Q 20 100 20 78" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeDasharray="4 3" />
        <text x="160" y="114" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">et on recommence, un jour après l'autre</text>
        <polygon points="20,78 16,70 24,70" fill="hsl(var(--primary))" />
      </svg>
    </Frame>
  );
}

// J2 : la cle API, pont entre Tiquiz et Systeme.io.
function CleApiPont() {
  return (
    <Frame caption="La clé API relie ton quiz à Systeme.io : chaque contact capté arrive rangé, tout seul.">
      <svg viewBox="0 0 320 110" className="w-full" role="img" aria-label="La clé API relie Tiquiz à Systeme.io">
        <rect x="8" y="34" width="96" height="44" rx="10" fill="hsl(var(--primary))" />
        <text x="56" y="60" textAnchor="middle" fontSize="12" fontWeight="600" fill="hsl(var(--primary-foreground))">Tiquiz</text>
        <rect x="216" y="34" width="96" height="44" rx="10" fill="hsl(var(--surface-soft))" stroke="hsl(var(--primary))" strokeWidth="1.5" />
        <text x="264" y="60" textAnchor="middle" fontSize="12" fontWeight="600" fill="hsl(var(--foreground))">Systeme.io</text>
        {/* Pont / cle */}
        <line x1="104" y1="56" x2="216" y2="56" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="5 3" />
        <polygon points="216,56 208,51 208,61" fill="hsl(var(--primary))" />
        <rect x="132" y="44" width="56" height="24" rx="12" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="1.5" />
        <text x="160" y="60" textAnchor="middle" fontSize="10" fill="hsl(var(--primary))">clé API</text>
        <text x="160" y="94" textAnchor="middle" fontSize="9.5" fill="hsl(var(--muted-foreground))">tes contacts passent d'un outil à l'autre, sans toi</text>
      </svg>
    </Frame>
  );
}

// J3 : les deux moteurs viraux (on le finit -> email ; on le partage -> visiteurs).
function DeuxMoteursViraux() {
  return (
    <Frame caption="Un bon quiz a deux moteurs : on le finit (tu captes), on le partage (ça t'amène du monde).">
      <svg viewBox="0 0 320 150" className="w-full" role="img" aria-label="Les deux moteurs viraux d'un quiz">
        <rect x="6" y="55" width="80" height="40" rx="10" fill="hsl(var(--primary))" />
        <text x="46" y="79" textAnchor="middle" fontSize="12" fontWeight="600" fill="hsl(var(--primary-foreground))">Ton quiz</text>
        {/* Moteur 1 : finir */}
        <line x1="86" y1="66" x2="146" y2="42" stroke="hsl(var(--primary))" strokeWidth="1.5" />
        <polygon points="146,42 137,42 142,50" fill="hsl(var(--primary))" />
        <rect x="146" y="18" width="168" height="42" rx="10" fill="hsl(var(--surface-soft))" stroke="hsl(var(--primary))" strokeWidth="1.5" />
        <text x="230" y="37" textAnchor="middle" fontSize="11" fontWeight="600" fill="hsl(var(--foreground))">On le FINIT</text>
        <text x="230" y="51" textAnchor="middle" fontSize="9.5" fill="hsl(var(--muted-foreground))">tu récupères son email</text>
        {/* Moteur 2 : partager */}
        <line x1="86" y1="84" x2="146" y2="108" stroke="hsl(var(--primary))" strokeWidth="1.5" />
        <polygon points="146,108 137,108 142,100" fill="hsl(var(--primary))" />
        <rect x="146" y="90" width="168" height="42" rx="10" fill="hsl(var(--surface-soft))" stroke="hsl(var(--primary))" strokeWidth="1.5" />
        <text x="230" y="109" textAnchor="middle" fontSize="11" fontWeight="600" fill="hsl(var(--foreground))">On le PARTAGE</text>
        <text x="230" y="123" textAnchor="middle" fontSize="9.5" fill="hsl(var(--muted-foreground))">de nouveaux visiteurs arrivent</text>
      </svg>
    </Frame>
  );
}

// J4 : publier une v1 imparfaite bat un quiz parfait reste dans la tete.
function V1Imparfaite() {
  return (
    <Frame caption="Un quiz en ligne, même imparfait, bat un quiz parfait resté dans ta tête.">
      <svg viewBox="0 0 320 132" className="w-full" role="img" aria-label="Quiz parfait non publié contre quiz imparfait en ligne">
        <rect x="8" y="8" width="146" height="116" rx="12" fill="hsl(var(--surface-soft))" stroke="hsl(var(--muted-foreground))" strokeWidth="1.2" strokeDasharray="5 3" />
        <text x="81" y="30" textAnchor="middle" fontSize="11" fill="hsl(var(--muted-foreground))">Parfait,</text>
        <text x="81" y="44" textAnchor="middle" fontSize="11" fill="hsl(var(--muted-foreground))">dans ta tête</text>
        <text x="81" y="82" textAnchor="middle" fontSize="30" fontWeight="700" fill="hsl(var(--muted-foreground))">0</text>
        <text x="81" y="104" textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">lead capté</text>
        <rect x="166" y="8" width="146" height="116" rx="12" fill="hsl(var(--surface-soft))" stroke="hsl(var(--primary))" strokeWidth="1.5" />
        <text x="239" y="30" textAnchor="middle" fontSize="11" fontWeight="600" fill="hsl(var(--primary))">Imparfait,</text>
        <text x="239" y="44" textAnchor="middle" fontSize="11" fontWeight="600" fill="hsl(var(--primary))">en ligne</text>
        <text x="239" y="84" textAnchor="middle" fontSize="26" fill="hsl(var(--primary))">✓</text>
        <text x="239" y="104" textAnchor="middle" fontSize="10" fill="hsl(var(--foreground))">ça capte déjà</text>
      </svg>
    </Frame>
  );
}

// J5 : la boucle d'auto-viralite (finit -> veut le bonus -> partage -> un proche vient).
function BoucleViralite() {
  const nodes = ["Il finit le quiz", "Il veut le bonus", "Il partage 1 fois", "Un proche vient"];
  return (
    <Frame caption="La boucle d'auto-viralité : chaque visiteur qui veut le bonus t'en ramène un autre.">
      <svg viewBox="0 0 320 150" className="w-full" role="img" aria-label="La boucle d'auto-viralité">
        {nodes.map((t, i) => {
          const x = 6 + i * 78;
          const words = t.split(" ");
          const line1 = words.slice(0, 2).join(" ");
          const line2 = words.slice(2).join(" ");
          return (
            <g key={i}>
              <rect x={x} y="34" width="68" height="44" rx="10" fill="hsl(var(--surface-soft))" stroke="hsl(var(--primary))" strokeWidth="1.5" />
              <text x={x + 34} y="54" textAnchor="middle" fontSize="9" fill="hsl(var(--foreground))">{line1}</text>
              <text x={x + 34} y="66" textAnchor="middle" fontSize="9" fill="hsl(var(--foreground))">{line2}</text>
              {i < nodes.length - 1 && (
                <text x={x + 73} y="60" textAnchor="middle" fontSize="14" fill="hsl(var(--primary))">{"→"}</text>
              )}
            </g>
          );
        })}
        <path d="M274 78 Q 274 106 160 106 Q 40 106 40 82" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeDasharray="4 3" />
        <polygon points="40,82 36,74 44,74" fill="hsl(var(--primary))" />
        <text x="160" y="122" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">et ça recommence, tout seul</text>
      </svg>
    </Frame>
  );
}

// J6 : l'echelle de confiance (lead -> te voit souvent -> confiance -> achat).
function EchelleConfiance() {
  const marches = [
    { label: "Lead", h: 28 },
    { label: "Il te voit", h: 52 },
    { label: "Confiance", h: 78 },
    { label: "Achat", h: 104 },
  ];
  return (
    <Frame caption="Plus tes leads te voient, plus ils te font confiance. Et on achète à qui on fait confiance.">
      <svg viewBox="0 0 320 150" className="w-full" role="img" aria-label="L'échelle de confiance">
        <line x1="14" y1="124" x2="306" y2="124" stroke="hsl(var(--border))" strokeWidth="2" />
        {marches.map((m, i) => {
          const x = 26 + i * 72;
          const y = 124 - m.h;
          const isLast = i === marches.length - 1;
          return (
            <g key={m.label}>
              <rect x={x} y={y} width="56" height={m.h} rx="6" fill={isLast ? "hsl(var(--primary))" : "hsl(var(--surface-soft))"} stroke="hsl(var(--primary))" strokeWidth={isLast ? "0" : "1.3"} />
              <text x={x + 28} y={y - 6} textAnchor="middle" fontSize="9.5" fill="hsl(var(--foreground))">{m.label}</text>
              {i < marches.length - 1 && (
                <text x={x + 64} y={y + m.h / 2} textAnchor="middle" fontSize="13" fill="hsl(var(--primary))">{"↗"}</text>
              )}
            </g>
          );
        })}
      </svg>
    </Frame>
  );
}

// J7 : le funnel en 5 etapes (ou tu perds le plus de monde).
function Funnel5() {
  const etapes = ["Vues", "Démarrages", "Finis", "Captures", "Ventes"];
  const widths = [300, 250, 200, 150, 100];
  return (
    <Frame caption="À chaque étape, des gens s'arrêtent. Répare d'abord la marche où tu perds le plus.">
      <svg viewBox="0 0 320 196" className="w-full" role="img" aria-label="Le funnel en cinq étapes">
        {etapes.map((e, i) => {
          const w = widths[i];
          const x = (320 - w) / 2;
          const y = 6 + i * 37;
          const isLast = i === etapes.length - 1;
          return (
            <g key={e}>
              <rect x={x} y={y} width={w} height="30" rx="6" fill={isLast ? "hsl(var(--primary))" : "hsl(var(--surface-soft))"} stroke="hsl(var(--primary))" strokeWidth={isLast ? "0" : "1.3"} />
              <text x="160" y={y + 19} textAnchor="middle" fontSize="11" fontWeight={isLast ? "600" : "400"} fill={isLast ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))"}>{e}</text>
            </g>
          );
        })}
      </svg>
    </Frame>
  );
}

// Bonus 101 : l'offre auto-liquidante (la pub se rembourse, les leads deviennent gratuits).
function OffreAutoLiquidante() {
  return (
    <Frame caption="L'offre auto-liquidante : ses ventes remboursent ta pub, donc tes leads te reviennent gratuits.">
      <svg viewBox="0 0 320 128" className="w-full" role="img" aria-label="L'offre auto-liquidante">
        <rect x="6" y="40" width="92" height="48" rx="10" fill="hsl(var(--surface-soft))" stroke="hsl(var(--primary))" strokeWidth="1.5" />
        <text x="52" y="62" textAnchor="middle" fontSize="11" fontWeight="600" fill="hsl(var(--foreground))">Pub</text>
        <text x="52" y="78" textAnchor="middle" fontSize="9.5" fill="hsl(var(--muted-foreground))">tu dépenses 10€</text>
        <text x="108" y="68" textAnchor="middle" fontSize="14" fill="hsl(var(--primary))">{"→"}</text>
        <rect x="118" y="40" width="96" height="48" rx="10" fill="hsl(var(--surface-soft))" stroke="hsl(var(--primary))" strokeWidth="1.5" />
        <text x="166" y="62" textAnchor="middle" fontSize="11" fontWeight="600" fill="hsl(var(--foreground))">Petite offre</text>
        <text x="166" y="78" textAnchor="middle" fontSize="9.5" fill="hsl(var(--muted-foreground))">te rend 10€</text>
        <text x="224" y="68" textAnchor="middle" fontSize="14" fill="hsl(var(--primary))">{"→"}</text>
        <rect x="234" y="40" width="80" height="48" rx="10" fill="hsl(var(--primary))" />
        <text x="274" y="62" textAnchor="middle" fontSize="11" fontWeight="600" fill="hsl(var(--primary-foreground))">Leads</text>
        <text x="274" y="78" textAnchor="middle" fontSize="10" fill="hsl(var(--primary-foreground))">gratuits</text>
      </svg>
    </Frame>
  );
}

// Bonus 103 : quiz contre sondage (l'un donne un resultat, l'autre te renseigne).
function QuizVsSondage() {
  return (
    <Frame caption="Le quiz donne un résultat à la personne et capte. Le sondage, lui, te sert : il écoute ta cible.">
      <svg viewBox="0 0 320 150" className="w-full" role="img" aria-label="Quiz contre sondage">
        <rect x="8" y="8" width="146" height="134" rx="12" fill="hsl(var(--surface-soft))" stroke="hsl(var(--primary))" strokeWidth="1.5" />
        <text x="81" y="32" textAnchor="middle" fontSize="13" fontWeight="600" fill="hsl(var(--primary))">Quiz</text>
        <text x="81" y="58" textAnchor="middle" fontSize="10.5" fill="hsl(var(--foreground))">Donne un résultat</text>
        <text x="81" y="73" textAnchor="middle" fontSize="10.5" fill="hsl(var(--muted-foreground))">à la personne</text>
        <text x="81" y="103" textAnchor="middle" fontSize="10" fill="hsl(var(--foreground))">Attire et</text>
        <text x="81" y="117" textAnchor="middle" fontSize="10" fontWeight="600" fill="hsl(var(--foreground))">capte des leads</text>
        <rect x="166" y="8" width="146" height="134" rx="12" fill="hsl(var(--surface-soft))" stroke="hsl(var(--primary))" strokeWidth="1.5" />
        <text x="239" y="32" textAnchor="middle" fontSize="13" fontWeight="600" fill="hsl(var(--primary))">Sondage</text>
        <text x="239" y="58" textAnchor="middle" fontSize="10.5" fill="hsl(var(--foreground))">Te sert TOI</text>
        <text x="239" y="73" textAnchor="middle" fontSize="10.5" fill="hsl(var(--muted-foreground))">écoute ta cible</text>
        <text x="239" y="103" textAnchor="middle" fontSize="10" fill="hsl(var(--foreground))">Tu comprends,</text>
        <text x="239" y="117" textAnchor="middle" fontSize="10" fontWeight="600" fill="hsl(var(--foreground))">tu ne devines plus</text>
      </svg>
    </Frame>
  );
}

// Bonus 105 : la regle des 7 contacts (on doit te voir ~7 fois avant d'agir).
function Regle7Contacts() {
  return (
    <Frame caption="La règle des 7 contacts : poste régulièrement, la confiance vient avec la répétition.">
      <svg viewBox="0 0 320 96" className="w-full" role="img" aria-label="La règle des sept contacts">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const x = 26 + i * 38;
          const last = i === 6;
          return (
            <g key={i}>
              {i < 6 && <line x1={x + 12} y1="40" x2={x + 26} y2="40" stroke="hsl(var(--border))" strokeWidth="1.5" />}
              <circle cx={x} cy="40" r="12" fill={last ? "hsl(var(--primary))" : "hsl(var(--surface-soft))"} stroke="hsl(var(--primary))" strokeWidth="1.4" />
              <text x={x} y="44" textAnchor="middle" fontSize="10" fill={last ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))"}>{i + 1}</text>
            </g>
          );
        })}
        <text x="160" y="74" textAnchor="middle" fontSize="9.5" fill="hsl(var(--muted-foreground))">on doit te voir ~7 fois avant de te faire confiance</text>
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
    case "trame-resultat":
      return <TrameResultat />;
    case "profil-vs-score":
      return <ProfilVsScore />;
    case "boucle-apprendre":
      return <BoucleApprendre />;
    case "cle-api-pont":
      return <CleApiPont />;
    case "deux-moteurs-viraux":
      return <DeuxMoteursViraux />;
    case "v1-imparfaite":
      return <V1Imparfaite />;
    case "boucle-viralite":
      return <BoucleViralite />;
    case "echelle-confiance":
      return <EchelleConfiance />;
    case "funnel-5-etapes":
      return <Funnel5 />;
    case "offre-auto-liquidante":
      return <OffreAutoLiquidante />;
    case "quiz-vs-sondage":
      return <QuizVsSondage />;
    case "regle-7-contacts":
      return <Regle7Contacts />;
    default:
      return null;
  }
}
