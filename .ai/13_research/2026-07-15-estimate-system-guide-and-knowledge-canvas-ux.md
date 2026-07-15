# Estimate System Guide and Knowledge Canvas UX Research

Date: 2026-07-15  
Scope: dense admin-system documentation, tab navigation, list/detail exploration, progressive disclosure, search, responsive scrolling, and an optional knowledge-graph canvas.  
Source policy: W3C/WAI guidance and first-party government, IBM Carbon, and React Flow documentation only.

## Recommended direction

Treat this page as a **readable system guide first and a graph explorer second**.

1. Keep the five top-level views — **Product, Features, Pages, UX, Knowledge** — as short, label-only tabs. Make Product the default and put the same heading at the start of every panel.
2. Give the guide one normal vertical reading scroll. Do not make the tab panel, left index, and detail area separate vertical scroll regions. Confine two-dimensional pan/zoom to the graph itself.
3. Make every dense view list-first: searchable index on the left or above, one selected record, then a stable detail reading area. On small screens, stack the index before the detail and collapse the index after selection.
4. In Knowledge, default to a plain-language action guide. Put the relationship canvas behind an explicit disclosure and default the canvas to **Focused**, not Whole system.
5. Use the canvas to orient and trace relationships, not to carry the only explanation. Selecting a node should update an unscaled detail panel containing its meaning, affected records, propagation, invariants, guards, and recovery.
6. Remove routine badges, counters, confidence labels, and decorative status colour. Show a status only when it changes what the reader must do or understand.

## Evidence-backed interaction rules

### 1. Tabs separate major reading views

WAI's tabs pattern requires a named `tablist`, one selected tab, paired tab/tabpanel relationships, Left/Right navigation for a horizontal list, Enter/Space for manual activation, and optional Home/End support. Automatic activation is recommended only when panels appear without noticeable latency. [WAI-ARIA Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)

GOV.UK recommends tabs when users need to switch quickly between clearly labelled related sections, do not need all sections at once, and the first section is the most commonly needed. It also warns that tabs hide content, labels must be clear, tabs should not wrap to multiple lines, and each panel should begin with a heading that repeats the tab label. [GOV.UK Tabs](https://design-system.service.gov.uk/components/tabs/)

Carbon recommends short, specific tab labels of one or two words and says the label should communicate the view that follows. [Carbon Tabs](https://carbondesignsystem.com/components/tabs/usage/)

**Archestimator rule:** retain five noun labels with no counts or status chips. Product comes first. Tabs remain one row; if width is constrained, allow deliberate horizontal tab scrolling or use a compact contents treatment instead of wrapping labels.

### 2. The document owns vertical scrolling; the graph owns only its canvas interaction

WCAG Reflow expects ordinary reading content to work with one-dimensional scrolling at narrow widths. It allows diagrams and maps to remain two-dimensional, but recommends limiting that scrolling to the individual section that requires it rather than making the whole page two-dimensional. [W3C Understanding Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)

GOV.UK's layout guidance starts with a single-column small-screen layout. [GOV.UK Layout](https://design-system.service.gov.uk/styles/layout/)

React Flow exposes `preventScrolling` specifically so applications can allow the page to continue scrolling when the pointer is over a flow, and separately exposes zoom, pan, pinch, and activation-key controls. [React Flow component API](https://reactflow.dev/api-reference/react-flow)

**Archestimator rule:** the admin workspace is the sole vertical reading scroll owner. The graph is a bounded exception. Ordinary wheel movement over the graph should continue the page scroll unless the user explicitly engages zoom/pan; visible controls must provide zoom in, zoom out, fit, and return-to-readable-view actions.

### 3. Progressive disclosure is for optional depth, not required meaning

GOV.UK's Details guidance says disclosure makes a page easier to scan when only some users need the information, but it must not hide information most users need. [GOV.UK Details](https://design-system.service.gov.uk/components/details/)

GOV.UK also warns that accordions hide content, should not contain content all users need, should not be nested, and should be used only when evidence shows that showing/hiding multiple related sections helps. It recommends trying simpler content, headings, or a list of links first. [GOV.UK Accordion](https://design-system.service.gov.uk/components/accordion/)

**Archestimator rule:** keep the action name, plain-language outcome, affected surfaces, invariants, and recovery visible. Put implementation notes, source files, raw identifiers, the whole-system canvas, and exhaustive relation inventories inside clearly named optional sections. Do not nest disclosures.

### 4. A searchable list is the primary route into dense knowledge

Carbon recommends search for complex or large data sets at page or component level, and recommends a clear button plus a useful, specific placeholder. It advises against search where the information is already small and easy to scan. [Carbon Search](https://carbondesignsystem.com/components/search/usage/)

Carbon's structured list is intended for browsing grouped information in a simple, scannable, selectable form. It supports one selected row and full-row pointer activation. [Carbon Structured List](https://carbondesignsystem.com/components/structured-list/usage/)

GOV.UK recommends lists to break information into manageable chunks and summary lists for stable key facts. [GOV.UK Lists](https://design-system.service.gov.uk/styles/lists/), [GOV.UK Summary List](https://design-system.service.gov.uk/components/summary-list/)

**Archestimator rule:** every long index gets one scoped search field, a visible label, a clear action, a truthful result count near the search, and a useful empty state. Search action names, human descriptions, entities, pages, and aliases. The selected row and keyboard focus must be visually distinct. The detail view should use headings and compact key/value rows rather than a grid of repeated cards.

### 5. Focused and Whole system are views of the same graph

Carbon treats switches between different presentations of the same underlying content as a lower-level content switcher, distinct from tabs between separate content areas. Labels should remain concise and the switcher should sit directly above the content it controls. [Carbon Content Switcher](https://carbondesignsystem.com/components/content-switcher/usage/)

React Flow's viewport API supports fitting either all nodes or a specified node subset, while its controls provide zoom, fit view, and viewport locking. Its MiniMap is described as a bird's-eye navigation aid for larger flows. [React Flow FitView options](https://reactflow.dev/api-reference/types/fit-view-options), [React Flow Controls](https://reactflow.dev/api-reference/components/controls), [React Flow built-in components](https://reactflow.dev/learn/concepts/built-in-components)

**Archestimator rule:** use a two-choice **Focused / Whole system** switch immediately above the canvas. Focused is the default and shows the selected record plus its nearest meaningful dependencies and consumers. Whole system is an explicit overview mode. `Fit` may reduce labels for orientation, but a `Readable` action must restore legible node text. A minimap is justified only in Whole system on larger screens.

### 6. Selection produces a stable, readable detail panel

React Flow exposes selection-change events and a hook specifically for synchronizing selected nodes/edges with other interface content. It also supports auto-panning when a node receives focus. [React Flow selection hook](https://reactflow.dev/api-reference/hooks/use-on-selection-change), [React Flow component API](https://reactflow.dev/api-reference/react-flow)

React Flow's accessibility guidance makes nodes and edges keyboard-focusable by default: Tab traverses them, Enter or Space selects, and Escape clears selection. [React Flow Accessibility](https://reactflow.dev/learn/advanced-use/accessibility)

**Archestimator rule:** selection from either the list or canvas updates the same detail panel and scrolls/focuses its heading into view. The panel does not zoom with the graph. It should answer, in this order:

1. What is this?
2. What changes?
3. What stays unchanged?
4. Where does the change appear?
5. What prevents a bad change?
6. How can it be recovered?
7. Which related actions or entities should I inspect next?

### 7. Status and colour must carry real meaning

GOV.UK says a tag is appropriate only when an item can have more than one status and knowing that status is useful. It recommends starting with the smallest number of statuses because more statuses are harder to remember, and warns not to rely on colour alone. [GOV.UK Tag](https://design-system.service.gov.uk/components/tag/)

DWP's research on a retired key-details bar found that generic prominence, multiple tags and flags, and data-dump headers damaged information hierarchy and caused banner blindness. Its replacement limits the header to a primary identifier, optional secondary identifier, and optional real state. [DWP Quick Reference design notes](https://design-system.dwp.gov.uk/components/quick-reference/design-notes)

**Archestimator rule:** normal records have no badge. Remove labels such as Current, Verified, High confidence, and routine counters. Reserve subdued text tags for exceptional and actionable states such as Boundary, Legacy behavior, Partial coverage, or Recovery unavailable. Use colour only as a secondary cue.

### 8. Responsive and keyboard behavior are part of the design

WCAG requires a logical focus order that preserves meaning and operation, a visible focus indicator, and pointer targets of at least 24 by 24 CSS pixels unless a documented exception applies. Dense interactive visualizations are an exception only when their spatial density is essential; equivalent controls are strongly encouraged. [W3C Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html), [W3C Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible), [W3C Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

**Archestimator rule:** at narrow widths, preserve the DOM order `tabs -> search/index -> selected detail -> optional canvas`. Make all list rows and graph controls comfortably targetable, preserve visible focus independently from selection, and provide the list/detail path as an equivalent to every canvas-only selection. The canvas must never be the sole way to discover a node or understand a relationship.

## Implications for Archestimator

### Page structure

```text
Estimate System Guide
Short purpose statement
Product | Features | Pages | UX | Knowledge

Panel heading + one-sentence orientation
Scoped search / view controls
Index or action list
Selected detail
Optional technical depth
Optional relationship canvas (Knowledge only)
```

### Knowledge view contract

- Default surface: searchable Action guide.
- Default selection: the first/highest-value action, with a complete human-readable effect guide.
- Canvas disclosure label: `Explore relationship map`.
- Canvas default: Focused view, readable zoom, selected node centered.
- Canvas alternate: Whole system view with fit control and optional desktop minimap.
- Details remain outside the scaled canvas and update from both list and node selection.
- A visible interaction hint explains drag/pan, zoom controls, fit, readable view, keyboard selection, and Escape.
- No automatic viewport movement after the user starts navigating, except when they deliberately select a record from the list.

### Content contract for every CRUD/action record

- Use the user's action language first: `Delete estimate row`, not an internal command name.
- State direct and propagated effects separately.
- Name surfaces in human terms first, with route or source identifiers as optional metadata.
- Explicitly say what is unchanged; silence forces readers to guess the blast radius.
- Pair destructive or shared mutations with guard and recovery language.
- Link to adjacent actions through a short `Related` list rather than repeated chips throughout the page.

### Acceptance checklist

- [ ] Every tab and panel remains reachable and scrollable with one document scroll.
- [ ] Top-level tabs have short labels, correct APG keyboard behavior, a single selected state, and matching panel headings.
- [ ] No tab labels wrap; small-screen behavior is intentional.
- [ ] Every long index has scoped search, clear, result feedback, and an empty state.
- [ ] List selection and canvas selection update the same stable detail panel.
- [ ] Knowledge opens in Action guide + Focused mode; Whole system is opt-in.
- [ ] Wheel scrolling over an inactive canvas continues the page; zoom/pan is explicit and recoverable.
- [ ] `Fit` and `Readable` are distinct actions when whole-graph fitting makes labels too small.
- [ ] Every graph node and relationship has a list/detail equivalent.
- [ ] Routine badges, counters, verification labels, and decorative colour are absent.
- [ ] All controls have visible focus, logical order, and adequate target size.

## Confidence and limits

Confidence is high for the accessibility, tab, disclosure, search, and responsive constraints because they come from W3C and maintained first-party design systems. The Focused/Whole-system and canvas recommendations are a synthesis of those constraints with React Flow's official viewport, selection, controls, and accessibility capabilities. They should still be validated against fresh screenshots and real pointer, wheel, touch, keyboard, and screen-reader use on the Archestimator route.
