import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProposalStatusBadge } from "@/components/share/ProposalStatusBadge";

const mocks = vi.hoisted(() => ({
  useSharedLinkSession: vi.fn(),
}));

vi.mock("@/hooks/use-shared-link-session", () => ({
  useSharedLinkSession: mocks.useSharedLinkSession,
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ProposalStatusBadge", () => {
  it("keeps anonymous public views pending", () => {
    mocks.useSharedLinkSession.mockReturnValue({ isValid: false });

    render(<ProposalStatusBadge token="share-token" />);

    expect(screen.getByRole("status")).toHaveTextContent("Pending review");
  });

  it("reflects a recipient's recorded decision", async () => {
    mocks.useSharedLinkSession.mockReturnValue({ isValid: true });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ decision: { type: "accepted" } }), { status: 200 })));

    render(<ProposalStatusBadge token="share-token" />);

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Approved"));
  });
});
