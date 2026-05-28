import { assertSameOriginPublicPost, createSharedLinkSessionCookieName, verifySharedLinkSessionCookieValue } from "@/lib/publication/security";
import { insertSharedLinkComment, createPublicationServiceClient } from "@/lib/publication/public-repository";

export const dynamic = "force-dynamic";

// In-memory LRU rate limiter with TTL (per-recipient, no external deps, P6 per plan)
// 5/min, 20/hour sliding. Keyed by publicationId:recipientId. Auto-prunes.
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1h
const MAX_PER_MIN = 5;
const MAX_PER_HOUR = 20;
const rateBuckets = new Map<string, number[]>(); // timestamps desc newest

function getRateKey(publicationId: string, recipientId: string) {
  return `${publicationId}:${recipientId}`;
}

function checkAndRecordRateLimit(key: string): { allowed: true } | { allowed: false; status: 429; message: string; retryAfter: number } {
  const now = Date.now();
  let arr = rateBuckets.get(key) || [];
  // prune >1h old
  arr = arr.filter((t) => now - t < RATE_WINDOW_MS);
  const inMin = arr.filter((t) => now - t < 60 * 1000).length;
  if (inMin >= MAX_PER_MIN || arr.length >= MAX_PER_HOUR) {
    const retryAfter = Math.ceil((60 * 1000 - (now - (arr[arr.length - 1] || now))) / 1000);
    return { allowed: false, status: 429, message: "Too many comments. Please slow down.", retryAfter: Math.max(5, retryAfter) };
  }
  arr.unshift(now); // newest first
  rateBuckets.set(key, arr.slice(0, MAX_PER_HOUR + 5)); // cap
  // global prune if map grows
  if (rateBuckets.size > 2000) {
    for (const [k, v] of rateBuckets) {
      if (v.length === 0 || now - v[0] > RATE_WINDOW_MS) rateBuckets.delete(k);
    }
  }
  return { allowed: true };
}

function sanitizeAndTruncate(input: string): string {
  if (typeof input !== "string") return "";
  // Strip script/style tags completely + all other HTML tags. Decode basic entities.
  let s = input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (s.length > 1000) s = s.slice(0, 1000);
  return s;
}

function parseCookieValue(cookieHeader: string, name: string): string | undefined {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const sameOrigin = assertSameOriginPublicPost(request);
  if (!sameOrigin.ok) {
    return Response.json({ error: sameOrigin.message }, { status: sameOrigin.status, headers: { "Cache-Control": "no-store" } });
  }

  const { token } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    body?: string;
    estimateId?: string | null;
    rowId?: string | null;
  };

  const rawBody = (body.body || "").toString();
  if (!rawBody.trim()) {
    return Response.json({ error: "Comment body is required." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const cookieHeader = request.headers.get("cookie") || "";
  const sessionName = createSharedLinkSessionCookieName(token);
  const sessionValue = parseCookieValue(cookieHeader, sessionName);

  // Lightweight parse of signed P5 session payload for ids (no DB). Full crypto verify below.
  let publicationId = "unknown-pub";
  let snapshotVersion: string | number = "1";
  let recipientIdFromCookie: string | undefined;
  try {
    const prefix = "shared-link-session-v1";
    const parts = (sessionValue || "").split(":");
    if (parts[0] === prefix && parts[1]) {
      const p = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      if (p?.publicationId) publicationId = p.publicationId;
      if (p?.snapshotVersion) snapshotVersion = p.snapshotVersion;
      recipientIdFromCookie = p?.recipientId;
    }
  } catch {}

  // Verify P5 session (crypto + expiry + match, no DB required)
  const sessionOk = verifySharedLinkSessionCookieValue(sessionValue, {
    token,
    publicationId,
    snapshotVersion,
    recipientId: recipientIdFromCookie,
  });
  if (!sessionOk) {
    return Response.json({ error: "Valid recipient session required for comments." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const recipientId = recipientIdFromCookie;
  if (!recipientId) {
    return Response.json({ error: "Recipient context missing from session." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  // Rate limit (server, per-recipient)
  const rateKey = getRateKey(publicationId, recipientId);
  const rateCheck = checkAndRecordRateLimit(rateKey);
  if (!rateCheck.allowed) {
    return Response.json(
      { error: rateCheck.message },
      { status: rateCheck.status, headers: { "Cache-Control": "no-store", "Retry-After": String(rateCheck.retryAfter) } }
    );
  }

  // Sanitize
  const sanitized = sanitizeAndTruncate(rawBody);
  if (!sanitized) {
    return Response.json({ error: "Comment body is invalid after sanitization." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const { id } = await insertSharedLinkComment({
      publicationToken: token,
      recipientId,
      body: sanitized,
      estimateId: body.estimateId ?? null,
      rowId: body.rowId ?? null,
    });
    return Response.json({ id, created: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    const msg = e?.message || "Failed to post comment.";
    const status = /rate|too many/i.test(msg) ? 429 : /not found|expired|recipient/i.test(msg) ? 403 : 500;
    return Response.json({ error: msg }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
