# GDPR Compliance Plan

**Status:** First consent/CSP slice implemented; legal review, privacy pages, analytics wiring, and user-rights flows not shipped; PostHog deferred unless future product analytics/flags are approved
**Created:** 2026-05-27
**Scope:** Public landing page `/`, marketing subpages, and authenticated app where personal data is processed

## User job

As a product owner preparing for international launch, I need the Archestimator website and app to comply with GDPR so we can legally serve EU/UK visitors and users without exposing the company to regulatory risk.

## Goals

1. Implement a GDPR-compliant cookie consent banner on all public pages
2. Publish a privacy policy that discloses data collection, processing purposes, lawful basis, and user rights
3. Establish a data processing disclosure covering Supabase (sub-processor), Google Analytics, Microsoft Clarity, and any future third parties such as PostHog only if adopted
4. Provide a mechanism for users to exercise GDPR rights: access, rectification, erasure, portability, and objection
5. Ensure the authenticated app's data model supports user data deletion requests

## Non-goals

- Full ISO 27001 or SOC 2 certification (pre-MVP)
- Appointing a formal Data Protection Officer (unlikely required at current scale)
- Cookie consent for authenticated `/workshop/*` beyond what's needed for essential session/auth cookies

## Compliance checklist

### Public pages

- [ ] Cookie consent banner (opt-in model, not implied consent)
  - [x] First public-page banner mounted in `PublicPageShell`
  - [x] Consent preference stored in versioned `archestimator_cookie_consent` cookie
  - [x] Consent logging includes timestamp, version, and analytics preference in the cookie value
  - [x] Easy withdrawal/control via the public "Cookie settings" trigger
  - [x] No `ab_test` cookie is written by the current consent slice before analytics consent
  - [ ] Categorize future cookies in UI copy: essential (auth + consent preference), analytics (GA4, Microsoft Clarity, A/B assignment), marketing (future)
  - [ ] Granular preferences panel beyond the current essential/analytics choice
  - [ ] GA4 and Clarity scripts wired through the consent state
- [ ] Privacy policy page (`/privacy`)
  - [ ] Data controller identity (company name, contact)
  - [ ] Categories of personal data collected
  - [ ] Purposes and lawful basis for processing
  - [ ] Third-party data recipients (Supabase, analytics, hosting)
  - [ ] International data transfers and safeguards
  - [ ] Data retention periods
  - [ ] User rights (access, rectification, erasure, portability, objection, automated decision-making)
  - [ ] Cookie policy (integrated or linked)
  - [ ] Contact for data protection inquiries
- [ ] Terms of service page (`/terms`) — reference GDPR in data handling sections
- [ ] Cookie consent banner must not block SEO crawlers from indexing content

### Authenticated app

- [ ] User profile page with data export capability
- [ ] Account deletion flow that handles:
  - [ ] Supabase Auth user deletion
  - [ ] Workspace data (projects, estimates, components, templates)
  - [ ] Uploaded images (component images, project images)
  - [ ] AI audit records
  - [ ] Activity/revision history
- [ ] Privacy policy accessible from authenticated workspace
- [ ] Data processing addendum (DPA) for Supabase (if not covered by standard ToS)

### Operational

- [ ] Data breach notification procedure (72-hour rule awareness)
- [ ] Record of processing activities (ROPA) — lightweight for current scale
- [ ] Sub-processor list maintained and published

## Cookie consent implementation

### Tool options

| Tool | License | Next.js compat | Notes |
|------|---------|---------------|-------|
| CookieYes | Freemium | Good | Popular, IAB TCF certified |
| Cookiebot | Paid | Good | Enterprise-grade |
| Osano | Paid | Good | Consent management platform |
| react-cookie-consent | MIT (OSS) | Native | Barebones; build UI yourself |
| Custom (Tailwind + consent cookie + optional localStorage mirror) | BYO | Full control | Most lightweight; more maintenance |

**Recommended first pass:** Custom component (Tailwind + first-party consent cookie, with optional localStorage mirror for the preferences UI) for maximum control and zero dependency cost. CookieYes is the fallback if compliance/scanning automation is worth the free-tier limits.

**Analytics consent integration:**

| Tool | Consent mechanism |
|------|------------------|
| Microsoft Clarity | `clarity.consent` API — programmatic opt-in/out |
| Google Analytics 4 | Consent Mode v2 — `gtag('consent', 'update', {...})` |
| PostHog | Deferred. If adopted later, use PostHog opt-in/opt-out capture controls plus a fresh DPA/privacy/CSP review before loading it. |
| GrowthBook | Self-hosted — implement your own consent gate |
| Statsig | Client-side — gate `statsig.initialize()` behind consent |

### Banner behavior

- Appears globally on public pages for the current first slice; do not introduce geo-IP gating unless a later legal/product decision accepts the added complexity
- Opt-in only: no pre-checked non-essential categories
- Stores consent in a small first-party essential cookie with version stamp so server-rendered pages can gate analytics/A/B assignment; localStorage may mirror it for the preferences UI
- Re-shown on policy updates (version bump)
- "Cookie Settings" link in footer to reopen preferences
- Banner must respect `prefers-reduced-motion`

### Clarity consent requirement

Microsoft Clarity Consent Mode now requires a valid consent signal for EEA, UK, and Switzerland traffic. Configure the Clarity project to avoid setting cookies by default, then pass consent changes through the Clarity Consent API only after the user opts into analytics. Verification must confirm that `_clck` and `_clsk` are absent before opt-in.

### Analytics stack decision

The MVP public landing stack is GA4 + Microsoft Clarity + custom A/B assignment. PostHog is not a current processor, cookie source, script source, or CSP domain. Add it only after a future ADR if product analytics, feature flags, native experiments, or unified product telemetry become explicit requirements. See `../05-analytics-stack-decision.md`.

## Supabase & data processing

Supabase is the primary data sub-processor:
- Auth: email addresses, OAuth tokens, session data
- Database: workspace data, project data, estimate data, user profiles
- Storage: uploaded images (component, project)
- The Supabase project `ebxxqidacheyapmmzavr` is hosted in `ap-southeast-1` (Singapore)

### GDPR considerations for Supabase

- Singapore is not an EU adequacy decision country → need Standard Contractual Clauses (SCCs) or user consent as transfer safeguard
- Supabase's DPA should cover this; verify before claiming EU readiness
- User deletion must cascade: Auth user → workspace memberships → owned data → uploaded files

## Risks

- Cookie consent opt-in will reduce analytics data — plan for this in A/B testing
- User data deletion is destructive and irreversible — implement soft-delete + grace period before hard delete
- Singapore hosting may concern some EU enterprise prospects — document the safeguard clearly
- AI audit records (`ai_action_runs`, `ai_tool_calls`, `ai_data_access_events`) currently store hashed user messages and route context — ensure these are covered by deletion flow

## Implementation phases

### Phase 8b-i: Cookie consent banner
- [x] Create `src/components/landing/CookieConsentBanner.tsx`
- [x] Create `src/lib/landing/consent.ts` for cookie parsing, serialization, versioning, and analytics-consent checks
- [x] Mount banner in `PublicPageShell` (NOT root `layout.tsx` — avoids workshop exposure)
- [x] Implement consent storage: first-party `archestimator_cookie_consent` cookie with version stamp
- [x] Ensure current slice does not write `ab_test` before analytics consent
- [x] Pre-checked: NONE except strictly necessary
- [x] Add a public "Cookie settings" trigger to reopen preferences
- [x] Add CSP header in `next.config.ts` (Report-Only mode first, see `02-cookie-csp-dpa-gap-closure.md`)
- [ ] Implement granular preferences beyond essential/analytics if marketing cookies are introduced
- [ ] Wire GA4, Clarity, and future A/B assignment through the stored consent state
- [ ] Keep PostHog absent from MVP script wiring unless `../05-analytics-stack-decision.md` is superseded by a future ADR
- [ ] Verify: no SEO blocking — banner is HTML, popup is JS-only, Googlebot indexes page normally
- [ ] Verify: `prefers-reduced-motion` respected

### Phase 8b-ii: Legal pages
- Create `src/app/privacy/page.tsx` using `PublicPageShell`
- Create `src/app/terms/page.tsx` using `PublicPageShell`
- Privacy policy content: data controller, categories collected, purposes/lawful basis, third-party recipients (Supabase, Google Analytics, Microsoft Clarity), international transfers, retention, user rights, cookie policy. Do not list PostHog as a current recipient unless it is adopted later.
- Terms of service content: service description, user obligations, IP, disclaimers, governing law, contact
- Add privacy + terms links to `LandingFooter.tsx`

### Phase 8b-iii: User data rights (authenticated workshop)
- Add data export flow: profile + workspace data downloadable as JSON
- Add account deletion flow: soft-delete (mark deleted, schedule purge) + grace period
- Deletion cascade must cover: Supabase Auth user, workspace memberships, projects, estimates, components, templates, uploaded images (Storage), AI audit records
- Add link to privacy policy in authenticated workspace footer or settings

## Dependencies

- **Blocks:** A/B testing (Phase 8c-i)
- **Blocks on:** DRY auth refactor (Phase 8a-i)
- **Independent of:** i18n (can proceed in parallel)

## Files affected (from blast radius analysis)

| File | Change type | Risk |
|------|------------|------|
| `src/components/landing/CookieConsentBanner.tsx` | NEW | LOW |
| `src/lib/landing/consent.ts` | NEW | LOW |
| `src/components/landing/PublicPageShell.tsx` | Mount banner + provider | LOW |
| `src/app/privacy/page.tsx` | NEW | LOW |
| `src/app/terms/page.tsx` | NEW | LOW |
| `src/components/landing/LandingFooter.tsx` | Add privacy/terms/cookie links | LOW |
| `src/app/layout.tsx` | **DO NOT TOUCH** | — |
| `src/app/providers.tsx` | **DO NOT TOUCH** | — |
| NEW: account deletion server action | NEW (workshop scope) | HIGH |
| NEW: data export endpoint | NEW (workshop scope) | MEDIUM |

## Verification gates

- [x] Cookie banner renders on first visit (no consent cookie)
- [x] Cookie banner hides after consent given
- [x] Consent preference cookie is written as essential and versioned
- [x] `ab_test` is absent before analytics consent in the current slice
- [ ] `_ga`, `_ga_<id>`, `_clck`, and `_clsk` are absent before analytics consent after analytics scripts are added
- [ ] Microsoft Clarity Consent Mode verification reports denied storage before opt-in and granted storage after opt-in
- [ ] PostHog is absent from network requests, cookies/storage, CSP, and privacy-policy current-processor wording unless a future PostHog ADR approves adoption
- [ ] Privacy page loads at `/privacy` (200)
- [ ] Terms page loads at `/terms` (200)
- [ ] Footer contains privacy, terms, and cookie settings links
- [ ] `bun run build` passes
- [ ] `/workshop` routes unaffected (no banner, no layout shift)
- [ ] Privacy, terms, and consent banner copy avoid compliance overclaims and pass the `../17-public-subpages-claims-matrix.md` claim-safety checkpoint before publish

## References

- `../ab-testing/README.md` — consent dependency for analytics/A/B testing
- `../05-analytics-stack-decision.md` — GA4/Clarity/PostHog official-doc decision record
- `../international-readiness/README.md` — multi-region compliance (CCPA, etc.)
- `.ai/03_plans/landing-page-improvement/17-public-subpages-claims-matrix.md` — claims safety
- `.ai/06_specs/supabase-auth-setup.md` — auth infrastructure
- `.ai/03_plans/ai-chatbot-agent-readiness/` — AI audit tables
