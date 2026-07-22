import "server-only";

import type { CloudflareImagesBindingLike } from "@/lib/uploads/server-image-processing";

export type SupportR2ObjectLike = {
  arrayBuffer?: () => Promise<ArrayBuffer>;
  body?: ReadableStream<Uint8Array> | null;
  httpMetadata?: { contentType?: string };
  size?: number;
};

export type SupportR2BucketLike = {
  get(key: string): Promise<SupportR2ObjectLike | null>;
  put(
    key: string,
    value: ArrayBuffer | Uint8Array | ReadableStream<Uint8Array> | string,
    options?: { httpMetadata?: { contentType?: string; cacheControl?: string } },
  ): Promise<unknown>;
};

type SupportInboxNamespaceLike = {
  idFromName(name: string): unknown;
  get(id: unknown): {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  };
};

export type SupportRuntimeBindings = {
  ARCH_UPLOADS_R2?: SupportR2BucketLike;
  IMAGES?: CloudflareImagesBindingLike;
  SUPPORT_INBOX?: SupportInboxNamespaceLike | null;
  [key: string]: unknown;
};

export async function getSupportRuntimeBindings(): Promise<SupportRuntimeBindings> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = await getCloudflareContext({ async: true }) as unknown as {
      env?: SupportRuntimeBindings;
    };
    return context.env ?? {};
  } catch {
    return {};
  }
}
