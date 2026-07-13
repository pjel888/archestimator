# Blast Radius And Dependencies

Direct + transitive impact of the **future executor changes** this pack prepares. This pack itself changes only plan-folder documents. Classification: `Required change`, `Probable change`, `Possible change`, `Verification only`, `Explicitly unaffected`.

## Files and systems impacted (future executor)

| Path / system | Classification | Why | Phase |
|---|---|---|---|
| `scripts/check-performance-budgets.mjs` | Required change | Per-route budgets + global backstop (PERF-02); consume budget map | P1 |
| `.github/workflows/ci.yml` | Required change | Advisory→blocking wiring; optional Tier-B job; flake policy | P1, P2, P3 |
| `e2e/route-transition-performance-budgets.json` | Required change | Reconciled source-of-truth (Tier-A) (PERF-03) | P2 |
| `scripts/check-route-transition-readiness.ts` | Probable change | Read budgets from reconciled source (Tier-B) | P2 |
| `e2e/route-transition-performance.spec.ts` | Possible change | If Tier-A values tighten post-Phase-0 | P2 |
| `package.json` | Possible change | New/changed `perf:*` script wiring (e.g. `perf:check-routes` already exists) | P1–P3 |
| `scripts/verify-cloudflare-hosted-performance.ts` | Possible change | Pre-release wiring (scheduled workflow / makefile target); values unchanged | P4 |
| `scripts/seed-performance-test-data.ts` | Possible change | Fixture for Tier-B authed scenarios | P3 |
| Estimate sheet chunks (`EstimateSheetTree`, `EstimateSheetContent`) | Verification only | Heaviest bundle contributors; measured, not changed here | P1 baseline |
| Library / share / workshop routes | Verification only | Covered by route inventory; measured | P0–P3 |
| `src/proxy.ts`, `src/lib/auth/dev-auth-gate.ts` | Verification only | Dev-auth bypass behavior relied on for Tier-B; not changed | P3 |
| `next.config.ts` | Explicitly unaffected | No config change proposed; `ANALYZE=true` already wired | — |
| D1/R2/DO/Queue/Email | Explicitly unaffected | No data/provider work | — |
| Sibling transition/loading UX plan | Verification only (read-only link) | Depends on its Phase-0 baselines + Phase-1.5 fixes | P0 |
| Sibling Worker observability plan | Verification only (read-only link) | Hosted p95 feeds its evidence | P4 |

## User / role impact

| Actor | Impact |
|---|---|
| Closed-beta end users | None directly. Indirect: fewer regressions reaching them. |
| PR authors / developers | Per-PR L1 gate increment must stay within REL-01 wall-clock. Clearer runbook on budget misses. |
| Operator (release) | New pre-release hosted p95 gate (advisory → blocking on decision). |

## Route impact

All ~42 UI routes are **measured** by L1/L2/L3; none are changed by this pack. Heavy routes (estimate sheet) get the closest budget scrutiny in Phase-0/1.

## API / integration impact

None. Gates consume routes as black boxes. Hosted verifier probes existing public/invalid routes with fake inputs.

## Test impact

| Test | Impact |
|---|---|
| `e2e/route-transition-performance.spec.ts` | Possible budget-value change (Tier-A) |
| `tests/vitest/route-transition-peak-load-profile.test.tsx` | Verification only; runs via `perf:profile-peak-load` |
| `bun run validate` | Unaffected |
| `bun run test:e2e` | Unaffected (separate from `:perf`) |

## Documentation impact

| Doc | Impact |
|---|---|
| This plan folder | Created (planning) |
| `.ai/10_state/current-state.md` | Future executor appends a perf-gate-hardening entry on completion |
| `.ai/03_plans/2026-07-06-Transition-And-Loading-UX-And-UI/` | Read-only link; not edited |
| OPS runbook (new, future) | Created by executor under `.ai/` ops docs (OPS-01) |

## Backward compatibility

All changes additive. The one atomic change is the budget source-of-truth migration (DEC-03) — two consumers must move together to avoid a split brain.

## Concurrent-agent / concurrent-work safety

- This pack writes only to its own plan folder (declared ownership).
- Future executor should declare ownership of touched scripts/CI/budgets in a coordination ledger before editing, per the repo's high-concurrency agent discipline.
- The sibling transition/loading UX plan is actively being worked; future executor must re-read its latest state before depending on its Phase-0 baselines.
