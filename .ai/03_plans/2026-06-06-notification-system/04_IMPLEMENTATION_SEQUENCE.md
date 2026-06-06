# Implementation Sequence

Each task is intended to produce reviewable, reversible progress. Commit after each coherent phase if tests pass.

Refinement status: `REFINED_READY_FOR_IMPLEMENTATION`. Start implementation from `25_IMPLEMENTATION_HANDOFF_CHECKLIST.md`; this file remains the phase-by-phase execution body.

2026-06-06 implementation update: the owner removed Docker from this goal and requested PostgreSQL binaries instead. `bun run prove:notification-rls` is the accepted local database-backed RLS behavior proof for this implementation branch; Supabase CLI reset/typegen remains future provider-readiness work.

## Task 0: Re-Verify Preconditions

**Files:** no edits.

- [ ] Run `pwd`; expected path is `/Users/philiplewis/.codex/worktrees/notification-system/archestimator`.
- [ ] Run `git status --short --branch`; expected branch is `codex/notification-system` with only known work.
- [ ] Run `git fetch --prune origin`.
- [ ] Run `git rev-list --left-right --count origin/main...HEAD`; if behind, rebase before implementation.
- [ ] Read `DESIGN.md`, this entire plan folder, and the current `package.json`.
- [ ] Check `node_modules/next/dist/docs/` for current Next.js 16 docs before editing App Router behavior. If absent, use official Next docs and cite the exact page in the implementation report.
- [ ] Read `22_GITNEXUS_CODE_GRAPH_IMPACT_PLAN.md` and run impact analysis before editing any symbol covered by the project GitNexus/code graph contract.
- [ ] Confirm no source/provider/runtime changes are already pending in the worktree unless they are intentionally part of the implementation.

## Task 1: Database Schema And RLS

**Files:**

- Create: `supabase/migrations/<timestamp>_notification_system.sql`
- Modify after migration: `src/lib/supabase/types.ts`
- Test: `tests/vitest/notification-schema.test.ts`
- Optional integration test: `tests/integration/rls-notifications.test.ts`

- [ ] Create a migration with `supabase migration new notification_system`.
- [ ] Follow `15_DATABASE_SCHEMA_RLS_PLAN.md` as the canonical schema/RLS source.
- [ ] Add `notification_definitions` and `notification_deliveries` exactly as described in `03_ARCHITECTURE_AND_DESIGN_PLAN.md`.
- [ ] Enable RLS on both tables.
- [ ] Revoke broad access from `public`, `anon`, and `authenticated`.
- [ ] Grant authenticated `select` only; do not grant authenticated `insert`, `update`, or `delete` on notification tables in V1.
- [ ] Grant service-role maintenance/write access for server-action state mutations and release seed/fanout only.
- [ ] Add policies:
  - Users can select `notification_definitions` only when an own delivery row exists for that definition.
  - Users can select their own `notification_deliveries`.
  - Authenticated users cannot insert, update, or delete definitions or deliveries directly.
  - Service role can insert/update definitions and deliveries.
- [ ] Add indexes:
  - `notification_deliveries_user_feed_idx`
  - `notification_deliveries_user_unread_idx`
  - `notification_deliveries_user_modal_idx`
  - `notification_definitions_release_version_idx`
  - `notification_definitions_dedupe_key_idx`
- [ ] Add schema tests that read the SQL file and assert table names, RLS statements, revoke/grant statements, unique constraint, and indexes.
- [ ] Add RLS tests proving definition read access is scoped through own delivery rows and direct authenticated state updates are denied.
- [ ] Do not proceed to UI work until database-backed RLS integration proof passes. For this branch, `bun run prove:notification-rls` satisfies that proof without Docker by applying the migration to a temporary local PostgreSQL cluster.
- [ ] Run `bun run test:dom -- tests/vitest/notification-schema.test.ts`; expected pass.
- [ ] Run local Supabase reset/typegen if the implementation environment supports it. If not, document the exact reason, run SQL static tests, and run `bun run prove:notification-rls` for no-Docker RLS behavior proof.
- [ ] Record local/branch-safe/linked-provider evidence according to `23_SUPABASE_PROVIDER_AND_MIGRATION_EVIDENCE_PLAN.md`.

## Task 2: Server Types, Repository, And Actions

**Files:**

- Create: `src/lib/notifications/types.ts`
- Create: `src/lib/notifications/repository.ts`
- Create: `src/lib/notifications/actions.ts`
- Create: `src/lib/notifications/release-announcements.ts`
- Test: `tests/vitest/notifications-actions.test.ts`

- [ ] Define TypeScript constants for notification kinds, severities, surfaces, audiences, and states.
- [ ] Follow `16_SERVER_ACTIONS_API_CONTRACT_PLAN.md` for function names, view models, errors, and link validation.
- [ ] For state mutations, use the existing `src/lib/supabase/service-role.ts` helper inside server-only code after authenticating the user; repository updates must include `eq("id", deliveryId)` and `eq("user_id", currentUser.id)`.
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
- [ ] Follow `18_STATE_MANAGEMENT_AND_QUERY_CACHE_PLAN.md` for stale times, cache writes, invalidation, and optional Broadcast behavior.

## Task 4: Release Announcement Modal

**Files:**

- Create: `src/features/notifications/components/ReleaseAnnouncementModal.tsx`
- Test: `tests/vitest/release-announcement-modal.test.tsx`

- [ ] Use `src/components/ui/modal.tsx`.
- [ ] Follow `20_ACCESSIBILITY_FOCUS_MANAGEMENT_PLAN.md` before modifying the modal primitive.
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
- [ ] Follow `17_FRONTEND_COMPONENT_AND_SHELL_INTEGRATION_PLAN.md` and `21_DESIGN_SYSTEM_ALIGNMENT_PLAN.md` for dimensions, placement, and visual constraints.
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
- [ ] Re-read `src/app/providers.tsx` and the current canonical workshop shell immediately before editing, because these files are active global integration points.
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
- [ ] Do not implement Realtime if durable polling/query behavior or RLS evidence is incomplete.
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
- [ ] Follow `19_TEST_FIXTURES_AND_SEED_DATA_PLAN.md` for deterministic seed/test data and `24_RELEASE_OPERATOR_RUNBOOK.md` for release content operations.
- [ ] First proof path is deterministic local/test fixtures only. Real beta fanout is a separate owner-approved provider step using `closed_beta_allowed_emails.status in ('invited','active')` joined to `profiles.email`.
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
- [ ] Update `13_TRACEABILITY_MATRIX.md` from `Planned` to evidence-backed statuses only for completed rows.

## Stop Conditions

Stop and write a bug/blocker note before proceeding if:

- RLS proof allows cross-user read/update.
- Migration/typegen output targets a Supabase project other than `ebxxqidacheyapmmzavr`.
- Provider mounting blocks authenticated shell render or leaks into public share pages.
- Modal focus cannot be made accessible without a shared primitive change and regression tests.
- Design-system lint flags notification UI violations that require a product decision.
- Realtime requires broad topic authorization or joins that make user-only authorization ambiguous.
- Any source/provider/runtime file outside the plan scope changes unexpectedly.

## Rollback Points

- After Task 1: revert migration before applying to linked environments.
- After Tasks 2-3: remove unused server/client modules if UI integration fails.
- After Tasks 4-6: remove provider mount and workshop bell to disable UI without data loss.
- After Task 7: disable Realtime hook and keep durable polling.
- After Task 8: expire announcement rows rather than deleting audit-relevant rows.
