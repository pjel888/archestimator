import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  database: null as FakeD1Database | null,
  r2: null as { get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null> } | null,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/cloudflare/d1", () => ({
  getCloudflareD1Database: vi.fn(async () => mocks.database),
}));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn(async () => ({ env: { ARCH_UPLOADS_R2: mocks.r2 } })),
}));

import { buildClientPortalEstimateBrowserPayload, summarizeClientPortalEstimateBrowserPayload } from "@/lib/client-portal/estimate-browser";
import { getClientPortalIssuedEstimateRowsPage, getClientPortalManifest, getClientPortalSection } from "@/lib/client-portal/public-repository";

type QueryRecord = { sql: string; values: unknown[] };

const token = "a".repeat(43);
const portal = {
  id: "portal_public_1",
  workspace_id: "workspace_1",
  project_id: "project_1",
  name: "Client Review",
  status: "live" as const,
  password_hash: null,
  access_credential_version: 1,
  access_policy_json: JSON.stringify({ allowAnonymousView: false }),
  current_issue_id: "issue_public_1",
};
const issue = {
  id: "issue_public_1",
  portal_id: portal.id,
  issue_number: 1,
  version_label: "Issue 1",
  status: "issued" as const,
  issued_at: "2026-07-12T00:00:00.000Z",
  valid_through: null,
  content_hash: "b".repeat(64),
  total_cost: 1200,
  currency_code: "USD",
  manifest_json: JSON.stringify({ project: { name: "Kitchen Remodel", code: "AE-100" } }),
  brand_snapshot_json: JSON.stringify({ mode: "prepared_by" }),
  decision_policy_snapshot_json: JSON.stringify({}),
};

function section(overrides: Record<string, unknown> = {}) {
  return {
    id: "section_public_1",
    section_key: "costs",
    kind: "cost_breakdown",
    title: "Costs",
    sort_order: 0,
    payload_storage: "d1_json" as const,
    payload_json: JSON.stringify({ amount: 1200, margin: 300, unit_cost: 20 }),
    r2_object_key: null,
    payload_hash: "f9e5779e3418d0cdc4de71fc757a6c75a099ed3030b70edcf818ba4d6776835f",
    payload_bytes: 65,
    schema_version: 1,
    layout_mode: "wide",
    policy_snapshot_json: JSON.stringify({
      allowedRecipientIds: [],
      allowedOrganizations: [],
      commentable: true,
      downloadable: false,
      enabled: true,
      layoutMode: "wide",
      minimumCapability: null,
      visibleFields: [],
    }),
    ...overrides,
  };
}

class FakeD1Database {
  readonly queries: QueryRecord[] = [];

  constructor(
    private readonly options: {
      projection?: { row_count: number; summary_json: string };
      projectionRows?: Array<{ row_json: string; sort_order: number }>;
      section?: ReturnType<typeof section>;
      sections?: ReturnType<typeof section>[];
    } = {},
  ) {}

  prepare(sql: string) {
    let values: unknown[] = [];
    return {
      bind: (...nextValues: unknown[]) => {
        values = nextValues;
        this.queries.push({ sql, values });
        return {
          first: async () => {
            if (sql.includes("FROM client_portals")) return portal;
            if (sql.includes("FROM client_portal_issues")) return issue;
            if (sql.includes("FROM client_portal_issue_estimate_projections")) return this.options.projection ?? null;
            if (sql.includes("count(*) AS total FROM client_portal_issue_estimate_rows")) return { total: this.options.projectionRows?.length ?? 0 };
            if (sql.includes("FROM client_portal_issue_sections")) return this.options.section ?? null;
            return null;
          },
          all: async () => ({
            success: true,
            results: sql.includes("FROM client_portal_issue_estimate_rows")
              ? this.options.projectionRows ?? []
              : sql.includes("FROM client_portal_issue_sections") ? this.options.sections ?? [] : [],
          }),
        };
      },
    };
  }
}

const recipient = {
  kind: "recipient" as const,
  recipientId: "recipient_1",
  portalId: portal.id,
  role: "viewer" as const,
  status: "active" as const,
  verificationState: "verified" as const,
  organization: "Client Co",
  isRequiredApprover: false,
  overrides: [],
};

beforeEach(() => {
  mocks.r2 = null;
  mocks.database = null;
  issue.manifest_json = JSON.stringify({ project: { name: "Kitchen Remodel", code: "AE-100" } });
});

describe("client portal public repository", () => {
  it("omits recipient-hidden sections before serializing the issued manifest", async () => {
    const hidden = section({ policy_snapshot_json: JSON.stringify({ enabled: true, allowedRecipientIds: ["recipient_2"], layoutMode: "wide", visibleFields: [] }) });
    const database = new FakeD1Database({ sections: [hidden] });
    mocks.database = database;

    const manifest = await getClientPortalManifest(token, undefined, recipient);

    expect(manifest?.sections).toEqual([]);
    const issuedQueries = database.queries.filter((query) => query.sql.includes("client_portal_issue_sections"));
    expect(issuedQueries).toHaveLength(1);
    expect(database.queries.map((query) => query.sql).join("\n")).not.toContain("client_portal_sections");
    expect(database.queries.map((query) => query.sql).join("\n")).not.toContain("FROM projects");
  });

  it("allowlists public issue-package fields without exposing source or storage identities", async () => {
    issue.manifest_json = JSON.stringify({
      project: { name: "Kitchen Remodel", code: "AE-100" },
      package: {
        issueKind: "change_order",
        revisionNote: "Move sink and revise joinery.",
        requestedDecision: "formal",
        unresolvedItems: ["Confirm tapware"],
        estimates: [{ id: `est_${"a".repeat(20)}`, sortOrder: 0, sourceEstimateId: "estimate_private_1" }],
        artifacts: [{ id: `artifact_${"b".repeat(32)}`, purpose: "drawing", title: "Revised drawing", description: null, contentType: "application/pdf", sizeBytes: 1200, commentable: true, downloadable: false, decisionRelevant: true, sortOrder: 0, artifactVersionId: "artifact_version_private_1", storageKey: "private/path.pdf" }],
        requests: [{ code: "CR-0001", title: "Move sink", relationship: "origin", sortOrder: 0, requestVersionId: "request_version_private_1" }],
        sourceEstimateId: "estimate_private_1",
      },
    });
    const database = new FakeD1Database({ sections: [] });
    mocks.database = database;

    const manifest = await getClientPortalManifest(token, undefined, recipient);

    expect(manifest?.package).toEqual({
      issueKind: "change_order",
      revisionNote: "Move sink and revise joinery.",
      requestedDecision: "formal",
      unresolvedItems: ["Confirm tapware"],
      estimates: [{ id: `est_${"a".repeat(20)}`, sortOrder: 0 }],
      artifacts: [{ id: `artifact_${"b".repeat(32)}`, purpose: "drawing", title: "Revised drawing", description: null, contentType: "application/pdf", sizeBytes: 1200, commentable: true, downloadable: false, decisionRelevant: true, sortOrder: 0 }],
      requests: [{ code: "CR-0001", title: "Move sink", relationship: "origin", sortOrder: 0 }],
    });
    expect(JSON.stringify(manifest)).not.toContain("estimate_private_1");
    expect(JSON.stringify(manifest)).not.toContain("artifact_version_private_1");
    expect(JSON.stringify(manifest)).not.toContain("request_version_private_1");
    expect(JSON.stringify(manifest)).not.toContain("private/path.pdf");
  });

  it("reconstructs public change sets and fails closed on private comparison identities", async () => {
    const safeChangeSet = {
      structured: {
        schemaVersion: 1,
        comparison: { capability: "full", limitationReason: null },
        currencyCode: "PHP",
        summary: {
          previousTotalMinorUnits: 10_000,
          currentTotalMinorUnits: 12_500,
          totalDeltaMinorUnits: 2_500,
          addedRows: 1,
          removedRows: 0,
          changedRows: 0,
          movedRows: 0,
          addedArtifacts: 0,
          removedArtifacts: 0,
          changedArtifacts: 0,
          addressedRequests: ["CR-0001"],
        },
        estimateChanges: [{
          publicId: `est_${"c".repeat(20)}`,
          publicLabel: "Kitchen estimate",
          type: "changed",
          changeTypes: ["estimate_total_changed"],
          previousTotalMinorUnits: 10_000,
          currentTotalMinorUnits: 12_500,
          totalDeltaMinorUnits: 2_500,
          treeChanges: [],
          rowChanges: [{
            type: "added",
            publicId: `row_${"d".repeat(32)}`,
            publicLabel: "Sink relocation",
            matchMethod: "none",
            confidence: "none",
            changeTypes: ["row_total_changed"],
            before: null,
            after: {
              publicId: `row_${"d".repeat(32)}`,
              publicLabel: "Sink relocation",
              description: "Relocate sink",
              designation: "",
              discipline: "Plumbing",
              material: "",
              quantityScaled: 1_000_000,
              quantityScale: 1_000_000,
              unit: "item",
              rowTotalMinorUnits: 2_500,
              scopeStatus: "included",
            },
            deltaMinorUnits: 2_500,
          }],
        }],
        artifactChanges: [],
        requestChanges: [{
          type: "added",
          publicId: `request_${"e".repeat(32)}`,
          publicCode: "CR-0001",
          publicTitle: "Move sink",
          changeTypes: ["request_added"],
          beforeVersion: null,
          afterVersion: 1,
        }],
        narrativeChanges: {
          assumptionChanges: [],
          exclusionChanges: [],
          unresolvedItemChanges: [],
          requestedDecisionChange: null,
          validityChange: null,
        },
      },
      deterministicSummary: "Issue 2 increases the issued total by PHP 25.00.",
      finalNarrative: "Sink relocation and joinery revisions are ready for review.",
      narrativeSource: "human",
    };
    issue.manifest_json = JSON.stringify({ project: { name: "Kitchen Remodel", code: "AE-100" }, changeSet: safeChangeSet });
    mocks.database = new FakeD1Database({ sections: [] });

    const manifest = await getClientPortalManifest(token, undefined, recipient);

    expect(manifest?.changeSet).toEqual(safeChangeSet);
    expect(JSON.stringify(manifest)).not.toContain("issue_private_1");
    expect(JSON.stringify(manifest)).not.toContain("baseline_private_1");

    issue.manifest_json = JSON.stringify({
      project: { name: "Kitchen Remodel", code: "AE-100" },
      changeSet: {
        ...safeChangeSet,
        structured: {
          ...safeChangeSet.structured,
          comparison: { ...safeChangeSet.structured.comparison, issueId: "issue_private_1", baselineId: "baseline_private_1" },
        },
      },
    });

    const rejected = await getClientPortalManifest(token, undefined, recipient);

    expect(rejected?.changeSet).toBeNull();
  });

  it("reads and re-sanitizes the immutable D1 payload without exposing controlled fields", async () => {
    const database = new FakeD1Database({ section: section() });
    mocks.database = database;

    const result = await getClientPortalSection(token, "section_public_1", undefined, recipient);

    expect(result?.section.payload).toEqual({ amount: 1200 });
    expect(database.queries.map((query) => query.sql).join("\n")).not.toContain("client_portal_sections");
  });

  it("loads R2-backed issued payloads lazily through the immutable object key", async () => {
    const database = new FakeD1Database({
      section: section({ payload_storage: "r2_object", payload_json: null, r2_object_key: "client-portals/issue_public_1/costs.json" }),
    });
    mocks.database = database;
    const get = vi.fn(async () => ({ arrayBuffer: async () => new TextEncoder().encode(JSON.stringify({ amount: 1200, margin: 300 })).buffer }));
    mocks.r2 = { get };

    const result = await getClientPortalSection(token, "section_public_1", undefined, recipient);

    expect(result?.section.payload).toEqual({ amount: 1200 });
    expect(get).toHaveBeenCalledWith("client-portals/issue_public_1/costs.json");
  });

  it("reads large estimate summaries and pages from the immutable D1 projection without loading section JSON", async () => {
    const payload = buildClientPortalEstimateBrowserPayload({
      currencyCode: "USD",
      estimates: [{
        id: "estimate_1", name: "Main", sheetCode: "A-100", updatedAt: null, rowCount: 2, totalCost: 30,
        rows: [
          { id: "row_1", description: "Wall", designation: "Shell / Walls", discipline: "Build", material: "", quantity: 1, unit: "ea", rowTotal: 10 },
          { id: "row_2", description: "Floor", designation: "Shell / Floors", discipline: "Build", material: "", quantity: 2, unit: "ea", rowTotal: 20 },
        ],
      }],
    });
    const summary = summarizeClientPortalEstimateBrowserPayload(payload);
    const estimateSection = section({
      kind: "estimate_browser",
      payload_bytes: 300_000,
      payload_hash: "a".repeat(64),
      payload_json: JSON.stringify(payload),
    });
    const database = new FakeD1Database({
      section: estimateSection,
      projection: { row_count: 2, summary_json: JSON.stringify(summary) },
      projectionRows: payload.estimates[0]!.tabs[0]!.rows.map((row, sort_order) => ({ row_json: JSON.stringify(row), sort_order })),
    });
    mocks.database = database;

    const sectionResult = await getClientPortalSection(token, "section_public_1", undefined, recipient);
    const page = await getClientPortalIssuedEstimateRowsPage(token, "section_public_1", { estimateId: "estimate_1", tabId: "estimate_1", limit: 1 }, undefined, recipient);

    expect(sectionResult?.section.payload).toMatchObject({ paging: { mode: "server" }, estimates: [{ tabs: [{ rows: [] }] }] });
    expect(page).toMatchObject({ hasMore: true, rows: [{ id: "row_1" }], totalRows: 2 });
    expect(database.queries.some((query) => query.sql.startsWith("SELECT payload_json FROM"))).toBe(false);
    expect(database.queries.some((query) => query.sql.includes("client_portal_issue_estimate_rows") && query.sql.includes("LIMIT ?"))).toBe(true);
  });
});
