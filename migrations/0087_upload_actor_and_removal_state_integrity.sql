CREATE TABLE __0087_assertion (
  value INTEGER NOT NULL
);

CREATE TRIGGER __0087_assertion_fail
BEFORE INSERT ON __0087_assertion
WHEN NEW.value <> 0
BEGIN
  SELECT RAISE(ROLLBACK, 'upload_actor_and_removal_state_integrity_preflight_failed');
END;

INSERT INTO __0087_assertion (value)
SELECT 1
WHERE EXISTS (
  SELECT 1
  FROM upload_assets asset
  INNER JOIN upload_sessions session ON session.id = asset.upload_session_id
  WHERE asset.actor_user_id IS NOT session.actor_user_id
     OR asset.workspace_id IS NOT session.workspace_id
     OR asset.surface IS NOT session.surface
     OR asset.storage_bucket IS NOT session.storage_bucket
     OR asset.storage_path IS NOT session.storage_path
);

DROP TRIGGER IF EXISTS upload_assets_session_integrity_insert;
DROP TRIGGER IF EXISTS upload_assets_session_integrity_update;

CREATE TRIGGER upload_assets_session_integrity_insert
BEFORE INSERT ON upload_assets
BEGIN
  SELECT CASE
    WHEN NEW.upload_session_id IS NULL THEN RAISE(ABORT, 'upload asset requires a session')
    WHEN NOT EXISTS (
      SELECT 1
      FROM upload_sessions session
      WHERE session.id = NEW.upload_session_id
        AND session.actor_user_id IS NEW.actor_user_id
        AND session.workspace_id IS NEW.workspace_id
        AND session.surface IS NEW.surface
        AND session.storage_bucket IS NEW.storage_bucket
        AND session.storage_path IS NEW.storage_path
    ) THEN RAISE(ABORT, 'upload asset session metadata mismatch')
  END;
END;

CREATE TRIGGER upload_assets_session_integrity_update
BEFORE UPDATE OF upload_session_id, actor_user_id, workspace_id, surface, storage_bucket, storage_path ON upload_assets
BEGIN
  SELECT CASE
    WHEN NEW.upload_session_id IS NULL THEN RAISE(ABORT, 'upload asset requires a session')
    WHEN NOT EXISTS (
      SELECT 1
      FROM upload_sessions session
      WHERE session.id = NEW.upload_session_id
        AND session.actor_user_id IS NEW.actor_user_id
        AND session.workspace_id IS NEW.workspace_id
        AND session.surface IS NEW.surface
        AND session.storage_bucket IS NEW.storage_bucket
        AND session.storage_path IS NEW.storage_path
    ) THEN RAISE(ABORT, 'upload asset session metadata mismatch')
  END;
END;

CREATE TRIGGER upload_sessions_asset_integrity_update
BEFORE UPDATE OF actor_user_id, workspace_id, surface, storage_bucket, storage_path ON upload_sessions
WHEN EXISTS (
  SELECT 1
  FROM upload_assets asset
  WHERE asset.upload_session_id = OLD.id
    AND (
      asset.actor_user_id IS NOT NEW.actor_user_id
      OR asset.workspace_id IS NOT NEW.workspace_id
      OR asset.surface IS NOT NEW.surface
      OR asset.storage_bucket IS NOT NEW.storage_bucket
      OR asset.storage_path IS NOT NEW.storage_path
    )
)
BEGIN
  SELECT RAISE(ABORT, 'upload session asset metadata mismatch');
END;

CREATE TRIGGER upload_assets_removed_cleanup_state_insert
AFTER INSERT ON upload_assets
WHEN NEW.status IN ('removed', 'deleted')
  AND NEW.purge_state = 'active'
BEGIN
  UPDATE upload_assets
  SET removal_claim_id = COALESCE(
        removal_claim_id,
        'status-transition:' || NEW.id || ':' || NEW.updated_at
      ),
      removal_claimed_at = COALESCE(removal_claimed_at, NEW.updated_at),
      cleanup_not_before = COALESCE(
        cleanup_not_before,
        strftime('%Y-%m-%dT%H:%M:%fZ', NEW.updated_at, '+5 minutes'),
        NEW.updated_at
      ),
      purge_state = 'pending',
      purged_at = NULL
  WHERE id = NEW.id;
END;

CREATE TRIGGER upload_assets_removed_cleanup_state_update
AFTER UPDATE OF status ON upload_assets
WHEN NEW.status IN ('removed', 'deleted')
  AND NEW.purge_state = 'active'
BEGIN
  UPDATE upload_assets
  SET removal_claim_id = COALESCE(
        removal_claim_id,
        'status-transition:' || NEW.id || ':' || NEW.updated_at
      ),
      removal_claimed_at = COALESCE(removal_claimed_at, NEW.updated_at),
      cleanup_not_before = COALESCE(
        cleanup_not_before,
        strftime('%Y-%m-%dT%H:%M:%fZ', NEW.updated_at, '+5 minutes'),
        NEW.updated_at
      ),
      purge_state = 'pending',
      purged_at = NULL
  WHERE id = NEW.id;
END;

CREATE TRIGGER upload_assets_prevent_resurrection
BEFORE UPDATE OF status ON upload_assets
WHEN (
  OLD.status IN ('removed', 'deleted')
  OR OLD.purge_state IN ('pending', 'purged')
)
  AND NEW.status IN ('reserved', 'pending', 'finalized')
BEGIN
  SELECT RAISE(ABORT, 'removed upload asset cannot be reactivated');
END;

INSERT INTO __0087_assertion (value)
SELECT 1
WHERE EXISTS (SELECT 1 FROM pragma_foreign_key_check);

DROP TRIGGER __0087_assertion_fail;
DROP TABLE __0087_assertion;
