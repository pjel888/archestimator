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

const cleanupRoutePath = "/api/internal/upload-cleanup";
const scanRoutePath = "/api/internal/upload-scan";
const projectRoot = process.cwd();

function readVercelConfig() {
  return JSON.parse(readFileSync(join(projectRoot, "vercel.json"), "utf8")) as VercelConfig;
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

  it("keeps scheduled upload operation paths bound to CRON_SECRET readiness", () => {
    const routeSource = readFileSync(join(projectRoot, "src/app/api/internal/upload-cleanup/route.ts"), "utf8");
    const scanRouteSource = readFileSync(join(projectRoot, "src/app/api/internal/upload-scan/route.ts"), "utf8");
    const readinessSource = readFileSync(join(projectRoot, "scripts/check-vercel-env-readiness.ts"), "utf8");

    expect(routeSource).toContain("process.env.CRON_SECRET");
    expect(routeSource).toContain('export const dynamic = "force-dynamic"');
    expect(scanRouteSource).toContain("process.env.CRON_SECRET");
    expect(scanRouteSource).toContain('export const dynamic = "force-dynamic"');
    expect(readinessSource).toContain('"CRON_SECRET"');
  });
});
