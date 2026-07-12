import { describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import { buildClientPortalIssuedBrandSnapshot, upsertClientPortalBrandProfile } from "@/lib/client-portal/brand-service";

type CapturedStatement = { sql: string; values: D1Value[] };

function createDatabase({ assetStatus = "active" }: { assetStatus?: "active" | "deleted" | "quarantined" } = {}) {
  const statements: CapturedStatement[] = [];
  const database: D1DatabaseLike = {
    prepare(sql: string): D1PreparedStatementLike {
      let values: D1Value[] = [];
      const prepared: D1PreparedStatementLike = {
        bind(...nextValues) { values = nextValues; statements.push({ sql, values }); return prepared; },
        async first<T>() {
          if (sql.includes("FROM client_portals")) return { id: "portal_1", workspace_id: "workspace_1", project_id: "project_1", status: "draft", default_brand_profile_id: "brand_1", client_brand_profile_id: null } as T;
          if (sql.includes("FROM client_portal_assets")) return { id: "asset_owner", workspace_id: "workspace_1", project_id: "project_1", asset_kind: "owner_logo", storage_key: "workspace_1/private/logo.webp", content_type: "image/webp", byte_size: 1200, width: 100, height: 100, status: assetStatus } as T;
          if (sql.includes("FROM client_portal_brand_profiles WHERE id = ? AND workspace_id")) return { id: "brand_1", workspace_id: "workspace_1", profile_kind: "portal", client_key: null, name: "Northstar", owner_logo_asset_id: "asset_owner", client_logo_asset_id: null, co_branding_mode: "prepared_by_for", theme_json: '{"accentColor":"#1E40AF","backgroundColor":"#FFFFFF","textColor":"#111827"}', contact_json: '{"email":"hello@example.test"}', attribution_mode: "optional" } as T;
          return null;
        },
        async all<T>() { return { success: true, results: [] } as D1Result<T>; },
        async run<T>() { return { success: true } as D1Result<T>; },
      };
      return prepared;
    },
  };
  return { database, statements };
}

const actor = { kind: "internal" as const, userId: "owner_1", workspaceId: "workspace_1", projectId: "project_1", projectRole: "viewer" as const, portalGrants: ["manager"] as const };

describe("client portal brand profiles", () => {
  it("publishes only opaque logo IDs into an issued snapshot", async () => {
    const { database } = createDatabase();
    const snapshot = await buildClientPortalIssuedBrandSnapshot({ database, portalId: "portal_1" });
    expect(snapshot).toMatchObject({ owner: { logo: { height: 100, id: "asset_owner", width: 100 } } });
    expect(JSON.stringify(snapshot)).not.toContain("workspace_1/private/logo.webp");
  });

  it("rejects inactive logo metadata before saving a profile", async () => {
    const { database } = createDatabase({ assetStatus: "quarantined" });
    await expect(upsertClientPortalBrandProfile({ actor, database, portalId: "portal_1", input: { profileKind: "portal", name: "Northstar", ownerLogoAssetId: "asset_owner", coBrandingMode: "prepared_by_for", attributionMode: "optional", theme: { accentColor: "#1E40AF", backgroundColor: "#FFFFFF", textColor: "#111827" } } })).rejects.toMatchObject({ code: "client_portal_brand_asset_invalid" });
  });
});
