# Open Questions And Decisions

## Decisions Made

| Decision | Value | Evidence |
| --- | --- | --- |
| Primary architecture | Durable database deliveries with modal and center UI | Needed for once-per-user release announcements and future user-specific notifications. |
| Realtime role | Optional accelerator after durable path | Supabase docs recommend Broadcast for notifications, but durable rows avoid missed offline events. |
| UI primitives | Reuse existing `Modal` and `ToastProvider` | Existing tests cover portal/layering and toast behavior. |
| V1 surfaces | Authenticated workshop/app surfaces only | Public share pages have different audience/security model. |
| V1 delivery creation | Seed/service/admin-only; no browser creation | Protects definitions/delivery targeting. |
| V1 external channels | None | User asked for popup modals/in-app planning, not email/push. |
| State library | TanStack Query first | Existing provider and mutation invalidation patterns fit feed/count/modal data. |
| Admin UI | Deferred | Not required to prove release announcements. |

## Assumptions

- The first release announcement can be seeded or created through a protected server-only path.
- Beta volume is low enough that one user notification channel per tab is safe if Realtime is enabled.
- Notification content can be plain text in V1.
- Existing workshop shell has an appropriate header/action area for a compact bell.
- The owner wants one implementation branch for planning and coding: `codex/notification-system`.

## Non-Blocking Open Questions

| Question | Default If Unanswered | Why Non-Blocking |
| --- | --- | --- |
| Should V1 include project/publication notification types or only release announcements? | Build generic schema and UI, seed only release announcement in first proof. | Generic shape supports future types without forcing all producers now. |
| Should release modal acknowledgement mark the notification read? | Yes, set `modal_acknowledged_at` and `read_at` together for release announcements. | Simpler UX and avoids stale unread badge after reading modal. |
| Should dismissed notifications be recoverable? | Hide dismissed from default center; keep rows in database. | Retains auditability without adding archive UI. |
| Should notification center live in header or sidebar? | Header/action area, compact bell. | Least disruptive and conventional. |
| Should Realtime ship in V1? | No unless Tasks 1-6 pass early and tests stay green. | Durable polling works; Realtime can be follow-up. |

## Human-Decision Triggers

Ask the owner before:

- Adding external email/push notification channels.
- Enabling Supabase paid features or changing provider settings.
- Building an admin CMS.
- Showing release modals on public/share/signed-out pages.
- Capturing analytics containing notification body or sensitive payload.

## Implementation Agent Decisions Allowed

- Exact component file split inside `src/features/notifications/components`.
- Whether notification center is a popover or small drawer, based on current shell constraints.
- Whether to use route handler or server action for feed reads, as long as user-private cache rules are met.
- Whether to defer Realtime to a follow-up PR.

## Implementation Agent Decisions Not Allowed

- Replacing the chosen durable architecture with static JSON or pure Realtime.
- Creating definitions/deliveries from browser code.
- Adding dependencies for notifications without owner approval.
- Broadening to email/SMS/browser push.
- Applying linked production migrations without owner-approved deploy process.
