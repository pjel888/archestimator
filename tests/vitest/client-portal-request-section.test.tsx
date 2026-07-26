import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClientPortalRequestSection } from "@/components/client-portal/ClientPortalRequestSection";

afterEach(() => vi.restoreAllMocks());

describe("ClientPortalRequestSection", () => {
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
