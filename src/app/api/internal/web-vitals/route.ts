import { NextResponse } from "next/server";

import { recordWebVitalEvent } from "@/lib/admin/observability-repository";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4 * 1024;
const ALLOWED_METRICS = new Set(["LCP", "CLS", "INP", "FCP", "TTFB"]);
const ALLOWED_RATINGS = new Set(["good", "needs-improvement", "poor"]);

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ ok: false, error: "same_origin_required" }, { status: 403 });
  }

  const contentLength = parseInt(request.headers.get("content-length") ?? "0", 10);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "payload_too_large" }, { status: 413 });
  }

  let payload: {
    name?: string;
    value?: number;
    rating?: string;
    route?: string;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const metricName = String(payload.name ?? "").toUpperCase();
  const metricValue = Number(payload.value);
  const rating = String(payload.rating ?? "");
  const route = String(payload.route ?? "/");

  if (!ALLOWED_METRICS.has(metricName) || !Number.isFinite(metricValue) || !ALLOWED_RATINGS.has(rating)) {
    return NextResponse.json({ ok: false, error: "invalid_metric" }, { status: 400 });
  }

  // Best-effort persist — failures don't block the response.
  await recordWebVitalEvent({
    userId: null,
    route: route.slice(0, 500),
    metricName,
    metricValue,
    rating,
  }).catch(() => undefined);

  return NextResponse.json({ ok: true }, { status: 202 });
}
