# 02 — Prioritized MVP Backlog

Audit commit `a41a07d01`. Operating milestones organized per master prompt §13.
Stage A/B immediate list is consolidated under 15 items.

**Priority lanes** (master prompt §12): `MVP-BLOCKER`, `MVP-LEARNING-P0`,
`MVP-EXPERIENCE-P1`, `PAID-MVP-P1`, `PUBLIC-LAUNCH`, `DEFER`, `KILL_OR_HIDE`.

**Effort:** S ≈ ≤1 day; M ≈ 2–5 days; L ≈ ≥1 week. Founder-led unless noted.

**MVP Leverage Score** (0–100) for non-blockers, computed as:
`(activation 0–20 + learning 0–20 + retention 0–20 + trust 0–15 + founder-time 0–15) − effort_penalty(0–10 S, 0–25 M, 0–40 L) + reversibility_bonus(0–10)`.
Higher = do sooner. Method stated once; applied consistently.

---

## Milestone 1 — Before recruiting the cohort

Goal: Philip can attribute, capture, observe, and intervene on every design
partner from first CTA to first value. Nothing here requires a real user.

### M1-01 · Lead capture table + server action · `MVP-BLOCKER` · Effort S · Score n/a (blocker)

- **Outcome:** Every public CTA persists a lead in D1 with qualification fields
  and source attribution; no lead is lost to mailto abandonment.
- **Reason:** Today `ContactForm` is client-side mailto-only (`ContactForm.tsx:73-84`)
  and `ClosedBetaGate` `POST /contact` has no handler (`contact/page.tsx` is
  `force-static`). Zero D1 tables exist for leads/access-requests/beta-requests.
  (Gap G-01.)
- **Smallest coherent scope:**
  - Migration: `beta_access_requests` table with columns `id, normalized_email,
    name, persona (architect|contractor|estimator|qs|interior_design|other),
    company, estimating_volume (per_month band), current_tool, source_cta,
    inquiry_type (started|walkthrough|general|beta-request), status
    (new|qualified|invited|active|rejected|duplicate), notes, created_at,
    updated_at`. Index on `normalized_email`, `status`, `created_at`.
  - Server action `submitAccessRequest` (or `POST /api/access-requests` route)
    with same-origin CSRF, rate limit per IP (5/h) and email (3/h), email
    normalization, duplicate detection (auto-mark `duplicate` if email exists
    and not `rejected`).
  - Rewire `ClosedBetaGate` form (`ClosedBetaGate.tsx:42-78`) to call the
    action; preserve `intent=beta-request` semantics.
  - Rewire `ContactForm` (`ContactForm.tsx:73-84`) to call the action when
    `inquiryType` is `started`/`walkthrough`/`beta-request`; keep the mailto
    fallback for `general` inquiries (low-value, low-volume).
  - Admin list view at `/admin/access-requests` (reuse `/admin/users` shape),
    with status update + notes + "Invite to beta" button that calls the
    existing `createClosedBetaAllowlistEntry` (`beta-allowlist-admin-actions.ts:19-39`).
- **Likely files/surfaces:** new `migrations/00XX_beta_access_requests.sql`;
  `src/lib/leads/`; `src/app/api/access-requests/route.ts`;
  `src/components/auth/ClosedBetaGate.tsx`;
  `src/components/landing/ContactForm.tsx`;
  `src/app/admin/access-requests/page.tsx`.
- **Manual alternative:** Email + spreadsheet; do not ship the cohort without
  one of these two.
- **Acceptance evidence:** Submitting ClosedBetaGate inserts a row; admin list
  shows it; source_cta is correct per CTA; email + IP rate limits reject abuse;
  duplicate email is marked.
- **Metric:** `access_request_to_kickoff_conversion`, `source_of_qualified_leads`.
- **Dependency:** none.
- **Owner:** founder-led implementation.
- **Risk of not doing:** leads lost; no source attribution; cohort-2+ inherits
  the blindness.

### M1-02 · Minimal product-event emitter + 8 events · `MVP-BLOCKER (narrow)` · Effort S–M · Score n/a (blocker)

- **Outcome:** From the first visitor, Philip can see funnel events in D1.
- **Reason:** Zero first-party product-event emitters exist (negative grep);
  no `/api/track`; no GA4/PostHog SDK; the activation ledger covers in-product
  only. (Gap G-04.)
- **Smallest coherent scope:**
  - Migration: `product_events` table with `id, event_name, actor_user_id NULL,
    actor_email NULL, workspace_id NULL, session_id NULL, source_cta NULL,
    properties_json, created_at`. Index on `event_name, created_at`.
  - Helper `recordProductEvent(name, props)` writing via a deferred
    `fetch('/api/internal/product-event', …)` (or `after()` server call), with
    PII rule per event in `03-…md` §C.
  - Emit: `landing_cta_click` (CTA component), `access_request_submitted`
    (server action above), `access_request_qualified` (admin status update),
    `invite_accepted` (mirror of existing activation), `project_created`
    (mirror), `first_valid_total` (mirror), `export_completed` (mirror),
    `publication_created` (mirror). For mirror events, prefer a single
    producer over double-emitting.
- **Likely files/surfaces:** new `migrations/00XX_product_events.sql`;
  `src/lib/analytics/product-event.ts`;
  `src/app/api/internal/product-event/route.ts`;
  call sites in `LandingCTAs.tsx`, the new access-request action,
  `invitation-d1-store.ts`, `projects/actions.ts`, `rows.ts`,
  `proposal-export-completed/route.ts`, `publication/admin-d1-client.ts`.
- **Acceptance evidence:** Each event lands in D1 with correct props; PII rules
  honored; events fire on the actual user action.
- **Metric:** per-event counts; conversion % between steps.
- **Dependency:** M1-01 (for lead-side event call sites).
- **Risk of not doing:** cannot answer "where do users drop off".

### M1-03 · Founder "Beta health" dashboard card · `MVP-LEARNING-P0` · Effort S · Score 78

- **Outcome:** `/admin` shows one card with: leads (count by status),
  activation funnel (12-step cohort aggregate), week-1 retained workspaces (to
  be filled when M3-01 ships), open feedback (count by severity), open support
  (count), open incidents (count).
- **Reason:** "Active teams" metric is hard-coded `"—"` (`admin/page.tsx:107`);
  insight scattered across ~22 admin pages. (Gap G-05.)
- **Smallest coherent scope:** Replace the placeholder card on `/admin` with a
  composed view; reuse `listActivationCohort` (`activation-cohort-repository.ts`)
  and `getActivationCohortAggregateForPlatformAdmin` (`:126-155`); add
  `countBetaAccessRequestsByStatus` and `countBetaFeedbackBySeverity` queries.
- **Likely files/surfaces:** `src/app/admin/page.tsx`;
  `src/lib/admin/beta-health-repository.ts` (new).
- **Acceptance evidence:** Card renders real numbers from D1; refresh on
  page-load; admin-only.
- **Metric:** weekly review time (target <15 min).
- **Dependency:** M1-01 (leads table), M1-02 (some events).
- **Risk of not doing:** weekly review stays slow; founder misses signals.

### M1-04 · Backup PITR enablement + restore drill · `MVP-BLOCKER (trust)` · Effort S (config) + M (drill) · Score n/a (blocker)

- **Outcome:** D1 PITR configured; restore procedure documented; one restore
  drill executed and evidenced.
- **Reason:** No `backups` / `time_travel` in `wrangler.jsonc`; no restore
  runbook; no drill evidence. A single bad migration is currently unrecoverable
  from a process perspective. (Gap G-11.)
- **Smallest coherent scope:**
  - Enable D1 backups / time travel per Cloudflare D1 docs; confirm via
    `wrangler d1 backup list` (or `time-travel` query).
  - Write `.ai/00_system/BACKUP_AND_RESTORE_RUNBOOK.md`: RPO/RPO targets,
    restore commands, restore-drill cadence (monthly), drill evidence path.
  - Execute one drill against the preview DB (`database_id` preview in
    `wrangler.jsonc`); record evidence under `.ai/05_logs/`.
- **Likely files/surfaces:** `wrangler.jsonc` (no source mutation needed; the
  binding is correct); new runbook; new log.
- **Acceptance evidence:** Restore drill log shows successful point-in-time
  restore of a known write.
- **Metric:** RPO (target ≤24h), restore-drill success rate.
- **Dependency:** none (Cloudflare-side enablement only).
- **Risk of not doing:** unrecoverable data loss ends the experiment.

### M1-05 · Beta agreement / expectations one-pager · `MVP-EXPERIENCE-P1` · Effort S · Score 62

- **Outcome:** Every invited design partner receives a one-page agreement
  covering: data backup expectation (user keeps their own spreadsheet), support
  SLA (none / best-effort), feedback expectation (weekly 15-min), founder-
  member offer terms (placeholder until WTP).
- **Reason:** No pre-access beta agreement exists beyond Terms clickwrap
  (`legal/terms-gate.ts:1-26`); `ClosedBetaGate` copy is one line. (Gap G-15.)
- **Smallest coherent scope:** Markdown doc under `.ai/06_specs/` + an email
  template the founder sends on invite; optionally an in-product acceptance
  step.
- **Likely files/surfaces:** `.ai/06_specs/design-partner-agreement.md`; invite
  email template in `src/lib/collaboration/actions.ts` or
  `src/lib/auth/beta-allowlist-admin-actions.ts`.
- **Acceptance evidence:** First design partner acknowledges agreement before
  access.
- **Metric:** cohort retention, dispute count.
- **Dependency:** none.
- **Risk of not doing:** mismatched expectations; harder to ask for honest
  feedback.

---

## Milestone 2 — Before onboarding user #1

Goal: A real user (not Philip) can reach first value without Philip in the
room, and Philip can see whether they did.

### M2-01 · Mount activation checklist + emit or remove `health_reviewed` · `MVP-EXPERIENCE-P1` · Effort S · Score 81

- **Outcome:** Workshop dashboard renders `FirstEstimateChecklist`; the
  `health_reviewed` milestone either fires when the user views estimate health,
  or is removed from the taxonomy.
- **Reason:** `FirstEstimateChecklist` (`FirstEstimateChecklist.tsx`, 55 lines)
  is built but has zero production consumers; `health_reviewed`
  (`activation-types.ts:7`) is declared but never emitted, leaving a permanent
  hole in the cohort funnel. (Gap G-03.)
- **Smallest coherent scope:**
  - Mount `<FirstEstimateChecklist />` in `WorkshopDashboard.tsx` for users
    whose `last_milestone` is below `export_completed`.
  - Either: add `prepareActivationOutboxIntent({ milestone: "health_reviewed",
    …})` at the health-review action call site, or remove the milestone from
    `ACTIVATION_MILESTONES` and update `activation-producer-contract.ts:26`.
- **Likely files/surfaces:** `src/components/workshop/WorkshopDashboard.tsx`;
  `src/components/workshop/FirstEstimateChecklist.tsx`; possibly
  `src/lib/onboarding/activation-types.ts` and
  `src/lib/onboarding/activation-producer-contract.ts`.
- **Acceptance evidence:** Checklist renders for new users; reaching the
  health-review action advances the milestone (or the milestone is gone).
- **Metric:** checklist completion rate; cohort funnel completion.
- **Dependency:** none.
- **Risk of not doing:** activation funnel shows permanent gap; users get no
  in-product scaffold.

### M2-02 · Default first-session to guided sample · `MVP-EXPERIENCE-P1` · Effort S · Score 74

- **Outcome:** A first-time user landing on an empty workspace sees a clear
  primary CTA "Start with a guided sample" that runs `startGuidedSample()`.
- **Reason:** Workshop home has no first-run branching
  (`workshop/page.tsx:119-145`); the guided sample exists
  (`activation-actions.ts:85-146`) but is buried under `FirstProjectZeroState`
  on `/workshop/projects`, one nav hop away. (Gap G-03/G-06.)
- **Smallest coherent scope:** Add a first-run hero card on `/workshop` (or
  the dashboard) for users with zero projects that links to
  `startGuidedSample()`.
- **Likely files/surfaces:** `src/components/workshop/WorkshopDashboard.tsx`;
  possibly `src/components/workshop/projects-page-client.tsx:3282-3291`.
- **Acceptance evidence:** New-user session in dev shows the CTA; clicking it
  creates the sample project/estimate/area/row.
- **Metric:** `% users completing guided sample`; `time_to_first_value`.
- **Dependency:** none.
- **Risk of not doing:** real users bounce from empty workshop.

### M2-03 · Rewire feedback and comment/decision events to notify founder · `MVP-LEARNING-P0` · Effort S · Score 71

- **Outcome:** Submitting beta feedback, leaving a client comment, or
  submitting a decision writes a targeted notification to the founder within
  the existing notification system.
- **Reason:** Notification kinds `collaboration`, `publication_activity`,
  `beta_feedback` are defined (`notification-actions.ts:18-30`) but no producer
  writes them; only `broadcastNotification` (admin-push) writes deliveries.
  Founder must remember to check queues manually. (Gap G-07.)
- **Smallest coherent scope:** Add a `notifyFounder(kind, payload)` helper
  that inserts a `notification_deliveries` row targeting the platform admin
  (single-row audience). Call it from `submitBetaFeedback`
  (`beta-feedback-actions.ts:37`), comment POST (`comment/route.ts:389`),
  decision POST (`decision/route.ts:331`).
- **Likely files/surfaces:** `src/lib/notifications/actions.ts`;
  `src/lib/workshop/beta-feedback-actions.ts`;
  `src/app/api/share/[token]/comment/route.ts`;
  `src/app/api/share/[token]/decision/route.ts`.
- **Acceptance evidence:** Founder sees a notification badge within seconds of
  each event.
- **Metric:** Time-to-founder-acknowledgement of feedback (target <24h).
- **Dependency:** none.
- **Risk of not doing:** critical beta feedback goes unseen for days.

### M2-04 · Resolve the dead `POST /contact` (subset of M1-01) · `MVP-BLOCKER` · covered by M1-01

Note: this is fully covered by M1-01. Listed separately only so it is not
forgotten during M2 review — `ClosedBetaGate` must point at the new action.

### M2-05 · Document the founder-ops runbook · `MVP-LEARNING-P0` · Effort S · Score 58

- **Outcome:** A single runbook at `.ai/00_system/BETA_OPS_RUNBOOK.md` covering:
  grant access, suspend/reactivate, announce, pause cohort, weekly review
  cadence, incident triage, restore (cross-link to backup runbook).
- **Reason:** Manual processes are load-bearing and undocumented (master
  prompt §17 forbids leaving load-bearing manual work undocumented).
- **Likely files/surfaces:** new `.ai/00_system/BETA_OPS_RUNBOOK.md`.
- **Acceptance evidence:** Runbook exists; cited by `/admin/README.md`.
- **Metric:** onboarding minutes per user (target ≤30).
- **Dependency:** M1-04 (backup runbook).
- **Risk of not doing:** bus-factor; cofounder handoff impossible.

---

## Milestone 3 — Before onboarding user #5

Goal: Cold-start pain is mitigated; reuse signal is measurable.

### M3-01 · Library CSV/XLSX import · `MVP-EXPERIENCE-P1` · Effort M · Score 88 (highest non-blocker)

- **Outcome:** A solo estimator can upload an existing spreadsheet of priced
  components and bulk-insert them into their library, with column mapping and
  validation.
- **Reason:** No import exists (negative grep). Library insert is single-row
  only (`AddComponentModal.tsx` 2688 lines). This is the largest adoption
  blocker and the biggest threat to the "never start from zero" thesis. (Gap
  G-02; matches existing direction in `2026-07-18-Codebase-Improve-Audit-Plan-Pack/031-spike-library-bulk-import.md`.)
- **Smallest coherent scope:**
  - Accept `.csv` and `.xlsx` (use the already-declared `exceljs` dep, or the
    in-house `xlsx-workbook.ts` reader if extended to read).
  - Wizard: upload → auto-detect header row → map columns (name, unit,
    unit_cost, misc_cost, supplier, brand, category, pricing_date) → preview
    first 20 rows with validation errors highlighted → confirm bulk insert.
  - Per-workspace cap (e.g. 1000 rows/import, 10k items/workspace) to bound
    R2/D1 cost.
  - Insert via batched `INSERT INTO cost_library_items` (reuse
    `component-mutation-d1.ts` patterns).
- **Likely files/surfaces:** new `src/app/workshop/library/components/import/`
  route + modal; `src/lib/component-library/import-*`; new server action.
- **Manual alternative:** Concierge import — user emails spreadsheet, Philip
  keys it. Viable for the first 1–3 partners; not viable at partner 5+.
- **Acceptance evidence:** A real spreadsheet imports cleanly; invalid rows
  are reported; library reflects new items.
- **Metric:** `import_completion_rate`, `library_size_at_day_7`.
- **Dependency:** M1-02 (instrument the funnel).
- **Risk of not doing:** design partners abandon at cold-start.

### M3-02 · Week-1 / Week-4 retention + reuse-rate metrics · `MVP-LEARNING-P0` · Effort S · Score 76

- **Outcome:** `/admin` Beta health card shows week-1 and week-4 active
  workspace rates and a library-reuse rate.
- **Reason:** `activation-retention.ts` is data-TTL only; no week-N retention
  metric; no reuse-rate metric. (Gap G-08.)
- **Smallest coherent scope:**
  - Week-N retention: SQL over `beta_activation_events` grouping workspaces by
    first-activity week and counting those with activity in week N.
  - Reuse rate: SQL over `estimate_row_items.source_library_item_id` non-null
    in estimates created >7 days after the source item was first priced.
- **Likely files/surfaces:** `src/lib/admin/beta-health-repository.ts`;
  `src/app/admin/page.tsx`.
- **Acceptance evidence:** Numbers render on `/admin`; manual cross-check
  against raw SQL agrees.
- **Metric:** `week_1_active_workspaces`, `week_4_active_workspaces`,
  `library_reuse_rate`.
- **Dependency:** M1-02 (event coverage), M1-03 (dashboard card).
- **Risk of not doing:** cannot prove the reuse thesis with data; cannot tell
  whether design partners return.

### M3-03 · Contractor profile + branded export · `MVP-EXPERIENCE-P1` · Effort S · Score 64

- **Outcome:** XLSX export carries the estimator's name, logo/letterhead,
  default payment terms, and validity period — not workspace name and "To be
  confirmed" placeholders.
- **Reason:** Export contractor identity is interim workspace name
  (`route.ts:240-241`); Commercial Terms sheet is placeholder-only
  (`create-proposal-workbook.ts:588-607`); "Estimated duration" hardcoded "To
  be confirmed" (`:524`). (Gap G-09.)
- **Smallest coherent scope:**
  - Migration: `contractor_profiles` table (workspace_id, legal_name, dba,
    logo_r2_key, letterhead_r2_key, default_payment_terms, default_validity_days,
    default_warranty_terms).
  - Workspace settings UI for the profile.
  - Export reads the profile and populates the Commercial Terms sheet and
    letterhead.
- **Likely files/surfaces:** new migration; `src/lib/proposal-export/*`;
  `src/app/workshop/settings/contractor-profile/`.
- **Acceptance evidence:** Export from a workspace with a profile carries real
  terms and letterhead.
- **Metric:** client decision rate; user-reported credibility.
- **Dependency:** none.
- **Risk of not doing:** proposal artifact looks unfinished to PH clients.

---

## Milestone 4 — Before completing week 4

Goal: The loop has closed at least once for at least one design partner; the
feedback system produces decisions, not a backlog.

### M4-01 · Feedback synthesis cadence · `MVP-LEARNING-P0` · Effort S · Score 55

- **Outcome:** Weekly 30-min founder slot to (a) read all new feedback +
  support + comments + decisions, (b) tag by the qualitative framework in
  `03-…md` §D, (c) update `beta_feedback_submissions.status` and notes, (d)
  write a one-paragraph synthesis to `.ai/13_research/cohort-N-weekly.md`.
- **Reason:** Capture is built; synthesis is not. (Gap G-07; Lens G.)
- **Smallest coherent scope:** Operate the existing queue; document the cadence
  in the runbook (M2-05).
- **Acceptance evidence:** Weekly synthesis doc exists; statuses updated.
- **Metric:** `percentage_feedback_closed_with_user`.
- **Dependency:** M2-03 (notification), M2-05 (runbook).
- **Risk of not doing:** backlog grows; nothing converts to learning.

### M4-02 · Pricing problem + value interviews · `PAID-MVP-P1` (start now) · Effort S · Score 70

- **Outcome:** Five problem interviews and two value interviews completed and
  recorded.
- **Reason:** Pricing publication requires evidence; the evidence takes weeks
  to gather. (Lens H; Gap G-10 prerequisite.)
- **Smallest coherent scope:** Interview script (problem + value + alternative
  mapping) under `.ai/13_research/`; founder books 30-min calls with cohort;
  notes recorded.
- **Acceptance evidence:** 5 problem notes + 2 value notes filed.
- **Metric:** interviews completed; users naming a budget.
- **Dependency:** cohort recruited (Milestone 1).
- **Risk of not doing:** moment to publish prices arrives with no evidence.

### M4-03 · Van Westendorp PSM instrument · `PAID-MVP-P1` · Effort S · Score 52

- **Outcome:** A short survey (4 questions: too cheap / bargain / expensive /
  too expensive) deployed to the cohort.
- **Reason:** `/pricing` calls for Van Westendorp but no instrument exists.
- **Smallest coherent scope:** Typeform / Google Forms / in-product one-question
  prompt; results aggregated in `.ai/13_research/`.
- **Acceptance evidence:** ≥5 responses.
- **Metric:** distribution of acceptable-price band.
- **Dependency:** M4-02.
- **Risk of not doing:** prices remain arbitrary.

---

## Milestone 5 — Before asking for payment

Goal: A willing user can be invoiced; entitlement is recorded; the legal
posture is paid-launch-ready.

### M5-01 · Manual invoice helper + entitlement · `PAID-MVP-P1` · Effort M · Score 60

- **Outcome:** Admin can record a manual payment against a workspace; an
  entitlement row records what is unlocked; workspace surfaces the entitlement.
- **Reason:** No billing code (correct); no manual-invoice helper; no
  entitlement concept. (Gap G-10.)
- **Smallest coherent scope:**
  - Migration: `manual_invoices` (workspace_id, issue_date, amount_minor,
    currency, plan_name, payment_method, payment_status, paid_at, notes) and
    `workspace_entitlements` (workspace_id, plan_name, started_at, ends_at,
    source_invoice_id).
  - Admin form at `/admin/accounts/[id]` to record a payment.
  - Read-side helper `getWorkspaceEntitlement(workspaceId)` consumed by future
    gating logic (no gating enforced yet — record only).
- **Likely files/surfaces:** new migration; `src/lib/billing/manual-invoice*.ts`;
  `src/app/admin/accounts/[accountId]/`.
- **Manual alternative:** Off-product spreadsheet; only viable for ≤3 paying
  users.
- **Acceptance evidence:** Invoice recorded; entitlement row visible to admin
  and the user's workspace settings.
- **Metric:** `manual_invoice_conversion`, `churn_reason`.
- **Dependency:** WTP evidence (M4-02).
- **Owner decision required:** Yes — pricing structure (Lens H).
- **Risk of not doing:** pricing conversations cannot convert.

### M5-02 · Counsel-reviewed Terms + complete subprocessor list · `PAID-MVP-P1` · Effort M (mostly external) · Score n/a (required)

- **Outcome:** Terms status moves from `closed_beta_owner_approved_pending_counsel_review`
  to counsel-approved; subprocessor list complete (Cloudflare + Google at
  minimum); data residency stated.
- **Reason:** (Gap G-14.)
- **Smallest coherent scope:** External counsel review; copy updates in
  `terms-content.ts` and `privacy/page.tsx`.
- **Owner decision required:** Yes — counsel selection.
- **Risk of not doing:** paid-launch legal exposure.

### M5-03 · Probe-based health + external uptime monitor · `PAID-MVP-P1` · Effort S · Score 48

- **Outcome:** `/api/health` checks D1, R2, Queue, Email bindings; external
  monitor alerts Philip on outage.
- **Reason:** (Gap G-12.)
- **Smallest coherent scope:** Add probes to `health/route.ts`; sign up for
  Better Stack / UptimeRobot / Checkly; document in runbook.
- **Owner decision required:** Yes — monitor vendor choice.
- **Risk of not doing:** outages invisible until user complains.

### M5-04 · DSAR admin helper · `PAID-MVP-P1` · Effort M · Score 42

- **Outcome:** Admin can export a user's data (estimates + library as a zip)
  and delete a user/workspace with cascade, from `/admin/users/[userId]`.
- **Reason:** DSAR intake exists but no fulfillment UI. (Gap G-17.)
- **Smallest coherent scope:** Two admin actions reusing existing repository
  reads + a cascade delete migration.
- **Risk of not doing:** cannot fulfil a deletion request without SQL.

### M5-05 · Pick one proposal surface (legacy shared link vs Client Portal) · `PAID-MVP-P1` · Effort S (decision) + M (consolidation) · Score 45

- **Outcome:** One canonical proposal surface carries immutable snapshots,
  decisions, and exports; the other is either removed or hidden.
- **Reason:** Client Portal has immutable issues (`0068_…sql:125`); legacy
  shared link does not. Both exist; long-term divergence is unsustainable.
- **Owner decision required:** Yes — which surface is canonical.
- **Risk of not doing:** maintenance burden; trust ambiguity.

---

## Milestone 6 — Before public self-service

Goal: Abuse-resistant open signup; automated billing; scalable support.

### M6-01 · Self-serve signup (replace ClosedBetaGate with SignupForm) · `PUBLIC-LAUNCH` · Effort M · Score n/a

- **Outcome:** `/signup` creates an account and a workspace without founder
  intervention.
- **Reason:** Currently gated (`signup/page.tsx:6-9` L-FUN-2).
- **Dependency:** M5-01 (entitlement), abuse prevention (below).
- **Risk of not doing:** cannot scale beyond founder-led.

### M6-02 · Automated billing (Stripe or equivalent) · `PUBLIC-LAUNCH` · Effort L · Score n/a

- **Outcome:** Self-serve checkout, plan changes, proration, dunning.
- **Reason:** Manual invoicing does not scale beyond ~20 paying users.
- **Dependency:** M5-01 + paid volume evidence.

### M6-03 · Abuse prevention (email verification, bot detection, rate-limit hardening, content moderation) · `PUBLIC-LAUNCH` · Effort M · Score n/a

- **Reason:** Today only per-IP/per-email rate limits exist; closed-beta
  allowlist is the abuse control.

### M6-04 · Email channel wiring for notifications · `PUBLIC-LAUNCH` · Effort M · Score n/a

- **Reason:** `notification_deliveries` is in-app only today; public users
  expect email digests.

### M6-05 · Browser/accessibility support sweep · `PUBLIC-LAUNCH` · Effort L · Score n/a

- **Reason:** No a11y audit performed in this audit; mobile editing is unguarded.

---

## Milestone 7 — Explicitly deferred or killed

| Item | Disposition | Rationale |
|---|---|---|
| Stripe before WTP evidence | KILL_OR_HIDE | Master prompt §17. |
| CRM (HubSpot/Salesforce/Notion) | KILL_OR_HIDE | One D1 table suffices. |
| PDF generation | DEFER | Not a beta blocker for BOQ-XLSX ICP. |
| AI Ask / Package Builder exposure | KILL_OR_HIDE (defer) | Default OFF; leave OFF. |
| Enterprise collaboration / SSO / audit-log export | DEFER | Not solo ICP. |
| Advanced analytics (Mixpanel/Amplitude) | DEFER | Until event volume justifies. |
| Sentry | DEFER | Workers Observability + D1 client-error events suffice for Stage A. |
| Mobile editing guard | DEFER | Tolerable poor UX in beta. |
| A/B test infrastructure beyond hero CTA | DEFER | Premature at 5–8 users. |
| `data/local/seed.json` | DELETE_OR_CONSOLIDATE | Dead weight; nothing imports it. |
| `exceljs` npm dependency | DELETE_OR_CONSOLIDATE | Used only by vitest; production uses in-house writer. |
| `admin_maintenance_mode` flag | DELETE_OR_CONSOLIDATE | Settable but enforces nothing. |
| `health_reviewed` activation milestone | DELETE_OR_CONSOLIDATE | If not wired in M2-01. |
| Referral program (full) | DEFER | M2 helper column on leads table is enough. |
| Case studies / customer stories | DEFER | No social proof yet; do not fabricate (already policy). |
| Public release-notes page | DEFER | Admin release center + in-app announcement suffice. |
| Multi-currency per row | DEFER | Single-currency estimates are correct for the ICP. |
| Labor rate as a real schema column | DEFER (promote before paid) | Tolerable as metadata for beta. |

---

## Stage A/B immediate list (15 items)

Consolidated to satisfy master prompt §13's "≤15 items" rule.

| # | Item | Milestone | Priority | Effort |
|---|---|---|---|---|
| 1 | M1-01 Lead capture table + server action | 1 | MVP-BLOCKER | S |
| 2 | M1-02 Product-event emitter + 8 events | 1 | MVP-BLOCKER | S–M |
| 3 | M1-03 Beta health dashboard card | 1 | MVP-LEARNING-P0 | S |
| 4 | M1-04 Backup PITR + restore drill | 1 | MVP-BLOCKER (trust) | S+M |
| 5 | M1-05 Beta agreement one-pager | 1 | MVP-EXPERIENCE-P1 | S |
| 6 | M2-01 Mount activation checklist + fix `health_reviewed` | 2 | MVP-EXPERIENCE-P1 | S |
| 7 | M2-02 Default first session to guided sample | 2 | MVP-EXPERIENCE-P1 | S |
| 8 | M2-03 Notify founder on feedback/comment/decision | 2 | MVP-LEARNING-P0 | S |
| 9 | M2-05 Founder-ops runbook | 2 | MVP-LEARNING-P0 | S |
| 10 | M3-01 Library CSV/XLSX import | 3 | MVP-EXPERIENCE-P1 | M |
| 11 | M3-02 Week-1/4 retention + reuse-rate metrics | 3 | MVP-LEARNING-P0 | S |
| 12 | M3-03 Contractor profile + branded export | 3 | MVP-EXPERIENCE-P1 | S |
| 13 | M4-01 Feedback synthesis cadence | 4 | MVP-LEARNING-P0 | S |
| 14 | M4-02 Pricing problem + value interviews (start) | 4 | PAID-MVP-P1 | S |
| 15 | E-01 Row-total divergence fix (engineering, consistency F-01) | 1 | MVP-BLOCKER (trust) | M |

Item 15 is implemented under the consistency audit (`2026-07-18-Whole-App-Consistency-Audit`),
not here; it is listed so the startup backlog acknowledges it as a trust
blocker for the cohort.

---

## Dependency graph

```
M1-01 ─┬─> M1-02 ─┬─> M3-01 ──> M3-02 ──> M4-01
       │          │
       └─> M1-03 ─┴─> M3-02
M1-04 (independent)
M1-05 (independent)
M2-01 (independent)
M2-02 (independent)
M2-03 (independent)
M2-05 <── M1-04
M4-02 ──> M4-03 ──> M5-01 ──> M6-01 ──> M6-02
M5-02, M5-03, M5-04, M5-05 (paid-launch prerequisites)
```

The critical path to "cohort being recruited with working instrumentation" is:
**M1-01 → M1-02 → M1-03 → M1-04 → M1-05**, all Stage-A items, all S effort
except the restore drill, total ~3–5 founder-days. This is the recommended
single next move (verdict §12).
