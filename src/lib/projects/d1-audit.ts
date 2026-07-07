import "server-only";

import { randomUUID } from "node:crypto";

import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ProjectMetadataAuditField =
  | "name"
  | "client_name"
  | "location"
  | "project_code"
  | "currency_code"
  | "status";

export type MassDeletionStorageCleanupAuditRecord = {
  targetEventId: string;
  cleanupResult: Record<string, Json | undefined>;
};

export type ProjectMetadataUpdatedAuditRecord = {
  projectId: string;
  actorUserId: string;
  changedFields: ProjectMetadataAuditField[];
};

function nowIso() {
  return new Date().toISOString();
}

function jsonObject(value: Record<string, Json | undefined>) {
  return JSON.stringify(value ?? {});
}

export async function recordMassDeletionStorageCleanupResultInD1(
  db: D1DatabaseLike,
  record: MassDeletionStorageCleanupAuditRecord,
) {
  const timestamp = nowIso();
  await db
    .prepare(
      `
        INSERT INTO mass_deletion_storage_cleanup_results (
          id,
          target_event_id,
          cleanup_result_json,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(target_event_id) DO UPDATE SET
          cleanup_result_json = excluded.cleanup_result_json,
          updated_at = excluded.updated_at
      `,
    )
    .bind(
      randomUUID(),
      record.targetEventId,
      jsonObject(record.cleanupResult),
      timestamp,
      timestamp,
    )
    .run();
}

export async function recordMassDeletionStorageCleanupResultInCloudflareD1(
  record: MassDeletionStorageCleanupAuditRecord,
) {
  const db = await getCloudflareD1Database();
  if (!db) return false;
  await recordMassDeletionStorageCleanupResultInD1(db, record);
  return true;
}

export async function recordProjectMetadataUpdatedEventInD1(
  db: D1DatabaseLike,
  record: ProjectMetadataUpdatedAuditRecord,
) {
  await db
    .prepare(
      `
        INSERT INTO collaboration_audit_events (
          id,
          invitation_id,
          project_id,
          estimate_id,
          actor_user_id,
          event_type,
          metadata_json,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      randomUUID(),
      null,
      record.projectId,
      null,
      record.actorUserId,
      "project_metadata_updated",
      jsonObject({ changed_fields: record.changedFields }),
      nowIso(),
    )
    .run();
}

export async function recordProjectMetadataUpdatedEventInCloudflareD1(
  record: ProjectMetadataUpdatedAuditRecord,
) {
  const db = await getCloudflareD1Database();
  if (!db) return false;
  await recordProjectMetadataUpdatedEventInD1(db, record);
  return true;
}
