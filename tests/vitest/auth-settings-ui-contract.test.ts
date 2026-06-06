import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("auth onboarding and settings route contracts", () => {
  it("keeps stale onboarding traffic non-blocking and points users to settings", () => {
    const source = read("src/app/workshop/onboarding/page.tsx");

    expect(source).toContain('redirect("/workshop/settings")');
    expect(source).not.toMatch(/completeOnboarding/);
    expect(source).not.toMatch(/Complete setup/);
  });

  it("ships profile and workspace settings correction paths", () => {
    expect(existsSync(join(process.cwd(), "src/app/workshop/settings/profile/page.tsx"))).toBe(true);
    expect(existsSync(join(process.cwd(), "src/app/workshop/settings/workspace/page.tsx"))).toBe(true);

    expect(read("src/app/workshop/settings/profile/page.tsx")).toMatch(/updateProfileSettings/);
    expect(read("src/app/workshop/settings/workspace/page.tsx")).toMatch(/updateWorkspaceSettings/);
  });

  it("keeps settings as a discoverable hub for beta operations", () => {
    const source = read("src/components/workshop/WorkshopSettingsModalContent.tsx");
    const modalSource = read("src/components/workshop/WorkshopSettingsModal.tsx");
    const pageSource = read("src/app/workshop/settings/page.tsx");

    expect(source).toContain('aria-label="Settings sections"');
    expect(source).toContain("sm:grid-cols-[184px_minmax(0,1fr)]");
    expect(source).toContain('href: "/workshop/settings/profile"');
    expect(source).toContain('href: "/workshop/settings/workspace"');
    expect(source).toContain('href: "/workshop/feedback"');
    expect(source).toContain('href: "/terms"');
    expect(source).toContain('href: "/workshop/terms?next=%2Fworkshop%2Fsettings"');
    expect(source).toContain("Terms acceptance");
    expect(source).toContain("Support and legal");
    expect(source).toContain("support@archestimator.com");
    expect(source).toContain('href: "/workshop/settings/beta-users"');
    expect(source).toContain('href: "/workshop/settings/feedback"');
    expect(source).toContain('import { signOut } from "@/lib/auth/actions"');
    expect(source).toContain("action={signOut}");
    expect(source).toContain("Sign out");
    expect(modalSource).toContain('className="max-w-[760px]"');
    expect(pageSource).toContain('context.role === "ceo" || context.role === "admin"');
    expect(pageSource).toContain('trigger="none"');
    expect(pageSource).toContain("initialOpen");
    expect(pageSource).not.toContain("SettingsLinkCard");
    expect(pageSource).not.toContain('redirect("/workshop/settings/profile")');
  });

  it("moves settings out of the sidebar and into the workshop header modal", () => {
    const sidebarSource = read("src/components/sidebar/MainSidebar.tsx");
    const shellSource = read("src/components/workshop/WorkshopPageShell.tsx");

    expect(sidebarSource).not.toMatch(/href:\s*["']\/workshop\/settings["']/);
    expect(shellSource).toContain("WorkshopSettingsModal");
    expect(shellSource).toContain("WorkshopSettingsModalContent");
  });

  it("derives invited-collaborator onboarding mode server-side", () => {
    const source = read("src/lib/auth/account-actions.ts");

    expect(source).toContain("readFirstAccountWorkspaceMembership");
    expect(source).toContain("parseOnboardingSubmission(formData, { invitedCollaborator })");
    expect(source).not.toContain('getBooleanField(formData, "invited_collaborator")');
    expect(read("src/app/workshop/onboarding/page.tsx")).not.toContain('name="invited_collaborator"');
  });
});

describe("canonical auth routes", () => {
  it("keeps /login canonical and does not add /signup", () => {
    expect(existsSync(join(process.cwd(), "src/app/login/page.tsx"))).toBe(true);
    expect(existsSync(join(process.cwd(), "src/app/signup"))).toBe(false);
    expect(existsSync(join(process.cwd(), "src/app/sign-up"))).toBe(false);
    expect(existsSync(join(process.cwd(), "src/app/sign-in"))).toBe(false);
  });
});
