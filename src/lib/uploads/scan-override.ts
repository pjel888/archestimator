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

type UploadScanOverrideError = {
  message?: string | null;
};

type UploadScanOverrideRpcClient = {
  rpc: (
    functionName: "approve_upload_scan_override",
    args: {
      target_asset_id: string;
      override_actor_user_id: string;
      override_reason: string;
      override_expires_at: string;
      expected_checksum_sha256: string;
    },
  ) => PromiseLike<{ data: unknown; error: UploadScanOverrideError | null }>;
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
  return role === "ceo" || role === "admin";
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

function normalizeUploadScanOverrideApproval(data: unknown, fallback: UploadScanOverrideCommand): UploadScanOverrideApproval {
  const value = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const assetId = typeof value.assetId === "string" ? value.assetId : fallback.assetId;
  const overrideExpiresAt = typeof value.overrideExpiresAt === "string" ? value.overrideExpiresAt : fallback.expiresAt;

  return {
    assetId,
    scanStatus: "override_approved",
    overrideExpiresAt,
  };
}

export async function approveUploadScanOverride(
  client: unknown,
  command: UploadScanOverrideCommand,
): Promise<UploadScanOverrideApproval> {
  const { data, error } = await (client as UploadScanOverrideRpcClient).rpc("approve_upload_scan_override", {
    target_asset_id: command.assetId,
    override_actor_user_id: command.actorUserId,
    override_reason: command.reason,
    override_expires_at: command.expiresAt,
    expected_checksum_sha256: command.expectedChecksumSha256,
  });

  if (error) throw new Error(error.message ?? "Could not approve upload scan override.");
  return normalizeUploadScanOverrideApproval(data, command);
}
