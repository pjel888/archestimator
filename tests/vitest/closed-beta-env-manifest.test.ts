import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const envExample = readFileSync(".env.example", "utf8");
const cloudflarePlanDir = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex";
const postCutoverLedger = readFileSync(`${cloudflarePlanDir}/33_POST_CUTOVER_FULL_APP_QA_LEDGER.md`, "utf8");
const providerExitRunbook = readFileSync(`${cloudflarePlanDir}/35_PROVIDER_EXIT_AND_FINAL_PROOF_RUNBOOK.md`, "utf8");
const handoff = readFileSync(`${cloudflarePlanDir}/37_GLM52_CLOUDFLARE_MIGRATION_HANDOFF.md`, "utf8");

const requiredEnvVars = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SITE_URL",
  "ARCHESTIMATOR_ALLOWED_APP_ORIGINS",
  "ARCHESTIMATOR_AUTH_PROVIDER",
  "BETTER_AUTH_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_TRUSTED_ORIGINS",
  "BETTER_AUTH_GOOGLE_CLIENT_ID",
  "BETTER_AUTH_GOOGLE_CLIENT_SECRET",
  "CLOSED_BETA_ACCESS_ENABLED",
  "PROJECT_INVITE_ENTRY_ENABLED",
  "ARCHESTIMATOR_INVITE_TOKEN_PEPPER",
  "PUBLICATION_TOKEN_ENCRYPTION_SECRET",
  "PUBLICATION_TOKEN_HASH_SECRET",
  "PUBLICATION_ACCESS_COOKIE_SECRET",
  "ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED",
  "ARCHESTIMATOR_EMAIL_PROVIDER",
  "CLOUDFLARE_EMAIL_FROM",
  "CLOUDFLARE_EMAIL_REPLY_TO",
  "ARCHESTIMATOR_AI_ENABLED",
  "NEXT_PUBLIC_ASK_FLIP_UI_ENABLED",
  "ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER",
  "ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER",
  "CRON_SECRET",
  "UPLOAD_CLEANUP_JOB_SECRET",
  "UPLOAD_SCAN_JOB_SECRET",
  "UPLOAD_JOBS_ENABLED",
  "CLOUDFLARE_UPLOAD_JOBS_DRY_RUN",
  "CLOUDFLARE_UPLOAD_JOBS_ORIGIN",
  "NEXT_PUBLIC_GA_MEASUREMENT_ID",
  "NEXT_PUBLIC_CLARITY_PROJECT_ID",
  "NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN",
  "ARCHESTIMATOR_E2E_ROUTE_ERROR_SMOKE",
  "DATABASE_URL",
] as const;

const optionalEnvVars = [
  "ARCHESTIMATOR_TERMS_GATE_SECRET",
  "ARCHESTIMATOR_DEV_AUTH_BYPASS",
  "ARCHESTIMATOR_DEV_AUTH_ADMIN_DB",
  "ARCHESTIMATOR_DEV_AUTH_EMAIL",
  "ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET",
  "ARCHESTIMATOR_INVITE_RATE_LIMIT_HASH_PEPPER",
  "DEEPSEEK_API_KEY",
  "NEXT_PUBLIC_TREE_VIRTUALIZATION",
  "NEXT_PUBLIC_EMC_VIRTUALIZATION",
  "NEXT_PUBLIC_ESTIMATE_ROW_VIRTUALIZATION",
  "NEXT_PUBLIC_ESTIMATE_COLUMN_RESIZE_ENABLED",
  "GOOGLE_MAPS_API_KEY",
  "GOOGLE_MAPS_MAP_ID",
  "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
  "NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID",
] as const;

describe("closed beta env manifest", () => {
  it("documents every launch-runtime env var in .env.example", () => {
    for (const envVar of requiredEnvVars) {
      expect(envExample).toMatch(new RegExp(`^${envVar}=`, "m"));
    }
  });

  it("documents optional provider and feature-flag env names found in local/runtime usage", () => {
    for (const envVar of optionalEnvVars) {
      expect(envExample).toMatch(new RegExp(`^${envVar}=`, "m"));
    }
  });

  it("keeps closed-beta runtime defaults conservative", () => {
    expect(envExample).toContain("CLOSED_BETA_ACCESS_ENABLED=false");
    expect(envExample).toContain("PROJECT_INVITE_ENTRY_ENABLED=false");
    expect(envExample).toContain("ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=false");
    expect(envExample).toContain("ARCHESTIMATOR_EMAIL_PROVIDER=cloudflare-email");
    expect(envExample).toContain("ARCHESTIMATOR_AI_ENABLED=false");
    expect(envExample).toContain("NEXT_PUBLIC_ASK_FLIP_UI_ENABLED=false");
    expect(envExample).toContain("ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER=cloudflare-r2");
    expect(envExample).toMatch(/Use Cloudflare Email/i);
    expect(envExample).toMatch(/Never commit real secrets/i);
    expect(envExample).not.toMatch(/^NEXT_PUBLIC_SUPABASE_URL=/m);
    expect(envExample).not.toMatch(/^SUPABASE_SERVICE_ROLE_KEY=/m);
    expect(envExample).not.toMatch(/^RESEND_API_KEY=/m);
  });

  it("keeps current Cloudflare migration docs aligned with the active provider posture", () => {
    expect(postCutoverLedger).toMatch(/Better Auth/i);
    expect(postCutoverLedger).toMatch(/Cloudflare Email/i);
    expect(postCutoverLedger).toMatch(/CLOSED_BETA_ACCESS_ENABLED=true/i);
    expect(providerExitRunbook).toMatch(/Resend account\/API-key\/domain status/i);
    expect(handoff).toMatch(/Supabase\/Vercel\/Resend are no longer active runtime dependencies/i);
  });
});
