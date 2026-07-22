# User Support System: Canonical Execution Plan

## Status tuple

`IMPLEMENTATION_READY / NOT_STARTED / NOT_EVALUATED / N/A / ACTIVE`

- **Suite compatibility:** manifest `2026-07-12`.
- **Profile:** high-blast-radius because the work joins authenticated UX, D1,
  private R2 objects, user identity, admin operations, realtime, and privacy
  erasure.
- **Action ceiling:** `IMPLEMENT_LOCAL`. This pack plans repository changes and
  local verification. It does not deploy, apply remote migrations, change DNS,
  enable paid services, or mutate unbound resources.
- **Exact next unit:** `UNIT-001`.
- **Plan-authoring test decision:** `NOT_REQUIRED`. Live rendered audit,
  read-only D1 inspection, redacted local diagnostics, source inspection, and
  the final static Plan Pack validation are the sufficient closeout evidence.
- **Prior-pack relationship:** the completed July 21 admin-support pack remains
  historical context. Current source and live behavior show reliability and
  user-intake gaps that this pack must fix rather than assume complete.

## 1. Task contract

### Objective

Replace the split feedback/support experience with one secure, legible support
system. A signed-in user sends a plain-language message, may attach one
screenshot, and receives a durable private conversation. Archestimator derives
the user and safe operational context, delivers the report to `/admin/support`,
surfaces attention in `/admin/today`, and lets the founder and user continue the
same thread.

### In scope

- global authenticated Support trigger and modal/sheet;
- `/workshop/feedback` as the full Support Center route;
- owner-scoped support list, thread, message, read, and attachment APIs;
- `/admin/support` mailbox, thread, context, attachment, priority, and assignment;
- `/admin/today` support/legacy-feedback attention items and deep links;
- `support_conversations`, `support_messages`, `support_message_attachments`,
  support triage, new message-context and legacy-import records;
- current `ARCH_DB`, `ARCH_UPLOADS_R2`, `SUPPORT_INBOX`, `EMAIL`, and existing
  security-rate-limit data;
- idempotency, realtime invalidation, unread state, privacy export/erase, R2
  cleanup, safe diagnostics, and operational logging;
- additive import of existing `beta_feedback_submissions` into canonical support.

### Non-goals

- AI classification, suggested replies, bots, SLAs, macros, or help-center CMS;
- public/anonymous support intake;
- voice/video, typing indicators, presence, or collaborative admin collision UI;
- automatic screenshot capture, DOM serialization, session replay, or hidden
  collection of form/estimate/client content;
- files larger than 3 MiB, multiple user attachments, or non-image user files;
- a third-party helpdesk, new runtime package, new Cloudflare binding, new queue,
  R2 S3 credentials, or paid scanning service;
- desktop/OS notifications or email notifications for in-app replies in MVP;
- destructive deletion of legacy feedback tables during this pack;
- deployment or hosted release certification.

### Constraints

- Current source and `wrangler.jsonc` are authoritative.
- Next 16 Server Components keep auth and data access server-side; the client
  boundary owns only browser events, object URLs, paste/drop, local form state,
  TanStack Query, and WebSocket lifecycle.
- D1 is the durable ledger. R2 stores private screenshot bytes. The Durable
  Object broadcasts identifier-only invalidations after commit.
- User identity is always server-derived. Resource IDs from the browser are
  hints until server ownership checks succeed.
- Never record raw query strings, route tokens, cookies, authorization headers,
  local/session storage, clipboard text, DOM/form contents, request bodies,
  client/project names, estimate descriptions, quantities, rates, or totals.
- Preserve unfamiliar worktree edits and reread shared files immediately before
  implementation.

### Completion and stop condition

Stop only when one authenticated user can submit a message from any workshop
page, optionally with a valid screenshot; the resulting canonical conversation
is visible and openable in both admin attention and support surfaces; the user
can read and continue the same thread; context and objects obey owner/admin and
privacy boundaries; legacy feedback appears once in canonical Support; and no
safe in-scope gap, duplicate write path, or stale action semantics remains.

## 2. Confirmed current state

### 2.1 Live rendered audit

`UX-AUDIT.md` contains the screenshots and full findings.

| Surface | Confirmed state | Consequence |
| --- | --- | --- |
| `/admin/today` | Legacy blocker feedback is visible, but only Snooze, Resolve, and Dismiss are rendered. | The founder cannot open or understand the complaint. |
| `/admin/support` | The live route displays `Support conversations could not be read.` | Canonical support is operationally unavailable. |
| Global feedback modal | Type, Severity, Project UUID, and Message are required/presented. | Users are asked to perform internal triage and manual context entry. |
| `/workshop/feedback` | A basic support chat and a separate beta-feedback form coexist. | One user intent is split across two ledgers and admin workflows. |

### 2.2 Exact admin mailbox root cause

- Bound D1 migration state is current through the repository tail.
- Read-only bound D1 inspection confirmed support and triage tables exist, the
  support ledger currently has zero conversations/messages, and the legacy
  beta-feedback table has one row.
- Replaying the current count SQL fails with `near "all": syntax error` because
  `listSupportMailbox` emits `COUNT(*) AS all` without quoting the reserved alias.
- Because list and counts run in `Promise.all`, the count failure returns the
  generic mailbox error even when the conversation list itself is valid.

### 2.3 Exact Action Inbox gap

- `AdminActionItemRow` includes `href`, and source derivation persists it.
- `AdminActionInbox` never renders or navigates `item.href`.
- Support items use generic `/admin/support`; feedback items use `/admin`.
- The source upsert does not update `href` or priority on conflict, so existing
  rows would remain stale after a code correction unless the conflict clause is
  fixed.
- Support-derived Resolve/Dismiss can disagree with the canonical conversation.

### 2.4 Draft reliability incident and concurrent repair

- `support_drafts` correctly enforces `UNIQUE(admin_user_id, scope_key)`.
- Redacted local diagnostics captured a unique-constraint error on
  `POST /api/admin/support/drafts` when initial operations overlapped.
- The current shared worktree now changes the insert to `INSERT OR IGNORE` and
  reads the authoritative row by `(admin_user_id, scope_key)`. This is a
  concurrent fix, not this plan author's product implementation.
- UNIT-001 must preserve, statically verify, and integrate that repair. It must
  not overwrite the shared edit with the stale select-then-insert design.

### 2.5 Existing assets to preserve

- D1 conversation/message ledger, owner checks, client message idempotency,
  unread flags, email correlation, message attachments, triage, and drafts.
- Owner/admin short-lived realtime token policy and per-conversation hibernating
  `SUPPORT_INBOX` Durable Object.
- User/admin TanStack Query clients and identifier-only invalidation shape.
- Private R2 attachment patterns and authenticated admin attachment route.
- Repository Dialog, Modal, Sheet, controls, file upload pattern, toast, badges,
  message cards, and Phosphor icons.
- Existing privacy support-data export/erase entry points, which require
  extension rather than replacement.

## 3. Accepted requirements

| ID | Role | Requirement | Units | Criterion |
| --- | --- | --- | --- | --- |
| OPS-001 | CORE | Restore admin support reads, preserve/verify the concurrent atomic draft repair, and make every support attention item open its exact canonical record. | 001 | AC-001 |
| DATA-001 | CORE | Make `support_conversations` and `support_messages` the only new user complaint/feedback ledger and import every legacy beta-feedback row exactly once. | 002, 006, 007 | AC-002 |
| UX-001 | CORE | Replace Type, Severity, Project UUID, and Subject with one required message, one optional screenshot, disclosed included details, and one send action. | 003, 004 | AC-003 |
| SEC-001 | CORE | Derive actor identity server-side, sanitize route/context, validate resource ownership, apply same-origin/rate-limit checks, and expose minimal DTOs. | 002, 003, 007 | AC-004 |
| SEC-002 | CORE | Store one validated image screenshot privately in R2 with idempotent D1 ownership, authorized preview/download, cleanup, and no hosted body-limit mismatch. | 002, 003, 007 | AC-005 |
| UX-002 | CORE | Give users a private Support Center with request list, statuses, unread badge, conversation history, replies, retries, and responsive/accessibility states. | 004, 005 | AC-006 |
| DATA-002 | CORE | Persist message/unread/status changes before DO fanout; realtime failure cannot lose or falsely acknowledge a message. | 002, 003, 005, 006 | AC-007 |
| UX-003 | CORE | Show every new report, screenshot, safe context, priority, assignment, and conversation state coherently in `/admin/support` and `/admin/today`. | 001, 006 | AC-008 |
| PERF-001 | CORE | Add no runtime dependency, keep heavy admin Tiptap out of user support, preserve small client boundaries, and avoid unmeasured virtualization/poll storms. | 004, 005, 006 | AC-009 |
| OPS-002 | CORE | Extend privacy export/erase, redacted observability, orphan repair, legacy cutover, documentation, and release-readiness evidence. | 007 | AC-010 |

## 4. Planning principles and drivers

### Principles

1. One user intent maps to one durable support domain.
2. Users explain impact; operators classify and prioritize it.
3. Persist first, signal second, and reconcile from D1.
4. Collect only diagnosis data that is safe, disclosed, and useful.
5. Prefer current repository primitives and deletion of duplicate paths.

### Top decision drivers

1. **Trust and continuity:** no complaint can disappear between Feedback, Today,
   Support, or the user's inbox.
2. **Privacy and authorization:** screenshots and context can expose sensitive
   project information, so ownership and minimization are first-class.
3. **Speed to first reliable version:** existing D1/R2/DO/UI primitives cover the
   need; new packages and provider resources would delay the pipeline.

## 5. Considered architecture options

### Option A: keep feedback and support as parallel products

- **Pros:** smallest immediate code edit; old review queue remains untouched.
- **Cons:** preserves duplicate forms, stores, attention semantics, and user
  confusion; a feedback item still is not a conversation; follow-up fragments.
- **Decision:** rejected.

### Option B: canonical support ledger with additive legacy import

- **Pros:** one durable thread, one admin inbox, one user history, existing
  realtime/unread/attachment infrastructure, non-destructive audit retention.
- **Cons:** requires a context table, user attachment boundary, idempotent import,
  and coordinated cutover of old entry points.
- **Decision:** selected.

### Option C: destructive immediate rewrite/drop of beta feedback

- **Pros:** removes old tables and code fastest after migration.
- **Cons:** unnecessary data risk, harder rollback/audit, no value over a
  read-only retained source during alpha.
- **Decision:** rejected.

## 6. Architecture decision record

### ADR: canonical support conversation for all new feedback

- **Decision:** every new authenticated complaint, question, feature request, or
  feedback message creates or appends to a canonical support conversation.
- **Drivers:** trust, follow-up continuity, D1/R2/DO reuse, admin coherence, and
  user inbox requirements.
- **Alternatives:** parallel feedback queue; destructive legacy rewrite.
- **Why selected:** it deletes duplicate product behavior while preserving
  historical evidence and reusing the strongest implemented substrate.
- **Consequences:** `BetaFeedbackForm` and its user-facing actions are removed
  after the new path is proven; legacy tables become read-only but still
  participate in privacy export/erasure; Action Inbox derives only unmapped
  legacy feedback and naturally converges to support as imports complete.
- **Follow-ups:** an explicit later data-retention decision may remove legacy
  tables after the audit window; email/OS notifications remain separate product
  decisions.

## 7. Resolved implementation decisions

- **DEC-AUTO-001: canonical ledger.** All new user reports write only to support
  conversations/messages. Legacy feedback is imported idempotently, retained
  read-only until a later deletion decision, and redacted by privacy erasure.
- **DEC-AUTO-002: message-first intake.** User supplies only message and optional
  screenshot. No user Type, Severity, Subject, or manual resource UUID. Internal
  priority and classification live in admin triage.
- **DEC-AUTO-003: disclosed context tiers.** Required envelope: server-derived
  user, message/conversation IDs, timestamp, and sanitized pathname. Optional
  diagnostics, enabled by default but visible/removable: validated resource IDs,
  viewport, timezone, normalized browser/OS, and app release if available.
- **DEC-AUTO-004: no new runtime package.** Reuse repository-owned Dialog/Sheet,
  controls, upload patterns, TanStack Query, native WebSocket, and toast. Keep
  Tiptap admin-only.
- **DEC-AUTO-005: small-file Worker relay.** One PNG/JPEG/WebP screenshot up to
  3 MiB per user message, private R2, no presigned upload and no new credential.
- **DEC-AUTO-006: D1-authoritative realtime.** D1 write and unread/status update
  complete before identifier-only DO fanout. Missed fanout triggers refetch, not
  message loss.

## 8. Target product design

### 8.1 Global Support entry

- Preserve the footer lifebuoy but label it `Support`, not only `Send feedback`.
- Add a D1-derived unread reply badge.
- Open a responsive Support Center composition. Default to `New request` when
  launched globally; preserve `Requests` and `Conversation` navigation.
- Keep `/workshop/feedback` as the full-page Support Center destination to avoid
  a route migration that adds no user value. Retitle content to `Support`.

### 8.2 New request flow

1. Autofocus `How can we help?`.
2. Accept 2 to 4,000 characters. Do not ask for a subject.
3. Accept one optional screenshot via file picker, paste, or drop.
4. Show object-URL preview, normalized filename, size, Remove, and a reminder to
   exclude confidential client information.
5. Show `Included details` as a compact disclosure with required and optional
   fields. Optional details can be removed before send.
6. Submit once with a stable client message ID.
7. On success, show the created conversation, reference, and `Received` state.

### 8.3 User inbox

- `Requests` list rows show user-facing status, last preview, updated time,
  unread badge, and short stable reference.
- Map internal status:
  - open: `Received` for a new request, then `Waiting for support`;
  - pending: `Waiting on you`;
  - resolved: `Resolved`;
  - archived: `Closed`.
- Conversation is chronological, text-safe, and attachment-aware.
- Opening history marks read only after it renders.
- A user reply to resolved/archived reopens the thread and restores admin
  attention instead of silently appending to a closed item.

### 8.4 Admin support

- Deep links load the selected conversation by ID even if it is outside the
  current page or folder result.
- Thread header includes requester, status, internal priority, assignee, labels,
  age, channel, and stable reference.
- Context panel contains only sanitized path, validated resource links, optional
  technical context, and screenshot preview.
- Add `normal`, `high`, and `urgent` triage priority. Existing user-selected
  legacy severity is preserved as legacy metadata but never trusted as current
  operator priority.
- Assignment accepts any current platform admin using the repository's complete
  platform-admin predicate, including the configured email allowlist rule, not a
  role string alone.

### 8.5 Today Action Inbox

- Primary action for support is `Open conversation`.
- Support href is `/admin/support?c=<conversationId>&folder=all`.
- Support Resolve, Dismiss, and generic Action Inbox Snooze controls are removed.
  Resolution and snooze happen only in canonical support triage/thread state.
- When a qualifying support source reappears after expiry/reopen, reconciliation
  must reopen its derived action row even if older code left that row resolved or
  dismissed.
- Legacy attention queries only rows without a
  `support_legacy_feedback_imports` mapping. The source naturally disappears as
  import succeeds, with no second deployment or flag.

### 8.6 Interaction and accessibility states

- Explicit loading, empty, uploading, sending, offline, reconnecting, degraded,
  retry, idempotently recovered, upload-rejected, and stale-list states.
- Existing Dialog/Sheet handles focus trap, Escape, inert background, title,
  description, and focus return.
- File input remains keyboard-accessible; paste/drop are enhancements.
- Progress uses `aria-live="polite"`; terminal send failure uses alert semantics.
- Status and priority are never conveyed by color alone.
- Narrow layout is one pane at a time with a visible Back control and no
  horizontal scrolling.

## 9. Data model and migration

Recheck the migration tail immediately before execution. The expected next file
is `migrations/0100_user_support_system.sql`, but the executor must renumber
forward if another migration lands.

### 9.1 `support_message_context`

One optional row per support message:

```text
message_id TEXT PRIMARY KEY REFERENCES support_messages(id) ON DELETE CASCADE
workspace_id TEXT NULL REFERENCES workspaces(id) ON DELETE SET NULL
project_id TEXT NULL REFERENCES projects(id) ON DELETE SET NULL
estimate_id TEXT NULL REFERENCES estimates(id) ON DELETE SET NULL
route_path TEXT NOT NULL
app_release TEXT NULL
viewport_width INTEGER NULL
viewport_height INTEGER NULL
timezone TEXT NULL
browser_family TEXT NULL
os_family TEXT NULL
diagnostics_shared INTEGER NOT NULL CHECK (diagnostics_shared IN (0,1))
created_at TEXT NOT NULL
```

Constraints cap text lengths and sane viewport ranges. No raw user agent is
stored. The server normalizes browser/OS or stores `unknown`. Resource context
must form one coherent chain: the workspace is accessible to the actor, the
project belongs to that workspace, and the estimate belongs to that project.
Independently accessible but unrelated IDs are rejected rather than mixed.

### 9.2 `support_user_intake_claims`

Reserve one actor-scoped idempotency identity before any R2 write:

```text
user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
client_message_id TEXT NOT NULL
kind TEXT NOT NULL CHECK (kind IN ('new','reply'))
conversation_id TEXT NOT NULL
message_id TEXT NOT NULL UNIQUE
payload_sha256 TEXT NOT NULL
attachment_sha256 TEXT NULL
attachment_r2_key TEXT NULL
state TEXT NOT NULL CHECK (state IN ('reserved','committed','abandoned'))
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
PRIMARY KEY (user_id, client_message_id)
```

`conversation_id`/`message_id` are stable winning UUIDs stored by the first
reservation. A reservation intentionally precedes the conversation/message and
therefore is a durable intent rather than an immediate FK child. Commit/repair
code proves the referenced rows for `committed`; bounded cleanup may move only an
expired, unreferenced reservation to `abandoned` after deleting its R2 object.

Add a unique partial index on non-null `attachment_r2_key` and a defensive unique
partial index on `(author_user_id, client_message_id)` for user-authored support
messages. Before adding the global user-message index, run a duplicate preflight
and fail the migration plan rather than silently discard a collision.

The payload fingerprint covers actor, kind, target conversation for replies,
normalized message, sanitized context, diagnostics choice, and screenshot
digest. Reuse of a client ID with a different fingerprint returns conflict and
never overwrites the winning message or object.

### 9.3 `support_legacy_feedback_imports`

```text
feedback_id TEXT PRIMARY KEY REFERENCES beta_feedback_submissions(id) ON DELETE RESTRICT
conversation_id TEXT NOT NULL UNIQUE REFERENCES support_conversations(id) ON DELETE RESTRICT
message_id TEXT NOT NULL UNIQUE REFERENCES support_messages(id) ON DELETE RESTRICT
imported_at TEXT NOT NULL
```

The mapping is the idempotency/audit record. It allows a legacy review page to
link to canonical Support without dual-writing.

### 9.4 Triage extension

Add `priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN
('normal','high','urgent'))` to `support_conversation_triage`, with an index only
if the Action Inbox/query plan proves it is used.

### 9.5 Legacy import contract

- Read only legacy rows with no mapping record.
- Generate real UUID conversation/message IDs in application code.
- Preserve original message, user/email, timestamps, page, workspace/project
  hints, and original type/severity as explicitly labeled legacy metadata.
- Validate the workspace -> project -> estimate chain; invalid/missing ownership
  becomes null, never a fabricated or cross-project FK.
- Map both `new` and `reviewing` to `open`; preserve the legacy reviewing label as
  historical metadata. Map resolved/archived to resolved/archived. `pending`
  remains reserved for the current meaning `Waiting on you`.
- Treat legacy severity as historical user input, not admin priority.
- Insert conversation, message, safe context, labels if selected, and mapping in
  one D1 batch. Re-running returns the same mapping and creates no duplicate.
- While legacy rows are retained, privacy export includes them and privacy erase
  replaces their message/user/email/page/resource/metadata and status-event actor
  fields with the repository's approved anonymized values while retaining the
  mapping and minimal audit timestamps.

## 10. API and server contracts

### 10.1 User list

`GET /api/support/conversations`

- Auth required, no-store.
- Returns owner-only summary DTOs, total unread count, and stable ordering.
- Never returns routing tokens, requester email, admin-only triage, or unsafe
  metadata.

### 10.2 New request

`POST /api/support/conversations`

- Replace the current JSON contract with multipart `FormData` in the same cutover
  unit; do not keep two active write paths.
- Required: `message`, `clientMessageId`, `routePath`.
- Optional: one `screenshot`, `diagnosticsShared`, workspace/project/estimate
  hints, viewport, timezone, and client-known app release.
- Server derives user, email, and default workspace; validates the optional
  workspace -> project -> estimate chain as one coherent hierarchy.
- Same-origin check and durable user-scoped rate limit apply before expensive
  object processing.
- Reserve `(userId, clientMessageId)` before R2. A same-fingerprint retry reuses
  the winning conversation/message/object identities; a different fingerprint
  returns `conflict`.
- Response returns canonical conversation/message DTO, reference, attachment,
  and `realtimeDegraded`; 200 on idempotent recovery, 201 on insertion.

### 10.3 Reply

`POST /api/support/conversations/[id]/messages`

- Same multipart contract and screenshot rules.
- Owner check precedes message/context/object access.
- Reply to resolved/archived atomically reopens to `open`.
- A repeated `clientMessageId` returns the original message/attachment and never
  fans out a duplicate event.

### 10.4 Thread read

`GET /api/support/conversations/[id]/messages`

- Owner-only, no-store, bounded page/history.
- Returns safe message DTOs with owner-visible attachment descriptors.
- Mark read after a successful read result, not before query failure.

### 10.5 User screenshot read

- `GET /api/support/attachments/[id]`: owner or admin authorization through the
  message's conversation; no-store/private; exact safe image content type;
  `nosniff`; defensive CSP; no raw R2 key.
- MVP has no post-send attachment DELETE endpoint. The user can remove a local
  screenshot before send. After send, the screenshot is part of the support
  record and is removed only by authorized admin lifecycle or privacy erasure;
  the UI states this before submission. Never implement a local-only hide.

### 10.6 Admin reads/mutations

- Existing admin mailbox/messages/attachment routes remain admin-gated.
- Selected conversation fetch is independent of the active page result.
- Priority/assignment/status/labels are revisioned, audited, and return
  authoritative state.
- Action Inbox hrefs and source-aware controls derive from canonical support.

### 10.7 Error contract

Use stable internal codes with user-safe copy:

- `unauthenticated`, `forbidden`, `not_found`, `invalid_message`,
  `invalid_context`, `invalid_screenshot`, `screenshot_too_large`, `rate_limited`,
  `storage_unavailable`, `conflict`, `realtime_degraded`, `unknown`.
- Never return raw SQL, R2, provider, object key, token, email, stack, or request
  body details.

## 11. Secure screenshot pipeline

1. Verify same-origin, session, user rate limit, conversation ownership, message
   bounds, client ID, and total request policy; normalize context and file digest.
2. Accept no file or exactly one file. Enforce at most 3 MiB and allow only PNG,
   JPEG, or WebP by extension, claimed MIME, and magic-byte signature.
3. Insert-or-ignore the actor/client claim with generated target IDs, fingerprint,
   digest, and stable private R2 key; then re-read the winner. Different
   fingerprint means conflict. Identical retries use the winner's identities.
4. Write the one stable R2 key with private/no-store metadata. Identical
   concurrent retries may overwrite only the same digest bytes.
5. Batch insert-or-select conversation/message, attachment, context,
   unread/status, and claim `reserved -> committed`. Attachment insertion is
   constrained to the winning claim fingerprint/key; user message ID and R2 key
   are uniquely owned.
6. Determine insertion from the message statement result. Return existing data
   and skip fanout when another identical attempt already committed.
7. If D1 fails after R2 write, the reserved claim makes the key discoverable.
   Delete only after proving it unreferenced, otherwise retain it for the retry.
   The invariant is compensation-or-discoverable-repair, not impossible orphans
   across non-atomic D1/R2 systems.
8. Return D1 data. Fan out the message/conversation identifiers only after a new
   committed message.
9. Preview/download reauthorizes from D1; R2 key never enters the client DTO.
10. Privacy erase and bounded cleanup delete R2 before removing/retiring D1
    ownership/claim rows; failures remain retryable and visible.

## 12. Context collection and minimization

### Required envelope

- authenticated user ID and current email from server session;
- canonical conversation/message/client-message IDs;
- server timestamp;
- sanitized pathname only, passed through `normalizePathForLog`-equivalent rules
  and rejected if it contains query/fragment/control characters.

### Optional disclosed diagnostics

- validated workspace, project, and estimate IDs;
- viewport width/height;
- IANA timezone;
- normalized browser family and OS family, not raw user agent;
- safe app release/build identifier only if already available without secrets.

### Never captured

- query strings or URL tokens;
- auth/session/CSRF/cookie headers or values;
- localStorage/sessionStorage;
- clipboard text or unrelated clipboard files;
- DOM HTML, form field contents, React state, network bodies, console logs;
- client/project names, estimate titles/descriptions, quantities, rates, totals;
- raw IP or raw user-agent string in the support context table.

## 13. Cloudflare architecture

### D1 `ARCH_DB`

- Authoritative intake claim, conversation, message, context, attachment
  ownership, unread, status, priority/assignment, legacy mapping, and rate-limit
  ledger.
- Use D1 batch for all-D1 support mutations. Do not claim cross-R2 atomicity.
- Quote/map reserved SQL aliases and retain one predicate contract for list/count.

### R2 `ARCH_UPLOADS_R2`

- Private screenshot bytes only; every object is owned by a committed attachment
  or a discoverable reserved intake claim eligible for retry/repair.
- Reuse Worker binding. No public bucket, CORS change, S3 access key, or presigned
  URL in MVP.
- Introduce a transport-specific HTTP attachment cap so the current 5 MB email
  configuration cannot be mistaken for a safe Worker relay limit.

### Durable Object `SUPPORT_INBOX`

- One object per conversation, existing hibernation API.
- Token admission remains owner/admin scoped and short lived.
- Broadcast only `{type, conversationId, messageId}` after D1 commit.
- Client-authored WebSocket message bodies remain rejected.
- Failure is degraded realtime; list/thread refetch and visibility/online recovery
  restore current D1 truth.

### Queues and Email

- No new support queue or email effect in MVP.
- Existing queues have different domain/retry semantics and must not be reused as
  a generic support-notification bus.
- If email notifications are later requested, add a D1 outbox plus dedicated
  idempotent effect/queue decision; never block message acknowledgement on email.

### `wrangler.jsonc`

- Expected functional change: none.
- Recheck provider limits and compatibility date before implementation/deploy.
- Do not add bindings speculatively.

## 14. Security and privacy threat model

| Threat | Required control |
| --- | --- |
| Cross-user thread or screenshot access | Session-derived actor; conversation owner join on every user read/mutation; admin gate for admin path; 404 for unauthorized IDs. |
| CSRF or cross-site send | Strict same-origin mutation check and SameSite session assumptions; no GET mutation. |
| User impersonation/context forgery | Ignore client user/email; validate resource ownership; mark client technical fields as untrusted until normalized. |
| Duplicate/conflicting message after retry/lost response | Actor/client claim with payload fingerprint and winning IDs; defensive user-message unique index; insert-or-select response; conflict on changed payload; fanout only for inserted row. |
| Malicious or disguised file | Count/size/type/signature checks, image-only allowlist, private R2, `nosniff`, defensive CSP, no HTML/SVG. |
| Worker body-limit failure | 3 MiB screenshot cap and bounded message/metadata; UI and server share transport-specific limit. |
| R2 orphan or wrong deletion | Claim-owned stable key, unique attachment key, compensate only after reference proof, discoverable reserved state, bounded repair, R2-before-D1 privacy order. |
| Token/query leakage | Short-lived room token, safe-path logging, no query logging, no token in support context or event payload. |
| Sensitive automatic diagnostics | Minimal required envelope, disclosed optional tier, allowlist schema, no DOM/storage/query/raw UA, privacy notice review. |
| Action Inbox divergence | Source-aware Open only; canonical support status/triage owns resolve/snooze; active support reconciliation reopens stale resolved/dismissed derived rows. |
| Legacy duplication/privacy copy | Unique mapping table; legacy attention selects only unmapped rows; import batch; retained legacy PII participates in export/erasure. |
| Admin mailbox failure hidden by generic catch | Redacted structured repository failure event with operation/query fingerprint, never SQL parameters or user content. |

## 15. Package and component decision

`DEPENDENCY-DECISION.md` is authoritative. Summary:

- no new dependency;
- repository Dialog/Modal/Sheet, not new Radix Dialog or shadcn-generated layer;
- `ControlTextarea`, Button, Badge/StatusBadge, Alert/Toast, EmptyState;
- adapt the existing file upload and admin paste/drop patterns;
- plain user composer, Tiptap remains admin email-only;
- TanStack Query plus native WebSocket;
- no React Hook Form, Zod, react-dropzone, html2canvas, image compression,
  Socket.IO, new toast package, or second virtual-list package.

## 16. Dependency DAG and ownership

```text
UNIT-001 -> UNIT-002 -> UNIT-003 -> UNIT-004 --\
                               \-> UNIT-005 ----> UNIT-006 -> UNIT-007
```

- Ready slice: `{UNIT-001}`.
- `UNIT-004` and `UNIT-005` may run in parallel only if they own disjoint
  components and neither edits the support client coordinator simultaneously.
- `UNIT-006` starts only after both user surfaces are coherent, so admin cutover
  verifies the actual final user message/status/attachment contract.
- One writer at a time for `support-conversations-d1.ts`, support API routes,
  `AdminSupportInbox.tsx`, and the global workshop support host.
- Single-agent fallback: `001, 002, 003, 004, 005, 006, 007`.

## 17. Route and module impact map

| Surface | Planned change | Unit |
| --- | --- | --- |
| `src/lib/repositories/support-conversations-d1.ts` | quote count alias, context/attachment batch contracts, user summaries, safe DTOs, reopen/read semantics | 001, 002, 003 |
| `src/lib/repositories/support-drafts-d1.ts` | preserve/verify concurrent insert-or-ignore plus scope-select repair | 001 |
| `src/components/admin/AdminActionInbox.tsx` | source-aware Open; remove divergent support Resolve/Dismiss/Snooze | 001, 006 |
| `src/lib/admin/action-inbox-repository.ts` | canonical deep links, active-row conflict repair, mapped-legacy convergence | 001, 006, 007 |
| next migration | context, intake claims/unique ownership, legacy mapping, triage priority | 002 |
| new support context/intake modules | allowlisted context normalization, image validation, idempotent R2/D1 mutation | 002, 003 |
| `src/app/api/support/conversations/**` | multipart intake/reply, owner DTO/read/unread, screenshot descriptors | 003, 005 |
| new user support attachment route | owner/admin private image delivery | 003 |
| `WorkshopFeedbackModal.tsx` | Support Center host, unread badge, new composer | 004, 005 |
| `BetaFeedbackForm.tsx` and beta actions | delete user-facing path after canonical cutover | 004, 007 |
| `/workshop/feedback` | one full Support Center, no duplicate form | 004, 005, 007 |
| `SupportChatWidgetClient.tsx` | replace with cohesive Requests/New/Conversation composition | 004, 005 |
| `AdminSupportInbox.tsx` and extracted support components | selected deep link, context/screenshot, priority/assignment, coherent degraded states | 006 |
| privacy request repositories | export context/attachment metadata; delete R2 message/draft objects; redact rows | 007 |
| legacy feedback review/attention | link canonical import, stop duplicate derivation, retain read-only audit | 006, 007 |
| docs/config examples | support limits, privacy disclosure, operator runbook | 007 |

## 18. Risks and mitigations

- **RISK-001: mailbox/query regression.** Fix alias and add redacted operation
  telemetry; keep list/count predicate contract; verify empty and populated SQL.
- **RISK-002: dual-write/duplicate support.** Cut over all user entry points in
  one unit; actor/client claims prevent request duplication; unmapped-only legacy
  attention converges without a risky deployment toggle.
- **RISK-003: context overcollection.** Allowlist fields, disclose optional data,
  server-normalize, and explicitly reject queries/raw UA/content fields.
- **RISK-004: attachment authorization/orphan.** Owner joins, magic bytes,
  claim-owned digest keys, unique R2 ownership, conservative compensation,
  discoverable repair, cleanup/privacy proof.
- **RISK-005: lost/duplicated/conflicting retry.** Actor/client payload claim,
  winning target IDs, defensive message uniqueness, insert-or-select, 409 on
  fingerprint mismatch, and fanout only after inserted commit.
- **RISK-006: UI client expansion/performance.** Small client islands, lazy-open
  Support Center, plain textarea, existing query cache, bounded list/history.
- **RISK-007: status/unread divergence.** One transition service, source-aware
  labels, read-after-render, reopen-on-user-reply, D1 refetch after invalidation.
- **RISK-008: privacy erase leaves bytes or legacy PII.** Enumerate message,
  draft, and reserved-claim R2 keys; delete R2 first; then redact canonical and
  retained legacy records/status actors while preserving minimal mapping audit.
- **RISK-009: shared-worktree collision.** Preserve current admin support visual
  edits, reread before patching, serialize shared files, keep units reversible.
- **RISK-010: hosted release mismatch.** Plan stops at local implementation;
  remote migration/deploy/live proof require an explicit execution/release task.

## 19. Acceptance criteria

- **AC-001:** exact mailbox SQL succeeds for empty and populated D1; the current
  reserved alias is fixed; the shared insert-or-ignore draft repair is preserved
  and simultaneous creation returns one owned draft;
  Today renders `Open conversation`; deep link selects the exact ID even outside
  the first folder page; existing action rows refresh href/priority.
- **AC-002:** every new global/full-page support submission creates only one
  support conversation/message through one actor/client claim; changed-payload
  claim reuse conflicts; no user-facing beta-feedback write remains; every
  legacy row has exactly one import mapping and canonical thread; legacy rerun is
  idempotent and the old table remains readable/anonymizable.
- **AC-003:** user UI contains no Type, Severity, Subject, or Project UUID input;
  message is the only required field; optional screenshot supports pick/paste/
  drop/preview/remove; details are disclosed; success opens the same thread.
- **AC-004:** server derives actor, checks same origin/rate limit, sanitizes path,
  validates one workspace -> project -> estimate chain, emits minimal DTOs, and never persists any
  prohibited context field or raw credential/user-agent/query content.
- **AC-005:** no file or exactly one valid <=3 MiB PNG/JPEG/WebP succeeds;
  disguised/oversize/multiple files fail safely; R2 is private; only owner/admin
  can read; retry does not duplicate or overwrite a changed payload; each key is
  uniquely attached or discoverable through a reserved claim; failed D1 work is
  compensated or repaired; privacy erase/cleanup remove bytes with retry evidence.
- **AC-006:** Support trigger badge, Requests, New request, and Conversation work
  at wide/narrow source contracts; list/history/status/unread/reply/retry states
  are coherent; focus and live-region behavior meet the audit contract.
- **AC-007:** message and unread/status mutations persist before fanout; DO sends
  identifiers only; D1 success survives fanout failure; reconnect/visibility/
  online backfill recovers; user reply reopens closed state without duplication.
- **AC-008:** new/imported reports appear once in `/admin/support`; admin can see
  screenshot and safe context, set priority/allowlisted-platform-admin assignee/
  status, and reply; Today derives from the same state, exposes Open only, and
  reopens stale derived rows when canonical support requires attention.
- **AC-009:** package manifest has no new runtime dependency; user surface does
  not import Tiptap; client boundaries remain focused; no new virtualization,
  socket, toast, form, capture, or dropzone runtime is introduced.
- **AC-010:** privacy export includes canonical and retained legacy support data,
  context, and attachment metadata; erasure handles support R2/claim keys and
  redacts both canonical and legacy PII/content; logs expose operation/code/
  correlation without PII/content; old feedback entry points are removed; docs
  state limits, collection, lifecycle, and release boundary; final audit is clean.

## 20. Verification and test authorization

### Plan-authoring evidence completed

- live rendered inspection and four screenshots;
- current source and shared worktree inspection;
- official external platform/package research;
- local Next 16 Server/Client, Route Handler, Forms, and Data Security docs;
- read-only bound D1 migration/table/count/query inspection;
- redacted local support draft error explanation;
- static Plan Pack validation is the final closeout step and is not claimed until
  `plan-pack.json` and all artifact hashes pass.

### Implementation static evidence

These are not product tests and may run during implementation:

- targeted TypeScript/typecheck for changed modules;
- lint/static analysis for changed paths;
- migration replay/static SQL and query-plan inspection;
- `rg` audits for duplicate feedback writes, prohibited fields, old copy, and
  new dependencies;
- `git diff --check` and final scoped diff review.

### Per-unit static QA execution matrix

These commands are the executable default evidence for each unit. They do not
run product tests, builds, browser automation, screenshots, Storybook, or visual
QA. Run them after the unit edit, read the output, and attach the command/output
receipt to that unit before advancing. If a command exposes an unrelated
pre-existing failure, isolate it with the narrow command and record the gap.

1. **UNIT-001**
   - Run `bun run type-check`.
   - Run `bun run lint -- src/lib/repositories/support-conversations-d1.ts src/lib/repositories/support-drafts-d1.ts src/components/admin/AdminActionInbox.tsx src/lib/admin/action-inbox-repository.ts src/app/admin/support/page.tsx`.
   - Run `! rg -n 'COUNT\\(\\*\\) AS all' src/lib/repositories/support-conversations-d1.ts`.
   - Run `rg -n 'Open conversation|folder=all|item\\.href' src/components/admin/AdminActionInbox.tsx src/lib/admin/action-inbox-repository.ts`.
   - Run `git diff --check -- src/lib/repositories/support-conversations-d1.ts src/lib/repositories/support-drafts-d1.ts src/components/admin/AdminActionInbox.tsx src/lib/admin/action-inbox-repository.ts src/app/admin/support/page.tsx`.
   - Expected: type/lint/diff exit zero; the invalid alias is absent; exact href
     rendering and `folder=all` are present; the shared `INSERT OR IGNORE` draft
     repair remains intact.
2. **UNIT-002**
   - Run `bunx wrangler d1 migrations apply ARCH_DB --local --config wrangler.jsonc`.
   - Run `bunx wrangler d1 execute ARCH_DB --local --config wrangler.jsonc --command "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('support_user_intake_claims','support_message_context','support_legacy_feedback_imports') ORDER BY name; PRAGMA foreign_key_check;"`.
   - Run `bun run scripts/audit-user-support-legacy-import.ts --local --dry-run`.
   - Run `bun run type-check` and `bun run lint -- src/lib/support/support-message-context.ts src/lib/support/support-legacy-feedback-import.ts scripts/audit-user-support-legacy-import.ts src/lib/repositories/support-conversations-d1.ts`.
   - Expected: local migration exits zero; all three new tables are listed;
     foreign-key check emits no violations; dry-run emits only total/mapped/
     unmapped/invalid-reference counts and stable IDs; type/lint exit zero.
3. **UNIT-003**
   - Run `bun run type-check`.
   - Run `bun run lint -- src/app/api/support/conversations/route.ts 'src/app/api/support/conversations/[id]/messages/route.ts' 'src/app/api/support/attachments/[id]/route.ts' src/lib/support/user-support-intake.ts src/lib/support/support-screenshot.ts src/lib/support/support-rate-limits.ts src/lib/repositories/support-conversations-d1.ts`.
   - Run `bun run validate:error-handling`.
   - Run `rg -n 'support_user_intake_claims|reserved|committed|abandoned|realtimeDegraded' src/app/api/support src/lib/support src/lib/repositories/support-conversations-d1.ts`.
   - Run `git diff --check -- src/app/api/support src/lib/support src/lib/repositories/support-conversations-d1.ts src/lib/cloudflare/support-inbox-fanout.ts`.
   - Expected: static commands exit zero; the actor-scoped claim lifecycle and
     degraded-success path are visible; no raw R2 key or public upload path enters
     a user DTO; the diff is whitespace-clean.
4. **UNIT-004**
   - Run `bun run type-check`.
   - Run `bun run lint -- src/components/workshop src/app/workshop/feedback src/components/support`.
   - Run `bun run lint:design`.
   - Run `! rg -n 'submitBetaFeedbackAction|<BetaFeedbackForm' src/app/workshop src/components/workshop`.
   - Run `rg -n 'Send request|Included details|Add a screenshot' src/components/workshop src/components/support`.
   - Expected: type/lint/design exit zero; authenticated user surfaces have no
     active legacy feedback submission/render path; the message-first composer,
     disclosed details, and optional screenshot affordance are present.
5. **UNIT-005**
   - Run `bun run type-check`.
   - Run `bun run lint -- src/components/support src/app/api/support src/components/workshop/WorkshopFeedbackModal.tsx src/app/workshop/feedback/page.tsx`.
   - Run `bun run lint:design`.
   - Run `rg -n 'Requests|New request|Conversation|realtimeDegraded|unread' src/components/support src/components/workshop/WorkshopFeedbackModal.tsx`.
   - Run `git diff --check -- src/components/support src/app/api/support src/components/workshop/WorkshopFeedbackModal.tsx src/app/workshop/feedback/page.tsx`.
   - Expected: static commands exit zero; one user surface exposes list/new/thread,
     unread and degraded states; no internal connection state is shown unless
     degraded; diff is clean.
6. **UNIT-006**
   - Run `bun run type-check`.
   - Run `bun run lint -- src/app/admin/support src/components/admin/AdminSupportInbox.tsx src/components/admin/AdminActionInbox.tsx src/components/admin/support src/app/api/admin/support src/lib/admin/action-inbox-repository.ts src/lib/admin/support-actions.ts src/lib/admin/support-attention-repository.ts src/lib/admin/feedback-attention-repository.ts`.
   - Run `bun run lint:design`.
   - Run `rg -n 'Open conversation|folder=all|support_legacy_feedback_imports' src/components/admin/AdminActionInbox.tsx src/lib/admin/action-inbox-repository.ts src/lib/admin/feedback-attention-repository.ts`.
   - Run `bun run scripts/audit-user-support-legacy-import.ts --local --dry-run`.
   - Expected: type/lint/design exit zero; support-derived Today rows expose exact
     Open navigation and the source query contains unmapped-only legacy fallback;
     dry-run counts reconcile without message/email output.
7. **UNIT-007**
   - Run `bun run type-check` and `bun run validate:error-handling`.
   - Run `bun run lint -- src/lib/compliance/privacy-request-repository.ts src/lib/workshop/beta-feedback-actions.ts src/lib/workshop/beta-feedback-d1-store.ts src/lib/observability scripts/audit-support-screenshot-orphans.ts`.
   - Run `! rg -n 'submitBetaFeedbackAction|<BetaFeedbackForm' src/app src/components`.
   - Run `test -z "$(git diff -- package.json)"`.
   - Run `bun run scripts/audit-support-screenshot-orphans.ts --local --dry-run`.
   - Run `bun run validate:plan-pack -- .ai/03_plans/2026-07-22/User-Support-System` and `git diff --check -- .ai/03_plans/2026-07-22/User-Support-System src/lib/compliance src/lib/workshop src/lib/observability scripts/audit-support-screenshot-orphans.ts`.
   - Expected: static commands exit zero; no authenticated legacy submission call
     remains; `package.json` is unchanged; orphan audit reports only bounded
     counts/hashes and performs no deletion; the final Plan Pack validates.

### TEST_PROPOSAL only, not authorized by this planning task

Run only if Philip explicitly makes implementation testing a current `TEST_TASK`:

The five Vitest files below do not exist today. They are proposed test artifacts
to create inside that future authorized `TEST_TASK`, then run with the named
commands. They are not current runnable validation targets.

1. `bun x vitest run tests/vitest/support-mailbox-contract.test.ts`
   - empty/populated list+counts, quoted alias, deep link, source-aware actions,
     preservation of the concurrent draft get-or-create repair.
   - setup: apply migrations to an isolated temporary D1 database; seed empty and
     populated mailbox/action rows; open two repository handles for the same draft
     scope and assert both resolve the same authoritative row.
2. `bun x vitest run tests/vitest/support-user-intake.test.ts`
   - auth/origin/rate limit, context sanitization/ownership, idempotent send,
     screenshot type/size/signature, compensation, private read.
   - setup: isolated migrated D1, deterministic actor/resource fixtures, a fake
     private R2 bucket, and a stubbed DO fanout that can succeed or fail; submit
     multipart fixtures including lost-response and changed-fingerprint retries.
3. `bun x vitest run tests/vitest/support-user-conversations.test.ts`
   - owner isolation, status mapping, unread/read, reopen, retry, realtime
     degraded/backfill.
   - setup: isolated migrated D1 with two users and one platform admin; seed one
     thread per user, force fanout degradation, and exercise refetch/backfill and
     cross-user 404 behavior.
4. `bun x vitest run tests/vitest/support-legacy-import.test.ts`
   - mapping completeness, status/context preservation, rerun dedupe, Action
     Inbox de-duplication.
   - setup: isolated migrated D1 with `new`, `reviewing`, resolved, already-mapped,
     and invalid-reference legacy fixtures; run dry-run, apply, and rerun while
     asserting canonical plus unmapped-only attention counts.
5. `bun x vitest run tests/vitest/privacy-request-repository.test.ts`
   - export context/attachment descriptors, R2-before-D1 erase, retryable failure.
   - setup: isolated migrated D1 and fake R2 with canonical message, draft,
     reserved-claim, and retained legacy records; inject one object-delete failure
     and prove erasure remains retryable before the succeeding replay redacts data.
6. Browser/a11y scenarios for the four audited surfaces plus mobile Support
   Center, screenshot paste/drop/remove, offline/lost-response recovery, admin
   deep link/context/priority, and user reply badge.

No proposed test or browser implementation proof was run during plan authoring.

## 21. Pre-mortem

Assume the launch failed. The most likely reasons are:

1. **A complaint was saved but not visible to Philip.** Cause: Action Inbox,
   mailbox predicates, or import status diverged. Prevention: canonical D1
   transition and deep-link contracts, source completeness audit, degraded alert.
2. **A screenshot exposed another user's project.** Cause: attachment lookup by
   ID without conversation ownership. Prevention: join attachment -> message ->
   conversation on every read and return 404 for unauthorized actors.
3. **Retries created duplicate threads or orphan objects.** Cause: file write
   preceded a non-idempotent D1 path. Prevention: stable client/digest keys,
   insert-or-select, D1 batch, reference-aware compensation.
4. **“Automatic context” captured confidential estimating data.** Cause: broad
   serialization or raw URL/user-agent storage. Prevention: fixed allowlist,
   explicit prohibited list, disclosure, server normalization, review grep.
5. **The new modal looked better but users still could not find replies.** Cause:
   composer-only redesign without history/unread/status. Prevention: Support
   Center information architecture and AC-006 as a core criterion.
6. **Legacy feedback appeared twice or disappeared.** Cause: separate attention
   derivation switched around the import. Prevention: one deploy-safe query that
   always combines canonical support with unmapped-only legacy fallback.
7. **Local success did not prove production.** Cause: release boundary blurred.
   Prevention: keep `release_status=NOT_EVALUATED`; require a separate deployment
   task with new Worker version, remote migration proof, domain/health checks, and
   live scenario verification.

## 22. Gate applicability and release boundary

- **UX gate:** active; rendered baseline and complete user/admin flows recorded.
- **Next/React gate:** active; local Next 16 docs reviewed, client boundary
  constrained, no package-memory assumptions.
- **Contract/API gate:** active; request/response, idempotency, errors, and owner
  DTO boundaries specified.
- **D1/data gate:** active; additive schema, batch/idempotency, legacy mapping,
  and migration order specified.
- **Security/privacy gate:** active; threat model, minimization, authorization,
  rate limits, private object lifecycle, and erasure specified.
- **Performance gate:** active; no new dependency, bounded data, lazy client
  surface, and no unmeasured virtualization.
- **Operations gate:** active; exact current failure, redacted logging, degraded
  semantics, cleanup, and release boundary specified.
- **Agent gate:** active; units have ownership, DAG, evidence, recovery, and stop
  conditions.

Implementation may change bound D1/R2/DO code locally. Remote migration apply,
deployment, credentials, DNS, paid services, and live production mutation are
outside this pack's `IMPLEMENT_LOCAL` ceiling.

## 23. Execution handoff

1. Re-read current shared-file diffs and migration tail.
2. Execute `UNIT-001`; do not start feature UI while admin support reads remain
   broken.
3. Reconcile baseline/hash and unit evidence after every unit.
4. Never carry two active user write paths past `UNIT-004` completion.
5. Keep `UNIT-006` derivation deploy-safe: canonical support plus unmapped-only
   legacy fallback before, during, and after import.
6. Finish `UNIT-007` with a requirement/risk/cleanup audit and leave release as
   not evaluated unless a separate explicit task authorizes hosted execution.
