import { describe, expect, it } from "vitest";

import {
  checkVercelEnvReadiness,
  extractVercelEnvNames,
} from "@/../scripts/check-vercel-env-readiness";

describe("Vercel env readiness checker", () => {
  it("extracts only env-like names from Vercel env transcripts", () => {
    expect(extractVercelEnvNames("NEXT_PUBLIC_APP_URL production added\nNo Environment Variables found")).toEqual([
      "NEXT_PUBLIC_APP_URL",
    ]);
  });

  it("fails closed when Vercel reports no environment variables", () => {
    const result = checkVercelEnvReadiness("No Environment Variables found for philipjonlewis-projects/archestimator");

    expect(result.discoveredNames).toEqual([]);
    expect(result.vercelEnvReady).toBe(false);
    expect(result.coreClosedBetaRuntime.missing).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(result.coreClosedBetaRuntime.missing).toContain("CLOSED_BETA_ACCESS_ENABLED");
    expect(result.note).toContain("does not read or prove secret values");
  });

  it("passes core readiness when all closed-beta runtime names are present", () => {
    const transcript = [
      "NEXT_PUBLIC_APP_URL",
      "NEXT_PUBLIC_SITE_URL",
      "ARCHESTIMATOR_ALLOWED_APP_ORIGINS",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "CLOSED_BETA_ACCESS_ENABLED",
      "PUBLICATION_TOKEN_ENCRYPTION_SECRET",
      "PUBLICATION_TOKEN_HASH_SECRET",
      "PUBLICATION_ACCESS_COOKIE_SECRET",
      "ARCHESTIMATOR_AI_ENABLED",
      "NEXT_PUBLIC_ASK_FLIP_UI_ENABLED",
    ].join("\n");

    const result = checkVercelEnvReadiness(transcript);

    expect(result.coreClosedBetaRuntime.ready).toBe(true);
    expect(result.vercelEnvReady).toBe(true);
    expect(result.emailDelivery.ready).toBe(false);
    expect(result.inviteDelivery.ready).toBe(false);
  });

  it("tracks email and invite delivery readiness separately", () => {
    const transcript = [
      "RESEND_API_KEY",
      "RESEND_FROM",
      "RESEND_REPLY_TO",
      "RESEND_WEBHOOK_SECRET",
      "PROJECT_INVITE_ENTRY_ENABLED",
      "ARCHESTIMATOR_INVITE_TOKEN_PEPPER",
    ].join("\n");

    const result = checkVercelEnvReadiness(transcript);

    expect(result.emailDelivery.ready).toBe(true);
    expect(result.inviteDelivery.ready).toBe(true);
    expect(result.vercelEnvReady).toBe(false);
  });
});
