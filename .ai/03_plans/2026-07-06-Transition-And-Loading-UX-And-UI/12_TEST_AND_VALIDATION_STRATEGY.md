# Test and Validation Strategy

Lightest proof that proves the claim (per directive §11 and AGENTS.md proportional verification). This pass is **planning-only**: its own validation is static review + `git diff --check` + the planning-suite's internal consistency checks. The matrix below covers the *future implementation phases*.

---

## 1. Test layers in the repo (verified)

- `bun test tests/unit` — 6 Bun unit tests.
- `vitest run --maxWorkers=1` — 624 jsdom component tests; `tests/vitest/perf/` (9 render-baseline/RPC files).
- `playwright test` — 9 e2e specs incl. `route-transition-performance.spec.ts`, `estimates-crud-latency.spec.ts`, `estimates-shell-streaming.spec.ts`, `workshop-route-error-boundaries.spec.ts`, `shared-link-receiver.spec.ts`.
- Storybook 10.4.6 (+ `addon-a11y`).
- CI bundle gate `scripts/check-performance-budgets.mjs`.

## 2. Test Execution Matrix (future phases)

| Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Known reds | Owner |
|---|---|---|---|---|---|---|---|---|
| UX-01 (loading on `/invite/[token]`) | `e2e/route-transition-performance.spec.ts` (extend) + new invite spec | e2e | new | seeded invite token | `bun run test:e2e` | skeleton visible before content | none | impl agent |
| UX-01 (publisher/estimates loading) | extend `workshop-route-error-boundaries.spec.ts` | e2e | extend | seeded project | `bun run test:e2e` | skeleton renders | none | impl |
| UX-02 (error boundaries) | `e2e/workshop-route-error-boundaries.spec.ts` | e2e | extend | force-error fixture | `bun run test:e2e` | in-place recovery UI per subtree | none | impl |
| UX-05 (viewport) | n/a — static | static | n/a | n/a | `rg "export const viewport"` | root viewport present | none | impl |
| A11Y-01/03 (loading a11y) | `tests/vitest/**` DOM assertions | unit/DOM | extend | render loading UI | `bun run test:dom` | role/aria-live/motion-reduce present | none | impl |
| A11Y-02 (overlay focus) | new `e2e/overlay-focus.spec.ts` | e2e (browser-only) | new | keyboard nav during transition | `bun run test:e2e` | focus correct after transition | none | impl |
| ARCH-02 (estimate non-blocking) | `e2e/estimates-shell-streaming.spec.ts` + `estimates-crud-latency.spec.ts` | e2e+perf | extend | seeded estimate | `bun run test:e2e:perf` | skeleton-first; CRUD latency unchanged | none | impl |
| ARCH-03 (share migration) | `e2e/shared-link-receiver.spec.ts` + new query tests | e2e+unit | extend/new | seeded share token | `bun run test:e2e` + `bun run test:dom` | FMP improved; cache dedupe | none | impl |
| UX-03 (overlay suppression) | extend route-transition spec | e2e | extend | skeleton route nav | `bun run test:e2e` | overlay suppressed on skeleton routes | none | impl |
| PERF-01 (evaluators) | docs + `metrics/` | evidence | new | per EV-* | `bun run perf:*` | baselines captured | none | impl |
| PERF-02 (RUM beacon) | new `tests/vitest/web-vitals-beacon.test.ts` + denial/redaction | unit+security | new | beacon fixture | `bun run test:dom` | 204 on valid; 413/429/400 on bad; no PII | none | impl |
| PERF-03 (bundle gate) | CI | CI | extend | build | `bun run build` + budget script | strict gate green | advisory today | impl/owner |
| PERF-04 (auth CI perf) | extend `route-transition-performance.spec.ts` | e2e+CI | extend | seeded auth fixture | CI | authed scenario posted | skip in CI today | impl |
| ARCH-01 (agent rules) | `scripts/validate-ai-workflow-adapters.mjs` | static | existing | n/a | `bun run validate:agents` | exit 0 | none | impl |
| REL-02 (perpetual-skeleton escape) | new vitest/playwright | unit/e2e | new | network-cut fixture | `bun run test:dom`/`test:e2e` | error UI after timeout | none | impl |

## 3. Adversarial scenario matrix (UltraQA-style) — see `19_RESEARCH...md` for the full table

Covers: malformed/oversized input, missing fields, auth denied, network drop, duplicate submit, race, stale cache, retry after partial success, cancellation, offline, misleading success, dirty-worktree/concurrent-agent safety, hung commands.

## 4. Validation for THIS planning pass

- **Static:** every doc cross-references correctly; no requirement untraced; no vague task; paths/symbols exact or marked BLOCKED/DISCOVERY.
- **`git diff --check`:** clean (no application code touched).
- **No tests run** (planning-only). Residual risk: none for the pass; future phases carry implementation risk.

## 5. Skipped/unavailable validation (honest)

- No native independent verifier (emulated).
- No browser/provider/hosted proof (planning-only) — future phases must add it.
- No `bun run validate:agents` run yet (Phase 4 task) — recorded as future evidence.
