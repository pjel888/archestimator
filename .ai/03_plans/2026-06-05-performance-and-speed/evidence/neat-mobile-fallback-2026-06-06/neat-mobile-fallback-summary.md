# Neat Mobile Fallback After-Trace

Date: 2026-06-06

Status: **IMPLEMENTED LOCALLY / PROVIDER PROOF OPEN**

## Scope

- Changed `src/components/landing/NeatWireframeBackground.tsx` so mobile, coarse-pointer, and reduced-motion clients keep a static hero gradient fallback instead of initializing the `@firecms/neat` canvas on the critical path.
- Desktop-capable clients now load `@firecms/neat` dynamically after `requestIdleCallback` or a bounded timer fallback.
- This evidence only covers local `next start` Lighthouse on `/`; it does not prove before/after Vercel Speed Insights comparison, hosted third-party script behavior, or real-user improvement.

## Local Lighthouse comparison

| Scenario | Score before -> after | FCP before -> after | LCP before -> after | TBT before -> after | CLS before -> after | Speed Index before -> after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Home consent off | 80 -> 85 (+5.00) | 1216.44ms -> 1219.31ms (+2.87ms) | 3802.40ms -> 4218.41ms (+416.01ms) | 378.48ms -> 52.00ms (-326.48ms) | 0 -> 0 (+0.00) | 2007.07ms -> 3284.27ms (+1277.20ms) |
| Home consent on | 88 -> 89 (+1.00) | 1216.67ms -> 1214.12ms (-2.55ms) | 3954.56ms -> 3805.88ms (-148.68ms) | 42.00ms -> 32.00ms (-10.00ms) | 0 -> 0 (+0.00) | 1628.00ms -> 1214.12ms (-413.88ms) |

Interpretation: this narrow fallback sharply reduces local home mobile TBT, especially consent-off (378.48ms -> 52.00ms), while the single consent-off after run regressed LCP and Speed Index. Treat the result as a useful critical-path mitigation, not a full public-route performance win.

## Visual comparison

- Extracted Lighthouse final screenshots before/after into `visual-comparison/`.
- Manual review of `visual-comparison/baseline-consent-off.jpg` vs `visual-comparison/after-consent-off.jpg`: hero layout, copy, CTA, consent banner, and page framing remain intact; the animated grid visual is intentionally replaced by a static orange gradient on mobile fallback.
- Artifacts:
  - `visual-comparison/baseline-consent-off.jpg`
  - `visual-comparison/after-consent-off.jpg`
  - `visual-comparison/baseline-consent-on.jpg`
  - `visual-comparison/after-consent-on.jpg`

## Command evidence

- Before baseline: `evidence/public-lighthouse-2026-06-06/public-lighthouse-mobile-baseline.md`.
- After run: `home-lighthouse-after-command-log.txt`.
- After JSON/HTML reports: `home-mobile-consent-off-after.report.{json,html}` and `home-mobile-consent-on-after.report.{json,html}`.
- Compressed after traces/devtools logs: `home-mobile-consent-*-after-0.{trace,devtoolslog}.json.gz`.

## Remaining gates

- Vercel Speed Insights p75 route/device evidence remains open.
- Hosted public-route analytics/third-party proof remains open.
- Broader landing effects such as Lenis scope and image/font LCP audit remain separate workstream steps.
