# Lenis Non-Home Scope After-Trace

Date: 2026-06-06

Status: **IMPLEMENTED LOCALLY / PROVIDER PROOF OPEN**

## Scope

- Removed `LandingSmoothScrollProvider` from `PublicPageShell`, so `/features`, `/pricing`, `/contact`, `/about`, `/privacy`, and `/terms` use native browser scrolling instead of mounting Lenis.
- Kept `LandingSmoothScrollProvider` on the home page, where the full landing section stack still uses the existing reduced-motion-aware smooth scroll behavior.
- This intentionally avoids global provider/font/CSS changes and does not touch `src/app/layout.tsx`, `src/proxy.ts`, auth, analytics, or cache headers.

## Local Lighthouse comparison

| Scenario | Score before -> after | FCP before -> after | LCP before -> after | TBT before -> after | CLS before -> after | Speed Index before -> after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Features consent off | 89 -> 92 (+3.00) | 1208.62ms -> 1209.75ms (+1.14ms) | 3782.31ms -> 3395.95ms (-386.36ms) | 25.00ms -> 12.00ms (-13.00ms) | 0 -> 0 (+0.00) | 1208.62ms -> 1209.75ms (+1.14ms) |
| Features consent on | 91 -> 92 (+1.00) | 1210.11ms -> 1208.56ms (-1.55ms) | 3477.79ms -> 3396.25ms (-81.54ms) | 11.00ms -> 13.50ms (+2.50ms) | 0 -> 0 (+0.00) | 1210.11ms -> 1208.56ms (-1.55ms) |
| Pricing consent off | 88 -> 89 (+1.00) | 1211.10ms -> 1211.74ms (+0.65ms) | 3938.83ms -> 3711.23ms (-227.60ms) | 25.00ms -> 13.00ms (-12.00ms) | 0 -> 0 (+0.00) | 1211.10ms -> 1211.74ms (+0.65ms) |
| Pricing consent on | 89 -> 92 (+3.00) | 1209.66ms -> 1209.87ms (+0.21ms) | 3783.81ms -> 3401.20ms (-382.61ms) | 11.00ms -> 14.50ms (+3.50ms) | 0 -> 0 (+0.00) | 1209.66ms -> 1209.87ms (+0.21ms) |
| Contact consent off | 88 -> 89 (+1.00) | 1208.97ms -> 1210.73ms (+1.76ms) | 3856.40ms -> 3695.46ms (-160.94ms) | 26.00ms -> 12.00ms (-14.00ms) | 0 -> 0 (+0.00) | 1208.97ms -> 1210.73ms (+1.76ms) |
| Contact consent on | 89 -> 89 (+0.00) | 1209.22ms -> 1210.04ms (+0.82ms) | 3689.44ms -> 3785.14ms (+95.71ms) | 10.50ms -> 12.50ms (+2.00ms) | 0 -> 0 (+0.00) | 1209.22ms -> 1210.04ms (+0.82ms) |

Interpretation: local mobile Lighthouse improved for `/features` and `/pricing` in this run and reduced TBT for most non-home scenarios. `/contact` stayed effectively score-stable/mixed. Treat this as a safe local scope reduction, not real-user proof.

## Guardrails

- Reduced-motion behavior remains inside `LandingSmoothScrollProvider` for the home page.
- Non-home routes keep native browser scrolling and existing CSS `scroll-margin-top`, so anchor behavior falls back to the platform rather than Lenis interception.
- Focused landing tests lock that home still uses the provider, `PublicPageShell` no longer imports it, and non-home content renders inside the native `<main data-landing-page-root="true">` shell.
- Playwright smoke `non-home-navigation-smoke.json` verifies `/features` direct load plus header navigation to `/pricing` and `/contact` keep one landing root, no Lenis prevent wrappers, and no unexpected console/page errors. The only ignored failed response is local `next start` not serving `/_vercel/insights/script.js`.

## Command evidence

- After command log: `lenis-after-command-log.txt`.
- After summary: `lenis-after-summary.json`.
- Navigation smoke: `non-home-navigation-smoke.json`.
- After JSON/HTML reports: `features|pricing|contact-mobile-consent-*-after.report.{json,html}`.
- Compressed traces/devtools logs: `features|pricing|contact-mobile-consent-*-after-0.{trace,devtoolslog}.json.gz`.

## Remaining gates

- Vercel Speed Insights p75 route/device evidence remains open.
- Hosted analytics behavior and third-party script timing remain open.
- Home-page Lenis lazy/idle behavior remains a separate possible follow-up only if provider/route p75 or traces justify it.
