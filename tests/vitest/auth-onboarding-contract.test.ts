import { describe, expect, it } from "vitest";

import {
  canManageWorkspaceAccountSettings,
  parseOnboardingSubmission,
  parseProfileSettingsSubmission,
  parseWorkspaceSettingsSubmission,
} from "@/lib/auth/account-data";

function form(entries: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

describe("auth onboarding contracts", () => {
  it("requires profile-owned and workspace-owned intake fields for self-serve users", () => {
    const parsed = parseOnboardingSubmission(
      form({
        profile_display_name: "Mara Santos",
        profile_user_category: "architect",
        profile_country_region: "PH",
        profile_primary_use: "learning",
        workspace_organization_name: "Santos Studio",
        workspace_organization_type: "architecture_design",
        workspace_country_region: "SG",
        workspace_primary_use: "project_estimating",
      }),
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.profile.display_name).toBe("Mara Santos");
    expect(parsed.profile.user_category).toBe("architect");
    expect(parsed.profile.country_region).toBe("PH");
    expect(parsed.profile.primary_use).toBe("learning");
    expect(parsed.workspace?.organization_name).toBe("Santos Studio");
    expect(parsed.workspace?.organization_type).toBe("architecture_design");
    expect(parsed.workspace?.country_region).toBe("SG");
    expect(parsed.workspace?.primary_use).toBe("project_estimating");
  });

  it("does not create an organization workspace just for invited collaborators", () => {
    const parsed = parseOnboardingSubmission(
      form({
        profile_display_name: "Pat Reviewer",
        profile_user_category: "engineer",
        profile_country_region: "PH",
      }),
      { invitedCollaborator: true },
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.workspace).toBeNull();
    expect(parsed.profile.display_name).toBe("Pat Reviewer");
  });

  it("does not trust a client-provided invited collaborator flag", () => {
    const parsed = parseOnboardingSubmission(
      form({
        invited_collaborator: "1",
        profile_display_name: "Pat Reviewer",
        profile_user_category: "engineer",
        profile_country_region: "PH",
      }),
      { invitedCollaborator: false },
    );

    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.fieldErrors).toEqual(
      expect.objectContaining({
        workspace_organization_name: "Required",
        workspace_organization_type: "Required",
      }),
    );
  });

  it("reports compact field errors for incomplete intake resume", () => {
    const parsed = parseOnboardingSubmission(form({ profile_display_name: "" }));

    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.fieldErrors).toEqual(
      expect.objectContaining({
        profile_display_name: "Required",
        profile_user_category: "Required",
        profile_country_region: "Required",
        workspace_organization_name: "Required",
        workspace_organization_type: "Required",
      }),
    );
  });

  it("enforces shared max lengths for intake text fields", () => {
    const parsed = parseOnboardingSubmission(
      form({
        profile_display_name: "N".repeat(121),
        profile_user_category: "architect",
        profile_country_region: "P".repeat(81),
        profile_student_educator_detail: "S".repeat(161),
        workspace_organization_name: "O".repeat(161),
        workspace_organization_type: "architecture_design",
        workspace_country_region: "W".repeat(81),
      }),
    );

    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.fieldErrors).toEqual(
      expect.objectContaining({
        profile_display_name: "Use 120 characters or fewer",
        profile_country_region: "Use 80 characters or fewer",
        profile_student_educator_detail: "Use 160 characters or fewer",
        workspace_organization_name: "Use 160 characters or fewer",
        workspace_country_region: "Use 80 characters or fewer",
      }),
    );
  });
});

describe("auth settings contracts", () => {
  it("keeps profile settings profile-owned", () => {
    const parsed = parseProfileSettingsSubmission(
      form({
        display_name: "Updated Name",
        user_category: "quantity_surveyor",
        country_region: "SG",
        primary_use: "cost_library",
      }),
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.profile).toEqual({
      display_name: "Updated Name",
      user_category: "quantity_surveyor",
      country_region: "SG",
      primary_use: "cost_library",
      student_educator_detail: null,
      marketing_consent_at: null,
    });
  });

  it("ignores forged marketing consent while legal consent records are not launch-ready", () => {
    const parsed = parseProfileSettingsSubmission(
      form({
        display_name: "Updated Name",
        user_category: "architect",
        country_region: "PH",
        marketing_consent: "1",
      }),
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.profile.marketing_consent_at).toBeNull();
  });

  it("allows only owners and admins to edit workspace account settings", () => {
    expect(canManageWorkspaceAccountSettings("owner")).toBe(true);
    expect(canManageWorkspaceAccountSettings("admin")).toBe(true);
    expect(canManageWorkspaceAccountSettings("member")).toBe(false);
    expect(canManageWorkspaceAccountSettings("viewer")).toBe(false);
  });

  it("keeps workspace settings workspace-owned", () => {
    const parsed = parseWorkspaceSettingsSubmission(
      form({
        organization_name: "Build Lab",
        organization_type: "construction_contractor",
        country_region: "PH",
        company_size: "2_10",
        default_currency: "php",
        primary_use: "project_estimating",
      }),
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.workspace).toEqual({
      organization_name: "Build Lab",
      organization_type: "construction_contractor",
      country_region: "PH",
      company_size: "2_10",
      default_currency: "PHP",
      primary_use: "project_estimating",
    });
  });
});
