-- Optionnel : archivage par utilisateur (pour le filtre "Archivés")
-- Actuellement "Archivés" affiche les demandes avec status = rejected
-- Pour un archivage manuel par l'utilisateur, exécuter ce script :

/*
CREATE TABLE IF NOT EXISTS conversation_archives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  archived_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_archives_user 
  ON conversation_archives(user_id);
*/
