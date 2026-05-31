# 05 - UI Layout Maximization Plan

## Planning Premise

The current page is not failing because it lacks enough features. It is failing visually because the highest-value content is constrained and stacked. The first redesign slice should optimize layout before adding more feature surface.

## Target Desktop Information Architecture

```text
Header: logo, view-only, recipient/session state
Project strip: project name, code, client, location, snapshot status
Receiver workspace:
  Left/context rail or compact nav:
    sheet list or section tree, depending viewport
  Center primary canvas:
    sheet toolbar
    tree/grid rows
  Right contextual rail:
    sheet total/breakdown
    decision state
    comments/activity
```

## Layout Principle

The estimate canvas should get the widest region. Summary and response controls should support the estimate, not push it down.

## Selected Direction

Use an adaptive receiver workspace, not a centered document. The target design direction is quiet, work-focused, and inspection-first:

- top project strip stays compact and non-marketing,
- sheet/view/search toolbar becomes the main command surface,
- estimate rows/tree become the central canvas,
- chart becomes contextual insight,
- response/comments become an adaptive context rail,
- mobile defers chart detail until after row access.

This is the selected target. Future implementation should not re-open hero-first, chart-first, or document-preview layouts without a new decision.

## Enforceable Layout Contract

Use `12-selected-ui-strategy-and-wireframe-contract.md` as the controlling layout spec. This plan's option lists are historical analysis; they are not permission to choose a different default.

| Width | Required layout |
| --- | --- |
| `>= 1440px` | three-zone workspace with nav rail, central estimate canvas, and context rail |
| `1200px-1439px` | estimate-first layout with collapsible context rail |
| `900px-1199px` | tablet toolbar-first layout, no permanent side rails |
| `768px-899px` | single-column tablet stack with collapsible context panels |
| `< 768px` | mobile row-first stack: project summary, sheet controls, Tree/Grid/search, rows, collapsed breakdown, response/comments |

First implementation must meet the numeric gates in `12`, including first row/tree content at `y <= 520px` on 1440 x 1000 and `y <= 620px` on 390 x 844.

## Phase P0 - Receiver Shell Width Policy

### Plan

Replace the generic app `max-w-7xl` receiver cap with a receiver-specific shell.

Options:

| Option | Description | Tradeoff |
| --- | --- | --- |
| A | `max-w-[1600px]` with current padding | Lowest risk, preserves centered composition |
| B | Full-width shell with constrained header/project strip | Best workspace feel, slightly more layout work |
| C | Adaptive shell: `max-w-7xl` below xl, `max-w-[1680px]` above xl | Good compromise |

Recommended and selected: Option C, with a specific receiver workspace variant:

```text
< 1024px: full-width mobile/tablet stack
1024-1439px: max-w-7xl, context rail collapsible
1440px+: max-w-[1680px], three-zone workspace
```

### Acceptance

- At 1440px, estimate content should reach the 940px usable row-width gate in `12`, or chart/rail collapse must produce equivalent row priority.
- Header and session banner remain visually aligned.
- No horizontal overflow on 390px mobile.

## Phase P1 - Rebalance Desktop Columns

### Plan

Move from the current two-column model:

```text
Estimate pane 876px | Right rail 320px
```

to a three-zone receiver workspace:

```text
Navigation 240-280px | Estimate canvas minmax(720px, 1fr) | Context rail 280-340px
```

The key difference is that chart and response state should no longer sit above or beside the estimate in a way that reduces row readability without purpose.

### Recommended Model

- Put sheet tabs and view toggle in a sticky top toolbar inside the estimate canvas.
- Use the left rail for either sheet list or section tree, not both at once.
- Put chart in the right context rail as a collapsible "Cost breakdown" section.
- Put comments/decision below chart in the same rail, with collapse available if no recipient session exists.
- Default non-session desktop links to a collapsed context rail with a compact "recipient link required for responses" cue.
- Default session desktop links to an open context rail with decision first, comments second, chart either above or below based on scroll position testing.

### Acceptance

- Row/tree content begins higher in the viewport than today.
- Sheet tabs are visible before or alongside the chart.
- Right rail does not consume width when it has only "recipient session required" copy.

## Desktop Wireframe Contract

```text
--------------------------------------------------------------------------------
Header: mark | project/share status | view-only/session cue
--------------------------------------------------------------------------------
Project strip: Lewis Residence | AE-LR-001 | client | location | published timestamp
--------------------------------------------------------------------------------
Workspace
  Left rail (240-280)       Main estimate canvas                  Context rail
  - Sheet list or sections  - Sticky sheet toolbar                - Decision/session
  - Search tree             - Tree/Grid toggle                    - Comments summary
  - Expand/collapse         - Search/filter row input             - Cost breakdown
                            - Tree or grid rows                   - Snapshot trust
--------------------------------------------------------------------------------
```

Hard rule: the first visible estimate rows/tree nodes must not be pushed below the donut chart.

## First-Viewport Inventory

At 1440 x 1000, the first viewport must contain:

1. compact header and view-only/session cue,
2. project strip with snapshot/generated date,
3. sheet toolbar with tabs/select, Tree/Grid toggle, and row search,
4. at least the start of actual estimate rows/tree nodes,
5. context rail summary only if it contains useful session, decision, comment, or breakdown content.

Maximum intended heights:

| Region | Target max height |
| --- | ---: |
| Header | 56px |
| Project strip | 96px |
| Estimate toolbar | 72px |
| Compact rail cue for no-session | 96px |
| Desktop chart panel | 260px |
| Mobile expanded chart | 280px |

## Phase P2 - Make Chart Contextual

### Plan

The donut should explain cost distribution, but it should not block line-item access. Move it into:

1. a compact right rail panel on desktop,
2. a collapsible "Breakdown" panel on mobile after sheet controls and row access,
3. a secondary insight panel only when the context rail is collapsed.

Default order inside an open desktop session rail:

1. decision/session state,
2. comments summary/composer,
3. compact cost breakdown,
4. snapshot trust/staleness cues.

Default order inside a non-session rail:

1. compact recipient-link cue,
2. optional collapsed cost breakdown trigger.

Do not show the full 320px rail if the only visible content is "recipient session required" copy.

Also remove or hide the visible debug badge before client-facing use.

### Acceptance

- No debug badge on receiver screenshots.
- Mobile first screen is not dominated by the donut.
- Chart remains keyboard/focus accessible.
- Workshop chart usage is not regressed.

## Phase P3 - Strengthen Estimate Toolbar

### Plan

Create a compact toolbar above tree/grid content:

- sheet tabs or dropdown,
- Tree/Grid segmented control,
- search/filter input,
- total and row count,
- optional "Back to top" or section navigation on long pages.

Use existing shared primitives:

- `SearchInput`
- `Button`
- `HeaderIconToolbar` if icon tools are needed
- `WorkshopTreeTabs` or a new shared tab primitive only if extraction is approved

### Acceptance

- Controls align to the app design system.
- No duplicated generic input/button markup.
- Keyboard navigation remains intact.

## Phase P4 - Mobile Layout

### Plan

Mobile should reorder the content:

1. session banner if needed,
2. header,
3. compact project summary,
4. selected sheet summary and tabs,
5. tree/grid control,
6. estimate content,
7. collapsible chart,
8. comments/decision.

If recipient session exists, add a compact sticky response affordance. Do not show a dead sticky bar for non-session open links.

Mobile should not render a fixed desktop-style tree rail. It should use one of:

- inline section accordion,
- compact section jump menu,
- searchable tree drawer.

### Acceptance

- On 390px width, sheet tabs appear before the chart or chart is collapsed.
- Row content is reachable earlier than the current y=900+ position.
- No clipped chart labels or offscreen callouts.

## Phase P5 - Empty, Loading, Error, and Revoked States

### Plan

Add route-level and component-level plans for:

- empty snapshot,
- no selected sheets,
- expired/revoked token,
- password lockout,
- comment/decision API failure,
- loading route state if route splitting is introduced.

### Acceptance

- No state renders as a blank centered shell.
- Error/empty states explain next action.
- Security-sensitive states do not reveal private project data.

## Design Hard Stops

Stop implementation and fix if any of these appear in screenshots:

- centered narrow document feel remains at 1440px+,
- chart remains the largest first-screen element on mobile,
- debug badge remains visible,
- non-session right rail consumes full desktop width for only warning text,
- row text or controls overflow at 320px,
- tabs wrap or lose selected state clarity,
- comments/decision overlap estimate content,
- any app UI violates `DESIGN.md` font/radius/tracking rules.
