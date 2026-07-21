import { gateAdminApiGet, gateAdminApiMutation, NO_STORE_HEADERS } from "@/lib/admin/require-admin";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { getOrCreateSupportDraftInD1, listSupportDraftsForAdminInD1 } from "@/lib/repositories/support-drafts-d1";

export const dynamic = "force-dynamic";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export async function POST(request: Request) {
  const gate = await gateAdminApiMutation(request);
  if (!gate.ok) return gate.response;
  const payload = await request.json().catch(() => null) as { scopeKey?: unknown; kind?: unknown; conversationId?: unknown } | null;
  if (!payload || typeof payload.scopeKey !== "string" || !UUID_PATTERN.test(payload.scopeKey)) {
    return Response.json({ error: "A valid draft scopeKey is required." }, { status: 400, headers: NO_STORE_HEADERS });
  }
  if (payload.kind !== "reply" && payload.kind !== "new_email") {
    return Response.json({ error: "Invalid draft kind." }, { status: 400, headers: NO_STORE_HEADERS });
  }
  if (payload.kind === "reply" && (typeof payload.conversationId !== "string" || !UUID_PATTERN.test(payload.conversationId))) {
    return Response.json({ error: "Reply draft conversation is required." }, { status: 400, headers: NO_STORE_HEADERS });
  }
  const db = await getCloudflareD1Database();
  if (!db) return Response.json({ error: "Draft storage unavailable." }, { status: 503, headers: NO_STORE_HEADERS });
  const draft = await getOrCreateSupportDraftInD1({
    db,
    adminUserId: gate.context.userId,
    scopeKey: payload.scopeKey,
    kind: payload.kind,
    conversationId: typeof payload.conversationId === "string" ? payload.conversationId : null,
    clientMessageId: payload.scopeKey,
  });
  return Response.json({ draft }, { status: 201, headers: NO_STORE_HEADERS });
}

export async function GET() {
  const gate = await gateAdminApiGet();
  if (!gate.ok) return gate.response;
  const db = await getCloudflareD1Database();
  if (!db) return Response.json({ error: "Draft storage unavailable." }, { status: 503, headers: NO_STORE_HEADERS });
  const drafts = await listSupportDraftsForAdminInD1(db, gate.context.userId);
  return Response.json({ drafts }, { headers: NO_STORE_HEADERS });
}
