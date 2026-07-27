import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClientPortalRequestSection } from "@/components/client-portal/ClientPortalRequestSection";

afterEach(() => vi.restoreAllMocks());

describe("ClientPortalRequestSection", () => {
  it("focuses the request selected by an opaque deep link", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ requests: [
      { canAmend: false, canWithdraw: false, currentVersion: { contentHash: "one", description: "First request", requestedEffectiveDate: null, title: "First", versionNumber: 1 }, publicRequestId: "request_public_1", requestCode: "CR-001", requestedAt: "2026-07-26T00:00:00.000Z", status: "submitted" },
      { canAmend: false, canWithdraw: false, currentVersion: { contentHash: "two", description: "Focused request", requestedEffectiveDate: null, title: "Second", versionNumber: 1 }, publicRequestId: "request_public_2", requestCode: "CR-002", requestedAt: "2026-07-27T00:00:00.000Z", status: "under_assessment" },
    ] }), { status: 200 }));

    render(<ClientPortalRequestSection capabilities={["request:view"]} initialRequestId="request_public_2" token="portal-token" />);

    expect(await screen.findByRole("heading", { name: "Second" })).toBeInTheDocument();
    expect(screen.getByText("Focused request")).toBeInTheDocument();
  });

  it("shows the non-authorization notice and submits a request with CSRF and idempotency", async () => {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        getRandomValues: (bytes: Uint8Array) => bytes.fill(1),
        randomUUID: () => "request-idempotency",
      },
    });
    Object.defineProperty(document, "cookie", { configurable: true, value: "", writable: true });
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ requests: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ request: { requestCode: "CR-001" } }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ requests: [] }), { status: 200 }));

    render(<ClientPortalRequestSection capabilities={["request:view", "request:create"]} token="portal-token" />);
    await waitFor(() => expect(screen.getByText("No requests have been recorded.")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "New request" }));
    expect(screen.getByText(/does not approve cost/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Request title"), { target: { value: "Move wall" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Move the east wall." } });
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const options = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(options.headers).toMatchObject({ "Idempotency-Key": "request-idempotency" });
  });
});
