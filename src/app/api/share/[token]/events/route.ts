import { assertSameOriginPublicPost } from "@/lib/publication/security";
import {
  checkProjectPublicationEventRateLimit,
  recordProjectPublicationEvent,
  type ProjectPublicationEventType,
} from "@/lib/publication/public-repository";

export const dynamic = "force-dynamic";

const allowedEvents = new Set<ProjectPublicationEventType>([
  "open",
  "password_success",
  "password_failure",
  "download_attempt_blocked",
]);

const allowedMetadataKeys = new Set(["durationMs", "format", "reason", "source", "success", "target"]);
const maxMetadataKeys = 6;
const maxMetadataStringLength = 160;
const maxMetadataSerializedBytes = 512;
const metadataError = "Publication event metadata is invalid.";

type PublicEventMetadata = Record<string, boolean | number | string>;

function readBody(value: unknown): { eventType?: string; metadata?: unknown } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as { eventType?: string; metadata?: unknown };
}

function normalizePublicEventMetadata(metadata: unknown): PublicEventMetadata | null {
  if (typeof metadata === "undefined") return {};
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;

  const entries = Object.entries(metadata);
  if (entries.length > maxMetadataKeys) return null;

  const normalized: PublicEventMetadata = {};
  for (const [key, value] of entries) {
    if (!allowedMetadataKeys.has(key)) return null;

    if (typeof value === "string") {
      if (value.length > maxMetadataStringLength) return null;
      normalized[key] = value;
      continue;
    }

    if (typeof value === "number") {
      if (!Number.isFinite(value)) return null;
      normalized[key] = value;
      continue;
    }

    if (typeof value === "boolean") {
      normalized[key] = value;
      continue;
    }

    return null;
  }

  if (new TextEncoder().encode(JSON.stringify(normalized)).length > maxMetadataSerializedBytes) return null;
  return normalized;
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const sameOrigin = assertSameOriginPublicPost(request);
  if (!sameOrigin.ok) {
    return Response.json({ error: sameOrigin.message }, { status: sameOrigin.status, headers: { "Cache-Control": "no-store" } });
  }

  const { token } = await params;
  const body = readBody(await request.json().catch(() => ({})));
  const eventType = body.eventType;
  if (!eventType || !allowedEvents.has(eventType as ProjectPublicationEventType)) {
    return Response.json({ error: "Publication event is invalid." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const metadata = normalizePublicEventMetadata(body.metadata);
  if (!metadata) {
    return Response.json({ error: metadataError }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const rateLimit = await checkProjectPublicationEventRateLimit({ token, request });
  if (!rateLimit.allowed) {
    return Response.json(
      { error: rateLimit.message },
      {
        status: 429,
        headers: { "Cache-Control": "no-store", "Retry-After": String(rateLimit.retryAfter) },
      },
    );
  }

  await recordProjectPublicationEvent({
    token,
    eventType: eventType as ProjectPublicationEventType,
    request,
    metadata,
  });

  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
