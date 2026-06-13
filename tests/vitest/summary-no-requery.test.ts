import { beforeEach, describe, expect, it, vi } from "vitest";

const PROJECT_ID = "22222222-2222-4222-8222-222222222222";

const requireCurrentUserContext = vi.hoisted(() => vi.fn());
const fromSpy = vi.hoisted(() => vi.fn());
const rpcSpy = vi.hoisted(() => vi.fn(async () => ({ data: [], error: null })));

vi.mock("@/lib/auth/session", () => ({
  requireCurrentUserContext,
  getCurrentUserContext: requireCurrentUserContext,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({ from: fromSpy, rpc: rpcSpy })),
}));

import { getProjectCollaborationSummary, getProjectPublicationSummary } from "@/lib/repositories/workspace-repository";

// Generic chainable Supabase stub: every builder method returns the chain; the
// chain is awaitable ({ data: [] }) and maybeSingle/single resolve a per-table row.
function chain(row: unknown) {
  const c: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in", "order", "is", "gte", "lte", "not", "or", "contains", "limit", "overlaps"]) {
    c[method] = () => c;
  }
  c.maybeSingle = async () => ({ data: row ?? null, error: null });
  c.single = async () => ({ data: row ?? null, error: null });
  c.then = (resolve: (value: { data: unknown[]; error: null }) => unknown) => resolve({ data: [], error: null });
  return c;
}

function countProjectsQueries() {
  return fromSpy.mock.calls.filter(([table]) => table === "projects").length;
}

describe("collaboration/publication summaries reuse resolved project (F7)", () => {
  beforeEach(() => {
    fromSpy.mockReset();
    rpcSpy.mockClear();
    requireCurrentUserContext.mockResolvedValue({
      userId: "11111111-1111-4111-8111-111111111111",
      email: "owner@example.com",
      profile: { id: "11111111-1111-4111-8111-111111111111", default_workspace_id: "ws-1", role: "admin" },
    });
    fromSpy.mockImplementation((table: string) => {
      if (table === "workspaces") return chain({ id: "ws-1", name: "WS", created_by: "u1" });
      if (table === "projects") return chain({ id: PROJECT_ID, workspace_id: "ws-1" });
      return chain(null);
    });
  });

  it("skips the projects re-query when a resolved project is passed (collaboration)", async () => {
    await getProjectCollaborationSummary(PROJECT_ID, { id: PROJECT_ID, workspace_id: "ws-1" }).catch(() => {});
    expect(countProjectsQueries()).toBe(0);
  });

  it("re-queries projects when no resolved project is passed (collaboration)", async () => {
    await getProjectCollaborationSummary(PROJECT_ID).catch(() => {});
    expect(countProjectsQueries()).toBe(1);
  });

  it("skips the projects re-query when a resolved project is passed (publication)", async () => {
    await getProjectPublicationSummary(PROJECT_ID, { id: PROJECT_ID, workspace_id: "ws-1" }).catch(() => {});
    expect(countProjectsQueries()).toBe(0);
  });

  it("re-queries projects when no resolved project is passed (publication)", async () => {
    await getProjectPublicationSummary(PROJECT_ID).catch(() => {});
    expect(countProjectsQueries()).toBe(1);
  });
});
