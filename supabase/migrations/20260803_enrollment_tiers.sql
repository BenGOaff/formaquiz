-- 20260803_enrollment_tiers.sql
--
-- LES DEUX PALIERS D'ACCÈS À L'ATELIER (campagne pub, 3 août 2026).
--
-- Béné lance une campagne payante avec un tunnel en deux temps :
--    7 € : l'Atelier + le coach + le Quiz Doctor
--   47 € : + les bonus, les templates et le générateur d'email,
--          + 15 jours de Tiquiz Plus (décomptés à la création du 1er quiz)
--
-- `enrollments` était binaire (actif / révoqué) et tout élève actif avait
-- tout. Il lui faut donc un palier.
--
-- LE DÉFAUT EST 'plus', ET C'EST LE POINT CRITIQUE DE CETTE MIGRATION.
-- Toutes les lignes existantes appartiennent à des élèves qui ont payé
-- l'Atelier COMPLET. Un défaut 'standard' leur retirerait, à la seconde
-- où cette migration passe, un accès qu'ils ont acheté. Le sens du défaut
-- n'est pas un détail de style : c'est la différence entre un déploiement
-- silencieux et une journée de support.
--
-- Le code applique la même règle en miroir (lib/access/tiers.ts) :
-- `resolveTier()` ne renvoie 'standard' que sur la valeur exacte, donc
-- même si cette migration n'est pas encore passée en prod, personne ne
-- perd rien.

alter table public.enrollments
  add column if not exists tier text not null default 'plus';

comment on column public.enrollments.tier is
  'Palier d''accès : standard (offre 7 € de la campagne pub) ou plus (Atelier complet, upsell 47 €, et TOUS les élèves d''avant le 3 août 2026). Défaut plus : une ligne sans palier a payé l''Atelier complet.';

-- Trace de l'origine commerciale, pour le support et les stats de campagne
-- ("combien d'acheteurs à 7 € ont pris l'upsell ?"). Purement informatif :
-- aucune décision d'accès ne s'appuie dessus.
alter table public.enrollments
  add column if not exists tier_source text,
  add column if not exists tier_updated_at timestamptz;

comment on column public.enrollments.tier_source is
  'D''où vient le palier actuel (ex. sio_atelier_7, sio_atelier_47, admin). Informatif, jamais utilisé pour décider d''un accès.';

-- On ferme la porte aux valeurs inventées : un palier inconnu en base
-- serait lu comme 'plus' par le code (repli volontairement généreux), donc
-- passerait inaperçu tout en donnant l'upsell gratuitement.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'enrollments_tier_check'
  ) then
    alter table public.enrollments
      add constraint enrollments_tier_check
      check (tier in ('standard', 'plus'));
  end if;
end $$;

-- Les webhooks filtrent souvent sur le palier pour les relances et les
-- stats de campagne. Index partiel : les 'standard' sont la minorité.
create index if not exists enrollments_tier_standard_idx
  on public.enrollments (tier)
  where tier = 'standard';

notify pgrst, 'reload schema';
