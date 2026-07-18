import "server-only";

import { readBoundedJsonBody } from "@/lib/http/read-bounded-body";
import {
  CLIENT_PORTAL_NO_STORE_HEADERS,
  requiresClientPortalPassword,
  resolveClientPortalRecipientActor,
} from "@/lib/client-portal/public-repository";
import { assertSameOriginPublicPost, createSharedLinkSessionCookie } from "@/lib/publication/security";
import { checkClientPortalSessionStartRateLimit } from "@/lib/client-portal/public-rate-limits";

export async function clientPortalRecipientVerificationResponse(request: Request, token: string) {
  const origin = assertSameOriginPublicPost(request);
  if (!origin.ok) return Response.json({ error: origin.message }, { status: origin.status, headers: CLIENT_PORTAL_NO_STORE_HEADERS });

  const rateLimit = await checkClientPortalSessionStartRateLimit({ token, request });
  if (!rateLimit.allowed) {
    return Response.json(
      { error: rateLimit.message },
      { status: 429, headers: { ...CLIENT_PORTAL_NO_STORE_HEADERS, "Retry-After": String(rateLimit.retryAfter) } },
    );
  }

  const body = await readBoundedJsonBody<{ recipientToken?: unknown; verificationToken?: unknown }>(request, 256);
  if (!body.ok) return Response.json({ error: body.error }, { status: body.status, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  if (await requiresClientPortalPassword(token, request.headers.get("cookie") ?? "")) {
    return Response.json(
      { error: "Client Portal password required.", passwordRequired: true },
      { status: 423, headers: CLIENT_PORTAL_NO_STORE_HEADERS },
    );
  }

  const recipientToken = typeof body.value.verificationToken === "string"
    ? body.value.verificationToken
    : typeof body.value.recipientToken === "string"
      ? body.value.recipientToken
      : "";
  const result = await resolveClientPortalRecipientActor(token, recipientToken);
  if (!result) return Response.json({ error: "Recipient credential is invalid." }, { status: 404, headers: CLIENT_PORTAL_NO_STORE_HEADERS });

  return Response.json(
    {
      ok: true,
      recipient: {
        displayName: result.displayName,
        role: result.actor.role,
        verified: result.actor.verificationState === "verified",
      },
      capabilities: result.capabilities,
    },
    {
      headers: {
        ...CLIENT_PORTAL_NO_STORE_HEADERS,
        "Set-Cookie": createSharedLinkSessionCookie({
          token,
          publicationId: result.portalId,
          credentialVersion: result.credentialVersion,
          recipientId: result.actor.recipientId,
        }),
      },
    },
  );
}
