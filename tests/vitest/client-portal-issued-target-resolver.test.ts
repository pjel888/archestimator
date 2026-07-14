import { describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result } from "@/lib/cloudflare/d1";
import { resolveClientPortalIssuedTarget } from "@/lib/client-portal/issued-target-resolver";

function database(): D1DatabaseLike {
  return {
    prepare<T>(sql: string) {
      const prepared: D1PreparedStatementLike<T> = {
        bind() { return prepared; },
        async first<R>() {
          if (sql.includes("FROM client_portals")) return { id: "portal_1", name: "Harbor House" } as R;
          return { id: "issue_1", version_label: "Issue 1" } as R;
        },
        async all<R>() {
          return { success: true, results: [{ id: "section_1", section_key: "estimate", kind: "estimate_browser", title: "Estimate", payload_storage: "d1_json", payload_json: JSON.stringify({ estimates: [{ id: "estimate_1", name: "Main estimate", tabs: [{ id: "tab_1", name: "Base", rows: [{ id: "row_1", description: "Issued floor finish", componentAnchor: "component_1", variantLabel: "Standard" }] }] }] }) }] as R[] };
        },
        async run<R>() { return { success: true } as D1Result<R>; },
      };
      return prepared;
    },
  };
}

describe("Client Portal issued discussion targets", () => {
  it("derives immutable row labels from issued payload rather than client text", async () => {
    await expect(resolveClientPortalIssuedTarget({ database: database(), portalId: "portal_1", issueId: "issue_1", target: { kind: "row", publicId: "row_1" } })).resolves.toMatchObject({ label: "Issued floor finish", sectionId: "section_1" });
  });

  it("resolves component anchors and rejects identifiers outside issued content", async () => {
    await expect(resolveClientPortalIssuedTarget({ database: database(), portalId: "portal_1", issueId: "issue_1", target: { kind: "component", publicId: "component_1" } })).resolves.toMatchObject({ kind: "component", label: "Issued floor finish", secondaryLabel: "Main estimate · Standard" });
    await expect(resolveClientPortalIssuedTarget({ database: database(), portalId: "portal_1", issueId: "issue_1", target: { kind: "row", publicId: "spoofed_row" } })).resolves.toBeNull();
  });
});
