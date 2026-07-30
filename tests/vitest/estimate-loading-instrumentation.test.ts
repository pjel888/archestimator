import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  ESTIMATE_LOADING_STAGE_NAMES,
  buildEstimateLoadingArtifact,
  cellKey,
  expandEstimateLoadingDimensions,
  parseEstimateLoadingArgs,
  parsePerfTraceLines,
  percentile,
  requiredSampleCount,
  resolveCanonicalBudgetMetadata,
  sanitizeMeasurementText,
  summarizeEstimateLoadingCell,
  type CanonicalBudgetMetadata,
  type EstimateLoadingDimensions,
  type EstimateLoadingFixtureManifest,
  type EstimateLoadingSample,
} from "../../scripts/measure-estimate-loading";
import {
  ESTIMATE_LOADING_CLIENT_STAGE_NAMES,
  ESTIMATE_LOADING_ROUTE_STAGE_NAMES,
} from "@/lib/perf/estimate-loading-stages";

const sourceRevision = "a".repeat(40);

const fixtureManifest: EstimateLoadingFixtureManifest = {
  schemaVersion: 1,
  sourceRevision,
  redactionStatus: "synthetic-only",
  fixtures: [
    {
      class: "small",
      syntheticId: "fixture-small-v1",
      estimatePath: "/workshop/projects/11111111-1111-4111-8111-111111111111/estimates/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      estimatesListPath: "/workshop/projects/11111111-1111-4111-8111-111111111111/estimates",
      nodeCount: 5,
      rowItemCount: 10,
      schemaRevision: "schema-v1",
      loadLimits: { maxNodeCount: 50, maxRowItemCount: 100 },
    },
    {
      class: "large",
      syntheticId: "fixture-large-v1",
      estimatePath: "/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      estimatesListPath: "/workshop/projects/22222222-2222-4222-8222-222222222222/estimates",
      nodeCount: 40,
      rowItemCount: 80,
      schemaRevision: "schema-v1",
      loadLimits: { maxNodeCount: 50, maxRowItemCount: 100 },
    },
    {
      class: "load-limit",
      syntheticId: "fixture-limit-v1",
      estimatePath: "/workshop/projects/33333333-3333-4333-8333-333333333333/estimates/cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      estimatesListPath: "/workshop/projects/33333333-3333-4333-8333-333333333333/estimates",
      nodeCount: 50,
      rowItemCount: 100,
      schemaRevision: "schema-v1",
      loadLimits: { maxNodeCount: 50, maxRowItemCount: 100 },
    },
  ],
};

function canonicalBudget(): CanonicalBudgetMetadata {
  const source = readFileSync(".ai/01_roadmap/27-performance-budget-and-regression-gates.md", "utf8");
  return resolveCanonicalBudgetMetadata(source, sourceRevision);
}

function dimensions(overrides: Partial<EstimateLoadingDimensions> = {}): EstimateLoadingDimensions {
  return {
    runtime: "next-production",
    fixtureClass: "small",
    navigationKind: "client-navigation",
    cacheState: "warm",
    prefetchState: "no-hover",
    ...overrides,
  };
}

function sample(
  sampleIndex: number,
  sampleDimensions = dimensions(),
  overrides: Partial<EstimateLoadingSample> = {},
): EstimateLoadingSample {
  return {
    runId: `run-${sampleIndex}`,
    sampleIndex,
    dimensions: sampleDimensions,
    processIsolationId: sampleDimensions.cacheState === "cold-proxy" ? `process-${sampleIndex}` : null,
    valid: true,
    failure: null,
    durationMs: sampleIndex,
    ttfbMs: sampleIndex + 1,
    fcpMs: sampleIndex + 2,
    firstInteractiveMs: sampleIndex + 3,
    rscBytes: sampleIndex * 100,
    jsBytes: sampleIndex * 200,
    queryCount: sampleIndex % 4,
    serverRequestId: `request-${sampleIndex}`,
    layoutRequestId: `layout-request-${sampleIndex}`,
    stages: Object.fromEntries(ESTIMATE_LOADING_STAGE_NAMES.map((stage) => [stage, sampleIndex + 0.5])),
    ...overrides,
  };
}

describe("estimate-loading measurement contract", () => {
  it("locks the bounded, PII-free server and client stage vocabulary", () => {
    expect(ESTIMATE_LOADING_STAGE_NAMES).toEqual([
      "estimate.layout.auth",
      "estimate.route.params",
      "estimate.route.context",
      "estimate.route.d1",
      "estimate.route.current-user",
      "estimate.route.selected-node",
      "estimate.route.project-estimate-access",
      "estimate.route.tabs",
      "estimate.route.nodes-adjustment",
      "estimate.route.rows-template-links",
      "estimate.route.tree-build",
      "estimate.route.capabilities",
      "estimate.route.onboarding",
      "estimate.route.binding",
      "estimate.client.rsc",
      "estimate.client.tree-chunk",
      "estimate.client.content-chunk",
      "estimate.client.hydration",
      "estimate.client.interactive",
    ]);
    expect(new Set(ESTIMATE_LOADING_STAGE_NAMES).size).toBe(ESTIMATE_LOADING_STAGE_NAMES.length);
    expect(ESTIMATE_LOADING_STAGE_NAMES.join(" ")).not.toMatch(/workspace|project-id|estimate-id|@|https?:/i);
    expect(ESTIMATE_LOADING_ROUTE_STAGE_NAMES).toHaveLength(13);
    expect(ESTIMATE_LOADING_CLIENT_STAGE_NAMES).toHaveLength(5);
  });

  it("wires every route-local server stage across supported branches without pretending to emit browser stages", () => {
    const productionSources = [
      readFileSync("src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx", "utf8"),
      readFileSync("src/lib/repositories/workspace-repository.ts", "utf8"),
      readFileSync("src/lib/estimates/estimate-tree-read-repository.ts", "utf8"),
    ].join("\n");

    for (const stage of ESTIMATE_LOADING_ROUTE_STAGE_NAMES) {
      expect(productionSources.split(`\"${stage}\"`).length - 1, stage).toBeGreaterThan(0);
    }
    for (const stage of ESTIMATE_LOADING_CLIENT_STAGE_NAMES) {
      expect(productionSources, stage).not.toContain(`\"${stage}\"`);
    }
    expect(productionSources).not.toContain('"estimate.layout.auth"');
  });

  it("wires the layout and browser stages without changing the dynamic pane boundaries", () => {
    const layoutSource = readFileSync("src/app/workshop/layout.tsx", "utf8");
    const clientSource = readFileSync("src/components/workshop/EstimateWorkspaceClient.tsx", "utf8");
    const clientTraceSource = readFileSync("src/lib/perf/estimate-loading-client.ts", "utf8");

    expect(layoutSource).toContain('withPerfTraceRequest("workshop.estimate-layout"');
    expect(layoutSource).toContain('traced("estimate.layout.auth", resolveAuthGate)');
    expect(layoutSource).toContain('requestPath.split("?", 1)[0]');
    expect(layoutSource).toContain("/^\\/workshop\\/projects\\/[^/]+\\/estimates\\/[^/]+\\/?$/");
    expect(clientSource).toContain('traceEstimateClientChunk("estimate.client.tree-chunk"');
    expect(clientSource).toContain('traceEstimateClientChunk("estimate.client.content-chunk"');
    expect(clientSource).toContain("traceEstimateClientRsc()");
    expect(clientSource).toContain("traceEstimateClientHydration()");
    expect(clientSource).toContain("observeEstimateClientInteractive()");
    expect(clientSource).toContain('import("./EstimateSheetTree")');
    expect(clientSource).toContain('import("./EstimateSheetContent")');
    expect(clientTraceSource).toContain('process.env.NEXT_PUBLIC_PERF_TRACE === "1"');
    expect(clientTraceSource).toContain("new MutationObserver(markWhenReady)");
    expect(clientTraceSource).toContain("INTERACTIVE_OBSERVER_TIMEOUT_MS = 30_000");
    for (const stage of ESTIMATE_LOADING_CLIENT_STAGE_NAMES) {
      expect(`${clientSource}\n${clientTraceSource}`, stage).toContain(`"${stage}"`);
    }

    const runnerSource = readFileSync("scripts/measure-estimate-loading.ts", "utf8");
    expect(runnerSource).toContain('NEXT_PUBLIC_PERF_TRACE: "1"');
    expect(runnerSource).not.toContain('stages["estimate.client.interactive"] = interactiveMs');
  });

  it("resolves every budget key from canonical source rows and records source and row digests", () => {
    const metadata = canonicalBudget();

    expect(metadata.path).toBe(".ai/01_roadmap/27-performance-budget-and-regression-gates.md");
    expect(metadata.sourceRevision).toBe(sourceRevision);
    expect(metadata.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(metadata.references.map((reference) => reference.key)).toEqual([
      "BUDGET-WORKSHOP-SHELL",
      "BUDGET-ESTIMATE-ROUTE",
      "BUDGET-ESTIMATE-MODULE",
      "BUDGET-ESTIMATE-INTERACTION",
      "BUDGET-BUNDLE",
      "BUDGET-INSTRUMENTATION",
      "BUDGET-D1",
    ]);
    for (const reference of metadata.references) {
      expect(reference.matches.length).toBeGreaterThan(0);
      expect(reference.matches.every((match) => match.line > 0 && match.text.length > 0)).toBe(true);
      expect(reference.digest).toMatch(/^[a-f0-9]{64}$/);
    }

    const runnerSource = readFileSync("scripts/measure-estimate-loading.ts", "utf8");
    expect(runnerSource).not.toContain("Transition < 100ms");
    expect(runnerSource).not.toContain("<150KB gzipped total");
    expect(runnerSource).not.toContain("<100KB");
  });

  it("fails closed when a canonical selector is missing or ambiguous", () => {
    const source = readFileSync(".ai/01_roadmap/27-performance-budget-and-regression-gates.md", "utf8");
    expect(() => resolveCanonicalBudgetMetadata(source.replace("| `/workshop/*` |", "| removed |"), sourceRevision)).toThrow(
      /BUDGET-WORKSHOP-SHELL selector must resolve exactly once/,
    );
    expect(() => resolveCanonicalBudgetMetadata(`${source}\n## Database Performance Rules`, sourceRevision)).toThrow(
      /BUDGET-D1 selector must resolve exactly once/,
    );
  });

  it("keeps hard refresh, client navigation, warm cache, and cold proxy as explicit dimensions", () => {
    const client = dimensions();
    const hard = dimensions({ navigationKind: "hard-refresh", prefetchState: "not-applicable" });
    const cold = dimensions({
      runtime: "opennext-preview",
      navigationKind: "hard-refresh",
      cacheState: "cold-proxy",
      prefetchState: "not-applicable",
    });

    expect(cellKey(client)).not.toBe(cellKey(hard));
    expect(cellKey(hard)).not.toBe(cellKey(cold));
    expect(requiredSampleCount(client)).toBe(20);
    expect(requiredSampleCount(hard)).toBe(20);
    expect(requiredSampleCount(cold)).toBe(10);

    const nextCells = expandEstimateLoadingDimensions("next-production", "small", [
      "hard-refresh",
      "client-navigation",
      "no-hover",
      "hover-prefetch",
      "warm-revisit",
    ]);
    expect(new Set(nextCells.map(cellKey)).size).toBe(4);

    const previewCells = expandEstimateLoadingDimensions("opennext-preview", "small", [
      "cold-process",
      "hard-refresh",
      "client-navigation",
      "warm-process",
    ]);
    expect(new Set(previewCells.map(cellKey)).size).toBe(3);
    expect(previewCells.filter((value) => value.cacheState === "cold-proxy")).toHaveLength(1);
  });

  it("uses nearest-rank p50/p95 without trimming and reports every metric distribution", () => {
    const samples = Array.from({ length: 20 }, (_, index) => sample(index + 1));
    samples[19] = sample(20, dimensions(), { durationMs: 10_000 });
    const cell = summarizeEstimateLoadingCell(samples);

    expect(percentile([1, 2, 3, 4], 50)).toBe(2);
    expect(cell.sufficient).toBe(true);
    expect(cell.durationMs).toEqual({ samples: 20, p50: 10, p95: 19 });
    expect(cell.durationMs.p95).not.toBe(10_000);
    expect(cell.firstInteractiveMs.samples).toBe(20);
    expect(cell.rscBytes.samples).toBe(20);
    expect(cell.jsBytes.samples).toBe(20);
    expect(cell.queryCount.samples).toBe(20);
    expect(cell.stages["estimate.route.d1"].samples).toBe(20);
  });

  it("retains failures and rejects short or stage-incomplete cells", () => {
    const samples = Array.from({ length: 20 }, (_, index) => sample(index + 1));
    samples[0] = sample(1, dimensions(), {
      valid: false,
      failure: "owner@example.com token=secret-value at C:\\Users\\owner\\auth.json",
      durationMs: null,
      stages: {},
    });
    const artifact = buildEstimateLoadingArtifact({
      samples,
      runtime: "next-production",
      sourceRevision,
      sourceWorktreeSha256: "2".repeat(64),
      canonicalBudget: canonicalBudget(),
      fixtureManifest,
      generatedAt: "2026-07-30T00:00:00.000Z",
    });

    expect(artifact.status).toBe("FAIL");
    expect(artifact.cells[0]?.attemptedSamples).toBe(20);
    expect(artifact.cells[0]?.validSamples).toBe(19);
    expect(artifact.cells[0]?.failures).toHaveLength(1);
    expect(JSON.stringify(artifact.cells[0]?.failures)).not.toContain("owner@example.com");
    expect(JSON.stringify(artifact.cells[0]?.failures)).not.toContain("secret-value");
    expect(artifact.contractFailures).toContain(`${cellKey(dimensions())}: 19/20 valid samples`);
  });

  it("requires unique process isolation for every valid cold-proxy sample", () => {
    const cold = dimensions({
      runtime: "opennext-preview",
      navigationKind: "hard-refresh",
      cacheState: "cold-proxy",
      prefetchState: "not-applicable",
    });
    const passing = Array.from({ length: 10 }, (_, index) => sample(index + 1, cold));
    const passArtifact = buildEstimateLoadingArtifact({
      samples: passing,
      runtime: "opennext-preview",
      sourceRevision,
      sourceWorktreeSha256: "2".repeat(64),
      canonicalBudget: canonicalBudget(),
      fixtureManifest,
    });
    expect(passArtifact.status).toBe("PASS");
    expect(passArtifact.coldProxyDisclaimer).toMatch(/proxies only/);

    const duplicateProcess = passing.map((value) => ({ ...value, processIsolationId: "same-process" }));
    const failArtifact = buildEstimateLoadingArtifact({
      samples: duplicateProcess,
      runtime: "opennext-preview",
      sourceRevision,
      sourceWorktreeSha256: "2".repeat(64),
      canonicalBudget: canonicalBudget(),
      fixtureManifest,
    });
    expect(failArtifact.status).toBe("FAIL");
    expect(failArtifact.contractFailures).toContain(
      `${cellKey(cold)}: every cold-proxy sample requires a unique processIsolationId`,
    );
  });

  it("requires layout correlation for hard refresh while allowing shared-layout client navigation", () => {
    const clientSamples = Array.from({ length: 20 }, (_, index) =>
      sample(index + 1, dimensions(), { layoutRequestId: null }),
    );
    expect(buildEstimateLoadingArtifact({
      samples: clientSamples,
      runtime: "next-production",
      sourceRevision,
      sourceWorktreeSha256: "2".repeat(64),
      canonicalBudget: canonicalBudget(),
      fixtureManifest,
    }).status).toBe("PASS");

    const hard = dimensions({ navigationKind: "hard-refresh", prefetchState: "not-applicable" });
    const hardSamples = Array.from({ length: 20 }, (_, index) =>
      sample(index + 1, hard, { layoutRequestId: null }),
    );
    const hardArtifact = buildEstimateLoadingArtifact({
      samples: hardSamples,
      runtime: "next-production",
      sourceRevision,
      sourceWorktreeSha256: "2".repeat(64),
      canonicalBudget: canonicalBudget(),
      fixtureManifest,
    });
    expect(hardArtifact.status).toBe("FAIL");
    expect(hardArtifact.contractFailures).toContain(
      `${cellKey(hard)}: every valid hard-refresh sample requires a correlated layoutRequestId`,
    );
  });

  it("parses only estimate trace snapshots and treats malformed records as absent", () => {
    const traces = parsePerfTraceLines([
      "noise",
      '[perf-json] {"requestId":"other","scope":"workshop.dashboard","databaseRoundTrips":1,"timings":[]}',
      "[perf-json] malformed",
      '[server] [perf-json] {"requestId":"estimate-1","scope":"workshop.estimate-sheet","databaseRoundTrips":3,"timings":[]}',
    ]);

    expect(traces).toEqual([
      { requestId: "estimate-1", scope: "workshop.estimate-sheet", databaseRoundTrips: 3, timings: [] },
    ]);

    expect(parsePerfTraceLines([
      '[perf-json] {"requestId":"layout-1","scope":"workshop.estimate-layout","databaseRoundTrips":0,"timings":[]}',
      '[perf-json] {"requestId":"estimate-1","scope":"workshop.estimate-sheet","databaseRoundTrips":3,"timings":[]}',
    ], ["workshop.estimate-layout", "workshop.estimate-sheet"])).toHaveLength(2);
  });

  it("requires explicit output, fixture, runtime, modes, and fixture classes", () => {
    expect(() => parseEstimateLoadingArgs([])).toThrow(/--runtime/);
    expect(() =>
      parseEstimateLoadingArgs(
        [
          "--runtime",
          "next-production",
          "--modes",
          "hard-refresh,client-navigation",
          "--fixtures",
          "small,large,load-limit",
          "--output",
          "artifact.json",
        ],
        {},
      ),
    ).toThrow(/fixture-manifest/);
    expect(
      parseEstimateLoadingArgs(
        [
          "--runtime",
          "next-production",
          "--modes",
          "hard-refresh,client-navigation",
          "--fixtures",
          "small,large,load-limit",
          "--output",
          "artifact.json",
          "--fixture-manifest",
          "fixtures.json",
        ],
        {},
      ),
    ).toMatchObject({ runtime: "next-production", runs: null });
  });

  it("redacts identifiers, auth material, and local paths", () => {
    const sanitized = sanitizeMeasurementText(
      "owner@example.com Authorization: Bearer abc Cookie: session=secret token=secret-value " +
        "11111111-1111-4111-8111-111111111111 C:\\Users\\owner\\auth.json",
    );
    expect(sanitized).not.toMatch(/owner@example|abc|secret-value|11111111|Users\\owner/);
    expect(sanitized).toContain("{email}");
    expect(sanitized).toContain("{redacted}");
    expect(sanitized).toContain("{synthetic-id}");
    expect(sanitized).toContain("{local-path}");
  });

  it("keeps fixture routes out of the serializable artifact", () => {
    const artifact = buildEstimateLoadingArtifact({
      samples: Array.from({ length: 20 }, (_, index) => sample(index + 1)),
      runtime: "next-production",
      sourceRevision,
      sourceWorktreeSha256: "2".repeat(64),
      canonicalBudget: canonicalBudget(),
      fixtureManifest,
    });
    const serialized = JSON.stringify(artifact.fixtureManifest);
    expect(serialized).not.toContain("/workshop/projects/");
    expect(serialized).not.toContain("11111111-1111-4111-8111-111111111111");
    expect(artifact.fixtureManifest.fixtures[0]).toMatchObject({
      class: "small",
      syntheticId: "fixture-small-v1",
      nodeCount: 5,
      rowItemCount: 10,
    });
  });
});
