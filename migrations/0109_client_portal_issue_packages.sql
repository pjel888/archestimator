ALTER TABLE client_portal_issues
ADD COLUMN issue_kind TEXT NOT NULL DEFAULT 'initial_estimate'
CHECK (issue_kind IN ('initial_estimate', 'revision', 'change_order', 'design_review', 'quotation', 'information', 'other'));

ALTER TABLE client_portal_issues
ADD COLUMN draft_id TEXT REFERENCES client_portal_issue_drafts(id) ON DELETE RESTRICT;

ALTER TABLE client_portal_issues
ADD COLUMN based_on_baseline_id TEXT REFERENCES client_portal_baselines(id) ON DELETE RESTRICT;

ALTER TABLE client_portal_issues
ADD COLUMN comparison_issue_id TEXT REFERENCES client_portal_issues(id) ON DELETE RESTRICT;

ALTER TABLE client_portal_issues
ADD COLUMN revision_note TEXT;

ALTER TABLE client_portal_issues
ADD COLUMN change_set_hash TEXT CHECK (change_set_hash IS NULL OR length(trim(change_set_hash)) > 0);

CREATE TABLE client_portal_issue_drafts (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  portal_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'publishing', 'published', 'abandoned')),
  draft_revision INTEGER NOT NULL DEFAULT 1 CHECK (draft_revision > 0),
  issue_kind TEXT NOT NULL CHECK (issue_kind IN ('initial_estimate', 'revision', 'change_order', 'design_review', 'quotation', 'information', 'other')),
  version_label TEXT,
  based_on_issue_id TEXT REFERENCES client_portal_issues(id) ON DELETE RESTRICT,
  based_on_baseline_id TEXT REFERENCES client_portal_baselines(id) ON DELETE RESTRICT,
  comparison_issue_id TEXT REFERENCES client_portal_issues(id) ON DELETE RESTRICT,
  revision_note TEXT,
  assumptions_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(assumptions_json) AND json_type(assumptions_json) = 'array'),
  exclusions_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(exclusions_json) AND json_type(exclusions_json) = 'array'),
  unresolved_items_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(unresolved_items_json) AND json_type(unresolved_items_json) = 'array'),
  requested_decision TEXT NOT NULL DEFAULT 'formal' CHECK (requested_decision IN ('none', 'acknowledgement', 'formal')),
  decision_policy_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(decision_policy_json) AND json_type(decision_policy_json) = 'object'),
  section_overrides_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(section_overrides_json) AND json_type(section_overrides_json) = 'object'),
  created_by TEXT NOT NULL CHECK (length(trim(created_by)) > 0),
  updated_by TEXT NOT NULL CHECK (length(trim(updated_by)) > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_issue_id TEXT REFERENCES client_portal_issues(id) ON DELETE RESTRICT,
  published_at TEXT,
  abandoned_at TEXT,
  FOREIGN KEY (project_id, workspace_id) REFERENCES projects(id, workspace_id) ON DELETE RESTRICT,
  FOREIGN KEY (portal_id, project_id, workspace_id) REFERENCES client_portals(id, project_id, workspace_id) ON DELETE RESTRICT,
  CHECK (
    (status = 'published' AND published_issue_id IS NOT NULL AND published_at IS NOT NULL AND abandoned_at IS NULL)
    OR (status = 'abandoned' AND published_issue_id IS NULL AND published_at IS NULL AND abandoned_at IS NOT NULL)
    OR (status IN ('draft', 'ready', 'publishing') AND published_issue_id IS NULL AND published_at IS NULL AND abandoned_at IS NULL)
  )
);

CREATE UNIQUE INDEX idx_client_portal_issue_drafts_active
  ON client_portal_issue_drafts(portal_id)
  WHERE status IN ('draft', 'ready', 'publishing');
CREATE INDEX idx_client_portal_issue_drafts_project_updated
  ON client_portal_issue_drafts(project_id, updated_at DESC, id DESC);

CREATE TABLE client_portal_issue_draft_estimates (
  draft_id TEXT NOT NULL REFERENCES client_portal_issue_drafts(id) ON DELETE CASCADE,
  estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
  included INTEGER NOT NULL DEFAULT 1 CHECK (included IN (0, 1)),
  PRIMARY KEY (draft_id, estimate_id)
);

CREATE TABLE client_portal_issue_draft_artifacts (
  draft_id TEXT NOT NULL REFERENCES client_portal_issue_drafts(id) ON DELETE CASCADE,
  artifact_version_id TEXT NOT NULL REFERENCES project_artifact_versions(id) ON DELETE RESTRICT,
  purpose TEXT NOT NULL CHECK (purpose IN ('reference', 'review', 'approval', 'evidence', 'contract', 'drawing', 'supporting')),
  commentable INTEGER NOT NULL CHECK (commentable IN (0, 1)),
  downloadable INTEGER NOT NULL CHECK (downloadable IN (0, 1)),
  decision_relevant INTEGER NOT NULL CHECK (decision_relevant IN (0, 1)),
  sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
  display_title TEXT,
  description TEXT,
  PRIMARY KEY (draft_id, artifact_version_id)
);

CREATE TABLE client_portal_issue_draft_requests (
  draft_id TEXT NOT NULL REFERENCES client_portal_issue_drafts(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL REFERENCES project_change_requests(id) ON DELETE RESTRICT,
  request_version_id TEXT NOT NULL REFERENCES project_change_request_versions(id) ON DELETE RESTRICT,
  relationship TEXT NOT NULL CHECK (relationship IN ('origin', 'addresses', 'supports', 'related')),
  sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
  PRIMARY KEY (draft_id, request_version_id)
);

CREATE INDEX idx_client_portal_issue_draft_estimates_order
  ON client_portal_issue_draft_estimates(draft_id, sort_order, estimate_id);
CREATE INDEX idx_client_portal_issue_draft_artifacts_order
  ON client_portal_issue_draft_artifacts(draft_id, sort_order, artifact_version_id);
CREATE INDEX idx_client_portal_issue_draft_requests_order
  ON client_portal_issue_draft_requests(draft_id, sort_order, request_version_id);

CREATE TRIGGER client_portal_issue_draft_estimates_scope_insert
BEFORE INSERT ON client_portal_issue_draft_estimates
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM client_portal_issue_drafts AS draft
    JOIN estimates AS estimate ON estimate.id = NEW.estimate_id AND estimate.project_id = draft.project_id
    WHERE draft.id = NEW.draft_id
  ) THEN RAISE(ABORT, 'issue draft estimate ownership mismatch') END;
END;

CREATE TRIGGER client_portal_issue_draft_artifacts_scope_insert
BEFORE INSERT ON client_portal_issue_draft_artifacts
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM client_portal_issue_drafts AS draft
    JOIN project_artifact_versions AS version ON version.id = NEW.artifact_version_id
      AND version.workspace_id = draft.workspace_id
      AND version.project_id = draft.project_id
    WHERE draft.id = NEW.draft_id
  ) THEN RAISE(ABORT, 'issue draft artifact ownership mismatch') END;
END;

CREATE TRIGGER client_portal_issue_draft_requests_scope_insert
BEFORE INSERT ON client_portal_issue_draft_requests
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM client_portal_issue_drafts AS draft
    JOIN project_change_requests AS request ON request.id = NEW.request_id
      AND request.workspace_id = draft.workspace_id
      AND request.project_id = draft.project_id
    JOIN project_change_request_versions AS version ON version.id = NEW.request_version_id AND version.request_id = request.id
    WHERE draft.id = NEW.draft_id
  ) THEN RAISE(ABORT, 'issue draft request ownership mismatch') END;
END;

CREATE TABLE client_portal_issue_estimates (
  issue_id TEXT NOT NULL REFERENCES client_portal_issues(id) ON DELETE RESTRICT,
  source_estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE RESTRICT,
  public_estimate_id TEXT NOT NULL CHECK (length(trim(public_estimate_id)) > 0),
  sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
  source_revision INTEGER CHECK (source_revision IS NULL OR source_revision >= 0),
  source_hash TEXT NOT NULL CHECK (length(trim(source_hash)) > 0),
  PRIMARY KEY (issue_id, source_estimate_id),
  UNIQUE (issue_id, public_estimate_id)
);

CREATE TABLE client_portal_issue_artifacts (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  issue_id TEXT NOT NULL REFERENCES client_portal_issues(id) ON DELETE RESTRICT,
  artifact_id TEXT NOT NULL REFERENCES project_artifacts(id) ON DELETE RESTRICT,
  artifact_version_id TEXT NOT NULL REFERENCES project_artifact_versions(id) ON DELETE RESTRICT,
  public_artifact_id TEXT NOT NULL CHECK (length(trim(public_artifact_id)) > 0),
  purpose TEXT NOT NULL CHECK (purpose IN ('reference', 'review', 'approval', 'evidence', 'contract', 'drawing', 'supporting')),
  display_title TEXT NOT NULL CHECK (length(trim(display_title)) > 0),
  description TEXT,
  file_name_snapshot TEXT NOT NULL CHECK (length(trim(file_name_snapshot)) > 0),
  content_type_snapshot TEXT NOT NULL CHECK (length(trim(content_type_snapshot)) > 0),
  size_bytes_snapshot INTEGER NOT NULL CHECK (size_bytes_snapshot >= 0),
  content_sha256_snapshot TEXT NOT NULL CHECK (length(trim(content_sha256_snapshot)) > 0),
  commentable INTEGER NOT NULL CHECK (commentable IN (0, 1)),
  downloadable INTEGER NOT NULL CHECK (downloadable IN (0, 1)),
  decision_relevant INTEGER NOT NULL CHECK (decision_relevant IN (0, 1)),
  sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
  policy_snapshot_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(policy_snapshot_json) AND json_type(policy_snapshot_json) = 'object'),
  created_at TEXT NOT NULL,
  UNIQUE (issue_id, artifact_version_id),
  UNIQUE (issue_id, public_artifact_id)
);

CREATE TABLE client_portal_issue_requests (
  issue_id TEXT NOT NULL REFERENCES client_portal_issues(id) ON DELETE RESTRICT,
  request_id TEXT NOT NULL REFERENCES project_change_requests(id) ON DELETE RESTRICT,
  request_version_id TEXT NOT NULL REFERENCES project_change_request_versions(id) ON DELETE RESTRICT,
  relationship TEXT NOT NULL CHECK (relationship IN ('origin', 'addresses', 'supports', 'related')),
  request_code_snapshot TEXT NOT NULL CHECK (length(trim(request_code_snapshot)) > 0),
  title_snapshot TEXT NOT NULL CHECK (length(trim(title_snapshot)) > 0),
  content_hash_snapshot TEXT NOT NULL CHECK (length(trim(content_hash_snapshot)) > 0),
  sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
  PRIMARY KEY (issue_id, request_version_id)
);

CREATE INDEX idx_client_portal_issue_estimates_order
  ON client_portal_issue_estimates(issue_id, sort_order, source_estimate_id);
CREATE INDEX idx_client_portal_issue_artifacts_order
  ON client_portal_issue_artifacts(issue_id, sort_order, artifact_version_id);
CREATE INDEX idx_client_portal_issue_requests_order
  ON client_portal_issue_requests(issue_id, sort_order, request_version_id);

CREATE TRIGGER client_portal_issue_estimates_scope_insert
BEFORE INSERT ON client_portal_issue_estimates
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM client_portal_issues AS issue
    JOIN client_portals AS portal ON portal.id = issue.portal_id
    JOIN estimates AS estimate ON estimate.id = NEW.source_estimate_id AND estimate.project_id = portal.project_id
    WHERE issue.id = NEW.issue_id
  ) THEN RAISE(ABORT, 'issued estimate ownership mismatch') END;
END;

CREATE TRIGGER client_portal_issue_artifacts_scope_insert
BEFORE INSERT ON client_portal_issue_artifacts
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM client_portal_issues AS issue
    JOIN client_portals AS portal ON portal.id = issue.portal_id
    JOIN project_artifacts AS artifact ON artifact.id = NEW.artifact_id
      AND artifact.project_id = portal.project_id
      AND artifact.workspace_id = portal.workspace_id
    JOIN project_artifact_versions AS version ON version.id = NEW.artifact_version_id AND version.artifact_id = artifact.id
    WHERE issue.id = NEW.issue_id
  ) THEN RAISE(ABORT, 'issued artifact ownership mismatch') END;
END;

CREATE TRIGGER client_portal_issue_requests_scope_insert
BEFORE INSERT ON client_portal_issue_requests
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM client_portal_issues AS issue
    JOIN client_portals AS portal ON portal.id = issue.portal_id
    JOIN project_change_requests AS request ON request.id = NEW.request_id
      AND request.project_id = portal.project_id
      AND request.workspace_id = portal.workspace_id
    JOIN project_change_request_versions AS version ON version.id = NEW.request_version_id AND version.request_id = request.id
    WHERE issue.id = NEW.issue_id
  ) THEN RAISE(ABORT, 'issued request ownership mismatch') END;
END;

CREATE TABLE client_portal_issue_source_estimates (
  issue_id TEXT NOT NULL REFERENCES client_portal_issues(id) ON DELETE RESTRICT,
  source_estimate_id TEXT NOT NULL REFERENCES estimates(id) ON DELETE RESTRICT,
  sheet_code_snapshot TEXT,
  name_snapshot TEXT NOT NULL CHECK (length(trim(name_snapshot)) > 0),
  total_minor_units INTEGER NOT NULL,
  currency_code TEXT NOT NULL CHECK (length(currency_code) = 3),
  source_hash TEXT NOT NULL CHECK (length(trim(source_hash)) > 0),
  PRIMARY KEY (issue_id, source_estimate_id)
);

CREATE TABLE client_portal_issue_source_rows (
  issue_id TEXT NOT NULL,
  source_estimate_id TEXT NOT NULL,
  source_tab_id TEXT,
  source_node_id TEXT,
  source_row_id TEXT NOT NULL,
  source_component_id TEXT,
  source_variant_id TEXT,
  row_revision INTEGER NOT NULL CHECK (row_revision >= 0),
  description TEXT NOT NULL,
  designation TEXT NOT NULL,
  discipline TEXT NOT NULL,
  material TEXT NOT NULL,
  quantity_scaled INTEGER NOT NULL,
  unit TEXT NOT NULL,
  unit_cost_minor_units INTEGER NOT NULL,
  misc_cost_minor_units INTEGER NOT NULL,
  contingency_basis_points INTEGER NOT NULL,
  adjustment_basis_points INTEGER NOT NULL,
  row_total_minor_units INTEGER NOT NULL,
  scope_status TEXT NOT NULL CHECK (scope_status IN ('included', 'excluded', 'allowance', 'alternate', 'informational')),
  canonical_row_hash TEXT NOT NULL CHECK (length(trim(canonical_row_hash)) > 0),
  sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
  PRIMARY KEY (issue_id, source_estimate_id, source_row_id),
  FOREIGN KEY (issue_id, source_estimate_id) REFERENCES client_portal_issue_source_estimates(issue_id, source_estimate_id) ON DELETE RESTRICT
);

CREATE TABLE client_portal_issue_source_nodes (
  issue_id TEXT NOT NULL,
  source_estimate_id TEXT NOT NULL,
  source_tab_id TEXT,
  source_node_id TEXT NOT NULL,
  parent_source_node_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('tab', 'group', 'area', 'category', 'subgroup', 'other')),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
  canonical_node_hash TEXT NOT NULL CHECK (length(trim(canonical_node_hash)) > 0),
  PRIMARY KEY (issue_id, source_estimate_id, source_node_id),
  FOREIGN KEY (issue_id, source_estimate_id) REFERENCES client_portal_issue_source_estimates(issue_id, source_estimate_id) ON DELETE RESTRICT
);

CREATE INDEX idx_client_portal_issue_source_rows_order
  ON client_portal_issue_source_rows(issue_id, source_estimate_id, sort_order, source_row_id);
CREATE INDEX idx_client_portal_issue_source_nodes_order
  ON client_portal_issue_source_nodes(issue_id, source_estimate_id, sort_order, source_node_id);

CREATE TABLE client_portal_issue_change_sets (
  issue_id TEXT PRIMARY KEY REFERENCES client_portal_issues(id) ON DELETE RESTRICT,
  comparison_issue_id TEXT REFERENCES client_portal_issues(id) ON DELETE RESTRICT,
  comparison_baseline_id TEXT REFERENCES client_portal_baselines(id) ON DELETE RESTRICT,
  schema_version INTEGER NOT NULL CHECK (schema_version > 0),
  structured_diff_json TEXT NOT NULL CHECK (json_valid(structured_diff_json) AND json_type(structured_diff_json) = 'object'),
  structured_diff_hash TEXT NOT NULL CHECK (length(trim(structured_diff_hash)) > 0),
  deterministic_summary TEXT NOT NULL,
  ai_draft TEXT,
  ai_run_id TEXT,
  ai_model_snapshot TEXT,
  ai_prompt_schema_version INTEGER CHECK (ai_prompt_schema_version IS NULL OR ai_prompt_schema_version > 0),
  final_narrative TEXT NOT NULL CHECK (length(trim(final_narrative)) > 0),
  narrative_source TEXT NOT NULL CHECK (narrative_source IN ('deterministic', 'human', 'ai_reviewed')),
  narrative_approved_by TEXT,
  narrative_approved_at TEXT,
  created_at TEXT NOT NULL,
  CHECK (
    (narrative_source = 'ai_reviewed' AND ai_draft IS NOT NULL AND narrative_approved_by IS NOT NULL AND narrative_approved_at IS NOT NULL)
    OR (narrative_source <> 'ai_reviewed' AND narrative_approved_by IS NULL AND narrative_approved_at IS NULL)
  )
);

CREATE TRIGGER client_portal_issue_change_sets_hash_insert
BEFORE INSERT ON client_portal_issue_change_sets
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM client_portal_issues AS issue
    WHERE issue.id = NEW.issue_id AND issue.change_set_hash = NEW.structured_diff_hash
  ) THEN RAISE(ABORT, 'issue change set hash mismatch') END;
END;
