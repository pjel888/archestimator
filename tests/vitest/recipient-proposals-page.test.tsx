import { readFileSync } from "node:fs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProposalsPageClient } from "@/components/workshop/proposals-page-client";
import type { RecipientProposalRow, RecipientProposalsResult } from "@/lib/repositories/recipient-proposals-repository";

const actionMocks = vi.hoisted(() => ({
  loadRecipientProposals: vi.fn(),
  openRecipientProposalAction: vi.fn(),
}));

vi.mock("@/lib/recipient-proposals/actions", () => ({
  loadRecipientProposals: actionMocks.loadRecipientProposals,
}));
vi.mock("@/lib/publication/actions", () => ({
  openRecipientProposalAction: actionMocks.openRecipientProposalAction,
}));

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
}

function renderWithClient(ui: ReactElement, queryClient = makeQueryClient()) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return { queryClient, ...render(ui, { wrapper: Wrapper }) };
}

function proposal(overrides: Partial<RecipientProposalRow> = {}): RecipientProposalRow {
  return {
    decision: null,
    expiresAt: "2026-07-01T00:00:00.000Z",
    hasOpened: false,
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
    ...overrides,
  };
}

beforeEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  actionMocks.loadRecipientProposals.mockResolvedValue({ ok: true, rows: [], hasMore: false } satisfies RecipientProposalsResult);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ProposalsPageClient", () => {
  it("renders the server-seeded inbox rows without a mount refetch", async () => {
    renderWithClient(
      <ProposalsPageClient
        userEmail="recipient@example.com"
        initialResult={{
          ok: true,
          rows: [
            proposal({ publicationId: "11111111-1111-4111-8111-111111111111", projectName: "New Project" }),
            proposal({ publicationId: "22222222-2222-4222-8222-222222222222", hasOpened: true, projectName: "Opened Project" }),
            proposal({ publicationId: "33333333-3333-4333-8333-333333333333", decision: "accepted", projectName: "Accepted Project" }),
            proposal({ publicationId: "44444444-4444-4444-8444-444444444444", projectName: "Expired Project", status: "expired" }),
            proposal({ publicationId: "55555555-5555-4555-8555-555555555555", projectName: "Revoked Project", status: "revoked", revokedAt: "2026-06-30T00:00:00.000Z" }),
          ],
          hasMore: false,
        }}
      />,
    );

    expect(screen.getByText("recipient@example.com")).toBeInTheDocument();
    expect(screen.getByText("New Project")).toBeInTheDocument();
    expect(screen.getByText("Opened Project")).toBeInTheDocument();
    expect(screen.getByText("Accepted Project")).toBeInTheDocument();
    expect(screen.getByText("Expired Project")).toBeInTheDocument();
    expect(screen.getByText("Revoked Project")).toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getByText("Opened")).toBeInTheDocument();
    expect(screen.getByText("Decision submitted")).toBeInTheDocument();
    expect(screen.getByText("Accepted")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expired" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Revoked" })).toHaveAttribute("aria-disabled", "true");

    await act(async () => {
      await Promise.resolve();
    });
    expect(actionMocks.loadRecipientProposals).not.toHaveBeenCalled();
  });

  it("keeps stale rows visible and focuses retry after a failed explicit refresh", async () => {
    actionMocks.loadRecipientProposals.mockResolvedValue({ ok: false, error: "unknown" } satisfies RecipientProposalsResult);

    renderWithClient(
      <ProposalsPageClient
        userEmail="recipient@example.com"
        initialResult={{
          ok: true,
          rows: [proposal({ projectName: "Visible While Stale" })],
          hasMore: false,
        }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => expect(actionMocks.loadRecipientProposals).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Visible While Stale")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Proposals could not be refreshed.");
    await waitFor(() => expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument());
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Refresh" }));
  });

  it("renders the full error state when no safe result has been loaded", async () => {
    actionMocks.loadRecipientProposals.mockResolvedValue({ ok: false, error: "unknown" } satisfies RecipientProposalsResult);

    renderWithClient(
      <ProposalsPageClient
        userEmail="recipient@example.com"
        initialResult={{ ok: false, error: "unknown" }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Unable to load proposals" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(actionMocks.loadRecipientProposals).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument());
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Retry" }));
  });

  it("enables TanStack refetchOnWindowFocus instead of a hand-rolled focus effect", () => {
    const source = readFileSync("src/components/workshop/proposals-page-client.tsx", "utf8");
    expect(source).toContain("refetchOnWindowFocus: true");
    expect(source).not.toContain("scheduleFocusRefresh");
  });

  it("renders an empty state for a safe empty inbox", () => {
    renderWithClient(
      <ProposalsPageClient
        userEmail="recipient@example.com"
        initialResult={{ ok: true, rows: [], hasMore: false }}
      />,
    );

    expect(screen.getByRole("heading", { name: "No proposals yet" })).toBeInTheDocument();
    const main = screen.getByText("This inbox shows proposals sent to your email address.").parentElement;
    expect(main).not.toBeNull();
    expect(within(main as HTMLElement).getByText("No proposals yet")).toBeInTheDocument();
  });

  it("does not loop refresh when a row action errors (regression: stable onActionError)", async () => {
    actionMocks.openRecipientProposalAction.mockImplementation(async () => ({ ok: false, error: "unavailable" }));
    renderWithClient(
      <ProposalsPageClient
        userEmail="recipient@example.com"
        initialResult={{ ok: true, rows: [proposal({ projectName: "Loop Guard" })], hasMore: false }}
      />,
    );

    expect(actionMocks.loadRecipientProposals).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Review" }));

    // A row action error should trigger exactly one inbox refresh — never a self-sustaining loop.
    await waitFor(() => expect(actionMocks.loadRecipientProposals).toHaveBeenCalled());
    const callsAfterError = actionMocks.loadRecipientProposals.mock.calls.length;

    // Let any would-be loop iterations run.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(actionMocks.loadRecipientProposals.mock.calls.length).toBe(callsAfterError);
  });
});
