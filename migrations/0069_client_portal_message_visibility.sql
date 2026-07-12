ALTER TABLE client_portal_messages
  ADD COLUMN idempotency_key TEXT NOT NULL DEFAULT '';

UPDATE client_portal_messages
  SET idempotency_key = 'legacy:' || id
  WHERE trim(idempotency_key) = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_portal_messages_idempotency
  ON client_portal_messages(thread_id, actor_type, actor_id, idempotency_key);

ALTER TABLE client_portal_messages
  ADD COLUMN visibility TEXT NOT NULL DEFAULT 'client' CHECK (visibility IN ('client', 'internal'));

CREATE INDEX IF NOT EXISTS idx_client_portal_messages_client_visible
  ON client_portal_messages(thread_id, created_at, id)
  WHERE visibility = 'client';
