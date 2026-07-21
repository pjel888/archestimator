type SharpFactory = (input: Buffer, options: { failOn: "warning"; limitInputPixels: number }) => {
  metadata: () => Promise<{ format?: string; width?: number; height?: number }>;
  rotate: () => ReturnType<SharpFactory>;
  resize: (options: { width: number; height: number; fit: "inside"; withoutEnlargement: boolean }) => ReturnType<SharpFactory>;
  webp: (options: { quality: number; effort: number }) => ReturnType<SharpFactory>;
  toBuffer: (options: { resolveWithObject: true }) => Promise<{ data: Buffer; info: { width: number; height: number } }>;
};

export type ProcessedUploadImage = {
  optimized: { data: Buffer; info: { width: number; height: number } };
  thumbnail: { data: Buffer; info: { width: number; height: number } };
};

type CloudflareImageInfo = {
  format?: string;
  width?: number;
  height?: number;
};

type CloudflareImageOutputResult = {
  response?: () => Response | Promise<Response>;
  image?: () => ReadableStream<Uint8Array>;
};

type CloudflareImageInputHandle = {
  transform: (options: { width: number; height: number; fit: "scale-down" }) => CloudflareImageInputHandle;
  output: (options: { format: "image/webp"; quality: number; anim: false }) => CloudflareImageOutputResult | Promise<CloudflareImageOutputResult>;
};

export type CloudflareImagesBindingLike = {
  input: (stream: ReadableStream<Uint8Array>) => CloudflareImageInputHandle;
  info?: (stream: ReadableStream<Uint8Array>) => Promise<CloudflareImageInfo>;
};

type ProcessUploadImageResult =
  | { status: "ok"; image: ProcessedUploadImage }
  | { status: "cloudflare-image-processing-unavailable" }
  | { status: "decode-error" }
  | { status: "unsupported-encoding" }
  | { status: "missing-dimensions" }
  | { status: "dimensions-too-large" };

const ALLOWED_SHARP_FORMATS = new Set(["jpeg", "png", "webp", "avif"]);
const ALLOWED_CLOUDFLARE_IMAGE_FORMATS = new Set(["jpeg", "png", "webp", "avif"]);
const IMAGE_PROCESSING_PROVIDER_ENV = "ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER";

declare const __ARCHESTIMATOR_CLOUDFLARE_WORKERS_PROOF_BUILD__: boolean | undefined;

export const CLOUDFLARE_IMAGE_PROCESSING_UNAVAILABLE_MESSAGE =
  "Image processing is temporarily unavailable. Try again in a moment.";

export function isCloudflareWorkersProofBuild() {
  return typeof __ARCHESTIMATOR_CLOUDFLARE_WORKERS_PROOF_BUILD__ !== "undefined"
    ? __ARCHESTIMATOR_CLOUDFLARE_WORKERS_PROOF_BUILD__
    : process.env.ARCHESTIMATOR_CLOUDFLARE_BUILD === "1";
}

/**
 * Workers proof builds cannot run sharp. Prefer Cloudflare Images whenever the
 * build is Workers-shaped, or when the provider is explicitly selected.
 * `node-sharp` remains the Node/local default only.
 */
export function shouldUseCloudflareImagesProcessing() {
  const provider = process.env[IMAGE_PROCESSING_PROVIDER_ENV];
  if (provider === "cloudflare-images") return true;
  if (provider === "node-sharp" && !isCloudflareWorkersProofBuild()) return false;
  return isCloudflareWorkersProofBuild();
}

function isAllowedSharpFormat(format: string | undefined, magicMime: string) {
  if (!format) return false;
  if (format === "heif" && magicMime === "image/avif") return true;
  return ALLOWED_SHARP_FORMATS.has(format);
}

function normalizeCloudflareImageFormat(format: string | undefined) {
  if (!format) return undefined;
  const normalized = format.toLowerCase();
  if (normalized === "jpg" || normalized === "image/jpg" || normalized === "image/jpeg") return "jpeg";
  if (normalized.startsWith("image/")) return normalized.slice("image/".length);
  return normalized;
}

function isAllowedCloudflareImageFormat(format: string | undefined, magicMime: string) {
  const normalized = normalizeCloudflareImageFormat(format);
  if (!normalized) return false;
  if (normalized === "heif" && magicMime === "image/avif") return true;
  return ALLOWED_CLOUDFLARE_IMAGE_FORMATS.has(normalized);
}

function bufferToReadableStream(buffer: Buffer) {
  const bytes = new Uint8Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

function scaleDownDimensions(width: number, height: number, edge: number) {
  const scale = Math.min(1, edge / width, edge / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function cloudflareOutputToBuffer(result: CloudflareImageOutputResult) {
  if (typeof result.response === "function") {
    const response = await result.response();
    if (!response.ok) throw new Error("Something went wrong. Try again in a moment.");
    return Buffer.from(await response.arrayBuffer());
  }
  if (typeof result.image === "function") {
    return Buffer.from(await new Response(result.image()).arrayBuffer());
  }
  throw new Error("Something went wrong. Try again in a moment.");
}

async function loadCloudflareImagesBinding() {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = await getCloudflareContext({ async: true });
    return (context.env.IMAGES ?? null) as CloudflareImagesBindingLike | null;
  } catch {
    return null;
  }
}

async function loadSharp() {
  if (isCloudflareWorkersProofBuild()) return null;
  const sharpModule = await import("sharp");
  return (sharpModule.default ?? sharpModule) as SharpFactory;
}

async function processUploadImageWithCloudflareImages({
  sourceBuffer,
  magicMime,
  maxImagePixels,
  maxImageEdge,
  thumbnailEdge,
  cloudflareImagesBinding,
}: {
  sourceBuffer: Buffer;
  magicMime: string;
  maxImagePixels: number;
  maxImageEdge: number;
  thumbnailEdge: number;
  cloudflareImagesBinding?: CloudflareImagesBindingLike | null;
}): Promise<ProcessUploadImageResult> {
  const images = cloudflareImagesBinding === undefined ? await loadCloudflareImagesBinding() : cloudflareImagesBinding;
  if (!images || typeof images.info !== "function") return { status: "cloudflare-image-processing-unavailable" };

  try {
    const metadata = await images.info(bufferToReadableStream(sourceBuffer));
    if (!isAllowedCloudflareImageFormat(metadata.format, magicMime)) return { status: "unsupported-encoding" };
    if (!metadata.width || !metadata.height) return { status: "missing-dimensions" };
    if (metadata.width * metadata.height > maxImagePixels) return { status: "dimensions-too-large" };

    const optimizedOutput = await images
      .input(bufferToReadableStream(sourceBuffer))
      .transform({ width: maxImageEdge, height: maxImageEdge, fit: "scale-down" })
      .output({ format: "image/webp", quality: 82, anim: false });
    const thumbnailOutput = await images
      .input(bufferToReadableStream(sourceBuffer))
      .transform({ width: thumbnailEdge, height: thumbnailEdge, fit: "scale-down" })
      .output({ format: "image/webp", quality: 85, anim: false });

    return {
      status: "ok",
      image: {
        optimized: {
          data: await cloudflareOutputToBuffer(optimizedOutput),
          info: scaleDownDimensions(metadata.width, metadata.height, maxImageEdge),
        },
        thumbnail: {
          data: await cloudflareOutputToBuffer(thumbnailOutput),
          info: scaleDownDimensions(metadata.width, metadata.height, thumbnailEdge),
        },
      },
    };
  } catch {
    return { status: "decode-error" };
  }
}

export async function processUploadImageToWebp({
  sourceBuffer,
  magicMime,
  maxImagePixels,
  maxImageEdge,
  thumbnailEdge,
  cloudflareImagesBinding,
}: {
  sourceBuffer: Buffer;
  magicMime: string;
  maxImagePixels: number;
  maxImageEdge: number;
  thumbnailEdge: number;
  cloudflareImagesBinding?: CloudflareImagesBindingLike | null;
}): Promise<ProcessUploadImageResult> {
  if (shouldUseCloudflareImagesProcessing()) {
    return processUploadImageWithCloudflareImages({
      sourceBuffer,
      magicMime,
      maxImagePixels,
      maxImageEdge,
      thumbnailEdge,
      cloudflareImagesBinding,
    });
  }

  const sharp = await loadSharp();
  if (!sharp) return { status: "cloudflare-image-processing-unavailable" };

  try {
    const pipeline = sharp(sourceBuffer, { failOn: "warning", limitInputPixels: maxImagePixels }).rotate();
    const metadata = await pipeline.metadata();
    if (!isAllowedSharpFormat(metadata.format, magicMime)) return { status: "unsupported-encoding" };
    if (!metadata.width || !metadata.height) return { status: "missing-dimensions" };
    if (metadata.width * metadata.height > maxImagePixels) return { status: "dimensions-too-large" };

    const optimized = await sharp(sourceBuffer, { failOn: "warning", limitInputPixels: maxImagePixels })
      .rotate()
      .resize({ width: maxImageEdge, height: maxImageEdge, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true });

    const thumbnail = await sharp(sourceBuffer, { failOn: "warning", limitInputPixels: maxImagePixels })
      .rotate()
      .resize({ width: thumbnailEdge, height: thumbnailEdge, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85, effort: 4 })
      .toBuffer({ resolveWithObject: true });

    return { status: "ok", image: { optimized, thumbnail } };
  } catch {
    return { status: "decode-error" };
  }
}
