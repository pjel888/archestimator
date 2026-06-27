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

type SupabaseStorageError = { message?: string | null };

type SupabaseSignedUploadClient = {
  storage: {
    from: (bucket: string) => {
      createSignedUploadUrl: (path: string, options?: { upsert: boolean }) => PromiseLike<{
        data: { signedUrl: string; token: string; path: string } | null;
        error: SupabaseStorageError | null;
      }>;
      info: (path: string) => PromiseLike<{
        data: {
          size?: number | null;
          contentType?: string | null;
          content_type?: string | null;
          etag?: string | null;
          metadata?: {
            size?: number | null;
            contentLength?: number | null;
            content_length?: number | null;
            mimetype?: string | null;
            eTag?: string | null;
            etag?: string | null;
          } | null;
        } | null;
        error: SupabaseStorageError | null;
      }>;
    };
  };
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

function assertDirectUploadConstraints(input: DirectUploadObjectConstraints) {
  if (!input.bucket.trim()) throw new Error("Direct upload bucket is required.");
  if (!input.path.trim() || input.path.startsWith("/") || input.path.includes("..") || input.path.includes("//")) {
    throw new Error("Direct upload path is unsafe.");
  }
  if (!input.contentType.trim()) throw new Error("Direct upload content type is required.");
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) throw new Error("Direct upload size must be positive.");
  if (!Number.isFinite(input.maxBytes) || input.maxBytes <= 0) throw new Error("Direct upload max bytes must be positive.");
  if (input.sizeBytes > input.maxBytes) throw new Error("Direct upload size exceeds max bytes.");
}

function signedUploadExpiresAt(expiresInSeconds: number) {
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}

function sizeFromSupabaseInfo(data: Awaited<ReturnType<ReturnType<SupabaseSignedUploadClient["storage"]["from"]>["info"]>>["data"]) {
  return data?.size ?? data?.metadata?.size ?? data?.metadata?.contentLength ?? data?.metadata?.content_length ?? 0;
}

function contentTypeFromSupabaseInfo(data: Awaited<ReturnType<ReturnType<SupabaseSignedUploadClient["storage"]["from"]>["info"]>>["data"]) {
  return data?.contentType ?? data?.content_type ?? data?.metadata?.mimetype ?? null;
}

function etagFromSupabaseInfo(data: Awaited<ReturnType<ReturnType<SupabaseSignedUploadClient["storage"]["from"]>["info"]>>["data"]) {
  return data?.etag ?? data?.metadata?.eTag ?? data?.metadata?.etag ?? null;
}

export function createSupabaseDirectUploadProvider(supabase: SupabaseSignedUploadClient): DirectUploadProvider {
  return {
    async createSignedUploadSession(input) {
      assertDirectUploadConstraints(input);
      const { data, error } = await supabase.storage.from(input.bucket).createSignedUploadUrl(input.path, { upsert: false });
      if (error || !data?.signedUrl) throw new Error(error?.message ?? "Supabase signed upload URL creation failed.");

      return {
        kind: "signed_single_part",
        uploadUrl: data.signedUrl,
        method: "PUT",
        expiresAt: signedUploadExpiresAt(input.expiresInSeconds),
        requiresFinalizeRpc: true,
        constraints: {
          bucket: input.bucket,
          path: input.path,
          contentType: input.contentType,
          sizeBytes: input.sizeBytes,
          maxBytes: input.maxBytes,
          checksumSha256: input.checksumSha256 ?? null,
        },
      };
    },
    async createMultipartUploadSession() {
      throw new Error("Supabase Storage direct multipart/resumable uploads are not implemented by this adapter.");
    },
    async signMultipartPart() {
      throw new Error("Supabase Storage direct multipart/resumable uploads are not implemented by this adapter.");
    },
    async completeMultipartUpload() {
      throw new Error("Supabase Storage direct multipart/resumable uploads are not implemented by this adapter.");
    },
    async abortMultipartUpload() {
      throw new Error("Supabase Storage direct multipart/resumable uploads are not implemented by this adapter.");
    },
    async headObject(input) {
      const { data, error } = await supabase.storage.from(input.bucket).info(input.path);
      if (error || !data) throw new Error(error?.message ?? "Supabase object info lookup failed.");

      return {
        bucket: input.bucket,
        path: input.path,
        contentType: contentTypeFromSupabaseInfo(data),
        sizeBytes: sizeFromSupabaseInfo(data),
        etag: etagFromSupabaseInfo(data),
      };
    },
  };
}
