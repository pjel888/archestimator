import {
  recordProjectPublicationEvent,
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

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const sameOrigin = assertSameOriginPublicPost(request);
  if (!sameOrigin.ok) {
    return Response.json({ error: sameOrigin.message }, { status: sameOrigin.status, headers: noStoreHeaders });
  }

  const { token } = await params;
  const body = (await request.json().catch(() => ({}))) as { password?: string };
  const password = typeof body.password === "string" ? body.password : "";

  const ip = getClientIp(request);

  // P10: hard lockout check (additive; no-pw tokens bypass entirely via page gate)
  if (isPasswordLocked(ip, token)) {
    await recordProjectPublicationEvent({
      token,
      eventType: "password_attempt", // P10 (type extended additively in public-repository.ts per P3 migration)
      request,
      metadata: { success: false, reason: "locked" },
    });
    return Response.json({ error: "Too many attempts. Please try again later." }, { status: 429, headers: noStoreHeaders });
  }

  const publicationAccess = await verifyProjectPublicationPasswordByToken(token, password);
  const success = !!publicationAccess;

  // P10: always record password_attempt (success/failure in meta) on every attempt (post-CSRF)
  await recordProjectPublicationEvent({
    token,
    eventType: "password_attempt" as any,
    request,
    metadata: { success },
  });

  if (!success) {
    const delayMs = recordPasswordFailure(ip, token);
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return Response.json({ error: "Publication password is invalid." }, { status: 401, headers: noStoreHeaders });
  }

  recordPasswordSuccess(ip, token);

  return new Response(null, {
    status: 204,
    headers: {
      ...noStoreHeaders,
      "Set-Cookie": createPublicationAccessCookie({
        token,
        publicationId: publicationAccess.publicationId,
        snapshotVersion: publicationAccess.snapshotVersion,
      }),
    },
  });
}
