-- Table pour les inscriptions Coming Soon
CREATE TABLE IF NOT EXISTS coming_soon_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coming_soon_signups_email ON coming_soon_signups(email);
