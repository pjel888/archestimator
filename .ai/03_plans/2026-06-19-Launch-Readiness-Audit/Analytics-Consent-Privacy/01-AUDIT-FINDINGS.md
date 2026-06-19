# Audit Findings — Analytics, A/B-Testing & Consent/Privacy

**Date:** 2026-06-19 · **Auditor:** Phase-2 gap auditor · **Stage gate:** owner-only beta → wider/external users
**Method:** `rg` + full-file Read of every scope file; `path:line` evidence. DB not queried (no analytics
tables exist — A/B results are tracker-side only, see CONSENT-08).

## Scope & coverage

Audited the full client + server analytics/A-B/consent path: GA4 (`@next/third-parties`), Microsoft
Clarity (inline `clarity.ms` tag, session replay), Vercel Web Analytics (`@vercel/analytics`), the
landing consent cookie + banner, the `ab_test` assignment cookie, bot detection, and the `/privacy`
notice + `terms-content`. CSP tracking domains in `next.config.ts` reviewed. No analytics persistence
exists in Postgres (confirmed by grep — all experiment data lives in GA4/Clarity).

## Reconciliation table

| Source | Did it cover this surface? | Verdict |
|---|---|---|
| `2026-06-01-...-owasp/08-data-protection-and-privacy.md` | Covered Supabase/share cookies only; NO mention of GA4/Clarity/Vercel Analytics, consent gating, AB cookies, or privacy-policy match | gap — these findings are **none** vs OWASP-08 |
| `2026-06-19-...-Accessibility-SEO-Legal-Content` | Reviewed `/privacy` + consent banner for a11y/SEO/readability only; explicitly did NOT review consent gating or tracker-vs-policy match | gap — **partial** at most (a11y of banner only) |
| `2026-06-19-...-NextJS-Vercel-Deploy-And-Headers` | Owns CSP/headers; tracking domains already allow-listed in CSP | covered-by for CSP plumbing only |
| roadmap-sync 2026-06-18 | Turnstile NOT built (bot mitigation gap noted at product level) | context only |
| `known-issues.md:404` / `current-state.md:2345` | Status note: "GA4 + Clarity active, consent banner + Report-Only CSP implemented; reviewed Privacy Notice + DPA/legal review remain OPEN" | **this pack operationalizes that open item** |

The state docs already flag "reviewed Privacy Notice / DPA / legal review remain open." That is the
top-line conclusion here, made concrete with code evidence and severities.

---

## Findings

### CONSENT-01 — Vercel Web Analytics runs on EVERY route with NO consent gate
- **Severity:** high · **launch_blocker: true**
- **Evidence:** `src/app/layout.tsx:40` renders `<VercelWebAnalytics />` unconditionally in the root
  `<body>`; `src/components/analytics/VercelWebAnalytics.tsx:7-9` renders `<Analytics beforeSend={…}/>`
  with no consent check; `rg consent src/components/analytics src/lib/analytics` → zero hits. By contrast
  GA4/Clarity ARE gated (`LandingAnalyticsLoader.tsx:10` `if (!consent.analytics) return null`).
- **Impact:** Vercel Analytics collects visit/page/referrer data (and processes IP + UA server-side for
  geo/device, even though it is cookieless) for every visitor on every route — landing AND `/workshop`,
  `/share`, `/invite` — before and regardless of consent. For wider/external EU/PH users this is
  processing of personal data with no consent and no disclosure, while the consent banner tells users
  "Analytics … cookies stay off unless you accept them" (`CookieConsentBanner.tsx:82`) — directly
  contradicted by an always-on analytics tracker.
- **Recommendation:** Either (a) gate `VercelWebAnalytics` behind the same consent signal (read the
  consent cookie; render null until `analytics === true`), or (b) make a documented legitimate-interest
  decision that Vercel Analytics is cookieless/aggregate and disclose it explicitly in `/privacy` and the
  banner copy. Note the banner currently promises the opposite, so option (b) still requires copy changes.
  The existing `redactVercelAnalyticsEvent` (`vercel-web-analytics.ts:39`) already strips tokenized/authed
  paths — good — but redaction is not consent.
- **Effort:** S · **Confidence:** high · **existing_plan_overlap:** none

### CONSENT-02 — `/privacy` notice does not name the trackers actually running
- **Severity:** high · **launch_blocker: true**
- **Evidence:** `src/app/privacy/page.tsx:48-53` lists providers as "Supabase/Postgres … Vercel for
  hosting, Resend for email, and privacy-reviewed analytics or diagnostic providers when enabled." It
  never names **Google Analytics 4**, **Microsoft Clarity**, or **Vercel Web Analytics**, never mentions
  **cookies**, the **consent mechanism**, **session recording/replay**, or **international data transfer**.
  Yet the live stack loads GA4 (`LandingAnalyticsLoader.tsx:19`), Clarity (`ClarityScript.tsx:14`), and
  Vercel Analytics (`layout.tsx:40`). `terms-content.ts:104,112` is equally generic ("analytics … providers").
- **Impact:** Transparency/notice failure under GDPR Art. 13 and PH Data Privacy Act (RA 10173) — data
  subjects cannot know who processes their data, where, or how to object. The phrase "when enabled" is
  misleading because GA4/Clarity ARE enabled (post-consent) today. Microsoft Clarity in particular runs
  **session replay** (records clicks/scroll/mouse movement, `ClarityScript.tsx`), which is materially
  more invasive than "analytics" and is undisclosed.
- **Recommendation:** Before external launch, name each tracker, its purpose, that Clarity records session
  replays, the consent cookie (`archestimator_cookie_consent`, 180-day) and `ab_test` cookie, that data is
  transferred to Google (US) and Microsoft (US), and the opt-out path (the banner + "Cookie settings").
- **Effort:** M · **Confidence:** high · **existing_plan_overlap:** partial:2026-06-19-Launch-Readiness-Audit/Accessibility-SEO-Legal-Content (reviewed page for a11y/SEO, not tracker-match)

### CONSENT-03 — No consent surface on authenticated `/workshop` routes, but Vercel Analytics tracks them
- **Severity:** medium · **launch_blocker: false**
- **Evidence:** `CookieConsentBanner` + `LandingAnalyticsLoader` render only inside `PublicPageShell`
  (`PublicPageShell.tsx:41-42`), used by landing/marketing pages only (`rg PublicPageShell src/app` →
  about/features/pricing/contact/privacy/terms/page). `/workshop/*` has no consent UI, yet
  `VercelWebAnalytics` (root layout) still records those routes.
- **Impact:** Authenticated external users get analytics with no in-app consent control or opt-out. GA4/
  Clarity do NOT reach `/workshop` (landing-only loader — good, and the `redactVercelAnalyticsEvent`
  strips `/workshop` URLs), so blast radius is limited to Vercel Analytics page-view counts. Tolerable for
  owner-only beta; for external multi-tenant use, opt-out should reach logged-in users too.
- **Recommendation:** Tie to CONSENT-01: if Vercel Analytics is consent-gated, propagate the gate (or a
  workspace privacy setting) into the authenticated shell, or formally scope Vercel Analytics to
  aggregate-only legitimate interest and disclose it.
- **Effort:** M · **Confidence:** medium · **existing_plan_overlap:** none

### CONSENT-04 — `ab_test` cookie is `httpOnly:false` and `Secure` only in production-NODE_ENV
- **Severity:** low · **launch_blocker: false**
- **Evidence:** `src/lib/ab-testing/variant-assigner.ts:58-64` sets `ab_test` with `httpOnly:false`
  (commented "client needs to read it for GA4/Clarity"), `sameSite:"lax"`, `secure: NODE_ENV ===
  "production"`, `maxAge` 30 days, `path:"/"`.
- **Impact:** `httpOnly:false` is intentional (client reads it in `experiment-tracker.ts:11`), so it is
  JS-readable — low risk as it holds only a non-PII variant letter (`{"hero-cta-copy":"A"}`). `path:"/"`
  means the experiment cookie is sent to authenticated `/workshop` requests too (unnecessary surface,
  minor bloat). `secure` keys off `NODE_ENV` rather than request protocol; correct on Vercel prod but a
  non-prod build served over HTTP would omit Secure. It is consent-gated (only set when
  `analyticsConsent` true, `variant-assigner.ts:34`) and disclosed nowhere (ties to CONSENT-02).
- **Recommendation:** Scope `path` to landing if feasible; consider always-Secure; add the `ab_test`
  cookie to the privacy/cookie disclosure. No PII, so this is hardening not a blocker.
- **Effort:** S · **Confidence:** high · **existing_plan_overlap:** none

### CONSENT-05 — Bot detection is UA-substring only — NOT privacy-invasive fingerprinting (clears the brief)
- **Severity:** info · **launch_blocker: false**
- **Evidence:** `src/lib/ab-testing/bot-patterns.ts:1-29` is a static list of UA regexes; `isBot()` does a
  substring test on the `user-agent` header only. Used at `variant-assigner.ts:30` solely to force bots to
  variant "A" and skip cookie-setting. No canvas/font/WebGL/device fingerprinting, no IP hashing, no
  cross-site identifiers.
- **Impact:** None — this is the privacy-preferable approach. UA is already sent on every request; no extra
  signal is collected. Confirms the brief's bot-fingerprinting concern is NOT present.
- **Recommendation:** No action. (Product-level note: this is weak as actual bot *mitigation* — Turnstile
  is not built per roadmap-sync — but that is an abuse/SEO concern, not a privacy concern, and out of scope.)
- **Effort:** S · **Confidence:** high · **existing_plan_overlap:** covered-by:roadmap-sync (Turnstile-not-built, product note only)

### CONSENT-06 — Conversion/experiment tracking is only implicitly consent-gated (relies on tracker globals being absent)
- **Severity:** low · **launch_blocker: false**
- **Evidence:** `experiment-tracker.ts:33,41,59,68` guard on `window.gtag`/`window.clarity` existence, not
  on consent. Those globals only exist when `LandingAnalyticsLoader` has loaded them, which requires
  consent — so functionally no event fires without consent. `ABExperimentProvider.tsx:22` DOES gate the
  view event on `consent.analytics`, but the CTA `trackConversion` calls
  (`LandingHeader.tsx:81/94/104`, `HeroSection.tsx:291`, `FinalCTASection.tsx:29`, `PricingSection.tsx:30`)
  do NOT check consent — they rely entirely on the globals being undefined.
- **Impact:** Today this is safe (globals absent ⇒ no-op). But it is a fragile invariant: if any future
  change loads `gtag`/`clarity` outside the consent gate (e.g. a GTM container, or moving GA to the root
  layout like Vercel Analytics already is), conversion events would fire pre-consent with no second line of
  defense. Defense-in-depth gap.
- **Recommendation:** Add an explicit consent check inside `trackExperimentView`/`trackConversion` (read
  the consent cookie) so tracking is gated at the source, not just by global presence.
- **Effort:** S · **Confidence:** high · **existing_plan_overlap:** none

### CONSENT-07 — No "withdraw / change" wording and no active script teardown on opt-out after acceptance
- **Severity:** medium · **launch_blocker: false**
- **Evidence:** `CookieConsentBanner.tsx:51-55` flips the cookie to `analytics:false` and dispatches the
  change event; `LandingAnalyticsLoader.tsx:10` then returns null on re-render, which UNMOUNTS the GA/
  Clarity `<Script>` tags going forward. However, Clarity's inline IIFE (`ClarityScript.tsx:11-18`) has
  already injected `clarity.ms/tag` into `<head>` and started a session-replay recording; React unmounting
  the `<Script>` wrapper does not stop the already-running Clarity collector or remove its injected
  `<script>`/cookies for the current page. GA4 similarly keeps its loaded state until navigation/reload.
- **Impact:** A user who accepts then immediately switches to "Essential only" expects tracking to stop, but
  Clarity keeps recording until the next full page load. This weakens the opt-out guarantee the banner
  implies and the revocability GDPR/DPA require. Cookies set by GA/Clarity are also not cleared on opt-out.
- **Recommendation:** On opt-out, additionally call Clarity's stop API if available and/or force a reload of
  affected pages, and clear `_ga`/`_clarity` cookies. At minimum, document that opt-out takes effect on next
  page load. Also add explicit "you can change or withdraw consent anytime via Cookie settings" copy.
- **Effort:** M · **Confidence:** medium · **existing_plan_overlap:** none

### CONSENT-08 — A/B results pipeline ingests no first-party data; results-calculator has no live data source
- **Severity:** info · **launch_blocker: false**
- **Evidence:** `results-calculator.ts` computes chi-square significance from `{views, conversions}` inputs,
  but `rg` shows no caller, no Postgres table, and no ingestion of GA4/Clarity export — experiment counts
  live only in GA4/Clarity. `experiments.ts:3` defines one experiment (`hero-cta-copy`).
- **Impact:** No privacy issue (no extra first-party storage of behavioral data — arguably privacy-good).
  Noting only so the owner knows "A/B results" today means manually reading GA4, and the calculator is
  currently dead code from a data-flow perspective.
- **Recommendation:** No privacy action. If a first-party results store is added later, it becomes
  in-scope for this audit (behavioral data at rest under RLS).
- **Effort:** S · **Confidence:** high · **existing_plan_overlap:** none

### CONSENT-09 — Consent cookie has no signature/integrity and a 180-day lifetime with no re-prompt on policy change
- **Severity:** low · **launch_blocker: false**
- **Evidence:** `consent.ts:1-3` — `archestimator_cookie_consent`, `LANDING_CONSENT_VERSION = 1`, Max-Age
  180 days; written client-side (`CookieConsentBanner.tsx:37-41`) as plain encoded JSON, `SameSite=Lax`,
  `Secure` only on https. `parseLandingConsentValue` rejects a mismatched `version` (`consent.ts:30`) — so
  bumping the version DOES re-prompt, which is good. But the value is unsigned and client-writable, and
  there is no audit record of consent (who/when) beyond the cookie itself.
- **Impact:** A user (or script) can forge `analytics:true`, but since the user is the only party harmed by
  their own consent state, integrity risk is low. The real gap is **no server-side consent log** — for
  external users you generally must be able to demonstrate consent was given. 180 days is reasonable; the
  version-based re-prompt mechanism is sound.
- **Recommendation:** Acceptable for beta. For external launch consider a lightweight server-side consent
  audit record (timestamp + version) to satisfy "demonstrable consent," and confirm 180-day re-consent
  cadence is the intended policy.
- **Effort:** M · **Confidence:** medium · **existing_plan_overlap:** none

---

## Summary

- **Launch-blockers (must fix before wider/external users): CONSENT-01, CONSENT-02.** An always-on,
  undisclosed Vercel Analytics tracker that contradicts the consent banner's promise, plus a privacy notice
  that names none of the three live trackers (and omits Clarity session replay + international transfer),
  together create a real transparency/consent exposure under GDPR + PH Data Privacy Act once non-owner users
  are admitted.
- **Should-fix (high value, not strictly blocking): CONSENT-03, CONSENT-06, CONSENT-07** — close the
  consent-gating defense-in-depth and opt-out-teardown gaps, extend consent control to authenticated users.
- **Hardening / info: CONSENT-04, CONSENT-05 (clean), CONSENT-08 (clean), CONSENT-09.**
- The GA4/Clarity consent gate itself (`LandingAnalyticsLoader`) is correctly implemented and landing-scoped;
  bot detection is privacy-clean. The two blockers are the gaps the 13-domain audit's coverage critic predicted.
