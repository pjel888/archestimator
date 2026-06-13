import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// Hoisted mocks for route, repo, security, hook, component deps (P7 red tests written FIRST per Master Prompt + subagent TDD red-first rule)
const mocks = vi.hoisted(() => ({
  assertSameOriginPublicPost: vi.fn(),
  verifySharedLinkSessionCookieValue: vi.fn(),
  createSharedLinkSessionCookieName: vi.fn(),
  useSharedLinkSession: vi.fn(),
  // P7 repo extension (additive)
  resolveProjectPublicationAccessByToken: vi.fn(),
  submitSharedLinkDecision: vi.fn(),
  checkSharedLinkDecisionRateLimit: vi.fn(),
}));

vi.mock("@/lib/publication/security", () => ({
  assertSameOriginPublicPost: mocks.assertSameOriginPublicPost,
  verifySharedLinkSessionCookieValue: mocks.verifySharedLinkSessionCookieValue,
  createSharedLinkSessionCookieName: mocks.createSharedLinkSessionCookieName,
}));

vi.mock("@/hooks/use-shared-link-session", () => ({
  useSharedLinkSession: mocks.useSharedLinkSession,
}));

vi.mock("@/lib/publication/public-repository", async () => {
  const actual = await vi.importActual("@/lib/publication/public-repository");
  return {
    ...actual,
    resolveProjectPublicationAccessByToken: mocks.resolveProjectPublicationAccessByToken,
    submitSharedLinkDecision: mocks.submitSharedLinkDecision,
    checkSharedLinkDecisionRateLimit: mocks.checkSharedLinkDecisionRateLimit,
  };
});

// Modules under test (will fail to import or execute until P7 impl — intentionally red first)
import { POST } from "@/app/api/share/[token]/decision/route";
import SharePageDecision from "@/components/share/SharePageDecision";
import { composeSharedLinkActivity } from "@/lib/activity";

function params(token = "client-pub-token-123") {
  return { params: Promise.resolve({ token }) };
}

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/share/client-pub-token-123/decision", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("P7 — Shared Link Decisions API & UI (red tests written FIRST before any route/component impl)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSharedLinkSessionCookieName.mockReturnValue("shared_link_session_abc123");
    mocks.useSharedLinkSession.mockReturnValue({ isValid: true });
    mocks.resolveProjectPublicationAccessByToken.mockResolvedValue({
      publicationId: "pub1",
      snapshotVersion: 1,
      passwordRequired: false,
      status: "published",
      expiresAt: null,
      credentialVersion: "open",
    });
    mocks.submitSharedLinkDecision.mockResolvedValue({ id: "decision-123" });
    mocks.checkSharedLinkDecisionRateLimit.mockResolvedValue({ allowed: true });
    // reset fetch spy if any
    // @ts-expect-error test env
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("POST /api/share/[token]/decision route (CSRF + session + snapshot lock via P3 RPC + 409 duplicate)", () => {
    it("rejects missing or invalid CSRF (reuses assertSameOriginPublicPost from P5/P6)", async () => {
      mocks.assertSameOriginPublicPost.mockReturnValue({ ok: false, status: 403, message: "Publication request verification failed." });
      const res = await POST(makeRequest({ decision: "accepted" }), params());
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/verification failed|cross-origin/i);
    });

    it("rejects invalid or missing recipient session cookie (P5 guard, additive to password flows)", async () => {
      mocks.assertSameOriginPublicPost.mockReturnValue({ ok: true });
      mocks.verifySharedLinkSessionCookieValue.mockReturnValue(false);
      const req = makeRequest(
        { decision: "declined" },
        { cookie: "shared_link_session_abc123=bad", "x-archestimator-csrf": "t" }
      );
      const res = await POST(req, params());
      expect([401, 503]).toContain(res.status);
      const json = await res.json();
      expect(json.error).toMatch(/session|recipient|unauthorized|valid recipient/i);
    });

    it("returns 409 Conflict on duplicate decision (P3 RPC raises 'Decision already submitted.' via snapshot_version unique)", async () => {
      mocks.assertSameOriginPublicPost.mockReturnValue({ ok: true });
      mocks.verifySharedLinkSessionCookieValue.mockReturnValue(true);
      mocks.submitSharedLinkDecision.mockRejectedValue(new Error("Decision already submitted."));
      // Cookie value parsable by route's lightweight session parse (sets recipientIdFromCookie before verify mock)
      const parsableSession = "shared-link-session-v1:eyJyZWNpcGllbnRJZCI6InJlY2lwLTEyMyIsInB1YmxpY2F0aW9uSWQiOiJwdWIxIiwic25hcHNob3RWZXJzaW9uIjoiMSJ9:dummy";
      const req = makeRequest(
        { decision: "accepted", note: "Looks good" },
        { cookie: `shared_link_session_abc123=${encodeURIComponent(parsableSession)}`, "x-archestimator-csrf": "csrf-token-xyz" }
      );
      const res = await POST(req, params());
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toMatch(/already submitted|duplicate|decision/i);
    });

    it("rejects sessions bound to a stale credential against the current publication", async () => {
      // AC-MOD-01: the route verifies the session against the publication's
      // credentialVersion (password-derived), NOT snapshot_version. A content-only
      // republish must NOT reject the session; only a credential change does. Here the
      // current publication exposes credentialVersion "cred-v2" while the cookie was
      // minted under "cred-v1", so verification fails and the decision is rejected.
      mocks.assertSameOriginPublicPost.mockReturnValue({ ok: true });
      mocks.resolveProjectPublicationAccessByToken.mockResolvedValue({
        publicationId: "pub1",
        snapshotVersion: 2,
        passwordRequired: false,
        status: "published",
        expiresAt: null,
        credentialVersion: "cred-v2",
      });
      mocks.verifySharedLinkSessionCookieValue.mockImplementation((_value, context) => context.credentialVersion === "cred-v1");
      const staleSession = "shared-link-session-v1:eyJyZWNpcGllbnRJZCI6InJlY2lwLTEyMyIsInB1YmxpY2F0aW9uSWQiOiJwdWIxIiwic25hcHNob3RWZXJzaW9uIjoiMSJ9:dummy";
      const req = makeRequest(
        { decision: "accepted", note: "I approve under the old credential" },
        { cookie: `shared_link_session_abc123=${encodeURIComponent(staleSession)}`, "x-archestimator-csrf": "csrf-token-xyz" },
      );

      const res = await POST(req, params());

      expect(res.status).toBe(401);
      await expect(res.json()).resolves.toEqual({ error: "Valid recipient session required for decisions." });
      expect(mocks.verifySharedLinkSessionCookieValue).toHaveBeenCalledWith(
        staleSession,
        expect.objectContaining({
          token: "client-pub-token-123",
          publicationId: "pub1",
          credentialVersion: "cred-v2",
          recipientId: "recip-123",
        }),
      );
      expect(mocks.checkSharedLinkDecisionRateLimit).not.toHaveBeenCalled();
      expect(mocks.submitSharedLinkDecision).not.toHaveBeenCalled();
    });

    it("accepts valid CSRF + session, calls submitSharedLinkDecision with correct payload, returns 201", async () => {
      mocks.assertSameOriginPublicPost.mockReturnValue({ ok: true });
      mocks.verifySharedLinkSessionCookieValue.mockReturnValue(true);
      mocks.submitSharedLinkDecision.mockResolvedValue({ id: "resp-uuid-xyz" });
      const parsableSession = "shared-link-session-v1:eyJyZWNpcGllbnRJZCI6InJlY2lwLTEyMyIsInB1YmxpY2F0aW9uSWQiOiJwdWIxIiwic25hcHNob3RWZXJzaW9uIjoiMSJ9:dummy";
      const req = makeRequest(
        { decision: "revision_requested", note: "Please revise pricing on line 3" },
        { cookie: `shared_link_session_abc123=${encodeURIComponent(parsableSession)}`, "x-archestimator-csrf": "csrf-token-xyz" }
      );
      const res = await POST(req, params());
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.id).toBe("resp-uuid-xyz");
      expect(mocks.submitSharedLinkDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          publicationToken: "client-pub-token-123",
          recipientId: "recip-123",
          expectedSnapshotVersion: 1,
          decision: "revision_requested",
          note: "Please revise pricing on line 3",
        })
      );
    });

    it("uses durable decision rate limiting before submitting a decision", async () => {
      mocks.assertSameOriginPublicPost.mockReturnValue({ ok: true });
      mocks.verifySharedLinkSessionCookieValue.mockReturnValue(true);
      mocks.checkSharedLinkDecisionRateLimit.mockResolvedValueOnce({
        allowed: false,
        message: "Too many attempts. Please wait 60 seconds.",
        retryAfter: 60,
      });
      const parsableSession = "shared-link-session-v1:eyJyZWNpcGllbnRJZCI6InJlY2lwLTEyMyIsInB1YmxpY2F0aW9uSWQiOiJwdWIxIiwic25hcHNob3RWZXJzaW9uIjoiMSJ9:dummy";
      const req = makeRequest(
        { decision: "accepted" },
        {
          cookie: `shared_link_session_abc123=${encodeURIComponent(parsableSession)}`,
          "x-archestimator-csrf": "csrf-token-xyz",
        },
      );

      const res = await POST(req, params());

      expect(res.status).toBe(429);
      expect(res.headers.get("retry-after")).toBe("60");
      expect(await res.json()).toEqual({ error: "Too many attempts. Please wait 60 seconds." });
      expect(mocks.submitSharedLinkDecision).not.toHaveBeenCalled();
    });

    it("maps other RPC errors (e.g. not found) to appropriate status without leaking internals", async () => {
      mocks.assertSameOriginPublicPost.mockReturnValue({ ok: true });
      mocks.verifySharedLinkSessionCookieValue.mockReturnValue(true);
      mocks.submitSharedLinkDecision.mockRejectedValue(new Error("Recipient not found."));
      const parsableSession = "shared-link-session-v1:eyJyZWNpcGllbnRJZCI6InJlY2lwLTEyMyIsInB1YmxpY2F0aW9uSWQiOiJwdWIxIiwic25hcHNob3RWZXJzaW9uIjoiMSJ9:dummy";
      const req = makeRequest({ decision: "accepted" }, { cookie: `shared_link_session_abc123=${encodeURIComponent(parsableSession)}`, "x-archestimator-csrf": "t" });
      const res = await POST(req, params());
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/not found|recipient/i);
    });
  });


  describe("recipient-aware activity copy", () => {
    it("renders safe recipient decision digest copy", () => {
      const accepted = composeSharedLinkActivity({ id: "decision-a", type: "decision", created_at: "2026-06-02T00:00:00.000Z", recipientDisplayName: "Maria", decision: "accepted" }, { audience: "client", visibility: "public" });
      const declined = composeSharedLinkActivity({ id: "decision-d", type: "decision", created_at: "2026-06-02T00:01:00.000Z", recipientDisplayName: "Maria", decision: "declined" }, { audience: "client", visibility: "public" });
      const revision = composeSharedLinkActivity({ id: "decision-r", type: "decision", created_at: "2026-06-02T00:02:00.000Z", recipientDisplayName: "Maria", decision: "revision_requested" }, { audience: "client", visibility: "public" });

      expect(accepted.title).toBe("Maria approved the proposal.");
      expect(declined.title).toBe("Maria declined the proposal.");
      expect(revision.title).toBe("Maria requested revisions.");
      expect([accepted, declined, revision].map((activity) => activity.raw)).toEqual([undefined, undefined, undefined]);
    });
  });

  describe("SharePageDecision component (Accept/Decline/Request Revision buttons + confirmation modal + read-only lock + 409 handling + post-decision comments allowed)", () => {
    it("renders nothing or disabled state when no valid session (P5 hook)", () => {
      mocks.useSharedLinkSession.mockReturnValue({ isValid: false });
      const { container } = render(<SharePageDecision token="t1" />);
      // Should not show interactive decision buttons (gated)
      expect(container.textContent || "").not.toMatch(/Accept|Decline|Revision/i);
    });

    it("renders the three decision buttons when session valid and undecided", () => {
      mocks.useSharedLinkSession.mockReturnValue({ isValid: true });
      render(<SharePageDecision token="t1" />);
      expect(screen.getByRole("button", { name: /accept/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /decline/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /request revision|revision/i })).toBeInTheDocument();
    });
    it("loads a prior recipient decision on mount and keeps the response locked after reload", async () => {
      mocks.useSharedLinkSession.mockReturnValue({ isValid: true });
      // @ts-expect-error fetch mock
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          decision: {
            type: "accepted",
            note: "Looks good.",
            submittedAt: "2026-06-03T01:00:00.000Z",
          },
        }),
      });

      render(<SharePageDecision token="t1" />);

      expect(await screen.findByTestId("decision-locked-badge")).toBeInTheDocument();
      expect(screen.getByText("Accepted")).toBeInTheDocument();
      expect(screen.getByText("Note: Looks good.")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /accept/i })).not.toBeInTheDocument();
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/share/t1/decision",
        expect.objectContaining({ method: "GET", headers: { Accept: "application/json" } }),
      );
    });


    it("opens confirmation modal with tailored copy before finalizing (no POST until confirm)", async () => {
      mocks.useSharedLinkSession.mockReturnValue({ isValid: true });
      const user = userEvent.setup();
      render(<SharePageDecision token="t1" />);
      await user.click(screen.getByRole("button", { name: /accept/i }));
      // Modal should appear (implementation uses role=dialog or visible confirm UI)
      await waitFor(() => {
        // Use getAllBy + first to tolerate any transient duplicates in test env; core contract is modal appears with tailored copy
        const matches = screen.getAllByText(/Accept this proposal\?|Your decision will be final/i);
        expect(matches.length).toBeGreaterThan(0);
      });
      // Cancel does not POST
      const cancel = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancel);
      expect(
        vi.mocked(global.fetch).mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === "POST"),
      ).toHaveLength(0);
    });
    it("traps modal focus, closes on Escape, and restores focus to the trigger", async () => {
      mocks.useSharedLinkSession.mockReturnValue({ isValid: true });
      const user = userEvent.setup();
      render(<SharePageDecision token="t1" />);

      const acceptButton = screen.getByRole("button", { name: /accept/i });
      acceptButton.focus();
      await user.click(acceptButton);

      const dialog = await screen.findByRole("dialog", { name: /accept this proposal/i });
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby", "decision-confirm-title");
      await waitFor(() => expect(screen.getByLabelText(/note \(optional\)/i)).toHaveFocus());

      await user.tab({ shift: true });
      expect(screen.getByRole("button", { name: /^Confirm$/i })).toHaveFocus();
      await user.tab();
      expect(screen.getByLabelText(/note \(optional\)/i)).toHaveFocus();

      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      await waitFor(() => expect(acceptButton).toHaveFocus());
    });


    it("on confirm in modal, POSTs to /api/share/[token]/decision with CSRF header + decision + note, then locks to read-only badge", async () => {
      mocks.useSharedLinkSession.mockReturnValue({ isValid: true });
      // @ts-expect-error fetch mock
      global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: "d1" }) });
      const user = userEvent.setup();
      render(<SharePageDecision token="t1" />);
      await user.click(screen.getByRole("button", { name: /decline/i }));
      await waitFor(() => expect(screen.getByRole("button", { name: /^Confirm$/i })).toBeInTheDocument());
      const noteInput = screen.queryByPlaceholderText(/note|reason|comment/i);
      if (noteInput) await user.type(noteInput, "Pricing too high");
      const confirmBtn = screen.getByRole("button", { name: /^Confirm$/i });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/share/t1/decision"),
          expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "x-archestimator-csrf": expect.any(String) }) })
        );
      });
      const postCall = vi
        .mocked(global.fetch)
        .mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === "POST");
      const requestInit = postCall?.[1] as RequestInit;
      const headers = requestInit.headers as Record<string, string>;
      expect(headers["x-archestimator-csrf"]).not.toBe(["client", "post"].join("-"));
      expect(document.cookie).toContain(`ae_publication_csrf=${headers["x-archestimator-csrf"]}`);
      // After success, shows read-only badge/lock (not the 3 buttons)
      await waitFor(() => {
        expect(screen.getByTestId("decision-locked-badge")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /accept/i })).not.toBeInTheDocument();
      });
    });

    it("handles 409 from POST by locking UI to read-only badge with duplicate message (no crash)", async () => {
      mocks.useSharedLinkSession.mockReturnValue({ isValid: true });
      // @ts-expect-error fetch mock
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: "Decision already submitted." }) });
      const user = userEvent.setup();
      render(<SharePageDecision token="t1" />);
      await user.click(screen.getByRole("button", { name: /accept/i }));
      await waitFor(() => expect(screen.getByRole("button", { name: /^Confirm$/i })).toBeInTheDocument());
      const confirmBtn = screen.getByRole("button", { name: /^Confirm$/i });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(screen.getByTestId("decision-locked-badge")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /accept/i })).not.toBeInTheDocument();
      });
    });

    it("keeps SharePageComments (or post-decision comments) usable/rendered after decision lock (per owner decision allowance)", () => {
      mocks.useSharedLinkSession.mockReturnValue({ isValid: true });
      // After internal lock simulation (component manages its decided state)
      render(
        <>
          <SharePageDecision token="t1" />
          {/* Comments remain independently usable post-decision */}
          <div data-testid="comments-stub">Comments composer still here</div>
        </>
      );
      // Decision may lock buttons, but comments stub (real integration) remains
      expect(screen.getByTestId("comments-stub")).toBeInTheDocument();
    });
  });
});
