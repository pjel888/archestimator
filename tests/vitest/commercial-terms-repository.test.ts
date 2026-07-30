import { beforeEach, describe, expect, it, vi } from "vitest";

import type { D1DatabaseLike, D1Value } from "@/lib/cloudflare/d1";

const mocks = vi.hoisted(() => ({
  prepareEstimateMutationIntent: vi.fn(),
  readConcurrentEstimateMutationReceipt: vi.fn(),
  prepareHistoryEventInsert: vi.fn(),
}));

vi.mock("@/lib/estimates/d1-intents/intent-context", () => ({
  prepareEstimateMutationIntent: mocks.prepareEstimateMutationIntent,
  readConcurrentEstimateMutationReceipt: mocks.readConcurrentEstimateMutationReceipt,
  buildProjectPublicationRevisionForEstimate: vi.fn(() => ({ sql: "UPDATE projects SET publication_source_revision = publication_source_revision + 1", values: [] })),
}));
vi.mock("@/lib/estimates/d1-intents/history-events", () => ({
  prepareHistoryEventInsert: mocks.prepareHistoryEventInsert,
}));

import { listAvailableEstimateQuotationOptions, updateRowCommercialTerms, updateRowQuotationLink } from "@/lib/commercial-terms/repository";

describe("commercial terms repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prepareEstimateMutationIntent.mockResolvedValue({
      context: {
        workspaceId: "workspace-1", projectId: "project-1", estimateId: "estimate-1",
        actorUserId: "user-1", commandKind: "estimate.row.commercial.update",
        intentId: "mutation-1", requestFingerprint: "1".repeat(64),
      },
      committedResult: null,
    });
    mocks.readConcurrentEstimateMutationReceipt.mockResolvedValue(null);
    mocks.prepareHistoryEventInsert.mockResolvedValue({
      eventId: "event-1",
      statement: { sql: "INSERT INTO estimate_sheet_events VALUES (?)", values: ["event-1"] },
      outboxStatement: { sql: "INSERT INTO activity_event_outbox VALUES (?)", values: ["outbox-1"] },
    });
  });

  it("returns only active, publishable quotation versions through a minimal projection", async () => {
    let queryIndex = 0;
    const database = {
      prepare() {
        return {
          bind() { return this; },
          async all() {
            queryIndex += 1;
            if (queryIndex === 1) {
              return { results: [
                { version_id: "version-1", title: "Supplier quote", revision_label: "R1", file_name: "quote.pdf" },
                { version_id: "version-2", title: "Pending scan", revision_label: null, file_name: "pending.pdf" },
              ] };
            }
            return { results: [
              {
                version_id: "version-1", version_workspace_id: "workspace-1", version_project_id: "project-1",
                version_artifact_id: "artifact-1", version_content_sha256: "hash-1", artifact_id: "artifact-1",
                artifact_workspace_id: "workspace-1", artifact_project_id: "project-1", artifact_type: "quotation",
                artifact_status: "active", upload_workspace_id: "workspace-1", upload_project_id: "project-1",
                upload_surface: "project-artifact", upload_status: "finalized", upload_purge_state: "active",
                upload_content_type: "application/pdf", upload_checksum_sha256: "hash-1", upload_scan_status: "clean",
                scan_override_actor_user_id: null, scan_override_reason: null, scan_override_expires_at: null,
                scan_override_checksum_sha256: null,
              },
            ] };
          },
        };
      },
    } as unknown as D1DatabaseLike;

    await expect(listAvailableEstimateQuotationOptions({
      database,
      workspaceId: "workspace-1",
      projectId: "project-1",
      now: "2026-07-30T00:00:00.000Z",
    })).resolves.toEqual({
      ok: true,
      value: [{ versionId: "version-1", title: "Supplier quote", revisionLabel: "R1", fileName: "quote.pdf" }],
    });
  });

  it("links an authorized available version and unlinks through terms revision CAS", async () => {
    const statements: Array<{ sql: string; values: D1Value[] }> = [];
    const database = {
      prepare(sql: string) {
        const statement = {
          values: [] as D1Value[],
          bind(...values: D1Value[]) {
            statement.values = values;
            statements.push({ sql, values });
            return statement;
          },
          async first() {
            if (sql.includes("SELECT CASE WHEN EXISTS")) return { allowed: 1 };
            if (sql.includes("SELECT terms.*")) return { row_revision: 7, terms_revision: 4, node_id: "node-1" };
            return null;
          },
          async run() { return { success: true, meta: { changes: 1 } }; },
          async all() {
            return { results: [{
              version_id: "version-1",
              version_workspace_id: "workspace-1",
              version_project_id: "project-1",
              version_artifact_id: "artifact-1",
              version_content_sha256: "hash-1",
              artifact_id: "artifact-1",
              artifact_workspace_id: "workspace-1",
              artifact_project_id: "project-1",
              artifact_type: "quotation",
              artifact_status: "active",
              upload_workspace_id: "workspace-1",
              upload_project_id: "project-1",
              upload_surface: "project-artifact",
              upload_status: "finalized",
              upload_purge_state: "active",
              upload_content_type: "application/pdf",
              upload_checksum_sha256: "hash-1",
              upload_scan_status: "clean",
              scan_override_actor_user_id: null,
              scan_override_reason: null,
              scan_override_expires_at: null,
              scan_override_checksum_sha256: null,
            }] };
          },
        };
        return statement;
      },
      async batch(batchStatements: unknown[]) {
        return batchStatements.map(() => ({ success: true, meta: { changes: 1 } }));
      },
    } as unknown as D1DatabaseLike;
    const baseInput = {
      database,
      workspaceId: "workspace-1",
      projectId: "project-1",
      estimateId: "estimate-1",
      rowId: "row-1",
      actor: { userId: "user-1", role: "member" as const },
      intentId: "mutation-1",
      expectedRowRevision: 7,
      expectedTermsRevision: 4,
      now: "2026-07-30T00:00:00.000Z",
    };

    await expect(updateRowQuotationLink({ ...baseInput, quotationArtifactVersionId: " version-1 " }))
      .resolves.toEqual({ ok: true, value: { termsRevision: 5, rowRevision: 8, eventId: "event-1" } });
    await expect(updateRowQuotationLink({ ...baseInput, quotationArtifactVersionId: null }))
      .resolves.toEqual({ ok: true, value: { termsRevision: 5, rowRevision: 8, eventId: "event-1" } });

    const updates = statements.filter(({ sql }) => sql.includes("UPDATE estimate_row_commercial_terms"));
    expect(updates[0]?.values).toEqual([
      "version-1", "user-1", baseInput.now, "row-1", "workspace-1", "project-1", "estimate-1", 4,
    ]);
    expect(updates[1]?.values[0]).toBeNull();
  });

  it("round-trips normalized quotation requirement, status, and reference", async () => {
    const bindings: D1Value[][] = [];
    const database = {
      prepare(sql: string) {
        return {
          bind(...values: D1Value[]) {
            bindings.push(values);
            return this;
          },
          async first() {
            if (sql.includes("SELECT CASE WHEN EXISTS")) return { allowed: 1 };
            if (sql.includes("SELECT terms.*")) return { row_revision: 7, terms_revision: 4, node_id: "node-1" };
            return null;
          },
          async run() {
            return { success: true, meta: { changes: 1 } };
          },
          async all() {
            return { success: true, results: [] };
          },
        };
      },
      async batch(batchStatements: unknown[]) {
        return batchStatements.map(() => ({ success: true, meta: { changes: 1 } }));
      },
    } as unknown as D1DatabaseLike;

    const result = await updateRowCommercialTerms({
      database,
      workspaceId: "workspace-1",
      projectId: "project-1",
      estimateId: "estimate-1",
      rowId: "row-1",
      actor: { userId: "user-1", role: "member" as const },
      intentId: "mutation-1",
      expectedRowRevision: 7,
      expectedTermsRevision: 4,
      overrideTreatment: "inclusive",
      overrideRateBps: 1200,
      quotationRequirement: "required",
      quotationStatus: "available",
      quotationReference: "  SUP-2026-104  ",
      now: "2026-07-30T00:00:00.000Z",
    });

    expect(result).toEqual({
      ok: true,
      value: {
        termsRevision: 5,
        rowRevision: 8,
        eventId: "event-1",
        quotationRequirement: "required",
        quotationStatus: "available",
        quotationReference: "SUP-2026-104",
      },
    });
    expect(bindings.some((values) => values.includes("SUP-2026-104"))).toBe(true);
  });

  it("rejects unsafe references before querying authorization", async () => {
    let prepareCalls = 0;
    const database = {
      prepare() {
        prepareCalls += 1;
        throw new Error("must not query");
      },
    } as unknown as D1DatabaseLike;

    const result = await updateRowCommercialTerms({
      database,
      workspaceId: "workspace-1",
      projectId: "project-1",
      estimateId: "estimate-1",
      rowId: "row-1",
      actor: { userId: "user-1", role: "member" as const },
      intentId: "mutation-1",
      expectedRowRevision: 1,
      expectedTermsRevision: 1,
      overrideTreatment: "exclusive",
      overrideRateBps: 1200,
      quotationRequirement: "required",
      quotationStatus: "requested",
      quotationReference: "https://private.example/token/secret",
      now: "2026-07-30T00:00:00.000Z",
    });

    expect(result).toEqual({ ok: false, code: "invalid_batch" });
    expect(prepareCalls).toBe(0);
  });
});
