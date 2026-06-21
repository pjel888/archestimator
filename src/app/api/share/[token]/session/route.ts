import { after, NextResponse } from "next/server";

import {
  checkSharedLinkSessionStartRateLimit,
  recordProjectPublicationAnalyticsEvent,
  resolveProjectPublicationAccessByToken,
  verifySharedLinkRecipientToken,
} from "@/lib/publication/public-repository";
import {
  assertSameOriginPublicDelete,
  assertSameOriginPublicPost,
  createSharedLinkSessionCookieName,
  getSharedLinkSessionCookieParts,
  hasPublicationAccessCookie,
} from "@/lib/publication/security";
import { sharedLinkUnavailableErrorBody } from "@/lib/publication/share-copy";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

function createExpiredCookie(name: string, { httpOnly }: { httpOnly: boolean }) {
  const secureCookie = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const httpOnlyCookie = httpOnly ? "; HttpOnly" : "";
  return `${name}=; Path=/; SameSite=Lax; Max-Age=0${httpOnlyCookie}${secureCookie}`;
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const sameOrigin = assertSameOriginPublicPost(request);
  if (!sameOrigin.ok) {
    return NextResponse.json({ error: sameOrigin.message }, { status: sameOrigin.status, headers: noStoreHeaders });
  }

  const { token } = await params;
  const body = (await request.json().catch(() => ({}))) as { recipientToken?: unknown };
  const recipientToken = typeof body.recipientToken === "string" ? body.recipientToken.trim() : "";
  if (!recipientToken) {
    return NextResponse.json({ error: "Recipient token is required." }, { status: 400, headers: noStoreHeaders });
  }

  const rateLimit = await checkSharedLinkSessionStartRateLimit({ token, request });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: rateLimit.message },
      {
        status: 429,
        headers: { ...noStoreHeaders, "Retry-After": String(rateLimit.retryAfter) },
      },
    );
  }

  const publicationAccess = await resolveProjectPublicationAccessByToken(token);
  if (!publicationAccess) {
    return NextResponse.json(sharedLinkUnavailableErrorBody(), { status: 404, headers: noStoreHeaders });
  }

  if (
    publicationAccess.passwordRequired &&
    !hasPublicationAccessCookie(request.headers.get("cookie") ?? "", {
      token,
      publicationId: publicationAccess.publicationId,
      credentialVersion: publicationAccess.credentialVersion,
    })
  ) {
    return NextResponse.json(
      { error: "Publication password required.", passwordRequired: true },
      { status: 423, headers: noStoreHeaders },
    );
  }

  const verified = await verifySharedLinkRecipientToken(token, recipientToken);
  if (!verified || verified.publicationId !== publicationAccess.publicationId) {
    return NextResponse.json({ error: "Recipient token is invalid." }, { status: 404, headers: noStoreHeaders });
  }

  const parts = getSharedLinkSessionCookieParts({
    token,
    publicationId: verified.publicationId,
    credentialVersion: verified.credentialVersion,
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

  after(async () => {
    try {
      await recordProjectPublicationAnalyticsEvent({
        token,
        eventType: "open",
        accessStage: "recipient_session_started",
        recipientKnown: true,
        recipientId: verified.recipientId,
        request,
      });
    } catch {}
  });

  return response;
}

export async function DELETE(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const sameOrigin = assertSameOriginPublicDelete(request);
  if (!sameOrigin.ok) {
    return NextResponse.json({ error: sameOrigin.message }, { status: sameOrigin.status, headers: noStoreHeaders });
  }

  const { token } = await params;
  const sessionName = createSharedLinkSessionCookieName(token);
  const response = NextResponse.json({ ok: true }, { headers: noStoreHeaders });

  response.headers.append("Set-Cookie", createExpiredCookie(sessionName, { httpOnly: true }));
  response.headers.append("Set-Cookie", createExpiredCookie(`${sessionName}_ok`, { httpOnly: false }));

  return response;
}
