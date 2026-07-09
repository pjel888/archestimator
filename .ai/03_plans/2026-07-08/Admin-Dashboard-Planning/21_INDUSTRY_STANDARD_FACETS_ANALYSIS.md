# 21 — Industry-Standard Facets Analysis

**Created:** 2026-07-09 (Asia/Manila)
**Purpose:** Examine ~40 facets observed in production admin dashboards
(Stripe, Vercel, Supabase, Sentry, Linear, Notion, Retool, Plane, Fly.io,
Render, Railway) and decide for each: **adopt-MVP**, **defer-post-MVP**, or
**reject** (with rationale). Closes GAP-1 from `20`.

This is planning-only. No facet here authorizes implementation without the
owner approval gates named in `15` (OPEN-*).

---

## 21.1 Method

For each facet:
1. **What it is** — one-sentence description.
2. **Who does it** — observed providers (cited from public docs/UI where
   possible; provider UIs change, so treat as snapshot 2026-07).
3. **Archestimator fit** — yes/no/partial with reasoning grounded in current
   codebase evidence.
4. **Decision** — `adopt-MVP` / `defer-post-MVP` / `reject`.
5. **Plan effect** — for `adopt-MVP`, names the new req ID added to `16`.

**Authority note:** Provider UI references are illustrative; they are not
authoritative for implementation. The authoritative decision source is
**Archestimator's codebase + brief + cost posture** (free-tier, solo-dev,
pre-launch).

---

## 21.2 Facet matrix

### Category A — Operational telemetry

#### FACET-1 — Uptime / availability strip
- **What:** A green/yellow/red indicator showing all-systems-ok or current
  degradation, sourced from an external prober or self-reported.
- **Who:** Vercel (status page), Stripe (status strip in dashboard), Fly.io,
  Railway, Render.
- **Archestimator fit:** Partial. We have internal alert scenarios S-01
  through S-07 (`bun run ops:check-alert-scenarios`) but no external prober
  yet. The admin can show **internal** status (recent incidents + recent
  alert firing) without external dependency.
- **Decision:** `adopt-MVP` — internal-only uptime strip.
- **Plan effect:** new `FR-OBS-01` (uptime strip in overview).

#### FACET-2 — External uptime probing (Better Stack / Pingdom / Cron Job Monitor)
- **What:** Third-party probe from geographically distributed locations.
- **Who:** Standard for any SaaS with paying customers (Better Stack, Pingdom,
  UptimeRobot, Cron Job Monitor).
- **Archestimator fit:** Pre-launch, free-tier, solo-dev — overkill. The
  alert scenarios + Workers Logs suffice for now.
- **Decision:** `defer-post-MVP` — until first paid customer.
- **Plan effect:** none.

#### FACET-3 — Status page (public)
- **What:** `status.archestimator.com` showing historical uptime + incident
  history to users.
- **Who:** Stripe, Vercel, Supabase, Linear, Notion, Fly.io, Render, Railway.
- **Archestimator fit:** Pre-revenue, single-operator → not worth maintaining.
- **Decision:** `defer-post-MVP` — until paying customers or SLA.
- **Plan effect:** explicit non-goal added in `20` §20.4.4.

#### FACET-4 — On-call alerting / paging
- **What:** sev1 incidents page the operator via Slack / Opsgenie / PagerDuty
  / SMS.
- **Who:** Sentry, Vercel, Supabase, Stripe, Linear.
- **Archestimator fit:** Solo-dev pre-launch. The existing
  `operational_incidents` webhook (`OPERATIONAL_INCIDENT_ALERTS_ENABLED`,
  `OPERATIONAL_INCIDENT_ALERT_WEBHOOK_URL`) covers this when Philip wires a
  Slack incoming webhook.
- **Decision:** `defer-post-MVP` — admin should expose the env-var config
  as an observability link (admin shows current on/off state, links to
  runbook for setup).
- **Plan effect:** new `FR-OBS-02` (incident-alert config indicator).

#### FACET-5 — Cron job health dashboard
- **What:** Table showing each cron, last run, next run, success/failure
  history.
- **Who:** Vercel, Render, Railway, Fly.io, Notion (internal).
- **Archestimator fit:** Strong. We have 3 crons (`0 3 * * *` upload-cleanup,
  `15 3 * * *` upload-scan, `30 3 * * *` retention). Last-success visibility
  is genuinely useful.
- **Decision:** `adopt-MVP` — cron health strip in Observability section.
- **Plan effect:** new `FR-OBS-03` (cron health strip).

#### FACET-6 — Queue DLQ inspection + replay
- **What:** Dead-letter queue viewer; admin can inspect failed messages and
  replay or discard them.
- **Who:** Render, Railway, Supabase (queues), AWS SQS, GCP Pub/Sub.
- **Archestimator fit:** Strong. We have `UPLOAD_JOBS_QUEUE` + DLQ (max 3
  retries). When a job hits the DLQ, today there's no surface — Philip would
  `wrangler queues queue list` etc. manually. A read-only DLQ count +
  per-message viewer + manual replay button is genuinely valuable.
- **Decision:** `adopt-MVP` (read-only count + viewer; replay optional).
- **Plan effect:** new `FR-OBS-04` (queue + DLQ viewer).

#### FACET-7 — Client error trends (RUM)
- **What:** Aggregated client-side exceptions with stack traces and source
  map resolution.
- **Who:** Sentry, Rollbar, Bugsnag, Vercel (errors), Clarity (errors tab).
- **Archestimator fit:** We have `src/lib/observability/client-error-report.ts`
  already wired to send client errors somewhere. The admin doesn't surface
  them. A simple "top 10 client errors in last 24h" tile is high value.
- **Decision:** `adopt-MVP` — client-error trend tile in Observability.
- **Plan effect:** new `FR-OBS-05` (client-error trend).

#### FACET-8 — Field Web Vitals (RUM)
- **What:** Real-user LCP/INP/CLS p75/p95 percentiles aggregated by route.
- **Who:** Vercel (Web Vitals), Cloudflare (Web Analytics), Sentry (RUM).
- **Archestimator fit:** We have `useReportWebVitals` already wired
  (`providers.tsx`). Surfacing real field data is high value vs lab data
  (Lighthouse).
- **Decision:** `adopt-MVP` — Web Vitals tile, aggregated, privacy-safe
  (no per-user tracking; rolled up).
- **Plan effect:** new `FR-OBS-06` (Web Vitals field tile).

#### FACET-9 — Cost monitoring / bill tracking
- **What:** Estimated Cloudflare spend vs free-tier limits, with projected
  overage alerts.
- **Who:** Vercel (billing in admin), Fly.io (cost meter), AWS Cost Explorer.
- **Archestimator fit:** Free-tier posture (AGENTS). A simple "free-tier
  consumption gauge" (D1 rows read, Workers requests, R2 storage, Queue
  operations) is more valuable than $ tracking for a free-tier product.
- **Decision:** `adopt-MVP` — free-tier consumption tile.
- **Plan effect:** new `FR-OBS-07` (free-tier consumption gauge).

#### FACET-10 — Dependency / supply-chain security alerts
- **What:** Dependabot / Socket / Snyk style alerts on vulnerable deps.
- **Who:** GitHub-native (Dependabot), Vercel, Supabase.
- **Archestimator fit:** GitHub Dependabot is already enabled (or trivially
  so). Admin doesn't need to rebuild it — just link out from Observability.
- **Decision:** `defer-post-MVP` — link out to GitHub Security tab.
- **Plan effect:** new `FR-OBS-08` (security-alerts link-out).

#### FACET-11 — Database query performance viewer
- **What:** Slow-query log + EXPLAIN visualization.
- **Who:** Supabase (SQL editor + query inspector), Railway, PlanetScale.
- **Archestimator fit:** D1 doesn't have a built-in slow-query log.
  `bun run perf:dashboard-query-count` is the closest existing tool. Admin
  doesn't need to rebuild — link out to the perf scripts.
- **Decision:** `defer-post-MVP` — link to existing perf scripts.
- **Plan effect:** new `FR-OBS-09` (query-perf link-out).

#### FACET-12 — Backup status + restore rehearsal
- **What:** Last successful backup timestamp + dry-run restore test result.
- **Who:** PlanetScale, Supabase (PITR), Linear (internal).
- **Archestimator fit:** Strong. We have `cf:d1-restore-rehearsal`. Daily
  backups are automatic (free D1 feature). A "last backup verified" indicator
  with link to run the rehearsal script is high value.
- **Decision:** `adopt-MVP` — backup status indicator.
- **Plan effect:** new `FR-OBS-10` (backup status indicator).

### Category B — User / account operations

#### FACET-13 — User impersonation (admin "log in as")
- **What:** Admin can temporarily assume a user's identity to debug a support
  issue.
- **Who:** Stripe, Vercel, Supabase, Linear, Notion.
- **Archestimator fit:** Solo-dev + privacy-sensitive + audit-leaky even when
  audited. The support flow can be served by the user-detail drawer + the
  existing share/preview surfaces. Impersonation adds a real risk surface
  (CSRF on user actions taken "as" them) for marginal benefit.
- **Decision:** `reject`.
- **Plan effect:** explicit non-goal.

#### FACET-14 — Mass operations (bulk actions on users / content)
- **What:** Multi-select users → bulk deactivate, bulk email, bulk export.
- **Who:** Stripe, Linear, Notion, Retool.
- **Archestimator fit:** We have `mass_deletion_events` table. Solo-dev scale
  doesn't justify bulk-action UI yet, but exposing the existing mass-deletion
  audit log is useful.
- **Decision:** `defer-post-MVP` for action UI; `adopt-MVP` for audit viewer.
- **Plan effect:** new `FR-AUDIT-03` (mass-ops audit viewer in audit page).

#### FACET-15 — Saved views / filter presets
- **What:** User can save a filter set ("open conversations, last 7 days,
  sorted by SLA breach risk") and name it.
- **Who:** Linear, Notion, Sentry.
- **Archestimator fit:** Solo-dev = one user. YAGNI.
- **Decision:** `reject` for MVP.
- **Plan effect:** explicit non-goal.

#### FACET-16 — Command palette (Cmd-K)
- **What:** Quick switcher with fuzzy search across all admin actions.
- **Who:** Linear, Vercel, Notion, Railway.
- **Archestimator fit:** Solo-dev with 7 sections. Sidebar + bookmarks
  suffice. (Also: not user-facing; the speed gain is marginal for one user.)
- **Decision:** `reject` for MVP.
- **Plan effect:** explicit non-goal.

#### FACET-17 — DSAR / privacy-request queue
- **What:** Inbound privacy requests (export/delete) tracked in a queue with
  SLA timer.
- **Who:** Stripe (privacy portal), Notion, Supabase (DSAR tooling).
- **Archestimator fit:** We have `privacy_requests` table (`0033`). When a
  user emails a deletion request, Philip can mint a row and track completion.
  MVP viewer is read-only + status workflow.
- **Decision:** `adopt-MVP` — DSAR queue viewer in Audit section.
- **Plan effect:** new `FR-OPS-01` (DSAR queue viewer; Phase 6 task T-6.5
  extends to cover the mutation path).

#### FACET-18 — Onboarding funnel
- **What:** Conversion from signup → first estimate created → first proposal
  shared.
- **Who:** Stripe, Vercel, Supabase, Mixpanel-integrated dashboards.
- **Archestimator fit:** We have `user_onboarding_profiles` (`0005`). The
  data exists; a simple funnel tile is high-signal for a pre-launch product.
- **Decision:** `adopt-MVP` — onboarding funnel tile in Overview.
- **Plan effect:** new `FR-OVERVIEW-06` (onboarding funnel tile).

#### FACET-19 — Closed-beta funnel
- **What:** Invited → accepted → first action by invite source.
- **Who:** Linear (early access), Notion (waitlist), Vercel (preview).
- **Archestimator fit:** We have `closed_beta_allowed_emails` + audit events.
  Pre-launch is exactly when this matters most.
- **Decision:** `adopt-MVP` — closed-beta funnel tile in Overview.
- **Plan effect:** new `FR-OVERVIEW-07` (closed-beta funnel tile).

#### FACET-20 — Session health
- **What:** Active session count, OAuth provider breakdown (Google vs magic
  link), session duration distribution.
- **Who:** Stripe, Vercel, Supabase (auth dashboard).
- **Archestimator fit:** Better Auth tables expose this. Simple count of
  `session` rows + breakdown by account provider name. Marginal but cheap.
- **Decision:** `adopt-MVP` — session-health tile in Users section.
- **Plan effect:** new `FR-USERS-03` (session-health tile).

#### FACET-21 — Account deletion / lifecycle audit
- **What:** Account-deletion events + retention action visibility.
- **Who:** Stripe, Notion, Linear.
- **Archestimator fit:** Covered by DSAR queue viewer + mass-op audit viewer.
- **Decision:** `reject` as a separate surface (covered by FACET-17 + FACET-14
  viewer).
- **Plan effect:** none.

#### FACET-22 — Email deliverability metrics
- **What:** Bounce rate, complaint rate, sent vs delivered, per-template.
- **Who:** Resend dashboard, Postmark, SendGrid.
- **Archestimator fit:** Cloudflare Email Service is the binding; we don't
  have direct bounce tracking yet (would need webhook integration). Out of
  MVP scope.
- **Decision:** `defer-post-MVP` (requires CF Email webhook integration).
- **Plan effect:** none.

#### FACET-23 — Maintenance mode / read-only mode
- **What:** Master switch that puts the app in read-only for migrations or
  incidents.
- **Who:** Stripe, Vercel, Linear, Notion.
- **Archestimator fit:** Cheap to add — `admin_dashboard_enabled` flag pattern
  can extend to a `maintenance_mode` flag that proxy.ts honors by serving a
  "back soon" page for `/workshop/*` writes.
- **Decision:** `adopt-MVP` — maintenance-mode flag (operator-only, audited).
- **Plan effect:** new `FR-OPS-02` (maintenance mode flag).

### Category C — Search, navigation, productivity

#### FACET-24 — Cross-entity search
- **What:** Search across users, projects, conversations, audit events in
  one box.
- **Who:** Linear, Notion, Sentry.
- **Archestimator fit:** Solo-dev scale; per-section search suffices.
- **Decision:** `reject` for MVP.
- **Plan effect:** none.

#### FACET-25 — CSV / Excel export from admin tables
- **What:** "Export current view" button on user / audit / queue tables.
- **Who:** Stripe, Sentry, Notion, Linear.
- **Archestimator fit:** Cheap once ExcelJS is in deps (already installed).
  Useful for compliance / offline analysis.
- **Decision:** `adopt-MVP` (audit + users tables).
- **Plan effect:** new `FR-USERS-04` (CSV export from users);
  new `FR-AUDIT-04` (CSV export from audit).

#### FACET-26 — Keyboard shortcuts
- **What:** J/K to navigate lists, / to focus search, g+u to go to Users,
  etc.
- **Who:** Linear, Notion, Gmail, Sentry.
- **Archestimator fit:** Solo-dev; marginal. The keyboard-operability is
  mandatory (a11y); the power-user shortcuts are not.
- **Decision:** `reject` for MVP (a11y keyboard still required per `26`).
- **Plan effect:** none.

#### FACET-27 — Recent activity / "what did I do last"
- **What:** Admin's own action history surfaced as a "resume work" prompt.
- **Who:** Linear (your activity), Notion (recent).
- **Archestimator fit:** Covered by audit viewer filtered to actor = me.
- **Decision:** `reject` as a separate surface.
- **Plan effect:** none.

### Category D — Compliance, security, governance

#### FACET-28 — Two-factor enforcement for admin
- **What:** Admin account must have 2FA; admin route enforces.
- **Who:** Stripe, Vercel, Supabase, Sentry (SSO + 2FA requirements).
- **Archestimator fit:** Currently Google OAuth with select_account; Google
  account-level 2FA is presumed. App-side enforcement would require Better
  Auth's 2FA plugin. Pre-launch with one operator, the Google account 2FA +
  CF Access OTP (when OPEN-4 resolved) is the layered gate.
- **Decision:** `defer-post-MVP` (pending Better Auth 2FA plugin evaluation).
- **Plan effect:** new RISK-16 in `14` (2FA reliance on Google account).

#### FACET-29 — Session timeout / idle policy
- **What:** Admin sessions auto-expire after N minutes idle.
- **Who:** Stripe, Vercel (configurable), Linear.
- **Archestimator fit:** Better Auth has `expiresAt` + cookieCache disabled
  (per-request DB check) — already short-lived by design. Explicit idle
  re-auth adds marginal value.
- **Decision:** `defer-post-MVP`.
- **Plan effect:** none.

#### FACET-30 — IP allowlisting
- **What:** Admin routes reachable only from specific IPs.
- **Who:** Stripe (dashboard IP allowlist), Vercel (SSO + IP rules),
  Supabase (network bans).
- **Archestimator fit:** Solo-dev moves between networks; CF Access OTP
  (OPEN-4) is a better fit than IP locking. Pre-MVP: app-layer gate only.
- **Decision:** `defer-post-MVP` (CF Access OTP is the right primitive;
  see OPEN-4).
- **Plan effect:** none.

#### FACET-31 — Audit log streaming / SIEM export
- **What:** Forward `admin_audit_events` to an external SIEM
  (Splunk/Datadog/Chronicle).
- **Who:** Enterprise Stripe, Vercel Enterprise, Notion Enterprise.
- **Archestimator fit:** Solo-dev; no SIEM. CSV export (FACET-25) suffices.
- **Decision:** `reject` for MVP.
- **Plan effect:** none.

#### FACET-32 — Data residency / region display
- **What:** Show where user data is stored (region indicator).
- **Who:** Stripe, Vercel, Notion Enterprise.
- **Archestimator fit:** Cloudflare is the only substrate; D1 region is in
  `wrangler.jsonc` (deployment is `wnam` per `cf:typegen`). A static info
  tile in observability is trivial.
- **Decision:** `adopt-MVP` (static info tile).
- **Plan effect:** new `FR-OBS-11` (data-residency info tile).

#### FACET-33 — License compliance / SBOM
- **What:** List of dependencies + licenses; SPDX export.
- **Who:** Stripe, Vercel (enterprise), Sentry.
- **Archestimator fit:** Pre-revenue; `bun pm licenses` suffices for now.
- **Decision:** `defer-post-MVP`.
- **Plan effect:** none.

#### FACET-34 — Vulnerability scanning
- **What:** Periodic scan of codebase for CVEs.
- **Who:** GitHub CodeQL, Snyk, Socket.
- **Archestimator fit:** GitHub CodeQL / Dependabot already covers deps.
  Bun audit covers the lockfile. Link out from Observability.
- **Decision:** `defer-post-MVP` (link out to GitHub Security).
- **Plan effect:** covered by FR-OBS-08 link-out.

#### FACET-35 — WCAG 2.2 AA conformance statement
- **What:** Public statement of conformance + VPAT.
- **Who:** Stripe, Vercel, Microsoft products.
- **Archestimator fit:** Pre-launch, no enterprise customer requiring it.
  Internal conformance is in `26` regardless.
- **Decision:** `defer-post-MVP` (statement public when enterprise deals
  require it; conformance worked from day one).
- **Plan effect:** none (conformance work happens in `26`).

### Category E — AI / product intelligence (deferred)

#### FACET-36 — AI usage analytics
- **What:** Tiles showing token spend, prompt success rate, tool-call audit.
- **Who:** OpenAI platform dashboard, Anthropic console, Vercel AI gates.
- **Archestimator fit:** AI features ("Ask Flip", Package Builder) are
  deferred per `09`. When enabled, the `ai_action_runs` / `ai_tool_calls` /
  `ai_data_access_events` tables exist and the admin should expose them.
- **Decision:** `defer-post-MVP` (depends on AI reenablement).
- **Plan effect:** none.

#### FACET-37 — A/B experiment viewer
- **What:** Active experiments + results + significance.
- **Who:** Statsig, GrowthBook, LaunchDarkly, Mixpanel.
- **Archestimator fit:** We have an `ab-testing` framework but it's
  marketing-page only; the brief explicitly defers A/B analytics to GA4.
- **Decision:** `reject` for MVP.
- **Plan effect:** none.

#### FACET-38 — Feature-flag targeting / segments
- **What:** Per-user or per-cohort flag targeting.
- **Who:** LaunchDarkly, GrowthBook, PostHog.
- **Archestimator fit:** Pre-revenue. Boolean flags + percentage rollouts
  suffice.
- **Decision:** `defer-post-MVP` (DEC-6 stays D1 + boolean).
- **Plan effect:** none.

### Category F — Mobile / notifications

#### FACET-39 — Mobile push notifications
- **What:** PWA push or native app for sev1 alerts.
- **Who:** Vercel, Sentry, Linear.
- **Archestimator fit:** Email + Slack webhook suffice pre-launch.
- **Decision:** `defer-post-MVP`.
- **Plan effect:** none.

#### FACET-40 — Responsive design
- **What:** Admin works on phone for on-the-go check.
- **Who:** Standard; all providers.
- **Archestimator fit:** Covered in `05` (UX-RESP-01).
- **Decision:** `adopt-MVP` (already covered).
- **Plan effect:** none (existing req).

---

## 21.3 Adopt-MVP summary (new reqs added to `16`)

| Facet | New req ID | Section |
|---|---|---|
| FACET-1 Internal uptime strip | `FR-OBS-01` | Observability |
| FACET-4 Incident-alert config indicator | `FR-OBS-02` | Observability |
| FACET-5 Cron health strip | `FR-OBS-03` | Observability |
| FACET-6 Queue DLQ viewer (read-only) | `FR-OBS-04` | Observability |
| FACET-7 Client-error trend tile | `FR-OBS-05` | Observability |
| FACET-8 Web Vitals field tile | `FR-OBS-06` | Observability |
| FACET-9 Free-tier consumption gauge | `FR-OBS-07` | Observability |
| FACET-10 Security-alerts link-out | `FR-OBS-08` | Observability |
| FACET-11 Query-perf link-out | `FR-OBS-09` | Observability |
| FACET-12 Backup status indicator | `FR-OBS-10` | Observability |
| FACET-32 Data-residency info tile | `FR-OBS-11` | Observability |
| FACET-14 Mass-op audit viewer | `FR-AUDIT-03` | Audit |
| FACET-25 Audit CSV export | `FR-AUDIT-04` | Audit |
| FACET-17 DSAR queue viewer | `FR-OPS-01` | Operations |
| FACET-23 Maintenance mode flag | `FR-OPS-02` | Operations |
| FACET-18 Onboarding funnel tile | `FR-OVERVIEW-06` | Overview |
| FACET-19 Closed-beta funnel tile | `FR-OVERVIEW-07` | Overview |
| FACET-20 Session-health tile | `FR-USERS-03` | Users |
| FACET-25 Users CSV export | `FR-USERS-04` | Users |

**Total new adopt-MVP reqs: 19.** All are surfaced through existing
codebase assets (no new infra, no new providers, no paid add-ons). They are
additive to `04` and traced in the upgraded `16`.

The Observability section absorbs the bulk of the expansion (`FR-OBS-01..11`).
This is the single biggest substantive gap the original plan had: the
admin is the operator surface but only minimally surfaced operator telemetry.
This closes it.

---

## 21.4 Defer-post-MVP summary

Track for re-evaluation at the post-MVP boundary (first paying customer or
second operator):

- External uptime probing (FACET-2) → first paid customer.
- Public status page (FACET-3) → first paid customer or SLA.
- On-call paging (FACET-4 covered by webhook config) → already configured
  via env; UI surfacing post-MVP.
- AI usage analytics (FACET-36) → when AI features re-enable.
- Email deliverability (FACET-22) → when CF Email webhook integrated.
- 2FA app enforcement (FACET-28) → evaluate Better Auth 2FA plugin.
- Session timeout (FACET-29) → enterprise customer requirement.
- License compliance / SBOM (FACET-33) → enterprise customer.
- Mobile push (FACET-39) → when paging becomes load-bearing.

Each defer item has a clear re-evaluation trigger.

---

## 21.5 Reject summary (explicit non-goals)

These facets are **deliberately not built** for stated reasons. Recording
the rejection prevents future scope creep:

- **User impersonation (FACET-13).** Risk surface exceeds solo-dev support
  benefit; user-detail drawer + share/preview surfaces suffice.
- **Cross-entity search (FACET-24).** Per-section search is enough at
  solo-dev scale.
- **Saved views / filter presets (FACET-15).** YAGNI for one user.
- **Command palette / Cmd-K (FACET-16).** Sidebar + bookmarks suffice.
- **Keyboard power-shortcuts (FACET-26).** A11y keyboard is mandatory; the
  power-user layer is not.
- **Recent activity as separate surface (FACET-27).** Covered by audit
  viewer filtered to self.
- **Account deletion separate surface (FACET-21).** Covered by DSAR queue +
  mass-op audit.
- **Audit log streaming to SIEM (FACET-31).** No SIEM in scope.
- **A/B experiment viewer (FACET-37).** Defer to GA4 (existing decision).
- **Feature-flag targeting/segments (FACET-38).** DEC-6 stays simple.

---

## 21.6 Industry-provider reference notes

These are **observational**, not authoritative:

- **Stripe Dashboard** — strong user search, mass ops, audit, two-factor
  enforcement. Relevant patterns: user table pagination, CSV export,
  audit filtering.
- **Vercel Dashboard** — strong observability (Web Vitals, build times,
  function logs), maintenance mode, status page. Relevant: Web Vitals
  tile shape, incident strip.
- **Supabase Dashboard** — strong DB inspector, auth analytics, queue
  viewer. Relevant: SQL link-out (we link to scripts instead).
- **Sentry** — strong error trending, release health, session replay.
  Relevant: client-error trend shape (we use Clarity for replay).
- **Linear** — strong keyboard nav, saved views, recent activity. Not
  adopted: solo-dev scale makes these superfluous.
- **Notion admin** — strong DSAR handling, license compliance. Relevant:
  DSAR queue shape.
- **Fly.io / Render / Railway** — strong cron + queue visibility. Relevant:
  cron health strip + DLQ viewer shapes.

No provider's UI is copied. The shapes are adapted to Archestimator's
codebase and free-tier posture.

---

## 21.7 Plan-effect reconciliation

The new req IDs in §21.3 are traced in the upgraded `16` and influence:

- **`04_REQUIREMENTS_SPECIFICATION.md`** — additive (new reqs appended in
  the upgrade to `16`; `04` itself is not edited to avoid disrupting the
  stable ID convention; the new IDs live in the OBS / OPS / OVERVIEW /
  USERS / AUDIT namespaces already established in `04`).
- **`05_UX_UI_ACCESSIBILITY_PLAN.md`** — Observability section expanded;
  references the new wireframes in `22`.
- **`09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md`** — references `27`
  for the expanded observability surface.
- **`11_IMPLEMENTATION_PLAN.md`** — Phase 5 gains tasks for the new
  Observability surfaces; Phase 6 gains the maintenance-mode flag task;
  Phase 3 Overview gains funnel tiles.
- **`16_REQUIREMENTS_TRACEABILITY_MATRIX.md`** — extended with new req
  rows.
- **`27_OBSERVABILITY_DEEP_DIVE.md`** — full specification of the
  observability expansion.

No existing req is changed. No existing task is removed. All additions are
additive and traced.

---

## 21.8 Authority and verification

- **Source authority:** production admin UIs are observational snapshots
  (2026-07); not authoritative. Archestimator codebase + brief + cost
  posture are authoritative.
- **Verification mode:** `emulated`. The lead's adversarial pass checked
  that each adopt-MVP facet maps to a real codebase asset (no invented
  requirements) and that each reject has a stated rationale (no silent
  feature deletion — none of the rejected facets were in the original
  brief).
- **Residual uncertainty:** provider UI references may drift; the
  Archestimator-fit reasoning is the durable layer.

---

## 21.9 What this doc does NOT do

- Does not authorize implementation. Every adopt-MVP facet still requires
  the package to be approved (per `17`).
- Does not introduce new providers or paid add-ons. All adopt-MVP items use
  existing Cloudflare bindings or existing D1 tables.
- Does not change performance budgets, security posture, or architecture
  decisions.
- Does not override `04` stable IDs — new IDs are in separate namespaces
  (OBS / OPS) appended via `16`.

---

## 21.10 Confirmation

No application code, tests, migrations, schemas, `wrangler.jsonc`,
`package.json`, provider state, or runtime data were modified by this
planning pass. All writes are confined to
`.ai/03_plans/2026-07-08/Admin-Dashboard-Planning/`.
