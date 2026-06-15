# 12 - Selected UI Strategy and Wireframe Contract

## Selected Strategy

Use an adaptive receiver workspace. This is the target implementation strategy after the second pass.

Do not implement a centered document preview, hero-first page, or chart-first page.

## Visual Direction

Quiet product workspace:

- compact SF Pro typography,
- neutral surfaces,
- thin dividers,
- no nested cards,
- no marketing hero treatment,
- no decorative gradients/orbs,
- no oversized labels,
- line-item content as the visual anchor.

## Non-Negotiable Breakpoint Behavior

| Viewport | Layout behavior | Context behavior | Chart behavior |
| --- | --- | --- | --- |
| `>= 1440px` | Three-zone workspace: navigation rail, estimate canvas, context rail | Rail can be open for session links; no-session rail starts collapsed/compact | Compact rail panel, never above sheet tabs |
| `1200px-1439px` | Two-zone workspace: estimate canvas plus collapsible context | Rail overlays or collapses behind an icon/button if row width drops below target | Collapsed panel or rail panel below decision state |
| `900px-1199px` | Toolbar-first tablet layout, no permanent side rails | Context moves below toolbar as collapsible panels | Collapsed by default unless explicitly opened |
| `768px-899px` | Single-column tablet stack with sticky estimate toolbar | Response/comments appear after estimate toolbar or below rows | Collapsed disclosure after row controls |
| `< 768px` | Mobile order: summary, sheet controls, row access, then insight panels | Session response affordance only when recipient session exists | Collapsed by default below row access |

These breakpoints are behavioral contracts, not exact Tailwind implementation requirements. Future code may use nearby tokens if screenshots prove the same behavior.

## Numeric Visual Gates

| Gate | Target |
| --- | --- |
| 1440px estimate canvas | At least `940px` of usable central estimate/row width after rails are accounted for, or documented equivalent if rail is collapsed |
| 1280px estimate canvas | At least `820px` of usable row width |
| Sheet controls y-position | Sheet tabs/select and Tree/Grid controls appear by `y <= 360px` at 1440 x 1000 |
| First row/tree y-position | First actual row/tree content appears by `y <= 520px` at 1440 x 1000 and by `y <= 620px` at 390 x 844 |
| Desktop context rail | Max `340px` when open; max compact no-session cue height `96px` if no response/comment actions are available |
| Mobile chart | Collapsed by default; expanded chart max height `280px` before scrolling |
| Debug/client polish | Zero visible debug labels, temporary badges, or development-only UI in receiver screenshots |

## Desktop Contract: 1440px and Up

```text
Header: logo | view-only/session
Project strip: name | code | client | location | published/snapshot date
Workspace:
  Nav rail 240-280px
  Estimate canvas min 720px flexible
  Context rail 280-340px
```

### Desktop Rules

- Estimate canvas is the priority column.
- Sheet tabs and Tree/Grid controls appear above chart detail.
- Cost breakdown is in context rail or collapsed panel.
- Non-session right rail collapses to a small cue, not a permanent 320px rail.
- Tree navigation uses either the left rail or a floating nav, not both.

## Desktop Contract: 1024px to 1439px

```text
Header
Project strip
Estimate toolbar
Estimate canvas
Collapsible context panel
```

### Tablet/Laptop Rules

- Avoid three permanent columns if they cause cramped rows.
- Context rail may collapse under toolbar.
- Tree navigation may become a drawer or inline section list.
- Chart remains secondary to row access.

## Mobile Contract: 320px to 767px

```text
Header
Project compact summary
Active sheet summary
Sheet tabs or sheet select
Tree/Grid toggle + search
Estimate rows/tree
Collapsed cost breakdown
Session response action
Comments section
```

### Mobile Rules

- Do not show expanded donut before sheet tabs and row access.
- Do not show a dead sticky response bar for non-session links.
- Keep row text readable without horizontal scroll in tree mode.
- Grid mode may scroll horizontally only when table semantics require it.
- Comments/decision must not overlap content.

## Chart Contract

The chart should answer "what drives the total?" It should not answer before the user can see "what is included?"

Allowed placements:

1. desktop context rail,
2. collapsed mobile panel after estimate content,
3. secondary insight tab after Tree/Grid controls.

Not allowed:

- 400px expanded chart above sheet tabs,
- visible debug badge,
- chart labels clipped offscreen on mobile.

Sizing and label rules:

| Context | Default size | Label behavior | Empty state |
| --- | --- | --- | --- |
| Desktop rail | max 260px tall | show compact legend and total; avoid long exterior labels | "No cost breakdown available" text in rail panel |
| Collapsed desktop panel | closed by default when rail is collapsed | trigger shows total/category count only | same inline empty state |
| Mobile disclosure | collapsed by default, max 280px expanded | legend/list below chart; no offscreen callouts | short inline empty state below trigger |

Remove the current visible debug badge before any client-facing screenshot can pass QA.

## Response Rail Contract

| State | Desktop | Mobile |
| --- | --- | --- |
| No recipient session | compact cue or collapsed rail | non-sticky message near comments |
| Recipient session active | open context rail with decision first | compact response strip plus comments section |
| Decision submitted | locked badge remains visible | compact locked state near response strip |
| Comment error/offline | visible status in comments panel | inline status, no blocking overlay |

## Navigation Contract

Choose one navigation model per viewport. Do not combine redundant systems.

| Viewport | Default navigation | Explicitly avoid |
| --- | --- | --- |
| `>= 1440px` | left rail with sheet/section navigation if enough row width remains | left rail plus floating scrollspy |
| `1200px-1439px` | compact sheet toolbar plus collapsible section nav | permanent nav rail if row width falls below gate |
| `900px-1199px` | section drawer or inline jump menu | desktop tree rail |
| `< 768px` | sheet select/tabs plus inline section accordion or drawer | floating desktop nav, persistent side rail |

## Data Contract

- Use existing snapshot data first.
- Prefer `getBestShareTree(rows, treeNodes)` during tree extraction.
- Do not require migrations for layout/search/chart reordering.
- Do not change public API route behavior in the first slice.

## Design QA Contract

An implementation fails visual QA if:

- the page still reads as a narrow centered document at 1440px,
- the first mobile estimate screen is chart-dominated,
- line-item content is below non-essential visual sections,
- right rail is empty but still consumes desktop width,
- controls do not align to `DESIGN.md`,
- generic card/grid patterns replace the workspace anatomy.
