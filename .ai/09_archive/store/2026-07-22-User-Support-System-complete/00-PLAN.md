# User Support System: Canonical Execution Plan

## Status

`IMPLEMENTATION_READY / COMPLETE / NOT_EVALUATED / ARCHIVED / ACHIEVED`

- **Profile:** high blast radius because this work joins authenticated UX, D1,
  private R2 objects, realtime capabilities, and privacy erasure.
- **Action ceiling:** `IMPLEMENT_LOCAL`. Local repository edits and static/local
  verification are in scope. Remote migration, import, deployment, credentials,
  and live production mutation require a separate authorized release task.
- **Next unit:** none. `UNIT-001` through `UNIT-005` are verified.
- **Verification decision:** local static checks, isolated D1 lifecycle
  scenarios, bounded HTTP abuse/authorization probes, and independent review
  are complete. The permitted in-app browser runtime was unavailable, so visual
  audit claims remain explicitly blocked rather than inferred.
- **Canonical authority:** this file. `RESEARCH.md` and `UX-AUDIT.md` are dated
  evidence; this plan resolves any conflict in those supporting artifacts.

## 1. Task Contract

### Objective

Replace the split feedback/support experience with one secure support pipeline.
A signed-in user writes a plain-language message, may add one screenshot, and
gets a durable private conversation. Archestimator derives the user and a
minimized page context, delivers the report to `/admin/support`, surfaces active
attention in `/admin/today`, and lets the founder and user continue the same
thread.

### Required outcome

1. `/admin/support` loads reliably and Today items open the exact source.
2. New user complaints, questions, and feedback write only to canonical support.
3. User intake asks for a message, not type, severity, subject, or UUIDs.
4. One optional screenshot is private, bounded, normalized, owner-scoped, and
   recoverable across retries and partial D1/R2 failures.
5. Every message carries only disclosed, minimized, message-scoped context.
6. Users have Requests, New request, and Conversation views with unread state,
   status, history, replies, attachments, and explicit recovery behavior.
7. Admin Support and Today derive from the same D1 state and cannot resolve or
   hide a conversation independently of canonical support lifecycle.
8. Existing beta feedback becomes canonical admin history exactly once without
   surprising users with a newly visible conversation they did not start as chat.
9. Privacy export and erasure cover messages, context, attachments, claims,
   drafts, and retained legacy data through a verified, executable lifecycle.

### In scope

- global authenticated Support trigger and `/workshop/feedback` Support Center;
- owner-scoped list, thread, message, attachment, read, and realtime-token APIs;
- `/admin/support`, `/admin/today`, and the legacy feedback review link;
- current `ARCH_DB`, `ARCH_UPLOADS_R2`, `SUPPORT_INBOX`, `IMAGES`, and existing
  durable rate-limit and upload-cleanup infrastructure;
- additive D1 schema, legacy import, idempotency, unread/status transitions,
  private image handling, realtime invalidation, privacy fulfillment, and
  redacted operational events;
- removal of authenticated legacy feedback submission paths after cutover.

### Non-goals

- AI classification, bots, suggested replies, SLAs, macros, help-center CMS;
- public or anonymous support conversations;
- automatic screen capture, DOM/session replay, or hidden content collection;
- multiple user files, non-image files, or files above the relay limit;
- a third-party helpdesk, new runtime dependency, new Cloudflare binding, new
  queue, R2 S3 credentials, public bucket, or paid scanning service;
- new support priority schema or multi-admin assignment UI; current self-assign,
  labels, status, snooze, and star are sufficient for the founder MVP;
- email, browser, or OS notification for in-app replies in this MVP. The Support
  badge and inbox are the canonical reply-discovery surface;
- destructive legacy-table deletion, hosted deployment, or release certification.

### Stop condition

Stop when every required outcome has source and static/local evidence, the five
units are internally consistent, the pack validates, and no safe in-scope work
remains. Implementation completion does not imply remote release; release stays
`NOT_EVALUATED` until a separate authorized task proves it.

## 2. Confirmed Current State

| Surface | Current evidence | Required repair |
| --- | --- | --- |
| Admin mailbox | `listSupportMailbox` emits `COUNT(*) AS all`; SQLite rejects the reserved alias and the combined query returns a generic error. | Quote/rename the alias and preserve predicate parity between list/count. |
| Action Inbox | `AdminActionItemRow.href` is persisted but `AdminActionInbox` does not render it. Support uses `/admin/support`; feedback uses `/admin`. | Render source-aware Open and persist exact deep links. |
| Deep link | `src/app/admin/support/page.tsx` accepts `?c=`, but selects it only when the ID is present in the current mailbox page. | Fetch/pin an authorized selected conversation independently of the active page/filter. |
| Reconciliation | Support and feedback source reads are capped, then every absent ID is resolved. | Reconcile closure with source-of-truth `NOT EXISTS`, never a truncated display page. |
| Feedback intake | `WorkshopFeedbackModal` and `BetaFeedbackForm` ask for Type, Severity, Project UUID, and Message. | Replace with one message-first Support composer. |
| User support | `SupportChatWidgetClient` already lists, reads, replies, and reconnects, but exposes technical socket state and has no screenshot/context/status UX. | Recompose into one Support Center over the existing D1/DO substrate. |
| Support ledger | D1 already has conversations, messages, unread flags, attachments, triage, drafts, email correlation, and owner checks. | Extend rather than replace it. |
| Draft concurrency | Shared worktree changes `support-drafts-d1.ts` to `INSERT OR IGNORE` plus authoritative scope read. | Preserve and verify that concurrent repair. |
| Attachments | Admin/email attachments use private R2; user routes have no upload/read path. | Add a distinct user-owned path; never reuse the admin upload endpoint as authorization. |
| Body safety | `readBoundedFormData` already provides pre-parse byte limits and rejects unsupported content encoding. | Use it before any support `formData()` access. |
| Image safety | `server-image-processing.ts` already supports fail-closed Cloudflare Images/Sharp decode, pixel limits, resize, WebP output, and metadata stripping through re-encode. | Reuse/extend it for one normalized support image. |
| D1 atomicity | The support repository declares a prepare-only D1 type, while `src/lib/cloudflare/d1.ts` and `d1-batch.ts` expose optional batch plus fail-closed batching. | Remove the local duplicate type and require `runRequiredD1Batch`. |
| Privacy | Privacy intake records requests; support export/erase helpers have no verified-subject execution surface and account deletion bypasses them. | Add verified identity, an in-progress write fence, and an admin fulfillment lifecycle. |
| Realtime auth | Support subscribe and internal fanout currently share a room-token shape; browser tokens are placed in the WebSocket query. | Split subscribe/fanout capabilities and move browser capability out of URL queries. |

The dated rendered baseline and four captures remain in `UX-AUDIT.md` and
`audit/`. They are evidence of the starting state, not a requirement to preserve
the old composition.

## 3. Accepted Requirements

| ID | Role | Requirement | Units | Criterion |
| --- | --- | --- | --- | --- |
| OPS-001 | CORE | Restore mailbox/action reliability, preserve the draft concurrency repair, and open exact sources without bounded-set reconciliation errors. | 001, 004 | AC-001 |
| DATA-001 | CORE | Make support conversations/messages the only new user-report ledger and import legacy beta feedback exactly once with safe user visibility. | 002, 004, 005 | AC-002 |
| UX-001 | CORE | Replace type/severity/subject/manual IDs with one required message, one optional screenshot, and disclosed included details. | 002, 003 | AC-003 |
| SEC-001 | CORE | Derive identity, template the route, validate optional resource ownership, enforce origin/rate limits, and expose minimal DTOs. | 002, 003, 005 | AC-004 |
| SEC-002 | CORE | Store one normalized image privately with leased idempotency, owner/admin reads, fenced cleanup, and no body-limit mismatch. | 002, 005 | AC-005 |
| UX-002 | CORE | Give users one responsive Support Center with requests, unread discovery, lifecycle copy, history, replies, and deterministic recovery. | 003 | AC-006 |
| DATA-002 | CORE | Persist message/status/unread changes before capability-scoped DO invalidation; realtime failure cannot lose or falsely acknowledge data. | 002, 003, 004 | AC-007 |
| UX-003 | CORE | Show each report once in admin Support and, while attention is required, Today; keep evidence on its owning message. | 001, 004 | AC-008 |
| OPS-002 | CORE | Complete verified privacy fulfillment, cleanup, observability, legacy cutover, documentation, and final local evidence without a release claim. | 005 | AC-009 |

## 4. Resolved Decisions

### DEC-AUTO-001: one canonical ledger

All new authenticated complaints, questions, feature requests, and feedback use
`support_conversations` and `support_messages`. Legacy beta feedback is imported
idempotently for admin continuity. Imported threads stay out of the user's
Requests/unread counts until an admin intentionally replies; that reply activates
the thread as a normal user-visible conversation.

Rejected alternatives:

- keep feedback and support as two active products;
- destructively rewrite/drop legacy tables during MVP;
- show old one-way feedback as a fresh unread chat request.

### DEC-AUTO-002: message-first intake

The user supplies only a 2 to 4,000 character message and an optional screenshot.
No type, severity, subject, project UUID, or internal triage choice is shown.
Admin classification uses existing labels/status/snooze/star/self-assignment.

### DEC-AUTO-003: disclosed per-message context

Every new request and reply shows the same `Included details` disclosure:

- required and not removable: server-derived actor/conversation/message/time and
  a server-matched route template with opaque dynamic segments replaced by
  placeholders;
- optional, one group toggle, default on for each composer instance and not saved
  as a preference: validated workspace/project/estimate IDs, viewport, timezone,
  normalized browser/OS family, and safe app release;
- when off, admin still receives identity, time, route template, message, and any
  user-selected screenshot, but none of the optional diagnostics.

The client supplies only `window.location.pathname` as an untrusted
`sourcePathname`; it never sends origin, query, or hash. A server-owned ordered
matcher maps that value to an allowlisted authenticated route template and checks
any optional resource IDs independently. Missing, malformed, non-authenticated,
or unmatched input persists the constant `authenticated_route_unknown`, never the
API route or raw client path. `Referer` is not a source of stored context.

### DEC-AUTO-004: no new runtime dependency

Reuse repository Dialog/Modal/Sheet, Button, controls, badges, alerts/toast,
TanStack Query, native File/Clipboard/Drag APIs, native WebSocket, and existing
image processing. Tiptap remains admin-only. Do not add Radix Dialog, shadcn
generated Dialog, React Hook Form, Zod, react-dropzone, html2canvas, image
compression packages, Socket.IO, another toast, or another virtual-list package.
`RESEARCH.md` holds the dated official-source comparison.

### DEC-AUTO-005: normalized small-file relay

Accept no image or one PNG/JPEG/WebP source up to 3 MiB inside a request bounded
to 4,194,304 bytes. Decode fail-closed, cap at 24 megapixels and 4,096 pixels per
edge, re-encode a static WebP, strip source metadata, and store only the normalized
output. Use the existing private `ARCH_UPLOADS_R2` and `IMAGES` bindings. No
presigned URL, public bucket, signing credentials, or raw original is retained.

### DEC-AUTO-006: leased intake claim

A detached claim is justified because no D1 transaction can include R2. It is the
single pre-object intent and retry fence, not a second user-visible message ledger.
Only the current lease token may write and commit. Followers never write R2.
Cleanup must fence an expired claim before deletion, so it cannot race a commit.

### DEC-AUTO-007: D1 first, capability-scoped realtime

All D1 message/status/unread changes commit before realtime. Add support-specific
v2 claims with separate `support:subscribe` and `support:fanout` capabilities.
WebSocket admission accepts only subscribe capability; internal POST fanout
requires `support:fanout` and `sub=system:support-inbox-fanout`. Use the existing
`REALTIME_ROOM_TOKEN_SECRET`. The browser offers exactly
`archestimator.support.v2` plus
`archestimator.support.auth.<signed-room-token>` in
`Sec-WebSocket-Protocol`; the DO validates the credential offer and echoes only
the fixed non-secret protocol in the `101` response. Never place the credential
in a URL or selected protocol. Broadcast identifiers only.

### DEC-AUTO-008: in-app reply discovery for MVP

Support replies do not enter the general Workshop notification center and do not
send email in MVP. The Support trigger owns a capped `9+` badge with the full
count in its accessible label. Opening it selects the newest unread conversation;
otherwise it opens Requests when history exists and New request when empty.
Email notification remains a later product decision and never blocks D1 writes.

## 5. Product And Interaction Contract

### 5.1 Information architecture and hosts

| Host | Width | Primitive/composition | Initial destination | Navigation/focus |
| --- | --- | --- | --- | --- |
| Global Support | `<640px` | modal `Sheet side="right" size="full"`; one view at a time | newest unread, else Requests, else New request | Conversation/New Back returns to Requests; focus moves to view heading, then back to the originating row/button; closing returns focus to Support. |
| Global Support | `>=640px` | `AppModal size="xl"`; Requests rail plus selected Conversation/New panel | newest unread, else first recent request, else New request | selected-row and panel scroll persist while open; composer remains visible; closing returns focus to Support. |
| `/workshop/feedback` | `<640px` | full-page one-view flow | newest unread, else Requests, else New request | visible Back, sticky header/composer, focus moves to new heading and restores to row on Back. |
| `/workshop/feedback` | `>=640px` | full-page Requests rail plus Conversation/New panel | newest unread, else first recent request, else New request | URL may carry `?c=<id>`; selection and scroll survive refresh where source state permits. |

The existing Dialog core owns trap, Escape, inert background, description, and
focus return when the overlay closes. The Support Center owns focus for internal
view changes. Initial focus for New request is the message textarea.

### 5.2 New request and reply

- Copy: `Tell us what happened or what you need help with.`
- Message is the only required field.
- `Add a screenshot (recommended)` supports picker, paste, and drop through one
  normalized selection path.
- Show a local object-URL preview, generic normalized output name, source size,
  Remove, and confidential-information reminder. Revoke the URL on replace,
  remove, success, or unmount.
- Screenshot can be removed before send. After send, it remains part of the
  support record until authorized lifecycle handling or privacy erasure; disclose
  that consequence before submission.
- New request and Reply use the same Included details toggle and retry contract.
- Local draft state stays in memory while the host remains mounted. Do not put
  sensitive support drafts into localStorage/sessionStorage or background sync.
- `Ctrl/Cmd+Enter` sends; Enter inserts a newline.

### 5.3 Conversation lifecycle

| Event | Internal status | User label/copy | Unread effect | Admin attention |
| --- | --- | --- | --- | --- |
| User creates request | `open` | success `Request received`; row `Waiting for support` | admin `1`, user `0` | open |
| Admin opens thread | unchanged | unchanged | clear admin unread only through the last successfully rendered inbound message | source remains active while open/pending |
| Admin replies and expects response | `pending` by default | `Waiting on you` | user `1`, admin `0` | active but below unread user replies |
| Admin closes after explanatory reply | `resolved` or `archived` | `Conversation closed` | user `1` for the reply/status change | resolved from Today by canonical truth |
| User replies from any status | `open` | `Waiting for support` | admin `1`, user `0` | reopen/refresh exact source |
| User opens successfully rendered history | unchanged | unchanged | clear user unread only through the last successfully rendered support message | no change |
| Legacy import | mapped status, admin-visible | absent from Requests/unread | user `0` | active if mapped canonical status requires attention |
| Admin first reply to hidden legacy thread | `pending` | thread becomes visible as `Waiting on you` | user `1` | canonical source continues |

`resolved` never claims that a bug or feature is fixed. The final admin reply says
whether the question was answered, issue fixed, feedback recorded, or request
declined. Status-only close without explanatory user-visible copy is not a valid
admin flow.

### 5.4 Message-scoped evidence

- Screenshot and Included details render on the message that produced them.
- `SupportMessageCard` remains the chronology owner for attachments.
- Stable conversation identity and triage stay in the thread header.
- There is no ambiguous thread-global context panel. Admin may expand an
  `Included details` disclosure on each applicable message.
- User text renders as plain escaped text. Admin HTML continues through the
  existing sanitized admin/email path and is never reused for user input.

### 5.5 Recovery matrix

| State | Retained content | User-facing action/copy | Identity and accessibility |
| --- | --- | --- | --- |
| Offline before send | message, image preview, included-details choice | `You are offline. Send when your connection returns.` No auto-send. | same client ID; status region; focus stays in composer |
| Invalid image | message and choice; rejected file removed from pending payload | explain size/type/decode problem; Replace or Send without screenshot | no claim yet; alert; focus image control |
| Uploading/submitting | all local content | progress copy; duplicate send disabled | one stable client ID; polite live region |
| Active identical retry | all local content | `Still saving. Try again in a moment.` | same client ID; server `202` plus Retry-After |
| Uncertain/lost response | all local content | `We could not confirm the result. Try again.` | retry same client ID/fingerprint; focus Retry |
| Idempotent recovery | canonical server result | `Request received.` Open returned thread | clear draft only after canonical response; polite announcement |
| Changed-payload conflict | all local content | explain that this send identity already belongs to another payload; explicit Start new attempt | never auto-generate a second ID; alert |
| Screenshot storage failure | message and preview | Retry image, or fence this attempt then Send without screenshot using a new ID | old claim reaches `cleanup_fenced` synchronously and `abandoned` only after quiet-period cleanup; alert |
| Rate limited | all local content | show bounded retry time | same client ID; no new claim/write after denial |
| Realtime degraded | canonical server result | `Live updates are delayed. Messages are still saved.` Refresh available | success, not send failure; status region |
| List/thread refresh failure | last known safe cache | stale banner plus Retry; do not erase visible history | no mark-read until fresh history renders |
| Attachment unavailable | message/context remain | attachment-specific unavailable copy plus Retry | never hide the owning message |
| Admin mailbox failure | last known mailbox when available | visible error and Retry; Today deep link remains exact | redacted log event; no false empty state |

### 5.6 Accessibility and performance

- Badge, status, unread, upload, and priority-like labels are textual, not color
  only. Use polite live regions for progress/new replies and alerts for terminal
  failure.
- Touch targets and visible focus follow existing authenticated UI guidance.
- Narrow views never require horizontal scroll and expose an explicit Back.
- Query lists are bounded and cursorable. Do not add virtualization until a
  measured threshold. Use a visible-page 60-second unread summary refresh plus
  focus/visibility/online refresh; do not open one socket per conversation.
- Subscribe only to the selected conversation. Reconnect with bounded backoff and
  jitter, mint a fresh subscribe capability, and refetch D1 on reconnect.

## 6. Data, API, And Security Contract

### 6.1 Additive migration

Recheck the migration tail before execution. The expected file is
`migrations/0100_user_support_system.sql`; renumber forward if another migration
lands.

#### `support_message_context`

One row for each new in-app user message. Historical, admin, system, and email
messages may have no row unless an explicit trusted path creates one:

```text
message_id TEXT PRIMARY KEY REFERENCES support_messages(id) ON DELETE CASCADE
workspace_id TEXT NULL REFERENCES workspaces(id) ON DELETE SET NULL
project_id TEXT NULL REFERENCES projects(id) ON DELETE SET NULL
estimate_id TEXT NULL REFERENCES estimates(id) ON DELETE SET NULL
route_template TEXT NOT NULL
app_release TEXT NULL
viewport_width INTEGER NULL
viewport_height INTEGER NULL
timezone TEXT NULL
browser_family TEXT NULL
os_family TEXT NULL
diagnostics_shared INTEGER NOT NULL CHECK (diagnostics_shared IN (0,1))
created_at TEXT NOT NULL
```

Text lengths and viewport ranges are constrained. The route template replaces
UUID/opaque dynamic segments before persistence. Optional resource IDs are null
unless they form one server-authorized workspace -> project -> estimate chain.
No raw user agent is stored.

#### `support_user_intake_claims`

One actor-scoped send identity and cross-store lease:

```text
user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
client_message_id TEXT NOT NULL
kind TEXT NOT NULL CHECK (kind IN ('new','reply'))
conversation_id TEXT NOT NULL
message_id TEXT NOT NULL UNIQUE
attachment_id TEXT NULL UNIQUE
fingerprint_version INTEGER NOT NULL DEFAULT 1
payload_sha256 TEXT NOT NULL
attachment_sha256 TEXT NULL
attachment_r2_key TEXT NULL
privacy_generation INTEGER NOT NULL CHECK (privacy_generation >= 0)
state TEXT NOT NULL CHECK (state IN ('reserved','committed','cleanup_fenced','abandoned'))
lease_token TEXT NULL
lease_expires_at TEXT NULL
cleanup_not_before TEXT NULL
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
PRIMARY KEY (user_id, client_message_id)
```

- Claims precede canonical rows, so conversation/message/attachment IDs are not
  premature foreign keys.
- `client_message_id` is a UUID for user intake.
- State checks require a token/expiry only while `reserved`, a non-null
  `cleanup_not_before` only while `cleanup_fenced`, and no live lease while
  `committed` or `abandoned`.
- Fingerprint v1 covers actor, kind, reply target, normalized message, route
  template, optional diagnostics, and the source screenshot byte digest.
- Add a unique partial index on non-null claim R2 keys.
- Add `UNIQUE(r2_key)` to `support_message_attachments`.
- Add a defensive unique partial index on
  `(author_user_id, client_message_id)` where sender is user, transport is
  in-app, and both values are non-null. Preflight duplicates and fail visibly.
- A committed claim and attachment are one immutable lineage, not competing
  owners: claim proves the intent; attachment is the authorized readable record.

#### Support quota dedupe

Add nullable `dedupe_hash` to `security_rate_limit_events` plus a unique partial
index on `(scope, key_hash, dedupe_hash)` when non-null. Extend the existing
durable limiter with insert-or-ignore accounting. Support create/reply supplies
`SHA-256(client_message_id)` as the dedupe value to both the combined message
scope and screenshot scope, so concurrent/lost-response retries count once while
distinct attempts still consume quota. Do not store the raw client ID in rate
metadata.

#### `support_subject_privacy_fences`

```text
user_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE
generation INTEGER NOT NULL DEFAULT 0 CHECK (generation >= 0)
state TEXT NOT NULL CHECK (state IN ('open','exporting','erasing'))
privacy_request_id TEXT NULL REFERENCES privacy_requests(id) ON DELETE SET NULL
updated_at TEXT NOT NULL
```

Every support writer reads the current subject generation and SQL-gates its final
D1 mutation on the same generation with `state='open'`. Export/erasure start and
finish each increment generation. This rejects pre-fence work even if it reaches
commit after the privacy operation has reopened support; new post-completion work
reads the new open generation and may proceed. User intake claims persist the
generation they observed. A shared insert-or-ignore-then-read helper creates the
initial `{generation:0,state:'open'}` row; writers never treat a missing/failed
fence read as permission.

#### `support_privacy_exports`

```text
privacy_request_id TEXT PRIMARY KEY REFERENCES privacy_requests(id) ON DELETE RESTRICT
user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
status TEXT NOT NULL CHECK (status IN ('ready','deleted'))
r2_key TEXT NULL UNIQUE
sha256 TEXT NULL
size_bytes INTEGER NULL CHECK (size_bytes IS NULL OR size_bytes >= 0)
created_at TEXT NOT NULL
expires_at TEXT NOT NULL
downloaded_at TEXT NULL
deleted_at TEXT NULL
```

`ready` requires key/hash/size and `deleted` requires a null key plus
`deleted_at`. The row contains no export body and becomes a content-free tombstone
after expiry cleanup.

#### `support_legacy_feedback_imports`

```text
feedback_id TEXT PRIMARY KEY REFERENCES beta_feedback_submissions(id) ON DELETE RESTRICT
conversation_id TEXT NOT NULL UNIQUE REFERENCES support_conversations(id) ON DELETE RESTRICT
message_id TEXT NOT NULL UNIQUE REFERENCES support_messages(id) ON DELETE RESTRICT
user_visible_at TEXT NULL
activated_by_message_id TEXT NULL REFERENCES support_messages(id) ON DELETE SET NULL
imported_at TEXT NOT NULL
```

The mapping is the exact-once audit and visibility gate. Legacy source rows stay
read-only and participate in privacy export/erasure.

#### Privacy request execution fields

Extend `privacy_requests` with:

```text
execution_revision INTEGER NOT NULL DEFAULT 0 CHECK (execution_revision >= 0)
subject_verified_at TEXT NULL
subject_verified_by TEXT NULL REFERENCES profiles(id) ON DELETE SET NULL
subject_verification_method TEXT NULL CHECK (
  subject_verification_method IN ('authenticated_session','admin_verified')
)
execution_started_at TEXT NULL
execution_error_code TEXT NULL
```

The verification fields are all null or all populated. `requester_user_id` is the
only subject identity accepted by support export/erasure. Authenticated intake
derives it from session and records `authenticated_session`; anonymous intake
remains intake-only until an admin verification step binds the subject and records
`admin_verified`. Every execution compare-and-sets `status`,
`execution_revision`, and the verified subject; retries retain a redacted stable
`execution_error_code` and never infer identity from email/name/description.

### 6.2 User API

#### `GET /api/support/conversations`

- authenticated, owner-only, no-store;
- cursorable summaries, last safe preview, stable reference, user-facing status,
  per-row unread and total unread;
- exclude hidden legacy mappings until `user_visible_at` is set;
- omit requester email, routing token, admin triage, raw R2 keys, and unsafe
  metadata.

#### `POST /api/support/conversations`

#### `POST /api/support/conversations/[id]/messages`

- strict same-origin helper in a neutral security module, not an admin-named
  import;
- session actor and current open privacy-fence generation before mutation;
- `readBoundedFormData(request, 4_194_304)` before `formData` parsing;
- multipart content type/boundary, one 2-4,000 character message, UUID client ID,
  pathname-only `sourcePathname`, capped context fields, and no file or one source
  image up to 3 MiB; map the pathname through the server allowlist with the
  constant fallback above;
- use retry-neutral durable rate accounting, combined across create/reply: 5 per
  minute, 20 per hour, 50 per day per user, plus 10 screenshot-bearing sends per
  day; each scope dedupes by the actor/client ID;
- new request and reply share the leased write service; reply owner check occurs
  before claim/object access;
- return `201` for insertion, `200` for committed idempotent recovery, and `202`
  with Retry-After while an identical lease winner is active;
- reply to any status reopens to `open`; admin reply transitions are owned by the
  admin contract, not this user route.

#### `POST /api/support/intake/[clientMessageId]/abandon`

Owner-only and same-origin. It may compare-and-set only a noncommitted claim to
`cleanup_fenced`, clear its lease, and set `cleanup_not_before` to 24 hours after
the fence. It never deletes R2 synchronously. The user may then retry without a
screenshot under a new client ID while the secret-gated cleanup owns the old key.
This is not a post-send attachment delete endpoint.

#### Reads

- `GET /api/support/conversations/[id]/messages`: owner-only cursor/history plus
  message-scoped context and attachment descriptors; reads never mutate unread.
- `POST /api/support/conversations/[id]/read`: owner-only, same-origin, idempotent
  receipt with required `throughMessageId` from the last successfully rendered
  support-authored message. Resolve its `(created_at,id)` server-side and clear the
  boolean only when no later user-relevant message exists. A message arriving
  after render therefore remains unread.
- The admin read action uses the same watermark rule against user-authored/inbound
  messages and never clears unread during the initial server fetch.
- `GET /api/support/attachments/[id]`: owner or platform admin by attachment ->
  message -> conversation join; stream private normalized WebP; no-store,
  `Content-Type: image/webp`, safe inline disposition, `nosniff`, defensive CSP,
  and no R2 key.
- realtime token route issues only `support:subscribe` capability.

### 6.3 Leased write algorithm

1. Verify origin/session, reply ownership, and the current open subject privacy
   generation. Read bounded multipart once; validate message, client ID,
   pathname-only source, optional diagnostics, file count/type/size, and derive
   the allowlisted route template. Do not decode the image yet.
2. Hash source screenshot bytes when present and compute fingerprint v1. Look up
   `(user_id, client_message_id)` before quota accounting. A matching committed
   claim returns canonical `200`; a matching live lease returns `202`; a different
   fingerprint returns conflict. Matching expired `reserved` work may proceed to
   lease takeover without a second quota charge. Fenced/abandoned work requires an
   explicit new client ID.
3. Only when no claim exists, apply both support quota scopes through the new
   insert-or-ignore `dedupe_hash`. A denial writes no claim/object and returns the
   same bounded retry result for repeated use of that client ID. Concurrent
   identical requests count once.
4. Generate stable conversation/message/attachment IDs and private key
   `support-user/<conversationId>/<messageId>/<attachmentId>.webp`. No actor ID,
   client filename, email, or raw client message ID appears in the key.
5. Insert-or-ignore the actor/client claim with fingerprint, observed privacy
   generation, stable IDs/key, and a random lease token/expiry; reread the winner.
   Different fingerprint conflicts. A valid foreign lease returns `202`. Take an
   expired lease only by compare-and-set on state/token/expiry/generation.
6. Only the lease winner decodes and re-encodes through the existing
   provider-aware pipeline. Reject unavailable decoder, invalid/animated-active
   encoding, dimensions above limits, and processed output above 3 MiB. Hash and
   persist the normalized digest separately from the source fingerprint.
7. Only that winner writes normalized bytes to the stable private key. Followers
   never write or delete R2.
8. Use `runRequiredD1Batch` for conversation/message, context, attachment,
   unread/status, and `reserved -> committed`. Every canonical insert/update is
   SQL-gated by `EXISTS` on the same actor/client ID, `reserved` state, live lease
   token, unexpired lease, and unchanged open privacy generation. A transaction
   observes one stable claim; a lost lease/fence therefore produces zero gated
   canonical effects. Remove the support repository's prepare-only D1 type and use
   the shared D1 interfaces. Fail closed when batch is absent.
9. Treat the batch as committed user work only when metadata proves exactly one
   claim transition and every required insert/update count. Zero-effect success is
   a lost-lease/fence result, not an acknowledgement. Reread canonical/claim data
   and return the matching recovery response. Fan out only after a newly committed
   mutation.
10. Never immediately delete a stable key after a failed commit. The expired claim
    remains discoverable.
11. Cleanup first compare-and-sets an expired `reserved -> cleanup_fenced`, clears
    the lease, and sets `cleanup_not_before = now + 24 hours`; explicit abandonment
    uses the same fence. Commit and lease takeover are forbidden from that state.
    At/after `cleanup_not_before`, cleanup rechecks canonical references, deletes
    the exact key, confirms R2 absence, then sets `abandoned`. Failed deletion or
    confirmation stays fenced and retryable. The quiet period prevents a late
    pre-fence R2 write from recreating an object after deletion.

### 6.4 Legacy import

Create one server-only import service plus a same-origin platform-admin endpoint
under `/api/admin/support/legacy-import` with dry-run/apply, cursor, and bounded
batch size. This is the concrete bound-D1 execution surface; a normal Bun script
cannot resolve OpenNext bindings.

- Dry-run returns counts and stable IDs only, never message/email content.
- Import only unmapped rows, validate user/resource references, read the subject's
  open privacy generation, and skip/fail any fenced subject.
- Generate canonical UUIDs and preserve original message/timestamps/page and
  type/severity as explicitly labeled legacy metadata. Legacy severity never
  becomes current priority.
- Map `new`/`reviewing` to `open`, resolved/archived accordingly.
- Insert conversation/message/context and put the mapping last in one required D1
  batch gated on the same open subject generation. Mapping collision must fail the
  batch, then reread the winner; never use an ignore that can leave duplicate
  canonical rows.
- User list/unread excludes the mapping until an admin reply atomically sets
  `user_visible_at` and `activated_by_message_id`.
- Before, during, and after import, Today derives canonical support plus only
  unmapped legacy rows. No feature flag or second deployment is required.
- The endpoint is implemented locally but not invoked against remote D1 by this
  plan.

### 6.5 Action Inbox and admin truth

- Today support action is `Open conversation` to
  `/admin/support?c=<id>&folder=all`.
- Support items do not expose generic Resolve, Dismiss, or Snooze. Canonical
  support status/triage owns those meanings.
- Enforce that boundary in `action-inbox-actions.ts`, not only the component:
  generic resolve/dismiss/snooze rejects `support` and `feedback` source kinds.
  Reconciliation/upsert forces every still-active derived row back to canonical
  `open` or canonical support-triage `snoozed` truth; it never preserves an
  independently resolved/dismissed generic state.
- Selected admin conversation loads by authorized ID even when outside the
  current list/filter/cursor and is pinned into the view.
- Separate display pagination from reconciliation. Upsert active sources in
  pages; resolve with D1 `NOT EXISTS` predicates against canonical status,
  snooze, and unmapped legacy truth. Never treat the first 25/15 source rows as
  the complete active set.
- Temporary legacy attention includes only `new`/`reviewing` rows and opens
  `/workshop/settings/feedback?feedback=<id>` with that authorized record pinned
  and visible until mapped.
- Admin replies, status, labels, self-assignment, snooze, and star remain
  revision-aware. `resolved`/`archived` cannot be written by the generic status
  mutation: one unified required D1 batch must insert a non-empty user-visible
  explanatory admin reply, apply the terminal status/unread transition, activate
  hidden legacy when applicable, and update Today truth, all gated on the subject's
  same open privacy generation. The direct terminal status action rejects
  status-only closure server-side. New priority/multi-admin UI is not part of this
  pack.

### 6.6 Realtime contract

- Add support-specific v2 token audience/capability without breaking other
  collaboration token consumers.
- Browser constructs `new WebSocket(url, ["archestimator.support.v2",
  "archestimator.support.auth.<token>"])`. The DO requires exactly one fixed offer
  and one credential-prefixed offer, validates the subscribe capability before
  admission, and returns `Sec-WebSocket-Protocol: archestimator.support.v2` on the
  `101`. Missing/duplicate/unrecognized offers fail the upgrade. The credential
  must not appear in URLs, the selected response protocol, logs, context, or
  errors.
- Internal fanout uses the existing internal header with a short-lived fanout
  capability and exact system subject.
- DO rejects a subscribe token on POST and a fanout token on socket admission.
- Events are only:
  `{type:'support_message_created', conversationId, messageId}` or
  `{type:'support_conversation_changed', conversationId}`.
- Client-authored WebSocket message bodies remain rejected. Missed invalidation
  is repaired by D1 refetch on reconnect, visibility, focus, online, and bounded
  summary polling.

### 6.7 Privacy and cleanup lifecycle

- Authenticated privacy intake derives `requester_user_id`; anonymous intake does
  not become executable until subject verification binds a user.
- Add platform-admin, same-origin, expected-revision export/erasure execution by
  `privacy_requests.id`.

#### Subject fence and writer coverage

Export/erasure start uses one required batch to compare-and-set the verified
request to `in_progress`, increment the subject fence generation, and set it to
`exporting` or `erasing`. The following paths must read that generation and gate
their final D1 mutation on the same `open` generation:

- user create/reply/read/abandon and attachment access that mutates state;
- admin reply/create/forward/retry, terminal status, triage, draft, and upload for
  a conversation owned by the subject;
- inbound email ingestion after routing identifies the subject conversation;
- legacy feedback import/status/mapping for the subject; and
- any cleanup/reconciliation mutation that could recreate a subject reference.

While fenced, those writers fail closed with a stable non-PII code. Every final
mutation checks generation inside its required batch. Completion increments the
generation again while reopening it, so pre-fence requests cannot commit after
the privacy operation finishes and new requests can use the new generation.

#### Export format, delivery, and retention

An `access` or `portability` execution produces a versioned uncompressed POSIX tar
stream containing `manifest.json` plus user-visible normalized WebP attachments.
Write it directly to private R2 at
`support-privacy-export/<privacyRequestId>/<random>.tar`; never buffer the bundle
or expose source R2 keys. Record SHA-256, byte size, creation, and seven-day expiry
in `support_privacy_exports`.

`GET /api/compliance/privacy-requests/[id]/support-export` streams the artifact
only to the verified authenticated subject or a platform admin, with no-store,
`application/x-tar`, safe attachment disposition, and `nosniff`. The user-facing
privacy request view exposes the download during retention. If the verified
subject cannot sign in, a platform admin may download for delivery through the
separately verified request channel; this plan sends no email. Expiry deletion is
idempotent and the D1 row remains as a content-free audit tombstone.

#### Table and object matrix

| Surface | Export handling | Erasure handling |
| --- | --- | --- |
| `support_conversations` and triage | stable reference, status, channel, user-visible subject, timestamps, labels/snooze | redact requester identity/subject; clear user-specific triage while retaining content-free operational IDs/timestamps |
| `support_messages` and `support_message_context` | user-visible chronology, plain/sanitized reply content, timestamps, disclosed context | replace bodies with erasure marker; null HTML/address/provider identifiers/warnings; delete context rows |
| `support_message_attachments` and committed R2 | safe metadata plus normalized WebP files in tar | delete R2, confirm absence, then delete attachment rows/update counts |
| `support_drafts` and draft R2 | internal drafts excluded from subject bundle but counted in manifest | delete draft objects first, confirm absence, then delete draft rows |
| `support_user_intake_claims` and noncommitted R2 | content-free idempotency summary only | fence, wait quiet period, delete/confirm objects, then delete claims |
| legacy feedback, status events, and mappings | legacy message, timestamp, route template, and labeled legacy classifications | redact email/message/path and identity metadata; keep content-free mapping/status tombstones |
| support-derived `admin_action_items` | excluded as derived admin state | resolve and redact title/detail/source linkage that carries subject content |
| support-scoped rate events | excluded as security metadata | delete events for the subject's derived support key hashes |
| privacy request, subject fence, export row | request/execution/retention metadata | retain minimum compliance/audit metadata without support content or object key after expiry |

#### Completion and cleanup

- Export keeps the fence until D1 rows and authorized R2 bytes have been streamed,
  the tar hash/size are recorded, a second enumeration matches the manifest, and
  the request completion plus fence reopen commit together.
- Erasure fences all noncommitted claims and waits for `cleanup_not_before`; it
  enumerates all matrix rows/keys, deletes R2 idempotently, confirms absence,
  applies the D1 redaction/deletion batch, then re-enumerates both D1 and R2 to
  zero unredacted/owned content. Only that proof may complete the request and
  reopen the incremented fence.
- Any failure keeps the request `in_progress`, the subject fence active, partial
  export objects private, and a redacted retry code. Never claim completion with
  bytes, unredacted rows, or an unmatched manifest remaining.
- Integrate stale-claim and expired-export reconciliation into the existing
  bearer-secret/jobs-enabled `/api/internal/upload-cleanup` route. Preserve its
  real contract: direct HTTP invocation is dry-run only with `dryRun=1|true` and
  otherwise applies only when `UPLOAD_JOBS_ENABLED=1`; the scheduled caller is
  dry-run unless both `UPLOAD_JOBS_ENABLED=1` and
  `CLOUDFLARE_UPLOAD_JOBS_DRY_RUN=0`. Do not add an ungated route, invert these
  defaults, or add a standalone destructive script.
- Account deletion remains the existing soft-retain lifecycle and does not claim
  privacy erasure. Product copy must distinguish account closure from a verified
  privacy erasure request.

### 6.8 Threat controls

| Threat | Required control |
| --- | --- |
| Cross-user thread/image access | Session actor; owner join on every user access; platform-admin gate; unauthorized IDs return 404. |
| CSRF | strict neutral same-origin helper on every mutation; no GET mutation. |
| Forged context | pathname-only client hint; ordered server route matcher/constant fallback; coherent resource ownership; client diagnostics untrusted. |
| Oversized/decompression image | pre-parse 4 MiB body bound; 3 MiB source/output; fail-closed decode; 24 MP/4,096 edge; static WebP re-encode. |
| Upload/storage abuse | exact retry-neutral durable windows plus screenshot daily limit before decode/claim write. |
| Duplicate or lost-response send | claim recovery before quota, deduped rate event, actor/client fingerprint, leased winner, required D1 batch, 200 recovery. |
| R2 delete/commit race | lease-conditioned commit; no immediate delete; cleanup fence plus 24-hour quiet period before confirmed deletion. |
| Token replay/amplification | separate capabilities/system subject, exact fixed/credential protocol negotiation, short TTL, identifier-only events. |
| Sensitive diagnostics | required route template only; optional group consent; prohibited-field allowlist; no raw UA/query/storage/DOM. |
| Active content/XSS | user message plain text; image decode/re-encode; no SVG/HTML; nosniff/CSP/private delivery. |
| Truncated reconciliation | source-truth `NOT EXISTS`, not display arrays. |
| Unread arrival race | explicit `throughMessageId`; server resolves `(created_at,id)` and refuses to clear when a later relevant message exists. |
| Support lifecycle divergence | generic derived-item mutations reject support/feedback; active upsert restores source truth; terminal close requires reply batch. |
| Wrong-subject privacy action | verified server-derived requester user ID and admin revision gate. |
| Export/erasure race | per-subject generation gates every writer; private export manifest or delete/re-enumeration proves quiescence; completion/reopen last. |
| Legacy surprise/duplication | exact mapping, batch collision rollback, hidden-until-reply user visibility, unmapped-only fallback. |
| Log leakage | operation/code/correlation only; no message, email, query, token, UA, filename, R2 key, or SQL binds. |

## 7. Execution Units

### UNIT-001: recover admin support and exact attention routing

- **Status/dependencies:** `VERIFIED`; none.
- **Goal:** restore mailbox reads and make every current action open/reconcile the
  right source before feature expansion.
- **Owned paths:**
  `src/lib/repositories/support-conversations-d1.ts`,
  `src/lib/repositories/support-drafts-d1.ts`,
  `src/lib/admin/action-inbox-repository.ts`,
  `src/lib/admin/support-attention-repository.ts`,
  `src/lib/admin/feedback-attention-repository.ts`,
  `src/components/admin/AdminActionInbox.tsx`, selected-load code in
  `src/app/admin/support/page.tsx`/admin conversation API, and exact legacy
  selection in `src/app/workshop/settings/feedback/page.tsx`.
- **Boundary:** fix the reserved alias; preserve the shared draft insert-or-read
  repair; render safe internal hrefs; refresh href on conflict; make support Open
  only in UI and server actions; force active derived rows back to canonical
  status/snooze truth; filter legacy attention by active status; replace
  bounded-ID closure with source-truth reconciliation; load selected
  support/legacy IDs independently.
- **Evidence:** exact empty/populated SQL and query predicates are valid; a source
  count beyond old 25/15 caps is not falsely resolved; stale generic href repairs;
  selected off-page support and feedback IDs resolve; scoped diff preserves
  concurrent admin work.
- **Recovery/stop:** no schema change. Revert this unit alone if needed. Stop when
  AC-001 and the immediate admin portion of AC-008 are source-proven.
- **Implemented evidence (2026-07-22):** mailbox counts use `all_count`; Today
  uses source-complete D1 upserts for every active support/high-severity legacy
  source, derives exact internal links and canonical lifecycle, and denies
  generic source-owned mutations server-side; selected support and legacy
  feedback rows load independently of display caps. Scoped ESLint,
  `git diff --check`, and `bun run type-check` completed successfully. Product
  tests, builds, browser automation, screenshots, and visual QA were not run.

### UNIT-002: establish secure canonical intake and server contracts

- **Status/dependencies:** `VERIFIED after verified UNIT-001`.
- **Goal:** deliver the additive schema, leased D1/R2 intake, safe context,
  owner APIs, import execution surface, and capability-scoped realtime.
- **Owned paths:** next migration; support repository/shared D1 types;
  `src/lib/http/read-bounded-body.ts` for reuse only;
  focused new modules under `src/lib/support/`;
  user support routes including read/abandon/attachment/token;
  `src/lib/uploads/server-image-processing.ts` only for a focused single-output
  extension; `src/lib/security/durable-rate-limits.ts` and
  `src/lib/security/durable-rate-limit-d1.ts` for deduped accounting;
  `src/lib/collaboration/realtime-room-token.ts`,
  `src/lib/cloudflare/support-inbox.ts`, and
  `src/lib/cloudflare/support-inbox-fanout.ts`; admin legacy-import
  endpoint/service.
- **Boundary:** implement sections 6.1-6.6 exactly; no UI cutover, remote import,
  new binding, public object path, or sequential substitute for required batch.
- **Evidence:** clean local migration replay; expected tables/columns/indexes;
  `PRAGMA foreign_key_check` empty; duplicate preflight explicit; source trace
  proves bound body -> fingerprint/claim recovery -> deduped rate -> lease ->
  decode -> R2 -> generation-gated required batch -> D1 read -> optional fanout;
  read receipts use rendered-message watermarks; fixed/credential subprotocol
  negotiation and token capabilities reject cross-use; dry-run import emits
  bounded non-PII counts.
- **Recovery/stop:** schema is additive and unused until UI cutover. Fix forward
  after migration apply. Stop when AC-002/004/005/007 server invariants are ready.
- **Implemented evidence (2026-07-22):** migration `0100` replays cleanly on an
  isolated local D1 with expected schema/index readback and an empty
  `PRAGMA foreign_key_check`; leased bounded multipart intake, normalized private
  screenshots, owner reads, watermark receipts, abandonment fencing, exact-once
  legacy import, and capability-separated realtime are implemented. Scoped
  ESLint and `git diff --check` pass. Repository type-check reports only
  unrelated concurrent diagnostics in admin user actions and the workspace
  repository; no UNIT-002-owned diagnostic remains. Product tests, builds,
  browser automation, screenshots, remote import, deployment, and provider
  mutation were not run.

### UNIT-003: replace feedback and build the user Support Center

- **Status/dependencies:** `VERIFIED after UNIT-002`.
- **Goal:** replace both user feedback surfaces with one accessible Support
  Center over the UNIT-002 contracts.
- **Owned paths:** `WorkshopFeedbackModal.tsx`, `WorkshopShell.tsx`,
  `/workshop/feedback`, settings support entry, `SupportChatWidget*`, new focused
  components/hooks under `src/components/support/`, and legacy form removal from
  user-owned components.
- **Boundary:** implement sections 5.1-5.6; one coordinator for modal/full page;
  same new/reply consent and screenshot behavior; unread-owned Support badge;
  no general notification entry, email notification, Tiptap, new package,
  localStorage draft, or duplicate legacy write path.
- **Evidence:** no user type/severity/subject/UUID controls or beta submit import;
  Requests/New/Conversation and lifecycle/recovery matrices are represented in
  source; owner DTOs exclude admin/private fields; object URLs, sockets, timers,
  focus, Back, and unread read-after-render behavior have explicit cleanup.
- **Recovery/stop:** old and new user writers may not remain active together.
  Stop when AC-003/006 and the user side of AC-007 are source-complete.
- **Implemented evidence (2026-07-22):** one coordinator now owns the overlay and
  full-page Support Center; the shared composer covers message-only new/reply,
  disclosed diagnostics, optional screenshot pick/paste/drop, exact retry and
  fenced replacement, unread/read-watermark recovery, focus/Back behavior, and
  fixed/credential realtime. Scoped ESLint and diff checks pass, owned type
  diagnostics are empty, and independent review has no blocking finding.

### UNIT-004: converge admin Support, Today, and legacy history

- **Status/dependencies:** `VERIFIED after UNIT-002`.
- **Goal:** show each canonical/imported report once with message-scoped evidence
  and coherent founder actions.
- **Owned paths:** admin Support page/coordinator/components/APIs/actions;
  `action-inbox-repository.ts` after UNIT-001; support/feedback attention;
  legacy review route; UNIT-002 import endpoint/service use.
- **Boundary:** pin exact deep links; render screenshots and Included details on
  owning message cards; preserve existing labels/status/snooze/star/self-assign;
  admin reply defaults pending and activates hidden legacy; terminal closure is
  one explanatory-reply batch and status-only terminal mutation is rejected;
  canonical plus unmapped-only attention; admin read uses a rendered-message
  watermark; no new priority/assignment abstraction; do not invoke remote import.
- **Evidence:** new and imported local fixtures appear once in Support and at most
  once in Today; old review links canonical; rerun import dedupes; hidden legacy
  stays out of user list until reply; no-data, mailbox, attachment, and realtime
  degraded states remain usable.
- **Recovery/stop:** unmapped fallback remains safe if import pauses. Stop when
  AC-002/008 and admin AC-007 behavior are source-complete.
- **Implemented evidence (2026-07-22):** exact deep links, canonical plus
  unmapped Today truth, message-owned evidence, rendered-watermark reads, and
  hidden-legacy activation are implemented. Admin reply now stages delivery,
  persists provider acceptance, and then finalizes message/lifecycle/Today in a
  generation-gated required batch whose stale lifecycle guard keeps later work
  open and unread. Scoped ESLint and diff checks pass, owned type diagnostics
  are empty, and independent review has no blocking finding.

### UNIT-005: finish privacy, cleanup, observability, and cutover

- **Status/dependencies:** `VERIFIED after verified UNIT-003 and UNIT-004`.
- **Goal:** remove the duplicate writer and close object/data lifecycle through
  executable verified privacy and final local evidence.
- **Owned paths:** `src/app/api/compliance/privacy-requests/route.ts`,
  `src/lib/compliance/privacy-request-repository.ts`, the admin fulfillment
  surface, support privacy helpers, existing internal upload-cleanup integration;
  focused support observability; beta feedback actions/store exports needed for
  read-only history; privacy/support copy and operator-facing local documentation.
- **Boundary:** implement section 6.7 and its table/object matrix; remove
  authenticated legacy submissions; retain legacy read/import evidence; redacted
  operation events; distinguish soft account closure from verified erasure;
  preserve the cleanup route/scheduler's existing apply semantics; no hosted
  release recipe or claim.
- **Evidence:** verified-subject and generation gates cover every subject writer;
  export tar/delivery/expiry is private and bounded; R2 deletion and zero
  re-enumeration precede D1 redaction/completion; retry leaves in-progress;
  direct cleanup apply versus scheduled dry-run policy is source-proven; no legacy
  user writer remains; final requirement/risk/dependency/diff audit is clean.
- **Recovery/stop:** never complete partial privacy work. Stop when AC-009 and all
  preceding criteria have fresh local/static evidence and only release remains.
- **Implemented evidence (2026-07-22):** exclusive privacy execution, subject
  generation fences, bounded private tar export, registry-backed R2 ownership,
  R2-first erasure with D1 redaction and re-enumeration, cleanup, legacy writer
  removal, and distinct account-closure copy are implemented. Local migration
  replay, hostile HTTP probes, isolated D1 race/lifecycle scenarios, scoped
  static checks, owned diagnostics, and independent review pass. Browser visual
  proof is unavailable and release remains `NOT_EVALUATED`.

### Dependency graph and ownership

```text
UNIT-001 -> UNIT-002 -> UNIT-003 --\
                       \-> UNIT-004 ---> UNIT-005
```

- Ready slice: none; every unit is verified.
- One lead/integrator owns the plan and final claim.
- One writer at a time for `support-conversations-d1.ts`, support user APIs,
  `action-inbox-repository.ts`, `AdminSupportInbox.tsx`, and the Support Center
  coordinator.
- UNIT-003 and UNIT-004 may run in parallel only after UNIT-002 and only while
  their owned files remain disjoint.
- Single-agent fallback: `001, 002, 003, 004, 005`.

## 8. Acceptance And Evidence

- **AC-001:** mailbox list/count SQL works for empty/populated data; shared draft
  insert-or-read remains; Today exposes exact Open; off-page deep link loads;
  more sources than display caps do not cause false resolution.
- **AC-002:** every new user report writes only one canonical message; legacy
  mapping/import is exact-once and rerunnable; hidden legacy is admin-visible but
  absent from user Requests until admin reply activation.
- **AC-003:** message is the only required input; screenshot is optional with
  pick/paste/drop/preview/remove; no type/severity/subject/manual IDs; both new
  and reply expose the same Included details choice.
- **AC-004:** server derives actor, maps pathname-only input through an allowlisted
  route-template matcher with constant fallback, validates coherent optional
  resources, enforces origin/generation/retry-neutral rate limits, and
  persists/exposes none of the prohibited context or credentials.
- **AC-005:** bounded request and one normalized <=3 MiB WebP obey pixel/edge
  limits; lease winner alone writes/commits; followers do not delete; cleanup
  fence prevents missing-object commits; owner/admin reads are private.
- **AC-006:** Support badge opens unread correctly; rendered-message watermarks do
  not clear later arrivals; Requests/New/Conversation, lifecycle labels, host
  breakpoints, focus, Back, attachments, and every recovery row are coherent in
  wide/narrow source contracts.
- **AC-007:** all durable message/status/unread changes precede capability-scoped
  identifier-only invalidation; fixed/credential protocol negotiation succeeds;
  subscribe/fanout tokens cannot cross-use; D1 success remains success on fanout
  failure; backfill recovers.
- **AC-008:** each report appears once in admin Support and while active in Today;
  selected deep link is exact; evidence is message-scoped; generic Today support
  mutations fail server-side; terminal closure requires an explanatory reply;
  reconciliation forces source truth.
- **AC-009:** only verified subjects can execute export/erasure; every subject
  writer is generation-fenced; private seven-day tar export and delivery are
  defined; matrix R2/D1 proof precedes completion; cleanup semantics, logs, legacy
  cutover, and docs are safe; release remains `NOT_EVALUATED`.

### Static/local evidence plan

Product tests remain `NOT_REQUIRED` for this plan. During implementation, use the
smallest decisive source/static check after each edit. Do not retain ceremonial
per-unit receipts or repeat broad gates solely because a document boundary moved.

Run once at the relevant boundary:

1. After UNIT-002 migration work:
   `bunx wrangler d1 migrations apply ARCH_DB --local --config wrangler.jsonc`
   and a local D1 query for expected schema plus `PRAGMA foreign_key_check`.
2. Final local closeout:
   `bun run type-check`, scoped `bun run lint -- <changed paths>`,
   `bun run validate:error-handling`, targeted `rg` audits for legacy writes,
   query-token transport, raw R2 keys, prohibited context, and new dependencies,
   then `git diff --check` and a scoped diff review.
3. Pack closeout:
   `bun run validate:plan-pack -- .ai/03_plans/2026-07-22/User-Support-System`.

If a future current task explicitly authorizes `TEST_TASK`, prioritize:

- leased concurrent retry, retry-neutral quota, lost response, cleanup fencing,
  and R2 failure;
- cross-user message/context/attachment denial and token capability cross-use;
- action reconciliation above display caps and exact deep links;
- hidden legacy import activation and rerun dedupe;
- read-watermark arrival races and fixed/credential WebSocket negotiation;
- verified privacy export/erasure writer races, delivery, expiry, and failure;
- wide/narrow keyboard, unread, paste/drop, offline, and uncertain-send flows.

No such product test or browser proof ran during plan authoring.

## 9. Risks And Mitigations

| Risk | Mitigation | Units |
| --- | --- | --- |
| Mailbox/action regression | exact SQL, redacted errors, source-truth reconciliation, off-page selected fetch | 001, 004 |
| Duplicate/hidden complaint | one canonical writer, exact mapping, hidden legacy activation, unmapped fallback | 002-005 |
| Retry delete/commit race | lease token/expiry, follower no-write, cleanup fence, 24-hour quiet period, confirmed deletion | 002, 005 |
| Body/image resource abuse | bounded multipart read, retry-neutral durable windows, fail-closed normalize, pixel/output caps | 002 |
| Cross-user data leak | owner joins, admin gate, 404 denial, minimal DTOs, private R2 | 002-005 |
| Context overcollection | pathname-only ingress, server route matcher/fallback, optional consent, coherent IDs, prohibited allowlist | 002, 003, 005 |
| Realtime replay/amplification | separate capabilities/system subject, fixed/credential negotiation, D1 refetch | 002-004 |
| Status/unread divergence | explicit transitions, server closure boundary, read watermarks, required batch/invalidation | 001-004 |
| Privacy completion with residual data | verified subject, generation fence for every writer, matrix re-enumeration, completion last | 005 |
| Shared-worktree collision | reread dirty shared files, serialized writers, preserve unrelated changes | all |
| Hosted mismatch | local action ceiling and one explicit release boundary only | 005 |

## 10. Final Handoff

1. Recheck shared diffs and migration tail.
2. Execute UNIT-001 before feature expansion.
3. Keep the claim lease, truth-based reconciliation, route template, capability
   split, and privacy write fence as non-negotiable invariants.
4. Keep screenshots core because the user explicitly required them; do not defer
   the secure object lifecycle to create a narrower product.
5. Keep email notification deferred unless a newer user request changes scope.
6. Do not start remote migration/import/deployment from this pack. A separate
   authorized release task must reread current provider limits and prove live
   behavior; `release_status` remains `NOT_EVALUATED` here.
