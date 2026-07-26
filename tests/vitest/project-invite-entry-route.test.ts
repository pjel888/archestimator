import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(path, "utf8").replace(/\r\n?/g, "\n");
}

describe("/invite/[token] route contract", () => {
  const route = readSource("src/app/invite/[token]/page.tsx");
  const continueRoute = readSource("src/app/invite/[token]/continue/route.ts");
  const acceptRoute = readSource("src/app/invite/[token]/accept/route.ts");
  const inviteEntry = readSource("src/lib/collaboration/invite-entry.ts");
  const signOutRoute = readSource("src/app/invite/[token]/sign-out/route.ts");

  it("keeps the route public, app-owned, and backed by peppered token resolution", () => {
    expect(route).toContain("resolveCollaborationInvitationFromCloudflareD1");
    expect(route).toContain("hashInviteToken");
    expect(route).toContain("decodeInviteRouteToken");
    expect(route).toContain("PROJECT_INVITE_ENTRY_ENABLED");
    expect(route).toContain("ARCHESTIMATOR_INVITE_TOKEN_PEPPER");
    expect(route).not.toMatch(/@\/lib\/supabase\/server|createSupabaseServerClient|resolve_collaboration_invitation/);
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
    expect(acceptRoute).toContain("acceptInvitationTokenForUser");
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
    expect(signOutRoute).toContain("createCloudflareBetterAuthForRequest");
    expect(signOutRoute).toContain("/api/auth/sign-out");
    expect(signOutRoute).toContain("better-auth.session_token");
    expect(route).toContain("Sign out and continue");
    expect(route).toContain("Signed in as");
    expect(route).toContain("wrong-account");
    expect(route).toContain("account that received this invite");
    expect(route).not.toContain("Invited email");
    expect(route).not.toContain("inviter_email");
    expect(route).not.toContain("Open project");
  });

  it("renders terminal invite states with generic contact recovery copy", () => {
    expect(route).toContain("Ask the sender for a new invite.");
    expect(route).not.toContain("Contact the sender at");
    expect(route).toContain('href="/contact"');
    expect(route).toContain("Contact Archestimator");
  });

  it("uses durable invite rate limits for resolve, continue, and accept paths", () => {
    const originGuardIndex = acceptRoute.indexOf("isAllowedInviteOrigin(request)");
    const currentUserIndex = acceptRoute.indexOf("const currentUser = await getCurrentUserContext()");
    const acceptRpcIndex = acceptRoute.indexOf("const { data } = await acceptInvitationTokenForUser");

    expect(route).toContain("checkInviteResolutionRateLimit");
    expect(route).toContain("headers()");
    expect(route).toContain("rate-limited");
    expect(route).toContain("Too many attempts.");

    expect(continueRoute).toContain("checkInviteContinueRateLimit");
    expect(continueRoute).toContain("NextResponse.json");
    expect(continueRoute).toContain('"Retry-After"');

    expect(acceptRoute).toContain("checkInviteAcceptRateLimit");
    expect(acceptRoute).toContain("getCurrentUserContext");
    expect(acceptRoute).toContain("acceptInvitationTokenForUser");
    expect(acceptRoute).toContain('clientInfo: "archestimator-invite-token-accept"');
    expect(acceptRoute).not.toContain("supabase.auth");
    expect(acceptRoute).not.toContain("createSupabaseServerClient");
    expect(originGuardIndex).toBeGreaterThan(-1);
    expect(currentUserIndex).toBeGreaterThan(originGuardIndex);
    expect(acceptRpcIndex).toBeGreaterThan(currentUserIndex);
    expect(acceptRoute).toContain("NextResponse.json");
    expect(acceptRoute).toContain('"Retry-After"');
    expect(signOutRoute).toContain("isAllowedInviteOrigin");
    expect(signOutRoute.indexOf("isAllowedInviteOrigin(request)")).toBeLessThan(signOutRoute.indexOf("const auth = await createCloudflareBetterAuthForRequest"));
  });

  it("keeps invite rate-limit IP hashing keyed by a server-only pepper", () => {
    expect(inviteEntry).toContain('createHmac("sha256", readInviteRateLimitHashPepper())');
    expect(inviteEntry).toContain("ARCHESTIMATOR_INVITE_RATE_LIMIT_HASH_PEPPER");
    expect(inviteEntry).toContain("getAiAuditD1Database");
    expect(inviteEntry).toContain("recordSecurityRateLimitEventInD1");
    expect(inviteEntry).not.toMatch(/@supabase\/supabase-js|SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_URL|createClient<Database>/);
    expect(inviteEntry).not.toContain('createHash("sha256").update(getClientIp(headers))');
  });
});
