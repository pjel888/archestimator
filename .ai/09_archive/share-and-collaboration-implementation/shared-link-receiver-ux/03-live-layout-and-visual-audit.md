# 03 - Live Layout and Visual Audit

## Render Evidence

The target URL was reachable locally and returned HTTP 200:

```text
http://localhost:3000/share/SHARE_TOKEN_PLACEHOLDER
```

Screenshots captured:

- `evidence/share-page-audit-desktop.png`
- `evidence/share-page-audit-mobile.png`

Browser automation through the in-app browser was unavailable in this surface (`iab` was not available), so the live render was captured through local Playwright tooling.

## Desktop Measurements

Viewport: 1440 x 1000.

| Element | x | y | width | height |
| --- | ---: | ---: | ---: | ---: |
| Page content container | 80 | 85 | 1280 | 3504 |
| Primary flex row | 112 | 617 | 1216 | 2948 |
| Estimate pane | 112 | 617 | 876 | 2948 |
| Right rail | 1008 | 617 | 320 | 2948 |
| Sheet tabs | 112 | 1069 | 876 | 32 |
| View mode tabs | 112 | 1113 | 876 | 28 |
| Tree sidebar tabs | 113 | 1230 | 259 | 32 |

Page scroll height: 3589px.

## Mobile Measurements

Viewport: 390 x 844.

| Element | x | y | width | height |
| --- | ---: | ---: | ---: | ---: |
| Page content container | 0 | 94 | 390 | 1028 |
| Primary flex stack | 16 | 381 | 358 | 717 |
| Estimate pane | 16 | 381 | 358 | 637 |
| Right rail | 16 | 1037 | 358 | 61 |
| Sheet tabs | 16 | 833 | 358 | 32 |
| View mode tabs | 16 | 877 | 358 | 28 |

Page scroll height: 1122px.

## Ranked Visual Findings

### 1. The page is centered by design, but the useful content is too narrow

The outer shell uses `mx-auto max-w-7xl`. At 1440px, this creates 80px side gutters before inner padding. That cap is acceptable for many app screens, but the receiver page has a dense estimate table/tree and benefits from a wider canvas.

Source:

- `src/app/share/[token]/page.tsx:64`
- `src/app/share/[token]/page.tsx:69`

### 2. The primary estimate pane is squeezed by two rails

On desktop, the right decision/comment rail consumes 320px. Inside the estimate pane, Tree View adds a 260px left navigation panel. The actual row-reading area is much smaller than the viewport suggests.

Source:

- right rail: `src/app/share/[token]/page.tsx:96`
- tree panel: `src/components/share/SharePageTabs.tsx:357`

### 3. The donut chart consumes the lead before row content

`SharePageTabs` renders active estimate summary, then a 400px compact donut, then sheet tabs, then view tabs, then the estimate content. On the captured desktop viewport, row-level content starts after the chart and tab chrome. On mobile, the chart dominates the first estimate section and appears visually cramped.

Source:

- chart placement: `src/components/share/SharePageTabs.tsx:216`
- compact chart height: `src/components/charts/CostDonutChart.tsx:318`

### 4. The chart contains a visible debug badge

The desktop and mobile screenshots show a dark debug badge with bucket/total data. This is useful during development, but it reads as unpolished on a client-facing shared page.

Source:

- debug badge: `src/components/charts/CostDonutChart.tsx:324`

### 5. Tree navigation exists twice conceptually

`ShareEstimateTreePanel` is wired as the desktop left tree. `ShareFloatingTreeNav` also exists as a scrollspy navigation component but is not imported in the current share path. Future work must choose one navigation model or assign distinct purposes.

Source:

- wired tree panel: `src/components/share/SharePageTabs.tsx:358`
- unused floating nav: `src/components/share/ShareFloatingTreeNav.tsx:22`

### 6. Mobile line-item access is too delayed

On 390px mobile, the first screen includes session banner, header, project summary, hero, estimate summary, and a large donut. Sheet tabs begin around y=833. The user reaches tree content at the bottom of the first viewport, and only the root node is visible by default.

Source:

- mobile default collapse: `src/components/share/ShareEstimateTreeView.tsx:245`
- chart lead placement: `src/components/share/SharePageTabs.tsx:216`

### 7. Empty and error states are incomplete at the route level

`SharePageTabs` returns `null` when `estimates.length === 0`. The route folder has no `loading.tsx` or `error.tsx`. Component-level empty states exist for tree/chart, but the receiver page lacks a route-level empty/loading/error design.

Source:

- empty estimates: `src/components/share/SharePageTabs.tsx:194`
- route folder only contains `page.tsx`.

## UI Principles for the Redesign

1. Treat row reading as the primary job.
2. Treat chart, comments, decisions, and project metadata as contextual support.
3. Use wider desktop space before adding more vertical sections.
4. Keep mobile first screen focused on project identity, total, selected sheet, and a direct path to rows.
5. Avoid cards inside cards and avoid decorative wrappers.
6. Preserve compact product UI density.

