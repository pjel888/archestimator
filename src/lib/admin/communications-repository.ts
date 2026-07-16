import "server-only";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { emitLogRecord } from "@/lib/observability/logger";

// F9 (UNIT-010) Communications Manager — read-only management views over the
// existing in-app notification tables (no provider needed). Email channel is a
// separate, provider-gated surface. This is the Published/All-History view.
export type AdminCommunicationRecordRow = {
  id: string;
  kind: string;
  title: string;
  severity: string;
  surface: string;
  release_version: string | null;
  created_at: string;
  delivery_count: number;
};

function logFailure(error: unknown, event: string) {
  emitLogRecord({
    level: "error",
    event,
    message: "Admin communications D1 operation failed.",
    context: { error_name: error instanceof Error ? error.name : "unknown" },
  });
}

export async function listCommunicationRecords(limit = 50): Promise<AdminCommunicationRecordRow[]> {
  const db = await getCloudflareD1Database();
  if (!db) return [];
  try {
    const result = await db
      .prepare<AdminCommunicationRecordRow>(
        `
          SELECT d.id, d.kind, d.title, d.severity, d.surface, d.release_version, d.created_at,
                 (SELECT COUNT(*) FROM notification_deliveries WHERE notification_id = d.id) AS delivery_count
          FROM notification_definitions d
          ORDER BY d.created_at DESC
          LIMIT ?
        `,
      )
      .bind(limit)
      .all<AdminCommunicationRecordRow>();
    return result.results ?? [];
  } catch (error) {
    logFailure(error, "admin_communications_list_failed");
    return [];
  }
}
