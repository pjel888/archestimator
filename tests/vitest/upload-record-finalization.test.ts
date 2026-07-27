import { describe, expect, it } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1Result,
  D1Value,
} from "@/lib/cloudflare/d1";
import {
  finalizeReservedUploadAsset,
  type ReservedUploadAsset,
} from "@/lib/uploads/upload-records";

class FinalizationStatement<T = Record<string, unknown>> implements D1PreparedStatementLike<T> {
  values: D1Value[] = [];

  constructor(
    private readonly database: FinalizationDatabase,
    readonly sql: string,
  ) {}

  bind(...values: D1Value[]) {
    this.values = values;
    return this;
  }

  async first<R = T>(): Promise<R | null> {
    if (!this.sql.includes("FROM upload_assets")) return null;
    return this.database.finalizedAsset as R | null;
  }

  async all<R = T>(): Promise<D1Result<R>> {
    return { results: [], success: true };
  }

  async run(): Promise<D1Result<T>> {
    return { success: true, meta: { changes: 0 } };
  }
}

class FinalizationDatabase implements D1DatabaseLike {
  readonly batches: FinalizationStatement[][] = [];
  batchError: Error | null = null;
  finalizedAsset: {
    id: string;
    upload_session_id: string;
    scan_status: "pending";
  } | null = {
    id: "asset-1",
    upload_session_id: "session-1",
    scan_status: "pending",
  };

  prepare<T = Record<string, unknown>>(sql: string): D1PreparedStatementLike<T> {
    return new FinalizationStatement<T>(this, sql);
  }

  async batch<T = Record<string, unknown>>(
    statements: D1PreparedStatementLike<T>[],
  ): Promise<D1Result<T>[]> {
    this.batches.push(statements as FinalizationStatement[]);
    if (this.batchError) throw this.batchError;
    return statements.map(() => ({ success: true, meta: { changes: 0 } }));
  }
}

function reservation(): ReservedUploadAsset {
  return {
    uploadSessionId: "session-1",
    assetId: "asset-1",
    scanStatus: "pending",
    workspaceId: "workspace-1",
    actorUserId: "recipient-1",
    surface: "portal-request-evidence",
    targetEntityType: "project-change-request",
    targetEntityId: "request-1",
    projectId: "project-1",
    estimateId: null,
    bucket: "project-artifacts",
    path: "workspace-1/recipient-1/project-artifacts/project-1/evidence.pdf",
    thumbnailPath: null,
    fileName: "evidence.pdf",
    contentType: "application/pdf",
    sizeBytes: 8,
    checksumSha256: "a".repeat(64),
    metadataJson: "{}",
    expiresAt: "2026-07-27T00:15:00.000Z",
    createdAt: "2026-07-27T00:00:00.000Z",
  };
}

describe("reserved upload finalization", () => {
  it("returns the same durable asset when finalization is replayed", async () => {
    const database = new FinalizationDatabase();

    await expect(finalizeReservedUploadAsset(database, reservation())).resolves.toEqual({
      uploadSessionId: "session-1",
      assetId: "asset-1",
      scanStatus: "pending",
    });
    await expect(finalizeReservedUploadAsset(database, reservation())).resolves.toEqual({
      uploadSessionId: "session-1",
      assetId: "asset-1",
      scanStatus: "pending",
    });

    expect(database.batches).toHaveLength(2);
    expect(database.batches[0][0].sql).toContain("status IN ('reserved', 'finalized')");
    expect(database.batches[0][2].sql).toContain("INSERT OR IGNORE INTO upload_events");
  });

  it("reconciles a committed winner after an uncertain D1 batch error", async () => {
    const database = new FinalizationDatabase();
    database.batchError = new Error("D1 response unavailable");

    await expect(finalizeReservedUploadAsset(database, reservation())).resolves.toEqual({
      uploadSessionId: "session-1",
      assetId: "asset-1",
      scanStatus: "pending",
    });
  });

  it("fails when neither the batch nor a matching durable asset succeeds", async () => {
    const database = new FinalizationDatabase();
    database.batchError = new Error("D1 unavailable");
    database.finalizedAsset = null;

    await expect(finalizeReservedUploadAsset(database, reservation())).rejects.toThrow("D1 unavailable");
  });
});
