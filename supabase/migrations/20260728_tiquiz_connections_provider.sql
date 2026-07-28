-- 20260728_tiquiz_connections_provider.sql
-- Pont Atelier <-> Tipote (retour Maurice, 28 juillet 2026) : certains
-- eleves ont leur quiz sur Tipote (app.tipote.com) et pas sur Tiquiz.
-- La connexion memorise desormais SON fournisseur : 'tiquiz' (defaut,
-- toutes les connexions existantes) ou 'tipote'. Le reste de la table ne
-- bouge pas : meme token, memes metriques, meme contrat JSON des deux cotes.
alter table tiquiz_connections
  add column if not exists provider text not null default 'tiquiz';

notify pgrst, 'reload schema';
