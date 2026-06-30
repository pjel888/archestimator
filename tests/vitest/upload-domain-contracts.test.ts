import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import { buildUploadObjectKey } from "@/lib/uploads/object-keys";
import { getUploadPolicy } from "@/lib/uploads/policy";
import { recordUploadAsset } from "@/lib/uploads/upload-records";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260626190000_upload_domain_tables.sql"), "utf8");
const scanTaxonomyMigration = readFileSync(join(process.cwd(), "supabase/migrations/20260626194500_upload_scan_status_taxonomy.sql"), "utf8");
const d1UploadMetadataMigration = readFileSync(join(process.cwd(), "migrations/0010_upload_metadata.sql"), "utf8");

class FakeD1Statement<T = Record<string, unknown>> implements D1PreparedStatementLike<T> {
  values: D1Value[] = [];

  constructor(
    private readonly database: FakeD1Database,
    readonly sql: string,
  ) {}

  bind(...values: D1Value[]) {
    this.values = values;
    return this;
  }

  async first<R = T>(): Promise<R | null> {
    return null;
  }

  async all<R = T>(): Promise<D1Result<R>> {
    return { results: [], success: true };
  }

  async run(): Promise<D1Result<T>> {
    if (this.database.failNextRun) {
      const error = this.database.failNextRun;
      this.database.failNextRun = null;
      throw error;
    }
    this.database.runStatements.push({ sql: this.sql, values: this.values });
    return { success: true, meta: { changes: 1 } };
  }
}

class FakeD1Database implements D1DatabaseLike {
  failNextRun: Error | null = null;
  readonly runStatements: Array<{ sql: string; values: D1Value[] }> = [];

  prepare<T = Record<string, unknown>>(sql: string): D1PreparedStatementLike<T> {
    return new FakeD1Statement<T>(this, sql);
  }
}

function d1SqlStatements(database: FakeD1Database, pattern: RegExp) {
  return database.runStatements.filter((statement) => pattern.test(statement.sql));
}

describe("upload domain contracts", () => {
  it("defines provider-neutral upload policies and safe object keys", () => {
    expect(getUploadPolicy("project-image")).toMatchObject({
      bucket: "project-images",
      keyPrefix: "project-images",
      publicUrlAllowed: false,
      scanRequired: false,
    });
    expect(getUploadPolicy("component-attachment")).toMatchObject({
      bucket: "component-attachments",
      scanRequired: true,
    });
    expect(buildUploadObjectKey({
      surface: "project-image",
      workspaceId: "workspace-1",
      userId: "user-1",
      targetEntityId: "project-1",
      fileName: "../Floor Plan.PNG",
      extension: ".webp",
      suffix: "fixed",
    })).toBe("workspace-1/user-1/project-images/project-1/floor-plan-fixed.webp");
  });

  it("creates upload session, asset, and event tables with RLS and narrow grants", () => {
    expect(migration).toContain("create table if not exists public.upload_sessions");
    expect(migration).toContain("create table if not exists public.upload_assets");
    expect(migration).toContain("create table if not exists public.upload_events");
    expect(migration).toContain("alter table public.upload_sessions enable row level security");
    expect(migration).toContain("alter table public.upload_assets enable row level security");
    expect(migration).toContain("alter table public.upload_events enable row level security");
    expect(migration).toContain("revoke all on public.upload_sessions from public, anon, authenticated");
    expect(migration).toContain("revoke all on public.upload_assets from public, anon, authenticated");
    expect(migration).toContain("revoke all on public.upload_events from public, anon, authenticated");
    expect(migration).toContain("create or replace function public.get_upload_asset_descriptor");
    expect(migration).toContain("target_row.actor_user_id <> (select auth.uid())");
    expect(migration).toContain("grant execute on function public.get_upload_asset_descriptor(uuid) to authenticated");
    expect(migration).toContain("create or replace function public.validate_estimate_row_image_asset");
    expect(migration).toContain("asset_row.surface is distinct from 'project-image'");
    expect(migration).toContain("asset_row.target_entity_type is distinct from 'estimate-row'");
    expect(migration).toContain("asset_row.target_entity_id is distinct from target_project_id");
    expect(migration).toContain("asset_row.storage_bucket is distinct from 'project-images'");
    expect(migration).toContain("asset_row.metadata->>'rowItemId' is distinct from target_row_id::text");
    expect(migration).toContain("grant execute on function public.validate_estimate_row_image_asset(uuid, uuid, uuid, uuid, uuid) to authenticated");
    expect(migration).not.toMatch(/grant\s+select.*upload_assets/i);
    expect(migration).not.toMatch(/grant\s+(insert|update|delete).*upload_assets/i);
  });

  it("keeps raw storage paths constrained before persistence", () => {
    expect(migration).toContain("upload_sessions_storage_path_safe");
    expect(migration).toContain("upload_assets_storage_path_safe");
    expect(migration).toContain("upload_sessions_bucket_matches_surface");
    expect(migration).toContain("upload_assets_bucket_matches_surface");
    expect(migration).toContain("upload_sessions_path_matches_actor");
    expect(migration).toContain("upload_assets_path_matches_actor");
    expect(migration).toContain("upload_assets_project_path_shape");
    expect(migration).toContain("/project-images/' || coalesce(target_entity_id::text, '') || '/estimate-row-images/%");
    expect(migration).toContain("enforce_upload_asset_session_consistency");
    expect(migration).toContain("constraint upload_assets_storage_path_key unique (storage_bucket, storage_path)");
  });

  it("adds explicit scan failure and override statuses without enabling scanner downloads", () => {
    expect(scanTaxonomyMigration).toContain("alter type public.upload_scan_status add value if not exists 'failed_transient'");
    expect(scanTaxonomyMigration).toContain("alter type public.upload_scan_status add value if not exists 'failed_permanent'");
    expect(scanTaxonomyMigration).toContain("alter type public.upload_scan_status add value if not exists 'override_approved'");
    expect(migration).toContain("'clean'");
    expect(migration).toContain("'infected'");
    expect(migration).toContain("'unsupported'");
  });

  it("records finalized assets through Cloudflare D1 metadata tables", async () => {
    expect(d1UploadMetadataMigration).toContain("CREATE TABLE IF NOT EXISTS upload_sessions");
    expect(d1UploadMetadataMigration).toContain("CREATE TABLE IF NOT EXISTS upload_assets");
    expect(d1UploadMetadataMigration).toContain("CREATE TABLE IF NOT EXISTS upload_events");
    expect(d1UploadMetadataMigration).toContain("target_entity_type TEXT");
    expect(d1UploadMetadataMigration).toContain("target_entity_id TEXT");
    expect(d1UploadMetadataMigration).toContain("'not_required'");

    const database = new FakeD1Database();

    const record = await recordUploadAsset(database, {
      workspaceId: "workspace-1",
      actorUserId: "user-1",
      surface: "component-image",
      targetEntityType: "component-library",
      targetEntityId: null,
      bucket: "component-images",
      path: "workspace-1/user-1/component.webp",
      thumbnailPath: "workspace-1/user-1/component-thumb.webp",
      fileName: "component.png",
      contentType: "image/webp",
      sizeBytes: 10,
      checksumBytes: new Uint8Array([1, 2, 3]),
      scanStatus: "not_required",
      metadata: { originalBytes: 100 },
    });

    expect(record).toMatchObject({
      uploadSessionId: expect.any(String),
      assetId: expect.any(String),
      scanStatus: "not_required",
    });
    expect(d1SqlStatements(database, /INSERT INTO upload_sessions/)).toHaveLength(1);
    expect(d1SqlStatements(database, /INSERT INTO upload_assets/)).toHaveLength(1);
    expect(d1SqlStatements(database, /INSERT INTO upload_events/)).toHaveLength(1);
    expect(database.runStatements.flatMap((statement) => statement.values)).toEqual(expect.arrayContaining([
      "workspace-1",
      "user-1",
      "component-image",
      "component-library",
      "component-images",
      "workspace-1/user-1/component.webp",
      "workspace-1/user-1/component-thumb.webp",
      "not_required",
      expect.any(String),
      "{\"originalBytes\":100}",
    ]));
  });

  it("fails when D1 upload record persistence rejects", async () => {
    const database = new FakeD1Database();
    database.failNextRun = new Error("transaction failed");

    await expect(recordUploadAsset(database, {
      workspaceId: "workspace-1",
      actorUserId: "user-1",
      surface: "component-image",
      targetEntityType: "component-library",
      targetEntityId: null,
      bucket: "component-images",
      path: "workspace-1/user-1/component.webp",
      fileName: "component.png",
      contentType: "image/webp",
      sizeBytes: 10,
      checksumBytes: new Uint8Array([1, 2, 3]),
      scanStatus: "not_required",
    })).rejects.toThrow("transaction failed");
  });

  it("accepts pending scan status written through D1", async () => {
    const database = new FakeD1Database();

    await expect(recordUploadAsset(database, {
      workspaceId: "workspace-1",
      actorUserId: "user-1",
      surface: "component-attachment",
      targetEntityType: "component-library",
      targetEntityId: null,
      bucket: "component-attachments",
      path: "workspace-1/user-1/spec.pdf",
      fileName: "spec.pdf",
      contentType: "application/pdf",
      sizeBytes: 10,
      checksumBytes: new Uint8Array([1, 2, 3]),
      scanStatus: "pending",
    })).resolves.toEqual({
      uploadSessionId: expect.any(String),
      assetId: expect.any(String),
      scanStatus: "pending",
    });
    expect(d1SqlStatements(database, /INSERT INTO upload_assets/)[0]?.values).toEqual(expect.arrayContaining([
      "component-attachment",
      "component-attachments",
      "workspace-1/user-1/spec.pdf",
      "pending",
    ]));
  });
});
