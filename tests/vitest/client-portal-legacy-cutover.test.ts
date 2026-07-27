import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const requireRuntime = createRequire(import.meta.url);

type LocalSqliteDatabase = {
  close(): void;
  exec(sql: string): void;
  prepare(sql: string): {
    get(...parameters: unknown[]): Record<string, unknown> | undefined;
    run(...parameters: unknown[]): unknown;
  };
};

describe("legacy Client Portal cutover", () => {
  it("installs a flag-controlled database freeze for every legacy authoring table", () => {
    const sql = readFileSync(resolve(process.cwd(), "migrations/0121_legacy_client_portal_write_freeze.sql"), "utf8");
    for (const table of ["project_publications", "shared_link_recipients", "shared_link_comments", "shared_link_responses"]) {
      expect(sql).toContain(`BEFORE INSERT ON ${table}`);
      expect(sql).toContain(`BEFORE UPDATE ON ${table}`);
      expect(sql).toContain(`BEFORE DELETE ON ${table}`);
    }
    expect(sql.match(/client_portal_legacy_write_freeze/g)?.length).toBe(12);
  });

  it("keeps read compatibility and migration tooling outside the frozen tables", () => {
    const migration = readFileSync(resolve(process.cwd(), "migrations/0121_legacy_client_portal_write_freeze.sql"), "utf8");
    expect(migration).not.toContain("shared_link_events_cutover_freeze");
    expect(migration).not.toContain("client_portal_legacy_mappings_cutover_freeze");
    expect(migration).not.toContain("client_portals_cutover_freeze");
  });

  it("allows reads but rejects insert, update, and delete after freeze activation", () => {
    const { DatabaseSync } = requireRuntime("node:sqlite") as { DatabaseSync: new (path: string) => LocalSqliteDatabase };
    const database = new DatabaseSync(":memory:");
    try {
      database.exec(`
        CREATE TABLE feature_flags (key TEXT PRIMARY KEY, enabled INTEGER NOT NULL);
        INSERT INTO feature_flags(key, enabled) VALUES ('client_portal_legacy_write_freeze', 0);
        CREATE TABLE project_publications (id TEXT PRIMARY KEY, value TEXT);
        CREATE TABLE shared_link_recipients (id TEXT PRIMARY KEY, value TEXT);
        CREATE TABLE shared_link_comments (id TEXT PRIMARY KEY, value TEXT);
        CREATE TABLE shared_link_responses (id TEXT PRIMARY KEY, value TEXT);
      `);
      const tables = ["project_publications", "shared_link_recipients", "shared_link_comments", "shared_link_responses"];
      for (const table of tables) database.prepare(`INSERT INTO ${table}(id, value) VALUES (?, ?)` ).run(`${table}_1`, "before");
      database.exec(readFileSync(resolve(process.cwd(), "migrations/0121_legacy_client_portal_write_freeze.sql"), "utf8"));
      database.prepare("UPDATE feature_flags SET enabled = 1 WHERE key = 'client_portal_legacy_write_freeze'").run();

      for (const table of tables) {
        expect(database.prepare(`SELECT value FROM ${table} WHERE id = ?`).get(`${table}_1`)).toEqual({ value: "before" });
        expect(() => database.prepare(`INSERT INTO ${table}(id, value) VALUES (?, ?)` ).run(`${table}_2`, "after")).toThrow(/frozen/i);
        expect(() => database.prepare(`UPDATE ${table} SET value = ? WHERE id = ?`).run("after", `${table}_1`)).toThrow(/frozen/i);
        expect(() => database.prepare(`DELETE FROM ${table} WHERE id = ?`).run(`${table}_1`)).toThrow(/frozen/i);
      }
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

  it("finalizes only verified mappings and enables the existing freeze flag", () => {
    const service = readFileSync(resolve(process.cwd(), "src/lib/client-portal/legacy-cutover-service.ts"), "utf8");
    expect(service).toContain("migrateLegacyPublicationToClientPortal({ apply: true");
    expect(service).toContain("mapping.migration_status !== \"verified\"");
    expect(service).toContain("migration_status = 'cutover_complete'");
    expect(service).toContain("CLIENT_PORTAL_LEGACY_WRITE_FREEZE_FLAG_KEY");
    expect(service).toContain("client_portal_baseline_backfill_exceptions");
  });
});
