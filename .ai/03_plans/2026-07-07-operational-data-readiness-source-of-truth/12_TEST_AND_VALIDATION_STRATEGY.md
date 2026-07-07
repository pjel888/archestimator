# 12 — Test and Validation Strategy

## Testing philosophy (proportional)

This is a docs/scripts feature with no runtime behavior. The lightest proof that actually proves the claim is: **unit tests for the generator/detector logic** + **an adversarial mutation suite for drift detection**. No browser, no E2E, no provider proof. Per the Codex speed guardrail and the repo's proportional verification policy, browser/visual QA is **intentionally skipped** (no browser-only claim exists).

## Test Execution Matrix

| Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Known pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| FR-2 (snapshot fields) | `tests/unit/operational-truth-snapshot.test.ts` | unit | new | temp copy of real `wrangler.jsonc`/`migrations/`/`worker.ts` | `bunx vitest run tests/unit/operational-truth-snapshot.test.ts` | `migrationCount=38`, `crons.length=3`, `cronDispatched` matches, `d1.binding="ARCH_DB"` | none | impl |
| FR-2 (determinism) | same | unit | new | two runs | same | deep-equal modulo `generatedAt` | none | impl |
| SEC-1 (no secrets) | same | unit | new | seed fake `dev.vars` with secret | same | JSON contains no secret-pattern match | none | impl |
| DATA-1 (snapshot freshness) | `tests/unit/operational-truth-drift.test.ts` | unit | new | mutate committed JSON | `bunx vitest run tests/unit/operational-truth-drift.test.ts` | detector exit 1 with "run ops:truth:snapshot" | none | impl |
| FR-3b (AGENTS cron drift) | same | unit/adversarial | new | fixture AGENTS.md with "two cron triggers" | same | exit 1, names file+line | none | impl |
| FR-3c (README migration drift) | same | unit/adversarial | new | fixture README.md "29 migrations" | same | exit 1 | none | impl |
| FR-3 current-state phrase | same | unit/adversarial | new | fixture with "both cron schedules" | same | exit 1 | none | impl |
| FR-3d (home/snapshot split) | same | unit/adversarial | new | home quotes stale cron count | same | exit 1 | none | impl |
| REL-1 (fail-closed) | same | unit | new | malformed `wrangler.jsonc` | same | exit 2 | none | impl |
| FR-3a (clean main) | manual + CI | smoke | new | real `main` after repair | `bun run ops:truth:check` | exit 0 | none | impl |
| PERF-1 (<2s) | manual timing | perf | new | real repo | `time bun run ops:truth:snapshot && time bun run ops:truth:check` | median <2s each | none | impl |
| ERGO/DOC (FR-1e) | manual review | doc | new | home only | checklist | 3 questions answerable | none | impl |

## Repository-native commands used

- `bun run type-check` (TS for the generator).
- `bunx vitest run <focused>` (unit + adversarial).
- `bun run ops:truth:snapshot` / `bun run ops:truth:check` (new, added Phase 6).
- `bun run validate:agents` (after `AGENTS.md` edit, T-05).
- `git diff --check` (after every narrative-doc edit).
- `bun run validate` only if the change touches shared/lint surface (it does not change lint config; **not required** for this feature, but harmless as a broad gate before merge).

## Adversarial scenario matrix (UltraQA-style)

For the detector + generator (the two new behaviors):

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Actual result | Status | Evidence | Cleanup |
|---|---|---|---|---|---|---|---|---|---|
| AQ-1 | careless editor | AGENTS.md cron left at "two" | fixture | drift test | exit 1, file:line | TBD impl | specified | test | temp fixture |
| AQ-2 | stale PR | README.md "29 migrations" persists | fixture | drift test | exit 1 | TBD | specified | test | temp fixture |
| AQ-3 | concurrent agent | two agents regen snapshot | two runs | generator | identical output, no conflict | TBD | specified | test | none |
| AQ-4 | sabotage | secret pasted into home | real home | secret-scan | exit non-zero | TBD | specified | test | none |
| AQ-5 | malformed config | wrangler.jsonc corrupted | fixture | drift test | exit 2 (fail-closed) | TBD | specified | test | temp fixture |
| AQ-6 | dead cron | wrangler cron with no worker.ts branch | mutate worker.ts | generator | `cronConfigVsDispatchMismatch` warning | TBD | specified | test | temp fixture |
| AQ-7 | false positive | clean main | real | drift test | exit 0 | TBD | specified | test | none |
| AQ-8 | duplicate regen | snapshot regenerated needlessly | rerun | generator | no diff | TBD | specified | test | none |

Generated fixtures live under `tests/fixtures/operational-truth/` (or temp dirs); cleaned up by the test (no committed pollution).

## Manual QA (only where automation cannot reach)

- **FR-1e readability:** a human reads *only* the canonical home and answers the three questions. Setup: hide all other docs. Pass/fail: all three correct. Owner: impl reviewer.
- **T-07 append-only discipline:** confirm `current-state.md` historical entries are preserved (only Fast-Path + new entry added). Manual diff review.

## Performance evaluator contract (PERF-1)

- Baseline: N/A (new). Target: generator <2s, detector <2s (median of 5).
- Measurement: `time` on `main`, warm filesystem.
- Fixture size: the real repo (≈38 migrations, 1 wrangler.jsonc, 1 worker.ts, 3 narrative docs).
- Runs: 5; report median + max.
- Regression threshold: >5s.
- Rollback trigger: persistent >5s after optimization attempt → reassess scope.
- Related functional tests: the snapshot/drift unit suites (they exercise the same code paths).

## Validation gaps / intentional skips

- **Browser/Playwright:** skipped — no browser-only claim. (Stated per speed guardrail.)
- **Provider proof:** skipped — feature makes no provider calls; `07` documents the boundary.
- **E2E:** skipped — no user flow.
- **`bun run validate` (full):** optional broad gate; not required because no shared/lint/auth/data surface changes. If run before merge and a pre-existing unrelated red appears, record it as pre-existing (do not block this feature on it).
