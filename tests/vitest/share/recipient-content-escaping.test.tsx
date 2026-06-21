import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useSharedLinkSession: vi.fn(),
}));

vi.mock("@/hooks/use-shared-link-session", () => ({
  useSharedLinkSession: mocks.useSharedLinkSession,
}));

import SharePageComments from "@/components/share/SharePageComments";

describe("shared-link recipient content escaping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useSharedLinkSession.mockReturnValue({ isValid: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders stored comment HTML as text instead of executable DOM", async () => {
    const maliciousBody = '<img src=x onerror="alert(1)"> <script>alert(2)</script> Please review.';
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          comments: [
            {
              id: "comment-malicious",
              content: maliciousBody,
              authorName: "Client",
              authorType: "recipient",
              createdAt: "2026-06-03T01:00:00.000Z",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { container } = render(<SharePageComments token="share-token" viewToken="view-token" />);

    expect(await screen.findByText(maliciousBody)).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/share/share-token/comment",
      expect.objectContaining({ method: "GET" }),
    ));
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(container.innerHTML).toContain("&lt;img");
    expect(container.innerHTML).not.toContain("<img src=");
  });
});
