# QA-G10 visual/browser evidence - 2026-06-21

Status: **LOCAL STORYBOOK VISUAL PASS / HOSTED DEPLOY SMOKE STILL OPEN**

Surface used: local Storybook iframe only, with mocked receiver fetch/cookie seams. No app token route,
provider project, or secret-bearing URL was printed or captured.

This supersedes the earlier same-day capture that found mobile donut-callout clipping and missing Storybook
print CSS. The receiver chart now uses a compact ring plus readable cost-breakdown list, and Storybook loads
`src/app/share/print.css` through `.storybook/preview.tsx`.

## Artifacts

| Artifact | Purpose | Result |
| --- | --- | --- |
| `viewport-320.png` | Full receiver story at 320px | PASS: no page-level horizontal overflow; zero donut callouts; cost list does not overflow |
| `viewport-390.png` | Full receiver story at 390px | PASS: no page-level horizontal overflow; zero donut callouts; cost list does not overflow |
| `viewport-768.png` | Full receiver story at 768px | PASS: no page-level horizontal overflow; cost list does not overflow |
| `viewport-1440.png` | Full receiver story at 1440px | PASS: no page-level horizontal overflow; cost list does not overflow |
| `decision-modal-390.png` | Mobile decision modal | PASS: focus lands inside dialog; Escape closes; no overflow |
| `print-preview-768.png` | Storybook print media preview | PASS: print package mounts, print CSS loads, receiver screen chrome is hidden |
| `print-package-768.pdf` | PDF generated from Storybook print preview | PASS: PDF generated from the same print-media state |
| `browser-visual-metrics.json` | Raw Playwright metrics | Source of viewport/modal/print assertions |

## Viewport Matrix

| Width | Story | No X overflow | Decision visible | Comments visible | Mobile sticky nav | Chart/list | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 320 | `domain-share-receiverstates--password-valid` | PASS | PASS | PASS | PASS | PASS: zero callouts; list no-overflow | PASS |
| 390 | `domain-share-receiverstates--password-valid` | PASS | PASS | PASS | PASS | PASS: zero callouts; list no-overflow | PASS |
| 768 | `domain-share-receiverstates--password-valid` | PASS | PASS | PASS | N/A hidden | PASS: zero callouts; list no-overflow | PASS |
| 1440 | `domain-share-receiverstates--password-valid` | PASS | PASS | PASS | N/A hidden | PASS: zero callouts; list no-overflow | PASS |

Pass/fail criteria used:
- `document.scrollingElement.scrollWidth <= clientWidth + 1`.
- Decision and comments regions exist in the rendered story.
- Mobile sticky nav has a non-zero fixed/sticky rectangle at 320/390 only.
- Decision modal opens, initial focus is inside the dialog, and Escape removes the dialog.
- Chart proof requires zero compact donut callouts and `data-share-cost-breakdown-list` with no X overflow.
- Print proof requires print package visible and `.share-print-screen-only` / `.share-print-hidden` chrome hidden under print media.

## RUX-14 Contrast

Status: **N/A as written / source target removed**

Current source observation: `src/components/share/SharePageHero.tsx` renders only the image wrapper and
`<Image>`. It has no over-image "Project cover" label and no `[data-share-hero-cover-label]` selector, so the
old contrast target cannot be sampled.

If the product later reintroduces over-image text, add the previously documented fixtures/stories/script and
require worst-case sampled contrast `>= 4.5:1`.

## Remaining Archive Blockers

1. **Hosted deploy smoke remains open.** This report is local Storybook proof only; it does not prove the current commit is deployed or that a hosted `/share/<token>` URL passes the same checks.
2. **QA-G06 remains open.** The real DB duplicate-decision race harness still needs local Supabase or direct provider DB connectivity.
3. **Hosted/provider perf evidence remains open.** Local budget rows pass, but hosted recipient TTI and provider route timings are separate gates.

## Reproduction Shape

```bash
STORYBOOK_DISABLE_TELEMETRY=1 bun run storybook -- --host 127.0.0.1 --port 6006
```

Run a bounded Playwright capture against:
- `http://127.0.0.1:6006/iframe.html?id=domain-share-receiverstates--password-valid&viewMode=story`
- widths: `320,390,768,1440`
- modal: click `Approve proposal` at 390px and assert focus/Escape behavior
- print: dispatch `beforeprint`, wait for `[data-share-print-package]`, emulate print media, assert
  `printCssLoaded=true`, `printPackageMounted=true`, and `screenChromeVisibleCount=0`
