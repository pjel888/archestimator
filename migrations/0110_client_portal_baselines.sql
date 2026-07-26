CREATE TABLE client_portal_baselines (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  workspace_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  portal_id TEXT NOT NULL,
  baseline_number INTEGER NOT NULL CHECK (baseline_number > 0),
  issue_id TEXT NOT NULL REFERENCES client_portal_issues(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('active', 'superseded', 'voided')),
  content_hash TEXT NOT NULL CHECK (length(trim(content_hash)) = 64),
  total_minor_units INTEGER NOT NULL,
  currency_code TEXT NOT NULL CHECK (length(currency_code) = 3),
  established_by_decision_id TEXT NOT NULL REFERENCES client_portal_decisions(id) ON DELETE RESTRICT,
  established_at TEXT NOT NULL,
  superseded_by_baseline_id TEXT REFERENCES client_portal_baselines(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  superseded_at TEXT,
  voided_at TEXT,
  voided_by TEXT,
  void_reason TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id, workspace_id) REFERENCES projects(id, workspace_id) ON DELETE RESTRICT,
  FOREIGN KEY (portal_id, project_id, workspace_id) REFERENCES client_portals(id, project_id, workspace_id) ON DELETE RESTRICT,
  UNIQUE (portal_id, baseline_number),
  CHECK (
    (status = 'active' AND superseded_by_baseline_id IS NULL AND superseded_at IS NULL AND voided_at IS NULL AND voided_by IS NULL AND void_reason IS NULL)
    OR (status = 'superseded' AND superseded_by_baseline_id IS NOT NULL AND superseded_at IS NOT NULL AND voided_at IS NULL AND voided_by IS NULL AND void_reason IS NULL)
    OR (status = 'voided' AND superseded_by_baseline_id IS NULL AND superseded_at IS NULL AND voided_at IS NOT NULL AND voided_by IS NOT NULL AND void_reason IS NOT NULL)
  )
);

CREATE UNIQUE INDEX idx_client_portal_baselines_active
  ON client_portal_baselines(portal_id)
  WHERE status = 'active';

CREATE UNIQUE INDEX idx_client_portal_baselines_issue_nonvoided
  ON client_portal_baselines(issue_id)
  WHERE status <> 'voided';

CREATE INDEX idx_client_portal_baselines_project_established
  ON client_portal_baselines(project_id, established_at DESC, id DESC);

CREATE TABLE client_portal_baseline_backfill_exceptions (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
  portal_id TEXT NOT NULL REFERENCES client_portals(id) ON DELETE RESTRICT,
  issue_id TEXT NOT NULL REFERENCES client_portal_issues(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (reason IN ('decision_evidence_ambiguous', 'source_identity_missing', 'currency_mismatch', 'minor_unit_projection_missing')),
  details_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(details_json) AND json_type(details_json) = 'object'),
  detected_at TEXT NOT NULL,
  resolved_at TEXT,
  UNIQUE (portal_id, issue_id, reason)
);

CREATE TRIGGER client_portal_baselines_integrity_insert
BEFORE INSERT ON client_portal_baselines
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM client_portal_issues AS issue
    JOIN client_portals AS portal ON portal.id = issue.portal_id
    JOIN client_portal_decisions AS decision ON decision.id = NEW.established_by_decision_id
      AND decision.portal_id = issue.portal_id
      AND decision.issue_id = issue.id
      AND decision.decision = 'approved'
      AND decision.voided_at IS NULL
      AND decision.issue_content_hash = issue.content_hash
    WHERE issue.id = NEW.issue_id
      AND issue.status = 'accepted'
      AND issue.portal_id = NEW.portal_id
      AND issue.content_hash = NEW.content_hash
      AND issue.currency_code = NEW.currency_code
      AND portal.project_id = NEW.project_id
      AND portal.workspace_id = NEW.workspace_id
  ) THEN RAISE(ABORT, 'baseline issue or decision integrity mismatch') END;

  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM client_portal_issue_source_estimates AS source_estimate
    WHERE source_estimate.issue_id = NEW.issue_id
    GROUP BY source_estimate.issue_id
    HAVING COUNT(DISTINCT source_estimate.currency_code) = 1
      AND MIN(source_estimate.currency_code) = NEW.currency_code
      AND SUM(source_estimate.total_minor_units) = NEW.total_minor_units
  ) THEN RAISE(ABORT, 'baseline authoritative minor-unit projection mismatch') END;

  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM client_portal_baselines AS predecessor
    WHERE predecessor.superseded_by_baseline_id = NEW.id
      AND (predecessor.portal_id <> NEW.portal_id OR predecessor.baseline_number >= NEW.baseline_number)
  ) THEN RAISE(ABORT, 'baseline predecessor mismatch') END;
END;

CREATE TRIGGER client_portal_baselines_transition_update
BEFORE UPDATE ON client_portal_baselines
BEGIN
  SELECT CASE
    WHEN NEW.id <> OLD.id
      OR NEW.workspace_id <> OLD.workspace_id
      OR NEW.project_id <> OLD.project_id
      OR NEW.portal_id <> OLD.portal_id
      OR NEW.baseline_number <> OLD.baseline_number
      OR NEW.issue_id <> OLD.issue_id
      OR NEW.content_hash <> OLD.content_hash
      OR NEW.total_minor_units <> OLD.total_minor_units
      OR NEW.currency_code <> OLD.currency_code
      OR NEW.established_by_decision_id <> OLD.established_by_decision_id
      OR NEW.established_at <> OLD.established_at
      OR NEW.created_at <> OLD.created_at
    THEN RAISE(ABORT, 'baseline evidence is immutable')
    WHEN OLD.status <> 'active'
    THEN RAISE(ABORT, 'terminal baseline is immutable')
    WHEN NEW.status NOT IN ('superseded', 'voided')
    THEN RAISE(ABORT, 'invalid baseline transition')
  END;

END;

CREATE TRIGGER client_portal_baselines_prevent_delete
BEFORE DELETE ON client_portal_baselines
BEGIN
  SELECT RAISE(ABORT, 'baselines are append-only');
END;
