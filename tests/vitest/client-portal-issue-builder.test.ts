import { describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import { buildClientPortalEstimateBrowserPayload } from "@/lib/client-portal/estimate-browser";
import { publishClientPortalIssue } from "@/lib/client-portal/issue-builder";

type CapturedStatement = { sql: string; values: D1Value[] };

function createDatabase(options: { activeRecipientIds?: string[]; existingIssue?: { content_hash: string; id: string; issue_number: number; status: "issued"; version_label: string } } = {}) {
  const statements: CapturedStatement[] = [];
  const portal = { id: "portal_1", workspace_id: "workspace_1", project_id: "project_1", status: "ready", current_issue_id: options.existingIssue?.id ?? null };
  const draftRows = [{
    id: "section_draft_1",
    section_key: "estimate-browser",
    kind: "estimate_browser",
    title: "Estimates",
    description: null,
    sort_order: 0,
    enabled: 1,
    layout_mode: "wide",
    visibility_policy_json: JSON.stringify({}),
    data_scope_json: JSON.stringify({ selectedEstimateIds: ["estimate_1"] }),
    field_policy_json: JSON.stringify({ visibleFields: ["description", "row_total"] }),
    interaction_policy_json: JSON.stringify({ commentable: true }),
    print_policy_json: JSON.stringify({ downloadable: true }),
    config_json: JSON.stringify({ selectedEstimateIds: ["estimate_1"] }),
  }];

  const database: D1DatabaseLike = {
    prepare(sql: string): D1PreparedStatementLike {
      let values: D1Value[] = [];
      const prepared: D1PreparedStatementLike = {
        bind(...nextValues) {
          values = nextValues;
          statements.push({ sql, values });
          return prepared;
        },
        async first<T>() {
          if (sql.includes("FROM client_portals")) return portal as T;
          if (sql.includes("content_hash = ?")) return (options.existingIssue ?? null) as T | null;
          if (sql.includes("ORDER BY issue_number DESC")) return null;
          return null;
        },
        async all<T>() {
          const result: D1Result<T> = sql.includes("FROM client_portal_sections")
            ? { success: true, results: draftRows as T[] }
            : sql.includes("FROM client_portal_recipients")
              ? { success: true, results: (options.activeRecipientIds ?? []).map((id) => ({ id })) as T[] }
              : { success: true, results: [] };
          return result;
        },
        async run<T>() {
          return { success: true } as D1Result<T>;
        },
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

const actor = {
  kind: "internal" as const,
  userId: "user_1",
  workspaceId: "workspace_1",
  projectId: "project_1",
  projectRole: "owner" as const,
  portalGrants: [],
};

const source = {
  totalCost: 1200,
  currencyCode: "USD",
  projectSnapshot: { name: "Kitchen Remodel", code: "AE-100" },
  selectedEstimateIds: ["estimate_1"],
  decisionPolicySnapshot: { requiredApprovals: 1 },
  projectionSchemaVersion: 2,
  semanticHash: "a".repeat(64),
  totalCostMinorUnits: 120_000,
  assumptions: ["Permit allowance excluded"],
  exclusions: ["Sales tax"],
};

describe("client portal issue builder", () => {
  it("builds safe immutable sections and commits issue visibility in one batch", async () => {
    const { database, statements } = createDatabase();
    const issue = await publishClientPortalIssue({
      actor,
      database,
      idempotencyKey: "publish_1",
      portalId: "portal_1",
      source,
      buildSectionPayload: async () => ({ description: "Floor finish", row_total: 1200, unit_cost: 35, margin: 24 }),
    });

    expect(issue).toMatchObject({ issueNumber: 1, reusedExistingIssue: false, sections: [{ kind: "estimate_browser" }] });
    expect(issue.sections[0]?.payload).toEqual({ description: "Floor finish", row_total: 1200 });
    expect(statements.some((statement) => statement.sql.includes("INSERT INTO client_portal_issues"))).toBe(true);
    expect(statements.some((statement) => statement.sql.includes("INSERT INTO client_portal_issue_sections"))).toBe(true);
    expect(statements.some((statement) => statement.sql.includes("UPDATE client_portals SET current_issue_id"))).toBe(true);
    expect(statements.some((statement) => statement.sql === "__batch__")).toBe(true);
    expect(JSON.stringify(statements)).not.toContain("unit_cost");
    expect(JSON.stringify(statements)).not.toContain("margin");
    expect(JSON.stringify(statements)).toContain("policy_snapshot_json");
    expect(JSON.stringify(statements)).toContain("visibleFields");
  });

  it("returns the existing immutable issue for the same content fingerprint", async () => {
    const { database, statements } = createDatabase({
      existingIssue: { id: "issue_existing", issue_number: 4, version_label: "Issue 4", content_hash: "unused", status: "issued" },
    });
    const issue = await publishClientPortalIssue({
      actor,
      database,
      idempotencyKey: "publish_retry",
      portalId: "portal_1",
      source,
      buildSectionPayload: async () => ({ description: "Floor finish", row_total: 1200 }),
    });

    expect(issue).toMatchObject({ issueId: "issue_existing", issueNumber: 4, reusedExistingIssue: true });
    expect(statements.some((statement) => statement.sql === "__batch__")).toBe(false);
  });

  it("computes the issue content hash before random delivery identity", async () => {
    const first = await publishClientPortalIssue({
      actor,
      database: createDatabase().database,
      idempotencyKey: "publish_first",
      portalId: "portal_1",
      source,
      buildSectionPayload: async () => ({ id: `row_${crypto.randomUUID()}`, row_total: 1200 }),
    });
    const second = await publishClientPortalIssue({
      actor,
      database: createDatabase().database,
      idempotencyKey: "publish_second",
      portalId: "portal_1",
      source,
      buildSectionPayload: async () => ({ id: `row_${crypto.randomUUID()}`, row_total: 1200 }),
    });

    expect(second.contentHash).toBe(first.contentHash);
  });

  it("writes issue delivery intents with queue-compatible outbox identifiers", async () => {
    const { database, statements } = createDatabase({ activeRecipientIds: ["recipient_1"] });
    await publishClientPortalIssue({ actor, database, idempotencyKey: "publish_delivery", portalId: "portal_1", source, buildSectionPayload: async () => ({ description: "Floor finish", row_total: 1200 }) });

    const delivery = statements.find((statement) => statement.sql.includes("INSERT INTO client_portal_notification_outbox"));
    expect(delivery?.values[0]).toMatch(/^outbox_[a-zA-Z0-9-]{8,}$/);
    expect(delivery?.values[3]).toBe("recipient_1");
  });

  it("atomically materializes large estimate rows into packed D1 projection inserts", async () => {
    const rows = Array.from({ length: 251 }, (_, index) => ({
      id: `row_${index}`,
      description: `Projected row ${index}`,
      designation: `Area / Group ${index % 5}`,
      discipline: "Build",
      material: "",
      quantity: 1,
      unit: "ea",
      rowTotal: 1,
    }));
    const payload = buildClientPortalEstimateBrowserPayload({
      currencyCode: "USD",
      estimates: [{ id: "estimate_1", name: "Main", sheetCode: "A-100", updatedAt: null, rowCount: rows.length, totalCost: rows.length, rows }],
    });
    const { database, statements } = createDatabase();

    await publishClientPortalIssue({ actor, database, idempotencyKey: "publish_projection", portalId: "portal_1", source, buildSectionPayload: async () => payload });

    const summaryInsert = statements.find((statement) => statement.sql.includes("INSERT INTO client_portal_issue_estimate_projections"));
    const rowInserts = statements.filter((statement) => statement.sql.includes("INSERT INTO client_portal_issue_estimate_rows"));
    expect(summaryInsert?.values[3]).toBe(251);
    expect(rowInserts).toHaveLength(7);
    expect(rowInserts[0]?.values).toContain("row_0");
    expect(rowInserts.at(-1)?.values).toContain("row_250");
  });
});
