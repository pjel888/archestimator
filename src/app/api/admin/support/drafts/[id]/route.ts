import { gateAdminApiGet, gateAdminApiMutation, NO_STORE_HEADERS } from "@/lib/admin/require-admin";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { getSupportUploadsR2 } from "@/lib/email/support-outbound-attachments";
import { readSupportEmailConfig } from "@/lib/email/support-email-config";
import {
  deleteSupportDraftForAdminInD1,
  getSupportDraftForAdminInD1,
  listSupportDraftAttachmentsInD1,
  updateSupportDraftInD1,
} from "@/lib/repositories/support-drafts-d1";

export const dynamic = "force-dynamic";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

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
  const result = await updateSupportDraftInD1({
    db, draftId, adminUserId: gate.context.userId, expectedRevision: payload.revision as number,
    update: Object.fromEntries(fields.map((field) => [field, payload[field] === undefined ? existing[field] : payload[field]])) as never,
  });
  if (!result.draft) return Response.json({ error: "Draft not found." }, { status: 404, headers: NO_STORE_HEADERS });
  if (!result.updated) return Response.json({ error: "Draft revision conflict.", draft: result.draft }, { status: 409, headers: NO_STORE_HEADERS });
  return Response.json({ draft: result.draft }, { headers: NO_STORE_HEADERS });
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
  const result = await deleteSupportDraftForAdminInD1({
    db,
    draftId,
    adminUserId: gate.context.userId,
  });
  if (!result.draft) return Response.json({ error: "Draft cannot be discarded." }, { status: 409, headers: NO_STORE_HEADERS });
  return Response.json({ discarded: true }, { headers: NO_STORE_HEADERS });
}
