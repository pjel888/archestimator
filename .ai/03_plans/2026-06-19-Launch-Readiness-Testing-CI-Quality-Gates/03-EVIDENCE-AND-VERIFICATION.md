# Evidence & Verification — Testing, CI & Quality Gates

> Adversarial verification pass, 2026-06-19. Read-only on source. Every verdict below was
> reproduced from disk/commands in this session, not from the prior audit's memory.

## Commands run this pass (reproducible)

| Command | Result |
|---|---|
| `bun run type-check` | **exit 0** (PASS) — refutes any "type-check red" worry |
| `bun run lint` | **exit 1**, `✖ 22 problems (6 errors, 16 warnings)` |
| `bun run lint:design-system` | **exit 1** — `MainSidebar.tsx:370` bold/fill icon weight |
| `bun run lint:design` | **exit 2** — `21 anti-patterns found` (prior audit omitted) |
| `gh run list --branch main --limit 10` | latest run **2026-05-18T08:32**, conclusion failure |
| `git log origin/main --oneline --since=2026-05-18 \| wc -l` | **2731** commits, zero CI runs |
| `gh api repos/:owner/:repo/actions/permissions` | `{"enabled":true,"allowed_actions":"all"}` |
| `gh api repos/:owner/:repo` | `"archived":false,"disabled":false`, `pushed_at:2026-06-19` |
| **`gh workflow list --all`** | **`CI  disabled_manually  277898857`** ← ROOT CAUSE |
| `ls e2e/*.spec.ts \| wc -l` | 18 specs |
| skip-gated e2e count | 16 of 18 use `test.skip`/`describe.skip`/`skipIf` |
| non-gated e2e specs | only `auth.spec.ts`, `landing-audit.spec.ts` |
| `grep -i 'secret\|env:\|SUPABASE' ci.yml` | NONE |
| dom specs / unit specs | 371 dom (`tests/vitest`), 5 unit (`tests/unit`) |
| `git check-ignore .gitnexus/run.cjs` | exit 0 (git-ignored, confirmed) |
| coverage in vitest.config/package.json (non-storybook) | NONE |

The 6 lint errors (exact): `useLiquidGlassRefraction.ts:118` (refs-during-render),
`:122` (set-state-in-effect), `projects-page-client.tsx:691` (set-state-in-effect), and 3×
`no-require-imports` in `.gitnexus/run.cjs:29-31` (CI-irrelevant, local-only).

## Verdicts

### TESTING-01 — CI dark on `main` ~1 month — **CONFIRMED, severity upheld (critical/blocker), root cause newly proven**
Prior audit confirmed the symptom but speculated on cause. Verifier **proved** it: the `CI`
workflow is `disabled_manually` (`gh workflow list --all`). Actions is enabled, repo is live,
`pushed_at` is current, and 2731 commits landed on `origin/main` with zero runs. Not quota,
not trigger mis-scope, not a fan-out problem — the workflow was turned off. The prior
recommendation ("determine why no runs fired") is now answered. Re-enabling is a one-liner
(`gh workflow enable CI`) but must follow P0-A or it immediately re-reds.

### TESTING-02 — `validate` red at lint; stale known-red note — **CONFIRMED + ADJUSTED (scope widened)**
The 3 real react-hooks errors and the stale `current-state.md:25-28` note are confirmed
exactly (the note names `charts set-state-in-effect` + `ProposalExportPreviewDialog`
design-lint; the actual reds are `useLiquidGlassRefraction.ts` + `projects-page-client.tsx`
+ `MainSidebar.tsx:370`). **Adjustment:** the prior audit treated `validate` as "type-check +
lint + design-lint" and missed that `validate` (package.json:56) also chains **`lint:design`**
(impeccable `--strict`, exit 2, 21 anti-patterns) and **`test:dom`** (the hang phase). So
making `validate` green is a larger job than "fix 3 hooks errors + 1 icon". Severity stays
high/blocker; scope corrected. Type-check passing is confirmed (refutes any inflation there).

### TESTING-03 — No CI `timeout-minutes`; test:dom hang — **CONFIRMED (high/not-blocker)**
`ci.yml` has no `timeout-minutes` (verified — file is 32 lines, none present); inherits 360min
default. `vitest.config.ts:11,17` confirms `fileParallelism:false` + `testTimeout:30_000` +
the "~525s under GC pressure" comment; `test:dom` is `vitest run --maxWorkers=1` (serial).
Confirmed as written. Not a launch blocker by itself but compounds TESTING-01 once CI fires.

### TESTING-04 — eslint lints git-ignored `.gitnexus/**` — **CONFIRMED (medium/not-blocker)**
`git check-ignore .gitnexus/run.cjs` exit 0; `eslint.config.mjs:8-30` globalIgnores omits
`.gitnexus/**`; the 3 `no-require-imports` come from `.gitnexus/run.cjs:29-31`. Local red 6,
CI-relevant red 3. Confirmed exactly. One-line fix.

### TESTING-05 — ~zero authenticated e2e in CI — **CONFIRMED (high/not-blocker)**
18 specs, 16 skip-gated, 14 env-gated; ci.yml has no Supabase/dev-auth secrets; only
`auth.spec.ts` + `landing-audit.spec.ts` run unconditionally; `route-transition-performance`
short-circuits on `ARCHESTIMATOR_DEV_AUTH_BYPASS`/`PLAYWRIGHT_STORAGE_STATE` (lines 72-74).
Export/publication have no e2e spec at all. Confirmed. Defense-in-depth gap (vitest contract
tests cover the logic), so not-blocker is correct — but document as manual-only for beta.

### TESTING-06 — tests/e2e excluded from type-check — **CONFIRMED (medium/not-blocker)**
`tsconfig.json:33` excludes `tests`, `e2e`. `tsc --noEmit` therefore skips 371+18+5 specs.
Real risk given documented `supabase/types.ts` drift. Note the prior audit's framing that
test code is wholly unchecked is slightly off for ONE layer: eslint DOES lint test files
(observed warnings from `tests/vitest/*`), so it's the *type* layer specifically that's
missing. Confirmed with that clarification.

### TESTING-07 — No coverage measurement/threshold — **CONFIRMED (low/not-blocker)**
No `coverage`/`thresholds` in `vitest.config.ts`; no coverage script (only storybook
component-coverage). Confirmed. Correctly low and non-blocking for a closed beta.

### TESTING-08 — "unit suite on Bun via vitest-compat imports" — **REFUTED**
The stated evidence is false. All `tests/unit/*.test.ts` import from **`bun:test`** (native
Bun), NOT from `"vitest"`. There is no vitest-compatibility-layer coupling and no footgun of
the described kind. The only true residue — that `tests/unit` is run by `bun test` and not by
vitest (vitest `include` is `tests/vitest/**` only) — is intentional and benign (node-pure
unit vs jsdom dom). Refuted as a finding; at most a one-line doc note, not remediation.

## existing_plan_overlap — re-checked against real packs

- `2026-06-14-Codebase-Cleanup-Plan/14_TESTING_AND_VALIDATION_PROTOCOL.md` and `10_TEST_...`
  exist (verified on disk). They define the validation tiers and classified tests as healthy /
  e2e as manual. They did **not** flag the CI-disabled state, the `lint:design` gate red, or
  the type-check exclusion as launch risks. So: TESTING-01 = `partial` (VQ-4 in the cleanup
  pack asked "is CI enabled?" — now answered+escalated); TESTING-02 = `stale:current-state.md`
  (known-red list outdated, reconfirmed); TESTING-03/05 = `partial` (hang/manual-e2e noted,
  no remediation); TESTING-04/06/07 = `none`. All overlap claims in the prior audit hold.

## Proof gates per remediation item (honest about local limits)

| Item | Proof gate | What it CAN prove locally | What it CANNOT prove locally |
|---|---|---|---|
| P0-A Step 1 (3 hooks errors) | `bun run lint` → 0 errors after `.gitnexus` ignore; manual open/close of bulk-delete modal; verify glass sidebar transform arms (memory `deferred-liquid-glass`) | lint is clean; no obvious runtime regression | that liquid-glass perf is unchanged at 30/60fps (needs device, memory `liquid-glass-sidebar-direction`) |
| P0-A Step 2 (design-system icon) | `bun run lint:design-system` exit 0 (after fix or sanctioned exception) | the gate passes | that the icon choice is "right" (alpha design = Philip's call) |
| P0-A Step 3 (`lint:design`) | `bun run lint:design` exit 0, OR `validate` no longer chains it + the step is its own CI step | gate passes / is de-coupled | nothing about correctness (these are advisories) |
| P0-A Step 4 (`.gitnexus` ignore) | `bun run lint` local red == CI-relevant red (3, not 6) | local/CI parity | — |
| P0-A Step 5 + P0-B build | `bun run build` exit 0 (MUST run — only `next build` catches `"use server"` non-async export, memory) + `bun run validate` exit 0 | the full gate is green locally | reproducibility under GC pressure / hang absence across many runs |
| P0-B (re-enable CI) | `gh workflow enable CI`; push PR; **one green run** visible in `gh run list` | the gate actually fires and passes once | sustained green / minutes budget headroom (provider-side) |
| P1 (`timeout-minutes`) | inspect `ci.yml`; first live run respects the ceiling | config present | the hang's root cause (needs a deliberate repro run) |
| P2 (auth e2e) | a CI lane with dev-auth running `workshop-library-routes` + shared-link smokes green | the smokes pass against a target | production fail-closed of `DEV_AUTH_BYPASS` (needs `launch:verify-hosted-sensitive-routes` + DB pack) |
| P2 (type-check tests) | `tsc -p tsconfig.test.json --noEmit` exit 0 as a CI step | test code type-checks | runtime correctness of tests |
| P3 (coverage) | `@vitest/coverage-v8` report renders a baseline number | coverage is measured | that any specific module is "well" covered (judgment) |

**Honest CI caveat:** the single most important proof — "CI fires and goes green on current
`main`" — **cannot be proven from this read-only local session**. It requires
`gh workflow enable CI` plus a real PR push, which is an owner-gated write action (release
surface). Everything up to and including a green local `bun run validate` + `bun run build`
is provable here; the live green run is the launch-checklist gate.
