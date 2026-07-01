import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCloudflareD1PerformanceProof,
  writeMarkdown,
} from "../../scripts/generate-cloudflare-d1-performance-proof";

describe("Cloudflare D1 performance proof", () => {
  it("captures local query-budget and p95 evidence without claiming hosted proof", () => {
    const report = buildCloudflareD1PerformanceProof({
      generatedAt: "2026-06-30T00:00:00.000Z",
    });

    expect(report.mode).toBe("cloudflare-d1-performance-proof");
    expect(report.queryCountBudgetsReady).toBe(true);
    expect(report.p95RouteProofReady).toBe(true);
    expect(report.hostedWorkerD1PerformanceReady).toBe(false);
    expect(report.localOnly).toBe(true);
    expect(report.providerBacked).toBe(false);
    expect(report.benchmark.rowsSeeded).toBeGreaterThan(0);
    expect(report.benchmark.rows).toHaveLength(5);
    expect(report.benchmark.rows.every((row) => row.plannedQueries <= row.queryBudget)).toBe(true);
    expect(report.benchmark.rows.every((row) => row.localP95Ms <= row.localBudgetMs)).toBe(true);
    expect(report.benchmark.rows.every((row) => row.status === "local-pass")).toBe(true);
    expect(report.benchmark.tempArtifactsRemoved).toBe(true);
    expect(report.blockers).toEqual(["Hosted Worker+D1 performance proof is still missing."]);
  });

  it("uses hosted D1 runtime proof to clear the hosted performance gate", () => {
    const report = buildCloudflareD1PerformanceProof({
      generatedAt: "2026-06-30T00:00:00.000Z",
      hostedD1RuntimePerformanceProofSource: "evidence/hosted-d1.json",
      hostedD1RuntimePerformanceProof: {
        providerBacked: true,
        result: {
          schemaReady: true,
          seedReady: true,
          cleanupReady: true,
          rowsSeeded: 132,
          rowsCleaned: 0,
          benchmarkRows: [
            {
              surface: "workspace_homebase_summary",
              queryBudget: 3,
              plannedQueries: 1,
              hostedBudgetMs: 600,
              hostedP95Ms: 42,
              sampleCount: 9,
              rowsReturned: 2,
              status: "hosted-pass",
            },
          ],
        },
        readiness: {
          queryCountBudgetsReady: true,
          hostedP95Ready: true,
          hostedWorkerD1PerformanceReady: true,
          d1RuntimeProofReady: true,
        },
        blockers: [],
      },
    });

    expect(report.hostedWorkerD1PerformanceReady).toBe(true);
    expect(report.localOnly).toBe(false);
    expect(report.providerBacked).toBe(true);
    expect(report.hostedBenchmark?.source).toBe("evidence/hosted-d1.json");
    expect(report.hostedBenchmark?.rowsSeeded).toBe(132);
    expect(report.blockers).toEqual([]);
  });

  it("writes markdown without leaking temp paths or secret-looking values", () => {
    const report = buildCloudflareD1PerformanceProof({
      generatedAt: "2026-06-30T00:00:00.000Z",
    });
    const dir = mkdtempSync(join(tmpdir(), "cloudflare-d1-performance-"));
    try {
      const file = join(dir, "performance.md");
      writeMarkdown(report, file);
      const markdown = readFileSync(file, "utf8");
      expect(markdown).toContain("Cloudflare D1 Performance Proof");
      expect(markdown).toContain("Hosted Worker+D1 performance ready | no");
      expect(markdown).toContain("workspace_homebase_summary");
      expect(markdown).not.toContain(tmpdir());
      expect(markdown).not.toContain("do-not-leak-this-token");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
