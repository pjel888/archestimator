import { beforeEach, describe, expect, it, vi } from "vitest";

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

vi.mock("@/lib/cloudflare/d1", () => d1Mocks);

type AllowlistRecord = {
  id: string;
  normalized_email: string;
  status: "invited" | "active" | "revoked";
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  notes: string | null;
  metadata_json: string;
  created_at: string;
  updated_at: string;
};

class FakeStatement {
  private values: unknown[] = [];

  constructor(
    private readonly database: FakeDatabase,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async all<T>() {
    return { results: this.database.select(this.sql, this.values) as T[] };
  }

  async first<T>() {
    return (this.database.select(this.sql, this.values)[0] ?? null) as T | null;
  }

  async run() {
    if (this.sql.trimStart().startsWith("UPDATE closed_beta_allowed_emails")) {
      this.database.updateCount += 1;
    }
    return { success: true, meta: { changes: 0 } };
  }
}

class FakeDatabase {
  updateCount = 0;

  constructor(private readonly rows: AllowlistRecord[]) {}

  prepare(sql: string) {
    return new FakeStatement(this, sql);
  }

  select(sql: string, values: unknown[]) {
    if (!sql.includes("FROM closed_beta_allowed_emails")) return [];
    const pendingOnly = sql.includes("SELECT id, normalized_email, metadata_json");
    let valueIndex = 0;
    let rows = [...this.rows];

    if (!pendingOnly && sql.includes("status = ?")) {
      const status = String(values[valueIndex++]);
      rows = rows.filter((row) => row.status === status);
    } else if (pendingOnly) {
      rows = rows.filter((row) => row.status === "invited" || row.status === "active");
    }

    if (sql.includes("created_at < ?")) {
      const cursorCreatedAt = String(values[valueIndex]);
      const cursorId = String(values[valueIndex + 2]);
      valueIndex += 3;
      rows = rows.filter((row) =>
        row.created_at < cursorCreatedAt ||
        (row.created_at === cursorCreatedAt && row.id < cursorId));
    } else if (sql.includes("created_at > ?")) {
      const cursorCreatedAt = String(values[valueIndex]);
      const cursorId = String(values[valueIndex + 2]);
      valueIndex += 3;
      rows = rows.filter((row) =>
        row.created_at > cursorCreatedAt ||
        (row.created_at === cursorCreatedAt && row.id > cursorId));
    }

    rows.sort((left, right) => {
      const direction = sql.includes("ORDER BY created_at DESC") ? -1 : 1;
      return direction * (left.created_at.localeCompare(right.created_at) || left.id.localeCompare(right.id));
    });

    const boundLimit = sql.includes("LIMIT ?") ? Number(values[valueIndex]) : null;
    const literalLimit = /LIMIT\s+(\d+)/u.exec(sql)?.[1];
    const limit = boundLimit ?? (literalLimit ? Number(literalLimit) : rows.length);
    return rows.slice(0, limit);
  }
}

function allowlistRecord(index: number, sent: boolean): AllowlistRecord {
  const sequence = String(index).padStart(4, "0");
  const timestamp = new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString();
  return {
    id: `allow-${sequence}`,
    normalized_email: `pilot-${sequence}@example.com`,
    status: "invited",
    invited_by: "admin-1",
    invited_at: timestamp,
    accepted_at: null,
    notes: null,
    metadata_json: sent ? JSON.stringify({ invite_email_sent_at: timestamp }) : "{}",
    created_at: timestamp,
    updated_at: timestamp,
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("closed beta D1 traversal", () => {
  it("reads every allowlist row with stable bounded keyset pages and never promotes from user existence", async () => {
    const database = new FakeDatabase(Array.from({ length: 250 }, (_, index) => allowlistRecord(index, false)));
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
    const { readClosedBetaAllowlistQueueFromD1 } = await import("@/lib/auth/closed-beta-d1-store");

    await expect(readClosedBetaAllowlistQueueFromD1("invited")).resolves.toHaveLength(250);
    expect(database.updateCount).toBe(0);
  });

  it("continues past more than 200 already-sent rows to find pending invitations", async () => {
    const rows = [
      ...Array.from({ length: 230 }, (_, index) => allowlistRecord(index, true)),
      ...Array.from({ length: 3 }, (_, index) => allowlistRecord(index + 230, false)),
    ];
    const database = new FakeDatabase(rows);
    const { listPendingClosedBetaInviteEmailsFromD1 } = await import("@/lib/auth/closed-beta-d1-store");

    await expect(listPendingClosedBetaInviteEmailsFromD1(database, 3)).resolves.toHaveLength(3);
  });
});
