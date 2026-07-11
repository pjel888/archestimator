-- Keep only the newest active pending invitation per normalized scope identity
-- before enforcing the invariant. Older duplicate links are revoked so their
-- unused tokens cannot remain actionable.
WITH ranked_pending_invitations AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY project_id, email, scope, IFNULL(estimate_id, '')
      ORDER BY created_at DESC, id DESC
    ) AS row_number
  FROM collaboration_invitations
  WHERE lifecycle_state = 'pending'
    AND revoked_at IS NULL
)
UPDATE collaboration_invitation_tokens
SET revoked_at = COALESCE(revoked_at, created_at)
WHERE invitation_id IN (
  SELECT id FROM ranked_pending_invitations WHERE row_number > 1
)
  AND used_at IS NULL
  AND revoked_at IS NULL;

WITH ranked_pending_invitations AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY project_id, email, scope, IFNULL(estimate_id, '')
      ORDER BY created_at DESC, id DESC
    ) AS row_number
  FROM collaboration_invitations
  WHERE lifecycle_state = 'pending'
    AND revoked_at IS NULL
)
UPDATE collaboration_invitations
SET lifecycle_state = 'revoked',
    revoked_at = COALESCE(revoked_at, updated_at, created_at),
    updated_at = COALESCE(updated_at, created_at)
WHERE id IN (
  SELECT id FROM ranked_pending_invitations WHERE row_number > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_collaboration_invitations_one_pending_scope
  ON collaboration_invitations(project_id, email, scope, IFNULL(estimate_id, ''))
  WHERE lifecycle_state = 'pending' AND revoked_at IS NULL;
