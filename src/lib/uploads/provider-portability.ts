export type DirectUploadObjectConstraints = {
  bucket: string;
  path: string;
  contentType: string;
  sizeBytes: number;
  maxBytes: number;
  checksumSha256?: string | null;
};

export type ProviderObjectHead = {
  bucket: string;
  path: string;
  contentType: string | null;
  sizeBytes: number;
  checksumSha256?: string | null;
  etag?: string | null;
};

export type SignedSinglePartUploadSession = {
  kind: "signed_single_part";
  uploadUrl: string;
  method: "PUT";
  expiresAt: string;
  requiresFinalizeRpc: true;
  constraints: DirectUploadObjectConstraints;
};

export type TusResumableUploadSession = {
  kind: "tus_resumable";
  endpoint: string;
  uploadToken: string;
  uploadMetadata: string;
  chunkSizeBytes: number;
  expiresAt: string;
  requiresFinalizeRpc: true;
  constraints: DirectUploadObjectConstraints;
};

export type MultipartUploadSession = {
  kind: "multipart_resumable";
  uploadId: string;
  bucket: string;
  path: string;
  partSizeBytes: number;
  maxParts: number;
  expiresAt: string;
  requiresFinalizeRpc: true;
  constraints: DirectUploadObjectConstraints;
};

export type MultipartPartUploadUrl = {
  uploadId: string;
  partNumber: number;
  uploadUrl: string;
  expiresAt: string;
};

export type MultipartUploadedPart = {
  partNumber: number;
  etag: string;
  sizeBytes: number;
  checksumSha256?: string | null;
};

export type DirectUploadProvider = {
  createSignedUploadSession: (input: DirectUploadObjectConstraints & {
    expiresInSeconds: number;
  }) => Promise<SignedSinglePartUploadSession>;
  createTusResumableUploadSession?: (input: DirectUploadObjectConstraints & {
    expiresInSeconds: number;
    cacheControlSeconds?: number;
  }) => Promise<TusResumableUploadSession>;
  createMultipartUploadSession: (input: DirectUploadObjectConstraints & {
    partSizeBytes: number;
    maxParts: number;
    expiresInSeconds: number;
  }) => Promise<MultipartUploadSession>;
  signMultipartPart: (input: {
    uploadId: string;
    partNumber: number;
    expiresInSeconds: number;
  }) => Promise<MultipartPartUploadUrl>;
  completeMultipartUpload: (input: {
    uploadId: string;
    parts: MultipartUploadedPart[];
  }) => Promise<ProviderObjectHead>;
  abortMultipartUpload: (input: { uploadId: string }) => Promise<void>;
  headObject: (input: { bucket: string; path: string }) => Promise<ProviderObjectHead>;
};

export type ProviderFinalizeValidation =
  | { ok: true; proof: "checksum" | "etag" }
  | {
    ok: false;
    reason:
      | "bucket_mismatch"
      | "path_mismatch"
      | "content_type_mismatch"
      | "size_exceeded"
      | "size_mismatch"
      | "checksum_mismatch"
      | "missing_checksum_or_etag";
  };

export type MultipartPartsValidation =
  | { ok: true; totalSizeBytes: number; expectedPartCount: number }
  | {
    ok: false;
    reason:
      | "duplicate_part"
      | "part_number_out_of_range"
      | "too_many_parts"
      | "missing_part"
      | "empty_etag"
      | "non_final_part_size_mismatch"
      | "size_mismatch";
    partNumber?: number;
  };

function expectedPartCount(session: MultipartUploadSession) {
  return Math.ceil(session.constraints.sizeBytes / session.partSizeBytes);
}

export function validateProviderObjectHead(
  constraints: DirectUploadObjectConstraints,
  head: ProviderObjectHead,
): ProviderFinalizeValidation {
  if (head.bucket !== constraints.bucket) return { ok: false, reason: "bucket_mismatch" };
  if (head.path !== constraints.path) return { ok: false, reason: "path_mismatch" };
  if (head.contentType !== constraints.contentType) return { ok: false, reason: "content_type_mismatch" };
  if (head.sizeBytes > constraints.maxBytes) return { ok: false, reason: "size_exceeded" };
  if (head.sizeBytes !== constraints.sizeBytes) return { ok: false, reason: "size_mismatch" };

  const expectedChecksum = constraints.checksumSha256?.trim();
  const observedChecksum = head.checksumSha256?.trim();
  const observedEtag = head.etag?.trim();
  if (expectedChecksum && observedChecksum && observedChecksum !== expectedChecksum) {
    return { ok: false, reason: "checksum_mismatch" };
  }
  if (expectedChecksum && observedChecksum === expectedChecksum) return { ok: true, proof: "checksum" };
  if (observedEtag) return { ok: true, proof: "etag" };
  return { ok: false, reason: "missing_checksum_or_etag" };
}

export function validateMultipartUploadedParts(
  session: MultipartUploadSession,
  parts: MultipartUploadedPart[],
): MultipartPartsValidation {
  const expectedParts = expectedPartCount(session);
  if (parts.length > session.maxParts || expectedParts > session.maxParts) return { ok: false, reason: "too_many_parts" };

  const byPartNumber = new Map<number, MultipartUploadedPart>();
  for (const part of parts) {
    if (part.partNumber < 1 || part.partNumber > session.maxParts) {
      return { ok: false, reason: "part_number_out_of_range", partNumber: part.partNumber };
    }
    if (!part.etag.trim()) return { ok: false, reason: "empty_etag", partNumber: part.partNumber };
    if (byPartNumber.has(part.partNumber)) return { ok: false, reason: "duplicate_part", partNumber: part.partNumber };
    byPartNumber.set(part.partNumber, part);
  }

  let totalSizeBytes = 0;
  for (let partNumber = 1; partNumber <= expectedParts; partNumber += 1) {
    const part = byPartNumber.get(partNumber);
    if (!part) return { ok: false, reason: "missing_part", partNumber };
    totalSizeBytes += part.sizeBytes;
    if (partNumber < expectedParts && part.sizeBytes !== session.partSizeBytes) {
      return { ok: false, reason: "non_final_part_size_mismatch", partNumber };
    }
  }

  if (totalSizeBytes !== session.constraints.sizeBytes) return { ok: false, reason: "size_mismatch" };
  return { ok: true, totalSizeBytes, expectedPartCount: expectedParts };
}
