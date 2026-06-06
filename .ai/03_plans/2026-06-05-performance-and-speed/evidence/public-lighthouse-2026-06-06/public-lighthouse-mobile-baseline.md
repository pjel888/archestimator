# Public Mobile Lighthouse Baseline

Date: 2026-06-06 (session local date; Lighthouse timestamps are UTC)
Worktree: `/Users/philiplewis/archestimator.omx-worktrees/impl-performance-and-speed-pr-0b-cache-safety`
Branch: `feat/performance-and-speed-pr-0b-cache-safety`
Server: `next start` on `http://127.0.0.1:3044` after `bun run build`

## Scope

This evidence advances Workstream 2.1 and `EVID-PUBLIC-TRACE-001` for public route profiling. It is **local production-like Lighthouse mobile evidence**, not Vercel Speed Insights p75 RUM proof and not hosted production traffic evidence.

Routes profiled: `/`, `/features`, `/pricing`, `/contact`.

Consent modes:

- `off`: default fresh Lighthouse browser state, no landing consent cookie.
- `on`: Lighthouse `--extra-headers` with `archestimator_cookie_consent` set to analytics accepted.

Important local limitation: this local build did not prove production GA/Clarity third-party cost. The accepted-consent traces prove the app path with the consent cookie, but any production-only analytics IDs and Vercel provider behavior still require hosted/provider evidence.

## Commands

```bash
bun run build
PORT=3044 bun run start -- -p 3044
bunx lighthouse http://127.0.0.1:3044/<route> \
  --chrome-flags="--headless=new --no-sandbox" \
  --only-categories=performance \
  --output=json --output=html \
  --output-path=.ai/03_plans/2026-06-05-performance-and-speed/evidence/public-lighthouse-2026-06-06/<route>-mobile-consent-<off|on> \
  --save-assets [--extra-headers='{"Cookie":"archestimator_cookie_consent=..."}']
```

Full command output: `mobile-lighthouse-command-log.txt`.

## Metrics

Summary artifact: `public-lighthouse-mobile-summary.json`.

| Route | Consent | Perf score | FCP ms | LCP ms | TBT ms | CLS | Speed Index ms | Server response ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| home | off | 80 | 1216.44 | 3802.40 | 378.48 | 0 | 2007.07 | 34.00 |
| home | on | 88 | 1216.67 | 3954.56 | 42.00 | 0 | 1628.00 | 16.00 |
| features | off | 89 | 1208.62 | 3782.31 | 25.00 | 0 | 1208.62 | 21.00 |
| features | on | 91 | 1210.11 | 3477.79 | 11.00 | 0 | 1210.11 | 10.00 |
| pricing | off | 88 | 1211.10 | 3938.83 | 25.00 | 0 | 1211.10 | 15.00 |
| pricing | on | 89 | 1209.66 | 3783.81 | 11.00 | 0 | 1209.66 | 12.00 |
| contact | off | 88 | 1208.97 | 3856.40 | 26.00 | 0 | 1208.97 | 8.00 |
| contact | on | 89 | 1209.22 | 3689.44 | 10.50 | 0 | 1209.22 | 26.00 |

## Attached artifacts

Each route/consent pair has:

- `<route>-mobile-consent-<mode>.report.json`
- `<route>-mobile-consent-<mode>.report.html`
- `<route>-mobile-consent-<mode>-0.trace.json.gz`
- `<route>-mobile-consent-<mode>-0.devtoolslog.json.gz`

## Initial observations

- Home is the weakest local route in this run: score 80 consent-off, TBT 378.48ms, Speed Index 2007.07ms.
- `/features`, `/pricing`, and `/contact` are clustered at scores 88-91 with low TBT and zero CLS.
- Consent-on is not worse in this local build, but this should not be treated as production analytics proof because production-only analytics IDs/provider behavior remain unverified.

## Decision

Status language: **LOCAL PUBLIC MOBILE LIGHTHOUSE BASELINE CAPTURED / SPEED INSIGHTS AND HOSTED ANALYTICS PROOF OPEN**.

Do not use this evidence alone to ship Lenis, Neat canvas, image/font, analytics-delay, or root-provider runtime changes. The next Workstream 2 step should use these traces to choose a single public-route hypothesis and then capture before/after proof; Vercel Speed Insights p75 route/device proof remains required before claiming real-user improvement.
