import { gateAdminApiGet, gateAdminApiMutation, NO_STORE_HEADERS } from "@/lib/admin/require-admin";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { runRequiredD1Batch } from "@/lib/cloudflare/d1-batch";
import { getSupportUploadsR2 } from "@/lib/email/support-outbound-attachments";
import { readSupportEmailConfig } from "@/lib/email/support-email-config";
import {
  getSupportDraftForAdminInD1,
  listSupportDraftAttachmentsInD1,
} from "@/lib/repositories/support-drafts-d1";
import {
  captureSupportPrivacyWriteGate,
  supportPrivacyWriteGateSql,
  supportPrivacyWriteGateValues,
  type SupportPrivacyWriteGate,
} from "@/lib/support/privacy-fence";

export const dynamic = "force-dynamic";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

function exceedsByteLimit(value: string, limit: number) {
  return new TextEncoder().encode(value).byteLength > limit;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await gateAdminApiGet();
  if (!gate.ok) return gate.response;
  const draftId = (await params).id;
  if (!UUID_PATTERN.test(draftId)) return Response.json({ error: "Invalid draft id." }, { status: 400, headers: NO_STORE_HEADERS });
  const db = await getCloudflareD1Database();
  if (!db) return Response.json({ error: "Draft storage unavailable." }, { status: 503, headers: NO_STORE_HEADERS });
  const draft = await getSupportDraftForAdminInD1(db, draftId, gate.context.userId);
  if (!draft) return Response.json({ error: "Draft not found." }, { status: 404, headers: NO_STORE_HEADERS });
  return Response.json({ draft, attachments: await listSupportDraftAttachmentsInD1(db, draft.id) }, { headers: NO_STORE_HEADERS });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await gateAdminApiMutation(request);
  if (!gate.ok) return gate.response;
  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  const draftId = (await params).id;
  if (!UUID_PATTERN.test(draftId)) return Response.json({ error: "Invalid draft id." }, { status: 400, headers: NO_STORE_HEADERS });
  if (!payload || !Number.isInteger(payload.revision) || (payload.revision as number) < 1) return Response.json({ error: "A draft revision is required." }, { status: 400, headers: NO_STORE_HEADERS });
  const fields = ["to_json", "cc_json", "subject", "body_text", "body_html", "from_identity_id"] as const;
  if (fields.some((field) => payload[field] !== undefined && payload[field] !== null && typeof payload[field] !== "string")) {
    return Response.json({ error: "Invalid draft fields." }, { status: 400, headers: NO_STORE_HEADERS });
  }
  const config = readSupportEmailConfig();
  if (
    (typeof payload.subject === "string" && payload.subject.length > 500)
    || (typeof payload.to_json === "string" && payload.to_json.length > 8_000)
    || (typeof payload.cc_json === "string" && payload.cc_json.length > 8_000)
    || (typeof payload.from_identity_id === "string" && payload.from_identity_id.length > 32)
    || (typeof payload.body_text === "string" && exceedsByteLimit(payload.body_text, config.maxMessageBytes))
    || (typeof payload.body_html === "string" && exceedsByteLimit(payload.body_html, config.maxMessageBytes))
  ) {
    return Response.json({ error: "Draft content exceeds support limits." }, { status: 413, headers: NO_STORE_HEADERS });
  }
  const db = await getCloudflareD1Database();
  if (!db) return Response.json({ error: "Draft storage unavailable." }, { status: 503, headers: NO_STORE_HEADERS });
  const existing = await getSupportDraftForAdminInD1(db, draftId, gate.context.userId);
  if (!existing) return Response.json({ error: "Draft not found." }, { status: 404, headers: NO_STORE_HEADERS });
  let privacyGate: SupportPrivacyWriteGate = null;
  if (existing.conversation_id) {
    const conversation = await db.prepare<{ user_id: string | null }>(
      "SELECT user_id FROM support_conversations WHERE id = ? LIMIT 1",
    ).bind(existing.conversation_id).first<{ user_id: string | null }>();
    if (!conversation) return Response.json({ error: "Draft not found." }, { status: 404, headers: NO_STORE_HEADERS });
    try {
      privacyGate = await captureSupportPrivacyWriteGate(db, conversation.user_id);
    } catch {
      return Response.json({ error: "support_subject_fenced" }, { status: 409, headers: NO_STORE_HEADERS });
    }
  }
  const update = Object.fromEntries(fields.map((field) => [field, payload[field] === undefined ? existing[field] : payload[field]])) as Record<(typeof fields)[number], string | null>;
  const mutation = db.prepare(
    `UPDATE support_drafts SET
       to_json = ?, cc_json = ?, subject = ?, body_text = ?, body_html = ?, from_identity_id = ?,
       revision = revision + 1, updated_at = ?
     WHERE id = ? AND admin_user_id = ? AND lifecycle = 'editing' AND revision = ?
       AND ${supportPrivacyWriteGateSql("draft_fence")}`,
  ).bind(
    update.to_json,
    update.cc_json,
    update.subject,
    update.body_text,
    update.body_html,
    update.from_identity_id,
    new Date().toISOString(),
    draftId,
    gate.context.userId,
    payload.revision as number,
    ...supportPrivacyWriteGateValues(privacyGate),
  );
  const [mutationResult] = await runRequiredD1Batch(db, [mutation], "Support draft could not be updated.");
  const draft = await getSupportDraftForAdminInD1(db, draftId, gate.context.userId);
  if (!draft) return Response.json({ error: "Draft not found." }, { status: 404, headers: NO_STORE_HEADERS });
  if ((mutationResult.meta?.changes ?? 0) !== 1) {
    return Response.json(
      { error: privacyGate ? "support_subject_fenced" : "Draft revision conflict.", draft },
      { status: 409, headers: NO_STORE_HEADERS },
    );
  }
  return Response.json({ draft }, { headers: NO_STORE_HEADERS });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await gateAdminApiMutation(request);
  if (!gate.ok) return gate.response;
  const draftId = (await params).id;
  if (!UUID_PATTERN.test(draftId)) return Response.json({ error: "Invalid draft id." }, { status: 400, headers: NO_STORE_HEADERS });
  const db = await getCloudflareD1Database();
  if (!db) return Response.json({ error: "Draft storage unavailable." }, { status: 503, headers: NO_STORE_HEADERS });
  const draft = await getSupportDraftForAdminInD1(db, draftId, gate.context.userId);
  if (!draft || draft.lifecycle !== "editing") {
    return Response.json({ error: "Draft cannot be discarded." }, { status: 409, headers: NO_STORE_HEADERS });
  }
  let privacyGate: SupportPrivacyWriteGate = null;
  if (draft.conversation_id) {
    const conversation = await db.prepare<{ user_id: string | null }>(
      "SELECT user_id FROM support_conversations WHERE id = ? LIMIT 1",
    ).bind(draft.conversation_id).first<{ user_id: string | null }>();
    if (!conversation) return Response.json({ error: "Draft cannot be discarded." }, { status: 409, headers: NO_STORE_HEADERS });
    try {
      privacyGate = await captureSupportPrivacyWriteGate(db, conversation.user_id);
    } catch {
      return Response.json({ error: "support_subject_fenced" }, { status: 409, headers: NO_STORE_HEADERS });
    }
  }
  const attachments = await listSupportDraftAttachmentsInD1(db, draft.id);
  if (attachments.length > 0) {
    const r2 = await getSupportUploadsR2();
    if (!r2?.delete) return Response.json({ error: "Draft attachment storage is unavailable." }, { status: 503, headers: NO_STORE_HEADERS });
    try {
      await r2.delete(attachments.map((attachment) => attachment.r2_key));
    } catch {
      return Response.json({ error: "Draft attachments could not be discarded." }, { status: 503, headers: NO_STORE_HEADERS });
    }
  }
  const deletion = db.prepare(
    `DELETE FROM support_drafts
     WHERE id = ? AND admin_user_id = ? AND lifecycle = 'editing'
       AND ${supportPrivacyWriteGateSql("draft_fence")}`,
  ).bind(draftId, gate.context.userId, ...supportPrivacyWriteGateValues(privacyGate));
  const [result] = await runRequiredD1Batch(db, [deletion], "Support draft could not be discarded.");
  if ((result.meta?.changes ?? 0) !== 1) return Response.json({ error: "support_subject_fenced" }, { status: 409, headers: NO_STORE_HEADERS });
  return Response.json({ discarded: true }, { headers: NO_STORE_HEADERS });
}
