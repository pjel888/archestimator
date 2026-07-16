-- Make upload metadata transitions atomic and cleanup terminal without rebuilding
-- upload_assets, whose IDs are referenced by attachment ownership tables.

CREATE TABLE __0084_assertion (
  value INTEGER NOT NULL
);

CREATE TRIGGER __0084_assertion_fail
BEFORE INSERT ON __0084_assertion
WHEN NEW.value <> 0
BEGIN
  SELECT RAISE(ROLLBACK, 'upload_lifecycle_integrity_preflight_failed');
END;

-- finalized upload session is missing an asset
INSERT INTO __0084_assertion (value)
SELECT 1
WHERE EXISTS (
  SELECT 1
  FROM upload_sessions session
  WHERE session.status = 'finalized'
    AND NOT EXISTS (
      SELECT 1
      FROM upload_assets asset
      WHERE asset.upload_session_id = session.id
        AND asset.status IN ('pending', 'finalized', 'removed', 'deleted')
    )
);

-- upload asset is missing its session
INSERT INTO __0084_assertion (value)
SELECT 1
WHERE EXISTS (
  SELECT 1
  FROM upload_assets asset
  WHERE asset.upload_session_id IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM upload_sessions session
       WHERE session.id = asset.upload_session_id
         AND session.workspace_id = asset.workspace_id
         AND session.surface = asset.surface
         AND session.storage_bucket = asset.storage_bucket
         AND session.storage_path = asset.storage_path
     )
);

INSERT INTO __0084_assertion (value)
SELECT 1
WHERE EXISTS (
  SELECT upload_session_id
  FROM upload_assets
  GROUP BY upload_session_id
  HAVING upload_session_id IS NOT NULL AND COUNT(*) > 1
);

INSERT INTO __0084_assertion (value)
SELECT 1
WHERE EXISTS (
  SELECT upload_asset_id, event_type
  FROM upload_events
  WHERE upload_asset_id IS NOT NULL
    AND event_type IN ('asset_finalized', 'scan_pending')
  GROUP BY upload_asset_id, event_type
  HAVING COUNT(*) > 1
);

INSERT INTO __0084_assertion (value)
SELECT 1
WHERE EXISTS (
  SELECT 1
  FROM upload_assets
  WHERE status IN ('reserved', 'pending', 'finalized')
    AND (
      workspace_id IS NULL
      OR storage_bucket IS NULL
      OR length(trim(storage_bucket)) = 0
      OR storage_path IS NULL
      OR length(trim(storage_path)) = 0
    )
);

ALTER TABLE upload_assets ADD COLUMN removal_claim_id TEXT;
ALTER TABLE upload_assets ADD COLUMN removal_claimed_at TEXT;
ALTER TABLE upload_assets ADD COLUMN cleanup_not_before TEXT;
ALTER TABLE upload_assets ADD COLUMN purge_state TEXT NOT NULL DEFAULT 'active'
  CHECK (purge_state IN ('active', 'pending', 'purged'));
ALTER TABLE upload_assets ADD COLUMN purged_at TEXT;

UPDATE upload_assets
SET purge_state = 'pending',
    cleanup_not_before = COALESCE(cleanup_not_before, updated_at)
WHERE status IN ('removed', 'deleted');

CREATE UNIQUE INDEX idx_upload_assets_upload_session_unique
  ON upload_assets(upload_session_id)
  WHERE upload_session_id IS NOT NULL;

CREATE UNIQUE INDEX idx_upload_events_initial_asset_unique
  ON upload_events(upload_asset_id, event_type)
  WHERE upload_asset_id IS NOT NULL
    AND event_type IN ('asset_finalized', 'scan_pending');

CREATE INDEX idx_upload_assets_cleanup_queue
  ON upload_assets(purge_state, cleanup_not_before, updated_at, id)
  WHERE status IN ('removed', 'deleted', 'failed')
    AND purge_state <> 'purged';

CREATE TRIGGER upload_assets_session_integrity_insert
BEFORE INSERT ON upload_assets
BEGIN
  SELECT CASE
    WHEN NEW.upload_session_id IS NULL THEN RAISE(ABORT, 'upload asset requires a session')
    WHEN NOT EXISTS (
      SELECT 1
      FROM upload_sessions session
      WHERE session.id = NEW.upload_session_id
        AND session.workspace_id = NEW.workspace_id
        AND session.surface = NEW.surface
        AND session.storage_bucket = NEW.storage_bucket
        AND session.storage_path = NEW.storage_path
    ) THEN RAISE(ABORT, 'upload asset session metadata mismatch')
  END;
END;

CREATE TRIGGER upload_assets_session_integrity_update
BEFORE UPDATE OF upload_session_id, workspace_id, surface, storage_bucket, storage_path ON upload_assets
BEGIN
  SELECT CASE
    WHEN NEW.upload_session_id IS NULL THEN RAISE(ABORT, 'upload asset requires a session')
    WHEN NOT EXISTS (
      SELECT 1
      FROM upload_sessions session
      WHERE session.id = NEW.upload_session_id
        AND session.workspace_id = NEW.workspace_id
        AND session.surface = NEW.surface
        AND session.storage_bucket = NEW.storage_bucket
        AND session.storage_path = NEW.storage_path
    ) THEN RAISE(ABORT, 'upload asset session metadata mismatch')
  END;
END;

CREATE TRIGGER upload_assets_active_storage_insert
BEFORE INSERT ON upload_assets
WHEN NEW.status IN ('reserved', 'pending', 'finalized')
BEGIN
  SELECT CASE
    WHEN NEW.workspace_id IS NULL
      OR NEW.storage_bucket IS NULL
      OR length(trim(NEW.storage_bucket)) = 0
      OR NEW.storage_path IS NULL
      OR length(trim(NEW.storage_path)) = 0
    THEN RAISE(ABORT, 'active upload asset requires storage metadata')
  END;
END;

CREATE TRIGGER upload_assets_active_storage_update
BEFORE UPDATE OF status, workspace_id, storage_bucket, storage_path ON upload_assets
WHEN NEW.status IN ('reserved', 'pending', 'finalized')
BEGIN
  SELECT CASE
    WHEN NEW.workspace_id IS NULL
      OR NEW.storage_bucket IS NULL
      OR length(trim(NEW.storage_bucket)) = 0
      OR NEW.storage_path IS NULL
      OR length(trim(NEW.storage_path)) = 0
    THEN RAISE(ABORT, 'active upload asset requires storage metadata')
  END;
END;

CREATE TABLE upload_asset_cleanup_objects (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  upload_asset_id TEXT NOT NULL REFERENCES upload_assets(id) ON DELETE CASCADE,
  storage_bucket TEXT NOT NULL CHECK (length(trim(storage_bucket)) > 0),
  storage_path TEXT NOT NULL CHECK (length(trim(storage_path)) > 0),
  result TEXT NOT NULL DEFAULT 'pending' CHECK (
    result IN ('pending', 'removed', 'failed', 'retained')
  ),
  cleanup_run_id TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error_sha256 TEXT CHECK (
    last_error_sha256 IS NULL OR length(last_error_sha256) = 64
  ),
  first_attempted_at TEXT,
  last_attempted_at TEXT,
  removed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (upload_asset_id, storage_bucket, storage_path)
);

CREATE INDEX idx_upload_asset_cleanup_objects_result
  ON upload_asset_cleanup_objects(result, updated_at, upload_asset_id);

INSERT INTO upload_events (
  id,
  upload_session_id,
  upload_asset_id,
  workspace_id,
  actor_user_id,
  event_type,
  metadata_json,
  created_at
)
SELECT
  'reconciled-finalization-' || asset.id,
  asset.upload_session_id,
  asset.id,
  asset.workspace_id,
  asset.actor_user_id,
  CASE WHEN asset.scan_status = 'pending' THEN 'scan_pending' ELSE 'asset_finalized' END,
  json_object('reconciledByMigration', '0084'),
  asset.updated_at
FROM upload_assets asset
WHERE asset.status = 'finalized'
  AND NOT EXISTS (
    SELECT 1
    FROM upload_events event
    WHERE event.upload_asset_id = asset.id
      AND event.event_type IN ('asset_finalized', 'scan_pending')
  );

INSERT INTO __0084_assertion (value)
SELECT 1
WHERE EXISTS (SELECT 1 FROM pragma_foreign_key_check);

DROP TRIGGER __0084_assertion_fail;
DROP TABLE __0084_assertion;
