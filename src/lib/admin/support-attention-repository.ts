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
};

function logFailure(error: unknown, event: string) {
  emitLogRecord({
    level: "error",
    event,
    message: "Admin support attention D1 operation failed.",
    context: { error_name: error instanceof Error ? error.name : "unknown" },
  });
}

// Open or pending conversations, oldest waiting-for-admin first. A conversation
// with unread_for_admin=1 (user replied, admin has not) sorts above read ones.
export async function listOpenSupportConversations(limit = 25): Promise<SupportAttentionRow[]> {
  const db = await getCloudflareD1Database();
  if (!db) return [];
  try {
    const result = await db
      .prepare<SupportAttentionRow>(
        `
          SELECT id, user_id, subject, status, last_message_at, unread_for_admin, created_at
          FROM support_conversations c
          LEFT JOIN support_conversation_triage t ON t.conversation_id = c.id
          WHERE status IN ('open', 'pending')
            AND (t.snoozed_until IS NULL OR t.snoozed_until <= ?)
          ORDER BY unread_for_admin DESC, last_message_at ASC
          LIMIT ?
        `,
      )
      .bind(new Date().toISOString(), limit)
      .all<SupportAttentionRow>();
    return result.results ?? [];
  } catch (error) {
    logFailure(error, "admin_support_attention_list_failed");
    return [];
  }
}
