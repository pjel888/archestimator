import "server-only";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { emitLogRecord } from "@/lib/observability/logger";

// F3 (UNIT-004) Founder customer notes — append-only, scoped to a user or account.
export type CustomerNoteTargetKind = "user" | "account";

export type AdminCustomerNoteRow = {
  id: string;
  target_kind: CustomerNoteTargetKind;
  target_id: string;
  body: string;
  created_by: string;
  created_by_email: string | null;
  created_at: string;
};

function logFailure(error: unknown, event: string) {
  emitLogRecord({
    level: "error",
    event,
    message: "Admin customer notes D1 operation failed.",
    context: { error_name: error instanceof Error ? error.name : "unknown" },
  });
}

export async function listCustomerNotes(
  targetKind: CustomerNoteTargetKind,
  targetId: string,
  limit = 25,
): Promise<AdminCustomerNoteRow[]> {
  const db = await getCloudflareD1Database();
  if (!db) return [];
  try {
    const result = await db
      .prepare<AdminCustomerNoteRow>(
        `
          SELECT id, target_kind, target_id, body, created_by, created_by_email, created_at
          FROM admin_customer_notes
          WHERE target_kind = ? AND target_id = ?
          ORDER BY created_at DESC
          LIMIT ?
        `,
      )
      .bind(targetKind, targetId, limit)
      .all<AdminCustomerNoteRow>();
    return result.results ?? [];
  } catch (error) {
    logFailure(error, "admin_customer_notes_list_failed");
    return [];
  }
}

export async function addCustomerNote(input: {
  targetKind: CustomerNoteTargetKind;
  targetId: string;
  body: string;
  createdBy: string;
  createdByEmail: string | null;
}): Promise<AdminCustomerNoteRow | null> {
  const db = await getCloudflareD1Database();
  if (!db) return null;
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  try {
    await db
      .prepare(
        `
          INSERT INTO admin_customer_notes
            (id, target_kind, target_id, body, created_by, created_by_email, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .bind(id, input.targetKind, input.targetId, input.body, input.createdBy, input.createdByEmail, now, now)
      .run();
    return {
      id,
      target_kind: input.targetKind,
      target_id: input.targetId,
      body: input.body,
      created_by: input.createdBy,
      created_by_email: input.createdByEmail,
      created_at: now,
    };
  } catch (error) {
    logFailure(error, "admin_customer_notes_add_failed");
    return null;
  }
}
