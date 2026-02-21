-- Exécuter dans l'éditeur SQL Supabase
-- Préférences utilisateur par conversation : archiver / supprimer
-- Si l'autre personne envoie un message, archived_at et deleted_at sont remis à null (déarchivage auto)

CREATE TABLE IF NOT EXISTS user_conversation_preferences (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_ucp_user_archived ON user_conversation_preferences(user_id) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ucp_user_deleted ON user_conversation_preferences(user_id) WHERE deleted_at IS NOT NULL;

ALTER TABLE user_conversation_preferences ENABLE ROW LEVEL SECURITY;

-- RLS : chaque utilisateur ne voit que ses propres préférences
CREATE POLICY "ucp_select_own"
  ON user_conversation_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "ucp_insert_own"
  ON user_conversation_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ucp_update_own"
  ON user_conversation_preferences FOR UPDATE
  USING (user_id = auth.uid());
