INSERT INTO workspace_members (workspace_id, user_id, role, created_at, updated_at)
SELECT
  id AS workspace_id,
  created_by AS user_id,
  'owner' AS role,
  COALESCE(created_at, CURRENT_TIMESTAMP) AS created_at,
  CURRENT_TIMESTAMP AS updated_at
FROM workspaces
WHERE created_by IS NOT NULL
  AND length(trim(created_by)) > 0
ON CONFLICT(workspace_id, user_id) DO NOTHING;
