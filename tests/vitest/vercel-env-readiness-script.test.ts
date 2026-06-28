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
    expect(result.scheduledJobs.missing).toContain("CRON_SECRET");
    expect(result.scheduledJobs.missing).toContain("UPLOAD_JOBS_ENABLED");
    expect(result.uploadOperationsAlerts.missing).toContain("UPLOAD_OPERATIONS_ALERT_WEBHOOK_URL");
    expect(result.hostedUploadRuntimeProof.missing).toContain("UPLOAD_RUNTIME_PROOF_SECRET");
    expect(result.hostedUploadRuntimeProof.missing).toContain("ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES");
    expect(result.liveUploadScanner.missing).toContain("UPLOAD_SCAN_PROVIDER");
    expect(result.liveUploadScanner.missing).toContain("UPLOAD_CLAMD_HOST");
    expect(result.uploadProductionProofReady).toBe(false);
    expect(result.note).toContain("does not read or prove secret values");
    expect(result.note).toContain("alert delivery");
    expect(result.note).toContain("live scanner reachability");
    expect(result.note).toContain("hosted runtime limits");
  });

  it("passes readiness when all closed-beta runtime and scheduled job names are present", () => {
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
      "CRON_SECRET",
      "UPLOAD_JOBS_ENABLED",
    ].join("\n");

    const result = checkVercelEnvReadiness(transcript);

    expect(result.coreClosedBetaRuntime.ready).toBe(true);
    expect(result.scheduledJobs.ready).toBe(true);
    expect(result.vercelEnvReady).toBe(true);
    expect(result.uploadProductionProofReady).toBe(false);
    expect(result.emailDelivery.ready).toBe(false);
    expect(result.inviteDelivery.ready).toBe(false);
    expect(result.uploadOperationsAlerts.ready).toBe(false);
  });

  it("fails overall readiness when scheduled job controls are missing", () => {
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
    expect(result.scheduledJobs.ready).toBe(false);
    expect(result.scheduledJobs.missing).toEqual(["CRON_SECRET", "UPLOAD_JOBS_ENABLED"]);
    expect(result.vercelEnvReady).toBe(false);
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
    expect(result.scheduledJobs.ready).toBe(false);
    expect(result.vercelEnvReady).toBe(false);
  });

  it("tracks upload operations alert readiness separately", () => {
    const transcript = [
      "UPLOAD_OPERATIONS_ALERTS_ENABLED",
      "UPLOAD_OPERATIONS_ALERT_WEBHOOK_URL",
      "UPLOAD_OPERATIONS_ALERT_WEBHOOK_TOKEN",
    ].join("\n");

    const result = checkVercelEnvReadiness(transcript);

    expect(result.uploadOperationsAlerts.ready).toBe(true);
    expect(result.uploadOperationsAlerts.missing).toEqual([]);
    expect(result.uploadProductionProofReady).toBe(false);
    expect(result.vercelEnvReady).toBe(false);
  });

  it("tracks hosted runtime proof readiness separately from general Vercel readiness", () => {
    const transcript = [
      "UPLOAD_RUNTIME_PROOF_SECRET",
      "ARCH_UPLOAD_HOSTED_MEMORY_MB",
      "ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES",
      "ARCH_UPLOAD_HOSTED_ROUTE_DURATION_MS",
      "ARCH_UPLOAD_HOSTED_CONCURRENT_UPLOADS",
      "ARCH_UPLOAD_STORAGE_LATENCY_P95_MS",
    ].join("\n");

    const result = checkVercelEnvReadiness(transcript);

    expect(result.hostedUploadRuntimeProof.ready).toBe(true);
    expect(result.hostedUploadRuntimeProof.missing).toEqual([]);
    expect(result.uploadProductionProofReady).toBe(false);
    expect(result.vercelEnvReady).toBe(false);
  });

  it("tracks live ClamD scanner readiness separately from general Vercel readiness", () => {
    const transcript = [
      "UPLOAD_SCAN_PROVIDER",
      "UPLOAD_CLAMD_HOST",
      "UPLOAD_CLAMD_PORT",
    ].join("\n");

    const result = checkVercelEnvReadiness(transcript);

    expect(result.liveUploadScanner.ready).toBe(true);
    expect(result.liveUploadScanner.missing).toEqual([]);
    expect(result.uploadProductionProofReady).toBe(false);
    expect(result.vercelEnvReady).toBe(false);
  });

  it("passes upload production proof preflight only when all upload proof env groups are present", () => {
    const transcript = [
      "CRON_SECRET",
      "UPLOAD_JOBS_ENABLED",
      "UPLOAD_OPERATIONS_ALERTS_ENABLED",
      "UPLOAD_OPERATIONS_ALERT_WEBHOOK_URL",
      "UPLOAD_OPERATIONS_ALERT_WEBHOOK_TOKEN",
      "UPLOAD_RUNTIME_PROOF_SECRET",
      "ARCH_UPLOAD_HOSTED_MEMORY_MB",
      "ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES",
      "ARCH_UPLOAD_HOSTED_ROUTE_DURATION_MS",
      "ARCH_UPLOAD_HOSTED_CONCURRENT_UPLOADS",
      "ARCH_UPLOAD_STORAGE_LATENCY_P95_MS",
      "UPLOAD_SCAN_PROVIDER",
      "UPLOAD_CLAMD_HOST",
      "UPLOAD_CLAMD_PORT",
    ].join("\n");

    const result = checkVercelEnvReadiness(transcript);

    expect(result.scheduledJobs.ready).toBe(true);
    expect(result.uploadOperationsAlerts.ready).toBe(true);
    expect(result.hostedUploadRuntimeProof.ready).toBe(true);
    expect(result.liveUploadScanner.ready).toBe(true);
    expect(result.uploadProductionProofReady).toBe(true);
    expect(result.vercelEnvReady).toBe(false);
  });
});
