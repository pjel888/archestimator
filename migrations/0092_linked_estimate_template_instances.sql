ALTER TABLE estimate_templates ADD COLUMN current_version_number INTEGER NOT NULL DEFAULT 1
  CHECK (current_version_number >= 1);

ALTER TABLE estimate_templates ADD COLUMN archived_at TEXT;
ALTER TABLE estimate_templates ADD COLUMN archived_by TEXT;

CREATE TABLE estimate_template_versions (
  template_id TEXT NOT NULL,
  version_number INTEGER NOT NULL CHECK (version_number >= 1),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  snapshot_json TEXT NOT NULL CHECK (
    json_valid(snapshot_json)
    AND json_type(snapshot_json) = 'object'
  ),
  source_fingerprint TEXT NOT NULL CHECK (length(trim(source_fingerprint)) > 0),
  change_kind TEXT NOT NULL CHECK (length(trim(change_kind)) > 0),
  change_summary_json TEXT NOT NULL DEFAULT '{}' CHECK (
    json_valid(change_summary_json)
    AND json_type(change_summary_json) = 'object'
  ),
  created_by TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (template_id, version_number),
  FOREIGN KEY (template_id, workspace_id)
    REFERENCES estimate_templates(id, workspace_id) ON DELETE CASCADE
);

CREATE INDEX idx_estimate_template_versions_workspace_template
  ON estimate_template_versions(workspace_id, template_id, version_number DESC);

CREATE TRIGGER trg_estimate_template_versions_immutable
BEFORE UPDATE ON estimate_template_versions
BEGIN
  SELECT RAISE(ABORT, 'template_version_immutable');
END;

INSERT INTO estimate_template_versions (
  template_id,
  version_number,
  workspace_id,
  snapshot_json,
  source_fingerprint,
  change_kind,
  change_summary_json,
  created_by,
  created_at
)
SELECT
  template.id,
  1,
  template.workspace_id,
  json_object(
    'schemaVersion', 1,
    'template', json_object(
      'id', template.id,
      'name', template.name,
      'description', template.description,
      'category', template.category
    ),
    'nodes', json(COALESCE((
      SELECT json_group_array(json(ordered_nodes.node_json))
      FROM (
        SELECT json_object(
          'id', node.id,
          'parentId', node.parent_id,
          'kind', node.kind,
          'name', node.name,
          'sortOrder', node.sort_order,
          'metadata', json(node.metadata)
        ) AS node_json
        FROM estimate_template_nodes AS node
        WHERE node.template_id = template.id
        ORDER BY node.sort_order ASC, node.id ASC
      ) AS ordered_nodes
    ), '[]')),
    'rows', json(COALESCE((
      SELECT json_group_array(json(ordered_rows.row_json))
      FROM (
        SELECT CASE
          WHEN row.source_library_item_id IS NOT NULL
            AND row.link_state NOT IN ('unlinked', 'detached')
          THEN json_object(
            'id', row.id,
            'rowKind', 'component',
            'templateNodeId', row.template_node_id,
            'sortOrder', row.sort_order,
            'sourceLibraryItemId', row.source_library_item_id,
            'selectedVariantId', json_extract(row.source_snapshot, '$.priceOptionId'),
            'initialTakeoffDefaults', json_object(
              'quantity', row.quantity,
              'contingencyPercentage', row.contingency_percentage,
              'adjustmentPercentage', row.adjustment_percentage
            )
          )
          ELSE json_patch(
            json_object(
              'id', row.id,
              'rowKind', 'custom',
              'templateNodeId', row.template_node_id,
              'sortOrder', row.sort_order,
              'material', row.material,
              'description', row.description,
              'supplier', row.supplier,
              'supplierId', row.supplier_id,
              'unit', row.unit,
              'unitCost', row.unit_cost,
              'miscCost', row.misc_cost,
              'categoryNodeId', row.category_node_id,
              'discipline', row.discipline,
              'designation', row.designation
            ),
            json_object(
              'sourceSnapshot', CASE
                WHEN row.source_snapshot IS NOT NULL AND json_valid(row.source_snapshot)
                THEN json(row.source_snapshot)
                ELSE json('{}')
              END,
              'metadata', json(row.metadata),
              'initialTakeoffDefaults', json_object(
                'quantity', row.quantity,
                'contingencyPercentage', row.contingency_percentage,
                'adjustmentPercentage', row.adjustment_percentage
              )
            )
          )
        END AS row_json
        FROM estimate_template_row_items AS row
        WHERE row.template_id = template.id
        ORDER BY row.sort_order ASC, row.id ASC
      ) AS ordered_rows
    ), '[]'))
  ),
  'legacy-v1:' || template.id || ':' || template.updated_at,
  'legacy_backfill',
  json_object('summary', 'Initial version created from the existing Template graph.'),
  template.created_by,
  template.updated_at
FROM estimate_templates AS template;

CREATE TABLE estimate_template_instances (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  template_id TEXT,
  source_template_id TEXT NOT NULL CHECK (length(trim(source_template_id)) > 0),
  project_id TEXT NOT NULL,
  estimate_id TEXT NOT NULL,
  estimate_tab_id TEXT NOT NULL CHECK (length(trim(estimate_tab_id)) > 0),
  target_parent_node_id TEXT,
  link_state TEXT NOT NULL CHECK (
    link_state IN ('linked', 'updating', 'failed', 'detached')
  ),
  applied_version_number INTEGER NOT NULL CHECK (applied_version_number >= 1),
  target_version_number INTEGER NOT NULL CHECK (
    target_version_number >= applied_version_number
  ),
  last_error_code TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  detached_at TEXT,
  detached_by TEXT,
  detached_root_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (
    json_valid(detached_root_ids_json)
    AND json_type(detached_root_ids_json) = 'array'
  ),
  CHECK (
    (link_state = 'detached' AND template_id IS NULL AND detached_at IS NOT NULL)
    OR (link_state <> 'detached' AND template_id IS NOT NULL AND detached_at IS NULL)
  ),
  CHECK (template_id IS NULL OR source_template_id = template_id),
  UNIQUE (id, workspace_id, estimate_id),
  UNIQUE (id, workspace_id, template_id),
  FOREIGN KEY (template_id, workspace_id)
    REFERENCES estimate_templates(id, workspace_id) ON DELETE RESTRICT,
  FOREIGN KEY (project_id, workspace_id)
    REFERENCES projects(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (estimate_id, project_id)
    REFERENCES estimates(id, project_id) ON DELETE CASCADE
);

CREATE TRIGGER guard_template_instance_source_identity
BEFORE UPDATE OF source_template_id ON estimate_template_instances
WHEN NEW.source_template_id <> OLD.source_template_id
BEGIN
  SELECT RAISE(ABORT, 'template_instance_source_identity_immutable');
END;

CREATE TRIGGER guard_template_instance_tab_insert
BEFORE INSERT ON estimate_template_instances
WHEN NOT EXISTS (
  SELECT 1
  FROM estimate_tabs AS tab
  WHERE tab.id = NEW.estimate_tab_id
    AND tab.estimate_id = NEW.estimate_id
    AND tab.archived_at IS NULL
)
BEGIN
  SELECT RAISE(ABORT, 'template_instance_tab_scope');
END;

CREATE TRIGGER guard_template_instance_tab_update
BEFORE UPDATE OF estimate_tab_id, estimate_id ON estimate_template_instances
WHEN NOT EXISTS (
  SELECT 1
  FROM estimate_tabs AS tab
  WHERE tab.id = NEW.estimate_tab_id
    AND tab.estimate_id = NEW.estimate_id
    AND tab.archived_at IS NULL
)
BEGIN
  SELECT RAISE(ABORT, 'template_instance_tab_scope');
END;

CREATE TRIGGER guard_template_instance_parent_insert
BEFORE INSERT ON estimate_template_instances
WHEN NEW.target_parent_node_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM estimate_nodes AS node
    WHERE node.id = NEW.target_parent_node_id
      AND node.estimate_id = NEW.estimate_id
      AND node.estimate_tab_id = NEW.estimate_tab_id
  )
BEGIN
  SELECT RAISE(ABORT, 'template_instance_parent_scope');
END;

CREATE TRIGGER guard_template_instance_parent_update
BEFORE UPDATE OF target_parent_node_id, estimate_id, estimate_tab_id ON estimate_template_instances
WHEN NEW.target_parent_node_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM estimate_nodes AS node
    WHERE node.id = NEW.target_parent_node_id
      AND node.estimate_id = NEW.estimate_id
      AND node.estimate_tab_id = NEW.estimate_tab_id
  )
BEGIN
  SELECT RAISE(ABORT, 'template_instance_parent_scope');
END;

CREATE INDEX idx_estimate_template_instances_template_state
  ON estimate_template_instances(template_id, link_state, target_version_number, id)
  WHERE template_id IS NOT NULL;

CREATE INDEX idx_estimate_template_instances_estimate_tab
  ON estimate_template_instances(estimate_id, estimate_tab_id, link_state, id);

CREATE TABLE estimate_template_instance_nodes (
  instance_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  estimate_id TEXT NOT NULL,
  template_node_id TEXT NOT NULL CHECK (length(trim(template_node_id)) > 0),
  estimate_node_id TEXT NOT NULL CHECK (length(trim(estimate_node_id)) > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (instance_id, template_node_id),
  UNIQUE (instance_id, estimate_node_id),
  FOREIGN KEY (instance_id, workspace_id, estimate_id)
    REFERENCES estimate_template_instances(id, workspace_id, estimate_id) ON DELETE CASCADE
);

CREATE TRIGGER guard_template_instance_node_target_insert
BEFORE INSERT ON estimate_template_instance_nodes
WHEN NOT EXISTS (
  SELECT 1
  FROM estimate_template_instances AS instance
  JOIN estimate_nodes AS node
    ON node.id = NEW.estimate_node_id
   AND node.estimate_id = NEW.estimate_id
   AND node.estimate_tab_id = instance.estimate_tab_id
  WHERE instance.id = NEW.instance_id
    AND instance.workspace_id = NEW.workspace_id
    AND instance.estimate_id = NEW.estimate_id
)
BEGIN
  SELECT RAISE(ABORT, 'template_mapping_target_scope');
END;

CREATE TRIGGER guard_template_instance_node_target_update
BEFORE UPDATE OF instance_id, workspace_id, estimate_id, estimate_node_id
ON estimate_template_instance_nodes
WHEN NOT EXISTS (
  SELECT 1
  FROM estimate_template_instances AS instance
  JOIN estimate_nodes AS node
    ON node.id = NEW.estimate_node_id
   AND node.estimate_id = NEW.estimate_id
   AND node.estimate_tab_id = instance.estimate_tab_id
  WHERE instance.id = NEW.instance_id
    AND instance.workspace_id = NEW.workspace_id
    AND instance.estimate_id = NEW.estimate_id
)
BEGIN
  SELECT RAISE(ABORT, 'template_mapping_target_scope');
END;

CREATE INDEX idx_template_instance_nodes_estimate_node
  ON estimate_template_instance_nodes(estimate_node_id, instance_id);

CREATE TRIGGER guard_template_instance_nested_parent_insert
BEFORE INSERT ON estimate_template_instances
WHEN NEW.target_parent_node_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM estimate_template_instance_nodes AS mapping
    JOIN estimate_template_instances AS parent_instance
      ON parent_instance.id = mapping.instance_id
     AND parent_instance.workspace_id = mapping.workspace_id
     AND parent_instance.estimate_id = mapping.estimate_id
    WHERE mapping.estimate_id = NEW.estimate_id
      AND mapping.estimate_node_id = NEW.target_parent_node_id
      AND parent_instance.link_state IN ('linked', 'updating', 'failed')
  )
BEGIN
  SELECT RAISE(ABORT, 'template_instance_nested_parent');
END;

CREATE TRIGGER guard_template_instance_nested_parent_update
BEFORE UPDATE OF target_parent_node_id, estimate_id ON estimate_template_instances
WHEN NEW.target_parent_node_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM estimate_template_instance_nodes AS mapping
    JOIN estimate_template_instances AS parent_instance
      ON parent_instance.id = mapping.instance_id
     AND parent_instance.workspace_id = mapping.workspace_id
     AND parent_instance.estimate_id = mapping.estimate_id
    WHERE mapping.estimate_id = NEW.estimate_id
      AND mapping.estimate_node_id = NEW.target_parent_node_id
      AND parent_instance.id <> NEW.id
      AND parent_instance.link_state IN ('linked', 'updating', 'failed')
  )
BEGIN
  SELECT RAISE(ABORT, 'template_instance_nested_parent');
END;

CREATE TABLE estimate_template_instance_rows (
  instance_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  estimate_id TEXT NOT NULL,
  template_row_item_id TEXT NOT NULL CHECK (length(trim(template_row_item_id)) > 0),
  estimate_row_item_id TEXT NOT NULL CHECK (length(trim(estimate_row_item_id)) > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (instance_id, template_row_item_id),
  UNIQUE (instance_id, estimate_row_item_id),
  FOREIGN KEY (instance_id, workspace_id, estimate_id)
    REFERENCES estimate_template_instances(id, workspace_id, estimate_id) ON DELETE CASCADE
);

CREATE TRIGGER guard_template_instance_row_target_insert
BEFORE INSERT ON estimate_template_instance_rows
WHEN NOT EXISTS (
  SELECT 1
  FROM estimate_template_instances AS instance
  JOIN estimate_row_items AS row_item
    ON row_item.id = NEW.estimate_row_item_id
   AND row_item.estimate_id = NEW.estimate_id
  JOIN estimate_nodes AS node
    ON node.id = row_item.node_id
   AND node.estimate_id = NEW.estimate_id
   AND node.estimate_tab_id = instance.estimate_tab_id
  JOIN estimate_template_instance_nodes AS node_map
    ON node_map.instance_id = NEW.instance_id
   AND node_map.workspace_id = NEW.workspace_id
   AND node_map.estimate_id = NEW.estimate_id
   AND node_map.estimate_node_id = node.id
  WHERE instance.id = NEW.instance_id
    AND instance.workspace_id = NEW.workspace_id
    AND instance.estimate_id = NEW.estimate_id
)
BEGIN
  SELECT RAISE(ABORT, 'template_mapping_target_scope');
END;

CREATE TRIGGER guard_template_instance_row_target_update
BEFORE UPDATE OF instance_id, workspace_id, estimate_id, estimate_row_item_id
ON estimate_template_instance_rows
WHEN NOT EXISTS (
  SELECT 1
  FROM estimate_template_instances AS instance
  JOIN estimate_row_items AS row_item
    ON row_item.id = NEW.estimate_row_item_id
   AND row_item.estimate_id = NEW.estimate_id
  JOIN estimate_nodes AS node
    ON node.id = row_item.node_id
   AND node.estimate_id = NEW.estimate_id
   AND node.estimate_tab_id = instance.estimate_tab_id
  JOIN estimate_template_instance_nodes AS node_map
    ON node_map.instance_id = NEW.instance_id
   AND node_map.workspace_id = NEW.workspace_id
   AND node_map.estimate_id = NEW.estimate_id
   AND node_map.estimate_node_id = node.id
  WHERE instance.id = NEW.instance_id
    AND instance.workspace_id = NEW.workspace_id
    AND instance.estimate_id = NEW.estimate_id
)
BEGIN
  SELECT RAISE(ABORT, 'template_mapping_target_scope');
END;

CREATE INDEX idx_template_instance_rows_estimate_row
  ON estimate_template_instance_rows(estimate_row_item_id, instance_id);

CREATE TABLE estimate_template_propagation_jobs (
  instance_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  target_version_number INTEGER NOT NULL CHECK (target_version_number >= 1),
  state TEXT NOT NULL CHECK (state IN ('pending', 'processing', 'completed', 'dead')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  available_at TEXT NOT NULL,
  lease_token TEXT,
  lease_expires_at TEXT,
  last_error_code TEXT,
  failure_class TEXT CHECK (
    failure_class IS NULL OR failure_class IN (
      'attempts_exhausted',
      'component_unavailable',
      'access_revoked',
      'scope_integrity',
      'mapping_repair_required'
    )
  ),
  retryable INTEGER CHECK (retryable IS NULL OR retryable IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  CHECK (
    (state = 'processing' AND lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)
    OR (state <> 'processing' AND lease_token IS NULL AND lease_expires_at IS NULL)
  ),
  CHECK (
    (state = 'dead' AND failure_class IS NOT NULL AND retryable IS NOT NULL)
    OR (state <> 'dead' AND failure_class IS NULL AND retryable IS NULL)
  ),
  CHECK (
    state <> 'dead'
    OR (failure_class = 'attempts_exhausted' AND retryable = 1)
    OR (failure_class <> 'attempts_exhausted' AND retryable = 0)
  ),
  FOREIGN KEY (instance_id, workspace_id, template_id)
    REFERENCES estimate_template_instances(id, workspace_id, template_id) ON DELETE CASCADE,
  FOREIGN KEY (template_id, workspace_id)
    REFERENCES estimate_templates(id, workspace_id) ON DELETE CASCADE
);

CREATE INDEX idx_template_propagation_jobs_ready
  ON estimate_template_propagation_jobs(available_at, updated_at, instance_id)
  WHERE state = 'pending';

CREATE INDEX idx_template_propagation_jobs_expired
  ON estimate_template_propagation_jobs(lease_expires_at, instance_id)
  WHERE state = 'processing';

CREATE INDEX idx_template_propagation_jobs_retryable_dead
  ON estimate_template_propagation_jobs(updated_at, instance_id)
  WHERE state = 'dead' AND retryable = 1;

CREATE TABLE estimate_template_mutation_intents (
  intent_id TEXT PRIMARY KEY CHECK (length(trim(intent_id)) > 0),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL CHECK (length(trim(template_id)) > 0),
  created_by TEXT NOT NULL CHECK (length(trim(created_by)) > 0),
  request_fingerprint TEXT NOT NULL CHECK (length(request_fingerprint) = 64),
  normalized_payload_json TEXT NOT NULL CHECK (
    json_valid(normalized_payload_json)
    AND json_type(normalized_payload_json) = 'object'
    AND length(normalized_payload_json) <= 262144
  ),
  expected_version_number INTEGER NOT NULL CHECK (expected_version_number >= 1),
  impact_fingerprint TEXT NOT NULL CHECK (length(trim(impact_fingerprint)) > 0),
  state TEXT NOT NULL CHECK (state IN ('pending', 'committed', 'not_applied')),
  execution_lease_token TEXT,
  execution_lease_expires_at TEXT,
  committed_version_number INTEGER CHECK (committed_version_number >= 1),
  result_json TEXT CHECK (
    result_json IS NULL
    OR (json_valid(result_json) AND json_type(result_json) = 'object')
  ),
  not_applied_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  resolved_at TEXT,
  CHECK (
    (execution_lease_token IS NULL AND execution_lease_expires_at IS NULL)
    OR (
      state = 'pending'
      AND execution_lease_token IS NOT NULL
      AND execution_lease_expires_at IS NOT NULL
    )
  ),
  CHECK (
    (
      state = 'pending'
      AND committed_version_number IS NULL
      AND result_json IS NULL
      AND not_applied_code IS NULL
      AND resolved_at IS NULL
    )
    OR (
      state = 'committed'
      AND committed_version_number IS NOT NULL
      AND result_json IS NOT NULL
      AND not_applied_code IS NULL
      AND resolved_at IS NOT NULL
    )
    OR (
      state = 'not_applied'
      AND committed_version_number IS NULL
      AND not_applied_code IS NOT NULL
      AND resolved_at IS NOT NULL
    )
  )
);

CREATE UNIQUE INDEX uq_template_mutation_intents_one_pending
  ON estimate_template_mutation_intents(workspace_id, template_id)
  WHERE state = 'pending';

CREATE TRIGGER trg_template_mutation_intents_validate_scope
BEFORE INSERT ON estimate_template_mutation_intents
WHEN NOT EXISTS (
  SELECT 1
  FROM estimate_templates AS template
  WHERE template.id = NEW.template_id
    AND template.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'template_mutation_intent_scope');
END;

CREATE TRIGGER trg_template_mutation_intents_immutable_command
BEFORE UPDATE ON estimate_template_mutation_intents
WHEN OLD.intent_id IS NOT NEW.intent_id
  OR OLD.workspace_id IS NOT NEW.workspace_id
  OR OLD.template_id IS NOT NEW.template_id
  OR OLD.created_by IS NOT NEW.created_by
  OR OLD.request_fingerprint IS NOT NEW.request_fingerprint
  OR OLD.normalized_payload_json IS NOT NEW.normalized_payload_json
  OR OLD.expected_version_number IS NOT NEW.expected_version_number
  OR OLD.impact_fingerprint IS NOT NEW.impact_fingerprint
  OR OLD.created_at IS NOT NEW.created_at
BEGIN
  SELECT RAISE(ABORT, 'template_mutation_intent_immutable_command');
END;

CREATE INDEX idx_template_mutation_intents_pending_lease
  ON estimate_template_mutation_intents(execution_lease_expires_at, updated_at, intent_id)
  WHERE state = 'pending';

CREATE INDEX idx_template_mutation_intents_resolved
  ON estimate_template_mutation_intents(resolved_at, intent_id)
  WHERE state <> 'pending';
