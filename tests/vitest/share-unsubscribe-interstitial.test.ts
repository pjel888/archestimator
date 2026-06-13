import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  unsubscribeSharedLinkRecipientByToken: vi.fn(),
}));

vi.mock("@/lib/publication/public-repository", () => ({
  unsubscribeSharedLinkRecipientByToken: mocks.unsubscribeSharedLinkRecipientByToken,
}));

import { GET, POST } from "@/app/api/share/[token]/unsubscribe/route";

const params = (token = "pub-token") => ({ params: Promise.resolve({ token }) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.unsubscribeSharedLinkRecipientByToken.mockResolvedValue({ recipientEmail: "client@example.com" });
});

afterEach(() => vi.restoreAllMocks());

// SEC-14: a GET (email-client prefetch / scanner) must NOT mutate; the unsubscribe happens
// only on an explicit same-origin POST from the confirmation interstitial.
describe("share unsubscribe — read-only GET interstitial + POST mutation (SEC-14)", () => {
  it("GET renders a confirmation interstitial and does NOT unsubscribe", async () => {
    const res = await GET(new Request("https://app.test/api/share/pub-token/unsubscribe?recipient=rt-123"), params());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const body = await res.text();
    expect(body).toContain("Confirm unsubscribe");
    expect(body).toContain('method="post"');
    // The recipient token is carried in a hidden field for the POST.
    expect(body).toContain('value="rt-123"');
    // Crucially: no mutation on GET.
    expect(mocks.unsubscribeSharedLinkRecipientByToken).not.toHaveBeenCalled();
  });

  it("GET without a recipient token is rejected and never mutates", async () => {
    const res = await GET(new Request("https://app.test/api/share/pub-token/unsubscribe"), params());
    expect(res.status).toBe(400);
    expect(mocks.unsubscribeSharedLinkRecipientByToken).not.toHaveBeenCalled();
  });

  it("POST (same-origin) performs the unsubscribe", async () => {
    const form = new URLSearchParams({ recipient: "rt-123" });
    const res = await POST(
      new Request("https://app.test/api/share/pub-token/unsubscribe", {
        method: "POST",
        headers: { origin: "https://app.test", "content-type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      }),
      params(),
    );
    expect(res.status).toBe(200);
    expect(mocks.unsubscribeSharedLinkRecipientByToken).toHaveBeenCalledWith("pub-token", "rt-123");
    expect(await res.text()).toContain("client@example.com");
  });

  it("POST from a cross-origin form is blocked and never mutates", async () => {
    const form = new URLSearchParams({ recipient: "rt-123" });
    const res = await POST(
      new Request("https://app.test/api/share/pub-token/unsubscribe", {
        method: "POST",
        headers: { origin: "https://evil.test", "content-type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      }),
      params(),
    );
    expect(res.status).toBe(403);
    expect(mocks.unsubscribeSharedLinkRecipientByToken).not.toHaveBeenCalled();
  });
});
