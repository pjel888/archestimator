import { getUploadPolicy, type UploadSurface } from "./policy";

export type UploadSessionStrategy =
  | {
    kind: "server_mediated";
    reason: "within_current_cap";
    requiresFinalizeRpc: true;
    supportsResume: false;
  }
  | {
    kind: "signed_single_part";
    reason: "large_file_under_multipart_threshold";
    expiresInSeconds: number;
    requiresFinalizeRpc: true;
    supportsResume: false;
  }
  | {
    kind: "multipart_resumable";
    reason: "large_file_requires_resume";
    partSizeBytes: number;
    maxParts: number;
    requiresFinalizeRpc: true;
    supportsResume: true;
  }
  | {
    kind: "rejected";
    reason: "unknown_size" | "exceeds_absolute_cap" | "surface_policy_exceeded";
    retryable: false;
  };

export type UploadSessionStrategyInput = {
  surface: UploadSurface;
  sizeBytes: number | null | undefined;
  signedUploadThresholdBytes?: number;
  multipartThresholdBytes?: number;
  absoluteMaxBytes?: number;
};

const DEFAULT_SIGNED_UPLOAD_THRESHOLD_BYTES = 8 * 1024 * 1024;
const DEFAULT_MULTIPART_THRESHOLD_BYTES = 64 * 1024 * 1024;
const DEFAULT_ABSOLUTE_MAX_BYTES = 512 * 1024 * 1024;
const DEFAULT_SIGNED_UPLOAD_EXPIRES_SECONDS = 300;
const DEFAULT_MULTIPART_PART_SIZE_BYTES = 8 * 1024 * 1024;
const DEFAULT_MULTIPART_MAX_PARTS = 1000;

export function chooseUploadSessionStrategy(input: UploadSessionStrategyInput): UploadSessionStrategy {
  const policy = getUploadPolicy(input.surface);
  const signedThreshold = input.signedUploadThresholdBytes ?? DEFAULT_SIGNED_UPLOAD_THRESHOLD_BYTES;
  const multipartThreshold = input.multipartThresholdBytes ?? DEFAULT_MULTIPART_THRESHOLD_BYTES;
  const absoluteMax = input.absoluteMaxBytes ?? DEFAULT_ABSOLUTE_MAX_BYTES;

  if (input.sizeBytes === null || input.sizeBytes === undefined || !Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    return { kind: "rejected", reason: "unknown_size", retryable: false };
  }

  if (input.sizeBytes > absoluteMax) {
    return { kind: "rejected", reason: "exceeds_absolute_cap", retryable: false };
  }

  if (input.sizeBytes <= policy.maxBytes) {
    return {
      kind: "server_mediated",
      reason: "within_current_cap",
      requiresFinalizeRpc: true,
      supportsResume: false,
    };
  }

  if (input.sizeBytes <= signedThreshold) {
    return { kind: "rejected", reason: "surface_policy_exceeded", retryable: false };
  }

  if (input.sizeBytes < multipartThreshold) {
    return {
      kind: "signed_single_part",
      reason: "large_file_under_multipart_threshold",
      expiresInSeconds: DEFAULT_SIGNED_UPLOAD_EXPIRES_SECONDS,
      requiresFinalizeRpc: true,
      supportsResume: false,
    };
  }

  return {
    kind: "multipart_resumable",
    reason: "large_file_requires_resume",
    partSizeBytes: DEFAULT_MULTIPART_PART_SIZE_BYTES,
    maxParts: DEFAULT_MULTIPART_MAX_PARTS,
    requiresFinalizeRpc: true,
    supportsResume: true,
  };
}

export function buildUploadSessionFinalizeRequirements(strategy: Exclude<UploadSessionStrategy, { kind: "rejected" }>) {
  return {
    requiresObjectExistenceCheck: true,
    requiresChecksumOrEtag: strategy.kind !== "server_mediated",
    requiresActorWorkspaceSurfaceBinding: true,
    requiresUploadAssetRecord: true,
    requiresScanBeforeUse: strategy.kind !== "server_mediated",
  };
}
