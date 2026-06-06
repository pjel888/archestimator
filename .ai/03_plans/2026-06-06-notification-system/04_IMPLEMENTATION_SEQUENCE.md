# Implementation Sequence

Each task is intended to produce reviewable, reversible progress. Commit after each coherent phase if tests pass.

## Task 0: Re-Verify Preconditions

**Files:** no edits.

- [ ] Run `pwd`; expected path is `/Users/philiplewis/.codex/worktrees/notification-system/archestimator`.
- [ ] Run `git status --short --branch`; expected branch is `codex/notification-system` with only known work.
- [ ] Run `git fetch --prune origin`.
- [ ] Run `git rev-list --left-right --count origin/main...HEAD`; if behind, rebase before implementation.
- [ ] Read `DESIGN.md`, this entire plan folder, and the current `package.json`.
- [ ] Check `node_modules/next/dist/docs/` for current Next.js 16 docs before editing App Router behavior. If absent, use official Next docs and cite the exact page in the implementation report.

## Task 1: Database Schema And RLS

**Files:**

- Create: `supabase/migrations/<timestamp>_notification_system.sql`
- Modify after migration: `src/lib/supabase/types.ts`
- Test: `tests/vitest/notification-schema.test.ts`
- Optional integration test: `tests/integration/rls-notifications.test.ts`

- [ ] Create a migration with `supabase migration new notification_system`.
- [ ] Add `notification_definitions` and `notification_deliveries` exactly as described in `03_ARCHITECTURE_AND_DESIGN_PLAN.md`.
- [ ] Enable RLS on both tables.
- [ ] Revoke broad access from `public`, `anon`, and `authenticated`.
- [ ] Grant authenticated `select` on delivery-safe joined fields only if direct client reads are used; otherwise keep reads behind server actions.
- [ ] Add policies:
  - Users can select `notification_definitions` only when an own delivery row exists for that definition.
  - Users can select their own `notification_deliveries`.
  - Users can update only their own `seen_at`, `read_at`, `dismissed_at`, `archived_at`, and `modal_acknowledged_at` through server-controlled actions or narrow RLS checks.
  - Authenticated users cannot insert definitions or deliveries directly.
  - Service role can insert/update definitions and deliveries.
- [ ] Add indexes:
  - `notification_deliveries_user_feed_idx`
  - `notification_deliveries_user_unread_idx`
  - `notification_deliveries_user_modal_idx`
  - `notification_definitions_release_version_idx`
  - `notification_definitions_dedupe_key_idx`
- [ ] Add schema tests that read the SQL file and assert table names, RLS statements, revoke/grant statements, unique constraint, and indexes.
- [ ] Add RLS tests proving definition read access is scoped through own delivery rows.
- [ ] Run `bun run test:dom -- tests/vitest/notification-schema.test.ts`; expected pass.
- [ ] Run local Supabase reset/typegen if the implementation environment supports it. If not, document the exact reason and run SQL static tests.

## Task 2: Server Types, Repository, And Actions

**Files:**

- Create: `src/lib/notifications/types.ts`
- Create: `src/lib/notifications/repository.ts`
- Create: `src/lib/notifications/actions.ts`
- Create: `src/lib/notifications/release-announcements.ts`
- Test: `tests/vitest/notifications-actions.test.ts`

- [ ] Define TypeScript constants for notification kinds, severities, surfaces, audiences, and states.
- [ ] Define view models:
  - `NotificationDeliveryView`
  - `NotificationFeedResult`
  - `ReleaseAnnouncementView`
  - `NotificationActionResult`
- [ ] Implement repository functions:
  - `listCurrentUserNotifications(userId, { limit, cursor })`
  - `countCurrentUserUnreadNotifications(userId)`
  - `getCurrentUserReleaseAnnouncement(userId)`
  - `markCurrentUserNotificationRead(userId, deliveryId)`
  - `dismissCurrentUserNotification(userId, deliveryId)`
  - `acknowledgeCurrentUserReleaseModal(userId, deliveryId)`
- [ ] Implement server actions that call `requireCurrentUserContext()` and never trust a browser-provided user id.
- [ ] Validate `limit` with a hard maximum of 50; default to 20.
- [ ] Sanitize/validate internal action links so only same-origin app paths such as `/workshop` or `/workshop/projects/...` are accepted.
- [ ] Write tests that mock Supabase repository calls and assert unauthenticated errors, same-user updates, limit clamping, and action result shape.
- [ ] Run `bun run test:dom -- tests/vitest/notifications-actions.test.ts`; expected pass.

## Task 3: Client Query Hooks

**Files:**

- Create: `src/features/notifications/hooks/useNotificationsQuery.ts`
- Test: `tests/vitest/notifications-query.test.tsx`

- [ ] Define query keys:
  - `notifications.feed()`
  - `notifications.unreadCount()`
  - `notifications.releaseModal()`
- [ ] Use TanStack Query with notification-specific stale time lower than the global default, for example 30 seconds for unread/modal and 60 seconds for feed.
- [ ] Add mutation wrappers for mark-read, dismiss, and modal acknowledge.
- [ ] On mutation success, update cached delivery/read state optimistically or invalidate the three notification query keys with `refetchType: "none"` where appropriate.
- [ ] Tests assert query keys are stable, mutations call server actions, success updates count/list/modal cache, and errors preserve existing UI state.

## Task 4: Release Announcement Modal

**Files:**

- Create: `src/features/notifications/components/ReleaseAnnouncementModal.tsx`
- Test: `tests/vitest/release-announcement-modal.test.tsx`

- [ ] Use `src/components/ui/modal.tsx`.
- [ ] Render title, body, release version label, optional action button, and close/dismiss button.
- [ ] On close, call `acknowledgeCurrentUserReleaseModal`.
- [ ] Ensure focus is inside the dialog when open and returns to the prior trigger/shell after close. If the current `Modal` primitive cannot satisfy focus return, add the smallest scoped enhancement with regression tests.
- [ ] Ensure body text wraps within the modal on mobile and desktop.
- [ ] Tests assert dialog semantics, once-only acknowledge call, Escape close, action-link rendering, long title/body wrapping, focus return, and no modal when query returns null.

## Task 5: Notification Center UI

**Files:**

- Create: `src/features/notifications/components/NotificationBellButton.tsx`
- Create: `src/features/notifications/components/NotificationCenter.tsx`
- Create: `src/features/notifications/components/NotificationListItem.tsx`
- Test: `tests/vitest/notification-center.test.tsx`

- [ ] Render a compact icon button with unread badge.
- [ ] Use existing UI primitives and Phosphor icons already present in the repo; do not add a dependency.
- [ ] Provide states: loading, empty, error with retry, unread/read item, dismissed item hidden, pagination/load older if needed.
- [ ] Keep typography to app tokens/classes: 8-12px, zero letter spacing, neutral colors, crisp-xs corners.
- [ ] Tests assert unread count, empty state, retry, mark-read, dismiss, keyboard open/close, and no layout-shift-prone text overflow.

## Task 6: Provider And Workshop Integration

**Files:**

- Create: `src/features/notifications/components/NotificationProvider.tsx`
- Modify: `src/app/providers.tsx`
- Modify: `src/components/workshop/WorkshopPageShell.tsx` or the current canonical workshop shell after re-verification.
- Test: `tests/vitest/notification-provider.test.tsx`
- Test: `tests/vitest/workshop-notification-entry.test.tsx`

- [ ] Mount `NotificationProvider` under `QueryClientProvider` so hooks can use TanStack Query.
- [ ] Keep `ToastProvider` available; either nest notifications inside it or keep both under the same query provider without changing toast behavior.
- [ ] Only enable notifications for authenticated app/workshop routes.
- [ ] Add the bell to the existing workshop header/action area without creating a nested card or marketing-style surface.
- [ ] Tests assert provider does not render on public share pages, modal eligibility works, notification center opens from the shell, and existing toast tests still pass.

## Task 7: Optional Private Realtime Refresh

**Files:**

- Create only if needed: `src/features/notifications/hooks/useNotificationRealtime.ts`
- Modify if needed: `supabase/migrations/<timestamp>_notification_system.sql` or a follow-up migration for `user:` realtime topic authorization.
- Test: `tests/vitest/notification-realtime.test.ts`

- [ ] Implement only after Tasks 1-6 pass.
- [ ] Authorize topic `user:{auth.uid()}:notifications` with a simple RLS helper; avoid workspace/project joins in Realtime policy.
- [ ] Subscribe with `{ config: { private: true } }`.
- [ ] On Broadcast event, invalidate notification queries and fetch canonical state.
- [ ] Remove channel on cleanup.
- [ ] Tests assert private channel config, topic naming, cleanup, and fetch fallback when subscription errors.

## Task 8: Seed/Creation Path For Release Announcements

**Files:**

- Option A Create: `supabase/migrations/<timestamp>_seed_release_announcement.sql`
- Option B Create: `src/lib/notifications/admin-actions.ts`
- Test: `tests/vitest/notification-release-seed.test.ts`

- [ ] For V1, prefer seed migration for the first release announcement if no admin UI is needed.
- [ ] Seed definition plus delivery rows only for intended beta users if the target list is available through existing closed-beta tables.
- [ ] If a server/admin action is used, require platform admin checks and service-role server-only access.
- [ ] Never expose service-role creation to browser code.

## Task 9: Full Verification And Documentation Updates

**Files:**

- Modify: `.ai/10_state/current-state.md`
- Modify or create: `.ai/05_logs/<date>-notification-system-implementation.md`
- Modify or create: `.ai/04_tasks/<date>-notification-system/...`
- Optional: `.ai/15_Bugs/<date>-notification-system-*.md` if a blocker is found.

- [ ] Run targeted notification tests.
- [ ] Run `bun run type-check`.
- [ ] Run `bun run lint`.
- [ ] Run `bun run lint:design-system`.
- [ ] Run `bun run test:dom`.
- [ ] Run notification e2e specs if a local dev/test server is available.
- [ ] Capture observability evidence: no notification server-action errors in local logs, no sensitive payload values logged, and no repeated fetch loop in browser/network logs.
- [ ] Run `bun run validate` before PR unless cost/time requires a documented narrower gate.
- [ ] Run `git diff --check`.
- [ ] Update `.ai` state/logs honestly; do not mark provider or production proof complete unless performed.

## Rollback Points

- After Task 1: revert migration before applying to linked environments.
- After Tasks 2-3: remove unused server/client modules if UI integration fails.
- After Tasks 4-6: remove provider mount and workshop bell to disable UI without data loss.
- After Task 7: disable Realtime hook and keep durable polling.
- After Task 8: expire announcement rows rather than deleting audit-relevant rows.
