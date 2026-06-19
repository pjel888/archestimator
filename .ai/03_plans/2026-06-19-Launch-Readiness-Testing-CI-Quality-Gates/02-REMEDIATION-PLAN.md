# Remediation Plan — Testing, CI & Quality Gates

> Adversarially verified 2026-06-19. Read-only on source/config; this file is plan scratch.
> Verdicts and proof gates are in `03-EVIDENCE-AND-VERIFICATION.md`. Ledger in `LOOP_LEDGER.md`.

## What the verifier changed vs the prior audit

The prior audit (`01-AUDIT-FINDINGS.md`) is broadly correct on the big picture (CI is dark
and `validate` is red-by-construction) but had material gaps and one refutation:

1. **TESTING-01 root cause is now PROVEN, not speculative.** The CI workflow is in state
   `disabled_manually` (`gh workflow list --all` → `CI  disabled_manually  277898857`).
   Actions is enabled at the repo level (`actions/permissions` → `enabled:true`), the repo
   is not archived/disabled, and `pushed_at` is 2026-06-19 with **2731 commits on
   origin/main since the last run** — so pushes arrive but the workflow does not fire because
   it was manually turned off. The prior audit listed three guesses and identified none.
2. **TESTING-02 understated the red surface.** `validate` (package.json:56) is
   `type-check && lint && lint:design-system && lint:design && test && test:dom` — it chains
   **three** independently-failing gate commands, not two:
   - `lint` → 6 errors (3 real source, 3 from git-ignored `.gitnexus/run.cjs`)
   - `lint:design-system` → fails on `MainSidebar.tsx:370` (icon weight)
   - `lint:design` (the impeccable `--strict` audit) → **exits 2 with 21 anti-patterns** —
     the prior audit omitted this command entirely. It is a hard blocker in `validate`.
   And `validate` ends with `test:dom` (the documented-hang phase). So even after the 3
   react-hooks fixes, `validate` still cannot exit 0.
3. **TESTING-08 is REFUTED.** Its evidence is factually wrong: the `tests/unit/*.test.ts`
   files import from `bun:test` (native Bun), **not** from `"vitest"`. There is no
   vitest-compat coupling footgun. Dropped from remediation.

Net launch-blocker count after verification: **2** (TESTING-01, TESTING-02), but TESTING-02
is larger than scoped because of the `lint:design` omission.

---

## Sequenced remediation (launch-blockers first)

### P0-A — Make `validate` exit 0 (TESTING-02, expanded)  [BLOCKER]

`validate` has four distinct failure sources. Address each; they are independent and can be
done in parallel, but ALL must pass before P0-B is meaningful.

**Step 1 — Fix the 3 real `react-hooks` lint errors.** (effort S, risk low)
- `src/components/sidebar/useLiquidGlassRefraction.ts:118` — `react-hooks` "Cannot access
  refs during render": `strengthRef.current = strength;` runs in the component body (line
  118). Move the ref sync into an effect or compute from `strength` directly inside the rAF
  loop closure (the ref already exists to avoid re-subscribing — read `strength` via a
  `useEffect`-set ref or pass it through the effect deps).
- `useLiquidGlassRefraction.ts:122` — `set-state-in-effect`: `setTransform({})` is called
  synchronously in the effect body. Guard so it only runs when `transform` is non-empty, or
  lazily-initialize `transform` to `{}` and early-return without setState on the
  disabled/reduced-motion path (the empty object is already the initial value, so the setState
  is frequently a no-op write that the lint flags).
- `src/components/workshop/projects-page-client.tsx:691` — `set-state-in-effect`:
  `setBulkDeleteModalMounted(true)` in an effect keyed on `deleteProjectTargetIds.length`.
  This is a "mount the modal once ids appear" latch. Replace with derived state
  (`const bulkDeleteModalMounted = deleteProjectTargetIds.length > 0 || wasEverMounted`) using
  a ref latch, or render the modal conditionally on `deleteProjectTargetIds.length > 0` and
  drop the effect+state entirely if nothing else depends on the latch staying true after the
  ids clear. Confirm the "keep mounted for exit animation" intent before deleting the latch.
- Risk: `useLiquidGlassRefraction` feeds the liquid-glass sidebar (see memory
  `deferred-liquid-glass`/`liquid-glass-sidebar-direction`); verify the rAF transform still
  arms after first paint. `projects-page-client` bulk-delete modal needs a manual open/close
  smoke (exit animation).

**Step 2 — Resolve `lint:design-system` (MainSidebar.tsx:370 icon weight).** (effort S, risk low)
- `scripts/enforce-app-design-system.mjs` flags a bold/fill/duotone icon weight at
  `MainSidebar.tsx:370`. DESIGN.md is an **alpha guide, not law** (per CLAUDE.md + memory
  `design-contract-is-alpha-guide`), so do NOT block on aesthetics. Two valid paths — Philip
  decides:
  - (a) Switch that icon to a regular 1px-outline weight (one-line `weight="regular"` style
    change), OR
  - (b) Add a sanctioned exception in `scripts/enforce-app-design-system.mjs` so
    `lint:design-system` stops hard-failing on this intentional choice.
- Recommendation: prefer (b) if the bold icon is an intentional design decision — keep the
  gate honest by encoding the exception rather than mutating the UI to satisfy a lint.

**Step 3 — Resolve `lint:design` (impeccable `--strict`, 21 anti-patterns).** (effort M, risk low) **[prior audit missed this]**
- `bun run lint:design` = `node .agents/skills/impeccable/scripts/detect.mjs --strict
  src/components` and currently exits 2. The 21 findings are mostly
  `design-system-color` (undocumented literal colors in `src/components/ui/spinner.tsx` and a
  data file, plus `#fff0df`/`#2e0ec7`) and one `layout-transition` (`MainSidebar.tsx:260`
  `transition: width`).
- These are alpha-era design-drift advisories, NOT correctness bugs. Because `validate`
  hard-chains `lint:design`, the choice is binary: either (a) clear the 21 (register the
  brand-orange spinner ramp + the two stray hex values in the impeccable palette/sidecar so
  they are "documented", and convert the `MainSidebar` width transition to a transform/grid
  animation), or (b) **drop `lint:design` out of `validate` and run it as a separate
  non-blocking CI step** (it already IS a separate `ci.yml` step — "Impeccable design audit"
  — so having it ALSO in `validate` double-gates it).
- **Recommended:** remove `lint:design` (and arguably `lint:design-system`) from the
  `validate` chain and let CI run them as discrete, clearly-labeled steps. This separates
  "correctness gate" (type-check + lint + tests) from "design advisory" (DESIGN.md is alpha).
  Rationale: a correctness gate that a designer can turn red by picking a font weight is the
  wrong shape for launch. Edit `package.json:56`:
  `"validate": "bun run type-check && bun run lint && bun run test && bun run test:dom"` and
  keep design audits as their own steps. **Owner decision required** (changes gate semantics).

**Step 4 — De-noise `lint` so the gate matches CI (TESTING-04).** (effort S, risk low)
- Add `".gitnexus/**"` to `globalIgnores` in `eslint.config.mjs:8-30`. `.gitnexus/run.cjs` is
  git-ignored (confirmed `git check-ignore` exit 0) so its 3 `no-require-imports` errors
  exist only locally and vanish in CI's fresh checkout — but they inflate local red 3→6 and
  mislead triage. After this, local `bun run lint` red == CI red (the 3 react-hooks errors).

**Step 5 — Decide `test:dom` inside `validate` (couples P0-A to TESTING-03).** (effort M)
- `validate` ends with `bun run test:dom` (`vitest run --maxWorkers=1`, fully serial, 371
  specs, documented ~525s + can hang). Until the hang is root-caused (TESTING-03), a green
  `validate` is not reliably reproducible. Options: (a) shard the dom suite, (b) split a fast
  `validate` (type+lint+unit) from a separate `test:dom` CI step with its own timeout, (c)
  accept the long run with a CI `timeout-minutes`. **Recommended:** split `test:dom` into its
  own CI step (it already is conceptually) and give `validate` the fast lane, so a lint/type
  regression fails in <60s instead of after a 9-minute dom run.

### P0-B — Re-enable + prove CI (TESTING-01)  [BLOCKER, depends on P0-A]

(effort M, risk low — but do NOT do this before P0-A or it just goes red again)
- Root cause is proven: workflow `CI` is `disabled_manually`. Re-enable with
  `gh workflow enable CI` (or `gh workflow enable .github/workflows/ci.yml`).
- Before enabling, confirm the green path: run `bun run validate` locally to 0 after P0-A,
  and `bun run build` (the prior audit deferred build — it MUST be run; `next build` is the
  only thing that catches `"use server"` non-async-export and design issues per memory
  `use-server-exports-only-async`).
- Add CI `timeout-minutes` (TESTING-03) in the same PR so the first live run can't hang the
  runner for 6h.
- Push a PR (vercel.json has `git.deploymentEnabled:false`, so a push won't auto-deploy — CI
  is decoupled from deploy, good). Confirm ONE green run on the PR. Then, optionally, add a
  branch-protection required check once stably green.
- **Note on minutes:** private-repo Actions minutes may have been the original reason it was
  disabled. Confirm the account has Actions minutes/budget before relying on it as the gate;
  if quota is the constraint, scope CI to PR-only (drop `push: branches: [main, feat/**]`) to
  cut run volume — `on: pull_request` alone still gates every merge.

### P1 — CI robustness (TESTING-03)  [not a blocker; do with P0-B]

(effort M, risk low)
- `.github/workflows/ci.yml` has no `timeout-minutes` anywhere → inherits the 360-min GitHub
  default. Add `timeout-minutes: 30` on the `validate` job and per-step ceilings on the
  long steps (Build, test:dom, e2e). Root-cause the all-DOM hang separately (serial GC
  pressure across 371 specs; `fileParallelism:false` is documented load-bearing for the perf
  suites — do not flip it globally; consider a separate vitest project/pool for perf specs so
  the rest can parallelize).

### P2 — Authenticated e2e coverage in CI (TESTING-05)  [not a blocker; document for beta]

(effort L, risk medium — depends on DB/Auth domain for a CI Supabase target + dev-auth)
- CI runs `test:e2e` + `test:e2e:perf` with **no** Supabase/dev-auth/storage-state secrets, so
  16 of 18 specs `test.skip` and only `auth.spec.ts` + `landing-audit.spec.ts` run
  unconditionally (route-perf also short-circuits without `ARCHESTIMATOR_DEV_AUTH_BYPASS`).
  Authenticated workshop/estimates/share/publication/export have zero CI browser coverage.
- For beta: **document explicitly** that authenticated e2e is manual-only, and add a
  pre-beta manual run of the gated specs (with `ARCHESTIMATOR_DEV_AUTH_BYPASS=1` + a seeded
  storage-state against a test Supabase) to the launch checklist. Vitest contract/DOM tests
  give real defense-in-depth, so this is a gap, not a blind spot.
- Follow-up (post-beta): stand up a CI lane with dev-auth + a Supabase test target for
  `workshop-library-routes`, estimates streaming, and shared-link-receiver smokes; add an
  export smoke spec (export has no e2e spec at all today, only vitest contract tests).
  **Cross-domain dependency:** needs the DB/Auth pack to provide a safe CI Supabase target
  and confirm `ARCHESTIMATOR_DEV_AUTH_BYPASS` cannot leak into production builds.

### P2 — Type-check test code (TESTING-06)  [not a blocker]

(effort S, risk low)
- `tsconfig.json:33` excludes `tests` + `e2e` from `tsc --noEmit`, so 371 dom + 18 e2e + 5
  unit specs are never project-type-checked (esbuild/swc transpile per-file and skip
  type-checking). Given the known `supabase/types.ts` drift (memory
  `supabase-types-not-pure-generated`), a fixture asserting an outdated DB type can pass while
  masking a contract break. Add a `tsconfig.test.json` that extends the base and
  `include`s `tests/**` + `e2e/**`, and a `type-check:tests` script
  (`tsc -p tsconfig.test.json --noEmit`). Run it as a separate CI step (kept separate so the
  Next plugin config for `src` stays clean). Note: eslint already DOES lint test files
  (warnings observed), so this is purely the type layer.

### P3 — Test coverage measurement (TESTING-07)  [not a blocker]

(effort M, risk low)
- No `coverage` block in `vitest.config.ts`, no coverage script (only the storybook
  component-coverage governance script exists). Add `@vitest/coverage-v8` with a
  **non-failing** report first to establish a baseline, then set a modest threshold on
  critical `src/lib/**` paths (server actions, RLS-adjacent repositories). Do not gate on it
  for beta.

---

## Cross-domain dependencies

- **P2 authenticated e2e** depends on the **DB/Auth** pack for a CI-safe Supabase target and
  a verified `ARCHESTIMATOR_DEV_AUTH_BYPASS` that is production-fail-closed (a launch:verify
  script `verify-hosted-sensitive-routes` already exists — coordinate).
- **P0-A Step 3/2 design lints** intersect the **Design/UX** posture: DESIGN.md is alpha, so
  the recommended move is to de-gate design audits from `validate`, not to chase pixel
  conformance. Philip owns this call.
- No migration/RLS changes are required by any item in this pack (CI/tooling/test-config only).

## Owner decisions required

1. P0-A Step 3: remove `lint:design` (and `lint:design-system`) from the `validate` chain
   and run them as discrete non-blocking CI steps? (Recommended yes — separates correctness
   from alpha design advisory.)
2. P0-B: confirm Actions minutes/budget for a private repo, and whether CI should be
   PR-only vs push+PR to control run volume.
3. P2: is authenticated-e2e-in-CI in scope for beta, or manual-only with a checklist entry?
