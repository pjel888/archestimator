import "server-only";

import { isPlatformAdminRole } from "@/lib/auth/roles";
import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";

export type UploadScanOverrideCommand = {
  assetId: string;
  actorUserId: string;
  expectedChecksumSha256: string;
  reason: string;
  expiresAt: string;
};

export type UploadScanOverrideApproval = {
  assetId: string;
  scanStatus: "override_approved";
  overrideExpiresAt: string;
};

export type UploadScanOverrideParseResult =
  | { ok: true; value: Omit<UploadScanOverrideCommand, "actorUserId"> }
  | { ok: false; status: 400; error: string };

type UploadScanOverrideAssetD1Row = {
  checksum_sha256: string | null;
  id: string;
  scan_status: string | null;
  surface: string;
  upload_session_id: string | null;
  workspace_id: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_RE = /^[a-f0-9]{64}$/i;
const MIN_OVERRIDE_REASON_LENGTH = 8;
const MAX_OVERRIDE_REASON_LENGTH = 1000;

function readStringField(body: unknown, field: string) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "";
  const value = (body as Record<string, unknown>)[field];
  return typeof value === "string" ? value.trim() : "";
}

export function canApproveUploadScanOverride(role: string | null | undefined) {
  return isPlatformAdminRole(role);
}

export function parseUploadScanOverrideRequest(
  body: unknown,
  now = new Date(),
): UploadScanOverrideParseResult {
  const assetId = readStringField(body, "assetId");
  const expectedChecksumSha256 = readStringField(body, "expectedChecksumSha256").toLowerCase();
  const reason = readStringField(body, "reason").slice(0, MAX_OVERRIDE_REASON_LENGTH);
  const rawExpiresAt = readStringField(body, "expiresAt");
  const expiresAt = new Date(rawExpiresAt);

  if (!UUID_RE.test(assetId)) {
    return { ok: false, status: 400, error: "A valid upload asset id is required." };
  }
  if (!SHA256_RE.test(expectedChecksumSha256)) {
    return { ok: false, status: 400, error: "A valid expected SHA-256 checksum is required." };
  }
  if (reason.length < MIN_OVERRIDE_REASON_LENGTH) {
    return { ok: false, status: 400, error: "A documented override reason is required." };
  }
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
    return { ok: false, status: 400, error: "A future override expiry is required." };
  }

  return {
    ok: true,
    value: {
      assetId,
      expectedChecksumSha256,
      reason,
      expiresAt: expiresAt.toISOString(),
    },
  };
}

function normalizeUploadScanOverrideApproval(command: UploadScanOverrideCommand): UploadScanOverrideApproval {
  return {
    assetId: command.assetId,
    scanStatus: "override_approved",
    overrideExpiresAt: command.expiresAt,
  };
}

async function insertScanOverrideEvent(
  db: D1DatabaseLike,
  asset: UploadScanOverrideAssetD1Row,
  command: UploadScanOverrideCommand,
) {
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
      crypto.randomUUID(),
      asset.upload_session_id,
      asset.id,
      asset.workspace_id,
      command.actorUserId,
      "scan_override_approved",
      JSON.stringify({
        checksumSha256: command.expectedChecksumSha256,
        expiresAt: command.expiresAt,
        reason: command.reason,
      }),
      new Date().toISOString(),
    )
    .run();
}

export async function approveUploadScanOverrideInD1(
  db: D1DatabaseLike,
  command: UploadScanOverrideCommand,
): Promise<UploadScanOverrideApproval> {
  const asset = await db
    .prepare<UploadScanOverrideAssetD1Row>(
      `
        SELECT id, workspace_id, upload_session_id, surface, scan_status, checksum_sha256
        FROM upload_assets
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(command.assetId)
    .first<UploadScanOverrideAssetD1Row>();

  if (!asset) throw new Error("Upload asset was not found.");
  if (asset.surface !== "component-attachment") {
    throw new Error("Only component attachments can receive scan overrides.");
  }
  if (asset.scan_status !== "failed_permanent" && asset.scan_status !== "unsupported") {
    throw new Error("Only permanent scanner failures or unsupported files can be override-approved.");
  }
  if (asset.checksum_sha256 !== command.expectedChecksumSha256) {
    throw new Error("Scan override checksum does not match the uploaded asset.");
  }

  const updatedAt = new Date().toISOString();
  const updateResult = await db
    .prepare(
      `
        UPDATE upload_assets
        SET scan_status = ?,
            scan_override_actor_user_id = ?,
            scan_override_reason = ?,
            scan_override_expires_at = ?,
            scan_override_checksum_sha256 = ?,
            updated_at = ?
        WHERE id = ?
          AND checksum_sha256 = ?
          AND surface = ?
          AND scan_status IN (?, ?)
      `,
    )
    .bind(
      "override_approved",
      command.actorUserId,
      command.reason,
      command.expiresAt,
      command.expectedChecksumSha256,
      updatedAt,
      command.assetId,
      command.expectedChecksumSha256,
      "component-attachment",
      "failed_permanent",
      "unsupported",
    )
    .run();

  if ((updateResult.meta?.changes ?? 0) < 1) {
    throw new Error("Scan override could not be approved.");
  }

  await insertScanOverrideEvent(db, asset, command);
  return normalizeUploadScanOverrideApproval(command);
}

export async function approveUploadScanOverride(command: UploadScanOverrideCommand): Promise<UploadScanOverrideApproval> {
  const db = await getCloudflareD1Database();
  if (!db) throw new Error("Upload scan override D1 store is unavailable.");
  return approveUploadScanOverrideInD1(db, command);
}
