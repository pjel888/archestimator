import { beforeEach, describe, expect, it, vi } from "vitest";

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
vi.mock("@/lib/observability/logger", () => ({
  emitLogRecord: vi.fn(),
}));

class FakeStatement {
  values: unknown[] = [];

  constructor(
    readonly sql: string,
    private readonly changes: number,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async run() {
    return { meta: { changes: this.changes } };
  }
}

class FakeDatabase {
  statements: FakeStatement[] = [];

  constructor(private readonly changes: number) {}

  prepare(sql: string) {
    const statement = new FakeStatement(sql, this.changes);
    this.statements.push(statement);
    return statement;
  }
}

class FakeWorkspaceMoveStatement {
  values: unknown[] = [];

  constructor(
    readonly sql: string,
    private readonly database: FakeWorkspaceMoveDatabase,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async first() {
    if (this.sql.includes("SELECT corporate_account_id FROM workspaces")) {
      return this.database.workspaceExists
        ? { corporate_account_id: this.database.previousAccountId }
        : null;
    }
    return null;
  }

  async run() {
    return {
      meta: {
        changes: this.sql.startsWith("UPDATE workspaces")
          ? this.database.workspaceUpdateChanges
          : 1,
      },
    };
  }
}

class FakeWorkspaceMoveDatabase {
  statements: FakeWorkspaceMoveStatement[] = [];
  batches: FakeWorkspaceMoveStatement[][] = [];

  constructor(
    readonly previousAccountId: string | null,
    readonly workspaceUpdateChanges = 1,
    readonly workspaceExists = true,
  ) {}

  prepare(sql: string) {
    const statement = new FakeWorkspaceMoveStatement(sql, this);
    this.statements.push(statement);
    return statement;
  }

  async batch(statements: FakeWorkspaceMoveStatement[]) {
    this.batches.push(statements);
    return Promise.all(statements.map((statement) => statement.run()));
  }
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("corporate account repository ownership guards", () => {
  it("refuses an upsert that would demote the sole owner", async () => {
    const database = new FakeDatabase(0);
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { addCorporateAccountMember } =
      await import("@/lib/admin/corporate-account-repository");
    await expect(
      addCorporateAccountMember({
        accountId: "account-1",
        userId: "owner-1",
        role: "viewer",
      }),
    ).resolves.toEqual({
      data: { ok: false },
      error: "Cannot demote the last owner of the account.",
    });

    expect(database.statements).toHaveLength(1);
    expect(database.statements[0]?.sql).toContain("other_owner.role = 'owner'");
    expect(database.statements[0]?.values).toEqual([
      "account-1",
      "owner-1",
      "viewer",
      null,
      expect.any(String),
      expect.any(String),
    ]);
  });

  it("rejects blank creators before issuing an account insert", async () => {
    const database = new FakeDatabase(1);
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { createCorporateAccount } =
      await import("@/lib/admin/corporate-account-repository");
    await expect(
      createCorporateAccount({
        name: "Account",
        createdBy: "  ",
      }),
    ).resolves.toEqual({
      data: null,
      error: "Account creator is required.",
    });

    expect(database.statements).toHaveLength(0);
  });
});

describe("corporate account workspace move audit", () => {
  it("commits the conditional move and both audit records in one batch", async () => {
    const database = new FakeWorkspaceMoveDatabase("account-old");
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { linkWorkspaceToCorporateAccountWithAudit } =
      await import("@/lib/admin/corporate-account-repository");
    await expect(
      linkWorkspaceToCorporateAccountWithAudit({
        workspaceId: "workspace-1",
        accountId: "account-new",
        actorUserId: "admin-1",
        actorEmail: "admin@example.test",
      }),
    ).resolves.toEqual({
      data: { ok: true, previousAccountId: "account-old" },
      error: null,
    });

    expect(database.batches).toHaveLength(1);
    expect(database.batches[0]).toHaveLength(3);
    expect(database.batches[0]?.[0]?.sql).toContain(
      "corporate_account_id IS ?",
    );
    expect(database.batches[0]?.[1]?.sql).toContain(
      "corporate_account.workspace_unlinked",
    );
    expect(database.batches[0]?.[2]?.sql).toContain(
      "corporate_account.workspace_linked",
    );
  });

  it("does not report success when the conditional move loses a race", async () => {
    const database = new FakeWorkspaceMoveDatabase("account-old", 0);
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { linkWorkspaceToCorporateAccountWithAudit } =
      await import("@/lib/admin/corporate-account-repository");
    await expect(
      linkWorkspaceToCorporateAccountWithAudit({
        workspaceId: "workspace-1",
        accountId: "account-new",
        actorUserId: "admin-1",
        actorEmail: "admin@example.test",
      }),
    ).resolves.toEqual({
      data: { ok: false, previousAccountId: "account-old" },
      error: "Workspace link changed concurrently. Reload and retry.",
    });
  });

  it("fails closed when the D1 binding cannot execute a transactional batch", async () => {
    const database = new FakeWorkspaceMoveDatabase("account-old");
    Object.assign(database, { batch: undefined });
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { linkWorkspaceToCorporateAccountWithAudit } =
      await import("@/lib/admin/corporate-account-repository");
    await expect(
      linkWorkspaceToCorporateAccountWithAudit({
        workspaceId: "workspace-1",
        accountId: "account-new",
        actorUserId: "admin-1",
        actorEmail: "admin@example.test",
      }),
    ).resolves.toEqual({
      data: { ok: false, previousAccountId: "account-old" },
      error: "Transactional D1 batch support is required to link a workspace.",
    });

    expect(database.batches).toHaveLength(0);
  });

  it("commits the conditional unlink and its audit record in one batch", async () => {
    const database = new FakeWorkspaceMoveDatabase("account-old");
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { unlinkWorkspaceFromCorporateAccountWithAudit } =
      await import("@/lib/admin/corporate-account-repository");
    await expect(
      unlinkWorkspaceFromCorporateAccountWithAudit({
        workspaceId: "workspace-1",
        actorUserId: "admin-1",
        actorEmail: "admin@example.test",
      }),
    ).resolves.toEqual({
      data: { ok: true, previousAccountId: "account-old" },
      error: null,
    });

    expect(database.batches).toHaveLength(1);
    expect(database.batches[0]).toHaveLength(2);
    expect(database.batches[0]?.[0]?.sql).toContain(
      "corporate_account_id IS ?",
    );
    expect(database.batches[0]?.[1]?.sql).toContain(
      "corporate_account.workspace_unlinked",
    );
    expect(database.batches[0]?.[1]?.sql).toContain(
      "corporate_account_id IS NULL",
    );
  });

  it("does not report unlink success when its conditional update loses a race", async () => {
    const database = new FakeWorkspaceMoveDatabase("account-old", 0);
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const { unlinkWorkspaceFromCorporateAccountWithAudit } =
      await import("@/lib/admin/corporate-account-repository");
    await expect(
      unlinkWorkspaceFromCorporateAccountWithAudit({
        workspaceId: "workspace-1",
        actorUserId: "admin-1",
        actorEmail: "admin@example.test",
      }),
    ).resolves.toEqual({
      data: { ok: false, previousAccountId: "account-old" },
      error: "Workspace link changed concurrently. Reload and retry.",
    });
  });
});
