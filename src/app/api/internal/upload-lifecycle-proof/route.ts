import { NextResponse } from "next/server";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { routeCloudflareUploadLifecycleProofRequest, type CloudflareUploadLifecycleProofEnv } from "@/lib/cloudflare/upload-lifecycle-proof-router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
};

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: NO_STORE_HEADERS });
}

async function loadCloudflareUploadProofEnv(): Promise<Pick<CloudflareUploadLifecycleProofEnv, "ARCH_UPLOADS_R2">> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    return { ARCH_UPLOADS_R2: (env as CloudflareUploadLifecycleProofEnv).ARCH_UPLOADS_R2 };
  } catch {
    return {};
  }
}

async function handleUploadLifecycleProof(request: Request) {
  const [db, cloudflareEnv] = await Promise.all([
    getCloudflareD1Database(),
    loadCloudflareUploadProofEnv(),
  ]);
  const response = await routeCloudflareUploadLifecycleProofRequest(request, {
    ARCH_DB: db ?? undefined,
    ARCH_UPLOADS_R2: cloudflareEnv.ARCH_UPLOADS_R2,
    CRON_SECRET: process.env.CRON_SECRET,
  });
  return response ?? jsonError("Not found.", 404);
}

export async function GET(request: Request) {
  return handleUploadLifecycleProof(request);
}

export async function POST(request: Request) {
  return handleUploadLifecycleProof(request);
}
