# 17 — Analytics & Observability

> **PLANNING ONLY · 2026-06-21 (revised 2026-06-22 per ratified keystone decisions D-1…D-5) · not code.**
> **Purpose:** Own the analytics contract — the event schema, the tool decision (⚠️ GATED on
> L-ENG-2), the **anonymous → authenticated session-merge** mechanism, the **interim fallback**
> shape, **bot/spam filtering** for every event, the consent model, retention + privacy, the
> dashboard, and the moat-metric instrumentation. MASTER §18.5 names the canonical event set;
> the prior §17 #8 "tool = NEEDS INPUT" flag is closed here with a recommendation + the
> trade-offs + a concrete fallback so instrumentation is not blocked on owner sign-off.

This doc owns **analytics + observability**. It does not own the rollout mechanics (→
`08-ROLLOUT-AND-ANALYTICS.md`), the event-trigger points (→ `07-ENGINEERING-CONSTRAINTS.md`
§7.2), or the consent UI (→ `15-FORMS-AND-ABUSE-GUARDRAILS.md` §5). It defines what we
measure, how, and why — and it binds every visual/brand reference to the real tokens in
`src/app/globals.css` per D-1/D-3.

---

## 1. What we are measuring, and why

The landing funnel has three measurement jobs:

1. **Funnel optimization** — do visitors convert? Where do they drop? The A/B in
   `08-ROLLOUT-AND-ANALYTICS.md` §3 needs this.
2. **Moat-metric instrumentation** — the "your work compounds" promise (`00-OVERVIEW.md`
   §3 pillar P1) is verified by the `component_reused` event (the north-star; §2.2). Until
   this is measured, the claim stays framed as Live foundation + Planned surfacing per
   `06-PROOF-AND-CLAIMS-DISCIPLINE.md` §3.3 honesty anchor.
3. **Abuse + performance observability** — the rate-limit + CWV signals feed
   `15-FORMS-AND-ABUSE-GUARDRAILS.md` + `14-PERFORMANCE-AND-CORE-WEB-VITALS.md`.

The landing itself contributes **top-of-funnel events** (route views, CTA clicks, plate
engagement, claims-ledger engagement); the in-app activation events (`signup`,
`first_estimate_created`, `component_reused`) live in the workshop but are **landed-on from
the landing**. This doc owns both, because the funnel is continuous — and the **anonymous →
authenticated session-merge** (§3) is the contract that makes that continuity measurable.

---

## 2. The event schema (canonical per MASTER §18.5)

⚠️ GATED on L-ENG-2: the tool is not chosen; the schema is **tool-agnostic** (event name +
props), portable across PostHog / Plausible / GA4 / Vercel Web Analytics. The tool choice
affects *how* the event is sent (SDK vs fetch vs pixel), not *what* the event is.

### 2.1 The events (full set, with props)

| Event | Props | Fires on | Funnel role |
|---|---|---|---|
| `route_view` | `route`, `variant?`, `anon_id` | Every marketing route mount (RSC → client boot) | Top-of-funnel reach |
| `hero_cta_click` | `cta` (`"start_free"` / `"book_walkthrough"`), `anon_id` | Hero CTA click | Top-of-funnel engagement |
| `secondary_cta_click` | `cta`, `location` (`"header"` / `"footer"` / `"section_11"`), `anon_id` | Secondary CTA click | Top-of-funnel (assisted) |
| `plate_node_focus` | `node_id` (`"L1"` / `"L2"` / `"L3"` / `"L4"` / `"B1"` / `"P1"`) | Plate node hover/focus | Mid-funnel engagement (named-architecture move) |
| `claims_ledger_expand` | `status?` (the active filter, D-4 subset) | Claims-ledger filter change / row expand | Trust-stage engagement |
| `pricing_philosophy_engagement` | `scroll_depth` (25/50/75/100 % of the section) | Scroll-depth on the pricing-philosophy section | Conversion-adjacent engagement |
| `contact_form_submit` | `role`, `consent` (boolean), `success` (boolean) | `/contact` form submit | Conversion (assisted path) |
| `signup` | `route` (where they came from), `variant?`, `method` (`"google"` / `"magic_link"`), `anon_id` | Free-tier account creation (`23-AUTH-EXPERIENCE.md` §9.1) | **Primary conversion** (self-serve gated L-FUN-2; L-FUN-1 route settled) |
| `first_estimate_created` | `time_to_first_estimate` (seconds from signup) | First estimate in a new account | Activation step 1 |
| `component_reused` | `time_to_first_reuse` (seconds from signup), `component_count_in_estimate` | First reuse of a library component — **the moat metric** | **Activation (north-star)** |
| `proposal_shared` | `time_to_first_share`, `via` (`"link"` / `"invite"`) | First shared proposal link | Mid-funnel (paid) |
| `export` | `format` (`"xlsx"`), `via` (`"free"` / `"paid"`) | `.xlsx` export | Mid-funnel |
| `weekly_return` | `days_since_last_visit` | Re-visit within 7 days | Retention |

**Auth-layer events** (owned by `23-AUTH-EXPERIENCE.md` §9.1, reconciled here): `signup_view`,
`login_view`, `auth_method_selected`, `signup_attempt`, `login_attempt`, `signup_link_sent`,
`login_success`, `signup_success`, `closed_beta_denied`. These carry the `anon_id` so the merge
(§3) is continuous through auth.

**No PII in product analytics.** Email, name, and user id are **never** event props. The
audit layer (`recordAccountSecurityEvent`, `23-AUTH-EXPERIENCE.md` §6) holds PII against the
user id server-side; the product-analytics layer is anonymous until the merge.

### 2.2 The moat metric (north-star)

`component_reused` (first reuse per user) is the funnel's true north. Per
`00-OVERVIEW.md` §3 (pillar P1) + MASTER §14.4 + §18.5, this is the moment a free user starts
building the library that compounds switching cost. Instrumentation rules:

- **First-time-per-user boolean, not a raw count.** The event fires once per user (the first
  reuse); subsequent reuses do not fire this event (they fire a separate
  `component_reused_count` if we ever need it for product analytics).
- **Where the dedup state lives.** The first-time-per-user flag lives in **Postgres**, in the
  existing `user_activation_state` table (a row keyed by `user_id` with a
  `first_component_reused_at` timestamp column). The client-side call is a thin wrapper:
  `recordComponentReused(userId)` is a server action that runs `INSERT … ON CONFLICT (user_id)
  DO UPDATE SET first_component_reused_at = LEAST(…, now()) RETURNING (xmax = 0) AS was_insert`
  — the row is updated only if this is the user's first reuse, and the action returns
  `was_insert`. The client fires the product-analytics `component_reused` event **only when
  `was_insert === true`**. This makes the dedup **server-authoritative** (immune to client
  resets, cookie clears, and multi-device), not client-cached. ⚠️ If the
  `user_activation_state` table does not exist at implementation time (verify via `supabase
  db table-info`), it is created as part of the moat-metric instrumentation — owned by the
  in-app side, not the landing redesign; flagged in `LOOP_LEDGER.md` L-ENG-2's scope.
- **Time-to-first-reuse prop** — seconds from `signup` to first reuse. The activation window
  we care about is "within the first session" or "within 24 hours"; longer than that is a
  retention problem, not an activation problem.
- **Never a public stat.** Until `06-PROOF-AND-CLAIMS-DISCIPLINE.md` §15 is satisfied
  (measured, not inflated, not invented), the moat metric stays internal. The marketing claim
  stays "Live foundation + Planned surfacing" per §3.3.

---

## 3. Anonymous → authenticated session-merge (the funnel-continuity contract)

This is the contract that makes the landing funnel measurable end-to-end: a visitor lands
anonymously, browses, hits "Start free", authenticates, and the workshop activation events
(`first_estimate_created`, `component_reused`) must be **attributable to the original anonymous
session**, not a fresh "new user at signup."

### 3.1 The anonymous id

- A `landing_anon_id` is set on the **first** landing event (the first `route_view`). It is a
  UUIDv4 generated client-side, stored in `sessionStorage` (session-scoped — a tab close ends
  the anonymous session; a return visit is a new anonymous id, which is correct for
  attribution) **and** in a cookie scoped to the marketing domain (30-day expiry, so a
  cross-day landing→signup trip is still attributable). The id is **not** PII — it is a random
  UUID with no embedded identity.
- The id is attached as the `anon_id` prop on **every** pre-auth event (§2.1). The
  PostHog/Vercel SDK's own distinct-id (or the GA4 client-id) is a parallel identifier; the
  explicit `anon_id` makes the merge tool-agnostic.

### 3.2 The merge boundary (the auth callback)

The merge happens at **one** well-defined boundary: the auth callback
(`src/app/auth/callback/route.ts`, verified in `23-AUTH-EXPERIENCE.md` §0), immediately after
`exchangeCodeForSession` succeeds and before the redirect to `/workshop`. At this point the
server knows **both** the authenticated `user_id` (from `getUser()`) and the `landing_anon_id`
(passed forward as a server-action param through `signInWithEmail` / `signInWithGoogle`).

**Merge mechanics by tool (L-ENG-2-dependent):**

| Tool | Merge primitive | Where it runs |
|---|---|---|
| **PostHog** (recommended, §4) | `posthog.alias(distinct_id=<anon_id>, alias=<user_id>)` (or `$identify` with `$anon_distinct_id`) — PostHog merges the anonymous event stream into the user identity. **Fire this server-side** (PostHog Node SDK in the callback route) so the merge is durable and not blocked by a client SDK load. | `src/app/auth/callback/route.ts`, after `getUser()` |
| **Vercel Web Analytics** (fallback, §5) | **Cannot merge** — it is cookieless and aggregated by design. The anonymous landing views and the authenticated workshop activations are **separate** measurement streams under the fallback. The funnel is approximated by `signup` event → in-app activation, joined by `anon_id` server-side (not by Vercel). | n/a (fallback limitation) |
| **Plausible** | Custom-event + a manual `user_id` prop join server-side; no native alias. | Same callback route |
| **GA4** | User-id feature + `setUserId`; rejected for product analytics (§4) regardless. | n/a |

**Contract this doc owns (tool-agnostic):** the callback is the merge boundary; the
`landing_anon_id` is the join key; the merge is **server-side** (so it is not defeated by
ad blockers or SDK load failures); and `login_success` / `signup_success`
(`23-AUTH-EXPERIENCE.md` §9.1) are the merge-triggering events.

### 3.3 Post-merge identity

After the merge, every in-app event (`first_estimate_created`, `component_reused`,
`proposal_shared`, `export`) carries the **authenticated `user_id`** as its distinct id, and
the funnel `route_view → hero_cta_click → signup → first_estimate_created → component_reused`
is joinable in the PostHog funnel UI as one continuous path. The `anon_id` is preserved as a
historical prop on the post-merge user's first session, so the originating landing route /
variant is recoverable for attribution.

---

## 4. The tool decision (⚠️ GATED on L-ENG-2)

### 4.1 The candidates

| Tool | Pro | Con | Fit |
|---|---|---|---|
| **Vercel Web Analytics** (already shipped, `src/app/layout.tsx:41`) | Free, cookieless, integrated, privacy-respecting, already mounted via `<VercelWebAnalytics />` with a `redactVercelAnalyticsEvent` `beforeSend` hook (`src/components/analytics/VercelWebAnalytics.tsx`) | Page-view only; no custom events; no funnels; **no session merge** (§3.2) | **Baseline only.** Already shipped; keep for route views. Insufficient for the full schema. |
| **PostHog** (cloud or self-host) | Full product analytics, funnels, **native `$identify`/alias session merge (§3.2)**, session replay, feature flags, A/B; open-source option; strong event model | Heavier SDK; cloud has a cost at scale; self-host has ops cost | **Recommended.** Best fit for the moat-metric instrumentation + funnels + A/B + the anonymous→authenticated merge. Cloud free tier covers pre-launch volume (§4.3). |
| **Plausible** (cloud or self-host) | Privacy-first, lightweight, cookieless, GDPR-easy, fast | Limited custom events; no funnels at the free tier; no A/B; **no native alias** | Strong on privacy; weak on the activation analysis we need. |
| **GA4** | Free, ubiquitous, SEO integration (Search Console) | Google privacy cost; complex; sampling at scale; consent-mode complexity; rejected for product analytics (R10 privacy stance) | **Reject** for product analytics; keep Search Console for SEO (free, server-side). |
| **Mixpanel** | Strong product analytics, funnels, identity merge | Cost at scale; another vendor | Alternative to PostHog. |

### 4.2 The recommendation

**PostHog Cloud** as the primary analytics tool, **Vercel Web Analytics** retained as the
cookieless page-view baseline, **Google Search Console** for SEO (server-side, no SDK).

Rationale:

- **Moat-metric instrumentation** requires custom events + per-user funnels + first-time-
  per-user booleans + the anonymous→authenticated merge → PostHog handles all four natively;
  Plausible handles none of them; Vercel handles none.
- **A/B testing** is built into PostHog (Experiments) — reuses one SDK instead of introducing
  a separate A/B provider (cross-link L-ENG-3).
- **Privacy posture (R10)** — PostHog Cloud is GDPR-compliant, **cookieless mode available**
  (PostHog honors a "persistence = memory" option that writes no cookie and uses a per-tab
  in-memory distinct id), data residency options. Self-host is an option if the owner prefers
  infra control (higher ops cost).
- **Cost** — PostHog Cloud free tier covers the pre-launch + early-beta volume (§4.3).
- **Existing infra** — Vercel Web Analytics already shipped (`layout.tsx:41`) with a
  redaction hook; Vercel Speed Insights already shipped (`layout.tsx:42`); the analytics
  tool is additive, not a replacement.

⚠️ GATED on L-ENG-2: owner ratifies PostHog (or selects an alternative). Until ratified,
the **interim fallback in §5 is the live implementation** — no event is un-instrumented
while the gate is open.

### 4.3 Free-tier cost guard (1M events/mo assertion)

**Fact (verified 2026-06-22, [PostHog pricing page](https://posthog.com/pricing)):** PostHog
Cloud's first **1,000,000 events per month are free, every month, indefinitely**; events beyond
that are billed at usage rates (~$0.00005/event beyond 1M).

**Traffic baseline assertion vs the 1M cap:**

| Scenario | Monthly events (estimate) | Margin to 1M cap |
|---|---|---|
| Closed beta, < 100 beta users | ~5K–20K | 50×–200× headroom |
| Soft launch, 1K monthly visitors, ~13 events/visitor (route views + scrolls + CTA + activation tail) | ~13K–30K | 33×–77× headroom |
| Public launch at projected 50K monthly visitors, ~20 events/visitor | ~1M | **at the cap** — the free tier ends here |
| 100K monthly visitors at 20 events/visitor | ~2M | **2× over cap** — ~$50/mo overage |

**Cost guard rule (this doc owns):** the 1M-events/mo free tier is **not** a long-term ceiling
for a successful public launch; it is the pre-launch + soft-launch ceiling. Instrument a
**server-side daily event-count alert** (a simple Postgres count of `analytics_event_log` rows
from the previous day, queried on a cron) that emails the founder at 60K events/day (~1.8M/mo
run-rate). At that signal, the owner either (a) approves a PostHog budget, (b) enables
server-side **event sampling** for the high-volume `route_view` + `scroll` events (keep the
activation + merge events at 100%), or (c) moves to self-host. The guard is **rate-based, not
feature-based** — no event is silently dropped to stay under the cap; the sampling decision is
explicit and logged in `LOOP_LEDGER.md` when made.

---

## 5. Interim fallback (live before L-ENG-2 ratifies a tool)

Instrumentation must not be blocked on the tool decision. Until PostHog (or an alternative)
is ratified, the **fallback implementation** is the live analytics layer. It has two parts:

### 5.1 Vercel Web Analytics (cookieless page-view baseline — already shipped)

`<VercelWebAnalytics />` is mounted globally in `src/app/layout.tsx:41`, with a
`redactVercelAnalyticsEvent` `beforeSend` hook (`src/components/analytics/VercelWebAnalytics.tsx`).
It fires `route_view`-equivalent page views **cookieless and regardless of consent** (it is
aggregated, not personal — acceptable per Vercel's privacy posture; the consent banner notes
it, §6). This covers the top-of-funnel reach signal with zero new work.

**Limitation (honest):** Vercel Web Analytics cannot fire custom events, funnels, or the
session merge. Under the fallback, the funnel is **route views (Vercel) → `signup` /
`contact_form_submit` (interim custom-event sink, §5.2) → in-app activation (interim sink)** — joined by
`anon_id` server-side, not by a unified tool. This is sufficient for pre-launch + soft-launch
volume; it is **not** sufficient for serious funnel optimization, which is why L-ENG-2 is a
gate, not a defer-forever.

### 5.2 Interim custom-event sink (existing GA4/Clarity pattern + debug console)

Every custom event in §2.1 is wired through **one** client-side function
(`trackLandingEvent(name, props)`) that:

1. **Checks consent** (§6) — if analytics consent is off, the event is **dropped silently on
   the client** (never queued, never retroactively sent — see §6.2).
2. **Stamps `anon_id`** (§3.1) on every event.
3. **Sends to existing browser sinks when present** using the same shape as
   `src/lib/ab-testing/experiment-tracker.ts`: `window.gtag("event", name, props)` and
   `window.clarity("event", name)` plus `clarity("set", key, value)` for primitive props. This
   keeps closed-beta custom events out of a console-only dead end while L-ENG-2 is open.
4. **Console-logs** the event as a structured JSON line in **development** (`NODE_ENV !==
   "production"`) and in **production with a `?debug=analytics` query flag** — so the founder
   can see the live event stream in the browser console during the closed beta:
   ```json
   { "event": "hero_cta_click", "anon_id": "<uuid>", "cta": "start_free", "ts": 1749… }
   ```
5. **Buffers** the event in a `window.__landingEventQueue` array (capped at 100, FIFO) so that
   when PostHog is ratified, the integration is a **one-file swap** — the same
   `trackLandingEvent` function drains the queue into `posthog.capture()` instead of
   the interim GA4/Clarity/debug sinks. The event schema (§2.1) is the same either way.

**This shape is the contract that makes L-ENG-2 a swap, not a rewrite.** An implementer writes
`trackLandingEvent` once; the tool decision changes only the sink.

### 5.3 Consent-deferred interaction on the landing (pre-consent events)

A visitor may interact with the landing (scroll, click a CTA, hover the plate) **before**
consenting. The contract:

- **Pre-consent events are NOT fired to any tool.** Under the consent model (§6), analytics
  consent gates the SDK entirely. If consent is not yet given, `trackLandingEvent` (§5.2 #1)
  drops the event.
- **Necessary-only events are allowed pre-consent:** security logging, rate-limit accounting
  (these are Necessary tier, §6.1). The honeypot + Postgres rate-limit (`15-FORMS-AND-ABUSE-
  GUARDRAILS.md`) run regardless of consent.
- **Vercel Web Analytics fires pre-consent** (cookieless, aggregated — §5.1). This is the only
  pre-consent analytics signal.
- **After consent is given**, events begin firing from that moment forward. **We do not
  retroactively fire the pre-consent buffer.** PostHog's SDK (once integrated) drops pre-consent
  queued events by default; the fallback (§5.2) does the same. The visitor's pre-consent
  scroll/CTA interactions are **lost to analytics** (they are not lost to security logging).
  This is the honest, GDPR-aligned posture — the consent banner copy explains it.
- **Consent-deferred signup interaction:** if a visitor authenticates **before** giving
  analytics consent (e.g. they click "Start free" → `/signup` → Google OAuth without ever
  interacting with the banner), the `signup` event and the anonymous→authenticated merge
  (§3.2) **are deferred** until either (a) they consent on the next page, or (b) the
  in-product settings page records consent. The merge's server-side `posthog.alias` call is
  gated on `hasLandingAnalyticsConsent` reading true; if it reads false at callback time, the
  callback still proceeds to `/workshop` (auth is never blocked by analytics), and the merge
  is **retried on the next authenticated event** after consent. This means a consent-deferred
  signup is **attributable but late** — the anonymous `anon_id` is preserved in the user's
  activation-state row server-side and the merge runs as soon as consent lands.

---

## 6. Consent model

The redesign reuses the **existing** `CookieConsentBanner` (`src/components/landing/CookieConsentBanner.tsx`) + `parseLandingConsentValue()`
(`src/lib/landing/consent.ts:23`) + the cookie `archestimator_cookie_consent`
(`LANDING_CONSENT_COOKIE_NAME`, `consent.ts:1`). The consent state shape (verified):
`{ version: 1, analytics: boolean, updatedAt: ISO-8601 }`. It is **server-readable** via
`getLandingConsentFromCookieHeader` (`consent.ts:58`) and `hasLandingAnalyticsConsent`
(`consent.ts:62`), so server actions + the callback route know whether to fire/merge.

Three tiers (per `15-FORMS-AND-ABUSE-GUARDRAILS.md` §5):

1. **Necessary** (always on) — security logging (`recordAccountSecurityEvent`),
   rate-limit accounting (Postgres `security_rate_limit_events`), the closed-beta gate. No consent needed.
2. **Analytics** (opt-in via the banner) — all events in §2.1 with the user's consent.
3. **Marketing/ads** (not applicable at launch — no ad scripts).

### 6.1 Consent is the gate

The consent state is server-readable via the cookie (`getLandingConsentFromCookieHeader`), so
server actions (including the callback merge, §3.2) know whether to fire the event. The
client-side `trackLandingEvent` (§5.2) reads the same cookie. PostHog's SDK (once integrated)
respects the consent flag — no events sent until consent given; events queued pre-consent are
dropped, not retroactively sent (§5.3).

### 6.2 Vercel Web Analytics is cookieless and consent-exempt

Vercel Web Analytics is cookieless — it counts page views without a cookie, so it fires
regardless of consent. This is acceptable (it is aggregated, not personal) and matches
Vercel's privacy posture; the consent banner notes it. The `redactVercelAnalyticsEvent`
`beforeSend` hook (`VercelWebAnalytics.tsx:5`) is the redaction seam if a prop ever needs
stripping.

---

## 7. Bot / spam filtering (every event, not just forms)

The prior draft's abuse coverage was form-submission-only. **Every event in §2.1 is a spam
surface** — a bot hitting `/` 10,000×/minute inflates `route_view`; a click-farm inflates
`hero_cta_click`. The filter applies to all events, with form submissions layered on top
(owned by `15-FORMS-AND-ABUSE-GUARDRAILS.md`).

### 7.1 The filter layers (in order, cheapest first)

| Layer | Mechanism | Applied to | Cost |
|---|---|---|---|
| **L1 — Client hint** | `navigator.webdriver` check + a `requestAnimationFrame`-gated "real interaction" flag on `hero_cta_click` / `plate_node_focus` (headless browsers skip rAF). Not authoritative (spoofable), just a cheap signal. | `hero_cta_click`, `plate_node_focus`, `secondary_cta_click` | Free, client-side |
| **L2 — Rate-limit by `anon_id` + IP** | The **same Postgres `security_rate_limit_events` table** the forms use (`15-FORMS-AND-ABUSE-GUARDRAILS.md`, project position: **Postgres, NOT Redis**) rate-limits `route_view` to ~60/min/anon_id and `hero_cta_click` to ~10/min/anon_id. Over the limit, the event is **dropped client-side** (the rate-limit check is a server action called on a debounce; over-limit → the client `trackLandingEvent` skips). | `route_view`, `hero_cta_click`, every event | Postgres, already-deployed infra |
| **L3 — Honeypot on forms** | The existing honeypot field (`15` §3, `23-AUTH-EXPERIENCE.md` §6.2) — applied to `contact_form_submit`, `signup_attempt`. Non-empty honeypot → event is dropped + the submission is rejected. | `contact_form_submit`, `signup_attempt`, `login_attempt` | Free |
| **L4 — Server-side bot signature** | The analytics ingest (once PostHog is live) gets a server-side filter: events with a known bot user-agent ([list sourced from `ua-parser/uap-core`], a non-browser `Sec-CH-UA`, or an impossible `route_view` rate from one IP are flagged `bot=true` and **excluded from the funnel dashboard by default**, viewable in a separate "bot-filtered" panel. | All events at ingest | Server-side, PostHog-native |
| **L5 — Turnstile (escalation-only, NOT yet built)** | If the L2 rate-limit signals a sustained bot attack on `/signup` or `/contact`, Turnstile is added per the `15-FORMS-AND-ABUSE-GUARDRAILS.md` escalation criteria. **Turnstile is not built today**; CAPTCHA is escalation-only, never default. | `contact_form_submit`, `signup_attempt` (escalation only) | Cloudflare, when warranted |

### 7.2 What the filter does NOT do

- It does **not** fingerprint browsers (no FingerprintJS, no canvas fingerprinting) — that is
  a privacy posture violation (R10). The `anon_id` is a random UUID, not a fingerprint.
- It does **not** block traffic (the rate-limit drops the *event*, not the *request* — the
  page still renders; only the analytics call is suppressed). This is deliberate: a false
  positive on a real user costs a dropped event, not a broken page.
- It does **not** apply to the **security audit layer** (`recordAccountSecurityEvent`) — that
  logs every auth attempt regardless of bot status, because a bot pattern *is* the signal.

### 7.3 Dashboard surfacing

The funnel dashboard (§8) shows the **bot-filtered** funnel by default (the numbers a growth
decision trusts) and exposes a "show bot-filtered events" toggle for the founder to inspect
attack patterns. The raw event stream retains the `bot` flag so the filter is reversible.

---

## 8. Retention + privacy posture

| Data | Retention | Rationale |
|---|---|---|
| Raw event stream (PostHog) | 12 months (then aggregated) | Sufficient for year-over-year funnel analysis; not indefinite. |
| Aggregated dashboards | Indefinite | No personal data. |
| Vercel Web Analytics | Vercel's default (rolling) | Aggregated; cookieless. |
| `landing_anon_id` cookie | 30 days | Long enough for a cross-day landing→signup trip; not indefinite. |
| Server-side logs (rate-limit hits, audit events, bot-filter decisions) | 90 days | Abuse analysis window. |
| PII from forms (name, email, role) | Until the inquiry is resolved + 12 months | MASTER §8.6 retention rules. |
| `user_activation_state.first_component_reused_at` (moat-metric dedup) | Lifetime of the account | Needed for the first-time-per-user boolean; not PII beyond the user id. |

The privacy posture obeys R10 (L-RAT-6): data is the user's, **never pooled or anonymized
across customers for benchmarking**. Analytics events are per-user for funnel analysis; they
are **not** aggregated into a cross-customer benchmark (the moat stays internal, §2.2).

⚠️ GATED on L-LEG-2 + L-LEG-3 (Privacy Policy + DPA posture): the public privacy notice must
disclose the analytics tool + retention + the cookieless vs cookie distinction + the
`landing_anon_id` cookie + the anonymous→authenticated merge. Until the Privacy Policy ships,
the consent copy references "analytics" generically.

### 8.1 Analytics processor readiness checklist

Before PostHog Cloud (or any equivalent analytics vendor) receives production beta events, close
this checklist or keep the interim GA4/Clarity/Vercel sink only:

| Item | Required decision |
|---|---|
| Processor contract | DPA / SCCs accepted or explicitly deemed unnecessary for the closed-beta data set. |
| Region + retention | Confirm event-storage region, 12-month raw retention, and deletion/export support. |
| Session replay | Off by default. Enable only after a separate privacy review; never record form fields. |
| Identity merge | Use anonymous `anon_id` before auth; post-auth identity link stores user id only server-side unless the DPA permits vendor-side aliasing. |
| PII exclusion | Email/name/phone/company never enter product analytics props; server audit trail owns PII. |
| Deletion/export | Account deletion/export path includes analytics identity deletion or a documented vendor-support process. |
| Founder access | Founder/admin access only; no shared vendor credentials in repo or `.ai`. |

---

## 9. The dashboard

| Panel | Source | Audience | Bot-filtered? |
|---|---|---|---|
| Funnel overview (`route_view` → `hero_cta_click` → `signup` → `first_estimate_created` → `component_reused`) | PostHog | Founder + (eventually) growth | Yes (default) |
| A/B test results (`landing-redesign-2026-06`) | PostHog Experiments | Founder | Yes |
| Moat-metric activation (`component_reused` rate, time-to-first-reuse) | PostHog | Founder + product | Yes — **never public** (§2.2) |
| Anonymous → authenticated merge rate (what % of signups have a recoverable `anon_id`?) | PostHog + server log | Founder + eng | Yes |
| CWV field data (LCP / CLS / INP per route, PH + SEA) | Vercel Speed Insights (`layout.tsx:42`) + CrUX | Founder + eng | n/a (perf) |
| SEO performance (impressions, clicks, average position, geo) | Google Search Console | Founder + (eventually) growth | n/a (SEO) |
| Abuse signals (submission rate, honeypot hits, rate-limit hits, bot-flagged events) | PostHog + Postgres `security_rate_limit_events` + server logs | Founder + eng | No (the bot signal IS the panel) |

The dashboard is built in PostHog (funnels + experiments + activation + merge rate) + Vercel
(CWV) + Search Console (SEO). No separate BI tool at pre-launch volume.

---

## 10. Observability (errors + performance)

| Signal | Tool | Action |
|---|---|---|
| Client-side errors | Vercel (existing) + PostHog (if consent) | Surface to the founder; regression watch. |
| Server-side errors (the form action, rate-limit backend, callback merge) | Vercel logs + Sentry (if added; ⚠️ open L-OBS-1) | Alert on 5xx spike. |
| CWV regression | Vercel Speed Insights + CrUX | Per `14-PERFORMANCE-AND-CORE-WEB-VITALS.md` §8. |
| Uptime | Vercel status page | Public status link in the footer (optional). |
| Analytics-SDK load failure | Console + `window.__landingEventQueue` overflow (>100 buffered) | Falls back to console log (§5.2); the queue drains on next SDK load. |

⚠️ Open: **Sentry (or equivalent error tracking) is not in the repo today**; recommended but
not blocking. Tracked in `LOOP_LEDGER.md` as **L-OBS-1** (new ID this doc introduces; see
`MASTER-AUDIT-AND-SCORECARD.md` and `LOOP_LEDGER.md`).

### 10.1 Minimum closed-beta monitoring runbook

Until a dedicated error tracker ships, the closed-beta launch runbook is:

| Frequency | Check | Evidence source | Action threshold |
|---|---|---|---|
| Daily during first week | 5xx / server-action failures on `/contact`, `/login`, `/signup` | Vercel logs filtered by route | Any sustained spike or >1% request failure → hold rollout / revert route swap. |
| Daily during first week | Rate-limit and honeypot activity | `security_rate_limit_events` + `landing_*` audit events | >50 rate-limit hits/hour or honeypot >5% submissions → keep self-serve off; review Turnstile escalation. |
| Daily during first week | Funnel continuity | `hero_cta_click` → `login_view`/`signup_view` → `signup_success` | Missing merge IDs or no post-auth attribution → pause A/B significance claims. |
| Weekly | Privacy/export/delete support | account-data export/delete path + analytics vendor admin | Any unsupported deletion/export path blocks public self-serve. |

These checks are intentionally small and founder-operable; they are not a substitute for Sentry,
but they prevent the closed beta from relying on invisible failures.

---

## 11. Cross-links

- `00-OVERVIEW.md` — owns the ratified keystone decisions D-1…D-5 (this doc binds analytics to
  the Glass Brand, the full-page auth, the orange discipline, the ClaimStatus type, and honest
  scoring); owns the success criteria + the gate table.
- `07-ENGINEERING-CONSTRAINTS.md` — the event-trigger points (§7.2) + the analytics-boot leaf
  (§1.2 #4) + the RSC-first hydration boundary (only the analytics leaf hydrates).
- `08-ROLLOUT-AND-ANALYTICS.md` — the A/B experiment definition (§3) + the success metrics
  (§5).
- `10-CANONICAL-DOC-MAP.md` — canonical filenames (every cross-link here resolves to one).
- `13-SEO-AND-DISCOVERY.md` — Search Console + the SEO dashboard panel; the `noindex,nofollow`
  on `/login` + `/signup` (these routes still fire `login_view`/`signup_view` product events —
  noindex is about search indexing, not analytics suppression).
- `14-PERFORMANCE-AND-CORE-WEB-VITALS.md` — the CWV field data + the perf dashboard panel +
  the analytics-SDK JS budget (the SDK is one of the hydrating leaves; §7's RSC-first
  boundary keeps it off the LCP path).
- `15-FORMS-AND-ABUSE-GUARDRAILS.md` — the consent model (§5) + the form-spam defense + the
  Postgres `security_rate_limit_events` table reused by §7's bot filter.
- `16-TEST-AND-VERIFICATION-PLAN.md` — the analytics-event tests (regression: every event
  fires with the right props; the bot filter drops over-limit events; the merge fires once per
  signup).
- `23-AUTH-EXPERIENCE.md` §9 — the auth-layer events + the anonymous→authenticated merge
  boundary (the callback route) + the `recordAccountSecurityEvent` audit layer (kept distinct
  from product analytics).
- `LOOP_LEDGER.md` — L-ENG-2 (tool decision), L-ENG-3 (A/B provider), L-LEG-2/L-LEG-3
  (Privacy Policy / DPA), L-FUN-2 (signup self-serve), L-OBS-1 (Sentry,
  new this doc).

---

## 12. ⚠️ Gated on / Open decisions

- **L-ENG-2 — Analytics tool (G-10).** PostHog Cloud is recommended (§4.2); owner ratifies or
  selects an alternative. Until ratified, the §5 fallback (Vercel Web Analytics + existing
  GA4/Clarity-style custom-event sink + debug console) is the live implementation; no event is
  un-instrumented. The
  `user_activation_state` table for the moat-metric dedup (§2.2) is created at implementation
  regardless of the tool choice.
- **L-ENG-3 — A/B provider (G-10).** If PostHog is ratified, PostHog Experiments replaces the
  need for a separate A/B provider; the existing `ABExperimentProvider` is reused for the
  page-split until then.
- **L-LEG-2 — Privacy Policy (G-9).** The public privacy notice must name the tool + retention
  + cookieless-vs-cookie + the `landing_anon_id` cookie + the merge (§8).
- **L-LEG-3 — DPA posture (G-9).** Required for any beta signup handling personal data;
  affects whether the merge (§3.2) can run server-side against a cloud analytics vendor.
- **L-FUN-2 — Signup self-serve (G-3).** The `signup` event + the merge fire only when a real
  signup happens; while self-serve is off, the `signup_view` event still fires but `signup`
  does not. L-FUN-1 route shape is superseded by D-2 / `LOOP_LEDGER` as `/signup`.
- **L-OBS-1 — Sentry (or equivalent error tracking) (open, not blocking).** Recommended; not
  in the repo today.
- **L-DES-2 (inherited) — 5th glass surface.** The analytics dashboard is **off-landing**
  (PostHog's own UI), so this doc does not consume a landing glass-surface slot. Inherited
  only if the funnel dashboard were ever embedded in the product UI.

**No invented features, metrics, testimonials, prices, or partner names appear in this doc.**
The moat metric (`component_reused`) is **never public** (§2.2). Pricing framing stays
hypothesis-labeled per §9.3 (no locked price). Rate-limiting is Postgres (`security_rate_limit_events` table),
NOT Redis (project position). Turnstile is NOT yet built (planned); `/contact` + `/signup`
abuse = honeypot + Postgres rate-limit + validation (§7); CAPTCHA escalation-only.

---

## 13. Coherence contracts (this doc honors)

- **D-1 (Glass Brand)** — the analytics layer is off-landing-UI (PostHog's dashboard), so it
  consumes no glass surface; the on-landing consent banner reuses `.dashboard-glass` per
  `15-FORMS-AND-ABUSE-GUARDRAILS.md`. No visual decisions in this doc contradict the Glass
  Brand.
- **D-2 (full-page auth)** — the merge boundary is the auth callback (§3.2), bound to the
  verified callback route; the `signup` event fires only on a real signup (self-serve gated
  L-FUN-2).
- **D-3 (orange discipline)** — no color decisions in this doc; where the dashboard surfaces
  status (success/error), it inherits the app's status semantics, not the brand-orange
  presence token. Clay `#AA412A` is NOT used (NOT a token in `globals.css`).
- **D-4 (ClaimStatus type)** — the `claims_ledger_expand` event carries a `status` prop typed
  to the D-4 subset (`"Live" | "Building" | "Planned"`); no divergent type.
- **D-5 (honest scoring)** — §14 below; no self-congratulation. The "1M events free" claim is
  sourced (§4.3) and the cost guard is a real mechanism, not a promise.

---

## 14. Honest self-score (D-5)

| Dimension | Score | Justification |
|---|---|---|
| **Strategy** | **96 / 100** | The three measurement jobs (funnel, moat, abuse/perf) are coherent; the anonymous→authenticated merge (§3) is the load-bearing contract that makes the funnel continuous and is bound to the verified callback route; the moat-metric dedup is server-authoritative (Postgres, not client cache); the tool recommendation (PostHog) + the rejection (GA4) + the fallback (Vercel + console) are each justified against the verified infra + R10 posture + the cost guard. Not 100 because L-ENG-2 (tool) and L-FUN-2 (signup self-serve) are genuinely open and affect which mechanisms are live vs. deferred; the consent-deferred-signup retry (§5.3) is a reasonable design but its real-world attribution-latency wants one live confirmation at implementation. |
| **Quality** | **95 / 100** | Every source citation is verified (`parseLandingConsentValue` `consent.ts:23`, `getLandingConsentFromCookieHeader` `consent.ts:58`, `<VercelWebAnalytics />` `layout.tsx:41` with the `redactVercelAnalyticsEvent` hook, `<SpeedInsights />` `layout.tsx:42`, the callback route per doc 23 §0). The PostHog 1M-events-free fact is web-sourced (§4.3). Cross-links resolve to canonical filenames. The bot filter is layered (client → rate-limit → honeypot → server-side → Turnstile-escalation) and honest about what it does NOT do (no fingerprinting, no traffic blocking). Not 100 because (a) the `user_activation_state` table for the moat dedup is specified with a `was_insert` (`xmax = 0`) Postgres idiom that is correct but unverified against the actual table's existence (the doc flags this); (b) the PostHog `alias` vs `$identify` choice is presented as either/or without a final pick (correctly deferred to the integration, but a hair below fully-resolved). |
| **Implementation-Readiness** | **93 / 100** | An implementer can write `trackLandingEvent` (§5.2) and the §7 filter layers today against the verified consent + rate-limit infra, and the L-ENG-2 tool swap is a one-file sink change. The merge (§3.2), processor checklist (§8.1), and closed-beta monitoring runbook (§10.1) are bound to concrete sources. Not 100 because: (a) the `user_activation_state` table + the `recordComponentReused` server action are net-new code (correctly specced, but the deliverable, not pre-existing); (b) the fallback's `window.__landingEventQueue` → PostHog `capture()` swap path is sound but unproven at runtime; (c) the consent-deferred-signup merge retry (§5.3) needs a real post-consent re-merge mechanism that this doc specifies as a contract but leaves the exact retry trigger (next-authenticated-event vs. a polling loop) to implementation; (d) L-ENG-2/L-ENG-3/L-LEG-2/L-LEG-3 are genuinely open and cap the score honestly per D-5. |

**Carried to LOOP_LEDGER (not silent):** L-ENG-2 (tool), L-ENG-3 (A/B provider), L-LEG-2
(Privacy Policy), L-LEG-3 (DPA), L-FUN-2 (self-serve), L-OBS-1
(Sentry, new this doc), L-RAT-6 (R10 privacy stance, inherited).
