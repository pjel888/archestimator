import "server-only";

import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";

export type AccountSecurityAuditRow = {
  id?: string;
  event_type: string;
  user_id: string | null;
  workspace_id: string | null;
  request_id: string | null;
  ip_hash: string | null;
  user_agent_hash: string | null;
  metadata_json: Record<string, unknown>;
  created_at?: string;
};

export type AccountSecurityAuditWriteResult = {
  id: string;
  createdAt: string;
  duplicate: boolean;
};

function metadataJson(row: AccountSecurityAuditRow) {
  return JSON.stringify(row.metadata_json ?? {});
}

export async function recordAccountSecurityEventInD1(
  db: D1DatabaseLike,
  row: AccountSecurityAuditRow,
): Promise<AccountSecurityAuditWriteResult> {
  const id = row.id ?? crypto.randomUUID();
  const createdAt = row.created_at ?? new Date().toISOString();
  const insert = await db
    .prepare(
      `
        INSERT INTO account_security_events (
          id,
          event_type,
          user_id,
          workspace_id,
          request_id,
          ip_hash,
          user_agent_hash,
          metadata_json,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO NOTHING
      `,
    )
    .bind(
      id,
      row.event_type,
      row.user_id,
      row.workspace_id,
      row.request_id,
      row.ip_hash,
      row.user_agent_hash,
      metadataJson(row),
      createdAt,
    )
    .run();

  return {
    id,
    createdAt,
    duplicate: (insert.meta?.changes ?? 0) === 0,
  };
}

export async function recordAccountSecurityEventInCloudflareD1(row: AccountSecurityAuditRow) {
  const db = await getCloudflareD1Database();
  if (!db) return null;
  return recordAccountSecurityEventInD1(db, row);
}
