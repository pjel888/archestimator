import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { D1Result, D1Value } from "@/lib/cloudflare/d1";
import { claimUploadAssetsForRemoval } from "@/lib/uploads/removal-claims";

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const CLAIMED_ASSET_ID = "33333333-3333-4333-8333-333333333333";
const BLOCKED_ASSET_ID = "44444444-4444-4444-8444-444444444444";
const ALREADY_REMOVED_ASSET_ID = "55555555-5555-4555-8555-555555555555";
const CLAIMED_PATH = `${WORKSPACE_ID}/${USER_ID}/claimed.webp`;
const CLAIMED_THUMBNAIL_PATH = `${WORKSPACE_ID}/${USER_ID}/claimed-thumb.webp`;
const BLOCKED_PATH = `${WORKSPACE_ID}/${USER_ID}/blocked.webp`;
const ALREADY_REMOVED_PATH = `${WORKSPACE_ID}/${USER_ID}/already-removed.webp`;

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
    return null as R | null;
  }

  async all<R>(): Promise<D1Result<R>> {
    const rows = this.sql.includes("UPDATE upload_assets AS asset")
      ? this.database.claimRows
      : this.database.diagnosticRows;
    return { success: true, results: rows as R[] };
  }

  async run(): Promise<D1Result> {
    return { success: true, meta: { changes: 1 } };
  }
}

class FakeD1Database {
  claimRows: Array<Record<string, unknown>> = [];
  diagnosticRows: Array<Record<string, unknown>> = [];
  statements: FakeD1Statement[] = [];

  prepare(sql: string) {
    const statement = new FakeD1Statement(this, sql);
    this.statements.push(statement);
    return statement;
  }
}

function claimInput(paths: string[]) {
  return {
    workspaceId: WORKSPACE_ID,
    actorUserId: USER_ID,
    surface: "component-image" as const,
    bucket: "component-images",
    paths,
    now: new Date("2026-07-15T00:00:00.000Z"),
    claimId: "claim-1",
  };
}

describe("upload removal claims", () => {
  it("classifies mixed claimed, referenced, and already-removed assets into disjoint sets", async () => {
    const database = new FakeD1Database();
    database.claimRows = [{
      id: CLAIMED_ASSET_ID,
      storage_path: CLAIMED_PATH,
      thumbnail_path: CLAIMED_THUMBNAIL_PATH,
    }];
    database.diagnosticRows = [{
      id: BLOCKED_ASSET_ID,
      storage_path: BLOCKED_PATH,
      thumbnail_path: CLAIMED_THUMBNAIL_PATH,
      is_referenced: 1,
      is_already_removed: 0,
    }, {
      id: ALREADY_REMOVED_ASSET_ID,
      storage_path: ALREADY_REMOVED_PATH,
      thumbnail_path: BLOCKED_PATH,
      is_referenced: 0,
      is_already_removed: 1,
    }];

    const result = await claimUploadAssetsForRemoval(
      database,
      claimInput([CLAIMED_PATH, BLOCKED_PATH, ALREADY_REMOVED_PATH]),
    );

    expect(result).toEqual({
      status: "partial",
      claimedAssetIds: [CLAIMED_ASSET_ID],
      claimedPaths: [CLAIMED_PATH, CLAIMED_THUMBNAIL_PATH],
      blockedAssetIds: [BLOCKED_ASSET_ID],
      blockedPaths: [BLOCKED_PATH],
      alreadyRemovedAssetIds: [ALREADY_REMOVED_ASSET_ID],
      alreadyRemovedPaths: [ALREADY_REMOVED_PATH],
    });
    expect(database.statements).toHaveLength(2);

    const claimSql = database.statements[0]?.sql ?? "";
    const diagnosticSql = database.statements[1]?.sql ?? "";
    expect(claimSql).toContain("UPDATE upload_assets AS asset");
    expect(claimSql).toContain("removal_claim_id");
    expect(claimSql).toContain("component_variant_attachments");
    expect(claimSql).toContain("estimate_row_items");
    expect(claimSql).toContain("estimate_template_row_items");
    expect(claimSql).toContain("cost_library_item_versions");
    expect(claimSql).toContain("cost_library_item_price_history");
    expect(claimSql).toContain("project_publications");
    expect(claimSql).toContain("asset.status IN ('pending', 'finalized')");
    expect(claimSql).toContain("OR asset.status IN ('removed', 'deleted')");
    expect(claimSql).toContain("OR asset.purge_state <> 'active'");
    expect(claimSql).toContain("candidate.id = asset.id");
    expect(claimSql).not.toContain("candidate.id IN (SELECT id FROM matched_assets)");
    expect(diagnosticSql).toContain("asset.id NOT IN");
    expect(diagnosticSql).toContain("FROM json_each(?)");
    expect(database.statements[1]?.values.at(-1)).toBe(
      JSON.stringify([CLAIMED_ASSET_ID]),
    );
  });

  it("reports all-referenced assets without claiming any object", async () => {
    const database = new FakeD1Database();
    database.diagnosticRows = [{
      id: BLOCKED_ASSET_ID,
      storage_path: BLOCKED_PATH,
      thumbnail_path: null,
      is_referenced: 1,
      is_already_removed: 0,
    }];

    const result = await claimUploadAssetsForRemoval(
      database,
      claimInput([BLOCKED_PATH]),
    );

    expect(result).toEqual({
      status: "referenced",
      claimedAssetIds: [],
      claimedPaths: [],
      blockedAssetIds: [BLOCKED_ASSET_ID],
      blockedPaths: [BLOCKED_PATH],
      alreadyRemovedAssetIds: [],
      alreadyRemovedPaths: [],
    });
    expect(database.statements).toHaveLength(2);
  });

  it("reports all-free assets as claimed after the unmatched diagnostic", async () => {
    const database = new FakeD1Database();
    database.claimRows = [{
      id: CLAIMED_ASSET_ID,
      storage_path: CLAIMED_PATH,
      thumbnail_path: CLAIMED_THUMBNAIL_PATH,
    }];

    const result = await claimUploadAssetsForRemoval(
      database,
      claimInput([CLAIMED_PATH]),
    );

    expect(result).toEqual({
      status: "claimed",
      claimedAssetIds: [CLAIMED_ASSET_ID],
      claimedPaths: [CLAIMED_PATH, CLAIMED_THUMBNAIL_PATH],
      blockedAssetIds: [],
      blockedPaths: [],
      alreadyRemovedAssetIds: [],
      alreadyRemovedPaths: [],
    });
    expect(database.statements).toHaveLength(2);
  });

  it("keeps category-ineligible active assets and zero matches as not found", async () => {
    const database = new FakeD1Database();

    const result = await claimUploadAssetsForRemoval(
      database,
      claimInput([CLAIMED_PATH]),
    );

    expect(result).toEqual({
      status: "not_found",
      claimedAssetIds: [],
      claimedPaths: [],
      blockedAssetIds: [],
      blockedPaths: [],
      alreadyRemovedAssetIds: [],
      alreadyRemovedPaths: [],
    });
    expect(database.statements).toHaveLength(2);
    expect(database.statements[0]?.sql).toContain(
      "asset.status IN ('pending', 'finalized')",
    );
    expect(database.statements[0]?.sql).not.toContain(
      "asset.status IN ('reserved', 'failed')",
    );
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
