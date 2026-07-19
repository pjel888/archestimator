# 01 — Capability and Gap Audit

Audit commit `a41a07d01`. Every claim cites `file:line`. Findings register
begins at §M. Statuses follow master prompt §11.

---

## A. Beachhead ICP and positioning (Lens A)

Archestimator's public marketing currently addresses "AEC professionals"
broadly — `/` and `/pricing` cite architects, contractors, estimators, QS,
interior design, and firms as one audience. Master prompt §10.A forbids that as
an initial ICP.

### Segment scoring (1–5; 5 best for Archestimator's *current* codebase)

| Segment | Pain | Frequency | Excel dissat. | Founder access | Onboarding complexity | Library reuse value | Share value | WTP | Sales-cycle | Support burden | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Solo/freelance cost estimator or QS (PH)** | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 4 | 5 | 5 | **48** |
| Solo architect / 1–3 person arch. practice | 4 | 3 | 4 | 4 | 5 | 5 | 5 | 3 | 5 | 5 | **43** |
| Solo contractor (small jobs) | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | **36** |
| Fit-out / specialty contractor | 5 | 4 | 4 | 3 | 3 | 5 | 4 | 4 | 3 | 3 | **38** |
| Interior design practice | 3 | 2 | 3 | 3 | 3 | 3 | 5 | 2 | 4 | 4 | **32** |
| Small contractor firm (5–20 seats) | 4 | 4 | 4 | 2 | 2 | 5 | 4 | 5 | 2 | 2 | **34** |
| Material supplier / brand | 2 | 3 | 2 | 3 | 3 | 2 | 1 | 2 | 3 | 4 | **25** |
| Engineering consultancy | 4 | 3 | 3 | 2 | 2 | 4 | 4 | 4 | 2 | 2 | **30** |

**Beachhead (primary):** solo/freelance cost estimator or QS in the Philippines
— the segment whose entire job is producing estimates weekly, whose current
tool is Excel, and for whom the schema (`cost_library_items`, `estimate_row_items`,
`pricing_provenance_origin`, linked templates, PHP, BOQ export) is an almost
exact fit.

**Secondary:** solo architect / small architectural practice (reuse thesis +
client share value).

**Exclude from first cohort:** material suppliers, mid+ contractor firms,
engineering consultancies, pure interior-design practices (rationale in
`00-EXECUTIVE-VERDICT.md` §2).

**Job-to-be-done, value prop, switch reason, anti-switch reason:** see verdict
§3–4.

**Strongest reason to switch from spreadsheets:** reuse. Specifically
`pricing_provenance_origin` (`migrations/0072_estimate_intelligence_inputs.sql:60-80`)
and linked templates (`migrations/0092_linked_estimate_template_instances.sql`)
make the *next* estimate inherit the *last* estimate's pricing — Excel cannot
do this without manual copy-paste.

**Strongest reason NOT to switch:** cold-start cost. A solo estimator's
spreadsheet already contains hundreds of priced lines. Today, recreating that
library in Archestimator requires hand-keying each one through the
`AddComponentModal` (`src/components/workshop/component-library-manager/AddComponentModal.tsx`,
2688 lines, single-row only). This is the activation-blocking gap G-02.

### Positioning claim discipline

The codebase is admirably disciplined about not inventing proof
(`claims-data.ts:204`, `ArchestimatorLandingPage.tsx:593`). The placeholder
logo rail (`company-proof-data.ts`) is correctly *not* mounted on the live home
page. This discipline must extend into the cohort: do not publish
sector-specific landing variants (e.g. "for architects") until ≥2 design
partners in that sector have produced real estimates.

---

## B. Core product loop (Lens B)

Candidate loop (master prompt §10.B):
`capture/import reusable costs → build estimate → trustworthy total → export/share → response → revise → reuse`

### Loop step status

| Step | Status | Evidence |
|---|---|---|
| Capture/import reusable costs | **PARTIAL — bottleneck** | `cost_library_items` schema complete; **no import**; single-row modal only (`AddComponentModal.tsx`); express inline rows allow estimating without library first (`express-components.ts:78-85`, default on); starter templates exist as browse-only fixtures (`estimate-templates.ts:61`). |
| Build estimate (tree + rows) | BUILT_AND_PROVEN | Three-level tree (group/area/row); drag-drop, picker, blank-row insertion (`use-estimate-row-handlers.ts:786-928`); virtualized for large estimates (`load-limits.ts:1-3` — 1500 nodes / 5000 rows). |
| Trustworthy total | BUILT_AND_PROVEN | Integer minor-units oracle with overflow checks, currency whitelist incl. PHP, transparent formula (`estimate-row-total.ts:204-318`); XLSX writes live formulas (`create-proposal-workbook.ts:489,495`). |
| Export BOQ / share link | BUILT_AND_PROVEN (export); BUILT_AND_PROVEN (share) | BOQ XLSX (export route `proposal.xlsx/route.ts:384`); shared link password-protected/expiring/revocable, per-request re-validation (`public-repository.ts:134-139`). |
| Receive client response | BUILT_AND_PROVEN | Comments + decisions (accepted/declined/revision_requested); pinned to snapshot version (`decision/route.ts:280-304`); closed loop via Activity feed + Publisher drawer + 15-min digest email. |
| Revise | PARTIAL | Legacy shared link has no immutable snapshot (re-publish replaces in place); Client Portal has immutable content-addressed issues (`0068_client_portal_foundation.sql:125`). |
| Reuse knowledge | BUILT_AND_PROVEN | Linked template instances (`0092_…sql`), `source_library_item_id` row linkage, pricing provenance. |

**True value moment:** first *reuse* of a previously-priced component in a new
estimate. This is the moment the product thesis becomes true for the user.

**Activation event:** `first_valid_total` (`rows.ts:2015-2033`).

**Retention predictor:** second estimate created within 7 days *with* at least
one row carrying `source_library_item_id` from an earlier estimate (currently
unmeasured — G-08).

**Library-before-or-after-estimate question:** the schema allows both. Express
inline authoring (`isExpressComponentsAuthoringEnabled` default `true`,
`express-components.ts:78`) means a user can build a useful estimate without
first populating the library — *but* the library UI signals library-first
(empty-state copy at `ComponentLibraryManager.tsx:1909-1922` reads "Build your
component library"). This misalignment is a real activation risk; the
first-session should be estimate-first with library items promoted from rows.

---

## C. Acquisition and design-partner pipeline (Lens C)

### The dead mailto funnel (finding G-01)

Every public CTA today collapses into one of two dead ends:

1. **`ContactForm`** — `src/components/landing/ContactForm.tsx:73-84`:
   `handleSubmit` builds a `mailto:` URL client-side via
   `buildSupportMailto` (`contact-mailto.ts:30-45`) and calls
   `window.open(nextMailtoLink, "_self")`. The form's own copy states:
   *"This form opens a support email draft. Nothing is stored until you send
   it."* (`ContactForm.tsx:133-135`). There is **no server action**, no D1
   write, no email server-side.
2. **`ClosedBetaGate`** — `src/components/auth/ClosedBetaGate.tsx:42-78`:
   `<form action="/contact" method="post">` with hidden `intent=beta-request`.
   **`src/app/contact/` contains only `page.tsx`** (`force-static`,
   `page.tsx:18`). There is no `route.ts` or server action to receive the POST.
   The form's submit lands on the static GET page; the `intent=beta-request`
   is consumed by `ContactFormFromSearchParams` (`ContactForm.tsx:64-67`) which
   pre-fills the same mailto builder. The POST is silently lost.

**D1 tables for leads / waitlist / access requests:** none exist. Negative
grep over `migrations/` for `access_requests`, `leads`, `waitlist`,
`beta_requests`, `signups`, `contact_messages`, `design_partners` → zero
matches. The closest tables (`closed_beta_allowed_emails` migration `0001`,
`beta_feedback_submissions` migration `0001`, `beta_activation_progress`
migration `0067`) are all post-login or admin-curated; none are populated by a
public visitor.

**CTA routing** (`LandingCTAs.tsx:13-14`):
- `START_HREF = "/contact?intent=started"`
- `BOOK_WALKTHROUGH_HREF = "/contact?intent=walkthrough"`
- Signed-out primary CTA label: "Start with an estimate" → `/contact?intent=started`.
- v3 home page primary CTA (`ArchestimatorLandingPage.tsx:95`): signed-out →
  `/contact?intent=walkthrough`.

### Conversion tracking

Zero conversion events are fired on public surfaces. The A/B helper
`experiment-tracker.ts` has `trackExperimentView` and `trackConversion`, but
both are no-ops unless `window.gtag` / `window.clarity` are loaded AND
`consent.analytics` is true; they cover landing-page A/B variants only. There
is no GA4 measurement-ID config confirmed set. Page-view-only tracking via
Cloudflare Web Analytics (`CloudflareWebAnalytics.tsx:14-15`) and Microsoft
Clarity session replay (`ClarityScript.tsx`). (G-04.)

### What is sufficient for the first cohort

For 5–8 design partners, a **lightweight internal table** is enough — not a
CRM. The smallest launch-worthy capture is one D1 table (`beta_access_requests`)
with: `name, email, persona, company, estimating_volume, current_tool,
source_cta, status, created_at`. Plus an admin list view (reuse the existing
`/admin/users` shape). Manual qualification by Philip via email/Google Meet is
the right Stage A process; the table is for *not losing leads* and *attributing
source*, not for automation.

### What can remain manual through Stage A

- Qualification calls (Google Meet; no Calendly integration exists and none is
  needed at this volume — `Book a walkthrough` is currently a mailto).
- Scheduling (Philip books directly).
- Founder follow-up (email).
- Pipeline status (admin list view + a `status` enum is sufficient).

### Source attribution

Today **impossible**. The `?intent=` query is parsed into the mailto subject
(`contact-mailto.ts:20-28`) but never persisted. With the proposed
`beta_access_requests.source_cta` column, attribution becomes trivial. Without
it, Philip cannot tell whether design partners came from the hero CTA, a
walkthrough CTA, or a referral.

---

## D. Activation and onboarding (Lens D)

### The broken/stub onboarding surface

- `/workshop/onboarding/page.tsx` — entire file is 5 lines:
  ```ts
  import { redirect } from "next/navigation";
  export default function WorkshopOnboardingPage() { redirect("/workshop/settings"); }
  ```
  Redirects to **Settings**, not to a first-value flow. (G-03.)
- `/workshop/getting-started/page.tsx` — also a 5-line redirect to `/workshop`.
- `FirstEstimateChecklist` (`src/components/workshop/FirstEstimateChecklist.tsx`,
  55 lines) — built, has 6 items including "Publish when ready (not_available)",
  has dismiss/reopen handlers (`dismissActivationChecklist` /
  `reopenActivationChecklist`). **Zero production consumers.** Grep across
  `src/app/` and `src/components/workshop/` shows it is imported only by its own
  definition and by tests. `WorkshopDashboard.tsx` and
  `WorkshopHomebaseClient.tsx` do not render it. (G-03.)

### What the user actually sees on first login

1. Middleware cookie check (`request-proxy.ts:227-235`) → `/login?next=…`.
2. Layout gate (`workshop/layout.tsx:24-58`) → session + terms acceptance.
3. `/workshop` renders `<WorkshopDashboard>` inside `<WorkshopHomebaseClient>`
   (`workshop/page.tsx:119-145`). No bespoke first-run branching; always the
   dashboard shell.
4. `/workshop/projects` shows `<FirstProjectZeroState>` (3 cards: Blank /
   Workspace template / Guided sample).
5. **Blank path:** NewProjectModal → name (only required field, `projects/actions.ts:1109`) →
   redirect to project page → create estimate (`estimates/actions.ts:1760`) →
   create area node → insert first priced row → `first_valid_total` fires.
   **~6 navigation hops, 3 form submissions.**
6. **Guided-sample path:** `FirstProjectZeroState` button → `startGuidedSample`
   (`projects-page-client.tsx:3282`) → ready estimate with a priced row already
   inserted. **2 clicks.**

### Central test (master prompt §10.D)

> "Can a qualified user reach a credible cost result in one founder-guided
> session using their own data?"

**Plausibly yes**, but only via the guided sample (which proves the engine) or
with Philip driving. The blank path's empty-state + library-first signal +
missing import means a solo user with their own data will hit the cold-start
wall. (G-02.)

> "Can they repeat the process without Philip?"

**Not yet reliably.** Without import or seeded library, repeat use requires
either (a) the user accepts starting from the guided sample each time, or (b)
the user invests hours hand-keying their library. This is the Stage A→B gap.

### Sample data state

- `data/local/seed.json` exists on disk (tracked) with sample "Archestimator
  Demo Workspace" and "Fit-Out Proposal Sample" — **nothing in `src/` imports
  it** (dead weight from the pre-D1 local-storage era).
- No migrations seed library/projects/estimates on signup.
- The runtime `startGuidedSample()` action (`activation-actions.ts:85-146`)
  lazily creates a project/estimate/area/row on demand — only when the user
  clicks "Explore guided sample". This is the only live sample path.

### Progressive disclosure

AI Ask and Package Builder are correctly OFF by default
(`feature-flags.ts:13,17`). Admin Copilot is gated on a DeepSeek key
(`admin/copilot/page.tsx:18`). But within the workshop, all features
(collaboration, charts, templates, library) are visible immediately on first
run. The empty workshop shell shows the full nav.

### Time-to-first-total estimate

- Guided sample: **<2 minutes** (2 clicks).
- Blank path with library seeded: **~5 minutes** (3 form submissions + a few
  row insertions).
- Blank path with empty library + express inline rows: **~10 minutes** (user
  types component name, qty, unit, unit cost per row).
- Blank path with empty library + intent to use real supplier data: **30–120
  minutes** of hand-keying before the first useful estimate — and this is the
  path real design partners will take.

---

## E. Retention and habit formation (Lens E)

The product creates recurring value through (master prompt §10.E):

- **Recent work / resume:** workshop dashboard surfaces favorites and recent
  projects; `homebase` server fetch in `workshop/page.tsx`.
- **Second estimate creation:** supported; no metric measures it.
- **Library growth:** schema supports; no growth metric.
- **Template reuse:** linked instances ship (`0092_…sql`); no reuse-rate metric.
- **Price updates:** variant cost entries with `pricing_date` and
  `pricing_source` (`migrations/0028_…sql:65-87`), and
  `workspace_price_freshness_policies` (`migrations/0072_…sql:14-32`) for
  stale-day thresholds. Strong substrate, no freshness metric surfaced.
- **Supplier reuse:** schema supports; no metric.
- **Collaboration:** realtime presence works; not core to solo beachhead.
- **Client responses:** decisions/comments captured; closed in D1; no
  per-event in-app notification (G-07).
- **Revisions:** partial (legacy shared link has no immutable version).
- **Reminders / activity feeds:** project Activity feed exists.
- **Notifications:** broadcast-only — comment/decision/invite events have no
  producer (`notification-actions.ts`).
- **Saved preferences:** workspace export settings persist.

**Likely retention event:** second estimate with at least one reused library
item. Not measured (G-08).

---

## F. Product analytics and learning (Lens F)

### Operational telemetry — present and built

- Web Vitals via native PerformanceObserver, POST `/api/internal/web-vitals`,
  persisted to `web_vital_events` (`observability-repository.ts:211`).
- Client errors via `/api/internal/client-error`, table `client_error_events`.
- Cron run / ops run events (`recordCronRunEvent`, `recordOpsRunEvent`).
- Structured logger (`logger.ts`); Workers Observability enabled in
  `wrangler.jsonc:128-142` (head_sampling_rate 1, logs persisted, **traces
  disabled**).
- Cloudflare Web Analytics + Microsoft Clarity page-view beacons on public
  pages.

### Product analytics — effectively ZERO first-party funnel events (G-04)

**2nd-pass correction (DEF-30):** the 1st pass overstated this gap. GA4 IS
wired via `@next/third-parties/google` (`package.json:140` declares
`@next/third Parties`; `src/components/landing/LandingAnalyticsLoader.tsx:3,20,27`
imports `GoogleAnalytics` and mounts `<GoogleAnalytics gaId={gaId} />` gated
on `NEXT_PUBLIC_GA_MEASUREMENT_ID`). The A/B helper
(`src/lib/ab-testing/experiment-tracker.ts:29-78`) fires GA4
`experiment_view` and conversion events for landing-page variants.

What does NOT exist — and is the load-bearing gap:

- No first-party product-event emitter. Negative grep for
  `trackEvent|logEvent|recordEvent|emitEvent|identify(` over
  `src/components src/hooks src/app` → only `recordEvent` in
  `perf/server-timing.ts:44` (internal perf trace) and the A/B tracker above.
- No `/api/track` or `/api/events` route (the directory
  `src/app/api/share/[token]/events/` exists but is **empty** — confirmed
  `ls`, no `route.ts`).
- No PostHog / Mixpanel / Plausible / Umami SDK in `package.json`.
- No activation-funnel or attribution events emitted anywhere — only landing
  pageviews + A-B variant events reach GA4.

So the fix scope is unchanged (emit ~8 first-party funnel events to a local
D1 `product_events` table), but the framing no longer erases the existing
GA4 mounting.

### What IS measured — the activation ledger

A typed 12-milestone taxonomy exists (`activation-types.ts:1-14`):
`invite_accepted, workspace_ready, project_created, first_area_created,
first_row_priced, first_valid_total, health_reviewed, export_completed,
publication_created, recipient_opened, recipient_engaged, recipient_decided`.

Cohort aggregate query `getActivationCohortAggregateForPlatformAdmin`
(`activation-cohort-repository.ts:126-155`) and stalled-state classification
(`listActivationCohort`, `:224-332`) with 24h setup / 72h value thresholds
(`:231-234`). This is **the** founder learning surface today, and it is good —
but it covers only the in-product funnel, not the landing/lead side, not
feature-level usage, and not week-N retention.

### Known activation defects (G-03)

- Milestone `health_reviewed` is declared (`activation-types.ts:7`,
  `activation-producer-contract.ts:26`) but **never emitted** anywhere in
  source. Dead milestone; cohort view will never see users past `health_reviewed`
  for that reason, distorting the funnel.
- **Cross-reference (DEF-31, 2nd pass):** the sibling consistency audit
  REFUTED F-08 (`FirstEstimateChecklist` mounted nowhere) and reclassified
  the entire activation-checklist subsystem as dead code. So the G-03 gap is
  broader than the 1st pass stated: the *display side* is dead (checklist
  component unmounted, `/workshop/onboarding` is a 5-line redirect) AND the
  *producer side* is dead (`health_reviewed` never emitted). Confidence stays
  CONFIRMED; the unit scope (UNIT-003) expands to "mount + wire or remove."

### Week-N retention — NOT computed (G-08)

`activation-retention.ts` is about **data TTL** (`purgeExpiredActivationData`
deletes events older than 180 days; `:164-206`), not user retention. There is
no `retention_week_N`, no cohort return-rate, no calendar grid.

### Minimum Stage A/B event taxonomy

See `03-EXPERIMENTS-METRICS-AND-OPERATING-PLAN.md` §C. Minimum set:
landing-side (`landing_cta_click`, `access_request_submitted`,
`access_request_qualified`), funnel-side (`invite_accepted`,
`project_created`, `first_valid_total`, `export_completed`,
`publication_created`), and reuse-side (`library_item_reused`,
`second_estimate_created`). The activation ledger already covers most of the
funnel-side; the missing pieces are landing-side and reuse-side.

---

## G. Feedback, research, and decision system (Lens G)

### Capture — built

- In-product feedback at `/workshop/feedback` → `beta_feedback_submissions`
  (migration `0001`). Schema includes `type` (`bug, confusing_ux,
  missing_feature, export_issue, estimate_accuracy, other`) and `severity`
  (`blocker, high, medium, low`) and `status` (`new, reviewing, resolved,
  archived`).
- Triage UI at `/workshop/settings/feedback` (note: under workshop settings,
  not `/admin`).
- Support inbox Durable Object (`SUPPORT_INBOX`) wired but only for realtime
  chat; persistence in D1 `support_conversations` + `support_messages`.
- `SupportChatWidget` is implemented but **not mounted anywhere** (grep
  returns no consumer). Feature flag `admin_support_realtime` defaults to off.

### Synthesis and decision — incomplete (G-07)

- The notification fan-out system has kinds defined for `collaboration`,
  `publication_activity`, `beta_feedback` (`notification-actions.ts:18-30`)
  but **no producer writes them**. Only `broadcastNotification` writes
  deliveries, which is admin-push-only.
- So: when a user submits beta feedback, no in-app notification reaches the
  founder. When a client comments on a shared link, no in-app notification
  reaches the founder. (Owner digest email fires — 15-min rate-limited —
  `triggerOwnerDigestIfAllowed` `actions.ts:1869`.) The founder must remember
  to check `/workshop/settings/feedback` and the project Activity feed.
- No severity-based escalation. No "repeated friction" detection. No
  qualitative-coding framework.

### Acceptable manual state for Stage A

- Weekly founder review of the feedback queue + activity feed is the right
  cadence. See `03-EXPERIMENTS-METRICS-AND-OPERATING-PLAN.md` §E.
- One lightweight wiring change unlocks most of the value: have
  `submitBetaFeedback` and the comment/decision routes also call
  `broadcastNotification` (or write a `notification_deliveries` row targeted to
  the founder). ~1–2 hours. (G-07.)

---

## H. Pricing and monetization (Lens H)

### What exists

- Public `/pricing` page is **honest about no numbers** — tier shape only:
  Free / Solo / Pro / Team, plus references to an Education tier and future
  Owner/Portfolio tier (`pricing/page.tsx:174-179`). Philosophy: freemium,
  seat-based, peso-denominated, never meters estimating/exports/BOQ
  (`pricing/page.tsx:42-54`). "Cement anchor" value-framing concept. Founder-
  member rate referenced without a number.
- Validation criteria documented: 5 discovery calls, 2 active users on real
  estimates, Van Westendorp PSM study (`pricing/page.tsx:181-187`).
- This is the correct public posture for an unvalidated product.

### What does NOT exist

- **Zero billing code.** No Stripe / LemonSqueezy / Paddle in `package.json`
  (negative grep). No `plans`, `subscriptions`, `invoices`, `payments`,
  `customers` tables (negative grep over `migrations/`). Correct absence.
- **No entitlement concept.** No `users.plan`, no `maxProjects`, `maxRows`,
  `seats`, `quota` in code (only rate-limit quotas, e.g. AI Ask at 10/min —
  `ai/rate-limit.ts:21-25`). The `tier` concept exists only as marketing copy.
- **No manual-invoice helper.** Negative grep for `recordPayment|manual_invoice|
  recordInvoice` → zero matches. (G-10.)
- **No WTP interview template or pricing-decision record** in code.

### What must be validated before publishing prices

1. **Problem interviews** with 5+ beachhead candidates: how do they estimate
   today, how long does it take, what does it cost them in time/errors?
2. **Value interviews** with 2+ design partners running real estimates: how
   much time did Archestimator save, what is that worth in PHP?
3. **Van Westendorp PSM** with the cohort: at what price is it too cheap / a
   bargain / getting expensive / too expensive?
4. **Direct WTP ask** with a concrete founding-member number.
5. **Alternative mapping**: which tool or service would they stop paying for
   or stop using if they adopted Archestimator? (Master prompt §15.E.)

### Smallest first-payment process

Manual invoice + bank transfer / GCash / PayPal, recorded in a
`manual_invoices` D1 table with `status` (`draft|sent|paid|void`) and a
`workspace_entitlements` table recording what the payment unlocks. No Stripe.
This is the right Stage C shape and defers all billing complexity until paid
volume justifies it. (G-10.)

### Feature boundaries (initial hypothesis)

| Tier | Boundary |
|---|---|
| Free | 1 workspace, 1 active project, library cap (e.g. 50 items), no custom branding on export, watermark-free BOQ |
| Solo | Unlimited projects, library cap lifted, custom branding on export, share links, client portal |
| Pro | Multi-currency (when shipped), price-freshness alerts, advanced analytics |
| Team | Multi-seat, shared library, role-based access, audit log export |

**Reject** limits that tax the core loop: do **not** meter BOQ rows, estimates
created, or exports — that punishes the behavior that creates the moat
(master prompt §10.H). Library item count is the most natural value metric
because reuse *is* the product.

---

## I. Founder operations (Lens I)

### Manual process inventory

| Process | Today | Stage A target | Source |
|---|---|---|---|
| Grant beta access | Type email at `/workshop/settings/users` → `INSERT INTO closed_beta_allowed_emails` | Keep manual | `closed-beta-d1-store.ts:120-139` |
| List users | `/admin/users` with `last_session_at` (better-auth `session.updatedAt`) | Keep | `users-repository.ts:110-118` |
| Find inactive users | No `last_activity_at`; admin user detail admits *"product activity arrives in a later slice"* (`users/[userId]/page.tsx:167-169`) | Add via activation ledger | cohort query exists |
| Review feedback | `/workshop/settings/feedback` (not `/admin`) | Add notification | `beta-feedback-d1-store.ts` |
| Review support | `/admin/support` (50 conversations, no assignee/SLA/severity fields — `migrations/0042_…sql`) | Keep flat | `support/page.tsx` |
| Review incidents | `/admin` open-incidents card + `/admin/observability` | Keep | `admin/page.tsx:173-185` |
| Triage cohort stalled | `/admin` activation aggregate (admin-only) | Promote to single dashboard | `activation-cohort-repository.ts:224-332` |
| Send announcement | `/admin/notifications` → `broadcastNotification` | Keep | `notification-actions.ts:40` |
| Toggle features | `/admin/flags` (audited) | Keep | `feature-flags.ts:100-132` |
| Export user data | **No admin action.** DSAR intake is anonymous public POST only (`/api/compliance/privacy-requests`) | Add admin helper | `privacy-request-repository.ts` |
| Delete user/workspace | **No admin action.** User admin actions limited to suspend/ban/reactivate (`user-actions.ts:77-87`) | Add when paid | — |
| Restore data | **No PITR config in `wrangler.jsonc`.** No restore runbook. | **MUST CONFIGURE before cohort** | `wrangler.jsonc` |

### Operability classification (master prompt §10.I)

- **Acceptable concierge:** granting access, weekly cohort review, support
  replies, announcement broadcasts, feature flag toggles, manual qualification
  calls.
- **Document now:** beta-ops runbook (grant access, suspend, reactivate,
  announce, pause cohort, restore); incident response; backup/restore drill.
- **Automate before user #5:** lead capture (so leads aren't lost); activation
  dashboard card (so weekly review is fast); feedback→notification wiring.
- **Automate before user #20:** week-N retention metric; DSAR admin helper;
  user-data export.
- **Automate before paid launch:** manual-invoice helper; entitlement
  enforcement; backups/PITR with restore drill.

### Founder time estimate (per active workspace, weekly)

At 5–8 users with founder-led onboarding: ~30–60 min/user/week (call + support
+ review). At 20 users: ~15–30 min/user/week (mostly support + review). These
are inferences; the actual cost should be measured as experiment
"Founder Operability" (master prompt §15.6).

---

## J. Trust, reliability, and legal minimums (Lens J)

### Built and proven-in-source

- **Authentication:** Better Auth with magic link + Google OAuth; sessions in
  D1; cookieCache disabled so every request hits D1; 7d TTL; rate-limited
  (`better-auth-cloudflare.ts:199-211`). Production fail-closed for admin
  email env (`roles.ts:45`).
- **Workspace isolation:** enforced via `isWorkspaceMemberInD1`
  (`authz/d1-access.ts`); XLSX export audience gate is server-resolved
  (`proposal.xlsx/route.ts:81-90`).
- **Shared-link security:** password-protected (signed cookie), expiring
  (`expires_at` checked live), revocable (`revoked_at` checked live), all
  re-evaluated per request (`public-repository.ts:134-139`). Constant-time
  password verify; durable rate limit on password failures.
- **Invite lifecycle:** signed tokens; fail-closed on null user/token hash
  mismatch (`invitation-acceptance.ts:26-31`); token `topic` claim must match
  room for all DOs (`collaboration-room.ts:7`).
- **Totals oracle:** integer minor-units with overflow checks; transparent
  formulas; currency whitelist (`estimate-row-total.ts:17`).
- **Audit trail:** admin actions logged (`audit_events`); feature flag updates
  audited.
- **Terms clickwrap:** acceptance recorded with timestamp
  (`legal/terms-gate.ts:1-26`); enforced at workshop layout gate.

### Trust gaps

- **G-11 Backups / PITR:** **not configured.** `wrangler.jsonc` has no `backups`
  or `time_travel` settings. No restore runbook. No restore drill evidence.
  D1 has Cloudflare-managed PITR but it must be enabled and tested. This is a
  Stage A trust blocker — a single bad migration is currently unrecoverable
  from a process perspective.
- **G-12 External uptime monitor:** none. `/api/health/route.ts:7-16` returns a
  trivial `{ ok: true }` with no DB/R2/Queue probe. No Statuspage / Better
  Stack / Pingdom. For closed beta with 5–8 known users this is acceptable but
  should be wired before paid launch.
- **G-14 Legal gaps:** data residency not stated (governing law is "Republic of
  the Philippines placeholder" — `terms-content.ts:129`); subprocessor list
  incomplete (Cloudflare named, Google not — `privacy/page.tsx:49-51`); Terms
  status is `closed_beta_owner_approved_pending_counsel_review`
  (`terms-content.ts:148-157`). Closed-beta-appropriate but not paid-launch-
  ready.
- **Sentry absent.** Notable given Cloudflare-native stack. Client errors go to
  D1 `client_error_events`; operational logs to Workers Observability. For
  Stage A this is acceptable; the `/admin/observability` reader surfaces them.
- **Mobile editing unblocked.** No desktop-only guard on the estimate sheet
  (grep returned nothing). A solo user on a phone could edit an estimate with
  poor UX; not a trust risk but a quality risk. Tolerable with disclosure.
- **`admin_maintenance_mode` flag is dead.** Settable at `/admin/flags` but
  enforces nothing (`admin/flags/page.tsx:7-12`). Either wire or remove.

### Trust evidence separation (master prompt §10.J)

| Item | Code built | External config | Manually operable | Evidenced | Unproven | Legally reviewed |
|---|---|---|---|---|---|---|
| Auth + sessions | yes | yes (env) | no | source only | hosted runtime | no |
| Workspace isolation | yes | no | no | source only | — | no |
| Shared-link gates | yes | no | yes (revoke) | source only | — | no |
| Invite lifecycle | yes | no | yes | source only | — | no |
| Backups / restore | **no** | **no** | **no** | **no** | **yes (untested)** | no |
| Email delivery | yes | yes (env-gated) | yes (retry helper) | partial | hosted delivery | no |
| Terms/Privacy | yes | no | no | yes (status field) | — | **pending counsel** |
| Subprocessor accuracy | partial | no | yes (update copy) | no | Google omission | no |
| DSAR | partial (intake only) | no | yes | no | fulfillment | no |
| Uptime | no | no | no | no | yes | no |

---

## K. AEC and Philippine market fit (Lens K)

### Built-in PH fit — strong

- **PHP default currency** pervasive (`estimates.currency_code` default PHP —
  `migrations/0029_…sql:2`; `cost_library_item_price_options.currency` default
  PHP — `migrations/0026_…sql:85`).
- **en-PH locale** for display (`ProjectEstimatesTable.tsx:77-79`,
  `currency-input.tsx:15`).
- **12% PH VAT default** (`proposal-preview-model.ts:11`,
  `proposal-export/settings.ts:18-20`); user-editable; tax-inclusive vs
  tax-exclusive selectable (`ProposalExportPreviewDialog.tsx:413-428`).
- **BOQ export** with division letters, sections, subtotals, "BID FORM / BILL
  OF QUANTITIES" worksheet title (`create-proposal-workbook.ts:321`).
- **Comprehensive unit library** including metric (sqm, m, kg, tonne),
  imperial, packaging, counts (`unit-options.ts:1-273`).
- **Comprehensive price history** with `pricing_date`, `pricing_source`,
  `source_url`, `is_current` flag (`migrations/0028_…sql:65-87`).
- **Workspace price freshness policies** for stale-day tracking per category
  (`migrations/0072_…sql:14-32`) — directly addresses PH inflation/supplier
  price volatility.
- **Multiple PHP-friendly payment realities** can be supported via manual
  invoicing (GCash, bank transfer) without Stripe.

### Partial / segmented gaps

- **Labor vs material separation:** only metadata-JSON, no schema column. PH
  contractors typically quote labor separately for direct-cost transparency.
  `laborUnitCost` is read from metadata (`authoring-projection.ts:113`) and
  defaults to 0 (`estimates/types.ts:155`). Tolerable for beta; promote to a
  real column before paid.
- **`projects.currency_code` defaults to `'USD'`** at migration level
  (`migrations/0015_…sql:3`) though UI masks to PHP. Schema/code drift — should
  be fixed (consistency audit F-01-adjacent).
- **Contractor / identity profile:** XLSX export contractor name is interim
  workspace name (`route.ts:240-241`); no contractor profile, logo, or
  letterhead. The proposal artifact lacks the credibility PH clients expect
  (signed letterhead). G-09.
- **Commercial Terms sheet** is placeholder-only ("To be confirmed") —
  `create-proposal-workbook.ts:588-607`. PH clients expect specific payment
  terms (downpayment %, progress billing, retention). Not a beta blocker but a
  credibility gap for the artifact handed to the client.
- **Mobile / field use:** no field-data-capture mode (e.g. site measurements
  into a draft estimate). Out of scope for the first beachhead.
- **Internet reliability:** Cloudflare edge + R2 + D1 are well-suited to PH
  intermittent connectivity; no offline mode exists. Tolerable.

### BOQ expectations

PH clients expect: division-of-work structure, section subtotals, clear
quantities and units, alternative bids optional, signed bid form. Archestimator
delivers most of this via the BOQ export. Missing: signature block content
(actual names/date placeholders only), contractor letterhead. G-09.

---

## L. Scope discipline and kill list (Lens L)

### Feature area classification

| Area | Classification | Rationale |
|---|---|---|
| Estimate tree + rows + totals | **core now** | The product. |
| Component library (CRUD) | **core now** | Reuse thesis requires it. |
| Templates + linked instances | **enabling now** | Reuse accelerator. |
| BOQ XLSX export | **core now** | The handoff artifact. |
| Shared link + password + revoke | **core now** | Trust for handoff. |
| Client comments + decisions | **enabling now** | Closes the loop. |
| Authentication (magic link + Google) | **core now** | Required. |
| Activation ledger + cohort | **learning infrastructure** | Founder visibility. |
| In-product beta feedback | **learning infrastructure** | Captures friction. |
| Admin shell + user list + flags + audit | **core now** (founder ops) | Solo-founder operable. |
| Email (Cloudflare) | **core now** | Invite + digest + support reply. |
| Realtime collaboration (DOs) | **defer** for solo beachhead | Built; not core to solo ICP. Hide not delete. |
| Client Portal immutable issues | **defer** | Richer than needed for Stage A; XLSX + shared link suffice. Hide behind a flag. |
| AI Ask / Package Builder | **defer / hide** | Default OFF. Leave OFF. |
| Admin Copilot | **defer** | Read-only; gated on DeepSeek key. Founder convenience, not user value. |
| Support chat widget (DO) | **defer** | Built but unmounted. Stage A uses async + email. |
| A/B testing infrastructure | **defer** | Only hero-cta-copy variant live. Premature at 5–8 users. |
| Landing page GSAP animations | **defer optimization** | Works today; not a blocker. Defer perf work until LCP becomes a release gate. |
| Enterprise proposal features | **defer** | Multi-stakeholder approvals, custom workflows. Not solo ICP. |
| Mobile editing | **defer** | No guard; tolerate poor UX in beta. |
| PDF generation | **defer / kill for now** | Not a beta blocker. Build only if a paying client demands it. |
| Immutable issued proposals on legacy shared link | **defer** | Client Portal has this; legacy path does not. Pick one surface, do not maintain both long-term. |
| Self-serve billing | **defer** | Public-launch scope. |
| Advanced analytics | **defer** | Build the minimal event taxonomy first. |
| `data/local/seed.json` | **delete or consolidate** | Dead weight from pre-D1 era; nothing in `src/` imports it. Either delete or wire as a real sample-data path. |
| `exceljs` npm dependency | **delete or consolidate** | Declared in `package.json` but used only by vitest export tests; production export uses in-house `xlsx-workbook.ts`. Likely safe to drop. |
| `admin_maintenance_mode` flag | **delete or consolidate** | Dead flag; settable but enforces nothing. Either wire or remove. |
| `admin_analytics_server_pulls` flag | **defer** | Reserved, unconsumed. Keep reserved. |
| `health_reviewed` activation milestone | **delete or wire** | Declared, never emitted. Either remove from the taxonomy or add an emitter. |

### Where the product is overbuilt

- The **Admin shell** (`/admin/*`, exactly 21 routes — `find src/app/admin -name page.tsx \| wc -l`; full sidebar grouping) is sized
  for a company, not a 5–8-user beta. The overbuild is acceptable because it is
  mostly read-only views, but it gives a false sense of operational maturity
  that the underlying metrics do not support.
- The **Client Portal immutable-issues system** (19 tables, content-addressed
  issues, superseded lifecycle) is overbuilt for the BOQ-XLSX ICP. The legacy
  shared link is what users actually use today.
- **Realtime collaboration** (two Durable Object classes + presence
  broadcasting) is overbuilt for the solo beachhead. The infrastructure is
  valuable but should not be a headline feature for the first cohort.

---

## M. Documentation drift (master prompt §4, §8)

(2nd pass: trimmed to drift items with a startup-side consequence unique to
this audit. Provider-era and dead-code drift items (Vercel/Supabase freeze,
`seed.json` no-importer, `exceljs` unused-in-app, `projects.currency_code`
USD default) are recorded in `AGENTS.md`, `known-issues.md`, the README, and
the sibling improve/consistency audits — repeating them here violates
Frontier-Planning-Kernel §7.)

### Startup-side drift items

| # | Stale claim | Current source truth | Drift path | Risk |
|---|---|---|---|---|
| D-02 | `/signup` is a signup form | `/signup` renders `<ClosedBetaGate />` (request-access gate). Comment: *"L-FUN-2 GATED: when self-serve is enabled, replace with `<SignupForm>`"* (`signup/page.tsx:6-9`). | `signup/page.tsx` | Marketing risk: copy elsewhere may still imply self-serve signup. |
| D-03 | `/workshop/onboarding` is an onboarding flow | 5-line redirect to `/workshop/settings` (`onboarding/page.tsx`). | `onboarding/page.tsx` | Product risk: any external doc or plan that cites `/workshop/onboarding` as the first-value surface is wrong. |
| D-06 | Notifications are sent on comment/decision/invite | Only admin broadcasts. Comment/decision/invite event producers do not exist (`notification-actions.ts`). | `migrations/0009_notifications.sql`, `notification-actions.ts:18-30` | Expectation risk: the schema *looks* like notifications are wired; they are broadcast-only. |
| D-07 | "Active teams" is a real metric | Hard-coded `"—"` with hint *"Repository lane pending"* (`admin/page.tsx:107`). | `admin/page.tsx` | Founder-ops risk: dashboard implies a metric that does not exist. |
| D-08 | `health_reviewed` is part of activation | Declared in taxonomy; never emitted anywhere in source. | `activation-types.ts:7` | Analytics risk: cohort funnel shows a permanent gap. |
| D-10 | Pricing tiers Free/Solo/Pro/Team are real | Marketing copy only; no `tier`/`plan` runtime concept. | `pricing/page.tsx:174-179` | Monetization risk: anyone reading `/pricing` assumes entitlements are enforced. They are not. |

### Recommendation per drift item

- D-02, D-03, D-08: **fix-forward** as small implementation tasks (covered
  by UNIT-001, UNIT-003, UNIT-012).
- D-06, D-07, D-10: **this audit's gap register** — startup-side
  consequences (G-04, G-05, G-10).

---

## N. Findings register (evidence-backed)

Format per master prompt §11. Each finding has: ID, stage, category, persona,
job/journey, source evidence, status, confidence, startup consequence,
smallest viable response, manual workaround, metric/experiment, effort,
dependency, owner-decision, recommendation.

### S-series (startup-side gaps)

| ID | Stage | Category | Persona affected | Job/journey | Source evidence | Status | Confidence | Startup consequence | Smallest viable response | Manual workaround | Metric | Effort | Deps | Owner decision | Recommendation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **G-01** | A | Acquisition | Founder | Journey 1 (visitor → qualified design partner) | `ContactForm.tsx:73-84` mailto-only; `ClosedBetaGate.tsx:42-78` `POST /contact` has no handler (`contact/page.tsx` is force-static, no `route.ts`); no D1 table for leads (`migrations/` negative grep) | MISSING | CONFIRMED | Cannot attribute signups to CTAs; cannot capture qualification fields; leads lost when mailto draft abandoned; no pipeline visibility | `beta_access_requests` D1 table + server action on `/api/access-requests` capturing name, email, persona, company, volume, current_tool, source_cta, status; rewire ClosedBetaGate + ContactForm to POST it | Email to support@ + manual spreadsheet | `access_request_to_kickoff_conversion`, `source_of_qualified_leads` | S | — | No | **build** |
| **G-02** | A/B | Activation | Solo estimator | Journey 3 (first 10–30 min) + Journey 4 (spreadsheet → Archestimator) | No import code: negative grep over `src/` for `xlsx.read`, `sheet_to_json`, `papaparse`, `csv-parse`, `bulkCreate`; library insert is single-row only (`AddComponentModal.tsx` 2688 lines); library empty-state signals library-first (`ComponentLibraryManager.tsx:1909-1922`) | MISSING | CONFIRMED | Largest adoption blocker; user must hand-key their existing supplier price list; product promise "never start from zero" breaks at the moment of cold-start | CSV/XLSX import into cost library: parse → map columns → preview → bulk insert; validation; per-workspace cap | Founder concierge import: user sends spreadsheet, Philip keys it | `import_completion_rate`, `library_size_at_day_7` | M | G-04 (instrument first) | No (already a spike in `031-spike-library-bulk-import.md`) | **build** |
| **G-03** | A | Activation | Solo estimator | Journey 3 | `/workshop/onboarding/page.tsx` is 5-line redirect to `/workshop/settings`; `FirstEstimateChecklist.tsx` has zero production consumers; milestone `health_reviewed` declared (`activation-types.ts:7`) but never emitted | PARTIAL / MANUAL_BUT_FRAGILE | CONFIRMED | Real users hit empty workshop shell with no in-product guidance; activation milestone funnel shows permanent gap at `health_reviewed` | Mount `FirstEstimateChecklist` in `WorkshopDashboard`; default first-session to guided-sample path; either emit `health_reviewed` or remove it | Founder joins first session live | `time_to_first_value`, `checklist_completion_rate` | S | — | No | **build** |
| **G-04** | A | Learning | Founder | All journeys | Zero product-event emitters (negative grep); no `/api/track`; no GA4/PostHog SDK; A/B helpers cover landing variants only | MISSING | CONFIRMED | Cannot measure funnel; every retention/pricing/ICP decision is guesswork; activation ledger covers in-product only, not landing-side | `recordProductEvent(name, props)` writing to `product_events` D1; emit ~8 events covering landing + lead + funnel + reuse (see `03-…md` §C); wire `/admin` to surface | Manual review of activation cohort + DB queries | Per-event counts, conversion %, week-N retention | S–M | — | No | **build (narrow scope)** |
| **G-05** | A/B | Founder ops | Founder | Journey 9 | No single founder dashboard; "Active teams" metric hard-coded `"—"` (`admin/page.tsx:107`); insight scattered across exactly 21 admin pages | PARTIAL | CONFIRMED | Weekly review is slow; founder cannot see acquisition/access/activation/retention/support/incidents in one view | Single "Beta health" card on `/admin` replacing the placeholder; reuse `listActivationCohort` + new `beta_access_requests` + `beta_feedback_submissions` | Manual cross-page review | Weekly review time | M | G-01, G-04 | No | **build (partial in initial spike)** |
| **G-06** | A | Activation | Solo estimator | Journey 4 + D-04 | `data/local/seed.json` is dead weight; live sample is `startGuidedSample()` only (button-triggered) | PARTIAL | CONFIRMED | New workspace is empty; only the button-triggered guided sample proves value; first-time user without Philip has no clear "start here" | Either delete `seed.json` or wire it as a real auto-seed on first workspace; default the workshop home empty-state to "Start guided sample" | Philip runs sample in first call | `% users completing guided sample` | S | G-03 | No | **decide** (delete vs wire) |
| **G-07** | A/B | Learning | Founder | Journey 8 + Lens G | Notification kinds `collaboration`, `publication_activity`, `beta_feedback` defined but no producer writes them (`notification-actions.ts:18-30`); only `broadcastNotification` writes deliveries | PARTIAL | CONFIRMED | Founder must remember to check feedback queue and activity feeds; risk of missing a critical beta issue for days | Have `submitBetaFeedback` + comment/decision routes write a targeted `notification_deliveries` row to the founder (or use `broadcastNotification` with a targeted audience) | Daily manual check | Time-to-founder-acknowledgement of feedback | S | — | No | **build** |
| **G-08** | B | Retention | Founder | Lens E + Lens F | `activation-retention.ts` is data TTL only; no week-N retention metric; no reuse-rate metric; cohort stalled-state exists but no return-rate | MISSING | CONFIRMED | Cannot tell whether design partners return; cannot prove the reuse thesis with data | Compute week-1 / week-4 active-workspace rate from activation events; compute library-reuse rate from `source_library_item_id` lineage | Manual DB query per cohort | `week_1_active_workspaces`, `library_reuse_rate` | S | G-04 | No | **build** |
| **G-09** | A/B | Trust/credibility | Solo estimator + their client | Journey 5 | XLSX Commercial Terms sheet is placeholder-only ("To be confirmed", `create-proposal-workbook.ts:588-607`); contractor identity is interim workspace name (`route.ts:240-241`); no contractor profile / logo / letterhead; "Estimated duration" hardcoded "To be confirmed" (`create-proposal-workbook.ts:524`) | PARTIAL | CONFIRMED | The proposal artifact handed to a PH client lacks letterhead/branding/terms — credibility moment is weakened | Contractor profile (name, logo, letterhead, default payment terms, default validity); surface in XLSX export | Philip advises user to add terms manually in Excel before sending | Client decision rate, client feedback on artifact | S | — | No (founder Member profile direction) | **build** |
| **G-10** | C | Monetization | Founder + first paying user | Journey 10 | No billing code (correct); no manual-invoice helper; no entitlement concept in code | MISSING (intentionally) | CONFIRMED | No path from "user names a budget" to "user is invoiced and entitlement recorded"; pricing conversations cannot convert | `manual_invoices` D1 table + admin helper; `workspace_entitlements` table; manual bank/GCash/PayPal | Off-product: invoice via email, track in spreadsheet | Manual-invoice conversion, churn reason | M | WTP evidence | Yes (pricing structure) | **defer until WTP evidence** |
| **G-11** | A | Trust | All | Lens J | No `backups` / `time_travel` / PITR config in `wrangler.jsonc`; no restore runbook; no restore drill | EXTERNAL_SETUP_REQUIRED | CONFIRMED | Single bad migration or admin delete is unrecoverable from a process perspective; beta data loss would end the experiment | Enable D1 PITR; document restore procedure; run one restore drill; record evidence under `.ai/05_logs/` | None | Restore drill success, RPO/RTO | S (config) / M (proof) | — | No | **build (config) + operate (drill)** |
| **G-12** | C | Reliability | Founder | Lens J | `/api/health/route.ts:7-16` returns trivial `{ok:true}` with no DB/R2/Queue probe; no external uptime monitor | PARTIAL | CONFIRMED | Outages invisible until a user complains | Probe-based `/api/health` (D1 + R2 + Queue + Email binding check); wire external uptime monitor (Better Stack / UptimeRobot / Checkly) | Manual check | Uptime %, MTTR | S | — | Yes (monitor choice) | **defer to Stage C**; acceptable for Stage A with 5–8 known users |
| **G-13** | A | Scope | Founder | Lens L | Admin shell 21 routes, Client Portal 19 tables, Realtime collaboration 2 DO classes — all overbuilt for solo beachhead | NOT_NEEDED_NOW | STRONG_INFERENCE | Founder attention diffused; maintenance surface larger than needed | Hide (not delete) Client Portal and realtime behind feature flags for first cohort; keep admin shell as-is (mostly read-only) | None | — | — | — | No | **hide** (do not delete) |
| **G-14** | C | Legal | All | Lens J | Data residency not stated (PH placeholder, `terms-content.ts:129`); subprocessor list incomplete (Google omitted, `privacy/page.tsx:49-51`); Terms status `closed_beta_owner_approved_pending_counsel_review` | MANUAL_AND_ACCEPTABLE (beta) / OWNER_DECISION_REQUIRED (paid) | CONFIRMED | Closed-beta-appropriate but not paid-launch-ready; risk if any design partner is outside PH | Complete subprocessor list (Cloudflare + Google at minimum); state PH data residency; counsel review before paid launch | Disclose in beta agreement | Counsel signoff | S (copy) / M (counsel) | — | Yes (counsel) | **operate manually for Stage A; build for Stage C** |
| **G-15** | A | Onboarding | Solo estimator | Journey 2 | No pre-access beta agreement / expectations doc / risk-disclosure screen beyond Terms clickwrap (`legal/terms-gate.ts:1-26`); request-access gate copy is one line (`ClosedBetaGate.tsx:37-39`) | MANUAL_AND_ACCEPTABLE | CONFIRMED | Design partners have unclear expectations; "is my data safe", "what if it breaks mid-bid", "what does Philip owe me" unanswered | One-page design-partner agreement: data backup expectation, support SLA (none), feedback expectation, founder-member offer terms | Philip explains in kickoff call | Cohort retention, dispute count | S | — | Yes (offer terms) | **operate manually** |
| **G-16** | B | Retention / Collaboration | Solo estimator + occasional collaborator | Journey 7 | Realtime collaboration built but not core to solo ICP; could distract from solo loop if marketed as headline | NOT_NEEDED_NOW | STRONG_INFERENCE | Premature multi-seat messaging pulls roadmap toward enterprise | De-emphasize collaboration in onboarding and landing copy; keep available but not headline; surface only when user invites first collaborator | None | — | — | — | No | **hide behind first-invite** |
| **G-17** | A | Trust / privacy | Solo estimator | Lens J | DSAR admin export/erase helper exists for activation subsystem (`activation-retention.ts:119-162`) but no admin UI invokes it; no general user-data export/delete from admin | PARTIAL | CONFIRMED | Philip cannot fulfil a deletion request without writing SQL | Admin helper: per-user export (zip of their estimates + library) + per-user delete (cascade) | SQL on request | DSAR turnaround time | M | — | No | **defer to Stage C**; acceptable for Stage A |
| **G-18** | A | Acquisition | Founder | Journey 1 | No referral / case-study / release-notes marketing surfaces | MISSING | CONFIRMED | Cannot leverage early satisfied users for warm intros; cannot publish social proof | Internal referral tracking (column on `beta_access_requests`); defer case studies until 2+ willing; ship a public release-notes route once cadence stabilizes | Manual tracking | Referral-sourced leads | S (referral) / M (release notes) | — | No | **build referral field; defer case studies / release notes** |

### Engineering-side gaps (cross-reference only — not re-derived)

These are documented in the other 2026-07-18 audits. Listed here only for
their startup-side consequence:

- **E-01 (consistency F-01, historically CRITICAL; resolved):** The 2026-07-19
  quality master reverified `CONSISTENCY-001` as already implemented after the
  dead labor-cost field and affected projections were removed. Row-total
  consistency remains a trust invariant, but this historical remediation is no
  longer runnable backlog or an active cohort blocker.
- **E-02 (consistency F-09, HIGH):** Closed-beta access not enforced on every
  protected route — a route that forgets `getCurrentUserContext` can bypass it.
  Startup consequence: a leak could expose one design partner's data to
  another. **MVP-BLOCKER (trust).**
- **E-03 (improve 004, P2):** CSRF tokens compared with non-constant-time.
  Startup consequence: low at 5–8 known users but unacceptable for any
  publicly-reachable form. **PAID-MVP-P1.**
- **E-04 (improve 002, P1):** D1 batch helpers silently no-op on non-atomic
  databases. Startup consequence: writes that should be atomic (e.g. grant
  access + audit event) may partially apply. **MVP-LEARNING-P0.**
- **E-05 (improve 005, P1):** Hardcoded platform-admin email fallback
  (`philipjonlewis@gmail.com`) in non-production. Startup consequence: dev
  convenience; correctly production-fail-closed. **NOT_NEEDED_NOW** for the
  audit but a known anti-pattern.

These five engineering findings are not duplicated here. Implementation
authority and ordering live in their own packs.

---

## O. Capability truth map (master prompt §8 — surfaces confirmed)

| Surface | Status | Key evidence |
|---|---|---|
| Public landing (`/`, `/about`, `/features`, `/pricing`, `/contact`, `/trust`, `/security`, `/terms`, `/privacy`) | BUILT_AND_PROVEN (static); conversion funnel MISSING | `src/app/{about,features,pricing,contact,trust,security,terms,privacy}/page.tsx` |
| Auth (`/login`, `/signup`, access-required, invite) | BUILT_AND_PROVEN | `better-auth-cloudflare.ts`, `request-proxy.ts`, `ClosedBetaGate.tsx`, `/invite/[token]` |
| Workshop homebase | BUILT (no first-run branching) | `workshop/page.tsx:119-145` |
| Onboarding route | **STUB (redirect only)** | `workshop/onboarding/page.tsx` 5 lines |
| Project creation | BUILT_AND_PROVEN (1 required field) | `projects/actions.ts:1104-1186`, `FirstProjectZeroState.tsx` |
| Estimate creation | BUILT_AND_PROVEN | `estimates/actions.ts:1760-1813` |
| Tree + row editing | BUILT_AND_PROVEN | `use-estimate-row-handlers.ts`, virtualization at `load-limits.ts:1-3` |
| Component library | BUILT (no bulk create, no import) | `library/components/page.tsx`, `AddComponentModal.tsx` |
| Templates + linked instances | BUILT_AND_PROVEN | `library/templates/*`, `migrations/0092_…sql` |
| Charts + totals | BUILT_AND_PROVEN | `estimate-row-total.ts` (oracle) |
| XLSX proposal export | BUILT_AND_PROVEN (placeholder terms/identity) | `proposal.xlsx/route.ts`, `create-proposal-workbook.ts` |
| PDF export | **MISSING (intentional)** | negative grep, no PDF lib in `package.json` |
| Shared proposal receiver | BUILT_AND_PROVEN | `share/[token]/page.tsx`, `public-repository.ts:134-139` |
| Client comments + decisions | BUILT_AND_PROVEN | `comment/route.ts`, `decision/route.ts:193` |
| Collaboration + invitations + presence | BUILT_AND_PROVEN (deferred as headline) | `collaboration/actions.ts`, `CollaborationRoom` DO, `GlobalPresence` DO |
| Activity + version history | PARTIAL (legacy shared link has no immutable snapshot) | `project_publications`, `client_portal_issues` |
| Beta feedback + support | BUILT (notifications to founder MISSING) | `workshop/feedback/page.tsx`, `admin/support/page.tsx`, `SupportInbox` DO |
| Notifications + announcements | PARTIAL (broadcast-only) | `notification-actions.ts:40`, `ReleaseAnnouncementModal.tsx` |
| Settings + account | BUILT | `workshop/settings/*` |
| Admin/founder surfaces | BUILT (overbuilt; no single dashboard) | `admin/page.tsx`, exactly 21 admin routes |
| Mobile/desktop guard | NOT_NEEDED_NOW (no guard) | grep negative |
| Error / loading / recovery | BUILT_AND_PROVEN | `/access-required`, `client_error_events` |
| Lead capture / waitlist / CRM | **MISSING** | negative grep over migrations |
| Product analytics events | **MISSING** | negative grep over src |
| Billing / entitlement | **MISSING (intentional)** | negative grep over package.json + migrations |
| Backups / PITR / restore drill | **MISSING** | `wrangler.jsonc` negative |
| External uptime monitor | **MISSING** | negative |
| Beta agreement / risk disclosure | MANUAL_AND_ACCEPTABLE (Terms clickwrap only) | `legal/terms-gate.ts:1-26` |
| Referral / case-study / release-notes | PARTIAL (admin release center + in-app announcement) | `admin/releases/page.tsx` |

---

## P. Master-prompt §16 question index

(2nd pass: full per-question prose removed as ceremonial restatement; each
answer lives at the cited location. The 30 questions from the master prompt
are answered by the sections already in this pack.)

| Q | Answer location |
|---|---|
| 1, 21, 22, 29 | §A (Lens A), §L (Lens L) |
| 2 | §A final paragraph (positioning claim discipline) |
| 3, 4, 23 | §C (Lens C) + G-01, G-04 |
| 5, 6 | §D (Lens D) + G-03 |
| 7, 8, 9, 10 | §B (Lens B) + §D + G-02, G-19 |
| 11, 12, 13, 14 | §B + §F (Lens F) + G-04, G-08 |
| 15, 16, 17 | §I (Lens I) + §G (Lens G) + G-05, G-07 |
| 18, 19, 20 | §K (Lens K) + §J (Lens J) |
| 24, 25, 26 | §H (Lens H) + G-10 |
| 27, 28 | §J + §I |
| 30 | `00-EXECUTIVE-VERDICT.md` §12 (single next action) |
