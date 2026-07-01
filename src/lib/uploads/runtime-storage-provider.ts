import {
  createCloudflareR2UploadStorageProvider,
  type CloudflareR2UploadBucket,
} from "./r2-storage-provider";
import type { UploadStorageProvider } from "./storage-provider";

type RuntimeUploadStorageProvider = "cloudflare-r2";

type CloudflareUploadEnv = {
  ARCH_UPLOADS_R2?: CloudflareR2UploadBucket;
};

type RuntimeUploadStorageProviderEnv = {
  ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER?: string | null;
};

type RuntimeUploadStorageProviderOptions = {
  cloudflareEnv?: CloudflareUploadEnv;
  loadCloudflareEnv?: () => Promise<CloudflareUploadEnv | null>;
};

const DEFAULT_UPLOAD_STORAGE_PROVIDER: RuntimeUploadStorageProvider = "cloudflare-r2";

export async function createRuntimeUploadStorageProvider(
  _legacyStorageClient?: unknown,
  options: RuntimeUploadStorageProviderOptions = {},
): Promise<UploadStorageProvider> {
  readRuntimeUploadStorageProvider();

  const cloudflareEnv = options.cloudflareEnv ?? await (options.loadCloudflareEnv ?? loadCloudflareEnv)();
  const r2 = cloudflareEnv?.ARCH_UPLOADS_R2;
  if (!r2) {
    throw new Error("Cloudflare R2 upload storage was selected but ARCH_UPLOADS_R2 is not bound.");
  }
  return createCloudflareR2UploadStorageProvider(r2);
}

export function readRuntimeUploadStorageProvider(
  env?: RuntimeUploadStorageProviderEnv,
): RuntimeUploadStorageProvider {
  const configuredProvider = env
    ? env.ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER
    : process.env.ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER;
  const rawProvider = (configuredProvider ?? DEFAULT_UPLOAD_STORAGE_PROVIDER)
    .trim()
    .toLowerCase();
  if (rawProvider === "cloudflare-r2") return rawProvider;
  throw new Error(`Unsupported upload storage provider: ${rawProvider}`);
}

async function loadCloudflareEnv(): Promise<CloudflareUploadEnv | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    return env as CloudflareUploadEnv;
  } catch {
    return null;
  }
}
