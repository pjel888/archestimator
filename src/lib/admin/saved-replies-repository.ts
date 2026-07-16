import "server-only";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { emitLogRecord } from "@/lib/observability/logger";

// F4 (UNIT-005) Saved replies — admin canned responses.
export type AdminSavedReplyRow = {
  id: string;
  label: string;
  body: string;
  created_by: string;
  created_by_email: string | null;
  created_at: string;
};

function logFailure(error: unknown, event: string) {
  emitLogRecord({
    level: "error",
    event,
    message: "Admin saved replies D1 operation failed.",
    context: { error_name: error instanceof Error ? error.name : "unknown" },
  });
}

export async function listSavedReplies(limit = 50): Promise<AdminSavedReplyRow[]> {
  const db = await getCloudflareD1Database();
  if (!db) return [];
  try {
    const result = await db
      .prepare<AdminSavedReplyRow>(
        `SELECT id, label, body, created_by, created_by_email, created_at
         FROM admin_saved_replies ORDER BY label ASC LIMIT ?`,
      )
      .bind(limit)
      .all<AdminSavedReplyRow>();
    return result.results ?? [];
  } catch (error) {
    logFailure(error, "admin_saved_replies_list_failed");
    return [];
  }
}

export async function createSavedReply(input: {
  label: string;
  body: string;
  createdBy: string;
  createdByEmail: string | null;
}): Promise<AdminSavedReplyRow | null> {
  const db = await getCloudflareD1Database();
  if (!db) return null;
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  try {
    await db
      .prepare(
        `INSERT INTO admin_saved_replies (id, label, body, created_by, created_by_email, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, input.label, input.body, input.createdBy, input.createdByEmail, now, now)
      .run();
    return {
      id,
      label: input.label,
      body: input.body,
      created_by: input.createdBy,
      created_by_email: input.createdByEmail,
      created_at: now,
    };
  } catch (error) {
    logFailure(error, "admin_saved_replies_create_failed");
    return null;
  }
}

export async function deleteSavedReply(id: string): Promise<{ ok: boolean; changes: number }> {
  const db = await getCloudflareD1Database();
  if (!db) return { ok: false, changes: 0 };
  try {
    const result = await db.prepare(`DELETE FROM admin_saved_replies WHERE id = ?`).bind(id).run();
    const changes = result.meta?.changes ?? 0;
    return { ok: changes > 0, changes };
  } catch (error) {
    logFailure(error, "admin_saved_replies_delete_failed");
    return { ok: false, changes: 0 };
  }
}
