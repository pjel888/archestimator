CREATE TRIGGER client_portal_legacy_mappings_cutover_lease_insert
BEFORE INSERT ON client_portal_legacy_mappings
WHEN (
  CASE WHEN json_valid(NEW.notes) THEN json_extract(NEW.notes, '$.cutover_lease_frozen_at') END IS NOT NULL
  OR CASE WHEN json_valid(NEW.notes) THEN json_extract(NEW.notes, '$.cutover_lease_frozen_by') END IS NOT NULL
)
AND NOT EXISTS (
  SELECT 1
  FROM project_publications publication
  JOIN client_portal_legacy_workspace_cutovers barrier
    ON barrier.workspace_id = publication.workspace_id
  WHERE publication.id = NEW.legacy_publication_id
    AND barrier.frozen_at = json_extract(NEW.notes, '$.cutover_lease_frozen_at')
    AND barrier.frozen_by = json_extract(NEW.notes, '$.cutover_lease_frozen_by')
)
BEGIN
  SELECT RAISE(ABORT, 'legacy cutover barrier lease is stale');
END;

CREATE TRIGGER client_portal_legacy_mappings_cutover_lease_update
BEFORE UPDATE OF notes, migration_status ON client_portal_legacy_mappings
WHEN (
  CASE WHEN json_valid(OLD.notes) THEN json_extract(OLD.notes, '$.cutover_lease_frozen_at') END IS NOT NULL
  OR CASE WHEN json_valid(OLD.notes) THEN json_extract(OLD.notes, '$.cutover_lease_frozen_by') END IS NOT NULL
)
AND NOT EXISTS (
  SELECT 1
  FROM project_publications publication
  JOIN client_portal_legacy_workspace_cutovers barrier
    ON barrier.workspace_id = publication.workspace_id
  WHERE publication.id = NEW.legacy_publication_id
    AND barrier.frozen_at = json_extract(OLD.notes, '$.cutover_lease_frozen_at')
    AND barrier.frozen_by = json_extract(OLD.notes, '$.cutover_lease_frozen_by')
)
BEGIN
  SELECT RAISE(ABORT, 'legacy cutover barrier lease is stale');
END;

CREATE TRIGGER client_portal_legacy_mappings_cutover_lease_update_new
BEFORE UPDATE OF notes, migration_status ON client_portal_legacy_mappings
WHEN (
  CASE WHEN json_valid(OLD.notes) THEN json_extract(OLD.notes, '$.cutover_lease_frozen_at') END IS NULL
  AND CASE WHEN json_valid(OLD.notes) THEN json_extract(OLD.notes, '$.cutover_lease_frozen_by') END IS NULL
  AND (
    CASE WHEN json_valid(NEW.notes) THEN json_extract(NEW.notes, '$.cutover_lease_frozen_at') END IS NOT NULL
    OR CASE WHEN json_valid(NEW.notes) THEN json_extract(NEW.notes, '$.cutover_lease_frozen_by') END IS NOT NULL
  )
)
AND NOT EXISTS (
  SELECT 1
  FROM project_publications publication
  JOIN client_portal_legacy_workspace_cutovers barrier
    ON barrier.workspace_id = publication.workspace_id
  WHERE publication.id = NEW.legacy_publication_id
    AND barrier.frozen_at = json_extract(NEW.notes, '$.cutover_lease_frozen_at')
    AND barrier.frozen_by = json_extract(NEW.notes, '$.cutover_lease_frozen_by')
)
BEGIN
  SELECT RAISE(ABORT, 'legacy cutover barrier lease is stale');
END;

CREATE TRIGGER client_portal_legacy_mappings_cutover_complete_immutable
BEFORE UPDATE OF migration_status ON client_portal_legacy_mappings
WHEN OLD.migration_status = 'cutover_complete'
  AND NEW.migration_status <> 'cutover_complete'
BEGIN
  SELECT RAISE(ABORT, 'finalized legacy cutover mapping is immutable');
END;
