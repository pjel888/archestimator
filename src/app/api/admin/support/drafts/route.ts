import { gateAdminApiGet, gateAdminApiMutation, NO_STORE_HEADERS } from "@/lib/admin/require-admin";
import { runRequiredD1Batch } from "@/lib/cloudflare/d1-batch";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import {
  getSupportDraftByScopeForAdminInD1,
  listSupportDraftsForAdminInD1,
} from "@/lib/repositories/support-drafts-d1";
import {
  captureSupportPrivacyWriteGate,
  supportPrivacyWriteGateSql,
  supportPrivacyWriteGateValues,
  type SupportPrivacyWriteGate,
} from "@/lib/support/privacy-fence";

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
  const existing = await getSupportDraftByScopeForAdminInD1(db, payload.scopeKey, gate.context.userId);
  if (existing) return Response.json({ draft: existing }, { status: 200, headers: NO_STORE_HEADERS });
  const conversationId = typeof payload.conversationId === "string" ? payload.conversationId : null;
  let privacyGate: SupportPrivacyWriteGate = null;
  if (conversationId) {
    const conversation = await db.prepare<{ user_id: string | null }>(
      "SELECT user_id FROM support_conversations WHERE id = ? LIMIT 1",
    ).bind(conversationId).first<{ user_id: string | null }>();
    if (!conversation) return Response.json({ error: "Conversation not found." }, { status: 404, headers: NO_STORE_HEADERS });
    try {
      privacyGate = await captureSupportPrivacyWriteGate(db, conversation.user_id);
    } catch {
      return Response.json({ error: "support_subject_fenced" }, { status: 409, headers: NO_STORE_HEADERS });
    }
  }
  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT OR IGNORE INTO support_drafts (
       id, admin_user_id, scope_key, kind, conversation_id, client_message_id,
       lifecycle, revision, created_at, updated_at
     )
     SELECT ?, ?, ?, ?, ?, ?, 'editing', 1, ?, ?
     WHERE (? IS NULL OR EXISTS (
       SELECT 1 FROM support_conversations conversation WHERE conversation.id = ?
     )) AND ${supportPrivacyWriteGateSql("draft_fence")}`,
  ).bind(
    crypto.randomUUID(),
    gate.context.userId,
    payload.scopeKey,
    payload.kind,
    conversationId,
    payload.scopeKey,
    now,
    now,
    conversationId,
    conversationId,
    ...supportPrivacyWriteGateValues(privacyGate),
  );
  const [result] = await runRequiredD1Batch(db, [insert], "Support draft could not be created.");
  const draft = await getSupportDraftByScopeForAdminInD1(db, payload.scopeKey, gate.context.userId);
  if (!draft) {
    return Response.json({ error: "support_subject_fenced" }, { status: 409, headers: NO_STORE_HEADERS });
  }
  return Response.json(
    { draft },
    { status: (result.meta?.changes ?? 0) === 1 ? 201 : 200, headers: NO_STORE_HEADERS },
  );
}

export async function GET() {
  const gate = await gateAdminApiGet();
  if (!gate.ok) return gate.response;
  const db = await getCloudflareD1Database();
  if (!db) return Response.json({ error: "Draft storage unavailable." }, { status: 503, headers: NO_STORE_HEADERS });
  const drafts = await listSupportDraftsForAdminInD1(db, gate.context.userId);
  return Response.json({ drafts }, { headers: NO_STORE_HEADERS });
}
