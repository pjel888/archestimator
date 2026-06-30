CREATE TABLE IF NOT EXISTS upload_sessions (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_user_id TEXT,
  surface TEXT NOT NULL CHECK (surface IN ('project-image', 'component-image', 'component-attachment')),
  target_entity_type TEXT,
  target_entity_id TEXT,
  storage_bucket TEXT NOT NULL CHECK (length(trim(storage_bucket)) > 0),
  storage_path TEXT NOT NULL CHECK (length(trim(storage_path)) > 0),
  file_name TEXT NOT NULL CHECK (length(trim(file_name)) > 0),
  content_type TEXT NOT NULL CHECK (length(trim(content_type)) > 0),
  size_bytes INTEGER NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  checksum_sha256 TEXT CHECK (
    checksum_sha256 IS NULL
    OR (length(checksum_sha256) = 64 AND lower(checksum_sha256) = checksum_sha256)
  ),
  status TEXT NOT NULL CHECK (
    status IN (
      'reserved',
      'pending',
      'finalized',
      'failed',
      'expired',
      'deleted',
      'aborted'
    )
  ),
  expires_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata_json)
    AND json_type(metadata_json) = 'object'
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_upload_sessions_workspace_created
  ON upload_sessions(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_upload_sessions_active_capacity
  ON upload_sessions(workspace_id, surface, actor_user_id, expires_at)
  WHERE status = 'reserved';

CREATE TABLE IF NOT EXISTS upload_assets (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_user_id TEXT,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  estimate_id TEXT REFERENCES estimates(id) ON DELETE SET NULL,
  upload_session_id TEXT,
  surface TEXT NOT NULL CHECK (surface IN ('project-image', 'component-image', 'component-attachment')),
  target_entity_type TEXT,
  target_entity_id TEXT,
  status TEXT NOT NULL CHECK (
    status IN (
      'reserved',
      'pending',
      'finalized',
      'deleted',
      'removed',
      'failed',
      'aborted'
    )
  ),
  file_name TEXT NOT NULL CHECK (length(trim(file_name)) > 0),
  content_type TEXT NOT NULL CHECK (length(trim(content_type)) > 0),
  size_bytes INTEGER NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  checksum_sha256 TEXT CHECK (
    checksum_sha256 IS NULL
    OR (length(checksum_sha256) = 64 AND lower(checksum_sha256) = checksum_sha256)
  ),
  scan_status TEXT CHECK (
    scan_status IS NULL
    OR scan_status IN (
      'pending',
      'not_required',
      'clean',
      'infected',
      'unsupported',
      'failed_transient',
      'failed_permanent',
      'override_approved'
    )
  ),
  scan_provider TEXT,
  scan_result_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(scan_result_json)
    AND json_type(scan_result_json) = 'object'
  ),
  scanned_at TEXT,
  scan_override_actor_user_id TEXT,
  scan_override_reason TEXT,
  scan_override_expires_at TEXT,
  scan_override_checksum_sha256 TEXT,
  storage_bucket TEXT,
  storage_path TEXT,
  thumbnail_path TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata_json)
    AND json_type(metadata_json) = 'object'
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    scan_status <> 'override_approved'
    OR (
      scan_override_actor_user_id IS NOT NULL
      AND length(trim(coalesce(scan_override_reason, ''))) >= 8
      AND scan_override_expires_at IS NOT NULL
      AND scan_override_checksum_sha256 IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_upload_assets_scan_override_queue
  ON upload_assets(surface, status, scan_status, created_at DESC)
  WHERE surface = 'component-attachment'
    AND status = 'finalized'
    AND scan_status IN ('failed_permanent', 'unsupported');

CREATE INDEX IF NOT EXISTS idx_upload_assets_workspace_created
  ON upload_assets(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_upload_assets_project_created
  ON upload_assets(project_id, created_at DESC)
  WHERE project_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS upload_events (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  upload_session_id TEXT,
  upload_asset_id TEXT REFERENCES upload_assets(id) ON DELETE CASCADE,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  actor_user_id TEXT,
  event_type TEXT NOT NULL CHECK (length(trim(event_type)) > 0),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata_json)
    AND json_type(metadata_json) = 'object'
  ),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_upload_events_asset_created
  ON upload_events(upload_asset_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_upload_events_workspace_created
  ON upload_events(workspace_id, created_at DESC);
