# Notification System UltraQA Report

Date: 2026-06-06
Branch: `codex/notification-system`
Status: `QA_COMPLETE_NO_DOCKER_RLS_PROOF`

## Goal And Success Criteria

- Goal: verify the notification implementation against the 2026-06-06 plan pack, including hostile inputs, once-only release modal behavior, notification center state transitions, RLS denial, and provider-safety boundaries.
- Stop condition: implementation is complete when all repo-local tests pass and database-backed RLS behavior proof runs without Docker against local PostgreSQL. Supabase-specific typegen/provider proof remains a future provider-readiness gate.
- Safety bounds: no linked Supabase migration apply, no production/provider mutation, no secrets in logs, no paid-provider setting changes.

## Scenario Matrix

| ID | User/attacker model | Scenario | Command/harness | Expected signal | Actual result | Status | Evidence | Cleanup |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| QA-01 | Signed-in beta user | Release modal appears once, acknowledge/read state persists | `tests/vitest/release-announcement-modal.test.tsx`, `tests/vitest/notification-provider.test.tsx`, guarded `e2e/notifications-release-modal.spec.ts` | Modal opens, close/action acknowledges once, reload does not repeat when DB proof target exists | Component/provider tests passed; guarded E2E spec discovered and safely skipped without provider target | Pass | Targeted suite: 32 passed, 1 skipped; Playwright: 2 specs skipped | No runtime rows created |
| QA-02 | Signed-in beta user | Notification center opens, shows unread count, marks read, dismisses | `tests/vitest/notification-center.test.tsx`, `tests/vitest/notifications-query.test.tsx`, guarded `e2e/notifications-center.spec.ts` | Badge/list update from cache and server action result | Component/query tests passed; guarded E2E spec discovered and safely skipped without provider target | Pass | Targeted suite: 32 passed, 1 skipped; Playwright: 2 specs skipped | No runtime rows created |
| QA-03 | Cross-user attacker | User A attempts to read/update User B rows | `tests/vitest/notification-schema.test.ts`, guarded `tests/vitest/notification-rls-proof.test.ts`, `scripts/prove-notification-rls-postgres.mjs` | Static policy present; live DB returns own rows only and denies direct writes | Static proof passed; no-Docker PostgreSQL proof passed with same-user allow and cross-user/direct-write/anonymous denial assertions | Pass | `bun run prove:notification-rls` | Temporary local cluster removed |
| QA-04 | Malformed browser input | Invalid delivery id and oversized feed limit | `tests/vitest/notifications-actions.test.ts` | Invalid UUID rejected before service-role client; limit clamped to 50 | Passed | Pass | Actions tests in validation | No cleanup needed |
| QA-05 | Hostile content/operator mistake | External, protocol-relative, JavaScript, share-path, encoded slash, and whitespace action links | `tests/vitest/notification-schema.test.ts`, `tests/vitest/notifications-actions.test.ts` | DB/static/server validators reject unsafe action hrefs | Passed | Pass | Schema/action tests in validation | No cleanup needed |
| QA-06 | Public/signed-out visitor | Notification UI must not appear on public/share routes | `tests/vitest/notification-provider.test.tsx`, `tests/vitest/app-providers-notifications.test.tsx` | Provider skips public routes and app provider composition remains safe | Passed | Pass | Targeted suite and full validation | No cleanup needed |
| QA-07 | Dirty worktree / misleading output | Ensure generated harnesses do not hide unrelated changes and validation exit code is real | `git status --short --branch`, `git diff --check`, `bun run validate` | Only intentional files changed; diff check and validation exit 0 | Passed | Pass | Status clean before edits, staged intentional diff; validate exit 0 | Dev-server churn in `next-env.d.ts` reverted |

## Commands Run

- `[0] bun run test:dom -- tests/vitest/notification-rls-proof.test.ts` — guarded proof harness skipped because no explicit local/branch-safe Supabase target is configured.
- `[0] bunx playwright test e2e/notifications-release-modal.spec.ts e2e/notifications-center.spec.ts --list` — discovered both notification E2E specs.
- `[0] bunx playwright test e2e/notifications-release-modal.spec.ts e2e/notifications-center.spec.ts --reporter=list` — both specs skipped by default; no provider mutation.
- `[0] bun run test:dom -- tests/vitest/notification-schema.test.ts tests/vitest/notification-rls-proof.test.ts tests/vitest/notifications-actions.test.ts tests/vitest/notifications-query.test.tsx tests/vitest/release-announcement-modal.test.tsx tests/vitest/notification-center.test.tsx tests/vitest/notification-provider.test.tsx tests/vitest/workshop-notification-entry.test.tsx tests/vitest/app-providers-notifications.test.tsx` — 8 files passed, 1 skipped; 32 tests passed, 1 skipped.
- `[0] bun run validate` — type-check, lint, design-system lint, unit tests, and full DOM suite passed; DOM summary: 198 files passed, 1 skipped; 1498 tests passed, 3 skipped.
- `[0] git diff --check` and `[0] git diff --cached --check` — whitespace checks passed.
- `[0] brew install postgresql@16` — installed PostgreSQL 16.14 binaries for local no-Docker proof.
- `[0] node scripts/prove-notification-rls-postgres.mjs` — passed no-Docker database RLS proof.
- `[0] bun run prove:notification-rls` — package proof command passed.

## Failures Found

- Earlier Docker-backed Supabase proof could not run because Docker is unavailable. The owner removed Docker from the goal, PostgreSQL binaries were installed, and the no-Docker local proof path passed.

## Fixes Applied

- Added guarded RLS proof harness: `tests/vitest/notification-rls-proof.test.ts`.
- Added guarded Playwright specs and fixture helper: `e2e/notifications-release-modal.spec.ts`, `e2e/notifications-center.spec.ts`, and `e2e/notifications-e2e-helpers.ts`.
- Updated durable evidence docs to distinguish implemented source/test work, local no-Docker RLS proof, and future provider-readiness proof.

## Cleanup And Rollback

- Playwright dev-server churn in `next-env.d.ts` was restored to the committed content.
- The new E2E fixtures clean deterministic notification rows, allowlist rows, profiles, and auth users when the specs are enabled.
- No linked/provider rows were created in this run.

## Residual Risks

- Supabase-specific typegen, linked/provider migration proof, hosted smoke, manual 320px viewport, and real browser waterfall remain future readiness items.
- No linked/provider rows were created, and no Docker dependency is required for the implementation goal.
