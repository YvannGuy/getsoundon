-- Ajoute la colonne video_url à la table salles pour les vidéos onboarding.
-- Exécuter dans Supabase SQL Editor si la colonne n'existe pas.

ALTER TABLE salles
ADD COLUMN IF NOT EXISTS video_url text;

COMMENT ON COLUMN salles.video_url IS 'URL publique de la vidéo de présentation (optionnel, stockée dans bucket salle-videos).';
