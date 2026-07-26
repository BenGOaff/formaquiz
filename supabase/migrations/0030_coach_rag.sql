-- ════════════════════════════════════════════════════════════════
-- QUIZING — RAG du coach : base de connaissance vectorielle
-- ════════════════════════════════════════════════════════════════
--
-- Le coach ne peut pas tout embarquer dans son prompt (formation complète
-- ~70k tokens + doc Tiquiz + marketing). On indexe donc ce contenu en
-- "chunks" vectorisés (embeddings locaux, modèle multilingual-e5-small,
-- 384 dimensions) et on ne récupère à chaque question que les passages
-- pertinents (recherche par similarité cosinus).
--
-- IMPORTANT gouvernance : cette table ne doit contenir QUE du contenu
-- destiné aux élèves (formation, doc fonctionnelle Tiquiz). JAMAIS de
-- specs internes, de marges revendeur, de secrets ou de code : tout ce
-- qui est indexé peut ressortir dans une réponse du coach. Le script
-- d'ingestion (scripts/ingest-coach-rag.mjs) applique une liste blanche.
--
-- Conventions Béné : IF NOT EXISTS, RLS activée (aucune policy publique :
-- lecture via la service_role/RPC SECURITY DEFINER), NOTIFY pgrst.

-- Extension pgvector (disponible sur Supabase).
create extension if not exists vector;

create table if not exists coach_chunks (
  id          uuid primary key default gen_random_uuid(),
  -- Origine du chunk (chemin de fichier logique, ex. "formation/j2-...").
  source      text not null,
  -- Titre lisible (fil des titres markdown) pour attribuer l'extrait.
  title       text,
  chunk_index integer not null default 0,
  content     text not null,
  -- 384 = dimension du modèle multilingual-e5-small.
  embedding   vector(384),
  enabled     boolean not null default true,
  updated_at  timestamptz not null default now()
);

alter table coach_chunks enable row level security;
-- Aucune policy : seule la service_role (route coach + ingestion) y accède.

-- Index de recherche approximative (HNSW, cosinus). Rapide même à
-- plusieurs milliers de chunks.
create index if not exists idx_coach_chunks_embedding
  on coach_chunks using hnsw (embedding vector_cosine_ops);

create index if not exists idx_coach_chunks_source on coach_chunks (source);

-- Recherche des chunks les plus proches d'une question. SECURITY DEFINER
-- pour être appelable via la service_role sans exposer la table. Renvoie
-- la similarité cosinus (1 = identique) pour pouvoir seuiller côté appelant.
create or replace function match_coach_chunks(
  query_embedding vector(384),
  match_count int default 6,
  similarity_threshold float default 0.0
)
returns table (
  id uuid,
  source text,
  title text,
  content text,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.source,
    c.title,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from coach_chunks c
  where c.enabled
    and c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) >= similarity_threshold
  order by c.embedding <=> query_embedding
  limit greatest(1, least(match_count, 20));
$$;

-- Recharge le cache de schéma PostgREST.
notify pgrst, 'reload schema';
