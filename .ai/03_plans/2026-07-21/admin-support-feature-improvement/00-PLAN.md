# Admin Support Operations Console — Canonical Execution Plan

> Canonical execution artifact. Upgrade `/admin/support` from a
> conversation-list inbox into a comprehensive, industry-standard support
> operations console for a solo founder handling high email volume: real
> folder views (incl. **Sent** and **Drafts**), multi-From identities
> (`support@` + `philip@`), persisted drafts, reply-all/forward,
> **bidirectional in-app live chat** (user ↔ admin over the `SUPPORT_INBOX`
> Durable Object), and **triage** (labels / assignment / snooze / star) — all
> coherent with the current Next 16 / Workers / D1 / R2 / `SUPPORT_INBOX` DO /
> Cloudflare Email stack.

## Status tuple

`IMPLEMENTATION_READY / NOT_STARTED / NOT_EVALUATED / N/A / ACTIVE`

- **Suite version:** `2026-07-12`
- **Profile:** `standard` (UI + repository + one additive migration + one email-identity module; no destructive data migration)
- **Action ceiling:** `IMPLEMENT_LOCAL` (pack is `PLAN_ONLY` at authoring)
- **Exact next unit:** `UNIT-001` (folder/view query layer — surfaces Sent over already-persisted data, no schema change)
- **Lane justification (Plan Pack):** coordinated multi-owner work spanning the D1 repository boundary, Cloudflare Email send identity/deliverability, an additive migration, and admin UI; explicitly requested exhaustive plan.

## 1. Outcome and intent

Philip (solo technical founder) needs `/admin/support` to be an industry-standard
support console. Today it is a competent unified inbox but is missing three
capabilities a high-volume operator relies on:

1. **A Sent view** (and folder model generally).
2. **Multiple From identities** (send as `support@archestimator.com` or
   `philip@archestimator.com`).
3. **Persisted drafts** (compose survives reload / can be resumed).

Plus polish that fits the current model: reply-all / forward, unread + folder
counts, and keyboard-friendly triage.

The design is fix-forward on the existing D1-backed conversation/message ledger.
No parallel/compatibility layer, no SaaS helpdesk migration.

## 2. Root-cause finding — "Why is there no Sent folder today?"

**Outbound is persisted, not fire-and-forget. The gap is UI/query, not data.**

Source evidence:

- Outbound admin messages are written to D1 with full direction/transport
  metadata: `src/lib/admin/support-actions.ts:281` (`insertSupportMessageIfNewInD1`
  with `senderRole:"admin"`, `direction:"outbound"`, `transport:"email"|"in_app"`,
  `sendStatus`), and `createSupportEmailConversationAndSend` (`:466`) does the
  same for brand-new outbound email threads.
- The schema already models direction/transport: `migrations/0095_support_email_inbox.sql`
  adds `support_messages.direction ('inbound'|'outbound'|'internal')` and
  `transport ('in_app'|'email')` with a backfill that classified pre-existing
  admin rows as `outbound`.
- The list query has no folder/direction concept:
  `src/lib/repositories/support-conversations-d1.ts:277` `listSupportConversations`
  filters only by `status`, `channel`, `unreadOnly`, `search` — it selects
  **conversations**, never a Sent/outbound message view.
- The UI mirrors that: `src/components/admin/AdminSupportInbox.tsx` renders one
  "Inbox" list (`:353`) with channel chips (All/Email/In-app), an Unread toggle,
  and a `status` `<select>` (open/pending/resolved/archived). There is **no
  Sent/Drafts/Archive folder rail**, and no query for "messages I sent."
- Drafts do not exist as data at all. Compose state is ephemeral React state in
  `AdminSupportInbox`/`SupportRichComposer`; the only persisted "drafts" are
  R2-staged *attachment* blobs (`src/lib/email/support-outbound-attachments.ts`),
  materialized at send. There is no `support_drafts` table.

**Conclusion:** Archestimator inherited a *conversation-centric* (Front/Helpscout)
model, not a *folder-centric* (Gmail) one. "Sent" data is fully present; it is
simply never queried or shown. Fixing Sent is a thin view/query layer over
existing rows (UNIT-001/002). Drafts require one additive table (UNIT-005/006).

## 3. Current-state findings (file evidence)

### 3.1 Route + composition
- `src/app/admin/support/page.tsx` — RSC, `force-dynamic`. Loads conversations
  (limit 50), first thread's messages + attachments, saved replies, and
  `readSupportEmailConfig()` readiness; renders `AdminSupportInbox`.
- `src/components/admin/AdminSupportInbox.tsx` — `"use client"`. Two-pane grid
  (280px list + thread). Client-side filtering, TanStack Query lazy-load of a
  selected thread's messages (`/api/admin/support/conversations/[id]/messages`),
  optimistic reply/new-email, status change, mark-read. Compose via dynamic
  `SupportRichComposer`. New-email panel hardcodes "Sends from {supportFrom}
  only." (`:472`).

### 3.2 Data layer
- `src/lib/repositories/support-conversations-d1.ts` — Worker-safe D1 module
  (injected resolver). Conversation/message/attachment types + queries:
  `listSupportConversations`, `listSupportMessages` (newest-first, reversed),
  `insertSupportMessageIfNewInD1` (idempotent on `(conversation_id,
  client_message_id)` + `ingest_key`), `createExternalSupportConversationInD1`,
  status/read/send-status mutators, DSAR export/erase.
- `src/lib/repositories/support-conversations-repository.ts` — thin
  `server-only` wrapper that binds the D1 resolver and re-exports the module.
- Schema: `migrations/0042_support_conversations.sql` (original) →
  `migrations/0095_support_email_inbox.sql` (nullable `user_id`, external
  requester identity, `mailbox_address`, `routing_token`, message
  direction/transport/email-correlation, `support_message_attachments`, indexes,
  unique `routing_token` + `ingest_key` + `internet_message_id`). Latest
  migration in `migrations/` is `0095`; next is `0096`.

### 3.3 Server actions
- `src/lib/admin/support-actions.ts` — `"use server"`, all gated by
  `requireAdminContext()`. `sendSupportReply`, `createSupportEmailConversationAndSend`,
  `setConversationStatus`, `markSupportConversationRead`, `startConversation`
  (user widget), `getSupportMessageForAdmin`. Robust send lifecycle: pending →
  sent/send_failed, idempotent retry via `claimFailedSupportMessageRetryInD1`,
  audit events via `writeAdminAuditEvent`, `revalidatePath("/admin/support")`.
  **Single send identity:** `resolveSupportSendIdentity()` (`:123`) returns one
  `from` from `readSupportEmailConfig()`.

### 3.4 Email
- `src/lib/email/support-email-config.ts` — env-driven config: `supportMailbox`,
  `supportFrom`, `supportFromName`, inbound aliases, forwarding, size limits;
  `supportOutboundConfigured()` gates on `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED`
  + provider = cloudflare. Plus-address routing token helpers
  (`buildPlusAddress`, `extractPlusRoutingToken`).
- `src/lib/email/cloudflare-email-client.ts` + `transactional-email-client.ts` —
  `send_email` binding `EMAIL`; `sendEmail` adds a failure-rate circuit breaker.
  `from` is caller-provided or `CLOUDFLARE_EMAIL_FROM`.
- `src/lib/email/inbound-support-email.ts` — inbound Email Routing handler
  (feature-gated `inboundEnabled`, default off): PostalMime parse, routing-token
  / In-Reply-To / References threading, dedupe by `ingest_key`, R2 attachment
  storage with classification/quarantine, best-effort `SUPPORT_INBOX` fanout,
  optional forward.
- `src/lib/email/support-email-address.ts` — CRLF/header-injection-safe address
  + Message-ID + subject normalization (`formatReplySubject`, `sanitizeHeaderText`).

### 3.5 Realtime DO
- `src/lib/cloudflare/support-inbox.ts` — `SupportInbox` DO (bound in
  `wrangler.jsonc` as `SUPPORT_INBOX`, class `SupportInbox`, migration tag
  `v2-admin-dashboard`). WebSocket fanout per conversation, room-token auth.
  Inbound handler notifies it best-effort; the admin UI currently does **not**
  subscribe (it uses TanStack Query + optimistic updates + `revalidatePath`).

### 3.6 API routes
- `src/app/api/admin/support/conversations/route.ts`,
  `conversations/[id]/messages/route.ts` (admin-gated, `no-store`, marks read),
  `attachments/[id]/route.ts`, `uploads/route.ts`.

### 3.7 Explicit answers required by the mission
- **Why no Sent folder?** UI/query gap over already-persisted outbound rows (see §2).
- **What outbound is persisted vs fire-and-forget?** All admin sends are
  persisted in `support_messages` (with `send_status` lifecycle + audit); nothing
  is fire-and-forget. Only transient compose text is unpersisted.
- **What From-identity model exists?** A single env-configured identity
  (`supportFrom`/`supportFromName`); message rows already carry per-message
  `from_address`/`from_name` columns (unused for multi-identity today).
- **In-app vs email split?** First-class: `support_conversations.channel` +
  `support_messages.transport`. In-app threads originate from the user widget
  (`startConversation` → `/workshop/feedback`); email threads via admin compose
  and (gated) inbound routing.

## 4. Goals / Non-goals

**Goals (this pack):**
- G1 Sent + folder views (Inbox / Sent / Drafts / Archive / All) over the ledger.
- G2 Multi-From identity (`support@`, `philip@`), server-validated, UX picker.
- G3 Persisted drafts (autosave, resume, discard).
- G4 Reply-all / forward + unread/folder counts + keyboard triage.
- G5 **In-app live chat**: bidirectional realtime user↔admin over the
  `SUPPORT_INBOX` DO with D1 persistence; **both** the admin console and the user
  widget subscribe; unread + thread continuity; presence/typing best-effort.
- G6 **Triage**: labels, self-assignment, snooze, star as additive columns folded
  into the folder predicate + rail (promoted from former non-goal N1).

**Non-goals (documented, not built here unless Philip asks):**
- N2 Enabling inbound email routing in production (code-ready, gated off;
  separate ops task).
- N3 Any SaaS helpdesk (Intercom/Front) migration.

(Former **N1** — labels/assignment/snooze/star — is now **in scope** as G6.
Former **N4** — "no realtime DO subscription in admin UI" — is **inverted**:
admin + user realtime DO subscription is now **REQUIRED** for chat (G5).)

## 5. Industry-standard grounding (fit to D1 + Workers + CF Email)

Solo-founder shared inboxes (Help Scout, Front, Gmail, Linear-style triage)
converge on: (a) a small folder/view rail with live counts; (b) one composer
supporting reply / reply-all / forward with a clear **From** selector;
(c) Sent = your outbound authored messages; (d) Drafts that survive reload;
(e) keyboard triage (j/k navigate, e archive, r reply). Archestimator already
has threading, status, search, attachments, saved replies, and idempotent send —
so the plan adds only the missing view/identity/draft primitives rather than a
rewrite. Gmail "Sent" semantics map cleanly onto `direction='outbound'`.

## 6. Requirements → units → evidence

| REQ | Role | Title | Units | Criterion |
|-----|------|-------|-------|-----------|
| DATA-001 | CORE | Folder/view query layer exposes Sent (and Inbox/Drafts/Archive/All) over persisted messages, with counts | UNIT-001, UNIT-002 | AC-001 |
| DATA-002 | CORE | Multi-From identity model: send as any verified identity | UNIT-003, UNIT-004 | AC-002 |
| DATA-003 | CORE | Draft persistence (create/update/list/discard) | UNIT-005, UNIT-006 | AC-003 |
| UX-001   | CORE | Console coherence: folder rail + counts, reply-all/forward, keyboard triage | UNIT-002, UNIT-007 | AC-004 |
| SEC-001  | CORE | From-identity is server-validated against a verified allowlist; header-injection safe; admin-gated; deliverability documented | UNIT-003, UNIT-004 | AC-005 |
| DATA-004 | CORE | In-app live chat transport: user↔admin messages persist in D1 (`transport='in_app'`) and fan out over `SUPPORT_INBOX`; both UIs subscribe | UNIT-008 | AC-006 |
| SEC-002  | CORE | Chat realtime auth: room tokens are minted only after server-side participant authorization (admin-gated or owning user), scoped to `conversationId`, TTL-bounded, fail-closed | UNIT-008 | AC-007 |
| UX-002   | CORE | Chat UX on both sides: message list, composer, unread, live receive, thread continuity (presence/typing best-effort) | UNIT-008 | AC-008 |
| DATA-005 | CORE | Triage metadata (labels / assignee / snooze / star) as additive columns folded into folder query + counts | UNIT-009 | AC-009 |
| UX-003   | CORE | Triage UI: label chips, assign-to-me, snooze menu, star toggle; Starred/Snoozed rail views | UNIT-009 | AC-009 |

## 7. Dependency order & phases

- **Phase 1 (MVP — Sent visible):** UNIT-001 → UNIT-002. Mergeable alone; makes
  Sent/folders work with zero schema change.
- **Phase 2 (Identities):** UNIT-003 → UNIT-004. Independent of Phase 1.
- **Phase 3 (Drafts):** UNIT-005 → UNIT-006. Independent of Phases 1–2 (additive migration `0096`).
- **Phase 4 (Console polish):** UNIT-007 (depends on UNIT-002 folder rail).
- **Phase 5 (Live chat):** UNIT-008 (depends on UNIT-004/006/007 — serialized
  after the shared-file editors: `support-actions.ts`, `AdminSupportInbox.tsx`,
  `SupportRichComposer.tsx`). Adds new files (token route + WS client), rewrites
  the unowned `SupportChatWidget.tsx`. No schema change.
- **Phase 6 (Triage):** UNIT-009 (depends on UNIT-001/002/008). Additive
  migration `0097`; folds triage into the repository folder predicate + rail.

Parallelizable lanes: {UNIT-001}, {UNIT-003}, {UNIT-005} can start concurrently
(disjoint file ownership). UNIT-008 and UNIT-009 run in later serialized phases
to preserve one-writer ownership of the shared admin files. `next_unit = UNIT-001`.

## 8. Architecture / data-model proposals

### 8.1 Sent + folders (UNIT-001/002) — no schema change
Extend `listSupportConversations` with a `folder` param:
- `inbox` → conversations with the latest message `direction='inbound'` OR
  `unread_for_admin=1` (needs a reply).
- `sent` → conversations that have ≥1 `direction='outbound'` admin message
  (`EXISTS (SELECT 1 FROM support_messages m WHERE m.conversation_id=c.id AND m.direction='outbound')`),
  ordered by latest outbound `created_at`.
- `archive` → `status='archived'`.
- `drafts` → conversations/standalone drafts with a saved draft (Phase 3).
- `all` → current behavior.
Add derived per-conversation fields via correlated subqueries (`last_direction`,
`has_outbound`, `has_draft`) and a counts query
(`listSupportFolderCounts`) returning `{inbox, sent, drafts, archive, unread}`
in one batched call to avoid N+1. Existing indexes
(`idx_support_msg_conv (conversation_id, created_at ASC)`) cover the subqueries;
if the `sent` predicate is hot, add `idx_support_msg_direction
(conversation_id, direction)` in the Phase-3 migration.

### 8.2 Multi-From identities (UNIT-003/004)
New `server-only` module `src/lib/email/support-send-identities.ts`:
- `SupportSendIdentity = { id, address, name, mailbox, isDefault }`.
- Registry from config: default `support@archestimator.com` +
  `ARCHESTIMATOR_SUPPORT_SEND_IDENTITIES` (comma list, e.g.
  `philip@archestimator.com|Philip Lewis`). All must be on a verified sending
  domain; `resolveSupportSendIdentity(id?)` returns the default when omitted and
  **throws on unknown id** (fail-closed).
- Actions (`sendSupportReply`, `createSupportEmailConversationAndSend`) accept
  `fromIdentityId`; persist chosen `from_address`/`from_name` on the message
  (columns already exist) and set the conversation's `mailbox_address` to that
  identity's mailbox for reply routing. Reply-To keeps the plus-addressed
  routing token on the identity mailbox (`buildPlusAddress`) so inbound
  correlation still works.
- UI: From `<select>` in `SupportRichComposer` header (reply + new-email),
  defaulting to the thread's last-used identity or the registry default.

### 8.3 Drafts (UNIT-005/006) — additive migration `0096`
`support_drafts` table:
```
id TEXT PK, admin_user_id TEXT NOT NULL, conversation_id TEXT NULL
  REFERENCES support_conversations(id) ON DELETE CASCADE,
kind TEXT CHECK(kind IN ('reply','new_email')), to_json TEXT, cc_json TEXT,
subject TEXT, body_html TEXT, body_text TEXT, from_identity_id TEXT,
draft_attachments_json TEXT, updated_at TEXT NOT NULL, created_at TEXT NOT NULL,
UNIQUE(admin_user_id, conversation_id, kind)  -- one live reply draft per thread
```
Repository CRUD (`upsertSupportDraft`, `listSupportDrafts`, `getSupportDraft`,
`deleteSupportDraft`), admin-gated. Compose autosaves (debounced) via a server
action; sending clears the matching draft. Drafts folder lists standalone +
per-thread drafts.

### 8.4 Reply-all / forward (UNIT-007)
`cc_json` already exists on messages. Add `cc` to the send actions + composer;
forward = new outbound message to an arbitrary recipient that copies body +
optionally attachments and preserves `References`/`In-Reply-To` when staying in
thread (or starts a new thread when forwarding out). Reuse
`buildThreadingHeaders`, `formatReplySubject`, `sanitizeHeaderText`.

### 8.5 In-app live chat (UNIT-008) — no schema change
Transport model (grounded in current schema):
- `support_messages.transport` = per-message channel: `in_app` (chat) | `email`.
- `support_conversations.channel` = primary conversation channel; drives reply
  routing in `sendSupportReply` (email branch vs in_app branch).
- Chat = `transport='in_app'` messages persisted in D1 (source of truth) and
  fanned out over `SUPPORT_INBOX` (ephemeral). Email threads unchanged.
- Smallest coherent model: chat is enabled on `channel='in_app'` conversations
  (the widget threads). **Chat-on-an-email-thread is a documented later
  extension**, not built in UNIT-008.

Why no migration: DO `SUPPORT_INBOX` (`src/lib/cloudflare/support-inbox.ts`)
already does per-conversation WebSocket fanout with room-token auth;
`support_messages(transport='in_app')` + idempotent `insertSupportMessageIfNewInD1`
already persist chat; and `migrations/0095` already has **both**
`support_conversations.unread_for_admin` and `unread_for_user`.

Backbone:
1. Room-token endpoint (new route) mints a short-TTL `issueRealtimeRoomToken`
   ({ sub, topic=conversationId }) ONLY after server-side authorization:
   admins via `requireAdminContext()`; the owning user when
   `support_conversations.user_id === session.userId`. Fail-closed.
2. New user action `sendSupportUserMessage({ conversationId, body, clientMessageId })`
   — ownership-checked, persists `direction='inbound', transport='in_app'`
   (idempotent), sets `unread_for_admin=1`, then best-effort DO fanout.
3. Admin `sendSupportReply` (in_app branch) + `sendSupportUserMessage` both
   POST `{type:"fanout", message}` to `env.SUPPORT_INBOX.get(idFromName(id))`
   after the D1 write. D1 remains source of truth; fanout failure is non-fatal.
4. Client `support-inbox-client.ts` (thin, adapted from
   `collaboration-room-client.ts`): connect → authorize(token) → on("message").
   Both admin `AdminSupportInbox` and the user widget backfill from D1 on load,
   subscribe for live receive, and reconcile by `client_message_id`.
5. Read markers: reuse `unread_for_admin` / `unread_for_user`
   (a user-side read mutator mirrors the admin read mutator).

No new npm dependency is justified: there is no React chat library or websocket
dep in `package.json`; the existing DO WebSocket + a thin client is sufficient.

### 8.6 Triage: labels / assignment / snooze / star (UNIT-009) — additive migration 0097
`support_conversations` additive nullable columns:
```
labels_json TEXT, assignee_user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
snoozed_until TEXT, starred_for_admin INTEGER NOT NULL DEFAULT 0
```
Fold into `listSupportConversations` filters (label, assignee, starred) and the
folder rail (Starred + Snoozed views; snoozed hidden from Inbox until due).
Indexes: `idx_support_conv_assignee (assignee_user_id)`, `idx_support_conv_snooze
(snoozed_until)`. Rollback = drop columns (local additive).

## 9. Triage (labels / assignment / snooze / star) — in scope (UNIT-009)
Promoted from former non-goal N1 per Philip's decision. Design lives in §8.6:
one additive migration (`0097`) adds nullable `labels_json`, `assignee_user_id`,
`snoozed_until`, `starred_for_admin` and folds them into the folder predicate +
rail. No redesign required; local rollback = drop the added columns/indexes.

## 10. Cloudflare Email Sending / Routing implications (ops notes — no creds)

- **Binding:** `wrangler.jsonc` `send_email: [{ name: "EMAIL" }]` with **no
  `destination_address`** → the Worker may send to arbitrary recipients (not
  locked to a single notify address). This is what enables the support console.
- **Sender verification:** Cloudflare Email Workers require the `from` address to
  be on a **domain verified for sending** in the account. `archestimator.com` is
  already the custom route domain. Both `support@` and `philip@` are same-domain,
  so multi-From needs **domain-level** outbound setup, not per-address
  verification.
- **Deliverability (SPF/DKIM/DMARC):** for either identity to land in inboxes,
  `archestimator.com` needs SPF authorizing the CF sender, DKIM signing, and an
  aligned DMARC policy. This is DNS/provider onboarding — an **external ops
  boundary**, not a code change. The code path already treats provider
  acceptance as "accepted for sending, not final delivery proof" (UI copy at
  `AdminSupportInbox.tsx:282`).
- **Reply routing:** keep Reply-To = `mailbox+<routing_token>@archestimator.com`
  so inbound (when enabled) correlates replies to the right conversation
  regardless of which From identity sent.
- **Cost posture:** stays on bundled/free tier; no paid add-on. No new binding
  required (reuse `EMAIL`). `bun run cf:typegen` unaffected (no binding change).
- **Resolved (evidence, not a Philip question): `philip@archestimator.com` is
  READY at the Cloudflare send boundary.** Evidence:
  `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-email-readiness.md`
  (generated `2026-07-20`): "Production email ready: yes"; "Cloudflare Email
  Sending domain | PASS | archestimator.com"; captured `wrangler email sending
  list` shows zone `archestimator.com` `enabled: yes`. Cloudflare Email Sending
  onboards a **domain**, not individual mailboxes — there is no per-address
  verification step, so `support@` and `philip@` are both sendable on the verified
  domain. `send_email: [{ name: "EMAIL" }]` has **no `destination_address`** lock.
  → Ship the registry with `philip@` **included** (default `support@`) and
  fail-closed validation (`resolveSupportSendIdentity` throws on unknown id; every
  address passes `normalizeEmailAddress`). The DMARC ramp (`p=none` → quarantine →
  reject per `docs/support-email-operator-runbook.md`) is an **ops posture note,
  not a send gate**; runtime send stays gated by the address-agnostic
  `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED` + provider=cloudflare flags.

## 11. File ownership map (one writer per mutable file)

| File | Owner unit | Access |
|------|-----------|--------|
| `src/lib/repositories/support-conversations-d1.ts` | UNIT-001 (write) | UNIT-005 read |
| `src/app/admin/support/page.tsx` | UNIT-002 (write) | — |
| `src/components/admin/AdminSupportInbox.tsx` | UNIT-002 (write) | UNIT-004/006/007 write **serialized after 002** |
| `src/app/api/admin/support/conversations/route.ts` | UNIT-002 (write) | — |
| `src/lib/email/support-send-identities.ts` (new) | UNIT-003 (write) | UNIT-004 read |
| `src/lib/email/support-email-config.ts` | UNIT-003 (write) | — |
| `src/lib/admin/support-actions.ts` | UNIT-004 (write) | UNIT-006/007 write **serialized after 004** |
| `src/components/admin/support/SupportRichComposer.tsx` | UNIT-004 (write) | UNIT-006/007 serialized |
| `migrations/0096_support_drafts.sql` (new) | UNIT-005 (write) | — |
| `src/lib/repositories/support-drafts-d1.ts` (new) | UNIT-005 (write) | UNIT-006 read |
| `src/app/api/admin/support/drafts/route.ts` (new) | UNIT-006 (write) | — |
| `src/app/api/support/realtime-token/route.ts` (new) | UNIT-008 (write) | — |
| `src/lib/cloudflare/support-inbox-client.ts` (new) | UNIT-008 (write) | — |
| `src/components/support/SupportChatWidget.tsx` | UNIT-008 (write — rewrite) | — |
| `migrations/0097_support_triage.sql` (new) | UNIT-009 (write) | — |

**Serialization rule:** `AdminSupportInbox.tsx`, `support-actions.ts`, and
`SupportRichComposer.tsx` are edited by multiple units — UNIT-002/004 land first;
UNIT-006/007 reread before editing (Directive §Ownership). **UNIT-008** then edits
`support-actions.ts` (add `sendSupportUserMessage`, DO fanout on in_app sends,
user read marker) and `AdminSupportInbox.tsx` (subscribe + live receive) **after
UNIT-004/006/007**, and owns the two new files outright + rewrites the unowned
`SupportChatWidget.tsx`. **UNIT-009** edits `support-conversations-d1.ts` after
UNIT-001, `page.tsx` after UNIT-002, and `AdminSupportInbox.tsx` after UNIT-008.
No concurrent writers on any mutable file.

## 12. Orchestration (Multi-Agent-Execution-Directive)

- Lead owns the Task Contract + integration + final claim.
- Parallel lanes at kickoff (disjoint files): **Lane A** UNIT-001, **Lane B**
  UNIT-003, **Lane C** UNIT-005. Barrier before shared-file units:
  UNIT-002 (after A), UNIT-004 (after B), UNIT-006 (after C, and after 004 for
  composer), UNIT-007 (after 002/004).
- Each worker returns the Directive handoff shape
  (`COMPLETE|PARTIAL|FAILED|CANCELLED`, files touched, evidence, gaps). Lead
  verifies artifacts, not summaries.
- Assignment IDs = UNIT IDs. Fallback: single-agent sequential in DAG order
  (UNIT-001→002→003→004→005→006→007→008→009) if orchestration unavailable.
- **Later serialized phases:** UNIT-008 (Phase 5, after 004/006/007) then
  UNIT-009 (Phase 6, after 001/002/008) — both touch shared admin files, so they
  run after their editors to keep one writer per file.

## 13. Risks, blast radius, rollback

- **RISK-001 (UNIT-001):** folder predicate mismatch or N+1 count queries.
  Mitigation: correlated `EXISTS` subqueries + one batched counts call; verify
  against existing indexes; behavior falls back to `all` on unknown folder.
- **RISK-002 (UNIT-003):** sending from an unverified identity / poor
  deliverability. Mitigation: fail-closed registry (unknown id throws), keep
  `philip@` out of the allowlist until DNS verified; deliverability is an
  external boundary.
- **RISK-003 (UNIT-005):** draft table growth / duplicate drafts. Mitigation:
  `UNIQUE(admin_user_id, conversation_id, kind)` upsert; discard-on-send;
  additive migration (no data rewrite) → rollback = drop table.
- **RISK-004 (UNIT-007):** forward/reply-all breaks threading headers or leaks
  Cc. Mitigation: reuse `buildThreadingHeaders`/`sanitizeHeaderText`; new-thread
  forward gets fresh routing token.
- **RISK-005 (UNIT-008):** realtime auth leakage — a user subscribes to another
  user's conversation. Mitigation: mint room tokens ONLY after a server-side
  ownership/admin check, scoped to `conversationId`, short TTL, fail-closed;
  never trust a client-supplied topic.
- **RISK-006 (UNIT-008):** DO/D1 divergence — a chat message is lost if fanout
  fails. Mitigation: D1 is the source of truth (persist first), fanout is
  best-effort and non-fatal, clients backfill from D1 on load/reconnect and
  dedupe by idempotent `client_message_id`.
- **RISK-007 (UNIT-009):** triage columns break the folder predicate or counts.
  Mitigation: nullable additive columns + indexes; compose with existing
  predicates; snoozed hidden from Inbox only until due; rollback = drop columns.
- **Blast radius:** admin-only authenticated surface plus the authenticated
  in-app user widget; no public routes; no destructive migration; existing
  send/idempotency/audit paths preserved. Rollback per phase = revert that
  phase's files (+ drop `0096` for Phase 3 drafts / `0097` for Phase 6 triage).

## 14. Validation & evidence plan (Archestimator test gate)

Default **`NOT_REQUIRED`** for all criteria — evidence is source/diff review +
`bun run type-check` + `bun run lint` + migration inspection + narrow local D1
dry-run. Tests are **user-gated**; none run without Philip's `TEST_TASK`.

Recorded **`TEST_PROPOSAL`s** (named risk + exact command, NOT executed unless
authorized):
- SEC-001: from-identity allowlist rejects unknown/unverified senders and
  header injection — proposed `bun x vitest run tests/vitest/support-send-identities.test.ts`.
- DATA-003: draft upsert idempotency (one live reply draft per thread) —
  proposed `bun x vitest run tests/vitest/support-drafts-d1.test.ts`.
- DATA-001: Sent predicate returns exactly outbound-bearing threads — proposed
  `bun x vitest run tests/vitest/support-folders.test.ts`.
- SEC-002 (chat auth): realtime room token is refused for a non-participant and
  scoped/TTL-bounded — proposed `bun x vitest run tests/vitest/support-realtime-token.test.ts`.
- DATA-004 (chat transport): in-app message persists once (idempotent) then fans
  out; fanout failure is non-fatal — proposed
  `bun x vitest run tests/vitest/support-chat-transport.test.ts`.
- DATA-005 (triage): folder predicate composes label/assignee/star + snooze
  visibility — proposed `bun x vitest run tests/vitest/support-triage-folders.test.ts`.

Applicable gates: GATE-DATA-01 (D1 additive migration + authz + idempotency —
UNIT-005/008/009), GATE-SEC-01 (send identity + header safety + admin gate +
chat room-token scoping — UNIT-003/004/008), GATE-NEXT-01 (RSC/action
boundaries), GATE-UX-01 (folder + chat states, keyboard/focus — browser proof
only if Philip authorizes). `DESIGN.md` applies (authenticated route) as
alpha guidance: reuse `src/components/ui/*`, 12px max, xs radius, neutral palette.

## 15. Resolved decisions (no open questions)

All prior open questions are resolved — none require Philip mid-implementation:

1. **Gmail-style Sent — SETTLED.** "Sent = every outbound message"
   (`direction='outbound'`) is the confirmed default, with status-based Archive.
   Reversible, but treated as a locked decision, not a question.
2. **`philip@archestimator.com` outbound — RESOLVED from evidence: READY.** See
   §10. Ship the identity registry with `philip@` included + fail-closed
   validation; DMARC ramp is an ops posture note, not a send gate.
3. **Labels / assignment / snooze / star — IN SCOPE now** (G6 / UNIT-009),
   promoted from former non-goal N1.
4. **Live chat — IN SCOPE now** (G5 / UNIT-008); the former "no admin realtime DO
   subscription" non-goal (N4) is inverted — both sides subscribe.

Chat is scoped to `channel='in_app'` conversations (smallest coherent model);
chat-on-an-email-thread is documented as a later extension (§8.5). All other
choices — folder predicates, identity registry shape, draft schema, triage
columns — are resolved in-plan as reversible pre-beta decisions.
