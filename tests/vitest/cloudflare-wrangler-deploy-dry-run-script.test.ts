import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCloudflareWranglerDeployDryRunReport,
  writeMarkdown,
} from "../../scripts/check-cloudflare-wrangler-deploy-dry-run";

const DRY_RUN_LOG = `
 ⛅️ wrangler 4.105.0
────────────────────
▲ [WARNING] Duplicate key "metadata" in object literal [duplicate-object-key]

    /Users/person/project/.open-next/server-functions/default/handler.mjs:1212:170010:

✨ Read 302 files from the assets directory /Users/person/project/.open-next/assets
Total Upload: 18738.50 KiB / gzip: 4103.11 KiB
Your Worker has access to the following bindings:
Binding                                                Resource
env.ARCH_UPLOADS_R2 (archestimator-proof-uploads)      R2 Bucket
env.ARCH_DB (archestimator-proof-db)                   D1 Database
env.COLLAB_ROOMS (CollaborationRoom)                   Durable Object
env.IMAGES                                             Images
env.ASSETS                                             Assets
env.UPLOAD_JOBS_QUEUE (archestimator-upload-jobs)      Queue
PUBLICATION_TOKEN_HASH_SECRET=do-not-print

--dry-run: exiting now.
`;

const METAFILE = JSON.stringify({
  inputs: {
    "worker.ts": {},
    ".open-next/worker.js": {},
  },
  outputs: {
    ".wrangler/tmp/cloudflare-deploy-dry-run/worker.js": { bytes: 18_000_000 },
    ".wrangler/tmp/cloudflare-deploy-dry-run/worker.js.map": { bytes: 26_000_000 },
  },
});

describe("Cloudflare Wrangler deploy dry-run evidence", () => {
  it("marks the dry-run ready when Wrangler exits before upload and required bindings are present", () => {
    const report = buildCloudflareWranglerDeployDryRunReport({
      generatedAt: "2026-06-30T00:00:00.000Z",
      exitCode: 0,
      logText: DRY_RUN_LOG,
      metafileText: METAFILE,
      bundleFiles: [{ file: ".wrangler/tmp/cloudflare-deploy-dry-run/worker.js", bytes: 18_000_000 }],
      repoRoot: "/Users/person/project",
    });

    expect(report.readiness.localWranglerDryRunReady).toBe(true);
    expect(report.readiness.productionDeployReady).toBe(false);
    expect(report.dryRun.assetFileCount).toBe(302);
    expect(report.dryRun.totalUploadKiB).toBe(18738.5);
    expect(report.dryRun.gzipUploadKiB).toBe(4103.11);
    expect(report.dryRun.warnings).toEqual([
      'Duplicate key "metadata" in object literal [duplicate-object-key]',
    ]);
    expect(report.dryRun.bindings.map((binding) => binding.binding)).toEqual([
      "ARCH_DB",
      "ARCH_UPLOADS_R2",
      "ASSETS",
      "COLLAB_ROOMS",
      "IMAGES",
      "UPLOAD_JOBS_QUEUE",
    ]);
    expect(report.bundle.inputCount).toBe(2);
    expect(report.bundle.outputCount).toBe(2);
    expect(report.bundle.metafileOutputBytes).toBe(44_000_000);
    expect(report.sanitizedLog.join("\n")).not.toContain("/Users/person/project");
    expect(report.sanitizedLog.join("\n")).not.toContain("do-not-print");
  });

  it("keeps readiness closed when the no-upload marker or a binding is missing", () => {
    const report = buildCloudflareWranglerDeployDryRunReport({
      exitCode: 0,
      logText: DRY_RUN_LOG.replace("--dry-run: exiting now.", "").replace(
        "env.IMAGES                                             Images",
        "",
      ),
      metafileText: METAFILE,
      repoRoot: "/Users/person/project",
    });

    expect(report.readiness.localWranglerDryRunReady).toBe(false);
    expect(report.dryRun.noUploadMarkerSeen).toBe(false);
    expect(report.dryRun.missingBindings).toEqual(["IMAGES"]);
  });

  it("writes markdown without leaking raw secret-looking values", () => {
    const report = buildCloudflareWranglerDeployDryRunReport({
      generatedAt: "2026-06-30T00:00:00.000Z",
      exitCode: 0,
      logText: DRY_RUN_LOG,
      metafileText: METAFILE,
      repoRoot: "/Users/person/project",
    });
    const dir = mkdtempSync(join(tmpdir(), "cloudflare-dry-run-"));
    try {
      const file = join(dir, "dry-run.md");
      writeMarkdown(report, file);
      const markdown = readFileSync(file, "utf8");
      expect(markdown).toContain("Cloudflare Wrangler Deploy Dry-Run");
      expect(markdown).toContain("Local Wrangler dry-run ready | yes");
      expect(markdown).not.toContain("do-not-print");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
