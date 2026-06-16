import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

import { getRequiredCurrentUserContextResult } from "@/lib/auth/session";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";

const COMPONENT_IMAGE_BUCKET = "component-images";
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 24_000_000;
const MAX_IMAGE_EDGE = 1600;
const THUMBNAIL_EDGE = 512;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const ALLOWED_SHARP_FORMATS = new Set(["jpeg", "png", "webp", "avif"]);
const AVIF_FTYP_BRANDS = new Set(["avif", "avis"]);

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function getUploadContext() {
  const authResult = await getRequiredCurrentUserContextResult();
  if (!authResult.ok) {
    return {
      response: jsonError(
        authResult.reason === "unauthenticated" ? "Authentication required." : "Terms acceptance required.",
        authResult.reason === "unauthenticated" ? 401 : 403,
      ),
    };
  }

  const { workspace } = await ensureDefaultWorkspace();
  return { workspace, currentUser: authResult.context };
}

function readAscii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.subarray(start, end));
}

function readIsoBaseMediaBrands(bytes: Uint8Array) {
  if (bytes.length < 16 || readAscii(bytes, 4, 8) !== "ftyp") return [];
  const brands = [readAscii(bytes, 8, 12)];
  const readableLength = Math.min(bytes.length, 64);
  for (let index = 16; index + 4 <= readableLength; index += 4) {
    brands.push(readAscii(bytes, index, index + 4));
  }
  return brands;
}

function readMagicMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12
    && bytes[0] === 0x52
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x46
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  const brands = readIsoBaseMediaBrands(bytes);
  if (brands.some((brand) => AVIF_FTYP_BRANDS.has(brand))) {
    return "image/avif";
  }
  return null;
}

function isAllowedSharpFormat(format: string | undefined, magicMime: string) {
  if (!format) return false;
  if (format === "heif" && magicMime === "image/avif") return true;
  return ALLOWED_SHARP_FORMATS.has(format);
}

function safeUploadName(name: string) {
  const stem = name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return stem || "component-image";
}

async function createStorageSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceRoleKey) {
    return createClient<Database>(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          "X-Client-Info": "archestimator-component-image-upload",
        },
      },
    });
  }

  return createSupabaseServerClient();
}

async function uploadWebp({
  buffer,
  path,
  supabase,
}: {
  buffer: Buffer;
  path: string;
  supabase: Awaited<ReturnType<typeof createStorageSupabaseClient>>;
}) {
  const { error } = await supabase.storage.from(COMPONENT_IMAGE_BUCKET).upload(path, buffer, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from(COMPONENT_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

function isOwnedUploadPath(path: string, workspaceId: string, userId: string) {
  return path.startsWith(`${workspaceId}/${userId}/`) && path.endsWith(".webp") && !path.includes("..") && !path.includes("//");
}

function readStoragePaths(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const rawPaths = (value as { path?: unknown; paths?: unknown }).paths ?? (value as { path?: unknown }).path;
  const paths = Array.isArray(rawPaths) ? rawPaths : [rawPaths];
  return paths.filter((path): path is string => typeof path === "string" && path.trim().length > 0).map((path) => path.trim());
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_UPLOAD_BYTES + 1024 * 1024) {
    return jsonError("Image upload is too large. Compress or choose an image under 12 MB.", 413);
  }

  const uploadContext = await getUploadContext();
  if ("response" in uploadContext) return uploadContext.response;
  const { workspace, currentUser } = uploadContext;
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return jsonError("Image file is required.");
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) return jsonError("Use a JPG, PNG, WebP, or AVIF image.");
  if (file.size <= 0) return jsonError("Image file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) return jsonError("Image upload is too large. Compress or choose an image under 12 MB.", 413);

  const sourceBuffer = Buffer.from(await file.arrayBuffer());
  const magicMime = readMagicMime(sourceBuffer.subarray(0, 64));
  if (!magicMime || !ALLOWED_MIME_TYPES.has(magicMime)) {
    return jsonError("The uploaded file does not look like a supported image.");
  }

  let optimized: { data: Buffer; info: sharp.OutputInfo };
  let thumbnail: { data: Buffer; info: sharp.OutputInfo };

  try {
    const pipeline = sharp(sourceBuffer, { failOn: "warning", limitInputPixels: MAX_IMAGE_PIXELS }).rotate();
    const metadata = await pipeline.metadata();
    if (!isAllowedSharpFormat(metadata.format, magicMime)) return jsonError("Unsupported image encoding.");
    if (!metadata.width || !metadata.height) return jsonError("Could not read image dimensions.");
    if (metadata.width * metadata.height > MAX_IMAGE_PIXELS) return jsonError("Image dimensions are too large. Use an image under 24 megapixels.", 413);

    optimized = await sharp(sourceBuffer, { failOn: "warning", limitInputPixels: MAX_IMAGE_PIXELS })
      .rotate()
      .resize({ width: MAX_IMAGE_EDGE, height: MAX_IMAGE_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true });

    thumbnail = await sharp(sourceBuffer, { failOn: "warning", limitInputPixels: MAX_IMAGE_PIXELS })
      .rotate()
      .resize({ width: THUMBNAIL_EDGE, height: THUMBNAIL_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85, effort: 4 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    return jsonError("Could not decode image safely. Choose a standard JPG, PNG, WebP, or AVIF file.");
  }

  const supabase = await createStorageSupabaseClient();
  const baseName = `${safeUploadName(file.name)}-${randomUUID()}`;
  const basePath = `${workspace.id}/${currentUser.userId}/${baseName}`;
  const imagePath = `${basePath}.webp`;
  const thumbnailPath = `${basePath}-thumb.webp`;

  const uploadedPaths: string[] = [];

  try {
    const url = await uploadWebp({ buffer: optimized.data, path: imagePath, supabase });
    uploadedPaths.push(imagePath);
    const thumbnailUrl = await uploadWebp({ buffer: thumbnail.data, path: thumbnailPath, supabase });
    uploadedPaths.push(thumbnailPath);

    return NextResponse.json({
      bucket: COMPONENT_IMAGE_BUCKET,
      path: imagePath,
      thumbnailPath,
      url,
      thumbnailUrl,
      width: optimized.info.width,
      height: optimized.info.height,
      thumbnailWidth: thumbnail.info.width,
      thumbnailHeight: thumbnail.info.height,
      originalBytes: file.size,
      optimizedBytes: optimized.data.byteLength,
      contentType: "image/webp",
    });
  } catch {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from(COMPONENT_IMAGE_BUCKET).remove(uploadedPaths).catch(() => undefined);
    }
    return jsonError("Could not store image.", 500);
  }
}

export async function DELETE(request: Request) {
  const uploadContext = await getUploadContext();
  if ("response" in uploadContext) return uploadContext.response;
  const { workspace, currentUser } = uploadContext;
  const body = await request.json().catch(() => null);
  const paths = readStoragePaths(body).filter((path) => isOwnedUploadPath(path, workspace.id, currentUser.userId));
  if (paths.length === 0) return jsonError("No removable image paths were provided.");

  const supabase = await createStorageSupabaseClient();
  const { error } = await supabase.storage.from(COMPONENT_IMAGE_BUCKET).remove(paths);
  if (error) return jsonError("Could not remove uploaded image.", 500);
  return NextResponse.json({ removedPaths: paths });
}
