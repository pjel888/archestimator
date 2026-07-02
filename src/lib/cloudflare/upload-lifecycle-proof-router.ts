import { createHash } from "node:crypto";

import type { D1DatabaseLike, D1Value } from "@/lib/cloudflare/d1";
import { createRuntimeUploadStorageProvider } from "@/lib/uploads/runtime-storage-provider";
import type { CloudflareR2UploadBucket } from "@/lib/uploads/r2-storage-provider";
import { createUploadPolicyScannerProvider } from "@/lib/uploads/policy-scanner";
import {
  createUploadScanStorageFromProvider,
  createUploadScanResultWriter,
  listUploadScanJobRecords,
  runUploadScanJob,
} from "@/lib/uploads/scan-job";
import { recordUploadAsset } from "@/lib/uploads/upload-records";

export type CloudflareUploadLifecycleProofEnv = {
  ARCH_DB?: D1DatabaseLike;
  ARCH_UPLOADS_R2?: CloudflareR2UploadBucket;
  CRON_SECRET?: string;
};

type CleanupCounts = {
  workspaces: number;
  profiles: number;
  workspaceMembers: number;
  uploadSessions: number;
  uploadAssets: number;
  uploadEvents: number;
  attachments: number;
};

const INTERNAL_API_PATH = "/api/internal/upload-lifecycle-proof";
const PROOF_PATH = "/__cloudflare/upload-lifecycle-proof";
const PROOF_PATHS = new Set([INTERNAL_API_PATH, PROOF_PATH]);
const PROOF_PREFIX = "codex-upload-proof-";
const EMAIL_DOMAIN = "example.invalid";
const COMPONENT_ATTACHMENT_BUCKET = "component-attachments";
const PDF_BYTES = new TextEncoder().encode("%PDF-1.7\n% Codex Cloudflare upload lifecycle proof\n1 0 obj\n<<>>\nendobj\n%%EOF\n");
const CONTENT_TYPE = "application/pdf";
const NO_STORE_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function isAuthorized(request: Request, env: CloudflareUploadLifecycleProofEnv) {
  const secret = env.CRON_SECRET?.trim();
  if (!secret) return "missing-secret";
  return request.headers.get("authorization") === `Bearer ${secret}` ? "authorized" : "unauthorized";
}

function nowIso(offsetMs = 0) {
  return new Date(Date.now() + offsetMs).toISOString();
}

function proofId(label: string, runId: string) {
  return `${PROOF_PREFIX}${label}-${runId}`;
}

function proofEmail(label: string, runId: string) {
  return `${PROOF_PREFIX}${label}-${runId}@${EMAIL_DOMAIN}`;
}

function sha256Hex(bytes: Uint8Array | string) {
  return createHash("sha256").update(bytes).digest("hex");
}

function bytesFromDownloadBody(body: ArrayBuffer) {
  return new Uint8Array(body);
}

async function runStatement(db: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  return db.prepare(sql).bind(...values).run();
}

async function firstRow<T extends Record<string, unknown>>(
  db: D1DatabaseLike,
  sql: string,
  values: D1Value[] = [],
) {
  return db.prepare<T>(sql).bind(...values).first<T>();
}

async function allRows<T extends Record<string, unknown>>(
  db: D1DatabaseLike,
  sql: string,
  values: D1Value[] = [],
) {
  const result = await db.prepare<T>(sql).bind(...values).all<T>();
  return result.results ?? [];
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function emptyCleanupCounts(): CleanupCounts {
  return {
    workspaces: 0,
    profiles: 0,
    workspaceMembers: 0,
    uploadSessions: 0,
    uploadAssets: 0,
    uploadEvents: 0,
    attachments: 0,
  };
}

async function proofStoragePaths(db: D1DatabaseLike) {
  const idLike = `${PROOF_PREFIX}%`;
  const rows = await allRows<{ storage_path: string | null }>(
    db,
    `
      SELECT storage_path FROM upload_sessions WHERE id LIKE ? OR workspace_id LIKE ? OR actor_user_id LIKE ? OR storage_path LIKE ?
      UNION
      SELECT storage_path FROM upload_assets WHERE id LIKE ? OR upload_session_id LIKE ? OR workspace_id LIKE ? OR actor_user_id LIKE ? OR storage_path LIKE ?
      UNION
      SELECT storage_path FROM cost_library_item_variant_attachments WHERE id LIKE ? OR workspace_id LIKE ? OR storage_path LIKE ?
    `,
    [
      idLike, idLike, idLike, idLike,
      idLike, idLike, idLike, idLike, idLike,
      idLike, idLike, idLike,
    ],
  );
  return [...new Set(rows.map((row) => row.storage_path).filter((path): path is string => Boolean(path)))];
}

async function countProofRows(db: D1DatabaseLike): Promise<CleanupCounts> {
  const idLike = `${PROOF_PREFIX}%`;
  const emailLike = `${PROOF_PREFIX}%@${EMAIL_DOMAIN}`;
  const row = await firstRow<Record<keyof CleanupCounts, number>>(
    db,
    `
      SELECT
        (SELECT COUNT(*) FROM workspaces WHERE id LIKE ? OR slug LIKE ? OR name LIKE ?) AS workspaces,
        (SELECT COUNT(*) FROM profiles WHERE id LIKE ? OR email LIKE ?) AS profiles,
        (SELECT COUNT(*) FROM workspace_members WHERE workspace_id LIKE ? OR user_id LIKE ?) AS workspaceMembers,
        (SELECT COUNT(*) FROM upload_sessions WHERE id LIKE ? OR workspace_id LIKE ? OR actor_user_id LIKE ? OR storage_path LIKE ?) AS uploadSessions,
        (SELECT COUNT(*) FROM upload_assets WHERE id LIKE ? OR upload_session_id LIKE ? OR workspace_id LIKE ? OR actor_user_id LIKE ? OR storage_path LIKE ?) AS uploadAssets,
        (SELECT COUNT(*) FROM upload_events WHERE upload_session_id LIKE ? OR upload_asset_id LIKE ? OR workspace_id LIKE ? OR actor_user_id LIKE ?) AS uploadEvents,
        (SELECT COUNT(*) FROM cost_library_item_variant_attachments WHERE id LIKE ? OR workspace_id LIKE ? OR storage_path LIKE ? OR created_by LIKE ?) AS attachments
    `,
    [
      idLike, idLike, idLike,
      idLike, emailLike,
      idLike, idLike,
      idLike, idLike, idLike, idLike,
      idLike, idLike, idLike, idLike, idLike,
      idLike, idLike, idLike, idLike,
      idLike, idLike, idLike, idLike,
    ],
  );

  return {
    ...emptyCleanupCounts(),
    ...Object.fromEntries(
      Object.keys(emptyCleanupCounts()).map((key) => [key, numberValue(row?.[key as keyof CleanupCounts])]),
    ),
  };
}

function cleanupPassed(counts: CleanupCounts) {
  return Object.values(counts).every((value) => value === 0);
}

async function cleanupProofRows(db: D1DatabaseLike, storageProvider?: Awaited<ReturnType<typeof createRuntimeUploadStorageProvider>> | null) {
  const idLike = `${PROOF_PREFIX}%`;
  const emailLike = `${PROOF_PREFIX}%@${EMAIL_DOMAIN}`;
  const paths = await proofStoragePaths(db);
  if (storageProvider && paths.length > 0) {
    await storageProvider.removeObjects(COMPONENT_ATTACHMENT_BUCKET, paths).catch(() => undefined);
  }

  await runStatement(
    db,
    `
      DELETE FROM upload_events
      WHERE upload_session_id LIKE ?
        OR upload_asset_id LIKE ?
        OR workspace_id LIKE ?
        OR actor_user_id LIKE ?
    `,
    [idLike, idLike, idLike, idLike],
  );
  await runStatement(
    db,
    `
      DELETE FROM cost_library_item_variant_attachments
      WHERE id LIKE ?
        OR workspace_id LIKE ?
        OR storage_path LIKE ?
        OR created_by LIKE ?
    `,
    [idLike, idLike, idLike, idLike],
  );
  await runStatement(
    db,
    `
      DELETE FROM upload_assets
      WHERE id LIKE ?
        OR upload_session_id LIKE ?
        OR workspace_id LIKE ?
        OR actor_user_id LIKE ?
        OR storage_path LIKE ?
    `,
    [idLike, idLike, idLike, idLike, idLike],
  );
  await runStatement(
    db,
    `
      DELETE FROM upload_sessions
      WHERE id LIKE ?
        OR workspace_id LIKE ?
        OR actor_user_id LIKE ?
        OR storage_path LIKE ?
    `,
    [idLike, idLike, idLike, idLike],
  );
  await runStatement(db, "DELETE FROM workspace_members WHERE workspace_id LIKE ? OR user_id LIKE ?", [idLike, idLike]);
  await runStatement(db, "DELETE FROM profiles WHERE id LIKE ? OR email LIKE ?", [idLike, emailLike]);
  await runStatement(db, "DELETE FROM workspaces WHERE id LIKE ? OR slug LIKE ? OR name LIKE ?", [idLike, idLike, idLike]);
}

async function seedWorkspaceFixture(db: D1DatabaseLike, runId: string) {
  const now = nowIso();
  const workspaceId = proofId("workspace", runId);
  const userId = proofId("user", runId);
  const email = proofEmail("user", runId);

  await runStatement(
    db,
    "INSERT INTO workspaces (id, name, slug, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    [workspaceId, proofId("workspace", runId), workspaceId, userId, now, now],
  );
  await runStatement(
    db,
    "INSERT INTO profiles (id, email, display_name, role, default_workspace_id, avatar_url, created_at, updated_at) VALUES (?, ?, ?, 'member', ?, NULL, ?, ?)",
    [userId, email, "Codex Upload Proof User", workspaceId, now, now],
  );
  await runStatement(
    db,
    "INSERT INTO workspace_members (workspace_id, user_id, role, created_at, updated_at) VALUES (?, ?, 'owner', ?, ?)",
    [workspaceId, userId, now, now],
  );

  return { workspaceId, userId };
}

async function insertApprovedAttachment(db: D1DatabaseLike, input: {
  attachmentId: string;
  workspaceId: string;
  userId: string;
  path: string;
  fileName: string;
  sizeBytes: number;
}) {
  const now = nowIso();
  await runStatement(
    db,
    `
      INSERT INTO cost_library_item_variant_attachments (
        id, price_option_id, item_id, workspace_id, storage_bucket, storage_path,
        file_name, content_type, size_bytes, attachment_kind, metadata_json,
        created_by, review_status, applicable_cost_entry_id, is_current_approved,
        reviewed_by, reviewed_at, review_note, superseded_by, review_revision,
        created_at, updated_at
      )
      VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, ?, 'pdf', ?, ?, 'approved', NULL, 1, ?, ?, 'Cloudflare upload lifecycle proof', NULL, 1, ?, ?)
    `,
    [
      input.attachmentId,
      input.workspaceId,
      COMPONENT_ATTACHMENT_BUCKET,
      input.path,
      input.fileName,
      CONTENT_TYPE,
      input.sizeBytes,
      JSON.stringify({ proof: "cloudflare-upload-lifecycle-proof" }),
      input.userId,
      input.userId,
      now,
      now,
      now,
    ],
  );
}

async function readScanReadback(db: D1DatabaseLike, assetId: string) {
  const asset = await firstRow<{
    id: string;
    scan_status: string | null;
    scan_provider: string | null;
    scan_result_json: string | null;
    scanned_at: string | null;
    checksum_sha256: string | null;
  }>(
    db,
    "SELECT id, scan_status, scan_provider, scan_result_json, scanned_at, checksum_sha256 FROM upload_assets WHERE id = ?",
    [assetId],
  );
  const eventRows = await allRows<{ event_type: string }>(
    db,
    "SELECT event_type FROM upload_events WHERE upload_asset_id = ? ORDER BY created_at ASC",
    [assetId],
  );
  let resultKeys: string[] = [];
  try {
    resultKeys = Object.keys(JSON.parse(asset?.scan_result_json ?? "{}")).sort();
  } catch {
    resultKeys = [];
  }

  return {
    scanStatus: asset?.scan_status ?? null,
    scanProvider: asset?.scan_provider ?? null,
    scannedAtPresent: Boolean(asset?.scanned_at),
    checksumMatches: asset?.checksum_sha256 === sha256Hex(PDF_BYTES),
    scanResultKeys: resultKeys,
    eventTypes: eventRows.map((row) => row.event_type),
  };
}

async function readAttachmentEligibility(db: D1DatabaseLike, attachmentId: string, path: string) {
  const row = await firstRow<{
    attachment_id: string;
    review_status: string;
    is_current_approved: number;
    asset_status: string;
    scan_status: string;
  }>(
    db,
    `
      SELECT
        a.id AS attachment_id,
        a.review_status,
        a.is_current_approved,
        u.status AS asset_status,
        u.scan_status
      FROM cost_library_item_variant_attachments a
      JOIN upload_assets u
        ON u.workspace_id = a.workspace_id
       AND u.storage_bucket = a.storage_bucket
       AND u.storage_path = a.storage_path
      WHERE a.id = ?
        AND a.storage_path = ?
      LIMIT 1
    `,
    [attachmentId, path],
  );

  return {
    attachmentPresent: Boolean(row?.attachment_id),
    approved: row?.review_status === "approved" && row?.is_current_approved === 1,
    finalizedCleanAssetPresent: row?.asset_status === "finalized" && row?.scan_status === "clean",
  };
}

async function runHostedUploadLifecycleProof(db: D1DatabaseLike, r2: CloudflareR2UploadBucket) {
  const runId = crypto.randomUUID().replace(/-/g, "");
  const fixture = {
    workspaceId: proofId("workspace", runId),
    userId: proofId("user", runId),
    fileName: proofId("attachment", runId) + ".pdf",
    attachmentId: proofId("attachment", runId),
  };
  const path = `${fixture.workspaceId}/${fixture.userId}/${proofId("object", runId)}.pdf`;
  const pathHash = sha256Hex(path);
  let cleanupBefore = emptyCleanupCounts();
  let cleanupAfter = emptyCleanupCounts();
  let error: string | null = null;
  let proof: Record<string, unknown> = {};
  const storageProvider = await createRuntimeUploadStorageProvider(undefined, {
    cloudflareEnv: { ARCH_UPLOADS_R2: r2 },
  });

  try {
    await cleanupProofRows(db, storageProvider);
    cleanupBefore = await countProofRows(db);
    const seeded = await seedWorkspaceFixture(db, runId);

    await storageProvider.uploadObject({
      bucket: COMPONENT_ATTACHMENT_BUCKET,
      path,
      body: PDF_BYTES,
      contentType: CONTENT_TYPE,
      cacheControl: "31536000",
    });
    const downloadedBeforeScan = await storageProvider.downloadObject(COMPONENT_ATTACHMENT_BUCKET, path);
    const downloadedBytes = bytesFromDownloadBody(downloadedBeforeScan.body);
    const storagePutReady = downloadedBeforeScan.contentType === CONTENT_TYPE
      && downloadedBytes.byteLength === PDF_BYTES.byteLength
      && sha256Hex(downloadedBytes) === sha256Hex(PDF_BYTES);

    const uploadRecord = await recordUploadAsset(db, {
      workspaceId: seeded.workspaceId,
      actorUserId: seeded.userId,
      surface: "component-attachment",
      targetEntityType: "component-library",
      targetEntityId: null,
      bucket: COMPONENT_ATTACHMENT_BUCKET,
      path,
      fileName: fixture.fileName,
      contentType: CONTENT_TYPE,
      sizeBytes: PDF_BYTES.byteLength,
      checksumBytes: PDF_BYTES,
      scanStatus: "pending",
      metadata: {
        proof: "cloudflare-upload-lifecycle-proof",
        objectPathHash: pathHash,
      },
    });

    const records = await listUploadScanJobRecords(db, { limit: 500 });
    const targetRecord = records.find((record) => record.assetId === uploadRecord.assetId) ?? null;
    const scanJob = targetRecord
      ? await runUploadScanJob({
        records: [targetRecord],
        storage: createUploadScanStorageFromProvider(storageProvider),
        scanner: createUploadPolicyScannerProvider(),
        resultWriter: createUploadScanResultWriter(db),
        runId: `upload-lifecycle-proof-${runId}`,
      })
      : null;
    const scanReadback = await readScanReadback(db, uploadRecord.assetId);

    await insertApprovedAttachment(db, {
      attachmentId: fixture.attachmentId,
      workspaceId: seeded.workspaceId,
      userId: seeded.userId,
      path,
      fileName: fixture.fileName,
      sizeBytes: PDF_BYTES.byteLength,
    });
    const attachmentEligibility = await readAttachmentEligibility(db, fixture.attachmentId, path);
    const downloadedAfterScan = await storageProvider.downloadObject(COMPONENT_ATTACHMENT_BUCKET, path);
    const downloadedAfterScanBytes = bytesFromDownloadBody(downloadedAfterScan.body);

    proof = {
      objectPathShape: "{workspaceId}/{userId}/codex-upload-proof-object-{runId}.pdf",
      objectPathHash: pathHash,
      storagePut: {
        passed: storagePutReady,
        contentType: downloadedBeforeScan.contentType ?? null,
        sizeBytes: downloadedBytes.byteLength,
        checksumMatches: sha256Hex(downloadedBytes) === sha256Hex(PDF_BYTES),
      },
      uploadAssetRecord: {
        passed: Boolean(uploadRecord.uploadSessionId) && Boolean(uploadRecord.assetId) && uploadRecord.scanStatus === "pending",
        uploadSessionIdPresent: Boolean(uploadRecord.uploadSessionId),
        assetIdPresent: Boolean(uploadRecord.assetId),
        initialScanStatus: uploadRecord.scanStatus,
      },
      scanQueue: {
        passed: Boolean(targetRecord),
        listedRecordCount: records.length,
        targetRecordFound: Boolean(targetRecord),
      },
      scanJob: {
        passed: scanJob?.scannedCount === 1
          && scanJob.writeFailedCount === 0
          && scanJob.downloadFailedCount === 0
          && scanJob.scannerFailedCount === 0
          && scanJob.outcomeCounts.clean === 1,
        scannedCount: scanJob?.scannedCount ?? 0,
        writeFailedCount: scanJob?.writeFailedCount ?? 0,
        downloadFailedCount: scanJob?.downloadFailedCount ?? 0,
        scannerFailedCount: scanJob?.scannerFailedCount ?? 0,
        outcomeCounts: scanJob?.outcomeCounts ?? null,
      },
      scanReadback: {
        passed: scanReadback.scanStatus === "clean"
          && scanReadback.scanProvider === "archestimator-policy-scanner"
          && scanReadback.scannedAtPresent
          && scanReadback.checksumMatches
          && scanReadback.eventTypes.includes("scan_clean"),
        ...scanReadback,
      },
      attachmentDownloadEligibility: {
        passed: attachmentEligibility.attachmentPresent
          && attachmentEligibility.approved
          && attachmentEligibility.finalizedCleanAssetPresent
          && downloadedAfterScanBytes.byteLength === PDF_BYTES.byteLength
          && sha256Hex(downloadedAfterScanBytes) === sha256Hex(PDF_BYTES),
        ...attachmentEligibility,
        storageBytesReadable: downloadedAfterScanBytes.byteLength === PDF_BYTES.byteLength,
        storageChecksumMatches: sha256Hex(downloadedAfterScanBytes) === sha256Hex(PDF_BYTES),
      },
    };
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  } finally {
    await cleanupProofRows(db, storageProvider);
    cleanupAfter = await countProofRows(db);
  }

  const readiness = {
    d1BindingPresent: true,
    r2BindingPresent: true,
    storagePutReady: (proof.storagePut as { passed?: boolean } | undefined)?.passed === true,
    uploadAssetRecorded: (proof.uploadAssetRecord as { passed?: boolean } | undefined)?.passed === true,
    scanQueueListed: (proof.scanQueue as { passed?: boolean } | undefined)?.passed === true,
    scanJobRan: (proof.scanJob as { passed?: boolean } | undefined)?.passed === true,
    scanResultPersisted: (proof.scanReadback as { passed?: boolean } | undefined)?.passed === true,
    attachmentDownloadEligible: (proof.attachmentDownloadEligibility as { passed?: boolean } | undefined)?.passed === true,
    cleanupReady: cleanupPassed(cleanupAfter),
  };
  const hostedUploadLifecycleReady = Object.values(readiness).every(Boolean) && !error;

  return {
    generatedAt: nowIso(),
    mode: "cloudflare-hosted-upload-lifecycle-proof",
    proofSurface: INTERNAL_API_PATH,
    readiness: {
      ...readiness,
      hostedUploadLifecycleReady,
    },
    proof,
    cleanupBefore,
    cleanupAfter,
    passed: hostedUploadLifecycleReady,
    error,
    note: "Secret-gated hosted proof. It creates only codex-upload-proof-* fixtures, writes one tiny synthetic PDF to Cloudflare R2, records/finalizes Cloudflare D1 upload metadata, runs the Worker scanner path against the R2 object, verifies persisted clean scan state and approved attachment eligibility, then deletes exact synthetic D1 rows and R2 objects. It does not return raw R2 keys, uploaded bytes, bearer secrets, session cookies, or real customer/project data.",
  };
}

export async function routeCloudflareUploadLifecycleProofRequest(
  request: Request,
  env: CloudflareUploadLifecycleProofEnv,
) {
  const url = new URL(request.url);
  if (!PROOF_PATHS.has(url.pathname)) return null;

  const authorization = isAuthorized(request, env);
  if (authorization === "missing-secret") return jsonResponse({ error: "CRON_SECRET is not configured." }, 503);
  if (authorization === "unauthorized") return jsonResponse({ error: "Unauthorized." }, 401);
  if (!env.ARCH_DB) return jsonResponse({ error: "ARCH_DB D1 binding is not configured." }, 503);
  if (!env.ARCH_UPLOADS_R2) return jsonResponse({ error: "ARCH_UPLOADS_R2 binding is not configured." }, 503);

  const report = await runHostedUploadLifecycleProof(env.ARCH_DB, env.ARCH_UPLOADS_R2);
  return jsonResponse(report, report.passed ? 200 : 500);
}
