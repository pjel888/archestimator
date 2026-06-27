import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  type DirectUploadObjectConstraints,
  type DirectUploadProvider,
  type MultipartPartUploadUrl,
  type MultipartUploadedPart,
  type MultipartUploadSession,
  type ProviderObjectHead,
  type SignedSinglePartUploadSession,
  validateMultipartUploadedParts,
  validateProviderObjectHead,
} from "@/lib/uploads/provider-portability";

function sha256Hex(bytes: Buffer) {
  return createHash("sha256").update(bytes).digest("hex");
}

function bufferFromParts(parts: Buffer[]) {
  return Buffer.concat(parts);
}

function createFakeS3LikeDirectUploadProvider() {
  const objects = new Map<string, ProviderObjectHead & { body: Buffer }>();
  const multipart = new Map<string, {
    session: MultipartUploadSession;
    parts: Map<number, { body: Buffer; etag: string; checksumSha256: string }>;
  }>();
  let uploadCounter = 0;

  const keyFor = (bucket: string, path: string) => `${bucket}:${path}`;
  const futureIso = (seconds: number) => new Date(Date.UTC(2026, 5, 27, 0, 0, seconds)).toISOString();
  const putSignedObject = async (session: SignedSinglePartUploadSession, body: Buffer, contentType: string) => {
    if (contentType !== session.constraints.contentType) throw new Error("content type mismatch");
    if (body.byteLength > session.constraints.maxBytes) throw new Error("object exceeds session max bytes");
    if (body.byteLength !== session.constraints.sizeBytes) throw new Error("object size mismatch");
    const checksumSha256 = sha256Hex(body);
    objects.set(keyFor(session.constraints.bucket, session.constraints.path), {
      bucket: session.constraints.bucket,
      path: session.constraints.path,
      contentType,
      sizeBytes: body.byteLength,
      checksumSha256,
      etag: `"${checksumSha256.slice(0, 16)}"`,
      body,
    });
  };
  const uploadPart = async (
    session: MultipartUploadSession,
    partUrl: MultipartPartUploadUrl,
    body: Buffer,
  ): Promise<MultipartUploadedPart> => {
    const upload = multipart.get(session.uploadId);
    if (!upload || partUrl.uploadId !== session.uploadId) throw new Error("multipart upload was not found");
    const checksumSha256 = sha256Hex(body);
    const etag = `"part-${partUrl.partNumber}-${checksumSha256.slice(0, 12)}"`;
    upload.parts.set(partUrl.partNumber, { body, etag, checksumSha256 });
    return { partNumber: partUrl.partNumber, etag, sizeBytes: body.byteLength, checksumSha256 };
  };

  const provider: DirectUploadProvider = {
    async createSignedUploadSession(input: DirectUploadObjectConstraints & { expiresInSeconds: number }) {
      return {
        kind: "signed_single_part",
        uploadUrl: `fake-s3://put/${input.bucket}/${input.path}`,
        method: "PUT",
        expiresAt: futureIso(input.expiresInSeconds),
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
    async createMultipartUploadSession(input: DirectUploadObjectConstraints & {
      partSizeBytes: number;
      maxParts: number;
      expiresInSeconds: number;
    }) {
      uploadCounter += 1;
      const session: MultipartUploadSession = {
        kind: "multipart_resumable",
        uploadId: `upload-${uploadCounter}`,
        bucket: input.bucket,
        path: input.path,
        partSizeBytes: input.partSizeBytes,
        maxParts: input.maxParts,
        expiresAt: futureIso(input.expiresInSeconds),
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
      multipart.set(session.uploadId, { session, parts: new Map() });
      return session;
    },
    async signMultipartPart(input: { uploadId: string; partNumber: number; expiresInSeconds: number }) {
      if (!multipart.has(input.uploadId)) throw new Error("multipart upload was not found");
      return {
        uploadId: input.uploadId,
        partNumber: input.partNumber,
        uploadUrl: `fake-s3://part/${input.uploadId}/${input.partNumber}`,
        expiresAt: futureIso(input.expiresInSeconds),
      };
    },
    async completeMultipartUpload(input: { uploadId: string; parts: MultipartUploadedPart[] }) {
      const upload = multipart.get(input.uploadId);
      if (!upload) throw new Error("multipart upload was not found");
      const partsValidation = validateMultipartUploadedParts(upload.session, input.parts);
      if (!partsValidation.ok) throw new Error(`multipart validation failed: ${partsValidation.reason}`);
      const bodies = [...input.parts]
        .sort((left, right) => left.partNumber - right.partNumber)
        .map((part) => upload.parts.get(part.partNumber)?.body ?? Buffer.alloc(0));
      const body = bufferFromParts(bodies);
      const checksumSha256 = sha256Hex(body);
      const head = {
        bucket: upload.session.bucket,
        path: upload.session.path,
        contentType: upload.session.constraints.contentType,
        sizeBytes: body.byteLength,
        checksumSha256,
        etag: `"multipart-${input.parts.length}-${checksumSha256.slice(0, 16)}"`,
        body,
      };
      objects.set(keyFor(upload.session.bucket, upload.session.path), head);
      multipart.delete(input.uploadId);
      return head;
    },
    async abortMultipartUpload(input: { uploadId: string }) {
      multipart.delete(input.uploadId);
    },
    async headObject(input: { bucket: string; path: string }) {
      const object = objects.get(keyFor(input.bucket, input.path));
      if (!object) throw new Error("object was not found");
      return object;
    },
  };

  return { provider, putSignedObject, uploadPart };
}

describe("upload provider portability contracts", () => {
  it("validates S3-like signed single-part finalization with object scope and checksum proof", async () => {
    const body = Buffer.from("image-bytes");
    const checksumSha256 = sha256Hex(body);
    const { provider, putSignedObject } = createFakeS3LikeDirectUploadProvider();
    const session = await provider.createSignedUploadSession({
      bucket: "component-images",
      path: "workspace-1/user-1/component.webp",
      contentType: "image/webp",
      sizeBytes: body.byteLength,
      maxBytes: body.byteLength,
      checksumSha256,
      expiresInSeconds: 300,
    });

    await putSignedObject(session, body, "image/webp");
    const head = await provider.headObject({ bucket: "component-images", path: "workspace-1/user-1/component.webp" });

    expect(validateProviderObjectHead(session.constraints, head)).toEqual({ ok: true, proof: "checksum" });
    expect(validateProviderObjectHead(session.constraints, { ...head, path: "workspace-1/user-2/component.webp" }))
      .toEqual({ ok: false, reason: "path_mismatch" });
    await expect(putSignedObject(session, Buffer.alloc(body.byteLength + 1), "image/webp"))
      .rejects.toThrow("object exceeds session max bytes");
  });

  it("validates S3-like multipart completion, missing part failures, and abort cleanup", async () => {
    const parts = [Buffer.from("abcde"), Buffer.from("fghij"), Buffer.from("k")];
    const fullBody = bufferFromParts(parts);
    const checksumSha256 = sha256Hex(fullBody);
    const { provider, uploadPart } = createFakeS3LikeDirectUploadProvider();
    const session = await provider.createMultipartUploadSession({
      bucket: "component-attachments",
      path: "workspace-1/user-1/spec.pdf",
      contentType: "application/pdf",
      sizeBytes: fullBody.byteLength,
      maxBytes: 20,
      checksumSha256,
      partSizeBytes: 5,
      maxParts: 3,
      expiresInSeconds: 300,
    });
    const partUrls = await Promise.all([1, 2, 3].map((partNumber) => provider.signMultipartPart({
      uploadId: session.uploadId,
      partNumber,
      expiresInSeconds: 60,
    })));
    const uploadedParts = await Promise.all(partUrls.map((partUrl, index) => uploadPart(session, partUrl, parts[index] ?? Buffer.alloc(0))));

    expect(validateMultipartUploadedParts(session, uploadedParts.slice(0, 2)))
      .toEqual({ ok: false, reason: "missing_part", partNumber: 3 });

    const head = await provider.completeMultipartUpload({ uploadId: session.uploadId, parts: uploadedParts });

    expect(validateMultipartUploadedParts(session, uploadedParts)).toEqual({
      ok: true,
      totalSizeBytes: fullBody.byteLength,
      expectedPartCount: 3,
    });
    expect(validateProviderObjectHead(session.constraints, head)).toEqual({ ok: true, proof: "checksum" });

    const abortSession = await provider.createMultipartUploadSession({
      bucket: "component-attachments",
      path: "workspace-1/user-1/aborted.pdf",
      contentType: "application/pdf",
      sizeBytes: 5,
      maxBytes: 20,
      checksumSha256: sha256Hex(Buffer.from("abcde")),
      partSizeBytes: 5,
      maxParts: 2,
      expiresInSeconds: 300,
    });
    await provider.abortMultipartUpload({ uploadId: abortSession.uploadId });
    await expect(provider.signMultipartPart({ uploadId: abortSession.uploadId, partNumber: 1, expiresInSeconds: 60 }))
      .rejects.toThrow("multipart upload was not found");
  });
});
