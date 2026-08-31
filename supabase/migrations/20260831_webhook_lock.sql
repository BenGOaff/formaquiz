-- 20260831_webhook_lock.sql
--
-- LE RÉESSAI D'UN WEBHOOK DE PAIEMENT DOIT POUVOIR REPASSER.
--
-- Audit de l'Atelier demandé par Béné, 31 août 2026.
--
-- CE QUI NE MARCHAIT PAS
-- ----------------------
-- L'index de la migration initiale couvre TOUS les statuts :
--
--   (source, event_id) where event_id is not null
--
-- Les deux webhooks de paiement écrivaient une ligne `received` AVANT
-- de travailler. Quand le traitement échouait (Supabase indisponible
-- une seconde, Stripe injoignable, `grantAccessByEmail` qui rate), la
-- route répondait 502 pour demander un réessai au fournisseur. Ce
-- réessai retombait sur la ligne `received`, était pris pour un
-- doublon, et recevait un 200.
--
-- Résultat : **une vente encaissée dont le premier traitement rate
-- n'ouvrait JAMAIS l'accès**, et le fournisseur cessait de réessayer.
-- Le symptôme était l'absence de symptôme : la page s'affiche, la carte
-- passe, l'argent arrive, et l'acheteur n'a rien.
--
-- C'est le bug corrigé chez Tiquiz le 24 août. L'Atelier avait gardé
-- l'ancienne mécanique, et c'est ici que ça coûte le plus cher : le
-- panier le plus gros et la commission la plus forte.
--
-- LA CORRECTION, ET SA PRÉCAUTION
-- -------------------------------
-- Le statut fait partie du verrou : une ligne `error` en SORT, donc le
-- réessai suivant peut reprendre.
--
-- MAIS l'index d'origine est PARTAGÉ avec le webhook Systeme.io, qui
-- écrit `received` et ne le change jamais. Lui appliquer le filtre de
-- statut le sortirait de l'index, donc SUPPRIMERAIT sa protection
-- anti-doublon : une relance de Systeme.io rouvrirait un accès et
-- REPAIERAIT une commission. On sépare donc les deux index au lieu d'en
-- modifier un seul.
--
-- Systeme.io n'a pas besoin de l'autre mécanique : sa route ne répond
-- jamais 5xx, donc elle ne demande aucun réessai, donc un conflit y est
-- un vrai doublon.

-- 1. L'index HISTORIQUE, sans les deux sources de paiement.
drop index if exists public.idx_webhook_logs_event_id;

create unique index if not exists idx_webhook_logs_event_id
  on public.webhook_logs (source, event_id)
  where event_id is not null
    and source <> 'stripe'
    and source <> 'paypal';

-- 2. Les lignes de paiement DÉJÀ EN BASE passent en `processed`.
--
-- Sans ça, elles sortiraient de l'index en gardant leur statut
-- `received`, et un réessai tardif les rejouerait. Aucun fournisseur ne
-- réessaie au delà de quelques jours, donc en pratique rien ne change :
-- c'est une ceinture, pas une correction.
update public.webhook_logs
   set status = 'processed'
 where source in ('stripe', 'paypal')
   and status = 'received';

-- 3. Le verrou des paiements : le statut en fait partie.
create unique index if not exists webhook_logs_owner_event_uidx
  on public.webhook_logs (source, event_id)
  where event_id is not null
    and source in ('stripe', 'paypal')
    and status in ('processing', 'processed');

-- Retrouver une vente restée en cours (traitement mort en route) sans
-- balayer toute la table.
--
-- `created_at` et pas `received_at` : cette table n'a pas la même
-- colonne que celle de Tiquiz. Le fichier jumeau recopié tel quel
-- donnait une requête qui échoue, donc un verrou illisible, donc un
-- événement qui ne repasse plus jamais.
create index if not exists webhook_logs_processing_idx
  on public.webhook_logs (source, created_at desc)
  where status = 'processing';

notify pgrst, 'reload schema';
