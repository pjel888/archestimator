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
} from "@/lib/publication/security";
import { logAppError } from "@/lib/observability/logger";
import { readBoundedJsonBody } from "@/lib/http/read-bounded-body";
import { after } from "next/server";

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

function schedulePasswordSuccessAnalytics({ token, request }: { token: string; request: Request }) {
  after(async () => {
    try {
      await recordProjectPublicationAnalyticsEvent({
        token,
        eventType: "password_attempt",
        accessStage: "password_unlocked",
        passwordSuccess: true,
        request,
      });
    } catch (error) {
      logAppError(error, {
        event: "deferred_analytics_error",
        context: {
          route: "/api/share/[token]/password",
          route_handler: "POST /api/share/[token]/password",
          deferred_operation: "record_password_success_analytics",
        },
      });
    }
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const sameOrigin = assertSameOriginPublicPost(request);
  if (!sameOrigin.ok) {
    return Response.json({ error: sameOrigin.message }, { status: sameOrigin.status, headers: noStoreHeaders });
  }

  const { token: routeToken } = await params;
  const token = routeToken.trim();
  const parsedBody = await readBoundedJsonBody<{ password?: string }>(request, 256);
  if (!parsedBody.ok) {
    return Response.json({ error: parsedBody.error }, { status: parsedBody.status, headers: noStoreHeaders });
  }
  const body = parsedBody.value;
  const password = typeof body.password === "string" ? body.password : "";

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

  const publicationAccess = await verifyProjectPublicationPasswordByToken(token, password);
  const success = !!publicationAccess;

  // P10: always record password_attempt (success/failure in meta) on every attempt (post-CSRF)
  await recordProjectPublicationEvent({
    token,
    eventType: "password_attempt",
    request,
    metadata: { success },
  });

  if (!success) {
    await recordProjectPublicationAnalyticsEvent({
      token,
      eventType: "password_attempt",
      accessStage: "password_unlocked",
      passwordSuccess: false,
      request,
    });
    const durableFailure = await recordProjectPublicationPasswordFailure({ token, request });
    const delayMs = durableFailure.delayMs;
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return Response.json({ error: "Publication password is invalid." }, { status: 401, headers: noStoreHeaders });
  }

  try {
    await clearProjectPublicationPasswordFailures({ token, request });
  } catch (error) {
    logAppError(error, {
      event: "shared_link_password_failure_clear_error",
      action: "clear_project_publication_password_failures",
      context: {
        route: "/api/share/[token]/password",
        route_handler: "POST /api/share/[token]/password",
      },
    });
    return Response.json({ error: "Unable to unlock publication." }, { status: 500, headers: noStoreHeaders });
  }
  schedulePasswordSuccessAnalytics({ token, request });

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
