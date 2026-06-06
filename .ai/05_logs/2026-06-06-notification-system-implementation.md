# Notification System Implementation Log

Date: 2026-06-06
Branch: `codex/notification-system`
Worktree: `/Users/philiplewis/.codex/worktrees/notification-system/archestimator`

## Outcome

Implemented the V1 durable in-app notification system code path:

- Additive Supabase migration for `notification_definitions` and `notification_deliveries`.
- Manual Supabase type surface for the two notification tables, with branch-safe/provider typegen deferred until a Supabase target is explicitly approved.
- Server-only notification domain with redacted view models, safe action href validation, authenticated read actions, and service-role state mutations filtered by both delivery id and current user id.
- TanStack Query hooks for feed, unread count, release modal, mark-read, dismiss, and release acknowledgement with 30s/60s notification-specific freshness.
- Route-gated `NotificationProvider`, release announcement modal, workshop notification bell, notification center, and compact row UI.
- Workshop shell composition through the existing header `actions` slot.
- Deterministic notification fixtures and focused tests.
- Guarded database-backed RLS proof harness at `tests/vitest/notification-rls-proof.test.ts`, skipped unless explicitly pointed at local or branch-safe Supabase.
- No-Docker database-backed RLS proof script at `scripts/prove-notification-rls-postgres.mjs`, exposed through `bun run prove:notification-rls`.
- Guarded Playwright E2E specs for release modal once-only behavior and notification center read/dismiss behavior, skipped unless `ARCHESTIMATOR_E2E_NOTIFICATIONS=1` and a local or branch-safe Supabase target are configured.

No Supabase linked project, Vercel, DNS, Resend, paid feature, secret, or production/provider setting was changed.

## Changed Areas

- `supabase/migrations/20260606090000_notification_system.sql`
- `src/lib/supabase/types.ts`
- `src/lib/notifications/*`
- `src/features/notifications/components/*`
- `src/features/notifications/hooks/useNotificationsQuery.ts`
- `src/app/providers.tsx`
- `src/components/workshop/WorkshopPageShell.tsx`
- `tests/fixtures/notifications.ts`
- `tests/vitest/notification*.test.*`, `notifications-*.test.*`, and `workshop-notification-entry.test.tsx`
- `e2e/notifications-*.spec.ts`
- `.ai/05_logs/2026-06-06-notification-system-ultraqa.md`

## Graph / Impact Evidence

- Code-review graph was rebuilt earlier in this implementation session: 665 files parsed, 5856 nodes and 84794 edges.
- `detect_changes` before the merge-resolution commit reported 2 changed `.ai` files, 0 changed symbols, 0 affected flows, risk `0.00`.
- `get_impact_radius` before shared source edits:
  - `src/app/providers.tsx`: high risk, 242 impacted nodes, 128 files.
  - `src/components/workshop/WorkshopPageShell.tsx` and `WorkshopTitleHeader.tsx`: high risk, 500 impacted nodes, 185 files.
  - `src/lib/supabase/types.ts`: high risk, 500 impacted nodes, 131 files.
- Mitigation: additive feature-local files, no shared `Modal`/`ToastProvider` primitive changes, narrow provider/shell composition edits, full DOM regression run after the direct shell-render regression was fixed.

## Supabase Evidence

- CLI version check: `npx supabase@2.98.2 --version` returned `2.98.2`.
- Docker check: `docker --version` failed with `command not found`.
- Local reset attempt: `npx supabase@2.98.2 db reset` failed with `Cannot connect to the Docker daemon at unix:///var/run/docker.sock`.
- Owner clarified Docker is not required for this goal and requested PostgreSQL binaries instead.
- `brew install postgresql@16` installed PostgreSQL 16.14 under `/opt/homebrew/opt/postgresql@16/bin`.
- Provider boundary: no linked or production Supabase migration apply was attempted because linked/provider mutation requires explicit owner approval.
- Current proof state: static migration/RLS tests pass, and actual database-backed RLS behavior proof passes through `bun run prove:notification-rls` against a temporary local PostgreSQL cluster using the real notification migration.
- Runnable proof path added: `ARCHESTIMATOR_NOTIFICATION_RLS_PROOF=1` runs `tests/vitest/notification-rls-proof.test.ts` only against local Supabase or an explicitly branch-safe target.

## Verification

Passed:

- `bun run test:dom -- tests/vitest/notification-schema.test.ts tests/vitest/notifications-actions.test.ts tests/vitest/notifications-query.test.tsx`
- `bun run test:dom -- tests/vitest/notification-schema.test.ts tests/vitest/notifications-actions.test.ts tests/vitest/notifications-query.test.tsx tests/vitest/release-announcement-modal.test.tsx tests/vitest/notification-center.test.tsx tests/vitest/notification-provider.test.tsx tests/vitest/workshop-notification-entry.test.tsx`
- `bun run test:dom -- tests/vitest/notification-schema.test.ts tests/vitest/notifications-actions.test.ts tests/vitest/notifications-query.test.tsx tests/vitest/release-announcement-modal.test.tsx tests/vitest/notification-center.test.tsx tests/vitest/notification-provider.test.tsx tests/vitest/workshop-notification-entry.test.tsx tests/vitest/toast.test.tsx tests/vitest/ui-modal-tooltip.test.tsx tests/vitest/project-collaboration-realtime.test.ts tests/vitest/project-publication-activity.test.tsx tests/vitest/project-publication-header.test.tsx tests/vitest/beta-feedback.test.ts`
- `bun run type-check`
- `bun run lint` with existing warnings only outside the notification implementation.
- `bun run lint:design-system`
- `bun run test:dom` after fixing the direct `WorkshopPageShell` render fallback: 197 files passed, 1497 tests passed, 2 skipped.
- `git diff --check`
- `bun run validate`: type-check passed, lint passed with existing warnings only, design-system lint passed, unit tests passed, full DOM suite passed with 198 files and 1498 tests.
- `bun run test:dom -- tests/vitest/notification-rls-proof.test.ts`: 1 file skipped, 1 test skipped because no explicit local/branch-safe RLS proof target is configured.
- `bunx playwright test e2e/notifications-release-modal.spec.ts e2e/notifications-center.spec.ts --list`: discovered 2 notification E2E specs.
- `bunx playwright test e2e/notifications-release-modal.spec.ts e2e/notifications-center.spec.ts --reporter=list`: 2 skipped by default, with no provider mutation.
- `bun run test:dom -- tests/vitest/notification-schema.test.ts tests/vitest/notification-rls-proof.test.ts tests/vitest/notifications-actions.test.ts tests/vitest/notifications-query.test.tsx tests/vitest/release-announcement-modal.test.tsx tests/vitest/notification-center.test.tsx tests/vitest/notification-provider.test.tsx tests/vitest/workshop-notification-entry.test.tsx tests/vitest/app-providers-notifications.test.tsx`: 8 files passed, 1 skipped; 32 tests passed, 1 skipped.
- Follow-up `bun run validate`: type-check passed, lint passed with the same 12 existing warnings, design-system lint passed, unit tests passed, full DOM suite passed with 198 files passed and 1 skipped file; 1498 tests passed and 3 skipped.
- `node scripts/prove-notification-rls-postgres.mjs`: local PostgreSQL 16 proof passed for same-user delivery read, same-user definition read, cross-user delivery denial, cross-user definition denial, authenticated direct update denial, authenticated direct definition insert denial, and anonymous delivery denial.
- `bun run prove:notification-rls`: passed with the same assertions through the package script.

Known verification still required before production/provider readiness:

- `npx supabase@2.98.2 db reset`
- `npx supabase@2.98.2 gen types typescript --local > src/lib/supabase/types.ts`
- Optional Supabase-specific same-user read, cross-user denial, direct authenticated write denial, and anonymous denial proof by running the guarded proof harness against local Docker-backed Supabase or an owner-approved branch-safe Supabase target.

## Remaining Risk

The implementation goal is locally complete without Docker. Remaining provider risks are limited to Supabase-specific reset/typegen, linked migration apply, hosted/browser smoke, and any real beta fanout; those require an owner-approved Supabase target and are not claimed here.
