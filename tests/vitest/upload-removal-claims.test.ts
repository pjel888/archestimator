import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { D1Result, D1Value } from "@/lib/cloudflare/d1";
import { claimUploadAssetsForRemoval } from "@/lib/uploads/removal-claims";

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const ASSET_ID = "33333333-3333-4333-8333-333333333333";
const PATH = `${WORKSPACE_ID}/${USER_ID}/component.webp`;
const THUMBNAIL_PATH = `${WORKSPACE_ID}/${USER_ID}/component-thumb.webp`;

class FakeD1Statement {
  values: D1Value[] = [];

  constructor(
    private readonly database: FakeD1Database,
    readonly sql: string,
  ) {}

  bind(...values: D1Value[]) {
    this.values = values;
    return this;
  }

  async first<R>() {
    return this.database.diagnostic as R | null;
  }

  async all<R>(): Promise<D1Result<R>> {
    return { success: true, results: this.database.claimRows as R[] };
  }

  async run(): Promise<D1Result> {
    return { success: true, meta: { changes: 1 } };
  }
}

class FakeD1Database {
  claimRows: Array<Record<string, unknown>> = [];
  diagnostic: Record<string, unknown> | null = null;
  statements: FakeD1Statement[] = [];

  prepare(sql: string) {
    const statement = new FakeD1Statement(this, sql);
    this.statements.push(statement);
    return statement;
  }
}

describe("upload removal claims", () => {
  it("atomically claims an unreferenced asset and all of its object paths", async () => {
    const database = new FakeD1Database();
    database.claimRows = [{
      id: ASSET_ID,
      storage_path: PATH,
      thumbnail_path: THUMBNAIL_PATH,
    }];

    const result = await claimUploadAssetsForRemoval(database, {
      workspaceId: WORKSPACE_ID,
      actorUserId: USER_ID,
      surface: "component-image",
      bucket: "component-images",
      paths: [PATH, THUMBNAIL_PATH],
      now: new Date("2026-07-15T00:00:00.000Z"),
      claimId: "claim-1",
    });

    expect(result).toEqual({
      status: "claimed",
      assetIds: [ASSET_ID],
      claimedPaths: [PATH, THUMBNAIL_PATH],
    });
    expect(database.statements).toHaveLength(1);
    expect(database.statements[0]?.sql).toContain("UPDATE upload_assets AS asset");
    expect(database.statements[0]?.sql).toContain("removal_claim_id");
    expect(database.statements[0]?.sql).toContain("component_variant_attachments");
    expect(database.statements[0]?.sql).toContain("estimate_row_items");
    expect(database.statements[0]?.sql).toContain("estimate_template_row_items");
    expect(database.statements[0]?.sql).toContain("cost_library_item_versions");
    expect(database.statements[0]?.sql).toContain("cost_library_item_price_history");
    expect(database.statements[0]?.sql).toContain("project_publications");
  });

  it("reports a reference conflict without claiming any object", async () => {
    const database = new FakeD1Database();
    database.diagnostic = {
      matched_count: 1,
      referenced_count: 1,
      already_claimed_count: 0,
    };

    const result = await claimUploadAssetsForRemoval(database, {
      workspaceId: WORKSPACE_ID,
      actorUserId: USER_ID,
      surface: "component-image",
      bucket: "component-images",
      paths: [PATH],
      claimId: "claim-2",
    });

    expect(result).toEqual({
      status: "referenced",
      assetIds: [],
      claimedPaths: [],
    });
    expect(database.statements).toHaveLength(2);
  });

  it("adds compatible upload lifecycle and terminal purge constraints", () => {
    const migration = readFileSync(
      join(process.cwd(), "migrations/0084_upload_lifecycle_integrity.sql"),
      "utf8",
    );
    const actorAndRemovalMigration = readFileSync(
      join(process.cwd(), "migrations/0087_upload_actor_and_removal_state_integrity.sql"),
      "utf8",
    );

    expect(migration).toContain("idx_upload_assets_upload_session_unique");
    expect(migration).toContain("purge_state");
    expect(migration).toContain("purged_at");
    expect(migration).toContain("upload_asset_cleanup_objects");
    expect(migration).toContain("finalized upload session is missing an asset");
    expect(migration).toContain("upload asset is missing its session");
    expect(actorAndRemovalMigration).toContain("session.actor_user_id IS NEW.actor_user_id");
    expect(actorAndRemovalMigration).toContain("upload_sessions_asset_integrity_update");
    expect(actorAndRemovalMigration).toContain("upload_assets_removed_cleanup_state_update");
    expect(actorAndRemovalMigration).toContain("upload_assets_prevent_resurrection");
  });
});
