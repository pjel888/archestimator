# Residual Risk Register

**Status:** In progress; first consent/CSP slice implemented; legal, analytics, strict-CSP, proxy, and future-PostHog gates still open
**Created:** 2026-05-27

---

## Risk #1: DPA / Legal Review → Open with Verification Checklist

**Current state:** Not legally closed. A self-serve DPA verification checklist exists, but Philip or a qualified legal reviewer must complete it and record the date/entity/account posture. If any sub-processor's free tier lacks DPA coverage, document it as a known pre-MVP limitation in the privacy policy.

### DPA Verification Checklist

| # | Sub-processor | Check | Where to verify | Acceptable if |
|---|--------------|-------|-----------------|---------------|
| 1 | **Supabase** | DPA covers free-tier projects? | [supabase.com/legal/dpa](https://supabase.com/legal/dpa) | DPA applies to all projects, or free tier is explicitly covered |
| 2 | **Supabase** | SCCs included for Singapore → EU transfers? | Same DPA document (usually Annex) | SCCs are referenced, or "Standard Contractual Clauses" appear in the document |
| 3 | **Supabase** | Sub-processor list published? | [supabase.com/legal/subprocessors](https://supabase.com/legal/subprocessors) (if exists) or DPA Annex | List is accessible; AWS is listed (Supabase runs on AWS) |
| 4 | **Google (GA4)** | Ads Data Processing Terms apply to free GA4? | [privacy.google.com/businesses/processorterms](https://privacy.google.com/businesses/processorterms/) | Terms explicitly cover Google Analytics, or a separate GA4 DPA is linked |
| 5 | **Google (GA4)** | Data processing location disclosed? | GA4 Admin → Account settings → Data processing terms | "Data processing location" is configurable or documented |
| 6 | **Microsoft (Clarity)** | DPA available for free tier? | [clarity.microsoft.com/terms](https://clarity.microsoft.com/terms) | DPA is referenced, or terms include data processing clauses |
| 7 | **Microsoft (Clarity)** | Data processing location disclosed? | Clarity settings or terms | EU data centers are used for EU traffic, or location is transparent |

PostHog is not part of the current MVP landing stack. If a future ADR adopts PostHog, add PostHog DPA/sub-processor/region checks before enabling it.

### What to do with the results

| Scenario | Action |
|----------|--------|
| All 7 checks pass | ✅ List sub-processors in `/privacy` with links to their DPAs. No further action. |
| Some checks fail for free tier | ⚠️ Disclose in privacy policy and treat as a legal-review blocker before any EU/UK launch claim. |
| Supabase SCCs missing | ⚠️ Contact Supabase support to confirm SCC coverage. If unavailable: note in privacy policy that Singapore hosting uses user consent as the transfer safeguard (GDPR Art. 49). |

### Privacy policy skeleton

The `/privacy` page should include these sections (content to be written during Phase 8b-ii):

1. Data controller identity (company name, email, physical address if available)
2. Categories of personal data collected (email, OAuth profile data, usage analytics, uploaded images)
3. Purposes and lawful basis (service provision = legitimate interest; analytics = consent; auth = contract)
4. Third-party data recipients: Supabase (hosting/auth), Google Analytics (analytics), Microsoft Clarity (analytics). Add PostHog only if a future ADR adopts it.
5. International data transfers: Singapore (Supabase) — safeguard: SCCs or user consent
6. Data retention periods: account data = until deletion; analytics = 26 months (GA4 default); Clarity = 12 months
7. User rights: access, rectification, erasure, portability, objection, restriction, withdrawal of consent
8. Cookie policy: list all cookies from the cookie audit (`02-cookie-csp-dpa-gap-closure.md`), including the essential consent-preference cookie and analytics-only `ab_test`
9. Contact for data protection inquiries
10. Right to lodge a complaint with a supervisory authority

---

## Risk #2: Custom A/B Results Calculator → Planning Fact Verified

**Current state:** Verified for planning. GA4 custom event parameters require **manual registration** as event-scoped custom dimensions in GA4 Admin, with a **24-48 hour delay** before they appear in Exploration reports. Event parameters describe the event where they are sent, so conversion events must explicitly include `experiment_id` and `variant`; do not rely on GA4 to carry those fields forward from `experiment_view`.

**Updated plan** (applied to `ab-testing/README.md`):
- **Day 0**: Deploy event tracking + immediately register dimensions in GA4 Admin
- **Days 0-N**: Use GA4 Realtime for sanity checks (not final results); confirm each conversion event includes variant metadata
- **Day N+1**: Export CSV from GA4 Exploration → feed into calculator

**Fast-follow alternative spec'd**: Local event log API (`POST /api/ab-testing/event`) for live results without the GA4 delay. One new API route + one DB table. Cost: ~2 hours. Schedule if experiment cadence exceeds tolerance.

---

## Risk #3: `@firecms/neat` DOM Injection → Mitigated, Not Replaced

**Current state:** Dependency is pinned at `@firecms/neat@0.8.0` and patched locally for animation pause support, but the live landing hero still imports `NeatGradient` through `NeatWireframeBackground.tsx`. The CSP/privacy injection risk is not eliminated until the package is replaced or patched to remove the injected branding/link behavior.

### Recommendation: Custom Three.js wireframe component

**Why:**
- **Zero marginal bundle cost** — Three.js is already a dependency (used elsewhere in Archestimator)
- **Removes the MutationObserver hack** entirely — no hidden DOM to hide
- **Visual parity** — the wireframe gradient effect is reproducible in ~60 lines of GLSL
- **Full control** — colors, motion speed, mesh density are all ours
- **Clean CSP** — no `'unsafe-inline'` needed for injected elements

**Runner-up:** Vanta.js `NET` effect (~20KB gzipped, MIT license, drop-in) if you want a library.

**Fallback:** Pure CSS animated mesh gradient (0KB, no Three.js dependency) if you want to remove Three.js entirely later.

### Implementation (post-MVP, not in current phase)

When ready to replace, the component lives at `src/components/landing/HeroBackground.tsx` (replacing `NeatWireframeBackground.tsx`). Full shader code available in the research agent's output.

### Immediate mitigation (current phase)

Current repo state already uses exact dependency pinning:

```json
"@firecms/neat": "0.8.0"
```

This prevents a direct dependency upgrade from changing the injection pattern unexpectedly. It does not remove the injection, so strict CSP still requires replacement, a deeper patch, or an explicit acceptance decision.

---

## Risk #4: i18n Proxy Blast Radius → Open with Concrete Tests + Canary

**Current state:** The route layer is the highest-risk code change. Next.js 16 calls this file convention **Proxy**, and this repo already has `src/proxy.ts` for auth routing. Future i18n work must compose with the existing proxy instead of adding a separate `src/middleware.ts`.

### Layer 1: Explicit route exclusion pattern

```typescript
// src/proxy.ts
import createMiddleware from "next-intl/middleware";

const PUBLIC_PATH_PATTERN = /^\/($|about|features|pricing|contact|privacy|terms)/;

const intlMiddleware = createMiddleware({
  locales: ["en", "es", "fr", "de"],
  defaultLocale: "en",
});

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip non-public routes entirely — zero processing
  if (!PUBLIC_PATH_PATTERN.test(pathname)) {
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next|api|workshop|login|auth|favicon.ico).*)"],
};
```

**Why `matcher` + runtime check (belt & suspenders):** The `matcher` config skips known non-landing paths at the request boundary. The runtime `PUBLIC_PATH_PATTERN` check is a second layer for any route that slips through. If both fail, the proxy still falls through to `NextResponse.next()` — it defaults to pass-through, not block.

### Layer 2: Canary deployment

| Step | Action |
|------|--------|
| 1 | Deploy proxy changes on `feat/i18n` branch |
| 2 | Deploy to Vercel preview URL |
| 3 | Smoke test: `/en` renders landing, `/workshop/projects` still loads, `/api/ai/ask` returns 200, `/login` unchanged |
| 4 | Let preview run for 24 hours — monitor Vercel logs for 500s or redirect loops |
| 5 | If clean: merge to `main`. If errors: revert the proxy/i18n composition without disturbing the auth-only proxy baseline. |

### Layer 3: Middleware-specific tests

```typescript
// tests/vitest/i18n-proxy-routing.test.ts (Vitest)
describe("i18n proxy routing", () => {
  it("redirects / → /en", async () => {
    const res = await proxy(getRequest("/"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/en");
  });

  it("does NOT redirect /workshop/projects", async () => {
    const res = await proxy(getRequest("/workshop/projects"));
    expect(res.status).toBe(200); // pass-through
  });

  it("does NOT redirect /api/ai/ask", async () => {
    const res = await proxy(getRequest("/api/ai/ask"));
    expect(res.status).toBe(200);
  });

  it("does NOT redirect /login", async () => {
    const res = await proxy(getRequest("/login"));
    expect(res.status).toBe(200);
  });

  it("does NOT redirect /_next/static/...", async () => {
    const res = await proxy(getRequest("/_next/static/chunks/main.js"));
    expect(res.status).toBe(200);
  });

  it("redirects /about → /en/about", async () => {
    const res = await proxy(getRequest("/about"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/en/about");
  });
});
```

---

## Risk #5: Zero Existing Tests → Improved with Concrete Test Plan

**Resolution:** The landing page has zero tests. We build from scratch with a prioritized test suite.

### Test file inventory

```
tests/
├── landing/
│   ├── cookie-consent.test.tsx          — banner visibility, consent storage, preferences persistence
│   ├── ab-testing/
│   │   ├── variant-assigner.test.ts     — deterministic assignment, cookie persistence, bot exclusion
│   │   ├── experiment-tracker.test.ts   — gtag/clarity stubs fire correct events
│   │   └── results-calculator.test.ts   — known inputs → correct rates, uplift, significance
│   ├── components/
│   │   ├── HeroSection.test.tsx         — variant A/B rendering, CTA click events
│   │   ├── CookieConsentBanner.test.tsx — render, accept, reject, reopen preferences
│   │   └── ABExperimentProvider.test.tsx— consent gate, event fire timing
│   └── pages/
│       ├── landing-page.test.tsx        — full page renders, variant prop flows through
│       ├── privacy-page.test.tsx        — 200 response, content present
│       └── terms-page.test.tsx          — 200 response, content present
├── proxy/
│   └── i18n-proxy-routing.test.ts       — redirect behavior, workshop/api/auth exclusion
└── e2e/
    └── landing-ab-flow.spec.ts          — Playwright: variant cookie → page render → CTA click → GA4 event
```

### Test priority by phase

| Phase | Tests to write | Estimated time |
|-------|---------------|----------------|
| **8a-i (DRY refactor)** | `variant-assigner.test.ts`, `results-calculator.test.ts` (unit) | 30 min |
| **8b-i (GDPR consent)** | `CookieConsentBanner.test.tsx`, `cookie-consent.test.tsx` | 45 min |
| **8b-ii (Legal pages)** | `privacy-page.test.tsx`, `terms-page.test.tsx` | 15 min |
| **8c-i/ii (A/B framework)** | `experiment-tracker.test.ts`, `ABExperimentProvider.test.tsx`, `HeroSection.test.tsx` | 45 min |
| **8c-iii (First experiment)** | `landing-page.test.tsx`, `landing-ab-flow.spec.ts` (E2E) | 1 hour |
| **8a-ii (i18n proxy)** | `i18n-proxy-routing.test.ts` | 30 min |

**Total test time:** ~3.5 hours across all phases. Tests are written alongside implementation, not after.

### Test infrastructure

- **Unit tests**: Vitest (already configured in `package.json`)
- **Component tests**: Vitest + `@testing-library/react` (already installed)
- **E2E**: Playwright (already installed at `@playwright/test@^1.60.0`)
- **No new test dependencies needed**

---

## Risk #6: CSP `'unsafe-inline'` → Mitigated with Roadmap

**Resolution:** `'unsafe-inline'` in `style-src` is currently unavoidable (32 `style={{}}` usages, `@firecms/neat` injection, `styled-jsx`, `lenis` properties).

**Roadmap to strict CSP:**
1. **Phase 8b-i** (current): Deploy `Report-Only` CSP header with `'unsafe-inline'` — implemented for public marketing routes in `next.config.ts`
2. **Post-MVP**: Replace `@firecms/neat` with custom Three.js (removes biggest `'unsafe-inline'` source)
3. **Post-MVP**: Refactor 32 `style={{}}` usages to Tailwind classes (workshop scope)
4. **When clean**: Switch from `Report-Only` to enforced `Content-Security-Policy`

---

## Risk #7: Performance Budget → Measured

**Resolution:** Estimated total landing page JS: ~115KB (GA4 45KB + Clarity 20KB + Lenis 12KB + @firecms/neat 30KB + next-intl 8KB). This estimate intentionally excludes PostHog because PostHog is deferred from the MVP landing stack. Within acceptable range for B2B SaaS.

**Acceptance criteria:** Lighthouse Performance score ≥ 70 on the landing page. If below 70, investigate lazy-loading Clarity or deferring non-critical scripts.

---

## Risk #8: PostHog as Third Analytics Tool → Deferred, Not Rejected Forever

**Resolution:** Official-doc research confirms GA4, Clarity, and PostHog can technically coexist, but using all three on day one is unnecessary for the MVP public landing page. PostHog overlaps with GA4 on web/product analytics and with Clarity on replay-style behavioral diagnostics, while adding another processor, consent path, DPA/legal review, CSP domains, storage/cookie disclosures, event taxonomy, and performance cost.

**Current decision:** no PostHog package, script, CSP entry, environment variable, privacy-policy current-processor wording, or cookie entry in Phase 8c.

**Adoption triggers:** product analytics across `/workshop/*`, feature flags/remote config, native product experiments, cohorts/retention, or a deliberate consolidation away from GA4/Clarity. See `05-analytics-stack-decision.md`.

---

## Summary

| Residual risk | Status | Resolution |
|--------------|--------|------------|
| DPA/legal review | Open | Checklist and privacy skeleton provided; human/legal verification still required. |
| GA4 results calculator pipeline | Planning fact verified | Custom dimension registration requirement and 24-48 hr delay documented; local event log fallback spec'd. |
| @firecms/neat DOM injection | Mitigated, not removed | Direct package pin exists; replacement or deeper patch still needed for strict CSP. |
| i18n proxy blast radius | Open | Must compose with existing Next 16 `src/proxy.ts`; canary plan and tests specified. |
| Zero existing tests | Improved | Concrete test plan exists; `landing-auth-state.test.ts` now covers the first DRY auth slice. |
| CSP `'unsafe-inline'` | Mitigated, not strict | Report-Only header implemented for public marketing routes. Post-MVP roadmap to strict CSP documented. |
| Performance budget | Estimated | ~115KB estimated. Lighthouse ≥ 70 gate set; must be measured after implementation. |
| PostHog adoption | Deferred | Do not add PostHog for MVP landing analytics; future ADR required for product analytics/flags/experiments. |
