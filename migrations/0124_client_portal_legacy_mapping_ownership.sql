CREATE TABLE __0124_client_portal_legacy_mapping_assertion (
  value INTEGER NOT NULL CHECK (value = 0)
);

INSERT INTO __0124_client_portal_legacy_mapping_assertion(value)
SELECT COUNT(*)
FROM client_portal_legacy_mappings AS mapping
JOIN project_publications AS publication ON publication.id = mapping.legacy_publication_id
LEFT JOIN client_portals AS portal ON portal.id = mapping.portal_id
LEFT JOIN client_portal_issues AS issue ON issue.id = mapping.issue_id
WHERE portal.id IS NULL
   OR issue.id IS NULL
   OR portal.workspace_id <> publication.workspace_id
   OR portal.project_id <> publication.project_id
   OR issue.portal_id <> portal.id;

DROP TABLE __0124_client_portal_legacy_mapping_assertion;

CREATE TRIGGER client_portal_legacy_mappings_ownership_insert
BEFORE INSERT ON client_portal_legacy_mappings
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM project_publications AS publication
    JOIN client_portals AS portal
      ON portal.id = NEW.portal_id
      AND portal.workspace_id = publication.workspace_id
      AND portal.project_id = publication.project_id
    JOIN client_portal_issues AS issue
      ON issue.id = NEW.issue_id
      AND issue.portal_id = portal.id
    WHERE publication.id = NEW.legacy_publication_id
  ) THEN RAISE(ABORT, 'legacy Client Portal mapping ownership mismatch') END;
END;

CREATE TRIGGER client_portal_legacy_mappings_ownership_update
BEFORE UPDATE OF legacy_publication_id, portal_id, issue_id ON client_portal_legacy_mappings
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM project_publications AS publication
    JOIN client_portals AS portal
      ON portal.id = NEW.portal_id
      AND portal.workspace_id = publication.workspace_id
      AND portal.project_id = publication.project_id
    JOIN client_portal_issues AS issue
      ON issue.id = NEW.issue_id
      AND issue.portal_id = portal.id
    WHERE publication.id = NEW.legacy_publication_id
  ) THEN RAISE(ABORT, 'legacy Client Portal mapping ownership mismatch') END;
END;
