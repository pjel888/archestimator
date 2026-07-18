import {
  checkProjectPublicationEventRateLimit,
  checkProjectPublicationSnapshotRateLimit,
} from "@/lib/publication/public-rate-limits";
import {
  recordProjectPublicationEvent,
  resolveProjectPublicationAccessByToken,
  resolveProjectPublicationSnapshotByToken,
} from "@/lib/publication/public-repository";
import { logAppError } from "@/lib/observability/logger";
import { errorResponse } from "@/lib/observability/route-error";
import { hasPublicationAccessCookie } from "@/lib/publication/security";
import { sharedLinkUnavailableErrorBody } from "@/lib/publication/share-copy";
import { after } from "next/server";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
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
      return Response.json(sharedLinkUnavailableErrorBody(), { status: 404, headers: noStoreHeaders });
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
      return Response.json(sharedLinkUnavailableErrorBody(), { status: 404, headers: noStoreHeaders });
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
        logAppError(error, {
          event: "shared_link_open_event_record_error",
          action: "record_project_publication_open_event",
          context: {
            route: "/api/share/[token]",
            route_handler: "GET /api/share/[token]",
          },
        });
      }
    });

    return Response.json(
      {
        publicationId: publication.snapshot.project.id,
        passwordRequired: publication.passwordRequired,
        snapshot: publication.snapshot,
      },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    const response = errorResponse(error, { context: { route: "share_snapshot_get" } });
    response.headers.set("Cache-Control", noStoreHeaders["Cache-Control"]);
    return response;
  }
}
