-- 20260831_webhook_lock_locked_at.sql
--
-- LE BATTEMENT DE COEUR DU VERROU A SA PROPRE COLONNE.
--
-- Audit de l'Atelier, 31 août 2026, suite de `20260831_webhook_lock.sql`.
--
-- CE QUE LA VERSION PRÉCÉDENTE FAISAIT DE TRAVERS
-- -----------------------------------------------
-- Quand un traitement mourait en route, la reprise repoussait
-- `webhook_logs.created_at` pour que la reprise suivante ne passe pas
-- par dessus la nôtre. C'était le bon geste sur la mauvaise colonne :
--
--   `created_at` EST LA DATE DE LA VENTE partout ailleurs.
--   `buildSales` (lib/checkout/sales.ts) en fait le `paidAt`, et
--   l'écran de pilotage de Béné trie dessus.
--
-- Un réessai déplaçait donc une vente d'août au jour de la reprise, en
-- silence, et la faisait remonter en tête de sa liste de ventes. Le
-- chiffre du mois devenait faux sans qu'aucune ligne ne le dise.
--
-- LA CORRECTION
-- -------------
-- Une colonne dédiée. Elle est NULLABLE : les lignes déjà écrites n'en
-- ont pas, et le code retombe alors sur `created_at`, c'est à dire sur
-- l'ancien comportement. Aucune donnée n'est réécrite.

alter table public.webhook_logs
  add column if not exists locked_at timestamptz;

-- Retrouver une vente restée en cours sans balayer la table. L'index
-- de la migration précédente portait sur `created_at` : il ne sert plus
-- à rien maintenant que la staleness se lit sur `locked_at`.
drop index if exists public.webhook_logs_processing_idx;

create index if not exists webhook_logs_processing_idx
  on public.webhook_logs (source, locked_at desc)
  where status = 'processing';

notify pgrst, 'reload schema';
