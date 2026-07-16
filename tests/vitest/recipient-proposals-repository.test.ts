import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: { userId: "user-1", email: "Recipient@Example.com" } as { userId: string; email: string } | null,
  d1: null as FakeD1Database | null,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/perf/server-timing", () => ({
  traced: vi.fn(async (_label: string, fn: () => Promise<unknown>) => fn()),
}));
vi.mock("@/lib/auth/session", () => ({
  getCurrentUserContext: vi.fn(async () => mocks.currentUser),
}));
vi.mock("@/lib/cloudflare/d1", () => ({
  getCloudflareD1Database: vi.fn(async () => mocks.d1),
}));

type PreparedD1Statement = {
  sql: string;
  values: unknown[];
};

class FakeD1Statement {
  private values: unknown[] = [];

  constructor(
    private readonly database: FakeD1Database,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    this.database.prepared.push({ sql: this.sql, values });
    return this;
  }

  async all() {
    return { results: this.database.rows };
  }
}

class FakeD1Database {
  prepared: PreparedD1Statement[] = [];
  rows: unknown[] = [];

  prepare(sql: string) {
    return new FakeD1Statement(this, sql);
  }
}

import { listRecipientProposals } from "@/lib/repositories/recipient-proposals-repository";

const migrationPath = "supabase/migrations/20260629000000_recipient_proposals_rpc.sql";

function d1Row(overrides: Record<string, unknown> = {}) {
  return {
    decision: null,
    expires_at: "2026-07-01T00:00:00.000Z",
    has_opened: 0,
    last_activity_at: "2026-06-29T01:00:00.000Z",
    project_code: "AE-100",
    project_id: "22222222-2222-4222-8222-222222222222",
    project_name: "Kitchen Remodel",
    publication_id: "11111111-1111-4111-8111-111111111111",
    published_at: "2026-06-29T00:00:00.000Z",
    revoked_at: null,
    sender_display_name: "Philip Lewis",
    snapshot_version: 3,
    status: "published",
    workspace_id: "33333333-3333-4333-8333-333333333333",
    workspace_name: "Lewis Studio",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.currentUser = { userId: "user-1", email: "Recipient@Example.com" };
  mocks.d1 = new FakeD1Database();
});

describe("recipient proposals repository", () => {
  it("maps the safe D1 inbox shape without exposing credential fields", async () => {
    if (!mocks.d1) throw new Error("D1 mock missing");
    mocks.d1.rows = [d1Row({ decision: "accepted", has_opened: 1 })];

    const result = await listRecipientProposals();

    expect(result).toEqual({
      ok: true,
      rows: [
        {
          decision: "accepted",
          expiresAt: "2026-07-01T00:00:00.000Z",
          hasOpened: true,
          lastActivityAt: "2026-06-29T01:00:00.000Z",
          projectCode: "AE-100",
          projectId: "22222222-2222-4222-8222-222222222222",
          projectName: "Kitchen Remodel",
          publicationId: "11111111-1111-4111-8111-111111111111",
          publishedAt: "2026-06-29T00:00:00.000Z",
          revokedAt: null,
          senderDisplayName: "Philip Lewis",
          snapshotVersion: 3,
          status: "published",
          workspaceId: "33333333-3333-4333-8333-333333333333",
          workspaceName: "Lewis Studio",
        },
      ],
      hasMore: false,
    });
    const query = mocks.d1.prepared[0];
    expect(query.sql).toContain("FROM shared_link_recipients recipient");
    expect(query.sql).toContain("lower(recipient.email) = ?");
    expect(query.sql).toContain("publication.status IN ('published', 'expired', 'revoked')");
    expect(query.sql).not.toMatch(/\b(token_hash|recipient_token_hash|encrypted_token|password_hash)\b/i);
    expect(query.values).toEqual([expect.any(String), expect.any(String), "recipient@example.com", 51]);
    expect(JSON.stringify(result)).not.toMatch(/token|hash|encrypted|password/i);
  });

  it("returns unauthorized when no signed-in recipient email is available and unknown for malformed rows", async () => {
    mocks.currentUser = null;
    await expect(listRecipientProposals()).resolves.toEqual({ ok: false, error: "unauthorized" });

    mocks.currentUser = { userId: "user-1", email: "recipient@example.com" };
    mocks.d1 = new FakeD1Database();
    mocks.d1.rows = [d1Row({ decision: "maybe", status: "published" })];
    await expect(listRecipientProposals()).resolves.toEqual({ ok: false, error: "unknown" });
  });

  it("keeps the historical RPC migration security-definer, authenticated-only, and credential-free", () => {
    const sql = readFileSync(migrationPath, "utf8");
    const listFunction = sql.slice(
      sql.indexOf("create or replace function public.list_recipient_publications_for_current_user"),
      sql.indexOf("create or replace function public.authorize_recipient_publication_for_current_user"),
    );
    const authorizeFunction = sql.slice(
      sql.indexOf("create or replace function public.authorize_recipient_publication_for_current_user"),
    );

    expect(sql).toContain("shared_link_recipients_lower_email_idx");
    expect(listFunction).toContain("returns table");
    expect(listFunction).toContain("security definer");
    expect(listFunction).toContain("set search_path = public");
    expect(listFunction).toContain("auth.uid() as user_id");
    expect(listFunction).toContain("lower(recipient.email) = identity.email");
    expect(listFunction).toContain("publication.status in ('published', 'expired', 'revoked')");
    expect(listFunction).not.toMatch(/\b(token_hash|recipient_token_hash|encrypted_token|password_hash)\b/i);
    expect(authorizeFunction).toContain("returns table");
    expect(authorizeFunction).toContain("publication_id uuid");
    expect(authorizeFunction).toContain("recipient_id uuid");
    expect(sql).toContain("grant execute on function public.list_recipient_publications_for_current_user(integer) to authenticated");
    expect(sql).toContain("grant execute on function public.authorize_recipient_publication_for_current_user(uuid) to authenticated");
  });
});
