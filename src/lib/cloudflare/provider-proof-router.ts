type ImagesBindingInfo = {
  format?: string;
  width?: number;
  height?: number;
};

type ImagesBindingOutputResult = {
  response?: () => Response | Promise<Response>;
  image?: () => ReadableStream<Uint8Array>;
};

type ImagesBindingInputHandle = {
  transform(options: { width: number; height: number; fit: "scale-down" }): ImagesBindingInputHandle;
  output(options: { format: "image/webp"; quality: number; anim: false }): ImagesBindingOutputResult | Promise<ImagesBindingOutputResult>;
};

type ImagesBindingLike = {
  info?: (stream: ReadableStream<Uint8Array>) => Promise<ImagesBindingInfo>;
  input?: (stream: ReadableStream<Uint8Array>) => ImagesBindingInputHandle;
};

type R2ObjectLike = {
  size?: number;
  arrayBuffer(): Promise<ArrayBuffer>;
};

type R2BucketLike = {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | Blob | ReadableStream | string,
    options?: { httpMetadata?: { contentType?: string; cacheControl?: string } },
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectLike | null>;
  delete(keys: string | string[]): Promise<unknown>;
};

export type CloudflareProviderProofEnv = {
  CRON_SECRET?: string;
  IMAGES?: ImagesBindingLike;
  ARCH_UPLOADS_R2?: R2BucketLike;
};

type ProviderProofResult = {
  imagesBindingPresent: boolean;
  imagesInfoReady: boolean;
  imagesTransformReady: boolean;
  imageFormat: string | null;
  imageDimensions: { width: number; height: number } | null;
  imageOutputBytes: number | null;
  imageInfoMs: number | null;
  imageTransformMs: number | null;
  imagesError: string | null;
  r2BindingPresent: boolean;
  r2PutReady: boolean;
  r2GetReady: boolean;
  r2DeleteReady: boolean;
  r2ObjectBytes: number | null;
  proofObjectDeleted: boolean;
  r2PutMs: number | null;
  r2GetMs: number | null;
  r2DeleteMs: number | null;
  r2RoundTripMs: number | null;
  r2Error: string | null;
  imagesProviderProofReady: boolean;
  r2ProviderProofReady: boolean;
};

const PROVIDER_PROOF_PATH = "/__cloudflare/provider-proof";
const PROOF_IMAGE_EXTENSION = "jpg";
const PROOF_IMAGE_CONTENT_TYPE = "image/jpeg";
const PROOF_IMAGE_BASE64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAgACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDn6KKK/Gj+8wooooAKKKKACiiigD//2Q==";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function proofImageBytes() {
  const binary = atob(PROOF_IMAGE_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function readableBytes(bytes: Uint8Array) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

function nowMs() {
  return performance.now();
}

function elapsedMs(start: number) {
  return Math.round((nowMs() - start) * 100) / 100;
}

async function outputResultBytes(result: ImagesBindingOutputResult) {
  if (typeof result.response === "function") {
    const response = await result.response();
    if (!response.ok) throw new Error("Images output response failed.");
    return response.arrayBuffer();
  }
  if (typeof result.image === "function") {
    return new Response(result.image()).arrayBuffer();
  }
  throw new Error("Images output produced no byte stream.");
}

async function runImagesProof(images: ImagesBindingLike | undefined, bytes: Uint8Array) {
  const result = {
    imagesBindingPresent: Boolean(images),
    imagesInfoReady: false,
    imagesTransformReady: false,
    imageFormat: null as string | null,
    imageDimensions: null as ProviderProofResult["imageDimensions"],
    imageOutputBytes: null as number | null,
    imageInfoMs: null as number | null,
    imageTransformMs: null as number | null,
    imagesError: null as string | null,
  };

  if (!images || typeof images.info !== "function" || typeof images.input !== "function") return result;

  try {
    const infoStartedAt = nowMs();
    const info = await images.info(readableBytes(bytes));
    result.imageInfoMs = elapsedMs(infoStartedAt);
    result.imageFormat = info.format ?? null;
    result.imageDimensions = info.width && info.height ? { width: info.width, height: info.height } : null;
    result.imagesInfoReady = Boolean(info.format && info.width && info.height);

    const transformStartedAt = nowMs();
    const output = await images
      .input(readableBytes(bytes))
      .transform({ width: 1, height: 1, fit: "scale-down" })
      .output({ format: "image/webp", quality: 80, anim: false });
    const outputBytes = await outputResultBytes(output);
    result.imageTransformMs = elapsedMs(transformStartedAt);
    result.imageOutputBytes = outputBytes.byteLength;
    result.imagesTransformReady = outputBytes.byteLength > 0;
  } catch (error) {
    result.imagesError = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  }

  return result;
}

async function runR2Proof(r2: R2BucketLike | undefined, bytes: Uint8Array) {
  const result = {
    r2BindingPresent: Boolean(r2),
    r2PutReady: false,
    r2GetReady: false,
    r2DeleteReady: false,
    r2ObjectBytes: null as number | null,
    proofObjectDeleted: false,
    r2PutMs: null as number | null,
    r2GetMs: null as number | null,
    r2DeleteMs: null as number | null,
    r2RoundTripMs: null as number | null,
    r2Error: null as string | null,
  };

  if (!r2) return result;

  const key = `provider-proof/${crypto.randomUUID()}.${PROOF_IMAGE_EXTENSION}`;
  const roundTripStartedAt = nowMs();
  try {
    const putStartedAt = nowMs();
    await r2.put(key, bytes, {
      httpMetadata: {
        contentType: PROOF_IMAGE_CONTENT_TYPE,
        cacheControl: "no-store",
      },
    });
    result.r2PutMs = elapsedMs(putStartedAt);
    result.r2PutReady = true;

    const getStartedAt = nowMs();
    const object = await r2.get(key);
    result.r2GetMs = elapsedMs(getStartedAt);
    if (object) {
      const body = await object.arrayBuffer();
      result.r2ObjectBytes = object.size ?? body.byteLength;
      result.r2GetReady = body.byteLength === bytes.byteLength;
    }

    const deleteStartedAt = nowMs();
    await r2.delete(key);
    result.r2DeleteMs = elapsedMs(deleteStartedAt);
    result.r2DeleteReady = true;
    result.proofObjectDeleted = (await r2.get(key)) === null;
    result.r2RoundTripMs = elapsedMs(roundTripStartedAt);
  } catch (error) {
    result.r2Error = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    result.r2RoundTripMs = elapsedMs(roundTripStartedAt);
  }

  return result;
}

function isAuthorized(request: Request, env: CloudflareProviderProofEnv) {
  const secret = env.CRON_SECRET;
  if (!secret) return "missing-secret" as const;
  const header = request.headers.get("authorization") ?? "";
  if (header !== `Bearer ${secret}`) return "invalid-secret" as const;
  return "authorized" as const;
}

export async function routeCloudflareProviderProofRequest(request: Request, env: CloudflareProviderProofEnv) {
  const url = new URL(request.url);
  if (url.pathname !== PROVIDER_PROOF_PATH) return null;

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
  }

  const authorization = isAuthorized(request, env);
  if (authorization === "missing-secret") {
    return jsonResponse({ ok: false, error: "missing_secret" }, 503);
  }
  if (authorization === "invalid-secret") {
    return jsonResponse({ ok: false, error: "unauthorized" }, 401);
  }

  const bytes = proofImageBytes();
  const images = await runImagesProof(env.IMAGES, bytes);
  const r2 = await runR2Proof(env.ARCH_UPLOADS_R2, bytes);
  const result: ProviderProofResult = {
    ...images,
    ...r2,
    imagesProviderProofReady: images.imagesBindingPresent && images.imagesInfoReady && images.imagesTransformReady,
    r2ProviderProofReady: r2.r2BindingPresent && r2.r2PutReady && r2.r2GetReady && r2.r2DeleteReady && r2.proofObjectDeleted,
  };

  return jsonResponse({
    ok: result.imagesProviderProofReady && result.r2ProviderProofReady,
    mode: "cloudflare-provider-runtime-proof",
    proofScope: "images-binding-and-r2-ephemeral-object",
    result,
  });
}
