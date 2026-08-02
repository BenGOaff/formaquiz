-- 20260802_coach_guests.sql
--
-- Le coach commun, ouvert aux apps de l'écosystème (demande Béné,
-- 2 août 2026) : "un coach commun qui peut lire partout et la
-- conversation suit d'une app à l'autre."
--
-- Deux populations, deux stockages :
--
--   - ÉLÈVE de l'Atelier : rien de nouveau ici. Ses messages venus de
--     Tiquiz sont écrits dans SON fil existant (coach_threads /
--     coach_messages, clé = son user_id Atelier). C'est ce qui fait que
--     la conversation suit vraiment : il pose une question dans Tiquiz,
--     il la retrouve dans l'Atelier, et le coach s'en souvient.
--
--   - NON-ÉLÈVE : il n'a pas de compte Atelier, donc pas de user_id.
--     Son fil vit ici, indexé par email. 2 questions par jour
--     (lib/coach/needRouting.ts), puis le coach l'oriente vers un plan
--     Tiquiz (blocage technique) ou vers l'Atelier (blocage de méthode).
--
-- Table interne : AUCUNE politique RLS permissive. Elle n'est lue et
-- écrite que par la service_role, depuis l'endpoint partenaire
-- authentifié par le secret partagé. Un non-élève n'a pas de session
-- Atelier, il ne doit jamais pouvoir lire cette table directement.

create table if not exists public.coach_guest_messages (
  id         uuid        primary key default gen_random_uuid(),
  email      text        not null,
  -- App d'où vient le message ("tiquiz", "tipote"). Sert au contexte du
  -- coach et aux statistiques, jamais à isoler les fils : la
  -- conversation est UNE, quelle que soit l'app.
  app        text        not null default 'tiquiz',
  role       text        not null check (role in ('user', 'assistant')),
  content    text        not null,
  created_at timestamptz not null default now()
);

-- Lecture du fil (par email, dans l'ordre) et comptage des questions du
-- jour : les deux passent par cet index.
create index if not exists idx_coach_guest_messages_email_created
  on public.coach_guest_messages (email, created_at);

alter table public.coach_guest_messages enable row level security;
-- Pas de policy : RLS activée sans policy = personne ne passe, sauf la
-- service_role qui la contourne par conception. C'est voulu.

notify pgrst, 'reload schema';
