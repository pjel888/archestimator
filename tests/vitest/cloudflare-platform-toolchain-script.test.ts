import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCloudflarePlatformToolchainReport,
  writeMarkdown,
} from "../../scripts/check-cloudflare-platform-toolchain";

const SCHEMA = {
  $ref: "#/definitions/RawConfig",
  definitions: {
    RawConfig: {
      properties: {
        $schema: {},
        name: {},
        main: {},
        compatibility_date: {},
        compatibility_flags: {},
        assets: {},
        images: {},
        r2_buckets: {},
        d1_databases: {},
        queues: {},
        triggers: {},
        observability: {},
      },
    },
  },
};

const CONFIG = JSON.stringify({
  $schema: "./node_modules/wrangler/config-schema.json",
  name: "archestimator-proof",
  main: "worker.ts",
  compatibility_date: "2026-06-29",
  compatibility_flags: ["nodejs_compat"],
  assets: { binding: "ASSETS" },
  images: { binding: "IMAGES" },
  r2_buckets: [{ binding: "ARCH_UPLOADS_R2", bucket_name: "proof" }],
  d1_databases: [
    {
      binding: "ARCH_DB",
      database_name: "archestimator-proof-db",
      database_id: "00000000-0000-0000-0000-000000000000",
      preview_database_id: "00000000-0000-0000-0000-000000000000",
    },
  ],
  queues: {
    producers: [{ binding: "UPLOAD_JOBS_QUEUE", queue: "archestimator-upload-jobs" }],
    consumers: [{ queue: "archestimator-upload-jobs", dead_letter_queue: "archestimator-upload-jobs-dlq" }],
  },
  triggers: { crons: ["0 3 * * *"] },
  observability: {
    enabled: true,
    head_sampling_rate: 0.1,
    logs: {
      enabled: true,
      head_sampling_rate: 0.1,
      invocation_logs: true,
      persist: true,
    },
    traces: {
      enabled: true,
      head_sampling_rate: 0.05,
      persist: true,
    },
  },
});

const ENV_TYPES = `
interface __BaseEnv_CloudflareEnv {
  ARCH_DB: D1Database;
  ARCH_UPLOADS_R2: R2Bucket;
  IMAGES: ImagesBinding;
  ASSETS: Fetcher;
  UPLOAD_JOBS_QUEUE: Queue;
}
interface CloudflareEnv extends __BaseEnv_CloudflareEnv {}
// Runtime types generated with workerd@1.20260625.1 2026-06-29 nodejs_compat
`;

describe("Cloudflare platform toolchain checker", () => {
  it("marks the local toolchain ready when schema, config, and generated binding types align", () => {
    const report = buildCloudflarePlatformToolchainReport({
      generatedAt: "2026-06-30T00:00:00.000Z",
      packageVersions: {
        wrangler: "4.105.0",
        "@opennextjs/cloudflare": "1.20.1",
        "@cloudflare/workers-types": null,
        next: "16.2.6",
        typescript: "6.0.3",
      },
      wranglerConfigText: CONFIG,
      wranglerSchema: SCHEMA,
      envTypesText: ENV_TYPES,
    });

    expect(report.readiness.localToolchainSnapshotReady).toBe(true);
    expect(report.readiness.directWorkersTypesInstalled).toBe(false);
    expect(report.readiness.productionDeployReady).toBe(false);
    expect(report.wranglerConfig.configuredBindings).toEqual([
      "ARCH_DB",
      "ARCH_UPLOADS_R2",
      "ASSETS",
      "IMAGES",
      "UPLOAD_JOBS_QUEUE",
    ]);
    expect(report.wranglerConfig.observability).toMatchObject({
      configured: true,
      enabled: true,
      headSamplingRate: 0.1,
      logsEnabled: true,
      logsHeadSamplingRate: 0.1,
      logsInvocationLogs: true,
      logsPersist: true,
      tracesEnabled: true,
      tracesHeadSamplingRate: 0.05,
      tracesPersist: true,
    });
    expect(report.generatedTypes.allConfiguredBindingsTyped).toBe(true);
  });

  it("keeps readiness closed when config keys are unsupported by the installed schema", () => {
    const report = buildCloudflarePlatformToolchainReport({
      generatedAt: "2026-06-30T00:00:00.000Z",
      packageVersions: {
        wrangler: "4.105.0",
        "@opennextjs/cloudflare": "1.20.1",
      },
      wranglerConfigText: JSON.stringify({
        ...JSON.parse(CONFIG),
        unsupported_future_field: true,
      }),
      wranglerSchema: SCHEMA,
      envTypesText: ENV_TYPES,
    });

    expect(report.readiness.localToolchainSnapshotReady).toBe(false);
    expect(report.wranglerConfig.unsupportedKeys).toContain("unsupported_future_field");
  });

  it("keeps readiness closed when a configured binding is missing from generated types", () => {
    const report = buildCloudflarePlatformToolchainReport({
      generatedAt: "2026-06-30T00:00:00.000Z",
      packageVersions: {
        wrangler: "4.105.0",
        "@opennextjs/cloudflare": "1.20.1",
      },
      wranglerConfigText: CONFIG,
      wranglerSchema: SCHEMA,
      envTypesText: ENV_TYPES.replace("ARCH_UPLOADS_R2: R2Bucket;", ""),
    });

    expect(report.readiness.localToolchainSnapshotReady).toBe(false);
    expect(report.generatedTypes.bindingRows.find((row) => row.binding === "ARCH_UPLOADS_R2")).toMatchObject({
      presentInGeneratedTypes: false,
    });
  });

  it("writes markdown without leaking generated env type contents", () => {
    const report = buildCloudflarePlatformToolchainReport({
      generatedAt: "2026-06-30T00:00:00.000Z",
      packageVersions: {
        wrangler: "4.105.0",
        "@opennextjs/cloudflare": "1.20.1",
      },
      wranglerConfigText: CONFIG,
      wranglerSchema: SCHEMA,
      envTypesText: `${ENV_TYPES}\nSECRET_VALUE_SHOULD_NOT_PRINT: string;`,
    });
    const dir = mkdtempSync(join(tmpdir(), "cloudflare-toolchain-"));
    try {
      const file = join(dir, "toolchain.md");
      writeMarkdown(report, file);
      const markdown = readFileSync(file, "utf8");
      expect(markdown).toContain("Cloudflare Platform Toolchain Snapshot");
      expect(markdown).toContain("ARCH_UPLOADS_R2");
      expect(markdown).not.toContain("SECRET_VALUE_SHOULD_NOT_PRINT");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports the real repo toolchain without claiming production deployment readiness", () => {
    const report = buildCloudflarePlatformToolchainReport({
      generatedAt: "2026-06-30T00:00:00.000Z",
      packageVersions: {
        wrangler: JSON.parse(readFileSync("node_modules/wrangler/package.json", "utf8")).version,
        "@opennextjs/cloudflare": JSON.parse(
          readFileSync("node_modules/@opennextjs/cloudflare/package.json", "utf8"),
        ).version,
        "@cloudflare/workers-types": null,
        next: JSON.parse(readFileSync("node_modules/next/package.json", "utf8")).version,
        typescript: JSON.parse(readFileSync("node_modules/typescript/package.json", "utf8")).version,
      },
      wranglerConfigText: readFileSync("wrangler.jsonc", "utf8"),
      wranglerSchema: JSON.parse(readFileSync("node_modules/wrangler/config-schema.json", "utf8")),
      envTypesText: readFileSync("cloudflare-env.d.ts", "utf8"),
    });

    expect(report.readiness.localToolchainSnapshotReady).toBe(true);
    expect(report.readiness.productionDeployReady).toBe(false);
    expect(report.wranglerConfig.observabilityConfigured).toBe(true);
    expect(report.wranglerConfig.observability).toMatchObject({
      configured: true,
      enabled: true,
      headSamplingRate: 0.1,
      logsEnabled: true,
      logsHeadSamplingRate: 0.1,
      logsInvocationLogs: true,
      logsPersist: true,
      tracesEnabled: true,
      tracesHeadSamplingRate: 0.05,
      tracesPersist: true,
    });
    expect(report.generatedTypes.bindingRows.map((row) => row.binding)).toEqual([
      "ARCH_DB",
      "ARCH_UPLOADS_R2",
      "ASSETS",
      "COLLAB_ROOMS",
      "IMAGES",
      "UPLOAD_JOBS_QUEUE",
    ]);
  });
});
