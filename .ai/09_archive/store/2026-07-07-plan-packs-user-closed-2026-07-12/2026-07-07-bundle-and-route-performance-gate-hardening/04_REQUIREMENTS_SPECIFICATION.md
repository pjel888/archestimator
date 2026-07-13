# Requirements Specification

Every requirement has a stable ID, source, priority, acceptance criteria, validation method, affected code areas, and status. Priorities: `P0` launch-blocking / `P1` should-have / `P2` nice-to-have. Status: `proposed` (this pack; no code changed).

Source strength key: `brief` (from `PROMPT.md`), `repo evidence` (cited file/symbol), `derived` (inferred from repo evidence), `sibling plan` (cited sibling plan), `assumption` (labeled).

---

## PERF — Performance requirements

### PERF-01 — Single layered gate posture (P0)
- **Statement:** Define one layered gate posture: CI (static bundle + route smoke, every PR) → pre-merge deep (richer route-transition harness, on demand) → pre-release (hosted p95). Each layer's purpose, cost, and trigger is documented.
- **Rationale:** Today's gates are fragmented; an executor needs one map to harden without re-discovering the layering.
- **Source:** `brief` ("CI enforcement posture") + `repo evidence` (`ci.yml`, scripts inventory).
- **Dependencies:** PERF-02, PERF-04, PERF-06.
- **Acceptance criteria:**
  - AC-PERF-01a: A gate-layer table names each layer, its evaluator command, its trigger (every PR / on demand / pre-release), its current posture (advisory/blocking), and its flake policy. (`16_*.md`, `09_*.md`)
  - AC-PERF-01b: No layer is defined as "browser automation for every claim"; static/hosted sufficiency is justified per layer.
- **Validation:** Static review of the table against cited scripts.
- **Affected code areas:** None (planning). Future: `.github/workflows/ci.yml`, `package.json`.
- **Status:** proposed.

### PERF-02 — Per-route bundle budgets with global backstop (P0)
- **Statement:** Replace the single global 350 KB budget with per-route gzipped first-load JS budgets sourced from `route-bundle-stats.json`, keeping a single global backstop. Define current vs proposed values and a promotion path from advisory to blocking.
- **Source:** `repo evidence` (`check-performance-budgets.mjs:18`, `:42-55`); `sibling plan` (`OPEN-PERF-02`).
- **Dependencies:** PERF-05 (baseline capture).
- **Acceptance criteria:**
  - AC-PERF-02a: A per-route budget table lists every route in `route-bundle-stats.json` with current measured gz KB (Phase-0 baseline) and proposed budget gz KB.
  - AC-PERF-02b: The global backstop value is named and justified.
  - AC-PERF-02c: Advisory→blocking promotion is defined with a window, a strict-mode trigger, and a rollback.
- **Validation:** Static build output (`bun run build` then read `route-bundle-stats.json`); `check-performance-budgets.mjs --strict` dry-run.
- **Affected code areas (future):** `scripts/check-performance-budgets.mjs`, `.github/workflows/ci.yml`.
- **Status:** proposed.

### PERF-03 — Reconciled route-transition budget source of truth (P0)
- **Statement:** Merge the CI-blocking budgets (`e2e/route-transition-performance-budgets.json`) and the on-demand budgets (`check-route-transition-readiness.ts` defaults) into one source of truth with two explicit tiers: Tier-A "catch-catastrophic" (CI smoke) and Tier-B "regression-catching" (deep harness).
- **Source:** `repo evidence` (Section D of `03_*.md`).
- **Acceptance criteria:**
  - AC-PERF-03a: One file owns the budgets; both consumers read from it (or the plan names the exact migration).
  - AC-PERF-03b: Each tier's values are listed with rationale (Tier-A loose to absorb CI variance; Tier-B tight to catch regressions).
  - AC-PERF-03c: Tier-B values include a flake policy (median-of-N, min successful runs).
- **Validation:** Static review; cross-file consistency check.
- **Affected code areas (future):** `e2e/route-transition-performance-budgets.json`, `e2e/route-transition-performance.spec.ts`, `scripts/check-route-transition-readiness.ts`.
- **Status:** proposed.

### PERF-04 — Authenticated workshop route gate (P1)
- **Statement:** Define a sample-stable authenticated workshop route gate covering the hero/target scenarios in `measure-route-transitions.ts`, with fixture + auth setup, so authenticated latency regressions are caught.
- **Source:** `brief` ("authenticated workshop routes") + `repo evidence` (`measure-route-transitions.ts:198-370`).
- **Dependencies:** PERF-07 (fixture/auth), OPEN-PERF-02.
- **Acceptance criteria:**
  - AC-PERF-04a: The gate names the scenarios, the auth mode (dev-auth-bypass vs storage-state), the sample count, the statistic (median), and the Tier-B budget per scenario.
  - AC-PERF-04b: A CI-runnable path is defined OR the gate is explicitly classified "on-demand/pre-merge" with the reason.
- **Validation:** `bun run perf:measure-routes` + `bun run perf:check-routes` against a seeded fixture.
- **Affected code areas (future):** `scripts/measure-route-transitions.ts`, CI workflow, fixture seed.
- **Status:** proposed.

### PERF-05 — Phase-0 baseline capture (P0)
- **Statement:** Before tightening any budget, capture a baseline for bundle (per route) and route-transition (per scenario) so proposed budgets are evidence-based, not guessed.
- **Source:** `sibling plan` (Phase 0).
- **Acceptance criteria:**
  - AC-PERF-05a: Baseline capture commands and output artifact locations are named.
  - AC-PERF-05b: Baseline includes bundle gz KB per route + route-transition median/overlay per scenario, on the CI runner profile where possible.
- **Validation:** Run capture commands; record artifacts.
- **Status:** proposed.

### PERF-06 — Public share route hosted gate (P1)
- **Statement:** Define the public share route hosted gate using `verify-cloudflare-hosted-performance.ts` per-probe budgets, classified as pre-release (not per-PR CI), and link it to the share feature plan.
- **Source:** `brief` ("public share routes") + `repo evidence` (`verify-cloudflare-hosted-performance.ts:93-110`).
- **Acceptance criteria:**
  - AC-PERF-06a: Share probes (`share-invalid-page` 400 ms, `share-invalid-api` record-only, `workshop-signed-out` 600 ms) are listed with posture.
  - AC-PERF-06b: Pre-release trigger defined; per-PR CI explicitly excluded with reason (hosted, credential-free, location-sensitive).
- **Validation:** `cf:verify-hosted-performance` against prod/preview URL.
- **Status:** proposed.

### PERF-07 — Flake policy (P0)
- **Statement:** Define a flake policy before tightening any route-transition budget: median-of-N, minimum successful runs, retry behavior, and what constitutes a real regression vs noise.
- **Source:** `repo evidence` (`measure-route-transitions.ts` uses median; `check-route-transition-readiness.ts:284` requires `minRuns`).
- **Acceptance criteria:**
  - AC-PERF-07a: Policy states N (runs), min successful runs, statistic (median), and the rule for "regression" (e.g. median > budget AND max > budget × k).
  - AC-PERF-07b: Retry/quarantine behavior for intermittent misses is defined.
- **Validation:** Static review; applied in PERF-03/04.
- **Status:** proposed.

---

## OPS / REL — Operations and reliability requirements

### OPS-01 — Regression triage runbook (P0)
- **Statement:** A runbook that classifies a budget miss as (a) real regression → bisect/fix, (b) budget needs updating → re-baseline + owner sign-off, or (c) flake → retry/quarantine.
- **Source:** `brief` ("regression triage").
- **Acceptance criteria:**
  - AC-OPS-01a: Runbook lists the decision tree, the commands to run, the artifact locations, and the owner/action for each branch.
  - AC-OPS-01b: Runbook covers bundle miss, route-transition miss, and hosted-p95 miss.
- **Validation:** Static review.
- **Affected code areas:** None (doc). Future: `.ai/` ops docs.
- **Status:** proposed.

### REL-01 — No-slowdown guardrail (P0)
- **Statement:** The hardened gates must not slow routine iteration unnecessarily. The plan defines which gates are per-PR (fast, static + smoke) vs on-demand/pre-release (slow, browser/hosted), and gives a target wall-clock for the per-PR gate increment.
- **Source:** `brief` ("without slowing routine iteration unnecessarily").
- **Acceptance criteria:**
  - AC-REL-01a: Per-PR gate increment target wall-clock is named (e.g. ≤ +X min over current CI).
  - AC-REL-01b: Slow gates (deep route harness, hosted p95) are explicitly opt-in/pre-release.
- **Validation:** Static review; future CI timing comparison.
- **Status:** proposed.

---

## SEC — Security requirements

### SEC-01 — Credential-free hosted proof posture (P1)
- **Statement:** Hosted performance proof remains credential-free, fake-token, non-mutating, and confined to the bound Worker; no real share tokens, no provider mutation, no secret exposure.
- **Source:** `repo evidence` (`verify-cloudflare-hosted-performance.ts:23-24 BODY_NOTE`, `:13 DEFAULT_FAKE_TOKEN`).
- **Acceptance criteria:**
  - AC-SEC-01a: Hosted verifier config never reads real tokens, env files, or secrets; never deploys; never mutates providers.
  - AC-SEC-01b: Any future authenticated perf fixture uses dev-auth-bypass (localhost only) or a throwaway storage state, never production credentials.
- **Validation:** Static review of verifier + dev-auth gate.
- **Status:** proposed (posture already met by current code; requirement locks it in).

---

## TEST — Testing requirements

### TEST-01 — Test execution matrix covers every gate (P0)
- **Statement:** Every gate has a named test/proof command, fixture setup, expected evidence artifact, and known-red status.
- **Source:** `brief` ("Required Plan Pack") + directive Test Execution Matrix.
- **Acceptance criteria:**
  - AC-TEST-01a: `12_*.md` Test Execution Matrix has one row per gate with command + artifact + status.
- **Validation:** Static review.
- **Status:** proposed.

### TEST-02 — Adversarial scenario matrix for gate failure modes (P1)
- **Statement:** Adversarial matrix covers budget-miss, flake, missing diagnostics artifact, partial-read chunks, auth-failure-during-measure, and hosted-route-contract-fail.
- **Source:** directive (UltraQA-style).
- **Acceptance criteria:**
  - AC-TEST-02a: `19_*.md` adversarial matrix lists each scenario with setup, expected signal, and status.
- **Validation:** Static review.
- **Status:** proposed.

---

## DOC — Documentation requirements

### DOC-01 — Links to UX and observability plans (P1)
- **Statement:** The pack links (read-only) to the sibling transition/loading UX plan and the Worker observability plan where they overlap, without duplicating or editing them.
- **Source:** `brief` ("links to UX plans").
- **Acceptance criteria:**
  - AC-DOC-01a: README + `02_*.md` name the linked plans and the overlap.
- **Validation:** Static review.
- **Status:** proposed.

---

## Shadow-Path Matrices

### Matrix 1 — CI bundle gate flow

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test/proof |
|---|---|---|---|---|---|---|---|---|---|---|
| `check-performance-budgets.mjs` post-build | Stats array; routes ≤ budget; exit 0 | `STATS_PATH` missing → advisory SKIP / strict FAIL (`:22-31`) | Empty array → 0 routes; PASS (`:34-37`) | Non-array → advisory exit 0 / strict exit 1 (`:34-37`) | n/a (no auth) | Chunk read fails → `partialReadRoutes`; advisory warn / strict fail (`:99-110`) | Two builds racing → diagnostics overwritten; CI serializes builds | Re-run after `bun run build` | CI step green/red/continued | `bun run scripts/check-performance-budgets.mjs --strict` after build |

### Matrix 2 — Route-transition CI smoke flow

| Flow | Happy path | Missing auth | Empty result | Invalid input | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test/proof |
|---|---|---|---|---|---|---|---|---|---|
| `route-transition-performance.spec.ts` public scenarios | Median ≤ budget; overlay count 0 | n/a (public) | n/a | Bad budget JSON → throw at import | CI runner slow → timeout | Parallel test workers → Playwright isolates | Re-run | CI green/red | `bun run test:e2e:perf` |
| Authenticated scenarios | transitionMs ≤ 10 000 ms | `test.skip` without bypass/storage-state (`:345-349`) | n/a | n/a | Timeout | Isolated | Re-run with auth | Skipped (current CI reality) | Same spec |

### Matrix 3 — Hosted p95 verifier flow

| Flow | Happy path | Bad base URL | Fake token | Provider error | Concurrency | Retry/idempotency | User-visible result | Test/proof |
|---|---|---|---|---|---|---|---|---|
| `verify-cloudflare-hosted-performance.ts` | All required probes pass contract; p95 ≤ budget | Rejects localhost/private/non-https (`:153-176`) | Uses `DEFAULT_FAKE_TOKEN`; probes invalid-token paths by design | Route contract fail → `passed=false`; exit 1 | Sequential probes; no concurrency | Re-run; sample-count gate (`MIN_P95_RUNS`) | JSON + markdown report; exit code | `cf:verify-hosted-performance` |
