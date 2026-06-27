import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { buildUploadObjectKey } from "@/lib/uploads/object-keys";
import { getUploadPolicy } from "@/lib/uploads/policy";
import { createSupabaseUploadStorageProvider } from "@/lib/uploads/storage-provider";
import { recordUploadAsset } from "@/lib/uploads/upload-records";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260626190000_upload_domain_tables.sql"), "utf8");
const scanTaxonomyMigration = readFileSync(join(process.cwd(), "supabase/migrations/20260626194500_upload_scan_status_taxonomy.sql"), "utf8");

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

  it("records finalized assets through one atomic database RPC", async () => {
    expect(migration).toContain("create or replace function public.record_upload_asset");
    expect(migration).toContain("auth.role() <> 'service_role'");
    expect(migration).toContain("insert into public.upload_sessions");
    expect(migration).toContain("insert into public.upload_assets");
    expect(migration).toContain("insert into public.upload_events");
    expect(migration).toContain("grant execute on function public.record_upload_asset");
    expect(migration).toContain("to service_role");

    const rpc = vi.fn(async () => ({
      data: {
        uploadSessionId: "session-1",
        assetId: "asset-1",
        scanStatus: "not_required",
      },
      error: null,
    }));

    const record = await recordUploadAsset({ rpc }, {
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

    expect(record).toEqual({
      uploadSessionId: "session-1",
      assetId: "asset-1",
      scanStatus: "not_required",
    });
    expect(rpc).toHaveBeenCalledWith("record_upload_asset", expect.objectContaining({
      target_workspace_id: "workspace-1",
      actor_user_id: "user-1",
      upload_surface: "component-image",
      storage_bucket: "component-images",
      storage_path: "workspace-1/user-1/component.webp",
      thumbnail_path: "workspace-1/user-1/component-thumb.webp",
      scan_status: "not_required",
      checksum_sha256: expect.any(String),
    }));
  });

  it("fails when the atomic upload record RPC rejects", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: { message: "transaction failed" } }));

    await expect(recordUploadAsset({ rpc }, {
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

  it("fails when the atomic upload record RPC returns an invalid response", async () => {
    const rpc = vi.fn(async () => ({ data: { uploadSessionId: "session-1" }, error: null }));

    await expect(recordUploadAsset({ rpc }, {
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
    })).rejects.toThrow("Upload record response was invalid.");
  });

  it("accepts pending scan status returned from the atomic upload record RPC", async () => {
    const rpc = vi.fn(async () => ({
      data: {
        uploadSessionId: "session-2",
        assetId: "asset-2",
        scanStatus: "pending",
      },
      error: null,
    }));

    await expect(recordUploadAsset({ rpc }, {
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
      uploadSessionId: "session-2",
      assetId: expect.any(String),
      scanStatus: "pending",
    });
  });

  it("adapts Supabase storage behind a provider-neutral upload interface", async () => {
    const upload = vi.fn(async () => ({ error: null }));
    const remove = vi.fn(async () => ({ error: null }));
    const getPublicUrl = vi.fn(() => ({ data: { publicUrl: "https://cdn.example/component.webp" } }));
    const from = vi.fn(() => ({ upload, remove, getPublicUrl }));
    const provider = createSupabaseUploadStorageProvider({ storage: { from } });

    await provider.uploadObject({
      bucket: "component-images",
      path: "workspace-1/user-1/component.webp",
      body: new Uint8Array([1]),
      contentType: "image/webp",
    });
    await provider.removeObjects("component-images", ["workspace-1/user-1/component.webp"]);

    expect(upload).toHaveBeenCalledWith("workspace-1/user-1/component.webp", new Uint8Array([1]), {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
    expect(remove).toHaveBeenCalledWith(["workspace-1/user-1/component.webp"]);
    expect(provider.getPublicUrl("component-images", "workspace-1/user-1/component.webp")).toBe("https://cdn.example/component.webp");
  });
});
