import {
  checkProjectPublicationPasswordRateLimit,
  clearProjectPublicationPasswordFailures,
  recordProjectPublicationAnalyticsEvent,
  recordProjectPublicationEvent,
  recordProjectPublicationPasswordFailure,
  verifyProjectPublicationPasswordByToken,
} from "@/lib/publication/public-repository";
import {
  assertSameOriginPublicPost,
  createPublicationAccessCookie,
  getClientIp,
  isPasswordLocked,
  recordPasswordFailure,
  recordPasswordSuccess,
} from "@/lib/publication/security";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

function rateLimitedResponse(message: string, retryAfter: number) {
  return Response.json(
    { error: message },
    {
      status: 429,
      headers: { ...noStoreHeaders, "Retry-After": String(retryAfter) },
    },
  );
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const sameOrigin = assertSameOriginPublicPost(request);
  if (!sameOrigin.ok) {
    return Response.json({ error: sameOrigin.message }, { status: sameOrigin.status, headers: noStoreHeaders });
  }

  const { token } = await params;
  const body = (await request.json().catch(() => ({}))) as { password?: string };
  const password = typeof body.password === "string" ? body.password : "";

  const ip = getClientIp(request);

  const durableRateLimit = await checkProjectPublicationPasswordRateLimit({ token, request });
  if (!durableRateLimit.allowed) {
    await recordProjectPublicationEvent({
      token,
      eventType: "password_attempt",
      request,
      metadata: { success: false, reason: "locked" },
    });
    return rateLimitedResponse(durableRateLimit.message, durableRateLimit.retryAfter);
  }

  // P10: hard lockout check (additive; no-pw tokens bypass entirely via page gate)
  if (isPasswordLocked(ip, token)) {
    await recordProjectPublicationEvent({
      token,
      eventType: "password_attempt", // P10 (type extended additively in public-repository.ts per P3 migration)
      request,
      metadata: { success: false, reason: "locked" },
    });
    return rateLimitedResponse("Too many attempts. Please try again later.", 15 * 60);
  }

  const publicationAccess = await verifyProjectPublicationPasswordByToken(token, password);
  const success = !!publicationAccess;

  // P10: always record password_attempt (success/failure in meta) on every attempt (post-CSRF)
  await recordProjectPublicationEvent({
    token,
    eventType: "password_attempt",
    request,
    metadata: { success },
  });
  await recordProjectPublicationAnalyticsEvent({
    token,
    eventType: "password_attempt",
    accessStage: "password_unlocked",
    passwordSuccess: success,
    request,
  });

  if (!success) {
    const durableFailure = await recordProjectPublicationPasswordFailure({ token, request });
    const delayMs = Math.max(durableFailure.delayMs, recordPasswordFailure(ip, token));
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return Response.json({ error: "Publication password is invalid." }, { status: 401, headers: noStoreHeaders });
  }

  recordPasswordSuccess(ip, token);
  await clearProjectPublicationPasswordFailures({ token, request });

  return new Response(null, {
    status: 204,
    headers: {
      ...noStoreHeaders,
      "Set-Cookie": createPublicationAccessCookie({
        token,
        publicationId: publicationAccess.publicationId,
        credentialVersion: publicationAccess.credentialVersion,
      }),
    },
  });
}
