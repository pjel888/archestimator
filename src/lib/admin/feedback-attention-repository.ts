import "server-only";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { emitLogRecord } from "@/lib/observability/logger";

// F2 (UNIT-003) + F4 (UNIT-005) Feedback attention source for the action inbox.
// Surfaces recent high-severity beta feedback (blocker/high) as action items.
// Status is event-sourced in beta_feedback_status_events; we intentionally key
// on severity + recency for a bounded, safe triage signal rather than resolving
// the full status history here.
export type FeedbackAttentionRow = {
  id: string;
  user_email: string;
  feedback_type: string;
  severity: "blocker" | "high" | "medium" | "low";
  page_path: string | null;
  created_at: string;
};

function logFailure(error: unknown, event: string) {
  emitLogRecord({
    level: "error",
    event,
    message: "Admin feedback attention D1 operation failed.",
    context: { error_name: error instanceof Error ? error.name : "unknown" },
  });
}

export async function listHighSeverityFeedback(limit = 15): Promise<FeedbackAttentionRow[]> {
  const db = await getCloudflareD1Database();
  if (!db) return [];
  try {
    const result = await db
      .prepare<FeedbackAttentionRow>(
        `
          SELECT id, user_email, feedback_type, severity, page_path, created_at
          FROM beta_feedback_submissions
          WHERE severity IN ('blocker', 'high')
          ORDER BY CASE severity WHEN 'blocker' THEN 0 ELSE 1 END, created_at DESC
          LIMIT ?
        `,
      )
      .bind(limit)
      .all<FeedbackAttentionRow>();
    return result.results ?? [];
  } catch (error) {
    logFailure(error, "admin_feedback_attention_list_failed");
    return [];
  }
}
