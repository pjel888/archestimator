-- Close contribution scope/group/row/tab integrity gaps without changing the
-- repository write contract. Alternative membership is deferred so existing
-- atomic group replacement batches may delete and reinsert members safely.

PRAGMA defer_foreign_keys = ON;

CREATE TABLE __0130_contribution_assertion (invalid_count INTEGER NOT NULL);
CREATE TRIGGER __0130_contribution_assertion_fail
BEFORE INSERT ON __0130_contribution_assertion
WHEN NEW.invalid_count <> 0
BEGIN
  SELECT RAISE(ROLLBACK, 'estimate contribution integrity preflight failed');
END;

INSERT INTO __0130_contribution_assertion
SELECT COUNT(*)
FROM estimate_contribution_scopes AS scope
WHERE NOT EXISTS (
  SELECT 1
  FROM estimate_tabs AS tab
  JOIN estimates AS estimate ON estimate.id = tab.estimate_id
  JOIN projects AS project ON project.id = estimate.project_id
  WHERE tab.id = scope.estimate_tab_id
    AND estimate.id = scope.estimate_id
    AND project.id = scope.project_id
    AND project.workspace_id = scope.workspace_id
);

INSERT INTO __0130_contribution_assertion
SELECT COUNT(*)
FROM estimate_alternative_members AS member
JOIN estimate_alternative_groups AS group_row ON group_row.id = member.group_id
JOIN estimate_contribution_scopes AS scope ON scope.id = member.contribution_scope_id
LEFT JOIN estimate_row_items AS row_item ON row_item.id = member.row_item_id
LEFT JOIN estimate_nodes AS node
  ON node.id = row_item.node_id
 AND node.estimate_id = row_item.estimate_id
WHERE group_row.contribution_scope_id <> member.contribution_scope_id
   OR row_item.id IS NULL
   OR row_item.estimate_id <> scope.estimate_id
   OR node.id IS NULL
   OR node.estimate_tab_id <> scope.estimate_tab_id;

INSERT INTO __0130_contribution_assertion
SELECT COUNT(*)
FROM estimate_alternative_groups AS group_row
WHERE NOT EXISTS (
  SELECT 1
  FROM estimate_alternative_members AS member
  WHERE member.group_id = group_row.id
    AND member.contribution_scope_id = group_row.contribution_scope_id
    AND member.row_item_id = group_row.selected_row_item_id
);

INSERT INTO __0130_contribution_assertion
SELECT COUNT(*)
FROM estimate_optional_items AS optional_row
JOIN estimate_contribution_scopes AS scope ON scope.id = optional_row.contribution_scope_id
LEFT JOIN estimate_row_items AS row_item ON row_item.id = optional_row.row_item_id
LEFT JOIN estimate_nodes AS node
  ON node.id = row_item.node_id
 AND node.estimate_id = row_item.estimate_id
WHERE row_item.id IS NULL
   OR row_item.estimate_id <> scope.estimate_id
   OR node.id IS NULL
   OR node.estimate_tab_id <> scope.estimate_tab_id;

DROP TRIGGER __0130_contribution_assertion_fail;
DROP TABLE __0130_contribution_assertion;

DROP TRIGGER IF EXISTS trg_estimate_optional_not_alternative_insert;
DROP TRIGGER IF EXISTS trg_estimate_alternative_not_optional_insert;
DROP TRIGGER IF EXISTS trg_estimate_accessory_edge_root_insert;
DROP TRIGGER IF EXISTS trg_estimate_accessory_edge_root_update;
DROP TRIGGER IF EXISTS trg_estimate_alternative_member_must_be_root_insert;
DROP TRIGGER IF EXISTS trg_estimate_alternative_member_must_be_root_update;

CREATE TABLE estimate_alternative_groups__0130 (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  contribution_scope_id TEXT NOT NULL REFERENCES estimate_contribution_scopes(id) ON DELETE CASCADE,
  selected_row_item_id TEXT NOT NULL REFERENCES estimate_row_items(id) ON DELETE RESTRICT,
  name TEXT NOT NULL DEFAULT '' CHECK (length(name) <= 160),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (contribution_scope_id, id),
  FOREIGN KEY (id, selected_row_item_id)
    REFERENCES estimate_alternative_members__0130(group_id, row_item_id)
    ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE estimate_alternative_members__0130 (
  contribution_scope_id TEXT NOT NULL REFERENCES estimate_contribution_scopes(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL,
  row_item_id TEXT NOT NULL REFERENCES estimate_row_items(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  PRIMARY KEY (group_id, row_item_id),
  UNIQUE (contribution_scope_id, row_item_id),
  FOREIGN KEY (contribution_scope_id, group_id)
    REFERENCES estimate_alternative_groups__0130(contribution_scope_id, id)
    ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
);

INSERT INTO estimate_alternative_groups__0130 (
  id, contribution_scope_id, selected_row_item_id, name, revision, created_at, updated_at
)
SELECT id, contribution_scope_id, selected_row_item_id, name, revision, created_at, updated_at
FROM estimate_alternative_groups;

INSERT INTO estimate_alternative_members__0130 (
  contribution_scope_id, group_id, row_item_id, sort_order, created_at
)
SELECT contribution_scope_id, group_id, row_item_id, sort_order, created_at
FROM estimate_alternative_members;

DROP TABLE estimate_alternative_members;
DROP TABLE estimate_alternative_groups;
ALTER TABLE estimate_alternative_groups__0130 RENAME TO estimate_alternative_groups;
ALTER TABLE estimate_alternative_members__0130 RENAME TO estimate_alternative_members;

CREATE INDEX idx_estimate_alternative_members_scope_sort
  ON estimate_alternative_members(contribution_scope_id, group_id, sort_order, row_item_id);
CREATE UNIQUE INDEX idx_estimate_contribution_scopes_identity
  ON estimate_contribution_scopes(id, estimate_id, estimate_tab_id);

CREATE TRIGGER trg_estimate_contribution_scope_update
BEFORE UPDATE OF workspace_id, project_id, estimate_id, estimate_tab_id ON estimate_contribution_scopes
WHEN NEW.workspace_id <> OLD.workspace_id
  OR NEW.project_id <> OLD.project_id
  OR NEW.estimate_id <> OLD.estimate_id
  OR NEW.estimate_tab_id <> OLD.estimate_tab_id
BEGIN
  SELECT RAISE(ABORT, 'contribution scope workspace project estimate tab identity is immutable');
END;

CREATE TRIGGER trg_estimate_alternative_member_scope_insert
BEFORE INSERT ON estimate_alternative_members
WHEN NOT EXISTS (
  SELECT 1
  FROM estimate_alternative_groups AS group_row
  JOIN estimate_contribution_scopes AS scope ON scope.id = NEW.contribution_scope_id
  JOIN estimate_row_items AS row_item ON row_item.id = NEW.row_item_id
  JOIN estimate_nodes AS node
    ON node.id = row_item.node_id
   AND node.estimate_id = row_item.estimate_id
  WHERE group_row.id = NEW.group_id
    AND group_row.contribution_scope_id = NEW.contribution_scope_id
    AND row_item.estimate_id = scope.estimate_id
    AND node.estimate_tab_id = scope.estimate_tab_id
)
BEGIN
  SELECT RAISE(ABORT, 'alternative member must belong to the same contribution scope and scope estimate tab');
END;

CREATE TRIGGER trg_estimate_alternative_member_scope_update
BEFORE UPDATE OF contribution_scope_id, group_id, row_item_id ON estimate_alternative_members
WHEN NOT EXISTS (
  SELECT 1
  FROM estimate_alternative_groups AS group_row
  JOIN estimate_contribution_scopes AS scope ON scope.id = NEW.contribution_scope_id
  JOIN estimate_row_items AS row_item ON row_item.id = NEW.row_item_id
  JOIN estimate_nodes AS node
    ON node.id = row_item.node_id
   AND node.estimate_id = row_item.estimate_id
  WHERE group_row.id = NEW.group_id
    AND group_row.contribution_scope_id = NEW.contribution_scope_id
    AND row_item.estimate_id = scope.estimate_id
    AND node.estimate_tab_id = scope.estimate_tab_id
)
BEGIN
  SELECT RAISE(ABORT, 'alternative member must belong to the same contribution scope and scope estimate tab');
END;

CREATE TRIGGER trg_estimate_optional_scope_insert
BEFORE INSERT ON estimate_optional_items
WHEN NOT EXISTS (
  SELECT 1
  FROM estimate_contribution_scopes AS scope
  JOIN estimate_row_items AS row_item ON row_item.id = NEW.row_item_id
  JOIN estimate_nodes AS node
    ON node.id = row_item.node_id
   AND node.estimate_id = row_item.estimate_id
  WHERE scope.id = NEW.contribution_scope_id
    AND row_item.estimate_id = scope.estimate_id
    AND node.estimate_tab_id = scope.estimate_tab_id
)
BEGIN
  SELECT RAISE(ABORT, 'optional row must belong to the contribution scope estimate tab');
END;

CREATE TRIGGER trg_estimate_optional_scope_update
BEFORE UPDATE OF contribution_scope_id, row_item_id ON estimate_optional_items
WHEN NOT EXISTS (
  SELECT 1
  FROM estimate_contribution_scopes AS scope
  JOIN estimate_row_items AS row_item ON row_item.id = NEW.row_item_id
  JOIN estimate_nodes AS node
    ON node.id = row_item.node_id
   AND node.estimate_id = row_item.estimate_id
  WHERE scope.id = NEW.contribution_scope_id
    AND row_item.estimate_id = scope.estimate_id
    AND node.estimate_tab_id = scope.estimate_tab_id
)
BEGIN
  SELECT RAISE(ABORT, 'optional row must belong to the contribution scope estimate tab');
END;

CREATE TRIGGER trg_estimate_optional_not_alternative_insert
BEFORE INSERT ON estimate_optional_items
WHEN EXISTS (
  SELECT 1 FROM estimate_alternative_members
  WHERE contribution_scope_id = NEW.contribution_scope_id
    AND row_item_id = NEW.row_item_id
)
BEGIN
  SELECT RAISE(ABORT, 'a row cannot be both optional and an alternative member');
END;

CREATE TRIGGER trg_estimate_optional_not_alternative_update
BEFORE UPDATE OF contribution_scope_id, row_item_id ON estimate_optional_items
WHEN EXISTS (
  SELECT 1 FROM estimate_alternative_members
  WHERE contribution_scope_id = NEW.contribution_scope_id
    AND row_item_id = NEW.row_item_id
)
BEGIN
  SELECT RAISE(ABORT, 'a row cannot be both optional and an alternative member');
END;

CREATE TRIGGER trg_estimate_alternative_not_optional_insert
BEFORE INSERT ON estimate_alternative_members
WHEN EXISTS (
  SELECT 1 FROM estimate_optional_items
  WHERE contribution_scope_id = NEW.contribution_scope_id
    AND row_item_id = NEW.row_item_id
)
BEGIN
  SELECT RAISE(ABORT, 'a row cannot be both optional and an alternative member');
END;

CREATE TRIGGER trg_estimate_alternative_not_optional_update
BEFORE UPDATE OF contribution_scope_id, row_item_id ON estimate_alternative_members
WHEN EXISTS (
  SELECT 1 FROM estimate_optional_items
  WHERE contribution_scope_id = NEW.contribution_scope_id
    AND row_item_id = NEW.row_item_id
)
BEGIN
  SELECT RAISE(ABORT, 'a row cannot be both optional and an alternative member');
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
