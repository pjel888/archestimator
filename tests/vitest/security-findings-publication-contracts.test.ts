import { describe, expect, it } from "vitest";

import { latestFunction, latestMigrationBySuffix, migrationText, read } from "./security-findings-test-helpers";

function d1StoreMethod(source: string, name: string) {
  const marker = `async ${name}(`;
  const start = source.indexOf(marker);
  expect(start, `${name} D1 store method missing`).toBeGreaterThanOrEqual(0);
  const next = source.indexOf("\n    async ", start + marker.length);
  return source.slice(start, next === -1 ? source.length : next);
}

describe("Codex publication and public-surface hardening contracts", () => {
  it("keeps every public share mutation behind same-origin CSRF guards", () => {
    const guardedMutations = [
      {
        path: "src/app/api/share/[token]/password/route.ts",
        marker: "export async function POST",
        guard: "assertSameOriginPublicPost(request)",
        downstream: "checkProjectPublicationPasswordRateLimit",
      },
      {
        path: "src/app/api/share/[token]/session/route.ts",
        marker: "export async function POST",
        guard: "assertSameOriginPublicPost(request)",
        downstream: "createRecipientSessionResponse",
      },
      {
        path: "src/app/api/share/[token]/session/route.ts",
        marker: "export async function DELETE",
        guard: "assertSameOriginPublicDelete(request)",
        downstream: "createSharedLinkSessionCookieName(token)",
      },
      {
        path: "src/app/api/share/[token]/comment/route.ts",
        marker: "export async function POST",
        guard: "assertSameOriginPublicPost(request)",
        downstream: "checkSharedLinkCommentRateLimit",
      },
      {
        path: "src/app/api/share/[token]/decision/route.ts",
        marker: "async function legacyDecisionPost",
        guard: "assertSameOriginPublicPost(request)",
        downstream: "checkSharedLinkDecisionRateLimit",
      },
      {
        path: "src/app/api/share/[token]/unsubscribe/route.ts",
        marker: "export async function POST",
        guard: "assertSameOriginPublicFormPost(request, csrfToken)",
        downstream: "checkSharedLinkUnsubscribeRateLimit",
      },
    ];

    for (const { path, marker, guard, downstream } of guardedMutations) {
      const handler = read(path).slice(read(path).indexOf(marker));
      expect(handler).toContain(guard);
      expect(handler.indexOf(guard)).toBeLessThan(handler.indexOf(downstream));
    }

    const decisionRoute = read("src/app/api/share/[token]/decision/route.ts");
    const decisionPost = decisionRoute.slice(decisionRoute.indexOf("export async function POST"));
    expect(decisionPost).toContain("isClientPortalToken(token)");
    expect(decisionPost).toContain("submitClientPortalDecisionResponse(request, token)");
    expect(decisionPost).toContain("legacyDecisionPost(request");

    const unsubscribeRoute = read("src/app/api/share/[token]/unsubscribe/route.ts");
    const unsubscribeGet = unsubscribeRoute.slice(
      unsubscribeRoute.indexOf("export async function GET"),
      unsubscribeRoute.indexOf("export async function POST"),
    );
    expect(unsubscribeGet).not.toContain("unsubscribeSharedLinkRecipientByToken");
  });

  it("enforces publication password access before creating recipient sessions", () => {
    const sessionRoute = read("src/app/api/share/[token]/session/route.ts");
    const sessionHelper = sessionRoute.slice(
      sessionRoute.indexOf("async function createRecipientSessionResponse"),
      sessionRoute.indexOf("export async function GET"),
    );
    const getHandler = sessionRoute.slice(
      sessionRoute.indexOf("export async function GET"),
      sessionRoute.indexOf("export async function POST"),
    );
    const postHandler = sessionRoute.slice(sessionRoute.indexOf("export async function POST"));

    expect(sessionHelper.indexOf("resolveProjectPublicationAccessByToken")).toBeGreaterThanOrEqual(0);
    expect(sessionHelper.indexOf("hasPublicationAccessCookie")).toBeGreaterThan(sessionHelper.indexOf("publicationAccess.passwordRequired"));
    expect(sessionHelper.indexOf("hasPublicationAccessCookie")).toBeLessThan(sessionHelper.indexOf("verifySharedLinkRecipientToken"));
    expect(getHandler).toContain("createRecipientSessionResponse");
    expect(postHandler).toContain("assertSameOriginPublicPost");
    expect(postHandler).toContain("createRecipientSessionResponse");
  });

  it("gates public activity for password-protected links and scopes decisions/events to verified recipients", () => {
    const activityRoute = read("src/app/api/share/[token]/activity/route.ts");
    const d1Store = read("src/lib/publication/d1-store.ts");
    const responseReader = d1StoreMethod(d1Store, "listRecipientActivityResponses");
    const eventReader = d1StoreMethod(d1Store, "listRecipientActivityEvents");

    expect(activityRoute).toContain("password_hash");
    expect(activityRoute).toContain("hasPublicationAccessCookie");
    expect(activityRoute).toContain("listRecipientActivityResponses({ publicationId: pubId, recipientId: verifiedRecipientId");
    expect(activityRoute).toContain("listRecipientActivityEvents({ publicationId: pubId, recipientId: verifiedRecipientId");
    expect(responseReader).toContain("WHERE publication_id = ? AND recipient_id = ?");
    expect(responseReader).toContain("[input.publicationId, input.recipientId");
    expect(eventReader).toContain("WHERE publication_id = ? AND recipient_id = ?");
    expect(eventReader).toContain("[input.publicationId, input.recipientId");
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
    const d1Store = read("src/lib/publication/d1-store.ts");
    const submitClientResponse = d1StoreMethod(d1Store, "submitClientResponse");
    const latestSubmitClientResponse = latestFunction("submit_client_response");

    expect(migrationText).toContain("drop function if exists public.submit_client_response(text, text, text, text, integer)");
    expect(latestSubmitClientResponse).toContain("p_expected_snapshot_version integer");
    expect(latestSubmitClientResponse).toContain("v_snapshot_version is distinct from p_expected_snapshot_version");
    expect(latestSubmitClientResponse).toContain("left(p_note, 2000)");
    expect(latestSubmitClientResponse).toMatch(/snapshot_version_at_decision[\s\S]*p_expected_snapshot_version/);
    expect(decisionRoute).toContain("resolveProjectPublicationAccessByToken(token)");
    expect(decisionRoute).toContain("readPublicationViewSnapshotVersion");
    expect(decisionRoute).toContain("viewedSnapshotVersion !== access.snapshotVersion");
    expect(decisionRoute).toContain("const expectedSnapshotVersion = viewedSnapshotVersion ?? access.snapshotVersion");
    expect(publicRepository).toContain("expectedSnapshotVersion: number");
    expect(publicRepository).toContain("expectedSnapshotVersion: params.expectedSnapshotVersion");
    expect(submitClientResponse).toContain("publication.id !== input.publicationId || publication.snapshot_version !== input.expectedSnapshotVersion");
    expect(submitClientResponse).toContain("snapshot_version_at_decision");
    expect(submitClientResponse).toContain("input.expectedSnapshotVersion");
  });

  it("locks shared-link comments to the recipient-viewed publication snapshot version", () => {
    const commentRoute = read("src/app/api/share/[token]/comment/route.ts");
    const publicRepository = read("src/lib/publication/public-repository.ts");
    const d1Store = read("src/lib/publication/d1-store.ts");
    const insertClientComment = d1StoreMethod(d1Store, "insertClientComment");
    const latestInsertClientComment = latestFunction("insert_client_comment");

    expect(migrationText).toContain("drop function if exists public.insert_client_comment(text, text, uuid, uuid, text, integer)");
    expect(latestInsertClientComment).toContain("p_expected_snapshot_version integer");
    expect(latestInsertClientComment).toContain("v_snapshot_version is distinct from p_expected_snapshot_version");
    expect(commentRoute).toContain("resolveProjectPublicationAccessByToken(token)");
    expect(commentRoute).toContain("readPublicationViewSnapshotVersion");
    expect(commentRoute).toContain("viewedSnapshotVersion !== access.snapshotVersion");
    expect(commentRoute).toContain("const expectedSnapshotVersion = viewedSnapshotVersion ?? access.snapshotVersion");
    expect(publicRepository).toContain("expectedSnapshotVersion: number");
    expect(publicRepository).toContain("expectedSnapshotVersion: params.expectedSnapshotVersion");
    expect(insertClientComment).toContain("publication.id !== input.publicationId || publication.snapshot_version !== input.expectedSnapshotVersion");
    expect(insertClientComment).toContain("snapshot_version_at_comment");
    expect(insertClientComment).toContain("input.expectedSnapshotVersion");
  });

  it("uses HMAC-peppered public telemetry hashes for structured share route logs", () => {
    const commentRoute = read("src/app/api/share/[token]/comment/route.ts");
    const decisionRoute = read("src/app/api/share/[token]/decision/route.ts");
    const publicRepository = read("src/lib/publication/public-repository.ts");
    const publicationSecurity = read("src/lib/publication/security.ts");

    expect(publicationSecurity).toContain("export function hashPublicTelemetryValue");
    expect(publicationSecurity).toContain('createHmac("sha256", readTelemetryHashPepper())');
    expect(publicRepository).not.toContain("export function hashPublicTelemetryValue");
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

  it("writes account security audit rows for successful Publisher manager mutations", () => {
    const actions = read("src/lib/publication/actions.ts");
    const helperStart = actions.indexOf("async function recordPublisherAuditEvent");
    const helperEnd = actions.indexOf("\nexport async function createProjectPublication", helperStart);
    const helper = actions.slice(helperStart, helperEnd);
    const mutationAuditEvents = [
      { name: "createProjectPublication", eventType: "publisher_publication_created" },
      { name: "republishProjectPublication", eventType: "publisher_publication_republished" },
      { name: "rotateProjectPublicationLink", eventType: "publisher_publication_rotated" },
      { name: "revokeProjectPublication", eventType: "publisher_publication_revoked" },
      { name: "addSharedLinkRecipients", eventType: "publisher_recipient_added" },
      { name: "resendSharedLinkRecipientEmail", eventType: "publisher_recipient_resend" },
      { name: "removeSharedLinkRecipient", eventType: "publisher_recipient_removed" },
    ];

    expect(actions).toContain('from "@/lib/auth/account-audit"');
    expect(helper).toContain("recordAccountSecurityEvent({");
    expect(helper).toContain("eventType");
    expect(helper).toContain("userId: context.currentUserId");
    expect(helper).toContain("workspaceId: context.project.workspace_id");
    expect(helper).toContain("metadata:");
    expect(helper).toContain("project_id: context.project.id");

    for (const { name, eventType } of mutationAuditEvents) {
      const start = actions.indexOf(`export async function ${name}`);
      expect(start, `${name} export missing`).toBeGreaterThanOrEqual(0);
      const next = actions.indexOf("\nexport async function ", start + 1);
      const source = actions.slice(start, next === -1 ? actions.length : next);
      expect(source, `${name} must record a Publisher audit event`).toContain("recordPublisherAuditEvent({");
      expect(source, `${name} must use the ${eventType} event type`).toContain(`eventType: "${eventType}"`);
    }

    expect(actions).toContain("removed_by_email_identifier");
    expect(actions).not.toContain("recipient_email:");
  });

  it("keeps recipient email delivery failure warnings free of raw email PII", () => {
    const actions = read("src/lib/publication/actions.ts");
    const warningCalls = actions.match(/console\.warn\([\s\S]*?\);/g) ?? [];
    const recipientDeliveryWarnings = warningCalls.filter((call) => call.includes("recipient email"));

    expect(recipientDeliveryWarnings).toHaveLength(2);
    expect(recipientDeliveryWarnings.join("\n")).not.toMatch(/\bemail:/);
    expect(recipientDeliveryWarnings.join("\n")).toContain("recipientId");
    expect(recipientDeliveryWarnings.join("\n")).toContain("publicationId");
  });

  it("keeps public share metadata generic without resolving the proposal snapshot", () => {
    const sharePage = read("src/app/share/[token]/page.tsx");
    const metadataFn = sharePage.slice(sharePage.indexOf("export async function generateMetadata"));

    expect(sharePage).toContain("protectedPublicationMetadata");
    expect(sharePage).toContain("publicPublicationMetadata");
    expect(metadataFn.indexOf("if (access.passwordRequired)")).toBeGreaterThanOrEqual(0);
    expect(metadataFn).not.toContain("resolveProjectPublicationSnapshotByToken(token)");
    expect(sharePage).toContain('title: "Proposal Review | Archestimator"');
    expect(sharePage).toContain('description: "This proposal is password protected."');
    expect(sharePage).toContain('description: "A client proposal is available for review."');
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
    expect(projectImageRoute).toContain('createProjectImageRouteUrl(result.assetId, "image")');
    expect(projectImageRoute).not.toContain(".getPublicUrl(path)");
    expect(projectActions).toContain('const PROJECT_IMAGE_BUCKET = "project-images"');
    expect(storageCleanup).toContain('const PROJECT_IMAGE_BUCKET = "project-images"');
    expect(publicationImageUrl).toContain('imageUrl.pathname === "/api/projects/images"');
    expect(publicationImageUrl).toContain("isSafeProjectImagePath(path)");
    expect(publicationImageUrl).toContain("if (!imageUrl || LOCAL_BROKERED_IMAGE_ROUTE_PATTERN.test(imageUrl)) return null");
    expect(projectImageRoute).toContain('requestUrl.searchParams.get("assetId")');
    expect(projectImageRoute).toContain("readDurableProjectImageAsset(db, assetId)");
    expect(projectImageRoute).toContain("parseProjectImageStoragePath");
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
    const estimateRowIntents = read("src/lib/estimates/d1-intents/rows.ts");
    const estimateTreeReadRepository = read("src/lib/estimates/estimate-tree-read-repository.ts");
    const estimateActivityHistory = read("src/components/workshop/estimate-sheet/activity-history.tsx");

    expect(estimateActions).toContain("return sanitizeEstimateRowSourceSnapshot({");
    expect(estimateActions).toContain("sourceSnapshotPatch = sanitizeEstimateRowSourceSnapshotForPersistence(mergedSourceSnapshot)");
    expect(estimateRowIntents).toContain("JSON.stringify(sanitizeEstimateRowSourceSnapshot(row.source_snapshot))");
    expect(estimateTreeReadRepository).toContain("normalizeEstimateRowImageUrl(sourceSnapshot.imageUrl)");
    expect(estimateActivityHistory).toContain("normalizeEstimateRowImageUrl(sourceSnapshot.imageUrl)");
  });
});
