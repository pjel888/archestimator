# Traceability Matrix

| Requirement | Acceptance Criteria | Files/Modules | Implementation Step | Tests | Risk/Rollback | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Persist notifications | Delivery rows survive refresh and cross-device use | `supabase/migrations/*notification_system*.sql`, `src/lib/notifications/repository.ts` | Tasks 1-2 | schema, RLS, actions | Forward repair migration; disable UI | Planned |
| Release modal once per user | Modal appears once and persists acknowledgement | `ReleaseAnnouncementModal.tsx`, `release-announcements.ts`, `notification_deliveries.modal_acknowledged_at` | Tasks 2, 4, 6 | release modal, provider, actions | Expire definition; remove provider mount | Planned |
| Notification center | User can view unread/read notifications | `NotificationCenter.tsx`, `NotificationBellButton.tsx`, query hooks | Tasks 3, 5, 6 | notification-center, query | Remove shell bell | Planned |
| User isolation | User cannot read/update another user's deliveries | RLS policies, server actions | Tasks 1-2 | RLS integration, actions | Revoke access; disable actions | Planned |
| Definition privacy | User can read definitions only when delivered to them | `notification_definitions` select policy, repository joins | Task 1 | RLS integration, schema | Tighten policy; server-only fallback | Planned |
| No public share leakage | Public share pages do not show auth notification UI | `NotificationProvider.tsx`, route/shell gating | Task 6 | provider, share regression | Disable provider for public routes | Planned |
| Reuse modal/toast | No duplicate global toast/modal primitives | existing `Modal`, existing `ToastProvider` | Tasks 4, 6 | toast, modal, release modal | Revert primitive edits | Planned |
| Async performance | Workshop shell not blocked by notification fetch | provider/query hooks | Tasks 3, 6 | provider, manual waterfall | Disable provider; lower fetch priority | Planned |
| Freshness | Badge/count/modal state is not stale for 5 minutes | `useNotificationsQuery.ts`, optional realtime hook | Tasks 3, 7 | query, realtime | Lower stale times; disable realtime fallback | Planned |
| E2E proof | Modal once-only and center actions work in browser flow | Playwright specs | Task 9 | `e2e/notifications-*.spec.ts` | Disable provider/flag | Planned |
| Observability | No errors, loops, or sensitive logs | server/browser logs, optional Vercel logs | Task 9 | implementation evidence | Disable provider/flag; redact logs | Planned |
| RLS/indexed data | Queries are safe and index-friendly | migration indexes and policies | Task 1 | schema, EXPLAIN/manual | Add index migration | Planned |
| Optional Realtime | Refresh events do not replace DB state | `useNotificationRealtime.ts`, realtime policy | Task 7 | notification-realtime | Disable hook | Planned |
| Design-system fit | UI follows product style and no overlap | notification components | Tasks 4-6 | design lint, UI tests, manual QA | Remove/adjust UI integration | Planned |
| Rollback | Feature can be disabled without data loss | feature flag/provider mount/migrations | Tasks 6, 9 | manual QA, diff review | Disable flag/provider, expire rows | Planned |
| Documentation | `.ai` state/logs reflect implementation truth | `.ai/10_state`, `.ai/05_logs`, `.ai/04_tasks` | Task 9 | docs diff, `git diff --check` | Correct docs before PR | Planned |
