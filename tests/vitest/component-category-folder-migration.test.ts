import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const requireRuntime = createRequire(import.meta.url);
const unificationMigration = readFileSync("migrations/0085_component_category_folder_unification.sql", "utf8");
const enforcementMigration = readFileSync("migrations/0086_component_category_folder_enforcement.sql", "utf8");

type LocalSqliteDatabase = {
  exec(sql: string): void;
  prepare(sql: string): {
    all(...parameters: unknown[]): Record<string, unknown>[];
    get(...parameters: unknown[]): Record<string, unknown> | undefined;
    run(...parameters: unknown[]): unknown;
  };
  close(): void;
};

function createDatabase() {
  const { DatabaseSync } = requireRuntime("node:sqlite") as {
    DatabaseSync: new (path: string) => LocalSqliteDatabase;
  };
  const database = new DatabaseSync(":memory:");
  database.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE workspaces (
      id TEXT PRIMARY KEY
    );

    CREATE TABLE component_category_nodes (
      id TEXT PRIMARY KEY,
      parent_id TEXT REFERENCES component_category_nodes(id) ON DELETE SET NULL,
      label TEXT NOT NULL,
      node_type TEXT NOT NULL DEFAULT 'category',
      sort_order INTEGER NOT NULL DEFAULT 0,
      code TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE library_folders (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      parent_id TEXT REFERENCES library_folders(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      source_category_node_id TEXT REFERENCES component_category_nodes(id) ON DELETE SET NULL,
      folder_kind TEXT NOT NULL DEFAULT 'custom' CHECK (folder_kind IN ('taxonomy', 'custom')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT,
      UNIQUE (workspace_id, parent_id, name)
    );

    CREATE TABLE cost_library_items (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Uncategorized',
      category_node_id TEXT REFERENCES component_category_nodes(id) ON DELETE SET NULL,
      library_folder_id TEXT REFERENCES library_folders(id) ON DELETE SET NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE workspace_price_freshness_policies (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      category_node_id TEXT REFERENCES component_category_nodes(id) ON DELETE RESTRICT,
      stale_days INTEGER NOT NULL CHECK (stale_days > 0),
      very_stale_days INTEGER NOT NULL CHECK (very_stale_days > stale_days),
      revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
      updated_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX idx_workspace_price_freshness_policies_default
      ON workspace_price_freshness_policies(workspace_id)
      WHERE category_node_id IS NULL;

    CREATE UNIQUE INDEX idx_workspace_price_freshness_policies_category
      ON workspace_price_freshness_policies(workspace_id, category_node_id)
      WHERE category_node_id IS NOT NULL;
  `);
  return database;
}

function applyCategoryFolderMigrations(database: LocalSqliteDatabase) {
  database.exec(`BEGIN;\n${unificationMigration}\nCOMMIT;`);
  database.exec(`BEGIN;\n${enforcementMigration}\nCOMMIT;`);
}

function insertFolder(
  database: LocalSqliteDatabase,
  input: {
    id: string;
    workspaceId: string;
    parentId?: string | null;
    name: string;
    sourceCategoryNodeId?: string | null;
    folderKind?: "custom" | "taxonomy";
  },
) {
  database.prepare(`
    INSERT INTO library_folders (
      id, workspace_id, parent_id, name, sort_order, source_category_node_id,
      folder_kind, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 0, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(
    input.id,
    input.workspaceId,
    input.parentId ?? null,
    input.name,
    input.sourceCategoryNodeId ?? null,
    input.folderKind ?? "custom",
  );
}

function insertComponent(
  database: LocalSqliteDatabase,
  input: {
    id: string;
    workspaceId: string;
    category: string;
    folderId?: string | null;
    categoryNodeId?: string | null;
  },
) {
  database.prepare(`
    INSERT INTO cost_library_items (
      id, workspace_id, name, category, category_node_id, library_folder_id, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(
    input.id,
    input.workspaceId,
    input.id,
    input.category,
    input.categoryNodeId ?? null,
    input.folderId ?? null,
  );
}

function insertPolicy(
  database: LocalSqliteDatabase,
  input: { id: string; workspaceId: string; categoryNodeId?: string | null },
) {
  database.prepare(`
    INSERT INTO workspace_price_freshness_policies (
      id, workspace_id, category_node_id, stale_days, very_stale_days
    ) VALUES (?, ?, ?, 30, 60)
  `).run(input.id, input.workspaceId, input.categoryNodeId ?? null);
}

function seedMigratableLegacyData(database: LocalSqliteDatabase) {
  database.exec(`
    INSERT INTO workspaces (id) VALUES ('workspace-1'), ('workspace-2');
    INSERT INTO component_category_nodes (id, label) VALUES
      ('category-flooring', 'Flooring'),
      ('category-paint', 'Paint'),
      ('category-masonry', 'Masonry');
  `);

  insertFolder(database, {
    id: "folder-default-1",
    workspaceId: "workspace-1",
    name: " uncategorized ",
  });
  insertFolder(database, {
    id: "folder-flooring",
    workspaceId: "workspace-1",
    name: "Flooring",
    sourceCategoryNodeId: "category-flooring",
    folderKind: "taxonomy",
  });
  insertFolder(database, {
    id: "folder-paint",
    workspaceId: "workspace-1",
    name: "Paint",
  });
  insertFolder(database, {
    id: "folder-finishes",
    workspaceId: "workspace-1",
    name: "Finishes",
  });
  insertFolder(database, {
    id: "folder-timber",
    workspaceId: "workspace-1",
    parentId: "folder-finishes",
    name: "Timber",
  });
  insertFolder(database, {
    id: "folder-foreign",
    workspaceId: "workspace-2",
    name: "Other",
  });

  insertComponent(database, {
    id: "component-valid",
    workspaceId: "workspace-1",
    category: "Old Timber Label",
    folderId: "folder-timber",
  });
  insertComponent(database, {
    id: "component-paint",
    workspaceId: "workspace-1",
    category: " Paint ",
  });
  insertComponent(database, {
    id: "component-cross-workspace",
    workspaceId: "workspace-1",
    category: "Flooring",
    folderId: "folder-foreign",
    categoryNodeId: "category-flooring",
  });
  insertComponent(database, {
    id: "component-empty-category",
    workspaceId: "workspace-1",
    category: "",
  });
  insertComponent(database, {
    id: "component-masonry",
    workspaceId: "workspace-2",
    category: "Masonry",
  });

  insertPolicy(database, { id: "policy-default", workspaceId: "workspace-1" });
  insertPolicy(database, {
    id: "policy-flooring",
    workspaceId: "workspace-1",
    categoryNodeId: "category-flooring",
  });
  insertPolicy(database, {
    id: "policy-paint",
    workspaceId: "workspace-1",
    categoryNodeId: "category-paint",
  });
  insertPolicy(database, {
    id: "policy-masonry",
    workspaceId: "workspace-2",
    categoryNodeId: "category-masonry",
  });
}

describe("component category-folder migrations", () => {
  it("canonicalizes legacy categories and preserves category policies by folder identity", () => {
    const database = createDatabase();
    try {
      seedMigratableLegacyData(database);
      applyCategoryFolderMigrations(database);

      expect(database.prepare(`
        SELECT workspace_id, name, parent_id, is_default_category
        FROM library_folders
        WHERE is_default_category = 1
        ORDER BY workspace_id
      `).all()).toEqual([
        { workspace_id: "workspace-1", name: "Uncategorized", parent_id: null, is_default_category: 1 },
        { workspace_id: "workspace-2", name: "Uncategorized", parent_id: null, is_default_category: 1 },
      ]);

      expect(database.prepare(`
        SELECT id, library_folder_id, category, category_node_id
        FROM cost_library_items
        ORDER BY id
      `).all()).toEqual([
        {
          id: "component-cross-workspace",
          library_folder_id: "folder-flooring",
          category: "Flooring",
          category_node_id: null,
        },
        {
          id: "component-empty-category",
          library_folder_id: "folder-default-1",
          category: "Uncategorized",
          category_node_id: null,
        },
        {
          id: "component-masonry",
          library_folder_id: expect.any(String),
          category: "Masonry",
          category_node_id: null,
        },
        {
          id: "component-paint",
          library_folder_id: "folder-paint",
          category: "Paint",
          category_node_id: null,
        },
        {
          id: "component-valid",
          library_folder_id: "folder-timber",
          category: "Timber",
          category_node_id: null,
        },
      ]);

      expect(database.prepare(`
        SELECT policy.id, policy.category_node_id, folder.name AS folder_name
        FROM workspace_price_freshness_policies AS policy
        LEFT JOIN library_folders AS folder ON folder.id = policy.category_folder_id
        ORDER BY policy.id
      `).all()).toEqual([
        { id: "policy-default", category_node_id: null, folder_name: null },
        { id: "policy-flooring", category_node_id: null, folder_name: "Flooring" },
        { id: "policy-masonry", category_node_id: null, folder_name: "Masonry" },
        { id: "policy-paint", category_node_id: null, folder_name: "Paint" },
      ]);

      expect(database.prepare(`
        SELECT COUNT(*) AS count
        FROM library_folders
        WHERE folder_kind <> 'custom' OR source_category_node_id IS NOT NULL
      `).get()).toEqual({ count: 0 });
      expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      database.close();
    }
  });

  it("rolls back instead of silently discarding an unmapped legacy category policy", () => {
    const database = createDatabase();
    try {
      database.exec(`
        INSERT INTO workspaces (id) VALUES ('workspace-1');
        INSERT INTO component_category_nodes (id, label) VALUES ('category-orphan', 'Orphaned policy');
      `);
      insertPolicy(database, {
        id: "policy-orphan",
        workspaceId: "workspace-1",
        categoryNodeId: "category-orphan",
      });

      expect(() => database.exec(`BEGIN;\n${unificationMigration}\nCOMMIT;`))
        .toThrow("component_category_folder_unification_preflight_failed");
      expect(database.prepare("PRAGMA table_info(library_folders)").all().some((column) => column.name === "is_default_category"))
        .toBe(false);
      expect(database.prepare("SELECT COUNT(*) AS count FROM library_folders").get()).toEqual({ count: 0 });
      expect(database.prepare("SELECT category_node_id FROM workspace_price_freshness_policies").get())
        .toEqual({ category_node_id: "category-orphan" });
    } finally {
      database.close();
    }
  });

  it("enforces folder ownership and rehomes all dependents before a non-default delete", () => {
    const database = createDatabase();
    try {
      seedMigratableLegacyData(database);
      applyCategoryFolderMigrations(database);

      database.prepare("INSERT INTO workspaces (id) VALUES (?)").run("workspace-3");
      expect(database.prepare(`
        SELECT name, parent_id, is_default_category
        FROM library_folders
        WHERE workspace_id = 'workspace-3'
      `).all()).toEqual([{ name: "Uncategorized", parent_id: null, is_default_category: 1 }]);

      expect(() => insertComponent(database, {
        id: "component-without-folder",
        workspaceId: "workspace-1",
        category: "Invalid",
      })).toThrow("component category folder must belong to the component workspace");
      expect(() => insertComponent(database, {
        id: "component-with-legacy-node",
        workspaceId: "workspace-1",
        category: "Invalid",
        folderId: "folder-paint",
        categoryNodeId: "category-paint",
      })).toThrow("component category folder must belong to the component workspace");
      expect(() => insertComponent(database, {
        id: "component-with-foreign-folder",
        workspaceId: "workspace-1",
        category: "Invalid",
        folderId: "folder-foreign",
      })).toThrow("component category folder must belong to the component workspace");
      expect(() => insertFolder(database, {
        id: "folder-cross-workspace-child",
        workspaceId: "workspace-1",
        parentId: "folder-foreign",
        name: "Invalid child",
      })).toThrow("library folder parent must belong to the folder workspace");
      expect(() => database.prepare(`
        INSERT INTO workspace_price_freshness_policies (
          id, workspace_id, category_node_id, category_folder_id, stale_days, very_stale_days
        ) VALUES ('policy-legacy-write', 'workspace-1', 'category-paint', NULL, 30, 60)
      `).run()).toThrow("category policy folder must belong to the policy workspace");

      expect(() => database.prepare(`
        UPDATE library_folders SET name = 'Renamed' WHERE id = 'folder-default-1'
      `).run()).toThrow("default component category cannot be renamed, reparented, moved, or cleared");
      expect(() => database.prepare("DELETE FROM library_folders WHERE id = 'folder-default-1'").run())
        .toThrow("default component category cannot be deleted");

      insertFolder(database, {
        id: "folder-delete",
        workspaceId: "workspace-1",
        parentId: "folder-finishes",
        name: "Delete me",
      });
      insertFolder(database, {
        id: "folder-grandchild",
        workspaceId: "workspace-1",
        parentId: "folder-delete",
        name: "Grandchild",
      });
      insertComponent(database, {
        id: "component-to-rehome",
        workspaceId: "workspace-1",
        category: "Delete me",
        folderId: "folder-delete",
      });
      database.prepare(`
        INSERT INTO workspace_price_freshness_policies (
          id, workspace_id, category_node_id, category_folder_id, stale_days, very_stale_days
        ) VALUES ('policy-to-rehome', 'workspace-1', NULL, 'folder-delete', 30, 60)
      `).run();

      database.prepare("DELETE FROM library_folders WHERE id = 'folder-delete'").run();

      expect(database.prepare(`
        SELECT library_folder_id, category, category_node_id
        FROM cost_library_items
        WHERE id = 'component-to-rehome'
      `).get()).toEqual({
        library_folder_id: "folder-finishes",
        category: "Finishes",
        category_node_id: null,
      });
      expect(database.prepare(`
        SELECT category_folder_id, category_node_id
        FROM workspace_price_freshness_policies
        WHERE id = 'policy-to-rehome'
      `).get()).toEqual({ category_folder_id: "folder-finishes", category_node_id: null });
      expect(database.prepare("SELECT parent_id FROM library_folders WHERE id = 'folder-grandchild'").get())
        .toEqual({ parent_id: "folder-finishes" });
      expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      database.close();
    }
  });
});
