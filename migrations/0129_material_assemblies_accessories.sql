-- Material assembly/accessory relation sidecars.
-- Ordering contract: 0127 owns contribution/alternative/optional state, 0128
-- owns Commercial state, and this migration is additive after both. It does
-- not add tax fields or reparent estimate rows/nodes.

CREATE TABLE estimate_accessory_edges (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  contribution_scope_id TEXT NOT NULL REFERENCES estimate_contribution_scopes(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  estimate_tab_id TEXT NOT NULL REFERENCES estimate_tabs(id) ON DELETE CASCADE,
  parent_row_item_id TEXT NOT NULL REFERENCES estimate_row_items(id) ON DELETE CASCADE,
  child_row_item_id TEXT NOT NULL REFERENCES estimate_row_items(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('required', 'optional')),
  is_included INTEGER NOT NULL DEFAULT 1 CHECK (is_included IN (0, 1)),
  quantity_rule_json TEXT NOT NULL CHECK (
    json_valid(quantity_rule_json)
    AND json_type(quantity_rule_json) = 'object'
    AND json_extract(quantity_rule_json, '$.schemaVersion') = 1
    AND json_extract(quantity_rule_json, '$.kind') IN ('fixed', 'per-parent', 'area', 'edge-length', 'formula')
  ),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (child_row_item_id),
  CHECK (parent_row_item_id <> child_row_item_id),
  CHECK (mode = 'optional' OR is_included = 1)
);

CREATE INDEX idx_estimate_accessory_edges_scope_parent
  ON estimate_accessory_edges(contribution_scope_id, parent_row_item_id, id);
CREATE INDEX idx_estimate_accessory_edges_scope_child
  ON estimate_accessory_edges(contribution_scope_id, child_row_item_id);
CREATE INDEX idx_estimate_accessory_edges_estimate_tab
  ON estimate_accessory_edges(estimate_id, estimate_tab_id, id);

CREATE TRIGGER trg_estimate_accessory_edge_scope_insert
BEFORE INSERT ON estimate_accessory_edges
WHEN NOT EXISTS (
  SELECT 1
  FROM estimate_contribution_scopes AS scope
  JOIN estimate_row_items AS parent_row ON parent_row.id = NEW.parent_row_item_id
  JOIN estimate_row_items AS child_row ON child_row.id = NEW.child_row_item_id
  JOIN estimate_nodes AS parent_node
    ON parent_node.id = parent_row.node_id
   AND parent_node.estimate_id = parent_row.estimate_id
  JOIN estimate_nodes AS child_node
    ON child_node.id = child_row.node_id
   AND child_node.estimate_id = child_row.estimate_id
  JOIN estimates AS estimate ON estimate.id = scope.estimate_id
  JOIN projects AS project ON project.id = scope.project_id
  WHERE scope.id = NEW.contribution_scope_id
    AND scope.workspace_id = NEW.workspace_id
    AND scope.project_id = NEW.project_id
    AND scope.estimate_id = NEW.estimate_id
    AND scope.estimate_tab_id = NEW.estimate_tab_id
    AND estimate.project_id = NEW.project_id
    AND project.workspace_id = NEW.workspace_id
    AND parent_row.estimate_id = NEW.estimate_id
    AND child_row.estimate_id = NEW.estimate_id
    AND parent_row.node_id IS NOT NULL
    AND parent_row.node_id = child_row.node_id
    AND parent_node.estimate_tab_id = NEW.estimate_tab_id
    AND child_node.estimate_tab_id = NEW.estimate_tab_id
)
BEGIN
  SELECT RAISE(ABORT, 'accessory endpoints must share one workspace project estimate tab and canonical node');
END;

CREATE TRIGGER trg_estimate_accessory_edge_scope_update
BEFORE UPDATE OF contribution_scope_id, workspace_id, project_id, estimate_id, estimate_tab_id,
  parent_row_item_id, child_row_item_id ON estimate_accessory_edges
WHEN NOT EXISTS (
  SELECT 1
  FROM estimate_contribution_scopes AS scope
  JOIN estimate_row_items AS parent_row ON parent_row.id = NEW.parent_row_item_id
  JOIN estimate_row_items AS child_row ON child_row.id = NEW.child_row_item_id
  JOIN estimate_nodes AS parent_node
    ON parent_node.id = parent_row.node_id
   AND parent_node.estimate_id = parent_row.estimate_id
  JOIN estimate_nodes AS child_node
    ON child_node.id = child_row.node_id
   AND child_node.estimate_id = child_row.estimate_id
  JOIN estimates AS estimate ON estimate.id = scope.estimate_id
  JOIN projects AS project ON project.id = scope.project_id
  WHERE scope.id = NEW.contribution_scope_id
    AND scope.workspace_id = NEW.workspace_id
    AND scope.project_id = NEW.project_id
    AND scope.estimate_id = NEW.estimate_id
    AND scope.estimate_tab_id = NEW.estimate_tab_id
    AND estimate.project_id = NEW.project_id
    AND project.workspace_id = NEW.workspace_id
    AND parent_row.estimate_id = NEW.estimate_id
    AND child_row.estimate_id = NEW.estimate_id
    AND parent_row.node_id IS NOT NULL
    AND parent_row.node_id = child_row.node_id
    AND parent_node.estimate_tab_id = NEW.estimate_tab_id
    AND child_node.estimate_tab_id = NEW.estimate_tab_id
)
BEGIN
  SELECT RAISE(ABORT, 'accessory endpoints must share one workspace project estimate tab and canonical node');
END;

CREATE TRIGGER trg_estimate_accessory_edge_root_insert
BEFORE INSERT ON estimate_accessory_edges
WHEN EXISTS (
  SELECT 1 FROM estimate_alternative_members
  WHERE contribution_scope_id = NEW.contribution_scope_id
    AND row_item_id = NEW.child_row_item_id
  UNION ALL
  SELECT 1 FROM estimate_optional_items
  WHERE contribution_scope_id = NEW.contribution_scope_id
    AND row_item_id = NEW.child_row_item_id
)
BEGIN
  SELECT RAISE(ABORT, 'alternative members and optional items must remain assembly roots');
END;

CREATE TRIGGER trg_estimate_accessory_edge_root_update
BEFORE UPDATE OF contribution_scope_id, child_row_item_id ON estimate_accessory_edges
WHEN EXISTS (
  SELECT 1 FROM estimate_alternative_members
  WHERE contribution_scope_id = NEW.contribution_scope_id
    AND row_item_id = NEW.child_row_item_id
  UNION ALL
  SELECT 1 FROM estimate_optional_items
  WHERE contribution_scope_id = NEW.contribution_scope_id
    AND row_item_id = NEW.child_row_item_id
)
BEGIN
  SELECT RAISE(ABORT, 'alternative members and optional items must remain assembly roots');
END;

CREATE TRIGGER trg_estimate_accessory_edge_cycle_insert
BEFORE INSERT ON estimate_accessory_edges
WHEN EXISTS (
  WITH RECURSIVE descendants(row_item_id) AS (
    SELECT child_row_item_id
    FROM estimate_accessory_edges
    WHERE contribution_scope_id = NEW.contribution_scope_id
      AND parent_row_item_id = NEW.child_row_item_id
    UNION
    SELECT edge.child_row_item_id
    FROM descendants
    JOIN estimate_accessory_edges AS edge
      ON edge.contribution_scope_id = NEW.contribution_scope_id
     AND edge.parent_row_item_id = descendants.row_item_id
  )
  SELECT 1 FROM descendants
  WHERE row_item_id = NEW.parent_row_item_id
)
BEGIN
  SELECT RAISE(ABORT, 'accessory edge would create a cycle');
END;

CREATE TRIGGER trg_estimate_accessory_edge_cycle_update
BEFORE UPDATE OF contribution_scope_id, parent_row_item_id, child_row_item_id ON estimate_accessory_edges
WHEN EXISTS (
  WITH RECURSIVE descendants(row_item_id) AS (
    SELECT child_row_item_id
    FROM estimate_accessory_edges
    WHERE contribution_scope_id = NEW.contribution_scope_id
      AND parent_row_item_id = NEW.child_row_item_id
      AND id <> OLD.id
    UNION
    SELECT edge.child_row_item_id
    FROM descendants
    JOIN estimate_accessory_edges AS edge
      ON edge.contribution_scope_id = NEW.contribution_scope_id
     AND edge.parent_row_item_id = descendants.row_item_id
     AND edge.id <> OLD.id
  )
  SELECT 1 FROM descendants
  WHERE row_item_id = NEW.parent_row_item_id
)
BEGIN
  SELECT RAISE(ABORT, 'accessory edge would create a cycle');
END;

CREATE TRIGGER trg_estimate_alternative_member_must_be_root_insert
BEFORE INSERT ON estimate_alternative_members
WHEN EXISTS (
  SELECT 1 FROM estimate_accessory_edges
  WHERE contribution_scope_id = NEW.contribution_scope_id
    AND child_row_item_id = NEW.row_item_id
)
BEGIN
  SELECT RAISE(ABORT, 'alternative members must be assembly roots');
END;

CREATE TRIGGER trg_estimate_alternative_member_must_be_root_update
BEFORE UPDATE OF contribution_scope_id, row_item_id ON estimate_alternative_members
WHEN EXISTS (
  SELECT 1 FROM estimate_accessory_edges
  WHERE contribution_scope_id = NEW.contribution_scope_id
    AND child_row_item_id = NEW.row_item_id
)
BEGIN
  SELECT RAISE(ABORT, 'alternative members must be assembly roots');
END;

CREATE TRIGGER trg_estimate_optional_item_must_be_root_insert
BEFORE INSERT ON estimate_optional_items
WHEN EXISTS (
  SELECT 1 FROM estimate_accessory_edges
  WHERE contribution_scope_id = NEW.contribution_scope_id
    AND child_row_item_id = NEW.row_item_id
)
BEGIN
  SELECT RAISE(ABORT, 'optional items must be assembly roots');
END;

CREATE TRIGGER trg_estimate_optional_item_must_be_root_update
BEFORE UPDATE OF contribution_scope_id, row_item_id ON estimate_optional_items
WHEN EXISTS (
  SELECT 1 FROM estimate_accessory_edges
  WHERE contribution_scope_id = NEW.contribution_scope_id
    AND child_row_item_id = NEW.row_item_id
)
BEGIN
  SELECT RAISE(ABORT, 'optional items must be assembly roots');
END;

CREATE TABLE estimate_template_accessory_edges (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  template_id TEXT NOT NULL REFERENCES estimate_templates(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_template_row_item_id TEXT NOT NULL REFERENCES estimate_template_row_items(id) ON DELETE CASCADE,
  child_template_row_item_id TEXT NOT NULL REFERENCES estimate_template_row_items(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('required', 'optional')),
  is_included INTEGER NOT NULL DEFAULT 1 CHECK (is_included IN (0, 1)),
  quantity_rule_json TEXT NOT NULL CHECK (
    json_valid(quantity_rule_json)
    AND json_type(quantity_rule_json) = 'object'
    AND json_extract(quantity_rule_json, '$.schemaVersion') = 1
    AND json_extract(quantity_rule_json, '$.kind') IN ('fixed', 'per-parent', 'area', 'edge-length', 'formula')
  ),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (child_template_row_item_id),
  CHECK (parent_template_row_item_id <> child_template_row_item_id),
  CHECK (mode = 'optional' OR is_included = 1)
);

CREATE INDEX idx_estimate_template_accessory_edges_parent
  ON estimate_template_accessory_edges(template_id, parent_template_row_item_id, id);
CREATE INDEX idx_estimate_template_accessory_edges_child
  ON estimate_template_accessory_edges(template_id, child_template_row_item_id);

CREATE TRIGGER trg_estimate_template_accessory_edge_scope_insert
BEFORE INSERT ON estimate_template_accessory_edges
WHEN NOT EXISTS (
  SELECT 1
  FROM estimate_templates AS template
  JOIN estimate_template_row_items AS parent_row
    ON parent_row.id = NEW.parent_template_row_item_id
   AND parent_row.template_id = template.id
  JOIN estimate_template_row_items AS child_row
    ON child_row.id = NEW.child_template_row_item_id
   AND child_row.template_id = template.id
  JOIN estimate_template_nodes AS parent_node
    ON parent_node.id = parent_row.template_node_id
   AND parent_node.template_id = template.id
  JOIN estimate_template_nodes AS child_node
    ON child_node.id = child_row.template_node_id
   AND child_node.template_id = template.id
  WHERE template.id = NEW.template_id
    AND template.workspace_id = NEW.workspace_id
    AND parent_row.template_node_id = child_row.template_node_id
)
BEGIN
  SELECT RAISE(ABORT, 'template accessory endpoints must share one workspace template and canonical node');
END;

CREATE TRIGGER trg_estimate_template_accessory_edge_scope_update
BEFORE UPDATE OF template_id, workspace_id, parent_template_row_item_id, child_template_row_item_id
ON estimate_template_accessory_edges
WHEN NOT EXISTS (
  SELECT 1
  FROM estimate_templates AS template
  JOIN estimate_template_row_items AS parent_row
    ON parent_row.id = NEW.parent_template_row_item_id
   AND parent_row.template_id = template.id
  JOIN estimate_template_row_items AS child_row
    ON child_row.id = NEW.child_template_row_item_id
   AND child_row.template_id = template.id
  JOIN estimate_template_nodes AS parent_node
    ON parent_node.id = parent_row.template_node_id
   AND parent_node.template_id = template.id
  JOIN estimate_template_nodes AS child_node
    ON child_node.id = child_row.template_node_id
   AND child_node.template_id = template.id
  WHERE template.id = NEW.template_id
    AND template.workspace_id = NEW.workspace_id
    AND parent_row.template_node_id = child_row.template_node_id
)
BEGIN
  SELECT RAISE(ABORT, 'template accessory endpoints must share one workspace template and canonical node');
END;

CREATE TRIGGER trg_estimate_template_accessory_edge_root_insert
BEFORE INSERT ON estimate_template_accessory_edges
WHEN EXISTS (
  SELECT 1
  FROM estimate_template_alternative_members AS member
  JOIN estimate_template_alternative_groups AS group_record ON group_record.id = member.group_id
  WHERE group_record.template_id = NEW.template_id
    AND member.template_row_item_id = NEW.child_template_row_item_id
  UNION ALL
  SELECT 1 FROM estimate_template_optional_items
  WHERE template_id = NEW.template_id
    AND template_row_item_id = NEW.child_template_row_item_id
)
BEGIN
  SELECT RAISE(ABORT, 'template alternative members and optional items must remain assembly roots');
END;

CREATE TRIGGER trg_estimate_template_accessory_edge_root_update
BEFORE UPDATE OF template_id, child_template_row_item_id ON estimate_template_accessory_edges
WHEN EXISTS (
  SELECT 1
  FROM estimate_template_alternative_members AS member
  JOIN estimate_template_alternative_groups AS group_record ON group_record.id = member.group_id
  WHERE group_record.template_id = NEW.template_id
    AND member.template_row_item_id = NEW.child_template_row_item_id
  UNION ALL
  SELECT 1 FROM estimate_template_optional_items
  WHERE template_id = NEW.template_id
    AND template_row_item_id = NEW.child_template_row_item_id
)
BEGIN
  SELECT RAISE(ABORT, 'template alternative members and optional items must remain assembly roots');
END;

CREATE TRIGGER trg_estimate_template_accessory_edge_cycle_insert
BEFORE INSERT ON estimate_template_accessory_edges
WHEN EXISTS (
  WITH RECURSIVE descendants(row_item_id) AS (
    SELECT child_template_row_item_id
    FROM estimate_template_accessory_edges
    WHERE template_id = NEW.template_id
      AND parent_template_row_item_id = NEW.child_template_row_item_id
    UNION
    SELECT edge.child_template_row_item_id
    FROM descendants
    JOIN estimate_template_accessory_edges AS edge
      ON edge.template_id = NEW.template_id
     AND edge.parent_template_row_item_id = descendants.row_item_id
  )
  SELECT 1 FROM descendants
  WHERE row_item_id = NEW.parent_template_row_item_id
)
BEGIN
  SELECT RAISE(ABORT, 'template accessory edge would create a cycle');
END;

CREATE TRIGGER trg_estimate_template_accessory_edge_cycle_update
BEFORE UPDATE OF template_id, parent_template_row_item_id, child_template_row_item_id
ON estimate_template_accessory_edges
WHEN EXISTS (
  WITH RECURSIVE descendants(row_item_id) AS (
    SELECT child_template_row_item_id
    FROM estimate_template_accessory_edges
    WHERE template_id = NEW.template_id
      AND parent_template_row_item_id = NEW.child_template_row_item_id
      AND id <> OLD.id
    UNION
    SELECT edge.child_template_row_item_id
    FROM descendants
    JOIN estimate_template_accessory_edges AS edge
      ON edge.template_id = NEW.template_id
     AND edge.parent_template_row_item_id = descendants.row_item_id
     AND edge.id <> OLD.id
  )
  SELECT 1 FROM descendants
  WHERE row_item_id = NEW.parent_template_row_item_id
)
BEGIN
  SELECT RAISE(ABORT, 'template accessory edge would create a cycle');
END;

CREATE TRIGGER trg_estimate_template_alternative_member_must_be_root_insert
BEFORE INSERT ON estimate_template_alternative_members
WHEN EXISTS (
  SELECT 1
  FROM estimate_template_accessory_edges AS edge
  JOIN estimate_template_alternative_groups AS group_record ON group_record.id = NEW.group_id
  WHERE edge.template_id = group_record.template_id
    AND edge.child_template_row_item_id = NEW.template_row_item_id
)
BEGIN
  SELECT RAISE(ABORT, 'template alternative members must be assembly roots');
END;

CREATE TRIGGER trg_estimate_template_alternative_member_must_be_root_update
BEFORE UPDATE OF group_id, template_row_item_id ON estimate_template_alternative_members
WHEN EXISTS (
  SELECT 1
  FROM estimate_template_accessory_edges AS edge
  JOIN estimate_template_alternative_groups AS group_record ON group_record.id = NEW.group_id
  WHERE edge.template_id = group_record.template_id
    AND edge.child_template_row_item_id = NEW.template_row_item_id
)
BEGIN
  SELECT RAISE(ABORT, 'template alternative members must be assembly roots');
END;

CREATE TRIGGER trg_estimate_template_optional_item_must_be_root_insert
BEFORE INSERT ON estimate_template_optional_items
WHEN EXISTS (
  SELECT 1 FROM estimate_template_accessory_edges
  WHERE template_id = NEW.template_id
    AND child_template_row_item_id = NEW.template_row_item_id
)
BEGIN
  SELECT RAISE(ABORT, 'template optional items must be assembly roots');
END;

CREATE TRIGGER trg_estimate_template_optional_item_must_be_root_update
BEFORE UPDATE OF template_id, template_row_item_id ON estimate_template_optional_items
WHEN EXISTS (
  SELECT 1 FROM estimate_template_accessory_edges
  WHERE template_id = NEW.template_id
    AND child_template_row_item_id = NEW.template_row_item_id
)
BEGIN
  SELECT RAISE(ABORT, 'template optional items must be assembly roots');
END;
