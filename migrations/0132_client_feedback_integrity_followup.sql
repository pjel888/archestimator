-- Fix-forward reconciliation for option brand identity, commercial row terms, and template sidecar scope.

UPDATE cost_library_item_price_options AS price_option
SET brand_id = (
      SELECT item.brand_id FROM cost_library_items AS item
      WHERE item.id = price_option.item_id AND item.workspace_id = price_option.workspace_id
    ),
    updated_at = COALESCE(price_option.updated_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
WHERE price_option.brand_id IS NULL
  AND EXISTS (
    SELECT 1 FROM cost_library_items AS item
    WHERE item.id = price_option.item_id
      AND item.workspace_id = price_option.workspace_id
      AND item.brand_id IS NOT NULL
  );

UPDATE cost_library_item_price_options AS price_option
SET brand = COALESCE(
      (
        SELECT brand.name FROM component_brands AS brand
        WHERE brand.id = price_option.brand_id AND brand.workspace_id = price_option.workspace_id
      ),
      (
        SELECT NULLIF(trim(item.brand), '') FROM cost_library_items AS item
        WHERE item.id = price_option.item_id AND item.workspace_id = price_option.workspace_id
      ),
      ''
    ),
    updated_at = COALESCE(price_option.updated_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
WHERE trim(price_option.brand) = ''
  AND (
    EXISTS (
      SELECT 1 FROM component_brands AS brand
      WHERE brand.id = price_option.brand_id AND brand.workspace_id = price_option.workspace_id
    )
    OR EXISTS (
      SELECT 1 FROM cost_library_items AS item
      WHERE item.id = price_option.item_id
        AND item.workspace_id = price_option.workspace_id
        AND trim(COALESCE(item.brand, '')) <> ''
    )
  );

DROP TABLE IF EXISTS _estimate_row_commercial_reconcile_0132;
CREATE TABLE _estimate_row_commercial_reconcile_0132 (
  row_id TEXT PRIMARY KEY,
  override_treatment TEXT,
  override_rate_bps INTEGER,
  quotation_requirement TEXT NOT NULL,
  quotation_status TEXT NOT NULL,
  quotation_reference TEXT,
  quotation_artifact_version_id TEXT
);

INSERT INTO _estimate_row_commercial_reconcile_0132 (
  row_id, override_treatment, override_rate_bps, quotation_requirement,
  quotation_status, quotation_reference, quotation_artifact_version_id
)
SELECT
  row_item.id,
  CASE
    WHEN json_type(row_item.source_snapshot_json, '$.taxTreatment') = 'object'
      OR json_extract(row_item.source_snapshot_json, '$.taxTreatment.vatIncluded') IS NOT NULL
    THEN CASE
      WHEN upper(trim(COALESCE(
        json_extract(row_item.source_snapshot_json, '$.taxTreatment.treatment'),
        json_extract(row_item.source_snapshot_json, '$.taxTreatment.basis'), ''
      ))) IN ('INCLUSIVE', 'VAT_INCLUSIVE', 'VAT_INCLUDED', 'INC_VAT', 'IN_VAT') THEN 'inclusive'
      WHEN upper(trim(COALESCE(
        json_extract(row_item.source_snapshot_json, '$.taxTreatment.treatment'),
        json_extract(row_item.source_snapshot_json, '$.taxTreatment.basis'), ''
      ))) IN ('EXEMPT', 'VAT_EXEMPT') THEN 'exempt'
      WHEN json_extract(row_item.source_snapshot_json, '$.taxTreatment.vatIncluded') IN (1, '1', 'true') THEN 'inclusive'
      ELSE 'exclusive'
    END
    ELSE NULL
  END,
  CASE
    WHEN json_type(row_item.source_snapshot_json, '$.taxTreatment') = 'object'
      OR json_extract(row_item.source_snapshot_json, '$.taxTreatment.vatIncluded') IS NOT NULL
    THEN CASE
      WHEN upper(trim(COALESCE(
        json_extract(row_item.source_snapshot_json, '$.taxTreatment.treatment'),
        json_extract(row_item.source_snapshot_json, '$.taxTreatment.basis'), ''
      ))) IN ('EXEMPT', 'VAT_EXEMPT') THEN 0
      WHEN typeof(json_extract(row_item.source_snapshot_json, '$.taxTreatment.rateBps')) IN ('integer', 'real')
        AND json_extract(row_item.source_snapshot_json, '$.taxTreatment.rateBps') BETWEEN 0 AND 10000
        THEN CAST(round(json_extract(row_item.source_snapshot_json, '$.taxTreatment.rateBps')) AS INTEGER)
      WHEN typeof(json_extract(row_item.source_snapshot_json, '$.taxTreatment.vatRate')) IN ('integer', 'real')
        AND json_extract(row_item.source_snapshot_json, '$.taxTreatment.vatRate') BETWEEN 0 AND 1
        THEN CAST(round(json_extract(row_item.source_snapshot_json, '$.taxTreatment.vatRate') * 10000) AS INTEGER)
      WHEN typeof(json_extract(row_item.source_snapshot_json, '$.taxTreatment.vatRate')) IN ('integer', 'real')
        AND json_extract(row_item.source_snapshot_json, '$.taxTreatment.vatRate') > 1
        AND json_extract(row_item.source_snapshot_json, '$.taxTreatment.vatRate') <= 100
        THEN CAST(round(json_extract(row_item.source_snapshot_json, '$.taxTreatment.vatRate') * 100) AS INTEGER)
      ELSE 1200
    END
    ELSE NULL
  END,
  CASE WHEN json_extract(row_item.source_snapshot_json, '$.requiresQuote') IN (1, '1', 'true')
    THEN 'required' ELSE 'not_required' END,
  CASE upper(trim(COALESCE(json_extract(row_item.source_snapshot_json, '$.quotationStatus'), '')))
    WHEN 'REQUESTED' THEN 'requested'
    WHEN 'AVAILABLE' THEN 'available'
    WHEN 'UNAVAILABLE' THEN 'unavailable'
    ELSE 'not_requested'
  END,
  CASE
    WHEN typeof(json_extract(row_item.source_snapshot_json, '$.quotationReference')) = 'text'
      AND length(trim(json_extract(row_item.source_snapshot_json, '$.quotationReference'))) BETWEEN 1 AND 160
      AND lower(json_extract(row_item.source_snapshot_json, '$.quotationReference')) NOT GLOB '*http:*'
      AND lower(json_extract(row_item.source_snapshot_json, '$.quotationReference')) NOT GLOB '*https:*'
      AND lower(json_extract(row_item.source_snapshot_json, '$.quotationReference')) NOT GLOB '*token*'
      AND lower(json_extract(row_item.source_snapshot_json, '$.quotationReference')) NOT GLOB '*signature*'
      AND lower(json_extract(row_item.source_snapshot_json, '$.quotationReference')) NOT GLOB '*storage*'
    THEN trim(json_extract(row_item.source_snapshot_json, '$.quotationReference'))
    ELSE NULL
  END,
  CASE WHEN EXISTS (
    SELECT 1
    FROM project_artifact_versions AS version
    JOIN project_artifacts AS artifact
      ON artifact.id = version.artifact_id
     AND artifact.workspace_id = version.workspace_id
     AND artifact.project_id = version.project_id
    JOIN upload_assets AS asset ON asset.id = version.upload_asset_id
    WHERE version.id = json_extract(row_item.source_snapshot_json, '$.quotationArtifactVersionId')
      AND version.workspace_id = project.workspace_id
      AND version.project_id = project.id
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
          AND length(trim(COALESCE(asset.scan_override_reason, ''))) >= 8
          AND asset.scan_override_checksum_sha256 = version.content_sha256
          AND asset.scan_override_expires_at > row_item.updated_at
        )
      )
  ) THEN json_extract(row_item.source_snapshot_json, '$.quotationArtifactVersionId') ELSE NULL END
FROM estimate_row_items AS row_item
JOIN estimates AS estimate ON estimate.id = row_item.estimate_id
JOIN projects AS project ON project.id = estimate.project_id;

UPDATE estimate_row_commercial_terms AS terms
SET override_treatment = COALESCE(terms.override_treatment, (
      SELECT reconcile.override_treatment FROM _estimate_row_commercial_reconcile_0132 AS reconcile
      WHERE reconcile.row_id = terms.row_id
    )),
    override_rate_bps = COALESCE(terms.override_rate_bps, (
      SELECT reconcile.override_rate_bps FROM _estimate_row_commercial_reconcile_0132 AS reconcile
      WHERE reconcile.row_id = terms.row_id
    )),
    quotation_requirement = CASE WHEN terms.quotation_requirement = 'not_required' THEN (
      SELECT reconcile.quotation_requirement FROM _estimate_row_commercial_reconcile_0132 AS reconcile
      WHERE reconcile.row_id = terms.row_id
    ) ELSE terms.quotation_requirement END,
    quotation_status = CASE WHEN terms.quotation_status = 'not_requested' THEN (
      SELECT reconcile.quotation_status FROM _estimate_row_commercial_reconcile_0132 AS reconcile
      WHERE reconcile.row_id = terms.row_id
    ) ELSE terms.quotation_status END,
    quotation_reference = COALESCE(terms.quotation_reference, (
      SELECT reconcile.quotation_reference FROM _estimate_row_commercial_reconcile_0132 AS reconcile
      WHERE reconcile.row_id = terms.row_id
    )),
    quotation_artifact_version_id = COALESCE(terms.quotation_artifact_version_id, (
      SELECT reconcile.quotation_artifact_version_id FROM _estimate_row_commercial_reconcile_0132 AS reconcile
      WHERE reconcile.row_id = terms.row_id
    ))
WHERE EXISTS (
  SELECT 1 FROM _estimate_row_commercial_reconcile_0132 AS reconcile
  WHERE reconcile.row_id = terms.row_id
)
  AND terms.terms_revision = 1;

DROP TABLE _estimate_row_commercial_reconcile_0132;

SELECT CASE WHEN NOT EXISTS (
  SELECT 1
  FROM estimate_template_row_variant_selections AS selection
  JOIN estimate_template_row_items AS row_item ON row_item.id = selection.template_row_item_id
  JOIN estimate_templates AS template ON template.id = row_item.template_id
  WHERE selection.template_id <> row_item.template_id
     OR selection.workspace_id <> template.workspace_id
) THEN 1 ELSE json('') END AS template_variant_scope_preflight;

SELECT CASE WHEN NOT EXISTS (
  SELECT 1
  FROM estimate_template_alternative_groups AS alternative_group
  JOIN estimate_template_row_items AS row_item ON row_item.id = alternative_group.selected_template_row_item_id
  JOIN estimate_templates AS template ON template.id = row_item.template_id
  WHERE alternative_group.template_id <> row_item.template_id
     OR alternative_group.workspace_id <> template.workspace_id
) THEN 1 ELSE json('') END AS template_alternative_group_scope_preflight;

SELECT CASE WHEN NOT EXISTS (
  SELECT 1
  FROM estimate_template_alternative_members AS member
  JOIN estimate_template_alternative_groups AS alternative_group ON alternative_group.id = member.group_id
  JOIN estimate_template_row_items AS row_item ON row_item.id = member.template_row_item_id
  WHERE alternative_group.template_id <> row_item.template_id
) THEN 1 ELSE json('') END AS template_alternative_member_scope_preflight;

SELECT CASE WHEN NOT EXISTS (
  SELECT 1
  FROM estimate_template_optional_items AS optional_item
  JOIN estimate_template_row_items AS row_item ON row_item.id = optional_item.template_row_item_id
  WHERE optional_item.template_id <> row_item.template_id
) THEN 1 ELSE json('') END AS template_optional_scope_preflight;

CREATE TRIGGER IF NOT EXISTS trg_template_variant_selection_scope_insert
BEFORE INSERT ON estimate_template_row_variant_selections
WHEN NOT EXISTS (
  SELECT 1
  FROM estimate_template_row_items AS row_item
  JOIN estimate_templates AS template ON template.id = row_item.template_id
  WHERE row_item.id = NEW.template_row_item_id
    AND row_item.template_id = NEW.template_id
    AND template.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'template variant selection must belong to one workspace template row');
END;

CREATE TRIGGER IF NOT EXISTS trg_template_variant_selection_scope_update
BEFORE UPDATE ON estimate_template_row_variant_selections
WHEN NOT EXISTS (
  SELECT 1
  FROM estimate_template_row_items AS row_item
  JOIN estimate_templates AS template ON template.id = row_item.template_id
  WHERE row_item.id = NEW.template_row_item_id
    AND row_item.template_id = NEW.template_id
    AND template.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'template variant selection must belong to one workspace template row');
END;

CREATE TRIGGER IF NOT EXISTS trg_template_alternative_group_scope_insert
BEFORE INSERT ON estimate_template_alternative_groups
WHEN NOT EXISTS (
  SELECT 1
  FROM estimate_template_row_items AS row_item
  JOIN estimate_templates AS template ON template.id = row_item.template_id
  WHERE row_item.id = NEW.selected_template_row_item_id
    AND row_item.template_id = NEW.template_id
    AND template.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'template alternative group must select a row in the same workspace template');
END;

CREATE TRIGGER IF NOT EXISTS trg_template_alternative_group_scope_update
BEFORE UPDATE ON estimate_template_alternative_groups
WHEN NOT EXISTS (
  SELECT 1
  FROM estimate_template_row_items AS row_item
  JOIN estimate_templates AS template ON template.id = row_item.template_id
  WHERE row_item.id = NEW.selected_template_row_item_id
    AND row_item.template_id = NEW.template_id
    AND template.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'template alternative group must select a row in the same workspace template');
END;

CREATE TRIGGER IF NOT EXISTS trg_template_alternative_member_scope_insert
BEFORE INSERT ON estimate_template_alternative_members
WHEN NOT EXISTS (
  SELECT 1
  FROM estimate_template_alternative_groups AS alternative_group
  JOIN estimate_template_row_items AS row_item ON row_item.id = NEW.template_row_item_id
  WHERE alternative_group.id = NEW.group_id
    AND alternative_group.template_id = row_item.template_id
)
BEGIN
  SELECT RAISE(ABORT, 'template alternative member must belong to its group template');
END;

CREATE TRIGGER IF NOT EXISTS trg_template_alternative_member_scope_update
BEFORE UPDATE ON estimate_template_alternative_members
WHEN NOT EXISTS (
  SELECT 1
  FROM estimate_template_alternative_groups AS alternative_group
  JOIN estimate_template_row_items AS row_item ON row_item.id = NEW.template_row_item_id
  WHERE alternative_group.id = NEW.group_id
    AND alternative_group.template_id = row_item.template_id
)
BEGIN
  SELECT RAISE(ABORT, 'template alternative member must belong to its group template');
END;

CREATE TRIGGER IF NOT EXISTS trg_template_optional_scope_insert
BEFORE INSERT ON estimate_template_optional_items
WHEN NOT EXISTS (
  SELECT 1 FROM estimate_template_row_items AS row_item
  WHERE row_item.id = NEW.template_row_item_id
    AND row_item.template_id = NEW.template_id
)
BEGIN
  SELECT RAISE(ABORT, 'template optional row must belong to the same template');
END;

CREATE TRIGGER IF NOT EXISTS trg_template_optional_scope_update
BEFORE UPDATE ON estimate_template_optional_items
WHEN NOT EXISTS (
  SELECT 1 FROM estimate_template_row_items AS row_item
  WHERE row_item.id = NEW.template_row_item_id
    AND row_item.template_id = NEW.template_id
)
BEGIN
  SELECT RAISE(ABORT, 'template optional row must belong to the same template');
END;
