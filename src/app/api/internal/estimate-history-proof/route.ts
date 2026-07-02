import { NextResponse } from "next/server";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { routeCloudflareEstimateHistoryProofRequest } from "@/lib/cloudflare/estimate-history-proof-router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
};

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: NO_STORE_HEADERS });
}

async function handleEstimateHistoryProof(request: Request) {
  const db = await getCloudflareD1Database();
  const response = await routeCloudflareEstimateHistoryProofRequest(request, {
    ARCH_DB: db ?? undefined,
    CRON_SECRET: process.env.CRON_SECRET,
  });
  return response ?? jsonError("Not found.", 404);
}

export async function GET(request: Request) {
  return handleEstimateHistoryProof(request);
}

export async function POST(request: Request) {
  return handleEstimateHistoryProof(request);
}
