CREATE TABLE __0076_assertion (
  value INTEGER NOT NULL
);

CREATE TRIGGER __0076_assertion_fail
BEFORE INSERT ON __0076_assertion
WHEN NEW.value <> 0
BEGIN
  SELECT RAISE(ROLLBACK, 'component_attachment_ownership_preflight_failed');
END;

INSERT INTO __0076_assertion (value)
SELECT 1
WHERE EXISTS (
  SELECT 1
  FROM cost_library_item_variant_attachments attachment
  WHERE attachment.item_id IS NULL
     OR attachment.price_option_id IS NULL
     OR length(trim(attachment.item_id)) = 0
     OR length(trim(attachment.price_option_id)) = 0
     OR attachment.workspace_id NOT IN (SELECT id FROM workspaces)
     OR NOT EXISTS (
       SELECT 1
       FROM cost_library_item_price_options price_option
       WHERE price_option.id = attachment.price_option_id
         AND price_option.item_id = attachment.item_id
         AND price_option.workspace_id = attachment.workspace_id
     )
);

INSERT INTO __0076_assertion (value)
SELECT 1
WHERE EXISTS (
  SELECT 1
  FROM cost_library_item_variant_attachments attachment
  WHERE (
    SELECT COUNT(*)
    FROM upload_assets asset
    WHERE asset.workspace_id = attachment.workspace_id
      AND asset.surface = 'component-attachment'
      AND asset.status = 'finalized'
      AND asset.storage_bucket = attachment.storage_bucket
      AND asset.storage_path = attachment.storage_path
      AND asset.file_name = attachment.file_name
      AND asset.content_type = attachment.content_type
      AND asset.size_bytes = attachment.size_bytes
  ) <> 1
);

INSERT INTO __0076_assertion (value)
SELECT 1
WHERE EXISTS (
  SELECT 1
  FROM cost_library_item_variant_attachments attachment
  WHERE attachment.applicable_cost_entry_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM cost_library_item_variant_cost_entries cost_entry
      WHERE cost_entry.id = attachment.applicable_cost_entry_id
        AND cost_entry.workspace_id = attachment.workspace_id
        AND cost_entry.item_id = attachment.item_id
        AND cost_entry.price_option_id = attachment.price_option_id
    )
);

INSERT INTO __0076_assertion (value)
SELECT 1
WHERE EXISTS (
  SELECT 1
  FROM cost_library_item_variant_attachments attachment
  WHERE attachment.superseded_by IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM cost_library_item_variant_attachments replacement
      WHERE replacement.id = attachment.superseded_by
        AND replacement.workspace_id = attachment.workspace_id
        AND replacement.item_id = attachment.item_id
        AND replacement.price_option_id = attachment.price_option_id
        AND replacement.applicable_cost_entry_id IS attachment.applicable_cost_entry_id
    )
);

CREATE TABLE component_variant_attachments__0076 (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  owner_scope TEXT NOT NULL CHECK (owner_scope IN ('library', 'project')),
  price_option_id TEXT NOT NULL CHECK (length(trim(price_option_id)) > 0),
  item_id TEXT,
  project_id TEXT,
  project_component_id TEXT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  upload_asset_id TEXT NOT NULL UNIQUE REFERENCES upload_assets(id) ON DELETE RESTRICT,
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
  applicable_cost_entry_id TEXT REFERENCES cost_library_item_variant_cost_entries(id) ON DELETE SET NULL,
  is_current_approved INTEGER NOT NULL DEFAULT 0 CHECK (
    is_current_approved IN (0, 1)
  ),
  reviewed_by TEXT,
  reviewed_at TEXT,
  review_note TEXT,
  superseded_by TEXT REFERENCES component_variant_attachments__0076(id) ON DELETE SET NULL,
  review_revision INTEGER NOT NULL DEFAULT 1 CHECK (review_revision > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (storage_bucket, storage_path),
  FOREIGN KEY (workspace_id, item_id, price_option_id)
    REFERENCES cost_library_item_price_options(workspace_id, item_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (project_id, workspace_id)
    REFERENCES projects(id, workspace_id)
    ON DELETE CASCADE,
  CHECK (
    (
      owner_scope = 'library'
      AND item_id IS NOT NULL
      AND project_id IS NULL
      AND project_component_id IS NULL
    )
    OR (
      owner_scope = 'project'
      AND item_id IS NULL
      AND project_id IS NOT NULL
      AND project_component_id IS NOT NULL
    )
  ),
  CHECK (owner_scope = 'library' OR applicable_cost_entry_id IS NULL),
  CHECK (is_current_approved = 0 OR review_status = 'approved'),
  CHECK (
    review_status NOT IN ('approved', 'rejected', 'superseded')
    OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  ),
  CHECK (superseded_by IS NULL OR review_status = 'superseded')
);

INSERT INTO component_variant_attachments__0076 (
  id,
  owner_scope,
  price_option_id,
  item_id,
  project_id,
  project_component_id,
  workspace_id,
  upload_asset_id,
  storage_bucket,
  storage_path,
  file_name,
  content_type,
  size_bytes,
  attachment_kind,
  metadata_json,
  created_by,
  review_status,
  applicable_cost_entry_id,
  is_current_approved,
  reviewed_by,
  reviewed_at,
  review_note,
  superseded_by,
  review_revision,
  created_at,
  updated_at
)
SELECT
  attachment.id,
  'library',
  attachment.price_option_id,
  attachment.item_id,
  NULL,
  NULL,
  attachment.workspace_id,
  (
    SELECT asset.id
    FROM upload_assets asset
    WHERE asset.workspace_id = attachment.workspace_id
      AND asset.surface = 'component-attachment'
      AND asset.status = 'finalized'
      AND asset.storage_bucket = attachment.storage_bucket
      AND asset.storage_path = attachment.storage_path
      AND asset.file_name = attachment.file_name
      AND asset.content_type = attachment.content_type
      AND asset.size_bytes = attachment.size_bytes
  ),
  attachment.storage_bucket,
  attachment.storage_path,
  attachment.file_name,
  attachment.content_type,
  attachment.size_bytes,
  attachment.attachment_kind,
  attachment.metadata_json,
  attachment.created_by,
  attachment.review_status,
  attachment.applicable_cost_entry_id,
  attachment.is_current_approved,
  attachment.reviewed_by,
  attachment.reviewed_at,
  attachment.review_note,
  attachment.superseded_by,
  attachment.review_revision,
  attachment.created_at,
  attachment.updated_at
FROM cost_library_item_variant_attachments attachment;

INSERT INTO __0076_assertion (value)
SELECT 1
WHERE (SELECT COUNT(*) FROM component_variant_attachments__0076)
   <> (SELECT COUNT(*) FROM cost_library_item_variant_attachments);

INSERT INTO __0076_assertion (value)
SELECT 1
WHERE EXISTS (SELECT 1 FROM pragma_foreign_key_check);

DROP TABLE cost_library_item_variant_attachments;
ALTER TABLE component_variant_attachments__0076 RENAME TO component_variant_attachments;

CREATE INDEX idx_component_variant_attachments_workspace_path
  ON component_variant_attachments(workspace_id, storage_path);

CREATE INDEX idx_component_variant_attachments_workspace_review
  ON component_variant_attachments(workspace_id, owner_scope, review_status, is_current_approved);

CREATE INDEX idx_component_variant_attachments_library_option_created
  ON component_variant_attachments(workspace_id, item_id, price_option_id, created_at DESC)
  WHERE owner_scope = 'library';

CREATE INDEX idx_component_variant_attachments_project_option_created
  ON component_variant_attachments(workspace_id, project_id, project_component_id, price_option_id, created_at DESC)
  WHERE owner_scope = 'project';

INSERT INTO __0076_assertion (value)
SELECT 1
WHERE EXISTS (SELECT 1 FROM pragma_foreign_key_check);

DROP TRIGGER __0076_assertion_fail;
DROP TABLE __0076_assertion;
