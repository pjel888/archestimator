import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  getUserOnboardingProfileFromD1,
  getWorkspaceAccountSettingsFromD1,
  upsertUserOnboardingProfileInD1,
  upsertWorkspaceAccountSettingsInD1,
} from "@/lib/auth/account-settings-d1-store";

type StoredRow = Record<string, string | null>;

class FakeD1Statement {
  private values: unknown[] = [];

  constructor(
    private readonly database: FakeD1Database,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async first<R>() {
    const normalizedSql = this.sql.toLowerCase();
    if (normalizedSql.includes("from user_onboarding_profiles")) {
      return (this.database.userProfiles.get(String(this.values[0])) ?? null) as R | null;
    }
    if (normalizedSql.includes("from workspace_account_settings")) {
      return (this.database.workspaceSettings.get(String(this.values[0])) ?? null) as R | null;
    }
    return null;
  }

  async all<R>() {
    return { results: [] as R[] };
  }

  async run() {
    const normalizedSql = this.sql.toLowerCase();
    if (normalizedSql.includes("insert into user_onboarding_profiles")) {
      const [
        userId,
        displayName,
        userCategory,
        countryRegion,
        primaryUse,
        studentEducatorDetail,
        marketingConsentAt,
        onboardingCompletedAt,
        createdAt,
        updatedAt,
      ] = this.values;
      const existing = this.database.userProfiles.get(String(userId));
      this.database.userProfiles.set(String(userId), {
        country_region: String(countryRegion),
        created_at: existing?.created_at ?? String(createdAt),
        display_name: String(displayName),
        marketing_consent_at: marketingConsentAt as string | null,
        onboarding_completed_at: onboardingCompletedAt as string | null ?? existing?.onboarding_completed_at ?? null,
        primary_use: primaryUse as string | null,
        student_educator_detail: studentEducatorDetail as string | null,
        updated_at: String(updatedAt),
        user_category: String(userCategory),
      });
    }
    if (normalizedSql.includes("insert into workspace_account_settings")) {
      const [
        workspaceId,
        organizationName,
        organizationType,
        countryRegion,
        companySize,
        defaultCurrency,
        primaryUse,
        createdAt,
        updatedAt,
      ] = this.values;
      const existing = this.database.workspaceSettings.get(String(workspaceId));
      this.database.workspaceSettings.set(String(workspaceId), {
        company_size: companySize as string | null,
        country_region: String(countryRegion),
        created_at: existing?.created_at ?? String(createdAt),
        default_currency: String(defaultCurrency),
        organization_name: String(organizationName),
        organization_type: String(organizationType),
        primary_use: primaryUse as string | null,
        updated_at: String(updatedAt),
      });
    }
    return { success: true, meta: { changes: 1 } };
  }
}

class FakeD1Database {
  userProfiles = new Map<string, StoredRow>();
  workspaceSettings = new Map<string, StoredRow>();

  prepare(sql: string) {
    return new FakeD1Statement(this, sql);
  }
}

describe("Cloudflare D1 account settings store", () => {
  it("upserts and reads user onboarding profiles without clearing completion time", async () => {
    const database = new FakeD1Database();

    await upsertUserOnboardingProfileInD1(database, {
      completed: true,
      userId: "user-1",
      profile: {
        country_region: "PH",
        display_name: "Philip",
        marketing_consent_at: null,
        primary_use: "project_estimating",
        student_educator_detail: null,
        user_category: "architect",
      },
    });
    const firstCompletedAt = database.userProfiles.get("user-1")?.onboarding_completed_at;

    await upsertUserOnboardingProfileInD1(database, {
      completed: false,
      userId: "user-1",
      profile: {
        country_region: "PH",
        display_name: "Philip L.",
        marketing_consent_at: null,
        primary_use: "cost_library",
        student_educator_detail: null,
        user_category: "contractor",
      },
    });

    await expect(getUserOnboardingProfileFromD1(database, "user-1")).resolves.toEqual({
      country_region: "PH",
      display_name: "Philip L.",
      marketing_consent_at: null,
      primary_use: "cost_library",
      student_educator_detail: null,
      user_category: "contractor",
    });
    expect(database.userProfiles.get("user-1")?.onboarding_completed_at).toBe(firstCompletedAt);
  });

  it("upserts and reads workspace account settings", async () => {
    const database = new FakeD1Database();

    await upsertWorkspaceAccountSettingsInD1(database, {
      workspaceId: "workspace-1",
      workspace: {
        company_size: "2_10",
        country_region: "PH",
        default_currency: "PHP",
        organization_name: "Studio",
        organization_type: "architecture_design",
        primary_use: "proposal_packages",
      },
    });

    await expect(getWorkspaceAccountSettingsFromD1(database, "workspace-1")).resolves.toEqual({
      company_size: "2_10",
      country_region: "PH",
      default_currency: "PHP",
      organization_name: "Studio",
      organization_type: "architecture_design",
      primary_use: "proposal_packages",
    });
  });

  it("keeps account settings persistence off Supabase service-role clients", () => {
    const actionsSource = readFileSync("src/lib/auth/account-actions.ts", "utf8");
    const storeSource = readFileSync("src/lib/auth/account-settings-d1-store.ts", "utf8");

    expect(actionsSource).toContain("upsertUserOnboardingProfileInD1");
    expect(actionsSource).toContain("upsertWorkspaceAccountSettingsInD1");
    expect(actionsSource).toContain("getCloudflareD1Database");
    expect(storeSource).toContain("getCloudflareD1Database");
    expect(`${actionsSource}\n${storeSource}`).not.toMatch(
      /account-service-role|createAccountServiceRoleClient|createSupabaseServerClient|SUPABASE_SERVICE_ROLE_KEY|@supabase\/supabase-js/,
    );
  });
});
