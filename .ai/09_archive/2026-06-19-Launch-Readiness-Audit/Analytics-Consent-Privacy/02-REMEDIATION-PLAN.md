# Remediation Plan — Analytics, A/B-Testing & Consent/Privacy

**Date:** 2026-06-19 · **Author:** Phase-2 adversarial verifier + remediation planner
**Stage gate:** owner-only closed beta → wider/external users
**Verification basis:** full-file reads of every scope file (see 03-EVIDENCE-AND-VERIFICATION.md
for verdicts). DB read not required — no analytics persistence exists in Postgres (CONSENT-08
confirmed dead-code calculator; A/B data lives only in GA4/Clarity tracker-side).

## Master-index classification: V2 verify-gate

After adversarial verification the prior auditor's **two** launch-blockers reduce to
**one wider-launch verify-gate**:

- **CONSENT-01** stays a wider-launch verify-gate (adjusted scope: public/landing routes only, not "every route").
- **CONSENT-02** is **downgraded to should-fix / covered-by an existing recorded launch gate.** It is
  NOT an *additional* new blocker because `decisions.md:786` + `current-state.md:2280,2345` already
  record that `/privacy` is a deliberately "truthful pending-review status page" and that
  **public/self-serve launch is already blocked** until reviewed legal copy replaces it. The privacy
  notice accuracy work is real and required, but it is already gated by an existing owner decision, so
  it does not add a *new* surprise blocker — it operationalizes one the owner already owns.

The net *new* gate this gap pack surfaces is **CONSENT-01** (an always-on Vercel Web
Analytics tracker on public routes that fires before consent and contradicts the banner's promise).

---

## Priority 0 — Verify-gate (decide/fix before exposing public/landing routes to external users)

### CONSENT-01 — Consent-gate (or formally document) Vercel Web Analytics on public routes
**Verdict:** confirmed, scope adjusted. **Severity:** high. **Effort:** S.

**Problem (verified):** `src/app/layout.tsx:40` renders `<VercelWebAnalytics />` unconditionally in
the root `<body>`. `src/components/analytics/VercelWebAnalytics.tsx:7-8` renders
`<Analytics beforeSend={redactVercelAnalyticsEvent} />` with no consent check. The `beforeSend`
redactor (`src/lib/analytics/vercel-web-analytics.ts:39-49`) DROPS events for `/workshop`, `/share`,
`/invite` (returns `null`), so authenticated/tokenized routes emit nothing — but **public/landing/
marketing routes (`/`, `/about`, `/features`, `/pricing`, `/contact`, `/privacy`, `/terms`) DO emit a
page-view event with NO consent gate.** The consent banner copy
(`CookieConsentBanner.tsx:82`) promises "Analytics and experiment cookies stay off unless you accept
them," which an always-on (cookieless but still PII-processing: IP+UA→geo/device) analytics tracker
contradicts on exactly the routes the banner is shown on.

**Pick ONE of two paths (owner decision):**

- **Path A — consent-gate it (parity with GA4/Clarity).** Stop rendering `<Analytics>` until
  `analytics === true`.
  - Make `VercelWebAnalytics` a client component that reads consent via `useLandingCookieConsent()`
    (already the pattern in `LandingAnalyticsLoader.tsx:8-10`) and returns `null` when
    `!consent.analytics`.
  - Caveat: `useLandingCookieConsent` reads the **landing** consent cookie. On authenticated
    `/workshop` routes that cookie may be absent, so Path A would also suppress Vercel Analytics there
    — which is already the case via `beforeSend`, so behavior is consistent. No regression.
  - Files: `src/components/analytics/VercelWebAnalytics.tsx` (add the gate). `layout.tsx` unchanged.
  - Risk: low. `Analytics` mounting later (post-consent) loses the pre-consent page-view — which is
    the entire point.

- **Path B — keep always-on under a documented legitimate-interest basis, and fix the copy.** Decide
  (with the legal-review that `decisions.md:786` already says is pending) that cookieless aggregate
  Vercel Web Analytics runs under legitimate interest, then:
  - Disclose it explicitly in the privacy notice (folds into CONSENT-02) AND
  - Change the banner copy (`CookieConsentBanner.tsx:82`) so it no longer over-promises ("Analytics
    *cookies* stay off…" is technically true for `_ga`/`_clarity`, but the blanket "Analytics … stay
    off" reads as covering all analytics). Narrow the copy to the cookie-setting trackers, or add a
    one-line "we use cookieless aggregate page analytics under legitimate interest."

**Recommendation:** Path A is the smaller, safer, defensible default and matches the existing GA4/
Clarity gate pattern; it also avoids needing a legal opinion before launch. Path B is viable only if
the pending legal review explicitly blesses legitimate interest AND the copy is corrected. Do NOT ship
the current state (always-on + banner promising off) to external users.

**Cross-domain deps:** banner copy touches the Accessibility/SEO/Legal pack surface (they reviewed the
banner for a11y only — a copy change is additive, re-run their banner a11y check). Privacy-notice
disclosure (Path B) folds into CONSENT-02.

**Validation:** `bun run build`; manual: load `/` with NO consent cookie, watch Network — confirm no
`/_vercel/insights/*` page-view POST until "Accept analytics" (Path A) OR confirm disclosure+copy
(Path B). Existing P11 share-no-tracking tests (`current-state.md:2423`) must stay green.

---

## Priority 1 — Should-fix before wider launch (high value, not a *new* surprise blocker)

### CONSENT-02 — Name the actual trackers in `/privacy` (already gated by an existing launch decision)
**Verdict:** confirmed, **launch_blocker downgraded to false** (covered-by existing recorded gate).
**Severity:** high (as legal-accuracy work). **Effort:** M.

**Why downgraded:** `decisions.md:786` records `/privacy` and `/terms` are "only pending-review status
pages until Legal/Privacy replaces them with reviewed launch artifacts; public/private launch remains
blocked until provider, legal, Vercel, QA, support, and owner evidence rows pass."
`current-state.md:2280` repeats "public self-serve launch remains blocked until reviewed legal copy
replaces it." So the *gap* (notice names no tracker) is real, but the *launch gate* already exists and
is owned. This pack makes the gap concrete; it does not add a new blocker.

**Problem (verified):** `src/app/privacy/page.tsx:48-53` lists providers generically ("Supabase/
Postgres … Vercel for hosting, Resend for email, and privacy-reviewed analytics or diagnostic
providers when enabled"). It never names **Google Analytics 4**, **Microsoft Clarity** (session
replay), or **Vercel Web Analytics**; never mentions cookies, the consent mechanism, session replay,
or international transfer (US: Google, Microsoft). `terms-content.ts:104,112` is equally generic. The
live stack loads GA4 (`LandingAnalyticsLoader.tsx:19`), Clarity (`ClarityScript.tsx:14`), and Vercel
Analytics (`layout.tsx:40`).

**Steps (do as part of the reviewed-legal-copy work the owner decision already requires):**
1. In `src/app/privacy/page.tsx` "Service providers" + "Data collected" sections, name each tracker,
   its purpose, that **Clarity records session replay** (clicks/scroll/mouse), the consent cookie
   (`archestimator_cookie_consent`, 180-day), the `ab_test` cookie (30-day), GA `_ga` and Clarity
   `_clarity` cookies, that data is transferred to Google (US) and Microsoft (US), and the opt-out
   path ("Cookie settings" button / "Essential only").
2. Mirror the provider list in `src/lib/legal/terms-content.ts:112` so Terms and Privacy agree.
3. Reconcile the "when enabled" phrasing — GA4/Clarity ARE enabled (post-consent), so "when you accept
   analytics" is the accurate phrasing.

**Cross-domain deps:** Accessibility/SEO/Legal pack reviewed `/privacy` for a11y/readability — a copy
expansion must re-pass their readability/contrast check. This is the legal-review line item in
`decisions.md:786`; coordinate with whoever owns the reviewed-legal-copy replacement so this is not
done twice.

**Validation:** `bun run build` (page is a server component, low risk); manual read-through that every
runtime tracker is named and matches code.

### CONSENT-07 — Opt-out after acceptance does not tear down already-running Clarity
**Verdict:** confirmed. **Severity:** medium. **launch_blocker: false.** **Effort:** M.

**Problem (verified):** `CookieConsentBanner.tsx:51-55` flips the cookie to `analytics:false` and
dispatches the change event; `LandingAnalyticsLoader.tsx:10` then returns `null`, unmounting the
GA/Clarity `<Script>` wrappers for future renders. But `ClarityScript.tsx:11-18` has already injected
`clarity.ms/tag` into `<head>` and started recording; React unmounting the wrapper does not stop the
running Clarity collector or clear its cookies for the current page. GA4 similarly persists until
navigation.

**Steps:**
1. In the opt-out handler (`saveConsent(false)` path), best-effort call Clarity stop if available
   (`window.clarity?.("stop")` — guard for undefined; API availability is not guaranteed, so treat as
   best-effort), and/or force a soft reload of the current public route so the next paint mounts with
   no trackers.
2. Best-effort clear `_ga*` and `_clarity` cookies on opt-out (document.cookie expiry on the current
   domain; cross-subdomain `_ga` may not be clearable from JS — acceptable, document the limit).
3. Add explicit "you can change or withdraw consent anytime via Cookie settings" copy near the banner
   actions (small copy add; also supports the withdrawal-disclosure CONSENT-02 needs).

**Risk:** a forced reload is a visible UX jump; prefer the Clarity-stop + cookie-clear approach and
fall back to "takes effect on next page load" documented behavior. Low blast radius (landing only).

**Validation:** manual: accept → switch to Essential only → confirm in Application/Storage that new
Clarity events stop and `_clarity` cookies are cleared (or documented as next-load).

---

## Priority 2 — Hardening (no launch gate; do opportunistically)

### CONSENT-06 — Gate conversion/view tracking at the source, not just by global presence
**Verdict:** confirmed. **Severity:** low. **launch_blocker: false.** **Effort:** S.

`experiment-tracker.ts:33,41,59,68` guard on `window.gtag`/`window.clarity` existence, not consent.
Functionally safe today (globals only exist post-consent via `LandingAnalyticsLoader`), but a fragile
invariant: any future code that loads `gtag`/`clarity` outside the consent gate (e.g. moving GA to the
root layout the way Vercel Analytics already is) would fire conversions pre-consent with no second
line of defense. The CTA callers (`LandingHeader.tsx`, `PricingSection.tsx`, `HeroSection.tsx`,
`FinalCTASection.tsx` — all import `trackConversion`) do not check consent themselves.

**Step:** add an explicit consent read (reuse `getLandingConsentFromCookieHeader(document.cookie)` from
`consent.ts:58`) at the top of `trackExperimentView`/`trackConversion`; return early if
`!analytics`. Defense-in-depth, no behavior change today.

### CONSENT-04 — `ab_test` cookie hardening
**Verdict:** confirmed (no PII). **Severity:** low. **launch_blocker: false.** **Effort:** S.

`variant-assigner.ts:58-64` sets `ab_test` with `httpOnly:false` (intentional — client reads it for
GA4/Clarity in `experiment-tracker.ts:11`), `sameSite:"lax"`, `secure: NODE_ENV === "production"`,
`path:"/"`, 30-day. Holds only a non-PII variant letter (`{"hero-cta-copy":"A"}`) and is consent-gated
(`variant-assigner.ts:34`). Two minor hardenings: (a) `path:"/"` sends it to `/workshop` requests
unnecessarily — scope to landing if feasible (note: a server component sets it, so path narrowing must
match where the variant is read); (b) keying `secure` off `NODE_ENV` rather than request protocol is
correct on Vercel prod but would drop `Secure` on a non-prod HTTP build — low risk. Also add it to the
CONSENT-02 cookie disclosure.

### CONSENT-09 — No server-side consent audit record
**Verdict:** confirmed. **Severity:** low. **launch_blocker: false.** **Effort:** M.

`consent.ts` cookie is unsigned, client-writable, 180-day, version-gated (`consent.ts:30` — a version
bump DOES re-prompt, which is correct). The user is the only party harmed by forging their own consent,
so integrity risk is low. The real gap is **no server-side "demonstrable consent" log** (who/when/
version). Acceptable for beta. For external launch consider a lightweight append-only consent audit
row (timestamp + version + analytics-bool) — note this would mirror the existing append-only Terms
acceptance pattern (`decisions.md:648` — server-role-stamped writes, RLS, no client forgery). If built,
it becomes in-scope for an RLS review. Defer unless legal review requires demonstrable consent.

### CONSENT-03 — Authenticated routes: REFUTED as stated
**Verdict:** **refuted.** **launch_blocker: false.** See evidence doc. `redactVercelAnalyticsEvent`
returns `null` for `/workshop` (`vercel-web-analytics.ts:6,14-16,33,43`), so Vercel Analytics emits NO
page-view for authenticated routes — the premise "Vercel Analytics tracks them" is false for event
data. The script still loads on those routes (so a no-op transport exists), but no `/workshop` page
data is sent. The residual (no in-app consent control for logged-in users) is a product nicety, not a
privacy exposure given zero authenticated data is transmitted. No action required pre-launch.

### CONSENT-05 / CONSENT-08 — clean, confirmed
- **CONSENT-05** (bot detection): confirmed clean. `bot-patterns.ts` is UA-substring only; no
  fingerprinting/IP-hashing/cross-site IDs. Privacy-preferable. No action. (Turnstile-not-built is a
  separate abuse/product note per roadmap-sync, out of scope.)
- **CONSENT-08** (A/B results pipeline): confirmed — `calculateResults` in `results-calculator.ts` has
  no real caller and no Postgres ingestion; A/B counts live only in GA4/Clarity. No privacy issue
  (no first-party behavioral storage). Note: it is effectively dead code from a data-flow view. If a
  first-party results store is added later, it becomes in-scope (behavioral data at rest under RLS).

---

## Sequencing

1. **CONSENT-01** (P0, S) — the only new verify-gate. Pick Path A (gate) or Path B (document +
   copy). Gate on `bun run build` + manual Network check.
2. **CONSENT-02** (P1, M) — fold into the reviewed-legal-copy replacement the owner decision already
   requires; coordinate with the legal-review owner. CONSENT-04 cookie disclosure + CONSENT-07
   withdrawal copy ride along here.
3. **CONSENT-07** (P1, M), **CONSENT-06** (P2, S), **CONSENT-04** (P2, S) — hardening batch.
4. **CONSENT-09** (P2, M) — only if legal review demands demonstrable consent; mirror the append-only
   Terms-acceptance pattern.

## Codex review gate

Per the pack's loop surface: if CONSENT-01 (Path B) or CONSENT-02 privacy-copy/consent-gating diffs are
executed, they touch legal/consent (high-blast-radius for external exposure) — run `/codex:review` on
that diff before stopping. CONSENT-01 Path A (a one-line consent gate matching an existing pattern) is
low-risk and can rely on proportional local verification.
