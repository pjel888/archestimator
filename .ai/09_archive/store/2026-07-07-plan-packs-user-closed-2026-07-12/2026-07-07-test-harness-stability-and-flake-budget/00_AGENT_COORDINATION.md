# Agent Coordination — Test Harness Stability And Flake Budget

**Plan folder:** `.ai/03_plans/2026-07-07-test-harness-stability-and-flake-budget`
**Profile:** `exhaustive` (cross-cutting test-harness work; launch-readiness adjacent)
**Verification mode:** `emulated` (single planning agent this session; no native independent reviewer available). Per the suite authority contract, emulated verification caps overall readiness at 97 and caps an exhaustive package at `CONDITIONALLY READY` until an independent reviewer or the owner accepts the pack.

## Master goal

Stabilize the Archestimator test harness so first-user launch can depend on fast,
trustworthy proof loops. Convert the currently-implicit stability posture (one
inline comment in `vitest.config.ts`, no CI, no quarantine policy, no measured
flake rate, no timing budget) into an explicit, measurable, owner-gated
reliability contract.

- **Outcome:** a future executor can improve test reliability with clear
  before/after metrics and **no hidden coverage loss** (the PROMPT stop condition).
- **Problem solved:** the full vitest run is ~525s, single tests can exceed 15s
  under GC pressure, `fileParallelism:false` is load-bearing but undocumented as a
  policy, CI is fully disabled, no flake detection/reporting exists, and removing
  coverage for speed is a real risk.
- **Scope (owns):** test-execution reliability — inventory, slow/flaky
  characterization, parallelism strategy, quarantine policy, retry rules, CI
  timing budgets, evidence reporting, owner thresholds.
- **Non-goals (de-conflicted, owned by sibling packs):**
  - E2E fixture factory, auth-setup, D1 seed, smoke-flow list, CI matrix for E2E,
    cross-browser exhaustiveness → `2026-07-07-e2e-fixture-smoke-harness`.
  - Production bundle-size budgets, route-transition production latency budgets,
    authenticated Tier-B deep harness, hosted pre-release gate →
    `2026-07-07-bundle-and-route-performance-gate-hardening`.
  - This pack **references** the e2e flake budget and the route-transition timing
    budgets as inputs but does not redefine them.
- **Planning deliverables:** the full document set in this folder (see README).
- **Validation criteria:** before/after wall-clock + per-file timing harness,
  quarantine ledger schema, CI timing budget table, retry rule table, owner
  threshold table, evidence-report command — all with exact file paths and commands.
- **Stop condition:** a future executor can reduce wall-clock and flake rate with
  measured before/after metrics and no coverage loss; see README readiness gates.

## Authority and safety contract

- Planning-only. No application source, tests, migrations, `package.json`,
  `vitest.config.ts`, `playwright.config.ts`, provider state, or Git state is
  modified by this pass.
- Shared live worktree: concurrent edits were observed at planning time
  (`projects-page-client.tsx`, `projects-page-access-tabs.test.tsx`,
  `dropdown-menu.tsx`, `bun.lock`, `package.json`). All writes are confined to
  this plan folder. Those concurrent edits are preserved untouched.
- Stack baseline (verified from source): Next.js 16.2.10, React 19.2.7, Bun
  1.3.14, Vitest 4.1.9, `@playwright/test` 1.60.0.

## Specialist workstreams (emulated as separated passes)

No native subagents were available. The required domains were covered as
separated analysis passes by the same agent and are labeled `emulated`:

| Workstream | Mode | Coverage |
|---|---|---|
| Product/scope/requirements | emulated | `02`, `04` |
| Codebase architecture & conventions | emulated | `03`, `06` |
| Test/QA strategy | emulated (primary domain) | `12`, `19` |
| Performance/reliability | emulated | `09` |
| Operations/rollout (CI timing) | emulated | `13` |
| Blast radius / dependencies | emulated | `10` |
| Adversarial gap analysis | emulated | `14`, `19` |
| Final verifier | emulated | `17` |

A read-only Explore subagent was dispatched for breadth evidence (perf budgets,
Playwright gating, skip classification, CI disabled/active status). Its findings
are cited throughout `03`/`09`/`12`/`19` and are labeled as the source.

## Coordination ledger

| Lane | Goal | Scope | Evidence | Dependencies | Findings | Conflicts | Status |
|---|---|---|---|---|---|---|---|
| Lead (planning) | Plan pack for harness stability + flake budget | All docs in this folder | `vitest.config.ts`, `playwright.config.ts`, `package.json`, `.github/workflows*`, `tests/**`, `e2e/**` | e2e-fixture pack, perf-gate pack | See `03`/`09`/`12` | Boundary overlap (resolved in `10`) | COMPLETE |
| Explore subagent | Breadth evidence on perf budgets, gating, skip classification, CI status | read-only repo survey | file:line citations in `19` §A | none | Confirms no active CI, no flake-quarantine skips, tightest budgets catalogued | none | COMPLETE |

## Boundary with sibling plans (conflict prevention)

| Surface | This pack owns | Sibling owns |
|---|---|---|
| Vitest wall-clock + per-file timing | YES | — |
| Vitest parallelism / worker strategy | YES | — |
| Vitest testTimeout policy | YES | — |
| Flake definition, budget, quarantine policy, retry rules | YES | — |
| Evidence reporting (flakewatch, timing JSON) | YES | — |
| E2E fixture/auth/seed | references only | `2026-07-07-e2e-fixture-smoke-harness` |
| E2E browser matrix | references only | `2026-07-07-e2e-fixture-smoke-harness` |
| Production bundle-size budget | references only | `2026-07-07-bundle-and-route-performance-gate-hardening` |
| Route-transition production latency budget | references only | `2026-07-07-bundle-and-route-performance-gate-hardening` |
| `vitest.config.ts` / `playwright.config.ts` edits | prescribes (implementation-time) | e2e pack may also prescribe playwright.config; coordinate via `10` |

## Skills discovered / used

| Skill | Used? | Why |
|---|---|---|
| `archestimator-plan-pack` | yes | binds generic planning to the dated `.ai/03_plans/` convention + loop contract |
| `writing-plans` / `plan` / `ce-plan` | no (subsumed) | the repo-local plan-pack skill is the binding layer |
| `gitnexus` | no | narrow local read-only inspection was cheaper than graph traversal for test-inventory work |
| Explore subagent | yes | breadth evidence (cited in `19`) |
| `verification-before-completion` | yes (applied) | drives the completion audit in this file and `17` |

No skill was fabricated. No unavailable capability was claimed.

## Stale-plan revalidation checklist (for the future executor)

Before acting on this pack, re-verify:

1. `vitest.config.ts:9-17` still has `fileParallelism:false` and `testTimeout:30_000` (the load-bearing facts).
2. `package.json` `validate`/`test`/`test:dom`/`perf:profile-peak-load` scripts are unchanged.
3. `.github/workflows/` is still empty (CI still disabled) — if CI was re-enabled, re-read its timing steps.
4. File counts in `03` §1 are within ~5% (tests/vitest ~634, tests/unit 6, e2e 9).
5. The flakewatch/quarantine tooling this pack prescribes does not already exist under another name.

## Completion audit summary (self, emulated)

The plan's own completion is gated by the runtime completion verifier. This
self-audit confirms the **planning deliverable** is complete per the PROMPT stop
condition; it does not claim the *implementation* is done. See `17` for the
requirement-by-requirement verifier matrix.
