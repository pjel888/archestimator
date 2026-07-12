import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  checkCloudflareD1AuthRealtimeReadiness,
  writeMarkdown,
} from "../../scripts/check-cloudflare-d1-auth-realtime-readiness";

const source = <T>(value: T, path = "artifact.json") => ({
  source: path,
  present: true,
  value,
});

const missing = <T>(path = "missing.json") => ({
  source: path,
  present: false,
  value: null as T | null,
});

const INVENTORY = {
  counts: {
    appRoutes: 70,
    providerCoupledFiles: 89,
    distinctRpcNames: 80,
  },
  rpcCalls: [
    { name: "submit_beta_feedback", callerFiles: ["src/lib/beta-feedback/actions.ts"] },
    { name: "record_upload_asset", callerFiles: ["src/lib/uploads/upload-records.ts"] },
    { name: "library_overview_summary", callerFiles: ["src/lib/repositories/component-library-repository.ts"] },
    { name: "can_edit_project", callerFiles: ["src/app/workshop/projects/[projectId]/page.tsx"] },
  ],
  sqlInventory: {
    appliedMigrationFiles: 181,
    functionDeclarationMatches: 346,
    rlsPolicyStorageAuthMatches: 684,
  },
};

const CURRENT_PACKAGE = JSON.stringify({
  dependencies: {
    "@supabase/supabase-js": "2.106.2",
  },
});

const CURRENT_WRANGLER = JSON.stringify({
  assets: { binding: "ASSETS" },
  r2_buckets: [{ binding: "ARCH_UPLOADS_R2", bucket_name: "proof" }],
});

const CURRENT_TYPES = `
interface __BaseEnv_CloudflareEnv {
  ARCH_UPLOADS_R2: R2Bucket;
  ASSETS: Fetcher;
}
`;

function currentInputs() {
  return {
    generatedAt: "2026-06-30T00:00:00.000Z",
    inventory: source(INVENTORY, "inventory.json"),
    packageJsonText: CURRENT_PACKAGE,
    wranglerConfigText: CURRENT_WRANGLER,
    generatedTypesText: CURRENT_TYPES,
    sourceFileTextByPath: {
      "src/app/auth/callback/route.ts": "await supabase.auth.exchangeCodeForSession(code);",
      "src/hooks/use-project-presence.ts": "client.channel(topic, { config: { private: true } });",
    },
    authzAccessMatrix: missing("access-matrix.json"),
    rpcRewriteMap: missing("rpc-rewrite.json"),
    rpcTransactionProof: missing("rpc-proof.json"),
    betaFeedbackD1Proof: missing("beta-feedback-proof.json"),
    collaborationInvitationD1Proof: missing("collaboration-invitation-proof.json"),
    closedBetaD1Proof: missing("closed-beta-proof.json"),
    componentLibraryD1Proof: missing("component-library-proof.json"),
    estimateHistoryD1Proof: missing("estimate-history-proof.json"),
    restoreRehearsal: missing("restore.json"),
    performanceProof: missing("performance.json"),
    betterAuthRouteGateProof: missing("better-auth-proof.json"),
    sources: {
      packageJson: "package.json",
      wranglerConfig: "wrangler.jsonc",
      generatedTypes: "cloudflare-env.d.ts",
      sourceRoots: ["src/app", "src/lib"],
    },
  };
}

describe("Cloudflare D1/Auth/Realtime readiness checker", () => {
  it("turns current local D1/Auth/Realtime gaps into explicit blockers", () => {
    const report = checkCloudflareD1AuthRealtimeReadiness(currentInputs());

    expect(report.readiness.databaseInventoryReady).toBe(true);
    expect(report.readiness.localRedesignReadinessReportReady).toBe(true);
    expect(report.manifestSummary.hasSupabaseDependency).toBe(true);
    expect(report.readiness.d1BindingReady).toBe(false);
    expect(report.readiness.betterAuthLocalProofReady).toBe(false);
    expect(report.readiness.authReplacementReady).toBe(false);
    expect(report.readiness.localRpcTransactionMechanicsReady).toBe(false);
    expect(report.readiness.localBetaFeedbackD1SliceReady).toBe(false);
    expect(report.readiness.localCollaborationInvitationD1SliceReady).toBe(false);
    expect(report.readiness.localClosedBetaD1SliceReady).toBe(false);
    expect(report.readiness.localComponentLibraryD1SliceReady).toBe(false);
    expect(report.readiness.localEstimateHistoryD1SliceReady).toBe(false);
    expect(report.readiness.realtimeReplacementReady).toBe(false);
    expect(report.readiness.productionD1AuthRealtimeReady).toBe(false);
    expect(report.sourceSignals.supabaseAuthFiles).toEqual(["src/app/auth/callback/route.ts"]);
    expect(report.sourceSignals.supabaseRealtimeFiles).toEqual(["src/hooks/use-project-presence.ts"]);
    expect(report.sourceSignals.providerBlockingFiles).toEqual([
      "src/app/auth/callback/route.ts",
      "src/hooks/use-project-presence.ts",
    ]);
    expect(report.candidateFirstD1Slices.find((slice) => slice.name === "Upload metadata and scan state")?.rpcNames).toContain(
      "record_upload_asset",
    );
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("D1 database binding configured and typed"),
        expect.stringContaining("Legacy Supabase/Resend runtime references removed"),
        expect.stringContaining("Better Auth D1 production replacement ready"),
        expect.stringContaining("D1 RPC local transaction/rollback/idempotency mechanics ready"),
        expect.stringContaining("D1 beta-feedback local domain proof ready"),
        expect.stringContaining("D1 collaboration-invitation local domain proof ready"),
        expect.stringContaining("D1 closed-beta local domain proof ready"),
        expect.stringContaining("D1 component-library local domain proof ready"),
        expect.stringContaining("D1 estimate-history local domain proof ready"),
        expect.stringContaining("Durable Objects/WebSockets realtime replacement wired"),
      ]),
    );
  });

  it("can prove the local Better Auth D1 route-gate scaffold without marking production auth ready", () => {
    const inputs = currentInputs();
    inputs.packageJsonText = JSON.stringify({
      dependencies: {
        "better-auth": "1.6.22",
      },
    });
    inputs.wranglerConfigText = JSON.stringify({
      d1_databases: [{ binding: "ARCH_DB", database_name: "archestimator-proof", database_id: "proof-id" }],
    });
    inputs.generatedTypesText = `
      interface __BaseEnv_CloudflareEnv {
        ARCH_DB: D1Database;
      }
    `;
    inputs.sourceFileTextByPath = {
      "src/lib/auth/better-auth-cloudflare.ts":
        "import { betterAuth } from 'better-auth'; export const auth = betterAuth({ database: options.d1Database }); export async function requireUserForBetterAuthRouteGate() { return auth.api.getSession({ headers, query: { disableCookieCache: true } }); }",
      "src/lib/auth/request-proxy.ts": "await supabase.auth.getClaims();",
    };
    inputs.betterAuthRouteGateProof = source({
      readiness: {
        localBetterAuthRouteGateProofReady: true,
        routeGateHelperTestCoverageReady: true,
        routeGateD1SessionFixtureReady: true,
        betterAuthD1SchemaSqlGenerated: true,
        betterAuthD1SchemaSqlReviewReady: true,
        productionBetterAuthReady: false,
      },
      scaffoldSummary: {
        actualNextRouteMounted: false,
        routeGateParityRows: 7,
      },
      localOnly: true,
      providerBacked: false,
    }, "better-auth-proof.json");

    const report = checkCloudflareD1AuthRealtimeReadiness(inputs);

    expect(report.readiness.betterAuthLocalProofReady).toBe(true);
    expect(report.readiness.hostedBetterAuthD1SchemaProofReady).toBe(false);
    expect(report.readiness.betterAuthSecretProviderReady).toBe(false);
    expect(report.readiness.providerBackedSessionFixtureReady).toBe(false);
    expect(report.readiness.providerBackedCallbackSessionCutoverReady).toBe(false);
    expect(report.readiness.betterAuthProviderProofReady).toBe(false);
    expect(report.readiness.authReplacementReady).toBe(false);
    expect(report.readiness.productionD1AuthRealtimeReady).toBe(false);
    expect(report.gates.find((gate) => gate.key === "better-auth-local-route-gate-proof")).toMatchObject({
      ready: true,
      source: "better-auth-proof.json",
    });
    expect(report.gates.find((gate) => gate.key === "better-auth-replacement")?.evidence).toContain("productionProof=no");
    expect(report.gates.find((gate) => gate.key === "better-auth-replacement")?.evidence).toContain("providerProof=no");
    expect(report.gates.find((gate) => gate.key === "better-auth-replacement")?.evidence).toContain("remainingSupabaseAuthFiles=1");
  });

  it("keeps invite accept Supabase Auth usage as a Better Auth replacement blocker", () => {
    const inputs = currentInputs();
    inputs.packageJsonText = JSON.stringify({
      dependencies: {
        "better-auth": "1.6.22",
      },
    });
    inputs.wranglerConfigText = JSON.stringify({
      d1_databases: [{ binding: "ARCH_DB", database_name: "archestimator-proof", database_id: "proof-id" }],
    });
    inputs.generatedTypesText = `
      interface __BaseEnv_CloudflareEnv {
        ARCH_DB: D1Database;
      }
    `;
    inputs.sourceFileTextByPath = {
      "src/lib/auth/cloudflare-auth.ts":
        "import { betterAuth } from 'better-auth'; export const auth = betterAuth({ database: d1Adapter(env.ARCH_DB) }); export async function requireUser() { return auth.api.getSession(); }",
      "src/app/invite/[token]/accept/route.ts": "const { data } = await supabase.auth.getUser();",
    };
    inputs.betterAuthRouteGateProof = source({
      readiness: {
        localBetterAuthRouteGateProofReady: true,
        routeGateHelperTestCoverageReady: true,
        routeGateD1SessionFixtureReady: true,
        betterAuthD1SchemaSqlGenerated: true,
        betterAuthD1SchemaSqlReviewReady: true,
        hostedBetterAuthD1SchemaProofReady: true,
        betterAuthSecretProviderReady: true,
        providerBackedSessionFixtureReady: true,
        providerBackedCallbackSessionCutoverReady: true,
        betterAuthProviderProofReady: true,
        productionBetterAuthReady: true,
      },
      scaffoldSummary: {
        actualNextRouteMounted: true,
        routeGateParityRows: 7,
      },
      localOnly: false,
      providerBacked: true,
    }, "better-auth-proof.json");

    const blockedReport = checkCloudflareD1AuthRealtimeReadiness(inputs);
    expect(blockedReport.sourceSignals.supabaseAuthFiles).toEqual(["src/app/invite/[token]/accept/route.ts"]);
    expect(blockedReport.readiness.authReplacementReady).toBe(false);
    expect(blockedReport.gates.find((gate) => gate.key === "better-auth-replacement")?.evidence).toContain(
      "remainingSupabaseAuthFiles=1",
    );

    inputs.sourceFileTextByPath["src/app/invite/[token]/accept/route.ts"] =
      "const currentUser = await getCurrentUserContext(); await acceptInvitationTokenForUser({ user: currentUser });";

    const cleanReport = checkCloudflareD1AuthRealtimeReadiness(inputs);
    expect(cleanReport.sourceSignals.supabaseAuthFiles).toEqual([]);
    expect(cleanReport.readiness.authReplacementReady).toBe(true);
    expect(cleanReport.gates.find((gate) => gate.key === "better-auth-replacement")?.evidence).toContain(
      "remainingSupabaseAuthFiles=0",
    );
  });

  it("does not count lowercase redaction vocabulary as service-role runtime usage", () => {
    const inputs = currentInputs();
    inputs.sourceFileTextByPath = {
      "src/lib/observability/redact.ts":
        "const NEVER_LOG_KEYS = ['service_role_key', 'supabase_service_role_key'];",
      "src/lib/auth/admin.ts":
        "const admin = createSupabaseServiceRoleClient('proof'); const key = process.env.SUPABASE_SERVICE_ROLE_KEY;",
    };

    const report = checkCloudflareD1AuthRealtimeReadiness(inputs);

    expect(report.sourceSignals.supabaseServiceRoleFiles).toEqual(["src/lib/auth/admin.ts"]);
    expect(report.sourceSignals.providerBlockingFiles).toEqual(["src/lib/auth/admin.ts"]);
  });

  it("passes production readiness only when every redesign proof surface is present", () => {
    const completeInputs = currentInputs();
    completeInputs.packageJsonText = JSON.stringify({
      dependencies: {
        "better-auth": "1.0.0",
      },
    });
    completeInputs.wranglerConfigText = JSON.stringify({
      d1_databases: [{ binding: "ARCH_DB", database_name: "archestimator-proof", database_id: "proof-id" }],
      durable_objects: {
        bindings: [{ name: "COLLAB_ROOMS", class_name: "CollaborationRoom" }],
      },
    });
    completeInputs.generatedTypesText = `
      interface __BaseEnv_CloudflareEnv {
        ARCH_DB: D1Database;
        COLLAB_ROOMS: DurableObjectNamespace;
      }
    `;
    completeInputs.sourceFileTextByPath = {
      "src/lib/auth/cloudflare-auth.ts":
        "import { betterAuth } from 'better-auth'; export const auth = betterAuth({ database: d1Adapter(env.ARCH_DB) }); export async function requireUser() { return auth.api.getSession(); }",
      "src/lib/realtime/collaboration-room.ts":
        "export class CollaborationRoom extends DurableObject { fetch() { const pair = new WebSocketPair(); this.ctx.acceptWebSocket(pair[1]); return new Response(null, { status: 101, webSocket: pair[0] }); } webSocketMessage() {} }",
    };
    completeInputs.authzAccessMatrix = source({
      accessPathCount: 140,
      positiveTestCount: 140,
      denialTestCount: 140,
      allProtectedAccessPathsCovered: true,
      crossWorkspaceDenialsReady: true,
      routeActionCoverageReady: true,
    }, "access-matrix.json");
    completeInputs.rpcRewriteMap = source({
      mappedRpcNames: 80,
      totalRpcNames: 80,
      goldenFixturesReady: true,
      transactionProofReady: true,
      rollbackProofReady: true,
      idempotencyProofReady: true,
      localRpcMechanicsProofReady: true,
      productionRpcRewriteReady: true,
    }, "rpc-rewrite.json");
    completeInputs.rpcTransactionProof = source({
      localTransactionMechanicsReady: true,
      localRollbackMechanicsReady: true,
      localIdempotencyMechanicsReady: true,
      localRpcMechanicsProofReady: true,
      productionRpcRewriteReady: false,
      localOnly: true,
      providerBacked: false,
      fixture: {
        coveredPatternCount: 4,
        coveredRpcDomains: ["bulk-delete", "collaboration", "estimate-history", "uploads"],
        rollbackResidueRows: 0,
        duplicateSideEffects: 0,
      },
    }, "rpc-proof.json");
    completeInputs.betaFeedbackD1Proof = source({
      readiness: {
        schemaReady: true,
        appLayerAuthzReady: true,
        localBetaFeedbackD1SliceReady: true,
        productionBetaFeedbackD1Ready: false,
      },
      localOnly: true,
      providerBacked: false,
      fixture: {
        feedbackRows: 1,
        forgedWorkspaceRows: 0,
        mismatchedProjectRows: 0,
        rollbackResidueRows: 0,
        duplicateStatusAuditRows: 0,
      },
    }, "beta-feedback-proof.json");
    completeInputs.collaborationInvitationD1Proof = source({
      affectedRpcNames: [
        "issue_collaboration_invitation_token",
        "record_collaboration_invitation_delivery",
        "resolve_collaboration_invitation",
        "accept_collaboration_invitation",
        "accept_collaboration_invitation_by_id",
        "accept_collaboration_invitation_for_actor",
        "accept_collaboration_invitation_by_id_for_actor",
      ],
      readiness: {
        schemaReady: true,
        tokenIssueReady: true,
        resolveStateReady: true,
        acceptByTokenReady: true,
        acceptByIdReady: true,
        localCollaborationInvitationD1SliceReady: true,
        productionCollaborationInvitationD1Ready: false,
      },
      localOnly: true,
      providerBacked: false,
      fixture: {
        tokenIssueRows: 1,
        activeTokensAfterIssue: 1,
        wrongAccountMembershipRows: 0,
        rollbackResidueRows: 0,
        duplicateAcceptAuditRows: 0,
        replayBlockedAuditRows: 1,
      },
    }, "collaboration-invitation-proof.json");
    completeInputs.closedBetaD1Proof = source({
      affectedRpcNames: [
        "check_closed_beta_access",
        "read_closed_beta_allowlist_queue",
        "create_closed_beta_allowlist_entry",
        "update_closed_beta_allowlist_entry",
      ],
      readiness: {
        schemaReady: true,
        statusContractReady: true,
        appLayerAdminGuardReady: true,
        accessCheckReady: true,
        queueReadReady: true,
        createMutationReady: true,
        updateMutationReady: true,
        localClosedBetaD1SliceReady: true,
        productionClosedBetaD1Ready: false,
      },
      localOnly: true,
      providerBacked: false,
      fixture: {
        adminQueueRows: 3,
        nonAdminQueueRows: 0,
        createRows: 1,
        duplicateCreateRows: 0,
        nonAdminCreateRows: 0,
        rollbackResidueRows: 0,
      },
    }, "closed-beta-proof.json");
    completeInputs.componentLibraryD1Proof = source({
      affectedRpcNames: [
        "delete_library_folder",
        "execute_bulk_archive_library_components",
        "reorder_library_folders",
        "set_cost_library_component_lifecycle_state",
        "update_cost_library_component",
        "upsert_cost_library_component_price_option",
      ],
      readiness: {
        schemaReady: true,
        appLayerEditorGuardReady: true,
        folderDeleteReady: true,
        folderReorderReady: true,
        bulkArchiveReady: true,
        componentUpdateReady: true,
        lifecycleMutationReady: true,
        priceOptionUpsertReady: true,
        localComponentLibraryD1SliceReady: true,
        productionComponentLibraryD1Ready: false,
      },
      localOnly: true,
      providerBacked: false,
      fixture: {
        archivedComponentRows: 2,
        viewerDeleteResidueRows: 0,
        rollbackResidueRows: 0,
        duplicatePriceHistoryRows: 0,
        duplicateBulkArchiveEventRows: 0,
        restoredComponentRows: 5,
      },
    }, "component-library-proof.json");
    completeInputs.estimateHistoryD1Proof = source({
      affectedRpcNames: [
        "archive_estimate_tab_with_history",
        "create_ai_package_library_components_with_history",
        "create_estimate_tab_with_history",
        "create_project_estimate_package_with_history",
        "delete_estimate_tab_with_history",
        "duplicate_estimate_tab_with_history",
        "insert_estimate_subtree_into_estimate_with_history",
        "move_estimate_row_item_with_history",
        "promote_estimate_row_to_library_component",
        "rename_estimate_tab_with_history",
        "reorder_estimate_tabs_with_history",
        "update_estimate_sheet_adjustment_with_history",
      ],
      readiness: {
        schemaReady: true,
        appLayerEditorGuardReady: true,
        estimateTabMutationReady: true,
        subtreeInsertReady: true,
        rowMoveReady: true,
        sheetAdjustmentReady: true,
        packageApplyReady: true,
        promoteToLibraryReady: true,
        rollbackReady: true,
        idempotencyReady: true,
        queryBudgetReady: true,
        restoreFixtureReady: true,
        localEstimateHistoryD1SliceReady: true,
        productionEstimateHistoryD1Ready: false,
      },
      localOnly: true,
      providerBacked: false,
      fixture: {
        viewerMutationResidueRows: 0,
        rollbackResidueRows: 0,
        duplicateSubtreeOperationRows: 1,
        projectPackageCommandRows: 1,
        libraryPackageCommandRows: 1,
        restoredHistoryRows: 11,
      },
    }, "estimate-history-proof.json");
    completeInputs.restoreRehearsal = source({
      schema: "D1-RECOVERY-RECEIPT-v1",
      producerVersion: "1.0.0",
      runId: "recovery-20260712-a1b2c3d4",
      identity: {
        accountHash: "a".repeat(64),
        sourceHash: "b".repeat(64),
        targetHash: "c".repeat(64),
      },
      exportDigest: "export-digest",
      revisions: {
        migration: "0069",
        application: "app-revision",
        authorization: "auth-revision",
        session: "session-revision",
        source: "source-revision",
      },
      milestones: { startedAt: "2020-01-01T00:00:00.000Z", completedAt: "2020-01-01T00:30:00.000Z" },
      rtoSeconds: 1800,
      rpoSeconds: 60,
      checks: {
        schema: true,
        application: true,
        authorization: true,
        session: true,
        corporateIntegrity: true,
        corporateOnlyDenied: true,
      },
      sessionInvalidated: true,
      cleanup: { inventory: ["d1", "worker", "secrets"], absenceReadback: true, complete: true },
      operatorLabel: "operator-hash-prefix",
      failures: [],
      result: "pass",
      d1ExportReady: true,
      d1ImportReady: true,
      restoreRehearsalReady: true,
      destructiveRestoreDocumented: true,
      localOnly: false,
      providerBacked: true,
      schemaIntegrityReady: true,
      applicationIntegrityReady: true,
      authorizationReady: true,
      sessionIntegrityReady: true,
      cleanupReady: true,
      sourceRevision: "0123456789abcdef",
      generatedAt: "2026-07-12T00:00:00.000Z",
      issuedAt: "2020-01-01T00:30:00.000Z",
      expiresAt: "2099-01-01T00:00:00.000Z",
    }, "restore.json");
    completeInputs.performanceProof = source({
      queryCountBudgetsReady: true,
      p95RouteProofReady: true,
      hostedWorkerD1PerformanceReady: true,
      localOnly: false,
      providerBacked: true,
    }, "performance.json");
    completeInputs.betterAuthRouteGateProof = source({
      readiness: {
        localBetterAuthRouteGateProofReady: true,
        routeGateHelperTestCoverageReady: true,
        routeGateD1SessionFixtureReady: true,
        betterAuthD1SchemaSqlGenerated: true,
        betterAuthD1SchemaSqlReviewReady: true,
        hostedBetterAuthD1SchemaProofReady: true,
        betterAuthSecretProviderReady: true,
        providerBackedSessionFixtureReady: true,
        providerBackedCallbackSessionCutoverReady: true,
        betterAuthProviderProofReady: true,
        productionBetterAuthReady: true,
      },
      scaffoldSummary: {
        actualNextRouteMounted: true,
        routeGateParityRows: 7,
      },
      localOnly: false,
      providerBacked: true,
    }, "better-auth-proof.json");

    const report = checkCloudflareD1AuthRealtimeReadiness(completeInputs);

    expect(report.readiness).toMatchObject({
      d1BindingReady: true,
      betterAuthLocalProofReady: true,
      hostedBetterAuthD1SchemaProofReady: true,
      betterAuthSecretProviderReady: true,
      providerBackedSessionFixtureReady: true,
      providerBackedCallbackSessionCutoverReady: true,
      betterAuthProviderProofReady: true,
      authReplacementReady: true,
      appLayerAuthzSpecReady: true,
      localRpcTransactionMechanicsReady: true,
      localCollaborationInvitationD1SliceReady: true,
      localClosedBetaD1SliceReady: true,
      localComponentLibraryD1SliceReady: true,
      localEstimateHistoryD1SliceReady: true,
      rpcRewritePlanReady: true,
      realtimeReplacementReady: true,
      restoreProofReady: true,
      performanceProofReady: true,
      productionD1AuthRealtimeReady: true,
    });
    expect(report.gates.find((gate) => gate.key === "d1-restore-rehearsal")?.evidence).toContain("providerBacked=yes");
    expect(report.gates.find((gate) => gate.key === "d1-performance-proof")?.evidence).toContain("providerBacked=yes");
    expect(report.gates.find((gate) => gate.key === "d1-estimate-history-local-domain-proof")?.evidence).toContain(
      "productionProof=no",
    );
    expect(report.blockers).toEqual([]);
  });

  it("keeps local-only restore mechanics from satisfying the provider recovery gate", () => {
    const inputs = currentInputs();
    inputs.restoreRehearsal = source({
      d1ExportReady: true,
      d1ImportReady: true,
      restoreRehearsalReady: true,
      destructiveRestoreDocumented: true,
      localOnly: true,
      providerBacked: false,
      schemaIntegrityReady: true,
      applicationIntegrityReady: true,
      authorizationReady: true,
      sessionIntegrityReady: true,
      cleanupReady: true,
      sourceRevision: "0123456789abcdef",
      generatedAt: "2026-07-12T00:00:00.000Z",
    }, "local-restore.json");

    const report = checkCloudflareD1AuthRealtimeReadiness(inputs);

    expect(report.gates.find((gate) => gate.key === "d1-restore-rehearsal")).toMatchObject({ ready: false });
    expect(report.readiness.restoreProofReady).toBe(false);
  });

  it("fails local report readiness when the migration inventory is absent", () => {
    const inputs = currentInputs();
    inputs.inventory = missing("inventory-missing.json");

    const report = checkCloudflareD1AuthRealtimeReadiness(inputs);

    expect(report.readiness.databaseInventoryReady).toBe(false);
    expect(report.readiness.localRedesignReadinessReportReady).toBe(false);
    expect(report.gates.find((gate) => gate.key === "database-inventory")).toMatchObject({
      ready: false,
      blocker: "Repeatable Supabase route/provider/RPC/RLS inventory is missing or incomplete.",
    });
  });

  it("writes markdown without copying source or artifact secret-looking values", () => {
    const inputs = currentInputs();
    inputs.authzAccessMatrix = source({
      accessPathCount: 1,
      positiveTestCount: 1,
      denialTestCount: 1,
      allProtectedAccessPathsCovered: false,
      crossWorkspaceDenialsReady: false,
      routeActionCoverageReady: false,
      tokenValue: "do-not-leak-this-token",
    } as unknown as {
      accessPathCount: number;
      positiveTestCount: number;
      denialTestCount: number;
      allProtectedAccessPathsCovered: boolean;
      crossWorkspaceDenialsReady: boolean;
      routeActionCoverageReady: boolean;
    });
    inputs.sourceFileTextByPath["src/lib/auth/cloudflare-auth.ts"] =
      "const secret = 'do-not-leak-source-value';";
    const report = checkCloudflareD1AuthRealtimeReadiness(inputs);
    const dir = mkdtempSync(join(tmpdir(), "cloudflare-d1-auth-realtime-"));
    try {
      const file = join(dir, "readiness.md");
      writeMarkdown(report, file);
      const markdown = readFileSync(file, "utf8");
      expect(markdown).toContain("Cloudflare D1/Auth/Realtime Readiness");
      expect(markdown).toContain("Production D1/Auth/Realtime ready | no");
      expect(markdown).not.toContain("do-not-leak-this-token");
      expect(markdown).not.toContain("do-not-leak-source-value");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
