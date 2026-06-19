# Launch-Readiness · Analytics, A/B-Testing & Consent/Privacy (Phase-2 Gap Pack)

**Status:** Deletable plan-pack header. Phase-2 gap pack of the 2026-06-19 Launch-Readiness Audit.
**Created:** 2026-06-19
**Pack type:** Gap-closure (coverage-critic finding). The 13-domain launch-readiness audit
(`.ai/03_plans/2026-06-19-Launch-Readiness-Audit/<Pack>/`) did NOT audit analytics/A-B/consent as a
privacy/consent/legal surface. This pack closes that gap. It is audit-only; it does not own
remediation execution.

## Exact owner job

Decide, before exposing Archestimator to WIDER / EXTERNAL users (beyond the current owner-only
closed beta), whether the analytics + A/B + consent stack is legally and operationally safe:

1. Is every tracker (GA4, Microsoft Clarity, Vercel Web Analytics) loaded ONLY after explicit
   analytics consent, and does opt-out actually stop it on every route?
2. Are A/B assignment cookies correctly scoped (name, duration, flags, consent-gated)?
3. Does bot-detection avoid privacy-invasive fingerprinting?
4. Does the **published `/privacy` notice match the trackers actually running** (GA4, Clarity
   session replay, Vercel Analytics, cookies, consent mechanism, international transfer)?
5. Are PH Data Privacy Act (RA 10173) / GDPR-style obligations met for analytics on external users?

## Routes / screens in scope

- `/` (landing — A/B hero experiment, consent banner, GA4 + Clarity loader)
- `/about`, `/features`, `/pricing`, `/contact`, `/privacy`, `/terms` (PublicPageShell: consent banner + GA/Clarity loader)
- ALL routes incl. `/workshop/*`, `/share/*`, `/invite/*` (root-layout Vercel Web Analytics)

## Files reviewed (read in full)

- `src/lib/ab-testing/{bot-patterns,variant-assigner,experiment-tracker,results-calculator,experiments,types}.ts`
- `src/lib/landing/{consent,useLandingCookieConsent,get-landing-auth-state}.ts`
- `src/components/landing/{CookieConsentBanner,LandingAnalyticsLoader,ClarityScript,ABExperimentProvider,PublicPageShell}.tsx`
- `src/components/analytics/VercelWebAnalytics.tsx`, `src/lib/analytics/vercel-web-analytics.ts`
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/privacy/page.tsx`, `src/lib/legal/terms-content.ts`
- `next.config.ts` (CSP tracking domains)

## Non-goals

- PostHog (deferred from MVP landing stack — do not revive).
- CSP nonce pipeline / `unsafe-inline` removal (owned by Shared-Link CSP + NextJS-Vercel-Headers packs).
- i18n / international landing composition (separate landing-improvement scope).
- Accessibility of the consent banner (covered by the Accessibility/SEO/Legal pack).
- Re-flagging KNOWN-DECIDED items (CI/CD deferral, PITR-off, Codex history-exposure acceptances).

## Files expected to change (if remediation is approved)

- `src/app/privacy/page.tsx` and/or `src/lib/legal/terms-content.ts` (name the actual trackers,
  cookies, session replay, international transfer, opt-out).
- `src/components/analytics/VercelWebAnalytics.tsx` + `src/app/layout.tsx` (consent-gate or
  document legitimate-interest basis for Vercel Analytics).
- Possibly `src/lib/ab-testing/variant-assigner.ts` (cookie flags/naming hardening).
- Consent banner copy (`CookieConsentBanner.tsx`) to reference the named providers.

## Validation gate

- `bun run build` (NOT `bun run validate` — known-red on main).
- Targeted: existing landing/consent/AB tests + P11 share-no-tracking tests must stay green.
- Manual: load `/` with no consent cookie → confirm in Network tab that NO request hits
  `googletagmanager.com`, `clarity.ms`; then confirm Vercel `/_vercel/insights` behavior against
  the chosen legal basis. Accept analytics → confirm trackers load. Essential-only → confirm none load.

## Deletion criteria

Delete this pack once: (a) each CONSENT-NN finding is either remediated, owner-accepted with a
recorded decision in `.ai/10_state/decisions.md`, or explicitly deferred past wider launch; and
(b) `/privacy` accurately reflects the live tracker set. Until then it stays as durable evidence.

## Loop surface

Lightweight in-session loop. The privacy-policy-mismatch and Vercel-consent findings touch
legal/consent (high-blast-radius for external exposure) — if remediation is executed, run the
Codex review gate on the privacy-copy + consent-gating diff.

## Durable-state path

This pack. Cross-references: `.ai/10_state/known-issues.md:404` (A/B stack status),
`.ai/10_state/current-state.md:2345` (Phase 8 consent truth),
`.ai/03_plans/2026-06-01-security-owasp-compliance-audit/08-data-protection-and-privacy.md`
(did NOT cover trackers), `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/Accessibility-SEO-Legal-Content/`
(legal pages reviewed for a11y/SEO, NOT consent gating).
