# UX Flow State Matrices

Date: 2026-06-19. These matrices are handoff scaffolds for implementation agents.

## Share recipient flow

| State | User sees | Required behavior | Gate/link |
|---|---|---|---|
| Loading share | Stable branded loading or skeleton state. | No client/project totals appear before access is proven; layout does not jump into an error shell. | Share pack + B3. |
| Valid public share | Proposal summary without confidential totals in unfurl metadata. | Page renders; `X-Robots-Tag` and metadata rules remain private-safe. | A11y/SEO hardening, Share pack. |
| Password required | Clear password form and retry/error state. | No proposal data in metadata or pre-auth response. | Share pack. |
| Wrong password / too many attempts | Inline error and retry/lockout copy. | Error does not confirm private project/client details; focus returns to the password field or lockout message. | Share pack + B4. |
| Recipient session creation fails | Retry/contact path. | No raw token, stack trace, or partial proposal data leaks. | Share pack + B3/B4. |
| Invalid/expired/revoked token | Branded not-found/expired state. | No raw Next screen; no token echo. | B3 + Share pack. |
| Permission denied | Recipient is authenticated but not allowed for this share. | Clear no-access copy and support path; no proposal metadata. | Share pack. |
| Recipient session present | Proposal opens with recipient context. | HttpOnly cookie behavior preserved. | Share pack positive evidence. |
| Comment submit succeeds | Confirmation state or comment appears once. | No duplicate submit; unsafe text remains stripped on write/render. | Share pack. |
| Comment submit fails | Non-leaky inline error with retry. | User keeps typed text where safe; telemetry/error sink captures digest when available. | B3/B4. |
| Activity visibility explanation | Recipient sees activity only at intended visibility. | Copy does not imply internal owner-only events are visible to clients. | Share + Realtime/activity evidence. |
| Unsubscribe/revoke path | Recipient can leave or loses access after revoke. | Confirmation/error states are clear; stale recipient session cannot bypass revoked access. | Share pack + Auth/API evidence. |
| Recipient action fails | Non-leaky error with retry/contact path. | Error boundary or inline alert. | B3/B4. |

## DSAR manual request flow

| State | User/support state | Required behavior | Owner |
|---|---|---|---|
| Request received | User emails support or uses documented contact path. | Acknowledge within stated SLA; record requester, request type, identity proof need. | DSAR pack. |
| Identity proof needed | Support cannot safely match subject. | Ask for minimal proof; no extra sensitive data collection beyond need. | DSAR pack / owner. |
| Dry run complete | Owner-runner has count manifest. | Count-only `p_dry_run=true` evidence captured; no writes. | B8. |
| Mutating rehearsal | Optional transaction rehearsal. | `BEGIN` / RPC false / `ROLLBACK`; counts captured; no commit. | B8. |
| Fulfilled | Erasure/export completed. | Confirmation copy states what was erased/anonymized/exported and retention exceptions. | B8/B9. |
| Denied/deferred | Legal retention or identity mismatch. | Explain reason and next step without exposing third-party data. | B9/legal. |

## Consent and legal pages

| State | Required behavior |
|---|---|
| Public page loading | Content loads without layout collapse or unreadable flash. |
| Public page error/not-found | Branded recovery path; no raw Next screen. |
| First visit, no consent cookie | Essential-only default; analytics behavior matches banner. |
| Accept analytics | GA4/Clarity/Vercel path matches chosen V2 decision. |
| Withdraw consent | Tracker teardown or next-load limitation is documented truthfully. |
| Permission/region/legal limitation | If a tracker/legal path is disabled for a cohort, copy says what is unavailable without overpromising. |
| Privacy page | Names actual trackers/providers if enabled; DSAR SLA matches runbook. |
| Terms page | Deletion/export promise matches capability; body text is readable. |

## Login, beta access, invite, and email states

| State | Required behavior | Gate/link |
|---|---|---|
| Login allowed | Magic-link form is clear, labelled, and does not imply public signup. | B5 + `11-UX-COPY-MATRIX.md`. |
| Login denied | Invite-only state gives a support path without revealing whether another account exists. | B5. |
| Magic link expired/rate-limited | Retry timing or resend path is clear; focus moves to the message/action. | B5/H2. |
| Invite expired/invalid | Branded no-access state, no raw token, no stack trace. | B3/H1. |
| Invite accepted | One clear next action; no duplicate submit. | B3. |
| Email bounced/unsubscribed | Sender/owner sees actionable status; recipient data is not overexposed. | H2. |
| Support incident | Copy matches whether B4/B7 monitoring is real; no false "we logged it" claim. | B4/B7. |

## Projects page perceived performance

| State | Required behavior |
|---|---|
| Initial navigation | Shell/skeleton appears without structural jump. |
| Permission/auth redirect | If the session is missing or user is not allowed, redirect/no-access behavior is explicit and does not render stale project cards. |
| Data loading slow | Skeleton/access-tabs placeholder remains stable until data resolves. |
| Images loading | Cards remain stable; broken private images show controlled fallback. |
| Search typing | Input remains responsive; card rerender proof remains valid. |
| Search empty result | Empty filtered state is actionable and does not look like a load failure. |
| Large list | `content-visibility` does not break scroll, menus, or focus. |
| Server/data error | User gets actionable error copy, not a blank grid or raw crash. |
| Empty workspace | User gets the project creation/next-step empty state. |
| Mobile narrow viewport | Toolbar, tabs, cards, and menu text do not overlap. |
| Keyboard/screen reader | Search, tabs, menus, and project-card actions remain reachable and labelled. |
