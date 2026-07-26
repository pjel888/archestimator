import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
import type { UploadStorageProvider } from "@/lib/uploads/storage-provider";

const MAX_RANGE_BYTES = 8 * 1024 * 1024;

export type ArtifactUploadLocator = {
  bucket: string;
  path: string;
};

export function parseSingleByteRange(value: string, totalSizeBytes: number, maximumLength = MAX_RANGE_BYTES) {
  if (!Number.isSafeInteger(totalSizeBytes) || totalSizeBytes <= 0) return null;
  if (!Number.isSafeInteger(maximumLength) || maximumLength <= 0) return null;
  if (!value.startsWith("bytes=") || value.includes(",")) return null;

  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return null;

  if (!match[1]) {
    const requestedSuffix = Number(match[2]);
    if (!Number.isSafeInteger(requestedSuffix) || requestedSuffix <= 0) return null;
    const length = Math.min(requestedSuffix, maximumLength, totalSizeBytes);
    return { offset: totalSizeBytes - length, length };
  }

  const offset = Number(match[1]);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset >= totalSizeBytes) return null;
  const requestedEnd = match[2] ? Number(match[2]) : totalSizeBytes - 1;
  if (!Number.isSafeInteger(requestedEnd) || requestedEnd < offset) return null;
  const end = Math.min(requestedEnd, totalSizeBytes - 1, offset + maximumLength - 1);
  return { offset, length: end - offset + 1 };
}

export async function readArtifactUploadLocator(
  database: D1DatabaseLike,
  input: { uploadAssetId: string; workspaceId: string; projectId: string },
): Promise<ArtifactUploadLocator | null> {
  const row = await database.prepare<{ storage_bucket: string; storage_path: string }>(`
    SELECT storage_bucket, storage_path
    FROM upload_assets
    WHERE id = ? AND workspace_id = ? AND project_id = ?
      AND status = 'finalized' AND purge_state = 'active'
    LIMIT 1
  `).bind(input.uploadAssetId, input.workspaceId, input.projectId).first();
  if (!row?.storage_bucket?.trim() || !row.storage_path?.trim()) return null;
  return { bucket: row.storage_bucket, path: row.storage_path };
}

function safeFileName(fileName: string) {
  const normalized = fileName.replace(/[\u0000-\u001f\u007f"\\]/g, "-").trim();
  return normalized || "project-artifact.pdf";
}

function privateHeaders() {
  return {
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store, max-age=0, must-revalidate",
    "X-Content-Type-Options": "nosniff",
  };
}

function entityTag(value: string | null | undefined) {
  if (!value) return null;
  return value.startsWith('"') ? value : `"${value.replace(/"/g, "")}"`;
}

export async function createArtifactContentResponse(input: {
  request: Request;
  bucket: string;
  path: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  storageProvider: UploadStorageProvider;
  download?: boolean;
}) {
  const headers = privateHeaders();
  const disposition = `${input.download ? "attachment" : "inline"}; filename="${safeFileName(input.fileName)}"`;
  const rangeHeader = input.request.headers.get("range");

  if (rangeHeader) {
    const range = parseSingleByteRange(rangeHeader, input.sizeBytes);
    if (!range) {
      return new Response(null, {
        status: 416,
        headers: { ...headers, "Content-Range": `bytes */${input.sizeBytes}` },
      });
    }
    if (!input.storageProvider.downloadObjectRange) {
      return Response.json(
        { error: "Artifact range delivery is unavailable." },
        { status: 503, headers },
      );
    }

    try {
      const object = await input.storageProvider.downloadObjectRange(input.bucket, input.path, range);
      if (
        object.offset !== range.offset
        || object.length <= 0
        || object.length > range.length
        || object.body.byteLength !== object.length
        || object.totalSizeBytes !== input.sizeBytes
        || object.offset + object.length > object.totalSizeBytes
      ) {
        return Response.json({ error: "Artifact content is unavailable." }, { status: 404, headers });
      }
      const etag = entityTag(object.etag);
      return new Response(object.body, {
        status: 206,
        headers: {
          ...headers,
          "Content-Disposition": disposition,
          "Content-Length": String(object.length),
          "Content-Range": `bytes ${object.offset}-${object.offset + object.length - 1}/${object.totalSizeBytes}`,
          "Content-Type": input.contentType,
          ...(etag ? { ETag: etag } : {}),
        },
      });
    } catch {
      return Response.json({ error: "Artifact content is unavailable." }, { status: 404, headers });
    }
  }

  try {
    const object = await input.storageProvider.downloadObject(input.bucket, input.path);
    if (object.sizeBytes !== input.sizeBytes || object.body.byteLength !== object.sizeBytes) {
      return Response.json({ error: "Artifact content is unavailable." }, { status: 404, headers });
    }
    const etag = entityTag(object.etag);
    return new Response(object.body, {
      headers: {
        ...headers,
        "Content-Disposition": disposition,
        "Content-Length": String(object.sizeBytes),
        "Content-Type": input.contentType,
        ...(etag ? { ETag: etag } : {}),
      },
    });
  } catch {
    return Response.json({ error: "Artifact content is unavailable." }, { status: 404, headers });
  }
}
