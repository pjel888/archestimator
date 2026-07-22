import "server-only";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { emitLogRecord } from "@/lib/observability/logger";

// F4 (UNIT-005) Support attention — read-only triage source for open/pending
// support conversations (waiting/age). Surfaced through the F2 action inbox
// (see action-inbox-repository.ts) rather than duplicating the support inbox UI.
export type SupportAttentionRow = {
  id: string;
  user_id: string;
  subject: string | null;
  status: string;
  last_message_at: string;
  unread_for_admin: number;
  created_at: string;
  snoozed_until: string | null;
};

function logFailure(error: unknown, event: string) {
  emitLogRecord({
    level: "error",
    event,
    message: "Admin support attention D1 operation failed.",
    context: { error_name: error instanceof Error ? error.name : "unknown" },
  });
}

async function listSupportConversationsByAttention(
  limit: number,
  includeSnoozed: boolean,
): Promise<SupportAttentionRow[]> {
  const db = await getCloudflareD1Database();
  if (!db) return [];
  try {
    const snoozeClause = includeSnoozed
      ? "1 = 1"
      : "(t.snoozed_until IS NULL OR t.snoozed_until <= ?)";
    const binds = includeSnoozed
      ? [limit]
      : [new Date().toISOString(), limit];
    const result = await db
      .prepare<SupportAttentionRow>(
        `
          SELECT c.id, c.user_id, c.subject, c.status, c.last_message_at,
                 c.unread_for_admin, c.created_at, t.snoozed_until
          FROM support_conversations c
          LEFT JOIN support_conversation_triage t ON t.conversation_id = c.id
          WHERE c.status IN ('open', 'pending')
            AND ${snoozeClause}
          ORDER BY c.unread_for_admin DESC, c.last_message_at ASC
          LIMIT ?
        `,
      )
      .bind(...binds)
      .all<SupportAttentionRow>();
    return result.results ?? [];
  } catch (error) {
    logFailure(error, "admin_support_attention_list_failed");
    return [];
  }
}

// Open or pending conversations that currently require attention, oldest
// waiting-for-admin first. A conversation with unread_for_admin=1 (user
// replied, admin has not) sorts above read ones.
export async function listOpenSupportConversations(limit = 25): Promise<SupportAttentionRow[]> {
  return listSupportConversationsByAttention(limit, false);
}

// Reconciliation needs the complete canonical active shape, including rows
// currently snoozed in support triage. Display pagination remains bounded by
// the caller while source truth is repaired with D1 predicates.
export async function listActiveSupportConversations(limit = 25): Promise<SupportAttentionRow[]> {
  return listSupportConversationsByAttention(limit, true);
}
