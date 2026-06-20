# Accessibility Acceptance Criteria

Date: 2026-06-20. Scope: launch gate UX/accessibility proof for affected flows.

## Universal criteria

| Criterion | Pass condition | Applies to |
|---|---|---|
| Keyboard path | Every action can be reached and activated with keyboard alone. | Login, invite, share password, consent, DSAR/contact, error boundaries. |
| Focus restoration | After submit/error/modal close, focus returns to the triggering control or next useful message. | Forms, dialogs, destructive actions. |
| Labels/names | Inputs and icon buttons have accessible names matching their visible purpose. | Login, share password, comments, consent controls. |
| Error announcement | Form and route errors are announced or placed in focus order. | Login, invite, share, DSAR/contact, upload/quota. |
| No raw crash | Root/global errors render branded recovery, not framework output. | B3 routes. |
| Contrast/text size | Body copy, legal text, disabled/error states, and buttons meet contrast/readability expectations. | Public/legal/share/account states. |
| Reduced motion | Error/loading/transition states remain usable with reduced motion. | Root routes, projects/share pages. |
| Touch target | Primary actions and inline controls are usable on narrow mobile. | Public/share/legal/account states. |
| No overlap | Text does not overlap or clip at 360, 390, 768, 1024, and 1440 widths. | All launch-touched flows. |

## Flow-specific checks

| Flow | Required check |
|---|---|
| Root error/not-found | Reload/home actions labelled; focus lands in recovery content; no provider error details. |
| Login/beta denied | Email field labelled; denied copy is readable; resend/rate-limit state announced. |
| Invite accept | Expired/invalid/accepted states have one clear next action; token is never visible. |
| Share recipient | Password form, revoked/expired state, comment form, and no-access state are keyboard reachable and non-leaky. |
| Consent | Accept/decline/change controls are reachable, labelled, and truthfully mapped to tracker behavior. |
| DSAR/support | Request path and identity-proof copy are readable; destructive language is explicit without overpromising. |
| Projects performance follow-up | Search/tabs/cards remain reachable after any B2/projects lint/perf fix. |

## Evidence expectation

Static review is acceptable for copy-only changes. Browser/manual proof is required when implementation
changes focus behavior, dialogs, routing, auth state, share access, consent interaction, or responsive layout.
