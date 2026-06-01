import { NextResponse } from "next/server";

import { recordResendEmailWebhookEvent, verifyResendWebhookPayload } from "@/lib/email/resend-webhooks";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json({ error: "Resend webhook is not configured." }, { status: 503 });
  }

  const payload = await req.text();
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
