-- Seed the founder email so Philip retains access when closed-beta enforcement is on.
-- Idempotent: UNIQUE(normalized_email) + INSERT OR IGNORE.
INSERT OR IGNORE INTO closed_beta_allowed_emails (
  id,
  normalized_email,
  status,
  invited_by,
  invited_at,
  accepted_at,
  notes,
  metadata_json,
  created_at,
  updated_at
) VALUES (
  'seed-closed-beta-philipjonlewis',
  'philipjonlewis@gmail.com',
  'active',
  NULL,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  'Founder seed for close-beta access',
  '{}',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);
