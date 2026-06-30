import { afterEach, describe, expect, it, vi } from "vitest";

import type { StorageCleanupReport } from "@/lib/mass-deletion/bulk-action";
import {
  createUploadCleanupStorageFromProvider,
  createUploadCleanupEventWriter,
  listUploadCleanupJobRecords,
  runUploadCleanupJob,
  summarizeUploadCleanupJobResult,
  type UploadCleanupEventPayload,
  type UploadCleanupJobRecord,
} from "@/lib/uploads/cleanup-job";
import {
  setUploadOperationalTelemetrySink,
  type UploadOperationalTelemetryRecord,
} from "@/lib/uploads/operational-telemetry";

const NOW = new Date("2026-06-27T03:10:00Z");
const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const SESSION_ID = "33333333-3333-4333-8333-333333333333";
const ASSET_ID = "44444444-4444-4444-8444-444444444444";
const ATTACHMENT_PATH = `${WORKSPACE_ID}/${USER_ID}/cleanup-job-proof.pdf`;

function attachmentRecord(overrides: Partial<UploadCleanupJobRecord> = {}): UploadCleanupJobRecord {
  return {
    assetId: ASSET_ID,
    uploadAssetId: ASSET_ID,
    uploadSessionId: SESSION_ID,
    workspaceId: WORKSPACE_ID,
    actorUserId: USER_ID,
    surface: "component-attachment",
    bucket: "component-attachments",
    path: ATTACHMENT_PATH,
    status: "deleted",
    ...overrides,
  };
}

class FakeD1Statement {
  values: unknown[] = [];

  constructor(
    private readonly database: FakeD1Database,
    readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async first<R>() {
    return null as R | null;
  }

  async all<R>() {
    if (this.sql.includes("FROM upload_assets")) {
      return { success: true, results: this.database.assetRows as R[] };
    }
    return { success: true, results: this.database.sessionRows as R[] };
  }

  async run() {
    this.database.runStatements.push(this);
    return { success: true, meta: { changes: 1 } };
  }
}

class FakeD1Database {
  assetRows: unknown[] = [];
  runStatements: FakeD1Statement[] = [];
  sessionRows: unknown[] = [];
  statements: FakeD1Statement[] = [];

  prepare(sql: string) {
    const statement = new FakeD1Statement(this, sql);
    this.statements.push(statement);
    return statement;
  }
}

describe("upload cleanup job runner", () => {
  afterEach(() => {
    setUploadOperationalTelemetrySink(null);
  });

  it("records failed cleanup attempts and then records a successful retry without raw paths in event metadata", async () => {
    const events: UploadCleanupEventPayload[] = [];
    const eventWriter = { record: vi.fn(async (event: UploadCleanupEventPayload) => events.push(event)) };
    const failingStorage = {
      remove: vi.fn(async (targets): Promise<StorageCleanupReport> => ({
        removed: [],
        rejected: [],
        failed: targets.map((target) => ({ ...target, message: "timeout while deleting provider object" })),
      })),
    };

    const failedRun = await runUploadCleanupJob({
      records: [attachmentRecord()],
      storage: failingStorage,
      eventWriter,
      now: NOW,
      runId: "cleanup-run-failed",
    });

    expect(failedRun.audit).toMatchObject({
      queuedCount: 1,
      failedCount: 1,
      succeededCount: 0,
      writeFailureCount: 0,
    });
    expect(failedRun.operationalSnapshot.status).toBe("blocked");
    expect(failedRun.operationalSnapshot.retryAfterSeconds).toBe(300);
    expect(events.map((event) => event.eventType)).toEqual(["cleanup_queued", "cleanup_failed"]);

    const serializedFailureEvents = JSON.stringify(events);
    expect(serializedFailureEvents).not.toContain(ATTACHMENT_PATH);
    expect(events[0].metadata.storagePathSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(events[1].metadata.failureCategory).toBe("timeout");
    expect(events[1].metadata.failureMessageSha256).toMatch(/^[a-f0-9]{64}$/);

    const retryStorage = {
      remove: vi.fn(async (targets): Promise<StorageCleanupReport> => ({
        removed: targets.map((target) => ({ ...target })),
        rejected: [],
        failed: [],
      })),
    };

    const retryRun = await runUploadCleanupJob({
      records: [attachmentRecord()],
      storage: retryStorage,
      eventWriter,
      now: NOW,
      runId: "cleanup-run-retry",
    });

    expect(retryRun.audit).toMatchObject({
      queuedCount: 1,
      failedCount: 0,
      succeededCount: 1,
      writeFailureCount: 0,
    });
    expect(retryRun.storageReport.removed).toEqual([{ bucket: "component-attachments", path: ATTACHMENT_PATH }]);
    expect(retryRun.operationalSnapshot.status).toBe("healthy");
    expect(events.map((event) => event.eventType)).toEqual([
      "cleanup_queued",
      "cleanup_failed",
      "cleanup_queued",
      "cleanup_succeeded",
    ]);

    const publicReport = summarizeUploadCleanupJobResult(retryRun);
    expect(publicReport).toMatchObject({
      planner: { candidateCount: 1, rejectedCount: 0, candidateBuckets: ["component-attachments"] },
      storage: { removedCount: 1, failedCount: 0, rejectedCount: 0, failedBuckets: [] },
      audit: { queuedCount: 1, succeededCount: 1, failedCount: 0, writeFailureCount: 0 },
    });
    expect(JSON.stringify(publicReport)).not.toContain(ATTACHMENT_PATH);
  });

  it("emits one path-safe operational telemetry record per cleanup run", async () => {
    const telemetry: UploadOperationalTelemetryRecord[] = [];
    setUploadOperationalTelemetrySink((record) => telemetry.push(record));
    const eventWriter = { record: vi.fn(async () => undefined) };
    const storage = {
      remove: vi.fn(async (targets): Promise<StorageCleanupReport> => ({
        removed: [],
        rejected: [],
        failed: targets.map((target) => ({ ...target, message: "rate limited by storage provider" })),
      })),
    };

    await runUploadCleanupJob({
      records: [attachmentRecord()],
      storage,
      eventWriter,
      now: NOW,
      runId: "cleanup-run-telemetry",
    });

    expect(telemetry).toEqual([{
      schemaVersion: "v1",
      event: "upload_cleanup_run_completed",
      source: "cleanup-job",
      surface: "mixed",
      status: "blocked",
      severity: "critical",
      retryAfterSeconds: 300,
      cleanupRunId: "cleanup-run-telemetry",
      cleanupCandidates: 1,
      cleanupRemoved: 0,
      cleanupFailed: 1,
      cleanupRejected: 0,
      cleanupQueued: 1,
      cleanupSucceeded: 0,
      cleanupAuditWriteFailures: 0,
      cleanupFailedBucketCount: 1,
      cleanupAlertCodes: ["cleanup_failures"],
    }]);
    expect(JSON.stringify(telemetry)).not.toContain(ATTACHMENT_PATH);
  });

  it("does not fail the cleanup job when operational telemetry throws", async () => {
    setUploadOperationalTelemetrySink(() => {
      throw new Error("telemetry sink unavailable");
    });
    const eventWriter = { record: vi.fn(async () => undefined) };
    const storage = {
      remove: vi.fn(async (targets): Promise<StorageCleanupReport> => ({
        removed: targets.map((target) => ({ ...target })),
        rejected: [],
        failed: [],
      })),
    };

    await expect(runUploadCleanupJob({
      records: [attachmentRecord()],
      storage,
      eventWriter,
      now: NOW,
      runId: "cleanup-run-telemetry-throws",
    })).resolves.toMatchObject({
      runId: "cleanup-run-telemetry-throws",
      operationalSnapshot: {
        status: "healthy",
      },
    });
  });

  it("does not delete storage when the queued audit event cannot be persisted", async () => {
    const storage = {
      remove: vi.fn(async (targets): Promise<StorageCleanupReport> => ({
        removed: targets.map((target) => ({ ...target })),
        rejected: [],
        failed: [],
      })),
    };
    const eventWriter = {
      record: vi.fn(async () => {
        throw new Error("upload_events insert unavailable");
      }),
    };

    const result = await runUploadCleanupJob({
      records: [attachmentRecord()],
      storage,
      eventWriter,
      now: NOW,
      runId: "cleanup-run-queue-failed",
    });

    expect(storage.remove).not.toHaveBeenCalled();
    expect(result.audit).toMatchObject({
      queuedCount: 0,
      succeededCount: 0,
      failedCount: 0,
      writeFailureCount: 1,
    });
    expect(result.storageReport.failed).toEqual([
      expect.objectContaining({
        bucket: "component-attachments",
        message: "upload_events insert unavailable",
      }),
    ]);
    expect(result.operationalSnapshot.status).toBe("blocked");
  });

  it("maps persisted deleted assets and expired sessions into cleanup records", async () => {
    const database = new FakeD1Database();
    database.assetRows = [{
      id: ASSET_ID,
      upload_session_id: SESSION_ID,
      workspace_id: WORKSPACE_ID,
      actor_user_id: USER_ID,
      surface: "component-attachment",
      storage_bucket: "component-attachments",
      storage_path: ATTACHMENT_PATH,
      thumbnail_path: null,
      status: "deleted",
      updated_at: "2026-05-01T00:00:00.000Z",
    }];
    database.sessionRows = [{
      id: "55555555-5555-4555-8555-555555555555",
      workspace_id: WORKSPACE_ID,
      actor_user_id: USER_ID,
      surface: "project-image",
      storage_bucket: "project-images",
      storage_path: `${WORKSPACE_ID}/${USER_ID}/project-images/66666666-6666-4666-8666-666666666666/expired.webp`,
      status: "reserved",
      expires_at: "2026-06-25T00:00:00.000Z",
    }];

    const records = await listUploadCleanupJobRecords(database, { now: NOW, limit: 25 });

    const assetStatement = database.statements.find((statement) => statement.sql.includes("FROM upload_assets"));
    const sessionStatement = database.statements.find((statement) => statement.sql.includes("FROM upload_sessions"));
    expect(assetStatement?.sql).toContain("SELECT id, upload_session_id, workspace_id, actor_user_id, surface, storage_bucket, storage_path, thumbnail_path, status, updated_at");
    expect(assetStatement?.values).toEqual(["deleted", "2026-05-28T03:10:00.000Z", 25]);
    expect(sessionStatement?.sql).toContain("SELECT id, workspace_id, actor_user_id, surface, storage_bucket, storage_path, status, expires_at");
    expect(sessionStatement?.values).toEqual([
      "reserved",
      "failed",
      "expired",
      "deleted",
      "2026-06-26T03:10:00.000Z",
      25,
    ]);
    expect(records).toEqual([
      expect.objectContaining({
        assetId: ASSET_ID,
        uploadAssetId: ASSET_ID,
        uploadSessionId: SESSION_ID,
        status: "deleted",
      }),
      expect.objectContaining({
        assetId: "55555555-5555-4555-8555-555555555555",
        uploadAssetId: null,
        uploadSessionId: "55555555-5555-4555-8555-555555555555",
        status: "reserved",
      }),
    ]);
  });

  it("provides storage and event adapters with hashed path metadata only", async () => {
    const remove = vi.fn(async () => ({ error: null }));
    const database = new FakeD1Database();

    const storage = createUploadCleanupStorageFromProvider({
      uploadObject: vi.fn(),
      removeObjects: remove,
      downloadObject: vi.fn(),
      createSignedReadUrl: vi.fn(),
      getPublicUrl: vi.fn(),
    });
    const eventWriter = createUploadCleanupEventWriter(database);
    const result = await runUploadCleanupJob({
      records: [attachmentRecord()],
      storage,
      eventWriter,
      now: NOW,
      runId: "cleanup-run-provider-adapter",
    });

    expect(remove).toHaveBeenCalledWith("component-attachments", [ATTACHMENT_PATH]);
    expect(database.runStatements).toHaveLength(2);
    expect(database.runStatements[0]?.values).toEqual([
      expect.any(String),
      SESSION_ID,
      ASSET_ID,
      WORKSPACE_ID,
      USER_ID,
      "cleanup_queued",
      expect.any(String),
      expect.any(String),
    ]);
    expect(JSON.parse(database.runStatements[0]?.values[6] as string)).toEqual(expect.objectContaining({
        cleanupRunId: "cleanup-run-provider-adapter",
        storageBucket: "component-attachments",
        storagePathRecorded: false,
      }));
    expect(JSON.stringify(database.runStatements.map((statement) => statement.values))).not.toContain(ATTACHMENT_PATH);
    expect(result.audit.eventTypes).toEqual({
      cleanup_queued: 1,
      cleanup_failed: 0,
      cleanup_succeeded: 1,
    });
  });
});
