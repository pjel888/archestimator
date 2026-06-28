import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  supabase: null as ReturnType<typeof createSupabaseMock> | null,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/perf/server-timing", () => ({
  traced: vi.fn(async (_label: string, fn: () => Promise<unknown>) => fn()),
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => mocks.supabase),
}));

import { listRecipientProposals } from "@/lib/repositories/recipient-proposals-repository";

const migrationPath = "supabase/migrations/20260629000000_recipient_proposals_rpc.sql";

function createSupabaseMock({
  data = [],
  error = null,
}: {
  data?: unknown[] | null;
  error?: { code?: string; message?: string } | null;
} = {}) {
  return {
    rpc: vi.fn(async () => ({ data, error })),
  };
}

function rpcRow(overrides: Record<string, unknown> = {}) {
  return {
    decision: null,
    expires_at: "2026-07-01T00:00:00.000Z",
    has_opened: false,
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
});

describe("recipient proposals repository", () => {
  it("maps the safe inbox RPC shape without exposing credential fields", async () => {
    mocks.supabase = createSupabaseMock({
      data: [rpcRow({ decision: "accepted", has_opened: true })],
    });

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
    });
    expect(mocks.supabase?.rpc).toHaveBeenCalledWith("list_recipient_publications_for_current_user", {
      page_limit: 50,
    });
    expect(JSON.stringify(result)).not.toMatch(/token|hash|encrypted|password/i);
  });

  it("returns unauthorized for permission failures and unknown for malformed RPC rows", async () => {
    mocks.supabase = createSupabaseMock({ error: { code: "42501", message: "permission denied" } });
    await expect(listRecipientProposals()).resolves.toEqual({ ok: false, error: "unauthorized" });

    mocks.supabase = createSupabaseMock({ data: [rpcRow({ decision: "maybe", status: "published" })] });
    await expect(listRecipientProposals()).resolves.toEqual({ ok: false, error: "unknown" });
  });

  it("keeps the migration security-definer, authenticated-only, and credential-free", () => {
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
