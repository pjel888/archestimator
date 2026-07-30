import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClientPortalShell } from "@/components/client-portal/ClientPortalShell";
import { EstimateBrowserSection } from "@/components/client-portal/EstimateBrowserSection";
import { buildClientPortalEstimateBrowserPayload } from "@/lib/client-portal/estimate-browser";

const token = "a".repeat(43);

function portalSummary(capabilities: string[] = ["portal:view", "section:view"]) {
  return {
    schemaVersion: 1,
    portal: { name: "Client Review", status: "live" },
    project: { name: "Kitchen Remodel", code: "AE-100", currencyCode: "USD" },
    recipient: null,
    capabilities,
    activeBaseline: null,
    pendingIssue: { currencyCode: "USD", issueNumber: 1, issuedAt: "2026-07-27T00:00:00.000Z", status: "issued", total: 1200, versionLabel: "Issue 1" },
    visibleCounts: { artifacts: 0, issues: 1, openRequests: 0, timelineEvents: 0 },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("ClientPortalShell", () => {
  it("loads the issued manifest and only then fetches the selected section payload", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/summary")) return new Response(JSON.stringify(portalSummary()), { status: 200 });
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
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`/api/share/${token}/summary`);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(`/api/share/${token}/manifest`);
    expect(fetchMock.mock.calls[2]?.[0]).toBe(`/api/share/${token}/sections/section_1`);
  });

  it("renders a deterministic unavailable state when an issued section cannot be fetched", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/summary")) return new Response(JSON.stringify(portalSummary()), { status: 200 });
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
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ClientPortalShell token={token} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("This issued section is unavailable.");
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
      if (url.endsWith("/summary")) return new Response(JSON.stringify({
        ...portalSummary(),
        recipient: { displayName: "Client", role: "reviewer" },
      }), { status: 200 });
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
      if (url.endsWith("/summary")) return new Response(JSON.stringify(portalSummary(["portal:view", "section:view", "thread:create", "decision:submit_review"])), { status: 200 });
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
    expect(await screen.findByText("No client-visible details were issued for this section.")).toBeInTheDocument();
  });

  it("opens the commitment timeline first for verified timeline-capable recipients", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/summary")) return new Response(JSON.stringify({
        ...portalSummary(["portal:view", "section:view", "timeline:view"]),
        activeBaseline: { baselineNumber: 1, currencyCode: "PHP", establishedAt: "2026-07-26T00:00:00.000Z", issueNumber: 3, totalMinorUnits: 125_000, versionLabel: "Issue 3" },
        pendingIssue: { currencyCode: "PHP", issueNumber: 4, issuedAt: "2026-07-27T00:00:00.000Z", status: "under_review", total: 1400, versionLabel: "Issue 4" },
        project: { name: "Kitchen Remodel", code: null, currencyCode: "PHP" },
      }), { status: 200 });
      if (url.endsWith("/manifest")) return new Response(JSON.stringify({
        schemaVersion: 2,
        portal: { id: "portal_1", name: "Client Review", status: "live" },
        issue: { id: "issue_1", number: 4, versionLabel: "Issue 4", status: "under_review", validThrough: null, contentHash: "x" },
        project: { name: "Kitchen Remodel", code: null, currencyCode: "PHP" },
        recipient: { displayName: "Client", role: "reviewer", verified: true },
        brand: {},
        capabilities: ["portal:view", "section:view", "timeline:view"],
        sections: [{ id: "section_1", kind: "overview", title: "Overview", layoutMode: "standard", payloadHash: "x" }],
      }), { status: 200 });
      if (url.endsWith("/timeline")) return new Response(JSON.stringify({
        events: [],
        hasMore: false,
        nextCursor: null,
        summary: {
          activeBaseline: { baselineNumber: 1, currencyCode: "PHP", establishedAt: "2026-07-26T00:00:00.000Z", issueNumber: 3, totalMinorUnits: 125_000, versionLabel: "Issue 3" },
          currentIssue: { currencyCode: "PHP", issueNumber: 4, issuedAt: "2026-07-27T00:00:00.000Z", status: "under_review", total: 1400, versionLabel: "Issue 4" },
          openRequestCount: 2,
        },
      }), { status: 200 });
      return new Response(JSON.stringify({ section: { id: "section_1", kind: "overview", title: "Overview", layoutMode: "standard", payloadHash: "x", payload: {} } }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ClientPortalShell token={token} />);

    expect(await screen.findByRole("heading", { name: "Commitment timeline" })).toBeInTheDocument();
    expect(screen.getAllByText("Issue 3")).not.toHaveLength(0);
    expect(screen.getByRole("tab", { name: "Timeline" })).toHaveAttribute("aria-selected", "true");
  });

  it("keeps the timeline available without a current issue manifest", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/summary")) return new Response(JSON.stringify(portalSummary(["portal:view", "timeline:view"])), { status: 200 });
      if (url.endsWith("/manifest")) return new Response(JSON.stringify({ error: "unavailable" }), { status: 404 });
      if (url.endsWith("/timeline")) return new Response(JSON.stringify({
        events: [],
        hasMore: false,
        nextCursor: null,
        summary: { activeBaseline: null, currentIssue: null, openRequestCount: 0 },
      }), { status: 200 });
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ClientPortalShell token={token} />);

    expect(await screen.findByRole("heading", { name: "Commitment timeline" })).toBeInTheDocument();
    expect(screen.queryByText("This Client Portal is unavailable.")).not.toBeInTheDocument();
  });

  it("opens an issued PDF from an opaque artifact deep link", async () => {
    const publicArtifactId = "artifact_public_1";
    window.history.replaceState(null, "", `/share/${token}?issue=4#artifact/${publicArtifactId}`);
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/summary")) return new Response(JSON.stringify(portalSummary(["portal:view", "section:view", "artifact:view", "artifact:download"])), { status: 200 });
      if (url.endsWith("/manifest?issue=4")) return new Response(JSON.stringify({
        schemaVersion: 2,
        portal: { id: "portal_public", name: "Client Review", status: "live" },
        issue: { id: "issue_public", number: 4, versionLabel: "Issue 4", status: "issued", validThrough: null, contentHash: "x" },
        project: { name: "Kitchen Remodel", code: null, currencyCode: "PHP" },
        recipient: { displayName: "Client", role: "reviewer", verified: true },
        brand: {},
        capabilities: ["portal:view", "section:view", "artifact:view", "artifact:download"],
        package: { artifacts: [{ contentType: "application/pdf", description: null, downloadable: true, id: publicArtifactId, sizeBytes: 2048, title: "Issued drawing" }] },
        sections: [{ id: "section_public", kind: "overview", title: "Overview", layoutMode: "standard", payloadHash: "x" }],
      }), { status: 200 });
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ClientPortalShell initialIssueNumber={4} token={token} />);

    expect(await screen.findByTitle("Issued drawing PDF preview")).toHaveAttribute("src", `/api/share/${token}/artifacts/${publicArtifactId}?issue=4`);
    expect(screen.getByRole("link", { name: "Download" })).toHaveAttribute("href", `/api/share/${token}/artifacts/${publicArtifactId}?issue=4&download=1`);
    expect(screen.getByRole("tab", { name: "Documents" })).toHaveAttribute("aria-selected", "true");
  });

  it("routes a timeline thread deep link to the exact secure discussion object and focuses it", async () => {
    const publicThreadId = "cpt_thread_target";
    window.history.replaceState(null, "", `/share/${token}?issue=4#thread/${publicThreadId}`);
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/summary")) return new Response(JSON.stringify(portalSummary(["portal:view", "section:view", "thread:view", "thread:reply"])), { status: 200 });
      if (url.endsWith("/manifest?issue=4")) return new Response(JSON.stringify({
        schemaVersion: 2,
        portal: { id: "cpp_portal", name: "Client Review", status: "live" },
        issue: { id: "cpi_issue", number: 4, versionLabel: "Issue 4", status: "under_review", validThrough: null, contentHash: "x" },
        project: { name: "Kitchen Remodel", code: null, currencyCode: "PHP" },
        recipient: { displayName: "Client", role: "reviewer", verified: true },
        brand: {}, capabilities: ["portal:view", "section:view", "thread:view", "thread:reply"],
        sections: [{ id: "cps_discussion", kind: "discussion", title: "Discussion", layoutMode: "wide", payloadHash: "x" }],
      }), { status: 200 });
      if (url.endsWith("/sections/cps_discussion?issue=4")) return new Response(JSON.stringify({ section: { id: "cps_discussion", kind: "discussion", title: "Discussion", layoutMode: "wide", payloadHash: "x", payload: {} } }), { status: 200 });
      if (url.endsWith("/threads")) return new Response(JSON.stringify({ threads: [
        { id: "cpt_other_thread", subject: "Earlier question", status: "open", waitingState: "waiting_on_client", unreadCount: 0, updatedAt: "2026-07-27T01:00:00.000Z", target: { label: "Scope" } },
        { id: publicThreadId, subject: "Budget clarification", status: "open", waitingState: "waiting_on_owner", unreadCount: 1, updatedAt: "2026-07-27T00:00:00.000Z", target: { label: "Cost plan" } },
      ], hasMore: false, nextCursor: null }), { status: 200 });
      if (url.endsWith(`/threads/${publicThreadId}/messages`)) return new Response(JSON.stringify({ messages: [], hasMore: false, nextCursor: null }), { status: 200 });
      if (url.endsWith(`/threads/${publicThreadId}/read`)) return new Response(null, { status: 204 });
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ClientPortalShell initialIssueNumber={4} token={token} />);

    const target = await screen.findByRole("button", { name: /Budget clarification/ });
    await waitFor(() => expect(target).toHaveFocus());
    expect(screen.getByRole("tab", { name: "Discussion" })).toHaveAttribute("aria-selected", "true");
    expect(fetchMock).toHaveBeenCalledWith(`/api/share/${token}/threads/${publicThreadId}/messages`, { cache: "no-store" });
  });

  it("routes a timeline decision deep link to the exact secure receipt and focuses it", async () => {
    const publicDecisionId = "cpd_decision_target";
    window.history.replaceState(null, "", `/share/${token}?issue=4#decision/${publicDecisionId}`);
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/summary")) return new Response(JSON.stringify(portalSummary(["portal:view", "section:view", "decision:view", "decision:submit_formal"])), { status: 200 });
      if (url.endsWith("/manifest?issue=4")) return new Response(JSON.stringify({
        schemaVersion: 2,
        portal: { id: "cpp_portal", name: "Client Review", status: "live" },
        issue: { id: "cpi_issue", number: 4, versionLabel: "Issue 4", status: "under_review", validThrough: null, contentHash: "x" },
        project: { name: "Kitchen Remodel", code: null, currencyCode: "PHP" },
        recipient: { displayName: "Client", role: "approver", verified: true },
        brand: {}, capabilities: ["portal:view", "section:view", "decision:view", "decision:submit_formal"],
        sections: [{ id: "cps_decision", kind: "decision", title: "Decision", layoutMode: "standard", payloadHash: "x" }],
      }), { status: 200 });
      if (url.endsWith("/sections/cps_decision?issue=4")) return new Response(JSON.stringify({ section: { id: "cps_decision", kind: "decision", title: "Decision", layoutMode: "standard", payloadHash: "x", payload: {} } }), { status: 200 });
      if (url.endsWith(`/decision?issueId=cpi_issue&decisionId=${publicDecisionId}`)) return new Response(JSON.stringify({ summary: { focusDecision: { id: publicDecisionId, currencyCode: "PHP", decision: "approved", signerName: "Client", submittedAt: "2026-07-27T00:00:00.000Z", total: 1400, versionLabel: "Issue 4" }, ownReceipt: { id: publicDecisionId, currencyCode: "PHP", decision: "approved", submittedAt: "2026-07-27T00:00:00.000Z", total: 1400, versionLabel: "Issue 4" } } }), { status: 200 });
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ClientPortalShell initialIssueNumber={4} token={token} />);

    const receipt = (await screen.findByText("Your decision: approved")).parentElement;
    await waitFor(() => expect(receipt).toHaveFocus());
    expect(screen.getByRole("tab", { name: "Decision" })).toHaveAttribute("aria-selected", "true");
    expect(fetchMock).toHaveBeenCalledWith(`/api/share/${token}/decision?issueId=cpi_issue&decisionId=${publicDecisionId}`, { cache: "no-store" });
  });
});
