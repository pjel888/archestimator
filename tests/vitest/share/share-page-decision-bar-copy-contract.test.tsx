import React from "react";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useSharedLinkSession: vi.fn(),
}));

vi.mock("@/hooks/use-shared-link-session", () => ({
  useSharedLinkSession: mocks.useSharedLinkSession,
}));

import SharePageDecision from "@/components/share/SharePageDecision";

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("share page decision bar copy contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useSharedLinkSession.mockReturnValue({ isValid: true });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ decision: null }) }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders a full-width decision bar with the three client response actions", () => {
    renderWithQueryClient(<SharePageDecision token="client-token" viewToken="view-token" />);

    const decisionBar = screen.getByRole("group", { name: /your response|decision/i });
    expect(decisionBar).toHaveAttribute("data-share-decision-bar", "true");
    expect(within(decisionBar).getByRole("button", { name: /approve proposal/i })).toBeInTheDocument();
    expect(within(decisionBar).getByRole("button", { name: /decline proposal/i })).toBeInTheDocument();
    expect(within(decisionBar).getByRole("button", { name: /request changes/i })).toBeInTheDocument();
  });

  it("uses client-friendly finality copy that still allows comments after a decision", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<SharePageDecision token="client-token" viewToken="view-token" />);

    await user.click(screen.getByRole("button", { name: /approve proposal/i }));

    const dialog = await screen.findByRole("dialog", { name: /approve this proposal\?/i });
    expect(dialog).toHaveTextContent("We'll notify the project team and keep comments open for follow-up.");
    expect(dialog).not.toHaveTextContent(/This action is final and cannot be changed/i);
    expect(dialog).not.toHaveTextContent(/Your decision will be final/i);
  });
});
