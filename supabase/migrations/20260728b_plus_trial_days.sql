-- 20260728b_plus_trial_days.sql
-- Suite de l'operation "20 premiers inscrits" (Bene 28 juillet 2026) :
-- quand les places 2 mois d'un tunnel sont ecoulees, chaque nouvel
-- inscrit recoit d'office 15 jours de Tiquiz Plus (meme mecanique de
-- demarrage a la premiere connexion). On journalise la duree accordee
-- pour distinguer les 2 offres dans l'audit.
ALTER TABLE public.plus_trial_claims
  ADD COLUMN IF NOT EXISTS trial_days INTEGER;

NOTIFY pgrst, 'reload schema';
