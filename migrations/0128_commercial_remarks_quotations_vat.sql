-- Canonical Commercial terms persistence. This migration is intentionally
-- additive and does not depend on any 0127-owned table or column.

CREATE TABLE project_commercial_defaults (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  treatment TEXT NOT NULL CHECK (treatment IN ('inclusive', 'exclusive', 'exempt')),
  rate_bps INTEGER NOT NULL CHECK (rate_bps BETWEEN 0 AND 10000),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, project_id),
  FOREIGN KEY (project_id, workspace_id) REFERENCES projects(id, workspace_id) ON DELETE CASCADE,
  CHECK (treatment <> 'exempt' OR rate_bps = 0)
);

CREATE TABLE estimate_commercial_defaults (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  estimate_id TEXT NOT NULL,
  treatment TEXT CHECK (treatment IS NULL OR treatment IN ('inclusive', 'exclusive', 'exempt')),
  rate_bps INTEGER CHECK (rate_bps IS NULL OR rate_bps BETWEEN 0 AND 10000),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, project_id, estimate_id),
  FOREIGN KEY (project_id, workspace_id) REFERENCES projects(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (estimate_id, project_id) REFERENCES estimates(id, project_id) ON DELETE CASCADE,
  CHECK ((treatment IS NULL AND rate_bps IS NULL) OR (treatment IS NOT NULL AND rate_bps IS NOT NULL)),
  CHECK (treatment <> 'exempt' OR rate_bps = 0)
);

CREATE TABLE cost_library_item_price_option_commercial_terms (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  price_option_id TEXT NOT NULL,
  treatment TEXT CHECK (treatment IS NULL OR treatment IN ('inclusive', 'exclusive', 'exempt')),
  rate_bps INTEGER CHECK (rate_bps IS NULL OR rate_bps BETWEEN 0 AND 10000),
  terms_revision INTEGER NOT NULL DEFAULT 1 CHECK (terms_revision > 0),
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, item_id, price_option_id),
  FOREIGN KEY (workspace_id, item_id, price_option_id)
    REFERENCES cost_library_item_price_options(workspace_id, item_id, id) ON DELETE CASCADE,
  CHECK ((treatment IS NULL AND rate_bps IS NULL) OR (treatment IS NOT NULL AND rate_bps IS NOT NULL)),
  CHECK (treatment <> 'exempt' OR rate_bps = 0)
);

CREATE TABLE estimate_row_commercial_terms (
  row_id TEXT PRIMARY KEY REFERENCES estimate_row_items(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  estimate_id TEXT NOT NULL,
  selected_option_id TEXT,
  selected_option_treatment TEXT CHECK (
    selected_option_treatment IS NULL OR selected_option_treatment IN ('inclusive', 'exclusive', 'exempt')
  ),
  selected_option_rate_bps INTEGER CHECK (
    selected_option_rate_bps IS NULL OR selected_option_rate_bps BETWEEN 0 AND 10000
  ),
  selected_option_terms_revision INTEGER CHECK (
    selected_option_terms_revision IS NULL OR selected_option_terms_revision > 0
  ),
  override_treatment TEXT CHECK (
    override_treatment IS NULL OR override_treatment IN ('inclusive', 'exclusive', 'exempt')
  ),
  override_rate_bps INTEGER CHECK (override_rate_bps IS NULL OR override_rate_bps BETWEEN 0 AND 10000),
  quotation_requirement TEXT NOT NULL DEFAULT 'not_required' CHECK (
    quotation_requirement IN ('not_required', 'required')
  ),
  quotation_status TEXT NOT NULL DEFAULT 'not_requested' CHECK (
    quotation_status IN ('not_requested', 'requested', 'available', 'unavailable')
  ),
  quotation_reference TEXT CHECK (
    quotation_reference IS NULL OR (
      length(trim(quotation_reference)) BETWEEN 1 AND 160
      AND lower(quotation_reference) NOT GLOB '*http:*'
      AND lower(quotation_reference) NOT GLOB '*https:*'
      AND lower(quotation_reference) NOT GLOB '*token*'
      AND lower(quotation_reference) NOT GLOB '*signature*'
      AND lower(quotation_reference) NOT GLOB '*storage*'
    )
  ),
  quotation_artifact_version_id TEXT REFERENCES project_artifact_versions(id) ON DELETE RESTRICT,
  terms_revision INTEGER NOT NULL DEFAULT 1 CHECK (terms_revision > 0),
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id, workspace_id) REFERENCES projects(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (estimate_id, project_id) REFERENCES estimates(id, project_id) ON DELETE CASCADE,
  CHECK (
    (selected_option_id IS NULL AND selected_option_treatment IS NULL AND selected_option_rate_bps IS NULL AND selected_option_terms_revision IS NULL)
    OR
    (selected_option_id IS NOT NULL AND length(trim(selected_option_id)) > 0 AND selected_option_treatment IS NOT NULL AND selected_option_rate_bps IS NOT NULL AND selected_option_terms_revision IS NOT NULL)
  ),
  CHECK (selected_option_treatment <> 'exempt' OR selected_option_rate_bps = 0),
  CHECK (
    (override_treatment IS NULL AND override_rate_bps IS NULL)
    OR (override_treatment IS NOT NULL AND override_rate_bps IS NOT NULL)
  ),
  CHECK (override_treatment <> 'exempt' OR override_rate_bps = 0)
);

ALTER TABLE estimate_sheet_user_preferences
  ADD COLUMN column_visibility_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(column_visibility_json)
    AND json_type(column_visibility_json) = 'object'
    AND lower(column_visibility_json) NOT GLOB '*http:*'
    AND lower(column_visibility_json) NOT GLOB '*https:*'
    AND lower(column_visibility_json) NOT GLOB '*token*'
    AND lower(column_visibility_json) NOT GLOB '*signature*'
    AND lower(column_visibility_json) NOT GLOB '*apikey*'
    AND lower(column_visibility_json) NOT GLOB '*storage*'
    AND lower(column_visibility_json) NOT GLOB '*source_url*'
  );

CREATE TABLE commercial_migration_diagnostics (
  metric TEXT PRIMARY KEY CHECK (length(trim(metric)) > 0),
  value INTEGER NOT NULL CHECK (value >= 0),
  recorded_at TEXT NOT NULL
);

CREATE INDEX idx_project_commercial_defaults_project
  ON project_commercial_defaults(project_id, workspace_id);
CREATE INDEX idx_estimate_commercial_defaults_estimate
  ON estimate_commercial_defaults(estimate_id, project_id, workspace_id);
CREATE INDEX idx_price_option_commercial_terms_option
  ON cost_library_item_price_option_commercial_terms(price_option_id, workspace_id, item_id);
CREATE INDEX idx_estimate_row_commercial_terms_estimate
  ON estimate_row_commercial_terms(estimate_id, row_id);
CREATE INDEX idx_estimate_row_commercial_terms_quotation_version
  ON estimate_row_commercial_terms(quotation_artifact_version_id)
  WHERE quotation_artifact_version_id IS NOT NULL;

CREATE TRIGGER estimate_sheet_column_visibility_insert
BEFORE INSERT ON estimate_sheet_user_preferences
WHEN json_remove(NEW.column_visibility_json, '$.commercial') <> '{}'
  OR (
    json_type(NEW.column_visibility_json, '$.commercial') IS NOT NULL
    AND json_type(NEW.column_visibility_json, '$.commercial') NOT IN ('true', 'false')
  )
BEGIN
  SELECT RAISE(ABORT, 'estimate sheet column visibility contains an unsupported key or value');
END;

CREATE TRIGGER estimate_sheet_column_visibility_update
BEFORE UPDATE OF column_visibility_json ON estimate_sheet_user_preferences
WHEN json_remove(NEW.column_visibility_json, '$.commercial') <> '{}'
  OR (
    json_type(NEW.column_visibility_json, '$.commercial') IS NOT NULL
    AND json_type(NEW.column_visibility_json, '$.commercial') NOT IN ('true', 'false')
  )
BEGIN
  SELECT RAISE(ABORT, 'estimate sheet column visibility contains an unsupported key or value');
END;

CREATE TRIGGER estimate_row_commercial_terms_scope_insert
BEFORE INSERT ON estimate_row_commercial_terms
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM estimate_row_items AS row_item
    JOIN estimates AS estimate ON estimate.id = row_item.estimate_id
    JOIN projects AS project ON project.id = estimate.project_id
    WHERE row_item.id = NEW.row_id
      AND row_item.estimate_id = NEW.estimate_id
      AND estimate.project_id = NEW.project_id
      AND project.workspace_id = NEW.workspace_id
  ) THEN RAISE(ABORT, 'commercial row scope ownership mismatch') END;
  SELECT CASE WHEN NEW.selected_option_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM estimate_row_items AS row_item
    JOIN estimate_row_variant_selections AS selection
      ON selection.estimate_row_item_id = row_item.id
     AND selection.estimate_id = row_item.estimate_id
     AND selection.workspace_id = NEW.workspace_id
     AND selection.selected_price_option_id = NEW.selected_option_id
    JOIN cost_library_item_price_options AS price_option
      ON price_option.id = NEW.selected_option_id
     AND price_option.item_id = row_item.source_library_item_id
     AND price_option.workspace_id = NEW.workspace_id
    WHERE row_item.id = NEW.row_id
  ) THEN RAISE(ABORT, 'commercial selected option ownership mismatch') END;
END;

CREATE TRIGGER estimate_row_commercial_terms_scope_update
BEFORE UPDATE OF row_id, workspace_id, project_id, estimate_id, selected_option_id,
  selected_option_treatment, selected_option_rate_bps, selected_option_terms_revision
ON estimate_row_commercial_terms
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM estimate_row_items AS row_item
    JOIN estimates AS estimate ON estimate.id = row_item.estimate_id
    JOIN projects AS project ON project.id = estimate.project_id
    WHERE row_item.id = NEW.row_id
      AND row_item.estimate_id = NEW.estimate_id
      AND estimate.project_id = NEW.project_id
      AND project.workspace_id = NEW.workspace_id
  ) THEN RAISE(ABORT, 'commercial row scope ownership mismatch') END;
  SELECT CASE WHEN NEW.selected_option_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM estimate_row_items AS row_item
    JOIN estimate_row_variant_selections AS selection
      ON selection.estimate_row_item_id = row_item.id
     AND selection.estimate_id = row_item.estimate_id
     AND selection.workspace_id = NEW.workspace_id
     AND selection.selected_price_option_id = NEW.selected_option_id
    JOIN cost_library_item_price_options AS price_option
      ON price_option.id = NEW.selected_option_id
     AND price_option.item_id = row_item.source_library_item_id
     AND price_option.workspace_id = NEW.workspace_id
    WHERE row_item.id = NEW.row_id
  ) THEN RAISE(ABORT, 'commercial selected option ownership mismatch') END;
END;

CREATE TRIGGER estimate_row_commercial_selected_terms_insert
BEFORE INSERT ON estimate_row_commercial_terms
WHEN NEW.selected_option_id IS NOT NULL
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM estimate_row_items AS row_item
    JOIN cost_library_item_price_option_commercial_terms AS option_terms
      ON option_terms.workspace_id = NEW.workspace_id
     AND option_terms.item_id = row_item.source_library_item_id
     AND option_terms.price_option_id = NEW.selected_option_id
    WHERE row_item.id = NEW.row_id
      AND option_terms.treatment = NEW.selected_option_treatment
      AND option_terms.rate_bps = NEW.selected_option_rate_bps
      AND option_terms.terms_revision = NEW.selected_option_terms_revision
  ) THEN RAISE(ABORT, 'commercial selected option snapshot mismatch') END;
END;

CREATE TRIGGER estimate_row_commercial_selected_terms_update
BEFORE UPDATE OF selected_option_id, selected_option_treatment,
  selected_option_rate_bps, selected_option_terms_revision
ON estimate_row_commercial_terms
WHEN NEW.selected_option_id IS NOT NULL
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM estimate_row_items AS row_item
    JOIN cost_library_item_price_option_commercial_terms AS option_terms
      ON option_terms.workspace_id = NEW.workspace_id
     AND option_terms.item_id = row_item.source_library_item_id
     AND option_terms.price_option_id = NEW.selected_option_id
    WHERE row_item.id = NEW.row_id
      AND option_terms.treatment = NEW.selected_option_treatment
      AND option_terms.rate_bps = NEW.selected_option_rate_bps
      AND option_terms.terms_revision = NEW.selected_option_terms_revision
  ) THEN RAISE(ABORT, 'commercial selected option snapshot mismatch') END;
END;

CREATE TRIGGER estimate_row_commercial_quotation_insert
BEFORE INSERT ON estimate_row_commercial_terms
WHEN NEW.quotation_artifact_version_id IS NOT NULL
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM project_artifact_versions AS version
    JOIN project_artifacts AS artifact
      ON artifact.id = version.artifact_id
     AND artifact.workspace_id = version.workspace_id
     AND artifact.project_id = version.project_id
    JOIN upload_assets AS asset ON asset.id = version.upload_asset_id
    WHERE version.id = NEW.quotation_artifact_version_id
      AND version.workspace_id = NEW.workspace_id
      AND version.project_id = NEW.project_id
      AND artifact.artifact_type = 'quotation'
      AND artifact.status = 'active'
      AND asset.workspace_id = NEW.workspace_id
      AND asset.project_id = NEW.project_id
      AND asset.surface = 'project-artifact'
      AND asset.status = 'finalized'
      AND asset.purge_state = 'active'
      AND asset.content_type = 'application/pdf'
      AND asset.checksum_sha256 = version.content_sha256
      AND (
        asset.scan_status = 'clean'
        OR (
          asset.scan_status = 'override_approved'
          AND asset.scan_override_actor_user_id IS NOT NULL
          AND length(trim(coalesce(asset.scan_override_reason, ''))) >= 8
          AND asset.scan_override_checksum_sha256 = version.content_sha256
          AND asset.scan_override_expires_at > NEW.updated_at
        )
      )
  ) THEN RAISE(ABORT, 'quotation version is not linkable for this commercial row') END;
END;

CREATE TRIGGER estimate_row_commercial_quotation_update
BEFORE UPDATE OF quotation_artifact_version_id, workspace_id, project_id ON estimate_row_commercial_terms
WHEN NEW.quotation_artifact_version_id IS NOT NULL
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM project_artifact_versions AS version
    JOIN project_artifacts AS artifact
      ON artifact.id = version.artifact_id
     AND artifact.workspace_id = version.workspace_id
     AND artifact.project_id = version.project_id
    JOIN upload_assets AS asset ON asset.id = version.upload_asset_id
    WHERE version.id = NEW.quotation_artifact_version_id
      AND version.workspace_id = NEW.workspace_id
      AND version.project_id = NEW.project_id
      AND artifact.artifact_type = 'quotation'
      AND artifact.status = 'active'
      AND asset.workspace_id = NEW.workspace_id
      AND asset.project_id = NEW.project_id
      AND asset.surface = 'project-artifact'
      AND asset.status = 'finalized'
      AND asset.purge_state = 'active'
      AND asset.content_type = 'application/pdf'
      AND asset.checksum_sha256 = version.content_sha256
      AND (
        asset.scan_status = 'clean'
        OR (
          asset.scan_status = 'override_approved'
          AND asset.scan_override_actor_user_id IS NOT NULL
          AND length(trim(coalesce(asset.scan_override_reason, ''))) >= 8
          AND asset.scan_override_checksum_sha256 = version.content_sha256
          AND asset.scan_override_expires_at > NEW.updated_at
        )
      )
  ) THEN RAISE(ABORT, 'quotation version is not linkable for this commercial row') END;
END;

-- COMMERCIAL_BACKFILL:START
WITH source AS (
  SELECT
    project.id AS project_id,
    project.workspace_id,
    project.created_at,
    project.updated_at,
    upper(trim(coalesce(
      json_extract(project.metadata, '$.taxTreatment.treatment'),
      json_extract(project.metadata, '$.taxTreatment.basis'),
      ''
    ))) AS treatment_input,
    json_extract(project.metadata, '$.taxTreatment.vatIncluded') AS vat_included,
    json_extract(project.metadata, '$.taxTreatment.rateBps') AS rate_bps_input,
    json_extract(project.metadata, '$.taxTreatment.vatRate') AS vat_rate_input
  FROM projects AS project
), normalized AS (
  SELECT *,
    CASE
      WHEN treatment_input IN ('INCLUSIVE', 'VAT_INCLUSIVE', 'VAT_INCLUDED', 'INC_VAT', 'IN_VAT') THEN 'inclusive'
      WHEN treatment_input IN ('EXCLUSIVE', 'VAT_EXCLUSIVE', 'EX_VAT') THEN 'exclusive'
      WHEN treatment_input IN ('EXEMPT', 'VAT_EXEMPT') THEN 'exempt'
      WHEN treatment_input = '' AND vat_included IN (1, '1', 'true') THEN 'inclusive'
      WHEN treatment_input = '' AND vat_included IN (0, '0', 'false') THEN 'exclusive'
      ELSE 'exclusive'
    END AS treatment
  FROM source
)
INSERT OR IGNORE INTO project_commercial_defaults (
  workspace_id, project_id, treatment, rate_bps, revision, created_at, updated_at
)
SELECT
  workspace_id,
  project_id,
  treatment,
  CASE
    WHEN treatment = 'exempt' THEN 0
    WHEN typeof(rate_bps_input) IN ('integer', 'real')
      AND rate_bps_input = round(rate_bps_input)
      AND rate_bps_input BETWEEN 0 AND 10000 THEN CAST(rate_bps_input AS INTEGER)
    WHEN typeof(vat_rate_input) IN ('integer', 'real') AND vat_rate_input BETWEEN 0 AND 1
      THEN CAST(round(vat_rate_input * 10000) AS INTEGER)
    WHEN typeof(vat_rate_input) IN ('integer', 'real') AND vat_rate_input > 1 AND vat_rate_input <= 100
      THEN CAST(round(vat_rate_input * 100) AS INTEGER)
    ELSE 1200
  END,
  1,
  created_at,
  updated_at
FROM normalized;

WITH source AS (
  SELECT
    estimate.id AS estimate_id,
    estimate.project_id,
    project.workspace_id,
    estimate.created_at,
    estimate.updated_at,
    upper(trim(coalesce(
      json_extract(estimate.metadata, '$.taxTreatment.treatment'),
      json_extract(estimate.metadata, '$.taxTreatment.basis'),
      ''
    ))) AS treatment_input,
    json_extract(estimate.metadata, '$.taxTreatment.vatIncluded') AS vat_included,
    json_extract(estimate.metadata, '$.taxTreatment.rateBps') AS rate_bps_input,
    json_extract(estimate.metadata, '$.taxTreatment.vatRate') AS vat_rate_input,
    json_type(estimate.metadata, '$.taxTreatment') AS tax_object_type
  FROM estimates AS estimate
  JOIN projects AS project ON project.id = estimate.project_id
), normalized AS (
  SELECT *,
    CASE
      WHEN treatment_input IN ('INCLUSIVE', 'VAT_INCLUSIVE', 'VAT_INCLUDED', 'INC_VAT', 'IN_VAT') THEN 'inclusive'
      WHEN treatment_input IN ('EXCLUSIVE', 'VAT_EXCLUSIVE', 'EX_VAT') THEN 'exclusive'
      WHEN treatment_input IN ('EXEMPT', 'VAT_EXEMPT') THEN 'exempt'
      WHEN treatment_input = '' AND vat_included IN (1, '1', 'true') THEN 'inclusive'
      WHEN treatment_input = '' AND vat_included IN (0, '0', 'false') THEN 'exclusive'
      ELSE 'exclusive'
    END AS treatment
  FROM source
  WHERE tax_object_type = 'object' OR vat_included IS NOT NULL
)
INSERT OR IGNORE INTO estimate_commercial_defaults (
  workspace_id, project_id, estimate_id, treatment, rate_bps, revision, created_at, updated_at
)
SELECT
  workspace_id,
  project_id,
  estimate_id,
  treatment,
  CASE
    WHEN treatment = 'exempt' THEN 0
    WHEN typeof(rate_bps_input) IN ('integer', 'real')
      AND rate_bps_input = round(rate_bps_input)
      AND rate_bps_input BETWEEN 0 AND 10000 THEN CAST(rate_bps_input AS INTEGER)
    WHEN typeof(vat_rate_input) IN ('integer', 'real') AND vat_rate_input BETWEEN 0 AND 1
      THEN CAST(round(vat_rate_input * 10000) AS INTEGER)
    WHEN typeof(vat_rate_input) IN ('integer', 'real') AND vat_rate_input > 1 AND vat_rate_input <= 100
      THEN CAST(round(vat_rate_input * 100) AS INTEGER)
    ELSE 1200
  END,
  1,
  created_at,
  updated_at
FROM normalized;

WITH source AS (
  SELECT
    price_option.workspace_id,
    price_option.item_id,
    price_option.id AS price_option_id,
    price_option.created_at,
    price_option.updated_at,
    upper(trim(coalesce(
      json_extract(price_option.metadata_json, '$.taxTreatment.treatment'),
      json_extract(price_option.metadata_json, '$.taxTreatment.basis'),
      ''
    ))) AS treatment_input,
    json_extract(price_option.metadata_json, '$.taxTreatment.vatIncluded') AS vat_included,
    json_extract(price_option.metadata_json, '$.taxTreatment.rateBps') AS rate_bps_input,
    json_extract(price_option.metadata_json, '$.taxTreatment.vatRate') AS vat_rate_input
  FROM cost_library_item_price_options AS price_option
), normalized AS (
  SELECT *,
    CASE
      WHEN treatment_input IN ('INCLUSIVE', 'VAT_INCLUSIVE', 'VAT_INCLUDED', 'INC_VAT', 'IN_VAT') THEN 'inclusive'
      WHEN treatment_input IN ('EXCLUSIVE', 'VAT_EXCLUSIVE', 'EX_VAT') THEN 'exclusive'
      WHEN treatment_input IN ('EXEMPT', 'VAT_EXEMPT') THEN 'exempt'
      WHEN treatment_input = '' AND vat_included IN (1, '1', 'true') THEN 'inclusive'
      WHEN treatment_input = '' AND vat_included IN (0, '0', 'false') THEN 'exclusive'
      ELSE 'exclusive'
    END AS treatment
  FROM source
)
INSERT OR IGNORE INTO cost_library_item_price_option_commercial_terms (
  workspace_id, item_id, price_option_id, treatment, rate_bps,
  terms_revision, created_at, updated_at
)
SELECT
  workspace_id,
  item_id,
  price_option_id,
  treatment,
  CASE
    WHEN treatment = 'exempt' THEN 0
    WHEN typeof(rate_bps_input) IN ('integer', 'real')
      AND rate_bps_input = round(rate_bps_input)
      AND rate_bps_input BETWEEN 0 AND 10000 THEN CAST(rate_bps_input AS INTEGER)
    WHEN typeof(vat_rate_input) IN ('integer', 'real') AND vat_rate_input BETWEEN 0 AND 1
      THEN CAST(round(vat_rate_input * 10000) AS INTEGER)
    WHEN typeof(vat_rate_input) IN ('integer', 'real') AND vat_rate_input > 1 AND vat_rate_input <= 100
      THEN CAST(round(vat_rate_input * 100) AS INTEGER)
    ELSE 1200
  END,
  1,
  created_at,
  updated_at
FROM normalized;

WITH row_source AS (
  SELECT
    row_item.id AS row_id,
    row_item.estimate_id,
    estimate.project_id,
    project.workspace_id,
    row_item.source_library_item_id,
    selection.selected_price_option_id AS selected_option_id,
    row_item.source_snapshot_json,
    row_item.created_at,
    row_item.updated_at,
    upper(trim(coalesce(
      json_extract(row_item.source_snapshot_json, '$.taxTreatment.treatment'),
      json_extract(row_item.source_snapshot_json, '$.taxTreatment.basis'),
      ''
    ))) AS treatment_input,
    json_extract(row_item.source_snapshot_json, '$.taxTreatment.vatIncluded') AS vat_included,
    json_extract(row_item.source_snapshot_json, '$.taxTreatment.rateBps') AS rate_bps_input,
    json_extract(row_item.source_snapshot_json, '$.taxTreatment.vatRate') AS vat_rate_input,
    json_type(row_item.source_snapshot_json, '$.taxTreatment') AS tax_object_type
  FROM estimate_row_items AS row_item
  JOIN estimates AS estimate ON estimate.id = row_item.estimate_id
  JOIN projects AS project ON project.id = estimate.project_id
  LEFT JOIN estimate_row_variant_selections AS selection
    ON selection.estimate_row_item_id = row_item.id
   AND selection.estimate_id = row_item.estimate_id
   AND selection.workspace_id = project.workspace_id
), normalized AS (
  SELECT *,
    CASE
      WHEN treatment_input IN ('INCLUSIVE', 'VAT_INCLUSIVE', 'VAT_INCLUDED', 'INC_VAT', 'IN_VAT') THEN 'inclusive'
      WHEN treatment_input IN ('EXCLUSIVE', 'VAT_EXCLUSIVE', 'EX_VAT') THEN 'exclusive'
      WHEN treatment_input IN ('EXEMPT', 'VAT_EXEMPT') THEN 'exempt'
      WHEN treatment_input = '' AND vat_included IN (1, '1', 'true') THEN 'inclusive'
      WHEN treatment_input = '' AND vat_included IN (0, '0', 'false') THEN 'exclusive'
      ELSE 'exclusive'
    END AS override_treatment
  FROM row_source
)
INSERT OR IGNORE INTO estimate_row_commercial_terms (
  row_id, workspace_id, project_id, estimate_id,
  selected_option_id, selected_option_treatment, selected_option_rate_bps,
  selected_option_terms_revision, override_treatment, override_rate_bps,
  quotation_requirement, quotation_status, quotation_reference,
  quotation_artifact_version_id, terms_revision, created_at, updated_at
)
SELECT
  source.row_id,
  source.workspace_id,
  source.project_id,
  source.estimate_id,
  option_terms.price_option_id,
  option_terms.treatment,
  option_terms.rate_bps,
  option_terms.terms_revision,
  CASE WHEN source.tax_object_type = 'object' OR source.vat_included IS NOT NULL
    THEN source.override_treatment ELSE NULL END,
  CASE WHEN source.tax_object_type = 'object' OR source.vat_included IS NOT NULL THEN
    CASE
      WHEN source.override_treatment = 'exempt' THEN 0
      WHEN typeof(source.rate_bps_input) IN ('integer', 'real')
        AND source.rate_bps_input = round(source.rate_bps_input)
        AND source.rate_bps_input BETWEEN 0 AND 10000 THEN CAST(source.rate_bps_input AS INTEGER)
      WHEN typeof(source.vat_rate_input) IN ('integer', 'real') AND source.vat_rate_input BETWEEN 0 AND 1
        THEN CAST(round(source.vat_rate_input * 10000) AS INTEGER)
      WHEN typeof(source.vat_rate_input) IN ('integer', 'real') AND source.vat_rate_input > 1 AND source.vat_rate_input <= 100
        THEN CAST(round(source.vat_rate_input * 100) AS INTEGER)
      ELSE 1200
    END
  ELSE NULL END,
  CASE WHEN json_extract(source.source_snapshot_json, '$.requiresQuote') IN (1, '1', 'true')
    THEN 'required' ELSE 'not_required' END,
  CASE upper(trim(coalesce(json_extract(source.source_snapshot_json, '$.quotationStatus'), '')))
    WHEN 'REQUESTED' THEN 'requested'
    WHEN 'AVAILABLE' THEN 'available'
    WHEN 'UNAVAILABLE' THEN 'unavailable'
    WHEN 'NOT_REQUESTED' THEN 'not_requested'
    ELSE 'not_requested'
  END,
  CASE WHEN typeof(json_extract(source.source_snapshot_json, '$.quotationReference')) = 'text'
      AND length(trim(json_extract(source.source_snapshot_json, '$.quotationReference'))) BETWEEN 1 AND 160
      AND lower(json_extract(source.source_snapshot_json, '$.quotationReference')) NOT GLOB '*http:*'
      AND lower(json_extract(source.source_snapshot_json, '$.quotationReference')) NOT GLOB '*https:*'
    THEN trim(json_extract(source.source_snapshot_json, '$.quotationReference')) ELSE NULL END,
  CASE WHEN EXISTS (
    SELECT 1
    FROM project_artifact_versions AS version
    JOIN project_artifacts AS artifact
      ON artifact.id = version.artifact_id
     AND artifact.workspace_id = version.workspace_id
     AND artifact.project_id = version.project_id
    JOIN upload_assets AS asset ON asset.id = version.upload_asset_id
    WHERE version.id = json_extract(source.source_snapshot_json, '$.quotationArtifactVersionId')
      AND version.workspace_id = source.workspace_id
      AND version.project_id = source.project_id
      AND artifact.artifact_type = 'quotation'
      AND artifact.status = 'active'
      AND asset.status = 'finalized'
      AND asset.purge_state = 'active'
      AND asset.checksum_sha256 = version.content_sha256
      AND (
        asset.scan_status = 'clean'
        OR (
          asset.scan_status = 'override_approved'
          AND asset.scan_override_actor_user_id IS NOT NULL
          AND length(trim(coalesce(asset.scan_override_reason, ''))) >= 8
          AND asset.scan_override_checksum_sha256 = version.content_sha256
          AND asset.scan_override_expires_at > source.updated_at
        )
      )
  ) THEN json_extract(source.source_snapshot_json, '$.quotationArtifactVersionId') ELSE NULL END,
  1,
  source.created_at,
  source.updated_at
FROM normalized AS source
LEFT JOIN cost_library_item_price_option_commercial_terms AS option_terms
  ON option_terms.workspace_id = source.workspace_id
 AND option_terms.item_id = source.source_library_item_id
 AND option_terms.price_option_id = source.selected_option_id;

INSERT OR REPLACE INTO commercial_migration_diagnostics (metric, value, recorded_at)
SELECT 'source_projects', count(*), strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM projects
;
INSERT OR REPLACE INTO commercial_migration_diagnostics (metric, value, recorded_at)
SELECT 'source_estimates', count(*), strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM estimates
;
INSERT OR REPLACE INTO commercial_migration_diagnostics (metric, value, recorded_at)
SELECT 'source_price_options', count(*), strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM cost_library_item_price_options
;
INSERT OR REPLACE INTO commercial_migration_diagnostics (metric, value, recorded_at)
SELECT 'source_rows', count(*), strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM estimate_row_items
;
INSERT OR REPLACE INTO commercial_migration_diagnostics (metric, value, recorded_at)
SELECT 'project_defaults', count(*), strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM project_commercial_defaults
;
INSERT OR REPLACE INTO commercial_migration_diagnostics (metric, value, recorded_at)
SELECT 'estimate_defaults', count(*), strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM estimate_commercial_defaults
;
INSERT OR REPLACE INTO commercial_migration_diagnostics (metric, value, recorded_at)
SELECT 'price_option_terms', count(*), strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM cost_library_item_price_option_commercial_terms
;
INSERT OR REPLACE INTO commercial_migration_diagnostics (metric, value, recorded_at)
SELECT 'row_terms', count(*), strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM estimate_row_commercial_terms
;
INSERT OR REPLACE INTO commercial_migration_diagnostics (metric, value, recorded_at)
SELECT 'malformed_project_tax_fallbacks', count(*), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM projects
WHERE json_type(metadata, '$.taxTreatment') = 'object'
  AND upper(trim(coalesce(json_extract(metadata, '$.taxTreatment.treatment'), json_extract(metadata, '$.taxTreatment.basis'), '')))
      NOT IN ('INCLUSIVE', 'VAT_INCLUSIVE', 'VAT_INCLUDED', 'INC_VAT', 'IN_VAT', 'EXCLUSIVE', 'VAT_EXCLUSIVE', 'EX_VAT', 'EXEMPT', 'VAT_EXEMPT')
;
INSERT OR REPLACE INTO commercial_migration_diagnostics (metric, value, recorded_at)
SELECT 'malformed_estimate_tax_fallbacks', count(*), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM estimates
WHERE json_type(metadata, '$.taxTreatment') = 'object'
  AND upper(trim(coalesce(json_extract(metadata, '$.taxTreatment.treatment'), json_extract(metadata, '$.taxTreatment.basis'), '')))
      NOT IN ('INCLUSIVE', 'VAT_INCLUSIVE', 'VAT_INCLUDED', 'INC_VAT', 'IN_VAT', 'EXCLUSIVE', 'VAT_EXCLUSIVE', 'EX_VAT', 'EXEMPT', 'VAT_EXEMPT')
;
INSERT OR REPLACE INTO commercial_migration_diagnostics (metric, value, recorded_at)
SELECT 'malformed_price_option_tax_fallbacks', count(*), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM cost_library_item_price_options
WHERE json_type(metadata_json, '$.taxTreatment') = 'object'
  AND upper(trim(coalesce(json_extract(metadata_json, '$.taxTreatment.treatment'), json_extract(metadata_json, '$.taxTreatment.basis'), '')))
      NOT IN ('INCLUSIVE', 'VAT_INCLUSIVE', 'VAT_INCLUDED', 'INC_VAT', 'IN_VAT', 'EXCLUSIVE', 'VAT_EXCLUSIVE', 'EX_VAT', 'EXEMPT', 'VAT_EXEMPT')
;
INSERT OR REPLACE INTO commercial_migration_diagnostics (metric, value, recorded_at)
SELECT 'malformed_row_tax_fallbacks', count(*), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM estimate_row_items
WHERE json_type(source_snapshot_json, '$.taxTreatment') = 'object'
  AND upper(trim(coalesce(json_extract(source_snapshot_json, '$.taxTreatment.treatment'), json_extract(source_snapshot_json, '$.taxTreatment.basis'), '')))
      NOT IN ('INCLUSIVE', 'VAT_INCLUSIVE', 'VAT_INCLUDED', 'INC_VAT', 'IN_VAT', 'EXCLUSIVE', 'VAT_EXCLUSIVE', 'EX_VAT', 'EXEMPT', 'VAT_EXEMPT');
-- COMMERCIAL_BACKFILL:END
