# Clarity And Analytics — Canonical Execution Plan

## Status tuple

`IMPLEMENTATION_READY / NOT_STARTED / NOT_EVALUATED / N/A / ACTIVE`

- **Suite compatibility:** manifest `2026-07-12` (validator-supported); planning guidance from the `2026-07-19` Frontier Planning Kernel + Creating-Plan-Prompt + Multi-Agent-Execution-Directive (lead-owned; no parallel write lanes required).
- **Profile:** `standard`; privacy/consent, CSP, public client scripts, admin-gated server pulls, Worker-safe secrets.
- **Action ceiling:** `IMPLEMENT_LOCAL`; this authoring pass is `PLAN_ONLY` — **no product implementation in the planning turn**.
- **Exact next unit:** `UNIT-001`.
- **Test decision:** `NOT_REQUIRED` for plan authoring and default implementation evidence. Product tests are `TEST_PROPOSAL` only unless Philip issues a current-task `TEST_TASK`.

## 1. Task Contract

### Objective and intent

Make Google Analytics 4 and Microsoft Clarity actually useful for Archestimator:

1. Consented public visitors send trustworthy traffic, pageview, experiment, and conversion signals into the live GA4 property and Clarity project.
2. Founders can open `/admin/analytics` and see **in-app** summary metrics from those providers (not only link-outs), plus one-click deep links into Philip’s exact dashboards.
3. Privacy, CSP, consent, masking, and event taxonomy follow current best practices so the alpha can learn without poisoning data or over-collecting.

### In scope

- Public marketing/legal shells that already mount `PublicPageShell` (`/`, `/new`, `/about`, `/features`, `/pricing`, `/contact`, `/privacy`, `/terms`, `/trust`, `/security`).
- Existing client loaders: `LandingAnalyticsLoader`, `ClarityScript`, `@next/third-parties/google` `GoogleAnalytics`, optional Cloudflare Web Analytics.
- Consent cookie/banner and `NEXT_PUBLIC_BETA_TELEMETRY_ENABLED` production gate.
- Landing CSP allowlists for GA/Clarity/CF insights; closing coverage gaps for PublicPageShell routes missing Report-Only CSP.
- Privacy/Terms copy naming GA4 and Clarity as processors when enabled.
- Public event taxonomy (pageviews, experiment exposure, CTA/key events) via existing `experiment-tracker` helpers.
- Admin route `/admin/analytics` and optional thin `/api/admin/analytics/*` handlers.
- Server-side **GA4 Data API** (property `306189271`) and **Clarity Data Export API** (project `axxveykqn3`) with admin authz, secrets, caching, and degrade-to-link-out.
- Operator enablement checklist for production env vars / Worker secrets (documented; applying secrets is an AUTH boundary).
- Deep links to:
  - GA Intelligent home: `https://analytics.google.com/analytics/web/#/a192756720p306189271/reports/intelligenthome?params=_u..nav%3Dmaui`
  - Clarity dashboard: `https://clarity.microsoft.com/projects/view/axxveykqn3/dashboard?date=Last%203%20days`

### Non-goals

- Authenticated `/workshop/**` product analytics or Clarity session replay inside the app (requires a separate privacy decision).
- Tracking on `/share/**`, `/login`, `/signup`, or Client Portal (explicitly excluded today; keep that boundary).
- PostHog or any third analytics SDK (prior ADR defers PostHog).
- Paid Cloudflare Logpush / Analytics Engine / paid Web Analytics add-ons.
- Replacing first-party D1 beta/activation cohort metrics on `/admin` home.
- Storing or mirroring Clarity session recordings or PII in D1.
- Hosted deployment, DNS, GCP project creation, or dashboard token generation by the agent (AUTH boundaries).
- Feature-flag dual paths / rollout ceremony beyond the existing production telemetry switch + consent + “secrets present” degrade.
- Browser/Playwright/Storybook visual proof unless Philip authorizes `TEST_TASK`.
- Disturbing unrelated July 21 shared-worktree WIP (support, landing-new, remote bindings).

### Authority and constraints

- Current source, `wrangler.jsonc`, `AGENTS.md`, `.ai/00_system`, and this pack are authoritative for execution.
- Prior archived analytics ADR remains valid: GA4 + Clarity keep; PostHog defer.
- Stay on the current shared branch/worktree; preserve unfamiliar concurrent changes; reread shared files before edits.
- Secrets never enter Git, `.ai`, or client bundles. Public IDs only in `NEXT_PUBLIC_*`.
- Admin routes remain `isPlatformAdmin`-gated; analytics API routes must be no-store and admin-only.
- Cloudflare Worker runtime: prefer thin REST + JWT over heavy Node Google client libraries if bundle/edge constraints bite (DEC-AUTO-004).
- Graph tools (GitNexus) were unavailable/guard-rejected this session; all inventory claims were verified against current source via search/read.

### Completion and stop condition

Implementation is complete when every CORE requirement maps to final source + fresh authorized evidence; production enablement steps that require Philip’s credentials are recorded as `AUTH-*` with safe local prerequisites done; `/admin/analytics` either shows live aggregates or an honest configured/degraded state; no safe in-scope unit remains. Hosted Realtime/recording proof is release evidence, not a local implementation blocker.

### Escalation

Escalate only for: irreversible privacy-scope expansion (workshop tracking), paid provider SKUs, credential creation Philip cannot/won’t perform, or a Worker-incompatible client library with no REST fallback after two materially different attempts (`TECH_BLOCKED` only then).

## 2. Current evidence (planning inventory)

### 2.1 What already works in source

| Capability | Evidence |
|---|---|
| Consent cookie + banner | `src/lib/landing/consent.ts`, `CookieConsentBanner.tsx` — opt-in before scripts |
| Gated loader | `LandingAnalyticsLoader.tsx` — requires `consent.analytics` **and** `NODE_ENV===production` **and** `NEXT_PUBLIC_BETA_TELEMETRY_ENABLED==="true"` |
| GA4 script | `@next/third-parties/google` `GoogleAnalytics` when `NEXT_PUBLIC_GA_MEASUREMENT_ID` set |
| Clarity script | `ClarityScript.tsx` → `https://www.clarity.ms/tag/{id}` |
| CF Web Analytics | `CloudflareWebAnalytics.tsx` optional |
| Mount point | `PublicPageShell` only — marketing/legal public routes |
| CSP allowlists | `next.config.ts` landing + workshop Report-Only include GTM/GA/Clarity |
| A/B + CTA events | `experiment-tracker.ts` (`experiment_view`, `trackConversion`); header CTA uses it |
| Admin link-outs | `/admin/analytics` tiles + `/admin` home links; configured badge from public env |
| Env placeholders | `.env.example` L113–118 |
| Reserved flag | `admin_analytics_server_pulls` documented in `src/app/admin/README.md` — **unimplemented** |

### 2.2 Why data may not appear today

1. `NEXT_PUBLIC_BETA_TELEMETRY_ENABLED` defaults `false` — **local/dev never sends**, even with IDs present.
2. Production build must bake public IDs + enable the switch.
3. Visitors must Accept analytics.
4. `/new` and several legal routes mount the loader but may lack the landing Report-Only CSP source match (CSP gap, not a loader gap).
5. Admin page cannot pull provider data — link-outs only.
6. Event taxonomy is thin: auto pageviews + home experiment + header CTA; `/new` CTAs are not instrumented.

### 2.3 Provider API facts (official)

**GA4 Data API**

- Endpoint family: `https://analyticsdata.googleapis.com/v1beta/properties/{PROPERTY_ID}:runReport` (and realtime variants).
- Auth: Google Cloud service account JSON; grant **Viewer** on GA4 property `306189271`.
- Client needs **property ID** (`306189271`), not the public Measurement ID (`G-…`). Both must be configured separately.
- Suitable admin metrics: `activeUsers`, `sessions`, `screenPageViews`, `bounceRate`, top `pagePath`, `sessionDefaultChannelGroup`, key events if configured.

**Clarity Data Export API** ([Microsoft Learn](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-data-export-api))

- `GET https://www.clarity.ms/export-data/api/v1/project-live-insights`
- Auth: `Authorization: Bearer <token>` from Clarity Settings → Data Export (project admin only).
- Hard limits: **10 requests/project/day**; **1–3 days** lookback; ≤3 dimensions; ≤1000 rows; no pagination.
- Returns **aggregates only** (Traffic, Scroll Depth, Engagement Time, Dead/Rage clicks, Popular Pages, etc.). **Does not** return session recordings — recordings stay in Clarity UI via deep link.
- Implication: admin must **cache** (D1 daily snapshot) and deep-link for forensics.

### 2.4 Blast radius

```text
PublicPageShell
  └─ CookieConsentBanner + LandingAnalyticsLoader
       ├─ GoogleAnalytics (GA4)
       ├─ ClarityScript
       └─ CloudflareWebAnalytics (optional)
experiment-tracker ← ABExperimentProvider, LandingHeader CTAs
next.config.ts CSP
privacy/terms copy
.env.example + Worker public vars / secrets
/admin/analytics (+ new API + clients + optional D1 cache table)
```

Out of blast radius unless a future pack expands: workshop layouts, share routes, auth layouts, Client Portal analytics tables.

### 2.5 Shared worktree note

July 21 concurrent WIP includes support drafts/triage, `/new` landing-new, remote bindings. This pack must not rewrite those files except where a named unit owns a touch (e.g. `/new` CTA instrumentation only if that file is the conversion owner). Reread before every edit.

## 3. Requirements

| ID | Role | Requirement | Units | AC |
|---|---|---|---|---|
| DATA-001 | CORE | Public Measurement ID, Clarity project id `axxveykqn3`, production telemetry switch, and server property/token contracts are documented and wired in code/env examples without secrets in Git | UNIT-001, UNIT-005 | AC-001 |
| SEC-001 | CORE | Privacy/Terms name GA4 and Clarity when enabled; consent banner copy matches real cookies/replay; loaders remain opt-in | UNIT-002 | AC-002 |
| SEC-002 | CORE | CSP covers every PublicPageShell route that can load trackers; `/share` remains tracker-free; admin API is platform-admin + no-store | UNIT-002, UNIT-006, UNIT-007 | AC-003 |
| DATA-002 | CORE | Documented public event taxonomy ships; `/` and `/new` key CTAs emit GA4+Clarity events via shared helpers; experiment tags preserved | UNIT-003, UNIT-004 | AC-004 |
| UX-001 | CORE | Clarity consent mode + masking defaults prevent sensitive UI capture on public pages | UNIT-004 | AC-005 |
| DATA-003 | CORE | `/admin/analytics` shows GA4 summary metrics when server credentials exist; otherwise honest link-out/degraded UI with Philip’s deep links | UNIT-005, UNIT-007 | AC-006 |
| DATA-004 | CORE | `/admin/analytics` shows Clarity aggregate insights (cached ≤ daily) when export token exists; recordings via deep link only | UNIT-006, UNIT-007 | AC-007 |
| OPS-001 | CORE | Operator runbook lists exact Philip steps to create credentials, set Worker env, enable telemetry, and verify Realtime/Clarity | UNIT-008 | AC-008 |
| OPS-002 | AUXILIARY | Optional Cloudflare Web Analytics token remains co-equal link-out/loader; no paid CF analytics | UNIT-001, UNIT-007 | AC-001 |

### Non-goals (requirement-level)

- REQ-NG-001: No workshop/share GA/Clarity instrumentation.
- REQ-NG-002: No PostHog.
- REQ-NG-003: No Clarity recording storage in Archestimator.
- REQ-NG-004: No automatic test/browser suite under this pack.

## 4. Resolved decisions

- **DEC-AUTO-001 — Public-only client capture.** Keep GA4/Clarity on `PublicPageShell` routes only. Do not mount on workshop, share, login, or signup in this pack.
- **DEC-AUTO-002 — Dual ID model for GA.** Client uses `NEXT_PUBLIC_GA_MEASUREMENT_ID` (`G-…`). Server Data API uses `GA4_PROPERTY_ID=306189271` (and service-account secret). Never put the service-account private key in `NEXT_PUBLIC_*`.
- **DEC-AUTO-003 — Clarity project fixed.** `NEXT_PUBLIC_CLARITY_PROJECT_ID=axxveykqn3` for client; server export uses `CLARITY_API_TOKEN` secret (project-scoped token). Admin deep link uses Philip’s dashboard URL.
- **DEC-AUTO-004 — Worker-safe GA client.** Prefer REST `runReport` with a short-lived service-account JWT (Web Crypto) or a proven Worker-compatible thin wrapper. Add `@google-analytics/data` only if it bundles cleanly under OpenNext Cloudflare; otherwise REST wins.
- **DEC-AUTO-005 — Clarity rate-limit cache.** Because of 10 req/day, pull once per day (or on explicit admin refresh within budget), persist aggregate JSON in D1 with `fetched_at`, and serve cache to `/admin/analytics`. Never poll per page view.
- **DEC-AUTO-006 — Degrade, don’t dual-path.** If secrets missing or API fails, show link-out tiles + last error/as-of. Do not invent a second analytics product UI. Flip reserved `admin_analytics_server_pulls` only as a documentation/flag alignment if useful; presence of secrets is the real gate.
- **DEC-AUTO-007 — Event helper centralization.** Extend `src/lib/ab-testing/experiment-tracker.ts` (or a thin `src/lib/landing/analytics-events.ts` that wraps it) so all public conversions share one GA+Clarity path. Do not scatter raw `gtag`/`clarity` calls.
- **DEC-AUTO-008 — PostHog stays deferred.** Prior ADR unchanged.
- **DEC-AUTO-009 — First-party admin metrics stay separate.** D1 activation/cohort cards on `/admin` home remain authoritative for product activation; GA/Clarity admin cards cover **acquisition/behavior**, not replace activation contracts.
- **DEC-AUTO-010 — Consent Mode posture.** Implement GA Consent Mode defaults denied until opt-in (align with existing gate that simply does not load scripts until consent). For Clarity, call consent APIs if/when scripts load post-opt-in; do not load Clarity before accept.
- **DEC-HUMAN-001 — Measurement ID confirmation.** Philip must confirm the live `G-` Measurement ID that maps to property `306189271` (URL gives property, not Measurement ID). Planning assumes `.env` / operator knowledge supplies it.

## 5. Authorization boundaries (exact external actions)

These `AUTH-*` items are execution boundaries recorded in this plan. They are **not**
duplicated as ACTIVE `authorization_boundaries` in `plan-pack.json` until an
implementation unit needs a formal `BOUNDARY` criterion (validator requires a
reciprocal BOUNDARY AC/gate for every ACTIVE AUTH record). Safe local work must
still complete every prerequisite below before asking Philip for credentials.

| ID | Boundary | Safe local prerequisites | Continuation |
|---|---|---|---|
| AUTH-001 | Create/select GCP project, enable **Google Analytics Data API**, create service account + JSON key, add SA email as GA4 property Viewer on `306189271` | Local client wiring, `.env.example` placeholders, admin client code path that reads env | Philip pastes JSON/base64 into Worker secret `GA4_SERVICE_ACCOUNT_JSON` (or split email/key vars) |
| AUTH-002 | Generate Clarity Data Export API token for project `axxveykqn3` | Client Clarity id wired; server client + cache ready | Philip sets Worker secret `CLARITY_API_TOKEN` |
| AUTH-003 | Set production public env: Measurement ID, Clarity `axxveykqn3`, optional CF token, `NEXT_PUBLIC_BETA_TELEMETRY_ENABLED=true` on the hosted Worker/build | Code + `.env.example` complete | Philip updates Cloudflare Worker vars / deploy pipeline |
| AUTH-004 | Hosted proof: GA Realtime shows a consented visit; Clarity dashboard shows a session | Local implementation complete | Philip verifies in provider UIs; not required for `ACHIEVED` of local code |

## 6. Implementation units (DAG)

```text
UNIT-001 (config/deep links)
    ├─► UNIT-002 (privacy + CSP)
    │       └─► UNIT-003 (event taxonomy) ──► UNIT-004 (Clarity consent/masking + /new CTAs)
    ├─► UNIT-005 (GA4 server client) ──┐
    └─► UNIT-006 (Clarity server + cache) ─┴─► UNIT-007 (admin UI/API) ──► UNIT-008 (ops runbook + audit)
```

Ready now (no deps): `UNIT-001`, and after planning validation the pack’s first executable unit is **UNIT-001**. `UNIT-005`/`UNIT-006` can start after `UNIT-001` config contracts land; they do not need privacy copy to begin server scaffolding, but must not enable production traffic claims until `UNIT-002`/`UNIT-004` land.

### UNIT-001 — Config contract, deep links, enablement surface
- **Goal:** Codify env names, property/project IDs, and admin deep links to Philip’s exact GA/Clarity URLs; align admin configured badges; document production switch.
- **Owns:** `.env.example` analytics block; `src/app/admin/analytics/page.tsx` link targets; small constants module e.g. `src/lib/analytics/provider-targets.ts`; `src/app/admin/README.md` analytics section.
- **Evidence:** source shows correct deep links + env contract; no secrets committed.
- **Recovery:** revert constants/README/env example only.

### UNIT-002 — Privacy naming + CSP coverage
- **Goal:** Name processors; ensure every PublicPageShell route that can load trackers has CSP allowlists; keep `/share` tracker-free.
- **Owns:** `src/app/privacy/page.tsx` / terms content as needed; `next.config.ts` CSP source matching for `/new` and other gaps; cookie banner copy if replay/heatmaps need clearer language.
- **Evidence:** privacy text names GA4+Clarity; CSP matcher list covers loader routes; share still excluded from loaders.
- **TEST_PROPOSAL:** existing share/CSP vitest if Philip authorizes.

### UNIT-003 — Public event taxonomy
- **Goal:** Publish a small canonical event list and wire missing public conversions through shared helpers.
- **Owns:** `src/lib/landing/analytics-events.ts` (or extend experiment-tracker); call sites on `/` and `/new` CTAs; short taxonomy section in this pack / admin README.
- **Canonical events (minimum):**
  - `page_view` (GA auto)
  - `experiment_view`
  - `cta_click` (location, target)
  - `signup_intent` / `request_access_click` (auth CTA on public pages)
  - `pricing_cta_click` (if present)
- **Non-events:** authenticated product actions (activation stays first-party D1).

### UNIT-004 — Clarity hardening + conversion completeness
- **Goal:** Consent-aligned Clarity bootstrap; mask sensitive fields on public forms; ensure `/new` auth CTAs fire events.
- **Owns:** `ClarityScript.tsx` (+ optional consent API calls post-load); masking classes/config; `NewLandingAuthCta` / related CTA files.
- **Evidence:** Clarity loads only post-consent; masks applied; CTA events present in source.

### UNIT-005 — GA4 Data API server client
- **Goal:** Admin-safe fetcher for property `306189271` summary metrics.
- **Owns:** `src/lib/analytics/ga4-data-client.ts` (Worker-safe); env parsing; types for report DTO; never log private keys.
- **Metrics v1:** last 7 days `activeUsers`, `sessions`, `screenPageViews`; top 5 `pagePath`; optional channel grouping.
- **Depends:** UNIT-001 env contract.

### UNIT-006 — Clarity Export API + D1 cache
- **Goal:** Daily-bounded pull of live insights for project `axxveykqn3` with D1 cache respecting 10/day quota.
- **Owns:** `src/lib/analytics/clarity-export-client.ts`; additive migration `00xx_analytics_provider_cache.sql` (renumber at apply time); repository helper under `src/lib/repositories/`.
- **Cache key:** provider + project + window; store JSON + `fetched_at` + `error`.
- **Depends:** UNIT-001.

### UNIT-007 — Admin analytics UI + API
- **Goal:** `/admin/analytics` becomes a founder scorecard: GA cards, Clarity cards, as-of timestamps, errors, deep links; thin admin API or RSC loaders.
- **Owns:** `src/app/admin/analytics/page.tsx`; optional `src/app/api/admin/analytics/ga4/route.ts` + `clarity/route.ts`; UI components under `src/components/admin/` following design-system rules (authenticated).
- **Depends:** UNIT-005, UNIT-006; privacy/CSP units should be complete before claiming production readiness.
- **Authz:** `isPlatformAdmin` only; no-store.

### UNIT-008 — Ops runbook + requirement audit
- **Goal:** Document Philip’s AUTH-001…004 steps; reconcile CORE requirements to source evidence; update admin README; stop.
- **Owns:** `docs/` or admin README enablement section; pack resume/completion notes; no product behavior beyond docs unless audit finds gaps.
- **Depends:** UNIT-007.

## 7. Acceptance criteria

| ID | Criterion | Default evidence | Test gate |
|---|---|---|---|
| AC-001 | Env/docs/constants name Measurement ID, property `306189271`, Clarity `axxveykqn3`, telemetry switch, and secret names without leaking secrets | source + `.env.example` review | `NOT_REQUIRED` |
| AC-002 | Privacy/Terms name GA4+Clarity; consent remains required before scripts | source review | `NOT_REQUIRED` |
| AC-003 | CSP covers PublicPageShell tracker routes; share loaders absent; admin analytics API admin-gated | `next.config.ts` + grep + route auth review | `TEST_PROPOSAL`: existing CSP/share vitest |
| AC-004 | Shared helpers emit taxonomy events from `/` and `/new` CTAs | source review | `NOT_REQUIRED` |
| AC-005 | Clarity masking/consent posture present in loader | source review | `NOT_REQUIRED` |
| AC-006 | Admin GA section renders live DTO or degraded link-out with deep link | source + typecheck | `TEST_PROPOSAL`: mock client unit test |
| AC-007 | Admin Clarity section renders cached aggregates or degraded link-out; no recordings stored | source + migration review | `TEST_PROPOSAL`: cache repository test |
| AC-008 | Ops runbook lists AUTH steps and verification checklist | docs review | `NOT_REQUIRED` |

## 8. Risks

| ID | Risk | Mitigation |
|---|---|---|
| RISK-001 | Production switch left off → “wired” but empty GA/Clarity | UNIT-001/008 make enablement explicit; AUTH-003 |
| RISK-002 | Measurement ID ≠ property `306189271` | DEC-HUMAN-001; admin shows both IDs |
| RISK-003 | Clarity 10/day quota exhausted by naive polling | DEC-AUTO-005 cache |
| RISK-004 | Google client library breaks Worker bundle | DEC-AUTO-004 REST fallback |
| RISK-005 | Privacy under-disclosure / session replay surprise | UNIT-002/004 naming + masking |
| RISK-006 | Accidental share/workshop tracking | DEC-AUTO-001 + existing tests/grep; do not mount loaders there |
| RISK-007 | Secrets in client bundle | server-only modules; no `NEXT_PUBLIC_` for tokens |
| RISK-008 | Shared worktree collisions with support/landing WIP | narrow ownership; reread before edit |
| RISK-009 | Admin UI overbuilt into BI product | v1 scorecards + deep links only |

## 9. Evidence plan (implementation-time)

| ID | Claim | Method | Status now |
|---|---|---|---|
| EVID-001 | UNIT-001 config/deep links | source/diff | PLANNED |
| EVID-002 | UNIT-002 privacy/CSP | source/diff | PLANNED |
| EVID-003 | UNIT-003 taxonomy | source/diff | PLANNED |
| EVID-004 | UNIT-004 Clarity hardening + CTAs | source/diff | PLANNED |
| EVID-005 | UNIT-005 GA4 client | source/typecheck | PLANNED |
| EVID-006 | UNIT-006 Clarity client+cache | source/migration | PLANNED |
| EVID-007 | UNIT-007 admin UI/API | source/typecheck | PLANNED |
| EVID-008 | UNIT-008 ops + audit | docs + requirement matrix | PLANNED |

Cheapest decisive default: source review + `bun run type-check` (when implementing). Do not run product tests without `TEST_TASK`.

### TEST_PROPOSAL (do not run)

1. `bun x vitest run tests/vitest/cloudflare-web-analytics-integration.test.ts` — prove share still tracker-free after CSP/loader edits.
2. Focused unit test for GA4/Clarity client DTO parsing with fixtures (if created during UNIT-005/006).

## 10. Orchestration

Single lead executor. No parallel writers (same files). Optional read-only specialist passes:

1. **Security pass** after UNIT-002/005/006/007 (secrets, admin authz, CSP).
2. **Privacy pass** after UNIT-002/004.
3. Independent review only if Philip requests it for the final admin API diff.

Handoffs use the Multi-Agent-Execution-Directive shape only if a specialist pass is spawned; otherwise lead executes sequentially.

## 11. Resume state

- **Goal:** GA4 + Clarity client capture + admin API scorecards for property `306189271` and project `axxveykqn3`.
- **Status:** plan authored; implementation not started.
- **Next unit:** `UNIT-001`.
- **Cleanup:** none.
- **Blocked only on:** nothing repository-local; AUTH-001…004 for live credentials/hosted proof.

## 12. Best-practice checklist (executor must satisfy)

### Google Analytics 4

- [ ] Consent before tags (already architectural).
- [ ] Measurement ID on client; property ID on server.
- [ ] Key events marked in GA UI for `cta_click` / `signup_intent` (operator).
- [ ] Custom dimensions for `experiment_id` / `variant` if analyzing A/B in GA (operator + event params already sent).
- [ ] No PII in event params (emails, names, tokens forbidden).
- [ ] Admin Data API uses Viewer SA; least privilege.

### Microsoft Clarity

- [ ] Load only after analytics consent.
- [ ] Project `axxveykqn3`.
- [ ] Mask inputs/sensitive regions on public forms.
- [ ] Use `clarity('set')` / `clarity('event')` for experiment filters (already patterned).
- [ ] Admin uses Export API aggregates + deep link for recordings; respect 10/day + cache.
- [ ] Privacy notice discloses session replay/heatmaps.

### Admin

- [ ] Platform admin only.
- [ ] As-of + error states.
- [ ] Deep links to Philip’s GA Intelligent home and Clarity 3-day dashboard.
- [ ] Do not duplicate activation cohort metrics owned by D1 home cards.

## 13. Suggested execution slices

1. **Slice A — Make traffic real:** UNIT-001 → UNIT-002 → UNIT-003 → UNIT-004 (+ AUTH-003 when ready).
2. **Slice B — Make admin useful:** UNIT-005 → UNIT-006 → UNIT-007 (+ AUTH-001/002).
3. **Slice C — Close:** UNIT-008 + requirement audit.

Stop after Slice A if Philip only needs capture; continue to B for in-app API data (requested).
