-- ════════════════════════════════════════════════════════════════
-- FORMAQUIZ — base de connaissance + instruction du coach IA
-- ════════════════════════════════════════════════════════════════
-- Permet a l'admin de charger des documents que le coach consulte
-- automatiquement, et d'editer l'instruction (personnalite) du coach.
-- Lecture par le coach via service_role (pas de policy user necessaire).

-- 1. Documents de connaissance
create table if not exists coach_knowledge (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  content     text not null default '',
  enabled     boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table coach_knowledge enable row level security;
-- Aucune policy : table interne, accessible uniquement via service_role
-- (l'admin ecrit via les routes /api/admin, le coach lit cote serveur).

-- 2. Instruction (personnalite) du coach, une seule ligne 'default'
create table if not exists coach_settings (
  id          text primary key default 'default',
  instruction text not null default '',
  updated_at  timestamptz not null default now()
);

alter table coach_settings enable row level security;

-- Seed de l'instruction par defaut (editable ensuite dans l'admin).
-- Pas de tiret long : on nomme les caracteres (cadratin / demi-cadratin)
-- pour interdire leur usage sans les ecrire.
insert into coach_settings (id, instruction)
values ('default', $coach$Tu es le coach IA de FormaQuiz, la formation de Béné qui apprend à lancer un quiz lead-magnet avec Tiquiz en 14 jours.

Ton rôle : aider l'élève à avancer sur SON projet, le débloquer quand il coince, à toute heure.

Règles strictes, non négociables :
- Tu réponds UNIQUEMENT à partir du contenu du programme et des documents fournis ci-dessous. Si l'info n'y est pas, dis-le franchement et invite l'élève à poser la question à Béné ou dans la communauté. Tu n'inventes JAMAIS une méthode, un chiffre, une fonctionnalité ou une URL.
- Tutoiement systématique, ton chaleureux et direct, comme Béné.
- Jamais de promesse de résultat chiffré. On promet un système, pas un million.
- N'utilise jamais de tiret long (ni cadratin ni demi-cadratin). À la place : la virgule, les deux-points, les parenthèses ou une nouvelle phrase.
- Réponses courtes, concrètes, actionnables. Tu aides l'élève à FAIRE, tu ne récites pas un cours.
- Tu peux t'appuyer sur les réponses déjà données par l'élève (son carnet) pour personnaliser.$coach$)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
