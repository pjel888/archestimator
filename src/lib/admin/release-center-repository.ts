import "server-only";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { emitLogRecord } from "@/lib/observability/logger";

// F5 (UNIT-006) Release Center — release records with go/no-go state.
export type ReleaseStatus = "pending" | "shipped" | "blocked" | "rolled_back";

export type AdminReleaseRecordRow = {
  id: string;
  version_label: string;
  status: ReleaseStatus;
  commit_ref: string | null;
  go_no_go_notes: string | null;
  created_by: string;
  created_by_email: string | null;
  created_at: string;
  shipped_at: string | null;
};

function logFailure(error: unknown, event: string) {
  emitLogRecord({
    level: "error",
    event,
    message: "Admin release center D1 operation failed.",
    context: { error_name: error instanceof Error ? error.name : "unknown" },
  });
}

export async function listReleaseRecords(limit = 50): Promise<AdminReleaseRecordRow[]> {
  const db = await getCloudflareD1Database();
  if (!db) return [];
  try {
    const result = await db
      .prepare<AdminReleaseRecordRow>(
        `
          SELECT id, version_label, status, commit_ref, go_no_go_notes, created_by,
                 created_by_email, created_at, shipped_at
          FROM admin_release_records
          ORDER BY created_at DESC
          LIMIT ?
        `,
      )
      .bind(limit)
      .all<AdminReleaseRecordRow>();
    return result.results ?? [];
  } catch (error) {
    logFailure(error, "admin_release_records_list_failed");
    return [];
  }
}

export async function createReleaseRecord(input: {
  versionLabel: string;
  commitRef?: string | null;
  goNoGoNotes?: string | null;
  createdBy: string;
  createdByEmail: string | null;
}): Promise<AdminReleaseRecordRow | null> {
  const db = await getCloudflareD1Database();
  if (!db) return null;
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  try {
    await db
      .prepare(
        `
          INSERT INTO admin_release_records
            (id, version_label, status, commit_ref, go_no_go_notes, created_by,
             created_by_email, created_at, shipped_at, updated_at)
          VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, NULL, ?)
        `,
      )
      .bind(id, input.versionLabel, input.commitRef ?? null, input.goNoGoNotes ?? null, input.createdBy, input.createdByEmail, now, now)
      .run();
    return {
      id,
      version_label: input.versionLabel,
      status: "pending",
      commit_ref: input.commitRef ?? null,
      go_no_go_notes: input.goNoGoNotes ?? null,
      created_by: input.createdBy,
      created_by_email: input.createdByEmail,
      created_at: now,
      shipped_at: null,
    };
  } catch (error) {
    logFailure(error, "admin_release_records_create_failed");
    return null;
  }
}

export async function setReleaseStatus(
  recordId: string,
  status: ReleaseStatus,
): Promise<{ ok: boolean; changes: number }> {
  const db = await getCloudflareD1Database();
  if (!db) return { ok: false, changes: 0 };
  const now = new Date().toISOString();
  const shippedAt = status === "shipped" ? now : null;
  try {
    const result = await db
      .prepare(
        `
          UPDATE admin_release_records
          SET status = ?, shipped_at = COALESCE(?, shipped_at), updated_at = ?
          WHERE id = ?
        `,
      )
      .bind(status, shippedAt, now, recordId)
      .run();
    const changes = result.meta?.changes ?? 0;
    return { ok: changes > 0, changes };
  } catch (error) {
    logFailure(error, "admin_release_records_status_failed");
    return { ok: false, changes: 0 };
  }
}
