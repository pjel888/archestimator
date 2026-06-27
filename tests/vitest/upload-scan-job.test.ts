import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createSupabaseUploadScanStorage,
  createUploadScanResultWriter,
  listUploadScanJobRecords,
  runUploadScanJob,
  type UploadScanJobRecord,
} from "@/lib/uploads/scan-job";
import {
  setUploadOperationalTelemetrySink,
  type UploadOperationalTelemetryRecord,
} from "@/lib/uploads/operational-telemetry";

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const SESSION_ID = "33333333-3333-4333-8333-333333333333";
const ASSET_ID = "44444444-4444-4444-8444-444444444444";
const CHECKSUM_SHA256 = "a".repeat(64);
const ATTACHMENT_PATH = `${WORKSPACE_ID}/${USER_ID}/scan-job-proof.pdf`;

function scanRecord(overrides: Partial<UploadScanJobRecord> = {}): UploadScanJobRecord {
  return {
    assetId: ASSET_ID,
    uploadSessionId: SESSION_ID,
    workspaceId: WORKSPACE_ID,
    actorUserId: USER_ID,
    bucket: "component-attachments",
    path: ATTACHMENT_PATH,
    fileName: "scan-job-proof.pdf",
    contentType: "application/pdf",
    sizeBytes: 3,
    checksumSha256: CHECKSUM_SHA256,
    scanStatus: "pending",
    ...overrides,
  };
}

function createThenableQuery<T>(data: T[]) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: (resolve: (value: { data: T[]; error: null }) => unknown, reject: (reason: unknown) => unknown) => {
      return Promise.resolve({ data, error: null }).then(resolve, reject);
    },
  };

  return query;
}

describe("upload scan job runner", () => {
  afterEach(() => {
    setUploadOperationalTelemetrySink(null);
  });

  it("lists finalized pending or retryable component attachment assets for scanning", async () => {
    const query = createThenableQuery([{
      id: ASSET_ID,
      upload_session_id: SESSION_ID,
      workspace_id: WORKSPACE_ID,
      actor_user_id: USER_ID,
      storage_bucket: "component-attachments",
      storage_path: ATTACHMENT_PATH,
      file_name: "scan-job-proof.pdf",
      content_type: "application/pdf",
      size_bytes: 3,
      checksum_sha256: CHECKSUM_SHA256,
      scan_status: "pending",
    }, {
      id: "55555555-5555-4555-8555-555555555555",
      upload_session_id: SESSION_ID,
      workspace_id: WORKSPACE_ID,
      actor_user_id: USER_ID,
      storage_bucket: "component-attachments",
      storage_path: `${WORKSPACE_ID}/${USER_ID}/retry-proof.pdf`,
      file_name: "retry-proof.pdf",
      content_type: "application/pdf",
      size_bytes: 4,
      checksum_sha256: null,
      scan_status: "failed_transient",
    }, {
      id: "66666666-6666-4666-8666-666666666666",
      upload_session_id: SESSION_ID,
      workspace_id: WORKSPACE_ID,
      actor_user_id: USER_ID,
      storage_bucket: "component-attachments",
      storage_path: `${WORKSPACE_ID}/${USER_ID}/already-clean.pdf`,
      file_name: "already-clean.pdf",
      content_type: "application/pdf",
      size_bytes: 5,
      checksum_sha256: null,
      scan_status: "clean",
    }]);
    const client = {
      from: vi.fn(() => query),
    };

    const records = await listUploadScanJobRecords(client, { limit: 900 });

    expect(client.from).toHaveBeenCalledWith("upload_assets");
    expect(query.select).toHaveBeenCalledWith("id, upload_session_id, workspace_id, actor_user_id, storage_bucket, storage_path, file_name, content_type, size_bytes, checksum_sha256, scan_status");
    expect(query.eq).toHaveBeenCalledWith("surface", "component-attachment");
    expect(query.eq).toHaveBeenCalledWith("status", "finalized");
    expect(query.in).toHaveBeenCalledWith("scan_status", ["pending", "failed_transient"]);
    expect(query.order).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(query.limit).toHaveBeenCalledWith(500);
    expect(records).toEqual([
      expect.objectContaining({
        assetId: ASSET_ID,
        bucket: "component-attachments",
        path: ATTACHMENT_PATH,
        checksumSha256: CHECKSUM_SHA256,
        scanStatus: "pending",
      }),
      expect.objectContaining({
        assetId: "55555555-5555-4555-8555-555555555555",
        scanStatus: "failed_transient",
      }),
    ]);
  });

  it("downloads bytes, runs the injected scanner, and records checksum-bound scan results without paths", async () => {
    const writes: Array<Parameters<ReturnType<typeof createUploadScanResultWriter>["record"]>[0]> = [];
    const storage = {
      download: vi.fn(async () => ({
        bytes: new Uint8Array([1, 2, 3]),
        contentType: "application/pdf",
        sizeBytes: 3,
      })),
    };
    const scanner = {
      scan: vi.fn(async (input: {
        assetId: string;
        fileName: string;
        contentType: string;
        sizeBytes: number;
        bytes: Uint8Array;
      }) => {
        expect(input).toEqual({
          assetId: ASSET_ID,
          fileName: "scan-job-proof.pdf",
          contentType: "application/pdf",
          sizeBytes: 3,
          bytes: new Uint8Array([1, 2, 3]),
        });
        return {
          outcome: "clean" as const,
          provider: "fixture-scanner",
          result: { engineVersion: "test-1" },
        };
      }),
    };
    const resultWriter = {
      record: vi.fn(async (input: Parameters<ReturnType<typeof createUploadScanResultWriter>["record"]>[0]) => {
        writes.push(input);
      }),
    };

    const result = await runUploadScanJob({
      records: [scanRecord()],
      storage,
      scanner,
      resultWriter,
      runId: "scan-run-clean",
    });

    expect(result).toEqual({
      runId: "scan-run-clean",
      scannedCount: 1,
      writeFailedCount: 0,
      downloadFailedCount: 0,
      scannerFailedCount: 0,
      outcomeCounts: {
        clean: 1,
        infected: 0,
        unsupported: 0,
        failed_transient: 0,
        failed_permanent: 0,
      },
    });
    expect(storage.download).toHaveBeenCalledWith({ bucket: "component-attachments", path: ATTACHMENT_PATH });
    expect(writes).toEqual([{
      assetId: ASSET_ID,
      expectedChecksumSha256: CHECKSUM_SHA256,
      provider: "fixture-scanner",
      status: "clean",
      result: {
        engineVersion: "test-1",
        scanJobRunId: "scan-run-clean",
      },
    }]);
    expect(JSON.stringify(writes)).not.toContain(ATTACHMENT_PATH);
  });

  it("emits one path-safe operational telemetry record per scan run", async () => {
    const failedPath = `${WORKSPACE_ID}/${USER_ID}/telemetry-download-failed.pdf`;
    const telemetry: UploadOperationalTelemetryRecord[] = [];
    setUploadOperationalTelemetrySink((record) => telemetry.push(record));
    const storage = {
      download: vi.fn(async (target: { path: string }) => {
        if (target.path === failedPath) {
          throw new Error(`provider timeout for ${failedPath}`);
        }

        return { bytes: new Uint8Array([1, 2, 3]) };
      }),
    };
    const scanner = {
      scan: vi.fn(async () => ({
        outcome: "clean" as const,
        provider: "fixture-scanner",
      })),
    };
    const resultWriter = {
      record: vi.fn(async () => undefined),
    };

    await runUploadScanJob({
      records: [
        scanRecord({ assetId: "55555555-5555-4555-8555-555555555555", path: ATTACHMENT_PATH }),
        scanRecord({ assetId: "66666666-6666-4666-8666-666666666666", path: failedPath, fileName: "telemetry-download-failed.pdf" }),
      ],
      storage,
      scanner,
      resultWriter,
      runId: "scan-run-telemetry",
    });

    expect(telemetry).toEqual([{
      schemaVersion: "v1",
      event: "upload_scan_job_completed",
      source: "scan-job",
      surface: "component-attachment",
      status: "attention",
      severity: "warning",
      scanRunId: "scan-run-telemetry",
      scanResultsRecorded: 2,
      scanDownloadFailures: 1,
      scanProviderFailures: 0,
      scanResultWriteFailures: 0,
      scanOutcomeCounts: {
        clean: 1,
        infected: 0,
        unsupported: 0,
        failed_transient: 1,
        failed_permanent: 0,
      },
      scanAlertCodes: ["scan_download_failures", "scan_transient_failures"],
    }]);
    expect(JSON.stringify(telemetry)).not.toContain(failedPath);
    expect(JSON.stringify(telemetry)).not.toContain(ATTACHMENT_PATH);
  });

  it("records path-safe transient failures for storage and scanner exceptions", async () => {
    const downloadFailurePath = `${WORKSPACE_ID}/${USER_ID}/download-failed.pdf`;
    const scannerFailurePath = `${WORKSPACE_ID}/${USER_ID}/scanner-failed.pdf`;
    const writes: Array<Parameters<ReturnType<typeof createUploadScanResultWriter>["record"]>[0]> = [];
    const storage = {
      download: vi.fn(async (target: { path: string }) => {
        if (target.path === downloadFailurePath) {
          throw new Error(`storage timeout while downloading ${downloadFailurePath}`);
        }

        return { bytes: new Uint8Array([4, 5, 6]) };
      }),
    };
    const scanner = {
      scan: vi.fn(async () => {
        throw new Error("scanner crashed while reading scanner-failed.pdf");
      }),
    };
    const resultWriter = {
      record: vi.fn(async (input: Parameters<ReturnType<typeof createUploadScanResultWriter>["record"]>[0]) => {
        writes.push(input);
      }),
    };

    const result = await runUploadScanJob({
      records: [
        scanRecord({ assetId: "55555555-5555-4555-8555-555555555555", path: downloadFailurePath, fileName: "download-failed.pdf" }),
        scanRecord({ assetId: "66666666-6666-4666-8666-666666666666", path: scannerFailurePath, fileName: "scanner-failed.pdf" }),
      ],
      storage,
      scanner,
      resultWriter,
      runId: "scan-run-failures",
    });

    expect(result).toMatchObject({
      scannedCount: 2,
      writeFailedCount: 0,
      downloadFailedCount: 1,
      scannerFailedCount: 1,
      outcomeCounts: {
        failed_transient: 2,
      },
    });
    expect(scanner.scan).toHaveBeenCalledTimes(1);
    expect(writes).toEqual([
      expect.objectContaining({
        assetId: "55555555-5555-4555-8555-555555555555",
        provider: "archestimator-upload-scan-job",
        status: "failed_transient",
        result: expect.objectContaining({
          reason: "storage_download_failed",
          failureMessageSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
          scanJobRunId: "scan-run-failures",
        }),
      }),
      expect.objectContaining({
        assetId: "66666666-6666-4666-8666-666666666666",
        provider: "archestimator-upload-scan-job",
        status: "failed_transient",
        result: expect.objectContaining({
          reason: "scanner_failed",
          failureMessageSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
          scanJobRunId: "scan-run-failures",
        }),
      }),
    ]);
    const serializedWrites = JSON.stringify(writes);
    expect(serializedWrites).not.toContain(downloadFailurePath);
    expect(serializedWrites).not.toContain(scannerFailurePath);
    expect(serializedWrites).not.toContain("scanner-failed.pdf");
  });

  it("provides Supabase storage and scanner result RPC adapters", async () => {
    const download = vi.fn(async () => ({ data: new Uint8Array([7, 8, 9]), error: null }));
    const rpc = vi.fn(async () => ({ error: null }));
    const client = {
      storage: {
        from: vi.fn(() => ({ download })),
      },
      rpc,
    };

    const storage = createSupabaseUploadScanStorage(client);
    const object = await storage.download({ bucket: "component-attachments", path: ATTACHMENT_PATH });

    expect(client.storage.from).toHaveBeenCalledWith("component-attachments");
    expect(download).toHaveBeenCalledWith(ATTACHMENT_PATH);
    expect(object).toEqual({ bytes: new Uint8Array([7, 8, 9]) });

    const resultWriter = createUploadScanResultWriter(client);
    await resultWriter.record({
      assetId: ASSET_ID,
      expectedChecksumSha256: CHECKSUM_SHA256,
      provider: "fixture-scanner",
      status: "clean",
      result: { scanJobRunId: "scan-run-adapter" },
    });

    expect(rpc).toHaveBeenCalledWith("record_upload_scan_result", {
      target_asset_id: ASSET_ID,
      expected_checksum_sha256: CHECKSUM_SHA256,
      scanner_provider: "fixture-scanner",
      scanner_status: "clean",
      scanner_result: { scanJobRunId: "scan-run-adapter" },
    });
  });
});
