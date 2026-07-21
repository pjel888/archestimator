# Clarity And Analytics — Plan Pack

**Package ID:** `PLAN-2026-07-21-clarity-and-analytics`  
**Status:** `IMPLEMENTATION_READY / NOT_STARTED / NOT_EVALUATED / N/A / ACTIVE`  
**Canonical entry:** [`00-PLAN.md`](./00-PLAN.md)  
**Exact next unit:** `UNIT-001`  
**Action ceiling:** `IMPLEMENT_LOCAL` (this authoring pass is `PLAN_ONLY`)

## What this pack delivers

Wire Google Analytics 4 and Microsoft Clarity end-to-end for Archestimator:

1. **Client capture** — production-ready GA4 + Clarity on consented public routes (most loader code already exists).
2. **Best-practice hardening** — privacy naming, consent/masking, CSP coverage, event taxonomy.
3. **Admin in-app data** — GA4 Data API + Clarity Data Export API behind `/admin/analytics`, with deep links to Philip’s live dashboards and graceful link-out when secrets are absent.

## Provider targets (operator)

| Provider | Target | Role |
|---|---|---|
| Google Analytics 4 | Account `192756720` · Property `306189271` · [Intelligent home](https://analytics.google.com/analytics/web/#/a192756720p306189271/reports/intelligenthome?params=_u..nav%3Dmaui) | Acquisition, traffic, conversions |
| Microsoft Clarity | Project `axxveykqn3` · [Dashboard](https://clarity.microsoft.com/projects/view/axxveykqn3/dashboard?date=Last%203%20days) | Heatmaps, recordings, UX friction |
| Cloudflare Web Analytics | existing optional token | Lightweight privacy-friendly page metrics |

## Start here

1. Read `00-PLAN.md` Task Contract and decisions.
2. Execute `UNIT-001` (config + deep links + enablement contract).
3. Do not invent workshop/share tracking, PostHog, or paid Cloudflare analytics products in this pack.

## Validation

```bash
node scripts/validate-plan-pack.mjs .ai/03_plans/2026-07-21/Clarity-And-Analytics
```

## Related prior truth

- Archived stack decision: `.ai/09_archive/store/2026-05-28-landing-page-ab-testing-and-consent-complete/05-analytics-stack-decision.md` (GA4+Clarity keep; PostHog defer).
- Admin scorecard intent: `.ai/09_archive/store/2026-07-12-Archestimator-Admin-Founder-Homebase-Supplement-Plan-Pack-complete/10-ANALYTICS-BUSINESS-SCORECARD-AND-CADENCE.md`.
- Live client mount: `src/components/landing/LandingAnalyticsLoader.tsx` via `PublicPageShell`.
- Live admin link-outs: `src/app/admin/analytics/page.tsx`.
