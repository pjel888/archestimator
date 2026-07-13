# 10 — Blast Radius And Dependencies

## Affected surfaces (classification)

| Surface | Impact | Classification | Evidence |
|---|---|---|---|
| `vitest.config.ts` | parallelism/pool/timeout/projects may change | Required change (Phase 1, owner-gated) | `03` §2.1 |
| `package.json` (`test:dom`, `test`, `validate`, new `flakewatch` script) | script consistency; new scripts added | Required change (Phase 0/1) | `03` §2.3 |
| `tests/vitest/setup.ts` | global `afterEach` cleanup | Probable change (Phase 3, FR-3) | `03` §6 |
| `tests/vitest/estimate-cursor-identity.test.ts` | real-timer wait removal | Required change (Phase 3) | `:90` |
| `tests/vitest/recipient-proposals-page.test.tsx` | real-timer wait removal | Required change (Phase 3) | `:171` |
| Top-10 slowest vitest files | per-file remediation | Probable change (Phase 3) | `03` §4 |
| `tests/vitest/perf/*` (9 files) | must stay serial; parity-checked | Verification only (Phase 1 exit gate) | `03` §1.4 |
| `playwright.config.ts` | `retries` policy documented; change owner-gated | Probable change (Phase 2, owner-gated) | `03` §2.2 |
| `.github/workflows/` | re-enablement + timing budget | Possible change (Phase 4, owner-gated) | `03` §3 |
| New `scripts/flakewatch*.mjs` | new dev tooling | Required (new files) | FR-6 |
| New quarantine ledger file | new data artifact | Required (new file) | FR-5 |
| App source (`src/**`) | none | Explicitly unaffected | — |
| D1/R2/DO/Queue/Email | none | Explicitly unaffected | — |
| Migrations (`migrations/`, `supabase/`) | none | Explicitly unaffected | — |

## Transitive impact

- **Every `.ai` run-log and launch-readiness artifact** that cites
  `bun run validate` / `test:dom` / `--maxWorkers=1` is a downstream consumer of
  the script/config. Phase 1 must keep the commands working or update the
  citations (RISK-8).
- The **launch-readiness evidence gate** (`2026-07-07-launch-readiness-evidence-gate`)
  depends on `validate` being green and trustworthy; this pack strengthens that.
- The **e2e-fixture-smoke-harness** pack owns `playwright.config.ts` edits for
  fixture/auth reasons; **both packs may prescribe playwright.config changes**.
  Coordination rule: this pack only changes `retries`/timeout policy; the e2e
  pack changes projects/auth/webServer. Edits serialized via fresh reads
  (AGENTS.md §6).

## Sibling-pack boundary (conflict prevention)

| Topic | This pack | `e2e-fixture-smoke-harness` | `bundle-and-route-perf-gate-hardening` |
|---|---|---|---|
| Vitest wall-clock/timing | **owns** | — | — |
| Vitest parallelism/timeout | **owns** | — | — |
| Flake definition/quarantine | **owns** | — | — |
| E2E flake budget (per-spec) | references | **owns** | — |
| E2E fixture/auth/seed | — | **owns** | — |
| `playwright.config.ts` retries/timeout | **owns** (policy) | **owns** (projects/auth) | — |
| Bundle budget (`check-performance-budgets.mjs`) | — | — | **owns** |
| Route-transition prod latency budget | references | — | **owns** |
| CI re-enablement timing budget | **owns** (test jobs) | owns (e2e jobs) | owns (perf jobs) |

**CI re-enablement is shared.** When Phase 4 prescribes the timing budget, it
covers the *test* jobs; the e2e and perf-gate packs cover their respective jobs.
A combined re-enablement plan should reconcile the three.

## Compatibility

- **No breaking change to `validate`'s exit semantics** (green = exit 0). New
  scripts are additive (`flakewatch` is opt-in, not part of `validate` unless
  the owner adds it).
- **No test assertion content change** (coverage preserved). Only execution
  posture, isolation, and timing.
- **Vitest 4 / Bun 1.3.14 / Playwright 1.60** stay; no runner migration.

## Documentation impact

| Doc | Update needed? |
|---|---|
| `vitest.config.ts:9-17` comment | augment to point at `06`/`15` (DOC-1) |
| `.ai/10_state/decisions.md` | add DEC-2/3/4/6 when implemented |
| `.ai/10_state/current-state.md` | record the flake-budget posture when implemented |
| AGENTS.md | no change (the loop/verification policy already covers this) |
