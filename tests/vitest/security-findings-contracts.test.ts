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
  });

  it("prevents sheet-only collaborators from inheriting project-wide estimate access", () => {
    const originalCollaborationMigration = read("supabase/migrations/20260526142913_project_sheet_collaboration_access.sql");
    const latestCanAccessEstimate = latestFunction("can_access_estimate");

    expect(originalCollaborationMigration).toContain("public.current_project_access_rank(e.project_id) > 0");
    expect(originalCollaborationMigration).not.toContain("public.can_access_project(e.project_id)");
    expect(latestCanAccessEstimate).toContain("public.current_project_access_rank(e.project_id) > 0");
    expect(latestCanAccessEstimate).not.toContain("public.can_access_project(e.project_id)");
  });
});
