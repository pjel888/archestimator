import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClientPortalTimeline } from "@/components/client-portal/ClientPortalTimeline";

afterEach(() => vi.unstubAllGlobals());

describe("ClientPortalTimeline", () => {
  it("deep-links visible issue, request, and artifact events without internal identifiers", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      events: [
        { actor: { name: "Client", type: "recipient" }, eventType: "decision.approved", id: "public_event_1", occurredAt: "2026-07-27T00:00:00.000Z", snapshot: { issueNumber: 4 }, sourceType: "decision", summary: null, target: { kind: "issue", issueNumber: 4 }, title: "Issue approved" },
        { actor: { name: null, type: "system" }, eventType: "request.created", id: "public_event_2", occurredAt: "2026-07-26T00:00:00.000Z", snapshot: {}, sourceType: "change_request", summary: null, target: { kind: "request", publicRequestId: "request_public_1" }, title: "Request created" },
        { actor: { name: null, type: "system" }, eventType: "artifact.exposed", id: "public_event_3", occurredAt: "2026-07-25T00:00:00.000Z", snapshot: { issueNumber: 4 }, sourceType: "artifact", summary: null, target: { kind: "artifact", publicArtifactId: "artifact_public_1" }, title: "Artifact issued" },
      ],
      hasMore: false,
      nextCursor: null,
      summary: { activeBaseline: null, currentIssue: null, openRequestCount: 1 },
    }), { status: 200 })));

    render(<ClientPortalTimeline issueNumber={4} token={"a".repeat(43)} />);

    expect(await screen.findByRole("link", { name: "Open issued package" })).toHaveAttribute("href", `/share/${"a".repeat(43)}?issue=4#overview`);
    expect(screen.getByRole("link", { name: "Open issued artifact" })).toHaveAttribute("href", `/share/${"a".repeat(43)}?issue=4#artifact/artifact_public_1`);
    expect(screen.getByRole("link", { name: "Open request" })).toHaveAttribute("href", `/share/${"a".repeat(43)}?issue=4#request/request_public_1`);
    expect(document.body.textContent).not.toContain("request_public_1");
    expect(document.body.textContent).not.toContain("artifact_public_1");
  });
});
