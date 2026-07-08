# 03 — Source And Codebase Audit

> Evidence gathered read-only at planning time (2026-07-07). Breadth evidence
> (perf budgets, Playwright gating, skip classification, CI status) was
> gathered by a dispatched Explore subagent and is cross-referenced from
> `19` §A. File:line citations are repo-relative.

## 1. Current test inventory

### 1.1 File counts

| Surface | Runner | Count | Evidence |
|---|---|---|---|
| `tests/vitest/**/*.test.{ts,tsx}` | vitest (jsdom) | ~634 | `find tests/vitest -name '*.test.*' \| wc -l` |
| `tests/unit/*.test.ts` | bun-test | 6 | `find tests/unit -name '*.test.*'` |
| `e2e/*.spec.ts` | Playwright | 9 | `find e2e -name '*.spec.ts'` |
| `tests/vitest/perf/*.test.{ts,tsx}` | vitest (subset) | 9 | `find tests/vitest/perf` |

Total ~649 test files across three runners with three different fixture styles.

### 1.2 `tests/unit` (bun-test, 6 files)

`compare-href.test.ts`, `p3-shared-link-migration-red.test.ts`,
`relative-time.test.ts`, `reset-baseline.test.ts`, `tail-dev-logs.test.ts`,
`tree-selection.test.ts`. Pure logic tests; no jsdom, no React. Run via
`bun run test` (= `bun test tests/unit`).

### 1.3 `tests/vitest` (vitest/jsdom, ~634 files)

- **Setup:** `tests/vitest/setup.ts` — mocks `localStorage`, `matchMedia`,
  `IntersectionObserver`, `ResizeObserver` globally.
- **Alias:** `server-only` → `tests/vitest/server-only-stub.ts` (empty stub).
- **Path alias:** `@` → `./src`.
- **Snapshot dir:** `tests/vitest/__snapshots__/`.
- **Fixtures dirs:** `tests/vitest/fixtures`, `tests/vitest/share`,
  `tests/vitest/project-activity-page`, plus top-level `tests/fixtures/`.
- **Largest files (slow candidates by size):** see §4 below.

### 1.4 `e2e` (Playwright, 9 specs)

`auth.spec.ts`, `estimates-crud-latency.spec.ts`, `estimates-shell-streaming.spec.ts`,
`frontdoor-landing-visual.spec.ts`, `landing-audit.spec.ts`,
`route-transition-performance.spec.ts`, `shared-link-receiver.spec.ts`,
`workshop-library-demo-smoke.spec.ts`, `workshop-route-error-boundaries.spec.ts`.
Most are **env-gated to skip** without auth/storageState (see `19` §A).

## 2. Test execution configuration

### 2.1 `vitest.config.ts` (full file, 25 lines)

```ts
test: {
  environment: "jsdom",
  globals: true,
  setupFiles: ["./tests/vitest/setup.ts"],
  include: ["tests/vitest/**/*.test.{ts,tsx}"],
  exclude: ["node_modules", ".next", "e2e"],
  fileParallelism: false,            // line 11 — LOAD-BEARING
  testTimeout: 30_000,               // line 17 — single global timeout
}
```

**Load-bearing comment (lines 12-16):**
> The heavy jsdom component suites (e.g. component-library-ui, 60 tests) run
> serially (fileParallelism:false is load-bearing) and individual tests can
> exceed 15s late in a ~525s full run under GC pressure — they pass in
> isolation. 30s accommodates the genuinely-slow tests without weakening any
> assertion or parallelizing (which would break the perf-suite serial config).

This single comment is the project's entire documented stability rationale.

**Notable absences:**
- No `pool` / `poolOptions` (defaults to `forks`).
- No `projects` (Vitest 4 feature) — so no per-project parallelism/timeout
  override today. (ASSUMP-6 in `02`.)
- No `retry` (Vitest has no built-in test retry; flake handling is manual).
- No `coverage` config.
- No `reporters` override (default reporter).

### 2.2 `playwright.config.ts`

- `timeout: 30_000`, `expect: { timeout: 5_000 }`, `trace: "on-first-retry"`.
- **`retries` key is NOT set** → defaults to **0** (no Playwright retries).
- `webServer`: `bun run dev -- --port ${port}`, `reuseExistingServer: true`,
  `timeout: 120_000`.
- `storageState: process.env.PLAYWRIGHT_STORAGE_STATE || undefined`.
- Browser matrix: chromium only by default; 6 extra browsers
  (firefox/webkit/mobile-safari/iphone-se/ipad/pixel-8) gated behind
  `ARCHESTIMATOR_E2E_LIBRARY_BROWSER_MATRIX=1`.
- Several specs use `test.setTimeout(90_000)` (e.g. route-transition-perf).

### 2.3 `package.json` scripts (test-relevant)

| Script | Command | Runner |
|---|---|---|
| `test` | `bun test tests/unit` | bun-test |
| `test:dom` | `vitest run --maxWorkers=1` | vitest |
| `test:dom:watch` | `vitest` | vitest (watch) |
| `test:e2e` | `playwright test` | Playwright |
| `test:e2e:perf` | `playwright test e2e/route-transition-performance.spec.ts` | Playwright |
| `perf:profile-peak-load` | `vitest run tests/vitest/route-transition-peak-load-profile.test.tsx --maxWorkers=1` | vitest (single file) |
| `validate` | `type-check && lint && lint:design-system && lint:design && test && test:dom` | chained |
| `type-check` | `tsc --noEmit` | tsc |
| `lint` | `eslint` | eslint |
| `lint:design-system` | `node scripts/enforce-app-design-system.mjs` | node |
| `lint:design` | `node .agents/skills/impeccable/scripts/detect.mjs --strict src/components` | node |

**Key facts:**
- `validate` runs **both** test runners sequentially (`test` then `test:dom`).
- `test:dom` forces `--maxWorkers=1` even though `fileParallelism:false` already
  serializes — belt-and-suspenders; both must be updated together if
  parallelism changes (Phase 1 hazard).
- **No script runs the `tests/vitest/perf/` suite in isolation.**
  `perf:profile-peak-load` runs only the peak-load file. The perf suite runs as
  part of the full `test:dom` glob. (Finding F-9.)
- There is **no flake/timing measurement script.** Phase 0 prescribes one.

## 3. CI posture (the brief-vs-reality conflict)

- **`.github/workflows/` is empty** — zero active workflows. (Finding F-3.)
- **`.github/workflows-disabled/`** contains 4 parked workflows:
  `ci.yml`, `codeql.yml`, `dependabot.yml`, `react-doctor.yml`.
- The parked `ci.yml` (on `pull_request` + `push` to `main`/`feat/**`):
  checkout → setup bun 1.3.14 → `bun install --frozen-lockfile` →
  `bun run validate` → `bun run build` → `check-performance-budgets.mjs`
  (advisory via `continue-on-error` unless `PERF_BUDGET_STRICT=1`) →
  `bun run lint:design` → `bunx playwright install chromium --with-deps` →
  `bun run test:e2e` → `bun run test:e2e:perf`.

**Conflict with the brief:** the brief says "CI runs lint, typecheck, unit,
build, and Playwright." Repo reality: CI does **not** run — it is disabled.
Recorded in `02` as ASSUMP-4; drives Phase 4. The owner decision to re-enable
is isolated in `15` §blocked (build-minute cost, operations decision).

`scripts/check-performance-budgets.mjs` (referenced by the parked CI) reads
`.next/diagnostics/route-bundle-stats.json` and is advisory only (exit 0 unless
`--strict`). It is a **bundle** budget, owned by the perf-gate sibling pack, not
a test-timing budget.

## 4. Slowest candidates (by file size — a proxy the comment names)

The inline comment names `component-library-ui` (60 tests) explicitly. By line
count, the largest vitest files are the prime suspects for the >15s tests:

| File | Lines | Notes |
|---|---|---|
| `tests/vitest/auth-sensitive-api-boundaries.test.ts` | 2863 | security boundary matrix |
| `tests/vitest/component-library-ui.test.tsx` | 2851 | **named in comment** (60 tests) |
| `tests/vitest/ai-package-builder-draft.test.ts` | 2261 | |
| `tests/vitest/ai-package-builder-route.test.ts` | 2202 | |
| `tests/vitest/estimate-sheet-library-insert.test.tsx` | 1791 | **waitFor count 45 (highest)** |
| `tests/vitest/estimate-copilot-floating-button.test.tsx` | 1662 | |
| `tests/vitest/projects-page-group-mode.test.tsx` | 1628 | |
| `tests/vitest/project-publication-page.test.tsx` | 1545 | |
| `tests/vitest/estimate-sheet-version-control-ui.test.tsx` | 1402 | |
| `tests/vitest/estimate-sheet-version-control-actions.test.ts` | 1360 | |

Line count is a proxy; **Phase 0 measures actual per-file wall-clock** and ranks
by measured p95, not by size. But size + the named comment + waitFor density
converge on the same suspects.

## 5. Flakiest candidates (pattern density — see `19` §A for full inventory)

### 5.1 Heavy `waitFor` (async polling — flake-prone)

Top files by `waitFor` count: `estimate-sheet-library-insert` (45),
`estimate-tree-context-menu` (40), `component-library-ui` (37),
`component-library-manager` (29), `workshop-library-consolidation-ui` (23),
`projects-page-group-mode` (22), `estimate-component-drag` (20). 773 total
`waitFor` usages across the suite.

### 5.2 Real-timer `setTimeout` waits (latent flake)

Two sites use **real** (non-fake) timer waits:
- `tests/vitest/estimate-cursor-identity.test.ts:90` — `setTimeout(resolve, 30)`.
- `tests/vitest/recipient-proposals-page.test.tsx:171` — `setTimeout(resolve, 75)`.

(The other 8 `setTimeout` sites are `resolve, 0` microtask flushes or fake-timer
mocks — not flake sources.)

### 5.3 Timing-assertion tests (budget-coupled — brittle under load)

17 files assert on `performance.now()`/`Date.now()`. The ones with **hard `< ms`
assertions** (brittle under CI load): `logger-perf` (p95 `<1ms`, 1000 samples),
`estimate-tree-drag-over-perf` (avg `<16ms`), `perf/estimate-sheet-render-baseline`
(keystroke avg `<16ms`/worst `<50ms`), `perf/projects-page-server-parallelism`
(`<300ms`), `templates-tree-performance` (`<1000ms`), `route-transition-peak-load-profile`
(`<10_000ms`), `proposal-workbook-benchmark` (`<5_000ms`). Full budget table in
`19` §A.

### 5.4 Skip classification (no flake quarantine exists)

All 14 `skip`/`skipIf` sites are **env/auth/provider gates**, not flake
quarantine. Evidence in `19` §A. There are **zero** `it.only`/`test.only`. The
only true quarantine pattern in the repo is an env gate
(`ARCHESTIMATOR_E2E_ENABLE_LEGACY_SUPABASE=1`, per `current-state.md:2107`).

## 6. Fixture cleanup posture

- `tests/vitest/setup.ts` provides global mocks but **no per-test cleanup hook**
  (no global `afterEach` resetting `vi.restoreAllMocks()` / `vi.resetModules()`).
  Individual tests must self-clean; leaks across files are possible precisely
  *because* `fileParallelism:false` runs them in one long-lived worker.
- No `vi.clearAllMocks`/`restoreAllMocks` global. This is a latent cross-test
  contamination vector for a serial run.
- `tests/vitest/upload-provider-proof-fixture.ts:12` uses
  `describeProof: describe.skip` — a fixture helper that doubles as a skip.
- Playwright has no global cleanup; specs self-skip on missing auth.

## 7. Existing stability decisions / notes in `.ai`

- `.ai/10_state/decisions.md`: **no** matches for `flake`, `quarantine`,
  `fileParallelism`, `testTimeout`, `525s`, `GC pressure`, `serial`, or
  `test stability`. The posture is undocumented outside the inline comment.
- `.ai/10_state/current-state.md`: ~50+ uses of `--maxWorkers=1` as the
  de-facto local-proof convention; one explicit validation-gap note at line
  4996 ("Known validation gap: a broader `bunx vitest run --maxWorkers=1 …`").
- This plan folder previously contained **only `PROMPT.md`** — the deliverable
  was not yet written.

## 8. Dependencies and downstream consumers

- `vitest.config.ts` is consumed by `bun run test:dom`, `validate`,
  `perf:profile-peak-load`, and every local proof run that uses `bunx vitest`.
- `playwright.config.ts` is consumed by `test:e2e`, `test:e2e:perf`, and the
  e2e-fixture-smoke-harness sibling pack.
- Any change to `fileParallelism` or `testTimeout` affects **all** ~634 vitest
  files and the meaning of every perf-suite assertion (DEC-2).
- Any change to `package.json` `test`/`test:dom`/`validate` affects the
  launch-readiness evidence gate and every `.ai` run-log that cites those
  commands.
