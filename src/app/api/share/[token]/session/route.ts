import { after, NextResponse } from "next/server";

import { logAppError } from "@/lib/observability/logger";
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
import { readBoundedJsonBody } from "@/lib/http/read-bounded-body";
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

type RecipientSessionMode = "json" | "redirect";

function createCleanShareUrl(request: Request, token: string, sessionStatus?: "invalid") {
  const url = new URL(`/share/${encodeURIComponent(token)}`, request.url);
  if (sessionStatus) url.searchParams.set("recipientSession", sessionStatus);
  return url;
}

function redirectToCleanShare(request: Request, token: string, sessionStatus?: "invalid") {
  const response = NextResponse.redirect(createCleanShareUrl(request, token, sessionStatus));
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function createSessionSuccessResponse(request: Request, token: string, mode: RecipientSessionMode) {
  return mode === "redirect"
    ? redirectToCleanShare(request, token)
    : NextResponse.json({ ok: true }, { headers: noStoreHeaders });
}

function createInvalidRecipientResponse(request: Request, token: string, mode: RecipientSessionMode) {
  return mode === "redirect"
    ? redirectToCleanShare(request, token, "invalid")
    : NextResponse.json({ error: "Recipient token is invalid." }, { status: 404, headers: noStoreHeaders });
}

async function createRecipientSessionResponse({
  mode,
  recipientToken,
  request,
  token,
}: {
  mode: RecipientSessionMode;
  recipientToken: string;
  request: Request;
  token: string;
}) {
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
    return createInvalidRecipientResponse(request, token, mode);
  }

  const parts = getSharedLinkSessionCookieParts({
    token,
    publicationId: verified.publicationId,
    credentialVersion: verified.credentialVersion,
    recipientId: verified.recipientId,
  });
  const response = createSessionSuccessResponse(request, token, mode);

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
    } catch (error) {
      logAppError(error, {
        event: "deferred_analytics_error",
        context: {
          route: "/api/share/[token]/session",
          route_handler: "GET|POST /api/share/[token]/session",
          deferred_operation: "record_recipient_session_started",
        },
      });
    }
  });

  return response;
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: routeToken } = await params;
  const token = routeToken.trim();
  const recipientToken = new URL(request.url).searchParams.get("recipient")?.trim() ?? "";
  if (!recipientToken) {
    return NextResponse.json({ error: "Recipient token is required." }, { status: 400, headers: noStoreHeaders });
  }

  return createRecipientSessionResponse({ mode: "redirect", recipientToken, request, token });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const sameOrigin = assertSameOriginPublicPost(request);
  if (!sameOrigin.ok) {
    return NextResponse.json({ error: sameOrigin.message }, { status: sameOrigin.status, headers: noStoreHeaders });
  }

  const { token: routeToken } = await params;
  const token = routeToken.trim();
  const parsedBody = await readBoundedJsonBody<{ recipientToken?: unknown }>(request, 256);
  if (!parsedBody.ok) {
    return NextResponse.json({ error: parsedBody.error }, { status: parsedBody.status, headers: noStoreHeaders });
  }
  const body = parsedBody.value;
  const recipientToken = typeof body.recipientToken === "string" ? body.recipientToken.trim() : "";
  if (!recipientToken) {
    return NextResponse.json({ error: "Recipient token is required." }, { status: 400, headers: noStoreHeaders });
  }

  return createRecipientSessionResponse({ mode: "json", recipientToken, request, token });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const sameOrigin = assertSameOriginPublicDelete(request);
  if (!sameOrigin.ok) {
    return NextResponse.json({ error: sameOrigin.message }, { status: sameOrigin.status, headers: noStoreHeaders });
  }

  const { token: routeToken } = await params;
  const token = routeToken.trim();
  const sessionName = createSharedLinkSessionCookieName(token);
  const response = NextResponse.json({ ok: true }, { headers: noStoreHeaders });

  response.headers.append("Set-Cookie", createExpiredCookie(sessionName, { httpOnly: true }));
  response.headers.append("Set-Cookie", createExpiredCookie(`${sessionName}_ok`, { httpOnly: false }));

  return response;
}
