import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClientPortalShell } from "@/components/client-portal/ClientPortalShell";
import { EstimateBrowserSection } from "@/components/client-portal/EstimateBrowserSection";
import { buildClientPortalEstimateBrowserPayload } from "@/lib/client-portal/estimate-browser";

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
          sections: [{ id: "section_1", kind: "overview", title: "Overview", layoutMode: "wide", payloadHash: "x" }],
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        section: { id: "section_1", kind: "overview", title: "Overview", layoutMode: "wide", payloadHash: "x", payload: { amount: 1200 } },
      }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ClientPortalShell token={token} />);

    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(await screen.findByText("1200")).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`/api/share/${token}/manifest`);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(`/api/share/${token}/sections/section_1`);
  });

  it("exposes component and row discussion targets for issued component instances", () => {
    const onDiscussTarget = vi.fn();
    const payload = buildClientPortalEstimateBrowserPayload({
      currencyCode: "USD",
      estimates: [{
        id: "estimate_1", name: "Main estimate", sheetCode: "A-100", updatedAt: null, rowCount: 1, totalCost: 120,
        rows: [{
          id: "row_1", componentAnchor: "cmp_public_component", variantAnchor: "var_public_variant", componentVersionNumber: 2, variantLabel: "Oak finish", rowRevision: 3, linkState: "linked-clean",
          description: "Floor finish", designation: "Interiors / Flooring", discipline: "Architectural", material: "", quantity: 1, unit: "lot", rowTotal: 120,
        }],
      }],
    });

    render(<EstimateBrowserSection onDiscussTarget={onDiscussTarget} payload={payload} sectionId="section_1" token={token} />);
    fireEvent.click(screen.getByRole("button", { name: "Discuss component Floor finish" }));
    expect(onDiscussTarget).toHaveBeenLastCalledWith({ kind: "component", publicId: "cmp_public_component", label: "Floor finish", secondaryLabel: "Oak finish" });

    fireEvent.click(screen.getByRole("button", { name: "Discuss row Floor finish" }));
    expect(onDiscussTarget).toHaveBeenLastCalledWith({ kind: "row", publicId: "row_1", label: "Floor finish", secondaryLabel: "Main estimate" });
  });

  it("preserves the recipient token through password unlock and redeems it afterward", async () => {
    const recipientToken = "b".repeat(43);
    let verifyAttempts = 0;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      void init;
      if (url.endsWith("/verify")) {
        verifyAttempts += 1;
        return verifyAttempts === 1
          ? new Response(JSON.stringify({ passwordRequired: true }), { status: 423 })
          : new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (url.endsWith("/password")) return new Response(null, { status: 204 });
      if (url.endsWith("/manifest")) return new Response(JSON.stringify({
        schemaVersion: 2,
        portal: { id: "portal_1", name: "Client Review", status: "live" },
        issue: { id: "issue_1", number: 1, versionLabel: "Issue 1", status: "issued", validThrough: null, contentHash: "x" },
        project: { name: "Kitchen Remodel", code: null, currencyCode: "USD" },
        recipient: { displayName: "Client", role: "reviewer", verified: true },
        brand: {}, capabilities: ["portal:view", "section:view"],
        sections: [{ id: "section_1", kind: "overview", title: "Overview", layoutMode: "standard", payloadHash: "x" }],
      }), { status: 200 });
      return new Response(JSON.stringify({ section: { id: "section_1", kind: "overview", title: "Overview", layoutMode: "standard", payloadHash: "x", payload: {} } }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState(null, "", `/share/${token}?recipient=${recipientToken}`);

    render(<ClientPortalShell recipientToken={recipientToken} token={token} />);
    fireEvent.change(await screen.findByLabelText("Portal password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock portal" }));

    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
    const verifyCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/verify"));
    expect(verifyCalls).toHaveLength(2);
    expect(verifyCalls[1]?.[1]?.body).toBe(JSON.stringify({ verificationToken: recipientToken }));
    expect(window.location.search).toBe("");
  });

  it("retains capability-aware Discuss and Decision actions in the mobile action bar", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/manifest")) return new Response(JSON.stringify({
        schemaVersion: 2,
        portal: { id: "portal_1", name: "Client Review", status: "live" },
        issue: { id: "issue_1", number: 1, versionLabel: "Issue 1", status: "issued", validThrough: null, contentHash: "x" },
        project: { name: "Kitchen Remodel", code: null, currencyCode: "USD" },
        recipient: { displayName: "Client", role: "reviewer", verified: true },
        brand: {},
        capabilities: ["portal:view", "section:view", "thread:create", "decision:submit_review"],
        sections: [
          { id: "section_1", kind: "overview", title: "Overview", layoutMode: "standard", payloadHash: "x" },
          { id: "section_2", kind: "discussion", title: "Discussion", layoutMode: "wide", payloadHash: "y" },
          { id: "section_3", kind: "decision", title: "Decision", layoutMode: "standard", payloadHash: "z" },
        ],
      }), { status: 200 });
      return new Response(JSON.stringify({ section: { id: "section_1", kind: "overview", title: "Overview", layoutMode: "standard", payloadHash: "x", payload: {} } }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ClientPortalShell token={token} />);

    expect(await screen.findByRole("button", { name: "Discuss" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decision" })).toBeInTheDocument();
  });
});
