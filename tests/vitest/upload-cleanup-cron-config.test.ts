import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

type VercelCron = {
  path: string;
  schedule: string;
};

type VercelConfig = {
  crons?: VercelCron[];
};

type WranglerConfig = {
  main?: string;
  triggers?: {
    crons?: string[];
  };
};

const cleanupRoutePath = "/api/internal/upload-cleanup";
const scanRoutePath = "/api/internal/upload-scan";
const projectRoot = process.cwd();

function readVercelConfig() {
  return JSON.parse(readFileSync(join(projectRoot, "vercel.json"), "utf8")) as VercelConfig;
}

function readWranglerConfig() {
  return JSON.parse(readFileSync(join(projectRoot, "wrangler.jsonc"), "utf8")) as WranglerConfig;
}

describe("upload operations Vercel cron config", () => {
  it("registers the internal cleanup and scan routes as daily Vercel Cron jobs", () => {
    const config = readVercelConfig();
    const cleanupCron = config.crons?.find((cron) => cron.path === cleanupRoutePath);
    const scanCron = config.crons?.find((cron) => cron.path === scanRoutePath);

    expect(cleanupCron).toEqual({
      path: cleanupRoutePath,
      schedule: "0 3 * * *",
    });
    expect(scanCron).toEqual({
      path: scanRoutePath,
      schedule: "15 3 * * *",
    });
    expect(cleanupCron?.schedule.trim().split(/\s+/)).toHaveLength(5);
    expect(scanCron?.schedule.trim().split(/\s+/)).toHaveLength(5);
    expect(existsSync(join(projectRoot, "src/app/api/internal/upload-cleanup/route.ts"))).toBe(true);
    expect(existsSync(join(projectRoot, "src/app/api/internal/upload-scan/route.ts"))).toBe(true);
  });

  it("mirrors the upload operation schedules in the Cloudflare proof worker", () => {
    const vercelConfig = readVercelConfig();
    const wranglerConfig = readWranglerConfig();
    const cleanupCron = vercelConfig.crons?.find((cron) => cron.path === cleanupRoutePath);
    const scanCron = vercelConfig.crons?.find((cron) => cron.path === scanRoutePath);

    expect(wranglerConfig.main).toBe("worker.ts");
    expect(wranglerConfig.triggers?.crons).toEqual([
      cleanupCron?.schedule,
      scanCron?.schedule,
    ]);
    expect(existsSync(join(projectRoot, "worker.ts"))).toBe(true);
    expect(existsSync(join(projectRoot, "src/lib/cloudflare/scheduled-upload-jobs.ts"))).toBe(true);
  });

  it("keeps scheduled upload operation paths bound to CRON_SECRET readiness", () => {
    const routeSource = readFileSync(join(projectRoot, "src/app/api/internal/upload-cleanup/route.ts"), "utf8");
    const scanRouteSource = readFileSync(join(projectRoot, "src/app/api/internal/upload-scan/route.ts"), "utf8");
    const readinessSource = readFileSync(join(projectRoot, "scripts/check-vercel-env-readiness.ts"), "utf8");
    const cloudflareSchedulerSource = readFileSync(join(projectRoot, "src/lib/cloudflare/scheduled-upload-jobs.ts"), "utf8");

    expect(routeSource).toContain("process.env.CRON_SECRET");
    expect(routeSource).toContain('export const dynamic = "force-dynamic"');
    expect(scanRouteSource).toContain("process.env.CRON_SECRET");
    expect(scanRouteSource).toContain('export const dynamic = "force-dynamic"');
    expect(readinessSource).toContain('"CRON_SECRET"');
    expect(cloudflareSchedulerSource).toContain("CRON_SECRET");
    expect(cloudflareSchedulerSource).toContain("UPLOAD_CLEANUP_JOB_SECRET");
    expect(cloudflareSchedulerSource).toContain("UPLOAD_SCAN_JOB_SECRET");
  });
});
