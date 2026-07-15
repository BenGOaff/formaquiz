// components/figures/Figure.tsx
// Schemas des jours. Rendu en HTML/CSS (classes .fig-* dans globals.css)
// et non en SVG a coordonnees fixes : les cases s'adaptent au texte, il n'y
// a donc AUCUN debordement, c'est responsive et theme-aware. Composant pur
// (pas de hooks), utilisable en rendu serveur (RichContent).
import { Fragment } from "react";
import type { ReactNode } from "react";

type Tone = "soft" | "solid" | "muted";

function Frame({
  children,
  caption,
  source,
}: {
  children: ReactNode;
  caption?: string;
  source?: string;
}) {
  return (
    <figure className="fig">
      {children}
      {(caption || source) && (
        <figcaption className="fig__cap">
          {caption}
          {source && <span className="fig__src">Source : {source}</span>}
        </figcaption>
      )}
    </figure>
  );
}

function Box({ title, sub, tone = "soft" }: { title: string; sub?: string; tone?: Tone }) {
  const cls =
    tone === "solid" ? "fig-box fig-box--solid" : tone === "muted" ? "fig-box fig-box--muted" : "fig-box";
  return (
    <div className={cls}>
      <div className="fig-box__t">{title}</div>
      {sub && <div className="fig-box__s">{sub}</div>}
    </div>
  );
}

function Arrow() {
  return (
    <span className="fig-arrow" aria-hidden="true">
      <span className="h">{"→"}</span>
      <span className="v">{"↓"}</span>
    </span>
  );
}

function Flow({
  items,
  loopNote,
}: {
  items: { title: string; sub?: string; tone?: Tone }[];
  loopNote?: string;
}) {
  return (
    <div className="fig__body">
      <div className="fig-row">
        {items.map((it, i) => (
          <Fragment key={i}>
            <Box title={it.title} sub={it.sub} tone={it.tone} />
            {i < items.length - 1 && <Arrow />}
          </Fragment>
        ))}
      </div>
      {loopNote && <div className="fig-note">{"↻"} {loopNote}</div>}
    </div>
  );
}

function CompareCard({ title, lines }: { title: string; lines: { t: string; muted?: boolean }[] }) {
  return (
    <div className="fig-card">
      <div className="fig-card__t">{title}</div>
      {lines.map((l, i) => (
        <div key={i} className={l.muted ? "fig-card__l fig-card__l--muted" : "fig-card__l"}>
          {l.t}
        </div>
      ))}
    </div>
  );
}

function Compare({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="fig__body">
      <div className="fig-grid2">
        {left}
        {right}
      </div>
    </div>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="fig-steps">
      {items.map((t, i) => (
        <li key={i} className="fig-step">
          <span className="fig-num">{i + 1}</span>
          <span className="fig-step__t">{t}</span>
        </li>
      ))}
    </ol>
  );
}

// ── J0 : la boucle apprendre en faisant ──
function BoucleApprendre() {
  return (
    <Frame caption="Ici, tu n'apprends pas en regardant : chaque jour, tu comprends puis tu agis, et ça débloque la suite.">
      <Flow
        items={[
          { title: "Vidéo", sub: "tu comprends" },
          { title: "Quiz", sub: "tu agis sur TON projet" },
          { title: "Jour suivant", sub: "débloqué" },
        ]}
        loopNote="et on recommence, un jour après l'autre"
      />
    </Frame>
  );
}

// ── J1 : maths du quiz (page de capture contre quiz) ──
function QuizMaths() {
  return (
    <Frame
      caption="Sur 100 visiteurs, une page de capture en transforme 2 à 3, un bon quiz environ 30."
      source="Repères de la formation ; ex. Beardbrand a capté 150 000 emails avec un quiz."
    >
      <div className="fig__body">
        <div className="fig-bars">
          <div className="fig-bar">
            <span className="fig-bar__n" style={{ color: "hsl(var(--muted-foreground))" }}>
              2
            </span>
            <span
              className="fig-bar__v"
              style={{ height: "1.6rem", background: "hsl(var(--muted-foreground) / 0.4)" }}
            />
            <span className="fig-bar__l">Page de capture</span>
          </div>
          <div className="fig-bar">
            <span className="fig-bar__n" style={{ color: "hsl(var(--primary))" }}>
              30
            </span>
            <span className="fig-bar__v" style={{ height: "6.5rem", background: "hsl(var(--primary))" }} />
            <span className="fig-bar__l">Quiz</span>
          </div>
        </div>
      </div>
    </Frame>
  );
}

// ── J1 : quiz de profil contre quiz de score ──
function ProfilVsScore() {
  return (
    <Frame caption="Deux sortes de quiz : le profil révèle une identité et se partage, le score situe un niveau et donne envie de progresser.">
      <Compare
        left={
          <CompareCard
            title="Profil"
            lines={[
              { t: "Range la personne dans un type" },
              { t: "« Le Bâtisseur »", muted: true },
              { t: "Fait pour être partagé" },
            ]}
          />
        }
        right={
          <CompareCard
            title="Score"
            lines={[
              { t: "Situe sur un niveau" },
              { t: "Débutant, Confirmé, Expert", muted: true },
              { t: "Donne envie de progresser" },
            ]}
          />
        }
      />
    </Frame>
  );
}

// ── J1 : la trame d'un resultat qui vend (concept phare) ──
function TrameResultat() {
  return (
    <Frame caption="La trame d'un résultat qui vend sans vendre : il retourne le couteau, gentiment.">
      <div className="fig__body">
        <Steps
          items={[
            "Encourage le rêve",
            "Déculpabilise l'échec passé",
            "Apaise la peur",
            "Confirme un soupçon",
            "Désigne le vrai coupable",
          ]}
        />
        <div className="fig-highlight">
          Le coupable : une méthode, un mythe. <strong>Jamais ton client.</strong>
        </div>
        <div className="fig-note">
          Ex : « Tu n'es pas désorganisé. On t'a vendu des méthodes faites pour des robots, pas pour
          toi. »
        </div>
      </div>
    </Frame>
  );
}

// ── J2 : la cle API, pont Tiquiz - Systeme.io ──
function CleApiPont() {
  return (
    <Frame caption="La clé API relie ton quiz à Systeme.io : chaque contact capté arrive rangé, tout seul.">
      <div className="fig__body">
        <div className="fig-row">
          <Box tone="solid" title="Tiquiz" />
          <span
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem" }}
          >
            <Arrow />
            <span
              style={{
                fontSize: "0.68rem",
                border: "1px solid hsl(var(--primary) / 0.5)",
                borderRadius: "999px",
                padding: "0.05rem 0.45rem",
                color: "hsl(var(--primary))",
                background: "hsl(var(--surface-soft))",
                whiteSpace: "nowrap",
              }}
            >
              clé API
            </span>
          </span>
          <Box title="Systeme.io" />
        </div>
      </div>
    </Frame>
  );
}

// ── J2 : la chaine resultat, tag, segment, offre ──
function Chaine() {
  return (
    <Frame caption="La chaîne qui fait qu'un quiz rapporte : chaque résultat mène à une offre.">
      <Flow
        items={[{ title: "Résultat" }, { title: "Tag" }, { title: "Segment" }, { title: "Offre" }]}
      />
    </Frame>
  );
}

// ── J3 : les 2 moteurs viraux ──
function DeuxMoteursViraux() {
  return (
    <Frame caption="Un bon quiz a deux moteurs : on le finit (tu captes), on le partage (ça t'amène du monde).">
      <div className="fig__body">
        <div className="fig-branch">
          <div className="fig-branch__solo">
            <Box tone="solid" title="Ton quiz" />
          </div>
          <Arrow />
          <div className="fig-branch__stack">
            <Box title="On le FINIT" sub="tu récupères son email" />
            <Box title="On le PARTAGE" sub="de nouveaux visiteurs arrivent" />
          </div>
        </div>
      </div>
    </Frame>
  );
}

// ── J4 : publier une v1 imparfaite ──
function V1Imparfaite() {
  return (
    <Frame caption="Un quiz en ligne, même imparfait, bat un quiz parfait resté dans ta tête.">
      <Compare
        left={
          <CompareCard
            title="Parfait, dans ta tête"
            lines={[
              { t: "0 lead capté" },
              { t: "jamais publié", muted: true },
            ]}
          />
        }
        right={
          <CompareCard
            title="Imparfait, en ligne"
            lines={[
              { t: "ça capte déjà" },
              { t: "tu l'améliores après", muted: true },
            ]}
          />
        }
      />
    </Frame>
  );
}

// ── J4 / bonus vendre : page de resultat en 4 temps ──
function PageResultat() {
  return (
    <Frame caption="Ta page de résultat qui convertit, sans forcer : elle diagnostique puis propose.">
      <Steps
        items={[
          "Le miroir : voici où tu en es",
          "La cause cachée : pourquoi tu bloques (ce n'est pas ta faute)",
          "Le chemin : ce qu'un profil comme toi doit faire",
          "Le pont vers ton offre",
        ]}
      />
    </Frame>
  );
}

// ── J5 : la boucle d'auto-viralite ──
function BoucleViralite() {
  return (
    <Frame caption="La boucle d'auto-viralité : chaque visiteur qui veut le bonus t'en ramène un autre.">
      <Flow
        items={[
          { title: "Il finit le quiz" },
          { title: "Il veut le bonus" },
          { title: "Il partage 1 fois" },
          { title: "Un proche vient" },
        ]}
        loopNote="et ça repart, tout seul"
      />
    </Frame>
  );
}

// ── J6 : l'echelle de confiance ──
function EchelleConfiance() {
  const stairs = [
    { label: "Lead", h: "1.8rem" },
    { label: "Il te voit souvent", h: "3.2rem" },
    { label: "Confiance", h: "4.6rem" },
    { label: "Achat", h: "6rem" },
  ];
  return (
    <Frame
      caption="Plus tes leads te voient, plus ils te font confiance. Et on achète à qui on fait confiance."
      source="Bain & Company : +5% de rétention client = +25 à 95% de profit."
    >
      <div className="fig__body">
        <div className="fig-stairs">
          {stairs.map((s, i) => (
            <div key={s.label} className="fig-stair">
              <span className="fig-stair__l">{s.label}</span>
              <span
                className={i === stairs.length - 1 ? "fig-stair__v fig-stair__v--last" : "fig-stair__v"}
                style={{ height: s.h }}
              />
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

// ── J7 : le funnel en 5 etapes ──
function Funnel5() {
  const rows = [
    { label: "Vues", w: "100%" },
    { label: "Démarrages", w: "82%" },
    { label: "Finis", w: "64%" },
    { label: "Captures", w: "46%" },
    { label: "Ventes", w: "30%" },
  ];
  return (
    <Frame caption="À chaque étape, des gens s'arrêtent. Répare d'abord la marche où tu perds le plus de monde.">
      <div className="fig__body">
        <div className="fig-funnel">
          {rows.map((r, i) => (
            <div
              key={r.label}
              className={i === rows.length - 1 ? "fig-funnel__row fig-funnel__row--last" : "fig-funnel__row"}
              style={{ width: r.w }}
            >
              {r.label}
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

// ── Bonus trafic payant : l'offre auto-liquidante ──
function OffreAutoLiquidante() {
  return (
    <Frame
      caption="Ses ventes remboursent ta pub, donc tes leads te reviennent gratuits. La pub passe de pari à robinet."
      source="Dropbox : des leads à ~0,25€ avec ce mécanisme."
    >
      <Flow
        items={[
          { title: "Pub", sub: "tu dépenses 10€" },
          { title: "Petite offre", sub: "te rend ~10€" },
          { title: "Leads", sub: "gratuits", tone: "solid" },
        ]}
      />
    </Frame>
  );
}

// ── Bonus sondages : quiz contre sondage ──
function QuizVsSondage() {
  return (
    <Frame
      caption="Le quiz donne un résultat à la personne et capte. Le sondage, lui, te sert : il écoute ta cible."
      source="Méthode ASK (Ryan Levesque) : 100 M$ générés en interrogeant la cible d'abord."
    >
      <Compare
        left={
          <CompareCard
            title="Quiz"
            lines={[
              { t: "Donne un résultat à la personne" },
              { t: "Attire et capte des leads" },
            ]}
          />
        }
        right={
          <CompareCard
            title="Sondage"
            lines={[
              { t: "Te sert TOI" },
              { t: "Écoute ta cible, tu ne devines plus" },
            ]}
          />
        }
      />
    </Frame>
  );
}

// ── Bonus popquiz : capture au pic de curiosite ──
function CapturePic() {
  return (
    <Frame caption="Place la demande d'email juste avant la révélation, quand la curiosité est au sommet.">
      <div className="fig__body">
        <div className="fig-track">
          <span className="fig-track__lab" style={{ left: "80%" }}>
            Demande l'email ici
          </span>
          <span className="fig-track__mark" style={{ left: "80%" }} />
        </div>
        <div className="fig-track__ends">
          <span>Début de la vidéo</span>
          <span>Révélation</span>
        </div>
      </div>
    </Frame>
  );
}

// ── Bonus reseaux : la regle des 7 contacts ──
function Regle7Contacts() {
  return (
    <Frame caption="La règle des 7 contacts : poste régulièrement, la confiance vient avec la répétition.">
      <div className="fig__body">
        <div className="fig-dots">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <span key={n} className={n === 7 ? "fig-dot fig-dot--on" : "fig-dot"}>
              {n}
            </span>
          ))}
        </div>
        <div className="fig-note">on doit te voir ~7 fois avant de te faire confiance</div>
      </div>
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
