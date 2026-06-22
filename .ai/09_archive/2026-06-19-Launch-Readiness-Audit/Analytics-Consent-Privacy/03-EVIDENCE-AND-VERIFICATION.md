# Evidence & Verification — Analytics, A/B-Testing & Consent/Privacy

**Date:** 2026-06-19 · **Verifier:** Phase-2 adversarial verifier
**Method:** full-file reads of every cited file (authoritative over graph/`rg` symbol-alias noise);
reconcile reads of `decisions.md`, `current-state.md`, `known-issues.md`. No DB read needed — no
analytics persistence exists in Postgres (CONSENT-08 confirms the only calculator is dead code and
A/B counts live tracker-side in GA4/Clarity).

**Adversarial summary:** prior auditor claimed 2 launch-blockers (CONSENT-01, CONSENT-02). After
verification: **1 net new launch-blocker (CONSENT-01, scope adjusted); CONSENT-02 downgraded to
should-fix/covered-by an existing recorded launch gate; CONSENT-03 refuted.**

---

## Per-finding verdicts

### CONSENT-01 — Vercel Web Analytics always-on, no consent gate
**Verdict: CONFIRMED (scope ADJUSTED). launch_blocker: TRUE. severity: high.**
**existing_plan_overlap: none.**

- Confirmed: `layout.tsx:40` renders `<VercelWebAnalytics />` unconditionally; `VercelWebAnalytics.tsx:7-8`
  has no consent check; `useLandingCookieConsent` is not imported there.
- Confirmed contrast: GA4/Clarity ARE gated (`LandingAnalyticsLoader.tsx:10` `if (!consent.analytics) return null`).
- Confirmed banner contradiction: `CookieConsentBanner.tsx:82` "Analytics and experiment cookies stay
  off unless you accept them."
- **Adjustment (adversarial):** the prior claim "every route … landing AND `/workshop`, `/share`,
  `/invite`" is too broad. `redactVercelAnalyticsEvent` (`vercel-web-analytics.ts:39-49`) returns
  `null` for `/workshop`, `/share`, `/invite` (lines 5-6, 12-17, 33, 43), so the SDK's `beforeSend`
  **drops the event entirely** for those paths — no page-view data is sent. The real, verified exposure
  is on **public/landing/marketing routes** (`/`, `/about`, `/features`, `/pricing`, `/contact`,
  `/privacy`, `/terms`), where a page-view IS sent with no consent gate. Still a genuine pre-consent
  tracker that contradicts the banner on the very routes the banner renders. Stays a launch-blocker for
  external users, narrower than stated.
- **Proof gate — what local/read checks CAN prove:** code path (always-on render, no gate, redactor
  drops sensitive paths) is fully proven by reads. **CANNOT prove without runtime/owner:** the exact
  `/_vercel/insights/*` network payload contents and whether Vercel processes IP server-side for
  cookieless geo — that needs a live Network-tab capture on the deployed site (owner's browser). The
  legal characterization (cookieless aggregate = legitimate interest vs. consent-required) needs the
  legal review `decisions.md:786` already says is pending. The code-level contradiction (always-on vs.
  banner promise) is proven now.

### CONSENT-02 — `/privacy` does not name the live trackers
**Verdict: CONFIRMED (content); launch_blocker DOWNGRADED to FALSE. severity: high (as legal-accuracy work).**
**existing_plan_overlap: ADJUSTED → covered-by:decisions.md:786 / current-state.md:2280 (launch already
gated on reviewed legal copy); partial:2026-06-19-Launch-Readiness-Audit/Accessibility-SEO-Legal-Content (a11y of page only).**

- Confirmed: `privacy/page.tsx:48-53` lists generic providers, never names GA4/Clarity/Vercel
  Analytics, never mentions cookies/consent/session-replay/international transfer. `terms-content.ts:104,112`
  equally generic. Live stack loads all three trackers (verified at `LandingAnalyticsLoader.tsx:19`,
  `ClarityScript.tsx:14`, `layout.tsx:40`). Clarity session replay confirmed by the inline tag at
  `ClarityScript.tsx:11-18`.
- **Why downgraded from launch_blocker (adversarial):** this is NOT a *new* surprise blocker. The state
  docs already record an owner decision that `/privacy` is a deliberately "truthful pending-review
  status page" and that **public/self-serve launch is already blocked** until reviewed legal copy
  replaces it (`decisions.md:786`; `current-state.md:2280` "public self-serve launch remains blocked
  until reviewed legal copy replaces it"; `current-state.md:2345` "reviewed Privacy Notice/Terms,
  DPA/legal review … remain open"). The privacy-notice accuracy gap is real and must be fixed, but the
  launch gate already exists and is owned — this pack operationalizes it rather than adding a new one.
- **Proof gate — CAN prove:** the mismatch (notice vs. running trackers) is fully proven by reads.
  **CANNOT prove:** whether the *reviewed* legal copy (when written) satisfies GDPR Art. 13 / RA 10173
  — that is a legal-counsel judgment, not a code check.

### CONSENT-03 — No consent surface on `/workshop`, but Vercel Analytics tracks it
**Verdict: REFUTED (as stated). launch_blocker: FALSE. severity: lowered to info.**
**existing_plan_overlap: none.**

- The premise "Vercel Analytics tracks `/workshop`" is **false for event data**:
  `redactVercelAnalyticsEvent` returns `null` for any `/workshop` path
  (`vercel-web-analytics.ts:6` `AUTHENTICATED_PATH_PREFIXES = ["/workshop"]`, `:14-16`, `:33`, `:43`),
  so `beforeSend` drops the page-view — no `/workshop` analytics data is transmitted. The prior finding
  itself notes the redactor "strips `/workshop` URLs" but then still rates the issue medium for
  "page-view counts"; the redactor does not strip-and-send, it **returns null and sends nothing**.
- Residual (no in-app consent toggle for logged-in users) is a product nicety, not a privacy exposure,
  because zero authenticated behavioral data leaves the client via Vercel Analytics. Refuted as a
  launch concern.
- **Proof gate — CAN prove:** the `null`-drop path is proven by read. **CANNOT prove without runtime:**
  that the SDK honors a `null` return as "drop" (it does per `@vercel/analytics` contract, but a live
  Network check on `/workshop` confirming no `/_vercel/insights` POST would close it definitively).

### CONSENT-04 — `ab_test` cookie flags
**Verdict: CONFIRMED. launch_blocker: FALSE. severity: low. existing_plan_overlap: none.**

- Confirmed `variant-assigner.ts:58-64`: `httpOnly:false` (intentional, `:63` comment), `sameSite:"lax"`,
  `secure: NODE_ENV==="production"` (`:62`), `path:"/"` (`:60`), 30-day (`:6`). Non-PII variant letter
  only. Consent-gated at `:34` (`if (!options.analyticsConsent) return "A"`). Hardening, not a blocker.

### CONSENT-05 — Bot detection
**Verdict: CONFIRMED CLEAN. launch_blocker: FALSE. severity: info. existing_plan_overlap: covered-by:roadmap-sync (Turnstile note only).**

- `bot-patterns.ts:1-29` is a static UA-regex list; `isBot()` (`:26-28`) is a substring test on the UA
  header only. No canvas/font/WebGL fingerprint, no IP hash, no cross-site ID. Used solely at
  `variant-assigner.ts:30` to force bots to variant A. Privacy-preferable. Brief's bot-fingerprinting
  concern confirmed ABSENT.

### CONSENT-06 — Conversion tracking implicitly gated by global presence
**Verdict: CONFIRMED. launch_blocker: FALSE. severity: low. existing_plan_overlap: none.**

- Confirmed `experiment-tracker.ts:33,41,59,68` guard on `window.gtag`/`window.clarity` existence, not
  consent. `ABExperimentProvider.tsx:22` DOES gate the view event on `consent.analytics`. The CTA
  callers — verified imports of `trackConversion` in `LandingHeader.tsx`, `PricingSection.tsx`,
  `HeroSection.tsx`, `FinalCTASection.tsx` — do NOT check consent; they rely on globals being absent.
  Safe today (globals only loaded post-consent), fragile invariant. Defense-in-depth fix.

### CONSENT-07 — No active teardown of running Clarity on opt-out
**Verdict: CONFIRMED. launch_blocker: FALSE. severity: medium. existing_plan_overlap: none.**

- Confirmed: `CookieConsentBanner.tsx:51-55` writes `analytics:false` + dispatches the change event;
  `LandingAnalyticsLoader.tsx:10` returns null (unmounts `<Script>` wrappers going forward). But
  `ClarityScript.tsx:11-18` already injected `clarity.ms/tag` and started recording; React unmount does
  not stop the live collector or clear its cookies for the current page. GA4 persists until navigation.
- **Proof gate — CAN prove:** the unmount-only path is proven by read. **CANNOT prove without runtime:**
  exactly how long Clarity keeps recording after unmount and whether `window.clarity("stop")` is
  available in the loaded build — needs a live browser check. The *gap* (no explicit teardown) is proven.

### CONSENT-08 — A/B results-calculator is dead code, no first-party storage
**Verdict: CONFIRMED. launch_blocker: FALSE. severity: info. existing_plan_overlap: none.**

- Confirmed: `calculateResults` (`results-calculator.ts:25`) has no real caller; no Postgres table; no
  GA4/Clarity export ingestion. `experiments.ts:3-8` defines one experiment (`hero-cta-copy`). A/B
  counts live only tracker-side. No privacy issue (no first-party behavioral data at rest). Effectively
  dead code; in-scope again only if a first-party results store is later added.
- **Proof gate — CAN prove:** absence of callers proven by read + search. The DB-absence claim is
  corroborated by the audit's own grep; a `list_tables` read could confirm no analytics table exists,
  but it is not load-bearing for this info-level verdict.

### CONSENT-09 — Consent cookie unsigned, no server-side audit, 180-day
**Verdict: CONFIRMED. launch_blocker: FALSE. severity: low. existing_plan_overlap: none.**

- Confirmed `consent.ts:1-3` (`archestimator_cookie_consent`, version 1, 180-day) and
  `CookieConsentBanner.tsx:37-41` writes plain encoded JSON, `SameSite=Lax`, `Secure` only on https.
  `parseLandingConsentValue` (`consent.ts:30`) rejects a version mismatch → a version bump re-prompts
  (correct). Unsigned + client-writable, but the user is the only party harmed by forging their own
  consent. Real gap = no server-side demonstrable-consent log. Acceptable for beta; defer unless legal
  requires it. If built, mirror the append-only server-stamped Terms-acceptance pattern
  (`decisions.md:648`) and review its RLS.

---

## Severity / launch_blocker corrections vs. prior audit

| ID | Prior | Verified | Change |
|----|-------|----------|--------|
| CONSENT-01 | high / blocker / every route | high / **blocker** / **public routes only** | scope narrowed, stays blocker |
| CONSENT-02 | high / **blocker** | high / **not a *new* blocker** (covered-by existing launch gate) | downgraded |
| CONSENT-03 | medium / not blocker | **info / refuted** | refuted |
| CONSENT-04 | low / not blocker | low / not blocker | confirmed |
| CONSENT-05 | info / clean | info / clean | confirmed |
| CONSENT-06 | low / not blocker | low / not blocker | confirmed |
| CONSENT-07 | medium / not blocker | medium / not blocker | confirmed |
| CONSENT-08 | info / clean | info / clean | confirmed |
| CONSENT-09 | low / not blocker | low / not blocker | confirmed |

**Net new launch-blockers from this gap surface: 1 (CONSENT-01).**

## Honest limits of this verification

- All verdicts are **static-read** verdicts. The three things that need a **live deployed-site Network
  capture (owner's browser)** to close fully: (1) CONSENT-01 — confirm the pre-consent
  `/_vercel/insights` POST actually fires on `/`; (2) CONSENT-03 — confirm zero `/_vercel/insights`
  POST on `/workshop`; (3) CONSENT-07 — confirm how long Clarity records post-opt-out. None of these
  change the *direction* of the verdicts; they would harden them.
- All **legal characterizations** (consent-required vs. legitimate-interest, GDPR Art. 13 / RA 10173
  sufficiency) are flagged as requiring the legal review that `decisions.md:786` already records as
  pending. This pack provides the code-truth those reviewers need; it does not substitute for counsel.
