# Admin Founder Homebase — Deferred, Blocked & Skipped Work

**Date:** 2026-07-16
**Author:** Claude (autonomous implementation pass)
**Plan pack:** `.ai/03_plans/2026-07-12/Archestimator-Admin-Founder-Homebase-Supplement-Plan-Pack`
**Scope of this pass:** UNIT-001 (F0) → UNIT-003 (F2) of the consolidated Admin roadmap.
**Execution ledger:** `…/Archestimator-Admin-Founder-Homebase-Supplement-Plan-Pack/LOOP_LEDGER.md`

This document is the single source of truth for everything **not** completed during the
2026-07-16 pass — what was deferred, what is blocked, and what was deliberately skipped —
with the reason and the unblock condition for each. It exists so nothing is silently lost.

---

## 0. At-a-glance status

| Unit | Slice | Status | Commit |
|------|-------|--------|--------|
| UNIT-001 | F0 — Safe Admin Foundation | ✅ **DONE** (all 10 defects) | `c350f8bf8` |
| UNIT-002 | F1 — Global search + grouped nav | 🟡 **PARTIAL** (search + nav; pins/recents/context-drawer deferred) | `c350f8bf8` |
| UNIT-003 | F2 — Today + Action Inbox | 🟡 **PARTIAL** (read-only Today; action-inbox state machine deferred) | `c29f2ea6e` |
| UNIT-004 | F3 — Customer Success + Customer 360 | ⬜ NOT STARTED | — |
| UNIT-005 | F4 — Support & Signals | ⬜ NOT STARTED | — |
| UNIT-006 | F5 — Release Center & Feature Delivery | ⬜ NOT STARTED | — |
| UNIT-007 | F6 — Operations & Data Quality | ⬜ NOT STARTED | — |
| UNIT-008 | F7 — Project/Estimate/Publication 360 | ⬜ NOT STARTED | — |
| UNIT-009 | F8 — Analytics, Financials, Weekly Review | ⬜ NOT STARTED (partly **blocked**) | — |
| UNIT-010 | F9 — Communications & Notification Manager | ⬜ NOT STARTED (partly **blocked**) | — |
| UNIT-011 | F10 — Advanced scale & AI | ⬜ **CONDITIONAL / GATED** | — |

**Verification posture for completed work:** `bunx tsc --noEmit` clean across every touched
file; `react-doctor` clean for all admin components I authored/edited. Full `next build` could
NOT be run green — see §7 (concurrent WIP breakage, unrelated to this work).

---

## 1. What WAS implemented (context for the gaps)

### F0 — Safe Admin Foundation (`c350f8bf8`)
- **F0-1** user-search SQL bind order (`users-repository.ts`)
- **F0-2** affected-row verification in `setUserAccountStatus` + action (`user-actions.ts`)
- **F0-3** platform-admin/founder lockout floor (`user-actions.ts`)
- **F0-4** real audit UI from `listAuditEvents` (`AdminAuditTable.tsx`, `audit/page.tsx`)
- **F0-5** relabeled admin-audit activity (`listAdminUserAuditActivity`, User-360)
- **F0-6** atomic + typed notification broadcast (`notification-actions.ts`)
- **F0-7** removed two fake `degraded:true` API routes
- **F0-8** honest health-probe levels (`health-probes.ts`, `admin/page.tsx`)
- **F0-9** removed inert maintenance-mode toggle (see §6 — decision)
- **F0-10** `countProfilesCreated` honest label

### F1 — Search + Nav (partial, `c350f8bf8`)
- Federated `⌘K` search over users/accounts/projects/estimates
  (`search-repository.ts`, `search-actions.ts`, `AdminCommandPalette.tsx`, `AdminHeader.tsx`)
- Sidebar regrouped to the pack IA over **existing routes only** (`AdminSidebar.tsx`)

### F2 — Today (read-only, `c29f2ea6e`)
- `/admin/today` attention view rendering open incidents as prioritized action items
  (`today/page.tsx`); added to sidebar Home group.

---

## 2. Deferred (deliberate, with rationale + unblock condition)

Deferred items are scoped, designed, and recorded — postponed for sequencing, risk, or
dependency reasons, not forgotten.

### 2.1 F1 — pins, recents, saved views, header env/status, context drawer, URL filter standard
- **Where:** pack `13-IMPLEMENTATION-ROADMAP.md` UNIT-002 deliverables; `04-IA` / `05-COMMAND-CENTER`.
- **Why deferred:** pins and saved views require **new schema** (admin pins/preferences tables).
  Header env/status and the context drawer are UI framework work with lower marginal founder
  value than search. The URL filter standard is cross-cutting and best done once multiple filtered
  list pages exist (F3+).
- **Unblock condition:** add `admin_pins` / `admin_preferences` migration; implement pins repo +
  action; then wire pins/recents into the command palette and header.
- **Code touchpoints:** new `src/lib/admin/pins-repository.ts`, `pins-actions.ts`; edit
  `AdminCommandPalette.tsx`, `AdminHeader.tsx`, `AdminSidebar.tsx`.

### 2.2 F2 — Action-Inbox state machine (snooze / resolve / dismiss / reopen)
- **Where:** pack UNIT-003; the core of "Action Inbox."
- **Why deferred:** this is the **crux** of F2 and the highest-risk logic in the whole pack —
  idempotent `ON CONFLICT` upsert + source-reconciliation (auto-resolve when an incident closes)
  + snooze-expiry reopen + preserve-operator-dismissed semantics. Rushing it under time/cost
  pressure would likely ship a subtly broken state machine (the classic "snoozed item never
  returns" or "resolved item reopens" bugs the pack's acceptance criteria explicitly forbid).
  It is the kind of logic that warrants `TEST_PROPOSAL`/`TEST_TASK` coverage, which is gated
  (see §6.3).
- **Design is settled** (recorded so it can be picked up cleanly):
  - Migration `0088_admin_action_items.sql` (see §3.1).
  - Derived key `source_kind:source_id` (UNIQUE) for idempotent upsert/dedupe.
  - Derivation runs on `Today` page load (on-demand; no cron required for v1).
  - Statuses: `open | snoozed | resolved | dismissed`.
  - Reconciliation: open-source present → upsert (refresh payload; reopen expired snooze;
    preserve resolved/dismissed); open-source absent → auto-resolve.
  - Initial sources: **incidents only** (the one concrete list source available — see §4.1).
- **Unblock condition:** a focused, tested increment (migration + `action-inbox-repository.ts` +
  `action-inbox-actions.ts` + `AdminActionInbox.tsx` client + rewrite `today/page.tsx` to derive
  + list). Estimated ~5 files. Recommend authoring the reconciliation SQL with a `TEST_PROPOSAL`.
- **Reserved migration slot:** `0088` (see §3.1).

---

## 3. Blocked (external dependency or missing prerequisite)

### 3.1 Migration application path — NOT a blocker (clarified)
- D1 SQL migrations live in `migrations/` and are applied via `wrangler d1 migrations apply`
  (tracked inside the D1 database itself). The `migrations` array in `wrangler.jsonc` is
  **Durable-Object class** migrations (`new_sqlite_classes`), unrelated to D1 SQL.
- **Action:** creating `migrations/0088_admin_action_items.sql` is sufficient; no `wrangler.jsonc`
  edit required. (Earlier flagged as a blocker — corrected after inspection.)

### 3.2 F2 support / feedback item derivation — blocked on missing list functions
- **Blocker:** only **aggregates** exist (`getSupportAggregateForPlatformAdmin`,
  `getFeedbackAggregateForPlatformAdmin` — counts). There are no list functions returning
  individual open support threads or individual feedback signals.
- **Unblock condition:** add `listOpenSupportThreads()` and `listRecentFeedback()` (or similar)
  in `support-aggregate.ts` / `feedback-aggregate.ts` (or new repos). Then register them as
  derivation sources in the F2 action-inbox registry.

### 3.3 F0-9 / F5/F6 — Maintenance-mode enforcement
- **Current state:** the inert `admin_maintenance_mode` toggle was **removed** (F0-9); the D1
  flag row is retained.
- **Blocker on real enforcement:** maintenance mode is cross-cutting (must gate estimates **and**
  projects **and** publications **and** uploads). Enforcing it at a single boundary (e.g., only
  estimate edits) would itself be a deception — "maintenance is on" but project creation still
  works.
- **Unblock condition:** F5 (Release Center) / F6 (Operations) build a single enforced mutation
  chokepoint (or a shared guard used by every write action) with admin exemption, then re-add the
  toggle wired to that guard. Recovery path for the removed UI is in the F0-9 ledger entry.

### 3.4 F8 — Financial / billing metrics — blocked on a real billing provider
- **Blocker:** pack contract DEC-AUTO-* forbids fabricating billing/revenue/attribution.
  No billing provider is connected.
- **Unblock condition:** select + connect a provider (Stripe etc.); build the provider-owned
  billing read adapter (customers, subscriptions, invoices, failed payments, refunds, disputes,
  MRR movement). Until then, F8 financial cards must render explicit "unavailable" states.

### 3.5 F8 — Aggregate traffic / acquisition — blocked on provider + privacy/consent boundaries
- **Unblock condition:** connect an analytics provider respecting consent/privacy; bridge
  acquisition→activation with explicit attribution limits.

### 3.6 F9 — Email channel — blocked on email-provider contracts
- **Blocker:** email is "visibly unavailable until provider authentication, suppression,
  delivery-event, unsubscribe, reputation, and reconciliation contracts exist."
- **Unblock condition:** provision an email provider and implement those contracts.

### 3.7 F10 — AI operator — conditional / gated
- **Condition:** the pack marks the AI operator (and recurring campaigns, advanced cohorts,
  provider analytics/deployment APIs, experiments, multi-operator assignments) as **conditional**,
  each requiring "its own measured need and success criterion." Not blocked by a bug — gated by
  product decision.

---

## 4. Skipped / out-of-scope (with rationale)

### 4.1 Grouped nav does not link not-yet-existing routes
- The pack's target IA names routes that don't exist yet (Communications sub-pages, Operations
  detail pages, Customer cohorts, etc.). Linking them would create dead links. **Skipped**: only
  existing routes are linked. New links are added as their pages ship in F3–F9.

### 4.2 F0-9 alternative — "enforce at one mutation boundary" — skipped
- The pack offered "enforce at the mutation boundary **or** remove the flag." Partial
  enforcement at one boundary was rejected as a new deception (see §3.3). Removal chosen.

### 4.3 Other agents' concurrent WIP — not touched
- During this pass the working tree carried substantial uncommitted WIP from **other agents** in:
  `src/components/workshop/**` (component-library, library/templates, publisher, proposals-page),
  `src/components/ui/status-badge.tsx`, `src/lib/ai/package-builder/**`, `AGENTS.md`, `CLAUDE.md`,
  and the `2026-07-14/Component-Variant-And-Estimate-Row-Audit` plan pack.
- **Skipped entirely** to honor the Multi-Agent Execution Directive ("one writer/integrator for
  shared files"). My commits (`c350f8bf8`, `c29f2ea6e`) stage **only** admin files + this pack's
  ledger/README — none of the other agents' files were swept in.

### 4.4 Pre-existing defects outside this pack — not fixed
- `react-doctor` reports issues in `AdminCharts.tsx` (eager `recharts`) and
  `estimate-system-map/EstimateSystemKnowledgeGraph.tsx` / `EstimateSystemMap.tsx` (rebuilt pure
  fn, chained iterations) — **pre-existing / another agent's active file**, not introduced here.
- `tsc` errors in `component-library/actions.ts` (`insertTemplate`, `unknown` types),
  `AddComponentModal.tsx` (`category` prop), and `EstimateSystemKnowledgeGraph.tsx`
  (`KnowledgeStatusBadge` missing) — **pre-existing concurrent WIP**, outside this pack's scope.

### 4.5 Tests — not authored/run
- The pack defaults every acceptance criterion to `test_requirement: NOT_REQUIRED`, and project
  policy gates test execution/edits behind an explicit `TEST_TASK`. No `TEST_TASK` was authorized
  for this pass. Evidence was source/diff review + `tsc` + `react-doctor`.

### 4.6 Multi-agent "formal leases" — not needed
- The directive reserves formal leases for actual concurrent contention. I was the sole writer in
  `/admin/**` + new files; no contention occurred, so no leases were taken.

---

## 5. Remaining unimplemented units (F3–F10) — overview

Each is a multi-file feature needing new schema, new repositories, and product shaping. None
were started.

- **F3 / Customer 360:** activation stage, rule-based health, customer attention queue,
  User/Account 360 completion, founder notes & follow-ups (needs notes/follow-ups + health
  schema; also fixes the missing-auth/profile silent-loss path).
- **F4 / Support & Signals:** priority/waiting/age, customer-context pane, internal notes vs
  customer-reply split, saved replies, pending/uncertain retry-claim queue, signal themes,
  close-loop queue. (Also unblocks §3.2.)
- **F5 / Release Center:** release records, typed go/no-go checks, rollback refs, post-deploy
  monitoring, feature-flag registry w/ owner/review/expiry, stale-flag action items.
- **F6 / Operations & Data Quality:** health-maturity labels, incident CRUD + timeline,
  jobs/queues/outbox status, DLQ backlog, Workers log freshness, integration-health registry,
  data-quality check registry + dry-run repair, backup/restore freshness, privacy-request
  intake/status/owner/due. (Also unblocks §3.3 maintenance mode.)
- **F7 / Project/Estimate/Publication 360:** search/detail routes, diagnostics, publication
  funnel, data-quality/action items, Workshop/Publisher links.
- **F8 / Analytics, Financials, Weekly Review, Cost/Capacity:** metric definitions, activation
  funnel, cohorts, 7/30-day scorecard, commercial scorecard (§3.4), weekly review, local
  cost/capacity.
- **F9 / Communications Manager MVP:** source-linked drafts, fixed audience snapshots, one-time
  publish, honest denominators, retract/correct/replace, preferences (§3.6 for email).
- **F10 / Advanced & AI:** conditional — see §3.7.

---

## 6. Decisions log (judgment calls worth revisiting)

- **D-1 (F0-9) Removed the maintenance-mode toggle rather than partially enforce.** Safe + honest;
  recoverable. Reversal: re-add `AdminMaintenanceModeToggle` when F5/F6 ships real enforcement.
- **D-2 (F2) Shipped Today as read-only first.** The action-inbox state machine is deferred to a
  tested increment (§2.2) rather than rushed.
- **D-3 (F1) Linked only existing routes in grouped nav.** No dead links; new links added per
  future unit.
- **D-4 (F0-7) Removed, did not wire, the two stub API routes.** Grep confirmed zero consumers;
  wiring would have added dead read paths. Re-add with real data if a consumer appears.
- **D-5 (F1 search) LIKE-wildcard characters are escaped.** Prevents user `%`/`_` from acting as
  wildcards; small correctness guard kept.
- **D-6 (concurrency) Committed my slices selectively on `main`.** Other agents had uncommitted
  WIP; selective `git add` of only admin files protected completed/verified work without sweeping
  in others' changes.

---

## 7. Verification limitations

- **Full `next build` not run green:** the working tree's concurrent WIP has pre-existing `tsc`
  errors (§4.4) that fail a full build. Those are **not** caused by this pass and are outside its
  scope. My files are `tsc`-clean in isolation.
- **No runtime/D1 verification:** admin reads/writes require the Cloudflare D1 binding, not
  available locally without a deploy. Per pack default (NOT_REQUIRED tests), evidence is
  source/diff + typecheck + static analysis.
- **`use-server` export shape unchanged:** the two edited `"use server"` files (`user-actions.ts`,
  `notification-actions.ts`) keep all-async exports, so no build-only export regression was
  introduced (cf. the known `use-server-exports-only-async` gotcha).

---

## 8. Recommended next steps (unblock sequence)

1. **F2 action-inbox state machine** (§2.2) — highest founder value; turns Today into the real
   inbox. Author migration `0088` + reconciliation with a `TEST_PROPOSAL`.
2. **Unblock §3.2** — add support/feedback list functions → register as F2 derivation sources.
3. **F3 Customer 360** — next dependency-closed product slice (notes/follow-ups also feed F2's
   "founder follow-ups" source).
4. **F4 → F6** in dependency order; F6 unblocks maintenance-mode re-enablement (§3.3).
5. **F8/F9** only after their provider blockers (§3.4–3.6) are resolved; **F10** on measured need.

---

*End of document. Maintained alongside `LOOP_LEDGER.md`; update when a deferred/blocked item is
resolved or a new one is identified.*
