import { NextResponse } from "next/server";

import { recordProjectPublicationAnalyticsEvent, verifySharedLinkRecipientToken } from "@/lib/publication/public-repository";
import {
  createSharedLinkSessionCookieName,
  getSharedLinkSessionCookieParts,
} from "@/lib/publication/security";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

function createExpiredCookie(name: string, { httpOnly }: { httpOnly: boolean }) {
  const secureCookie = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const httpOnlyCookie = httpOnly ? "; HttpOnly" : "";
  return `${name}=; Path=/; SameSite=Lax; Max-Age=0${httpOnlyCookie}${secureCookie}`;
}

function assertSameOrigin(request: Request): { ok: true } | { ok: false; status: number; message: string } {
  const origin = request.headers.get("origin");
  if (!origin) return { ok: true };

  const requestOrigin = new URL(request.url).origin;
  if (origin !== requestOrigin) {
    return { ok: false, status: 403, message: "Cross-origin shared-link session requests are blocked." };
  }

  return { ok: true };
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const sameOrigin = assertSameOrigin(request);
  if (!sameOrigin.ok) {
    return NextResponse.json({ error: sameOrigin.message }, { status: sameOrigin.status, headers: noStoreHeaders });
  }

  const { token } = await params;
  const body = (await request.json().catch(() => ({}))) as { recipientToken?: unknown };
  const recipientToken = typeof body.recipientToken === "string" ? body.recipientToken.trim() : "";
  if (!recipientToken) {
    return NextResponse.json({ error: "Recipient token is required." }, { status: 400, headers: noStoreHeaders });
  }

  const verified = await verifySharedLinkRecipientToken(token, recipientToken);
  if (!verified) {
    return NextResponse.json({ error: "Recipient token is invalid." }, { status: 404, headers: noStoreHeaders });
  }

  const parts = getSharedLinkSessionCookieParts({
    token,
    publicationId: verified.publicationId,
    snapshotVersion: verified.snapshotVersion,
    recipientId: verified.recipientId,
  });
  const response = NextResponse.json({ ok: true }, { headers: noStoreHeaders });

  response.cookies.set(parts.name, parts.value, parts.cookieOptions);
  response.cookies.set(`${parts.name}_ok`, "1", {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 86400,
    secure: process.env.NODE_ENV === "production",
  });

  await recordProjectPublicationAnalyticsEvent({
    token,
    eventType: "open",
    accessStage: "recipient_session_started",
    recipientKnown: true,
    recipientId: verified.recipientId,
    request,
  });

  return response;
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sessionName = createSharedLinkSessionCookieName(token);
  const response = NextResponse.json({ ok: true }, { headers: noStoreHeaders });

  response.headers.append("Set-Cookie", createExpiredCookie(sessionName, { httpOnly: true }));
  response.headers.append("Set-Cookie", createExpiredCookie(`${sessionName}_ok`, { httpOnly: false }));

  return response;
}
