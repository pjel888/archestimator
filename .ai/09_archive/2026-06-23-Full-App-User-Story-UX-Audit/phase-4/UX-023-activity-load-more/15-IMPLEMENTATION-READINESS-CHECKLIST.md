# UX-023 — Implementation Readiness Checklist

Date: 2026-06-23 | Target: 100% before merge

## Pre-Implementation Gates

| # | Gate | Status | Evidence |
|---|---|---|---|
| G1 | All plan files read (00-15) | ☐ | Per-folder file index |
| G2 | Cited source paths verified | ☐ | `[ -e "$p" ]` per 02-CURRENT-STATE |
| G3 | Conflict group **Publication/share recipient** clear | ☐ | `git diff main --stat` |
| G4 | No decision gate | ☒ | N/A |
| G5 | TV IDs confirmed: **** | ☐ | Per 06-VERIFICATION |
| G6 | Existing tests enumerated | ☐ | `rg -l 'pattern' tests/` |
| G7 | UX/UI spec reviewed (09) | ☐ | Design signoff |
| G8 | Performance budget reviewed (10) | ☐ | Lighthouse baseline |
| G9 | Security audit reviewed (11) | ☐ | RLS policies verified |
| G10 | Network contract reviewed (13) | ☐ | API payloads confirmed |

## Wave 0 — Discovery

| # | Task | Status |
|---|---|---|
| W0.1 | Read cited paths | ☐ |
| W0.2 | Grep for callers | ☐ |
| W0.3 | Glob for tests | ☐ |
| W0.4 | Document drift | ☐ |

## Wave 1 — Test (RED)

| # | Task | Status | Evidence |
|---|---|---|---|
| W1.1 | Test file: `tests/vitest/023-activity-load-more.test.ts` | ☐ | `ls` |
| W1.2 | `UX-023-happy-path` RED | ☐ | `/tmp/UX-023-RED.log` |
| W1.3 | `UX-023-edge-case` RED | ☐ | RED log |
| W1.4 | `UX-023-regression` RED | ☐ | RED log |

## Wave 2 — Implement (GREEN)

| # | Task | Status | Evidence |
|---|---|---|---|
| W2.1 | Smallest change -> GREEN | ☐ | GREEN log |
| W2.2 | All tests pass | ☐ | 0 failures |
| W2.3 | `lsp_diagnostics` clean | ☐ | 0 errors |
| W2.4 | `bun run lint` clean | ☐ | 0 violations |
| W2.5 | `bun run type-check` clean | ☐ | 0 errors |

## Wave 3 — Regression

| # | Task | Status |
|---|---|---|
| W3.1 | Full surface suite passes | ☐ |
| W3.2 | Design lint passes | ☐ |
| W3.3 | Browser proof captured | ☐ |
| W3.4 | Provider proof captured (if needed) | ☐ |
| W3.5 | Conflict-group siblings ok | ☐ |

## Wave 4 — Acceptance

| # | Scenario | Status | Evidence |
|---|---|---|---|
| S1 | Happy path | ☐ | RED->GREEN + surface |
| S2 | Edge case | ☐ | RED->GREEN + surface |
| S3 | Regression | ☐ | Full suite GREEN |

## Go / No-Go Gate

| # | Criterion | Status |
|---|---|---|
| F1 | All pre-implementation gates pass | ☐ |
| F2 | All Wave 0-4 checkboxes checked | ☐ |
| F3 | No new diagnostics errors | ☐ |
| F4 | No regression in siblings | ☐ |
| F5 | Rollback plan tested | ☐ |
| F6 | Loop ledger updated | ☐ |
| F7 | Reviewer gate passed (if triggered) | ☐ |

**Verdict: ☐ GO / ☐ NO-GO**

## Linkage

[04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md) | [07-BLAST-RADIUS-AND-ROLLBACK.md](07-BLAST-RADIUS-AND-ROLLBACK.md) | [../LOOP_LEDGER.md](../../LOOP_LEDGER.md)
