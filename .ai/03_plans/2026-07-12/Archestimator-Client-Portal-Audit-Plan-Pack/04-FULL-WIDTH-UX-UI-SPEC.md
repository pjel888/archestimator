# 04 — Full-Width UX/UI Specification

## 1. Design correction

The current `ShareContainer` still defines the product as a centered document:

```text
mx-auto ... max-w-[820px] lg:max-w-[1120px] xl:max-w-[1280px] 2xl:max-w-[1440px]
```

That container should not control the new Client Portal. The browser canvas is a work surface. The design must use the width while preserving readable local measures.

## 2. Layout primitives

### `ClientPortalShell`

Responsibilities:

- full-viewport canvas;
- brand header;
- responsive navigation;
- content slot;
- contextual rail;
- mobile action surface;
- issue/status banner;
- print boundary;
- focus restoration and scroll padding.

Base shape:

```css
.portal-shell {
  width: 100%;
  min-height: 100dvh;
}

.portal-workspace {
  display: grid;
  grid-template-columns:
    minmax(220px, 280px)
    minmax(0, 1fr)
    minmax(340px, 420px);
}
```

The contextual rail collapses when not needed. The content column must be `minmax(0, 1fr)` so wide tables and charts can shrink correctly without forcing the whole page to overflow.

### Local width modes

| Mode | Use | Rule |
|---|---|---|
| `prose` | assumptions, narrative, legal copy | 70–80 characters |
| `standard` | overview cards, decision | flexible inner max around 1100–1200 px |
| `wide` | financial charts, comparison, estimates | no content max; use available center column |
| `immersive` | future document/image review | edge-to-edge within center canvas |

The section renderer chooses the mode. Do not give owners arbitrary pixel controls.

## 3. Breakpoints

### ≥ 1440 px

- persistent left navigation;
- center content;
- persistent or collapsible right context rail;
- wide comparison tables;
- sticky section header permitted.

### 1024–1439 px

- persistent or collapsible left rail;
- discussion opens as side drawer;
- center fills remaining width;
- table horizontal scroll only when genuinely required.

### 768–1023 px

- compact section selector;
- single primary content column;
- discussion drawer;
- sticky action bar.

### < 768 px

- full-width mobile content;
- top section switcher;
- no persistent side rail;
- discussion/decision bottom sheets;
- 44 px minimum primary touch targets;
- safe-area padding;
- no tiny workshop-density typography.

## 4. Typography

The current workshop design system is intentionally dense—often 8–12 px. The client portal is an occasional-use, external-facing product and must not inherit that density uncritically.

Recommended client portal scale:

| Token | Size | Use |
|---|---:|---|
| `portal-display` | 28–36 px | project/issue title |
| `portal-heading-1` | 22–28 px | section title |
| `portal-heading-2` | 18–22 px | card/group title |
| `portal-body` | 14–16 px | primary text |
| `portal-body-sm` | 13–14 px | supporting text |
| `portal-label` | 12–13 px | labels/metadata |
| `portal-table` | 13–14 px | row tables |
| `portal-numeric` | 13–24 px | totals/KPIs |

Use tabular numerals for money and quantities. Reserve uppercase for short metadata labels, not paragraph copy.

## 5. Brand header

The header spans the full viewport and includes:

- owner logo;
- optional client logo;
- project name;
- issue number/version;
- status;
- current recipient identity;
- print/download if permitted;
- contact/help;
- overflow menu.

The owner chooses one co-branding layout:

1. **Prepared by / Prepared for** — owner primary, client secondary.
2. **Co-branded** — both logos equal.
3. **Client-led** — client primary, owner secondary.

The header must remain usable when one or both logos are absent.

## 6. Navigation and sticky behavior

Sticky elements:

- portal header;
- section navigation;
- optional decision/action strip;
- contextual rail header.

Requirements:

- keyboard focus is never hidden by sticky UI;
- use `scroll-padding-top` and `scroll-padding-bottom`;
- preserve deep-link target visibility;
- avoid two competing sticky footer bars;
- mobile decision and discussion actions share one controlled bar;
- screen-reader order matches visual order.

WCAG 2.2 specifically warns against sticky headers/footers completely obscuring focused components. This is a release acceptance criterion.

## 7. Estimates UI

### Tree view

- persistent outline on wide screens;
- expandable Group/Area rows;
- total, row count, and state;
- selected target highlighting;
- direct “Discuss” control on focus/hover without turning every row into a button;
- keyboard navigation;
- a visible “showing all / load more” state.

### Detail view

- sticky table header;
- configurable safe columns;
- horizontal scroll within table surface only;
- frozen description column where practical;
- row selection opens contextual rail;
- visible totals and subtotals;
- optional density control;
- virtualized/paged rows;
- print all rows, not just currently virtualized rows.

### Nested navigation

Top-level portal sections use the left rail. Estimate sheets and estimate tabs use a secondary navigation inside Estimates. The hierarchy must be visually distinct to avoid “tabs inside tabs inside tabs.”

## 8. Financial UI

- charts occupy the available center width;
- KPI cards form responsive grids;
- comparisons use linked chart + delta table;
- all charts have a table/list equivalent;
- legends never rely only on color;
- negative/positive deltas use icons/text as well as color;
- chart selection opens discussion context;
- clear data basis and rounding note.

## 9. Discussion UI

On large screens, the right rail shows the active target's threads and a composer. It can display message bubbles, but the thread header remains structured:

- subject;
- target;
- status;
- participants;
- assignee/waiting state;
- issue/version;
- resolve/reopen action.

The all-discussion section uses a two-column inbox/detail layout when space allows.

## 10. Publisher preview

The Publisher must offer:

- responsive viewport presets;
- “View as” Viewer / Commenter / Reviewer / Approver;
- anonymous view if enabled;
- selected recipient view;
- current draft vs current issue comparison;
- visible permission explanation;
- no ability to accidentally submit a real decision in preview.

Preview uses the same section renderer and policy evaluator as the public page, with explicit manager-preview mode.

## 11. Print and PDF

Print output is a document, not the interactive portal shell.

Print rules:

- owner/client branding;
- issue identity on every page;
- selected print-enabled sections only;
- all rows rendered;
- charts with accessible legends;
- comments/activity excluded by default unless explicitly selected;
- decision/audit summary included after decision;
- no sticky navigation;
- page breaks at meaningful section boundaries;
- UTC and local display rules documented for formal records.

## 12. Visual acceptance criteria

- The primary workspace uses the full browser width at 1920 px and 2560 px.
- No global max-width leaves large unused side gutters.
- Prose remains readable through local width limits.
- A comparison table can use the whole center canvas.
- The discussion rail can remain visible without crushing content.
- At 320 px, no primary action is clipped or hidden.
- At 200% zoom, navigation, content, and discussion remain operable.
- Keyboard focus is not obscured by header or bottom action bar.
- Owner and client logos retain aspect ratio and accessible alt text.
