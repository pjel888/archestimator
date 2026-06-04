import { NextResponse } from "next/server";

import { recordResendEmailWebhookEvent, verifyResendWebhookPayload } from "@/lib/email/resend-webhooks";

export const runtime = "nodejs";

export const RESEND_WEBHOOK_MAX_BODY_BYTES = 256 * 1024;

function readContentLength(headers: Headers) {
  const raw = headers.get("content-length")?.trim();
  if (!raw || !/^\d+$/.test(raw)) return null;
  return Number.parseInt(raw, 10);
}

function isOversizedPayload(payload: string) {
  return new TextEncoder().encode(payload).byteLength > RESEND_WEBHOOK_MAX_BODY_BYTES;
}

export async function POST(req: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json({ error: "Resend webhook is not configured." }, { status: 503 });
  }

  const contentLength = readContentLength(req.headers);
  if (contentLength !== null && contentLength > RESEND_WEBHOOK_MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Webhook payload is too large." }, { status: 413 });
  }

  const payload = await req.text();
  if (isOversizedPayload(payload)) {
    return NextResponse.json({ error: "Webhook payload is too large." }, { status: 413 });
  }

  let event;
  try {
    event = verifyResendWebhookPayload({
      payload,
      headers: req.headers,
      webhookSecret,
    });
  } catch {
    return NextResponse.json({ error: "Invalid webhook." }, { status: 400 });
  }

  try {
    const result = await recordResendEmailWebhookEvent(event, req.headers.get("svix-id"));
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
