import { describe, expect, it } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import { finalizeUploadSessionAsset, type UploadSessionForFinalize } from "@/lib/uploads/direct-upload-records";

const uploadSession: UploadSessionForFinalize = {
  id: "upload_session_1",
  workspace_id: "workspace_1",
  actor_user_id: "user_1",
  surface: "component-attachment",
  target_entity_type: "component-library",
  target_entity_id: null,
  storage_bucket: "component-attachments",
  storage_path: "workspace_1/user_1/spec.pdf",
  file_name: "spec.pdf",
  content_type: "application/pdf",
  size_bytes: 1024,
  checksum_sha256: null,
  status: "failed",
  expires_at: null,
  metadata: {},
};

class FakeD1Statement<T> implements D1PreparedStatementLike<T> {
  constructor(
    private readonly database: FakeD1Database,
    private readonly sql: string,
  ) {}

  bind(...values: D1Value[]) {
    void values;
    return this;
  }

  async first<R = T>(): Promise<R | null> {
    if (this.sql.includes("FROM upload_sessions")) return this.database.session as R;
    return null;
  }

  async all<R = T>(): Promise<D1Result<R>> {
    return { success: true, results: [] };
  }

  async run(): Promise<D1Result<T>> {
    this.database.runCount += 1;
    return { success: true, meta: { changes: 1 } };
  }
}

class FakeD1Database implements D1DatabaseLike {
  readonly session: UploadSessionForFinalize & { metadata_json: string };
  prepareCount = 0;
  runCount = 0;

  constructor(status: UploadSessionForFinalize["status"] = "failed") {
    this.session = { ...uploadSession, status, metadata_json: JSON.stringify(uploadSession.metadata) };
  }

  prepare<T = Record<string, unknown>>(sql: string): D1PreparedStatementLike<T> {
    this.prepareCount += 1;
    return new FakeD1Statement<T>(this, sql);
  }
}

describe("direct upload records", () => {
  it("continues validating a retryable upload session status", async () => {
    const database = new FakeD1Database("reserved");

    await expect(finalizeUploadSessionAsset(database, {
      uploadSessionId: uploadSession.id,
      workspaceId: uploadSession.workspace_id,
      actorUserId: uploadSession.actor_user_id,
      observedContentType: "image/png",
      observedSizeBytes: uploadSession.size_bytes,
      observedEtag: "provider-etag",
      scanStatus: "not_required",
    })).rejects.toThrow("Upload content type mismatch.");
    expect(database.prepareCount).toBe(2);
    expect(database.runCount).toBe(0);
  });

  it("rejects a non-retryable upload session status before writing finalization records", async () => {
    const database = new FakeD1Database();

    await expect(finalizeUploadSessionAsset(database, {
      uploadSessionId: uploadSession.id,
      workspaceId: uploadSession.workspace_id,
      actorUserId: uploadSession.actor_user_id,
      observedContentType: uploadSession.content_type,
      observedSizeBytes: uploadSession.size_bytes,
      observedEtag: "provider-etag",
      scanStatus: "not_required",
    })).rejects.toThrow("Upload session is not reservable or repairable.");
    expect(database.prepareCount).toBe(2);
    expect(database.runCount).toBe(0);
  });
});
