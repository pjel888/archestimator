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
} from "@/lib/security/durable-rate-limits";

type PublicationRateLimitScope =
  | "project_publication_activity"
  | "project_publication_event"
  | "project_publication_password"
  | "project_publication_snapshot"
  | "proposal_export"
  | "shared_link_comment"
  | "shared_link_comment_read"
  | "shared_link_decision"
  | "shared_link_decision_read"
  | "shared_link_session_start"
  | "shared_link_unsubscribe";

function genericRateLimitMessage(retryAfter: number) {
  return `Too many attempts. Please wait ${retryAfter} seconds.`;
}

function commentRateLimitMessage(retryAfter: number) {
  return `Too many comments. Please wait ${retryAfter} seconds.`;
}

const PROJECT_PUBLICATION_PASSWORD_FAILURE_WINDOW_SECONDS = 60 * 60;
const PROJECT_PUBLICATION_PASSWORD_FAILURE_LIMIT = 5;

function publicationRequestRateLimitKey(token: string, request: Request) {
  return [
    hashPublicationToken(token, readPublicationTokenHashSecret()),
    hashPublicTelemetryValue(getClientIp(request)) ?? "unknown",
  ];
}

export async function checkProjectPublicationSnapshotRateLimit({
  token,
  request,
}: {
  token: string;
  request: Request;
}): Promise<DurableRateLimitResult> {
  const scope: PublicationRateLimitScope = "project_publication_snapshot";
  return checkRecordedDurableRateLimit({
    scope,
    keyParts: publicationRequestRateLimitKey(token, request),
    metadata: { route: "snapshot" },
    windows: [{ seconds: 60, limit: 60, message: genericRateLimitMessage }],
  });
}

export async function checkProposalExportRateLimit({
  userId,
  request,
}: {
  userId: string;
  request: Request;
}): Promise<DurableRateLimitResult> {
  const scope: PublicationRateLimitScope = "proposal_export";
  return checkRecordedDurableRateLimit({
    scope,
    keyParts: [userId, getClientIp(request)],
    metadata: { route: "proposal_export" },
    windows: [
      { seconds: 60, limit: 12, message: genericRateLimitMessage },
      { seconds: 60 * 60, limit: 120, message: genericRateLimitMessage },
    ],
  });
}

export async function checkProjectPublicationEventRateLimit({
  token,
  request,
}: {
  token: string;
  request: Request;
}): Promise<DurableRateLimitResult> {
  const scope: PublicationRateLimitScope = "project_publication_event";
  return checkRecordedDurableRateLimit({
    scope,
    keyParts: publicationRequestRateLimitKey(token, request),
    metadata: { route: "event" },
    windows: [{ seconds: 60, limit: 60, message: genericRateLimitMessage }],
  });
}

export async function checkProjectPublicationActivityRateLimit({
  token,
  request,
}: {
  token: string;
  request: Request;
}): Promise<DurableRateLimitResult> {
  const scope: PublicationRateLimitScope = "project_publication_activity";
  return checkRecordedDurableRateLimit({
    scope,
    keyParts: publicationRequestRateLimitKey(token, request),
    metadata: { route: "activity" },
    windows: [{ seconds: 60, limit: 60, message: genericRateLimitMessage }],
  });
}

export async function checkSharedLinkSessionStartRateLimit({
  token,
  request,
}: {
  token: string;
  request: Request;
}): Promise<DurableRateLimitResult> {
  const scope: PublicationRateLimitScope = "shared_link_session_start";
  return checkRecordedDurableRateLimit({
    scope,
    keyParts: publicationRequestRateLimitKey(token, request),
    metadata: { route: "recipient_session" },
    windows: [
      { seconds: 60, limit: 10, message: genericRateLimitMessage },
      { seconds: 60 * 60, limit: 50, message: genericRateLimitMessage },
    ],
  });
}

export async function checkProjectPublicationPasswordRateLimit({
  token,
  request,
}: {
  token: string;
  request: Request;
}): Promise<DurableRateLimitResult> {
  const scope: PublicationRateLimitScope = "project_publication_password";
  return checkExistingDurableRateLimit({
    scope,
    keyParts: publicationRequestRateLimitKey(token, request),
    window: {
      seconds: PROJECT_PUBLICATION_PASSWORD_FAILURE_WINDOW_SECONDS,
      limit: PROJECT_PUBLICATION_PASSWORD_FAILURE_LIMIT,
      message: genericRateLimitMessage,
    },
  });
}

export async function recordProjectPublicationPasswordFailure({
  token,
  request,
}: {
  token: string;
  request: Request;
}) {
  const scope: PublicationRateLimitScope = "project_publication_password";
  await recordDurableRateLimitEvent({
    scope,
    keyParts: publicationRequestRateLimitKey(token, request),
    metadata: { route: "password", success: false },
    ttlSeconds: PROJECT_PUBLICATION_PASSWORD_FAILURE_WINDOW_SECONDS,
  });
}

export async function clearProjectPublicationPasswordFailures({
  token,
  request,
}: {
  token: string;
  request: Request;
}) {
  const scope: PublicationRateLimitScope = "project_publication_password";
  await clearDurableRateLimitEvents(scope, publicationRequestRateLimitKey(token, request));
}

export async function checkSharedLinkCommentRateLimit({
  publicationId,
  recipientId,
}: {
  publicationId: string;
  recipientId: string;
}): Promise<DurableRateLimitResult> {
  const scope: PublicationRateLimitScope = "shared_link_comment";
  return checkRecordedDurableRateLimit({
    scope,
    keyParts: [publicationId, recipientId],
    metadata: { route: "comment" },
    windows: [
      { seconds: 60, limit: 5, message: commentRateLimitMessage },
      { seconds: 60 * 60, limit: 20, message: commentRateLimitMessage },
    ],
  });
}

export async function checkSharedLinkCommentReadRateLimit({
  publicationId,
  recipientId,
}: {
  publicationId: string;
  recipientId: string;
}): Promise<DurableRateLimitResult> {
  const scope: PublicationRateLimitScope = "shared_link_comment_read";
  return checkRecordedDurableRateLimit({
    scope,
    keyParts: [publicationId, recipientId],
    metadata: { route: "comment_read" },
    windows: [{ seconds: 60, limit: 60, message: genericRateLimitMessage }],
  });
}

export async function checkSharedLinkDecisionRateLimit({
  publicationId,
  recipientId,
}: {
  publicationId: string;
  recipientId: string;
}): Promise<DurableRateLimitResult> {
  const scope: PublicationRateLimitScope = "shared_link_decision";
  return checkRecordedDurableRateLimit({
    scope,
    keyParts: [publicationId, recipientId],
    metadata: { route: "decision" },
    windows: [{ seconds: 60, limit: 5, message: genericRateLimitMessage }],
  });
}

export async function checkSharedLinkDecisionReadRateLimit({
  publicationId,
  recipientId,
}: {
  publicationId: string;
  recipientId: string;
}): Promise<DurableRateLimitResult> {
  const scope: PublicationRateLimitScope = "shared_link_decision_read";
  return checkRecordedDurableRateLimit({
    scope,
    keyParts: [publicationId, recipientId],
    metadata: { route: "decision_read" },
    windows: [{ seconds: 60, limit: 60, message: genericRateLimitMessage }],
  });
}

export async function checkSharedLinkUnsubscribeRateLimit({
  token,
  recipientToken,
  request,
}: {
  token: string;
  recipientToken: string;
  request: Request;
}): Promise<DurableRateLimitResult> {
  const scope: PublicationRateLimitScope = "shared_link_unsubscribe";
  return checkRecordedDurableRateLimit({
    scope,
    keyParts: [
      ...publicationRequestRateLimitKey(token, request),
      hashPublicationToken(recipientToken, readPublicationTokenHashSecret()),
    ],
    metadata: { route: "unsubscribe" },
    windows: [
      { seconds: 60, limit: 5, message: genericRateLimitMessage },
      { seconds: 60 * 60, limit: 20, message: genericRateLimitMessage },
    ],
  });
}
