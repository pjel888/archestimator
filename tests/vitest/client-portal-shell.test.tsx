import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClientPortalShell } from "@/components/client-portal/ClientPortalShell";

const token = "a".repeat(43);

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("ClientPortalShell", () => {
  it("loads the issued manifest and only then fetches the selected section payload", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/manifest")) {
        return new Response(JSON.stringify({
          schemaVersion: 2,
          portal: { id: "portal_1", name: "Client Review", status: "live" },
          issue: { id: "issue_1", number: 1, versionLabel: "Issue 1", status: "issued", validThrough: null, contentHash: "x" },
          project: { name: "Kitchen Remodel", code: "AE-100", currencyCode: "USD" },
          recipient: null,
          brand: {},
          capabilities: ["portal:view", "section:view"],
          sections: [{ id: "section_1", kind: "cost_breakdown", title: "Costs", layoutMode: "wide", payloadHash: "x" }],
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        section: { id: "section_1", kind: "cost_breakdown", title: "Costs", layoutMode: "wide", payloadHash: "x", payload: { amount: 1200 } },
      }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ClientPortalShell token={token} />);

    expect(await screen.findByRole("heading", { name: "Costs" })).toBeInTheDocument();
    expect(await screen.findByText("1200")).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`/api/share/${token}/manifest`);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(`/api/share/${token}/sections/section_1`);
  });
});
