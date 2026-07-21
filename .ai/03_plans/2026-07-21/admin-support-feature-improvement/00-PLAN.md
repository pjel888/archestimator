# Admin Support Operations Console — Canonical Execution Plan

## Status tuple

`IMPLEMENTATION_READY / NOT_STARTED / NOT_EVALUATED / N/A / ACTIVE`

- **Suite compatibility:** manifest `2026-07-12` (latest validator-supported contract); planning guidance reviewed against the `2026-07-19` kernel.
- **Profile:** `standard`; authenticated UI, D1 schema, R2 lifecycle, email identity, and Durable Object boundaries.
- **Action ceiling:** `IMPLEMENT_LOCAL`; this authoring pass is `PLAN_ONLY`.
- **Exact next unit:** `UNIT-001`.
- **Test decision:** `NOT_REQUIRED` for plan authoring; product tests remain proposals unless Philip issues a current-task `TEST_TASK`.

## 1. Task Contract

### Objective and intent

Give a solo technical founder a fast, reliable support console at
`/admin/support` with real mailbox views, multiple verified From identities,
durable drafts, reply-all/forward, realtime in-app chat, and lightweight triage.
Preserve the existing D1-backed support conversation/message ledger, Cloudflare
Email binding, R2 attachment storage, and `SUPPORT_INBOX` Durable Object.

### In scope

- authenticated admin route `/admin/support` and its admin API/action surface;
- authenticated user support route `/workshop/feedback` and owner-scoped support APIs;
- `support_conversations`, `support_messages`, new draft tables, and new triage tables;
- current `EMAIL`, `ARCH_DB`, `ARCH_UPLOADS_R2`, and `SUPPORT_INBOX` bindings;
- email sender/recipient model, retry identity, CC, routing headers, and attachments;
- URL/query state, responsive/focus states, reconnect/backfill, unread markers, and audit events;
- privacy erasure/export and bounded orphan cleanup for newly persisted drafts.

### Non-goals

- enabling inbound email routing or deploying provider/DNS changes;
- chat on email-primary conversations;
- typing/presence, bots, AI replies, SLAs, collision-heavy multi-agent assignment, or a label-management product;
- SaaS helpdesk migration, new dependencies, feature flags, dual write paths, compatibility shims, rollout machinery, or paid services;
- rewriting the support domain outside the direct blast radius named below.

### Authority and constraints

- Current source, `wrangler.jsonc`, `migrations/`, `AGENTS.md`, and `.ai/00_system` are authoritative.
- Stay on the current shared branch/worktree and preserve unrelated changes.
- `migrations/` is the only active migration directory; recheck the tail before creating `0096` or `0097` and renumber forward if another migration lands.
- Use current Next 16 route-handler/server-client conventions and the Worker-safe repository split.
- D1 is authoritative for chat and drafts; R2/DO are subordinate storage/signal layers.
- No external deployment, remote migration apply, DNS change, or provider mutation is part of this pack.

### Completion and stop condition

Implementation is complete only when every CORE requirement maps to final source,
fresh authorized evidence, and a clean requirement audit; the list and count
predicates agree; retries preserve sender identity; drafts survive reload without
stale-write loss; user/admin chat cannot bypass D1 or cross rooms; triage composes
with Action Inbox behavior; no safe in-scope unit or cleanup remains.

## 2. Current evidence and corrected findings

### 2.1 Repository snapshot

- The active source snapshot is the current `main` worktree; the manifest
  baseline/hash must be refreshed immediately before execution because the
  shared branch changed during planning.
- GitNexus was requested, but the repository guard rejected the local runner
  because it contains a `gitnexus@latest` fallback. Code Review Graph returned
  no matching support symbols. Those tools are degraded navigation aids, not
  blockers; all claims below were confirmed in current source.
- The plan pack is currently untracked in the shared worktree. Do not reset,
  clean, stash, or disturb other July 21 plan packs.

### 2.2 Existing support path

- `src/app/admin/support/page.tsx` is a dynamic RSC. It reads URL filters,
  loads up to 50 conversations plus the first selected thread, attachments,
  saved replies, and support readiness, then renders `AdminSupportInbox` inside
  the shared `AdminPage` shell.
- `src/components/admin/AdminSupportInbox.tsx` is already a large client
  orchestrator. It copies server props into local state, filters that copy,
  writes URL params, lazily queries messages, and performs optimistic mutations.
  After a URL navigation, new RSC props do not automatically replace that local
  conversation state. Adding server folders without fixing this split-brain
  ownership would produce stale lists/counts.
- `src/app/api/admin/support/conversations/route.ts` ignores request filters and
  always returns 100 rows. The messages route is admin-gated and no-store.
- `src/lib/repositories/support-conversations-d1.ts` owns Worker-safe SQL and
  already stores per-message direction, transport, From/To/Cc, correlation,
  send status, attachment count, and idempotent client message IDs.
- `src/lib/admin/support-actions.ts` persists outbound messages before send and
  audits/revalidates mutations. It currently resolves the default identity in
  both the action and `dispatchSupportEmail`; this double resolution would make
  a naive From-picker implementation persist one identity while sending another.
  Retry also resolves the current default instead of the original persisted From.

### 2.3 Sent and drafts root cause

- Outbound messages are persisted in `support_messages` with
  `direction='outbound'`; there is no Sent query or mailbox rail. Sent is a
  view/query gap, not a data gap.
- Compose text is local React state. R2 `support-email/drafts/...` objects are
  attachment staging objects only; there is no durable compose-draft record.
- SQLite treats `NULL` values as distinct in a unique constraint. The prior
  proposal `UNIQUE(admin_user_id, conversation_id, kind)` would not prevent
  duplicate new-email drafts because `conversation_id` is null.

### 2.4 Realtime root cause

- `issueSupportInboxRealtimeToken` already performs admin-or-owner authorization
  and issues a conversation-scoped short-lived room token. A second token
  implementation would duplicate a security boundary.
- `SupportInbox` accepts WebSockets and authenticated POST fanout. It also accepts
  client `message` frames and rebroadcasts arbitrary objects without D1
  persistence. That path must not become the chat write API.
- `inbound-support-email.ts` calls the authenticated DO POST without a token and
  explicitly notes it may be rejected. Realtime inbound email fanout is therefore
  not currently reliable.
- `SupportChatWidget` is a server-rendered one-shot form that only creates a new
  in-app conversation. There is no owner-scoped list/messages API, follow-up
  mutation, user read marker, realtime client, or reconnect/backfill behavior.

### 2.5 Transitive consumers

- `src/lib/admin/support-attention-repository.ts` powers the founder Action
  Inbox and must honor snooze; otherwise a snoozed support thread disappears
  from Support but remains actionable elsewhere.
- `src/lib/admin/support-aggregate.ts` is a total open-count metric. It remains
  a total and does not exclude snoozed conversations.
- Privacy export/erase currently covers conversations/messages, not future
  draft rows or R2 draft attachments.
- `worker.ts` routes `SUPPORT_INBOX` before OpenNext and already runs a bounded
  upload-cleanup job. Reuse those paths instead of adding a new cron/binding.

## 3. Accepted outcomes and requirements

| ID | Role | Requirement | Units | Evidence |
|---|---|---|---|---|
| DATA-001 | CORE | Mailbox views and counts use one shared predicate contract; Sent exposes outbound-authored threads without losing send-status visibility | UNIT-001, UNIT-002 | AC-001 |
| DATA-002 | CORE | Admin can choose either verified From identity; chosen identity is persisted, used for provider send, and preserved for retry | UNIT-003, UNIT-004 | AC-002 |
| DATA-003 | CORE | Drafts and owned attachments persist, autosave safely, resume/discard, clear on send, and participate in privacy/cleanup lifecycle | UNIT-005, UNIT-006 | AC-003 |
| UX-001 | CORE | The console has responsive folder/list/thread states, reply-all/forward, and focus-safe keyboard navigation | UNIT-002, UNIT-007 | AC-004 |
| SEC-001 | CORE | Sender and recipients are server-normalized; unknown identities fail closed; Reply-To remains routable; retries cannot drift identity | UNIT-003, UNIT-004, UNIT-007 | AC-005 |
| DATA-004 | CORE | In-app messages persist idempotently before an authenticated DO invalidation signal and reconcile from D1 | UNIT-008, UNIT-010 | AC-006 |
| SEC-002 | CORE | Only admins/owners receive short-lived room tokens; client frames cannot inject authoritative messages or cross conversations | UNIT-008, UNIT-010 | AC-007 |
| UX-002 | CORE | User and admin chat clients load history, send, receive, mark read, reconnect, backfill, dedupe, and expose degraded states | UNIT-010 | AC-008 |
| DATA-005 | CORE | Labels, self-assignment, snooze, and star are normalized and compose with mailbox/count/Action Inbox predicates | UNIT-009, UNIT-011 | AC-009 |
| UX-003 | CORE | Triage actions and Starred/Snoozed views are accessible, URL-addressable, revision-aware, reconciled to server truth, and audited | UNIT-011 | AC-009 |

## 4. Resolved technical decisions

- **DEC-AUTO-001 — conversation-centric mailbox views.** Inbox is every
  non-archived, non-snoozed thread; unread remains a sub-filter. Sent is every
  thread with at least one outbound-authored message, ordered by its latest
  outbound timestamp; pending/failed rows stay visibly labeled instead of being
  falsely hidden. Archive is archived threads; All bypasses folder exclusion.
  Drafts is a draft-entity result, not a fake conversation predicate.
- **DEC-AUTO-002 — URL + TanStack Query own list state.** RSC data is initial
  query data only. The client derives query keys from URL state and updates the
  query cache after mutations. Do not maintain an unsynchronized second list.
- **DEC-AUTO-003 — From and Reply-To are separate.** `support@` and `philip@`
  are allowed From addresses on the onboarded domain. Reply-To remains the
  canonical plus-addressed support mailbox so inbound correlation does not
  depend on every From address being an inbound alias.
- **DEC-AUTO-004 — revisioned draft aggregate.** Each draft has a non-null
  owner-scoped `scope_key`, revision, and child attachment rows. Autosave uses
  compare-and-swap; an older request cannot overwrite a newer revision.
- **DEC-AUTO-005 — forward starts a new conversation.** Reply-all stays in the
  current thread and excludes all configured support identities from recipients.
  Forward creates a fresh external conversation with `Fwd:` subject; it does not
  reuse reply threading headers. Only explicitly selected stored/safe attachments
  are forwarded.
- **DEC-AUTO-006 — D1-authoritative realtime.** HTTP/server mutations write D1
  first. The DO broadcasts a validated message-created invalidation containing
  identifiers only. Clients refetch D1; arbitrary WebSocket message bodies are
  rejected. Typing/presence is deferred.
- **DEC-AUTO-007 — normalized triage tables.** One triage row stores assignee,
  snooze, star, and revision; a join table stores exact normalized labels. This
  avoids JSON substring bugs and supports indexed composition.
- **DEC-AUTO-008 — no new dependency.** Existing Next, TanStack Query, D1, R2,
  native WebSocket, and repository/action patterns are sufficient.

## 5. High-level technical design

### 5.1 Mailbox read path

`URL state -> validated admin GET route -> shared repository predicate builder -> D1 page + counts -> TanStack Query cache -> folder/list/thread UI`

- Validate known folder/status/channel/cursor values at the route boundary;
  invalid API input returns 400. Page input may normalize to defaults.
- Use the same normalized filter object and predicate builder for list and
  counts. Counts must not silently ignore search/channel/status unless the UI
  labels them as global; this plan chooses counts scoped to the active
  channel/search and global with respect to the selected folder.
- Use stable `(sort_timestamp, id)` cursor semantics. Sent sorts by latest
  outbound timestamp; other conversation views sort by `last_message_at`.
- Add only an evidence-backed index in `0096` after local query-plan inspection;
  do not speculate or add N+1 per-folder queries.

### 5.2 Admin client decomposition

Keep `AdminSupportInbox.tsx` as a thin coordinator and extract only cohesive
feature surfaces under `src/components/admin/support/`:

- mailbox URL/filter parser;
- mailbox query/cache hook;
- folder rail and conversation list;
- thread pane and composer host;
- realtime subscription hook (after UNIT-008).

Preserve the smallest client boundary. Heavy rich compose remains dynamically
loaded. Responsive behavior is explicit: wide screens use list + thread; narrow
screens show one pane at a time with a visible Back control and retained URL
selection. Empty, loading, error, reconnecting, autosaving, saved, conflict,
and send-failure states must not collapse layout or steal focus.

### 5.3 Identity and email send path

`UI identity id -> server registry resolution -> persisted message From -> explicit dispatch identity -> provider result -> retry from persisted identity`

- Registry records contain stable id, From address/name, canonical reply mailbox,
  and default flag. Reject duplicate ids/addresses, cross-domain identities,
  malformed/header-injection input, and more than the small configured maximum.
- Update `.env.example`, `.dev.vars.example`, the operator runbook, and readiness
  checks for the identity list. No credential value enters Git.
- `dispatchSupportEmail` receives the resolved identity and recipients; it does
  not resolve a default internally.
- Retry reconstructs the exact identity from the stored message. If that address
  is no longer allowed, fail with an explicit operator error rather than switch
  From addresses.
- Extend the Cloudflare email client types to support `cc` as a first-class API
  field. Cloudflare currently permits `to`/`cc`/`bcc` with a combined limit of
  50; this product applies a smaller bounded limit.

### 5.4 Draft data and attachment lifecycle

Migration `0096` (or next free number at execution) adds:

- `support_drafts`: owner, stable `scope_key`, kind, optional conversation,
  recipients/subject/body/from identity, stable `client_message_id`, lifecycle
  state, optional bound outbound conversation/message ids, monotonic revision,
  timestamps, and checks tying reply drafts to a conversation and new-email
  drafts to a client id;
- `support_draft_attachments`: draft FK, exact R2 key, normalized filename/type,
  size/hash, timestamps, and unique `(draft_id, r2_key)`;
- indexes for owner/update ordering and conversation lookup; an outbound lookup
  index only if query-plan evidence proves it useful.

Draft creation precedes attachment upload. Upload accepts `draftId`, verifies
admin ownership in D1, then writes the owner-scoped R2 key and child row. Send
accepts `draftId`, reloads the authoritative aggregate, claims `editing -> sending`
with revision CAS, and preflights every recipient/body/identity/R2 object before
creating or reusing the one stable outbound message. Attachment promotion first
loads and validates all source objects, then writes final message objects/rows;
on partial local failure it compensates newly created final objects, marks the
message non-pending, restores the editable draft, and leaves source objects.
After durable promotion, the draft is consumed even if the provider rejects the
email: the failed message/body/final attachments become the retry source. Retry
reloads those persisted attachments and the persisted From/recipients; it never
creates a second conversation/message or silently drops attachments. Discard and
privacy erase delete exact objects owned by their still-live aggregate. The
existing bounded upload-cleanup route also repairs stale `sending` drafts and
removes expired unbound draft objects/rows; dry-run remains non-destructive.

### 5.5 Reply-all and forward

- Parse `from_address`, `to_json`, and `cc_json` through one normalized address
  helper; dedupe case-insensitively; exclude every configured support From/reply
  address; cap recipients; reject empty or malformed resulting sets.
- Reply-all retains the conversation routing token and normal reply headers.
- Forward always creates a new external conversation and new routing token. The
  quoted body identifies the source message without injecting raw headers or
  unsafe HTML. Attachments are opt-in, must be `stored`, and are re-read from R2
  under existing count/size/type limits; blocked/quarantined/missing objects fail
  closed with a clear UI state.
- Keyboard shortcuts are scoped to the support workspace, disabled while an
  editable/control/composer owns focus, and announced in accessible help text.

### 5.6 Realtime chat and trust boundary

`owner/admin HTTP mutation -> D1 insert/read flags -> signed internal fanout -> DO invalidation -> client refetch/backfill`

- Refactor existing support token authorization into one server-only service;
  expose it through a no-store owner/admin route used for connection and refresh.
  Do not maintain a duplicate policy in the route and server action.
- Browser WebSocket handshakes cannot set Authorization headers. Use only a
  short-lived conversation/user-scoped signed token in the same-origin URL,
  redact query strings from app logs, and set no-store/no-referrer response policy.
- Add an internal fanout helper shared by inbound email and support actions. It
  signs a short-lived system room token, posts only a validated invalidation
  envelope, checks the response, and logs sanitized failures. D1 success remains
  success even when fanout fails.
- Harden `SupportInbox`: validate path before DO dispatch, validate tokens on
  upgrade/internal POST, reject client message bodies, cap envelope bytes, and
  broadcast only to currently authorized sockets for the same conversation.
- Add owner-scoped user list/messages/send/read routes or actions. Every read and
  mutation checks `user_id`; external email conversations (`user_id IS NULL`)
  are never user-accessible.
- Client reconnect uses capped exponential backoff with jitter, token refresh,
  visibility/online backfill, and cleanup on conversation change/unmount. Live
  events invalidate/refetch rather than trusting payload content.

### 5.7 Triage and cross-surface semantics

Migration `0097` (or next free number after drafts) adds:

- `support_conversation_triage(conversation_id PK, assignee_user_id,
  snoozed_until, starred_for_admin, revision, updated_at)`;
- `support_conversation_labels(conversation_id, label, created_at)` with exact
  normalized label key and composite primary key;
- indexes for assignee, snooze, starred, and label lookup.

Admin mutations require current admin context, update with revision CAS, cap and
normalize labels, allow only assign-to-self/unassign, validate bounded UTC snooze
times, and write audit events. Inbox and its count exclude future-snoozed rows;
Snoozed includes only future rows; expired snoozes re-enter Inbox without a cron.
Starred and label/assignee filters compose with other filters. The founder Action
Inbox excludes future-snoozed rows; the total open aggregate remains unchanged.

## 6. Route and module impact map

| Surface | Current role | Planned change | Unit |
|---|---|---|---|
| `src/app/admin/support/page.tsx` | RSC initial data | validate URL defaults, seed list/count queries, pass identity/draft data | 002, 004, 006, 011 |
| `src/app/api/admin/support/conversations/route.ts` | unfiltered admin list | validated list/count/cursor contract | 001 |
| `src/app/api/admin/support/drafts/**` | absent | admin-gated CRUD with revision conflicts and no-store | 006 |
| `src/app/api/admin/support/uploads/route.ts` | unattached R2 draft upload | require owned D1 draft, bind attachment row | 006 |
| `src/app/api/support/conversations/**` | absent | current-user list/messages/send/read and token refresh | 008 |
| `src/components/admin/AdminSupportInbox.tsx` | monolithic state owner | thin coordinator over extracted mailbox/query/thread surfaces | 002, 004, 006, 007, 010, 011 |
| `src/components/admin/support/SupportRichComposer.tsx` | ephemeral compose | controlled identity/draft/recipient state | 004, 006, 007 |
| `src/components/support/SupportChatWidget.tsx` | server one-shot form | server wrapper around a small client chat island | 010 |
| `src/lib/repositories/support-conversations-d1.ts` | core ledger/query | shared mailbox predicates, owner reads/read marker, triage joins | 001, 008, 009 |
| `src/lib/repositories/support-drafts-d1.ts` | absent | Worker-safe draft/attachment/CAS repository | 005 |
| `src/lib/admin/support-actions.ts` | admin send/status, user start | explicit identity/recipients, draft id, user message path, fanout | 004, 006, 007, 008 |
| `src/lib/email/*` | single From, no Cc type | registry, explicit dispatch identity, recipient model, cleanup | 003, 004, 005, 007 |
| `src/lib/collaboration/realtime-identity-actions.ts` | existing support token policy | extract/reuse one support authorization policy | 008 |
| `src/lib/cloudflare/support-inbox.ts` | room auth + permissive client relay | invalidation-only authenticated relay | 008 |
| `src/lib/cloudflare/support-inbox-router.ts` | Worker-to-DO routing | pre-DO validation and safe response behavior | 008 |
| `src/lib/email/inbound-support-email.ts` | persistence + unauthenticated fanout attempt | shared signed internal fanout | 008 |
| `src/lib/admin/support-attention-repository.ts` | Action Inbox support source | exclude future-snoozed threads | 011 |
| privacy/cleanup modules | conversation/message lifecycle | include draft content and exact owned R2 cleanup | 005, 006 |
| `worker.ts`, `wrangler.jsonc` | existing bindings/routes/crons | no new binding/cron; only shared helper wiring if required | 005, 008 |

## 7. Dependency DAG and ownership

```text
UNIT-001 -> UNIT-002
UNIT-001 -> UNIT-009
UNIT-002 -> UNIT-007
UNIT-002 -> UNIT-010
UNIT-002 -> UNIT-011
UNIT-003 -> UNIT-004 -> UNIT-007
UNIT-005 -> UNIT-006 -> UNIT-007
UNIT-005 -> UNIT-009
UNIT-006 -> UNIT-010
UNIT-007 -> UNIT-008 -> UNIT-010 -> UNIT-011
UNIT-009 -> UNIT-011
```

- Ready slices: `{UNIT-001}`, `{UNIT-003}`, `{UNIT-005}`.
- One writer at a time for `AdminSupportInbox.tsx`, `SupportRichComposer.tsx`,
  `support-actions.ts`, and `support-conversations-d1.ts`; reread immediately
  before every later unit touching them.
- `UNIT-009` preserves its existing ID even though its data work moves before
  the new `UNIT-010`/`UNIT-011` UI sequence. New split work uses new IDs.
- Single-agent fallback follows: `001,003,005,002,004,006,007,008,009,010,011`,
  respecting dependencies and shared-file serialization.

## 8. Risks and mitigations

- **RISK-001 — list/count/state divergence.** Duplicate SQL predicates or copied
  React state can show stale folders. Mitigate with one filter normalizer,
  shared predicate builder, URL query key, and cache-owned mutation updates.
- **RISK-002 — sender/deliverability/retry drift.** A message may persist one
  From and send/retry from another. Pass identity explicitly, keep canonical
  Reply-To, persist From, and fail if persisted identity is no longer allowed.
- **RISK-003 — stale autosave and R2 leaks.** Out-of-order saves can overwrite
  newer text; partial promotion can orphan objects or make retries lose files.
  Use revision/lifecycle CAS, stable message identity, validate-before-promote,
  compensation, persisted-attachment retry, exact delete, privacy integration,
  and bounded repair/cleanup.
- **RISK-004 — recipient leak or broken forward.** Reply-all can echo support
  identities or forward unsafe content. Normalize/dedupe/exclude/cap recipients;
  new-thread forward only; selected safe attachments only.
- **RISK-005 — room authorization bypass/token exposure.** Do not trust topic or
  bodies from clients; reuse one owner/admin policy; short TTL; same-conversation
  checks; no-store/no-referrer; sanitized logs; pre-DO rejection.
- **RISK-006 — D1/DO/reconnect divergence.** Persist first, broadcast identifiers,
  check fanout response, refetch on event/reconnect, dedupe, and treat DO failure
  as degraded realtime rather than lost data.
- **RISK-007 — triage predicate drift.** Normalize labels, capture one `now` per
  query/count request, share predicate logic, revision triage mutations, and
  update Action Inbox snooze semantics explicitly.
- **RISK-008 — migration collision/partial lifecycle.** Recheck the live tail,
  keep migrations additive and forward-only, align repository types in the same
  unit, inspect local SQL statically, and never claim unapplied schema is live.
- **RISK-009 — admin inbox monolith/performance regression.** Extract cohesive
  subcomponents/hooks before feature growth, preserve dynamic rich compose,
  paginate, avoid N+1 counts/refetch storms, and do not claim performance gains
  without measurement.

## 9. Acceptance criteria

- **AC-001:** For a fixed filter snapshot, list and counts use the same predicate;
  Inbox/Archive/All/Sent return the defined sets with stable cursors; invalid API
  filters fail; URL reload reproduces the selected view; failed/pending outbound
  messages remain visibly distinguished.
- **AC-002:** Both configured identities render; selected From is server-resolved,
  persisted, passed to Cloudflare, and reused on retry; canonical plus Reply-To
  remains routable; idempotent retries cannot change identity.
- **AC-003:** Reply and multiple new-email drafts have stable unique scopes;
  revision conflicts cannot overwrite newer content; attachment ownership is
  server-derived; one draft maps to at most one outbound conversation/message;
  partial promotion remains recoverable; failed-send retry preserves body,
  recipients, From, and attachments; reload/resume/discard/send/privacy/cleanup
  reach coherent D1/R2 states.
- **AC-004:** Folder/list/thread layout works at narrow and wide widths from
  source contract; loading/empty/error/conflict states are explicit; reply-all
  and forward follow recipient/thread rules; shortcuts never capture editable focus.
- **AC-005:** Unknown/cross-domain/header-injection identities and malformed or
  over-limit recipients fail closed; support identities are excluded from
  reply-all; blocked/quarantined forward attachments cannot send.
- **AC-006:** New in-app messages are idempotently present in D1 before fanout;
  fanout failure leaves durable success and a reconnect/backfill path; inbound
  email/admin/user use the same validated internal fanout helper.
- **AC-007:** Non-owner users cannot read, write, mint tokens, or connect to a
  conversation; browser frames cannot author authoritative messages; expired,
  wrong-topic, malformed, and missing tokens fail closed.
- **AC-008:** User and admin clients load history, send, receive, mark read,
  reconnect with capped backoff, refresh tokens, refetch on invalidation, dedupe,
  clean up sockets/timers, and show offline/reconnecting/degraded states.
- **AC-009:** Exact labels, self-assignment, snooze, star, Starred/Snoozed views,
  counts, URL state, audit events, and Action Inbox snooze behavior compose
  without changing the total open aggregate.

## 10. Verification contract

### Authorized plan-pack evidence

- current source/config/migration inspection;
- focused final diff review;
- TypeScript/LSP and lint/static checks when implementation executes;
- static migration ordering/constraint/query review;
- `bun run validate:plan-pack -- <folder>` for this pack.

### Product test decision

`NOT_REQUIRED` until Philip explicitly authorizes a current-task `TEST_TASK`.
Record, but do not run, these exact proposals because they materially reduce risk:

- `bun x vitest run tests/vitest/support-folders.test.ts`
- `bun x vitest run tests/vitest/support-send-identities.test.ts`
- `bun x vitest run tests/vitest/support-drafts-d1.test.ts`
- `bun x vitest run tests/vitest/support-recipients.test.ts`
- `bun x vitest run tests/vitest/support-chat-transport.test.ts`
- `bun x vitest run tests/vitest/support-realtime-token.test.ts`
- `bun x vitest run tests/vitest/support-triage-folders.test.ts`
- `bun x vitest run tests/vitest/cloudflare-support-inbox-router.test.ts`

Browser/responsive/accessibility proof and local D1 migration application are
also user-gated. Do not describe unrun proposals as passing. Provider acceptance
is not final delivery proof, and local checks are not hosted proof.

### Applicable planning gates

- `GATE-NEXT-01`: RSC/client serialization, route handlers, no-store, server actions, navigation/query ownership.
- `GATE-UX-01`: responsive panes, focus/keyboard behavior, status/error feedback.
- `GATE-CONTRACT-01`: query/filter/cursor, identity, recipient, draft revision, and event envelopes.
- `GATE-DATA-01`: additive migrations, CAS, idempotency, D1/R2 ordering, privacy/cleanup.
- `GATE-SEC-01`: admin/owner checks, sender/recipient validation, token scope, log redaction.
- `GATE-PERF-01`: pagination, no N+1 counts, bounded refetch/reconnect, client-boundary control.
- `GATE-CLEAN-01`: split the monolith, remove duplicate token/identity resolution, no compatibility layer.

## 11. Cloudflare and framework evidence

- Current `wrangler.jsonc` binds `EMAIL`, `ARCH_DB`, `ARCH_UPLOADS_R2`, and
  `SUPPORT_INBOX`; no new binding is required.
- Cloudflare Email Service currently supports multiple `to`/`cc`/`bcc`
  recipients with a combined limit of 50 and reports unverified sender domains,
  restricted recipients, and over-limit recipients as explicit errors. Product
  code still applies a smaller allowlist/recipient cap.
- The current send binding has no sender/destination restriction attributes;
  application sender allowlisting remains mandatory. `archestimator.com` sender
  readiness is recorded in the existing Cloudflare migration evidence; no
  provider mutation is part of this plan.
- Browser WebSocket clients cannot attach Authorization headers to the upgrade;
  a short-lived signed URL token is acceptable when scoped and never a raw
  secret. Cloudflare recommends validating before unnecessary DO work and the
  hibernation API already used by `SupportInbox`.
- Next 16 installed docs confirm RSC-by-default, serializable client props,
  uncached route handlers by default, and Server Actions as mutation-oriented
  sequential dispatch. Repeated draft autosave/token refresh therefore use
  route handlers rather than turning reads/high-frequency writes into a broad
  Server Action boundary.

## 12. Execution and handoff

- Lead owns integration, source rereads, final diff, verification, and claim.
- Native agents are optional. If the runtime cannot supply installed
  `agent_type`, use the directive's sequential single-agent fallback; do not
  create fake independent-review evidence.
- Initial parallel read/write lanes may own only `UNIT-001`, `UNIT-003`, and
  `UNIT-005`. All later shared-file edits cross an explicit dependency barrier.
- Every handoff reports status, files, evidence, unrun tests, conflicts,
  cleanup, and next action. Worker summaries are indexes, not proof.
- On shared-file drift, stop that write, reread current source/diff, and let the
  designated owner integrate. Never overwrite unfamiliar work.

## 13. Resume and completion audit

Before each unit:

1. verify current `HEAD`, scoped status/diff, migration tail, and unit dependencies;
2. reread every owned shared file and all transitive consumers named here;
3. confirm the unit's test decision and exact non-test evidence;
4. update stale plan paths/assumptions locally rather than implementing around them.

Before terminal `ACHIEVED`, reconcile DATA-001..005, UX-001..003, SEC-001..002,
AC-001..009, DEC-AUTO-001..008, RISK-001..009, every unit, privacy/cleanup,
unrun tests, and external proof boundaries. Archive only after this audit and a
fresh manifest validation; leave no active duplicate pack.

## 14. Sources

- Current repository files named in §§2 and 6.
- Installed Next 16 docs:
  `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`,
  `15-route-handlers.md`, and `02-guides/server-actions.md`.
- Cloudflare Email Workers API:
  `https://developers.cloudflare.com/email-service/api/send-emails/workers-api/`.
- Cloudflare recipient/CC API:
  `https://developers.cloudflare.com/email-service/examples/email-sending/recipients/`.
- Cloudflare Durable Object WebSockets:
  `https://developers.cloudflare.com/durable-objects/best-practices/websockets/`.
- Cloudflare WebSocket auth guidance:
  `https://developers.cloudflare.com/agents/runtime/operations/cross-domain-authentication/`.
