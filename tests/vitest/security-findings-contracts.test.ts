import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repo = process.cwd();
function read(path: string) {
  return readFileSync(join(repo, path), "utf8");
}
const migrations = readdirSync(join(repo, "supabase/migrations"))
  .filter((file) => file.endsWith(".sql"))
  .sort();
const migrationText = migrations
  .map((file) => `-- ${file}\n${read(`supabase/migrations/${file}`)}`)
  .join("\n");

function latestFunction(functionName: string) {
  const functionPattern = new RegExp(
    `create or replace function public\\.${functionName}\\([\\s\\S]*?\\n\\$\\$;`,
    "g",
  );
  const matches = migrationText.match(functionPattern) ?? [];
  return matches.at(-1) ?? "";
}

function latestMigrationBySuffix(suffix: string) {
  const file = migrations.filter((migration) => migration.endsWith(suffix)).at(-1);
  return file ? read(`supabase/migrations/${file}`) : "";
}

describe("Codex security findings hardening contracts", () => {
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

  it("keeps library folder mutations limited to workspace editors", () => {
    const folderActions = read("src/lib/component-library/actions.ts");
    const libraryFolderHardening = latestMigrationBySuffix("_harden_library_folder_editor_access.sql");
    const latestReorderRpc = latestFunction("reorder_library_folders");

    expect(folderActions).toContain("assertCanManageLibraryFolders");
    expect(folderActions).toContain('supabase.rpc("is_workspace_editor"');
    expect(libraryFolderHardening).toContain('drop policy if exists "members can manage library folders" on public.library_folders');
    expect(libraryFolderHardening).toContain('create policy "members can view library folders" on public.library_folders');
    expect(libraryFolderHardening).toContain('create policy "workspace editors can insert library folders" on public.library_folders');
    expect(libraryFolderHardening).toContain('create policy "workspace editors can update library folders" on public.library_folders');
    expect(libraryFolderHardening).toContain('create policy "workspace editors can delete library folders" on public.library_folders');
    expect(libraryFolderHardening).toContain("revoke all on public.library_folders from authenticated");
    expect(libraryFolderHardening).toContain("grant select, insert, update, delete on public.library_folders to authenticated");
    expect(latestReorderRpc).toContain("public.is_workspace_editor(target_workspace_id) is not true");
    expect(latestReorderRpc).not.toContain("not public.is_workspace_member(target_workspace_id)");
  });

  it("pins MCP tooling package specs instead of auto-resolving floating uvx packages", () => {
    const expectedPackage = "code-review-graph==2.3.5";
    const rootMcp = JSON.parse(read(".mcp.json"));
    const cursorMcp = JSON.parse(read(".cursor/mcp.json"));
    const codexConfig = read(".codex/config.toml");

    for (const server of [rootMcp.mcpServers["code-review-graph"], cursorMcp.mcpServers["code-review-graph"]]) {
      expect(server.command).toBe("uvx");
      expect(server.args).toEqual([expectedPackage, "serve"]);
      expect(server.args).not.toContain("code-review-graph");
    }

    expect(codexConfig).toContain(`"${expectedPackage}"`);
    expect(codexConfig).not.toMatch(/^\s*"code-review-graph",\s*$/m);
  });

  it("enforces publication password access before creating recipient sessions", () => {
    const sessionRoute = read("src/app/api/share/[token]/session/route.ts");
    const handlerBody = sessionRoute.slice(sessionRoute.indexOf("export async function POST"));

    expect(handlerBody.indexOf("resolveProjectPublicationAccessByToken")).toBeGreaterThanOrEqual(0);
    expect(handlerBody.indexOf("hasPublicationAccessCookie")).toBeGreaterThan(handlerBody.indexOf("publicationAccess.passwordRequired"));
    expect(handlerBody.indexOf("hasPublicationAccessCookie")).toBeLessThan(handlerBody.indexOf("verifySharedLinkRecipientToken"));
  });

  it("gates public activity for password-protected links and scopes decisions/events to verified recipients", () => {
    const activityRoute = read("src/app/api/share/[token]/activity/route.ts");

    expect(activityRoute).toContain("password_hash");
    expect(activityRoute).toContain("hasPublicationAccessCookie");
    expect(activityRoute).toContain('.eq("recipient_id", verifiedRecipientId)');
    expect(activityRoute).not.toContain('snapshotVersion: "1"');
  });

  it("does not return recipient token hashes to managers and makes hash-credential RPCs service-role only", () => {
    const publicationActions = read("src/lib/publication/actions.ts");
    const recipientRowInterface = publicationActions.match(/interface SharedLinkRecipientRow \{[\s\S]*?\n\}/)?.[0] ?? "";
    const listFn = publicationActions.match(/export async function listSharedLinkRecipients[\s\S]*?^}/m)?.[0] ?? "";

    expect(recipientRowInterface).not.toContain("recipient_token_hash");
    expect(listFn).not.toContain('.select("*")');
    expect(migrationText).toContain("20260601145000_lock_down_shared_link_recipient_credentials");
    expect(migrationText).not.toMatch(/grant execute on function public\.submit_client_response\(text, text, text, text\) to .*\bauthenticated\b/);
    expect(migrationText).not.toMatch(/grant execute on function public\.insert_client_comment\(text, text, uuid, uuid, text\) to .*\banon\b/);
  });

  it("locks shared-link decisions to the recipient-viewed publication snapshot version", () => {
    const decisionRoute = read("src/app/api/share/[token]/decision/route.ts");
    const publicRepository = read("src/lib/publication/public-repository.ts");
    const latestSubmitClientResponse = latestFunction("submit_client_response");

    expect(migrationText).toContain("drop function if exists public.submit_client_response(text, text, text, text)");
    expect(latestSubmitClientResponse).toContain("p_expected_snapshot_version integer");
    expect(latestSubmitClientResponse).toContain("v_snapshot_version is distinct from p_expected_snapshot_version");
    expect(latestSubmitClientResponse).toContain("p_decision, left(p_note, 2000), p_expected_snapshot_version");
    expect(decisionRoute).toContain("resolveProjectPublicationAccessByToken(token)");
    expect(decisionRoute).toContain("snapshotVersion: access.snapshotVersion");
    expect(publicRepository).toContain("expectedSnapshotVersion: number");
    expect(publicRepository).toContain("p_expected_snapshot_version: params.expectedSnapshotVersion");
  });

  it("locks shared-link comments to the recipient-viewed publication snapshot version", () => {
    const commentRoute = read("src/app/api/share/[token]/comment/route.ts");
    const publicRepository = read("src/lib/publication/public-repository.ts");
    const latestInsertClientComment = latestFunction("insert_client_comment");

    expect(migrationText).toContain("drop function if exists public.insert_client_comment(text, text, uuid, uuid, text)");
    expect(latestInsertClientComment).toContain("p_expected_snapshot_version integer");
    expect(latestInsertClientComment).toContain("v_snapshot_version is distinct from p_expected_snapshot_version");
    expect(commentRoute).toContain("resolveProjectPublicationAccessByToken(token)");
    expect(commentRoute).toContain("snapshotVersion: access.snapshotVersion");
    expect(publicRepository).toContain("expectedSnapshotVersion: number");
    expect(publicRepository).toContain("p_expected_snapshot_version: params.expectedSnapshotVersion");
  });

  it("keeps password-protected share metadata generic before snapshot resolution", () => {
    const sharePage = read("src/app/share/[token]/page.tsx");
    const metadataFn = sharePage.slice(sharePage.indexOf("export async function generateMetadata"));

    expect(sharePage).toContain("protectedPublicationMetadata");
    expect(metadataFn.indexOf("if (access.passwordRequired)")).toBeGreaterThanOrEqual(0);
    expect(metadataFn.indexOf("if (access.passwordRequired)")).toBeLessThan(
      metadataFn.indexOf("resolveProjectPublicationSnapshotByToken(token)"),
    );
    expect(sharePage).toContain('title: "Proposal Review | Archestimator"');
    expect(sharePage).toContain('description: "This proposal is password protected."');
  });

  it("keeps project images out of public Supabase Storage surfaces", () => {
    const projectImageRoute = read("src/app/api/projects/images/route.ts");
    const projectActions = read("src/lib/projects/actions.ts");
    const storageCleanup = read("src/lib/mass-deletion/storage-cleanup.ts");
    const publicationImageUrl = read("src/lib/publication/image-url.ts");
    const nextConfig = read("next.config.ts");
    const privateProjectImageMigration = read("supabase/migrations/20260603222628_private_project_image_storage.sql");
    const qualifiedProjectImageMigration = read("supabase/migrations/20260603224800_qualify_project_image_storage_policies.sql");
    const cleanupTargetsMigration = latestMigrationBySuffix("_harden_project_image_cleanup_targets.sql");
    const latestProjectDeletePreview = latestFunction("preview_bulk_delete_projects");

    expect(projectImageRoute).toContain('const PROJECT_IMAGE_BUCKET = "project-images"');
    expect(projectImageRoute).toContain("export async function GET(request: Request)");
    expect(projectImageRoute).toContain("createProjectImageRouteUrl(path)");
    expect(projectImageRoute).not.toContain(".getPublicUrl(path)");
    expect(projectActions).toContain('const PROJECT_IMAGE_BUCKET = "project-images"');
    expect(storageCleanup).toContain('const PROJECT_IMAGE_BUCKET = "project-images"');
    expect(publicationImageUrl).toContain('if (imageUrl.pathname.includes("/project-images/")) return null');
    expect(nextConfig).not.toContain("/storage/v1/object/public/project-images/**");
    expect(privateProjectImageMigration).toContain("'project-images'");
    expect(privateProjectImageMigration).toContain("public = false");
    expect(privateProjectImageMigration).toContain("project images can be read by project members");
    expect(privateProjectImageMigration).toContain("coalesce((storage.foldername(name))[3], '') <> 'project-images'");
    expect(qualifiedProjectImageMigration).toContain("storage.foldername(storage.objects.name)");
    expect(qualifiedProjectImageMigration).not.toContain("storage.foldername(p.name)");
    expect(cleanupTargetsMigration).toContain("create or replace function public.preview_bulk_delete_projects");
    expect(latestProjectDeletePreview).toContain("jsonb_build_object('bucket', 'project-images'");
    expect(latestProjectDeletePreview).not.toContain("jsonb_build_object('bucket', 'component-images'");
  });

  it("sanitizes estimate row source snapshot image URLs before persistence and legacy rendering", () => {
    const estimateActions = read("src/lib/estimates/actions.ts");
    const workspaceRepository = read("src/lib/repositories/workspace-repository.ts");
    const estimateSheetContent = read("src/components/workshop/EstimateSheetContent.tsx");

    expect(estimateActions).toContain("return sanitizeEstimateRowSourceSnapshot({");
    expect(estimateActions).toContain("source_snapshot: sanitizeEstimateRowSourceSnapshot(row.source_snapshot)");
    expect(workspaceRepository).toContain("normalizeEstimateRowImageUrl(sourceSnapshot.imageUrl)");
    expect(estimateSheetContent).toContain("normalizeEstimateRowImageUrl(sourceSnapshot.imageUrl)");
  });

  it("prevents sheet-only collaborators from inheriting project-wide estimate access", () => {
    const originalCollaborationMigration = read("supabase/migrations/20260526142913_project_sheet_collaboration_access.sql");
    const latestCanAccessEstimate = latestFunction("can_access_estimate");

    expect(originalCollaborationMigration).toContain("public.current_project_access_rank(e.project_id) > 0");
    expect(originalCollaborationMigration).not.toContain("public.can_access_project(e.project_id)");
    expect(latestCanAccessEstimate).toContain("public.current_project_access_rank(e.project_id) > 0");
    expect(latestCanAccessEstimate).not.toContain("public.can_access_project(e.project_id)");
  });

  it("keeps raw proposal workbook artifacts out of the manual proof packet", () => {
    const proofDir = ".ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof";
    const proofFilenames = readdirSync(join(repo, proofDir));
    const sanitizedSummary = JSON.parse(read(`${proofDir}/proposal-workbook-exceljs-summary-sanitized-2026-06-02.json`));
    const packetReadme = read(`${proofDir}/README.md`);
    const withdrawalArtifact = read(`${proofDir}/confidential-proposal-artifact-withdrawal-2026-06-04.json`);

    expect(proofFilenames.some((filename) => filename.endsWith(".xlsx"))).toBe(false);
    expect(packetReadme).not.toMatch(/[a-z0-9-]+-proposal-\d{4}-\d{2}-\d{2}\.xlsx/i);
    expect(withdrawalArtifact).not.toMatch(/[a-z0-9-]+-proposal-\d{4}-\d{2}-\d{2}\.xlsx/i);
    expect(withdrawalArtifact).toContain("CONFIDENTIAL_PROPOSAL_WORKBOOK_REDACTED.xlsx");
    expect(sanitizedSummary.rawWorkbookRetained).toBe(false);
    expect(sanitizedSummary.rawPreviewRetained).toBe(false);
    expect(JSON.stringify(sanitizedSummary)).not.toContain("workbookPath");
    expect(JSON.stringify(sanitizedSummary)).not.toContain("55230");
  });

  it("keeps live closed-beta proof sanitized to role placeholders", () => {
    const proofPath =
      ".ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/live-closed-beta-refresh-2026-06-04T1006Z.json";
    const proof = JSON.parse(read(proofPath));
    const proofText = JSON.stringify(proof);
    const currentState = read(".ai/10_state/current-state.md");
    const knownIssues = read(".ai/10_state/known-issues.md");
    const currentStart = currentState.indexOf("**Live Closed-Beta Refresh (2026-06-04 10:06Z):**");
    const currentEnd = currentState.indexOf("**Codex Security Cheap-Path Closure Batch", currentStart);
    const knownStart = knownIssues.indexOf("- Fresh 2026-06-04T10:06Z proof");
    const knownEnd = knownIssues.indexOf("- Latest artifact:", knownStart);
    const currentLow07Summary = currentState.slice(currentStart, currentEnd);
    const knownLow07Summary = knownIssues.slice(knownStart, knownEnd);
    const low07Surface = [proofText, currentLow07Summary, knownLow07Summary].join("\n");
    const forbiddenProofDetails = [
      "philipjonlewis",
      "Philip Lewis",
      "gmail.com",
      "ebxxqidacheyapmmzavr",
      "Oceania (Sydney)",
      "Philippines",
      "chatgpt.com/codex/cloud/security/findings",
      "send.contact.archestimator.com",
      "GitHub has no open",
      "queue empty",
    ];

    expect(proof.repository).toBe("REPOSITORY_PLACEHOLDER");
    expect(proof.raw_operational_proof).toBe("not committed");
    expect(proof.sanitized_provider_readiness.supabase.project).toBe("SUPABASE_PROJECT_PLACEHOLDER");
    expect(proof.sanitized_provider_readiness.supabase.allowlist_readback).toBe(
      "OWNER_ROLE_ACTIVE_PLACEHOLDER",
    );
    expect(currentStart).toBeGreaterThanOrEqual(0);
    expect(currentEnd).toBeGreaterThan(currentStart);
    expect(knownStart).toBeGreaterThanOrEqual(0);
    expect(knownEnd).toBeGreaterThan(knownStart);
    expect(currentLow07Summary).toContain("without recording raw private beta user");
    expect(knownLow07Summary).toContain("raw private beta user, allowlist, project");
    for (const detail of forbiddenProofDetails) {
      expect(low07Surface).not.toContain(detail);
    }
  });
});
