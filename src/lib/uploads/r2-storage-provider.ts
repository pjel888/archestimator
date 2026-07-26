import type { UploadStorageProvider } from "./storage-provider";

type R2PutValue = ArrayBuffer | ArrayBufferView | Blob | ReadableStream | string;

type R2ObjectBody = {
  arrayBuffer: () => Promise<ArrayBuffer>;
  range?: {
    offset?: number;
    length?: number;
  };
} & R2ObjectMetadata;

type R2ObjectMetadata = {
  size?: number;
  etag?: string | null;
  checksums?: {
    toJSON?: () => {
      sha256?: string;
    };
  };
  httpMetadata?: {
    contentType?: string | null;
  };
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
  head?: (key: string) => Promise<R2ObjectMetadata | null>;
  get: (
    key: string,
    options?: { range?: { offset: number; length: number } },
  ) => Promise<R2ObjectBody | null>;
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
      await Promise.all(paths.map((path) => r2.delete(buildCloudflareR2ObjectKey(bucket, path))));
    },
    async downloadObject(bucket, path) {
      const object = await r2.get(buildCloudflareR2ObjectKey(bucket, path));
      if (!object) throw new Error("Something went wrong. Try again in a moment.");
      const body = await object.arrayBuffer();
      return {
        body,
        contentType: object.httpMetadata?.contentType ?? null,
        sizeBytes: object.size ?? body.byteLength,
        etag: object.etag ?? null,
        checksumSha256: object.checksums?.toJSON?.().sha256 ?? null,
      };
    },
    async downloadObjectRange(bucket, path, range) {
      if (!Number.isSafeInteger(range.offset) || range.offset < 0 || !Number.isSafeInteger(range.length) || range.length <= 0) {
        throw new Error("Something went wrong. Try again in a moment.");
      }
      const object = await r2.get(buildCloudflareR2ObjectKey(bucket, path), { range });
      if (!object) throw new Error("Something went wrong. Try again in a moment.");
      const body = await object.arrayBuffer();
      return {
        body,
        contentType: object.httpMetadata?.contentType ?? null,
        offset: object.range?.offset ?? range.offset,
        length: object.range?.length ?? body.byteLength,
        totalSizeBytes: object.size ?? range.offset + body.byteLength,
        etag: object.etag ?? null,
        checksumSha256: object.checksums?.toJSON?.().sha256 ?? null,
      };
    },
    async headObject(bucket, path) {
      if (!r2.head) throw new Error("Something went wrong. Try again in a moment.");
      const object = await r2.head(buildCloudflareR2ObjectKey(bucket, path));
      if (!object) throw new Error("Something went wrong. Try again in a moment.");
      return {
        contentType: object.httpMetadata?.contentType ?? null,
        sizeBytes: object.size ?? 0,
        etag: object.etag ?? null,
        checksumSha256: object.checksums?.toJSON?.().sha256 ?? null,
      };
    },
    async createSignedReadUrl(bucket, path, expiresInSeconds) {
      const key = buildCloudflareR2ObjectKey(bucket, path);
      if (!options.signedReadUrlFactory) {
        throw new Error("Something went wrong. Try again in a moment.");
      }
      return options.signedReadUrlFactory({ bucket, path, key, expiresInSeconds });
    },
    getPublicUrl(bucket, path) {
      const key = buildCloudflareR2ObjectKey(bucket, path);
      if (!publicBaseUrl) {
        throw new Error("Something went wrong. Try again in a moment.");
      }
      return `${publicBaseUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
    },
  };
}

function assertSafeLogicalBucket(bucket: string) {
  if (!LOGICAL_BUCKET_PATTERN.test(bucket)) {
    throw new Error("Something went wrong. Try again in a moment.");
  }
}

function assertSafeStoragePath(path: string) {
  if (!path || path.startsWith("/") || path.includes("\\") || path.includes("//")) {
    throw new Error("Something went wrong. Try again in a moment.");
  }

  const segments = path.split("/");
  if (segments.some((segment) => segment === "." || segment === ".." || !PATH_SEGMENT_PATTERN.test(segment))) {
    throw new Error("Something went wrong. Try again in a moment.");
  }
}
