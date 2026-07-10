import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callOrder: [] as string[],
  listRecipientProposals: vi.fn(),
  requireCurrentUserContext: vi.fn(),
}));

vi.mock("@/components/workshop/proposals-page-client", () => ({
  ProposalsPageClient: () => null,
}));
vi.mock("@/lib/auth/session", () => ({
  requireCurrentUserContext: mocks.requireCurrentUserContext,
}));
vi.mock("@/lib/perf/server-timing", () => ({
  traced: vi.fn(async (_label: string, fn: () => Promise<unknown>) => fn()),
  withPerfTraceRequest: vi.fn(async (_scope: string, fn: () => Promise<unknown>) => fn()),
}));
vi.mock("@/lib/repositories/recipient-proposals-repository", () => ({
  listRecipientProposals: mocks.listRecipientProposals,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.callOrder = [];
  mocks.requireCurrentUserContext.mockImplementation(async () => {
    mocks.callOrder.push("auth");
    return { email: "recipient@example.com", userId: "11111111-1111-4111-8111-111111111111" };
  });
  mocks.listRecipientProposals.mockImplementation(async () => {
    mocks.callOrder.push("list");
    return { ok: true, rows: [] };
  });
});

describe("recipient proposals route gate", () => {
  it("requires the current user before loading recipient proposals", async () => {
    const { ProposalsData } = await import("@/app/workshop/proposals/proposals-data");

    await ProposalsData();

    expect(mocks.callOrder).toEqual(["auth", "list"]);
  });

  it("propagates the login redirect and does not list proposals when unauthenticated", async () => {
    mocks.requireCurrentUserContext.mockImplementation(async () => {
      mocks.callOrder.push("auth");
      throw new Error("NEXT_REDIRECT:/login");
    });
    const { ProposalsData } = await import("@/app/workshop/proposals/proposals-data");

    await expect(ProposalsData()).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(mocks.callOrder).toEqual(["auth"]);
    expect(mocks.listRecipientProposals).not.toHaveBeenCalled();
  });

  it("keeps the page source on the server auth/repository path only", () => {
    const pageSource = readFileSync("src/app/workshop/proposals/page.tsx", "utf8");
    const dataSource = readFileSync("src/app/workshop/proposals/proposals-data.tsx", "utf8");

    expect(pageSource).toContain("ProposalsData");
    expect(pageSource).toContain("WorkshopRouteHeader");
    expect(pageSource).toContain('title="Proposals"');
    expect(dataSource).toContain("requireCurrentUserContext()");
    expect(dataSource).toContain("listRecipientProposals()");
    expect(`${pageSource}\n${dataSource}`).not.toMatch(/service_role|SUPABASE_SERVICE_ROLE_KEY|encrypted_token|token_hash/i);
  });
});
