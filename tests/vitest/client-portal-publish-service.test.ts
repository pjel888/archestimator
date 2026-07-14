import { describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import { publishClientPortalDraft } from "@/lib/client-portal/publish-service";

type CapturedStatement = { sql: string; values: D1Value[] };

const actor = { kind: "internal" as const, portalGrants: ["manager"] as const, projectId: "project_1", projectRole: "owner" as const, userId: "owner_1", workspaceId: "workspace_1" };

function databaseForPublish(options: { dataScope?: Record<string, unknown>; sectionConfig?: Record<string, unknown>; sectionKind?: string; unstableRows?: boolean } = {}) {
  const statements: CapturedStatement[] = [];
  let rowReadCount = 0;
  const portal = { id: "portal_1", workspace_id: "workspace_1", project_id: "project_1", status: "draft", current_issue_id: null, default_brand_profile_id: null, client_brand_profile_id: null };
  const section = {
    id: "section_1", section_key: "estimates", kind: options.sectionKind ?? "estimate_browser", title: "Estimates", description: null, sort_order: 0, enabled: 1, layout_mode: "wide", data_scope_json: JSON.stringify(options.dataScope ?? {}),
    visibility_policy_json: "{}", field_policy_json: JSON.stringify({ visibleFields: ["description", "row_total"] }), interaction_policy_json: JSON.stringify({ commentable: true }), print_policy_json: JSON.stringify({ downloadable: true }), config_json: JSON.stringify(options.sectionConfig ?? { selectedEstimateIds: ["estimate_1"], defaultGrouping: "area", allowRowDiscussion: true }),
  };
  const database: D1DatabaseLike = {
    prepare(sql: string): D1PreparedStatementLike {
      let values: D1Value[] = [];
      const prepared: D1PreparedStatementLike = {
        bind(...nextValues) { values = nextValues; statements.push({ sql, values }); return prepared; },
        async first<T>() {
          if (sql.includes("FROM client_portals")) return portal as T;
          if (sql.includes("FROM projects")) return { id: "project_1", name: "Makati Tower", project_code: "MK-100", currency_code: "USD" } as T;
          return null as T | null;
        },
        async all<T>() {
          if (sql.includes("FROM client_portal_sections")) return { success: true, results: [section] as T[] } as D1Result<T>;
          if (sql.includes("FROM estimates")) return { success: true, results: [{ id: "estimate_1", name: "Main estimate", sheet_code: "A-100", updated_at: null }] as T[] } as D1Result<T>;
          if (sql.includes("FROM estimate_row_items")) {
            rowReadCount += 1;
            return { success: true, results: [{
              id: "row_1", estimate_id: "estimate_1", node_id: null, description: "Wall finish", designation: "W1", discipline: "Build", material: "Private material", supplier: "Internal supplier", quantity: 2, quantity_base: null, quantity_contingency_amount: null, unit: "m2", unit_cost: 50, misc_cost: 0, contingency_percentage: 0, adjustment_percentage: 0,
              row_revision: options.unstableRows ? rowReadCount : 7,
              source_library_item_id: "11111111-1111-4111-8111-111111111111",
              source_snapshot_json: JSON.stringify({ sourceComponentId: "11111111-1111-4111-8111-111111111111", componentVersionNumber: 3, priceOptionId: "22222222-2222-4222-8222-222222222222", priceOptionLabel: "V2", imageUrl: "/component-thumbnails/wall.jpg", category: "Finishes", supplier: "Safe supplier" }),
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
      return batchStatements.map(() => ({ success: true }));
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

  it("rejects a publish when bounded source reads never stabilize", async () => {
    const { database, statements } = databaseForPublish({ unstableRows: true });

    await expect(publishClientPortalDraft({ actor, database, idempotencyKey: "publish_unstable", portalId: "portal_1" })).rejects.toThrow("changed repeatedly");

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
