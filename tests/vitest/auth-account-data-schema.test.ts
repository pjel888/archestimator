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
    const serviceRoleHelper = readFileSync(
      join(process.cwd(), "src/lib/auth/account-service-role.ts"),
      "utf8",
    );

    expect(migration).not.toMatch(/user_onboarding_profiles_insert_own/i);
    expect(migration).not.toMatch(/user_onboarding_profiles_update_own/i);
    expect(migration).toMatch(/grant select on public\.user_onboarding_profiles to authenticated/i);
    expect(migration).toMatch(
      /revoke insert, update, delete on public\.user_onboarding_profiles from authenticated/i,
    );
    expect(accountActions).toContain("createAccountServiceRoleClient");
    expect(serviceRoleHelper).toContain('import "server-only"');
    expect(serviceRoleHelper).toContain("SUPABASE_SERVICE_ROLE_KEY");
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

  it("keeps generated Supabase types in sync with the new tables", () => {
    const typesSource = readFileSync(
      join(process.cwd(), "src/lib/supabase/types.ts"),
      "utf8",
    );

    expect(typesSource).toMatch(/user_onboarding_profiles:/);
    expect(typesSource).toMatch(/workspace_account_settings:/);
    expect(typesSource).toMatch(/account_security_events:/);
  });
});
