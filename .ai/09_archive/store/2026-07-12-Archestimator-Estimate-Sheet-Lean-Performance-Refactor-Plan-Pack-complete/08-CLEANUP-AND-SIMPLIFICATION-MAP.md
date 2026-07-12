# 08 — Cleanup and Simplification Map

## 1. Cleanup objective

Remove the machinery created to manage an optimization program that is no longer used.

Cleanup is not the first unit. Land one real product optimization first.

## 2. Production plumbing to remove

### Files

- `src/lib/estimates/estimate-performance-modes.ts`
- `src/lib/estimates/estimate-performance-modes.server.ts`
- `src/components/workshop/estimate-performance-mode-context.tsx`

### Route/workspace edits

Remove from:

- estimate route page:
  - mode loader;
  - mode snapshot read;
  - mode prop.
- `EstimateWorkspaceClient.tsx`:
  - performance mode prop/default;
  - provider;
  - mode data attributes.

### Validation

Search for:

```text
EstimatePerformanceMode
estimatePerformanceModes
useEstimatePerformanceModeSnapshot
data-estimate-performance-
NEXT_PUBLIC_ESTIMATE_PERF_
ESTIMATE_PERF_
```

No production consumer should remain.

## 3. Package scripts to retire

Remove dedicated entries unless a specific simple benchmark is consciously retained:

- `perf:estimate:activated-tests`
- `perf:estimate:check`
- `perf:estimate:cleanup`
- `perf:estimate:d1`
- `perf:estimate:d1:hosted`
- `perf:estimate:decide`
- `perf:estimate:fingerprint`
- `perf:estimate:gate`
- `perf:estimate:index`
- `perf:estimate:measure`
- `perf:estimate:modes`
- `perf:estimate:prepare`
- `perf:estimate:release`
- `perf:estimate:server`
- `perf:estimate:supersede`
- `perf:estimate:validate-run`

The exact current list must be re-read before editing.

## 4. Scripts to remove

Candidate retired files introduced for the old framework include:

- `scripts/cleanup-estimate-sheet-performance-run.ts`
- `scripts/compute-estimate-sheet-source-fingerprint.ts`
- `scripts/measure-estimate-sheet-d1.ts`
- `scripts/measure-estimate-sheet-performance.ts`
- `scripts/prepare-estimate-sheet-performance-run.ts`
- `scripts/run-estimate-sheet-activated-tests.ts`
- `scripts/run-estimate-sheet-mode-proof.ts`
- `scripts/run-estimate-sheet-performance-gate.ts`
- `scripts/start-estimate-sheet-benchmark-server.ts`
- `scripts/validate-estimate-sheet-performance-run.ts`
- `scripts/write-estimate-sheet-bottleneck-decision.ts`
- `scripts/write-estimate-sheet-supersession.ts`
- any later update/index/release scripts added solely for this pack.

Candidate library files:

- `scripts/lib/estimate-sheet-performance-contract.ts`
- `scripts/lib/estimate-sheet-performance-test-receipt.ts`
- `scripts/lib/estimate-sheet-vitest-reporter.ts`
- local D1 prepare/plan-state/runtime reporter helpers used only by the old harness.

Before deletion, use import search—not a generated dependency manifest.

## 5. Dedicated config and E2E cleanup

Candidates:

- `playwright.estimate-performance.config.ts`
- `e2e/helpers/estimate-sheet-performance-reporter.ts`
- runtime-only performance helper files;
- `e2e/estimate-sheet-performance.spec.ts` if it cannot be simplified into a product interaction;
- component-interop test additions that exist only to satisfy the old evaluator.

Preferred end state:

- one normal Playwright config;
- zero custom perf reporter;
- at most one simple estimate performance product spec;
- fixture setup reused from normal E2E helpers.

## 6. Framework tests to remove

Candidates named around:

- `estimate-performance-evidence-index`;
- `estimate-performance-mode-context`;
- `estimate-performance-mode-route-contract`;
- `estimate-performance-modes`;
- `estimate-performance-run-lifecycle`;
- `estimate-performance-plan-state`;
- `estimate-sheet-bottleneck-decision`;
- `estimate-sheet-d1-performance`;
- `estimate-sheet-hosted-d1-performance-proof-script`;
- `estimate-sheet-performance-contract`;
- `estimate-sheet-performance-fixtures` only if fixture has no remaining direct use;
- `estimate-sheet-release-evaluation`;
- `estimate-sheet-source-fingerprint`;
- custom reporter tests.

Retain or rewrite tests that directly verify:

- row editing;
- tree patching;
- query cache behavior;
- component identity propagation;
- render isolation;
- calculations;
- route loading.

## 7. Fixture decision

Keep one direct fixture module only if:

- product tests import it;
- it creates a realistic large tree;
- it has no evidence-manifest dependencies;
- it is simple to call.

Delete:

- auth fixture hashes;
- producer/application fingerprints;
- fixture manifests;
- ownership census artifacts;
- run-specific copies.

## 8. Runtime evidence

Old generated runtime runs are historical, not active source.

Recommended options, in order:

1. move the cancelled old plan pack and its evidence to `.ai/09_archive/`;
2. preserve its README and final useful baseline;
3. remove repeated generated run directories and command receipts;
4. retain one short cancellation summary;
5. link the new plan.

Do not spend an implementation cycle perfectly preserving every generated file.

## 9. Vitest config

Remove custom reporter wiring added only for the old performance receipts.

Preserve normal test configuration.

## 10. Render probes

Keep `estimate-sheet-render-probe.ts` if focused behavior tests use it.

Why it survives:

- one null check in production;
- direct render-count evidence;
- no runtime files, hashes, or mode system;
- measures product components, not the harness.

Delete unused probe types after the new tests settle.

## 11. Server timing

Keep current `traced`/Server-Timing instrumentation.

Why it survives:

- already integrated;
- useful for conditional route work;
- no bespoke estimate performance program required.

## 12. Net complexity target

UNIT-004 should be a substantial net deletion.

Track:

- production lines removed;
- script/config/test lines removed;
- new index/store production lines;
- new focused test lines.

The entire refactor should not approach the old framework's 4,073-line addition unless product functionality genuinely requires it.

A useful target is:

- new production concepts limited to index + edit store + adapters;
- net total repository deletion after framework retirement.

Do not make line count a correctness gate; use it as an overengineering alarm.

## 13. Cleanup ordering

```text
UNIT-001 real fix
→ identify old harness imports
→ remove inert mode plumbing
→ remove package scripts/scripts/libs
→ remove framework tests/config
→ simplify or retain one direct fixture/spec
→ archive old pack summary
→ static import/package verification
```

## 14. Rollback

Cleanup is easy to restore from Git history.

Do not keep dead compatibility wrappers “just in case.”

If one normal product test uses a helper, extract the smallest helper before deleting the framework.
