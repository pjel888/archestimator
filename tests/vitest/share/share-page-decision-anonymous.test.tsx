import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

const mocks = vi.hoisted(() => ({ useSharedLinkSession: vi.fn() }));

vi.mock("@/hooks/use-shared-link-session", () => ({
  useSharedLinkSession: mocks.useSharedLinkSession,
}));

import SharePageDecision from "@/components/share/SharePageDecision";

function renderWithQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

// AC-UX-07: an anonymous (no recipient session) visitor must see a clear read-only
// explanation of how to respond — never a silently empty decision area (the old
// behavior returned `null`). Locks the new anonymous state.
describe("SharePageDecision — anonymous (isValid:false) state", () => {
  it("renders a friendly read-only explanation, not the response actions", () => {
    mocks.useSharedLinkSession.mockReturnValue({ isValid: false });
    renderWithQueryClient(<SharePageDecision token="tok-anon" viewToken="view-token" />);

    // The decision bar still exists (not a silent null) and is informational.
    const bar = screen.getByTestId("decision-anonymous-state");
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveAttribute("role", "note");
    expect(screen.getByText(/read-only mode/i)).toBeInTheDocument();
    expect(screen.getByText(/personalized review link sent to your email/i)).toBeInTheDocument();

    // No actionable decision controls for an anonymous visitor.
    expect(screen.queryByRole("button", { name: /approve proposal/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /decline proposal/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /request changes/i })).toBeNull();
  });

  it("shows the response actions when a recipient session IS valid", () => {
    mocks.useSharedLinkSession.mockReturnValue({ isValid: true });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ decision: null }) }));
    renderWithQueryClient(<SharePageDecision token="tok-recipient" viewToken="view-token" />);

    expect(screen.queryByTestId("decision-anonymous-state")).toBeNull();
    expect(screen.getByRole("button", { name: /approve proposal/i })).toBeInTheDocument();
  });
});
