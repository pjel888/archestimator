import {
  createCloudflareR2UploadStorageProvider,
  type CloudflareR2UploadBucket,
} from "./r2-storage-provider";
import {
  createSupabaseUploadStorageProvider,
  type SupabaseStorageClient,
  type UploadStorageProvider,
} from "./storage-provider";

type RuntimeUploadStorageProvider = "supabase" | "cloudflare-r2";

type CloudflareUploadEnv = {
  ARCH_UPLOADS_R2?: CloudflareR2UploadBucket;
};

type RuntimeUploadStorageProviderOptions = {
  cloudflareEnv?: CloudflareUploadEnv;
  loadCloudflareEnv?: () => Promise<CloudflareUploadEnv | null>;
};

const DEFAULT_UPLOAD_STORAGE_PROVIDER: RuntimeUploadStorageProvider = "supabase";

export async function createRuntimeUploadStorageProvider(
  supabase: SupabaseStorageClient,
  options: RuntimeUploadStorageProviderOptions = {},
): Promise<UploadStorageProvider> {
  const provider = readRuntimeUploadStorageProvider();
  if (provider === "supabase") return createSupabaseUploadStorageProvider(supabase);

  const cloudflareEnv = options.cloudflareEnv ?? await (options.loadCloudflareEnv ?? loadCloudflareEnv)();
  const r2 = cloudflareEnv?.ARCH_UPLOADS_R2;
  if (!r2) {
    throw new Error("Cloudflare R2 upload storage was selected but ARCH_UPLOADS_R2 is not bound.");
  }
  return createCloudflareR2UploadStorageProvider(r2);
}

export function readRuntimeUploadStorageProvider(): RuntimeUploadStorageProvider {
  const rawProvider = (process.env.ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER ?? DEFAULT_UPLOAD_STORAGE_PROVIDER)
    .trim()
    .toLowerCase();
  if (rawProvider === "supabase" || rawProvider === "cloudflare-r2") return rawProvider;
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
