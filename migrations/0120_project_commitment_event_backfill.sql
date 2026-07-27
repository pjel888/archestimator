-- Reconstruct only commitment history supported by durable domain evidence.
-- Internal notes, assignments, analytics, and security/audit noise are intentionally excluded.

INSERT INTO project_commitment_events (
  id, workspace_id, project_id, origin_portal_id, event_type, source_type, source_id,
  source_version_id, issue_id, decision_id, baseline_id, request_id, request_version_id,
  artifact_id, artifact_version_id, legacy_publication_id, root_request_id, correlation_id,
  causation_event_id, actor_type, actor_id, actor_name_snapshot, actor_domain_role_snapshot,
  actor_permission_role_snapshot, title, summary, client_safe_snapshot_json,
  internal_metadata_json, occurred_at, created_at
)
SELECT
  'event_backfill_issue_' || issue.id,
  portal.workspace_id,
  portal.project_id,
  portal.id,
  CASE WHEN issue.supersedes_issue_id IS NULL THEN 'issue.issued' ELSE 'issue.replaced' END,
  'issue',
  issue.id,
  NULL,
  issue.id,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'backfill:0120:issue:' || issue.id || ':issued',
  NULL,
  CASE WHEN issue.issued_by IS NULL THEN 'system' ELSE 'internal_user' END,
  coalesce(issue.issued_by, 'migration:0120'),
  NULL,
  CASE WHEN issue.issued_by IS NULL THEN NULL ELSE 'publisher' END,
  NULL,
  CASE
    WHEN issue.supersedes_issue_id IS NULL THEN issue.version_label || ' was issued'
    ELSE issue.version_label || ' replaced the pending proposal'
  END,
  issue.revision_note,
  json_object(
    'currencyCode', issue.currency_code,
    'issueNumber', issue.issue_number,
    'status', issue.status,
    'totalCost', issue.total_cost,
    'versionLabel', issue.version_label
  ),
  json_object(
    'backfillMigration', '0120',
    'contentHash', issue.content_hash,
    'supersedesIssueId', issue.supersedes_issue_id
  ),
  issue.issued_at,
  issue.created_at
FROM client_portal_issues issue
JOIN client_portals portal ON portal.id = issue.portal_id
WHERE NOT EXISTS (
  SELECT 1
  FROM project_commitment_events event
  WHERE event.source_type = 'issue'
    AND event.source_id = issue.id
    AND event.event_type IN ('issue.issued', 'issue.replaced')
);

INSERT INTO client_portal_event_exposures (
  event_id, portal_id, public_event_id, status, exposure_kind, policy_snapshot_json,
  exposed_by_actor_type, exposed_by_actor_id, exposed_at, withdrawn_at, withdrawal_reason
)
SELECT
  event.id,
  issue.portal_id,
  'issue_backfill_' || issue.issue_number,
  'visible',
  'backfill',
  json_object('capability', 'timeline:view', 'issueNumber', issue.issue_number),
  'system',
  'migration:0120',
  event.occurred_at,
  NULL,
  NULL
FROM client_portal_issues issue
JOIN project_commitment_events event
  ON event.source_type = 'issue'
 AND event.source_id = issue.id
 AND event.event_type IN ('issue.issued', 'issue.replaced')
WHERE NOT EXISTS (
  SELECT 1 FROM client_portal_event_exposures exposure
  WHERE exposure.event_id = event.id AND exposure.portal_id = issue.portal_id
)
  AND NOT EXISTS (
    SELECT 1 FROM client_portal_event_exposures exposure
    WHERE exposure.portal_id = issue.portal_id
      AND exposure.public_event_id = 'issue_backfill_' || issue.issue_number
  );

INSERT INTO project_commitment_events (
  id, workspace_id, project_id, origin_portal_id, event_type, source_type, source_id,
  source_version_id, issue_id, decision_id, baseline_id, request_id, request_version_id,
  artifact_id, artifact_version_id, legacy_publication_id, root_request_id, correlation_id,
  causation_event_id, actor_type, actor_id, actor_name_snapshot, actor_domain_role_snapshot,
  actor_permission_role_snapshot, title, summary, client_safe_snapshot_json,
  internal_metadata_json, occurred_at, created_at
)
SELECT
  'event_backfill_decision_' || decision.id || '_submitted',
  portal.workspace_id,
  portal.project_id,
  portal.id,
  'decision.' || decision.decision,
  'decision',
  decision.id,
  NULL,
  NULL,
  decision.id,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'backfill:0120:decision:' || decision.id || ':submitted',
  NULL,
  'recipient',
  decision.recipient_id,
  decision.signer_name,
  decision.signer_domain_role_snapshot,
  decision.signer_role_snapshot,
  CASE decision.decision
    WHEN 'approved' THEN issue.version_label || ' was approved'
    WHEN 'changes_requested' THEN 'Changes were requested for ' || issue.version_label
    ELSE issue.version_label || ' was declined'
  END,
  decision.note,
  json_object(
    'decision', decision.decision,
    'issueNumber', issue.issue_number,
    'signerName', decision.signer_name
  ),
  json_object(
    'backfillMigration', '0120',
    'issueContentHash', decision.issue_content_hash,
    'signerOrganization', decision.signer_organization_snapshot
  ),
  decision.submitted_at,
  decision.submitted_at
FROM client_portal_decisions decision
JOIN client_portals portal ON portal.id = decision.portal_id
JOIN client_portal_issues issue ON issue.id = decision.issue_id
WHERE NOT EXISTS (
  SELECT 1 FROM project_commitment_events event
  WHERE event.source_type = 'decision'
    AND event.source_id = decision.id
    AND event.event_type = 'decision.' || decision.decision
);

INSERT INTO project_commitment_events (
  id, workspace_id, project_id, origin_portal_id, event_type, source_type, source_id,
  source_version_id, issue_id, decision_id, baseline_id, request_id, request_version_id,
  artifact_id, artifact_version_id, legacy_publication_id, root_request_id, correlation_id,
  causation_event_id, actor_type, actor_id, actor_name_snapshot, actor_domain_role_snapshot,
  actor_permission_role_snapshot, title, summary, client_safe_snapshot_json,
  internal_metadata_json, occurred_at, created_at
)
SELECT
  'event_backfill_decision_' || decision.id || '_voided',
  portal.workspace_id,
  portal.project_id,
  portal.id,
  'decision.voided',
  'decision',
  decision.id,
  NULL,
  NULL,
  decision.id,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'backfill:0120:decision:' || decision.id || ':voided',
  NULL,
  'internal_user',
  decision.voided_by,
  NULL,
  NULL,
  NULL,
  'Decision evidence was voided for ' || issue.version_label,
  decision.void_reason,
  json_object('decision', decision.decision, 'issueNumber', issue.issue_number),
  json_object('backfillMigration', '0120', 'decisionId', decision.id),
  decision.voided_at,
  decision.voided_at
FROM client_portal_decisions decision
JOIN client_portals portal ON portal.id = decision.portal_id
JOIN client_portal_issues issue ON issue.id = decision.issue_id
WHERE decision.voided_at IS NOT NULL
  AND decision.voided_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM project_commitment_events event
    WHERE event.source_type = 'decision'
      AND event.source_id = decision.id
      AND event.event_type = 'decision.voided'
  );

INSERT INTO client_portal_event_exposures (
  event_id, portal_id, public_event_id, status, exposure_kind, policy_snapshot_json,
  exposed_by_actor_type, exposed_by_actor_id, exposed_at, withdrawn_at, withdrawal_reason
)
SELECT
  event.id,
  decision.portal_id,
  'decision_backfill_' || substr(decision.intent_hash, 1, 20),
  'visible',
  'backfill',
  json_object('capability', 'timeline:view', 'issueNumber', issue.issue_number),
  'system',
  'migration:0120',
  event.occurred_at,
  NULL,
  NULL
FROM client_portal_decisions decision
JOIN client_portal_issues issue ON issue.id = decision.issue_id
JOIN project_commitment_events event
  ON event.source_type = 'decision'
 AND event.source_id = decision.id
 AND event.event_type = 'decision.' || decision.decision
WHERE decision.voided_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM client_portal_event_exposures exposure
    WHERE exposure.event_id = event.id AND exposure.portal_id = decision.portal_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM client_portal_event_exposures exposure
    WHERE exposure.portal_id = decision.portal_id
      AND exposure.public_event_id = 'decision_backfill_' || substr(decision.intent_hash, 1, 20)
  );

INSERT INTO project_commitment_events (
  id, workspace_id, project_id, origin_portal_id, event_type, source_type, source_id,
  source_version_id, issue_id, decision_id, baseline_id, request_id, request_version_id,
  artifact_id, artifact_version_id, legacy_publication_id, root_request_id, correlation_id,
  causation_event_id, actor_type, actor_id, actor_name_snapshot, actor_domain_role_snapshot,
  actor_permission_role_snapshot, title, summary, client_safe_snapshot_json,
  internal_metadata_json, occurred_at, created_at
)
SELECT
  'event_backfill_baseline_' || baseline.id || '_established',
  baseline.workspace_id,
  baseline.project_id,
  baseline.portal_id,
  'baseline.established',
  'baseline',
  baseline.id,
  NULL,
  NULL,
  NULL,
  baseline.id,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'backfill:0120:baseline:' || baseline.id || ':established',
  NULL,
  'recipient',
  decision.recipient_id,
  decision.signer_name,
  decision.signer_domain_role_snapshot,
  decision.signer_role_snapshot,
  issue.version_label || ' became baseline ' || baseline.baseline_number,
  NULL,
  json_object(
    'baselineNumber', baseline.baseline_number,
    'currencyCode', baseline.currency_code,
    'issueNumber', issue.issue_number,
    'status', baseline.status,
    'totalCost', CAST(baseline.total_minor_units AS REAL) / 100.0
  ),
  json_object('backfillMigration', '0120', 'decisionId', baseline.established_by_decision_id),
  baseline.established_at,
  baseline.created_at
FROM client_portal_baselines baseline
JOIN client_portal_issues issue ON issue.id = baseline.issue_id
JOIN client_portal_decisions decision ON decision.id = baseline.established_by_decision_id
WHERE NOT EXISTS (
  SELECT 1 FROM project_commitment_events event
  WHERE event.source_type = 'baseline'
    AND event.source_id = baseline.id
    AND event.event_type = 'baseline.established'
);

INSERT INTO project_commitment_events (
  id, workspace_id, project_id, origin_portal_id, event_type, source_type, source_id,
  source_version_id, issue_id, decision_id, baseline_id, request_id, request_version_id,
  artifact_id, artifact_version_id, legacy_publication_id, root_request_id, correlation_id,
  causation_event_id, actor_type, actor_id, actor_name_snapshot, actor_domain_role_snapshot,
  actor_permission_role_snapshot, title, summary, client_safe_snapshot_json,
  internal_metadata_json, occurred_at, created_at
)
SELECT
  'event_backfill_baseline_' || baseline.id || '_' || baseline.status,
  baseline.workspace_id,
  baseline.project_id,
  baseline.portal_id,
  'baseline.' || baseline.status,
  'baseline',
  baseline.id,
  NULL,
  NULL,
  NULL,
  baseline.id,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'backfill:0120:baseline:' || baseline.id || ':' || baseline.status,
  NULL,
  CASE WHEN baseline.voided_by IS NULL THEN 'system' ELSE 'internal_user' END,
  coalesce(baseline.voided_by, 'migration:0120'),
  NULL,
  NULL,
  NULL,
  CASE
    WHEN baseline.status = 'superseded' THEN 'Baseline ' || baseline.baseline_number || ' was superseded'
    ELSE 'Baseline ' || baseline.baseline_number || ' was voided'
  END,
  baseline.void_reason,
  json_object(
    'baselineNumber', baseline.baseline_number,
    'issueNumber', issue.issue_number,
    'status', baseline.status
  ),
  json_object(
    'backfillMigration', '0120',
    'supersededByBaselineId', baseline.superseded_by_baseline_id
  ),
  coalesce(baseline.superseded_at, baseline.voided_at),
  coalesce(baseline.superseded_at, baseline.voided_at)
FROM client_portal_baselines baseline
JOIN client_portal_issues issue ON issue.id = baseline.issue_id
WHERE baseline.status IN ('superseded', 'voided')
  AND NOT EXISTS (
    SELECT 1 FROM project_commitment_events event
    WHERE event.source_type = 'baseline'
      AND event.source_id = baseline.id
      AND event.event_type = 'baseline.' || baseline.status
  );

INSERT INTO client_portal_event_exposures (
  event_id, portal_id, public_event_id, status, exposure_kind, policy_snapshot_json,
  exposed_by_actor_type, exposed_by_actor_id, exposed_at, withdrawn_at, withdrawal_reason
)
SELECT
  event.id,
  baseline.portal_id,
  'baseline_backfill_' || baseline.baseline_number || '_' || replace(event.event_type, '.', '_'),
  'visible',
  'backfill',
  json_object('capability', 'timeline:view', 'issueNumber', issue.issue_number),
  'system',
  'migration:0120',
  event.occurred_at,
  NULL,
  NULL
FROM client_portal_baselines baseline
JOIN client_portal_issues issue ON issue.id = baseline.issue_id
JOIN project_commitment_events event
  ON event.source_type = 'baseline'
 AND event.source_id = baseline.id
 AND event.event_type IN ('baseline.established', 'baseline.superseded')
WHERE NOT EXISTS (
  SELECT 1 FROM client_portal_event_exposures exposure
  WHERE exposure.event_id = event.id AND exposure.portal_id = baseline.portal_id
)
  AND NOT EXISTS (
    SELECT 1 FROM client_portal_event_exposures exposure
    WHERE exposure.portal_id = baseline.portal_id
      AND exposure.public_event_id = 'baseline_backfill_' || baseline.baseline_number || '_' || replace(event.event_type, '.', '_')
  );

INSERT INTO project_commitment_events (
  id, workspace_id, project_id, origin_portal_id, event_type, source_type, source_id,
  source_version_id, issue_id, decision_id, baseline_id, request_id, request_version_id,
  artifact_id, artifact_version_id, legacy_publication_id, root_request_id, correlation_id,
  causation_event_id, actor_type, actor_id, actor_name_snapshot, actor_domain_role_snapshot,
  actor_permission_role_snapshot, title, summary, client_safe_snapshot_json,
  internal_metadata_json, occurred_at, created_at
)
SELECT
  'event_backfill_request_version_' || version.id,
  request.workspace_id,
  request.project_id,
  request.origin_portal_id,
  CASE WHEN version.version_number = 1 THEN 'request.submitted' ELSE 'request.amended' END,
  'change_request',
  request.id,
  version.id,
  NULL,
  NULL,
  NULL,
  request.id,
  version.id,
  NULL,
  NULL,
  NULL,
  request.id,
  'backfill:0120:request:' || request.id || ':version:' || version.id,
  NULL,
  version.created_by_actor_type,
  version.created_by_actor_id,
  CASE WHEN version.version_number = 1 THEN request.requested_by_name_snapshot ELSE NULL END,
  CASE WHEN version.version_number = 1 THEN request.requested_by_domain_role_snapshot ELSE NULL END,
  CASE WHEN version.version_number = 1 THEN request.requested_by_permission_role_snapshot ELSE NULL END,
  CASE
    WHEN version.version_number = 1 THEN request.request_code || ' was submitted'
    ELSE request.request_code || ' was amended'
  END,
  version.title,
  json_object(
    'publicRequestId', (
      SELECT exposure.public_request_id
      FROM client_portal_request_exposures exposure
      WHERE exposure.request_id = request.id
        AND exposure.portal_id = request.origin_portal_id
        AND exposure.status = 'visible'
      LIMIT 1
    ),
    'status', request.status,
    'title', version.title,
    'versionNumber', version.version_number
  ),
  json_object(
    'backfillMigration', '0120',
    'contentHash', version.content_hash,
    'requestCode', request.request_code
  ),
  version.created_at,
  version.created_at
FROM project_change_request_versions version
JOIN project_change_requests request ON request.id = version.request_id
WHERE NOT EXISTS (
  SELECT 1 FROM project_commitment_events event
  WHERE event.source_type = 'change_request'
    AND event.source_id = request.id
    AND event.source_version_id = version.id
    AND event.event_type = CASE WHEN version.version_number = 1 THEN 'request.submitted' ELSE 'request.amended' END
);

INSERT INTO project_commitment_events (
  id, workspace_id, project_id, origin_portal_id, event_type, source_type, source_id,
  source_version_id, issue_id, decision_id, baseline_id, request_id, request_version_id,
  artifact_id, artifact_version_id, legacy_publication_id, root_request_id, correlation_id,
  causation_event_id, actor_type, actor_id, actor_name_snapshot, actor_domain_role_snapshot,
  actor_permission_role_snapshot, title, summary, client_safe_snapshot_json,
  internal_metadata_json, occurred_at, created_at
)
SELECT
  'event_backfill_request_state_' || state.id,
  request.workspace_id,
  request.project_id,
  request.origin_portal_id,
  'request.' || state.to_status,
  'change_request',
  request.id,
  version.id,
  NULL,
  NULL,
  NULL,
  request.id,
  version.id,
  NULL,
  NULL,
  NULL,
  request.id,
  'backfill:0120:request:' || request.id || ':state:' || state.id,
  NULL,
  state.actor_type,
  state.actor_id,
  NULL,
  NULL,
  NULL,
  request.request_code || ' moved to ' || replace(state.to_status, '_', ' '),
  state.note,
  json_object(
    'fromStatus', state.from_status,
    'publicRequestId', (
      SELECT exposure.public_request_id
      FROM client_portal_request_exposures exposure
      WHERE exposure.request_id = request.id
        AND exposure.portal_id = request.origin_portal_id
        AND exposure.status = 'visible'
      LIMIT 1
    ),
    'status', state.to_status,
    'title', version.title
  ),
  json_object('backfillMigration', '0120', 'stateEventId', state.id),
  state.occurred_at,
  state.occurred_at
FROM project_change_request_state_events state
JOIN project_change_requests request ON request.id = state.request_id
JOIN project_change_request_versions version ON version.id = coalesce(
  (
    SELECT candidate.id
    FROM project_change_request_versions candidate
    WHERE candidate.request_id = request.id AND candidate.created_at <= state.occurred_at
    ORDER BY candidate.created_at DESC, candidate.version_number DESC
    LIMIT 1
  ),
  (
    SELECT candidate.id
    FROM project_change_request_versions candidate
    WHERE candidate.request_id = request.id
    ORDER BY candidate.version_number ASC
    LIMIT 1
  )
)
WHERE state.to_status <> 'submitted'
  AND NOT EXISTS (
    SELECT 1 FROM project_commitment_events event
    WHERE event.source_type = 'change_request'
      AND event.source_id = request.id
      AND event.occurred_at = state.occurred_at
      AND json_extract(event.internal_metadata_json, '$.stateEventId') = state.id
  );

INSERT INTO client_portal_event_exposures (
  event_id, portal_id, public_event_id, status, exposure_kind, policy_snapshot_json,
  exposed_by_actor_type, exposed_by_actor_id, exposed_at, withdrawn_at, withdrawal_reason
)
SELECT
  event.id,
  exposure.portal_id,
  'request_backfill_' || exposure.public_request_id || '_' || substr(event.id, -24),
  'visible',
  'backfill',
  exposure.policy_snapshot_json,
  'system',
  'migration:0120',
  event.occurred_at,
  NULL,
  NULL
FROM project_commitment_events event
JOIN project_change_requests request ON request.id = event.request_id
JOIN client_portal_request_exposures exposure
  ON exposure.request_id = request.id
 AND exposure.portal_id = request.origin_portal_id
WHERE event.source_type = 'change_request'
  AND exposure.status = 'visible'
  AND NOT EXISTS (
    SELECT 1 FROM client_portal_event_exposures existing
    WHERE existing.event_id = event.id AND existing.portal_id = exposure.portal_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM client_portal_event_exposures existing
    WHERE existing.portal_id = exposure.portal_id
      AND existing.public_event_id = 'request_backfill_' || exposure.public_request_id || '_' || substr(event.id, -24)
  );

INSERT INTO project_commitment_events (
  id, workspace_id, project_id, origin_portal_id, event_type, source_type, source_id,
  source_version_id, issue_id, decision_id, baseline_id, request_id, request_version_id,
  artifact_id, artifact_version_id, legacy_publication_id, root_request_id, correlation_id,
  causation_event_id, actor_type, actor_id, actor_name_snapshot, actor_domain_role_snapshot,
  actor_permission_role_snapshot, title, summary, client_safe_snapshot_json,
  internal_metadata_json, occurred_at, created_at
)
SELECT
  'event_backfill_artifact_version_' || version.id,
  artifact.workspace_id,
  artifact.project_id,
  NULL,
  CASE WHEN version.version_number = 1 THEN 'artifact.created' ELSE 'artifact.version_added' END,
  'artifact',
  artifact.id,
  version.id,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  artifact.id,
  version.id,
  NULL,
  NULL,
  'backfill:0120:artifact:' || artifact.id || ':version:' || version.id,
  NULL,
  version.created_by_actor_type,
  version.created_by_actor_id,
  NULL,
  version.created_by_domain_role_snapshot,
  NULL,
  CASE
    WHEN version.version_number = 1 THEN artifact.title || ' was added'
    ELSE artifact.title || ' was revised'
  END,
  CASE
    WHEN version.version_number = 1 THEN 'The first immutable artifact version was recorded.'
    ELSE 'A new immutable artifact version became current.'
  END,
  json_object(
    'artifactCode', artifact.artifact_code,
    'title', artifact.title,
    'versionLabel', coalesce(version.revision_label, 'Version ' || version.version_number),
    'versionNumber', version.version_number
  ),
  json_object(
    'backfillMigration', '0120',
    'contentSha256', version.content_sha256,
    'supersedesVersionId', version.supersedes_version_id
  ),
  version.created_at,
  version.created_at
FROM project_artifact_versions version
JOIN project_artifacts artifact ON artifact.id = version.artifact_id
WHERE NOT EXISTS (
  SELECT 1 FROM project_commitment_events event
  WHERE event.source_type = 'artifact'
    AND event.source_id = artifact.id
    AND event.source_version_id = version.id
    AND event.event_type = CASE WHEN version.version_number = 1 THEN 'artifact.created' ELSE 'artifact.version_added' END
);

INSERT INTO project_commitment_events (
  id, workspace_id, project_id, origin_portal_id, event_type, source_type, source_id,
  source_version_id, issue_id, decision_id, baseline_id, request_id, request_version_id,
  artifact_id, artifact_version_id, legacy_publication_id, root_request_id, correlation_id,
  causation_event_id, actor_type, actor_id, actor_name_snapshot, actor_domain_role_snapshot,
  actor_permission_role_snapshot, title, summary, client_safe_snapshot_json,
  internal_metadata_json, occurred_at, created_at
)
SELECT
  'event_backfill_artifact_exposed_' || issued.id,
  artifact.workspace_id,
  artifact.project_id,
  portal.id,
  'artifact.exposed',
  'artifact',
  artifact.id,
  version.id,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  artifact.id,
  version.id,
  NULL,
  NULL,
  'backfill:0120:artifact:' || artifact.id || ':version:' || version.id || ':issue:' || issue.id || ':exposed',
  NULL,
  CASE WHEN issue.issued_by IS NULL THEN 'system' ELSE 'internal_user' END,
  coalesce(issue.issued_by, 'migration:0120'),
  NULL,
  CASE WHEN issue.issued_by IS NULL THEN NULL ELSE 'publisher' END,
  NULL,
  issued.display_title || ' was shared for review',
  coalesce(version.revision_label, 'Version ' || version.version_number) || ' was included in ' || issue.version_label || '.',
  json_object(
    'issueNumber', issue.issue_number,
    'publicArtifactId', issued.public_artifact_id,
    'title', issued.display_title,
    'versionLabel', coalesce(version.revision_label, 'Version ' || version.version_number)
  ),
  json_object(
    'backfillMigration', '0120',
    'issueId', issue.id,
    'publicArtifactId', issued.public_artifact_id,
    'purpose', issued.purpose
  ),
  issued.created_at,
  issued.created_at
FROM client_portal_issue_artifacts issued
JOIN client_portal_issues issue ON issue.id = issued.issue_id
JOIN client_portals portal ON portal.id = issue.portal_id
JOIN project_artifacts artifact ON artifact.id = issued.artifact_id
JOIN project_artifact_versions version ON version.id = issued.artifact_version_id
WHERE NOT EXISTS (
  SELECT 1 FROM project_commitment_events event
  WHERE event.source_type = 'artifact'
    AND event.source_id = artifact.id
    AND event.source_version_id = version.id
    AND event.event_type = 'artifact.exposed'
    AND json_extract(event.internal_metadata_json, '$.issueId') = issue.id
);

INSERT INTO client_portal_event_exposures (
  event_id, portal_id, public_event_id, status, exposure_kind, policy_snapshot_json,
  exposed_by_actor_type, exposed_by_actor_id, exposed_at, withdrawn_at, withdrawal_reason
)
SELECT
  event.id,
  issue.portal_id,
  'artifact_backfill_' || issued.public_artifact_id || '_' || issue.issue_number,
  'visible',
  'backfill',
  json_object(
    'capability', 'timeline:view',
    'issueNumber', issue.issue_number,
    'publicArtifactId', issued.public_artifact_id
  ),
  'system',
  'migration:0120',
  event.occurred_at,
  NULL,
  NULL
FROM client_portal_issue_artifacts issued
JOIN client_portal_issues issue ON issue.id = issued.issue_id
JOIN project_commitment_events event
  ON event.source_type = 'artifact'
 AND event.source_id = issued.artifact_id
 AND event.source_version_id = issued.artifact_version_id
 AND json_extract(event.internal_metadata_json, '$.issueId') = issue.id
 AND event.event_type = 'artifact.exposed'
WHERE NOT EXISTS (
  SELECT 1 FROM client_portal_event_exposures exposure
  WHERE exposure.event_id = event.id AND exposure.portal_id = issue.portal_id
)
  AND NOT EXISTS (
    SELECT 1 FROM client_portal_event_exposures exposure
    WHERE exposure.portal_id = issue.portal_id
      AND exposure.public_event_id = 'artifact_backfill_' || issued.public_artifact_id || '_' || issue.issue_number
  );

INSERT INTO project_commitment_events (
  id, workspace_id, project_id, origin_portal_id, event_type, source_type, source_id,
  source_version_id, issue_id, decision_id, baseline_id, request_id, request_version_id,
  artifact_id, artifact_version_id, legacy_publication_id, root_request_id, correlation_id,
  causation_event_id, actor_type, actor_id, actor_name_snapshot, actor_domain_role_snapshot,
  actor_permission_role_snapshot, title, summary, client_safe_snapshot_json,
  internal_metadata_json, occurred_at, created_at
)
SELECT
  'event_backfill_artifact_archived_' || artifact.id,
  artifact.workspace_id,
  artifact.project_id,
  NULL,
  'artifact.archived',
  'artifact',
  artifact.id,
  version.id,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  artifact.id,
  version.id,
  NULL,
  NULL,
  'backfill:0120:artifact:' || artifact.id || ':archived',
  NULL,
  'system',
  'migration:0120',
  NULL,
  NULL,
  NULL,
  artifact.title || ' was archived',
  'The artifact was archived without removing its immutable versions.',
  json_object(
    'artifactCode', artifact.artifact_code,
    'title', artifact.title,
    'versionLabel', coalesce(version.revision_label, 'Version ' || version.version_number)
  ),
  json_object('backfillMigration', '0120', 'artifactVersionId', version.id),
  artifact.archived_at,
  artifact.archived_at
FROM project_artifacts artifact
JOIN project_artifact_versions version ON version.id = artifact.current_version_id
WHERE artifact.status = 'archived'
  AND artifact.archived_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM project_commitment_events event
    WHERE event.source_type = 'artifact'
      AND event.source_id = artifact.id
      AND event.event_type = 'artifact.archived'
  );

INSERT INTO project_commitment_events (
  id, workspace_id, project_id, origin_portal_id, event_type, source_type, source_id,
  source_version_id, issue_id, decision_id, baseline_id, request_id, request_version_id,
  artifact_id, artifact_version_id, legacy_publication_id, root_request_id, correlation_id,
  causation_event_id, actor_type, actor_id, actor_name_snapshot, actor_domain_role_snapshot,
  actor_permission_role_snapshot, title, summary, client_safe_snapshot_json,
  internal_metadata_json, occurred_at, created_at
)
SELECT
  'event_backfill_legacy_' || publication.id,
  publication.workspace_id,
  publication.project_id,
  mapping.portal_id,
  'legacy_publication.imported',
  'legacy_publication',
  publication.id,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  publication.id,
  NULL,
  'backfill:0120:legacy:' || publication.id,
  NULL,
  CASE WHEN publication.published_by IS NULL THEN 'system' ELSE 'internal_user' END,
  coalesce(publication.published_by, 'migration:0120'),
  NULL,
  NULL,
  NULL,
  'Legacy publication was added to the commitment timeline',
  'Historical publication evidence is available with aggregate-only comparison.',
  json_object(
    'issueNumber', issue.issue_number,
    'status', publication.status,
    'versionLabel', coalesce(issue.version_label, 'Legacy publication')
  ),
  json_object('backfillMigration', '0120', 'comparisonCapability', 'aggregate_only'),
  coalesce(publication.published_at, publication.created_at),
  publication.created_at
FROM project_publications publication
LEFT JOIN client_portal_legacy_mappings mapping ON mapping.legacy_publication_id = publication.id
LEFT JOIN client_portal_issues issue ON issue.id = mapping.issue_id
WHERE NOT EXISTS (
  SELECT 1 FROM project_commitment_events event
  WHERE event.source_type = 'legacy_publication' AND event.source_id = publication.id
);

INSERT INTO project_commitment_events (
  id, workspace_id, project_id, origin_portal_id, event_type, source_type, source_id,
  source_version_id, issue_id, decision_id, baseline_id, request_id, request_version_id,
  artifact_id, artifact_version_id, legacy_publication_id, root_request_id, correlation_id,
  causation_event_id, actor_type, actor_id, actor_name_snapshot, actor_domain_role_snapshot,
  actor_permission_role_snapshot, title, summary, client_safe_snapshot_json,
  internal_metadata_json, occurred_at, created_at
)
SELECT
  'event_backfill_discussion_started_' || thread.id,
  portal.workspace_id,
  portal.project_id,
  portal.id,
  'discussion.started',
  'issue',
  issue.id,
  NULL,
  issue.id,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'backfill:0120:discussion:' || thread.id || ':started',
  NULL,
  thread.created_by_actor_type,
  thread.created_by_actor_id,
  NULL,
  NULL,
  NULL,
  CASE
    WHEN thread.carried_forward_from_thread_id IS NULL THEN 'Discussion started: ' || thread.subject
    ELSE 'Discussion carried forward: ' || thread.subject
  END,
  thread.target_label,
  json_object(
    'issueNumber', issue.issue_number,
    'status', issue.status,
    'versionLabel', issue.version_label
  ),
  json_object(
    'backfillMigration', '0120',
    'carriedForwardFromThreadId', thread.carried_forward_from_thread_id,
    'targetKind', thread.target_kind,
    'targetPublicId', thread.target_public_id,
    'threadId', thread.id
  ),
  thread.created_at,
  thread.created_at
FROM client_portal_threads thread
JOIN client_portal_issues issue ON issue.id = thread.issue_id
JOIN client_portals portal ON portal.id = thread.portal_id
WHERE thread.audience = 'client'
  AND NOT EXISTS (
    SELECT 1 FROM project_commitment_events event
    WHERE event.event_type = 'discussion.started'
      AND json_extract(event.internal_metadata_json, '$.threadId') = thread.id
  );

WITH visible_messages AS (
  SELECT
    message.*,
    row_number() OVER (PARTITION BY message.thread_id ORDER BY message.created_at, message.id) AS message_sequence
  FROM client_portal_messages message
  WHERE message.visibility = 'client'
)
INSERT INTO project_commitment_events (
  id, workspace_id, project_id, origin_portal_id, event_type, source_type, source_id,
  source_version_id, issue_id, decision_id, baseline_id, request_id, request_version_id,
  artifact_id, artifact_version_id, legacy_publication_id, root_request_id, correlation_id,
  causation_event_id, actor_type, actor_id, actor_name_snapshot, actor_domain_role_snapshot,
  actor_permission_role_snapshot, title, summary, client_safe_snapshot_json,
  internal_metadata_json, occurred_at, created_at
)
SELECT
  'event_backfill_discussion_message_' || message.id,
  portal.workspace_id,
  portal.project_id,
  portal.id,
  'discussion.updated',
  'issue',
  issue.id,
  NULL,
  issue.id,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'backfill:0120:discussion:' || thread.id || ':message:' || message.id,
  NULL,
  message.actor_type,
  message.actor_id,
  json_extract(message.author_snapshot_json, '$.displayName'),
  json_extract(message.author_snapshot_json, '$.role'),
  NULL,
  'Discussion updated: ' || thread.subject,
  thread.target_label,
  json_object(
    'issueNumber', issue.issue_number,
    'status', issue.status,
    'versionLabel', issue.version_label
  ),
  json_object(
    'backfillMigration', '0120',
    'messageId', message.id,
    'messageSequence', message.message_sequence,
    'threadId', thread.id
  ),
  message.created_at,
  message.created_at
FROM visible_messages message
JOIN client_portal_threads thread ON thread.id = message.thread_id AND thread.audience = 'client'
JOIN client_portal_issues issue ON issue.id = thread.issue_id
JOIN client_portals portal ON portal.id = thread.portal_id
WHERE message.message_sequence > 1
  AND message.actor_type IN ('internal_user', 'recipient')
  AND message.actor_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM project_commitment_events event
    WHERE event.event_type = 'discussion.updated'
      AND json_extract(event.internal_metadata_json, '$.messageId') = message.id
  );

INSERT INTO project_commitment_events (
  id, workspace_id, project_id, origin_portal_id, event_type, source_type, source_id,
  source_version_id, issue_id, decision_id, baseline_id, request_id, request_version_id,
  artifact_id, artifact_version_id, legacy_publication_id, root_request_id, correlation_id,
  causation_event_id, actor_type, actor_id, actor_name_snapshot, actor_domain_role_snapshot,
  actor_permission_role_snapshot, title, summary, client_safe_snapshot_json,
  internal_metadata_json, occurred_at, created_at
)
SELECT
  'event_backfill_discussion_status_' || audit.id,
  portal.workspace_id,
  portal.project_id,
  portal.id,
  CASE audit.event_type WHEN 'thread_resolved' THEN 'discussion.resolved' ELSE 'discussion.reopened' END,
  'issue',
  issue.id,
  NULL,
  issue.id,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'backfill:0120:discussion:' || thread.id || ':status:' || audit.id,
  NULL,
  CASE WHEN audit.actor_type IN ('internal_user', 'recipient') THEN audit.actor_type ELSE 'system' END,
  coalesce(audit.actor_id, 'migration:0120'),
  NULL,
  NULL,
  NULL,
  CASE audit.event_type
    WHEN 'thread_resolved' THEN 'Discussion resolved: ' || thread.subject
    ELSE 'Discussion reopened: ' || thread.subject
  END,
  thread.target_label,
  json_object(
    'issueNumber', issue.issue_number,
    'status', issue.status,
    'versionLabel', issue.version_label
  ),
  json_object('auditEventId', audit.id, 'backfillMigration', '0120', 'threadId', thread.id),
  audit.occurred_at,
  audit.created_at
FROM client_portal_audit_events audit
JOIN client_portal_threads thread
  ON thread.id = json_extract(audit.metadata_json, '$.threadId')
 AND thread.portal_id = audit.portal_id
 AND thread.audience = 'client'
JOIN client_portal_issues issue ON issue.id = thread.issue_id
JOIN client_portals portal ON portal.id = thread.portal_id
WHERE audit.event_type IN ('thread_resolved', 'thread_reopened')
  AND audit.visibility = 'client_safe'
  AND NOT EXISTS (
    SELECT 1 FROM project_commitment_events event
    WHERE event.event_type = CASE audit.event_type WHEN 'thread_resolved' THEN 'discussion.resolved' ELSE 'discussion.reopened' END
      AND json_extract(event.internal_metadata_json, '$.threadId') = thread.id
      AND event.occurred_at = audit.occurred_at
  );

INSERT INTO project_commitment_events (
  id, workspace_id, project_id, origin_portal_id, event_type, source_type, source_id,
  source_version_id, issue_id, decision_id, baseline_id, request_id, request_version_id,
  artifact_id, artifact_version_id, legacy_publication_id, root_request_id, correlation_id,
  causation_event_id, actor_type, actor_id, actor_name_snapshot, actor_domain_role_snapshot,
  actor_permission_role_snapshot, title, summary, client_safe_snapshot_json,
  internal_metadata_json, occurred_at, created_at
)
SELECT
  'event_backfill_discussion_resolved_' || thread.id,
  portal.workspace_id,
  portal.project_id,
  portal.id,
  'discussion.resolved',
  'issue',
  issue.id,
  NULL,
  issue.id,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'backfill:0120:discussion:' || thread.id || ':resolved',
  NULL,
  CASE WHEN thread.resolved_by_actor_id IS NULL THEN 'system' ELSE 'internal_user' END,
  coalesce(thread.resolved_by_actor_id, 'migration:0120'),
  NULL,
  NULL,
  NULL,
  'Discussion resolved: ' || thread.subject,
  thread.target_label,
  json_object(
    'issueNumber', issue.issue_number,
    'status', issue.status,
    'versionLabel', issue.version_label
  ),
  json_object('backfillMigration', '0120', 'evidence', 'current_thread_state', 'threadId', thread.id),
  thread.resolved_at,
  thread.resolved_at
FROM client_portal_threads thread
JOIN client_portal_issues issue ON issue.id = thread.issue_id
JOIN client_portals portal ON portal.id = thread.portal_id
WHERE thread.audience = 'client'
  AND thread.status = 'resolved'
  AND thread.resolved_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM project_commitment_events event
    WHERE event.event_type = 'discussion.resolved'
      AND json_extract(event.internal_metadata_json, '$.threadId') = thread.id
  );

INSERT INTO client_portal_event_exposures (
  event_id, portal_id, public_event_id, status, exposure_kind, policy_snapshot_json,
  exposed_by_actor_type, exposed_by_actor_id, exposed_at, withdrawn_at, withdrawal_reason
)
SELECT
  event.id,
  event.origin_portal_id,
  'discussion_backfill_' || substr(event.id, -40),
  'visible',
  'backfill',
  json_object('capability', 'timeline:view', 'issueNumber', issue.issue_number),
  'system',
  'migration:0120',
  event.occurred_at,
  NULL,
  NULL
FROM project_commitment_events event
JOIN client_portal_issues issue ON issue.id = event.issue_id
JOIN client_portal_threads thread ON thread.id = json_extract(event.internal_metadata_json, '$.threadId')
WHERE event.event_type IN ('discussion.started', 'discussion.updated', 'discussion.resolved', 'discussion.reopened')
  AND event.origin_portal_id IS NOT NULL
  AND thread.status <> 'requires_revalidation'
  AND NOT EXISTS (
    SELECT 1 FROM client_portal_event_exposures exposure
    WHERE exposure.event_id = event.id AND exposure.portal_id = event.origin_portal_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM client_portal_event_exposures exposure
    WHERE exposure.portal_id = event.origin_portal_id
      AND exposure.public_event_id = 'discussion_backfill_' || substr(event.id, -40)
  );

INSERT INTO project_commitment_backfill_markers (
  source_type, source_id, status, capability, reason, event_id, details_json, updated_at
)
SELECT
  'issue',
  issue.id,
  'backfilled',
  'full',
  NULL,
  (
    SELECT event.id
    FROM project_commitment_events event
    WHERE event.source_type = 'issue'
      AND event.source_id = issue.id
      AND event.event_type IN ('issue.issued', 'issue.replaced')
    ORDER BY event.occurred_at, event.id
    LIMIT 1
  ),
  json_object(
    'discussionHistory', CASE
      WHEN EXISTS (SELECT 1 FROM client_portal_threads thread WHERE thread.issue_id = issue.id AND thread.audience = 'client')
        THEN 'client_visible_messages_and_status_evidence'
      ELSE 'not_applicable'
    END,
    'migration', '0120',
    'semanticEvent', 'issue_publication'
  ),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM client_portal_issues issue
WHERE 1 = 1
ON CONFLICT(source_type, source_id) DO UPDATE SET
  status = excluded.status,
  capability = excluded.capability,
  reason = excluded.reason,
  event_id = excluded.event_id,
  details_json = excluded.details_json,
  updated_at = excluded.updated_at;

INSERT INTO project_commitment_backfill_markers (
  source_type, source_id, status, capability, reason, event_id, details_json, updated_at
)
SELECT
  'decision',
  decision.id,
  'backfilled',
  'full',
  NULL,
  (
    SELECT event.id FROM project_commitment_events event
    WHERE event.source_type = 'decision' AND event.source_id = decision.id
    ORDER BY event.occurred_at DESC, event.id DESC LIMIT 1
  ),
  json_object(
    'migration', '0120',
    'submittedEvent', true,
    'voidEvent', decision.voided_at IS NOT NULL
  ),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM client_portal_decisions decision
WHERE 1 = 1
ON CONFLICT(source_type, source_id) DO UPDATE SET
  status = excluded.status,
  capability = excluded.capability,
  reason = excluded.reason,
  event_id = excluded.event_id,
  details_json = excluded.details_json,
  updated_at = excluded.updated_at;

INSERT INTO project_commitment_backfill_markers (
  source_type, source_id, status, capability, reason, event_id, details_json, updated_at
)
SELECT
  'baseline',
  baseline.id,
  'backfilled',
  'full',
  NULL,
  (
    SELECT event.id FROM project_commitment_events event
    WHERE event.source_type = 'baseline' AND event.source_id = baseline.id
    ORDER BY event.occurred_at DESC, event.id DESC LIMIT 1
  ),
  json_object('migration', '0120', 'terminalStatus', baseline.status),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM client_portal_baselines baseline
WHERE 1 = 1
ON CONFLICT(source_type, source_id) DO UPDATE SET
  status = excluded.status,
  capability = excluded.capability,
  reason = excluded.reason,
  event_id = excluded.event_id,
  details_json = excluded.details_json,
  updated_at = excluded.updated_at;

INSERT INTO project_commitment_backfill_markers (
  source_type, source_id, status, capability, reason, event_id, details_json, updated_at
)
SELECT
  'change_request',
  request.id,
  'backfilled',
  'full',
  NULL,
  (
    SELECT event.id FROM project_commitment_events event
    WHERE event.source_type = 'change_request' AND event.source_id = request.id
    ORDER BY event.occurred_at DESC, event.id DESC LIMIT 1
  ),
  json_object(
    'migration', '0120',
    'stateEventCount', (SELECT count(*) FROM project_change_request_state_events state WHERE state.request_id = request.id),
    'versionCount', (SELECT count(*) FROM project_change_request_versions version WHERE version.request_id = request.id)
  ),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM project_change_requests request
WHERE 1 = 1
ON CONFLICT(source_type, source_id) DO UPDATE SET
  status = excluded.status,
  capability = excluded.capability,
  reason = excluded.reason,
  event_id = excluded.event_id,
  details_json = excluded.details_json,
  updated_at = excluded.updated_at;

INSERT INTO project_commitment_backfill_markers (
  source_type, source_id, status, capability, reason, event_id, details_json, updated_at
)
SELECT
  'artifact',
  artifact.id,
  'backfilled',
  'full',
  NULL,
  (
    SELECT event.id FROM project_commitment_events event
    WHERE event.source_type = 'artifact' AND event.source_id = artifact.id
    ORDER BY event.occurred_at DESC, event.id DESC LIMIT 1
  ),
  json_object(
    'archiveEvent', artifact.status = 'archived',
    'exposureCount', (SELECT count(*) FROM client_portal_issue_artifacts issued WHERE issued.artifact_id = artifact.id),
    'migration', '0120',
    'versionCount', (SELECT count(*) FROM project_artifact_versions version WHERE version.artifact_id = artifact.id)
  ),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM project_artifacts artifact
WHERE 1 = 1
ON CONFLICT(source_type, source_id) DO UPDATE SET
  status = excluded.status,
  capability = excluded.capability,
  reason = excluded.reason,
  event_id = excluded.event_id,
  details_json = excluded.details_json,
  updated_at = excluded.updated_at;

INSERT INTO project_commitment_backfill_markers (
  source_type, source_id, status, capability, reason, event_id, details_json, updated_at
)
SELECT
  'legacy_publication',
  publication.id,
  'limited',
  'aggregate_only',
  'Legacy publication rows do not preserve row-level source identity.',
  (
    SELECT event.id FROM project_commitment_events event
    WHERE event.source_type = 'legacy_publication' AND event.source_id = publication.id
    ORDER BY event.occurred_at DESC, event.id DESC LIMIT 1
  ),
  json_object('comparisonCapability', 'aggregate_only', 'migration', '0120'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM project_publications publication
WHERE 1 = 1
ON CONFLICT(source_type, source_id) DO UPDATE SET
  status = excluded.status,
  capability = excluded.capability,
  reason = excluded.reason,
  event_id = excluded.event_id,
  details_json = excluded.details_json,
  updated_at = excluded.updated_at;
