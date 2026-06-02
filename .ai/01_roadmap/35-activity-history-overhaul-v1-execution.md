# Activity History Overhaul V1 Execution Ledger

**Last updated:** 2026-06-02 14:16 UTC
**Branch:** `feat/activity-history-overhaul-v1`
**Starting commit:** `3b896d8`
**Active plan path:** `.ai/03_plans/activity-history-overhaul-v1/`
**Archive target after completion:** `.ai/09_archive/store/activity-history-overhaul-v1/`
**Status:** `ACTIVE — repo-local implementation in progress`

## Scope

Implement the repo-local Activity History Overhaul V1 plan pack through PR 2–PR 9, keeping production access telemetry enablement separate from implementation readiness. This ledger is the active roadmap evidence thread for milestone status, validation commands, commit SHAs, and honest external-production blockers.

## Production enablement truth

- Repo-local PR 7/PR 8B implementation is authorized under the conservative privacy constraints in docs 47, 48, 50, and 68.
- Access telemetry must remain default-off for production unless the production evidence gates in docs 64, 66, and 68 are actually complete.
- This repo-local execution must not claim legal/provider/owner evidence that has not been collected.

## Milestone evidence table

| Milestone | Status | Evidence / validation | Commit SHA | Notes |
|---|---|---|---|---|
| 0 — Orientation, safety, roadmap execution start | `VERIFIED — ready to commit` | `pwd`; `git rev-parse --show-toplevel`; `git branch --show-current`; `git worktree list`; `git status --short`; `git log --oneline --decorate -n 20`; `git remote -v`; `npx gitnexus analyze`; required docs intake; `git diff --check`; `bun run type-check`; `bun run lint`; `bun run test`; `bun run test:dom` | Pending | Product code intentionally untouched. `bun install` repaired missing local dependencies; lint passed with 14 existing warnings. |
| 1 — PR 2 preflight correctness cleanup | `PENDING` | Pending | Pending | Fix row filter, Realtime scoping, GET same-origin validation, client CSRF token generation. |
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

## Roadmap references to keep current

- `.ai/01_roadmap/README.md`
- `.ai/01_roadmap/00-production-readiness-dashboard.md`
- `.ai/01_roadmap/25-active-workstreams.md`
- `.ai/01_roadmap/28-evidence-artifact-index.md`
- `.ai/01_roadmap/34-roadmap-consistency-index.md`
- This ledger.

