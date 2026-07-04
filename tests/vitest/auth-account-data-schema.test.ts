import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readAuthAccountDataMigration() {
  const migrationsDir = join(process.cwd(), "supabase/migrations");
  const migrationName = readdirSync(migrationsDir).find((name) =>
    name.endsWith("_auth_account_data.sql"),
  );

  if (!migrationName) {
    throw new Error("Missing auth account data migration");
  }

  return readFileSync(join(migrationsDir, migrationName), "utf8");
}

const d1AccountSettingsMigration = readFileSync(join(process.cwd(), "migrations/0005_account_settings.sql"), "utf8");
const d1AccountSecurityEventsMigration = readFileSync(join(process.cwd(), "migrations/0004_account_security_events.sql"), "utf8");

describe("auth account data schema", () => {
  it("adds separate profile-owned, workspace-owned, and server-owned audit tables", () => {
    const migration = readAuthAccountDataMigration();

    expect(migration).toMatch(/create table public\.user_onboarding_profiles/i);
    expect(migration).toMatch(/create table public\.workspace_account_settings/i);
    expect(migration).toMatch(/create table public\.account_security_events/i);
    expect(migration).toMatch(/marketing_consent_at/i);
    expect(migration).toMatch(/onboarding_completed_at/i);
    expect(migration).toMatch(/between 1 and 120/i);
    expect(migration).toMatch(/between 1 and 160/i);
    expect(migration).toMatch(/between 1 and 80/i);
  });

  it("enables RLS and denies browser writes to account security events", () => {
    const migration = readAuthAccountDataMigration();

    expect(migration).toMatch(
      /alter table public\.user_onboarding_profiles enable row level security/i,
    );
    expect(migration).toMatch(
      /alter table public\.workspace_account_settings enable row level security/i,
    );
    expect(migration).toMatch(
      /alter table public\.account_security_events enable row level security/i,
    );
    expect(migration).toMatch(
      /revoke insert, update, delete on public\.account_security_events from authenticated/i,
    );
    expect(migration).not.toMatch(/service_role/i);
  });

  it("prevents browser writes to onboarding completion and dormant consent fields", () => {
    const migration = readAuthAccountDataMigration();
    const accountActions = readFileSync(
      join(process.cwd(), "src/lib/auth/account-actions.ts"),
      "utf8",
    );
    const d1Store = readFileSync(
      join(process.cwd(), "src/lib/auth/account-settings-d1-store.ts"),
      "utf8",
    );

    expect(migration).not.toMatch(/user_onboarding_profiles_insert_own/i);
    expect(migration).not.toMatch(/user_onboarding_profiles_update_own/i);
    expect(migration).toMatch(/grant select on public\.user_onboarding_profiles to authenticated/i);
    expect(migration).toMatch(
      /revoke insert, update, delete on public\.user_onboarding_profiles from authenticated/i,
    );
    expect(accountActions).toContain("upsertUserOnboardingProfileInD1");
    expect(accountActions).toContain("getCloudflareD1Database");
    expect(accountActions).not.toMatch(/createSupabaseServerClient|@\/lib\/supabase\/server/);
    expect(d1Store).toContain('import "server-only"');
    expect(d1Store).toContain("getCloudflareD1Database");
    expect(d1Store).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|@supabase\/supabase-js|createClient/);
  });

  it("lets project and estimate collaborators read only their parent workspace account scope", () => {
    const migration = readAuthAccountDataMigration();

    expect(migration).toMatch(/can_access_workspace_account_scope/i);
    expect(migration).toMatch(/from public\.project_members pm/i);
    expect(migration).toMatch(/from public\.estimate_sheet_members esm/i);
    expect(migration).toMatch(/workspace account participants can view workspaces/i);
    expect(migration).toMatch(
      /using \(public\.can_access_workspace_account_scope\(workspace_id\)\)/i,
    );
  });

  it("mirrors account data tables in the active Cloudflare D1 schema", () => {
    expect(d1AccountSettingsMigration).toContain("CREATE TABLE IF NOT EXISTS user_onboarding_profiles");
    expect(d1AccountSettingsMigration).toContain("CREATE TABLE IF NOT EXISTS workspace_account_settings");
    expect(d1AccountSettingsMigration).toContain("marketing_consent_at TEXT");
    expect(d1AccountSettingsMigration).toContain("onboarding_completed_at TEXT");
    expect(d1AccountSecurityEventsMigration).toContain("CREATE TABLE IF NOT EXISTS account_security_events");
    expect(d1AccountSecurityEventsMigration).toContain("metadata_json TEXT NOT NULL DEFAULT '{}'");
  });
});
