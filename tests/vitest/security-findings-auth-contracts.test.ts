import { describe, expect, it } from "vitest";

import { latestFunction, latestMigrationBySuffix, migrationText, read } from "./security-findings-test-helpers";

function sourceBlock(source: string, startMarker: string, endMarker: string) {
  const start = source.indexOf(startMarker);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("Codex auth and estimate-access hardening contracts", () => {
  it("requires a non-default shared secret before local dev auth/admin DB bypass can activate", () => {
    const devGate = read("src/lib/auth/dev-auth-gate.ts");
    const proxy = read("src/lib/auth/request-proxy.ts");
    const devAuth = read("src/lib/auth/dev-auth.ts");
    const profileD1Store = read("src/lib/auth/profile-d1-store.ts");

    expect(devGate).toContain("ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET");
    expect(devGate).toContain("expectedCredential.length >= 32");
    expect(devGate).toContain("isLocalDevHostname(hostname)");
    expect(proxy).toContain("devAuthBypassCredential");
    expect(devAuth).toContain("devAuthBypassCredential");
    expect(devAuth).toContain("getProfileByEmailFromCloudflareD1(email)");
    expect(profileD1Store).toContain("FROM profiles");
  });

  it("blocks profile role self-promotion and keeps current D1 profile updates off the role column", () => {
    const hardeningMigration = read("supabase/migrations/20260602090000_harden_beta_allowlist_admin.sql");
    const profileD1Migration = read("migrations/0003_profiles.sql");
    const profileD1Store = read("src/lib/auth/profile-d1-store.ts");
    const accountActions = read("src/lib/auth/account-actions.ts");

    expect(migrationText).toContain("prevent_profile_role_self_update");
    expect(migrationText).toContain("before update of role on public.profiles");
    expect(migrationText).toContain("revoke insert, update, delete on table public.profiles from authenticated");
    expect(migrationText).toContain("grant update (display_name, default_workspace_id) on table public.profiles to authenticated");
    expect(hardeningMigration).toContain("profile_role_hardening_audit");
    expect(hardeningMigration).toContain("demoted unexpected elevated role during beta allowlist hardening");
    expect(hardeningMigration).toContain("create or replace function public.ensure_current_user_profile");
    expect(hardeningMigration).toContain("grant execute on function public.ensure_current_user_profile(text, text) to authenticated");
    expect(profileD1Migration).toContain("role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('ceo', 'admin', 'member'))");
    expect(profileD1Store).toContain('import {\n  isAppPlatformRole,\n  normalizeAppPlatformRole,\n  type AppPlatformRole,\n} from "@/lib/auth/roles";');
    expect(profileD1Store).toContain("role: normalizeAppPlatformRole(row.role)");
    expect(accountActions).toContain("UPDATE profiles\n       SET display_name = ?, updated_at = ?\n       WHERE id = ?");
    expect(accountActions).not.toMatch(/UPDATE profiles[\s\S]{0,240}\brole\s*=/);
  });

  it("keeps Better Auth session profile resolution read-only instead of falling back to direct profile inserts", () => {
    const hardeningMigration = read("supabase/migrations/20260602090000_harden_beta_allowlist_admin.sql");
    const sessionSource = read("src/lib/auth/session.ts");
    const profileD1Store = read("src/lib/auth/profile-d1-store.ts");

    expect(hardeningMigration).toContain("raise exception 'Authenticated user context is required to create a profile.'");
    expect(hardeningMigration).toContain("returning * into created_profile");
    expect(sessionSource).toContain("getProfileByEmailFromCloudflareD1(identity.email)");
    expect(sessionSource).toContain("profile ?? createSyntheticBetterAuthProfile(identity)");
    expect(sessionSource).toContain('role: "member"');
    expect(sessionSource).not.toContain("ensure_current_user_profile");
    expect(sessionSource).not.toMatch(/INSERT INTO profiles|UPDATE profiles|@supabase\/supabase-js/);
    expect(profileD1Store).toContain("FROM profiles");
    expect(profileD1Store).not.toMatch(/INSERT INTO profiles|UPDATE profiles/);
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
    const allowlistAdmin = read("src/lib/auth/beta-allowlist-admin.ts");
    const allowlistActions = read("src/lib/auth/beta-allowlist-admin-actions.ts");
    const allowlistD1Store = read("src/lib/auth/closed-beta-d1-store.ts");

    expect(migrationText).toContain("20260602090000_harden_beta_allowlist_admin");
    expect(migrationText).toContain("revoke all on table public.closed_beta_allowed_emails from anon, authenticated");
    expect(allowlistAdmin).toContain("requireCurrentUserContext()");
    expect(allowlistAdmin).toContain("canManageClosedBetaAllowlist(context.role)");
    expect(allowlistAdmin).toContain("readClosedBetaAllowlistQueueFromD1(requestedStatus)");
    expect(allowlistActions).toContain("createClosedBetaAllowlistEntryInD1({");
    expect(allowlistActions).toContain("actorUserId: context.userId");
    expect(allowlistActions).toContain("updateClosedBetaAllowlistEntryInD1({");
    expect(allowlistD1Store).toContain("INSERT INTO closed_beta_allowed_emails");
    expect(allowlistD1Store).toContain("INSERT INTO closed_beta_allowlist_audit_events");
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

  it("requires estimate edit access for authenticated row insert history RPCs and server action paths", () => {
    const estimateActions = read("src/lib/estimates/actions.ts");
    const insertAction = sourceBlock(
      estimateActions,
      "export async function insertEstimateRowItemFromLibrary",
      "export async function updateEstimateRowItem",
    );
    const insertRpc = latestFunction("insert_estimate_row_item_with_history");
    const actionGuardIndex = insertAction.indexOf("await assertCanEditEstimate(dataStore, estimateId);");

    expect(actionGuardIndex).toBeGreaterThanOrEqual(0);
    expect(actionGuardIndex).toBeLessThan(insertAction.indexOf('.from("estimate_nodes")'));
    expect(actionGuardIndex).toBeLessThan(insertAction.indexOf('dataStore.call("insert_estimate_row_item_with_history"'));
    expect(insertRpc).toContain("public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id)");
    expect(insertRpc).not.toContain("resolved_workspace_id := public.resolve_estimate_workspace(target_project_id, target_estimate_id, acting_user_id);");
  });

  it("requires estimate edit access for row replace/update/delete and bulk node delete history RPCs", () => {
    const hardeningMigration = latestMigrationBySuffix("_estimate_sheet_bulk_delete_and_edit_rpc_hardening.sql");
    const dynamicallyHardenedFunctions = [
      "update_estimate_row_item_with_history",
      "replace_estimate_row_item_with_history",
      "delete_estimate_row_item_with_history",
      "delete_estimate_node_with_history",
    ];

    for (const functionName of dynamicallyHardenedFunctions) {
      expect(hardeningMigration).toContain(functionName);
    }
    expect(hardeningMigration).toContain("resolved_workspace_id := public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id);");
    expect(hardeningMigration).toContain("is missing estimate edit authorization");
    expect(latestFunction("delete_estimate_nodes_bulk_with_history")).toContain("public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id)");
    expect(hardeningMigration).toContain("create or replace function public.delete_estimate_nodes_bulk_with_history");
    expect(hardeningMigration).toContain("delete from public.estimate_nodes node");
    expect(hardeningMigration).toContain("revoke all on function public.delete_estimate_nodes_bulk_with_history(uuid, uuid, uuid[], uuid, uuid) from public, anon");
    expect(hardeningMigration).toContain("grant execute on function public.delete_estimate_nodes_bulk_with_history(uuid, uuid, uuid[], uuid, uuid) to authenticated");
  });

  it("keeps the latest row update and replace RPC definitions estimate-edit gated", () => {
    const delegateNames = {
      update_estimate_row_item_with_history: "update_estimate_row_item_with_history_unsafe_workspace_gate_20260627",
      replace_estimate_row_item_with_history: "replace_estimate_row_item_with_history_unsafe_workspace_gate_20260627",
    };

    for (const [functionName, delegateName] of Object.entries(delegateNames)) {
      const functionSource = latestFunction(functionName);
      expect(functionSource).toContain("perform public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id)");
      expect(functionSource).toContain(`return public.${delegateName}(`);
      expect(functionSource).not.toContain("resolved_workspace_id");
      expect(functionSource).not.toContain("resolved_workspace_id := public.resolve_estimate_workspace(target_project_id, target_estimate_id, acting_user_id);");
      expect(functionSource).not.toContain("unsafe_workspace_gate_202(");
      expect(functionSource).not.toContain("unsafe_workspace_gate_20(");
    }
  });

  it("requires estimate edit access before restoring a version snapshot as a copy", () => {
    const restoreAsCopyRpc = latestFunction("restore_estimate_sheet_version_as_copy");
    const dropUnsafeRestoreBackup = latestMigrationBySuffix("_drop_unsafe_restore_version_copy_backup.sql");

    expect(restoreAsCopyRpc).toContain("public.assert_can_edit_estimate_for_history(target_project_id, source_version.estimate_id, acting_user_id)");
    expect(restoreAsCopyRpc).toContain("requested_correlation_id uuid := correlation_id");
    expect(restoreAsCopyRpc).toContain("event.correlation_id = requested_correlation_id");
    expect(restoreAsCopyRpc).not.toContain("resolved_workspace_id := public.resolve_estimate_workspace(target_project_id, source_version.estimate_id, acting_user_id);");
    expect(restoreAsCopyRpc).not.toContain("event.correlation_id = correlation_id");
    expect(restoreAsCopyRpc).not.toContain("::public.estimate_sheet_adjustment_mode");
    expect(dropUnsafeRestoreBackup).toContain("drop function if exists public.restore_estimate_sheet_version_as_copy_unsafe_workspace_gate_20260627");
  });

  it("routes sheet adjustment writes through a history-aware estimate-edit RPC", () => {
    const estimateActions = read("src/lib/estimates/actions.ts");
    const adjustmentAction = sourceBlock(
      estimateActions,
      "export async function updateEstimateSheetAdjustment",
      "export async function updateEstimateRowItem",
    );
    const adjustmentRpc = latestFunction("update_estimate_sheet_adjustment_with_history");
    const adjustmentHardening = latestMigrationBySuffix("_harden_estimate_sheet_adjustment_writes.sql");

    expect(adjustmentAction).toContain("await assertCanEditEstimate(dataStore, estimateId);");
    expect(adjustmentAction).toContain('dataStore.call("update_estimate_sheet_adjustment_with_history"');
    expect(adjustmentAction).not.toContain('.from("estimate_sheet_adjustments")');
    expect(adjustmentRpc).toContain("public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id)");
    expect(adjustmentRpc).toContain("public.estimate_sheet_event_result(target_estimate_id, correlation_id)");
    expect(adjustmentRpc).toContain("'sheet_adjustment_updated'");
    expect(adjustmentHardening).toContain("revoke insert, update, delete on table public.estimate_sheet_adjustments from authenticated");
    expect(adjustmentHardening).toContain("grant execute on function public.update_estimate_sheet_adjustment_with_history");
  });

  it("keeps template-node subtree inserts transactional and estimate-edit gated", () => {
    const estimateActions = read("src/lib/estimates/actions.ts");
    const insertNodeAction = sourceBlock(
      estimateActions,
      "export async function insertEstimateTemplateNodeIntoEstimate",
      "export async function insertEstimateRowItemFromLibrary",
    );
    const hardeningMigration = latestMigrationBySuffix("_estimate_sheet_bulk_delete_and_edit_rpc_hardening.sql");
    const insertNodeRpc = latestFunction("insert_estimate_template_node_into_estimate_with_history");

    expect(insertNodeAction).toContain("await assertCanEditEstimate(dataStore, estimateId);");
    expect(insertNodeAction).toContain('dataStore.call("insert_estimate_template_node_into_estimate_with_history"');
    expect(insertNodeAction).not.toContain('dataStore.call("create_estimate_node_with_history"');
    expect(insertNodeAction).not.toContain('dataStore.call("insert_estimate_row_item_with_history"');
    expect(insertNodeRpc).toContain("public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id)");
    expect(insertNodeRpc).toContain("public.create_estimate_node_with_history");
    expect(insertNodeRpc).toContain("public.insert_estimate_row_item_with_history");
    expect(insertNodeRpc).toContain("'template_node_subtree_inserted'");
    expect(hardeningMigration).toContain("revoke all on function public.insert_estimate_template_node_into_estimate_with_history(uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid) from public, anon");
    expect(hardeningMigration).toContain("grant execute on function public.insert_estimate_template_node_into_estimate_with_history(uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid) to authenticated");
  });

  it("requires source estimate edit access before copying estimate nodes or tabs into workspace templates", () => {
    const libraryActions = read("src/lib/component-library/actions.ts");
    const nodePublishAction = sourceBlock(
      libraryActions,
      "export async function createEstimateTemplateFromEstimateNode",
      "export type CreateEstimateTemplateFromTabInput",
    );
    const tabPublishAction = sourceBlock(
      libraryActions,
      "export async function createEstimateTemplateFromEstimateTab",
      "export async function renameEstimateTemplate",
    );
    const sourceEditGuard = "await assertCanPublishEstimateTemplateFromEstimate(database, input.estimateId, currentUser);";

    expect(libraryActions).toContain("canEditEstimateInD1(database, estimateId, user)");
    expect(nodePublishAction.indexOf(sourceEditGuard)).toBeGreaterThan(nodePublishAction.indexOf('if (!estimate) throw new Error("Estimate not found in the current workspace.");'));
    expect(nodePublishAction.indexOf(sourceEditGuard)).toBeLessThan(nodePublishAction.indexOf("FROM estimate_nodes"));
    expect(nodePublishAction.indexOf(sourceEditGuard)).toBeLessThan(nodePublishAction.indexOf("assertWithinLibraryQuota"));
    expect(tabPublishAction.indexOf(sourceEditGuard)).toBeGreaterThan(tabPublishAction.indexOf('if (!estimate) throw new Error("Estimate not found in the current workspace.");'));
    expect(tabPublishAction.indexOf(sourceEditGuard)).toBeLessThan(tabPublishAction.indexOf("FROM estimate_nodes"));
    expect(tabPublishAction.indexOf(sourceEditGuard)).toBeLessThan(tabPublishAction.indexOf("assertWithinLibraryQuota"));
  });

  it("hardens estimate metadata history updates at the RPC and UI edit-affordance boundaries", () => {
    const estimateActions = read("src/lib/estimates/actions.ts");
    const metadataStrip = read("src/components/workshop/ProjectEstimateMetadataStrip.tsx");
    const metadataRpcHardening = latestMigrationBySuffix("_harden_estimate_metadata_history_edit_access.sql");

    expect(metadataRpcHardening).toContain("public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id)");
    expect(metadataRpcHardening).toContain("raise exception 'public.update_estimate_details_with_history is missing estimate edit authorization.'");
    expect(metadataRpcHardening).toContain("grant execute on function public.update_estimate_details_with_history(uuid, uuid, jsonb, uuid, uuid) to authenticated");
    expect(estimateActions).toContain("await assertCanEditEstimate(dataStore, input.estimateId);");
    expect(metadataStrip).toContain("canEditEstimate: canEditEstimate === true");
    expect(metadataStrip).toContain("if (!metadata || !canEditEstimate) return;");
    expect(metadataStrip).toContain("disabled={!metadata || !canEditEstimate || isPending}");
  });

  it("scopes estimate sheet version history reads to estimate access instead of workspace membership", () => {
    const eventRlsHardening = read("supabase/migrations/20260619105250_project_dashboard_activity_location.sql");
    const versionRlsHardening = latestMigrationBySuffix("_harden_estimate_sheet_versions_rls.sql");

    expect(eventRlsHardening).toContain('create policy "estimate activity sheet readers can read events"');
    expect(eventRlsHardening).toContain("using (public.can_access_estimate(estimate_id))");
    expect(versionRlsHardening).toContain("alter table public.estimate_sheet_versions enable row level security");
    expect(versionRlsHardening).toContain("drop policy if exists estimate_sheet_versions_select_authenticated");
    expect(versionRlsHardening).toContain('create policy "estimate version sheet readers can read versions"');
    expect(versionRlsHardening).toContain("using (public.can_access_estimate(estimate_id))");
    expect(versionRlsHardening).toContain("revoke all on public.estimate_sheet_versions from public, anon, authenticated");
    expect(versionRlsHardening).toContain("grant select on public.estimate_sheet_versions to authenticated");
    expect(versionRlsHardening).not.toContain("is_workspace_member(workspace_id)");
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
