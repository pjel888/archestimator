import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it, vi } from "vitest";

import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
import {
  D1_MUTATION_HARD_STATEMENT_LIMIT,
  MUTATION_RECEIPT_RESULT_MAX_BYTES,
  MutationIntentConflictError,
  assertD1MutationStatementLimit,
  buildCommittedMutationReceiptStatement,
  createMutationRequestFingerprint,
  readCommittedMutationReceipt,
} from "@/lib/estimates/mutation-receipts";

const requireRuntime = createRequire(import.meta.url);
const publicationRevisionMigration = readFileSync("migrations/0080_project_publication_source_revision.sql", "utf8");
const receiptMigration = readFileSync("migrations/0081_estimate_mutation_receipts.sql", "utf8");

type LocalSqliteDatabase = {
  exec(sql: string): void;
  prepare(sql: string): {
    all(...parameters: unknown[]): Record<string, unknown>[];
    get(...parameters: unknown[]): Record<string, unknown> | undefined;
    run(...parameters: unknown[]): unknown;
  };
  close(): void;
};

const identity = {
  workspaceId: "11111111-1111-4111-8111-111111111111",
  commandKind: "component.create",
  intentId: "22222222-2222-4222-8222-222222222222",
  actorUserId: "33333333-3333-4333-8333-333333333333",
  requestFingerprint: "a".repeat(64),
};

function createReceiptDatabase(receipt: Record<string, unknown> | null) {
  const first = vi.fn(async () => receipt);
  const bind = vi.fn(() => ({ first }));
  const prepare = vi.fn(() => ({ bind }));
  return { database: { prepare } as unknown as D1DatabaseLike, prepare, bind, first };
}

function createDatabase() {
  const { DatabaseSync } = requireRuntime("node:sqlite") as {
    DatabaseSync: new (path: string) => LocalSqliteDatabase;
  };
  const database = new DatabaseSync(":memory:");
  database.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE workspaces (id TEXT PRIMARY KEY);
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE
    );
  `);
  database.exec(publicationRevisionMigration);
  database.exec(receiptMigration);
  return database;
}

describe("estimate mutation receipts", () => {
  it("creates stable canonical request fingerprints", () => {
    const left = createMutationRequestFingerprint({
      z: 3,
      nested: { b: 2, a: 1, omitted: undefined },
      items: [{ y: 2, x: 1 }],
    });
    const right = createMutationRequestFingerprint({
      items: [{ x: 1, y: 2 }],
      nested: { a: 1, b: 2 },
      z: 3,
    });

    expect(left).toBe(right);
    expect(left).toMatch(/^[a-f0-9]{64}$/);
  });

  it("enforces the inclusive D1 hard statement ceiling", () => {
    expect(() => assertD1MutationStatementLimit(D1_MUTATION_HARD_STATEMENT_LIMIT)).not.toThrow();
    expect(() => assertD1MutationStatementLimit(D1_MUTATION_HARD_STATEMENT_LIMIT + 1)).toThrow(
      "Something went wrong. Try again in a moment.",
    );
    expect(() => assertD1MutationStatementLimit(-1)).toThrow("Something went wrong. Try again in a moment.");
  });

  it("returns matching committed results and rejects fingerprint or actor reuse", async () => {
    const committedResult = { itemId: "44444444-4444-4444-8444-444444444444", versionNumber: 1 };
    const receipt = {
      actor_user_id: identity.actorUserId,
      request_fingerprint: identity.requestFingerprint,
      result_json: JSON.stringify(committedResult),
      status: "committed",
    };
    const matching = createReceiptDatabase(receipt);

    await expect(readCommittedMutationReceipt(
      matching.database,
      identity,
      (value) => value as typeof committedResult,
    )).resolves.toEqual(committedResult);
    expect(matching.bind).toHaveBeenCalledWith(identity.workspaceId, identity.commandKind, identity.intentId);

    const mismatched = createReceiptDatabase(receipt);
    await expect(readCommittedMutationReceipt(
      mismatched.database,
      { ...identity, requestFingerprint: "b".repeat(64) },
      (value) => value,
    )).rejects.toBeInstanceOf(MutationIntentConflictError);
  });

  it("builds one bounded same-batch committed receipt statement", () => {
    const statement = buildCommittedMutationReceiptStatement({
      ...identity,
      resourceType: "cost_library_component",
      resourceId: "44444444-4444-4444-8444-444444444444",
      result: { itemId: "44444444-4444-4444-8444-444444444444", versionNumber: 1 },
      timestamp: "2026-07-15T00:00:00.000Z",
    });

    expect(statement.sql).toContain("INSERT INTO estimate_mutation_receipts");
    expect(statement.values).toContain(identity.intentId);
    expect(statement.values).toContain(identity.requestFingerprint);
    expect(() => buildCommittedMutationReceiptStatement({
      ...identity,
      resourceType: "cost_library_component",
      result: { payload: "x".repeat(MUTATION_RECEIPT_RESULT_MAX_BYTES) },
      timestamp: "2026-07-15T00:00:00.000Z",
    })).toThrow("The mutation receipt result is too large.");
  });

  it("migrates publication revision and receipt uniqueness, bounds, lookup, and cascade semantics", () => {
    const database = createDatabase();
    try {
      const projectColumns = database.prepare("PRAGMA table_info('projects')").all();
      expect(projectColumns).toContainEqual(expect.objectContaining({
        name: "publication_source_revision",
        notnull: 1,
        dflt_value: "0",
      }));

      const indexes = database.prepare("PRAGMA index_list('estimate_mutation_receipts')").all();
      const uniqueIndex = indexes.find((index) => index.unique === 1 && index.origin === "u");
      expect(uniqueIndex?.name).toEqual(expect.any(String));
      const uniqueColumns = database.prepare(`PRAGMA index_info('${String(uniqueIndex?.name)}')`).all();
      expect(uniqueColumns.map((column) => column.name)).toEqual(["workspace_id", "command_kind", "intent_id"]);

      database.prepare("INSERT INTO workspaces (id) VALUES (?)").run(identity.workspaceId);
      database.prepare("INSERT INTO projects (id, workspace_id) VALUES (?, ?)").run("project-1", identity.workspaceId);
      expect(() => database.prepare("UPDATE projects SET publication_source_revision = -1 WHERE id = ?").run("project-1")).toThrow();

      const insert = database.prepare(`
        INSERT INTO estimate_mutation_receipts (
          id, workspace_id, command_kind, intent_id, actor_user_id,
          resource_type, resource_id, request_fingerprint, result_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const values = [
        "receipt-1",
        identity.workspaceId,
        identity.commandKind,
        identity.intentId,
        identity.actorUserId,
        "cost_library_component",
        "component-1",
        identity.requestFingerprint,
        JSON.stringify({ itemId: "component-1" }),
        "2026-07-15T00:00:00.000Z",
        "2026-07-15T00:00:00.000Z",
      ];
      insert.run(...values);
      expect(() => insert.run("receipt-2", ...values.slice(1))).toThrow();
      expect(() => insert.run(
        "receipt-3",
        identity.workspaceId,
        "component.update",
        identity.intentId,
        ...values.slice(4),
      )).not.toThrow();
      expect(() => insert.run(
        "receipt-invalid-json",
        identity.workspaceId,
        "component.invalid",
        "invalid-json-intent",
        identity.actorUserId,
        "cost_library_component",
        null,
        identity.requestFingerprint,
        "[]",
        "2026-07-15T00:00:00.000Z",
        "2026-07-15T00:00:00.000Z",
      )).toThrow();
      expect(() => insert.run(
        "receipt-oversize",
        identity.workspaceId,
        "component.oversize",
        "oversize-intent",
        identity.actorUserId,
        "cost_library_component",
        null,
        identity.requestFingerprint,
        JSON.stringify({ payload: "x".repeat(MUTATION_RECEIPT_RESULT_MAX_BYTES) }),
        "2026-07-15T00:00:00.000Z",
        "2026-07-15T00:00:00.000Z",
      )).toThrow();

      const plan = database.prepare(`
        EXPLAIN QUERY PLAN
        SELECT result_json
        FROM estimate_mutation_receipts
        WHERE workspace_id = ? AND command_kind = ? AND intent_id = ?
      `).all(identity.workspaceId, identity.commandKind, identity.intentId);
      expect(plan.some((row) => String(row.detail).includes("USING INDEX"))).toBe(true);

      database.prepare("DELETE FROM workspaces WHERE id = ?").run(identity.workspaceId);
      expect(database.prepare("SELECT COUNT(*) AS count FROM estimate_mutation_receipts").get()?.count).toBe(0);
    } finally {
      database.close();
    }
  });
});
