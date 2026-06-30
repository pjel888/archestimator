import type { UploadStorageProvider } from "./storage-provider";

type R2PutValue = ArrayBuffer | ArrayBufferView | Blob | ReadableStream | string;

type R2ObjectBody = {
  size?: number;
  httpMetadata?: {
    contentType?: string | null;
  };
  arrayBuffer: () => Promise<ArrayBuffer>;
};

export type CloudflareR2UploadBucket = {
  put: (
    key: string,
    value: R2PutValue,
    options?: {
      httpMetadata?: {
        contentType?: string;
        cacheControl?: string;
      };
    },
  ) => Promise<unknown>;
  get: (key: string) => Promise<R2ObjectBody | null>;
  delete: (keys: string | string[]) => Promise<unknown>;
};

type SignedReadUrlFactoryInput = {
  bucket: string;
  path: string;
  key: string;
  expiresInSeconds: number;
};

type CloudflareR2UploadStorageProviderOptions = {
  publicBaseUrl?: string;
  signedReadUrlFactory?: (input: SignedReadUrlFactoryInput) => Promise<string> | string;
};

const LOGICAL_BUCKET_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}$/;
const PATH_SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function buildCloudflareR2ObjectKey(bucket: string, path: string): string {
  assertSafeLogicalBucket(bucket);
  assertSafeStoragePath(path);
  return `${bucket}/${path}`;
}

export function createCloudflareR2UploadStorageProvider(
  r2: CloudflareR2UploadBucket,
  options: CloudflareR2UploadStorageProviderOptions = {},
): UploadStorageProvider {
  const publicBaseUrl = options.publicBaseUrl?.replace(/\/+$/, "");

  return {
    async uploadObject({ bucket, path, body, contentType, cacheControl = "31536000" }) {
      await r2.put(buildCloudflareR2ObjectKey(bucket, path), body, {
        httpMetadata: {
          contentType,
          cacheControl,
        },
      });
    },
    async removeObjects(bucket, paths) {
      if (paths.length === 0) return;
      await r2.delete(paths.map((path) => buildCloudflareR2ObjectKey(bucket, path)));
    },
    async downloadObject(bucket, path) {
      const object = await r2.get(buildCloudflareR2ObjectKey(bucket, path));
      if (!object) throw new Error("R2 storage object was not found.");
      const body = await object.arrayBuffer();
      return {
        body,
        contentType: object.httpMetadata?.contentType ?? null,
        sizeBytes: object.size ?? body.byteLength,
      };
    },
    async createSignedReadUrl(bucket, path, expiresInSeconds) {
      const key = buildCloudflareR2ObjectKey(bucket, path);
      if (!options.signedReadUrlFactory) {
        throw new Error("R2 signed read URLs require an app-owned signer or read route.");
      }
      return options.signedReadUrlFactory({ bucket, path, key, expiresInSeconds });
    },
    getPublicUrl(bucket, path) {
      const key = buildCloudflareR2ObjectKey(bucket, path);
      if (!publicBaseUrl) {
        throw new Error("R2 public URLs require an explicit public base URL.");
      }
      return `${publicBaseUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
    },
  };
}

function assertSafeLogicalBucket(bucket: string) {
  if (!LOGICAL_BUCKET_PATTERN.test(bucket)) {
    throw new Error("R2 logical bucket name is unsafe.");
  }
}

function assertSafeStoragePath(path: string) {
  if (!path || path.startsWith("/") || path.includes("\\") || path.includes("//")) {
    throw new Error("R2 storage path is unsafe.");
  }

  const segments = path.split("/");
  if (segments.some((segment) => segment === "." || segment === ".." || !PATH_SEGMENT_PATTERN.test(segment))) {
    throw new Error("R2 storage path is unsafe.");
  }
}
