CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  email TEXT NOT NULL UNIQUE CHECK (
    length(trim(email)) > 0
    AND email = lower(trim(email))
  ),
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('ceo', 'admin', 'member')),
  default_workspace_id TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON profiles(email);

CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON profiles(role);

CREATE INDEX IF NOT EXISTS idx_profiles_default_workspace
  ON profiles(default_workspace_id);
