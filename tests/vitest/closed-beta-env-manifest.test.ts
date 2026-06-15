import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const envExample = readFileSync(".env.example", "utf8");
const launchReadinessPlanDir = existsSync(".ai/03_plans/mvp-launch-readiness-2026-06-01")
  ? ".ai/03_plans/mvp-launch-readiness-2026-06-01"
  : ".ai/09_archive/mvp-launch-readiness-2026-06-01";
const infraPlan = readFileSync(
  `${launchReadinessPlanDir}/22-infrastructure-vercel-supabase-resend-plan.md`,
  "utf8",
);
const operationsRunbook = readFileSync(
  `${launchReadinessPlanDir}/40-closed-beta-operations-runbook.md`,
  "utf8",
);

const requiredEnvVars = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SITE_URL",
  "ARCHESTIMATOR_ALLOWED_APP_ORIGINS",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CLOSED_BETA_ACCESS_ENABLED",
  "PROJECT_INVITE_ENTRY_ENABLED",
  "ARCHESTIMATOR_INVITE_TOKEN_PEPPER",
  "PUBLICATION_TOKEN_ENCRYPTION_SECRET",
  "PUBLICATION_TOKEN_HASH_SECRET",
  "PUBLICATION_ACCESS_COOKIE_SECRET",
  "ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "RESEND_REPLY_TO",
  "RESEND_WEBHOOK_SECRET",
  "ARCHESTIMATOR_AI_ENABLED",
  "NEXT_PUBLIC_ASK_FLIP_UI_ENABLED",
  "NEXT_PUBLIC_GA_MEASUREMENT_ID",
  "NEXT_PUBLIC_CLARITY_PROJECT_ID",
  "ARCHESTIMATOR_E2E_ROUTE_ERROR_SMOKE",
  "RUN_SUPABASE_INTEGRATION",
  "DATABASE_URL",
] as const;

describe("closed beta env manifest", () => {
  it("documents every launch-runtime env var in .env.example", () => {
    for (const envVar of requiredEnvVars) {
      expect(envExample).toMatch(new RegExp(`^${envVar}=`, "m"));
    }
  });

  it("keeps closed-beta runtime defaults conservative", () => {
    expect(envExample).toContain("CLOSED_BETA_ACCESS_ENABLED=false");
    expect(envExample).toContain("PROJECT_INVITE_ENTRY_ENABLED=false");
    expect(envExample).toContain("ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=false");
    expect(envExample).toContain("ARCHESTIMATOR_AI_ENABLED=false");
    expect(envExample).toContain("NEXT_PUBLIC_ASK_FLIP_UI_ENABLED=false");
    expect(envExample).toMatch(/Resend is optional for manual beta invites/i);
    expect(envExample).toMatch(/Never commit real Supabase secrets/i);
  });

  it("keeps infrastructure docs aligned with the env manifest and manual beta invite posture", () => {
    for (const envVar of requiredEnvVars) {
      expect(infraPlan).toContain(`\`${envVar}\``);
    }
    expect(infraPlan).toMatch(/Manual beta invites can proceed without Resend/i);
    expect(operationsRunbook).toMatch(/Manual beta invites can continue through Philip's email/i);
    expect(operationsRunbook).toContain("feedback-smtp.ap-northeast-1.amazonses.com");
    expect(operationsRunbook).toContain("v=spf1 include:amazonses.com ~all");
    expect(operationsRunbook).toMatch(/CLOSED_BETA_ACCESS_ENABLED=true/i);
  });
});
