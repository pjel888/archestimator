import { randomUUID } from "node:crypto";

import type { D1DatabaseLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import { assertD1MutationStatementLimit } from "@/lib/estimates/mutation-receipts";
import {
  LIBRARY_FOLDER_SORT_ORDER_STEP,
  getLibraryFolderCreateSortOrder,
  planLibraryFolderDelete,
  type LibraryFolderCreatePlacement,
} from "./library-folder-reorder";
import { UNCATEGORIZED_CATEGORY_LABEL } from "./category-folders";

export type LibraryFolderMutationRow = {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  source_category_node_id: string | null;
  folder_kind: "taxonomy" | "custom";
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_default_category: number;
};

type LibraryFolderGraphIdentity = {
  id: string;
  parent_id: string | null;
  sort_order: number;
  updated_at: string;
  is_default_category?: number;
};

export type ReorderLibraryFoldersD1Update = {
  id: string;
  parentId: string | null;
  sortOrder: number;
};

function nowIso() {
  return new Date().toISOString();
}

async function first<T>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  return database.prepare<T>(sql).bind(...values).first<T>();
}

async function all<T>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  const result = await database.prepare<T>(sql).bind(...values).all<T>();
  if (result.success === false) throw new Error("Cloudflare D1 component library read failed.");
  return result.results ?? [];
}

async function run<T = Record<string, unknown>>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  const result = await database.prepare<T>(sql).bind(...values).run();
  if (result.success === false) throw new Error("Cloudflare D1 component library write failed.");
  return result;
}

async function runAtomicBatch(
  database: D1DatabaseLike,
  statements: Array<{ sql: string; values?: D1Value[] }>,
): Promise<D1Result[]> {
  if (!database.batch) throw new Error("Cloudflare D1 atomic batch support is required for component updates.");
  const results = await database.batch(
    statements.map((statement) => database.prepare(statement.sql).bind(...(statement.values ?? []))),
  );
  if (results.some((result) => result.success === false)) throw new Error("Cloudflare D1 component update batch failed.");
  return results;
}

function buildLibraryFolderGraphGuardStatement(input: {
  actualSql: string;
  actualValues: D1Value[];
  expectedRows: LibraryFolderGraphIdentity[];
  guardName: string;
}) {
  return {
    sql: `
      WITH expected AS (
        SELECT
          json_extract(value, '$.id') AS id,
          json_extract(value, '$.parent_id') AS parent_id,
          json_extract(value, '$.sort_order') AS sort_order,
          json_extract(value, '$.updated_at') AS updated_at
        FROM json_each(?)
      ),
      actual AS (
        ${input.actualSql}
      )
      SELECT CASE WHEN
        (SELECT COUNT(*) FROM expected) = (SELECT COUNT(*) FROM actual)
        AND NOT EXISTS (
          SELECT 1
          FROM expected
          LEFT JOIN actual ON actual.id = expected.id
          WHERE actual.id IS NULL
            OR actual.parent_id IS NOT expected.parent_id
            OR actual.sort_order <> expected.sort_order
            OR actual.updated_at <> expected.updated_at
        )
      THEN 1 ELSE json('') END AS ${input.guardName}
    `,
    values: [JSON.stringify([...input.expectedRows].sort((left, right) => left.id.localeCompare(right.id))), ...input.actualValues],
  };
}

async function ensureDefaultLibraryCategoryFolder(database: D1DatabaseLike, workspaceId: string) {
  const existing = await first<Pick<LibraryFolderMutationRow, "id" | "name">>(
    database,
    `SELECT id, name
     FROM library_folders
     WHERE workspace_id = ?
       AND is_default_category = 1
     ORDER BY id ASC
     LIMIT 1`,
    [workspaceId],
  );
  if (existing) return existing;

  const folderId = randomUUID();
  const timestamp = nowIso();
  await run(
    database,
    `INSERT OR IGNORE INTO library_folders (
       id, workspace_id, parent_id, name, sort_order, folder_kind,
       created_by, created_at, updated_at, is_default_category
     ) VALUES (?, ?, NULL, ?, 0, 'custom', NULL, ?, ?, 1)`,
    [folderId, workspaceId, UNCATEGORIZED_CATEGORY_LABEL, timestamp, timestamp],
  );
  const created = await first<Pick<LibraryFolderMutationRow, "id" | "name">>(
    database,
    "SELECT id, name FROM library_folders WHERE workspace_id = ? AND is_default_category = 1 LIMIT 1",
    [workspaceId],
  );
  if (!created) throw new Error("Could not create the workspace default category.");
  return created;
}

export async function resolveLibraryFolderInWorkspaceD1(
  database: D1DatabaseLike,
  workspaceId: string,
  folderId: string | null,
) {
  if (!folderId) return ensureDefaultLibraryCategoryFolder(database, workspaceId);
  const folder = await first<Pick<LibraryFolderMutationRow, "id" | "name">>(
    database,
    `
      SELECT id, name
      FROM library_folders
      WHERE id = ?
        AND workspace_id = ?
      LIMIT 1
    `,
    [folderId, workspaceId],
  );
  if (!folder) throw new Error("Library folder not found in the current workspace.");
  return folder;
}

export async function createLibraryFolderInD1(
  database: D1DatabaseLike,
  input: {
    workspaceId: string;
    actorUserId: string;
    parentId: string | null;
    name: string;
    placement: LibraryFolderCreatePlacement;
  },
) {
  const scopedFolders = await all<LibraryFolderGraphIdentity>(
    database,
    `
      SELECT id, parent_id, sort_order, updated_at
      FROM library_folders
      WHERE workspace_id = ?
        AND (id IS ? OR parent_id IS ?)
      ORDER BY id
    `,
    [input.workspaceId, input.parentId, input.parentId],
  );
  if (input.parentId && !scopedFolders.some((folder) => folder.id === input.parentId)) {
    throw new Error("Parent folder not found in the current workspace.");
  }

  const siblingRows = scopedFolders.filter((folder) => folder.parent_id === input.parentId);
  const nextSortOrder = getLibraryFolderCreateSortOrder(siblingRows, input.placement);
  const folderId = randomUUID();
  const timestamp = nowIso();
  const statements: Array<{ sql: string; values: D1Value[] }> = [
    buildLibraryFolderGraphGuardStatement({
      actualSql: `
        SELECT id, parent_id, sort_order, updated_at
        FROM library_folders
        WHERE workspace_id = ?
          AND (id IS ? OR parent_id IS ?)
      `,
      actualValues: [input.workspaceId, input.parentId, input.parentId],
      expectedRows: scopedFolders,
      guardName: "library_folder_create_graph_guard",
    }),
  ];
  if (input.placement === "top" && siblingRows.some((sibling) => sibling.sort_order === nextSortOrder)) {
    const sortedSiblings = [...siblingRows].sort((left, right) => right.sort_order - left.sort_order);
    for (const sibling of sortedSiblings) {
      statements.push({
        sql: `
          UPDATE library_folders
          SET sort_order = ?, updated_at = ?
          WHERE id = ?
            AND workspace_id = ?
            AND updated_at = ?
        `,
        values: [
          sibling.sort_order + LIBRARY_FOLDER_SORT_ORDER_STEP,
          timestamp,
          sibling.id,
          input.workspaceId,
          sibling.updated_at,
        ],
      });
    }
  }
  statements.push({
    sql: `
      INSERT INTO library_folders (
        id, workspace_id, parent_id, name, sort_order, folder_kind,
        created_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'custom', ?, ?, ?)
    `,
    values: [
      folderId,
      input.workspaceId,
      input.parentId,
      input.name,
      nextSortOrder,
      input.actorUserId,
      timestamp,
      timestamp,
    ],
  });
  assertD1MutationStatementLimit(statements.length);
  await runAtomicBatch(database, statements);
  const folder = await first<LibraryFolderMutationRow>(
    database,
    "SELECT * FROM library_folders WHERE id = ? AND workspace_id = ? LIMIT 1",
    [folderId, input.workspaceId],
  );
  if (!folder) throw new Error("Could not create folder.");
  return folder;
}

export async function renameLibraryFolderInD1(
  database: D1DatabaseLike,
  input: { workspaceId: string; folderId: string; name: string },
) {
  const defaultFolder = await ensureDefaultLibraryCategoryFolder(database, input.workspaceId);
  if (input.folderId === defaultFolder.id && input.name !== UNCATEGORIZED_CATEGORY_LABEL) {
    throw new Error(`The default category must remain ${UNCATEGORIZED_CATEGORY_LABEL}.`);
  }
  const timestamp = nowIso();
  await runAtomicBatch(database, [
    {
      sql: "UPDATE library_folders SET name = ?, updated_at = ? WHERE id = ? AND workspace_id = ?",
      values: [input.name, timestamp, input.folderId, input.workspaceId],
    },
    {
      sql: "UPDATE cost_library_items SET category = ?, category_node_id = NULL, updated_at = ? WHERE workspace_id = ? AND library_folder_id = ?",
      values: [input.name, timestamp, input.workspaceId, input.folderId],
    },
  ]);
  const folder = await first<LibraryFolderMutationRow>(
    database,
    "SELECT * FROM library_folders WHERE id = ? AND workspace_id = ? LIMIT 1",
    [input.folderId, input.workspaceId],
  );
  if (!folder) throw new Error("Folder not found in the current workspace.");
  return folder;
}

export async function deleteLibraryFolderInD1(
  database: D1DatabaseLike,
  input: { workspaceId: string; folderId: string },
) {
  const folders = await all<LibraryFolderMutationRow>(
    database,
    "SELECT * FROM library_folders WHERE workspace_id = ?",
    [input.workspaceId],
  );
  const deletePlan = planLibraryFolderDelete(folders, input.folderId);
  if (!deletePlan) throw new Error("Library folder not found in the current workspace.");
  if (deletePlan.deletedFolder.is_default_category === 1) throw new Error("The default category cannot be deleted.");
  const defaultFolder = deletePlan.deletedFolder.parent_id
    ? null
    : await ensureDefaultLibraryCategoryFolder(database, input.workspaceId);
  const rehomeFolder = deletePlan.deletedFolder.parent_id
    ? folders.find((folder) => folder.id === deletePlan.deletedFolder.parent_id)
    : defaultFolder;
  if (!rehomeFolder) throw new Error("The parent category no longer exists.");
  const timestamp = nowIso();
  const statements: Array<{ sql: string; values: D1Value[] }> = [
    ...deletePlan.liftedChildUpdates.map((update) => ({
      sql: "UPDATE library_folders SET parent_id = ?, sort_order = ?, updated_at = ? WHERE id = ? AND workspace_id = ?",
      values: [update.parentId, update.sortOrder, timestamp, update.id, input.workspaceId],
    })),
    {
      sql: "UPDATE cost_library_items SET library_folder_id = ?, category = ?, category_node_id = NULL, updated_at = ? WHERE workspace_id = ? AND library_folder_id = ?",
      values: [rehomeFolder.id, rehomeFolder.name, timestamp, input.workspaceId, input.folderId],
    },
    {
      sql: `DELETE FROM workspace_price_freshness_policies
            WHERE workspace_id = ?
              AND category_folder_id = ?
              AND EXISTS (
                SELECT 1
                FROM workspace_price_freshness_policies AS destination
                WHERE destination.workspace_id = ?
                  AND destination.category_folder_id = ?
              )`,
      values: [input.workspaceId, input.folderId, input.workspaceId, rehomeFolder.id],
    },
    {
      sql: `UPDATE workspace_price_freshness_policies
            SET category_folder_id = ?, category_node_id = NULL, updated_at = ?
            WHERE workspace_id = ? AND category_folder_id = ?`,
      values: [rehomeFolder.id, timestamp, input.workspaceId, input.folderId],
    },
    {
      sql: "DELETE FROM library_folders WHERE id = ? AND workspace_id = ?",
      values: [input.folderId, input.workspaceId],
    },
  ];
  assertD1MutationStatementLimit(statements.length);
  await runAtomicBatch(database, statements);
}

export async function reorderLibraryFoldersInD1(
  database: D1DatabaseLike,
  input: { workspaceId: string; updates: ReorderLibraryFoldersD1Update[] },
) {
  const folders = await all<LibraryFolderGraphIdentity>(
    database,
    "SELECT id, parent_id, sort_order, updated_at, is_default_category FROM library_folders WHERE workspace_id = ?",
    [input.workspaceId],
  );
  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  for (const update of input.updates) {
    if (!folderById.has(update.id)) throw new Error("Library folder not found in the current workspace.");
    if (update.parentId && !folderById.has(update.parentId)) {
      throw new Error("Parent folder not found in the current workspace.");
    }
    if (folderById.get(update.id)?.is_default_category === 1 && update.parentId !== null) {
      throw new Error("The default category must remain at the root.");
    }
  }

  const affectedParentIds = new Set<string | null>();
  const finalFolderById = new Map(folders.map((folder) => [folder.id, { ...folder }]));
  for (const update of input.updates) {
    const folder = finalFolderById.get(update.id)!;
    affectedParentIds.add(folder.parent_id);
    affectedParentIds.add(update.parentId);
    finalFolderById.set(update.id, {
      ...folder,
      parent_id: update.parentId,
      sort_order: update.sortOrder,
    });
  }
  for (const parentId of affectedParentIds) {
    const usedSortOrders = new Set<number>();
    for (const folder of finalFolderById.values()) {
      if (folder.parent_id !== parentId) continue;
      if (usedSortOrders.has(folder.sort_order)) {
        throw new Error("Library folder sort order collides with another folder.");
      }
      usedSortOrders.add(folder.sort_order);
    }
  }

  const parentById = new Map(folders.map((folder) => [folder.id, folder.parent_id]));
  for (const update of input.updates) parentById.set(update.id, update.parentId);
  for (const update of input.updates) {
    const visited = new Set<string>([update.id]);
    let ancestorId = parentById.get(update.id) ?? null;
    while (ancestorId) {
      if (visited.has(ancestorId)) {
        throw new Error("A library folder cannot be moved inside one of its descendants.");
      }
      visited.add(ancestorId);
      ancestorId = parentById.get(ancestorId) ?? null;
    }
  }

  const timestamp = nowIso();
  const statements: Array<{ sql: string; values: D1Value[] }> = [
    buildLibraryFolderGraphGuardStatement({
      actualSql: "SELECT id, parent_id, sort_order, updated_at, is_default_category FROM library_folders WHERE workspace_id = ?",
      actualValues: [input.workspaceId],
      expectedRows: folders,
      guardName: "library_folder_reorder_graph_guard",
    }),
    ...input.updates.map((update) => ({
      sql: `
        UPDATE library_folders
        SET parent_id = ?, sort_order = ?, updated_at = ?
        WHERE id = ?
          AND workspace_id = ?
          AND updated_at = ?
      `,
      values: [
        update.parentId,
        update.sortOrder,
        timestamp,
        update.id,
        input.workspaceId,
        folderById.get(update.id)!.updated_at,
      ],
    })),
  ];
  assertD1MutationStatementLimit(statements.length);
  await runAtomicBatch(database, statements);
}

export async function moveCostLibraryComponentToFolderInD1(
  database: D1DatabaseLike,
  input: { workspaceId: string; itemId: string; folderId: string | null },
) {
  const targetFolder = await resolveLibraryFolderInWorkspaceD1(database, input.workspaceId, input.folderId);
  await run(
    database,
    "UPDATE cost_library_items SET library_folder_id = ?, category = ?, category_node_id = NULL, updated_at = ? WHERE id = ? AND workspace_id = ?",
    [targetFolder.id, targetFolder.name, nowIso(), input.itemId, input.workspaceId],
  );
  const component = await first<{ id: string }>(
    database,
    "SELECT id FROM cost_library_items WHERE id = ? AND workspace_id = ? LIMIT 1",
    [input.itemId, input.workspaceId],
  );
  if (!component) throw new Error("Component not found in the current workspace.");
}
