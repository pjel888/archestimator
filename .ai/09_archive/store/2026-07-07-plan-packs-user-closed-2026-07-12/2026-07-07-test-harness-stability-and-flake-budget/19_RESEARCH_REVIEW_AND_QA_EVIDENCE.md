# 19 — Research, Review, and QA Evidence

## Research questions and sources

| Question | Source | Finding |
|---|---|---|
| Is CI active? | `.github/workflows/` (local) | **No** — empty; pipeline parked in `-disabled/`. (F-3) |
| Why is `fileParallelism:false` set? | `vitest.config.ts:9-17` (local) | Load-bearing for perf-suite serial semantics; ~525s run + GC pressure. (F-2) |
| Do flake-quarantine `.skip` patterns exist? | repo `rg` (local) | No — all 14 skips are env/auth/provider gates. (F-4) |
| What are the tightest timing budgets? | perf tests (local) | logger-perf p95<1ms; drag-over<16ms; keystroke<16ms/50ms; parallelism<300ms. (F-5) |
| Can Vitest 4 isolate the perf suite via `projects`? | `node_modules/vitest/dist/docs/` | **To-falsify in T0.5** (DISCOVERY-REQUIRED). |

No external/web research was required: all answers come from local repo
evidence + local installed framework docs. Current official guidance vs
community convention is not at issue (no framework-migration claim is made).

**What was searched for but not found:** any prior flake-budget or
test-stability decision in `.ai/10_state/decisions.md` (none exists — the
posture is undocumented outside the inline comment, confirming this pack is
net-new policy).

## Skills/workflows used or unavailable

| Capability | Used | Substitute if unavailable |
|---|---|---|
| `archestimator-plan-pack` skill | yes | — |
| Explore subagent (breadth) | yes | manual `rg`/`find` (slower) |
| Native independent reviewer | **unavailable** | emulated pass (caps readiness at 97 / CONDITIONALLY READY) |
| `gitnexus` graph | not needed | `rg`/`find` sufficient for test-inventory work |

No capability was fabricated.

## Specialist workstream outputs (emulated)

- **Test/QA strategist:** `03` §1-6, `12`, this doc §A.
- **Performance/reliability:** `09`, this doc §A perf budgets.
- **Ops/rollout:** `13`.
- **Adversarial:** `14`, this doc §C.

## Critique-and-revision cycle summaries

See `17` §cycles. Two cycles; residual findings are the four external OPEN-*
decisions.

## Performance evaluator contract

See `09` §evaluator. Declared evaluator = flakewatch before/after JSON. Passing
ordinary tests is insufficient.

---

## §A — Evidence appendix (from Explore subagent + direct reads)

### A.1 Skip/skipIf classification (14 sites) — all env/auth/provider gates, NO flake quarantine

- `tests/vitest/estimate-sheet-version-control-db.test.ts:14,47` — live-DB gate
- `tests/vitest/share/duplicate-decision-race.provider.test.ts:82,177` — provider race-proof gate
- `tests/vitest/upload-provider-proof-fixture.ts:12` — fixture helper
- `e2e/workshop-route-error-boundaries.spec.ts:36,46` — env+dev-auth gate
- `e2e/workshop-library-demo-smoke.spec.ts:46` — env+dev-auth gate
- `e2e/estimates-crud-latency.spec.ts:36,45` — auth gate
- `e2e/estimates-shell-streaming.spec.ts:12,17` — auth gate
- `e2e/route-transition-performance.spec.ts:346,401` — auth gate
- `e2e/shared-link-receiver.spec.ts:23` — env gate

Zero `it.only`/`test.only`. The only repo "quarantine" is an env gate
(`ARCHESTIMATOR_E2E_ENABLE_LEGACY_SUPABASE=1`, `current-state.md:2107`).

### A.2 Tightest timing budgets (hard `< ms` assertions)

| File | Budget | Samples |
|---|---|---|
| `tests/vitest/logger-perf.test.ts` | p95 `< 1ms` | 1000 |
| `tests/vitest/estimate-tree-drag-over-perf.test.ts` | avg `< 16ms` (1000-node/25-sample), `< 50ms` (5000/15, 10000/10) | 25/15/10 |
| `tests/vitest/perf/estimate-sheet-render-baseline.test.tsx` | keystroke avg `< 16ms`, worst `< 50ms` | 10 keystrokes × 3 sizes |
| `tests/vitest/perf/projects-page-server-parallelism.test.ts` | overall `< 300ms` | single (overlaps recorded) |
| `tests/vitest/templates-tree-performance.test.ts` | `< 1000ms` | 5 iterations |
| `tests/vitest/route-transition-peak-load-profile.test.tsx` | both renders `< 10_000ms` | single |
| `tests/vitest/proposal-workbook-benchmark.test.ts` | `durationMs < 5_000`, `bufferMiB < 5` | single (200 rows) |
| `e2e/route-transition-performance-budgets.json` | public nav `< 15s`, slow-3g `< 30s`, auth `< 10s`, bfcache `< 1.5s` | 3-5 runs |

### A.3 Heavy `waitFor` files (top, flake-prone) — 773 total usages

`estimate-sheet-library-insert` (45), `estimate-tree-context-menu` (40),
`component-library-ui` (37), `component-library-manager` (29),
`workshop-library-consolidation-ui` (23), `projects-page-group-mode` (22),
`estimate-component-drag` (20), `recipient-email-composer` (19),
`estimate-row-mutation-coordinator` (19), `template-editor` (17).

### A.4 Real-timer `setTimeout` waits (latent flake) — 2 sites

- `tests/vitest/estimate-cursor-identity.test.ts:90` — `setTimeout(resolve, 30)`
- `tests/vitest/recipient-proposals-page.test.tsx:171` — `setTimeout(resolve, 75)`

(Other 8 `setTimeout` sites are `resolve, 0` microtask flushes or fake-timer mocks.)

### A.5 Largest vitest files (slow-candidate proxy)

`auth-sensitive-api-boundaries` (2863), `component-library-ui` (2851, named in
comment), `ai-package-builder-draft` (2261), `ai-package-builder-route` (2202),
`estimate-sheet-library-insert` (1791). Full top-25 in `03` §4.

---

## §B — Flakewatch JSON schema (stable, v1)

```json
{
  "schema_version": 1,
  "generated_at": "<ISO 8601>",
  "tool": "flakewatch",
  "tool_version": "0.1.0",
  "glob": "<glob scanned>",
  "runs": <N>,
  "aborted_reason": null,
  "wall_clock_ms": { "p50": <n>, "p95": <n>, "max": <n> },
  "files": [
    {
      "file": "<repo-relative path>",
      "fail_rate": "<x/N>",
      "wall_clock_ms": { "p50": <n>, "p95": <n>, "max": <n> },
      "status": "ok" | "flake" | "slow" | "timeout" | "error"
    }
  ],
  "summary": {
    "total_files": <n>,
    "flake_count": <n>,
    "slow_count": <n>,
    "timeout_count": <n>,
    "coverage_files": <n>,
    "coverage_assertions_delta": <n>
  }
}
```

`coverage_assertions_delta` is populated only for before/after report mode
(`flakewatch:report --before a --after b`); it counts the assertion/file delta
to enforce REL-3.

## §C — Adversarial scenario matrix (for future implementation)

| ID | Scenario | Setup | Harness/command | Expected signal | Status |
|---|---|---|---|---|---|
| QA-1 | flakewatch mid-scan file edit | touch a test file between runs | `flakewatch --runs 5` | aborts with `aborted_reason` | to-prove (T0.2) |
| QA-2 | quarantine entry without replacement | hand-craft bad ledger row | `validate-quarantine-ledger` | exit 1 | to-prove (T2.3) |
| QA-3 | parallelism changes perf meaning | enable file-parallel, run perf subset | perf parity rerun | `===0`/`===1` unchanged or rollback | to-prove (T1.2 exit gate) |
| QA-4 | global resetModules breaks a test | apply blanket reset | full `test:dom` | fail-rate spike → narrow scope | to-prove (T3.1) |
| QA-5 | real-timer wait removal regresses | replace the 2 setTimeout sites | N-run both files | stable | to-prove (T3.2) |
| QA-6 | CI job over timing budget | re-enable CI | CI run | job timing ≤ budget or re-disable | to-prove (T4.2, owner-gated) |
| QA-7 | shell-injection glob | `--glob '; rm -rf x'` | flakewatch | rejected/no-op (array spawn) | to-prove (T0.2, SEC-1) |

## Independent final verifier evidence

**Mode: emulated.** No native independent reviewer was available. The
requirement-by-requirement check is in `17`. Independence cap (97 /
CONDITIONALLY READY) is applied and stated. To lift: owner acceptance or a real
independent pass.

## Explicit validation gaps

1. Phase 0 measurements not yet captured (deferred by DEC-1).
2. Hosted CI timing unavailable (CI disabled, OPS-2).
3. T0.5 Vitest-4 project spike not yet run (DISCOVERY-REQUIRED, falsifiable).
4. Emulated (not independent) verification.
