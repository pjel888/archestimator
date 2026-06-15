# Public image/font LCP audit — 2026-06-06

Status: **LOCAL FONT SURFACE REDUCED / PROVIDER PROOF OPEN**.

## Scope

- Audited public-route image and font contribution before making LCP-specific preload or media changes.
- Source audit found no `next/image` / `<Image>` usage in the public landing route tree beyond logo SVGs rendered by `ArchestimatorLogo`.
- Current public LCP evidence remains text-based; no image LCP candidate justified adding root `preload={true}`, global image priority, or private-media policy changes.
- Removed unused root `next/font` families (`Poppins`, `Source Serif 4`) and their unused global font aliases so first paint keeps only `Inter` plus `Roboto Mono`.

## Build font-face result after removal

`font-lcp-after-summary.json` records the post-build CSS font-family surface:

| Family | `@font-face` count |
| --- | ---: |
| Inter | 7 |
| Inter Fallback | 1 |
| Roboto Mono | 6 |
| Roboto Mono Fallback | 1 |


- Font URL count in built CSS: 13.
- Contains Poppins: false.
- Contains Source Serif: false.

## Local mobile Lighthouse after-samples

Baseline references are the consent-off local mobile samples from `evidence/public-lighthouse-2026-06-06/public-lighthouse-mobile-summary.json`. After-samples were captured under local `next start` on port 3048 with consent off.

| Route | Score | FCP ms | LCP ms | TBT ms | Speed Index ms | Font requests after | Image requests after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 80 -> 89 | 1216.44 -> 1216.58 (+0.13) | 3802.40 -> 3752.86 (-49.54) | 378.48 -> 51.00 (-327.48) | 2007.07 -> 2594.77 (+587.70) | 3 | 1 |
| `/features` | 89 -> 92 | 1208.62 -> 1211.53 (+2.91) | 3782.31 -> 3322.06 (-460.25) | 25.00 -> 12.00 (-13.00) | 1208.62 -> 1211.53 (+2.91) | 2 | 1 |

After-request details:

- `/`: 3 font requests (`2f13ad8e538108e0-s.p.0o52u8sd-fo14.woff2`, `83afe278b6a6bb3c-s.p.0q-301v4kxxnr.woff2`, `99ac5753282bcf05-s.14-35mipncksh.woff2`) and 1 image request (`archestimator_logo.svg`, 1118 bytes).
- `/features`: 2 font requests (`2f13ad8e538108e0-s.p.0o52u8sd-fo14.woff2`, `83afe278b6a6bb3c-s.p.0q-301v4kxxnr.woff2`) and 1 image request (`archestimator_logo.svg`, 1118 bytes).

## Interpretation

- The safe implementation win is concrete and local: unused root font families are no longer imported in `src/app/layout.tsx`, no longer aliased in `src/app/globals.css`, and no longer emitted in built CSS.
- The local Lighthouse samples are directionally positive for `/features` and mostly stable for `/`, but they are not production Core Web Vitals proof.
- No image optimization change was made because the measured public image request is a tiny logo SVG and current LCP evidence does not identify an image candidate.
- Before/after Vercel Speed Insights comparison, hosted waterfall, and real-user production proof remain open gates.

## Evidence files

- `font-lcp-after-summary.json`
- `font-lcp-after-command-log.txt`
- `home-mobile-consent-off-after-font-audit.report.json`
- `home-mobile-consent-off-after-font-audit.report.html`
- `home-mobile-consent-off-after-font-audit-0.trace.json.gz`
- `home-mobile-consent-off-after-font-audit-0.devtoolslog.json.gz`
- `features-mobile-consent-off-after-font-audit.report.json`
- `features-mobile-consent-off-after-font-audit.report.html`
- `features-mobile-consent-off-after-font-audit-0.trace.json.gz`
- `features-mobile-consent-off-after-font-audit-0.devtoolslog.json.gz`
