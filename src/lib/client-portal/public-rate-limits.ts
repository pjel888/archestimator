import "server-only";

import {
  getClientIp,
  hashPublicationToken,
  hashPublicTelemetryValue,
  readPublicationTokenHashSecret,
} from "@/lib/publication/security";
import {
  checkExistingDurableRateLimit,
  checkRecordedDurableRateLimit,
  clearDurableRateLimitEvents,
  recordDurableRateLimitEvent,
  type DurableRateLimitResult,
  type DurableRateLimitWindow,
} from "@/lib/security/durable-rate-limits";

type ClientPortalRateLimitScope =
  | "client_portal_artifact_range"
  | "client_portal_decision"
  | "client_portal_decision_read"
  | "client_portal_evidence_upload_ip"
  | "client_portal_evidence_upload_portal"
  | "client_portal_evidence_upload_recipient"
  | "client_portal_evidence_upload_workspace"
  | "client_portal_password"
  | "client_portal_public_read"
  | "client_portal_session_start"
  | "client_portal_thread"
  | "client_portal_thread_read";

function genericRateLimitMessage(retryAfter: number) {
  return `Too many attempts. Please wait ${retryAfter} seconds.`;
}

function commentRateLimitMessage(retryAfter: number) {
  return `Too many comments. Please wait ${retryAfter} seconds.`;
}

function uploadRateLimitMessage(retryAfter: number) {
  return `Too many evidence uploads. Please wait ${retryAfter} seconds.`;
}

const CLIENT_PORTAL_PASSWORD_FAILURE_WINDOW_SECONDS = 60 * 60;
const CLIENT_PORTAL_PASSWORD_FAILURE_LIMIT = 5;

function clientPortalRequestRateLimitKey(token: string, request: Request) {
  return [
    hashPublicationToken(token, readPublicationTokenHashSecret()),
    hashPublicTelemetryValue(getClientIp(request)) ?? "unknown",
  ];
}

export async function checkClientPortalPublicReadRateLimit({
  token,
  request,
  route,
}: {
  token: string;
  request: Request;
  route: "asset" | "manifest" | "section" | "summary" | "timeline";
}): Promise<DurableRateLimitResult> {
  const scope: ClientPortalRateLimitScope = "client_portal_public_read";
  return checkRecordedDurableRateLimit({
    scope,
    keyParts: clientPortalRequestRateLimitKey(token, request),
    metadata: { route: `client_portal_${route}` },
    windows: [{ seconds: 60, limit: 60, message: genericRateLimitMessage }],
  });
}

export async function checkClientPortalArtifactRangeRateLimit({
  portalId,
  publicArtifactId,
  recipientId,
  request,
}: {
  portalId: string;
  publicArtifactId: string;
  recipientId: string | null;
  request: Request;
}): Promise<DurableRateLimitResult> {
  const scope: ClientPortalRateLimitScope = "client_portal_artifact_range";
  const anonymousKey = hashPublicTelemetryValue(getClientIp(request)) ?? "unknown";
  return checkRecordedDurableRateLimit({
    scope,
    keyParts: [portalId, publicArtifactId, recipientId ?? `anonymous:${anonymousKey}`],
    metadata: { route: "client_portal_artifact_range" },
    windows: [
      { seconds: 60, limit: 60, message: genericRateLimitMessage },
      { seconds: 60 * 60, limit: 600, message: genericRateLimitMessage },
    ],
  });
}

export async function checkClientPortalEvidenceUploadRateLimits({
  portalId,
  recipientId,
  workspaceId,
  request,
}: {
  portalId: string;
  recipientId: string;
  workspaceId: string;
  request: Request;
}): Promise<DurableRateLimitResult> {
  const hashedIp = hashPublicTelemetryValue(getClientIp(request)) ?? "unknown";
  const buckets: Array<{
    scope: Extract<ClientPortalRateLimitScope,
      | "client_portal_evidence_upload_ip"
      | "client_portal_evidence_upload_portal"
      | "client_portal_evidence_upload_recipient"
      | "client_portal_evidence_upload_workspace">;
    keyParts: string[];
    windows: DurableRateLimitWindow[];
  }> = [
    {
      scope: "client_portal_evidence_upload_recipient",
      keyParts: [recipientId],
      windows: [
        { seconds: 60, limit: 5, message: uploadRateLimitMessage },
        { seconds: 60 * 60, limit: 20, message: uploadRateLimitMessage },
      ],
    },
    {
      scope: "client_portal_evidence_upload_portal",
      keyParts: [portalId],
      windows: [
        { seconds: 60, limit: 20, message: uploadRateLimitMessage },
        { seconds: 60 * 60, limit: 100, message: uploadRateLimitMessage },
      ],
    },
    {
      scope: "client_portal_evidence_upload_workspace",
      keyParts: [workspaceId],
      windows: [
        { seconds: 60, limit: 40, message: uploadRateLimitMessage },
        { seconds: 60 * 60, limit: 200, message: uploadRateLimitMessage },
      ],
    },
    {
      scope: "client_portal_evidence_upload_ip",
      keyParts: [hashedIp],
      windows: [
        { seconds: 60, limit: 10, message: uploadRateLimitMessage },
        { seconds: 60 * 60, limit: 50, message: uploadRateLimitMessage },
      ],
    },
  ];
  const results = await Promise.all(buckets.map((bucket) => checkRecordedDurableRateLimit({
    ...bucket,
    metadata: { route: "client_portal_evidence_upload" },
  })));
  return results.find((result) => !result.allowed) ?? { allowed: true };
}

export async function checkClientPortalPasswordRateLimit({
  token,
  request,
}: {
  token: string;
  request: Request;
}): Promise<DurableRateLimitResult> {
  const scope: ClientPortalRateLimitScope = "client_portal_password";
  return checkExistingDurableRateLimit({
    scope,
    keyParts: clientPortalRequestRateLimitKey(token, request),
    window: {
      seconds: CLIENT_PORTAL_PASSWORD_FAILURE_WINDOW_SECONDS,
      limit: CLIENT_PORTAL_PASSWORD_FAILURE_LIMIT,
      message: genericRateLimitMessage,
    },
  });
}

export async function recordClientPortalPasswordFailure({
  token,
  request,
}: {
  token: string;
  request: Request;
}) {
  const scope: ClientPortalRateLimitScope = "client_portal_password";
  await recordDurableRateLimitEvent({
    scope,
    keyParts: clientPortalRequestRateLimitKey(token, request),
    metadata: { route: "client_portal_password", success: false },
    ttlSeconds: CLIENT_PORTAL_PASSWORD_FAILURE_WINDOW_SECONDS,
  });
}

export async function clearClientPortalPasswordFailures({
  token,
  request,
}: {
  token: string;
  request: Request;
}) {
  const scope: ClientPortalRateLimitScope = "client_portal_password";
  await clearDurableRateLimitEvents(scope, clientPortalRequestRateLimitKey(token, request));
}

export async function checkClientPortalSessionStartRateLimit({
  token,
  request,
}: {
  token: string;
  request: Request;
}): Promise<DurableRateLimitResult> {
  const scope: ClientPortalRateLimitScope = "client_portal_session_start";
  return checkRecordedDurableRateLimit({
    scope,
    keyParts: clientPortalRequestRateLimitKey(token, request),
    metadata: { route: "client_portal_recipient_session" },
    windows: [
      { seconds: 60, limit: 10, message: genericRateLimitMessage },
      { seconds: 60 * 60, limit: 50, message: genericRateLimitMessage },
    ],
  });
}

async function checkClientPortalRecipientRateLimit({
  portalId,
  recipientId,
  scope,
  route,
  windows,
}: {
  portalId: string;
  recipientId: string;
  scope: Extract<
    ClientPortalRateLimitScope,
    "client_portal_decision" | "client_portal_decision_read" | "client_portal_thread" | "client_portal_thread_read"
  >;
  route: string;
  windows: DurableRateLimitWindow[];
}): Promise<DurableRateLimitResult> {
  return checkRecordedDurableRateLimit({
    scope,
    keyParts: [portalId, recipientId],
    metadata: { route },
    windows,
  });
}

export async function checkClientPortalThreadRateLimit({
  portalId,
  recipientId,
}: {
  portalId: string;
  recipientId: string;
}): Promise<DurableRateLimitResult> {
  return checkClientPortalRecipientRateLimit({
    scope: "client_portal_thread",
    portalId,
    recipientId,
    route: "client_portal_thread",
    windows: [
      { seconds: 60, limit: 5, message: commentRateLimitMessage },
      { seconds: 60 * 60, limit: 20, message: commentRateLimitMessage },
    ],
  });
}

export async function checkClientPortalThreadReadRateLimit({
  portalId,
  recipientId,
}: {
  portalId: string;
  recipientId: string;
}): Promise<DurableRateLimitResult> {
  return checkClientPortalRecipientRateLimit({
    scope: "client_portal_thread_read",
    portalId,
    recipientId,
    route: "client_portal_thread_read",
    windows: [{ seconds: 60, limit: 60, message: genericRateLimitMessage }],
  });
}

export async function checkClientPortalDecisionRateLimit({
  portalId,
  recipientId,
}: {
  portalId: string;
  recipientId: string;
}): Promise<DurableRateLimitResult> {
  return checkClientPortalRecipientRateLimit({
    scope: "client_portal_decision",
    portalId,
    recipientId,
    route: "client_portal_decision",
    windows: [{ seconds: 60, limit: 5, message: genericRateLimitMessage }],
  });
}

export async function checkClientPortalDecisionReadRateLimit({
  portalId,
  recipientId,
}: {
  portalId: string;
  recipientId: string;
}): Promise<DurableRateLimitResult> {
  return checkClientPortalRecipientRateLimit({
    scope: "client_portal_decision_read",
    portalId,
    recipientId,
    route: "client_portal_decision_read",
    windows: [{ seconds: 60, limit: 60, message: genericRateLimitMessage }],
  });
}
