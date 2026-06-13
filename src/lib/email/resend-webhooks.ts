import { createClient } from "@supabase/supabase-js";
import { Resend, type WebhookEventPayload } from "resend";

import { isUuid } from "@/lib/ids";
import type { Database, Json } from "@/lib/supabase/types";

type RecipientDeliveryStatus = "pending" | "sent" | "bounced" | "opened";
type ResendOutboundEmailEvent = Extract<
  WebhookEventPayload,
  {
    type:
      | "email.sent"
      | "email.delivered"
      | "email.delivery_delayed"
      | "email.complained"
      | "email.bounced"
      | "email.opened"
      | "email.clicked"
      | "email.failed"
      | "email.suppressed";
  }
>;

type ResendRecipientDeliveryUpdate = {
  deliveryStatus: RecipientDeliveryStatus;
  emailId: string;
  eventCreatedAt: string;
  eventId: string | null;
  eventType: ResendOutboundEmailEvent["type"];
  lastOpenedAt: string | null;
  metadata: Json;
  recipientId: string | null;
};

type SharedLinkRecipientDeliveryRow = Pick<
  Database["public"]["Tables"]["shared_link_recipients"]["Row"],
  "id" | "resend_last_event_at" | "resend_email_id"
>;

const resend = new Resend("re_webhook_verifier");

const recipientDeliveryStatusByEvent: Record<ResendOutboundEmailEvent["type"], RecipientDeliveryStatus> = {
  "email.bounced": "bounced",
  "email.clicked": "opened",
  "email.complained": "bounced",
  "email.delivered": "sent",
  "email.delivery_delayed": "sent",
  "email.failed": "bounced",
  "email.opened": "opened",
  "email.sent": "sent",
  "email.suppressed": "bounced",
};

function createResendWebhookAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error("Resend webhooks require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.");
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        "X-Client-Info": "archestimator-resend-webhook",
      },
    },
  });
}

function isResendOutboundEmailEvent(event: WebhookEventPayload): event is ResendOutboundEmailEvent {
  return Object.hasOwn(recipientDeliveryStatusByEvent, event.type);
}

function readValidIsoTimestamp(value: string | undefined): string | null {
  if (!value) return null;
  return Number.isFinite(Date.parse(value)) ? value : null;
}

function readResendRecipientId(tags: Record<string, string> | undefined): string | null {
  const recipientId = tags?.shared_link_recipient_id;
  return recipientId && isUuid(recipientId) ? recipientId : null;
}

function buildWebhookMetadata(event: ResendOutboundEmailEvent, eventId: string | null): Json {
  const metadata: Record<string, Json> = {
    event_id: eventId,
    event_type: event.type,
    resend_email_id: event.data.email_id,
    subject: event.data.subject,
    to: event.data.to,
  };

  if (event.data.tags) metadata.tags = event.data.tags;
  if ("bounce" in event.data) metadata.bounce = event.data.bounce as unknown as Json;
  if ("click" in event.data) metadata.click = event.data.click as unknown as Json;
  if ("failed" in event.data) metadata.failed = event.data.failed as unknown as Json;
  if ("suppressed" in event.data) metadata.suppressed = event.data.suppressed as unknown as Json;

  return metadata;
}

export function verifyResendWebhookPayload({
  payload,
  headers,
  webhookSecret,
}: {
  payload: string;
  headers: Headers;
  webhookSecret: string;
}): WebhookEventPayload {
  return resend.webhooks.verify({
    payload,
    headers: {
      id: headers.get("svix-id") ?? "",
      timestamp: headers.get("svix-timestamp") ?? "",
      signature: headers.get("svix-signature") ?? "",
    },
    webhookSecret,
  });
}

export function resolveResendRecipientDeliveryUpdate(
  event: WebhookEventPayload,
  eventId: string | null,
): ResendRecipientDeliveryUpdate | null {
  if (!isResendOutboundEmailEvent(event)) return null;

  const eventCreatedAt = readValidIsoTimestamp(event.created_at) ?? readValidIsoTimestamp(event.data.created_at);
  if (!eventCreatedAt) return null;

  const emailId = event.data.email_id.trim();
  if (!emailId) return null;

  const deliveryStatus = recipientDeliveryStatusByEvent[event.type];
  return {
    deliveryStatus,
    emailId,
    eventCreatedAt,
    eventId,
    eventType: event.type,
    lastOpenedAt: deliveryStatus === "opened" ? eventCreatedAt : null,
    metadata: buildWebhookMetadata(event, eventId),
    recipientId: readResendRecipientId(event.data.tags),
  };
}

async function findRecipientForResendUpdate(
  admin: ReturnType<typeof createResendWebhookAdminClient>,
  update: ResendRecipientDeliveryUpdate,
): Promise<SharedLinkRecipientDeliveryRow | null> {
  const { data: byEmailId, error: byEmailIdError } = await admin
    .from("shared_link_recipients")
    .select("id, resend_last_event_at, resend_email_id")
    .eq("resend_email_id", update.emailId)
    .maybeSingle();

  if (byEmailIdError) throw byEmailIdError;
  if (byEmailId) return byEmailId;
  if (!update.recipientId) return null;

  const { data: byRecipientId, error: byRecipientIdError } = await admin
    .from("shared_link_recipients")
    .select("id, resend_last_event_at, resend_email_id")
    .eq("id", update.recipientId)
    .maybeSingle();

  if (byRecipientIdError) throw byRecipientIdError;
  if (!byRecipientId) return null;

  // AC-MOD-20 (MOD-REC-07): the recipient-id tag alone is not enough to attribute an event.
  // A recipient can be resent, so the row's resend_email_id moves to a newer value; a stale
  // webhook for the SUPERSEDED email still carries the old recipient-id tag and would otherwise
  // overwrite the active email's delivery status. Only attribute when it is safe: the row has no
  // bound email yet (null/empty — a legitimate first webhook) OR its resend_email_id matches this
  // event's email_id. A different non-null value is a stale/foreign event — do not attribute.
  const boundEmailId = byRecipientId.resend_email_id?.trim();
  if (boundEmailId && boundEmailId !== update.emailId) return null;
  return byRecipientId;
}

export async function recordResendEmailWebhookEvent(event: WebhookEventPayload, eventId: string | null) {
  const update = resolveResendRecipientDeliveryUpdate(event, eventId);
  if (!update) return { ok: true, ignored: true, reason: "unsupported-event" };

  const admin = createResendWebhookAdminClient();
  const recipient = await findRecipientForResendUpdate(admin, update);
  if (!recipient) return { ok: true, ignored: true, reason: "recipient-not-found" };

  if (
    recipient.resend_last_event_at &&
    Date.parse(recipient.resend_last_event_at) > Date.parse(update.eventCreatedAt)
  ) {
    return { ok: true, ignored: true, reason: "stale-event" };
  }

  const patch: Database["public"]["Tables"]["shared_link_recipients"]["Update"] = {
    delivery_status: update.deliveryStatus,
    resend_delivery_metadata: update.metadata,
    resend_email_id: update.emailId,
    resend_last_event_at: update.eventCreatedAt,
    resend_last_event_id: update.eventId,
    resend_last_event_type: update.eventType,
    updated_at: new Date().toISOString(),
  };

  if (update.lastOpenedAt) patch.last_opened_at = update.lastOpenedAt;

  const { error } = await admin.from("shared_link_recipients").update(patch).eq("id", recipient.id);
  if (error) throw error;

  return { ok: true, matched: true, deliveryStatus: update.deliveryStatus };
}
