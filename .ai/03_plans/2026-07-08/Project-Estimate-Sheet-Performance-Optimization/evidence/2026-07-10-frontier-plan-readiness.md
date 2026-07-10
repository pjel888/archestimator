# Frontier Plan-Readiness Evidence - 2026-07-10

## Claim

This artifact proves the planning claim that the pack is executable without invention. It does not prove the product implementation, browser budgets, hosted D1 behavior, or release readiness.

## Baseline

- Git HEAD before target-folder edits: `a9ba86c0ffa39a9dcb91625861edde9603d7869c`
- Target-folder status/diff before edits: empty; SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- Shared worktree: dirty outside the target folder; no unrelated file was reverted.
- Baseline plan validation: failed because `plan-pack.json` was absent.
- Baseline independent architect verdict: `NOT_READY`.
- Baseline independent critic verdict: `NOT_READY`.

## Current Source Evidence

Read-only exploration refreshed the route, client, repository, mutation, virtualization, and test surfaces. The findings that materially changed the plan were:

1. `readEstimateNodeRouteContextD1FastPath` is still a null stub.
2. The sheet has full-tree derivation/snapshot work beyond the DOM virtualizers.
3. Express editing disables row virtualization.
4. Client project-component fan-out is O(N); server fan-out uses JSON identity filtering plus per-match batched writes and is not assumed O(1).
5. Existing direct tests cover bulk-delete partial failure, broadcast filtering, and tree DnD.
6. Two focused contract tests contain stale expectations and are the first repair/classification work in `UNIT-001`.
7. Existing jsdom scale evidence reaches 500 rows, not the 5,000-row supported ceiling.
8. Historical route/generic D1 artifacts are stale for current Cloudflare/D1 pass claims.

The detailed file/symbol map is in `IMPLEMENTATION_PLAN.md` and `28_INVENTORY_SOURCE_MAP.md`.

## Research Validation

| Source | Current planning impact |
|---|---|
| [web.dev: Optimize Interaction to Next Paint](https://web.dev/articles/optimize-inp) | A <=200 ms p75 target is a field INP target. Lab interaction timing is diagnostic and must not be labeled field-equivalent. |
| [Chrome: Long Animation Frames API](https://developer.chrome.com/docs/web-platform/long-animation-frames) | Browser proof records LoAF/long-task entries to diagnose slow interaction frames. |
| [MDN: PerformanceEventTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming) | Lab interaction records use Event Timing/interaction IDs where supported. |
| [Cloudflare D1 metrics and analytics](https://developers.cloudflare.com/d1/observability/metrics-analytics/) | D1 proof records available query duration, rows read/written, and evidence class; hosted claims require hosted evidence. |
| [Cloudflare D1 index guidance](https://developers.cloudflare.com/d1/best-practices/use-indexes/) | Indexes require exact query-shape and query-plan proof; speculative indexes are rejected. |
| [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) | Hosted proof rechecks current free-tier allowances and fails before seeding if the run breaches the pack's safety threshold. |
| [Playwright retries](https://playwright.dev/docs/test-retries) | Retry/flaky classification cannot turn a failed performance budget green. |
| [Playwright tracing](https://playwright.dev/docs/api/class-tracing) | Traces are failure diagnostics, not standalone performance metrics. |
| Installed Next.js environment-variable guide | `NEXT_PUBLIC_*` values are build-time inlined/frozen; rollout was changed to server-resolved deployment modes. |
| Installed Next.js loading/lazy-loading guides | The plan preserves Suspense/loading boundaries and measures the route/RSC/client split before changing it. |

Official limits and API behavior must be rechecked in the implementation run before hosted proof because provider guidance can change.

## Baseline Defect Closure

| Baseline defect | Repair |
|---|---|
| Missing manifest | Added schema-versioned `plan-pack.json`. |
| Competing execution guides | Added sole canonical `IMPLEMENTATION_PLAN.md`; docs 11/21 are superseded for execution. |
| Owner decisions `OPEN-01..07` | Replaced with reversible `DEC-AUTO-*` records and evidence-based reopen triggers. |
| Contradictory phase gates | Replaced by one `UNIT-001..011` DAG and ready slice. |
| Unstable Phase 0 artifact lists | Replaced by one 13-path canonical runtime evidence inventory. |
| Non-runnable unit prose | Every canonical unit now has ownership, paths, symbols/behavior, commands, evidence, exit, failure, cleanup, and resume state. |
| Interop count 17 | Reconciled 19 unique IDs and seven direct-test gaps. |
| Stale test inventory | Corrected bulk-delete, broadcast, and tree-DnD test paths; stale contract tests assigned to `UNIT-001`. |
| Conflicting graph names | Standardized on `componentInstanceRowIdsByIdentity`. |
| Unsupported O(1) server fan-out claim | Replaced with measured JSON-filter/batched-write contract. |
| Incomplete evaluator | Added fixtures, auth/server provenance, raw samples, percentile method, Event Timing/LoAF, query metrics, strict fail semantics, and deterministic decision output. |
| Invalid <=2%/10-run flake claim | Ten runs are smoke only; <=2% observed failure rate requires at least 100 repetitions. |
| Build-frozen live rollback flags | Replaced with deployment-scoped server `off|shadow|on` modes; no per-estimate instant-toggle claim. |
| Unsafe hosted metadata cleanup | Replaced with run UUID, exact per-table IDs, dependency-order deletion, per-table reconciliation, and zero-count verification. |
| Orphan a11y behaviors | Removed invented partial-fan-out/offline/cancellable-write/session-modal contracts; keyboard move uses the semantic move decision. |
| Same-agent/browser readiness caps | Removed; provenance is metadata and runtime proof controls implementation/release status instead. |

## Planning Acceptance Evidence

`AC-001` through `AC-012` in `IMPLEMENTATION_PLAN.md` are plan-readiness criteria only. Runtime tests remain `PLANNED` in the manifest.

Expected final evidence sequence:

1. Planning prompt suite validation passes.
2. Plan-pack validation passes with current hashes.
3. Adversarial copies fail for missing manifest, stale artifact hash, orphan link, DAG cycle, and inconsistent status/next-unit cases.
4. `git diff --check` passes for the target folder.
5. Marker/path/source scans find no unresolved owner decision, stale active execution authority, missing referenced path, or P0/P1 contradiction.
6. Fresh independent architect and critic reviews return no unresolved P0/P1 finding.

## Final Verification Receipt

Pending the frozen-state validation and independent re-review. This section must be updated before `plan-pack.json` hashes are finalized.

## Validation Gap

Browser automation was intentionally skipped for this planning-only run because it would prove runtime behavior, not whether the plan packets are executable. Browser proof is mandatory in `UNIT-002` and `UNIT-010`.

Supermemory was unavailable because `SUPERMEMORY_SERVER_BIN` was not configured. Current source plus canonical `.ai` documents remained the authority; no memory claim was used as evidence.
