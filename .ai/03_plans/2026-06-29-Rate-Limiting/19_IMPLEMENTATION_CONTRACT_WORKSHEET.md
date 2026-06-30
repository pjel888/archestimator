---
title: Implementation Contract Worksheet
plan_id: 2026-06-29-rate-limiting
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# Implementation Contract Worksheet

This worksheet closes the implementation-contract gap without changing source. It records the route/action/provider surface observed on 2026-06-30 and identifies the exact contract fields that P0 must complete before enforcement code starts.

## Mandatory P0 Contract Fields

Before source edits, each route, action function, and high-risk client flow must fill these fields. The current tables are inventory seeds, not final implementation authority.

| Field | Required answer |
| --- | --- |
| Server-authoritative gate | Which auth, authorization, ownership, validation, idempotency, rate-limit, or provider-budget gate runs before the side effect, provider call, email send, file write, export generation, or destructive mutation. |
| HTTP response profile | Whether route denials/conflicts use minimal body, JSON, RFC 9457 Problem Details, draft RateLimit metadata, or a domain-native server-action result; include status codes for `429`, `409`, `412`, `422`, and `503` where applicable. |
| Quota metadata disclosure posture | Whether draft `RateLimit`/`RateLimit-Policy`, remaining/reset/limit equivalents, or only `Retry-After` are exposed; sensitive auth/token/public flows must explain any disclosure. |
| Algorithm/window semantics | Fixed-window, sliding-window, token-bucket/GCRA, exact reservation, provider soft limit, or no-generic-quota; include clock source, boundary behavior, multi-window combination, burst, reset/refill, and overshoot tolerance. |
| Resource budget posture | Request count plus body bytes, item/page-size, duration/timeout, active concurrency, provider-cost units, queue depth, and circuit-breaker thresholds or explicit not-applicable rationale. |
| Cache/CDN profile | `Cache-Control`, `Vary`, CDN bypass/cache-key behavior, no-store posture, and any static/health-route exception. |
| Auth failed-attempt posture | For auth/contact flows, failed-attempt definition, success reset, generic response, provider lockout coordination, adaptive challenge threshold, support/unlock path, and shared-NAT/beta recovery. |
| Browser-origin posture | Whether `Origin`/`Host`, Fetch Metadata, CSRF token, CORS assumptions, content type, and body-size checks apply; record explicit exemptions. |
| Direct invocation behavior | What happens when the same operation is called through DevTools, scripted `fetch`, direct Server Action invocation, or replay without the intended UI state. |
| Idempotency/replay posture | Whether duplicate user submit, browser retry, network retry, webhook retry, queue retry, or scripted replay returns existing result, no-ops, denies, or creates a fresh operation. |
| Idempotency fingerprint and TTL | For idempotent mutations, define key scope, normalized fingerprint fields, TTL, storage state, concurrent same-key behavior, expired-key behavior, and same-key/different-payload mismatch result. |
| Concurrency/precondition posture | For stale-write-sensitive mutations, define resource version, revision hash, or `If-Match`/ETag-style precondition behavior; document when last-writer-wins is intentionally accepted; define `409`/`412` UI recovery. |
| Client control | Pending state, keyboard handling, single-flight, cooldown, cancellation, multi-tab, optimistic rollback/retention, or no client guard with rationale. |
| Retry UX | How `Retry-After` or action-result retry timing appears, how form/draft state is preserved, and how the operation re-enables without a stuck disabled state. |
| Retry/backoff posture | Whether unsafe mutations can auto-retry; required idempotency key for unsafe retry; max attempts, capped backoff, jitter, timeout, abort, and `Retry-After` precedence. |
| Offline queue posture | Whether work can persist offline; max queued count, max age, max bytes, dedupe key, flush order, storage/privacy class, purge rules, and server-denial halt behavior. |
| Browser lifecycle and multi-tab posture | Whether state is tab-local, `BroadcastChannel` hinted, storage-event fallback, or Web Locks singleton; recompute pending/cooldown/queue state on `visibilitychange`, focus, reconnect, navigation cleanup, and rollback/kill-switch refresh. |
| Accessible disabled/cooldown semantics | Native disabled controls are not focusable and are not submitted, so required values, reason text, retry time, support path, and `aria-live`/`aria-busy` status must live outside the disabled control. |
| Distributed abuse and retention posture | Low-and-slow anomaly signals, escalation/de-escalation criteria, retention class, expiry/deletion/anonymization, pepper rotation, and audit exception behavior. |

## Route Contract Inventory

| ID | Entry | Methods / branch | Actor and resource | Current gate | Rate-limit decision | Required proof |
| --- | --- | --- | --- | --- | --- | --- |
| RC-001 | `src/app/api/ai/ask/route.ts` | POST | Authenticated workspace user, AI ask cost | AI user context plus existing AI limiter | Preserve AI ask quota; add policy ID and cost dimensions. | Ask loop denies before provider spend; 503 contract on store failure. |
| RC-002 | `src/app/api/ai/package-builder/route.ts` | POST draft/refine/feedback/apply | Authenticated workspace user, package draft/apply | Handler auth at `handler.ts:194-201`; draft token for feedback/apply | Add separate draft/refine/feedback/apply decisions; apply needs mutation/cost classification. | Provider stub and Apply authorization tests; no limiter decision exists today. |
| RC-003 | `src/app/api/auth/[...all]/route.ts` | GET, POST, PATCH, PUT, DELETE | Auth/session/email/client | Auth provider/app route | Coordinate with provider; avoid duplicate lockout. | Provider contract review and beta-user recovery tests. |
| RC-004 | `src/app/api/component-library/attachments/direct-upload/route.ts` | POST | Authenticated workspace user, attachment/upload session | Auth plus upload/session checks | Storage request/concurrency policy; durable source of truth required. | Concurrent upload and crash-before-release tests. |
| RC-005 | `src/app/api/component-library/attachments/route.ts` | GET, POST, DELETE | Authenticated workspace user, attachment | Auth/data access | POST/DELETE storage mutation policy; GET likely normal auth read. | Mutation burst tests and no-policy rationale for low-cost reads. |
| RC-006 | `src/app/api/component-library/attachments/scan-override/route.ts` | POST | Authenticated privileged user, scan override | Auth/authorization required | Admin/storage override policy or explicit no-policy with audit. | Authorization and audit test. |
| RC-007 | `src/app/api/component-library/images/route.ts` | GET, POST, DELETE | Authenticated workspace user, component image | Auth/data access | Image storage request/byte policy for POST/DELETE; GET soft only. | Upload/delete cost tests and no-store sensitive responses. |
| RC-008 | `src/app/api/estimate-row-images/route.ts` | POST | Authenticated user, estimate row image | Auth/data access | Image upload policy tied to workspace/user/estimate. | Upload size/type/concurrency tests. |
| RC-009 | `src/app/api/health/route.ts` | GET | Public or infrastructure health | Health route | No app limiter unless infrastructure abuse appears; WAF coarse only. | No-policy rationale and monitoring. |
| RC-010 | `src/app/api/internal/client-error/route.ts` | POST | Browser telemetry client | Same-origin/fetch metadata/body size plus local IP map | Telemetry limiter may fail soft/drop; normalize client hash. | Flood test proves core app unaffected and no raw client data stored. |
| RC-011 | `src/app/api/internal/upload-cleanup/route.ts` | GET, POST | Cron/internal job | Secret/config gate | Signature/secret/idempotency first; rate limit secondary. | Replay/idempotency and secret-missing tests. |
| RC-012 | `src/app/api/internal/upload-runtime/route.ts` | GET, POST | Internal upload runtime | Secret/config gate | Same as internal job; classify per operation. | Replay/idempotency and queue-safety tests. |
| RC-013 | `src/app/api/internal/upload-scan/route.ts` | GET, POST | Cron/internal scan | Secret/config gate | Same as internal job; rate limit is secondary. | Duplicate scan prevention proof. |
| RC-014 | `src/app/api/projects/[projectId]/activity/route.ts` | GET | Authenticated project user, activity feed | Auth/project access | Low-cost read; likely no app limiter beyond auth unless polling pressure appears. | No-policy rationale or soft read limit if metrics justify. |
| RC-015 | `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` | GET | Authenticated user, project/estimate export | Auth/project access plus existing export limiter | Preserve 12/min and 120/hour before workbook generation. | 429/Retry-After before workbook work; p95/export cost telemetry. |
| RC-016 | `src/app/api/projects/images/route.ts` | GET, POST, DELETE | Authenticated project image user | Auth/project access | Storage policy for POST/DELETE; GET soft/no-policy rationale. | Size/type/concurrency and delete tests. |
| RC-017 | `src/app/api/share/[token]/activity/route.ts` | GET | Public share token/session | Token/session helpers plus durable 60/min | Preserve current durable read limit. | Route test for 429/Retry-After and no token leak. |
| RC-018 | `src/app/api/share/[token]/comment/route.ts` | GET, POST | Public reviewer/recipient/publication | Token/session/recipient helpers plus durable read/write limits | Preserve current read/write windows; protect reviewer UX. | Office-NAT reviewer scenario and comment spam test. |
| RC-019 | `src/app/api/share/[token]/decision/route.ts` | GET, POST | Public reviewer/recipient/publication | Token/session/recipient helpers plus durable limits | Preserve durable write limit; add idempotency/false-positive path. | Repeated decision and retry tests. |
| RC-020 | `src/app/api/share/[token]/events/route.ts` | POST | Public share event client | Same-origin plus durable 60/min | Preserve event limiter and no-store behavior. | Event flood test. |
| RC-021 | `src/app/api/share/[token]/password/route.ts` | POST | Public token/client | Durable password failure plus local lockout | Make durable counter authoritative; local lockout supplemental only. | Brute force, delay, success-clear, no-existence-leak tests. |
| RC-022 | `src/app/api/share/[token]/route.ts` | GET | Public share token/client | Token helper plus durable 60/min | Preserve root/snapshot limiter. | Token root repeated load test. |
| RC-023 | `src/app/api/share/[token]/session/route.ts` | GET, POST, DELETE | Public share session/token/client | Token/session helpers plus durable 10/min and 50/hour | Preserve current session controls. | Session start/delete retry/no-store tests. |
| RC-024 | `src/app/api/share/[token]/unsubscribe/route.ts` | GET, POST | Public recipient/token | Token/recipient helper plus durable 5/min and 20/hour | Preserve limit but keep unsubscribe recovery. | Unsubscribe retry and support scenario. |
| RC-025 | `src/app/api/webhooks/resend/route.ts` | POST | Resend webhook event | Signature/config/body-size gate | No generic quota first; signature/replay/idempotency is primary. | Replay and invalid signature tests. |
| RC-026 | `src/app/auth/callback/route.ts` | GET | OAuth/magic callback | Auth provider/session | Coordinate with provider; avoid broad IP lockout. | Callback retry and invalid-state tests. |
| RC-027 | `src/app/invite/[token]/accept/route.ts` | POST, GET | Invite token/user/client | Invite token/user gate plus durable invite limiter | Preserve invite accept limiter and no enumeration. | Accept loop and token probing tests. |
| RC-028 | `src/app/invite/[token]/continue/route.ts` | POST, GET | Invite token/user/client | Invite token/user gate plus durable continue limiter | Preserve continue limiter and UX. | Continue loop test. |
| RC-029 | `src/app/invite/[token]/sign-out/route.ts` | POST | Invite token/client/session | Same-origin check at `route.ts:25-29`, then Supabase sign-out | P0 must choose explicit no-policy or light token/client limiter. | Same-origin rejection and sign-out abuse/no-policy proof. |
| RC-030 | `src/app/workshop/pending-invite/route.ts` | GET | Pending invite/workshop user | Route-specific access gate | Low-cost read unless polling/abuse appears. | No-policy rationale or soft read test. |

## Server Action File Inventory

P0 must expand high-risk file rows to function-level contracts before source edits. File-level classification is enough for this planning package because implementation is not authorized here. Each function-level row must include browser-origin posture, direct invocation behavior, and idempotency/replay posture, not only a rate-limit class.

| ID | File | Observed action set | Class | Rate-limit decision | Required proof |
| --- | --- | --- | --- | --- | --- |
| AC-001 | `src/lib/auth/account-actions.ts` | `updateProfileSettings`, `updateWorkspaceSettings`, `getAccountSetupState` | Auth account mutation/read | Mutation policy for updates; no-policy rationale for setup read. | Auth/action tests. |
| AC-002 | `src/lib/auth/actions.ts` | `signInWithEmail`, `signInWithGoogle`, `signOut` | Auth/provider | Email/client limiter coordinated with provider; sign-out no-policy rationale. | Provider recovery and enumeration tests. |
| AC-003 | `src/lib/auth/beta-allowlist-admin-actions.ts` | `createClosedBetaAllowlistEntry`, `updateClosedBetaAllowlistEntry` | Admin mutation | Admin-only mutation policy or audit-only no-policy. | Authorization and audit tests. |
| AC-004 | `src/lib/collaboration/actions.ts` | Invite/collaborator/link/resend/access-mode actions | Invite/email/collaboration mutation | Preserve invite create/resend durable limits; classify collaborator mutations. | Invite/email reputation tests. |
| AC-005 | `src/lib/collaboration/pending-invite-actions.ts` | `signOutForPendingInvite`, `acceptPendingInvitationById` | Invite/session | Accept limiter; sign-out no-policy or light limiter rationale. | Pending invite accept/sign-out tests. |
| AC-006 | `src/lib/collaboration/realtime-identity-actions.ts` | `issueRealtimeIdentity` | Realtime/provider credential | Room/user/client join quota and token issuance guard. | Realtime token issuance tests. |
| AC-007 | `src/lib/collaboration/summary-actions.ts` | `fetchProjectCollaborationSummary` | Auth read | No-policy or soft read limiter only if polling metrics justify. | No-policy rationale. |
| AC-008 | `src/lib/component-library/actions.ts` | Component library reads, preferences, component/folder/template mutations, bulk archive/search | Storage/library mutation and search | Function-level classification required; bulk/archive/search need cost windows. | Mutation burst and bulk archive tests. |
| AC-009 | `src/lib/component-library/template-editor-actions.ts` | Template node/row/create/update/remove/reorder/insert actions | High-frequency authenticated mutation | Lenient burst/workspace policy; avoid blocking normal editing. | Editing profile and multi-tab tests. |
| AC-010 | `src/lib/estimate-sheet/user-preferences-actions.ts` | Load/save estimate sheet preferences | Preference read/write | Low-risk save limiter or no-policy rationale. | Preference action tests. |
| AC-011 | `src/lib/estimates/actions.ts` | Estimate reads plus create/duplicate/delete/update/reorder/row mutations | High-frequency estimate mutation | Existing local limiter is not distributed; function-level policy required. | Normal editing, runaway loop, multi-tab tests. |
| AC-012 | `src/lib/estimates/express-promotion-actions.ts` | Promote estimate/express row to library component | Provider/storage mutation | Authenticated mutation policy plus idempotency. | Promotion duplicate test. |
| AC-013 | `src/lib/estimates/subtree-actions.ts` | `fetchEstimateNodeSubtree` | Auth read | No-policy or soft read limiter if polling pressure appears. | No-policy rationale. |
| AC-014 | `src/lib/favorites/sidebar-favorites-actions.ts` | `fetchSidebarFavoriteProjects` | Auth read | No-policy rationale. | No-policy rationale. |
| AC-015 | `src/lib/legal/actions.ts` | `acceptCurrentTermsAction` | Legal/account mutation | No broad limiter; idempotency and auth. | Idempotent accept test. |
| AC-016 | `src/lib/notifications/actions.ts` | Notification load/mark/dismiss/acknowledge actions | Auth read/mutation | Soft read/no-policy for load; mutation burst guard if needed. | Notification action tests. |
| AC-017 | `src/lib/projects/actions.ts` | Project create/delete/bulk/update/image metadata actions | Project mutation/storage | Authenticated mutation and bulk delete policy. | Bulk delete preview/execute tests. |
| AC-018 | `src/lib/projects/location-actions.ts` | Save/clear project location | Project mutation | Low-risk mutation limiter or no-policy rationale. | Mutation tests. |
| AC-019 | `src/lib/publication/actions.ts` | Publication create/republish/rotate/revoke/recipient/email/activity/digest actions | Public-link/email/provider mutation | Preserve public/share UX; email/provider and link rotation policies. | Recipient email/digest and rotate/revoke tests. |
| AC-020 | `src/lib/publisher/activity-actions.ts` | `loadPublisherWorkspaceActivity` | Auth read | No-policy or soft read. | No-policy rationale. |
| AC-021 | `src/lib/publisher/drawer-actions.ts` | `readPublisherPublicationDrawerData` | Auth read | No-policy or soft read. | No-policy rationale. |
| AC-022 | `src/lib/recipient-proposals/actions.ts` | `loadRecipientProposals` | Recipient/public read | Soft read with reviewer-friendly false-positive path if needed. | Reviewer scenario. |
| AC-023 | `src/lib/reusable-sources/actions.ts` | List/search source projects/estimates, outline, insert source | Search/read plus estimate mutation | Search/cost soft limit; insert mutation policy. | Search pressure and insert tests. |
| AC-024 | `src/lib/workshop/actions.ts` | Favorite project/estimate actions | Low-risk mutation | No-policy or lenient mutation guard. | Favorite burst test if enforced. |
| AC-025 | `src/lib/workshop/beta-feedback-actions.ts` | `submitBetaFeedback`, `submitBetaFeedbackInline` | Public/beta feedback write | Spam limiter and optional Turnstile if public. | Feedback spam test. |
| AC-026 | `src/lib/workshop/beta-feedback-review-actions.ts` | `updateBetaFeedbackReviewStatus` | Admin/review mutation | Admin-only audit/no-policy or low limiter. | Authorization test. |
| AC-027 | `src/lib/workshop/group-actions.ts` | Create/rename/recolor/delete/reorder/move/bulk group actions | Project organization mutation | Lenient workspace mutation policy. | Bulk assignment and reorder tests. |

## Frontend Client Contract Rows

P0 must expand these rows to concrete components and user flows before source edits. Client controls reduce accidental pressure and improve recovery; they never replace route/action enforcement.

| ID | UI surface | Future client guard | Required server pairing | Required proof |
| --- | --- | --- | --- | --- |
| FC-001 | Share decision confirmation | Pending disable, same-recipient/publication single-flight, keyboard parity, optional idempotency key, focus restoration. | Decision POST remains idempotent or conflict-safe under repeated direct calls. | Rapid click, Enter submit, direct `fetch`, 409/429/error recovery, no stuck disabled state. |
| FC-002 | Share comments | Submit single-flight for identical draft/target, bounded offline flush, retry-after cooldown, optimistic draft retention, duplicate toast suppression. | Comment route preserves durable write limit and duplicate/queue safety. | Double submit, reconnect flush, 429 cooldown, queued retry after network failure. |
| FC-003 | Share password/session/unsubscribe | Pending disable and scoped cooldown from `Retry-After`; no copy leaking token validity. | Durable token/client limiter and non-enumerating denial. | Repeated attempts, cooldown display, keyboard path, direct POST bypass. |
| FC-004 | Invite/auth/contact forms | Pending submit, keyboard parity, per-email/token resend cooldown, adaptive challenge only when server asks. | Provider-coordinated limiter, no account/token enumeration, Turnstile server validation when enabled. | Double submit, provider recovery path, invalid token/email denial, accessibility proof. |
| FC-005 | Upload/image/direct-upload | Single-flight session init, active upload slot UI, cancel/retry, cleanup timeout display, multi-tab duplicate avoidance for expensive sessions. | Durable capacity, byte/type validation, idempotent release/cleanup. | Two tabs, crash/retry, cancel, 429 retry-after, direct route call. |
| FC-006 | XLSX export | Same-estimate pending disable, idempotency key reuse for retry, scoped success cooldown. | Export limiter denies before workbook generation and avoids duplicate heavy work. | Double click, network failure after success, direct repeated GET. |
| FC-007 | AI ask/package-builder | Pending state, abort superseded draft/refine where safe, Apply idempotency key, scoped cooldown after success. | Provider-cost limiter and Apply idempotency run before spend/mutation. | Rapid Ask loop, repeated Apply, abort stale refine, 429/503 recovery. |
| FC-008 | Estimate/template/project organization editing | Per-resource mutation queue, lenient local burst, optimistic rollback or pending retention, stale-tab recovery, no global editor lock. | Server action limiter preserves normal editing and denies scripted loops. | Multi-tab edit, runaway loop, conflict rollback, keyboard operation. |
| FC-009 | Publication/email/digest/republish | Single-flight, recipient/resource cooldown, duplicate toast suppression. | Delivery idempotency, recipient cooldown, provider circuit breaker. | Resend double click, digest retry, direct action bypass. |
| FC-010 | Telemetry/activity/client-error | Throttle/sample/fail soft with no user-blocking UI. | Same-origin/fetch metadata/body-size/rate-limited drop. | Programmatic telemetry loop, invalid origin, oversized body, app unaffected. |

## Frontend Second-Pass Contract Rows

These rows are cross-cutting additions to the FC rows above. They must be answered before implementing shared client guards or enabling mutation retries/offline persistence.

| ID | Contract | Future implementation answer required | Required proof |
| --- | --- | --- | --- |
| FCE-001 | Idempotency fingerprint, TTL, and mismatch behavior | Which mutations generate keys; what fingerprint fields bind the key; TTL and cleanup; how same-key/same-payload, same-key/different-payload, concurrent same-key, and expired-key requests resolve. | Duplicate export/AI Apply/share decision/email send cannot duplicate side effects; changed-payload replay is rejected; TTL behavior is deterministic. |
| FCE-002 | Lost-update protection | Which resources use version, revision hash, or `If-Match`/ETag-style preconditions; which flows intentionally allow last-writer-wins; how `409`/`412` recovery preserves drafts. | Two-tab stale write returns recoverable conflict and does not silently overwrite newer state. |
| FCE-003 | Retry policy | Unsafe mutations do not auto-retry without idempotency; safe reads and idempotent mutations have capped attempts, backoff, optional jitter, timeout/abort, and `Retry-After` precedence. | Network failure and `429` scenarios are bounded; no hidden retry storm; user can recover after exhaustion. |
| FCE-004 | Offline queue governance | Queue max count, max age, max bytes, dedupe key, flush order, storage/privacy class, purge on sign-out/workspace switch/token invalidation, and server-denial halt behavior. | Reconnect flush respects auth, authorization, idempotency, rate limits, and purge rules. |
| FCE-005 | Exact `Retry-After` parsing and browser lifecycle | Parser supports delay seconds and HTTP-date, rejects invalid values, clamps extremes, handles clock skew, and recomputes on `visibilitychange`, focus, reconnect, navigation cleanup, and rollback/kill-switch refresh. | Hidden tab and stale timer cannot submit based only on old local countdown. |
| FCE-006 | Multi-tab mechanism choice | Each high-cost action chooses tab-local, `BroadcastChannel`, storage-event fallback, or Web Locks singleton behavior. Web Locks are reserved for high-cost local singleton work. | Two tabs behave coherently when optional browser APIs are unavailable; server remains authoritative. |
| FCE-007 | Disabled-control accessibility | Disabled buttons do not carry required form values or the only explanation. Cooldown reason, retry time, support path, and dynamic status live in visible text and `aria-live`/`aria-busy` where useful. | Keyboard and screen-reader users can discover why action is unavailable and recover without lost input. |

## Standards Contract Rows

These rows are cross-cutting additions to the RC, AC, FC, FCE, and CP rows. P0 must answer them for each applicable route/action/client/provider surface before implementation.

| ID | Contract | Future implementation answer required | Required proof |
| --- | --- | --- | --- |
| SCE-001 | HTTP response profile | Status/body/header shape for `429`, `409`, `412`, `422`, and `503`; whether Problem Details is used; domain-native equivalent for server actions. | Stable route/action response tests, safe user copy, `Retry-After` where retryable, and no provider/internal detail leakage. |
| SCE-002 | RateLimit metadata disclosure | Whether draft `RateLimit`/`RateLimit-Policy` metadata is emitted, suppressed, or redacted per surface. | Sensitive public/auth/token routes do not reveal account/token/resource existence or exact remaining quota unless explicitly approved. |
| SCE-003 | Algorithm, burst, reset, and overshoot semantics | Algorithm type, window size, burst capacity, refill/reset behavior, exactness requirement, and tolerated distributed/provider overshoot. | Boundary tests for window edges, burst exhaustion, reset/refill, concurrency, and provider-soft overshoot. |
| SCE-004 | Resource budget dimensions | Max body bytes, file count, item count, page/result rows, duration/timeout, active concurrency, provider tokens/cost units, queue depth, and circuit breaker thresholds. | Deny or shed before expensive work, provider spend, storage write, or large response generation. |
| SCE-005 | Auth failed-attempt and recovery semantics | Key dimensions, generic response, reset condition, unlock/support path, adaptive challenge threshold, provider lockout coordination, and shared-NAT false-positive handling. | Fake/real email parity, repeated failed attempts, successful recovery, provider duplicate-lockout avoidance, and beta-user support path. |
| SCE-006 | Cache/CDN denial profile | `Cache-Control`, `Vary`, CDN bypass/cache key, no-store policy for personalized/token/auth/mutation denials, and rationale for any cacheable denial. | Header/static review or route tests prove denial bodies cannot leak one actor's state to another. |
| SCE-007 | Distributed abuse escalation | Cardinality and correlation signals across actor/client/resource hashes, ASN/country, token families, email domains, or user-agent cohorts; thresholds for observe, challenge, stricter app policy, and incident response. | Synthetic low-and-slow matrix triggers review without country/ASN-only blocking. |
| SCE-008 | Retention, deletion, and anonymization | Retention class, expiry/delete job, summary aggregation, DSAR/deletion handling for hashed identifiers, legal/security exception, and hash pepper rotation. | Cleanup/deletion proof removes or anonymizes expired limiter/idempotency/offline data without breaking active windows or incident audit needs. |

## Cloudflare Provider Contract Rows

| ID | Slice | Exact config/proof required | Rollback | Evidence class | Decision |
| --- | --- | --- | --- | --- | --- |
| CP-001 | WAF observe-only public paths | Rule expression, threshold, mitigation timeout, log/readback artifact, app-origin comparison. | Disable by rule ID. | Provider readback plus hosted/origin logs. | OPEN. |
| CP-002 | WAF challenge/block | Owner-approved expression, false-positive threshold, support path, rollback drill. | Revert to observe-only or disabled. | Provider readback plus support metrics. | OPEN; no production block yet. |
| CP-003 | Turnstile | Widget surface, secret binding, server-side validation, token replay/expiry proof, accessibility fallback. | Feature flag off, app limiter still active. | Route tests plus provider validation. | OPEN; adaptive only. |
| CP-004 | Workers Rate Limiting binding | Wrangler binding, `namespace_id`, `period`, key basis, per-location overshoot test. | Remove soft check, keep app limiter. | Hosted Worker proof. | OPEN; not exact. |
| CP-005 | Durable Object exact counter | Partition key, binding/migration, transaction/concurrency tests, cleanup/expiry. | Keep Postgres/RPC as source of truth. | Hosted Worker/DO proof. | OPEN; exact candidate. |
| CP-006 | D1 limiter metadata | Schema, query budget, backup/restore, hot-counter rejection/mitigation. | Keep Postgres events. | Hosted Worker plus provider readback. | OPEN; not hot-counter default. |
| CP-007 | Observability | Logs/traces receipt, redaction sample, retention/sampling config, dashboard fields. | App-side events only. | Provider receipt plus dashboard/runbook. | OPEN. |

## Evidence Classes

| Class | Meaning | Allowed claim |
| --- | --- | --- |
| Local static | Source/doc/config inspection only. | Plan/source-grounding claim. |
| Local automated | Unit/route/action/store test in local CI/dev. | Local behavior claim for tested code path. |
| Distributed simulation | Multi-instance/concurrent local test. | Race/overshoot risk evidence, not hosted proof. |
| Browser/manual | Human/browser workflow proof. | UX/accessibility/manual claim only for tested flow. |
| Provider readback | Cloudflare/Supabase/provider API or console readback. | Provider config exists/disabled/enabled as read. |
| Hosted runtime | Deployed Worker/origin/provider traffic proof. | Runtime behavior for the tested environment. |
| Inferred | Reasoned from docs or source without execution. | Planning hypothesis only. |
