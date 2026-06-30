import { createHash, randomUUID } from "node:crypto";

import type { D1DatabaseLike } from "@/lib/cloudflare/d1";

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

type UploadScanResultAssetRow = UploadAssetScanRow & {
  surface: string;
  status: string;
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

function scanResultEventType(status: UploadScanResultStatus) {
  if (status === "clean") return "scan_clean";
  if (status === "infected") return "scan_infected";
  if (status === "failed_transient") return "scan_failed_transient";
  if (status === "failed_permanent") return "scan_failed_permanent";
  return "scan_unsupported";
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

async function recordUploadScanResultInD1(
  db: D1DatabaseLike,
  input: Parameters<UploadScanResultWriter["record"]>[0],
) {
  const asset = await db
    .prepare<UploadScanResultAssetRow>(
      `
        SELECT id, upload_session_id, workspace_id, actor_user_id, surface, status, storage_bucket, storage_path, file_name, content_type, size_bytes, checksum_sha256, scan_status
        FROM upload_assets
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(input.assetId)
    .first<UploadScanResultAssetRow>();

  if (!asset) throw new Error("Upload asset was not found.");
  if (asset.surface !== "component-attachment") {
    throw new Error("Only component attachments can receive scanner results.");
  }
  if (asset.checksum_sha256 !== input.expectedChecksumSha256) {
    throw new Error("Scan result checksum does not match the uploaded asset.");
  }

  const now = new Date().toISOString();
  const scanResultJson = JSON.stringify(input.result ?? {});
  const updateResult = await db
    .prepare(
      `
        UPDATE upload_assets
        SET scan_status = ?,
            scan_provider = ?,
            scan_result_json = ?,
            scanned_at = ?,
            updated_at = ?
        WHERE id = ?
          AND surface = ?
          AND status = ?
          AND (
            (? IS NULL AND checksum_sha256 IS NULL)
            OR checksum_sha256 = ?
          )
      `,
    )
    .bind(
      input.status,
      input.provider.trim() || null,
      scanResultJson,
      now,
      now,
      input.assetId,
      "component-attachment",
      "finalized",
      input.expectedChecksumSha256,
      input.expectedChecksumSha256,
    )
    .run();

  if ((updateResult.meta?.changes ?? 0) < 1) {
    throw new Error("Could not record upload scan result.");
  }

  await db
    .prepare(
      `
        INSERT INTO upload_events (
          id,
          upload_session_id,
          upload_asset_id,
          workspace_id,
          actor_user_id,
          event_type,
          metadata_json,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      randomUUID(),
      asset.upload_session_id,
      asset.id,
      asset.workspace_id,
      asset.actor_user_id,
      scanResultEventType(input.status),
      JSON.stringify({
        scanProvider: input.provider,
        scanStatus: input.status,
        scanResult: input.result ?? {},
      }),
      now,
    )
    .run();
}

export function createUploadScanResultWriter(db: D1DatabaseLike): UploadScanResultWriter {
  return {
    async record(input) {
      await recordUploadScanResultInD1(db, input);
    },
  };
}

export async function listUploadScanJobRecords(
  db: D1DatabaseLike,
  options: { limit?: number } = {},
): Promise<UploadScanJobRecord[]> {
  const limit = normalizeLimit(options.limit);
  const result = await db
    .prepare<UploadAssetScanRow>(
      `
        SELECT id, upload_session_id, workspace_id, actor_user_id, storage_bucket, storage_path, file_name, content_type, size_bytes, checksum_sha256, scan_status
        FROM upload_assets
        WHERE surface = ?
          AND status = ?
          AND scan_status IN (?, ?)
        ORDER BY created_at ASC
        LIMIT ?
      `,
    )
    .bind("component-attachment", "finalized", "pending", "failed_transient", limit)
    .all<UploadAssetScanRow>();

  if (result.success === false) throw new Error("Could not read upload assets for scanning.");

  return assertUploadAssetRows(result.results ?? []).map(rowToRecord).filter((record): record is UploadScanJobRecord => Boolean(record));
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
