import "server-only";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { ClientPortalDecisionError, submitClientPortalDecision, summarizeClientPortalDecisions } from "@/lib/client-portal/decision-service";
import { CLIENT_PORTAL_NO_STORE_HEADERS, readClientPortalRecipientSession, requiresClientPortalPassword } from "@/lib/client-portal/public-repository";
import { readBoundedJsonBody } from "@/lib/http/read-bounded-body";
import { assertSameOriginPublicPost } from "@/lib/publication/security";
import { checkClientPortalDecisionRateLimit, checkClientPortalDecisionReadRateLimit } from "@/lib/client-portal/public-rate-limits";
import { createClientPortalPublicIdentifier, resolveClientPortalPublicIdentifier } from "@/lib/client-portal/public-identifiers";
import { toUserFacingErrorMessage } from "@/lib/observability/user-facing-error";

function unavailable() { return Response.json({ error: "Client Portal decision unavailable." }, { status: 404, headers: CLIENT_PORTAL_NO_STORE_HEADERS }); }
function rateLimited(message: string, retryAfter: number) { return Response.json({ error: message }, { status: 429, headers: { ...CLIENT_PORTAL_NO_STORE_HEADERS, "Retry-After": String(retryAfter) } }); }

function decisionError(error: unknown) {
  if (!(error instanceof ClientPortalDecisionError)) return unavailable();
  const status = error.code === "client_portal_decision_denied" ? 403
    : error.code === "client_portal_decision_duplicate" || error.code === "client_portal_decision_stale" ? 409
      : error.code === "client_portal_decision_invalid" ? 400 : 404;
  return Response.json(
    { error: toUserFacingErrorMessage(error, "Client Portal decision unavailable.") },
    { status, headers: CLIENT_PORTAL_NO_STORE_HEADERS },
  );
}

async function recipientContext(request: Request, token: string, requiresPost: boolean) {
  if (requiresPost) {
    const origin = assertSameOriginPublicPost(request);
    if (!origin.ok) return { error: Response.json({ error: origin.message }, { status: origin.status, headers: CLIENT_PORTAL_NO_STORE_HEADERS }) };
  }
  const cookie = request.headers.get("cookie") ?? "";
  if (await requiresClientPortalPassword(token, cookie)) return { error: Response.json({ error: "Client Portal password required.", passwordRequired: true }, { status: 423, headers: CLIENT_PORTAL_NO_STORE_HEADERS }) };
  const actor = await readClientPortalRecipientSession(token, cookie);
  if (!actor) return { error: Response.json({ error: "Recipient session required." }, { status: 401, headers: CLIENT_PORTAL_NO_STORE_HEADERS }) };
  const database = await getCloudflareD1Database();
  return database ? { actor, database } : { error: unavailable() };
}

async function resolveIssueId(
  database: NonNullable<Awaited<ReturnType<typeof getCloudflareD1Database>>>,
  portalId: string,
  token: string,
  publicIssueId: string,
) {
  const issues = await database.prepare<{ id: string }>("SELECT id FROM client_portal_issues WHERE portal_id = ? AND status <> 'archived' ORDER BY issue_number DESC")
    .bind(portalId)
    .all<{ id: string }>();
  return resolveClientPortalPublicIdentifier(token, "issue", publicIssueId, (issues.results ?? []).map((issue) => issue.id));
}

async function resolveDecisionId(
  database: NonNullable<Awaited<ReturnType<typeof getCloudflareD1Database>>>,
  issueId: string,
  portalId: string,
  token: string,
  publicDecisionId: string,
) {
  const decisions = await database.prepare<{ id: string }>("SELECT id FROM client_portal_decisions WHERE portal_id = ? AND issue_id = ? AND voided_at IS NULL ORDER BY submitted_at DESC, id DESC")
    .bind(portalId, issueId)
    .all<{ id: string }>();
  return resolveClientPortalPublicIdentifier(token, "decision", publicDecisionId, (decisions.results ?? []).map((decision) => decision.id));
}

function publicReceipt(token: string, receipt: Awaited<ReturnType<typeof submitClientPortalDecision>>) {
  return {
    ...receipt,
    id: createClientPortalPublicIdentifier(token, "decision", receipt.id),
    issueId: createClientPortalPublicIdentifier(token, "issue", receipt.issueId),
  };
}

function publicProjection(token: string, decision: NonNullable<Awaited<ReturnType<typeof summarizeClientPortalDecisions>>["focusDecision"]>) {
  return {
    ...decision,
    id: createClientPortalPublicIdentifier(token, "decision", decision.id),
    issueId: createClientPortalPublicIdentifier(token, "issue", decision.issueId),
  };
}

export async function submitClientPortalDecisionResponse(request: Request, token: string) {
  const context = await recipientContext(request, token, true); if ("error" in context) return context.error;
  const rateLimit = await checkClientPortalDecisionRateLimit({ portalId: context.actor.portalId, recipientId: context.actor.recipientId });
  if (!rateLimit.allowed) return rateLimited(rateLimit.message, rateLimit.retryAfter);
  const body = await readBoundedJsonBody<{ decision?: unknown; expectedIssueContentHash?: unknown; issueId?: unknown; note?: unknown; signerName?: unknown }>(request, 5 * 1024);
  if (!body.ok) return Response.json({ error: body.error }, { status: body.status, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  if ((body.value.decision !== "approved" && body.value.decision !== "changes_requested" && body.value.decision !== "declined") || typeof body.value.issueId !== "string" || typeof body.value.expectedIssueContentHash !== "string" || (body.value.note !== undefined && typeof body.value.note !== "string") || (body.value.signerName !== undefined && typeof body.value.signerName !== "string")) return Response.json({ error: "Decision request is invalid." }, { status: 400, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  const issueId = await resolveIssueId(context.database, context.actor.portalId, token, body.value.issueId);
  if (!issueId) return unavailable();
  try {
    const receipt = await submitClientPortalDecision({ actor: context.actor, database: context.database, portalId: context.actor.portalId, issueId, decision: body.value.decision, expectedIssueContentHash: body.value.expectedIssueContentHash, idempotencyKey: request.headers.get("idempotency-key")?.trim() ?? "", note: body.value.note, signerName: body.value.signerName });
    return Response.json({ receipt: publicReceipt(token, receipt) }, { status: receipt.replayed ? 200 : 201, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  } catch (error) { return decisionError(error); }
}

export async function clientPortalDecisionSummaryResponse(request: Request, token: string) {
  const context = await recipientContext(request, token, false); if ("error" in context) return context.error;
  const rateLimit = await checkClientPortalDecisionReadRateLimit({ portalId: context.actor.portalId, recipientId: context.actor.recipientId });
  if (!rateLimit.allowed) return rateLimited(rateLimit.message, rateLimit.retryAfter);
  const publicIssueId = new URL(request.url).searchParams.get("issueId");
  if (!publicIssueId) return Response.json({ error: "Issue is required." }, { status: 400, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  const issueId = await resolveIssueId(context.database, context.actor.portalId, token, publicIssueId);
  if (!issueId) return unavailable();
  const publicDecisionId = new URL(request.url).searchParams.get("decisionId");
  const focusDecisionId = publicDecisionId
    ? await resolveDecisionId(context.database, issueId, context.actor.portalId, token, publicDecisionId)
    : null;
  if (publicDecisionId && !focusDecisionId) return unavailable();
  try {
    const summary = await summarizeClientPortalDecisions({ actor: context.actor, database: context.database, portalId: context.actor.portalId, issueId, focusDecisionId });
    return Response.json({ summary: {
      ...summary,
      issueId: createClientPortalPublicIdentifier(token, "issue", summary.issueId),
      focusDecision: summary.focusDecision ? publicProjection(token, summary.focusDecision) : null,
      ownReceipt: summary.ownReceipt ? publicReceipt(token, summary.ownReceipt) : null,
    } }, { headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  } catch (error) { return decisionError(error); }
}
