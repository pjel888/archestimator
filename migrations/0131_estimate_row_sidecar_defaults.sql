-- Ensure newly inserted estimate and template rows receive canonical variant and commercial sidecars.

CREATE TRIGGER IF NOT EXISTS trg_estimate_row_sidecar_defaults_insert
AFTER INSERT ON estimate_row_items
BEGIN
  INSERT OR IGNORE INTO estimate_row_variant_selections (
    estimate_row_item_id, estimate_id, workspace_id, selected_price_option_id,
    selected_option_snapshot_json, selection_revision, selected_at, selected_by
  )
  SELECT
    NEW.id, NEW.estimate_id, project.workspace_id, price_option.id,
    NEW.source_snapshot_json, 1, NEW.updated_at, NULL
  FROM estimates AS estimate
  JOIN projects AS project ON project.id = estimate.project_id
  JOIN cost_library_item_price_options AS price_option
    ON price_option.id = trim(COALESCE(
      json_extract(NEW.source_snapshot_json, '$.priceOptionId'),
      json_extract(NEW.metadata_json, '$.priceOptionId')
    ))
   AND price_option.workspace_id = project.workspace_id
   AND price_option.item_id = NEW.source_library_item_id
   AND price_option.is_active = 1
  WHERE estimate.id = NEW.estimate_id
    AND NEW.source_library_item_id IS NOT NULL;

  INSERT OR IGNORE INTO estimate_row_variant_selections (
    estimate_row_item_id, estimate_id, workspace_id, selected_price_option_id,
    selected_option_snapshot_json, selection_revision, selected_at, selected_by
  )
  SELECT
    NEW.id, NEW.estimate_id, project.workspace_id,
    trim(json_extract(NEW.source_snapshot_json, '$.priceOptionId')),
    NEW.source_snapshot_json, 1, NEW.updated_at, NULL
  FROM estimates AS estimate
  JOIN projects AS project ON project.id = estimate.project_id
  WHERE estimate.id = NEW.estimate_id
    AND NEW.source_library_item_id IS NULL
    AND trim(COALESCE(json_extract(NEW.source_snapshot_json, '$.priceOptionId'), '')) <> ''
    AND EXISTS (
      SELECT 1 FROM json_each(NEW.source_snapshot_json, '$.priceOptions') AS option
      WHERE json_extract(option.value, '$.id') = json_extract(NEW.source_snapshot_json, '$.priceOptionId')
        AND COALESCE(json_extract(option.value, '$.isActive'), 1) <> 0
    );

  INSERT OR IGNORE INTO estimate_row_commercial_terms (
    row_id, workspace_id, project_id, estimate_id,
    selected_option_id, selected_option_treatment, selected_option_rate_bps,
    selected_option_terms_revision, override_treatment, override_rate_bps,
    quotation_requirement, quotation_status, quotation_reference,
    quotation_artifact_version_id, terms_revision, created_at, updated_at
  )
  SELECT
    NEW.id, project.workspace_id, project.id, NEW.estimate_id,
    option_terms.price_option_id, option_terms.treatment, option_terms.rate_bps,
    option_terms.terms_revision,
    CASE
      WHEN json_type(NEW.source_snapshot_json, '$.taxTreatment') = 'object'
        OR json_extract(NEW.source_snapshot_json, '$.taxTreatment.vatIncluded') IS NOT NULL
      THEN CASE
        WHEN upper(trim(COALESCE(
          json_extract(NEW.source_snapshot_json, '$.taxTreatment.treatment'),
          json_extract(NEW.source_snapshot_json, '$.taxTreatment.basis'), ''
        ))) IN ('INCLUSIVE', 'VAT_INCLUSIVE', 'VAT_INCLUDED', 'INC_VAT', 'IN_VAT') THEN 'inclusive'
        WHEN upper(trim(COALESCE(
          json_extract(NEW.source_snapshot_json, '$.taxTreatment.treatment'),
          json_extract(NEW.source_snapshot_json, '$.taxTreatment.basis'), ''
        ))) IN ('EXEMPT', 'VAT_EXEMPT') THEN 'exempt'
        WHEN json_extract(NEW.source_snapshot_json, '$.taxTreatment.vatIncluded') IN (1, '1', 'true') THEN 'inclusive'
        ELSE 'exclusive'
      END
      ELSE NULL
    END,
    CASE
      WHEN json_type(NEW.source_snapshot_json, '$.taxTreatment') = 'object'
        OR json_extract(NEW.source_snapshot_json, '$.taxTreatment.vatIncluded') IS NOT NULL
      THEN CASE
        WHEN upper(trim(COALESCE(
          json_extract(NEW.source_snapshot_json, '$.taxTreatment.treatment'),
          json_extract(NEW.source_snapshot_json, '$.taxTreatment.basis'), ''
        ))) IN ('EXEMPT', 'VAT_EXEMPT') THEN 0
        WHEN typeof(json_extract(NEW.source_snapshot_json, '$.taxTreatment.rateBps')) IN ('integer', 'real')
          AND json_extract(NEW.source_snapshot_json, '$.taxTreatment.rateBps') BETWEEN 0 AND 10000
          THEN CAST(round(json_extract(NEW.source_snapshot_json, '$.taxTreatment.rateBps')) AS INTEGER)
        WHEN typeof(json_extract(NEW.source_snapshot_json, '$.taxTreatment.vatRate')) IN ('integer', 'real')
          AND json_extract(NEW.source_snapshot_json, '$.taxTreatment.vatRate') BETWEEN 0 AND 1
          THEN CAST(round(json_extract(NEW.source_snapshot_json, '$.taxTreatment.vatRate') * 10000) AS INTEGER)
        WHEN typeof(json_extract(NEW.source_snapshot_json, '$.taxTreatment.vatRate')) IN ('integer', 'real')
          AND json_extract(NEW.source_snapshot_json, '$.taxTreatment.vatRate') > 1
          AND json_extract(NEW.source_snapshot_json, '$.taxTreatment.vatRate') <= 100
          THEN CAST(round(json_extract(NEW.source_snapshot_json, '$.taxTreatment.vatRate') * 100) AS INTEGER)
        ELSE 1200
      END
      ELSE NULL
    END,
    CASE WHEN json_extract(NEW.source_snapshot_json, '$.requiresQuote') IN (1, '1', 'true')
      THEN 'required' ELSE 'not_required' END,
    CASE upper(trim(COALESCE(json_extract(NEW.source_snapshot_json, '$.quotationStatus'), '')))
      WHEN 'REQUESTED' THEN 'requested'
      WHEN 'AVAILABLE' THEN 'available'
      WHEN 'UNAVAILABLE' THEN 'unavailable'
      ELSE 'not_requested'
    END,
    CASE
      WHEN typeof(json_extract(NEW.source_snapshot_json, '$.quotationReference')) = 'text'
        AND length(trim(json_extract(NEW.source_snapshot_json, '$.quotationReference'))) BETWEEN 1 AND 160
        AND lower(json_extract(NEW.source_snapshot_json, '$.quotationReference')) NOT GLOB '*http:*'
        AND lower(json_extract(NEW.source_snapshot_json, '$.quotationReference')) NOT GLOB '*https:*'
        AND lower(json_extract(NEW.source_snapshot_json, '$.quotationReference')) NOT GLOB '*token*'
        AND lower(json_extract(NEW.source_snapshot_json, '$.quotationReference')) NOT GLOB '*signature*'
        AND lower(json_extract(NEW.source_snapshot_json, '$.quotationReference')) NOT GLOB '*storage*'
      THEN trim(json_extract(NEW.source_snapshot_json, '$.quotationReference'))
      ELSE NULL
    END,
    NULL, 1, NEW.created_at, NEW.updated_at
  FROM estimates AS estimate
  JOIN projects AS project ON project.id = estimate.project_id
  LEFT JOIN estimate_row_variant_selections AS selection
    ON selection.estimate_row_item_id = NEW.id
   AND selection.estimate_id = NEW.estimate_id
   AND selection.workspace_id = project.workspace_id
  LEFT JOIN cost_library_item_price_option_commercial_terms AS option_terms
    ON option_terms.workspace_id = project.workspace_id
   AND option_terms.item_id = NEW.source_library_item_id
   AND option_terms.price_option_id = selection.selected_price_option_id
  WHERE estimate.id = NEW.estimate_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_estimate_template_row_variant_default_insert
AFTER INSERT ON estimate_template_row_items
BEGIN
  INSERT OR IGNORE INTO estimate_template_row_variant_selections (
    template_row_item_id, template_id, workspace_id, selected_price_option_id,
    selected_option_snapshot_json, selection_revision, updated_at
  )
  SELECT
    NEW.id, NEW.template_id, template.workspace_id, price_option.id,
    NEW.source_snapshot, 1, NEW.updated_at
  FROM estimate_templates AS template
  JOIN cost_library_item_price_options AS price_option
    ON price_option.id = trim(json_extract(NEW.source_snapshot, '$.priceOptionId'))
   AND price_option.workspace_id = template.workspace_id
   AND price_option.item_id = NEW.source_library_item_id
   AND price_option.is_active = 1
  WHERE template.id = NEW.template_id
    AND NEW.source_library_item_id IS NOT NULL
    AND json_valid(NEW.source_snapshot);

  INSERT OR IGNORE INTO estimate_template_row_variant_selections (
    template_row_item_id, template_id, workspace_id, selected_price_option_id,
    selected_option_snapshot_json, selection_revision, updated_at
  )
  SELECT
    NEW.id, NEW.template_id, template.workspace_id,
    trim(json_extract(NEW.source_snapshot, '$.priceOptionId')),
    NEW.source_snapshot, 1, NEW.updated_at
  FROM estimate_templates AS template
  WHERE template.id = NEW.template_id
    AND NEW.source_library_item_id IS NULL
    AND json_valid(NEW.source_snapshot)
    AND trim(COALESCE(json_extract(NEW.source_snapshot, '$.priceOptionId'), '')) <> ''
    AND EXISTS (
      SELECT 1 FROM json_each(NEW.source_snapshot, '$.priceOptions') AS option
      WHERE json_extract(option.value, '$.id') = json_extract(NEW.source_snapshot, '$.priceOptionId')
        AND COALESCE(json_extract(option.value, '$.isActive'), 1) <> 0
    );
END;

INSERT OR IGNORE INTO estimate_row_variant_selections (
  estimate_row_item_id, estimate_id, workspace_id, selected_price_option_id,
  selected_option_snapshot_json, selection_revision, selected_at, selected_by
)
SELECT
  row_item.id, row_item.estimate_id, project.workspace_id, price_option.id,
  row_item.source_snapshot_json, 1, row_item.updated_at, NULL
FROM estimate_row_items AS row_item
JOIN estimates AS estimate ON estimate.id = row_item.estimate_id
JOIN projects AS project ON project.id = estimate.project_id
JOIN cost_library_item_price_options AS price_option
  ON price_option.id = trim(COALESCE(
    json_extract(row_item.source_snapshot_json, '$.priceOptionId'),
    json_extract(row_item.metadata_json, '$.priceOptionId')
  ))
 AND price_option.workspace_id = project.workspace_id
 AND price_option.item_id = row_item.source_library_item_id
 AND price_option.is_active = 1
WHERE row_item.source_library_item_id IS NOT NULL;

INSERT OR IGNORE INTO estimate_row_variant_selections (
  estimate_row_item_id, estimate_id, workspace_id, selected_price_option_id,
  selected_option_snapshot_json, selection_revision, selected_at, selected_by
)
SELECT
  row_item.id, row_item.estimate_id, project.workspace_id,
  trim(json_extract(row_item.source_snapshot_json, '$.priceOptionId')),
  row_item.source_snapshot_json, 1, row_item.updated_at, NULL
FROM estimate_row_items AS row_item
JOIN estimates AS estimate ON estimate.id = row_item.estimate_id
JOIN projects AS project ON project.id = estimate.project_id
WHERE row_item.source_library_item_id IS NULL
  AND trim(COALESCE(json_extract(row_item.source_snapshot_json, '$.priceOptionId'), '')) <> ''
  AND EXISTS (
    SELECT 1 FROM json_each(row_item.source_snapshot_json, '$.priceOptions') AS option
    WHERE json_extract(option.value, '$.id') = json_extract(row_item.source_snapshot_json, '$.priceOptionId')
      AND COALESCE(json_extract(option.value, '$.isActive'), 1) <> 0
  );

INSERT OR IGNORE INTO estimate_template_row_variant_selections (
  template_row_item_id, template_id, workspace_id, selected_price_option_id,
  selected_option_snapshot_json, selection_revision, updated_at
)
SELECT
  row_item.id, row_item.template_id, template.workspace_id,
  trim(json_extract(row_item.source_snapshot, '$.priceOptionId')),
  row_item.source_snapshot, 1, row_item.updated_at
FROM estimate_template_row_items AS row_item
JOIN estimate_templates AS template ON template.id = row_item.template_id
JOIN cost_library_item_price_options AS price_option
  ON price_option.id = trim(json_extract(row_item.source_snapshot, '$.priceOptionId'))
 AND price_option.workspace_id = template.workspace_id
 AND price_option.item_id = row_item.source_library_item_id
 AND price_option.is_active = 1
WHERE row_item.source_library_item_id IS NOT NULL
  AND json_valid(row_item.source_snapshot);

INSERT OR IGNORE INTO estimate_template_row_variant_selections (
  template_row_item_id, template_id, workspace_id, selected_price_option_id,
  selected_option_snapshot_json, selection_revision, updated_at
)
SELECT
  row_item.id, row_item.template_id, template.workspace_id,
  trim(json_extract(row_item.source_snapshot, '$.priceOptionId')),
  row_item.source_snapshot, 1, row_item.updated_at
FROM estimate_template_row_items AS row_item
JOIN estimate_templates AS template ON template.id = row_item.template_id
WHERE row_item.source_library_item_id IS NULL
  AND json_valid(row_item.source_snapshot)
  AND trim(COALESCE(json_extract(row_item.source_snapshot, '$.priceOptionId'), '')) <> ''
  AND EXISTS (
    SELECT 1 FROM json_each(row_item.source_snapshot, '$.priceOptions') AS option
    WHERE json_extract(option.value, '$.id') = json_extract(row_item.source_snapshot, '$.priceOptionId')
      AND COALESCE(json_extract(option.value, '$.isActive'), 1) <> 0
  );

INSERT OR IGNORE INTO estimate_row_commercial_terms (
  row_id, workspace_id, project_id, estimate_id,
  selected_option_id, selected_option_treatment, selected_option_rate_bps,
  selected_option_terms_revision, quotation_requirement, quotation_status,
  terms_revision, created_at, updated_at
)
SELECT
  row_item.id, project.workspace_id, project.id, row_item.estimate_id,
  option_terms.price_option_id, option_terms.treatment, option_terms.rate_bps,
  option_terms.terms_revision,
  CASE WHEN json_extract(row_item.source_snapshot_json, '$.requiresQuote') IN (1, '1', 'true')
    THEN 'required' ELSE 'not_required' END,
  CASE upper(trim(COALESCE(json_extract(row_item.source_snapshot_json, '$.quotationStatus'), '')))
    WHEN 'REQUESTED' THEN 'requested'
    WHEN 'AVAILABLE' THEN 'available'
    WHEN 'UNAVAILABLE' THEN 'unavailable'
    ELSE 'not_requested'
  END,
  1, row_item.created_at, row_item.updated_at
FROM estimate_row_items AS row_item
JOIN estimates AS estimate ON estimate.id = row_item.estimate_id
JOIN projects AS project ON project.id = estimate.project_id
LEFT JOIN estimate_row_variant_selections AS selection
  ON selection.estimate_row_item_id = row_item.id
 AND selection.estimate_id = row_item.estimate_id
 AND selection.workspace_id = project.workspace_id
LEFT JOIN cost_library_item_price_option_commercial_terms AS option_terms
  ON option_terms.workspace_id = project.workspace_id
 AND option_terms.item_id = row_item.source_library_item_id
 AND option_terms.price_option_id = selection.selected_price_option_id;
