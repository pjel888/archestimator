import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ useSharedLinkSession: vi.fn() }));

vi.mock("@/hooks/use-shared-link-session", () => ({
  useSharedLinkSession: mocks.useSharedLinkSession,
}));

import SharePageDecision from "@/components/share/SharePageDecision";

afterEach(() => {
  vi.clearAllMocks();
});

// AC-UX-07: an anonymous (no recipient session) visitor must see a clear read-only
// explanation of how to respond — never a silently empty decision area (the old
// behavior returned `null`). Locks the new anonymous state.
describe("SharePageDecision — anonymous (isValid:false) state", () => {
  it("renders a friendly read-only explanation, not the response actions", () => {
    mocks.useSharedLinkSession.mockReturnValue({ isValid: false });
    render(<SharePageDecision token="tok-anon" viewToken="view-token" />);

    // The decision bar still exists (not a silent null) and is informational.
    const bar = screen.getByTestId("decision-anonymous-state");
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveAttribute("role", "note");
    expect(screen.getByText(/read-only mode/i)).toBeInTheDocument();
    expect(screen.getByText(/personalized review link sent to your email/i)).toBeInTheDocument();

    // No actionable decision controls for an anonymous visitor.
    expect(screen.queryByRole("button", { name: /accept proposal/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /decline proposal/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /request revision/i })).toBeNull();
  });

  it("shows the response actions when a recipient session IS valid", () => {
    mocks.useSharedLinkSession.mockReturnValue({ isValid: true });
    render(<SharePageDecision token="tok-recipient" viewToken="view-token" />);

    expect(screen.queryByTestId("decision-anonymous-state")).toBeNull();
    expect(screen.getByRole("button", { name: /accept proposal/i })).toBeInTheDocument();
  });
});
