import "server-only";

import type { D1DatabaseLike } from "@/lib/cloudflare/d1";

export type SupportPrivacyFence = {
  generation: number;
  privacy_request_id: string | null;
  state: "open" | "exporting" | "erasing";
  user_id: string;
};

export type SupportPrivacyWriteGate = {
  generation: number;
  userId: string;
} | null;

export class SupportPrivacyFenceError extends Error {
  readonly code = "support_subject_fenced";

  constructor() {
    super("Support changes are temporarily unavailable for this account.");
  }
}

export async function readSupportPrivacyFence(
  database: D1DatabaseLike,
  userId: string,
) {
  return database
    .prepare<SupportPrivacyFence>(
      `SELECT user_id, generation, state, privacy_request_id
       FROM support_subject_privacy_fences
       WHERE user_id = ?
       LIMIT 1`,
    )
    .bind(userId)
    .first<SupportPrivacyFence>();
}

export async function requireOpenSupportPrivacyFence(
  database: D1DatabaseLike,
  userId: string,
): Promise<SupportPrivacyFence> {
  const now = new Date().toISOString();
  const inserted = await database
    .prepare(
      `INSERT OR IGNORE INTO support_subject_privacy_fences (
         user_id, generation, state, privacy_request_id, updated_at
       ) VALUES (?, 0, 'open', NULL, ?)`,
    )
    .bind(userId, now)
    .run();
  if (inserted.success === false) throw new SupportPrivacyFenceError();

  const fence = await readSupportPrivacyFence(database, userId);
  if (!fence || fence.state !== "open" || !Number.isInteger(fence.generation)) {
    throw new SupportPrivacyFenceError();
  }
  return fence;
}

export async function captureSupportPrivacyWriteGate(
  database: D1DatabaseLike,
  userId: string | null,
): Promise<SupportPrivacyWriteGate> {
  if (!userId) return null;
  const fence = await requireOpenSupportPrivacyFence(database, userId);
  return { generation: fence.generation, userId };
}

export function supportPrivacyWriteGateSql(alias = "support_write_fence") {
  return `(? IS NULL OR EXISTS (
    SELECT 1 FROM support_subject_privacy_fences ${alias}
    WHERE ${alias}.user_id = ?
      AND ${alias}.generation = ?
      AND ${alias}.state = 'open'
  ))`;
}

export function supportPrivacyWriteGateValues(gate: SupportPrivacyWriteGate) {
  return [gate?.userId ?? null, gate?.userId ?? null, gate?.generation ?? -1] as const;
}

export function supportOpenFenceSql(alias = "support_fence") {
  return `EXISTS (
    SELECT 1
    FROM support_subject_privacy_fences ${alias}
    WHERE ${alias}.user_id = ?
      AND ${alias}.generation = ?
      AND ${alias}.state = 'open'
  )`;
}
