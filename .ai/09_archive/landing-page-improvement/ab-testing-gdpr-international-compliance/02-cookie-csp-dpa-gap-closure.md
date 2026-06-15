# Gap Closure — Cookie Audit, CSP, DPA & Compat Checks

**Status:** Active audit; first consent-cookie and Report-Only CSP slice implemented; DPA/legal review still open
**Created:** 2026-05-27
**Source evidence:** Live codebase scans, npm registry, npm view, official GA4/Clarity/PostHog docs refresh

---

## Gap #1: Cookie Audit (HIGH)

### Current cookies on the landing page

| # | Cookie | Type | Purpose | Duration | Party |
|---|--------|------|---------|----------|-------|
| 1 | `sb-<ref>-auth-token` | HTTP (chunked) | Supabase session (access + refresh token) | Session | 1st |
| 2 | `sb-<ref>-auth-token.0` | HTTP (chunked) | Supabase session chunk | Session | 1st |
| 3 | `sb-<ref>-auth-token.1` | HTTP (chunked) | Supabase session chunk | Session | 1st |
| 4 | `archestimator_panel_width_*` | HTTP | Resizable panel widths (workshop only) | 1 year | 1st |
| 5 | `archestimator_cookie_consent` | HTTP | Cookie preference/version so public pages can gate analytics/A/B assignment | 180 days | 1st |

**Plus localStorage (not cookies, but GDPR-disclosable):**

| Key | Purpose |
|-----|---------|
| `estimate_table_columns_*` | Table column sizing per project |
| `archestimator_component_library_preferences_v1` | Library view mode, group-by, sort |
| `estimate_library_active_tab` | Legacy tab preference (fallback) |

### Cookies we will ADD for the MVP landing stack (GA4 + Clarity + custom A/B)

| # | Cookie | Type | Purpose | Duration | Party |
|---|--------|------|---------|----------|-------|
| 6 | `_ga` | HTTP | GA4 user identifier | 2 years | 3rd (Google) |
| 7 | `_ga_<measurement-id>` | HTTP | GA4 session identifier | 2 years | 3rd (Google) |
| 8 | `_clck` | HTTP | Clarity user identifier | 1 year | 3rd (Microsoft) |
| 9 | `_clsk` | HTTP | Clarity session identifier | Session | 3rd (Microsoft) |
| 10 | `CLID` | HTTP | Clarity regional identifier | 1 year | 3rd (Microsoft) |
| 11 | `ab_test` | HTTP | A/B test variant assignments | 30 days | 1st |

PostHog is explicitly **not** part of the MVP landing analytics stack. If PostHog is adopted later, run a fresh cookie/storage scan after choosing region, persistence mode, autocapture, session replay, and feature-flag settings; do not add generic PostHog cookies to the current list preemptively.

### Action for GDPR compliance

The privacy policy must list ALL 11 cookies with name, purpose, duration, and 1st/3rd party classification. The cookie consent banner must categorize them:
- **Essential** (always on): Supabase auth cookies (#1–3), panel width (#4), consent preference (#5)
- **Analytics** (opt-in): GA4 (#6–7), Clarity (#8–10), A/B testing (#11)

---

## Gap #2: CSP Plan (HIGH)

### Current state

- **Report-Only CSP now exists for public marketing routes** in `next.config.ts`; strict enforcement is still off.
- **No `eval()` or `new Function()` in app code** — strict production CSP should eventually remove `'unsafe-eval'`, but the current Report-Only policy allows it during the Next/dev transition.
- **Zero `dangerouslySetInnerHTML`** in landing components.
- **32 `style={{}}` inline style usages** across the codebase, but only **1** in landing components (`NeatWireframeBackground.tsx`).

### Surprise finding: `@firecms/neat` DOM injection

`@firecms/neat@0.8.0` dynamically injects at runtime:
1. An `<a>` tag linking to `neat.firecms.co` (with inline styles)
2. A `<script type="application/ld+json">` with SEO schema
3. A hidden shadow-DOM link to `firecms.co`

The existing code already mitigates this with a `MutationObserver` and `<style jsx global>`, but the injection still happens. For a strict CSP, this package is the #1 blocker.

### External domains needed for landing page

| Domain | Needed for | CSP directive |
|--------|-----------|---------------|
| `self` | Next.js bundles, `/_next/` | `script-src`, `style-src`, `default-src` |
| `*.supabase.co` | Auth + API calls | `connect-src`, `img-src` |
| `www.googletagmanager.com` | GA4 (to be added) | `script-src` |
| `www.google-analytics.com` | GA4 analytics endpoint | `connect-src` |
| `www.clarity.ms` | Clarity script (to be added) | `script-src` |
| `c.clarity.ms` | Clarity data endpoint | `connect-src` |
| `neat.firecms.co` | `@firecms/neat` branding injection | `connect-src` (block) |
| `firecms.co` | `@firecms/neat` shadow DOM backlink | `connect-src` (block) |

PostHog domains are intentionally absent from the current CSP. If PostHog is adopted later, add only the configured PostHog `api_host` / asset domains required by the selected region and feature set.

### Current CSP (Report-Only first)

```http
Content-Security-Policy-Report-Only:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms;
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://region1.google-analytics.com https://www.clarity.ms https://*.clarity.ms;
  img-src 'self' data: blob: https://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com https://*.clarity.ms;
  font-src 'self' data:;
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
```

**`'unsafe-inline'` in `style-src` is unavoidable** due to `@firecms/neat` injection, `lenis` inline style properties, `styled-jsx`, and React inline styles. Consider replacing `@firecms/neat` with a self-hosted alternative as a future improvement.

### Rollout plan

1. **Phase 8b-i**: Add `Report-Only` CSP header alongside the cookie consent banner — implemented for public marketing routes
2. **Monitor** for 1–2 weeks: collect violation reports
3. **Add legal route coverage** when `/privacy` and `/terms` ship; current route coverage is `/`, `/about`, `/features`, `/pricing`, and `/contact`
4. **Refactor** the 32 `style={{}}` usages to Tailwind classes where practical (workshop scope, not landing)
5. **Evaluate** `@firecms/neat` replacement for strict CSP
6. **Switch** from `Report-Only` to enforced `Content-Security-Policy` when violations are clean

---

## Gap #3: DPA / Sub-processor Verification (HIGH)

### Status: OPEN

Current official-source check confirms documents and account-level controls exist, but Archestimator still needs a human/legal reviewer to record the actual account/entity posture before EU/UK launch:

| Sub-processor | What to check | Where |
|--------------|---------------|-------|
| **Supabase** | Does their standard DPA cover free-tier projects? Are SCCs included for Singapore → EU transfers? | supabase.com/legal/dpa |
| **Google (GA4)** | Do Google Ads Data Processing Terms apply to free GA4? Or is there a separate GA4-specific DPA? | privacy.google.com/businesses |
| **Microsoft (Clarity)** | Does Clarity's free tier include a DPA? Where is data processed? | clarity.microsoft.com/terms |
| **PostHog** | Future-only: if adopted, which region/DPA/sub-processors apply? | posthog.com/docs/privacy |

### Minimum before EU launch

- [ ] Read each sub-processor's DPA/terms page
- [ ] Confirm free tier is covered (or what the limitation is)
- [ ] Document the finding — even "not covered" is acceptable for pre-MVP with a disclaimer
- [ ] List sub-processors in the privacy policy with links to their DPAs
- [ ] If Supabase Singapore → EU transfer needs SCCs: check if they're included or if we need to sign them separately

### Acceptable pre-MVP posture

If any sub-processor's free tier does NOT include a DPA: disclose it in the privacy policy, note that we're pre-MVP, and commit to resolving before paid launch. Treat this as a legal-review item, not as a shipped compliance guarantee.

---

## Gap #7: `@next/third-parties/google` Compatibility (MEDIUM)

**✅ Confirmed compatible.**

```
npm view @next/third-parties version → 16.2.6
npm view @next/third-parties peerDependencies → next: ^13-16, react: ^18-19
```

Archestimator: `next@16.2.6` + `react@19.2.4` — both within range. No version conflicts.

**Install command:** `bun add @next/third-parties`

### Usage in PublicPageShell

```typescript
import { GoogleAnalytics } from "@next/third-parties/google";

// Inside PublicPageShell — only renders if consent.analytics === true
{consent.analytics && (
  <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID!} />
)}
```

---

## What was moved from open gap to implementation plan

| Gap | Where closed |
|-----|-------------|
| #4 Bot filtering | `ab-testing/README.md` — new "Bot filtering" section with UA patterns + `isBot()` function |
| #5 Language switcher UI | `international-readiness/README.md` — new section with placement, behavior, and implementation code |
| #6 i18n rollback plan | `international-readiness/README.md` — pre-migration safety steps + rollback steps + permanent redirects |
| #8 GA4 attribution | `ab-testing/README.md` — corrected to require explicit `experiment_id` and `variant` on conversion events + smoke test procedure |
| #9 Performance budget | `ab-testing/README.md` — added to "Limitations & future work" table (~115KB estimated, acceptable) |
| #10 Multivariate/redirect | `ab-testing/README.md` — documented as future options in limitations table |

---

## Remaining decisions

The `@firecms/neat` package silently injects DOM elements and external links to `firecms.co`. The package is pinned at `0.8.0` and patched locally for animation pause support, but the current patch does not remove the branding/link injection. For a strict CSP and clean GDPR posture, consider:

- **Option A**: Keep it. It's already mitigated. Accept `'unsafe-inline'` in CSP.
- **Option B**: Replace with a self-hosted WebGL/CSS gradient. More work, cleaner CSP.
- **Option C**: Fork/patch `@firecms/neat` to remove the injection. Moderate effort, keeps the gradient.

No action required for the Phase 8a-i auth cleanup or first Phase 8b-i consent/CSP slice. Before strict CSP enforcement, either replace the dependency, fork/patch out the injection, or document why `'unsafe-inline'` plus Report-Only monitoring remains acceptable.
