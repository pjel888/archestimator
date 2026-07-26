import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCloudflareD1RestoreRehearsal,
  writeMarkdown,
} from "../../scripts/generate-cloudflare-d1-restore-rehearsal";

describe("Cloudflare D1 restore rehearsal", () => {
  it("proves a local SQL export/import round trip while keeping hosted proof explicit", () => {
    const report = buildCloudflareD1RestoreRehearsal({
      generatedAt: "2026-06-30T00:00:00.000Z",
    });

    expect(report.mode).toBe("cloudflare-d1-restore-rehearsal");
    expect(report.d1ExportReady).toBe(true);
    expect(report.d1ImportReady).toBe(true);
    expect(report.restoreRehearsalReady).toBe(true);
    expect(report.destructiveRestoreDocumented).toBe(true);
    expect(report.localOnly).toBe(true);
    expect(report.providerBacked).toBe(false);
    expect(report.commands.sqlExport).toContain("wrangler d1 export");
    expect(report.commands.sqlImport).toContain("wrangler d1 execute");
    expect(report.commands.localSqliteRehearsal).toBe("bun run cf:d1-restore-rehearsal");
    expect(report.commands.timeTravelRestore).toContain("wrangler d1 time-travel restore");
    expect(report.localRehearsal.sourceRows).toBeGreaterThan(0);
    expect(report.localRehearsal.restoredRows).toBe(report.localRehearsal.sourceRows);
    expect(report.localRehearsal.sourceChecksum).toBe(report.localRehearsal.restoredChecksum);
    expect(report.localRehearsal.foreignKeyViolations).toBe(0);
    expect(report.localRehearsal.tempArtifactsRemoved).toBe(true);
    expect(report.localRehearsal.checks.every((check) => check.ready)).toBe(true);
    expect(report.blockers).toEqual([]);
  });

  it("keeps local D1 proofs independent of a host sqlite3 executable", () => {
    const helper = readFileSync("scripts/lib/local-sqlite-proof.ts", "utf8");
    const proofScripts = [
      "scripts/generate-cloudflare-d1-beta-feedback-proof.ts",
      "scripts/generate-cloudflare-d1-closed-beta-proof.ts",
      "scripts/generate-cloudflare-d1-collaboration-invitation-proof.ts",
      "scripts/generate-cloudflare-d1-component-library-proof.ts",
      "scripts/generate-cloudflare-d1-estimate-history-proof.ts",
      "scripts/generate-cloudflare-d1-performance-proof.ts",
      "scripts/generate-cloudflare-d1-restore-rehearsal.ts",
      "scripts/generate-cloudflare-d1-rpc-transaction-proof.ts",
    ];

    expect(helper).toContain('requireRuntime("bun:sqlite")');
    expect(helper).toContain('requireRuntime("node:sqlite")');
    for (const path of proofScripts) {
      const source = readFileSync(path, "utf8");
      expect(source, path).toContain("runLocalSqliteCli");
      expect(source, path).not.toContain('spawnSync("sqlite3"');
    }
  });

  it("writes markdown without leaking temp paths or secret-looking values", () => {
    const report = buildCloudflareD1RestoreRehearsal({
      generatedAt: "2026-06-30T00:00:00.000Z",
    });
    const dir = mkdtempSync(join(tmpdir(), "cloudflare-d1-restore-"));
    try {
      const file = join(dir, "restore.md");
      writeMarkdown(report, file);
      const markdown = readFileSync(file, "utf8");
      expect(markdown).toContain("Cloudflare D1 Restore Rehearsal");
      expect(markdown).toContain("Provider-backed D1 proof | no");
      expect(markdown).toContain("Time Travel restore");
      expect(markdown).not.toContain(tmpdir());
      expect(markdown).not.toContain("do-not-leak-this-token");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
