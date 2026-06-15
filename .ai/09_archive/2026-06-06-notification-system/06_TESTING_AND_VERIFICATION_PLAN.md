# Testing And Verification Plan

Refinement status: `REFINED_READY_FOR_IMPLEMENTATION`. This plan is the verification source of truth for implementation; docs-only refinement verification is listed at the end of this file.

## Targeted Automated Tests

### Schema/RLS

- `tests/vitest/notification-schema.test.ts`
  - SQL contains `create table if not exists public.notification_definitions`.
  - SQL contains `create table if not exists public.notification_deliveries`.
  - SQL enables RLS for both tables.
  - SQL revokes broad direct access.
  - SQL includes user feed, unread, modal, release version, and dedupe indexes.
  - SQL includes `unique(notification_id, user_id)`.

- `bun run prove:notification-rls`
  - Starts a temporary local PostgreSQL 16 cluster without Docker.
  - Applies `supabase/migrations/20260606090000_notification_system.sql`.
  - Stubs Supabase auth roles/functions only for proof isolation.
  - Proves same-user definition/delivery reads and cross-user/direct-write/anonymous denial.

- `tests/integration/rls-notifications.test.ts` where integration harness is available.
  - User A can read own delivery.
  - User A can read a notification definition only when User A has a delivery row for it.
  - User A cannot read a notification definition delivered only to User B.
  - User A cannot read User B delivery.
  - User A cannot directly update any delivery row through the authenticated browser role in V1.
  - Authenticated browser role cannot insert definitions.
  - Authenticated browser role cannot insert, update, or delete deliveries.
  - Anonymous user cannot read deliveries.

### Server Domain

- `tests/vitest/notifications-actions.test.ts`
  - Unauthenticated server action returns a safe error.
  - Feed action clamps `limit` to 50.
  - Mark-read action only writes current-user scoped delivery.
  - Dismiss action invalidates/returns expected result.
  - Modal acknowledge action writes `seen_at`, `modal_acknowledged_at`, and release read state.
  - Internal action href validator rejects external URLs.
  - State mutations use the service-role repository only after `requireCurrentUserContext()` and still filter by delivery id plus current user id.

### Client Query

- `tests/vitest/notifications-query.test.tsx`
  - Query keys are stable.
  - Feed/unread/modal queries call server actions.
  - Notification hooks override the global 5-minute default with notification-specific stale times.
  - Mutation success updates or invalidates feed/count/modal state.
  - Mutation error keeps previous state visible.

### UI Components

- `tests/vitest/release-announcement-modal.test.tsx`
  - Renders accessible dialog using existing modal semantics.
  - Close button and Escape call acknowledge action once.
  - Action button renders only for allowed links.
  - Long release body wraps.
  - Focus returns after close or the primitive is enhanced with a regression test.
  - No modal renders when no eligible announcement exists.

- `tests/vitest/notification-center.test.tsx`
  - Bell shows unread count.
  - Center opens/closes by keyboard and pointer.
  - Loading, empty, error, retry, unread, read, dismiss states render.
  - Mark-read and dismiss actions update visible state.

- `tests/vitest/notification-provider.test.tsx`
  - Provider mounts under query provider.
  - Provider skips public share route if route gating is used.
  - Provider does not break existing toasts.

### Realtime Optional

- `tests/vitest/notification-realtime.test.ts`
  - Uses private channel config.
  - Uses `user:{userId}:notifications` topic.
  - Removes channel on cleanup.
  - Subscription error falls back to polling/query refresh.

## E2E Coverage

Add Playwright specs once the UI exists:

- `e2e/notifications-release-modal.spec.ts`
  - Seed or mock one release announcement for the signed-in test user.
  - Visit `/workshop`.
  - Assert release modal appears once.
  - Close modal.
  - Reload.
  - Assert the same modal does not reappear.
  - Assert notification center shows the release item as read/acknowledged.

- `e2e/notifications-center.spec.ts`
  - Seed or mock two deliveries: one unread, one read.
  - Visit `/workshop`.
  - Assert bell label and badge reflect one unread notification.
  - Open center.
  - Mark unread item read.
  - Assert badge updates.
  - Dismiss item.
  - Assert dismissed item is hidden from default list.

## Existing Tests To Re-Run

- `bun run test:dom -- tests/vitest/toast.test.tsx`
- `bun run test:dom -- tests/vitest/ui-modal-tooltip.test.tsx`
- `bun run test:dom -- tests/vitest/project-collaboration-realtime.test.ts`
- `bun run test:dom -- tests/vitest/project-publication-activity.test.tsx`
- `bun run test:dom -- tests/vitest/project-publication-header.test.tsx`
- `bun run test:dom -- tests/vitest/workshop-homebase-visibility.test.tsx`
- Any tests covering the current canonical workshop shell/header after re-verification.
- Any Supabase/RLS regression tests touched by new migration fixtures.

## Broader Verification Commands

Run in this order after implementation:

```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run test:dom
bun run prove:notification-rls
bun run validate
git diff --check
```

If `bun run validate` is too slow for an intermediate commit, run the targeted tests plus `type-check`, `lint`, and `lint:design-system`, then run full `validate` before PR.

## Manual QA

1. Sign in as owner/beta user.
2. Load `/workshop`.
3. Confirm shell renders before notification fetch completes.
4. Confirm release modal appears once for seeded announcement.
5. Close modal.
6. Refresh and confirm the same modal does not reappear.
7. Open notification center.
8. Confirm announcement is present and read/acknowledged state is clear.
9. Mark a second notification read.
10. Dismiss a notification and confirm it disappears from default list.
11. Navigate to a project and estimate; confirm save/error toasts still work.
12. Open a shared-link/public page signed out; confirm no authenticated notification bell/provider is visible.

## Accessibility QA

- Keyboard opens notification center.
- Escape closes modal/center.
- Focus returns to trigger after close.
- Dialog has accessible name.
- Screen reader live text does not spam on polling refresh.
- Badge count has accessible label.
- Text fits on 320px width.

## Performance QA

- Capture network waterfall: workshop document and primary data should not wait for notification feed.
- Verify notification feed request/page size is 20 by default.
- Verify unread count query uses indexed filter in EXPLAIN when database access is available.
- If Realtime is enabled, confirm exactly one notification channel per signed-in browser tab.

## Observability Evidence

V1 does not require custom analytics. The implementation report must explicitly capture one of these evidence paths:

- Local/dev proof: browser console has no notification errors, server terminal has no notification action errors, and network panel shows bounded notification fetches.
- Hosted/preview proof if owner requests deployment evidence: Vercel logs show no notification route/action errors for the smoke window, and no sensitive notification payload fields appear in logs.

If custom instrumentation is added later, it may record event names and counts only, never notification body, raw payload, tokens, cookies, or provider payloads.

## Pass/Fail

Pass only when all targeted tests, relevant existing regression tests, typecheck, lint, design-system lint, no-Docker RLS proof, and documented manual QA are complete or any gap is explicitly accepted by the owner with a reason.

RLS behavior proof is not optional for implementation readiness. Static SQL tests can support the migration review, but the implementation must produce database-backed proof for same-user read, cross-user denial, direct authenticated write denial, and anonymous denial. For this branch, `bun run prove:notification-rls` satisfies the implementation proof without Docker. Supabase-specific reset/typegen and provider proof remain future readiness gates before linked/provider release claims.

## Docs-Only Refinement Verification

For this planning refinement commit, runtime tests/build are intentionally out of scope because no source, migration, dependency, provider, or runtime files are changed. The correct verification is:

```bash
find .ai/03_plans/2026-06-06-notification-system -maxdepth 1 -type f | sort
rg -n "TB[D]|TO[D]O|fill in [l]ater|Write tests for the [a]bove|Similar to [T]ask|[9]8/100|[9]9/100|[9]8\\.0/100|[9]9\\.0/100" .ai/03_plans/2026-06-06-notification-system .ai/04_tasks/2026-06-06-notification-system .ai/05_logs/2026-06-06-notification-system-planning.md .ai/10_state/current-state.md
git diff --check
git status --short
```

Expected result: the plan folder contains `README.md`, `00_INDEX.md` through `25_IMPLEMENTATION_HANDOFF_CHECKLIST.md`; placeholder scan finds no unresolved placeholders or stale sub-100 readiness scores; `git diff --check` passes.
