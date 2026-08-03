import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1Result,
  D1Value,
} from "@/lib/cloudflare/d1";

const requireRuntime = createRequire(import.meta.url);
const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
vi.mock("@/lib/observability/logger", () => ({
  emitLogRecord: vi.fn(),
}));

const baseMigration = readFileSync("migrations/0052_corporate_accounts.sql", "utf8");
const integrityMigration = readFileSync(
  "migrations/0053_corporate_account_owner_integrity.sql",
  "utf8",
);

type SqliteStatement = {
  all(...parameters: D1Value[]): Record<string, unknown>[];
  get(...parameters: D1Value[]): Record<string, unknown> | undefined;
  run(...parameters: D1Value[]): { changes: number | bigint };
};

type SqliteDatabase = {
  close(): void;
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
};

class LocalD1Statement<T = Record<string, unknown>>
  implements D1PreparedStatementLike<T>
{
  private values: D1Value[] = [];

  constructor(private readonly statement: SqliteStatement) {}

  bind(...values: D1Value[]) {
    this.values = values;
    return this;
  }

  async first<R = T>(): Promise<R | null> {
    return (this.statement.get(...this.values) as R | undefined) ?? null;
  }

  async all<R = T>(): Promise<D1Result<R>> {
    return { results: this.statement.all(...this.values) as R[] };
  }

  async run(): Promise<D1Result<T>> {
    const result = this.statement.run(...this.values);
    return { meta: { changes: Number(result.changes) } };
  }
}

class LocalD1Database implements D1DatabaseLike {
  constructor(private readonly database: SqliteDatabase) {}

  prepare<T = Record<string, unknown>>(sql: string): D1PreparedStatementLike<T> {
    return new LocalD1Statement<T>(this.database.prepare(sql));
  }

  async batch<T = Record<string, unknown>>(
    statements: D1PreparedStatementLike<T>[],
  ): Promise<D1Result<T>[]> {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const results: D1Result<T>[] = [];
      for (const statement of statements) {
        results.push(await statement.run());
      }
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

function createLocalD1() {
  const { DatabaseSync } = requireRuntime("node:sqlite") as {
    DatabaseSync: new (path: string) => SqliteDatabase;
  };
  const database = new DatabaseSync(":memory:");
  database.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE admin_audit_events (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT NOT NULL,
      actor_email TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      summary_json TEXT NOT NULL,
      request_id TEXT,
      created_at TEXT NOT NULL
    );
  `);
  database.exec(baseMigration);
  database.exec(integrityMigration);

  return { database, d1: new LocalD1Database(database) };
}

function insertAccount(
  database: SqliteDatabase,
  id: string,
  createdBy: string,
  status = "active",
) {
  database
    .prepare(
      `INSERT INTO corporate_accounts (id, name, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, `Account ${id}`, status, createdBy, "2026-07-11T00:00:00.000Z", "2026-07-11T00:00:00.000Z");
}

function insertWorkspace(
  database: SqliteDatabase,
  id: string,
  corporateAccountId: string | null,
) {
  database
    .prepare(
      `INSERT INTO workspaces (id, name, slug, created_by, created_at, updated_at, corporate_account_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      `Workspace ${id}`,
      `workspace-${id}`,
      "creator-1",
      "2026-07-11T00:00:00.000Z",
      "2026-07-11T00:00:00.000Z",
      corporateAccountId,
    );
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("corporate account local D1 integration", () => {
  it("persists a member role lifecycle and user membership query", async () => {
    const { database, d1 } = createLocalD1();
    try {
      insertAccount(database, "account-members", "creator-1");
      d1Mocks.getCloudflareD1Database.mockResolvedValue(d1);

      const {
        addCorporateAccountMember,
        listUserCorporateAccounts,
        removeCorporateAccountMember,
        updateCorporateAccountStatus,
        updateCorporateAccountMemberRole,
      } = await import("@/lib/admin/corporate-account-repository");

      await expect(
        addCorporateAccountMember({
          accountId: "account-members",
          userId: "member-1",
          role: "member",
        }),
      ).resolves.toEqual({ data: { ok: true }, error: null });
      await expect(
        updateCorporateAccountMemberRole({
          accountId: "account-members",
          userId: "member-1",
          role: "team_leader",
        }),
      ).resolves.toEqual({ data: { ok: true }, error: null });

      expect(
        database
          .prepare(
            `SELECT role FROM corporate_account_members
             WHERE corporate_account_id = ? AND user_id = ?`,
          )
          .get("account-members", "member-1"),
      ).toEqual({ role: "team_leader" });
      await expect(listUserCorporateAccounts("member-1")).resolves.toEqual({
        data: [
          expect.objectContaining({
            id: "account-members",
            role: "team_leader",
          }),
        ],
        error: null,
      });

      await expect(updateCorporateAccountStatus("account-members", "suspended")).resolves.toEqual({
        data: { ok: true },
        error: null,
      });
      await expect(listUserCorporateAccounts("member-1")).resolves.toEqual({ data: [], error: null });
      await expect(updateCorporateAccountStatus("account-members", "active")).resolves.toEqual({
        data: { ok: true },
        error: null,
      });

      await expect(
        removeCorporateAccountMember("account-members", "member-1"),
      ).resolves.toEqual({ data: { ok: true }, error: null });
      expect(
        database
          .prepare(
            `SELECT role FROM corporate_account_members
             WHERE corporate_account_id = ? AND user_id = ?`,
          )
          .get("account-members", "member-1"),
      ).toBeUndefined();
      expect(
        database
          .prepare(
            `SELECT role FROM corporate_account_members
             WHERE corporate_account_id = ? AND user_id = ?`,
          )
          .get("account-members", "creator-1"),
      ).toEqual({ role: "owner" });
    } finally {
      database.close();
    }
  });

  it("keeps workspace moves and unlinks aligned with their audit trail", async () => {
    const { database, d1 } = createLocalD1();
    try {
      insertAccount(database, "account-a", "creator-a");
      insertAccount(database, "account-b", "creator-b");
      insertWorkspace(database, "workspace-1", "account-a");
      d1Mocks.getCloudflareD1Database.mockResolvedValue(d1);

      const {
        linkWorkspaceToCorporateAccountWithAudit,
        unlinkWorkspaceFromCorporateAccountWithAudit,
      } = await import("@/lib/admin/corporate-account-repository");

      await expect(
        linkWorkspaceToCorporateAccountWithAudit({
          workspaceId: "workspace-1",
          accountId: "account-b",
          actorUserId: "admin-1",
          actorEmail: "admin@example.test",
        }),
      ).resolves.toEqual({
        data: { ok: true, previousAccountId: "account-a" },
        error: null,
      });
      expect(
        database
          .prepare("SELECT corporate_account_id FROM workspaces WHERE id = ?")
          .get("workspace-1"),
      ).toEqual({ corporate_account_id: "account-b" });

      await expect(
        unlinkWorkspaceFromCorporateAccountWithAudit({
          workspaceId: "workspace-1",
          actorUserId: "admin-1",
          actorEmail: "admin@example.test",
        }),
      ).resolves.toEqual({
        data: { ok: true, previousAccountId: "account-b" },
        error: null,
      });
      expect(
        database
          .prepare("SELECT corporate_account_id FROM workspaces WHERE id = ?")
          .get("workspace-1"),
      ).toEqual({ corporate_account_id: null });
      expect(
        database
          .prepare(
            `SELECT action, target_id FROM admin_audit_events
             ORDER BY rowid ASC`,
          )
          .all(),
      ).toEqual([
        {
          action: "corporate_account.workspace_unlinked",
          target_id: "account-a",
        },
        {
          action: "corporate_account.workspace_linked",
          target_id: "account-b",
        },
        {
          action: "corporate_account.workspace_unlinked",
          target_id: "account-b",
        },
      ]);
    } finally {
      database.close();
    }
  });

  it("returns joined member and workspace counts from local D1", async () => {
    const { database, d1 } = createLocalD1();
    try {
      insertAccount(database, "account-counts", "creator-1");
      database
        .prepare(
          `INSERT INTO corporate_account_members (
             corporate_account_id, user_id, role, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?)`,
        )
        .run(
          "account-counts",
          "member-1",
          "member",
          "2026-07-11T00:00:00.000Z",
          "2026-07-11T00:00:00.000Z",
        );
      insertWorkspace(database, "workspace-a", "account-counts");
      insertWorkspace(database, "workspace-b", "account-counts");
      d1Mocks.getCloudflareD1Database.mockResolvedValue(d1);

      const { listCorporateAccountsWithCounts } =
        await import("@/lib/admin/corporate-account-repository");

      await expect(listCorporateAccountsWithCounts()).resolves.toEqual({
        data: [
          expect.objectContaining({
            id: "account-counts",
            member_count: 2,
            workspace_count: 2,
          }),
        ],
        error: null,
      });
    } finally {
      database.close();
    }
  });
});
