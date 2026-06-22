# Launch-Readiness Audit Findings — Testing, CI & Quality Gates

Domain 10 of the 2026-06-19 Launch-Readiness Audit. Read-only on source/config; all
evidence is `path:line` or a verified command result.

## Scope & coverage

**Read deeply:** `.github/workflows/ci.yml`, `vitest.config.ts`, `playwright.config.ts`,
`tsconfig.json`, `eslint.config.mjs`, all 18 `e2e/*.spec.ts` gating headers, the full
`package.json` script block (`prove:*` / `launch:*` / `perf:*`), and the prior cleanup
pack's testing audits (`10_TEST...`, `14_TESTING...`).

**Empirically ran (this audit):** `bun run type-check` (PASS), `bun run lint` (FAIL, 6
errors), `bun run lint:design-system` (FAIL, 1), and `gh run list`/`gh run view` for CI
history.

**Counted:** 372 `tests/vitest/**` dom specs, 5 `tests/unit` specs, 18 `e2e` specs, 649
src `.ts(x)` files. Critical paths have dedicated suites (auth: ~13 files; publication:
~22; share: several; export: 5; RLS: prove scripts + contract tests).

**Deferred / not run:** full `bun run test:dom` (the all-DOM phase is documented to hang
and a ~525s run was out of scope for a read-only audit), `bun run build`, live `prove:*`
and `launch:*` (need live providers), authenticated e2e (need dev-auth/storage-state).

## Reconciliation vs prior packs

| Prior artifact | What it said | This audit |
|---|---|---|
| `current-state.md:25-28` (FAST PATH known reds) | validate red = "charts `set-state-in-effect`" + "`ProposalExportPreviewDialog` design-lint"; all-DOM phase can hang | **Stale.** Lint reds are now in `useLiquidGlassRefraction.ts` + `projects-page-client.tsx` (not charts); design-lint red moved to `MainSidebar.tsx:370` (not ProposalExportPreviewDialog). See TESTING-02. |
| `2026-06-14-Codebase-Cleanup-Plan/14_TESTING...` | baseline: type-check/build/unit PASS, lint FAIL (65 err), test:dom FAIL (2 known) | Partially superseded: lint now 6 errors (debt was paid down), the 2 named dom failures may be fixed (deferred-verify). Validation-tier framework is reusable and good. |
| `19_OPEN_QUESTIONS_OWNER_GATES.md:24` (VQ-4) | "Is CI enabled or deferred? Reconcile README." | **Answered & escalated:** CI is enabled at the repo level but has **not run since 2026-05-18** despite a current pushed `origin/main`. See TESTING-01. |
| `10_TEST...` test classification | tests are healthy, well-classified; e2e mostly env-gated | Confirmed. Coverage is a strength; the gate is the problem. |
| `2026-06-19-Launch-Readiness-Audit/API-Routes...` (sibling) | API/action correctness | No overlap; CI gating of those routes is this pack. |

---

## Findings

### TESTING-01 — CI has not executed on `main` in ~a month; its design forces it red
- **Severity:** critical · **launch_blocker:** true · **confidence:** high
- **Files:** `.github/workflows/ci.yml:21`, `package.json` (`validate`)
- **Evidence:** `gh run list --branch main` shows the most recent CI run dated
  **2026-05-18T08:32**, conclusion `failure`; system date is 2026-06-19 and `origin/main`
  HEAD is `ccc5b7f3` dated 2026-06-19 (pushed, current). So a current codebase has had
  **zero CI runs for ~a month.** Of the last 30 runs, 25 failed / 5 succeeded, and all 5
  successes predate the current validate chain. The May-18 failure failed at the `Build`
  step. Today, `ci.yml:21` runs `bun run validate`, which chains `bun run lint`, and lint
  is red (TESTING-02) — so even if the workflow fired it would fail before build.
- **Impact:** The single automated launch gate is dark. Whether the cause is that runs are
  suppressed/quota'd, the trigger is mis-scoped, or pushes don't fan out to Actions, the
  practical result is identical: **no change merged in the last month was verified by CI**,
  and the gate cannot certify the codebase before exposing it to beta users.
- **Recommendation:** (1) Determine why no runs fired since May 18 (check Actions tab /
  billing / `workflow_dispatch` a manual run on current `main`). (2) Make `validate` go
  green (TESTING-02). (3) Add `timeout-minutes` (TESTING-03). (4) Require one green run on a
  PR as a launch checklist item; consider a branch-protection required check once green.
- **Effort:** M · **existing_plan_overlap:** partial:2026-06-14-Codebase-Cleanup-Plan
  (VQ-4 asked the question; this answers + escalates it).

### TESTING-02 — `bun run validate` (the CI command) is red at lint; known-red note is stale
- **Severity:** high · **launch_blocker:** true · **confidence:** high
- **Files:** `src/components/sidebar/useLiquidGlassRefraction.ts:118`,
  `useLiquidGlassRefraction.ts:122`, `src/components/workshop/projects-page-client.tsx:691`,
  `src/components/sidebar/MainSidebar.tsx:370`, `current-state.md:25-28`
- **Evidence:** `bun run lint` → `✖ 22 problems (6 errors, 16 warnings)`. The 6 errors:
  3 are `@typescript-eslint/no-require-imports` in `.gitnexus/run.cjs` (a git-ignored,
  local-only tool file — absent in a fresh CI checkout, so CI-irrelevant; see TESTING-04);
  the 3 **real source** errors are `useLiquidGlassRefraction.ts:118` ("Cannot access refs
  during render"), `:122` (`react-hooks/set-state-in-effect`), and
  `projects-page-client.tsx:691` (`set-state-in-effect`). Separately `bun run
  lint:design-system` → fails on `MainSidebar.tsx:370` bold/fill icon weight. `bun run
  type-check` **passes**. The FAST-PATH known-red text names "charts `set-state-in-effect`"
  and "`ProposalExportPreviewDialog` design-lint" — both have moved; following it would
  send a fixer to the wrong files.
- **Impact:** `validate` cannot exit 0, so CI (which runs `validate`) is permanently red by
  construction. The stale note also wastes triage time. The 3 hooks errors are genuine
  React-correctness smells worth fixing regardless of the gate.
- **Recommendation:** Fix the 3 `react-hooks` errors (small, localized). Treat the design
  -lint as advisory per DESIGN.md alpha status — either fix the icon weight or carve a
  sanctioned exception so `lint:design-system` stops blocking `validate`. Update
  `current-state.md:25-28` to the current red set.
- **Effort:** S · **existing_plan_overlap:** stale:current-state.md (known-red list is
  outdated).

### TESTING-03 — CI has no `timeout-minutes`; the documented `test:dom` hang can stall the runner
- **Severity:** high · **launch_blocker:** false · **confidence:** high
- **Files:** `.github/workflows/ci.yml` (no `timeout-minutes` on job or steps),
  `vitest.config.ts:11,17`, `current-state.md:27`
- **Evidence:** `ci.yml` defines no `timeout-minutes` anywhere, so the job inherits
  GitHub's 360-minute default. `current-state.md:27` documents "the all-DOM phase can hang";
  `vitest.config.ts` runs `fileParallelism:false` with `testTimeout:30_000` and the comment
  notes a "~525s full run under GC pressure." `package.json` `test:dom` uses
  `vitest run --maxWorkers=1` (fully serial). A hang in the all-DOM phase inside `validate`
  would therefore tie up a runner for up to 6h per push with no fast-fail.
- **Impact:** Once CI is firing again (TESTING-01), a hang burns CI minutes/quota and delays
  signal, and there is no per-step ceiling to localize the failure.
- **Recommendation:** Add `timeout-minutes` to the job (e.g. 30) and ideally per-step. Root
  -cause the all-DOM hang (serial GC pressure across 372 specs) — consider sharding the dom
  suite or a vitest pool tweak. Keep `fileParallelism:false` only where the perf suites
  require it; the comment claims it is load-bearing, so confirm before changing.
- **Effort:** M · **existing_plan_overlap:** partial:2026-06-14-Codebase-Cleanup-Plan
  (notes the hang as a fix-forward item, no CI-timeout remediation).

### TESTING-04 — eslint lints `.gitnexus/**`, producing local-only errors that mask the real red set
- **Severity:** medium · **launch_blocker:** false · **confidence:** high
- **Files:** `eslint.config.mjs:8-30` (globalIgnores omits `.gitnexus/**`),
  `.gitnexus/run.cjs:29-31`
- **Evidence:** `git check-ignore .gitnexus/run.cjs` → git-ignored (not tracked), yet
  `eslint.config.mjs` ignore list (`.next`, `.vercel`, `.ai`, `.agents`, `.claude`,
  `.codex`, `.cursor`, `.hermes`, `.omx`, …) does **not** include `.gitnexus/**`. So local
  `bun run lint` reports 3 `no-require-imports` errors from `.gitnexus/run.cjs` that do not
  exist in CI's fresh checkout. This inflates the local error count from 3→6 and obscures
  which reds actually block CI.
- **Impact:** Triage confusion (local red ≠ CI red); a fixer could chase a generated tool
  file. Low real-world severity but a clear quality-gate hygiene gap.
- **Recommendation:** Add `.gitnexus/**` to `globalIgnores` in `eslint.config.mjs`.
- **Effort:** S · **existing_plan_overlap:** none.

### TESTING-05 — CI exercises almost no authenticated browser path; critical flows have zero e2e coverage in CI
- **Severity:** high · **launch_blocker:** false · **confidence:** high
- **Files:** `.github/workflows/ci.yml:28-31`, `e2e/*.spec.ts` (gating headers),
  `playwright.config.ts:16`
- **Evidence:** `ci.yml` runs `test:e2e` + `test:e2e:perf` but provides **no** Supabase /
  dev-auth / storage-state secrets (`rg env:|secrets ci.yml` → none). Of 18 specs, only 3
  run without an env gate (`auth.spec.ts`, `landing-audit.spec.ts`,
  `route-transition-performance.spec.ts`), and the route-perf spec itself short-circuits
  without `ARCHESTIMATOR_DEV_AUTH_BYPASS`/`PLAYWRIGHT_STORAGE_STATE`
  (`route-transition-performance.spec.ts:72-74`). Every authenticated/critical flow is
  `test.skip`-gated: estimates CRUD/streaming/tabs/DnD, teamspace collaboration, shared
  -link receiver, project-invite entry, notifications, template-insert, workshop routes
  (e.g. `estimates-crud-latency.spec.ts:14`, `shared-link-receiver.spec.ts:23`,
  `teamspace-collaboration.spec.ts:28`, `project-invite-entry.spec.ts:7`). So CI's browser
  signal is effectively *signed-out auth-redirect + landing audit* only. Export and
  publication have **no** e2e spec at all (only vitest contract tests).
- **Impact:** A regression in authenticated workshop, estimate editing, share/publication
  receiving, or export rendering would not be caught by any automated browser run in CI —
  exactly the surfaces beta users will hit. (Vitest contract/DOM tests give real coverage,
  so this is a defense-in-depth gap, not a total blind spot — hence not a hard blocker.)
- **Recommendation:** Stand up a CI lane with `ARCHESTIMATOR_DEV_AUTH_BYPASS=1` (or a
  seeded storage-state) + a Supabase target so at least `workshop-library-routes`,
  estimates streaming, and shared-link-receiver smokes run. Add an export smoke spec. If
  out of scope for beta, document explicitly that authenticated e2e is manual-only and add a
  pre-beta manual run of the gated specs to the launch checklist.
- **Effort:** L · **existing_plan_overlap:** none (cleanup pack classified e2e as
  "manual" but did not flag the CI-coverage gap as a launch risk).

### TESTING-06 — `tests/` and `e2e/` are excluded from type-checking; test code can rot untyped
- **Severity:** medium · **launch_blocker:** false · **confidence:** high
- **Files:** `tsconfig.json:33`
- **Evidence:** `tsconfig.json:33` → `"exclude": ["node_modules", "tests", "e2e",
  "vitest.config.ts", "playwright.config.ts"]`. `bun run type-check` (`tsc --noEmit`)
  therefore never type-checks 372 dom + 18 e2e + 5 unit specs. Vitest/Playwright transpile
  per-file (esbuild/swc) and do **not** do project-wide type-checking, so a type error in a
  test (wrong mock shape, drifted fixture, stale Supabase type) surfaces only as a runtime
  failure or silently passes. This is a real risk here given the memory note that
  `supabase/types.ts` drifts.
- **Impact:** Test/fixture type drift goes undetected by the gate; a test asserting against
  an outdated DB type can pass while masking a real contract break. Weakens the "tests are
  the safety net" guarantee.
- **Recommendation:** Add a second `tsconfig.test.json` that includes `tests/**` + `e2e/**`
  and run it as a separate `type-check:tests` step in `validate`/CI (kept separate so the
  Next plugin config for `src` stays clean). Low effort, meaningful signal.
- **Effort:** S · **existing_plan_overlap:** none.

### TESTING-07 — No coverage measurement or threshold anywhere in the gate
- **Severity:** low · **launch_blocker:** false · **confidence:** high
- **Files:** `vitest.config.ts` (no `coverage` block), `package.json` (no coverage script)
- **Evidence:** `rg coverage vitest.config.ts package.json` finds only the *storybook*
  component-coverage governance script, not test coverage. Vitest has no `coverage`/
  `thresholds` config; CI never computes line/branch coverage. There is genuinely a lot of
  test code, but no objective measure of which critical modules are covered.
- **Impact:** No visibility into untested critical modules (e.g. server actions, RLS-adjacent
  repositories). Not a blocker for a closed beta with strong contract tests, but it means
  "are auth/export/share covered?" is answered by inspection, not by a number.
- **Recommendation:** Add `@vitest/coverage-v8` with a non-failing report first (observe),
  then set a modest threshold on critical `src/lib/**` paths once a baseline is known.
- **Effort:** M · **existing_plan_overlap:** none.

### TESTING-08 — Unit suite runs on Bun's runner via vitest-compat imports; quiet runner coupling
- **Severity:** info · **launch_blocker:** false · **confidence:** high
- **Files:** `package.json` (`"test": "bun test tests/unit"`), `tests/unit/*.test.ts`,
  `vitest.config.ts:9`
- **Evidence:** `package.json` runs the 5 `tests/unit` specs with `bun test` (Bun's native
  runner), while those files `import { ... } from "vitest"` and rely on Bun's vitest
  -compatibility layer. `vitest.config.ts:9` includes only `tests/vitest/**`, so `tests/unit`
  is never run by vitest — its setup (`tests/vitest/setup.ts`), aliases, and `server-only`
  stub do **not** apply. It works today, but a unit test needing the jsdom env, the `@`
  alias, or the `server-only` stub would fail confusingly under `bun test`.
- **Impact:** Minor footgun / inconsistency between the two runners; no current breakage.
- **Recommendation:** Document the split (Bun=node-pure unit, vitest=jsdom/dom) or fold
  `tests/unit` into vitest for one runner. No urgency.
- **Effort:** S · **existing_plan_overlap:** none.

---

## Summary

| ID | Sev | Blocker | One-liner |
|---|---|---|---|
| TESTING-01 | critical | yes | CI hasn't run on `main` in ~a month; validate-by-design red |
| TESTING-02 | high | yes | `validate` (CI cmd) red at lint; known-red note stale |
| TESTING-03 | high | no | No CI `timeout-minutes`; documented test:dom hang can stall 6h |
| TESTING-04 | medium | no | eslint lints git-ignored `.gitnexus/**`, masks real reds |
| TESTING-05 | high | no | Authenticated/critical flows have ~zero e2e coverage in CI |
| TESTING-06 | medium | no | `tests/`+`e2e/` excluded from type-check |
| TESTING-07 | low | no | No test-coverage measurement/threshold |
| TESTING-08 | info | no | Unit suite on Bun runner via vitest-compat imports |

**Verdict:** Test *content* is a genuine strength (broad, critical-path-aware). The
*gate* is the launch risk: CI is dark and red-by-construction. TESTING-01 + TESTING-02
are the must-fix-before-beta items; the rest are real but acceptable as documented debt if
a manual pre-beta validation run is recorded.
