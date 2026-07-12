import { describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import { previewClientPortalAsRole } from "@/lib/client-portal/preview-service";

const manager = {
  kind: "internal" as const,
  portalGrants: ["manager"] as const,
  projectId: "project_1",
  projectRole: "viewer" as const,
  userId: "owner_1",
  workspaceId: "workspace_1",
};

function previewDatabase(): D1DatabaseLike {
  return {
    prepare(sql: string): D1PreparedStatementLike {
      const statement: D1PreparedStatementLike = {
        bind(...values: D1Value[]) { void values; return statement; },
        async first<T>() {
          if (sql.includes("FROM client_portals")) return { current_issue_id: "issue_1", id: "portal_1", project_id: "project_1", status: "live", workspace_id: "workspace_1" } as T;
          if (sql.includes("FROM client_portal_issues")) return { id: "issue_1", issue_number: 1, status: "issued", version_label: "Issue 1" } as T;
          return null as T | null;
        },
        async all<T>() {
          if (sql.includes("FROM client_portal_issue_sections")) {
            return {
              results: [
                { id: "section_visible", kind: "overview", policy_snapshot_json: JSON.stringify({ enabled: true, commentable: false, downloadable: false }), title: "Overview" },
                { id: "section_reviewer", kind: "decision", policy_snapshot_json: JSON.stringify({ enabled: true, commentable: false, downloadable: false, minimumCapability: "decision:submit_review" }), title: "Review" },
              ] as T[],
              success: true,
            } as D1Result<T>;
          }
          return { results: [], success: true } as D1Result<T>;
        },
        async run<T>() { return { success: true } as D1Result<T>; },
      };
      return statement;
    },
  };
}

describe("client portal role preview", () => {
  it("uses the recipient policy to filter the issued preview DTO", async () => {
    const preview = await previewClientPortalAsRole({ actor: manager, database: previewDatabase(), portalId: "portal_1", role: "viewer" });

    expect(preview.issue).toMatchObject({ id: "issue_1", versionLabel: "Issue 1" });
    expect(preview.sections).toEqual([{ id: "section_visible", kind: "overview", title: "Overview" }]);
    expect(preview.capabilities).not.toContain("decision:submit_review");
  });
});
