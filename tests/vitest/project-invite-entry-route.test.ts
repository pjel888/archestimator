import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("/invite/[token] route contract", () => {
  const route = readFileSync("src/app/invite/[token]/page.tsx", "utf8");
  const continueRoute = readFileSync("src/app/invite/[token]/continue/route.ts", "utf8");
  const acceptRoute = readFileSync("src/app/invite/[token]/accept/route.ts", "utf8");
  const inviteEntry = readFileSync("src/lib/collaboration/invite-entry.ts", "utf8");
  const signOutRoute = readFileSync("src/app/invite/[token]/sign-out/route.ts", "utf8");

  it("keeps the route public, app-owned, and backed by peppered token resolution", () => {
    expect(route).toContain("resolve_collaboration_invitation");
    expect(route).toContain("hashInviteToken");
    expect(route).toContain("decodeInviteRouteToken");
    expect(route).toContain("PROJECT_INVITE_ENTRY_ENABLED");
    expect(route).toContain("ARCHESTIMATOR_INVITE_TOKEN_PEPPER");
    expect(route).not.toContain("redirectTo: `/invite/");
  });

  it("renders non-leaky terminal states and signed-out preview consent", () => {
    expect(route).toContain("This invite link is invalid or no longer available.");
    expect(route).toContain("Invite expired.");
    expect(route).toContain("This invite was revoked.");
    expect(route).toContain("Continue to Archestimator");
    expect(route).toContain("signed-out-preview");
    expect(route).toContain("archestimator_pending_invite");
    expect(route).toContain("/continue");
    expect(continueRoute).toContain('LOGIN_PATH');
    expect(continueRoute).toContain("createPendingInviteBridge");
    expect(continueRoute).toContain('PENDING_INVITE_ACCEPT_PATH = "/workshop/pending-invite"');
    expect(continueRoute).toContain("next=${encodeURIComponent(PENDING_INVITE_ACCEPT_PATH)}");
    expect(continueRoute).toContain("export async function GET");
    expect(route).not.toContain("encodeURIComponent(`/invite/${rawToken}`)");
  });

  it("supports signed-in matching accept and wrong-account recovery", () => {
    const getRoute = acceptRoute.match(/export async function GET[\s\S]*?\n}\n/)?.[0] ?? "";

    expect(route).toContain("/accept");
    expect(route).toContain('method="post"');
    expect(route).toContain("Confirm acceptance");
    expect(route).toContain('name="projectName"');
    expect(route).toContain('name="roleLabel"');
    expect(route).toContain("/sign-out");
    expect(acceptRoute).toContain("accept_collaboration_invitation");
    expect(acceptRoute).toContain('acceptState !== "accepted" && acceptState !== "already_member"');
    expect(acceptRoute).toContain("readAcceptedInviteDisplayContext");
    expect(acceptRoute).toContain("buildAcceptedInviteRedirect");
    expect(acceptRoute).toContain('url.searchParams.set("invite", "accepted")');
    expect(acceptRoute).toContain('url.searchParams.set("targetHref",');
    expect(acceptRoute).toContain('url.searchParams.set("projectName",');
    expect(acceptRoute).toContain('url.searchParams.set("roleLabel",');
    expect(acceptRoute).toContain("export async function GET");
    expect(getRoute).toContain("redirectToPath(request, `/invite/${encodeURIComponent(rawToken)}`)");
    expect(getRoute).not.toContain("acceptInvite");
    expect(signOutRoute).toContain("supabase.auth.signOut");
    expect(route).toContain("Sign out and continue");
    expect(route).toContain("Signed in as");
    expect(route).toContain("Invited email");
    expect(route).toContain("wrong-account");
    expect(route).toContain("Open project");
  });

  it("renders terminal invite states with sender/contact recovery copy", () => {
    expect(route).toContain("Ask the sender for a new invite.");
    expect(route).toContain("inviter_email");
    expect(route).toContain("Contact the sender at");
    expect(route).toContain('href="/contact"');
    expect(route).toContain("Contact Archestimator");
  });

  it("uses durable invite rate limits for resolve, continue, and accept paths", () => {
    expect(route).toContain("checkInviteResolutionRateLimit");
    expect(route).toContain("headers()");
    expect(route).toContain("rate-limited");
    expect(route).toContain("Too many attempts.");

    expect(continueRoute).toContain("checkInviteContinueRateLimit");
    expect(continueRoute).toContain("NextResponse.json");
    expect(continueRoute).toContain('"Retry-After"');

    expect(acceptRoute).toContain("checkInviteAcceptRateLimit");
    expect(acceptRoute).toContain("supabase.auth.getUser");
    expect(acceptRoute).toContain("NextResponse.json");
    expect(acceptRoute).toContain('"Retry-After"');
    expect(signOutRoute).toContain("isAllowedInviteOrigin");
    expect(signOutRoute.indexOf("isAllowedInviteOrigin(request)")).toBeLessThan(signOutRoute.indexOf("supabase.auth.signOut"));
  });

  it("keeps invite rate-limit IP hashing keyed by a server-only pepper", () => {
    expect(inviteEntry).toContain('createHmac("sha256", readInviteRateLimitHashPepper())');
    expect(inviteEntry).toContain("ARCHESTIMATOR_INVITE_RATE_LIMIT_HASH_PEPPER");
    expect(inviteEntry).not.toContain('createHash("sha256").update(getClientIp(headers))');
  });
});
