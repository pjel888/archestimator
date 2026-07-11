-- Enforce the collaboration recovery floors in D1 so a stale application
-- preflight cannot leave a workspace, project, or restricted estimate without
-- an effective manager.

CREATE TRIGGER IF NOT EXISTS collaboration_workspace_owner_floor_delete
BEFORE DELETE ON workspace_members
WHEN OLD.role = 'owner'
  AND NOT EXISTS (
    SELECT 1
    FROM workspace_members AS other_member
    WHERE other_member.workspace_id = OLD.workspace_id
      AND other_member.user_id <> OLD.user_id
      AND other_member.role = 'owner'
  )
BEGIN
  SELECT RAISE(ABORT, 'collaboration_workspace_owner_floor');
END;

CREATE TRIGGER IF NOT EXISTS collaboration_workspace_owner_floor_update
BEFORE UPDATE OF role ON workspace_members
WHEN OLD.role = 'owner'
  AND NEW.role <> 'owner'
  AND NOT EXISTS (
    SELECT 1
    FROM workspace_members AS other_member
    WHERE other_member.workspace_id = OLD.workspace_id
      AND other_member.user_id <> OLD.user_id
      AND other_member.role = 'owner'
  )
BEGIN
  SELECT RAISE(ABORT, 'collaboration_workspace_owner_floor');
END;

CREATE TRIGGER IF NOT EXISTS collaboration_project_manager_floor_delete
BEFORE DELETE ON project_members
WHEN OLD.role IN ('owner', 'admin')
  AND NOT EXISTS (
    SELECT 1
    FROM project_members AS other_member
    WHERE other_member.project_id = OLD.project_id
      AND other_member.user_id <> OLD.user_id
      AND other_member.role IN ('owner', 'admin')
  )
  AND NOT EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE workspace_id = OLD.workspace_id
      AND role IN ('owner', 'admin')
  )
BEGIN
  SELECT RAISE(ABORT, 'collaboration_project_manager_floor');
END;

CREATE TRIGGER IF NOT EXISTS collaboration_project_manager_floor_update
BEFORE UPDATE OF role ON project_members
WHEN OLD.role IN ('owner', 'admin')
  AND NEW.role NOT IN ('owner', 'admin')
  AND NOT EXISTS (
    SELECT 1
    FROM project_members AS other_member
    WHERE other_member.project_id = OLD.project_id
      AND other_member.user_id <> OLD.user_id
      AND other_member.role IN ('owner', 'admin')
  )
  AND NOT EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE workspace_id = OLD.workspace_id
      AND role IN ('owner', 'admin')
  )
BEGIN
  SELECT RAISE(ABORT, 'collaboration_project_manager_floor');
END;

CREATE TRIGGER IF NOT EXISTS collaboration_restricted_estimate_manager_floor_delete
BEFORE DELETE ON estimate_sheet_members
WHEN OLD.role IN ('owner', 'admin')
  AND EXISTS (
    SELECT 1
    FROM estimate_sheet_access_settings
    WHERE estimate_id = OLD.estimate_id
      AND inherit_project_access = 0
  )
  AND NOT EXISTS (
    SELECT 1
    FROM estimate_sheet_members AS other_member
    WHERE other_member.estimate_id = OLD.estimate_id
      AND other_member.user_id <> OLD.user_id
      AND other_member.role IN ('owner', 'admin')
  )
BEGIN
  SELECT RAISE(ABORT, 'collaboration_restricted_estimate_manager_floor');
END;

CREATE TRIGGER IF NOT EXISTS collaboration_restricted_estimate_manager_floor_update
BEFORE UPDATE OF role ON estimate_sheet_members
WHEN OLD.role IN ('owner', 'admin')
  AND NEW.role NOT IN ('owner', 'admin')
  AND EXISTS (
    SELECT 1
    FROM estimate_sheet_access_settings
    WHERE estimate_id = OLD.estimate_id
      AND inherit_project_access = 0
  )
  AND NOT EXISTS (
    SELECT 1
    FROM estimate_sheet_members AS other_member
    WHERE other_member.estimate_id = OLD.estimate_id
      AND other_member.user_id <> OLD.user_id
      AND other_member.role IN ('owner', 'admin')
  )
BEGIN
  SELECT RAISE(ABORT, 'collaboration_restricted_estimate_manager_floor');
END;

CREATE TRIGGER IF NOT EXISTS collaboration_restricted_estimate_requires_manager_insert
BEFORE INSERT ON estimate_sheet_access_settings
WHEN NEW.inherit_project_access = 0
  AND NOT EXISTS (
    SELECT 1
    FROM estimate_sheet_members
    WHERE estimate_id = NEW.estimate_id
      AND role IN ('owner', 'admin')
  )
BEGIN
  SELECT RAISE(ABORT, 'collaboration_restricted_estimate_manager_floor');
END;

CREATE TRIGGER IF NOT EXISTS collaboration_restricted_estimate_requires_manager_update
BEFORE UPDATE OF inherit_project_access ON estimate_sheet_access_settings
WHEN NEW.inherit_project_access = 0
  AND NOT EXISTS (
    SELECT 1
    FROM estimate_sheet_members
    WHERE estimate_id = NEW.estimate_id
      AND role IN ('owner', 'admin')
  )
BEGIN
  SELECT RAISE(ABORT, 'collaboration_restricted_estimate_manager_floor');
END;
