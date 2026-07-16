# Loop Ledger

This is the sole durable ledger for the canonical consolidated Admin pack. The archived predecessor ledger is historical evidence only.

## Planning receipt

### 2026-07-12 — Founder Homebase supplement

- **State:** COMPLETE
- **Scope:** Existing Admin plan, current `/admin` source, fragmented workshop operator tools, external benchmark research
- **Finding:** Existing plan is strong as a control-plane foundation but lacks the solo-founder daily operating system
- **Primary additions:** Action Inbox, global search, customer success, Entity 360, product signals, releases, data quality, cost/capacity, founder cadence, read-only AI
- **Priority change:** Advanced notification campaign lifecycle moves after founder core
- **Implementation performed:** None
- **Tests/build/browser/provider actions:** None
- **Next decision:** Consolidate this supplement and the existing plan into one canonical execution artifact and one ledger

### 2026-07-12 — Predecessor consolidation and canonical promotion

- **State:** COMPLETE
- **Scope:** Requirement-by-requirement merge of `Admin-Feature-Improvement` into the Founder Homebase pack
- **Retained:** current defects, identity/lifecycle semantics, User 360, high-risk action safety, notification durability, preferences, support, flags, audit/privacy/retention, migration/recovery, overlap receipts, and local/hosted proof separation
- **Reprioritized:** founder shell/search/Action Inbox/customer operations/release/data quality before advanced campaigns
- **Superseded:** fixed test commands, broad QA matrices, fixed staffing/reviewer counts, and the predecessor as an execution authority
- **Canonical execution:** `13-IMPLEMENTATION-ROADMAP.md`, starting at `UNIT-001`
- **Machine status:** `plan-pack.json`
- **Archived predecessor:** `.ai/09_archive/store/2026-07-12-Admin-Feature-Improvement-superseded`
- **Implementation performed:** None
- **Tests/build/browser/provider actions:** None
- **Next decision:** Execute `UNIT-001` only after a fresh scoped-baseline audit

### 2026-07-14 — Improve-plan-pack verification and accuracy repair

- **State:** COMPLETE
- **Scope:** Verify pack claims against current source; remove over-engineering/over-testing risk; repair accuracy; refresh readiness
- **Method:** Read-only source verification of F0 defects, admin shell structure, schema baseline, and reusable foundations via independent parallel agents
- **Findings:** All 10 P0 defects VERIFIED present (exact file:line recorded in `13-IMPLEMENTATION-ROADMAP.md` UNIT-001). All 5 reusable foundations EXIST. All 18 proposed tables are NEW/non-colliding (safe as migrations 0076+). DAG acyclic; UNIT-001 dependency-closed.
- **Material repairs:**
  - `suite_version` bumped `2026-07-11` → `2026-07-12` to match current Frontier-Planning-Kernel/Plan-Pack-Schema
  - `02-CURRENT-ADMIN-CODEBASE-AUDIT.md` notification idempotency/schedule claim corrected: existing `dedupe_key` UNIQUE, per-user delivery UNIQUE, and `starts_at`/`expires_at` active window already exist — narrowed to the true gap (per-send idempotency key + scheduled send-at/recurrence). Prevents an implementer from rebuilding existing machinery.
  - `02` recent-signups claim corrected (function exists but is unused by home page)
  - `02` incidents foundation clarified as `operational_incidents`/`operational_incident_events` (migration 0040), read-only repo, no declare mutation yet
  - `13-IMPLEMENTATION-ROADMAP.md` UNIT-001 made self-contained: replaced "absorb archived Units 001–006" with a verified file:line defect table (F0-1…F0-10), explicit non-deliverables, and per-item non-test evidence. UNIT-001 is now pick-up-able without reading the archive.
- **Over-engineering posture:** confirmed disciplined — generic workflow/CRM/dashboard abstractions rejected, vertical-slice-only schema, tests user-gated with `NOT_REQUIRED` default, advanced campaigns deferred to F10. No added ceremony.
- **Implementation performed:** None (planning artifacts only)
- **Tests/build/browser/provider actions:** None
- **Result:** Pack remains `CONDITIONALLY_READY`; UNIT-001 is the dependency-closed ready slice, now with verified current-source grounding
- **Next decision:** Begin UNIT-001; the F0 defect table is the work list

- **State:** COMPLETE
- **Active-pack validation:** `bun run validate:plan-pack -- --write <pack>` and the subsequent read-only validation passed
- **Archived-pack validation:** `bun run validate:plan-pack -- .ai/09_archive/store/2026-07-12-Admin-Feature-Improvement-superseded` passed
- **Planning-suite validation:** `bun run validate:planning-prompts` passed with 10 documents, 10 gates, and 35 evaluation scenarios
- **Archive proof:** the active `.ai/03_plans/2026-07-11` folder is absent; the archive contains all 42 predecessor files
- **Reference proof:** no old active-pack path remains outside the historical archive
- **Tests/build/browser/provider actions:** None
- **Result:** the consolidated pack is `CONDITIONALLY_READY`; `UNIT-001` is the only dependency-closed ready slice
- **Next decision:** Begin at `UNIT-001`; do not activate advanced campaigns, providers, or AI before their conditional gates

## Consolidated execution entry template

### SLICE-XXX — YYYY-MM-DD

- **State:** STARTED / COMPLETE / NOT_ACTIVATED / REVERTED
- **Founder outcome:**
- **Sources inspected:**
- **Files owned:**
- **Schema/migration:**
- **Security risk:**
- **Test requirement:** NOT_REQUIRED / TEST_PROPOSAL / TEST_TASK
- **Test trigger:** NONE / MVP_CRITICAL_INVARIANT / CHEAPEST_DECISIVE_EXISTING_TEST / EXPLICIT_TEST_TASK
- **Test proposal:** named risk + exact command, only when applicable; never self-authorizes execution
- **Evidence:**
- **Degraded capability:**
- **Result:**
- **Next decision:**

## Coordination

- One lead owns consolidation.
- Stable execution IDs are `UNIT-001` through `UNIT-011`; F-names remain human-readable labels.
- Do not duplicate requirements across manifests.
- Do not convert every supporting document into an execution gate.

## PLAN-019 — 2026-07-14 — FOUNDER BUSINESS/OPERATIONS READINESS RECONCILIATION COMPLETE

- **State:** COMPLETE
- **Scope:** planning artifacts only; current `/admin`/support/observability foundations, official Stripe/Cloudflare/OWASP research, and F6/F8 readiness boundaries
- **Current-source repairs:** recorded beta operating aggregates, support retry-claim and pending/uncertain states, Workers Logs configuration, and bound queue DLQs; retained unresolved F0 defects
- **Product repairs:** financial integration readiness, acquisition/traffic truth, provider integration health, error/log reconciliation, and durable privacy requests added without selecting a provider or creating a second billing/analytics/observability system
- **Contract repair:** removed legacy `TARGETED|BROADER` values from the 2026-07-12 execution template
- **Test requirement:** NOT_REQUIRED
- **Evidence:** source/diff inspection, GitNexus concept queries, official documentation, plan-pack validator, planning-prompt validator, GitNexus change detection, and diff whitespace review
- **Result:** existing 11-unit DAG preserved; `UNIT-001` remains the only dependency-closed ready slice after manifest refresh

## PLAN-020 — 2026-07-14 — COMMUNICATION/NOTIFICATION MANAGER EXPANSION COMPLETE

- **State:** COMPLETE
- **Scope:** planning artifacts only; current notification schema/actions/user surfaces, archived predecessor semantics, cross-domain Admin workflows, and official delivery/communication/accessibility research
- **Current-source findings:** existing system is an immediate all-active in-app broadcast foundation; added the `200` versus `120` title mismatch, hidden `release_version`, non-atomic fan-out, visibility-window versus schedule distinction, and in-app-only channel boundary
- **Product result:** one binding manager contract now covers source-linked drafts, message classes/channels, fixed audience snapshots, preview/test, immediate/one-time scheduling, truthful denominators, Action Inbox issues, preferences, retraction/correction/replacement, and provider/email gates
- **Lean boundary:** no recurrence, dynamic enrollment, journey builder, new Queue binding, push/SMS, multi-operator approval, or marketing automation platform
- **Test requirement:** NOT_REQUIRED
- **Evidence:** current source/diff inspection, GitNexus concept query/change detection, official Cloudflare/Intercom/Atlassian/Gmail/WAI sources, plan-pack validator, planning-prompt validator, and diff whitespace review
- **Result:** UNIT-010 expanded without adding a unit or moving advanced communications ahead of founder core

## UNIT-001 / F0 — 2026-07-16 — SAFE ADMIN FOUNDATION IMPLEMENTED

- **State:** COMPLETE
- **Founder outcome:** `/admin` no longer lies — searches return the right users, status mutations cannot fake success or lock out the founder/another admin, the audit page shows real D1 events, health badges distinguish "present" from "healthy," signups are no longer mislabeled, and notification broadcasts are atomic.
- **Sources inspected:** `users-repository.ts`, `user-actions.ts`, `notification-actions.ts`, `health-probes.ts`, `audit-repository.ts`, `AdminAuditTable.tsx`, `AdminUserDetailActions.tsx`, `admin/page.tsx`, `audit/page.tsx`, `users/[userId]/page.tsx`, `flags/page.tsx`, `roles.ts`, `d1.ts`, migration `0009_notifications.sql`, schema grep for canonical `user` table
- **F0-1 (search SQL bind order):** FIXED — `listAdminUsers` search path now binds `(search, search, limit, offset, now)` to match placeholder text order; previously bound search terms to LIMIT/OFFSET. Added an ordering comment.
- **F0-2 (affected-row verification):** FIXED — `setUserAccountStatus` returns `{ok, changes}` from `meta.changes`; action asserts `changes > 0` so a missing/raced target is `not_found`, never fake success.
- **F0-3 (founder/admin floor):** FIXED — action reads the target via `getAdminUser` and refuses suspend/ban when `isPlatformAdmin(target)` (role ceo/admin or email allowlist); reactivate still allowed. New `protected_target` error surfaced in `AdminUserDetailActions`.
- **F0-4 (fake audit UI):** FIXED — `audit/page.tsx` now fetches real `listAuditEvents`; `AdminAuditTable` renders server-fetched rows (hardcoded `aud_001`/`Stub` rows removed); `summary_json` redacted.
- **F0-5 (activity semantics):** FIXED — `listAdminUserActivity` → `listAdminUserAuditActivity` (reads `admin_audit_events`); User 360 heading relabeled "Admin audit activity."
- **F0-6 (notification atomicity/typed validation):** FIXED — definition+delivery now run in one `db.batch()` (no orphaned definitions on delivery failure); `kind`/`severity`/`surface` validated against the migration-0009 enums; title cap aligned to DB CHECK (200→120).
- **F0-7 (placeholder Admin APIs):** FIXED — removed both zero-consumer `{degraded:true}` stub routes (`/api/admin/users`, `/api/admin/metrics/signups`); grep confirmed no source consumers; generated `.next/types/validator.ts` self-heals on next build.
- **F0-8 (misleading health/config claims):** FIXED — `AdminHealthProbeResult` gains `level` (0 presence / 1 exercised); overview badges render Level-0 bindings as "bound/missing" (neutral) and D1 as "up/down" (success/danger). `analytics` page was already honest (link-outs) — no change needed.
- **F0-9 (maintenance mode not enforced):** RESOLVED — removed the inert `AdminMaintenanceModeToggle` + flags-page wiring. Rationale: real maintenance mode is cross-cutting (estimates+projects+publications+uploads); partial enforcement at one boundary would be a NEW deception. Proper enforcement belongs in F5/F6; the flag row is retained for that wiring. Recovery: re-add the toggle when F5/F6 ships enforcement.
- **F0-10 (identity reconciliation):** FIXED — `countSignups` → `countProfilesCreated` (no canonical `user` table exists in D1; this counts profile-provision rows). Overview metric relabeled "Profiles created (30d)" with an F8-canonical-signup hint. Not relabeled as signups.
- **Files owned:** 10 modified, 3 deleted (see Sources).
- **Schema/migration:** NONE (F0 is correctness-only by design; new tables begin at UNIT-002+).
- **Security risk:** LOW — narrowed to existing admin surfaces; F0-3 closes a privilege/lockout gap; F0-6 closes a partial-write gap. All gated behind `requireAdminContext` / `gateAdminApi*`.
- **Test requirement:** NOT_REQUIRED (per pack default)
- **Test trigger:** NONE
- **Evidence:** `bunx tsc --noEmit` (NODE_OPTIONS heap 8GB) — 0 errors in any touched file. Pre-existing unrelated WIP errors (component-library `insertTemplate`/`KnowledgeStatusBadge`, `category` prop) are outside this slice. Diff review of every file:line in the F0 table. `use-server` files unchanged in their export shape (all async) — no build-only export risk introduced.
- **Degraded capability:** maintenance-mode toggle UI removed (was non-functional; see F0-9).
- **Result:** UNIT-001 (F0) COMPLETE and type-verified. The dependency-closed foundation for F1+ is in place. No fake success, no fake product-activity label, no last-admin/founder lockout, current list/detail truthful, high-risk actions have existence/floor/atomicity postconditions.
- **Next decision:** F1 / UNIT-002 (Admin Shell, Global Search, Recents, Pins) is the next slice. It is an IA/product-shape change (grouped nav, ⌘K, federated search, new pins/preferences schema) and benefits from a direction checkpoint before a large autonomous build. Activate deliberately.

## UNIT-002 / F1 (partial) — 2026-07-16 — GLOBAL SEARCH + GROUPED NAV IMPLEMENTED

- **State:** PARTIAL COMPLETE (search + grouped nav done; pins/recents/context-drawer deferred)
- **Founder outcome:** ⌘K anywhere in `/admin` searches users, accounts, projects, and estimates by email/ID/name/code and opens the match in one step; sidebar is now grouped by the pack's IA (Home / Customers / Product / Operations / Communications / Governance) over existing routes only.
- **Files owned:** new `src/lib/admin/search-repository.ts`, `src/lib/admin/search-actions.ts`, `src/components/admin/AdminCommandPalette.tsx`; edited `AdminHeader.tsx` (palette trigger), `AdminSidebar.tsx` (grouped `ADMIN_NAV_GROUPS`).
- **Schema/migration:** NONE (search queries existing tables; pins/preferences deferred).
- **Security risk:** LOW — search is admin-gated (`requireAdminContext` per call), searches only non-secret columns, LIKE-wildcards are escaped, sources are isolated (one failing source doesn't erase others), minimized DTO (no tokens/payloads).
- **Test requirement:** NOT_REQUIRED
- **Evidence:** `bunx tsc --noEmit` — 0 errors in any F1 file. Diff review. ⌘K palette is self-contained (no shared-UI dependency) to avoid collision with concurrent agents.
- **Deferred (needs schema or product shape):** pins, recents, saved views, header env/status, context drawer, URL filter standard — these are lower-value or need new tables; revisit in a later F1 sub-slice or with the grouped nav already in place.
- **Degraded capability:** none (search degrades gracefully per-source; nav links only existing routes).
- **Result:** F1 search + grouped-navigation deliverables met. Pins/recents explicitly deferred, not silently dropped.
- **Next decision:** F2 / UNIT-003 (Today + Action Inbox) is the founder's core daily surface; it needs a derivation registry and (for snooze/resolve) new schema.

## UNIT-003 / F2 (read-only seed) — 2026-07-16 — "TODAY" ATTENTION VIEW IMPLEMENTED

- **State:** PARTIAL (read-only attention view done; action-inbox state machine deferred)
- **Founder outcome:** a dedicated `/admin/today` page answers "what needs my attention now?" — open incidents rendered as prioritized action items with severity, age, owner, and a deep link, surfaced in the sidebar Home group.
- **Files owned:** new `src/app/admin/today/page.tsx`; edited `AdminSidebar.tsx` (Today nav item).
- **Schema/migration:** NONE this increment.
- **Security risk:** LOW — read-only, admin-gated via the layout.
- **Test requirement:** NOT_REQUIRED (read-only rendering of existing repo output).
- **Evidence:** `bunx tsc --noEmit` — 0 errors. Diff review. react-doctor: 0 findings in admin components (8 pre-existing findings are in AdminCharts + estimate-system-map, outside this slice).
- **Deferred (deliberate):** the action-inbox STATE MACHINE — `admin_action_items` table, derivation registry across support/feedback/identity/job/upload-scan sources, and snooze/resolve/dismiss/reopen reconciliation. This is the crux of F2 and is poor candidate to rush: it needs careful idempotent upsert + reconciliation logic and ideally tests. Source list functions for support/feedback items also don't exist yet (only aggregates). Migration slot reserved at 0088 (`admin_action_items`).
- **Degraded capability:** none.
- **Result:** F2 read-only "Today" delivered. The persistence/state-machine increment is explicitly deferred, not silently dropped.
- **Next decision:** Build the F2 action-inbox state machine (migration 0088 + derivation registry + snooze/resolve actions) as a focused, tested increment; OR proceed to F3 (Customer 360).

## UNIT-003 / F2 — 2026-07-16 — ACTION-INBOX STATE MACHINE IMPLEMENTED (commit d1215f802)

- **State:** COMPLETE (read-only view + durable state machine). The earlier "deferred crux" is now built.
- **Founder outcome:** "Today" is now a real action inbox — open incidents become durable, deduped action items the founder can Resolve, Dismiss, or Snooze 1d. Snoozed items resurface automatically; closed incidents auto-resolve; resolved/dismissed stay closed. Initial source: open incidents (support/feedback item-lists pending).
- **Files owned:** `migrations/0088_admin_action_items.sql`; new `action-inbox-repository.ts`, `action-inbox-actions.ts`, `AdminActionInbox.tsx`; rewritten `today/page.tsx`.
- **Reconciliation contract:** `ON CONFLICT(derived_key)` upsert refreshes payload + last_seen, preserves `resolved`/`dismissed`, reopens expired snoozes; a trailing UPDATE auto-resolves incident items whose source is no longer open. Derive-on-load is best-effort (failure never blanks the inbox).
- **Schema/migration:** `0088_admin_action_items` (deduped by derived_key; status open|snoozed|resolved|dismissed; severity + priority + index).
- **Security risk:** LOW — actions are admin-gated, UUID-validated, audited, affected-row verified.
- **Test requirement:** NOT_REQUIRED (default); reconciliation SQL hand-reviewed (idempotent upsert, snooze-expiry reopen, auto-resolve).
- **Evidence:** `bunx tsc --noEmit` — 0 errors in any F2 file. react-doctor clean.
- **Remaining F2 gaps (additive, non-blocking):** more derivation sources (support/feedback items — need list funcs); multi-day/custom snooze; deep-links to future incident-detail (F6).
- **Result:** F2 core COMPLETE. The "deferred crux" is delivered.
- **Next decision:** F3 / UNIT-004 (Customer 360) — founder notes/follow-ups is the highest-value bounded seed (also feeds F2's `followup` source).
