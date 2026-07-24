import "server-only";

import type { CurrentUserContext } from "@/lib/auth/session";
import { runRequiredD1Batch } from "@/lib/cloudflare/d1-batch";
import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1Value,
} from "@/lib/cloudflare/d1";
import { fanoutSupportInboxInvalidation } from "@/lib/cloudflare/support-inbox-fanout";
import { createSupportRoutingToken } from "@/lib/repositories/support-conversations-repository";
import { checkRecordedDurableRateLimit } from "@/lib/security/durable-rate-limits";
import {
  readValidatedSupportIntake,
  SupportIntakeValidationError,
  SUPPORT_SCREENSHOT_MAX_EDGE,
  SUPPORT_SCREENSHOT_MAX_PIXELS,
  SUPPORT_SCREENSHOT_OUTPUT_LIMIT,
  supportSha256Hex,
  type SupportIntakeContext,
  type ValidatedSupportIntake,
} from "@/lib/support/intake-request";
import {
  requireOpenSupportPrivacyFence,
  SupportPrivacyFenceError,
} from "@/lib/support/privacy-fence";
import {
  getSupportRuntimeBindings,
  type SupportRuntimeBindings,
} from "@/lib/support/runtime";
import {
  markSupportSubjectR2ObjectStoredStatement,
  reserveSupportIntakeScreenshotR2Object,
  SUPPORT_SCREENSHOT_NORMALIZATION_SCHEMA,
} from "@/lib/support/subject-r2-registry";
import {
  CLOUDFLARE_IMAGE_PROCESSING_UNAVAILABLE_MESSAGE,
  processSupportImageToWebp,
} from "@/lib/uploads/server-image-processing";

const CLAIM_LEASE_MS = 5 * 60 * 1_000;
const SUPPORT_MESSAGE_SCOPE = "support:user-message";
const SUPPORT_SCREENSHOT_SCOPE = "support:user-screenshot";

type SupportIntakeClaimState = "reserved" | "committed" | "cleanup_fenced" | "abandoned";

type SupportIntakeClaim = {
  attachment_id: string | null;
  attachment_r2_key: string | null;
  attachment_sha256: string | null;
  cleanup_not_before: string | null;
  client_message_id: string;
  conversation_id: string;
  kind: "new" | "reply";
  lease_expires_at: string | null;
  lease_token: string | null;
  message_id: string;
  payload_sha256: string;
  privacy_generation: number;
  state: SupportIntakeClaimState;
  user_id: string;
};

type CanonicalIntakeRow = {
  attachment_count: number;
  body_text: string;
  conversation_id: string;
  conversation_status: "open" | "pending" | "resolved" | "archived";
  created_at: string;
  last_message_at: string;
  message_id: string;
  sender_role: "user" | "admin" | "system";
};

export type SupportIntakeResponse = {
  conversation: {
    id: string;
    lastMessageAt: string;
    status: "open" | "pending" | "resolved" | "archived";
  };
  message: {
    attachment: { id: string; contentType: "image/webp"; sizeBytes: number; url: string } | null;
    bodyText: string;
    conversationId: string;
    createdAt: string;
    id: string;
    senderRole: "user" | "admin" | "system";
  };
  realtimeDegraded: boolean;
};

export type SupportIntakeOutcome =
  | { status: 200 | 201; data: SupportIntakeResponse }
  | { status: 202; retryAfter: number };

export class SupportIntakeServiceError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409 | 413 | 415 | 429 | 500 | 503,
    readonly retryAfter?: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

function statement(database: D1DatabaseLike, sql: string, values: D1Value[]) {
  return database.prepare(sql).bind(...values);
}

async function readClaim(database: D1DatabaseLike, userId: string, clientMessageId: string) {
  return database
    .prepare<SupportIntakeClaim>(
      `SELECT user_id, client_message_id, kind, conversation_id, message_id,
              attachment_id, payload_sha256, attachment_sha256, attachment_r2_key,
              privacy_generation, state, lease_token, lease_expires_at,
              cleanup_not_before
       FROM support_user_intake_claims
       WHERE user_id = ? AND client_message_id = ?
       LIMIT 1`,
    )
    .bind(userId, clientMessageId)
    .first<SupportIntakeClaim>();
}

async function readCanonicalIntake(
  database: D1DatabaseLike,
  claim: SupportIntakeClaim,
): Promise<SupportIntakeResponse | null> {
  const row = await database
    .prepare<CanonicalIntakeRow>(
      `SELECT message.id AS message_id, message.conversation_id, message.sender_role,
              message.body_text, message.attachment_count, message.created_at,
              conversation.status AS conversation_status,
              conversation.last_message_at
       FROM support_messages message
       INNER JOIN support_conversations conversation ON conversation.id = message.conversation_id
       WHERE message.id = ?
         AND conversation.id = ?
         AND conversation.user_id = ?
       LIMIT 1`,
    )
    .bind(claim.message_id, claim.conversation_id, claim.user_id)
    .first<CanonicalIntakeRow>();
  if (!row) return null;

  let attachment: SupportIntakeResponse["message"]["attachment"] = null;
  if (claim.attachment_id) {
    const attachmentRow = await database
      .prepare<{ id: string; size_bytes: number }>(
        `SELECT id, size_bytes
         FROM support_message_attachments
         WHERE id = ?
           AND message_id = ?
           AND content_type = 'image/webp'
           AND storage_status = 'stored'
         LIMIT 1`,
      )
      .bind(claim.attachment_id, claim.message_id)
      .first<{ id: string; size_bytes: number }>();
    if (!attachmentRow) return null;
    attachment = {
      id: attachmentRow.id,
      contentType: "image/webp",
      sizeBytes: Number(attachmentRow.size_bytes),
      url: `/api/support/attachments/${encodeURIComponent(attachmentRow.id)}`,
    };
  }

  return {
    conversation: {
      id: row.conversation_id,
      lastMessageAt: row.last_message_at,
      status: row.conversation_status,
    },
    message: {
      attachment,
      bodyText: row.body_text,
      conversationId: row.conversation_id,
      createdAt: row.created_at,
      id: row.message_id,
      senderRole: row.sender_role,
    },
    realtimeDegraded: false,
  };
}

function assertMatchingClaim(
  claim: SupportIntakeClaim,
  input: {
    conversationId: string | null;
    kind: "new" | "reply";
    payloadSha256: string;
    userId: string;
  },
) {
  if (
    claim.user_id !== input.userId
    || claim.kind !== input.kind
    || (input.conversationId !== null && claim.conversation_id !== input.conversationId)
    || claim.payload_sha256 !== input.payloadSha256
  ) {
    throw new SupportIntakeServiceError(
      "This client message ID is already associated with different support content.",
      409,
      undefined,
      "support_intake_fingerprint_conflict",
    );
  }
}

function activeLeaseRetryAfter(claim: SupportIntakeClaim, nowMs: number) {
  const leaseMs = claim.lease_expires_at ? Date.parse(claim.lease_expires_at) : Number.NaN;
  if (!Number.isFinite(leaseMs) || leaseMs <= nowMs) return null;
  return Math.max(1, Math.min(30, Math.ceil((leaseMs - nowMs) / 1_000)));
}

async function applySupportQuota(input: {
  attachmentPresent: boolean;
  clientMessageId: string;
  userId: string;
}) {
  const dedupeHash = await supportSha256Hex(input.clientMessageId);
  const messageQuota = await checkRecordedDurableRateLimit({
    dedupeHash,
    keyParts: [input.userId],
    metadata: { surface: "support_intake" },
    scope: SUPPORT_MESSAGE_SCOPE,
    windows: [
      { limit: 5, seconds: 60, message: () => "Too many support messages. Try again shortly." },
      { limit: 20, seconds: 3_600, message: () => "Too many support messages. Try again later." },
      { limit: 50, seconds: 86_400, message: () => "Daily support message limit reached." },
    ],
  });
  if (!messageQuota.allowed) {
    throw new SupportIntakeServiceError(
      messageQuota.message,
      429,
      messageQuota.retryAfter,
      "support_intake_rate_limited",
    );
  }
  if (!input.attachmentPresent) return;

  const screenshotQuota = await checkRecordedDurableRateLimit({
    dedupeHash,
    keyParts: [input.userId],
    metadata: { surface: "support_screenshot" },
    scope: SUPPORT_SCREENSHOT_SCOPE,
    windows: [
      { limit: 10, seconds: 86_400, message: () => "Daily support screenshot limit reached." },
    ],
  });
  if (!screenshotQuota.allowed) {
    throw new SupportIntakeServiceError(
      screenshotQuota.message,
      429,
      screenshotQuota.retryAfter,
      "support_screenshot_rate_limited",
    );
  }
}

async function payloadFingerprint(input: {
  context: SupportIntakeContext;
  kind: "new" | "reply";
  message: string;
  replyTarget: string | null;
  sourceAttachmentSha256: string | null;
  userId: string;
}) {
  return supportSha256Hex(JSON.stringify({
    actor: input.userId,
    appRelease: input.context.appRelease,
    browserFamily: input.context.browserFamily,
    diagnosticsShared: input.context.diagnosticsShared,
    estimateId: input.context.estimateId,
    kind: input.kind,
    message: input.message,
    onboarding: input.context.onboarding,
    osFamily: input.context.osFamily,
    projectId: input.context.projectId,
    replyTarget: input.replyTarget,
    routeTemplate: input.context.routeTemplate,
    sourceAttachmentSha256: input.sourceAttachmentSha256,
    timezone: input.context.timezone,
    userId: input.userId,
    viewportHeight: input.context.viewportHeight,
    viewportWidth: input.context.viewportWidth,
    workspaceId: input.context.workspaceId,
  }));
}

function claimGateSql() {
  return `EXISTS (
    SELECT 1
    FROM support_user_intake_claims claim_gate
    INNER JOIN support_subject_privacy_fences fence_gate
      ON fence_gate.user_id = claim_gate.user_id
    WHERE claim_gate.user_id = ?
      AND claim_gate.client_message_id = ?
      AND claim_gate.state = 'reserved'
      AND claim_gate.lease_token = ?
      AND claim_gate.lease_expires_at > ?
      AND claim_gate.privacy_generation = ?
      AND fence_gate.generation = claim_gate.privacy_generation
      AND fence_gate.state = 'open'
  )`;
}

function gateValues(input: {
  clientMessageId: string;
  commitAt: string;
  leaseToken: string;
  privacyGeneration: number;
  userId: string;
}): D1Value[] {
  return [
    input.userId,
    input.clientMessageId,
    input.leaseToken,
    input.commitAt,
    input.privacyGeneration,
  ];
}

function buildCommitStatements(input: {
  attachmentDigest: string | null;
  attachmentSize: number | null;
  claim: SupportIntakeClaim;
  commitAt: string;
  context: SupportIntakeContext;
  database: D1DatabaseLike;
  leaseToken: string;
  message: string;
  routingToken: string;
}): D1PreparedStatementLike[] {
  const { claim, commitAt, context, database, leaseToken } = input;
  const gate = claimGateSql();
  const gateBinds = gateValues({
    clientMessageId: claim.client_message_id,
    commitAt,
    leaseToken,
    privacyGeneration: claim.privacy_generation,
    userId: claim.user_id,
  });
  const statements: D1PreparedStatementLike[] = [];

  if (claim.kind === "new") {
    statements.push(statement(
      database,
      `INSERT INTO support_conversations (
         id, user_id, requester_email, requester_name, subject, status, channel,
         mailbox_address, routing_token, last_message_at, unread_for_admin,
         unread_for_user, created_at, updated_at
       )
       SELECT ?, ?, lower(trim(profile.email)), NULLIF(trim(profile.display_name), ''),
              'Support request', 'open', 'in_app', NULL, ?, ?, 1, 0, ?, ?
       FROM profiles profile
       WHERE profile.id = ? AND ${gate}`,
      [
        claim.conversation_id,
        claim.user_id,
        input.routingToken,
        commitAt,
        commitAt,
        commitAt,
        claim.user_id,
        ...gateBinds,
      ],
    ));
  }

  statements.push(statement(
    database,
    `INSERT INTO support_messages (
       id, conversation_id, sender_role, author_user_id, body_text, body_html,
       email_message_id, client_message_id, send_status, direction, transport,
       attachment_count, created_at
     )
     SELECT ?, ?, 'user', ?, ?, NULL, NULL, ?, 'sent', 'inbound', 'in_app', ?, ?
     WHERE ${gate}
       AND EXISTS (
         SELECT 1 FROM support_conversations owner_conversation
         WHERE owner_conversation.id = ? AND owner_conversation.user_id = ?
       )`,
    [
      claim.message_id,
      claim.conversation_id,
      claim.user_id,
      input.message,
      claim.client_message_id,
      claim.attachment_id ? 1 : 0,
      commitAt,
      ...gateBinds,
      claim.conversation_id,
      claim.user_id,
    ],
  ));

  statements.push(statement(
    database,
    `INSERT INTO support_message_context (
       message_id, workspace_id, project_id, estimate_id, route_template,
       app_release, viewport_width, viewport_height, timezone, browser_family,
       os_family, diagnostics_shared, onboarding_flow_key,
       onboarding_flow_version, onboarding_step_key, onboarding_reason_code,
       onboarding_route_key, onboarding_viewport_class, created_at
     )
     SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
     WHERE ${gate}`,
    [
      claim.message_id,
      context.workspaceId,
      context.projectId,
      context.estimateId,
      context.routeTemplate,
      context.appRelease,
      context.viewportWidth,
      context.viewportHeight,
      context.timezone,
      context.browserFamily,
      context.osFamily,
      context.diagnosticsShared ? 1 : 0,
      context.onboarding?.flowKey ?? null,
      context.onboarding?.flowVersion ?? null,
      context.onboarding?.stepKey ?? null,
      context.onboarding?.reasonCode ?? null,
      context.onboarding?.routeKey ?? null,
      context.onboarding?.viewportClass ?? null,
      commitAt,
      ...gateBinds,
    ],
  ));

  if (claim.attachment_id && claim.attachment_r2_key && input.attachmentDigest && input.attachmentSize !== null) {
    statements.push(statement(
      database,
      `INSERT INTO support_message_attachments (
         id, message_id, r2_key, filename, content_type, size_bytes, content_id,
         disposition, sha256, storage_status, normalization_schema, created_at
       )
       SELECT ?, ?, ?, 'support-screenshot.webp', 'image/webp', ?, NULL,
              'inline', ?, 'stored', ?, ?
       WHERE ${gate}`,
      [
        claim.attachment_id,
        claim.message_id,
        claim.attachment_r2_key,
        input.attachmentSize,
        input.attachmentDigest,
        SUPPORT_SCREENSHOT_NORMALIZATION_SCHEMA,
        commitAt,
        ...gateBinds,
      ],
    ));
    statements.push(markSupportSubjectR2ObjectStoredStatement({
      database,
      r2Key: claim.attachment_r2_key,
      sourceId: claim.attachment_id,
      sourceKind: "user_screenshot",
      storedAt: commitAt,
      userId: claim.user_id,
    }));
  }

  if (claim.kind === "reply") {
    statements.push(statement(
      database,
      `UPDATE support_conversations
       SET status = 'open', last_message_at = ?, unread_for_admin = 1, updated_at = ?
       WHERE id = ?
         AND user_id = ?
         AND ${gate}`,
      [commitAt, commitAt, claim.conversation_id, claim.user_id, ...gateBinds],
    ));
  }

  statements.push(statement(
    database,
    `UPDATE support_user_intake_claims
     SET attachment_sha256 = ?, state = 'committed', lease_token = NULL,
         lease_expires_at = NULL, cleanup_not_before = NULL, updated_at = ?
     WHERE user_id = ?
       AND client_message_id = ?
       AND ${gate}`,
    [
      input.attachmentDigest,
      commitAt,
      claim.user_id,
      claim.client_message_id,
      ...gateBinds,
    ],
  ));
  return statements;
}

async function responseForCommittedClaim(
  database: D1DatabaseLike,
  claim: SupportIntakeClaim,
): Promise<SupportIntakeOutcome> {
  const canonical = await readCanonicalIntake(database, claim);
  if (!canonical) {
    throw new SupportIntakeServiceError(
      "Support intake recovery could not find the committed message.",
      503,
      undefined,
      "support_intake_recovery_missing",
    );
  }
  return { status: 200, data: canonical };
}

async function acquireClaimLease(input: {
  candidate: SupportIntakeClaim;
  database: D1DatabaseLike;
  payloadSha256: string;
  privacyGeneration: number;
}) {
  const { candidate, database } = input;
  const createdAt = new Date().toISOString();
  const inserted = await database
    .prepare(
      `INSERT OR IGNORE INTO support_user_intake_claims (
         user_id, client_message_id, kind, conversation_id, message_id,
         attachment_id, fingerprint_version, payload_sha256, attachment_sha256,
         attachment_r2_key, privacy_generation, state, lease_token,
         lease_expires_at, cleanup_not_before, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, NULL, ?, ?, 'reserved', ?, ?, NULL, ?, ?)`,
    )
    .bind(
      candidate.user_id,
      candidate.client_message_id,
      candidate.kind,
      candidate.conversation_id,
      candidate.message_id,
      candidate.attachment_id,
      input.payloadSha256,
      candidate.attachment_r2_key,
      input.privacyGeneration,
      candidate.lease_token,
      candidate.lease_expires_at,
      createdAt,
      createdAt,
    )
    .run();
  if (inserted.success === false) {
    throw new SupportIntakeServiceError("Support intake storage is unavailable.", 503);
  }

  let winner = await readClaim(database, candidate.user_id, candidate.client_message_id);
  if (!winner) throw new SupportIntakeServiceError("Support intake storage is unavailable.", 503);
  assertMatchingClaim(winner, {
    conversationId: candidate.kind === "reply" ? candidate.conversation_id : null,
    kind: candidate.kind,
    payloadSha256: input.payloadSha256,
    userId: candidate.user_id,
  });
  if (winner.state === "committed") return { claim: winner, acquired: false as const, committed: true as const };
  if (winner.state === "cleanup_fenced" || winner.state === "abandoned") {
    throw new SupportIntakeServiceError(
      "This support send was abandoned. Start a new attempt with a new client message ID.",
      409,
      undefined,
      "support_intake_abandoned",
    );
  }
  if (winner.privacy_generation !== input.privacyGeneration) {
    throw new SupportIntakeServiceError(
      "This support send predates a privacy boundary. Start a new attempt.",
      409,
      undefined,
      "support_intake_privacy_generation_changed",
    );
  }
  if (winner.lease_token === candidate.lease_token) {
    return { claim: winner, acquired: true as const, committed: false as const };
  }

  const nowMs = Date.now();
  const retryAfter = activeLeaseRetryAfter(winner, nowMs);
  if (retryAfter) return { claim: winner, acquired: false as const, committed: false as const, retryAfter };
  if (!winner.lease_token || !winner.lease_expires_at) {
    throw new SupportIntakeServiceError("Support intake lease is invalid.", 409);
  }

  const replacementToken = crypto.randomUUID();
  const replacementExpiry = new Date(nowMs + CLAIM_LEASE_MS).toISOString();
  const takeover = await database
    .prepare(
      `UPDATE support_user_intake_claims
       SET lease_token = ?, lease_expires_at = ?, updated_at = ?
       WHERE user_id = ?
         AND client_message_id = ?
         AND state = 'reserved'
         AND lease_token = ?
         AND lease_expires_at = ?
         AND lease_expires_at <= ?
         AND privacy_generation = ?
         AND EXISTS (
           SELECT 1 FROM support_subject_privacy_fences takeover_fence
           WHERE takeover_fence.user_id = support_user_intake_claims.user_id
             AND takeover_fence.generation = support_user_intake_claims.privacy_generation
             AND takeover_fence.state = 'open'
         )`,
    )
    .bind(
      replacementToken,
      replacementExpiry,
      new Date(nowMs).toISOString(),
      winner.user_id,
      winner.client_message_id,
      winner.lease_token,
      winner.lease_expires_at,
      new Date(nowMs).toISOString(),
      input.privacyGeneration,
    )
    .run();
  if (takeover.success === false) throw new SupportIntakeServiceError("Support intake lease is unavailable.", 503);
  winner = await readClaim(database, candidate.user_id, candidate.client_message_id);
  if (!winner) throw new SupportIntakeServiceError("Support intake storage is unavailable.", 503);
  if (winner.state === "committed") return { claim: winner, acquired: false as const, committed: true as const };
  if (winner.lease_token === replacementToken) {
    return { claim: winner, acquired: true as const, committed: false as const };
  }
  return {
    claim: winner,
    acquired: false as const,
    committed: false as const,
    retryAfter: activeLeaseRetryAfter(winner, Date.now()) ?? 1,
  };
}

async function commitLeaseWinner(input: {
  claim: SupportIntakeClaim;
  context: SupportIntakeContext;
  database: D1DatabaseLike;
  intake: ValidatedSupportIntake;
  runtime: SupportRuntimeBindings;
}): Promise<SupportIntakeOutcome> {
  const leaseToken = input.claim.lease_token;
  if (!leaseToken) throw new SupportIntakeServiceError("Support intake lease is unavailable.", 409);

  let attachmentDigest: string | null = null;
  let attachmentSize: number | null = null;
  if (input.intake.attachment) {
    const r2 = input.runtime.ARCH_UPLOADS_R2;
    if (!r2 || !input.claim.attachment_id || !input.claim.attachment_r2_key) {
      throw new SupportIntakeServiceError("Screenshot storage is unavailable.", 503);
    }
    const processed = await processSupportImageToWebp({
      cloudflareImagesBinding: input.runtime.IMAGES,
      magicMime: input.intake.attachment.magicMime,
      maxImageEdge: SUPPORT_SCREENSHOT_MAX_EDGE,
      maxImagePixels: SUPPORT_SCREENSHOT_MAX_PIXELS,
      sourceBuffer: Buffer.from(input.intake.attachment.bytes),
    });
    if (processed.status === "cloudflare-image-processing-unavailable") {
      throw new SupportIntakeServiceError(CLOUDFLARE_IMAGE_PROCESSING_UNAVAILABLE_MESSAGE, 503);
    }
    if (processed.status === "animated-image") {
      throw new SupportIntakeServiceError("Animated screenshots are not supported.", 400);
    }
    if (processed.status === "dimensions-too-large") {
      throw new SupportIntakeServiceError("Screenshot dimensions exceed the 24 megapixel limit.", 400);
    }
    if (processed.status === "unsupported-encoding" || processed.status === "missing-dimensions" || processed.status === "decode-error") {
      throw new SupportIntakeServiceError("Screenshot could not be decoded safely.", 400);
    }
    if (processed.image.data.byteLength > SUPPORT_SCREENSHOT_OUTPUT_LIMIT) {
      throw new SupportIntakeServiceError("Normalized screenshot exceeds the 3 MiB limit.", 400);
    }
    attachmentDigest = await supportSha256Hex(processed.image.data);
    attachmentSize = processed.image.data.byteLength;
    await reserveSupportIntakeScreenshotR2Object({
      attachmentId: input.claim.attachment_id,
      clientMessageId: input.claim.client_message_id,
      database: input.database,
      leaseToken,
      privacyGeneration: input.claim.privacy_generation,
      r2Key: input.claim.attachment_r2_key,
      userId: input.claim.user_id,
    });
    await r2.put(input.claim.attachment_r2_key, processed.image.data, {
      httpMetadata: { contentType: "image/webp", cacheControl: "private, no-store" },
    });
  }

  const commitAt = new Date().toISOString();
  const statements = buildCommitStatements({
    attachmentDigest,
    attachmentSize,
    claim: input.claim,
    commitAt,
    context: input.context,
    database: input.database,
    leaseToken,
    message: input.intake.message,
    routingToken: createSupportRoutingToken(),
  });

  let results;
  try {
    results = await runRequiredD1Batch(
      input.database,
      statements,
      "Support message could not be committed.",
    );
  } catch {
    const recovered = await readClaim(input.database, input.claim.user_id, input.claim.client_message_id);
    if (recovered?.state === "committed") return responseForCommittedClaim(input.database, recovered);
    const retryAfter = recovered ? activeLeaseRetryAfter(recovered, Date.now()) : null;
    if (retryAfter) return { status: 202, retryAfter };
    throw new SupportIntakeServiceError("Support message could not be committed.", 503);
  }

  if (results.length !== statements.length || results.some((result) => result.meta?.changes !== 1)) {
    const recovered = await readClaim(input.database, input.claim.user_id, input.claim.client_message_id);
    if (recovered?.state === "committed") return responseForCommittedClaim(input.database, recovered);
    const retryAfter = recovered ? activeLeaseRetryAfter(recovered, Date.now()) : null;
    if (retryAfter) return { status: 202, retryAfter };
    throw new SupportIntakeServiceError(
      "Support intake lease or privacy generation changed before commit.",
      409,
      undefined,
      "support_intake_commit_fenced",
    );
  }

  const committed = await readClaim(input.database, input.claim.user_id, input.claim.client_message_id);
  if (!committed || committed.state !== "committed") {
    throw new SupportIntakeServiceError("Support message commit could not be verified.", 503);
  }
  const canonical = await readCanonicalIntake(input.database, committed);
  if (!canonical) throw new SupportIntakeServiceError("Support message commit could not be verified.", 503);

  try {
    const fanout = await fanoutSupportInboxInvalidation({
      env: input.runtime,
      conversationId: committed.conversation_id,
      messageId: committed.message_id,
      subject: committed.kind === "new" ? "user_in_app_conversation" : "user_in_app_reply",
    });
    canonical.realtimeDegraded = fanout.degraded;
  } catch {
    canonical.realtimeDegraded = true;
  }
  return { status: 201, data: canonical };
}

export async function writeUserSupportMessage(input: {
  conversationId?: string | null;
  database: D1DatabaseLike;
  kind: "new" | "reply";
  request: Request;
  user: CurrentUserContext;
}): Promise<SupportIntakeOutcome> {
  try {
    const replyConversationId = input.kind === "reply" ? input.conversationId?.trim() ?? "" : null;
    if (input.kind === "reply") {
      const owner = await input.database
        .prepare<{ user_id: string | null }>(
          `SELECT user_id
           FROM support_conversations conversation
           WHERE conversation.id = ?
             AND NOT EXISTS (
               SELECT 1
               FROM support_legacy_feedback_imports hidden_legacy
               WHERE hidden_legacy.conversation_id = conversation.id
                 AND hidden_legacy.user_visible_at IS NULL
             )
           LIMIT 1`,
        )
        .bind(replyConversationId)
        .first<{ user_id: string | null }>();
      if (!owner || owner.user_id !== input.user.userId) {
        throw new SupportIntakeServiceError("Support conversation not found.", 404, undefined, "support_conversation_not_found");
      }
    }

    const fence = await requireOpenSupportPrivacyFence(input.database, input.user.userId);
    const intake = await readValidatedSupportIntake(input.request, input.database, input.user);
    const existing = await readClaim(input.database, input.user.userId, intake.clientMessageId);
    const conversationId = replyConversationId ?? existing?.conversation_id ?? crypto.randomUUID();
    const fingerprint = await payloadFingerprint({
      context: intake.context,
      kind: input.kind,
      message: intake.message,
      replyTarget: input.kind === "reply" ? conversationId : null,
      sourceAttachmentSha256: intake.attachment?.sourceSha256 ?? null,
      userId: input.user.userId,
    });

    if (existing) {
      assertMatchingClaim(existing, {
        conversationId,
        kind: input.kind,
        payloadSha256: fingerprint,
        userId: input.user.userId,
      });
      if (existing.state === "committed") return responseForCommittedClaim(input.database, existing);
    } else {
      await applySupportQuota({
        attachmentPresent: Boolean(intake.attachment),
        clientMessageId: intake.clientMessageId,
        userId: input.user.userId,
      });
    }

    const now = new Date();
    const messageId = crypto.randomUUID();
    const attachmentId = intake.attachment ? crypto.randomUUID() : null;
    const candidate: SupportIntakeClaim = {
      attachment_id: attachmentId,
      attachment_r2_key: attachmentId
        ? `support-user/${conversationId}/${messageId}/${attachmentId}.webp`
        : null,
      attachment_sha256: null,
      cleanup_not_before: null,
      client_message_id: intake.clientMessageId,
      conversation_id: conversationId,
      kind: input.kind,
      lease_expires_at: new Date(now.getTime() + CLAIM_LEASE_MS).toISOString(),
      lease_token: crypto.randomUUID(),
      message_id: messageId,
      payload_sha256: fingerprint,
      privacy_generation: fence.generation,
      state: "reserved",
      user_id: input.user.userId,
    };
    const lease = await acquireClaimLease({
      candidate,
      database: input.database,
      payloadSha256: fingerprint,
      privacyGeneration: fence.generation,
    });
    if (lease.committed) return responseForCommittedClaim(input.database, lease.claim);
    if (!lease.acquired) return { status: 202, retryAfter: lease.retryAfter ?? 1 };

    return commitLeaseWinner({
      claim: lease.claim,
      context: intake.context,
      database: input.database,
      intake,
      runtime: await getSupportRuntimeBindings(),
    });
  } catch (error) {
    if (error instanceof SupportIntakeServiceError) throw error;
    if (error instanceof SupportIntakeValidationError) {
      throw new SupportIntakeServiceError(error.message, error.status);
    }
    if (error instanceof SupportPrivacyFenceError) {
      throw new SupportIntakeServiceError(error.message, 409, undefined, error.code);
    }
    throw new SupportIntakeServiceError("Support intake is temporarily unavailable.", 503);
  }
}
