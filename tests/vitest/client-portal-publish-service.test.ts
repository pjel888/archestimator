import { describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import { publishClientPortalDraft } from "@/lib/client-portal/publish-service";

type CapturedStatement = { sql: string; values: D1Value[] };

const actor = { kind: "internal" as const, portalGrants: ["manager"] as const, projectId: "project_1", projectRole: "owner" as const, userId: "owner_1", workspaceId: "workspace_1" };

function databaseForPublish(options: {
  artifactHashes?: string[];
  baselineActive?: boolean;
  baselineId?: string;
  dataScope?: Record<string, unknown>;
  issueDraft?: boolean;
  revisionPairs?: Array<readonly [number, number]>;
  sectionConfig?: Record<string, unknown>;
  sectionKind?: string;
  visibleFields?: string[];
} = {}) {
  const statements: CapturedStatement[] = [];
  let artifactReadIndex = 0;
  let sourceReadIndex = 0;
  const revisionPairs = options.revisionPairs ?? [[7, 7]];
  const portal = { id: "portal_1", workspace_id: "workspace_1", project_id: "project_1", status: "draft", current_issue_id: null, default_brand_profile_id: null, client_brand_profile_id: null };
  const section = {
    id: "section_1", section_key: "estimates", kind: options.sectionKind ?? "estimate_browser", title: "Estimates", description: null, sort_order: 0, enabled: 1, layout_mode: "wide", data_scope_json: JSON.stringify(options.dataScope ?? {}),
    visibility_policy_json: "{}", field_policy_json: JSON.stringify({ visibleFields: options.visibleFields ?? ["description", "row_total"] }), interaction_policy_json: JSON.stringify({ commentable: true }), print_policy_json: JSON.stringify({ downloadable: true }), config_json: JSON.stringify(options.sectionConfig ?? { selectedEstimateIds: ["estimate_1"], defaultGrouping: "area", allowRowDiscussion: true }),
  };
  const issueDraft = {
    id: "draft_1", workspace_id: "workspace_1", project_id: "project_1", portal_id: "portal_1", status: "ready", draft_revision: 3,
    issue_kind: "change_order", version_label: "CO-1", based_on_issue_id: null, based_on_baseline_id: options.baselineId ?? null, comparison_issue_id: null,
    revision_note: "Move sink and revise joinery.", assumptions_json: JSON.stringify(["Existing services remain usable"]), exclusions_json: JSON.stringify(["Appliances"]),
    unresolved_items_json: JSON.stringify(["Confirm tapware"]), requested_decision: "formal", decision_policy_json: JSON.stringify({ requiredApprovals: 1 }),
    section_overrides_json: JSON.stringify({ includedSectionIds: ["section_1"] }), created_by: "owner_1", updated_by: "owner_1",
    created_at: "2026-07-26T00:00:00.000Z", updated_at: "2026-07-26T00:00:00.000Z", published_issue_id: null, published_at: null, abandoned_at: null,
  };
  const database: D1DatabaseLike = {
    prepare(sql: string): D1PreparedStatementLike {
      let values: D1Value[] = [];
      const prepared: D1PreparedStatementLike = {
        bind(...nextValues) { values = nextValues; statements.push({ sql, values }); return prepared; },
        async first<T>() {
          if (sql.includes("FROM client_portals")) return portal as T;
          if (options.issueDraft && sql.includes("SELECT draft_revision, status") && sql.includes("FROM client_portal_issue_drafts")) return { draft_revision: 3, status: "ready" } as T;
          if (options.issueDraft && sql.includes("FROM client_portal_issue_drafts")) return issueDraft as T;
          if (sql.includes("FROM client_portal_baselines")) return (options.baselineActive === false ? null : { id: options.baselineId }) as T | null;
          if (sql.includes("SELECT publication_source_revision FROM projects")) {
            const pair = revisionPairs[Math.min(sourceReadIndex, revisionPairs.length - 1)]!;
            sourceReadIndex += 1;
            return { publication_source_revision: pair[1] } as T;
          }
          if (sql.includes("FROM projects")) {
            const pair = revisionPairs[Math.min(sourceReadIndex, revisionPairs.length - 1)]!;
            return { id: "project_1", name: "Makati Tower", project_code: "MK-100", currency_code: "USD", publication_source_revision: pair[0] } as T;
          }
          return null as T | null;
        },
        async all<T>() {
          if (options.issueDraft && sql.includes("FROM client_portal_issue_draft_estimates")) return { success: true, results: [{ estimate_id: "estimate_1", included: 1, sort_order: 0 }] as T[] } as D1Result<T>;
          if (options.issueDraft && sql.includes("FROM client_portal_issue_draft_artifacts")) return { success: true, results: [{ artifact_version_id: "artifact_version_1", purpose: "drawing", commentable: 1, downloadable: 0, decision_relevant: 1, sort_order: 0, display_title: "Revised kitchen drawing", description: null }] as T[] } as D1Result<T>;
          if (options.issueDraft && sql.includes("FROM client_portal_issue_draft_requests")) return { success: true, results: [{ request_id: "request_1", request_version_id: "request_version_1", relationship: "origin", sort_order: 0 }] as T[] } as D1Result<T>;
          if (sql.includes("FROM client_portal_sections")) return { success: true, results: [section] as T[] } as D1Result<T>;
          if (sql.includes("FROM estimates")) return { success: true, results: [{ id: "estimate_1", name: "Main estimate", sheet_code: "A-100", updated_at: null }] as T[] } as D1Result<T>;
          if (options.issueDraft && sql.includes("FROM project_artifact_versions")) {
            const artifactHashes = options.artifactHashes ?? ["c".repeat(64)];
            const contentSha256 = artifactHashes[Math.min(artifactReadIndex, artifactHashes.length - 1)]!;
            artifactReadIndex += 1;
            return { success: true, results: [{ artifact_id: "artifact_1", artifact_version_id: "artifact_version_1", title: "Kitchen drawing", file_name: "kitchen.pdf", content_type: "application/pdf", size_bytes: 1200, content_sha256: contentSha256, description: null }] as T[] } as D1Result<T>;
          }
          if (options.issueDraft && sql.includes("FROM project_change_request_versions")) return { success: true, results: [{ request_id: "request_1", request_code: "CR-0001", request_version_id: "request_version_1", title: "Move sink", content_hash: "d".repeat(64) }] as T[] } as D1Result<T>;
          if (sql.includes("FROM estimate_row_items")) {
            return { success: true, results: [{
              id: "row_1", estimate_id: "estimate_1", node_id: null, description: "Wall finish", designation: "W1", discipline: "Build", material: "Private material", supplier: "Internal supplier", quantity: 2, quantity_base: null, quantity_contingency_amount: null, unit: "m2", unit_cost: 50, misc_cost: 0, contingency_percentage: 0, adjustment_percentage: 0,
              row_revision: 7,
              source_library_item_id: "11111111-1111-4111-8111-111111111111",
              source_snapshot_json: JSON.stringify({ sourceComponentId: "11111111-1111-4111-8111-111111111111", componentVersionNumber: 3, priceOptionId: "22222222-2222-4222-8222-222222222222", priceOptionLabel: "V2", imageUrl: "/component-thumbnails/wall.jpg", category: "Finishes", supplier: "Safe supplier" }),
              metadata_json: "{}",
              link_state: "linked-clean",
            }] as T[] } as D1Result<T>;
          }
          return { success: true, results: [] } as D1Result<T>;
        },
        async run<T>() { return { success: true } as D1Result<T>; },
      };
      return prepared;
    },
    async batch(batchStatements) {
      statements.push(...batchStatements.map(() => ({ sql: "__batch__", values: [] })));
      return batchStatements.map(() => ({ success: true, meta: { changes: 1 } }));
    },
  };
  return { database, statements };
}

describe("client portal publish service", () => {
  it("snapshots only selected project sources through the atomic issue builder", async () => {
    const { database, statements } = databaseForPublish();

    const issue = await publishClientPortalDraft({ actor, database, idempotencyKey: "publish_1", portalId: "portal_1" });

    expect(issue).toMatchObject({ issueNumber: 1, reusedExistingIssue: false, sections: [{ kind: "estimate_browser" }] });
    expect(issue.sections[0]?.payload).toMatchObject({ allowRowDiscussion: true, defaultGrouping: "area", totalRowCount: 1, estimates: [{ totalCost: 100, totalCostMinorUnits: 10_000, tabs: [{ rows: [{ componentVersionNumber: 3, variantLabel: "V2", rowRevision: 7, linkState: "linked-clean", rowTotalMinorUnits: 10_000, imageUrl: "/component-thumbnails/wall.jpg" }] }] }] });
    expect(JSON.stringify(issue.sections[0]?.payload)).toMatch(/cmp_[A-Za-z0-9_-]{20}/);
    expect(JSON.stringify(issue.sections[0]?.payload)).toMatch(/var_[A-Za-z0-9_-]{20}/);
    expect(JSON.stringify(issue.sections[0]?.payload)).not.toContain("Private material");
    expect(JSON.stringify(issue.sections[0]?.payload)).not.toContain("row_1");
    expect(JSON.stringify(issue.sections[0]?.payload)).not.toContain("estimate_1");
    expect(JSON.stringify(issue.sections[0]?.payload)).not.toContain("11111111-1111-4111-8111-111111111111");
    expect(JSON.stringify(issue.sections[0]?.payload)).not.toContain("22222222-2222-4222-8222-222222222222");
    expect(statements.find((statement) => statement.sql.includes("FROM estimates"))?.values).toEqual(["project_1", "estimate_1"]);
    expect(statements.some((statement) => statement.sql.includes("INSERT INTO client_portal_issues"))).toBe(true);
  });

  it("retries a source revision mismatch and publishes the first stable read", async () => {
    const { database, statements } = databaseForPublish({ revisionPairs: [[1, 2], [2, 2]] });

    await expect(publishClientPortalDraft({ actor, database, idempotencyKey: "publish_retry", portalId: "portal_1" })).resolves.toMatchObject({ issueNumber: 1 });

    expect(statements.filter((statement) => statement.sql.includes("SELECT publication_source_revision FROM projects"))).toHaveLength(2);
  });

  it("publishes exact draft relationships while keeping source identities out of the public manifest", async () => {
    const { database, statements } = databaseForPublish({ issueDraft: true });

    await expect(publishClientPortalDraft({ actor, database, draftId: "draft_1", idempotencyKey: "publish_package", portalId: "portal_1" })).resolves.toMatchObject({ issueNumber: 1 });

    expect(statements.find((statement) => statement.sql.includes("FROM project_artifact_versions"))?.values).toContain("artifact_version_1");
    expect(statements.find((statement) => statement.sql.includes("FROM project_change_request_versions"))?.values).toContain("request_version_1");
    expect(statements.some((statement) => statement.sql.includes("INSERT INTO client_portal_issue_estimates"))).toBe(true);
    expect(statements.some((statement) => statement.sql.includes("INSERT INTO client_portal_issue_artifacts"))).toBe(true);
    expect(statements.some((statement) => statement.sql.includes("INSERT INTO client_portal_issue_requests"))).toBe(true);
    expect(statements.some((statement) => statement.sql.includes("INSERT INTO client_portal_issue_source_estimates"))).toBe(true);
    expect(statements.some((statement) => statement.sql.includes("INSERT INTO client_portal_issue_source_rows"))).toBe(true);
    expect(statements.some((statement) => statement.sql.includes("UPDATE client_portal_issue_drafts") && statement.sql.includes("status = 'published'"))).toBe(true);
    const issueInsert = statements.find((statement) => statement.sql.includes("INSERT INTO client_portal_issues"));
    const publicManifest = issueInsert?.values.find((value) => typeof value === "string" && value.includes('"package"'));
    expect(publicManifest).toContain("CR-0001");
    expect(publicManifest).toMatch(/artifact_[a-f0-9]{32}/);
    expect(publicManifest).not.toContain("estimate_1");
    expect(publicManifest).not.toContain("artifact_version_1");
    expect(publicManifest).not.toContain("request_version_1");
  });

  it("returns typed stale failures when package evidence or baseline changes during publish", async () => {
    const artifactChanged = databaseForPublish({ issueDraft: true, artifactHashes: ["c".repeat(64), "e".repeat(64)] });
    await expect(publishClientPortalDraft({ actor, database: artifactChanged.database, draftId: "draft_1", idempotencyKey: "publish_stale_artifact", portalId: "portal_1" }))
      .rejects.toMatchObject({ code: "client_portal_publish_stale" });

    const baselineChanged = databaseForPublish({ issueDraft: true, baselineId: "baseline_1", baselineActive: false });
    await expect(publishClientPortalDraft({ actor, database: baselineChanged.database, draftId: "draft_1", idempotencyKey: "publish_stale_baseline", portalId: "portal_1" }))
      .rejects.toMatchObject({ code: "client_portal_publish_stale" });
  });

  it("rejects a publish when bounded source revision reads never stabilize", async () => {
    const { database, statements } = databaseForPublish({ revisionPairs: [[1, 2], [2, 3], [3, 4]] });

    await expect(publishClientPortalDraft({ actor, database, idempotencyKey: "publish_unstable", portalId: "portal_1" })).rejects.toThrow("changed repeatedly");

    expect(statements.some((statement) => statement.sql.includes("INSERT INTO client_portal_issues"))).toBe(false);
  });

  it("rejects hidden supplier grouping instead of leaking supplier labels", async () => {
    const { database, statements } = databaseForPublish({
      dataScope: { selectedEstimateIds: ["estimate_1"] },
      sectionConfig: { groupBy: "supplier", includeCharts: true },
      sectionKind: "cost_breakdown",
      visibleFields: ["description", "row_total"],
    });

    await expect(publishClientPortalDraft({ actor, database, idempotencyKey: "publish_hidden_supplier", portalId: "portal_1" })).rejects.toThrow("make supplier visible");

    expect(statements.some((statement) => statement.sql.includes("INSERT INTO client_portal_issues"))).toBe(false);
  });

  it("blocks unsupported historical comparison configuration precisely", async () => {
    const { database, statements } = databaseForPublish({
      dataScope: { selectedEstimateIds: ["estimate_1"] },
      sectionConfig: { compareIssueIds: ["issue_previous"], displayMode: "absolute" },
      sectionKind: "estimate_comparison",
    });

    await expect(publishClientPortalDraft({ actor, database, idempotencyKey: "publish_comparison", portalId: "portal_1" })).rejects.toThrow("historical issue comparisons");

    expect(statements.some((statement) => statement.sql.includes("INSERT INTO client_portal_issues"))).toBe(false);
  });
});
