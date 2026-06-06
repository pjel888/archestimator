# Requirements And Acceptance Criteria

## Product Requirement

Archestimator needs a first-class in-app notification system that can tell signed-in beta users about new releases/version updates through popup modals and can later support user-specific product notifications such as invitation, publication, feedback, and activity events.

## MUST

- Persist notification definitions and per-user delivery state in Supabase/Postgres.
- Gate every user-visible delivery by authenticated user identity and RLS.
- Show release/version announcements as modals at most once per user per announcement/version unless the announcement is explicitly reissued.
- Provide a notification center/list entry point with unread counts, newest-first ordering, and mark-read/dismiss actions.
- Keep transient operation feedback in `ToastProvider`; durable notifications must not overload the toast stack.
- Use the existing `Modal` primitive for popup announcements unless implementation evidence proves it cannot meet accessibility requirements.
- Render release modals only inside authenticated app/workshop surfaces, not public share pages.
- Treat Realtime as an accelerator only; persisted database state is canonical.
- Preserve existing invite, shared-link, publication, beta feedback, and collaboration behavior.
- Include RLS tests, client component tests, server action/API tests, and manual QA evidence before merge.

## SHOULD

- Support notification types: `release_announcement`, `system_notice`, `collaboration`, `publication_activity`, `beta_feedback`, and `security_notice`.
- Store compact JSON metadata with a schema version and avoid raw secrets, tokens, recipient URLs, cookies, or provider payloads.
- Allow `priority` values that influence modal eligibility without changing security boundaries.
- Include a quiet failure mode: if notification fetch fails, app workflows continue and a non-blocking error state appears in the notification center.
- Reuse TanStack Query invalidation patterns and existing Supabase browser client setup.
- Keep unread-count queries index-friendly and limited.

## COULD

- Add private user notification Broadcast topics after durable delivery works.
- Add digest or email integration in a later feature.
- Add admin UI for creating announcements after a seed/server-action MVP.
- Add workspace/project scoped notification filtering after user-only delivery proves stable.

## WON'T

- Add browser push notifications.
- Add a new UI library.
- Add a new external notification vendor.
- Change Supabase project settings, backups, PITR, or paid features.
- Build source code during this planning phase.

## Acceptance Criteria

1. A signed-in user with one eligible release announcement sees exactly one modal for that announcement, can close it, and does not see it again after dismissal/read acknowledgement.
2. A signed-in user can open a notification center from the workshop shell and see unread/read notifications ordered by `delivered_at desc`.
3. A signed-in user cannot read, update, dismiss, or mark another user's delivery rows.
4. A user with zero notifications sees an empty state that does not shift the workshop layout.
5. A notification fetch/action failure does not block navigation, estimate editing, project browsing, publication, or feedback flows.
6. Release announcement content is sanitized by construction: title/body/action labels are plain text or tightly controlled internal links.
7. Database migration is additive, idempotent, RLS-enabled, and includes indexes for user feed, unread count, modal eligibility, and cleanup/archive queries.
8. Tests prove same-user success, cross-user denial, unauthenticated denial, modal once-only behavior, read/dismiss behavior, unread count updates, and Realtime fallback behavior when Realtime is disabled.
9. Design-system lint passes, and modal/list UI follows `DESIGN.md` app typography and neutral product styling.
10. Performance proof shows initial workshop render is not gated on notifications; notification data loads asynchronously with bounded page size.

## State Transitions

- `delivered`: row exists with `delivered_at`.
- `seen`: user opened the center or modal; writes `seen_at`.
- `read`: user explicitly marks read or acknowledges a modal; writes `read_at`.
- `modal_acknowledged`: release modal was closed/accepted; writes `modal_acknowledged_at`.
- `dismissed`: hidden from default center; writes `dismissed_at`.
- `archived`: future manual archive; V1 may use `dismissed_at` only.

## Non-Functional Requirements

- Accessibility: modal has role `dialog`, `aria-modal`, accessible title, Escape close, backdrop close if appropriate, focus return, keyboard-actionable buttons, and polite live-region handling for new center updates.
- Security: all notification rows are scoped to `auth.uid()` or service-role/admin-only creation paths. No browser writes to definitions.
- Performance: initial query limit is 20 deliveries; unread count uses a targeted indexed query; Realtime channel count remains one per authenticated user when enabled.
- Compatibility: implementation stays compatible with Next.js 16 App Router and React 19.
- Privacy: metadata must not store raw share tokens, email tokens, API keys, OAuth material, full provider payloads, or unredacted recipient URLs.

## Implementation Is Passing When

- `bun run test:dom -- tests/vitest/notification*.test.tsx` passes.
- Notification schema tests pass.
- Targeted RLS/integration tests pass locally or against a branch-safe Supabase environment.
- `bun run lint:design-system` passes.
- `bun run type-check` passes.
- `bun run validate` passes before PR unless the owner explicitly accepts a narrower verification gate for the PR.
