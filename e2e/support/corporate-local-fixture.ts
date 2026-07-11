import { spawnSync } from "node:child_process";

const CORPORATE_MEMBER_FIXTURE_ID = "9b0c4b62-20c6-4f9a-a49b-b2bdf076e001";
const CORPORATE_WORKSPACE_FIXTURE_ID = "bd57699a-88fd-4948-abd6-a2d0d14631c7";
const CORPORATE_PROOF_ACCOUNT_PREFIX = "Corporate role proof %";
const CORPORATE_MEMBER_FIXTURE_SQL = `
  DELETE FROM profiles WHERE email = 'corporate.browser.fixture@example.test';
  INSERT INTO profiles (
    id, email, display_name, role, account_status, created_at, updated_at
  ) VALUES (
    '${CORPORATE_MEMBER_FIXTURE_ID}',
    'corporate.browser.fixture@example.test',
    'Corporate Browser Fixture',
    'member',
    'active',
    '2026-07-11T00:00:00.000Z',
    '2026-07-11T00:00:00.000Z'
  );
`;
const CORPORATE_OWNER_GUARD_TRIGGER_SQL = `
  CREATE TRIGGER trg_corporate_account_members_preserve_owner_on_delete
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
`;

function runLocalD1(command: string) {
  return spawnSync(
    "bun",
    ["x", "wrangler", "d1", "execute", "ARCH_DB", "--local", "--command", command],
    { cwd: process.cwd(), stdio: "ignore", timeout: 35_000 },
  );
}

/** Ensures the local-only profile required for corporate member browser proof. */
export function ensureCorporateMemberBrowserFixture() {
  const result = spawnSync(
    "bun",
    [
      "x",
      "wrangler",
      "d1",
      "execute",
      "ARCH_DB",
      "--local",
      "--command",
      CORPORATE_MEMBER_FIXTURE_SQL,
    ],
    {
      cwd: process.cwd(),
      stdio: "ignore",
      timeout: 35_000,
    },
  );

  if (result.status !== 0 || result.error || result.signal) {
    throw new Error("Could not prepare the local Corporate member browser fixture.");
  }

  return CORPORATE_MEMBER_FIXTURE_ID;
}

/** Resets only the synthetic accounts/workspace owned by this local proof. */
export function resetCorporateBrowserFixture() {
  const dropped = runLocalD1(
    "DROP TRIGGER IF EXISTS trg_corporate_account_members_preserve_owner_on_delete;",
  );
  if (dropped.status !== 0 || dropped.error || dropped.signal) {
    throw new Error("Could not reset the local Corporate browser fixture.");
  }

  let cleanupError: Error | null = null;
  try {
    const result = runLocalD1(`
      DELETE FROM corporate_account_members
      WHERE corporate_account_id IN (
        SELECT id FROM corporate_accounts WHERE name LIKE '${CORPORATE_PROOF_ACCOUNT_PREFIX}'
      );
      DELETE FROM corporate_accounts WHERE name LIKE '${CORPORATE_PROOF_ACCOUNT_PREFIX}';
      UPDATE workspaces
      SET corporate_account_id = NULL, updated_at = '2026-07-11T00:00:00.000Z'
      WHERE id = '${CORPORATE_WORKSPACE_FIXTURE_ID}';
    `);
    if (result.status !== 0 || result.error || result.signal) {
      cleanupError = new Error("Could not reset the local Corporate browser fixture.");
    }
  } finally {
    const restored = runLocalD1(CORPORATE_OWNER_GUARD_TRIGGER_SQL);
    if (restored.status !== 0 || restored.error || restored.signal) {
      cleanupError = new Error("Could not restore the local Corporate owner guard.");
    }
  }

  if (cleanupError) throw cleanupError;
}
