import { describe, expect, it } from "vitest";

import { latestFunction, migrationText, read } from "./security-findings-test-helpers";

describe("Codex auth and estimate-access hardening contracts", () => {
  it("requires a non-default shared secret before local dev auth/admin DB bypass can activate", () => {
    const devGate = read("src/lib/auth/dev-auth-gate.ts");
    const proxy = read("src/proxy.ts");
    const devAuth = read("src/lib/auth/dev-auth.ts");
    const serverClient = read("src/lib/supabase/server.ts");

    expect(devGate).toContain("ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET");
    expect(devGate).toContain("expectedCredential.length >= 32");
    expect(proxy).toContain("devAuthBypassCredential");
    expect(devAuth).toContain("devAuthBypassCredential");
    expect(serverClient).toContain("devAuthBypassCredential");
  });

  it("blocks profile role self-promotion and removes role from authenticated profile update grants", () => {
    const hardeningMigration = read("supabase/migrations/20260602090000_harden_beta_allowlist_admin.sql");
    const sessionSource = read("src/lib/auth/session.ts");

    expect(migrationText).toContain("prevent_profile_role_self_update");
    expect(migrationText).toContain("before update of role on public.profiles");
    expect(migrationText).toContain("revoke insert, update, delete on table public.profiles from authenticated");
    expect(migrationText).toContain("grant update (display_name, default_workspace_id) on table public.profiles to authenticated");
    expect(hardeningMigration).toContain("profile_role_hardening_audit");
    expect(hardeningMigration).toContain("demoted unexpected elevated role during beta allowlist hardening");
    expect(hardeningMigration).toContain("create or replace function public.ensure_current_user_profile");
    expect(hardeningMigration).toContain("grant execute on function public.ensure_current_user_profile(text, text) to authenticated");
    expect(sessionSource).toContain('"ensure_current_user_profile"');
    expect(sessionSource).not.toContain('.from("profiles")\n    .insert');
  });

  it("lets the beta allowlist hardening migration demote unexpected roles without tripping its own trigger", () => {
    const hardeningMigration = read("supabase/migrations/20260602090000_harden_beta_allowlist_admin.sql");
    const disableIndex = hardeningMigration.indexOf("alter table public.profiles disable trigger profiles_prevent_role_self_update");
    const demotionIndex = hardeningMigration.indexOf("with candidates as (");
    const enableIndex = hardeningMigration.indexOf("alter table public.profiles enable trigger profiles_prevent_role_self_update");

    expect(disableIndex).toBeGreaterThanOrEqual(0);
    expect(demotionIndex).toBeGreaterThan(disableIndex);
    expect(enableIndex).toBeGreaterThan(demotionIndex);
  });

  it("routes closed beta allowlist admin through actor-derived RPCs instead of direct table reachability", () => {
    expect(migrationText).toContain("20260602090000_harden_beta_allowlist_admin");
    expect(migrationText).toContain("revoke all on table public.closed_beta_allowed_emails from anon, authenticated");
    expect(read("src/lib/auth/beta-allowlist-admin.ts")).toContain('rpc("read_closed_beta_allowlist_queue"');
    expect(read("src/lib/auth/beta-allowlist-admin-actions.ts")).toContain('rpc("create_closed_beta_allowlist_entry"');
  });

  it("keeps estimate SECURITY DEFINER bypasses tied to auth.role service_role only", () => {
    expect(migrationText).not.toContain("select current_user in ('postgres', 'service_role', 'supabase_admin')");
    expect(latestFunction("estimate_sheet_can_bypass_auth")).toContain("coalesce(auth.role(), '') = 'service_role'");
    expect(migrationText).not.toMatch(/grant execute on function public\.get_estimate_sheet_version_control_preflight\(\) to authenticated/);
    expect(migrationText).not.toMatch(/grant execute on function public\.backfill_estimate_sheet_baseline_versions\(integer, uuid\) to authenticated/);
  });

  it("requires estimate edit access for row detach in both RPC and server action paths", () => {
    expect(read("supabase/migrations/20260601184343_unlink_estimate_row_items.sql")).toContain("public.can_edit_estimate(target_estimate_id)");
    expect(read("src/lib/estimates/actions.ts")).toContain("assertCanEditEstimate");
  });

  it("prevents estimate-only collaborators from inheriting project-wide estimate access", () => {
    const originalCollaborationMigration = read("supabase/migrations/20260526142913_project_sheet_collaboration_access.sql");
    const latestCanAccessEstimate = latestFunction("can_access_estimate");

    expect(originalCollaborationMigration).toContain("public.current_project_access_rank(e.project_id) > 0");
    expect(originalCollaborationMigration).not.toContain("public.can_access_project(e.project_id)");
    expect(latestCanAccessEstimate).toContain("public.current_project_access_rank(e.project_id) > 0");
    expect(latestCanAccessEstimate).not.toContain("public.can_access_project(e.project_id)");
  });
});
