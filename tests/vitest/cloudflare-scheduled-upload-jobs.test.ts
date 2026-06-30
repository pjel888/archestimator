import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  CLOUDFLARE_UPLOAD_CLEANUP_CRON,
  CLOUDFLARE_UPLOAD_SCAN_CRON,
  getCloudflareScheduledUploadJobsForCron,
  runCloudflareScheduledUploadJobs,
} from "@/lib/cloudflare/scheduled-upload-jobs";

type WranglerConfig = {
  main?: string;
  triggers?: {
    crons?: string[];
  };
};

type VercelConfig = {
  crons?: Array<{
    path: string;
    schedule: string;
  }>;
};

function readJson<T>(path: string) {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

describe("Cloudflare scheduled upload jobs", () => {
  it("keeps Wrangler cron triggers aligned with the existing Vercel upload job schedules", () => {
    const wranglerConfig = readJson<WranglerConfig>("wrangler.jsonc");
    const vercelConfig = readJson<VercelConfig>("vercel.json");

    expect(wranglerConfig.main).toBe("worker.ts");
    expect(wranglerConfig.triggers?.crons).toEqual([
      CLOUDFLARE_UPLOAD_CLEANUP_CRON,
      CLOUDFLARE_UPLOAD_SCAN_CRON,
    ]);
    expect(vercelConfig.crons?.find((cron) => cron.path === "/api/internal/upload-cleanup")?.schedule)
      .toBe(CLOUDFLARE_UPLOAD_CLEANUP_CRON);
    expect(vercelConfig.crons?.find((cron) => cron.path === "/api/internal/upload-scan")?.schedule)
      .toBe(CLOUDFLARE_UPLOAD_SCAN_CRON);
  });

  it("wraps the generated OpenNext worker with a scheduled handler", () => {
    const source = readFileSync("worker.ts", "utf8");

    expect(source).toContain('import generatedOpenNextWorker from "./.open-next/worker.js";');
    expect(source).toContain("scheduled(controller");
    expect(source).toContain("runCloudflareScheduledUploadJobs");
    expect(source).toContain("queue(batch");
    expect(source).toContain("runCloudflareUploadJobQueueBatch");
    expect(source).toContain("openNextWorker.fetch(request, env, ctx)");
    expect(source).toContain("export { BucketCachePurge, DOQueueHandler, DOShardedTagCache }");
  });

  it("maps each configured cron expression to the expected upload job", () => {
    expect(getCloudflareScheduledUploadJobsForCron(CLOUDFLARE_UPLOAD_CLEANUP_CRON)).toEqual([
      expect.objectContaining({
        name: "upload-cleanup",
        path: "/api/internal/upload-cleanup",
      }),
    ]);
    expect(getCloudflareScheduledUploadJobsForCron(CLOUDFLARE_UPLOAD_SCAN_CRON)).toEqual([
      expect.objectContaining({
        name: "upload-scan",
        path: "/api/internal/upload-scan",
      }),
    ]);
  });

  it("invokes the cleanup route as an authenticated Cloudflare dry run by default", async () => {
    const requests: Request[] = [];
    const summary = await runCloudflareScheduledUploadJobs({
      cron: CLOUDFLARE_UPLOAD_CLEANUP_CRON,
      env: {
        CRON_SECRET: "cron-secret",
        CLOUDFLARE_UPLOAD_JOBS_ORIGIN: "https://proof.archestimator.test",
      },
      fetcher: async (request) => {
        requests.push(request);
        return Response.json({ ok: true });
      },
    });

    expect(summary).toEqual({
      cron: CLOUDFLARE_UPLOAD_CLEANUP_CRON,
      dryRun: true,
      executed: [{
        name: "upload-cleanup",
        path: "/api/internal/upload-cleanup",
        status: 200,
        ok: true,
      }],
      skipped: [],
    });
    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe("POST");
    expect(requests[0].headers.get("authorization")).toBe("Bearer cron-secret");
    expect(requests[0].headers.get("x-archestimator-scheduled-source")).toBe("cloudflare-cron");
    expect(requests[0].url).toBe("https://proof.archestimator.test/api/internal/upload-cleanup?limit=100&dryRun=1");
  });

  it("uses route-specific secrets and live mode only when both live controls are explicit", async () => {
    const requests: Request[] = [];
    const summary = await runCloudflareScheduledUploadJobs({
      cron: CLOUDFLARE_UPLOAD_SCAN_CRON,
      env: {
        CRON_SECRET: "shared-secret",
        UPLOAD_JOBS_ENABLED: "1",
        UPLOAD_SCAN_JOB_SECRET: "scan-secret",
        CLOUDFLARE_UPLOAD_JOBS_DRY_RUN: "0",
      },
      fetcher: async (request) => {
        requests.push(request);
        return new Response(null, { status: 204 });
      },
    });

    expect(summary.dryRun).toBe(false);
    expect(summary.executed).toEqual([expect.objectContaining({
      name: "upload-scan",
      status: 204,
      ok: true,
    })]);
    expect(requests[0].headers.get("authorization")).toBe("Bearer scan-secret");
    expect(requests[0].url).toBe("https://archestimator.internal/api/internal/upload-scan?limit=100");
  });

  it("fails closed when a matched Cloudflare cron has no configured secret", async () => {
    const summary = await runCloudflareScheduledUploadJobs({
      cron: CLOUDFLARE_UPLOAD_CLEANUP_CRON,
      env: {},
      fetcher: async () => {
        throw new Error("fetcher should not be called");
      },
    });

    expect(summary.executed).toEqual([]);
    expect(summary.skipped).toEqual([{ name: "upload-cleanup", reason: "missing_secret" }]);
  });

  it("ignores unmatched Cloudflare cron expressions", async () => {
    const summary = await runCloudflareScheduledUploadJobs({
      cron: "5 4 * * *",
      env: { CRON_SECRET: "cron-secret" },
      fetcher: async () => {
        throw new Error("fetcher should not be called");
      },
    });

    expect(summary.executed).toEqual([]);
    expect(summary.skipped).toEqual([{ name: "unknown", reason: "unmatched_cron" }]);
  });
});
