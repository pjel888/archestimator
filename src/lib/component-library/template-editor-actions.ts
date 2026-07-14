"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { isWorkspaceEditorInD1 } from "@/lib/authz/d1-access";
import {
  getCloudflareD1Database,
  type D1DatabaseLike,
  type D1Value,
} from "@/lib/cloudflare/d1";
import type { EstimateRowItem, EstimateRowLinkState } from "@/lib/estimates/types";
import { sanitizeEstimateRowSourceSnapshot } from "@/lib/estimates/image-url";
import { sanitizeEstimateRowPriceOptionsSnapshot } from "@/lib/estimates/source-snapshot-price-options";
import { isUuid } from "@/lib/ids";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import type { Json } from "@/lib/types/json";
import { throwActionError } from "./action-errors";

type CurrentUserContext = Awaited<ReturnType<typeof requireCurrentUserContext>>;

export type TemplateNodeKind = "group" | "area";

export type TemplateEditorRowPatch = Partial<{
  material: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  miscCost: number;
  contingencyPercentage: number;
  adjustmentPercentage: number;
}>;

type EstimateTemplateRow = {
  id: string;
  workspace_id: string;
  name: string;
};

type EstimateTemplateNodeD1Row = {
  id: string;
  template_id: string;
  parent_id: string | null;
  kind: TemplateNodeKind;
  name: string;
  sort_order: number;
  metadata: string | Json | null;
  created_at: string;
  updated_at: string;
};

type EstimateTemplateNode = Omit<EstimateTemplateNodeD1Row, "metadata"> & {
  metadata: Json;
};

type EstimateTemplateRowItemD1Row = {
  id: string;
  template_id: string;
  template_node_id: string;
  sort_order: number;
  source_library_item_id: string | null;
  source_snapshot: string | Json | null;
  category_node_id: string | null;
  supplier_id: string | null;
  material: string;
  description: string;
  supplier: string;
  unit: string;
  quantity: number;
  unit_cost: number;
  misc_cost: number;
  contingency_percentage: number;
  adjustment_percentage: number;
  discipline: string;
  designation: string;
  link_state: EstimateRowLinkState;
  metadata: string | Json | null;
  created_at: string;
  updated_at: string;
};

type EstimateTemplateRowItem = Omit<EstimateTemplateRowItemD1Row, "source_snapshot" | "metadata"> & {
  source_snapshot: Json | null;
  metadata: Json;
};

type TemplateRowInsert = Omit<EstimateTemplateRowItem, "id" | "created_at" | "updated_at">;

type TemplateRowUpdate = Partial<
  Pick<
    EstimateTemplateRowItem,
    | "material"
    | "description"
    | "quantity"
    | "unit"
    | "unit_cost"
    | "misc_cost"
    | "adjustment_percentage"
  >
>;

function revalidateTemplateEditorPaths(templateId: string) {
  revalidatePath("/workshop/library/templates");
  revalidatePath(`/workshop/library/templates/${templateId}`);
}

function nowIso() {
  return new Date().toISOString();
}

function placeholders(values: readonly unknown[]) {
  if (values.length === 0) throw new Error("At least one SQL placeholder is required.");
  return values.map(() => "?").join(", ");
}

function isJsonObject(value: Json): value is { [key: string]: Json | undefined } {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function parseJsonValue(value: unknown, fallback: Json): Json {
  if (typeof value === "string") {
    try {
      return parseJsonValue(JSON.parse(value) as Json, fallback);
    } catch {
      return fallback;
    }
  }
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "string" ||
    Array.isArray(value) ||
    (value && typeof value === "object")
  ) {
    return value as Json;
  }
  return fallback;
}

function jsonObjectText(value: unknown) {
  const parsed = parseJsonValue(value, {});
  return JSON.stringify(isJsonObject(parsed) ? parsed : {});
}

function nullableJsonText(value: unknown) {
  if (value === null || value === undefined) return null;
  return JSON.stringify(parseJsonValue(value, null));
}

function toTemplateNode(row: EstimateTemplateNodeD1Row): EstimateTemplateNode {
  return {
    ...row,
    sort_order: Number(row.sort_order ?? 0),
    metadata: parseJsonValue(row.metadata, {}),
  };
}

function toTemplateRowItem(row: EstimateTemplateRowItemD1Row): EstimateTemplateRowItem {
  return {
    ...row,
    sort_order: Number(row.sort_order ?? 0),
    quantity: Number(row.quantity ?? 0),
    unit_cost: Number(row.unit_cost ?? 0),
    misc_cost: Number(row.misc_cost ?? 0),
    contingency_percentage: Number(row.contingency_percentage ?? 0),
    adjustment_percentage: Number(row.adjustment_percentage ?? 0),
    source_snapshot: parseJsonValue(row.source_snapshot, null),
    metadata: parseJsonValue(row.metadata, {}),
  };
}

async function requireTemplateEditorD1Database() {
  const database = await getCloudflareD1Database();
  if (!database) {
    throw new Error("Cloudflare D1 ARCH_DB binding is required for template editor actions.");
  }
  return database;
}

async function first<T>(
  database: D1DatabaseLike,
  sql: string,
  values: D1Value[] = [],
  userMessage = "Could not read template data.",
) {
  try {
    return await database
      .prepare<T>(sql)
      .bind(...values)
      .first<T>();
  } catch (error) {
    throwActionError(userMessage, error);
  }
}

async function all<T>(
  database: D1DatabaseLike,
  sql: string,
  values: D1Value[] = [],
  userMessage = "Could not read template data.",
) {
  try {
    const result = await database
      .prepare<T>(sql)
      .bind(...values)
      .all<T>();
    return result.results ?? [];
  } catch (error) {
    throwActionError(userMessage, error);
  }
}

async function run(
  database: D1DatabaseLike,
  sql: string,
  values: D1Value[] = [],
  userMessage = "Could not update template data.",
) {
  try {
    const result = await database
      .prepare(sql)
      .bind(...values)
      .run();
    if (result.success === false) throw new Error("Cloudflare D1 template editor write failed.");
    return result;
  } catch (error) {
    throwActionError(userMessage, error);
  }
}

async function runBatch(
  database: D1DatabaseLike,
  statements: Array<{ sql: string; values?: D1Value[] }>,
  userMessage = "Could not update template data.",
) {
  if (statements.length === 0) return;
  try {
    if (database.batch) {
      const results = await database.batch(
        statements.map((statement) =>
          database.prepare(statement.sql).bind(...(statement.values ?? [])),
        ),
      );
      if (results.some((result) => result.success === false)) {
        throw new Error("Cloudflare D1 template editor batch failed.");
      }
      return;
    }
    for (const statement of statements) {
      const result = await database
        .prepare(statement.sql)
        .bind(...(statement.values ?? []))
        .run();
      if (result.success === false) throw new Error("Cloudflare D1 template editor write failed.");
    }
  } catch (error) {
    throwActionError(userMessage, error);
  }
}

async function requireTemplateEditorAccess(
  database: D1DatabaseLike,
  workspaceId: string,
  currentUser: CurrentUserContext,
) {
  let canManage = false;
  try {
    canManage = await isWorkspaceEditorInD1(database, workspaceId, currentUser);
  } catch (error) {
    throwActionError("Could not verify template editor access.", error);
  }
  if (!canManage) throw new Error("Only workspace editors/admins can edit estimate templates.");
}

async function requireWorkspaceTemplate(database: D1DatabaseLike, workspaceId: string, templateId: string) {
  if (!isUuid(templateId)) throw new Error("Template not found in the current workspace.");
  const template = await first<EstimateTemplateRow>(
    database,
    `
      SELECT id, workspace_id, name
      FROM estimate_templates
      WHERE id = ?
        AND workspace_id = ?
      LIMIT 1
    `,
    [templateId, workspaceId],
    "Could not load the template.",
  );
  if (!template) throw new Error("Template not found in the current workspace.");
  return template;
}

async function requireTemplateNode(database: D1DatabaseLike, templateId: string, nodeId: string) {
  if (!isUuid(nodeId)) throw new Error("Template node not found.");
  const node = await first<EstimateTemplateNodeD1Row>(
    database,
    `
      SELECT id, template_id, parent_id, kind, name, sort_order, metadata, created_at, updated_at
      FROM estimate_template_nodes
      WHERE id = ?
        AND template_id = ?
      LIMIT 1
    `,
    [nodeId, templateId],
    "Could not load the template node.",
  );
  if (!node) throw new Error("Template node not found.");
  return toTemplateNode(node);
}

async function nextSiblingSortOrder(database: D1DatabaseLike, templateId: string, parentId: string | null) {
  const row = await first<{ sort_order: number | null }>(
    database,
    parentId === null
      ? `
          SELECT sort_order
          FROM estimate_template_nodes
          WHERE template_id = ?
            AND parent_id IS NULL
          ORDER BY sort_order DESC
          LIMIT 1
        `
      : `
          SELECT sort_order
          FROM estimate_template_nodes
          WHERE template_id = ?
            AND parent_id = ?
          ORDER BY sort_order DESC
          LIMIT 1
        `,
    parentId === null ? [templateId] : [templateId, parentId],
    "Could not read sibling order.",
  );
  return Number(row?.sort_order ?? -1) + 1;
}

async function readAllTemplateNodes(database: D1DatabaseLike, templateId: string) {
  return all<EstimateTemplateNodeD1Row>(
    database,
    `
      SELECT id, template_id, parent_id, kind, name, sort_order, metadata, created_at, updated_at
      FROM estimate_template_nodes
      WHERE template_id = ?
      ORDER BY sort_order ASC, id ASC
    `,
    [templateId],
    "Could not load the template tree.",
  );
}

async function readTemplateRowItem(database: D1DatabaseLike, templateId: string, rowId: string) {
  const row = await first<EstimateTemplateRowItemD1Row>(
    database,
    `
      SELECT *
      FROM estimate_template_row_items
      WHERE id = ?
        AND template_id = ?
      LIMIT 1
    `,
    [rowId, templateId],
    "Could not load the template row.",
  );
  return row ? toTemplateRowItem(row) : null;
}

function templateNodeInsertStatement(input: {
  id: string;
  templateId: string;
  parentId: string | null;
  kind: TemplateNodeKind;
  name: string;
  sortOrder: number;
  metadata?: Json;
  now: string;
}) {
  return {
    sql: `
      INSERT INTO estimate_template_nodes (
        id, template_id, parent_id, kind, name, sort_order, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      input.id,
      input.templateId,
      input.parentId,
      input.kind,
      input.name,
      input.sortOrder,
      jsonObjectText(input.metadata ?? {}),
      input.now,
      input.now,
    ] as D1Value[],
  };
}

function templateRowItemInsertStatement(input: EstimateTemplateRowItem & { now: string }) {
  return {
    sql: `
      INSERT INTO estimate_template_row_items (
        id,
        template_id,
        template_node_id,
        sort_order,
        source_library_item_id,
        source_snapshot,
        category_node_id,
        supplier_id,
        material,
        description,
        supplier,
        unit,
        quantity,
        unit_cost,
        misc_cost,
        contingency_percentage,
        adjustment_percentage,
        discipline,
        designation,
        link_state,
        metadata,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      input.id,
      input.template_id,
      input.template_node_id,
      input.sort_order,
      input.source_library_item_id,
      nullableJsonText(input.source_snapshot),
      input.category_node_id,
      input.supplier_id,
      input.material,
      input.description,
      input.supplier,
      input.unit,
      input.quantity,
      input.unit_cost,
      input.misc_cost,
      input.contingency_percentage,
      input.adjustment_percentage,
      input.discipline,
      input.designation,
      input.link_state,
      jsonObjectText(input.metadata),
      input.now,
      input.now,
    ] as D1Value[],
  };
}

export async function createEstimateTemplateNode(input: {
  templateId: string;
  parentId: string | null;
  kind: TemplateNodeKind;
  name: string;
}) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireTemplateEditorD1Database();
  await requireTemplateEditorAccess(database, workspace.id, currentUser);
  await requireWorkspaceTemplate(database, workspace.id, input.templateId);

  const name = input.name.trim();
  if (!name) throw new Error("Node name is required.");
  if (input.parentId === null && input.kind !== "group") {
    throw new Error("Only groups can sit at the template root.");
  }
  if (input.parentId !== null) {
    const parent = await requireTemplateNode(database, input.templateId, input.parentId);
    if (parent.kind !== "group") throw new Error("Groups and areas can only be added under a group.");
  }

  const now = nowIso();
  const nodeId = randomUUID();
  const sortOrder = await nextSiblingSortOrder(database, input.templateId, input.parentId);
  const insertStatement = templateNodeInsertStatement({
    id: nodeId,
    templateId: input.templateId,
    parentId: input.parentId,
    kind: input.kind,
    name,
    sortOrder,
    now,
  });
  await run(
    database,
    insertStatement.sql,
    insertStatement.values,
    `Could not add the ${input.kind}.`,
  );

  const node = await requireTemplateNode(database, input.templateId, nodeId);
  revalidateTemplateEditorPaths(input.templateId);
  return { node };
}

export async function renameEstimateTemplateNode(input: { templateId: string; nodeId: string; name: string }) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireTemplateEditorD1Database();
  await requireTemplateEditorAccess(database, workspace.id, currentUser);
  await requireWorkspaceTemplate(database, workspace.id, input.templateId);

  const name = input.name.trim();
  if (!name) throw new Error("Node name is required.");

  await run(
    database,
    `
      UPDATE estimate_template_nodes
      SET name = ?, updated_at = ?
      WHERE id = ?
        AND template_id = ?
    `,
    [name, nowIso(), input.nodeId, input.templateId],
    "Could not rename the node.",
  );
  const node = await requireTemplateNode(database, input.templateId, input.nodeId);

  revalidateTemplateEditorPaths(input.templateId);
  return { nodeId: node.id, name: node.name };
}

export async function deleteEstimateTemplateNode(input: { templateId: string; nodeId: string }) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireTemplateEditorD1Database();
  await requireTemplateEditorAccess(database, workspace.id, currentUser);
  await requireWorkspaceTemplate(database, workspace.id, input.templateId);
  await requireTemplateNode(database, input.templateId, input.nodeId);

  const allNodes = await readAllTemplateNodes(database, input.templateId);
  const childrenByParent = new Map<string | null, string[]>();
  for (const node of allNodes) {
    const siblings = childrenByParent.get(node.parent_id) ?? [];
    siblings.push(node.id);
    childrenByParent.set(node.parent_id, siblings);
  }
  const subtreeIds: string[] = [];
  const queue = [input.nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    subtreeIds.push(current);
    queue.push(...(childrenByParent.get(current) ?? []));
  }

  await runBatch(
    database,
    [
      {
        sql: `
          DELETE FROM estimate_template_row_items
          WHERE template_id = ?
            AND template_node_id IN (${placeholders(subtreeIds)})
        `,
        values: [input.templateId, ...subtreeIds],
      },
      {
        sql: `
          DELETE FROM estimate_template_nodes
          WHERE template_id = ?
            AND id IN (${placeholders(subtreeIds)})
        `,
        values: [input.templateId, ...subtreeIds],
      },
    ],
    "Could not delete the node.",
  );

  revalidateTemplateEditorPaths(input.templateId);
  return { deletedNodeIds: subtreeIds };
}

export async function moveEstimateTemplateNode(input: {
  templateId: string;
  nodeId: string;
  parentId: string | null;
  /** Sibling ids under the new parent, in final order, including the moved node. */
  orderedSiblingIds: string[];
}) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireTemplateEditorD1Database();
  await requireTemplateEditorAccess(database, workspace.id, currentUser);
  await requireWorkspaceTemplate(database, workspace.id, input.templateId);
  const node = await requireTemplateNode(database, input.templateId, input.nodeId);

  if (input.parentId === null && node.kind !== "group") {
    throw new Error("Only groups can sit at the template root.");
  }
  if (input.parentId !== null) {
    if (input.parentId === input.nodeId) throw new Error("A node cannot be its own parent.");
    const parent = await requireTemplateNode(database, input.templateId, input.parentId);
    if (parent.kind !== "group") throw new Error("Groups and areas can only be moved under a group.");

    const allNodes = await readAllTemplateNodes(database, input.templateId);
    const parentById = new Map(allNodes.map((entry) => [entry.id, entry.parent_id]));
    let ancestor: string | null = input.parentId;
    while (ancestor) {
      if (ancestor === input.nodeId) throw new Error("A node cannot move into its own subtree.");
      ancestor = parentById.get(ancestor) ?? null;
    }
  }

  await runBatch(
    database,
    [
      {
        sql: `
          UPDATE estimate_template_nodes
          SET parent_id = ?, updated_at = ?
          WHERE id = ?
            AND template_id = ?
        `,
        values: [input.parentId, nowIso(), input.nodeId, input.templateId],
      },
      ...input.orderedSiblingIds.map((siblingId, index) => ({
        sql: `
          UPDATE estimate_template_nodes
          SET sort_order = ?, updated_at = ?
          WHERE id = ?
            AND template_id = ?
        `,
        values: [index, nowIso(), siblingId, input.templateId] as D1Value[],
      })),
    ],
    "Could not move the node.",
  );

  revalidateTemplateEditorPaths(input.templateId);
  return { nodeId: input.nodeId, parentId: input.parentId };
}

function buildTemplateRowInsert(input: {
  templateId: string;
  nodeId: string;
  sortOrder: number;
  libraryItem: EstimateRowItem;
}): TemplateRowInsert {
  const item = input.libraryItem;
  const sourceLibraryItemId = item.sourceLibraryItemId ?? (item.source === "library" ? item.id : null);
  const priceOptions = sanitizeEstimateRowPriceOptionsSnapshot(item.priceOptions ?? []);
  const sourceSnapshot = sanitizeEstimateRowSourceSnapshot({
    source: item.source,
    sourceType: sourceLibraryItemId ? "library_component" : null,
    sourceComponentId: sourceLibraryItemId,
    sourceLibraryItemId,
    sourceUpdatedAt: item.updatedAt ?? null,
    category: item.category,
    categoryNodeId: item.categoryNodeId ?? null,
    categoryPath: item.categoryPath ?? [],
    brand: item.brand ?? null,
    brandId: item.brandId ?? null,
    supplier: item.supplier ?? null,
    supplierId: item.supplierId ?? null,
    componentVersionId: item.componentVersionId ?? null,
    componentVersionNumber: item.componentVersionNumber ?? null,
    lifecycleState: item.lifecycleState ?? null,
    priceOptionId: item.priceOptionId ?? null,
    priceOptionLabel: item.priceOptionLabel ?? null,
    priceOptions: priceOptions ?? [],
    pricingDate: item.pricingDate,
    pricingSource: item.pricingSource,
    sourceUrl: item.sourceUrl ?? null,
    imageUrl: item.imageUrl ?? null,
    tags: item.tags ?? [],
    unit: item.unit,
    unit_cost: item.itemCost,
    misc_cost: item.miscCost,
    currency: item.currency ?? "PHP",
  }) as Json;
  return {
    template_id: input.templateId,
    template_node_id: input.nodeId,
    sort_order: input.sortOrder,
    source_library_item_id: sourceLibraryItemId,
    source_snapshot: sourceSnapshot,
    category_node_id: item.categoryNodeId ?? null,
    supplier_id: item.supplierId ?? null,
    material: item.name?.trim() || item.material,
    description: item.description ?? "",
    supplier: item.supplier ?? "",
    unit: item.unit || "unit",
    quantity: item.quantity > 0 ? item.quantity : 1,
    unit_cost: item.itemCost ?? 0,
    misc_cost: item.miscCost ?? 0,
    contingency_percentage: 0,
    adjustment_percentage: item.adjustmentPercentage ?? item.contingencyPercentage ?? 0,
    discipline: item.discipline ?? "",
    designation: item.designation ?? "",
    link_state: sourceLibraryItemId ? "linked-clean" : "unlinked",
    metadata: {},
  };
}

export async function addEstimateTemplateRowItems(input: {
  templateId: string;
  nodeId: string;
  libraryItems: EstimateRowItem[];
}) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireTemplateEditorD1Database();
  await requireTemplateEditorAccess(database, workspace.id, currentUser);
  await requireWorkspaceTemplate(database, workspace.id, input.templateId);
  const node = await requireTemplateNode(database, input.templateId, input.nodeId);
  if (node.kind !== "area") throw new Error("Components can only be added to an area.");
  if (input.libraryItems.length === 0) throw new Error("No components to add.");

  const lastRow = await first<{ sort_order: number | null }>(
    database,
    `
      SELECT sort_order
      FROM estimate_template_row_items
      WHERE template_node_id = ?
      ORDER BY sort_order DESC
      LIMIT 1
    `,
    [input.nodeId],
    "Could not read the row order.",
  );
  const baseSortOrder = Number(lastRow?.sort_order ?? -1) + 1;
  const now = nowIso();
  const inserts = input.libraryItems.map((libraryItem, index) => ({
    id: randomUUID(),
    created_at: now,
    updated_at: now,
    ...buildTemplateRowInsert({
      templateId: input.templateId,
      nodeId: input.nodeId,
      sortOrder: baseSortOrder + index,
      libraryItem,
    }),
  }));

  await runBatch(
    database,
    inserts.map((row) => templateRowItemInsertStatement({ ...row, now })),
    "Could not add the rows.",
  );
  const ids = inserts.map((row) => row.id);
  const rows = await all<EstimateTemplateRowItemD1Row>(
    database,
    `
      SELECT *
      FROM estimate_template_row_items
      WHERE id IN (${placeholders(ids)})
        AND template_id = ?
      ORDER BY sort_order ASC, id ASC
    `,
    [...ids, input.templateId],
    "Could not add the rows.",
  );

  revalidateTemplateEditorPaths(input.templateId);
  return { rows: rows.map(toTemplateRowItem) };
}

export async function createEstimateTemplateAllowanceRow(input: {
  templateId: string;
  nodeId: string;
  material: string;
}) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireTemplateEditorD1Database();
  await requireTemplateEditorAccess(database, workspace.id, currentUser);
  await requireWorkspaceTemplate(database, workspace.id, input.templateId);
  const node = await requireTemplateNode(database, input.templateId, input.nodeId);
  if (node.kind !== "area") throw new Error("Rows can only be added to an area.");

  const material = input.material.trim();
  if (!material) throw new Error("Row name is required.");

  const lastRow = await first<{ sort_order: number | null }>(
    database,
    `
      SELECT sort_order
      FROM estimate_template_row_items
      WHERE template_node_id = ?
      ORDER BY sort_order DESC
      LIMIT 1
    `,
    [input.nodeId],
    "Could not read the row order.",
  );
  const now = nowIso();
  const row: EstimateTemplateRowItem = {
    id: randomUUID(),
    template_id: input.templateId,
    template_node_id: input.nodeId,
    sort_order: Number(lastRow?.sort_order ?? -1) + 1,
    source_library_item_id: null,
    source_snapshot: null,
    category_node_id: null,
    supplier_id: null,
    material,
    description: "",
    supplier: "",
    unit: "unit",
    quantity: 1,
    unit_cost: 0,
    misc_cost: 0,
    contingency_percentage: 0,
    adjustment_percentage: 0,
    discipline: "",
    designation: "",
    link_state: "unlinked",
    metadata: {},
    created_at: now,
    updated_at: now,
  };

  const insertStatement = templateRowItemInsertStatement({ ...row, now });
  await run(
    database,
    insertStatement.sql,
    insertStatement.values,
    "Could not add the allowance row.",
  );
  const insertedRow = await readTemplateRowItem(database, input.templateId, row.id);
  if (!insertedRow) throwActionError("Could not add the allowance row.");

  revalidateTemplateEditorPaths(input.templateId);
  return { row: insertedRow };
}

export async function updateEstimateTemplateRowItem(input: {
  templateId: string;
  rowId: string;
  patch: TemplateEditorRowPatch;
}) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireTemplateEditorD1Database();
  await requireTemplateEditorAccess(database, workspace.id, currentUser);
  await requireWorkspaceTemplate(database, workspace.id, input.templateId);
  if (!isUuid(input.rowId)) throw new Error("Template row not found.");

  const update: TemplateRowUpdate = {};
  if (input.patch.material !== undefined) {
    const material = input.patch.material.trim();
    if (!material) throw new Error("Row name is required.");
    update.material = material;
  }
  if (input.patch.description !== undefined) update.description = input.patch.description.trim();
  if (input.patch.unit !== undefined) {
    const unit = input.patch.unit.trim();
    if (!unit) throw new Error("Unit is required.");
    update.unit = unit;
  }
  if (input.patch.quantity !== undefined) {
    if (!Number.isFinite(input.patch.quantity) || input.patch.quantity < 0) throw new Error("Quantity must be a non-negative number.");
    update.quantity = input.patch.quantity;
  }
  if (input.patch.unitCost !== undefined) {
    if (!Number.isFinite(input.patch.unitCost) || input.patch.unitCost < 0) throw new Error("Unit cost must be a non-negative number.");
    update.unit_cost = input.patch.unitCost;
  }
  if (input.patch.miscCost !== undefined) {
    if (!Number.isFinite(input.patch.miscCost) || input.patch.miscCost < 0) throw new Error("Misc cost must be a non-negative number.");
    update.misc_cost = input.patch.miscCost;
  }
  if (input.patch.contingencyPercentage !== undefined) {
    if (!Number.isFinite(input.patch.contingencyPercentage) || Math.abs(input.patch.contingencyPercentage) > 100) {
      throw new Error("Adjustment must stay between -100 and 100 percent.");
    }
    update.adjustment_percentage = input.patch.contingencyPercentage;
  }
  if (input.patch.adjustmentPercentage !== undefined) {
    if (!Number.isFinite(input.patch.adjustmentPercentage) || Math.abs(input.patch.adjustmentPercentage) > 100) {
      throw new Error("Adjustment must stay between -100 and 100 percent.");
    }
    update.adjustment_percentage = input.patch.adjustmentPercentage;
  }
  const entries = Object.entries(update) as Array<[keyof TemplateRowUpdate, D1Value]>;
  if (entries.length === 0) throw new Error("Nothing to update.");

  await run(
    database,
    `
      UPDATE estimate_template_row_items
      SET ${entries.map(([column]) => `${column} = ?`).join(", ")}, updated_at = ?
      WHERE id = ?
        AND template_id = ?
    `,
    [...entries.map(([, value]) => value), nowIso(), input.rowId, input.templateId],
    "Could not update the row.",
  );
  const row = await readTemplateRowItem(database, input.templateId, input.rowId);
  if (!row) throw new Error("Template row not found.");

  revalidateTemplateEditorPaths(input.templateId);
  return { row };
}

export async function removeEstimateTemplateRowItem(input: { templateId: string; rowId: string }) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireTemplateEditorD1Database();
  await requireTemplateEditorAccess(database, workspace.id, currentUser);
  await requireWorkspaceTemplate(database, workspace.id, input.templateId);
  if (!isUuid(input.rowId)) throw new Error("Template row not found.");

  const row = await readTemplateRowItem(database, input.templateId, input.rowId);
  if (!row) throw new Error("Template row not found.");
  await run(
    database,
    `
      DELETE FROM estimate_template_row_items
      WHERE id = ?
        AND template_id = ?
    `,
    [input.rowId, input.templateId],
    "Could not remove the row.",
  );

  revalidateTemplateEditorPaths(input.templateId);
  return { rowId: row.id };
}

export async function reorderEstimateTemplateRowItems(input: {
  templateId: string;
  nodeId: string;
  orderedRowIds: string[];
}) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireTemplateEditorD1Database();
  await requireTemplateEditorAccess(database, workspace.id, currentUser);
  await requireWorkspaceTemplate(database, workspace.id, input.templateId);

  const now = nowIso();
  await runBatch(
    database,
    input.orderedRowIds.map((rowId, index) => ({
      sql: `
        UPDATE estimate_template_row_items
        SET sort_order = ?, updated_at = ?
        WHERE id = ?
          AND template_id = ?
          AND template_node_id = ?
      `,
      values: [index, now, rowId, input.templateId, input.nodeId],
    })),
    "Could not store the row order.",
  );

  revalidateTemplateEditorPaths(input.templateId);
  return { nodeId: input.nodeId };
}

/**
 * Copies another template's subtree into the target template (composition,
 * Phase 3.5). Copy semantics mean cycles cannot form; self-insert is still
 * rejected as a footgun.
 */
export async function insertTemplateIntoTemplate(input: {
  targetTemplateId: string;
  targetNodeId: string | null;
  sourceTemplateId: string;
  /** Copy only this node's subtree instead of the whole source template. */
  sourceNodeId?: string | null;
}) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireTemplateEditorD1Database();
  await requireTemplateEditorAccess(database, workspace.id, currentUser);
  await requireWorkspaceTemplate(database, workspace.id, input.targetTemplateId);
  await requireWorkspaceTemplate(database, workspace.id, input.sourceTemplateId);
  if (input.targetTemplateId === input.sourceTemplateId) {
    throw new Error("A template cannot be inserted into itself.");
  }
  if (input.targetNodeId !== null) {
    const target = await requireTemplateNode(database, input.targetTemplateId, input.targetNodeId);
    if (target.kind !== "group") throw new Error("Templates can only be inserted under a group.");
  }

  const [sourceNodes, sourceRows] = await Promise.all([
    all<EstimateTemplateNodeD1Row>(
      database,
      `
        SELECT id, template_id, parent_id, kind, name, sort_order, metadata, created_at, updated_at
        FROM estimate_template_nodes
        WHERE template_id = ?
        ORDER BY sort_order ASC, id ASC
      `,
      [input.sourceTemplateId],
      "Could not load the source template.",
    ),
    all<EstimateTemplateRowItemD1Row>(
      database,
      `
        SELECT *
        FROM estimate_template_row_items
        WHERE template_id = ?
        ORDER BY sort_order ASC, id ASC
      `,
      [input.sourceTemplateId],
      "Could not load the source rows.",
    ),
  ]);

  let nodesToCopy = sourceNodes.map(toTemplateNode);
  let rowsToCopy = sourceRows.map(toTemplateRowItem);
  if (input.sourceNodeId) {
    const childrenByParent = new Map<string | null, EstimateTemplateNode[]>();
    for (const node of nodesToCopy) {
      const siblings = childrenByParent.get(node.parent_id) ?? [];
      siblings.push(node);
      childrenByParent.set(node.parent_id, siblings);
    }
    const subtree: EstimateTemplateNode[] = [];
    const root = nodesToCopy.find((node) => node.id === input.sourceNodeId);
    if (!root) throw new Error("The source template node no longer exists.");
    const queue = [root];
    while (queue.length > 0) {
      const node = queue.shift()!;
      subtree.push(node);
      queue.push(...(childrenByParent.get(node.id) ?? []));
    }
    const subtreeIds = new Set(subtree.map((node) => node.id));
    nodesToCopy = subtree.map((node) => (node.id === root.id ? { ...node, parent_id: null } : node));
    rowsToCopy = rowsToCopy.filter((row) => subtreeIds.has(row.template_node_id));
  }
  if (nodesToCopy.length === 0) throw new Error("The source template has no structure to insert.");

  const baseSortOrder = await nextSiblingSortOrder(database, input.targetTemplateId, input.targetNodeId);
  const idMap = new Map<string, string>(nodesToCopy.map((node) => [node.id, randomUUID()]));
  const now = nowIso();
  const nodeInserts = nodesToCopy.map((node, index) =>
    templateNodeInsertStatement({
      id: idMap.get(node.id)!,
      templateId: input.targetTemplateId,
      parentId: node.parent_id ? idMap.get(node.parent_id) ?? null : input.targetNodeId,
      kind: node.kind,
      name: node.name,
      sortOrder: node.parent_id ? node.sort_order : baseSortOrder + index,
      metadata: {},
      now,
    }),
  );

  await runBatch(database, nodeInserts, "Could not copy the structure.");

  const rowInserts = rowsToCopy.map((row) => {
    const copiedNodeId = idMap.get(row.template_node_id);
    if (!copiedNodeId) throw new Error("The source template row no longer has a matching node.");
    return templateRowItemInsertStatement({
      ...row,
      id: randomUUID(),
      template_id: input.targetTemplateId,
      template_node_id: copiedNodeId,
      created_at: now,
      updated_at: now,
      now,
    });
  });

  if (rowInserts.length > 0) {
    try {
      await runBatch(database, rowInserts, "Could not copy the rows.");
    } catch (error) {
      await run(
        database,
        `
          DELETE FROM estimate_template_nodes
          WHERE template_id = ?
            AND id IN (${placeholders(Array.from(idMap.values()))})
        `,
        [input.targetTemplateId, ...Array.from(idMap.values())],
        "Could not clean up the copied structure.",
      );
      throw error;
    }
  }

  revalidateTemplateEditorPaths(input.targetTemplateId);
  return { insertedNodeIds: Array.from(idMap.values()) };
}
