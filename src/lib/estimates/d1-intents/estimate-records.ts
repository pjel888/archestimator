import "server-only";

import { randomUUID } from "node:crypto";

import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
import { sumEstimateRowLineTotals } from "@/lib/estimates/estimate-row-total";
import { ESTIMATE_ROW_REVISION_CONFLICT_CODE } from "@/lib/estimates/row-revision-conflict";
import { selectFirstEstimateNodeIds } from "@/lib/estimates/tree-hierarchy";
import {
  isMissingColumnError,
  normalizeEstimateRecord,
  type EstimateRecordWithLegacy,
} from "@/lib/repositories/estimate-schema-compat";
import type { EstimateRow, ProjectRow } from "@/lib/types/database";
import type { Json } from "@/lib/types/json";

import {
  allD1Rows,
  firstD1Row,
} from "./database";
import { runMutationWithHistory } from "./history-events";
import {
  assertEstimateEditIntent,
  assertProjectEditIntent,
  buildProjectPublicationRevisionForEstimate,
  type EstimateD1Actor,
} from "./intent-context";
import {
  insertEstimateNodesForDuplication,
  readEstimateNodesForDuplication,
} from "./nodes";
import {
  insertEstimateRowsForDuplication,
  readEstimateRowsForDuplication,
} from "./rows";
import {
  createDefaultEstimateTab,
  insertEstimateTabsForDuplication,
  readEstimateTabsForDuplication,
} from "./tabs";

type EstimateSheetAdjustmentResult = {
  eventId: string;
  adjustment: {
    estimateId: string;
    mode: string;
    percentage: number;
    rowRevision: number;
    updatedAt: string;
    updatedBy: string;
  };
};

const GENERATED_SHEET_CODE_PREFIX = "ES";

function nowIso() {
  return new Date().toISOString();
}

function readNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readJson(value: unknown, fallback: Json): Json {
  if (typeof value !== "string") return value as Json ?? fallback;
  try {
    return JSON.parse(value) as Json;
  } catch {
    return fallback;
  }
}

function quoteColumn(column: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) throw new Error(`Something went wrong. Try again in a moment.`);
  return column;
}

async function insertRecordReturning<T>(
  database: D1DatabaseLike,
  table: "estimates" | "estimate_tabs" | "estimate_nodes" | "estimate_row_items",
  payload: Record<string, unknown>,
): Promise<T> {
  const timestamp = nowIso();
  const record: Record<string, unknown> = {
    id: randomUUID(),
    created_at: timestamp,
    updated_at: timestamp,
    ...payload,
  };
  const columns = Object.keys(record);
  const sql = `INSERT INTO ${table} (${columns.map(quoteColumn).join(", ")}) VALUES (${columns.map(() => "?").join(", ")}) RETURNING *`;
  const inserted = await firstD1Row<T>(database, sql, columns.map((column) => record[column]));
  if (!inserted) throw new Error(`Something went wrong. Try again in a moment.`);
  return inserted;
}

async function insertEstimateWithSheetCodeFallback(
  database: D1DatabaseLike,
  payload: Record<string, unknown>,
  sheetCode: string,
): Promise<EstimateRow> {
  const nextPayload = { ...payload };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return normalizeEstimateRecord(await insertRecordReturning<EstimateRecordWithLegacy>(database, "estimates", nextPayload));
    } catch (error) {
      const candidate = error instanceof Error ? error : new Error(String(error));
      if (isMissingColumnError(candidate, "sheet_code")) break;
      if (isMissingColumnError(candidate, "notes") && "notes" in nextPayload) {
        delete nextPayload.notes;
        continue;
      }
      if (isMissingColumnError(candidate, "project_budget") && "project_budget" in nextPayload) {
        delete nextPayload.project_budget;
        continue;
      }
      throw error;
    }
  }

  const legacyPayload = { ...nextPayload };
  delete legacyPayload.sheet_code;
  delete legacyPayload.project_budget;
  delete legacyPayload.notes;
  return normalizeEstimateRecord(await insertRecordReturning<EstimateRecordWithLegacy>(database, "estimates", {
    ...legacyPayload,
    revision_label: sheetCode,
  }));
}

async function listProjectEstimateCodes(
  database: D1DatabaseLike,
  projectId: string,
): Promise<Array<{ id: string; sheetCode: string }>> {
  try {
    const rows = await allD1Rows<{ id: string; sheet_code: string | null }>(
      database,
      "SELECT id, sheet_code FROM estimates WHERE project_id = ?",
      [projectId],
    );
    return rows.map((row) => ({ id: row.id, sheetCode: row.sheet_code ?? "" }));
  } catch (error) {
    const candidate = error instanceof Error ? error : new Error(String(error));
    if (!isMissingColumnError(candidate, "sheet_code")) throw error;
    const rows = await allD1Rows<{ id: string; revision_label: string | null }>(
      database,
      "SELECT id, revision_label FROM estimates WHERE project_id = ?",
      [projectId],
    );
    return rows.map((row) => ({ id: row.id, sheetCode: row.revision_label ?? "" }));
  }
}

function getNextGeneratedSheetCode(existingCodes: string[]) {
  const generatedCodePattern = new RegExp(`^${GENERATED_SHEET_CODE_PREFIX}-(\\d+)$`, "i");
  const nextNumber = existingCodes.reduce((highest, code) => {
    const match = code.trim().match(generatedCodePattern);
    if (!match) return highest;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? Math.max(highest, parsed) : highest;
  }, 0) + 1;
  return `${GENERATED_SHEET_CODE_PREFIX}-${String(nextNumber).padStart(3, "0")}`;
}

async function assertEstimateSheetCodeIsAvailable(
  database: D1DatabaseLike,
  projectId: string,
  sheetCode: string,
  excludedEstimateId?: string,
) {
  const normalized = sheetCode.trim().toLocaleLowerCase();
  const duplicate = (await listProjectEstimateCodes(database, projectId)).find(
    (row) => row.id !== excludedEstimateId && row.sheetCode.trim().toLocaleLowerCase() === normalized,
  );
  if (duplicate) throw new Error(`Estimate code ${sheetCode} already exists in this project.`);
}

function readLegacyProjectBudget(metadata: Json): number | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, Json>).projectBudget;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function serializeEstimate(estimate: EstimateRecordWithLegacy) {
  return normalizeEstimateRecord({
    ...estimate,
    metadata: readJson(estimate.metadata, {}),
  });
}

export async function getEstimateRecordForProject(
  database: D1DatabaseLike,
  input: { projectId: string; estimateId: string },
): Promise<EstimateRow | null> {
  const row = await firstD1Row<EstimateRecordWithLegacy>(
    database,
    "SELECT * FROM estimates WHERE id = ? AND project_id = ? LIMIT 1",
    [input.estimateId, input.projectId],
  );
  return row ? serializeEstimate(row) : null;
}

export async function getNextEstimateSheetCode(
  database: D1DatabaseLike,
  input: { projectId: string; excludedEstimateId?: string },
): Promise<string> {
  const estimateCodes = await listProjectEstimateCodes(database, input.projectId);
  const existingCodes = estimateCodes.flatMap((estimate) => {
    if (estimate.id === input.excludedEstimateId) return [];
    const sheetCode = estimate.sheetCode.trim();
    return sheetCode ? [sheetCode] : [];
  });
  const existingCodeSet = new Set(existingCodes.map((code) => code.toLocaleLowerCase()));
  let candidate = getNextGeneratedSheetCode(existingCodes);
  while (existingCodeSet.has(candidate.toLocaleLowerCase())) {
    candidate = getNextGeneratedSheetCode([...existingCodes, candidate]);
  }
  return candidate;
}

export async function createEstimateRecordWithDefaultTab(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: { project: ProjectRow; name: string; sheetCode: string },
): Promise<{ estimate: EstimateRow; firstNodeId: null; nodeCount: 0 }> {
  await assertProjectEditIntent(database, actor, input.project.id);
  await assertEstimateSheetCodeIsAvailable(database, input.project.id, input.sheetCode);
  const estimate = await insertEstimateWithSheetCodeFallback(database, {
    project_id: input.project.id,
    created_by: actor.userId,
    name: input.name,
    notes: null,
    project_budget: readLegacyProjectBudget(input.project.metadata),
    sheet_code: input.sheetCode,
    currency_code: input.project.currency_code,
    metadata: {},
  }, input.sheetCode);
  const defaultTab = await createDefaultEstimateTab(database, actor, {
    projectId: input.project.id,
    estimateId: estimate.id,
  });
  if (!defaultTab.id) throw new Error("Default estimate tab was not created.");
  return { estimate, firstNodeId: null, nodeCount: 0 };
}

export async function duplicateEstimateRecordGraph(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: { projectId: string; estimateId: string },
): Promise<{
  estimate: EstimateRow;
  firstNodeId: string | null;
  nodeCount: number;
  rowCount: number;
  totalProjectCost: number;
  sheetCode: string;
}> {
  await assertEstimateEditIntent(database, actor, input.estimateId);
  const sourceEstimate = await getEstimateRecordForProject(database, input);
  if (!sourceEstimate) throw new Error("Estimate not found in the current project.");
  const sheetCode = await getNextEstimateSheetCode(database, { projectId: input.projectId });
  const duplicatedEstimate = await insertEstimateWithSheetCodeFallback(database, {
    project_id: input.projectId,
    created_by: actor.userId,
    name: `${sourceEstimate.name} Copy`,
    notes: sourceEstimate.notes,
    project_budget: sourceEstimate.project_budget,
    sheet_code: sheetCode,
    currency_code: sourceEstimate.currency_code,
    metadata: sourceEstimate.metadata,
  }, sheetCode);

  const sourceTabs = await readEstimateTabsForDuplication(database, { estimateId: sourceEstimate.id });
  const tabs = sourceTabs.length > 0 ? sourceTabs : [{
    id: "__legacy_default_tab__",
    is_default: true,
    metadata: {},
    name: "Main",
    sort_order: 0,
  }];
  const { tabIdBySourceId } = await insertEstimateTabsForDuplication(database, actor, {
    projectId: input.projectId,
    estimateId: duplicatedEstimate.id,
    tabs,
  });

  const tabIds = sourceTabs.map((tab) => tab.id);
  const sourceNodes = await readEstimateNodesForDuplication(database, {
    estimateId: sourceEstimate.id,
    tabIds,
  });
  const defaultSourceTabId = tabs.find((tab) => Boolean(tab.is_default))?.id ?? tabs[0]!.id;
  const fallbackDuplicatedTabId = tabIdBySourceId.get(defaultSourceTabId) ?? [...tabIdBySourceId.values()][0];
  if (!fallbackDuplicatedTabId) throw new Error("Could not duplicate estimate tabs because no tab mapping was created.");
  const { nodeIdBySourceId } = await insertEstimateNodesForDuplication(database, actor, {
    projectId: input.projectId,
    estimateId: duplicatedEstimate.id,
    nodes: sourceNodes,
    tabIdBySourceId,
    fallbackTabId: fallbackDuplicatedTabId,
  });

  const sourceRows = await readEstimateRowsForDuplication(database, {
    estimateId: sourceEstimate.id,
    nodeIds: sourceNodes.map((node) => node.id),
  });
  const rowIdBySource = new Map(sourceRows.map((row) => [row.id, randomUUID()]));
  const rowCount = await insertEstimateRowsForDuplication(database, {
    estimateId: duplicatedEstimate.id,
    sourceRows,
    rowIdBySource,
    nodeIdBySource: nodeIdBySourceId,
    timestamp: nowIso(),
  });

  const duplicatedNodeRowsInOrder = sourceNodes.flatMap((node) => {
    const id = nodeIdBySourceId.get(node.id);
    return id ? [{
      id,
      estimate_id: duplicatedEstimate.id,
      kind: node.kind,
      parent_id: node.parent_id ? nodeIdBySourceId.get(node.parent_id) ?? null : null,
    }] : [];
  });
  const firstNodeId = selectFirstEstimateNodeIds(duplicatedNodeRowsInOrder).get(duplicatedEstimate.id) ?? null;
  return {
    estimate: duplicatedEstimate,
    firstNodeId,
    nodeCount: nodeIdBySourceId.size,
    rowCount,
    totalProjectCost: sumEstimateRowLineTotals(sourceRows),
    sheetCode,
  };
}

export async function updateEstimateDetailsWithHistory(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: {
    projectId: string;
    estimateId: string;
    correlationId: string;
    patch: { name?: string; sheetCode?: string; notes?: string | null; projectBudget?: number | null };
  },
): Promise<{ estimateId: string }> {
  const context = await assertEstimateEditIntent(database, actor, input.estimateId);
  const current = await getEstimateRecordForProject(database, input);
  if (!current) throw new Error("Estimate not found in the current project.");
  if (Object.prototype.hasOwnProperty.call(input.patch, "sheetCode") && input.patch.sheetCode) {
    await assertEstimateSheetCodeIsAvailable(database, input.projectId, input.patch.sheetCode, input.estimateId);
  }
  const columnMap = { name: "name", sheetCode: "sheet_code", notes: "notes", projectBudget: "project_budget" } as const;
  const assignments: string[] = [];
  const values: unknown[] = [];
  const changedFields: string[] = [];
  for (const [key, column] of Object.entries(columnMap)) {
    if (!Object.prototype.hasOwnProperty.call(input.patch, key)) continue;
    assignments.push(`${column} = ?`);
    values.push(input.patch[key as keyof typeof input.patch]);
    changedFields.push(key);
  }
  if (assignments.length === 0) return { estimateId: input.estimateId };
  assignments.push("updated_at = ?");
  values.push(nowIso(), input.estimateId, input.projectId);
  await runMutationWithHistory(database, [
    { sql: `UPDATE estimates SET ${assignments.join(", ")} WHERE id = ? AND project_id = ?`, values },
    buildProjectPublicationRevisionForEstimate(input.projectId, context.workspaceId, input.estimateId),
  ], {
    projectId: input.projectId,
    estimateId: input.estimateId,
    workspaceId: context.workspaceId,
    eventType: "estimate_details_updated",
    actorUserId: actor.userId,
    correlationId: input.correlationId,
    changedFields,
    oldSnapshot: current,
    newSnapshot: input.patch,
    payload: input.patch,
  });
  return { estimateId: input.estimateId };
}

export async function updateEstimateSheetAdjustmentWithHistory(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: {
    projectId: string;
    estimateId: string;
    correlationId: string;
    mode: string;
    percentage: number;
    expectedRowRevision?: number | null;
  },
): Promise<EstimateSheetAdjustmentResult> {
  const context = await assertEstimateEditIntent(database, actor, input.estimateId);
  if (context.projectId !== input.projectId) {
    throw new Error("Estimate not found in the current project.");
  }
  const existing = await firstD1Row<{ row_revision: number | string }>(
    database,
    "SELECT row_revision FROM estimate_sheet_adjustments WHERE estimate_id = ? AND mode = ? LIMIT 1",
    [input.estimateId, input.mode],
  );
  if (
    input.expectedRowRevision !== null
    && input.expectedRowRevision !== undefined
    && existing
    && readNumber(existing.row_revision, 1) !== input.expectedRowRevision
  ) {
    throw new Error(ESTIMATE_ROW_REVISION_CONFLICT_CODE);
  }
  const rowRevision = existing ? readNumber(existing.row_revision, 1) + 1 : 1;
  const updatedAt = nowIso();
  const adjustment = {
    estimateId: input.estimateId,
    mode: input.mode,
    percentage: input.percentage,
    rowRevision,
    updatedAt,
    updatedBy: actor.userId,
  };
  const eventId = await runMutationWithHistory(database, [{
    sql: `
      INSERT INTO estimate_sheet_adjustments (estimate_id, mode, percentage, row_revision, updated_at, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(estimate_id, mode) DO UPDATE SET
        percentage = excluded.percentage,
        row_revision = excluded.row_revision,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
    `,
    values: [input.estimateId, input.mode, input.percentage, rowRevision, updatedAt, actor.userId],
  }, buildProjectPublicationRevisionForEstimate(input.projectId, context.workspaceId, input.estimateId)], {
    projectId: input.projectId,
    estimateId: input.estimateId,
    workspaceId: context.workspaceId,
    eventType: "sheet_adjustment_updated",
    actorUserId: actor.userId,
    correlationId: input.correlationId,
    changedFields: ["percentage"],
    payload: { adjustment },
  });
  return { eventId, adjustment };
}
