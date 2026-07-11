-- Corporate account ownership is a database invariant: every account has a
-- nonblank creator and retains at least one owner until the account is deleted.

CREATE TRIGGER IF NOT EXISTS trg_corporate_accounts_require_creator_on_insert
BEFORE INSERT ON corporate_accounts
WHEN NEW.created_by IS NULL OR length(trim(NEW.created_by)) = 0
BEGIN
  SELECT RAISE(ABORT, 'Corporate accounts require a creator.');
END;

CREATE TRIGGER IF NOT EXISTS trg_corporate_accounts_require_creator_on_update
BEFORE UPDATE OF created_by ON corporate_accounts
WHEN NEW.created_by IS NULL OR length(trim(NEW.created_by)) = 0
BEGIN
  SELECT RAISE(ABORT, 'Corporate accounts require a creator.');
END;

CREATE TRIGGER IF NOT EXISTS trg_corporate_accounts_creator_is_owner
AFTER INSERT ON corporate_accounts
WHEN NEW.created_by IS NOT NULL AND length(trim(NEW.created_by)) > 0
BEGIN
  INSERT INTO corporate_account_members (
    corporate_account_id,
    user_id,
    role,
    created_at,
    updated_at
  )
  VALUES (NEW.id, NEW.created_by, 'owner', NEW.created_at, NEW.updated_at)
ON CONFLICT(corporate_account_id, user_id) DO UPDATE SET
  role = 'owner',
  updated_at = excluded.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS trg_corporate_account_members_preserve_owner_on_delete
BEFORE DELETE ON corporate_account_members
WHEN OLD.role = 'owner'
  AND EXISTS (
    SELECT 1
    FROM corporate_accounts AS account
    WHERE account.id = OLD.corporate_account_id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM corporate_account_members AS other_owner
    WHERE other_owner.corporate_account_id = OLD.corporate_account_id
      AND other_owner.role = 'owner'
      AND other_owner.user_id != OLD.user_id
  )
BEGIN
  SELECT RAISE(ABORT, 'Corporate accounts require at least one owner.');
END;

CREATE TRIGGER IF NOT EXISTS trg_corporate_account_members_preserve_owner_on_role_change
BEFORE UPDATE OF role ON corporate_account_members
WHEN OLD.role = 'owner'
  AND NEW.role != 'owner'
  AND NOT EXISTS (
    SELECT 1
    FROM corporate_account_members AS other_owner
    WHERE other_owner.corporate_account_id = OLD.corporate_account_id
      AND other_owner.role = 'owner'
      AND other_owner.user_id != OLD.user_id
  )
BEGIN
  SELECT RAISE(ABORT, 'Corporate accounts require at least one owner.');
END;

-- Repair the initial 0052 rollout. Only accounts without an owner are
-- promoted, so existing explicit ownership is preserved.
INSERT INTO corporate_account_members (
  corporate_account_id,
  user_id,
  role,
  created_at,
  updated_at
)
SELECT
  account.id,
  account.created_by,
  'owner',
  account.created_at,
  account.updated_at
FROM corporate_accounts AS account
WHERE account.created_by IS NOT NULL
  AND length(trim(account.created_by)) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM corporate_account_members AS member
    WHERE member.corporate_account_id = account.id
      AND member.role = 'owner'
  )
ON CONFLICT(corporate_account_id, user_id) DO UPDATE SET
  role = 'owner',
  updated_at = excluded.updated_at;
