import { describe, expect, it } from "vitest";

import { latestFunction, latestMigrationBySuffix, migrationText, read } from "./security-findings-test-helpers";

describe("Codex publication and public-surface hardening contracts", () => {
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
    expect(decisionRoute).toContain("readPublicationViewSnapshotVersion");
    expect(decisionRoute).toContain("viewedSnapshotVersion !== access.snapshotVersion");
    expect(decisionRoute).toContain("const expectedSnapshotVersion = viewedSnapshotVersion ?? access.snapshotVersion");
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
    expect(commentRoute).toContain("readPublicationViewSnapshotVersion");
    expect(commentRoute).toContain("viewedSnapshotVersion !== access.snapshotVersion");
    expect(commentRoute).toContain("const expectedSnapshotVersion = viewedSnapshotVersion ?? access.snapshotVersion");
    expect(publicRepository).toContain("expectedSnapshotVersion: number");
    expect(publicRepository).toContain("p_expected_snapshot_version: params.expectedSnapshotVersion");
  });

  it("uses HMAC-peppered public telemetry hashes for structured share route logs", () => {
    const commentRoute = read("src/app/api/share/[token]/comment/route.ts");
    const decisionRoute = read("src/app/api/share/[token]/decision/route.ts");
    const publicRepository = read("src/lib/publication/public-repository.ts");

    expect(publicRepository).toContain("export function hashPublicTelemetryValue");
    expect(publicRepository).toContain('createHmac("sha256", readTelemetryHashPepper())');
    for (const routeSource of [commentRoute, decisionRoute]) {
      expect(routeSource).toContain("hashPublicTelemetryValue(ip)");
      expect(routeSource).not.toMatch(/createHash\(["']sha256["']\)\.update\(ip\)/);
      expect(routeSource).not.toContain('from "crypto"');
    }
  });

  it("rotates shared-link credentials under a locked current-row guard", () => {
    const actions = read("src/lib/publication/actions.ts");
    const rotationMigration = latestFunction("rotate_project_publication_credentials");

    expect(actions).toContain("expected_encrypted_token: latest.encrypted_token");
    expect(actions).not.toContain("p_snapshot_version: latest.snapshot_version + 1");
    expect(actions).toContain('message: "Shared link changed while rotating. Refresh and try again."');
    expect(rotationMigration).toContain("expected_encrypted_token text");
    expect(rotationMigration).toContain("for update");
    expect(rotationMigration).toContain("v_encrypted_token is distinct from expected_encrypted_token");
    expect(rotationMigration).toContain("return -1");
    expect(rotationMigration).toContain("v_next_snapshot_version := coalesce(v_snapshot_version, 0) + 1");
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
    const estimateActivityHistory = read("src/components/workshop/estimate-sheet/activity-history.tsx");

    expect(estimateActions).toContain("return sanitizeEstimateRowSourceSnapshot({");
    expect(estimateActions).toContain("source_snapshot: sanitizeEstimateRowSourceSnapshot(row.source_snapshot)");
    expect(workspaceRepository).toContain("normalizeEstimateRowImageUrl(sourceSnapshot.imageUrl)");
    expect(estimateActivityHistory).toContain("normalizeEstimateRowImageUrl(sourceSnapshot.imageUrl)");
  });
});
