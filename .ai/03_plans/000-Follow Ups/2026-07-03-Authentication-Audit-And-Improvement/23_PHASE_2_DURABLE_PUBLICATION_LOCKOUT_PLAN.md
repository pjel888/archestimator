# Phase 2 Durable Publication Password Lockout Plan

Date: 2026-07-04
Scope: Phase 2 of the authentication audit/improvement pack only.

## Objective

Make publication password hard lockout durable across Worker isolate/module resets by routing the password endpoint through the existing D1 rate-limit event store and removing the process-local `Map` lockout branch.

## Current Evidence

- `migrations/0006_ai_audit_rate_limits.sql` already defines durable `security_rate_limit_events` rows plus lookup/expiry indexes.
- `migrations/0014_publication_shared_links.sql` already defines `project_publications` and `project_publication_events`; `password_attempt` is an allowed publication event type.
- `src/lib/publication/public-repository.ts` already has `project_publication_password` helpers:
  - `checkProjectPublicationPasswordRateLimit` blocks when existing durable failures for the token/IP key are `>= 5` in 15 minutes.
  - `recordProjectPublicationPasswordFailure` inserts a durable failure row with a 15-minute TTL and returns the progressive delay.
  - `clearProjectPublicationPasswordFailures` deletes durable failure rows on successful unlock.
- `src/app/api/share/[token]/password/route.ts` checks the durable helper first, but still has a second in-memory hard-lock branch imported from `src/lib/publication/security.ts`.
- Next 16 local docs confirm `route.ts` handlers use Web `Request`/`Response`, dynamic route `params` are promises, and `after()` remains valid from route handlers.

## Decision

Use the existing D1 `security_rate_limit_events` table as the durable hard-lock row store. Do not add a Durable Object and do not add a new migration for this slice.

Rationale:
- The endpoint already uses D1 before password verification, so the lowest-risk change is to remove the redundant process-local branch.
- The existing row design is keyed by publication token hash plus hashed client IP, keeps raw token/IP out of storage, expires rows after 15 minutes, and already supports clearing failures after success.
- The lockout semantic is the existing rolling 15-minute failure window (`count >= 5`), not a separate `locked_until` row that starts a fresh 15-minute timer on the fifth failure.
- A Durable Object would add a new runtime coordination surface without improving the simple token/IP lockout contract.

## Implementation Steps

1. Add a focused route-level Vitest file that uses `vi.resetModules()` plus dynamic import of the password route.
2. In that test, keep a hoisted durable failure store outside the route module so five wrong attempts survive module reset.
3. Assert the sixth request returns `429`, a locked correct password is rejected before password verification, and the lock expires after the 15-minute window.
4. Remove `isPasswordLocked`, `recordPasswordFailure`, `recordPasswordSuccess`, and the test-only reset from `src/lib/publication/security.ts`; keep `getClientIp`.
5. Remove the in-memory branch and local `ip` state from the password route; keep the durable check before verification, durable failure recording, progressive delay, event recording, and durable clear-on-success.
6. Move progressive-delay coverage to the D1 repository helper and remove in-memory lockout tests.

## Acceptance Criteria

- `tests/vitest/project-publication-password-lockout-route.test.ts` proves durable lockout survives route module reset.
- `tests/vitest/project-publication-security.test.ts` no longer imports or asserts process-local lockout helpers.
- Focused publication tests pass:
  - `tests/vitest/project-publication-password-lockout-route.test.ts`
  - `tests/vitest/project-publication-route.test.ts`
  - `tests/vitest/project-publication-security.test.ts`
  - `tests/vitest/project-publication-public-repository.test.ts`
- Static checks show no remaining references to `passwordAttemptStore`, `isPasswordLocked`, `recordPasswordFailure`, or `recordPasswordSuccess`.
- No provider mutation, deployment, browser proof, or production lockout proof is claimed from this local slice.

## Implementation Evidence

Status: locally implemented and verified on 2026-07-04.

Changed source/test surface:
- `src/app/api/share/[token]/password/route.ts`
- `src/lib/publication/security.ts`
- `tests/vitest/project-publication-password-lockout-route.test.ts`
- `tests/vitest/project-publication-security.test.ts`
- `tests/vitest/project-publication-public-repository.test.ts`

Red evidence:
- `bunx vitest run --maxWorkers=1 tests/vitest/project-publication-password-lockout-route.test.ts` failed before implementation because the route still imported local lockout helpers and the in-memory branch re-locked after durable rows expired.

Green evidence:
- `bunx vitest run --maxWorkers=1 tests/vitest/project-publication-password-lockout-route.test.ts` passed (`1` file / `4` tests).
- `bunx vitest run --maxWorkers=1 tests/vitest/project-publication-password-lockout-route.test.ts tests/vitest/project-publication-route.test.ts tests/vitest/project-publication-security.test.ts tests/vitest/project-publication-public-repository.test.ts` passed (`4` files / `53` tests).
- `bunx vitest run --maxWorkers=1 tests/vitest/project-publication-page.test.tsx` passed (`1` file / `42` tests).
- `git diff --check` passed.
- `NODE_OPTIONS=--max-old-space-size=8192 bun run type-check` passed.

Validation limits:
- This is local source/test proof only.
- It does not claim hosted Cloudflare Worker behavior, production D1 row proof, browser proof, deployment, or provider mutation.
- Independent scoped code review found no findings. Residual design note: the durable helper is a rolling 15-minute failure window, not a separate lock-until marker.
