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

  it("points the sidebar Settings item at the settings route", () => {
    expect(read("src/components/sidebar/MainSidebar.tsx")).toMatch(
      /href:\s*["']\/workshop\/settings["']/,
    );
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
