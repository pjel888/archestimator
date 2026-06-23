# Implementation Blast Radius And Operations

Date: 2026-06-22
Scope: future Archestimator landing-page implementation

This document covers source blast radius, network/database side effects,
security, privacy, analytics, screenshot operations, rollback, and parallel-agent
coordination.

## Source Blast Radius

Expected source touch points:

| Area | Files | Risk |
| --- | --- | --- |
| Route and metadata | `src/app/page.tsx`, `src/lib/landing/seo-metadata.ts` | SEO/canonical drift, auth-state behavior. |
| Public shell | `src/components/landing/PublicPageShell.tsx` | Nav, analytics loader, consent, public layout. |
| Main landing page | `src/components/landing/gpt-taste/RedesignedLandingPage.tsx` | Large shared file; high merge-conflict risk. |
| Three.js hero | `src/components/landing/gpt-taste/HeroSignalField.tsx` | Bundle size, reduced motion, WebGL fallback. |
| Product proof | New or existing landing proof components | Asset honesty, responsive readability. |
| Contact funnel | `/contact` route/components or API/action used by contact | Public form security and persistence. |
| Tokens/glass | `src/app/globals.css` | Global visual regression if over-edited. |
| Analytics | `LandingAnalyticsLoader`, root analytics posture | Consent and PII risk. |

`RedesignedLandingPage.tsx` should have one merge owner during implementation.
Parallel agents may work on separate extracted components, but one owner should
integrate section order, CTA constants, and copy.

## Database And Network Boundary

The landing redesign itself should not require a database migration.

Allowed without schema changes:

- static public page content;
- contact intent links to an existing contact path;
- consent-aware analytics events;
- static/TSX product proof panels;
- screenshot assets produced from demo data.

Requires explicit implementation note and tests:

- new public form endpoint;
- lead persistence to Supabase/Postgres;
- email/notification integration;
- scheduling integration;
- third-party analytics script beyond current loaders.

Rules:

- Do not write directly from client-side landing code to Supabase.
- Public form writes must go through a server action/API route with validation,
  rate limiting, spam controls, and safe errors.
- Never store or log proposal share tokens, private project names, client names,
  supplier contacts, emails, phone numbers, addresses, or free-text contents in
  analytics.
- If lead persistence is added, document table/RLS/policy scope and rollback.

## Public Form Security Checklist

Follow OWASP-style public input posture:

- validate on the server even when client validation exists;
- validate both syntax and meaning, not just string presence;
- bound field lengths and reject oversized payloads;
- protect state-changing requests with framework CSRF protection or equivalent;
- rate-limit or throttle by IP/session/fingerprint where practical;
- add bot friction such as a honeypot or provider-backed spam control when abuse
  risk appears;
- return safe `400`, `403`, `413`, `429`, and generic `500` errors;
- do not expose provider errors, stack traces, SQL messages, or internal route
  names;
- exclude or mask secrets, tokens, session IDs, emails, phone numbers, and
  free-text PII from logs.

## Analytics And Consent Operations

Implementation must preserve consent boundaries:

- GA/Clarity style tracking should not load or fire before consent.
- Events must use the no-PII property list in doc `12`.
- Community outbound links should identify only the channel and CTA location.
- Third-party scripts must be deferred and non-critical.
- If Vercel analytics remains globally mounted, document the existing posture and
  do not add redundant pre-consent trackers.

## Screenshot And Asset Privacy

Before a screenshot becomes product proof:

- source data must be demo-only;
- `/share/[token]` screenshots must use a demo token and hide token-bearing URLs;
- every asset needs a manifest entry from doc `11`;
- every asset needs a privacy reviewer or explicit privacy check note;
- screenshot dimensions and compression must be stable enough to avoid CLS;
- generated editorial images must be stored separately from screenshots and
  labeled as generated/background assets.

## Performance And Accessibility Operations

Implementation must prove or explicitly document:

- Core Web Vitals target posture: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1 at p75;
- hero text and CTA are not blocked by WebGL, images, or analytics;
- `three` is lazy/client-leaf only or route-budget impact is documented;
- screenshots/panels have explicit aspect ratios;
- no mobile WebGL;
- `prefers-reduced-motion` fallback exists;
- focus states, contrast, target sizes, and visible labels meet doc `09`;
- no placeholder-only form labels.

## Test Blast Radius Matrix

Review or update tests based on touched behavior:

| Behavior | Likely tests |
| --- | --- |
| Hero copy, restrained type, beta wording | `landing-amigo-redesign.test.tsx` |
| CTA labels, hrefs, auth-state CTAs | `landing-interactivity.test.tsx`, `landing-auth-state.test.ts` |
| Font/LCP posture | `public-font-lcp-audit.test.ts` |
| Consent-gated analytics | `landing-consent.test.tsx` |
| Public security headers/contact posture | `landing-security-headers.test.ts`, contact tests if changed |
| Public shell/nav/layout | `public-page-shell.test.tsx`, `public-cache-safety-harness.test.ts` |
| Proof/claims/logo discipline | `landing-company-proof.test.tsx` |

Doc `10` Task 9 is the canonical verification command list. Expand it when code
changes touch additional files.

## Rollback And Preview

Keep rollback simple:

- evolve the current route instead of adding a parallel public homepage;
- keep unrelated workshop/library files out of the landing branch;
- avoid migrations unless the contact funnel requires persistence;
- keep old behavior recoverable through git history;
- document validation gaps rather than silently shipping unverified browser,
  build, or provider behavior.

## External Source Basis

References checked on 2026-06-22:

- Google Search Central Core Web Vitals:
  <https://developers.google.com/search/docs/appearance/core-web-vitals>
- web.dev Web Vitals: <https://web.dev/articles/vitals/>
- OWASP Input Validation Cheat Sheet:
  <https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html>
- OWASP CSRF Prevention Cheat Sheet:
  <https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html>
- OWASP Logging Cheat Sheet:
  <https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html>
- OWASP XSS Prevention Cheat Sheet:
  <https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html>

