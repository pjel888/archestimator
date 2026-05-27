import { assertSameOriginPublicPost } from "@/lib/publication/security";
import { recordProjectPublicationEvent, type ProjectPublicationEventType } from "@/lib/publication/public-repository";

export const dynamic = "force-dynamic";

const allowedEvents = new Set<ProjectPublicationEventType>([
  "open",
  "password_success",
  "password_failure",
  "download_attempt_blocked",
]);

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const sameOrigin = assertSameOriginPublicPost(request);
  if (!sameOrigin.ok) {
    return Response.json({ error: sameOrigin.message }, { status: sameOrigin.status, headers: { "Cache-Control": "no-store" } });
  }

  const { token } = await params;
  const body = (await request.json().catch(() => ({}))) as { eventType?: string; metadata?: Record<string, unknown> };
  const eventType = body.eventType;
  if (!eventType || !allowedEvents.has(eventType as ProjectPublicationEventType)) {
    return Response.json({ error: "Publication event is invalid." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  await recordProjectPublicationEvent({
    token,
    eventType: eventType as ProjectPublicationEventType,
    request,
    metadata: body.metadata ?? {},
  });

  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
