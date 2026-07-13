"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireAuth, requireCurrentUserContext } from "@/lib/auth/session";
import { canEditEstimateInD1, isWorkspaceEditorInD1 } from "@/lib/authz/d1-access";
import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";
import { recordExpressComponentEvent } from "@/lib/estimates/express-components-telemetry";
import { isExpressComponentPromotionEnabled } from "@/lib/estimates/express-components";
import { clearEstimateRouteContextProcessCache } from "@/lib/repositories/workspace-repository";

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type PromoteEstimateRowToLibraryComponentInput = {
  projectId: string;
  estimateId: string;
  rowId: string;
  libraryFolderId?: string | null;
  mutationId?: string;
};

export type PromoteEstimateRowToLibraryComponentResult = {
  rowId: string;
  itemId: string;
  activePriceOptionId?: string | null;
  idempotent?: boolean;
  [key: string]: Json | undefined;
};

export type PromoteExpressRowToLibraryComponentInput = PromoteEstimateRowToLibraryComponentInput;
export type PromoteExpressRowToLibraryComponentResult = PromoteEstimateRowToLibraryComponentResult;

type PromotionSourceRow = {
  project_id: string;
  workspace_id: string;
  estimate_id: string;
  row_id: string;
  node_id: string | null;
  estimate_tab_id: string | null;
  material: string | null;
  description: string | null;
  supplier: string | null;
  supplier_id: string | null;
  unit: string | null;
  unit_cost: number | string | null;
  misc_cost: number | string | null;
  contingency_percentage: number | string | null;
  adjustment_percentage: number | string | null;
  source_snapshot_json: string | null;
  metadata_json: string | null;
  source_library_item_id: string | null;
  link_state: string | null;
  row_revision: number | string | null;
};

function nowIso() {
  return new Date().toISOString();
}

function readJsonRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return readJsonRecord(JSON.parse(value) as unknown);
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function jsonObject(value: Record<string, unknown>) {
  return JSON.stringify(value);
}

function readNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function requireExpressPromotionD1Database() {
  const database = await getCloudflareD1Database();
  if (!database) {
    throw new Error("Cloudflare D1 ARCH_DB binding is required for component promotion.");
  }
  return database;
}

async function first<T>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  return database.prepare<T>(sql).bind(...values).first<T>();
}

async function run(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  const result = await database.prepare(sql).bind(...values).run();
  if (result.success === false) throw new Error("Cloudflare D1 component promotion write failed.");
  return result;
}

async function runBatch(database: D1DatabaseLike, statements: Array<{ sql: string; values?: D1Value[] }>) {
  if (statements.length === 0) return;
  if (database.batch) {
    const results = await database.batch(
      statements.map((statement) => database.prepare(statement.sql).bind(...(statement.values ?? []))),
    );
    if (results.some((result) => result.success === false)) {
      throw new Error("Cloudflare D1 component promotion batch failed.");
    }
    return;
  }
  for (const statement of statements) await run(database, statement.sql, statement.values ?? []);
}

function readPromotionResult(value: unknown): PromoteEstimateRowToLibraryComponentResult {
  const record = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, Json | undefined> : {};
  const rowId = typeof record.rowId === "string" ? record.rowId : "";
  const itemId = typeof record.itemId === "string" ? record.itemId : "";
  if (!rowId || !itemId) throw new Error("Component promotion did not return a promoted row and library item.");
  return {
    ...record,
    rowId,
    itemId,
    activePriceOptionId: typeof record.activePriceOptionId === "string" ? record.activePriceOptionId : null,
    idempotent: record.idempotent === true,
  };
}

async function readExistingPromotionResult(database: D1DatabaseLike, estimateId: string, correlationId: string) {
  const event = await first<{ payload: string }>(
    database,
    `
      SELECT payload
      FROM estimate_sheet_events
      WHERE estimate_id = ?
        AND correlation_id = ?
      LIMIT 1
    `,
    [estimateId, correlationId],
  );
  if (!event) return null;
  return readPromotionResult({
    ...readJsonRecord(event.payload),
    idempotent: true,
  });
}

async function readPromotedLibraryItem(database: D1DatabaseLike, input: { workspaceId: string; rowId: string; sourceLibraryItemId?: string | null }) {
  return first<{ item_id: string; active_price_option_id: string | null }>(
    database,
    `
      SELECT id AS item_id, active_price_option_id
      FROM cost_library_items
      WHERE workspace_id = ?
        AND (
          source_estimate_row_item_id = ?
          OR (? IS NOT NULL AND id = ?)
        )
      LIMIT 1
    `,
    [input.workspaceId, input.rowId, input.sourceLibraryItemId ?? null, input.sourceLibraryItemId ?? null],
  );
}

async function readPromotionSourceRow(database: D1DatabaseLike, input: { projectId: string; estimateId: string; rowId: string }) {
  return first<PromotionSourceRow>(
    database,
    `
      SELECT
        project.id AS project_id,
        project.workspace_id,
        estimate.id AS estimate_id,
        row_item.id AS row_id,
        row_item.node_id,
        node.estimate_tab_id,
        row_item.material,
        row_item.description,
        row_item.supplier,
        row_item.supplier_id,
        row_item.unit,
        row_item.unit_cost,
        row_item.misc_cost,
        row_item.contingency_percentage,
        row_item.adjustment_percentage,
        row_item.source_snapshot_json,
        row_item.metadata_json,
        row_item.source_library_item_id,
        row_item.link_state,
        row_item.row_revision
      FROM projects project
      JOIN estimates estimate ON estimate.project_id = project.id
      JOIN estimate_row_items row_item ON row_item.estimate_id = estimate.id
      LEFT JOIN estimate_nodes node
        ON node.id = row_item.node_id
        AND node.estimate_id = estimate.id
      WHERE project.id = ?
        AND estimate.id = ?
        AND row_item.id = ?
      LIMIT 1
    `,
    [input.projectId, input.estimateId, input.rowId],
  );
}

async function assertLibraryFolderBelongsToWorkspace(database: D1DatabaseLike, input: { workspaceId: string; libraryFolderId: string | null }) {
  if (!input.libraryFolderId) return;
  const folder = await first<{ id: string }>(
    database,
    `
      SELECT id
      FROM library_folders
      WHERE id = ?
        AND workspace_id = ?
      LIMIT 1
    `,
    [input.libraryFolderId, input.workspaceId],
  );
  if (!folder) throw new Error("Target library folder was not found in the current workspace.");
}

function buildPromotionMetadata(row: PromotionSourceRow, patch: Record<string, unknown>) {
  const metadata = readJsonRecord(row.metadata_json);
  const expressComponent = readJsonRecord(metadata.expressComponent);
  return jsonObject({
    ...metadata,
    expressComponent: {
      ...expressComponent,
      ...patch,
    },
  });
}

function buildPromotionSourceSnapshot(row: PromotionSourceRow, input: { itemId: string; priceOptionId: string; promotedAt: string }) {
  return jsonObject({
    ...readJsonRecord(row.source_snapshot_json),
    sourceType: "library",
    sourceLibraryItemId: input.itemId,
    activePriceOptionId: input.priceOptionId,
    promotedAt: input.promotedAt,
  });
}

export async function promoteEstimateRowToLibraryComponent({
  projectId,
  estimateId,
  rowId,
  libraryFolderId = null,
  mutationId,
}: PromoteEstimateRowToLibraryComponentInput): Promise<PromoteEstimateRowToLibraryComponentResult> {
  if (!isExpressComponentPromotionEnabled()) throw new Error("Component promotion is disabled.");

  const [database, currentUser] = await Promise.all([
    requireExpressPromotionD1Database(),
    requireCurrentUserContext(),
  ]);
  const correlationId = mutationId || randomUUID();
  recordExpressComponentEvent("promotion_requested", { projectId, estimateId, rowId });

  try {
    const existingResult = await readExistingPromotionResult(database, estimateId, correlationId);
    if (existingResult) {
      recordExpressComponentEvent("promotion_succeeded", { projectId, estimateId, rowId, itemId: existingResult.itemId });
      clearEstimateRouteContextProcessCache(projectId);
      revalidatePath("/workshop/library");
      revalidatePath("/workshop/library/components");
      revalidatePath(`/workshop/projects/${projectId}/estimates`);
      revalidatePath(`/workshop/projects/${projectId}/estimates/${estimateId}`);
      return existingResult;
    }

    const row = await readPromotionSourceRow(database, { projectId, estimateId, rowId });
    if (!row) throw new Error("Project, estimate, or row not found in Cloudflare D1.");

    const [canEditEstimate, canManageLibrary] = await Promise.all([
      canEditEstimateInD1(database, estimateId, currentUser),
      isWorkspaceEditorInD1(database, row.workspace_id, currentUser),
    ]);
    if (!canEditEstimate || !canManageLibrary) {
      throw new Error("Estimate edit access and workspace library access are required to promote this component.");
    }
    await assertLibraryFolderBelongsToWorkspace(database, { workspaceId: row.workspace_id, libraryFolderId });

    const promotedItem = await readPromotedLibraryItem(database, {
      workspaceId: row.workspace_id,
      rowId,
      sourceLibraryItemId: row.source_library_item_id,
    });
    if (promotedItem) {
      const result = readPromotionResult({
        rowId,
        itemId: promotedItem.item_id,
        activePriceOptionId: promotedItem.active_price_option_id,
        idempotent: true,
      });
      recordExpressComponentEvent("promotion_succeeded", { projectId, estimateId, rowId, itemId: result.itemId });
      clearEstimateRouteContextProcessCache(projectId);
      revalidatePath("/workshop/library");
      revalidatePath("/workshop/library/components");
      revalidatePath(`/workshop/projects/${projectId}/estimates`);
      revalidatePath(`/workshop/projects/${projectId}/estimates/${estimateId}`);
      return result;
    }

    const material = (row.material ?? "").trim() || (row.description ?? "").trim();
    if (!material) throw new Error("Rows without a material or description cannot be promoted to the library.");

    const timestamp = nowIso();
    const itemId = randomUUID();
    const priceOptionId = randomUUID();
    const unitCost = readNumber(row.unit_cost);
    const miscCost = readNumber(row.misc_cost);
    const result = readPromotionResult({
      rowId,
      itemId,
      activePriceOptionId: priceOptionId,
      idempotent: false,
    });
    const payload = jsonObject(result as Record<string, unknown>);
    const oldSnapshot = jsonObject({
      rowId,
      sourceLibraryItemId: row.source_library_item_id,
      linkState: row.link_state,
      rowRevision: readNumber(row.row_revision),
    });
    const newSnapshot = jsonObject({
      rowId,
      sourceLibraryItemId: itemId,
      linkState: "linked-clean",
      rowRevision: readNumber(row.row_revision) + 1,
    });
    const metadata = buildPromotionMetadata(row, {
      promotedLibraryItemId: itemId,
      activePriceOptionId: priceOptionId,
      promotionCorrelationId: correlationId,
      promotedAt: timestamp,
    });
    const sourceSnapshot = buildPromotionSourceSnapshot(row, { itemId, priceOptionId, promotedAt: timestamp });

    await runBatch(database, [
      {
        sql: `
          INSERT INTO cost_library_items (
            id,
            workspace_id,
            name,
            description,
            category,
            category_node_id,
            library_folder_id,
            supplier,
            supplier_id,
            brand,
            brand_id,
            unit,
            unit_cost,
            misc_cost,
            lifecycle_state,
            current_version_number,
            active_price_option_id,
            source_estimate_row_item_id,
            metadata_json,
            created_by,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        values: [
          itemId,
          row.workspace_id,
          material,
          row.description ?? "",
          "Uncategorized",
          null,
          libraryFolderId,
          row.supplier ?? null,
          row.supplier_id ?? null,
          null,
          null,
          row.unit ?? "",
          unitCost,
          miscCost,
          "available",
          1,
          priceOptionId,
          rowId,
          jsonObject({
            source: "estimate-row-promotion",
            createdFrom: "express-component-promotion",
            projectId,
            estimateId,
            rowId,
            correlationId,
          }),
          currentUser.userId,
          timestamp,
          timestamp,
        ],
      },
      {
        sql: `
          INSERT INTO cost_library_item_price_options (
            id,
            workspace_id,
            item_id,
            label,
            unit,
            unit_cost,
            misc_cost,
            currency,
            is_active,
            is_default,
            updated_at,
            supplier_id,
            metadata_json,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        values: [
          priceOptionId,
          row.workspace_id,
          itemId,
          "Default",
          row.unit ?? "",
          unitCost,
          miscCost,
          "PHP",
          1,
          1,
          timestamp,
          row.supplier_id ?? null,
          jsonObject({ source: "estimate-row-promotion", rowId, correlationId }),
          timestamp,
        ],
      },
      {
        sql: `
          UPDATE estimate_row_items
          SET source_library_item_id = ?,
              link_state = 'linked-clean',
              row_revision = row_revision + 1,
              source_snapshot_json = ?,
              metadata_json = ?,
              updated_at = ?
          WHERE id = ?
            AND estimate_id = ?
        `,
        values: [itemId, sourceSnapshot, metadata, timestamp, rowId, estimateId],
      },
      {
        sql: `
          INSERT INTO estimate_sheet_events (
            id,
            estimate_id,
            workspace_id,
            project_id,
            estimate_node_id,
            estimate_tab_id,
            target_row_id,
            event_type,
            event_source,
            correlation_id,
            actor_user_id,
            changed_fields,
            row_context,
            old_snapshot,
            new_snapshot,
            payload,
            metadata,
            total_delta,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        values: [
          randomUUID(),
          estimateId,
          row.workspace_id,
          projectId,
          row.node_id,
          row.estimate_tab_id,
          rowId,
          "row_promoted_to_library",
          "server_action",
          correlationId,
          currentUser.userId,
          JSON.stringify(["source_library_item_id", "link_state", "metadata_json", "row_revision"]),
          jsonObject({ rowId, material, libraryFolderId }),
          oldSnapshot,
          newSnapshot,
          payload,
          jsonObject({ source: "express-promotion-actions", itemId, priceOptionId }),
          0,
          timestamp,
        ],
      },
    ]);

    recordExpressComponentEvent("promotion_succeeded", { projectId, estimateId, rowId, itemId: result.itemId });

    clearEstimateRouteContextProcessCache(projectId);
    revalidatePath("/workshop/library");
    revalidatePath("/workshop/library/components");
    revalidatePath(`/workshop/projects/${projectId}/estimates`);
    revalidatePath(`/workshop/projects/${projectId}/estimates/${estimateId}`);

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    recordExpressComponentEvent("promotion_failed", { projectId, estimateId, rowId, reason: message });
    throw new Error(`Could not promote component: ${message}`);
  }
}

export async function promoteExpressRowToLibraryComponent(input: PromoteExpressRowToLibraryComponentInput) {
  await requireAuth();
  return promoteEstimateRowToLibraryComponent(input);
}
