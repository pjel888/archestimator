ALTER TABLE client_portal_issue_source_rows
ADD COLUMN link_state TEXT NOT NULL DEFAULT 'unlinked'
CHECK (link_state IN ('unlinked', 'linked-clean', 'linked-overridden', 'source-changed', 'detached'));
