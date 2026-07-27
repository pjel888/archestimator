import { describe, expect, it } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1Result,
  D1Value,
} from "@/lib/cloudflare/d1";
import {
  finalizeReservedUploadAsset,
  reserveUploadAsset,
  type ReservedUploadAsset,
} from "@/lib/uploads/upload-records";

class ReservationStatement<T = Record<string, unknown>> implements D1PreparedStatementLike<T> {
  values: D1Value[] = [];

  constructor(
    private readonly database: ReservationDatabase,
    readonly sql: string,
  ) {}

  bind(...values: D1Value[]) {
    this.values = values;
    return this;
  }

  async first<R = T>(): Promise<R | null> {
    return this.sql.includes("FROM upload_sessions") ? this.database.session as R | null : null;
  }

  async all<R = T>(): Promise<D1Result<R>> {
    return { results: [], success: true };
  }

  async run(): Promise<D1Result<T>> {
    return { success: true };
  }
}

class ReservationDatabase implements D1DatabaseLike {
  batches = 0;
  session: Record<string, unknown> | null = null;
  statements: ReservationStatement[] = [];

  prepare<T = Record<string, unknown>>(sql: string): D1PreparedStatementLike<T> {
    const statement = new ReservationStatement<T>(this, sql);
    this.statements.push(statement);
    return statement;
  }

  async batch<T = Record<string, unknown>>(
    statements: D1PreparedStatementLike<T>[],
  ): Promise<D1Result<T>[]> {
    this.batches += 1;
    const insert = statements[0] as ReservationStatement;
    if (!this.session) {
      const values = insert.values;
      this.session = {
        id: values[0],
        workspace_id: values[1],
        actor_user_id: values[2],
        surface: values[3],
        target_entity_type: values[4],
        target_entity_id: values[5],
        storage_bucket: values[6],
        storage_path: values[7],
        file_name: values[8],
        content_type: values[9],
        size_bytes: values[10],
        checksum_sha256: values[11],
        status: "reserved",
        expires_at: values[12],
        metadata_json: values[13],
        created_at: values[14],
      };
    }
    return statements.map(() => ({ success: true }));
  }
}

function reservationInput(overrides: Partial<Parameters<typeof reserveUploadAsset>[1]> = {}) {
  return {
    workspaceId: "workspace-1",
    actorUserId: "recipient-1",
    surface: "portal-request-evidence" as const,
    targetEntityType: "project-change-request",
    targetEntityId: "request-1",
    bucket: "project-artifacts",
    path: `workspace-1/recipient-1/project-artifacts/project-1/${"a".repeat(64)}.pdf`,
    fileName: "evidence.pdf",
    contentType: "application/pdf",
    sizeBytes: 8,
    checksumBytes: Buffer.from("evidence"),
    idempotencyKey: `portal-request-evidence:request-version-1:${"a".repeat(64)}`,
    scanStatus: "pending" as const,
    metadata: { projectId: "project-1", requestVersionId: "request-version-1" },
    ...overrides,
  };
}

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
  it("inserts or reuses one durable reservation for the same idempotent intent", async () => {
    const database = new ReservationDatabase();
    const now = new Date("2026-07-27T00:00:00.000Z");

    const first = await reserveUploadAsset(database, reservationInput(), { now });
    const replay = await reserveUploadAsset(database, reservationInput(), { now });

    expect(replay).toEqual(first);
    expect(first.uploadSessionId).toMatch(/^[a-f0-9-]{36}$/);
    expect(first.assetId).toMatch(/^[a-f0-9-]{36}$/);
    expect(database.batches).toBe(2);
    expect(database.statements[0]?.sql).toContain("INSERT OR IGNORE INTO upload_sessions");
    expect(database.statements[1]?.sql).toContain("INSERT OR IGNORE INTO upload_events");
    expect(first.metadataJson).toContain("uploadIntentSha256");
    expect(first.metadataJson).not.toContain("portal-request-evidence:request-version-1");
  });

  it("rejects an idempotency replay when any persisted upload intent differs", async () => {
    const database = new ReservationDatabase();
    const now = new Date("2026-07-27T00:00:00.000Z");
    await reserveUploadAsset(database, reservationInput(), { now });

    await expect(reserveUploadAsset(database, reservationInput({ fileName: "different.pdf" }), { now }))
      .rejects.toThrow("already in use for a different intent");
  });

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
