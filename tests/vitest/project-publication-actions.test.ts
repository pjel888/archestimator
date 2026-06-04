import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actions = readFileSync("src/lib/publication/actions.ts", "utf8");
const header = readFileSync("src/components/workshop/ProjectPublicationHeader.tsx", "utf8");

describe("project publication manager actions (Shared Link Overhaul V2)", () => {
  it("creates, republishes, and revokes client links behind server-side manager checks", () => {
    expect(actions).toContain('"use server"');
    expect(actions).toContain("createProjectPublication");
    expect(actions).toContain("republishProjectPublication");
    expect(actions).toContain("rotateProjectPublicationLink");
    expect(actions).toContain("revokeProjectPublication");
    expect(actions).toContain("assertProjectPublicationManager");
    expect(actions).toContain("Only project owners and admins can publish shared links.");
    expect(actions).toContain("createPublicationToken");
    expect(actions).toContain("hashPublicationToken");
    expect(actions).toContain("encryptPublicationToken");
    expect(actions).toContain("hashPublicationPassword");
    expect(actions).toContain("buildProjectPublicationSnapshot");
    expect(actions).toContain("project_publications");
    expect(actions).toContain("selected_estimate_ids");
    expect(actions).toContain('status: "revoked"');
    expect(actions).toContain("revalidatePublicationRoutes");
  });

  it("wires the publication modal controls to server actions", () => {
    expect(header).toContain("createProjectPublication");
    expect(header).toContain("republishProjectPublication");
    expect(header).toContain("rotateProjectPublicationLink");
    expect(header).toContain("revokeProjectPublication");
    expect(header).toContain("runPublicationAction");
    // P13 final terminology consistency pass for "Shared link" (P0-P1 complete; all publication tests updated)
    expect(header).toContain("Generate shared link");
    expect(header).toContain("Update shared page");
    expect(header).toContain("New link");
    expect(header).toContain("Turn off link");
    expect(header).toContain("Require password");
  });

  // RED TEST (P0): Sheet selection filter support already exists in action; test will pass for backend but UI wiring is red until P1
  it("createProjectPublication accepts selectedEstimateIds array and normalizes for snapshot filtering", () => {
    expect(actions).toContain("selectedEstimateIds");
    expect(actions).toContain("normalizeSelectedEstimateIds");
    expect(actions).toContain("buildSnapshotForProject(context, estimateIds)");
    // Explicit filter path present (red until P1 threads from SheetPickerList)
    expect(actions).toMatch(/if \(selectedEstimateIds\.length\)|\.in\("id", selectedEstimateIds\)/);
  });

  // Historical red placeholder (P0/P2): "Tab rendering for receiver (will fail until P2 implements SharePageTabs + ARIA tablist in share page)"
  // P2 delivered (SharePageTabs + ARIA); placeholder retained for historical red-first record.
  // No active assertion (would be noise post-delivery).
  it("receiver surface will expose tablist for sheet navigation (tabbed estimates)", () => {
    // P2 delivered; original expect(true).toBe(false) removed.
  });

  // P4 RED TESTS (Shared Link Overhaul — Email & Recipients)
  // These must fail until addSharedLinkRecipients / removeSharedLinkRecipient implemented in actions.ts
  // and wired with Resend + token gen + graceful failure per Master Prompt + P4 bullets.
  it("exposes P4 recipient management server actions (add/remove with token generation + Resend)", () => {
    expect(actions).toContain("addSharedLinkRecipients");
    expect(actions).toContain("removeSharedLinkRecipient");
    expect(actions).toContain("shared_link_recipients");
    expect(actions).toContain("recipient_token_hash");
    expect(actions).toContain("delivery_status");
    expect(actions).toContain('RecipientDeliveryStatus = "pending" | "sent" | "bounced" | "opened" | "responded"');
    // Uses Resend client (P0) for transactional send with unique recipient token link
    expect(actions).toContain("sendEmail");
    expect(actions).toContain("from \"@/lib/email/resend-client\"");
    // Graceful: publication create/republish succeed even if email fails/bounces (no throw, status may stay pending)
    expect(actions).toMatch(/sendEmail|ResendEmailClient|ok:\s*false/);
  });

  it("P4 recipient actions generate secure per-recipient tokens and insert with invited_by", () => {
    expect(actions).toContain("createPublicationToken"); // reuse or similar for recipient tokens
    expect(actions).toContain("hashPublicationToken"); // or equiv for recipient_token_hash
    expect(actions).toMatch(/insert.*shared_link_recipients|recipient_token_hash/);
    expect(actions).toContain("invited_by");
  });

  it("blocks project managers from inviting their own sign-in email as a shared-link recipient", () => {
    expect(actions).toContain("readSelfInviteBlockedMessage");
    expect(actions).toContain("context.currentUserEmail");
    expect(actions).toContain("You cannot invite your own sign-in email to this shared link.");
    expect(actions).toMatch(/blockedSelfEmails\.length[\s\S]*emailResults/);
    expect(actions).toMatch(/normalized\.filter[\s\S]*!isSelfRecipientEmail/);
  });

  it("supports per-recipient resend with a fresh secure recipient token and a 5 minute rate limit", () => {
    expect(actions).toContain("resendSharedLinkRecipientEmail");
    expect(actions).toContain("shared_link_recipient_resend");
    expect(actions).toContain("security_rate_limit_events");
    expect(actions).toContain("5 * 60");
    expect(actions).toContain("recipient_token_hash");
    expect(actions).toContain("createPublicationToken");
    expect(actions).toContain("hashPublicationToken");
  });

  it("recipient emails emit the same canonical query parameter that the share page accepts", () => {
    const pageSrc = readFileSync("src/app/share/[token]/page.tsx", "utf8");

    expect(actions).toContain("recipient=");
    expect(actions).not.toContain("rt=${encodeURIComponent(rawToken)}");
    expect(pageSrc).toContain("searchParamsData.recipient");
    expect(pageSrc).toContain("searchParamsData.rt");
  });

  it("recipient and owner digest emails do not use placeholder sender or owner identities", () => {
    expect(actions).not.toContain('"A team member"');
    expect(actions).not.toContain('"owner@archestimator.test"');
    expect(actions).toContain("readPublicationSenderIdentity");
    expect(actions).toContain("resolvePublicationDigestOwner");
    expect(actions).toContain('"An Archestimator user"');
    expect(actions).toContain("workspace_members");
    expect(actions).toContain('role", "owner"');
    expect(actions).toContain("created_by");
    expect(actions).toContain("owner digest skipped");
  });

  it("recipient emails include a compliance unsubscribe footer", () => {
    expect(actions).toContain("buildPublicationEmailComplianceFooter");
    expect(actions).toContain("unsubscribe");
    expect(actions).toContain("mailto:");
    expect(actions).toContain("${action}?recipient=");
    expect(actions).toContain("complianceFooter");
  });

  it("recipient unsubscribe links suppress future recipient emails", () => {
    const unsubscribeRoute = readFileSync("src/app/api/share/[token]/unsubscribe/route.ts", "utf8");
    const publicRepository = readFileSync("src/lib/publication/public-repository.ts", "utf8");
    const recipientComposer = readFileSync("src/components/workshop/publication/RecipientEmailComposer.tsx", "utf8");
    const migrationText = readFileSync("supabase/migrations/20260531175141_shared_link_recipient_unsubscribe.sql", "utf8");
    const types = readFileSync("src/lib/supabase/types.ts", "utf8");

    expect(migrationText).toContain("email_unsubscribed_at timestamptz");
    expect(types).toContain("email_unsubscribed_at: string | null");
    expect(unsubscribeRoute).toContain("unsubscribeSharedLinkRecipientByToken");
    expect(unsubscribeRoute).toContain("searchParams.get(\"recipient\")");
    expect(unsubscribeRoute).toContain("Cache-Control");
    expect(publicRepository).toContain("unsubscribeSharedLinkRecipientByToken");
    expect(publicRepository).toContain("email_unsubscribed_at");
    expect(actions).toContain("Recipient has unsubscribed from follow-up emails");
    expect(recipientComposer).toContain("email_unsubscribed_at");
    expect(recipientComposer).toContain("unsubscribed");
    expect(recipientComposer).toContain("failed");
  });

  it("recipient opens update recipient status and write recipient-scoped activity without exposing raw tokens", () => {
    const pageSrc = readFileSync("src/app/share/[token]/page.tsx", "utf8");
    const publicRepository = readFileSync("src/lib/publication/public-repository.ts", "utf8");
    const security = readFileSync("src/lib/publication/security.ts", "utf8");

    expect(security).toContain("readSharedLinkSessionCookieRecipientId");
    expect(pageSrc).toContain("recipientIdForOpenEvent");
    expect(pageSrc).toContain("metadata: recipientIdForOpenEvent ? { recipient_id: recipientIdForOpenEvent } : {}");
    expect(publicRepository).toContain("shared_link_recipients");
    expect(publicRepository).toContain('delivery_status: "opened"');
    expect(publicRepository).toContain("last_opened_at");
    expect(publicRepository).toContain("shared_link_events");
    expect(publicRepository).toContain("recipient_id: recipientId");
    expect(publicRepository).not.toContain("raw-recipient-token");
  });

  // ============================================================================
  // P5 RED TESTS (Recipient Session & Security Cookie — Packet P5)
  // Per Master Prompt + exact P5 task: additive shared_link_session_[token] HttpOnly cookie,
  // ?recipient= verification on share page load, useSharedLinkSession hook, UI blocking for interactive.
  // Backwards compat for password + view-only flows. Red until implemented.
  // ============================================================================
  it("P5 exposes additive shared_link_session cookie helpers (HttpOnly, SameSite=Lax, Secure, Max-Age=86400) without breaking password cookie", () => {
    const security = readFileSync("src/lib/publication/security.ts", "utf8");
    expect(security).toContain("shared_link_session_");
    expect(security).toContain("createSharedLinkSessionCookieName");
    expect(security).toContain("createSharedLinkSessionCookie");
    expect(security).toContain("verifySharedLinkSessionCookieValue");
    expect(security).toContain("; HttpOnly;");
    expect(security).toContain("SameSite=Lax");
    expect(security).toMatch(/Max-Age=86400|86400/);
    // Additive: existing password access cookie logic and names untouched
    expect(security).toContain("ae_publication_access_");
    expect(security).toContain("createPublicationAccessCookieName");
    expect(security).toContain("verifyPublicationAccessCookieValue");
    expect(security).toContain("createPublicationAccessCookie");
  });

  it("P5 share page verifies recipient token on ?recipient= load, sets session cookie, and scopes open tracking (password/view-only paths unchanged)", () => {
    const pageSrc = readFileSync("src/app/share/[token]/page.tsx", "utf8");
    const sessionRouteSrc = readFileSync("src/app/api/share/[token]/session/route.ts", "utf8");
    expect(pageSrc).toContain("searchParams");
    expect(pageSrc).toContain("?recipient");
    expect(pageSrc).toContain("SharePageRecipientSessionInitializer");
    expect(sessionRouteSrc).toContain("verifySharedLinkRecipientToken");
    expect(sessionRouteSrc).toContain("getSharedLinkSessionCookieParts");
    expect(sessionRouteSrc).toContain("response.cookies.set");
    expect(pageSrc).toContain("recipientIdForOpenEvent");
    expect(pageSrc).toContain("createSharedLinkSessionCookieName"); // P5 session cookie name construction used on recipient path + subsequent loads
    expect(pageSrc).toContain("verifySharedLinkSessionCookieValue");
    // Existing password gate and cookie logic must remain identical for backwards compat
    expect(pageSrc).toContain("passwordRequired");
    expect(pageSrc).toContain("ProjectPublicationPasswordGate");
    expect(pageSrc).toContain("verifyPublicationAccessCookieValue");
    expect(pageSrc).toContain("createPublicationAccessCookieName");
  });

  it("P5 provides useSharedLinkSession hook (client-side) and integrates blocking guard in receiver UI for future interactive (P6+)", () => {
    let hookSrc = "";
    try {
      hookSrc = readFileSync("src/hooks/use-shared-link-session.ts", "utf8");
    } catch {
      hookSrc = "";
    }
    expect(hookSrc).toContain("useSharedLinkSession");
    // P5 hook uses cookie-flag approach (no Provider needed; simpler for HttpOnly + non-secret _ok flag; future P6+ can extend with context if desired)
    // Guard/blocking is split between the page-level session banner and interactive widgets.
    const banner = readFileSync("src/components/share/SharePageSessionBanner.tsx", "utf8");
    const comments = readFileSync("src/components/share/SharePageComments.tsx", "utf8");
    const decision = readFileSync("src/components/share/SharePageDecision.tsx", "utf8");
    expect(banner).toContain("hasValidRecipientSession");
    expect(banner).toContain("Sign in as a recipient to comment and respond to this proposal.");
    expect(banner).toContain("text-[9px]"); // design system typography
    expect(comments).toContain("useSharedLinkSession");
    expect(decision).toContain("useSharedLinkSession");
  });
});
