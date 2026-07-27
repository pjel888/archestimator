ALTER TABLE client_portal_issue_drafts
ADD COLUMN narrative_provenance_json TEXT
CHECK (
  narrative_provenance_json IS NULL
  OR (
    json_valid(narrative_provenance_json)
    AND json_type(narrative_provenance_json) = 'object'
  )
);

ALTER TABLE client_portal_issue_change_sets ADD COLUMN ai_provider_snapshot TEXT;
ALTER TABLE client_portal_issue_change_sets ADD COLUMN ai_input_hash TEXT;
ALTER TABLE client_portal_issue_change_sets ADD COLUMN ai_output_hash TEXT;
ALTER TABLE client_portal_issue_change_sets ADD COLUMN ai_generated_at TEXT;
