import { randomUUID } from "node:crypto";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Value } from "@/lib/cloudflare/d1";

export function clientPortalOwnerNotificationStatement(database: D1DatabaseLike, input: {
  eventType: string;
  idempotencyKey: string;
  issueId: string;
  payload: Record<string, unknown>;
  portalId: string;
  requiredDecisionId?: string;
  timestamp: string;
}): D1PreparedStatementLike {
  const guard = input.requiredDecisionId ? " WHERE EXISTS (SELECT 1 FROM client_portal_decisions WHERE id = ?)" : "";
  const values: D1Value[] = [
    `outbox_${randomUUID()}`,
    input.portalId,
    input.issueId,
    input.eventType,
    input.idempotencyKey,
    JSON.stringify({ ...input.payload, audience: "owner" }),
    input.timestamp,
    input.timestamp,
    input.timestamp,
  ];
  if (input.requiredDecisionId) values.push(input.requiredDecisionId);
  return database.prepare(`INSERT INTO client_portal_notification_outbox (id, portal_id, issue_id, recipient_id, event_type, idempotency_key, payload_json, state, attempt_count, next_attempt_at, created_at, updated_at) SELECT ?, ?, ?, NULL, ?, ?, ?, 'pending', 0, ?, ?, ?${guard}`).bind(...values);
}
