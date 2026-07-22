import "server-only";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { setSupportDbResolver } from "@/lib/repositories/support-conversations-d1";

setSupportDbResolver(async () => getCloudflareD1Database());

export type { D1DatabaseLike } from "@/lib/cloudflare/d1";
export * from "@/lib/repositories/support-conversations-d1";
