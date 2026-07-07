CREATE TRIGGER IF NOT EXISTS trg_cost_library_component_drafts_insert_size_limit
BEFORE INSERT ON cost_library_component_drafts
WHEN length(CAST(NEW.draft_json AS BLOB)) > 65536
BEGIN
  SELECT RAISE(ABORT, 'Component drafts must be 65536 bytes or smaller.');
END;

CREATE TRIGGER IF NOT EXISTS trg_cost_library_component_drafts_update_size_limit
BEFORE UPDATE OF draft_json ON cost_library_component_drafts
WHEN length(CAST(NEW.draft_json AS BLOB)) > 65536
BEGIN
  SELECT RAISE(ABORT, 'Component drafts must be 65536 bytes or smaller.');
END;

CREATE TRIGGER IF NOT EXISTS trg_cost_library_component_drafts_active_insert_cap
BEFORE INSERT ON cost_library_component_drafts
WHEN NEW.status = 'active'
  AND (
    SELECT COUNT(*)
    FROM cost_library_component_drafts
    WHERE workspace_id = NEW.workspace_id
      AND status = 'active'
  ) >= 100
BEGIN
  SELECT RAISE(ABORT, 'This workspace has reached its active component draft limit (100). Archive or delete some first.');
END;

CREATE TRIGGER IF NOT EXISTS trg_cost_library_component_drafts_active_update_cap
BEFORE UPDATE OF workspace_id, status ON cost_library_component_drafts
WHEN NEW.status = 'active'
  AND (
    OLD.status <> 'active'
    OR OLD.workspace_id <> NEW.workspace_id
  )
  AND (
    SELECT COUNT(*)
    FROM cost_library_component_drafts
    WHERE workspace_id = NEW.workspace_id
      AND status = 'active'
  ) >= 100
BEGIN
  SELECT RAISE(ABORT, 'This workspace has reached its active component draft limit (100). Archive or delete some first.');
END;
