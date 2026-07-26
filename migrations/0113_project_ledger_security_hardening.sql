CREATE TRIGGER project_change_requests_scope_insert
BEFORE INSERT ON project_change_requests
BEGIN
  SELECT CASE WHEN NEW.origin_portal_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM client_portals AS portal
    WHERE portal.id = NEW.origin_portal_id
      AND portal.workspace_id = NEW.workspace_id
      AND portal.project_id = NEW.project_id
  ) THEN RAISE(ABORT, 'change request portal ownership mismatch') END;

  SELECT CASE WHEN NEW.requested_by_actor_type = 'recipient' AND NOT EXISTS (
    SELECT 1 FROM client_portal_recipients AS recipient
    WHERE recipient.id = NEW.requested_by_actor_id
      AND recipient.portal_id = NEW.origin_portal_id
  ) THEN RAISE(ABORT, 'change request recipient ownership mismatch') END;

  SELECT CASE WHEN NEW.resolved_by_issue_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM client_portal_issues AS issue
    JOIN client_portals AS portal ON portal.id = issue.portal_id
    WHERE issue.id = NEW.resolved_by_issue_id
      AND portal.workspace_id = NEW.workspace_id
      AND portal.project_id = NEW.project_id
  ) THEN RAISE(ABORT, 'change request resolution issue ownership mismatch') END;
END;

CREATE TRIGGER project_change_requests_scope_update
BEFORE UPDATE ON project_change_requests
BEGIN
  SELECT CASE WHEN NEW.workspace_id <> OLD.workspace_id
    OR NEW.project_id <> OLD.project_id
    OR NEW.origin_portal_id IS NOT OLD.origin_portal_id
    OR NEW.requested_by_actor_type <> OLD.requested_by_actor_type
    OR NEW.requested_by_actor_id <> OLD.requested_by_actor_id
  THEN RAISE(ABORT, 'change request identity scope is immutable') END;

  SELECT CASE WHEN NEW.resolved_by_issue_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM client_portal_issues AS issue
    JOIN client_portals AS portal ON portal.id = issue.portal_id
    WHERE issue.id = NEW.resolved_by_issue_id
      AND portal.workspace_id = NEW.workspace_id
      AND portal.project_id = NEW.project_id
  ) THEN RAISE(ABORT, 'change request resolution issue ownership mismatch') END;
END;

CREATE TRIGGER project_change_request_targets_immutable_update
BEFORE UPDATE ON project_change_request_targets
BEGIN
  SELECT RAISE(ABORT, 'change request targets are immutable');
END;

CREATE TRIGGER project_change_request_targets_immutable_delete
BEFORE DELETE ON project_change_request_targets
BEGIN
  SELECT RAISE(ABORT, 'change request targets are immutable');
END;

CREATE TRIGGER project_change_request_artifacts_immutable_update
BEFORE UPDATE ON project_change_request_artifacts
BEGIN
  SELECT RAISE(ABORT, 'change request artifact links are immutable');
END;

CREATE TRIGGER project_change_request_artifacts_immutable_delete
BEFORE DELETE ON project_change_request_artifacts
BEGIN
  SELECT RAISE(ABORT, 'change request artifact links are immutable');
END;

CREATE TRIGGER client_portal_issue_draft_estimates_scope_update
BEFORE UPDATE ON client_portal_issue_draft_estimates
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM client_portal_issue_drafts AS draft
    JOIN estimates AS estimate ON estimate.id = NEW.estimate_id AND estimate.project_id = draft.project_id
    WHERE draft.id = NEW.draft_id
  ) THEN RAISE(ABORT, 'issue draft estimate ownership mismatch') END;
END;

CREATE TRIGGER client_portal_issue_draft_artifacts_scope_update
BEFORE UPDATE ON client_portal_issue_draft_artifacts
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM client_portal_issue_drafts AS draft
    JOIN project_artifact_versions AS version ON version.id = NEW.artifact_version_id
      AND version.workspace_id = draft.workspace_id
      AND version.project_id = draft.project_id
    WHERE draft.id = NEW.draft_id
  ) THEN RAISE(ABORT, 'issue draft artifact ownership mismatch') END;
END;

CREATE TRIGGER client_portal_issue_draft_requests_scope_update
BEFORE UPDATE ON client_portal_issue_draft_requests
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

CREATE TRIGGER client_portal_issue_estimates_immutable_update
BEFORE UPDATE ON client_portal_issue_estimates
BEGIN
  SELECT RAISE(ABORT, 'issued estimate links are immutable');
END;

CREATE TRIGGER client_portal_issue_estimates_immutable_delete
BEFORE DELETE ON client_portal_issue_estimates
BEGIN
  SELECT RAISE(ABORT, 'issued estimate links are immutable');
END;

CREATE TRIGGER client_portal_issue_artifacts_immutable_update
BEFORE UPDATE ON client_portal_issue_artifacts
BEGIN
  SELECT RAISE(ABORT, 'issued artifact links are immutable');
END;

CREATE TRIGGER client_portal_issue_artifacts_immutable_delete
BEFORE DELETE ON client_portal_issue_artifacts
BEGIN
  SELECT RAISE(ABORT, 'issued artifact links are immutable');
END;

CREATE TRIGGER client_portal_issue_requests_immutable_update
BEFORE UPDATE ON client_portal_issue_requests
BEGIN
  SELECT RAISE(ABORT, 'issued request links are immutable');
END;

CREATE TRIGGER client_portal_issue_requests_immutable_delete
BEFORE DELETE ON client_portal_issue_requests
BEGIN
  SELECT RAISE(ABORT, 'issued request links are immutable');
END;

CREATE TRIGGER client_portal_issue_source_estimates_scope_insert
BEFORE INSERT ON client_portal_issue_source_estimates
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM client_portal_issues AS issue
    JOIN client_portals AS portal ON portal.id = issue.portal_id
    JOIN estimates AS estimate ON estimate.id = NEW.source_estimate_id
      AND estimate.project_id = portal.project_id
    WHERE issue.id = NEW.issue_id
  ) THEN RAISE(ABORT, 'issue source estimate ownership mismatch') END;
END;

CREATE TRIGGER client_portal_issue_source_estimates_immutable_update
BEFORE UPDATE ON client_portal_issue_source_estimates
BEGIN
  SELECT RAISE(ABORT, 'issue source estimates are immutable');
END;

CREATE TRIGGER client_portal_issue_source_estimates_immutable_delete
BEFORE DELETE ON client_portal_issue_source_estimates
BEGIN
  SELECT RAISE(ABORT, 'issue source estimates are immutable');
END;

CREATE TRIGGER client_portal_issue_source_rows_immutable_update
BEFORE UPDATE ON client_portal_issue_source_rows
BEGIN
  SELECT RAISE(ABORT, 'issue source rows are immutable');
END;

CREATE TRIGGER client_portal_issue_source_rows_immutable_delete
BEFORE DELETE ON client_portal_issue_source_rows
BEGIN
  SELECT RAISE(ABORT, 'issue source rows are immutable');
END;

CREATE TRIGGER client_portal_issue_source_nodes_immutable_update
BEFORE UPDATE ON client_portal_issue_source_nodes
BEGIN
  SELECT RAISE(ABORT, 'issue source nodes are immutable');
END;

CREATE TRIGGER client_portal_issue_source_nodes_immutable_delete
BEFORE DELETE ON client_portal_issue_source_nodes
BEGIN
  SELECT RAISE(ABORT, 'issue source nodes are immutable');
END;

CREATE TRIGGER client_portal_baselines_successor_scope_update
BEFORE UPDATE OF status, superseded_by_baseline_id ON client_portal_baselines
WHEN NEW.status = 'superseded' AND NEW.superseded_by_baseline_id IS NOT NULL
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM client_portal_baselines AS successor
    WHERE successor.id = NEW.superseded_by_baseline_id
      AND (
        successor.workspace_id <> NEW.workspace_id
        OR successor.project_id <> NEW.project_id
        OR successor.portal_id <> NEW.portal_id
        OR successor.baseline_number <= NEW.baseline_number
      )
  ) THEN RAISE(ABORT, 'baseline successor mismatch') END;
END;

CREATE TRIGGER project_commitment_events_causation_scope_insert
BEFORE INSERT ON project_commitment_events
WHEN NEW.causation_event_id IS NOT NULL
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM project_commitment_events AS cause
    WHERE cause.id = NEW.causation_event_id
      AND cause.workspace_id = NEW.workspace_id
      AND cause.project_id = NEW.project_id
      AND cause.id <> NEW.id
      AND cause.occurred_at < NEW.occurred_at
  ) THEN RAISE(ABORT, 'commitment event causation mismatch') END;
END;
