import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("/invite/[token] route contract", () => {
  const route = readFileSync("src/app/invite/[token]/page.tsx", "utf8");
  const continueRoute = readFileSync("src/app/invite/[token]/continue/route.ts", "utf8");
  const acceptRoute = readFileSync("src/app/invite/[token]/accept/route.ts", "utf8");
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
    expect(continueRoute).toContain('next=${encodeURIComponent("/workshop")}');
    expect(continueRoute).toContain("export async function GET");
    expect(route).not.toContain("encodeURIComponent(`/invite/${rawToken}`)");
  });

  it("supports signed-in matching accept and wrong-account recovery", () => {
    expect(route).toContain("/accept");
    expect(route).toContain("/sign-out");
    expect(acceptRoute).toContain("accept_collaboration_invitation");
    expect(acceptRoute).toContain('acceptState !== "accepted" && acceptState !== "already_member"');
    expect(acceptRoute).toContain("export async function GET");
    expect(signOutRoute).toContain("supabase.auth.signOut");
    expect(route).toContain("Sign out and continue");
    expect(route).toContain("wrong-account");
    expect(route).toContain("Open project");
  });
});
