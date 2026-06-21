# QA-G10 visual/browser evidence - 2026-06-21

Status: **PARTIAL / DO NOT CLOSE QA-G10 visual half yet**

Surface used: local Storybook iframe only, with mocked receiver fetch/cookie seams. No app token route, provider project, or secret-bearing URL was printed or captured.

## Artifacts

| Artifact | Purpose | Result |
| --- | --- | --- |
| `viewport-320.png` | Full receiver story at 320px | PASS for no page-level horizontal overflow; FAIL for chart label clipping |
| `viewport-390.png` | Full receiver story at 390px | PASS for no page-level horizontal overflow; FAIL for chart label clipping |
| `viewport-768.png` | Full receiver story at 768px | PASS for no page-level horizontal overflow |
| `viewport-1440.png` | Full receiver story at 1440px | PASS for no page-level horizontal overflow; still shows legacy client-facing labels |
| `decision-modal-390.png` | Mobile decision modal | PASS: focus lands inside dialog; Escape closes; no overflow |
| `print-preview-768.png` | Storybook print media preview | FAIL as print proof: print package mounts, but Storybook iframe does not load `src/app/share/print.css`, so screen chrome remains visible |
| `print-package-768.pdf` | PDF generated from Storybook print preview | Informational only; same print CSS limitation |
| `browser-visual-metrics.json` | Raw Playwright metrics | Source of viewport/modal/print assertions |

## Viewport Matrix

| Width | Story | No X overflow | Decision visible | Comments visible | Mobile sticky nav | Chart/client labels | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 320 | `domain-share-receiverstates--password-valid` | PASS | PASS | PASS | PASS | FAIL: donut labels clip/collide | FAIL |
| 390 | `domain-share-receiverstates--password-valid` | PASS | PASS | PASS | PASS | FAIL: donut labels clip/collide | FAIL |
| 768 | `domain-share-receiverstates--password-valid` | PASS | PASS | PASS | N/A hidden | PASS by metric | PASS |
| 1440 | `domain-share-receiverstates--password-valid` | PASS | PASS | PASS | N/A hidden | OPEN: legacy labels `Sheets` / `Line item table` remain visible | OPEN |

Pass/fail criteria used:
- `document.scrollingElement.scrollWidth <= clientWidth + 1`.
- Decision bar and comments region exist in the rendered story.
- Mobile sticky nav has a non-zero fixed/sticky rectangle at 320/390 only.
- Decision modal opens, initial focus is inside the dialog, and Escape removes the dialog.
- Print proof requires print package visible **and** `.share-print-screen-only` / `.share-print-hidden` chrome hidden under print media.

## RUX-14 Contrast

Status: **BLOCKED AS WRITTEN / stale harness**

Current source observation: `src/components/share/SharePageHero.tsx` renders only the image wrapper and `<Image>`. It has no over-image "Project cover" label and no `[data-share-hero-cover-label]` selector, so the old contrast target cannot be sampled.

Missing documented harness:
- `scripts/measure-share-hero-contrast.mjs`
- `public/storybook-audits/share-hero/cover-light-blueprint-1600x900.jpg`
- `public/storybook-audits/share-hero/cover-mid-facade-1600x900.jpg`
- `public/storybook-audits/share-hero/cover-dark-dusk-1600x900.jpg`
- `Receiver/Hero/{WorstCaseLight,MidBusy,DarkControl}` stories

Minimal closure path:
1. If product accepts the current source fix, close RUX-14 with a browser proof that a cover renders with **zero over-image text/label** and no `[data-share-hero-cover-label]` nodes.
2. If the old RUX-14 criterion remains binding, add the missing fixtures/stories/script and require worst-case sampled contrast `>= 4.5:1`.

## Remaining Visual Blockers

1. **Budget donut chart clips/collides on 320/390.** The QA plan said chart must be removed or proven not to clip/collide; current screenshots fail that check.
2. **Print proof is not closed from Storybook.** `SharePageTabs` mounts the print package, but Storybook does not load `src/app/share/print.css`; screen chrome remains visible in print media. Close with the real app `/share/<token>` route or a Storybook decorator that imports the print CSS.
3. **RUX-14 contrast proof cannot run as documented.** The target label/selector, fixtures, stories, and script are absent. Either document N/A for removed overlay text or add the documented contrast harness.

## Exact Commands For Final Closure

After fixing/removing the chart issue and choosing the RUX-14 closure path:

```bash
STORYBOOK_DISABLE_TELEMETRY=1 bun run storybook -- --host 127.0.0.1 --port 6006
```

Run the same bounded Playwright capture against:
- `http://127.0.0.1:6006/iframe.html?id=domain-share-receiverstates--password-valid&viewMode=story`
- widths: `320,390,768,1440`
- modal: click `Approve proposal` at 390px and assert focus/Escape behavior

For final print proof, use a local non-secret app route:

```bash
bun run dev -- --port 3020
SHARE_BASE_URL=http://127.0.0.1:3020 bun run scripts/seed-shared-link-smoke.ts > /tmp/shared-link-smoke.env
set -a; source /tmp/shared-link-smoke.env; set +a
# Then run the print Playwright check against "$SHARE_URL" without echoing the value.
```

For RUX-14 if the contrast criterion remains binding:

```bash
bun run storybook:validate
STORYBOOK_DISABLE_TELEMETRY=1 bun run storybook -- --host 127.0.0.1 --port 6006
bun scripts/measure-share-hero-contrast.mjs \
  --storybook-url http://127.0.0.1:6006 \
  --story receiver-hero--worst-case-light \
  --selector '[data-share-hero-cover-label]' \
  --out .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/shared-link-v2/contrast-hero-light.json
```
