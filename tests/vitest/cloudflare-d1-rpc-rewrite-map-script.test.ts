import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCloudflareD1RpcRewriteMap,
  writeMarkdown,
} from "../../scripts/generate-cloudflare-d1-rpc-rewrite-map";

const rpcName = (...parts: string[]) => parts.join("_");

const source = <T>(value: T, path = "inventory.json") => ({
  source: path,
  present: true,
  value,
});

describe("Cloudflare D1 RPC rewrite map", () => {
  it("maps inventory RPCs to D1 rewrite strategies while keeping proof gates conservative", () => {
    const report = buildCloudflareD1RpcRewriteMap({
      generatedAt: "2026-06-30T00:00:00.000Z",
      inventory: source({
        rpcCalls: [
          { name: "can_edit_project", callerFiles: ["src/app/workshop/projects/[projectId]/page.tsx"] },
          { name: "insert_estimate_row_item_with_history", callerFiles: ["src/lib/estimates/actions.ts"] },
          { name: "record_upload_asset", callerFiles: ["src/lib/uploads/upload-records.ts"] },
        ],
      }),
      testFileTextByPath: {
        "tests/vitest/project-activity-page/route-contract.test.ts":
          'expect(source).toContain(\'rpc("can_edit_project"\');',
        "tests/vitest/estimate-row-mutation.test.ts":
          'it("keeps insert_estimate_row_item_with_history atomic with history and rolls back partial failure using correlation id idempotency", () => {});',
        "tests/vitest/upload-scan-rpc-provider-proof-script.test.ts":
          'it("exercises record_upload_asset checksum idempotency", () => {});',
      },
      sources: {
        testRoots: ["tests/vitest"],
      },
    });

    expect(report.mode).toBe("cloudflare-d1-rpc-rewrite-map");
    expect(report.totalRpcNames).toBe(3);
    expect(report.mappedRpcNames).toBe(3);
    expect(report.goldenFixtureCount).toBe(3);
    expect(report.goldenFixturesReady).toBe(true);
    expect(report.transactionSensitiveRpcCount).toBe(2);
    expect(report.idempotencySensitiveRpcCount).toBe(2);
    expect(report.transactionProofReady).toBe(false);
    expect(report.rollbackProofReady).toBe(false);
    expect(report.idempotencyProofReady).toBe(true);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("transaction-sensitive RPCs lack transaction proof references"),
        expect.stringContaining("transaction-sensitive RPCs lack rollback/fail-closed proof references"),
      ]),
    );
    expect(report.rows.find((row) => row.rpcName === "can_edit_project")).toMatchObject({
      domain: "authorization",
      d1RewriteStrategy: expect.stringContaining("shared D1 app-layer authorization helpers"),
    });
    expect(report.rows.find((row) => row.rpcName === "insert_estimate_row_item_with_history")?.transactionNeeds).toEqual(
      expect.arrayContaining([
        expect.stringContaining("D1 transaction"),
        expect.stringContaining("Audit/history"),
      ]),
    );
  });

  it("passes rewrite proof readiness only when every mapped RPC has required evidence", () => {
    const report = buildCloudflareD1RpcRewriteMap({
      inventory: source({
        rpcCalls: [
          { name: "execute_bulk_delete_projects", callerFiles: ["src/lib/projects/actions.ts"] },
        ],
      }),
      testFileTextByPath: {
        "tests/vitest/projects-actions-authz.test.ts":
          'it("execute_bulk_delete_projects uses a transaction, rolls back partial failure, and is idempotent for duplicate retry correlation ids", () => {});',
      },
    });

    expect(report.mappedRpcNames).toBe(1);
    expect(report.goldenFixturesReady).toBe(true);
    expect(report.transactionProofReady).toBe(true);
    expect(report.rollbackProofReady).toBe(true);
    expect(report.idempotencyProofReady).toBe(true);
    expect(report.blockers).toEqual([]);
  });

  it("surfaces local transaction mechanics proof without opening the production RPC gate", () => {
    const report = buildCloudflareD1RpcRewriteMap({
      inventory: source({
        rpcCalls: [
          { name: "record_upload_asset", callerFiles: ["src/lib/uploads/upload-records.ts"] },
        ],
      }),
      rpcTransactionProof: source({
        localTransactionMechanicsReady: true,
        localRollbackMechanicsReady: true,
        localIdempotencyMechanicsReady: true,
        localRpcMechanicsProofReady: true,
        productionRpcRewriteReady: false,
        localOnly: true,
        providerBacked: false,
      }, "rpc-proof.json"),
      testFileTextByPath: {
        "tests/vitest/upload-scan-rpc-provider-proof-script.test.ts":
          'expect(source).toContain(\'rpc("record_upload_asset"\');',
      },
    });

    expect(report.sources.rpcTransactionProof).toBe("rpc-proof.json");
    expect(report.localTransactionMechanicsReady).toBe(true);
    expect(report.localRollbackMechanicsReady).toBe(true);
    expect(report.localIdempotencyMechanicsReady).toBe(true);
    expect(report.localRpcMechanicsProofReady).toBe(true);
    expect(report.idempotencyProofReady).toBe(false);
    expect(report.productionRpcRewriteReady).toBe(false);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("idempotency-sensitive RPCs lack idempotency proof references"),
      ]),
    );
  });

  it("keeps stable read-model RPCs out of write proof gates", () => {
    const rpcNames = [
      rpcName("authorize", "recipient", "publication", "for", "current", "user"),
      rpcName("estimate", "node", "route", "context"),
      rpcName("get", "estimate", "activity", "retention", "metrics"),
      rpcName("library", "overview", "summary"),
      rpcName("list", "pending", "collaboration", "invitations"),
      rpcName("preview", "bulk", "delete", "projects"),
      rpcName("project", "estimate", "list", "summaries"),
      rpcName("project", "estimate", "list", "summaries", "for", "estimates"),
      rpcName("read", "project", "collaboration", "audit", "events"),
    ];
    const report = buildCloudflareD1RpcRewriteMap({
      inventory: source({
        rpcCalls: rpcNames.map((name) => ({
          name,
          callerFiles: [`src/lib/${name}.ts`],
        })),
      }),
      testFileTextByPath: Object.fromEntries(
        rpcNames.map((name) => [
          `tests/vitest/${name}.test.ts`,
          `expect(source).toContain('rpc("${name}"');`,
        ]),
      ),
    });

    expect(report.goldenFixturesReady).toBe(true);
    expect(report.transactionSensitiveRpcCount).toBe(0);
    expect(report.idempotencySensitiveRpcCount).toBe(0);
    expect(report.transactionProofReady).toBe(true);
    expect(report.rollbackProofReady).toBe(true);
    expect(report.idempotencyProofReady).toBe(true);
    expect(report.blockers).toEqual([]);
    expect(report.rows).toEqual(
      expect.arrayContaining(
        rpcNames.map((rpcName) => expect.objectContaining({
          rpcName,
          status: "mapped",
          transactionNeeds: [],
          idempotencyNeeds: [],
        })),
      ),
    );
  });

  it("keeps collaboration invitation resolution on the mutating proof path", () => {
    const resolvingInvitationRpc = rpcName("resolve", "collaboration", "invitation");
    const report = buildCloudflareD1RpcRewriteMap({
      inventory: source({
        rpcCalls: [
          { name: resolvingInvitationRpc, callerFiles: ["src/lib/collaboration/invitations.ts"] },
        ],
      }),
      testFileTextByPath: {
        "tests/vitest/project-invite-entry-route.test.ts":
          `expect(source).toContain('rpc("${resolvingInvitationRpc}"');`,
      },
    });

    expect(report.transactionSensitiveRpcCount).toBe(1);
    expect(report.idempotencySensitiveRpcCount).toBe(1);
    expect(report.rows[0]).toMatchObject({
      rpcName: resolvingInvitationRpc,
      status: "missing-transaction-proof",
      transactionNeeds: expect.arrayContaining([expect.stringContaining("D1 transaction")]),
      idempotencyNeeds: expect.arrayContaining([expect.stringContaining("Token/recipient uniqueness")]),
    });
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("transaction-sensitive RPCs lack transaction proof references"),
      ]),
    );
  });

  it("applies the local collaboration-invitation proof to affected RPC evidence refs", () => {
    const invitationRpcNames = [
      "issue_collaboration_invitation_token",
      "record_collaboration_invitation_delivery",
      "resolve_collaboration_invitation",
      "accept_collaboration_invitation",
      "accept_collaboration_invitation_by_id",
    ];
    const report = buildCloudflareD1RpcRewriteMap({
      inventory: source({
        rpcCalls: invitationRpcNames.map((name) => ({
          name,
          callerFiles: [`src/lib/collaboration/${name}.ts`],
        })),
      }),
      collaborationInvitationProof: source({
        affectedRpcNames: invitationRpcNames,
        readiness: {
          localCollaborationInvitationD1SliceReady: true,
          productionCollaborationInvitationD1Ready: false,
        },
        localOnly: true,
        providerBacked: false,
      }, "collaboration-invitation-proof.json"),
      testFileTextByPath: {},
    });

    expect(report.sources.collaborationInvitationProof).toBe("collaboration-invitation-proof.json");
    expect(report.goldenFixturesReady).toBe(true);
    expect(report.transactionProofReady).toBe(true);
    expect(report.rollbackProofReady).toBe(true);
    expect(report.idempotencyProofReady).toBe(true);
    expect(report.productionRpcRewriteReady).toBe(false);
    expect(report.rows).toEqual(
      expect.arrayContaining(
        invitationRpcNames.map((rpcName) => expect.objectContaining({
          rpcName,
          status: "mapped",
          goldenFixtureRefs: ["collaboration-invitation-proof.json"],
          transactionProofRefs: ["collaboration-invitation-proof.json"],
          rollbackProofRefs: ["collaboration-invitation-proof.json"],
          idempotencyProofRefs: ["collaboration-invitation-proof.json"],
        })),
      ),
    );
  });

  it("applies the local closed-beta proof to affected RPC evidence refs", () => {
    const closedBetaRpcNames = [
      "check_closed_beta_access",
      "read_closed_beta_allowlist_queue",
      "create_closed_beta_allowlist_entry",
      "update_closed_beta_allowlist_entry",
    ];
    const report = buildCloudflareD1RpcRewriteMap({
      inventory: source({
        rpcCalls: closedBetaRpcNames.map((name) => ({
          name,
          callerFiles: [`src/lib/auth/${name}.ts`],
        })),
      }),
      closedBetaProof: source({
        affectedRpcNames: closedBetaRpcNames,
        readiness: {
          localClosedBetaD1SliceReady: true,
          productionClosedBetaD1Ready: false,
        },
        localOnly: true,
        providerBacked: false,
      }, "closed-beta-proof.json"),
      testFileTextByPath: {},
    });

    expect(report.sources.closedBetaProof).toBe("closed-beta-proof.json");
    expect(report.rows.find((row) => row.rpcName === "create_closed_beta_allowlist_entry")).toMatchObject({
      status: "mapped",
      goldenFixtureRefs: ["closed-beta-proof.json"],
      transactionProofRefs: ["closed-beta-proof.json"],
      rollbackProofRefs: ["closed-beta-proof.json"],
    });
    expect(report.rows.find((row) => row.rpcName === "update_closed_beta_allowlist_entry")).toMatchObject({
      status: "mapped",
      goldenFixtureRefs: ["closed-beta-proof.json"],
      transactionProofRefs: ["closed-beta-proof.json"],
      rollbackProofRefs: ["closed-beta-proof.json"],
    });
    expect(report.transactionProofReady).toBe(true);
    expect(report.rollbackProofReady).toBe(true);
    expect(report.idempotencyProofReady).toBe(true);
    expect(report.productionRpcRewriteReady).toBe(false);
  });

  it("applies the local component-library proof to affected RPC evidence refs", () => {
    const componentLibraryRpcNames = [
      "delete_library_folder",
      "execute_bulk_archive_library_components",
      "reorder_library_folders",
      "set_cost_library_component_lifecycle_state",
      "update_cost_library_component",
      "upsert_cost_library_component_price_option",
    ];
    const report = buildCloudflareD1RpcRewriteMap({
      inventory: source({
        rpcCalls: componentLibraryRpcNames.map((name) => ({
          name,
          callerFiles: [`src/lib/component-library/${name}.ts`],
        })),
      }),
      componentLibraryProof: source({
        affectedRpcNames: componentLibraryRpcNames,
        readiness: {
          localComponentLibraryD1SliceReady: true,
          productionComponentLibraryD1Ready: false,
        },
        localOnly: true,
        providerBacked: false,
      }, "component-library-proof.json"),
      testFileTextByPath: {},
    });

    expect(report.sources.componentLibraryProof).toBe("component-library-proof.json");
    expect(report.rows).toEqual(
      expect.arrayContaining(
        componentLibraryRpcNames.map((rpcName) => expect.objectContaining({
          rpcName,
          status: "mapped",
          goldenFixtureRefs: ["component-library-proof.json"],
          transactionProofRefs: ["component-library-proof.json"],
          rollbackProofRefs: ["component-library-proof.json"],
          idempotencyProofRefs: ["component-library-proof.json"],
        })),
      ),
    );
    expect(report.transactionProofReady).toBe(true);
    expect(report.rollbackProofReady).toBe(true);
    expect(report.idempotencyProofReady).toBe(true);
    expect(report.productionRpcRewriteReady).toBe(false);
  });

  it("applies the local estimate-history proof to affected RPC evidence refs", () => {
    const estimateHistoryRpcNames = [
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
    ];
    const report = buildCloudflareD1RpcRewriteMap({
      inventory: source({
        rpcCalls: estimateHistoryRpcNames.map((name) => ({
          name,
          callerFiles: [`src/lib/estimates/${name}.ts`],
        })),
      }),
      estimateHistoryProof: source({
        affectedRpcNames: estimateHistoryRpcNames,
        readiness: {
          localEstimateHistoryD1SliceReady: true,
          productionEstimateHistoryD1Ready: false,
        },
        localOnly: true,
        providerBacked: false,
      }, "estimate-history-proof.json"),
      testFileTextByPath: {},
    });

    expect(report.sources.estimateHistoryProof).toBe("estimate-history-proof.json");
    expect(report.rows).toEqual(
      expect.arrayContaining(
        estimateHistoryRpcNames.map((rpcName) => expect.objectContaining({
          rpcName,
          status: "mapped",
          goldenFixtureRefs: ["estimate-history-proof.json"],
          transactionProofRefs: ["estimate-history-proof.json"],
          rollbackProofRefs: ["estimate-history-proof.json"],
          idempotencyProofRefs: ["estimate-history-proof.json"],
        })),
      ),
    );
    expect(report.transactionProofReady).toBe(true);
    expect(report.rollbackProofReady).toBe(true);
    expect(report.idempotencyProofReady).toBe(true);
    expect(report.productionRpcRewriteReady).toBe(false);
  });

  it("writes markdown without copying secret-looking source values", () => {
    const report = buildCloudflareD1RpcRewriteMap({
      generatedAt: "2026-06-30T00:00:00.000Z",
      inventory: source({
        rpcCalls: [
          { name: "record_upload_asset", callerFiles: ["src/lib/uploads/upload-records.ts"] },
        ],
      }),
      testFileTextByPath: {
        "tests/vitest/upload-scan-rpc-provider-proof-script.test.ts":
          'const token = "do-not-leak-test-value"; expect(script).toContain(\'rpc("record_upload_asset"\');',
      },
    });
    const dir = mkdtempSync(join(tmpdir(), "cloudflare-d1-rpc-map-"));
    try {
      const file = join(dir, "rpc-map.md");
      writeMarkdown(report, file);
      const markdown = readFileSync(file, "utf8");
      expect(markdown).toContain("Cloudflare D1 RPC Rewrite Map");
      expect(markdown).toContain("record_upload_asset");
      expect(markdown).not.toContain("do-not-leak-test-value");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
