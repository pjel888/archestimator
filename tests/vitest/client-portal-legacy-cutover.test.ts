import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const requireRuntime = createRequire(import.meta.url);
const globalFreezeFlag = "client_portal_legacy_write_freeze";
const scopedFreezeMigration = "migrations/0122_workspace_scoped_legacy_cutover_freeze.sql";
const mappingOwnershipMigration = "migrations/0124_client_portal_legacy_mapping_ownership.sql";

type LocalSqliteDatabase = {
  close(): void;
  exec(sql: string): void;
  prepare(sql: string): {
    get(...parameters: unknown[]): Record<string, unknown> | undefined;
    run(...parameters: unknown[]): unknown;
  };
};

describe("legacy Client Portal cutover", () => {
  it("replaces the global freeze with workspace-scoped triggers for every legacy authoring table", () => {
    const sql = readFileSync(resolve(process.cwd(), scopedFreezeMigration), "utf8");
    for (const table of ["project_publications", "shared_link_recipients", "shared_link_comments", "shared_link_responses"]) {
      expect(sql).toContain(`BEFORE INSERT ON ${table}`);
      expect(sql).toContain(`BEFORE UPDATE ON ${table}`);
      expect(sql).toContain(`BEFORE DELETE ON ${table}`);
    }
    expect(sql.match(/CREATE TRIGGER/g)).toHaveLength(12);
    expect(sql).toContain("client_portal_legacy_workspace_cutovers");
    expect(sql).toContain("DROP TRIGGER project_publications_cutover_freeze_insert");
    expect(sql).not.toContain(`WHERE key = '${globalFreezeFlag}'), 0) = 1`);
  });

  it("keeps read compatibility and migration tooling outside the frozen tables", () => {
    const migration = readFileSync(resolve(process.cwd(), "migrations/0121_legacy_client_portal_write_freeze.sql"), "utf8");
    expect(migration).not.toContain("shared_link_events_cutover_freeze");
    expect(migration).not.toContain("client_portal_legacy_mappings_cutover_freeze");
    expect(migration).not.toContain("client_portals_cutover_freeze");
  });

  it("rejects legacy mappings that cross portal, project, or workspace ownership", () => {
    const { DatabaseSync } = requireRuntime("node:sqlite") as { DatabaseSync: new (path: string) => LocalSqliteDatabase };
    const database = new DatabaseSync(":memory:");
    try {
      database.exec(`
        CREATE TABLE project_publications (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, project_id TEXT NOT NULL);
        CREATE TABLE client_portals (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, project_id TEXT NOT NULL);
        CREATE TABLE client_portal_issues (id TEXT PRIMARY KEY, portal_id TEXT NOT NULL);
        CREATE TABLE client_portal_legacy_mappings (
          legacy_publication_id TEXT PRIMARY KEY,
          portal_id TEXT NOT NULL,
          issue_id TEXT NOT NULL
        );
        INSERT INTO project_publications(id, workspace_id, project_id) VALUES ('publication-a', 'workspace-a', 'project-a');
        INSERT INTO client_portals(id, workspace_id, project_id) VALUES
          ('portal-a', 'workspace-a', 'project-a'),
          ('portal-b', 'workspace-b', 'project-b');
        INSERT INTO client_portal_issues(id, portal_id) VALUES
          ('issue-a', 'portal-a'),
          ('issue-b', 'portal-b');
      `);
      database.exec(readFileSync(resolve(process.cwd(), mappingOwnershipMigration), "utf8"));

      expect(() => database.prepare(`INSERT INTO client_portal_legacy_mappings
        (legacy_publication_id, portal_id, issue_id) VALUES (?, ?, ?)`)
        .run("publication-a", "portal-a", "issue-a")).not.toThrow();
      expect(() => database.prepare("UPDATE client_portal_legacy_mappings SET portal_id = ?, issue_id = ? WHERE legacy_publication_id = ?")
        .run("portal-b", "issue-b", "publication-a")).toThrow(/ownership mismatch/i);
      expect(() => database.prepare("DELETE FROM client_portal_legacy_mappings").run()).not.toThrow();
      expect(() => database.prepare(`INSERT INTO client_portal_legacy_mappings
        (legacy_publication_id, portal_id, issue_id) VALUES (?, ?, ?)`)
        .run("publication-a", "portal-a", "issue-b")).toThrow(/ownership mismatch/i);
    } finally {
      database.close();
    }
  });

  it("freezes workspace A while workspace B remains writable", () => {
    const { DatabaseSync } = requireRuntime("node:sqlite") as { DatabaseSync: new (path: string) => LocalSqliteDatabase };
    const database = new DatabaseSync(":memory:");
    try {
      database.exec(`
        CREATE TABLE feature_flags (
          key TEXT PRIMARY KEY,
          enabled INTEGER NOT NULL,
          description TEXT,
          updated_at TEXT NOT NULL,
          updated_by TEXT
        );
        INSERT INTO feature_flags(key, enabled, updated_at) VALUES ('${globalFreezeFlag}', 0, '2026-07-27T00:00:00.000Z');
        CREATE TABLE workspaces (id TEXT PRIMARY KEY);
        CREATE TABLE projects (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL);
        CREATE TABLE client_portals (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL);
        CREATE TABLE project_publications (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, project_id TEXT NOT NULL, value TEXT);
        CREATE TABLE client_portal_legacy_mappings (
          legacy_publication_id TEXT PRIMARY KEY,
          portal_id TEXT NOT NULL,
          issue_id TEXT NOT NULL,
          migration_status TEXT NOT NULL,
          imported_at TEXT,
          verified_at TEXT,
          notes TEXT
        );
        CREATE TABLE shared_link_recipients (id TEXT PRIMARY KEY, publication_id TEXT NOT NULL, value TEXT);
        CREATE TABLE shared_link_comments (id TEXT PRIMARY KEY, publication_id TEXT NOT NULL, value TEXT);
        CREATE TABLE shared_link_responses (id TEXT PRIMARY KEY, publication_id TEXT NOT NULL, value TEXT);
        INSERT INTO workspaces(id) VALUES ('workspace-a'), ('workspace-b'), ('workspace-c');
        INSERT INTO projects(id, workspace_id) VALUES
          ('project-a', 'workspace-a'),
          ('project-b', 'workspace-b'),
          ('project-c', 'workspace-c');
        INSERT INTO client_portals(id, workspace_id) VALUES ('portal-a', 'workspace-a'), ('portal-c', 'workspace-c');
        INSERT INTO project_publications(id, workspace_id, project_id, value) VALUES
          ('publication-a', 'workspace-a', 'project-a', 'before'),
          ('publication-b', 'workspace-b', 'project-b', 'before'),
          ('publication-c', 'workspace-c', 'project-c', 'before');
        INSERT INTO client_portal_legacy_mappings(
          legacy_publication_id,
          portal_id,
          issue_id,
          migration_status,
          imported_at,
          verified_at,
          notes
        ) VALUES
          (
            'publication-a',
            'portal-a',
            'issue-a',
            'cutover_complete',
            '2026-07-26T22:00:00.000Z',
            '2026-07-26T23:00:00.000Z',
            '{"cutover_at":"2026-07-27T00:00:00.000Z"}'
          ),
          (
            'publication-c',
            'portal-c',
            'issue-c',
            'cutover_complete',
            '2026-07-26T20:00:00.000Z',
            '2026-07-26T21:00:00.000Z',
            'not-json'
          );
        INSERT INTO shared_link_recipients(id, publication_id, value) VALUES
          ('shared_link_recipients-a', 'publication-a', 'before'),
          ('shared_link_recipients-b', 'publication-b', 'before');
        INSERT INTO shared_link_comments(id, publication_id, value) VALUES
          ('shared_link_comments-a', 'publication-a', 'before'),
          ('shared_link_comments-b', 'publication-b', 'before');
        INSERT INTO shared_link_responses(id, publication_id, value) VALUES
          ('shared_link_responses-a', 'publication-a', 'before'),
          ('shared_link_responses-b', 'publication-b', 'before');
      `);
      database.exec(readFileSync(resolve(process.cwd(), "migrations/0121_legacy_client_portal_write_freeze.sql"), "utf8"));
      database.prepare("UPDATE feature_flags SET enabled = 1 WHERE key = ?").run(globalFreezeFlag);
      database.exec(readFileSync(resolve(process.cwd(), scopedFreezeMigration), "utf8"));

      expect(database.prepare("SELECT enabled FROM feature_flags WHERE key = ?").get(globalFreezeFlag)).toEqual({ enabled: 0 });
      expect(database.prepare("SELECT workspace_id, frozen_at, frozen_by FROM client_portal_legacy_workspace_cutovers WHERE workspace_id = ?").get("workspace-a")).toEqual({
        workspace_id: "workspace-a",
        frozen_at: "2026-07-27T00:00:00.000Z",
        frozen_by: "migration_0122_backfill",
      });
      expect(database.prepare("SELECT workspace_id, frozen_at, frozen_by FROM client_portal_legacy_workspace_cutovers WHERE workspace_id = ?").get("workspace-c")).toEqual({
        workspace_id: "workspace-c",
        frozen_at: "2026-07-26T21:00:00.000Z",
        frozen_by: "migration_0122_backfill",
      });
      expect(database.prepare("SELECT value FROM project_publications WHERE id = ?").get("publication-a")).toEqual({ value: "before" });

      expect(() => database.prepare("INSERT INTO project_publications(id, workspace_id, project_id, value) VALUES (?, ?, ?, ?)")
        .run("publication-a-2", "workspace-a", "project-a", "after")).toThrow(/frozen/i);
      expect(() => database.prepare("UPDATE project_publications SET value = ? WHERE id = ?").run("after", "publication-a")).toThrow(/frozen/i);
      expect(() => database.prepare("DELETE FROM project_publications WHERE id = ?").run("publication-a")).toThrow(/frozen/i);

      expect(() => database.prepare("INSERT INTO project_publications(id, workspace_id, project_id, value) VALUES (?, ?, ?, ?)")
        .run("publication-b-2", "workspace-b", "project-b", "after")).not.toThrow();
      expect(() => database.prepare("UPDATE project_publications SET value = ? WHERE id = ?").run("after", "publication-b")).not.toThrow();
      expect(() => database.prepare("DELETE FROM project_publications WHERE id = ?").run("publication-b-2")).not.toThrow();

      for (const table of ["shared_link_recipients", "shared_link_comments", "shared_link_responses"]) {
        expect(() => database.prepare(`INSERT INTO ${table}(id, publication_id, value) VALUES (?, ?, ?)`)
          .run(`${table}-a-2`, "publication-a", "after")).toThrow(/frozen/i);
        expect(() => database.prepare(`UPDATE ${table} SET value = ? WHERE id = ?`).run("after", `${table}-a`)).toThrow(/frozen/i);
        expect(() => database.prepare(`DELETE FROM ${table} WHERE id = ?`).run(`${table}-a`)).toThrow(/frozen/i);

        expect(() => database.prepare(`INSERT INTO ${table}(id, publication_id, value) VALUES (?, ?, ?)`)
          .run(`${table}-b-2`, "publication-b", "after")).not.toThrow();
        expect(() => database.prepare(`UPDATE ${table} SET value = ? WHERE id = ?`).run("after", `${table}-b`)).not.toThrow();
        expect(() => database.prepare(`DELETE FROM ${table} WHERE id = ?`).run(`${table}-b-2`)).not.toThrow();
      }

      expect(() => database.prepare("UPDATE shared_link_comments SET publication_id = ? WHERE id = ?")
        .run("publication-a", "shared_link_comments-b")).toThrow(/frozen/i);
      expect(() => database.prepare("UPDATE shared_link_comments SET publication_id = ? WHERE id = ?")
        .run("publication-b", "shared_link_comments-a")).toThrow(/frozen/i);
    } finally {
      database.close();
    }
  });

  it("guards every owner legacy mutation with the rollout freeze", () => {
    const actions = readFileSync(resolve(process.cwd(), "src/lib/publication/actions.ts"), "utf8");
    const guarded = actions.match(/await assertLegacyPublicationAuthoringAvailable\(\);/g) ?? [];
    expect(guarded).toHaveLength(7);
    expect(actions).toContain("isClientPortalLegacyWriteFreezeEnabled");
  });

  it("finalizes only verified mappings and enables the workspace freeze", () => {
    const service = readFileSync(resolve(process.cwd(), "src/lib/client-portal/legacy-cutover-service.ts"), "utf8");
    expect(service).toContain("apply: true,");
    expect(service).toContain("expectedFingerprint !== preflight.inventory.fingerprint");
    expect(service).toContain("preflight.unresolved.length > 0");
    expect(service).toContain("mapping.migration_status !== \"verified\"");
    expect(service).toContain("migration_status = 'cutover_complete'");
    expect(service).toContain("client_portal_legacy_workspace_cutovers");
    expect(service).not.toContain("CLIENT_PORTAL_LEGACY_WRITE_FREEZE_FLAG_KEY");
    expect(service).toContain("client_portal_baseline_backfill_exceptions");
  });
});
