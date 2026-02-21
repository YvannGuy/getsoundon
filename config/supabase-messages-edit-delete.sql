-- Exécuter dans l'éditeur SQL Supabase
-- Colonnes pour éditer et supprimer (soft delete) les messages

-- Colonne edited_at : date de dernière modification
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- Colonne deleted_at : soft delete (null = visible, non null = supprimé)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Index pour filtrer les messages non supprimés
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(conversation_id) WHERE deleted_at IS NULL;
