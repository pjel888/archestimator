import {
  checkProjectPublicationEventRateLimit,
  checkProjectPublicationSnapshotRateLimit,
  recordProjectPublicationEvent,
  resolveProjectPublicationAccessByToken,
  resolveProjectPublicationSnapshotByToken,
} from "@/lib/publication/public-repository";
import { hasPublicationAccessCookie } from "@/lib/publication/security";
import { sanitizeProjectPublicationSnapshotForPublicRead } from "@/lib/publication/snapshot";
import { after } from "next/server";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const rateLimit = await checkProjectPublicationSnapshotRateLimit({ token, request });
  if (!rateLimit.allowed) {
    return Response.json(
      { error: rateLimit.message },
      {
        status: 429,
        headers: { ...noStoreHeaders, "Retry-After": String(rateLimit.retryAfter) },
      },
    );
  }

  const publicationAccess = await resolveProjectPublicationAccessByToken(token);

  if (!publicationAccess) {
    return Response.json({ error: "Publication not found." }, { status: 404, headers: noStoreHeaders });
  }

  if (
    publicationAccess.passwordRequired &&
    !hasPublicationAccessCookie(request.headers.get("cookie") ?? "", {
      token,
      publicationId: publicationAccess.publicationId,
      credentialVersion: publicationAccess.credentialVersion,
    })
  ) {
    return Response.json(
      {
        error: "Publication password required.",
        passwordRequired: true,
      },
      { status: 423, headers: noStoreHeaders },
    );
  }

  const publication = await resolveProjectPublicationSnapshotByToken(token);
  if (!publication) {
    return Response.json({ error: "Publication not found." }, { status: 404, headers: noStoreHeaders });
  }

  after(async () => {
    try {
      const eventRateLimit = await checkProjectPublicationEventRateLimit({ token, request });
      if (!eventRateLimit.allowed) return;
      await recordProjectPublicationEvent({
        token,
        eventType: "open",
        request,
        metadata: {},
      });
    } catch (error) {
      console.error("[publication] Failed to record public snapshot open event", error);
    }
  });

  return Response.json(
    {
      publicationId: publication.publicationId,
      passwordRequired: publication.passwordRequired,
      snapshot: sanitizeProjectPublicationSnapshotForPublicRead(publication.snapshot),
    },
    { headers: noStoreHeaders },
  );
}
