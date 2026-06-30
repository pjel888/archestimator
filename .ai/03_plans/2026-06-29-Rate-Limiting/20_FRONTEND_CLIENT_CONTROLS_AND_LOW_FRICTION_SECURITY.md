---
title: Frontend Client Controls And Low Friction Security
plan_id: 2026-06-29-rate-limiting
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# Frontend Client Controls And Low Friction Security

Client-side controls are a UX and backpressure layer, not a security boundary. They should prevent accidental duplicate work, reduce avoidable requests, and make `429` recovery understandable. Every protected route, Server Action, provider call, and storage mutation still needs server-side auth, authorization, validation, CSRF or same-origin posture, idempotency, and rate-limit enforcement because browser code, DevTools, copied `fetch` calls, and scripts can bypass UI state.

## Source Grounding

| Source | Planning implication |
| --- | --- |
| Local repo scan on 2026-06-30 | Existing frontend protections are component-local: share decisions guard `isSubmitting`, share comments use `AbortController`, retry and queued offline comments, notification/favorite flows expose mutation pending state, and cursor collaboration throttles broadcasts. No shared client interaction guard contract exists. |
| `package.json` | Current frontend stack is `next@16.2.6`, `react@19.2.6`, TanStack Query `5.100.14`, and Zustand `5.0.14`; future implementation should follow these patterns rather than adding a dependency. |
| Local Next docs `node_modules/next/dist/docs/01-app/02-guides/forms.md` | Forms with Server Actions can expose pending state with `useActionState`, but each Server Action must still verify auth and authorization. |
| OWASP CSRF Prevention Cheat Sheet | Same-origin, CSRF token, SameSite, and Fetch Metadata defenses are server-side controls that pair with, but are not replaced by, button disabling. Source: `https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html`. |
| OWASP Denial of Service Cheat Sheet and Automated Threats project | Automated clients and resource exhaustion must be handled at server/provider boundaries; client hints only reduce normal-user accidental pressure. Sources: `https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html` and `https://owasp.org/www-project-automated-threats-to-web-applications/`. |
| MDN `AbortController` and `BroadcastChannel` docs | Browser-native cancellation and same-origin tab coordination can reduce duplicate request pressure without new packages. Sources: `https://developer.mozilla.org/en-US/docs/Web/API/AbortController` and `https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API`. |
| React and TanStack Query docs | `useActionState`, mutation pending state, mutation retries, network mode, and persisted/offline mutation behavior are the local implementation reference points; unsafe mutation retry policy must be explicit instead of inherited casually. Sources: `https://react.dev/reference/react/useActionState`, `https://tanstack.com/query/latest/docs/framework/react/guides/mutations`, `https://tanstack.com/query/latest/docs/framework/react/guides/query-retries`, and `https://tanstack.com/query/latest/docs/framework/react/guides/network-mode`. |
| MDN and IETF HTTP docs | `Retry-After` can be delay seconds or an HTTP date; idempotency keys need server-side replay semantics, expiry, and mismatch handling; `If-Match` style preconditions fail with `412` when the resource version no longer matches. Sources: `https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After`, `https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Idempotency-Key`, `https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-idempotency-key-header-04`, and `https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/If-Match`. |
| MDN HTML, ARIA, Page Visibility, and Web Locks docs | Native disabled controls are not focusable or submitted; cooldown explanations need separate status text; hidden tabs and suspended timers require lifecycle recomputation; Web Locks are available for deliberate singleton coordination only. Sources: `https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/disabled`, `https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live`, `https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-busy`, `https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API`, and `https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API`. |

## Boundary Rules

| Rule | Requirement |
| --- | --- |
| Client controls are advisory | A disabled button, local cooldown, debounce, or tab lock is not evidence that a route/action is protected. The corresponding server boundary must still enforce the policy before side effects or provider calls. |
| Scripted bypass is expected | Future tests must include direct `fetch` or Server Action invocation paths that ignore UI state and still receive server-side denial, idempotency, authorization failure, or an existing-result response. |
| No global app lockouts | A rate-limited export, upload, AI ask, comment, invitation, or edit action must not disable unrelated app navigation or editing. |
| Per-resource keys | Client locks and idempotency keys must be scoped to the concrete operation and resource, such as `publication-recipient-decision`, `estimate-row-bulk-move`, `upload-session-init`, or `package-builder-apply`. |
| Recovery before friction | Prefer pending state, latest-wins cancellation, `Retry-After` countdowns, progressive delay, narrow key tuning, and clear retry affordances before adaptive challenge or account-level friction. |
| Accessibility preserved | Disabled, pending, cooldown, and challenge states need keyboard behavior, accessible names, `aria-live` status where useful, focus restoration after modal actions, and no color-only signal. |
| Stuck state forbidden | Any client lock must release on success, handled error, abort, timeout, navigation away, server `429` cooldown expiry, or kill-switch/rollback state change. |
| Multi-tab behavior is explicit | For high-cost actions, decide whether cooldowns and in-flight state are tab-local or same-origin shared. Server responses are still the source of truth for stale tabs. |

## Control Taxonomy

| Control ID | Control | Applies to | Contract | Server pairing |
| --- | --- | --- | --- | --- |
| FC-001 | Pending disable for submit buttons | Single-shot mutations and forms | Disable the triggering control while the request is pending; preserve accessible label/status and keep unrelated fields editable unless data integrity requires a short lock. | Server validates and rate-limits even if POST is repeated manually. |
| FC-002 | Single-flight by action key | Expensive or destructive actions | Drop, join, or reuse duplicate in-flight calls only for the same actor/resource/action intent. | Server idempotency or exact limiter prevents duplicate side effects. |
| FC-003 | Debounce or throttle | Search, autosave, realtime cursor/activity, telemetry | Delay or pace non-critical repeated requests; never hide the final intended state. | Server soft read limit or telemetry drop handles scripts and many tabs. |
| FC-004 | Latest-wins cancellation | GET/search/load-more/preview requests | Abort superseded requests and ignore late responses after unmount or newer request. | Server remains safe if aborted requests already reached it. |
| FC-005 | Idempotency key | Export, AI Apply, upload init/finalize, publication email/send, bulk delete, decision submit | Generate a per-operation key before request; reuse for retry of the same intent; rotate for a new intent. | Server stores or rejects duplicate key or returns existing result. |
| FC-006 | `Retry-After` cooldown display | Any route/action with retryable `429` | Parse safe server retry hints and show a scoped countdown or disabled retry affordance with preserved form state. | Server owns the cooldown truth and response header/action payload. |
| FC-007 | Duplicate toast/message suppression | Forms and action buttons | Avoid stacking identical error/success toasts from double clicks or retries. | Server still emits one denial/event per evaluated request. |
| FC-008 | Multi-tab coordination | Upload sessions, exports, AI Apply, bulk destructive actions | Use same-origin tab coordination only where duplicate cost is high; stale tabs refresh from server response. | Server treats multi-tab coordination as optimization only. |
| FC-009 | Optimistic update rollback | Comments, favorites, organization edits, estimate mutations | Track pending item IDs and rollback, retain as retryable draft, or reconcile on failure/conflict. | Server idempotency and authorization determine final state. |
| FC-010 | Per-resource local cooldown after success | Email resend, publication republish, export, AI Apply | Prevent immediate accidental repeats after success for the same resource. | Server enforces real resend/export/apply cooldown. |
| FC-011 | Body-size and file-count client hints | Upload/image/contact/public feedback | Reject obviously invalid inputs before network without relying on client checks. | Server validates MIME, byte size, content type, schema, and ownership. |
| FC-012 | Adaptive challenge trigger state | Public password, invite probing, contact/auth escalation | Display Turnstile or similar only after server requests a challenge; keep a fallback support path. | Server validates token, expiry, single-use/replay, and challenge reason. |

## Idempotency Taxonomy

| Retry type | Example | Required handling |
| --- | --- | --- |
| User repeat | Double-click export, invite resend, share decision, publication email send. | Client single-flight plus server idempotency or same-resource cooldown. |
| Keyboard repeat | Holding Enter on a focused form button. | Same pending/cooldown path as pointer click with accessible status. |
| Browser retry | Back/refresh/resubmit or retry after network failure. | Preserve the same operation key only for the same user intent. |
| Network retry | Request reached server but client saw timeout. | Server returns existing result or blocks duplicate side effects. |
| Webhook retry | Provider resends event. | Signature and event-id idempotency; rate limit remains secondary. |
| Queue retry | Upload cleanup/scan or background job retries. | Job idempotency and dedupe before quotas. |
| Scripted replay | DevTools or automation loops direct requests. | Server limiter/auth/idempotency rejects or throttles independent of UI state. |

## Operational Edge Contracts

These are mandatory P0 decisions for any high-risk frontend control. The browser may help shape the interaction, but the route/action contract owns the real enforcement and recovery semantics.

| Edge contract | Required frontend decision | Server-authoritative pairing | Required proof signal |
| --- | --- | --- | --- |
| Idempotency fingerprint, TTL, and mismatch behavior | For every idempotent mutation, specify key scope, creation time, TTL, persisted intent fields, and when the client may reuse or rotate the key. The key must be bound to a normalized request fingerprint such as actor, workspace, resource, action, and payload hash; raw tokens, emails, and secrets are excluded. | Server records `processing`, `completed`, `failed`, and expired states; same key plus same fingerprint may return existing/in-progress result; same key plus different fingerprint returns a mismatch/conflict result without side effects. HTTP route candidates should consider `409` for concurrent in-progress conflicts and `422` for key/payload mismatch when matching the Idempotency-Key draft. | Reused key with identical payload is idempotent; reused key with changed payload is rejected; expired key behavior is explicit; concurrent duplicate request cannot double-spend provider work or create duplicate side effects. |
| Lost-update and stale-write protection | Estimate/template/project/publication edits must declare either last-writer-wins or a versioned update model. Versioned flows should send a resource version, revision hash, or `If-Match`/ETag-style precondition with the mutation. | Server evaluates the version/precondition before writing. Stale writes return a recoverable `409` or `412` style conflict, preserve the user's draft, and provide enough fresh state for reconcile or retry. | Two tabs edit the same resource; stale tab receives recoverable conflict; UI does not silently overwrite newer data and does not get stuck pending. |
| Retry and backoff policy | Unsafe mutations must not auto-retry unless they carry a valid idempotency key for the exact same intent. Read/retryable requests need capped attempts, bounded backoff, jitter where useful, cancellation on unmount, and user-visible recovery after exhaustion. | Server `Retry-After` or action-result retry timing takes precedence over local backoff; retries still re-enter auth, authorization, idempotency, and limiter checks before side effects. | Network failure after server success returns existing result on retry; unsafe mutation without idempotency does not silently retry; retry storm is bounded and observable. |
| Offline queue governance | Any offline or persisted queue must define max queued items, max age, max bytes, dedupe key, flush order, per-resource cap, privacy/storage class, and purge rules for sign-out, workspace switch, token invalidation, or server rejection. | Server validates every flushed item as a fresh request and may halt or shrink the flush on `401`, `403`, `409`, `412`, or `429`; queued work cannot bypass current authorization or limits. | Queue overflow purges or rejects predictably; stale/private queued data is removed on account boundary changes; reconnect flush respects `Retry-After` and idempotency. |
| Exact `Retry-After` parsing | UI cooldown helpers must support delay seconds and HTTP-date formats, reject invalid values, clamp min/max display values, account for client/server clock skew, and avoid trusting background tab timers as proof of expiry. | Server remains source of truth; on retry, focus, visibility change, or reconnect the client refreshes current policy/resource state before assuming the cooldown is over. | Seconds and HTTP-date inputs render correctly; invalid or extreme values fall back safely; stale hidden tab recomputes instead of submitting immediately from an old timer. |
| Browser lifecycle recovery | Pending, cooldown, queue, and optimistic states must recompute on `visibilitychange`, focus, reconnect, navigation cleanup, timeout, and rollback/kill-switch config refresh. | Server response/config refresh is authoritative after long suspension, offline gaps, or policy change. | Hidden tab returns after a cooldown, policy rollback, or network outage and exits stale state only after refresh or bounded recomputation. |
| Multi-tab mechanism choice | Use `BroadcastChannel` only as a same-origin hint channel for cooldown/in-flight updates. Use Web Locks only for high-cost singleton work such as upload session init or export generation where a real local singleton materially reduces cost. Provide tab-local or storage-event fallback if unavailable. | Server idempotency, limiter, and resource version checks remain authoritative because tabs, channels, and locks can be absent, stale, or bypassed. | Two tabs trigger the same high-cost action; duplicate local work is reduced where supported, and direct/scripted requests remain safe without tab coordination. |
| Disabled-control accessibility semantics | Native `disabled` controls are not focusable and are not submitted with forms, so the reason, retry time, and recovery path must live outside the disabled control in visible text and, where state changes dynamically, `aria-live`/`aria-busy` status. Use `aria-disabled` only when a focusable explanatory control is intentionally kept in the tab order. | Server/action result provides safe wait/retry details; UI never depends on disabled form fields to carry required submission values. | Keyboard and screen-reader paths can discover why an action is unavailable, when it can be retried, and how to recover; disabling a button does not drop required form data. |

## Surface Matrix

| Surface | Required client behavior | Abuse or UX risk reduced | Required server proof |
| --- | --- | --- | --- |
| Shared-link decision submit | Pending disable, single-flight by recipient/publication/decision, optional idempotency key, keyboard parity, focus restoration after confirm modal. | Double decision clicks and repeated Enter submit. | Direct repeated POST still returns idempotent success/conflict or 429 without duplicate decision side effects. |
| Shared-link comments | Existing offline queue/retry stays; add same-key single-flight for immediate double submit, optimistic draft retention, and `Retry-After` cooldown if returned. | Duplicate comments and retry storms after reconnect. | Comment POST limit and idempotency/duplicate handling are server-owned. |
| Shared password/session/unsubscribe | Pending disable, cooldown countdown from `Retry-After`, no local copy implying token validity. | Brute-force UX confusion and repeated accidental attempts. | Durable per-token/client limiter and non-enumerating responses. |
| Invite accept/continue/resend | Pending disable, same-token single-flight, keyboard parity, per-recipient resend cooldown after success. | Email abuse and accidental repeated acceptance/resend. | Invite limiter, no-enumeration behavior, and email cooldowns. |
| Auth login/magic/OAuth | Pending state for form/action, clear provider recovery copy, adaptive challenge only after server policy asks. | Lockout support pressure and duplicate magic-link sends. | Provider-coordinated limiter and account enumeration denial tests. |
| Upload/image/direct-upload | Single-flight upload-session init per file/resource, active upload slot UI, cancel/retry, cleanup timeout display, tab coordination for expensive sessions. | Stuck active slots, duplicate storage sessions, provider cost. | Durable admission/session capacity and cleanup/idempotent release proof. |
| XLSX export | Disable export button for same estimate while pending; reuse idempotency key for retry after network failure; scoped success cooldown. | Duplicate heavy workbook generation. | 429 before workbook generation and duplicate export request behavior. |
| AI ask/package-builder | Submit pending state, abort superseded draft/refine where safe, idempotency key for Apply, cooldown after success. | Provider spend and duplicate mutations. | Cost limiter before provider call and Apply idempotency proof. |
| Estimate and template editing | Per-row/resource mutation queues, lenient burst guard, visual pending state that does not block unrelated edits, stale-tab recovery. | Runaway UI loops while preserving fast editing. | Server action limiter preserves realistic editing profile and denies scripted loops. |
| Publication email/digest/republish | Single-flight and per-recipient/local success cooldown; duplicate toast suppression. | Email reputation harm and accidental resends. | Delivery idempotency, recipient cooldown, and provider circuit breaker. |
| Client error telemetry/activity events | Throttle, sample, and fail soft; never show user-blocking UI. | Log flood and app degradation. | Server same-origin/fetch metadata/body-size/drop behavior. |
| Public contact/beta feedback | Native HTML validation, pending disable, spam cooldown, adaptive Turnstile only after suspicious signal. | Spam without making normal feedback hard. | Server validation, spam limiter, and challenge validation. |

## Low-Friction Security Measures

| Measure | UX posture | Planning requirement |
| --- | --- | --- |
| Same-origin and Fetch Metadata checks | Invisible when valid. | Preserve existing server checks and add them to any new browser-origin mutation route; document explicit exemptions. |
| CSRF tokens for public share mutations | Invisible if issued and attached by existing page shell. | Keep token creation and validation server-owned; client only attaches the value for same-origin requests. |
| Content-type and body constraints | Usually invisible; gives early invalid-input feedback. | Route/action P0 rows must specify allowed content type, max body/file count, and server validation result. |
| Idempotency keys | Invisible except for better retry behavior. | Use for expensive/destructive operations before stricter visible throttles. |
| Native HTML validation | Inline, expected browser behavior. | Use `required`, `type`, `accept`, and size/count prechecks as early feedback; server repeats validation. |
| Adaptive Turnstile | Visible only when server policy asks. | Challenge suspicious public flows after thresholds; include accessibility fallback and support path. |
| Scoped cooldowns | Visible only for the affected action/resource. | Show countdown from server `Retry-After`; never freeze the whole page. |
| Security headers and frame protection | No normal UX impact if tested. | Treat CSP, frame protections, content-type safety, and referrer policy as adjacent hardening, not as rate-limit substitutes. |
| Redacted client telemetry | No user-visible impact. | Log action key, policy ID, hashed client/resource, and UI state; do not log raw tokens, emails, IPs, or provider secrets. |

## Future Proof Matrix

| Proof ID | Scenario | Expected signal |
| --- | --- | --- |
| FC-PROOF-001 | Double-click submit and press Enter repeatedly on the same mutation button. | Only one visible in-flight operation; server direct repeated calls are still denied or idempotent. |
| FC-PROOF-002 | Trigger the same mutation from two tabs. | Optional tab coordination reduces duplicate local work; server remains authoritative and idempotent. |
| FC-PROOF-003 | Trigger via DevTools `fetch` while the UI button is disabled. | Server limiter/auth/idempotency denies or returns existing result; UI state is not required for protection. |
| FC-PROOF-004 | Receive `429` with `Retry-After`. | A scoped cooldown appears, retry is unavailable only for that operation, form/draft state is preserved, and focus/keyboard behavior remains usable. |
| FC-PROOF-005 | Network fails after server success, then user retries. | Idempotency key prevents duplicate side effects or returns the already-created result. |
| FC-PROOF-006 | Abort a superseded GET/search/load-more request. | Late response does not overwrite newer UI state; server remains safe if it received the old request. |
| FC-PROOF-007 | Server returns validation error, 403, 409, 429, 500, and timeout in sequence. | Pending state clears, accessible error/status appears, and no stuck disabled control remains. |
| FC-PROOF-008 | Screen reader and keyboard-only user submits, waits, retries after cooldown, and cancels. | Accessible names, focus order, live regions, and disabled semantics are preserved. |
| FC-PROOF-009 | Offline or reconnect flush sends queued comments or events. | Queue flush is bounded, deduplicated where possible, and respects server `429`/idempotency. |
| FC-PROOF-010 | Programmatic loop floods client-error telemetry. | Client throttles locally and server fail-soft/drop behavior prevents app degradation. |
| FC-PROOF-011 | Rollback or kill switch changes a policy while the UI is in cooldown. | The affected UI exits stale cooldown after refreshed server/config state and does not remain disabled. |
| FC-PROOF-012 | Reuse one idempotency key with the same payload, a changed payload, an expired key, and concurrent same-key requests. | Same payload is idempotent; changed fingerprint is rejected without side effects; TTL expiry is explicit; concurrent request returns existing/in-progress/conflict result. |
| FC-PROOF-013 | Submit stale estimate/template/publication edits from a second tab using a resource version or `If-Match`/ETag-style precondition. | Server returns recoverable `409`/`412`; UI preserves draft and offers refresh, reconcile, or retry without overwriting newer state. |
| FC-PROOF-014 | Trigger retries for unsafe mutations with and without an idempotency key. | No automatic retry happens without idempotency; idempotent retries use capped backoff and honor `Retry-After` over local timers. |
| FC-PROOF-015 | Fill an offline queue past max count, max age, and max bytes, then sign out or switch workspace before reconnect. | Queue caps and purge rules are deterministic; private queued data does not cross account/workspace boundaries. |
| FC-PROOF-016 | Receive `Retry-After` as delay seconds, HTTP-date, invalid value, huge value, and stale hidden-tab countdown. | Parser clamps or rejects safely; visibility/focus/reconnect recomputes from current server/config state before enabling retry. |
| FC-PROOF-017 | Run the same high-cost action from two tabs with `BroadcastChannel` unavailable and with Web Locks unavailable. | Fallback stays usable; server idempotency/limiter remains correct; Web Locks are used only for chosen singleton work. |
| FC-PROOF-018 | Disable a submit control during cooldown while required form fields remain present elsewhere. | The disabled control is not the only carrier of state; status text is discoverable, keyboard path remains coherent, and form data is not lost. |
| FC-PROOF-019 | Retry when server `Retry-After` is absent but retry is safe/idempotent. | Capped full-jitter fallback spreads retries and stops at max attempts/elapsed time; unsafe mutations remain manual unless idempotent. |
| FC-PROOF-020 | Service-worker/offline replay after sign-out or workspace switch. | No service worker/offline queue is proven, or queued work is purged/blocked and cannot replay stale-auth mutations. |

## Accessible `429` Copy Contract

Every user-visible retryable denial should communicate four things without leaking account, token, recipient, or provider existence: the action is temporarily unavailable, the wait time or retry time, what the user can do next, and where to get owner/support help when the surface is business-critical. Use `aria-live` for inline status when the state changes, move focus only when a modal or form-level error needs attention, and preserve user-entered draft content.

## Acceptance Criteria For Implementation Planning

- P0 inventory must add a client-control row for every high-cost, destructive, public, email, upload, AI, export, and high-frequency mutation surface.
- Each future implementation unit must say whether the frontend uses pending disable, single-flight, debounce/throttle, cancellation, idempotency, local cooldown, multi-tab coordination, optimistic rollback/retention, or no client guard with rationale.
- Every client guard must map to a server-side proof row that ignores the guard.
- Every route/action contract row must state the server-authoritative gate that runs before side effects or provider calls.
- Every action-function row must classify CSRF/same-origin posture, direct invocation behavior, and idempotency/replay behavior.
- Every retryable denial must define how `Retry-After` is exposed in route headers or action result payloads and how the UI renders it.
- Every idempotent mutation must define fingerprint fields, TTL, concurrent same-key behavior, and same-key/different-payload mismatch behavior.
- Every stale-write-sensitive mutation must define resource version or `If-Match`/ETag-style precondition behavior, or explicitly justify last-writer-wins.
- Every retry/offline flow must define auto-retry eligibility, capped backoff, `Retry-After` precedence, offline queue caps, purge rules, and visibility/focus/reconnect refresh.
- Every retry/offline flow must define full-jitter fallback behavior when server retry timing is absent, and must prove `Retry-After` still takes precedence.
- Every service-worker or background-sync claim must either prove the app has no such replay path or define queue/idempotency/purge/server-denial contracts before implementation.
- Every multi-tab flow must choose tab-local, `BroadcastChannel`, storage-event, or Web Locks behavior with server-authoritative fallback.
- Every disabled/cooldown flow must expose the explanation and retry status outside disabled controls because native disabled controls are not focusable or submitted.
- Accessibility proof is required for disabled, pending, cooldown, challenge, optimistic rollback, and retry states on public reviewer, invite, auth, upload, AI, export, estimate/template editing, and destructive mutation flows.
- Browser proof remains future implementation evidence, not a claim from this planning task.
