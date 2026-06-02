# Activity History Overhaul V1 Execution Ledger

**Last updated:** 2026-06-02 14:32 UTC
**Branch:** `feat/activity-history-overhaul-v1`
**Starting commit:** `3b896d8`
**Active plan path:** `.ai/03_plans/activity-history-overhaul-v1/`
**Archive target after completion:** `.ai/09_archive/store/activity-history-overhaul-v1/`
**Status:** `ACTIVE — Milestone 1 pushed; PR 3 next`

## Scope

Implement the repo-local Activity History Overhaul V1 plan pack through PR 2–PR 9, keeping production access telemetry enablement separate from implementation readiness. This ledger is the active roadmap evidence thread for milestone status, validation commands, commit SHAs, and honest external-production blockers.

## Production enablement truth

- Repo-local PR 7/PR 8B implementation is authorized under the conservative privacy constraints in docs 47, 48, 50, and 68.
- Access telemetry must remain default-off for production unless the production evidence gates in docs 64, 66, and 68 are actually complete.
- This repo-local execution must not claim legal/provider/owner evidence that has not been collected.

## Milestone evidence table

| Milestone | Status | Evidence / validation | Commit SHA | Notes |
|---|---|---|---|---|
| 0 — Orientation, safety, roadmap execution start | `COMPLETE / PUSHED` | `pwd`; `git rev-parse --show-toplevel`; `git branch --show-current`; `git worktree list`; `git status --short`; `git log --oneline --decorate -n 20`; `git remote -v`; `npx gitnexus analyze`; required docs intake; `git diff --check`; `bun run type-check`; `bun run lint`; `bun run test`; `bun run test:dom` | `30697fe` | Product code intentionally untouched. `bun install` repaired missing local dependencies; lint passed with 14 existing warnings. Pushed to `origin/feat/activity-history-overhaul-v1`. |
| 1 — PR 2 preflight correctness cleanup | `COMPLETE / PUSHED` | RED targeted tests failed for missing PR2 behavior; GREEN targeted `bun run test:dom -- tests/vitest/publication-client-csrf.test.ts tests/vitest/project-publication-activity.test.tsx tests/vitest/estimate-sheet-version-control-ui.test.tsx tests/vitest/project-publication-comments.test.tsx tests/vitest/project-publication-decision.test.tsx tests/vitest/project-publication-security.test.ts`; full pre-commit `git diff --check`; `bun run type-check`; `bun run lint`; `bun run test`; `bun run test:dom` | `2394ebe` | Fixed row-added filters, scoped Realtime by publication id, replaced GET POST-CSRF check with same-origin validation, kept raw `event_type` internal, and replaced live hardcoded CSRF fetch paths with generated cookie/header pairs. |
| 2 — PR 3 composer module and tests | `PENDING` | Pending | Pending | Add pure `src/lib/activity/` composer and security/copy tests. |
| 3 — PR 4 estimate Activity UI integration | `PENDING` | Pending | Pending | Estimate history uses composer output without losing grouping/filtering/pagination. |
| 4 — PR 5 shared-link Activity API integration | `PENDING` | Pending | Pending | Public API returns client-safe `ActivityViewModel[]`. |
| 5 — PR 6 recipient actor resolution and copy | `PENDING` | Pending | Pending | Resolve safe recipient display names for comments/decisions. |
| 6 — PR 7 privacy-safe access telemetry | `PENDING` | Pending | Pending | Analytics-only helper, disclosure, privacy tests, production default-off. |
| 7 — PR 8A pagination and Realtime hardening | `PENDING` | Pending | Pending | Composite cursor pagination and current-publication Realtime refresh only. |
| 8 — PR 8B access telemetry hardening | `PENDING` | Pending | Pending | Bot filtering, retention path, observability, support/admin boundaries. |
| 9 — PR 9 UI polish, accessibility, QA, performance | `PENDING` | Pending | Pending | Accessible feed/card semantics and performance verification. |
| Archive | `PENDING` | Pending | Pending | `git mv` plan folder to archive and add `ARCHIVE.md`. |
| Final merge | `PENDING` | Pending | Pending | Feature branch merged into `main`, `main` pushed. |

## Running validation log

| Time | Command | Result | Notes |
|---|---|---|---|
| 2026-06-02 14:16 UTC | `npx gitnexus analyze` | PASS | Indexed active worktree: 11,491 nodes / 20,947 edges / 300 flows. |
| 2026-06-02 14:19 UTC | `git diff --check` | PASS | Milestone 0 pre-commit whitespace check. |
| 2026-06-02 14:19 UTC | `bun run type-check` | PASS | Passed after local dependency install. |
| 2026-06-02 14:19 UTC | `bun run lint` | PASS | 0 errors, 14 existing warnings. |
| 2026-06-02 14:19 UTC | `bun run test` | PASS | 4 unit tests passed. |
| 2026-06-02 14:19 UTC | `bun run test:dom` | PASS | 155 files passed; 1146 passed / 2 skipped. |
| 2026-06-02 14:20 UTC | `git push -u origin feat/activity-history-overhaul-v1` | PASS | Milestone 0 commit `30697fe` pushed. |

| 2026-06-02 14:31 UTC | `bun run test:dom -- tests/vitest/publication-client-csrf.test.ts tests/vitest/project-publication-activity.test.tsx tests/vitest/estimate-sheet-version-control-ui.test.tsx tests/vitest/project-publication-comments.test.tsx tests/vitest/project-publication-decision.test.tsx tests/vitest/project-publication-security.test.ts` | PASS | Milestone 1 targeted PR2 regression suite: 6 files, 81 tests. |
| 2026-06-02 14:31 UTC | `git diff --check` | PASS | Milestone 1 full pre-commit whitespace check. |
| 2026-06-02 14:31 UTC | `bun run type-check` | PASS | Milestone 1 full pre-commit type check. |
| 2026-06-02 14:31 UTC | `bun run lint` | PASS | 0 errors, 14 existing warnings. |
| 2026-06-02 14:31 UTC | `bun run test` | PASS | 4 unit tests passed. |
| 2026-06-02 14:31 UTC | `bun run test:dom` | PASS | 156 files passed; 1155 passed / 2 skipped. |

| 2026-06-02 14:32 UTC | `git commit fix(activity): complete preflight correctness cleanup` | PASS | Milestone 1 commit `2394ebe` created and pushed. |

| 2026-06-02 14:32 UTC | `git push` | PASS | Milestone 1 commit `2394ebe` pushed to `origin/feat/activity-history-overhaul-v1`; this ledger correction records the immutable pushed SHA. |

## Roadmap references to keep current

- `.ai/01_roadmap/README.md`
- `.ai/01_roadmap/00-production-readiness-dashboard.md`
- `.ai/01_roadmap/25-active-workstreams.md`
- `.ai/01_roadmap/28-evidence-artifact-index.md`
- `.ai/01_roadmap/34-roadmap-consistency-index.md`
- This ledger.

