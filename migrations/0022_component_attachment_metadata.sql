CREATE TABLE IF NOT EXISTS cost_library_item_variant_attachments (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  price_option_id TEXT,
  item_id TEXT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  storage_bucket TEXT NOT NULL DEFAULT 'component-attachments' CHECK (
    storage_bucket = 'component-attachments'
  ),
  storage_path TEXT NOT NULL CHECK (
    length(trim(storage_path)) > 0
    AND instr(storage_path, '..') = 0
    AND instr(storage_path, '//') = 0
  ),
  file_name TEXT NOT NULL CHECK (length(trim(file_name)) > 0),
  content_type TEXT NOT NULL CHECK (
    content_type IN (
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
  ),
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  attachment_kind TEXT CHECK (
    attachment_kind IS NULL
    OR attachment_kind IN ('pdf', 'excel')
  ),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(metadata_json)
    AND json_type(metadata_json) = 'object'
  ),
  created_by TEXT,
  review_status TEXT NOT NULL DEFAULT 'uploaded' CHECK (
    review_status IN ('uploaded', 'approved', 'rejected', 'superseded')
  ),
  applicable_cost_entry_id TEXT,
  is_current_approved INTEGER NOT NULL DEFAULT 0 CHECK (
    is_current_approved IN (0, 1)
  ),
  reviewed_by TEXT,
  reviewed_at TEXT,
  review_note TEXT,
  superseded_by TEXT REFERENCES cost_library_item_variant_attachments(id) ON DELETE SET NULL,
  review_revision INTEGER NOT NULL DEFAULT 1 CHECK (review_revision > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (storage_bucket, storage_path),
  CHECK (is_current_approved = 0 OR review_status = 'approved'),
  CHECK (
    review_status NOT IN ('approved', 'rejected', 'superseded')
    OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  ),
  CHECK (superseded_by IS NULL OR review_status = 'superseded')
);

CREATE INDEX IF NOT EXISTS idx_cost_library_item_variant_attachments_workspace_path
  ON cost_library_item_variant_attachments(workspace_id, storage_path);

CREATE INDEX IF NOT EXISTS idx_cost_library_item_variant_attachments_workspace_review
  ON cost_library_item_variant_attachments(workspace_id, review_status, is_current_approved);

CREATE INDEX IF NOT EXISTS idx_cost_library_item_variant_attachments_price_option_created
  ON cost_library_item_variant_attachments(price_option_id, created_at DESC)
  WHERE price_option_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cost_library_item_variant_attachments_item_created
  ON cost_library_item_variant_attachments(item_id, created_at DESC)
  WHERE item_id IS NOT NULL;
