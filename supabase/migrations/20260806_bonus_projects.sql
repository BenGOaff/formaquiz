-- 20260806_bonus_projects.sql
--
-- LES BONUS CRÉÉS SE RETROUVENT.
--
-- Béné, 6 août 2026 : "un truc pas super logique : le générateur de
-- bonus est top MAIS on ne peut pas retrouver ce qu'on a créé ? On peut
-- faire en sorte que l'étudiant puisse retrouver ce qu'il a créé
-- directement ? En plus du générateur actuel pour en générer d'autres."
--
-- Elle a raison, et c'était pire que "on ne retrouve pas" : RIEN n'était
-- enregistré. Le brief, les pistes, les trois documents produits vivaient
-- uniquement dans la mémoire de la page. Rafraîchir l'onglet, cliquer sur
-- un lien, fermer le portable : tout disparaissait, sans avertissement,
-- après plusieurs minutes de génération.
--
-- Une ligne par bonus. Un élève en crée autant qu'il veut, et il les
-- retrouve tous.
--
-- Conventions Béné : IF NOT EXISTS partout, RLS activée, NOTIFY pgrst.

create table if not exists public.bonus_projects (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,

  -- Le titre AFFICHÉ dans la liste. Calculé à l'écriture par
  -- `projectTitle()` (lib/bonus/project.ts), jamais vide : un bonus sans
  -- nom dans une liste est un bonus qu'on ne retrouve pas, ce qui est
  -- exactement le problème qu'on corrige.
  title      text        not null default '',
  -- Le quiz d'où il vient, pour s'y retrouver quand on en a plusieurs.
  quiz_title text,

  -- FORMAT LIBRE, VOLONTAIREMENT, comme `generator_briefs`. Ajouter un
  -- champ au générateur ne doit pas demander une migration. Le nettoyage
  -- et les bornes vivent dans lib/bonus/project.ts, testé.
  --   brief  : { offers[], trigger, plan }
  --   pistes : les formats proposés par l'IA
  --   chosen : { index, format, title, punchline }
  --   blocks : { guide, presentation, "content" | "content:<n>" } en markdown
  brief      jsonb       not null default '{}'::jsonb,
  pistes     jsonb       not null default '[]'::jsonb,
  chosen     jsonb,
  blocks     jsonb       not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bonus_projects enable row level security;

-- Chacun ne voit et n'écrit que ses propres bonus.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'bonus_projects'
      and policyname = 'bonus_projects_own_select'
  ) then
    create policy bonus_projects_own_select on public.bonus_projects
      for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'bonus_projects'
      and policyname = 'bonus_projects_own_insert'
  ) then
    create policy bonus_projects_own_insert on public.bonus_projects
      for insert with check (auth.uid() = user_id);
  end if;

  -- L'UPDATE est indispensable : l'enregistrement est un upsert, et sans
  -- politique UPDATE la deuxième sauvegarde échoue en silence (leçon de
  -- `generator_briefs`).
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'bonus_projects'
      and policyname = 'bonus_projects_own_update'
  ) then
    create policy bonus_projects_own_update on public.bonus_projects
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'bonus_projects'
      and policyname = 'bonus_projects_own_delete'
  ) then
    create policy bonus_projects_own_delete on public.bonus_projects
      for delete using (auth.uid() = user_id);
  end if;
end $$;

-- La liste est toujours triée du plus récent au plus ancien.
create index if not exists idx_bonus_projects_user_updated
  on public.bonus_projects (user_id, updated_at desc);

notify pgrst, 'reload schema';
