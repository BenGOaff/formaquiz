-- 20260801_affiliate_content_space.sql
--
-- Espace Contenu de l'affilié (Affiliation > Contenu), aligné sur celui de
-- affiliate.tipote.com. Deux besoins :
--
-- 1. Personnalisation des POSTS réseaux, exactement comme les emails le
--    sont déjà depuis 0024. Clé = identifiant du post dans le kit
--    ("atelier-post-03"), valeur = le texte réécrit par l'affilié.
--    Absence de clé = il utilise le texte d'origine. RLS profiles déjà en
--    place : l'affilié ne modifie que sa ligne.
--
-- 2. Comptage des générations du rédacteur IA, pour le quota journalier.
--    On trace une ligne par génération plutôt qu'un compteur sur le
--    profil : un compteur ne sait pas se remettre à zéro tout seul à
--    minuit, et ne dit pas ce qui a été généré si on veut regarder plus
--    tard ce que les affiliés demandent le plus.

alter table public.profiles
  add column if not exists affiliate_post_overrides jsonb not null default '{}'::jsonb;

create table if not exists public.affiliate_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  format text not null,
  created_at timestamptz not null default now()
);

-- Le quota se lit toujours par (user, jour) : c'est l'index qui compte.
create index if not exists idx_affiliate_generations_user_created
  on public.affiliate_generations (user_id, created_at desc);

alter table public.affiliate_generations enable row level security;

drop policy if exists "own affiliate generations" on public.affiliate_generations;
create policy "own affiliate generations" on public.affiliate_generations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
