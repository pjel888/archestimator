-- 0032_project_group_membership_positions.sql
-- Persist manual card order inside each named project group.

ALTER TABLE project_group_memberships
  ADD COLUMN position INTEGER NOT NULL DEFAULT 0;

WITH ranked_memberships AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY workspace_id, user_id, group_id
      ORDER BY created_at ASC, project_id ASC
    ) - 1 AS next_position
  FROM project_group_memberships
)
UPDATE project_group_memberships
SET position = (
  SELECT next_position
  FROM ranked_memberships
  WHERE ranked_memberships.id = project_group_memberships.id
);

CREATE INDEX IF NOT EXISTS project_group_memberships_group_position_idx
  ON project_group_memberships(workspace_id, user_id, group_id, position, created_at);
