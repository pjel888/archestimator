import { createHash, randomUUID } from "node:crypto";

import { reportUploadScanJobTelemetry } from "./operational-telemetry";
import type { UploadScanProviderOutcome, UploadScanStatus } from "./scanning";
import type { UploadStorageProvider } from "./storage-provider";

const DEFAULT_UPLOAD_SCAN_JOB_LIMIT = 100;
const MAX_UPLOAD_SCAN_JOB_LIMIT = 500;

export type UploadScanJobRecord = {
  assetId: string;
  uploadSessionId: string | null;
  workspaceId: string;
  actorUserId: string | null;
  bucket: string;
  path: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string | null;
  scanStatus: Extract<UploadScanStatus, "pending" | "failed_transient">;
};

export type UploadScanJobTarget = Pick<UploadScanJobRecord, "bucket" | "path">;

export type UploadScanObject = {
  bytes: Uint8Array;
  contentType?: string | null;
  sizeBytes?: number | null;
};

export type UploadScanStorage = {
  download: (target: UploadScanJobTarget) => Promise<UploadScanObject>;
};

export type UploadScannerProvider = {
  scan: (input: {
    assetId: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    bytes: Uint8Array;
  }) => Promise<UploadScanProviderOutcome>;
};

export type UploadScanResultStatus = Exclude<UploadScanStatus, "not_required" | "pending" | "override_approved">;

export type UploadScanResultWriter = {
  record: (input: {
    assetId: string;
    expectedChecksumSha256: string | null;
    provider: string;
    status: UploadScanResultStatus;
    result: Record<string, unknown>;
  }) => Promise<void>;
};

export type UploadScanJobResult = {
  runId: string;
  scannedCount: number;
  writeFailedCount: number;
  downloadFailedCount: number;
  scannerFailedCount: number;
  outcomeCounts: Record<UploadScanResultStatus, number>;
};

type UploadScanError = {
  message?: string | null;
};

type UploadStorageBucketClient = {
  download: (path: string) => PromiseLike<{ data: unknown; error: UploadScanError | null }>;
};

type UploadStorageClient = {
  storage: {
    from: (bucket: string) => UploadStorageBucketClient;
  };
};

type UploadScanRpcClient = {
  rpc: (
    functionName: "record_upload_scan_result",
    args: Record<string, unknown>,
  ) => PromiseLike<{ error: UploadScanError | null }>;
};

type UploadScanQueryResult<T> = {
  data: T[] | null;
  error: UploadScanError | null;
};

type UploadScanSelectQuery<T> = PromiseLike<UploadScanQueryResult<T>> & {
  select: (columns: string) => UploadScanSelectQuery<T>;
  eq: (column: string, value: unknown) => UploadScanSelectQuery<T>;
  in: (column: string, values: readonly string[]) => UploadScanSelectQuery<T>;
  order: (column: string, options?: { ascending?: boolean }) => UploadScanSelectQuery<T>;
  limit: (count: number) => UploadScanSelectQuery<T>;
};

type UploadScanReadClient = {
  from: (table: "upload_assets") => UploadScanSelectQuery<unknown>;
};

type UploadAssetScanRow = {
  id: string;
  upload_session_id: string | null;
  workspace_id: string;
  actor_user_id: string | null;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  checksum_sha256: string | null;
  scan_status: string;
};

function normalizeLimit(limit: number | undefined) {
  if (!Number.isFinite(limit ?? DEFAULT_UPLOAD_SCAN_JOB_LIMIT)) return DEFAULT_UPLOAD_SCAN_JOB_LIMIT;
  return Math.min(MAX_UPLOAD_SCAN_JOB_LIMIT, Math.max(1, Math.trunc(limit ?? DEFAULT_UPLOAD_SCAN_JOB_LIMIT)));
}

async function bytesFromDownload(data: unknown): Promise<Uint8Array> {
  if (data instanceof Uint8Array) return data;
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (Object.prototype.toString.call(data) === "[object ArrayBuffer]") return new Uint8Array(data as ArrayBuffer);

  if (
    data
    && typeof data === "object"
    && "arrayBuffer" in data
    && typeof (data as { arrayBuffer?: unknown }).arrayBuffer === "function"
  ) {
    return new Uint8Array(await (data as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer());
  }

  throw new Error("Storage download did not return bytes.");
}

function failureMessageSha256(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "Upload scan job failed.");
  return createHash("sha256").update(message).digest("hex");
}

function failureOutcome(
  reason: "storage_download_failed" | "scanner_failed",
  error: unknown,
): UploadScanProviderOutcome {
  return {
    outcome: "failed_transient",
    provider: "archestimator-upload-scan-job",
    reason,
    result: {
      reason,
      failureMessageSha256: failureMessageSha256(error),
    },
  };
}

function scanResultStatus(outcome: UploadScanProviderOutcome): UploadScanResultStatus {
  return outcome.outcome;
}

function scanResultMetadata(outcome: UploadScanProviderOutcome, runId: string): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    ...(outcome.result ?? {}),
    scanJobRunId: runId,
  };

  if ("signature" in outcome && outcome.signature) {
    metadata.signature = outcome.signature;
  }
  if ("reason" in outcome && outcome.reason) {
    metadata.reason = outcome.reason;
  }

  return metadata;
}

function emptyOutcomeCounts(): Record<UploadScanResultStatus, number> {
  return {
    clean: 0,
    infected: 0,
    unsupported: 0,
    failed_transient: 0,
    failed_permanent: 0,
  };
}

function rowToRecord(row: UploadAssetScanRow): UploadScanJobRecord | null {
  if (row.scan_status !== "pending" && row.scan_status !== "failed_transient") return null;

  return {
    assetId: row.id,
    uploadSessionId: row.upload_session_id,
    workspaceId: row.workspace_id,
    actorUserId: row.actor_user_id,
    bucket: row.storage_bucket,
    path: row.storage_path,
    fileName: row.file_name,
    contentType: row.content_type,
    sizeBytes: Number(row.size_bytes),
    checksumSha256: row.checksum_sha256,
    scanStatus: row.scan_status,
  };
}

function assertUploadAssetRows(data: unknown): UploadAssetScanRow[] {
  return Array.isArray(data) ? data as UploadAssetScanRow[] : [];
}

export function createSupabaseUploadScanStorage(client: unknown): UploadScanStorage {
  return {
    async download(target) {
      const { data, error } = await (client as UploadStorageClient).storage.from(target.bucket).download(target.path);
      if (error) throw new Error(error.message ?? "Could not download upload asset for scanning.");

      return {
        bytes: await bytesFromDownload(data),
      };
    },
  };
}

export function createUploadScanStorageFromProvider(storageProvider: UploadStorageProvider): UploadScanStorage {
  return {
    async download(target) {
      const object = await storageProvider.downloadObject(target.bucket, target.path);

      return {
        bytes: await bytesFromDownload(object.body),
        contentType: object.contentType,
        sizeBytes: object.sizeBytes,
      };
    },
  };
}

export function createUploadScanResultWriter(client: unknown): UploadScanResultWriter {
  return {
    async record(input) {
      const { error } = await (client as UploadScanRpcClient).rpc("record_upload_scan_result", {
        target_asset_id: input.assetId,
        expected_checksum_sha256: input.expectedChecksumSha256,
        scanner_provider: input.provider,
        scanner_status: input.status,
        scanner_result: input.result,
      });

      if (error) throw new Error(error.message ?? "Could not record upload scan result.");
    },
  };
}

export async function listUploadScanJobRecords(
  client: unknown,
  options: { limit?: number } = {},
): Promise<UploadScanJobRecord[]> {
  const limit = normalizeLimit(options.limit);
  const readClient = client as UploadScanReadClient;
  const assetQuery = readClient.from("upload_assets") as UploadScanSelectQuery<UploadAssetScanRow>;

  const result = await assetQuery
    .select("id, upload_session_id, workspace_id, actor_user_id, storage_bucket, storage_path, file_name, content_type, size_bytes, checksum_sha256, scan_status")
    .eq("surface", "component-attachment")
    .eq("status", "finalized")
    .in("scan_status", ["pending", "failed_transient"])
    .order("created_at", { ascending: true })
    .limit(limit);

  if (result.error) throw new Error(result.error.message ?? "Could not read upload assets for scanning.");

  return assertUploadAssetRows(result.data).map(rowToRecord).filter((record): record is UploadScanJobRecord => Boolean(record));
}

export async function runUploadScanJob({
  records,
  storage,
  scanner,
  resultWriter,
  limit,
  runId = randomUUID(),
}: {
  records: readonly UploadScanJobRecord[];
  storage: UploadScanStorage;
  scanner: UploadScannerProvider;
  resultWriter: UploadScanResultWriter;
  limit?: number;
  runId?: string;
}): Promise<UploadScanJobResult> {
  const result: UploadScanJobResult = {
    runId,
    scannedCount: 0,
    writeFailedCount: 0,
    downloadFailedCount: 0,
    scannerFailedCount: 0,
    outcomeCounts: emptyOutcomeCounts(),
  };

  for (const record of records.slice(0, normalizeLimit(limit))) {
    let outcome: UploadScanProviderOutcome;

    try {
      const object = await storage.download({ bucket: record.bucket, path: record.path });
      try {
        outcome = await scanner.scan({
          assetId: record.assetId,
          fileName: record.fileName,
          contentType: object.contentType ?? record.contentType,
          sizeBytes: object.sizeBytes ?? record.sizeBytes,
          bytes: object.bytes,
        });
      } catch (error) {
        result.scannerFailedCount += 1;
        outcome = failureOutcome("scanner_failed", error);
      }
    } catch (error) {
      result.downloadFailedCount += 1;
      outcome = failureOutcome("storage_download_failed", error);
    }

    const status = scanResultStatus(outcome);

    try {
      await resultWriter.record({
        assetId: record.assetId,
        expectedChecksumSha256: record.checksumSha256,
        provider: outcome.provider,
        status,
        result: scanResultMetadata(outcome, runId),
      });
      result.scannedCount += 1;
      result.outcomeCounts[status] += 1;
    } catch {
      result.writeFailedCount += 1;
    }
  }

  reportUploadScanJobTelemetry(result);
  return result;
}
