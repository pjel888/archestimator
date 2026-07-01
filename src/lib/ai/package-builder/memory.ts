import { randomUUID } from "node:crypto";

import { isProviderBackedAiUserContext, type AiRequestUserContext } from "@/lib/ai/auth";
import type { PackageBuilderDraft, PackageBuilderOperationType } from "@/lib/ai/package-builder/schemas";
import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";
import { isUuid } from "@/lib/ids";

export type PackageBuilderMemorySignal = "accepted" | "rejected";
export type PackageBuilderMemorySourceType = "library_item" | "template";

export type PackageBuilderMemorySignalInput = {
  signal: PackageBuilderMemorySignal;
  sourceType: PackageBuilderMemorySourceType;
  sourceId: string;
  sourceLabel: string;
  roomName: string | null;
  operationType: PackageBuilderOperationType;
  draftId: string;
  draftHash: string;
  weight: number;
};

export type PackageBuilderMemoryRow = {
  signal: string;
  source_type: string;
  source_id: string;
  source_label: string;
  room_name: string | null;
  operation_type: string | null;
  weight: number | null;
  created_at: string | null;
};

export type PackageBuilderComponentMemorySignal = {
  sourceLibraryItemId: string;
  sourceLabel: string;
  roomName: string | null;
  acceptedCount: number;
  rejectedCount: number;
  score: number;
  lastSeenAt: string | null;
};

export type PackageBuilderTemplateMemorySignal = {
  sourceTemplateId: string;
  sourceLabel: string;
  roomName: string | null;
  acceptedCount: number;
  rejectedCount: number;
  score: number;
  lastSeenAt: string | null;
};

export type PackageBuilderMemoryPreferences = {
  componentSignals: PackageBuilderComponentMemorySignal[];
  templateSignals: PackageBuilderTemplateMemorySignal[];
  sourceRowCount: number;
};

export const EMPTY_PACKAGE_BUILDER_MEMORY_PREFERENCES: PackageBuilderMemoryPreferences = {
  componentSignals: [],
  templateSignals: [],
  sourceRowCount: 0,
};

let memorySchemaAvailability: Promise<boolean> | null = null;

export async function hasPackageBuilderMemorySchema() {
  memorySchemaAvailability ??= (async () => {
    const database = await getCloudflareD1Database();
    if (!database) return false;
    try {
      await all<Pick<PackageBuilderMemoryRow, "source_id">>(
        database,
        `SELECT source_id
         FROM ai_package_builder_memory_preferences
         LIMIT 1`,
      );
      return true;
    } catch {
      return false;
    }
  })();
  return memorySchemaAvailability;
}

function normalizeLabel(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 160);
}

function findRoomName(draft: PackageBuilderDraft, areaClientDraftId: string) {
  return draft.treeDraft.find((node) => node.clientDraftId === areaClientDraftId)?.name ?? null;
}

function operationTypeForDraftId(draft: PackageBuilderDraft, clientDraftId: string, fallback: PackageBuilderOperationType) {
  return draft.operations.find((operation) => operation.clientDraftId === clientDraftId)?.type ?? fallback;
}

export function collectPackageBuilderMemorySignals({
  draft,
  draftHash,
  signal,
}: {
  draft: PackageBuilderDraft;
  draftHash: string;
  signal: PackageBuilderMemorySignal;
}): PackageBuilderMemorySignalInput[] {
  const rows: PackageBuilderMemorySignalInput[] = [];

  for (const row of draft.rowDraft) {
    const sourceId = row.sourceLibraryItemId ?? null;
    if (row.sourceType !== "library_item" || !sourceId || !isUuid(sourceId)) continue;
    rows.push({
      signal,
      sourceType: "library_item",
      sourceId,
      sourceLabel: normalizeLabel(row.material),
      roomName: findRoomName(draft, row.targetAreaClientDraftId),
      operationType: operationTypeForDraftId(draft, row.clientDraftId, "insert_component_row"),
      draftId: draft.draftId,
      draftHash,
      weight: 1,
    });
  }

  for (const replacement of draft.rowReplacementDraft ?? []) {
    if (!isUuid(replacement.sourceLibraryItemId)) continue;
    rows.push({
      signal,
      sourceType: "library_item",
      sourceId: replacement.sourceLibraryItemId,
      sourceLabel: normalizeLabel(replacement.material),
      roomName: null,
      operationType: operationTypeForDraftId(draft, replacement.clientDraftId, "replace_existing_row"),
      draftId: draft.draftId,
      draftHash,
      weight: 1,
    });
  }

  for (const templateInsert of draft.templateInsertDraft ?? []) {
    if (!isUuid(templateInsert.sourceTemplateId)) continue;
    rows.push({
      signal,
      sourceType: "template",
      sourceId: templateInsert.sourceTemplateId,
      sourceLabel: normalizeLabel(templateInsert.sourceTemplateName),
      roomName: null,
      operationType: operationTypeForDraftId(draft, templateInsert.clientDraftId, "insert_template"),
      draftId: draft.draftId,
      draftHash,
      weight: 1,
    });
  }

  for (const templateCopy of draft.templateRowCopyDraft ?? []) {
    if (!isUuid(templateCopy.sourceTemplateId)) continue;
    rows.push({
      signal,
      sourceType: "template",
      sourceId: templateCopy.sourceTemplateId,
      sourceLabel: normalizeLabel(templateCopy.sourceTemplateName),
      roomName: templateCopy.sourceTemplateAreaName,
      operationType: operationTypeForDraftId(draft, templateCopy.clientDraftId, "copy_template_row"),
      draftId: draft.draftId,
      draftHash,
      weight: 1,
    });
  }

  return rows;
}

function isMemoryRow(value: unknown): value is PackageBuilderMemoryRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Partial<PackageBuilderMemoryRow>;
  return typeof row.signal === "string"
    && typeof row.source_type === "string"
    && typeof row.source_id === "string"
    && typeof row.source_label === "string";
}

export function summarizePackageBuilderMemoryRows(rows: PackageBuilderMemoryRow[]): PackageBuilderMemoryPreferences {
  type Aggregate = {
    sourceId: string;
    sourceLabel: string;
    roomName: string | null;
    acceptedCount: number;
    rejectedCount: number;
    acceptedWeight: number;
    rejectedWeight: number;
    lastSeenAt: string | null;
  };

  const components = new Map<string, Aggregate>();
  const templates = new Map<string, Aggregate>();

  for (const row of rows) {
    if (!isUuid(row.source_id)) continue;
    if (row.source_type !== "library_item" && row.source_type !== "template") continue;
    if (row.signal !== "accepted" && row.signal !== "rejected") continue;

    const target = row.source_type === "library_item" ? components : templates;
    const aggregate = target.get(row.source_id) ?? {
      sourceId: row.source_id,
      sourceLabel: normalizeLabel(row.source_label),
      roomName: row.room_name,
      acceptedCount: 0,
      rejectedCount: 0,
      acceptedWeight: 0,
      rejectedWeight: 0,
      lastSeenAt: null,
    };
    const weight = Math.max(1, Math.min(10, typeof row.weight === "number" && Number.isFinite(row.weight) ? row.weight : 1));
    if (row.signal === "accepted") {
      aggregate.acceptedCount += 1;
      aggregate.acceptedWeight += weight;
    } else {
      aggregate.rejectedCount += 1;
      aggregate.rejectedWeight += weight;
    }
    if (row.created_at && (!aggregate.lastSeenAt || row.created_at > aggregate.lastSeenAt)) {
      aggregate.lastSeenAt = row.created_at;
      aggregate.sourceLabel = normalizeLabel(row.source_label);
      aggregate.roomName = row.room_name;
    }
    target.set(row.source_id, aggregate);
  }

  const sortSignals = <TSignal extends { score: number; lastSeenAt: string | null; sourceLabel: string }>(signals: TSignal[]) =>
    signals.sort((left, right) =>
      right.score - left.score
      || (right.lastSeenAt ?? "").localeCompare(left.lastSeenAt ?? "")
      || left.sourceLabel.localeCompare(right.sourceLabel)
    );

  return {
    componentSignals: sortSignals([...components.values()].map((aggregate) => ({
      sourceLibraryItemId: aggregate.sourceId,
      sourceLabel: aggregate.sourceLabel,
      roomName: aggregate.roomName,
      acceptedCount: aggregate.acceptedCount,
      rejectedCount: aggregate.rejectedCount,
      score: aggregate.acceptedWeight * 4 - aggregate.rejectedWeight * 6,
      lastSeenAt: aggregate.lastSeenAt,
    }))),
    templateSignals: sortSignals([...templates.values()].map((aggregate) => ({
      sourceTemplateId: aggregate.sourceId,
      sourceLabel: aggregate.sourceLabel,
      roomName: aggregate.roomName,
      acceptedCount: aggregate.acceptedCount,
      rejectedCount: aggregate.rejectedCount,
      score: aggregate.acceptedWeight * 4 - aggregate.rejectedWeight * 6,
      lastSeenAt: aggregate.lastSeenAt,
    }))),
    sourceRowCount: rows.length,
  };
}

export async function readPackageBuilderMemoryPreferences({
  userContext,
  limit = 80,
}: {
  userContext: AiRequestUserContext;
  limit?: number;
}): Promise<PackageBuilderMemoryPreferences> {
  if (!isProviderBackedAiUserContext(userContext)) return EMPTY_PACKAGE_BUILDER_MEMORY_PREFERENCES;

  const database = await getCloudflareD1Database();
  if (!database) return EMPTY_PACKAGE_BUILDER_MEMORY_PREFERENCES;
  const data = await all<PackageBuilderMemoryRow>(
    database,
    `SELECT
       signal,
       source_type,
       source_id,
       source_label,
       room_name,
       operation_type,
       weight,
       created_at
     FROM ai_package_builder_memory_preferences
     WHERE workspace_id = ?
       AND actor_user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [userContext.workspaceId, userContext.userId, limit],
  );

  return summarizePackageBuilderMemoryRows(data.filter(isMemoryRow));
}

export type RecordPackageBuilderMemorySignalsInput = {
  userContext: AiRequestUserContext;
  draft: PackageBuilderDraft;
  draftHash: string;
  signal: PackageBuilderMemorySignal;
};

export async function recordPackageBuilderMemorySignals({
  userContext,
  draft,
  draftHash,
  signal,
}: RecordPackageBuilderMemorySignalsInput) {
  if (!isProviderBackedAiUserContext(userContext)) return;

  const signals = collectPackageBuilderMemorySignals({ draft, draftHash, signal });
  if (signals.length === 0) return;

  const rows = signals.map((memorySignal) => ({
    id: randomUUID(),
    workspace_id: userContext.workspaceId,
    actor_user_id: userContext.userId,
    signal: memorySignal.signal,
    source_type: memorySignal.sourceType,
    source_id: memorySignal.sourceId,
    source_label: memorySignal.sourceLabel,
    room_name: memorySignal.roomName,
    operation_type: memorySignal.operationType,
    draft_id: memorySignal.draftId,
    draft_hash: memorySignal.draftHash,
    weight: memorySignal.weight,
    metadata_json: JSON.stringify({
      schemaVersion: draft.schemaVersion,
    }),
    created_at: new Date().toISOString(),
  }));

  const database = await getCloudflareD1Database();
  if (!database) return;
  await Promise.all(rows.map((row) => run(
    database,
    `INSERT INTO ai_package_builder_memory_preferences (
       id,
       workspace_id,
       actor_user_id,
       signal,
       source_type,
       source_id,
       source_label,
       room_name,
       operation_type,
       draft_id,
       draft_hash,
       weight,
       metadata_json,
       created_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.workspace_id,
      row.actor_user_id,
      row.signal,
      row.source_type,
      row.source_id,
      row.source_label,
      row.room_name,
      row.operation_type,
      row.draft_id,
      row.draft_hash,
      row.weight,
      row.metadata_json,
      row.created_at,
    ],
  )));
}

async function all<T>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  const result = await database.prepare<T>(sql).bind(...values).all<T>();
  if (result.success === false) throw new Error("Package-builder memory read failed.");
  return result.results ?? [];
}

async function run(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  const result = await database.prepare(sql).bind(...values).run();
  if (result.success === false) throw new Error("Package-builder memory write failed.");
  return result;
}
