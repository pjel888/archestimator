# Estimate System visual redesign: primary-source UX research

**Date:** 2026-07-15  
**Route:** `/admin/estimate-system`  
**Research scope:** compact, data-dense reference UI; progressive disclosure; tabs; readable alternatives to a graph canvas; keyboard/focus behavior; and nested scrolling.

## Executive recommendation

Treat this route as a compact documentation workbench, not as a dashboard or marketing page. Keep the five views as a quiet tab row, use a consistent index-and-record layout, put the human-readable explanation before implementation evidence, and make the Knowledge canvas a secondary exploration aid rather than the main way to understand system effects.

The resulting composition should be:

1. A short route header with the page name and one-sentence purpose.
2. Five plain tabs: Product, Features, Pages, UX, and Knowledge.
3. A stable work area: compact index on the left and selected record on the right; Knowledge can add an inspector only at wide desktop sizes.
4. Flat sections separated by spacing and hairlines, not nested cards, metric tiles, colored side stripes, or repeated badges.
5. One default state: current information is simply presented as current. Only exceptional states such as Partial, Boundary, Guarded, or Legacy remain visible near the affected statement.

This is a route-specific design recommendation, not a claim that any standard requires this exact composition. It combines the user's explicit direction with the official interaction and accessibility guidance below.

## What the current route is trying to support

The current source exposes three related information shapes:

- Product, Features, and Pages use a two-pane documentation pattern: index, selected record, and cross-links.
- UX uses a persona/path index and a selected journey or intersection record.
- Knowledge uses an operation index, a readable relationship guide, an entity/operation inspector, an interactive canvas, and a CRUD inventory.

That underlying information architecture is sound. The redesign should preserve it while reducing presentation noise and making the reading order unmistakable.

## Evidence-backed design principles

### 1. Keep the five views as real tabs, but make them quiet

The GOV.UK Design System recommends tabs when users need to switch quickly between clearly labelled, related sections and do not need to compare every section at once. It specifically notes that tabs can suit frequent users of caseworking systems. It also warns that tabs hide content, that labels must be clear, and that tab content should begin with a heading. [GOV.UK tabs guidance](https://design-system.service.gov.uk/components/tabs/)

The WAI-ARIA Authoring Practices Guide defines the expected tab semantics and keyboard model: one active tab and panel, arrow-key movement within the tab list, `Enter` or `Space` for manual activation, and a focusable tab panel when its first meaningful content is not otherwise focusable. Automatic activation is appropriate only when the panel appears without noticeable latency. [WAI-ARIA APG Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)

**Route mapping:**

- Retain Product, Features, Pages, UX, and Knowledge as the only top-level tabs.
- Remove tab counters. Counts do not help distinguish these five destinations and compete with their labels.
- Give every active panel a visible heading that restates the selected view in context.
- Preserve standard left/right arrow behavior and a visible selected state; do not intercept up/down arrows in the horizontal tab list because those keys should continue to scroll the page.
- Consider URL fragments or query state later if deep-linking and browser Back behavior are needed; do not block this visual pass on that decision.

### 2. Use compact structured rows for indexes, not cards

IBM Carbon describes a structured list as a way to organize many related items into logical, scannable rows, including a condensed size. It distinguishes simple browsing/selecting from complex data that truly needs a table, and documents visible enabled, hover, focus, and selected states for selectable rows. [Carbon Structured List usage](https://carbondesignsystem.com/components/structured-list/usage/)

The U.S. Web Design System recommends showing the current location, keeping side-navigation labels short, avoiding unnecessarily deep hierarchies, and testing the navigation in its real context. Its accessibility checklist also requires keyboard access, a visible focus indicator, and a selected state that is not conveyed by color alone. [USWDS side navigation](https://designsystem.digital.gov/components/side-navigation/) and [USWDS side-navigation accessibility tests](https://designsystem.digital.gov/components/side-navigation/accessibility-tests/)

USWDS table guidance reinforces the visual direction even when the content is rendered as lists: minimal styling surfaces information, plain-language labels improve scanning, fewer columns are easier to read, and directory-like rows should stack on small screens. [USWDS table guidance](https://designsystem.digital.gov/components/table/)

**Route mapping:**

- Render feature, page, persona, path, and operation indexes as flat, full-row targets with hairline separators.
- Use one neutral selected-row fill plus text weight or an icon/check marker. Do not use a colored left border as the selection mechanism.
- Keep row labels short. Put at most one quiet supporting line under a label; move longer explanations into the record pane.
- Group Pages by product area and UX items by user context, but do not add deeper nesting than the user needs to select a record.
- Keep the index in the same position across related desktop views so users can build a stable mental model.

### 3. Use progressive disclosure only for secondary evidence

GOV.UK recommends the native details pattern for information that only some users need and explicitly warns against hiding information that most users need. Its guidance also says the disclosure label should be short and descriptive. [GOV.UK Details guidance](https://design-system.service.gov.uk/components/details/)

**Route mapping:**

- Keep purpose, user need, behavior rules, actions, change effects, unchanged boundaries, guards, and recovery steps visible.
- Put source files, confidence, verification date, inventory classification totals, and status definitions under one clearly named evidence disclosure such as “Sources and evidence”.
- Do not show “Verified current”, “Current”, or “High confidence” beside every normal record. The lack of an exception label means the record is current.
- Keep Partial, Boundary, Guarded, and Legacy visible where they change how the user should interpret a statement. A hidden disclosure must never be the only place that communicates a safety or lifecycle boundary.

### 4. Make the readable relationship guide primary and the canvas optional

W3C's guidance for complex images says graphs and diagrams need a complete text equivalent, recommends making the long description available to everyone, and suggests reducing unnecessary visual complexity. [WAI Complex Images tutorial](https://www.w3.org/WAI/tutorials/images/complex/)

WCAG Reflow expects ordinary content to work at a width equivalent to 320 CSS pixels without two-dimensional scrolling. Diagrams and maps may use the two-dimensional-layout exception, but authors are still encouraged to reduce scrolling. [WCAG 2.2 Understanding Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)

WCAG Pointer Gestures requires a single-pointer alternative for functionality that otherwise depends on multipoint or path-based gestures. WCAG Keyboard requires a keyboard equivalent for pointer actions. [WCAG 2.2 Understanding Pointer Gestures](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html) and [WCAG 2.2 Understanding Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html)

**Route mapping:**

- Default Knowledge to the selected operation's readable effect guide: what changes, what stays the same, guards, recovery, and an ordered relationship list.
- Keep the graph behind an explicit “Show relationship canvas” control or in a secondary section after the readable guide.
- Give the canvas a short plain-language summary of the selected scenario before the SVG.
- Retain explicit Zoom in, Zoom out, Fit, and Reset controls so no user must rely on wheel modifiers, dragging, pinch, or two-finger gestures.
- Make every selectable node keyboard reachable and keep its focus indicator visible.
- Never make the canvas the sole source for an entity, relationship, status, timing, scope, or lifecycle boundary.

### 5. Reduce nested scrolling and make every remaining scroll region operable

The W3C proposed ACT rule for scrollable content checks that a scrollable element, or a descendant within it, can be reached through sequential focus navigation so that keyboard users can scroll it. The rule also notes that script can still break keyboard scrolling and must be tested separately. [W3C ACT rule: Scrollable content can be reached with sequential focus navigation](https://www.w3.org/WAI/standards-guidelines/act/rules/0ssw9k/proposed/)

WCAG Focus Order requires a sequence that preserves meaning and operability and recommends that focus order reinforce the reading order implied by the visual layout. [WCAG 2.2 Understanding Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)

WCAG Focus Not Obscured requires a focused component not to be entirely hidden by author-created sticky content and calls out sticky headers as a common source of problems. [WCAG 2.2 Understanding Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)

**Route mapping:**

- Prefer the page's vertical scroll on compact layouts. Stack index, record, inspector, inventory, and optional canvas rather than giving each a fixed-height viewport.
- At wide desktop sizes, independent index and record scroll panes are reasonable only when their bounds and scroll affordance are visible and their content remains reachable by keyboard.
- Give a scroll pane `tabindex="0"` when it has no naturally focusable descendant near its entry, and give the region an accessible name.
- Do not put `overflow: hidden` on a shared ancestor unless every tab panel has a deliberate, verified inner scroll owner.
- Keep sticky tabs if they materially aid orientation, but add enough scroll padding so programmatically focused headings and keyboard-focused controls are not hidden beneath them.
- After a cross-link opens a Feature or Page record, focus the destination heading in the new panel and announce the change without forcing the user through the index again.

The recommendation to minimize nested scrolling is a design inference from these keyboard, focus-order, and reflow requirements; it is not itself a WCAG success criterion.

### 6. Keep compact controls usable and status changes understandable

WCAG 2.2 defines a 24-by-24 CSS-pixel minimum target unless an exception or sufficient spacing applies. It also notes that dense interactive visualizations should provide equivalent functionality through another means where practical. [WCAG 2.2 Understanding Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

WCAG Status Messages includes search-result messages such as “18 results returned” and “No results returned” when they appear without moving focus. Those messages should be programmatically exposed without interrupting the user's work. [WCAG 2.2 Understanding Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)

WCAG Use of Color requires visible information in addition to color when color communicates state or meaning. [WCAG 2.2 Understanding Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)

**Route mapping:**

- Keep dense typography, but ensure adjacent tab, row, segmented-control, and canvas-control targets meet the 24-pixel target or spacing rule.
- Announce filtered result counts and empty states with a polite status region while keeping focus in the search field.
- Always write exceptional status text such as “Partial” or “Legacy”; do not rely on orange, yellow, purple, dashed lines, or tinted backgrounds alone.
- Reserve color for focus, selected state reinforcement, warnings, and genuine exceptions. Do not use color as decorative taxonomy.

## View-by-view target structure

| View | Primary question | Index | Main record | Secondary information |
| --- | --- | --- | --- | --- |
| Product | How does estimating move from setup to client decision? | Product areas | One ordered product journey with plain-language outcomes | Related pages and a short “How to use this guide” note |
| Features | How does one user goal work? | Searchable feature rows | User need, entry points, ordered behavior, and related records | Sources and evidence disclosure |
| Pages | Where does work happen? | Pages grouped by product area | Purpose, audience, route, actions, regions, and connected features | Sources and evidence disclosure |
| UX | Who is doing what, in what order, and where does work hand off? | Persona first, then relevant paths | Selected journey or intersection sequence | Persona context and sources; show Partial only when applicable |
| Knowledge | What changes when I perform this action? | Searchable operation rows; matching entities as a secondary group | Changes, unchanged boundaries, guards, recovery, and readable relationships | Inspector, optional canvas, CRUD inventory, and source evidence |

## Implementation acceptance criteria derived from the research

- The five tab labels have no counters and do not wrap at the supported desktop width.
- Every tab exposes one visible panel heading and follows the APG tab keyboard model.
- Index rows use a shared flat visual pattern with no colored left border.
- Baseline “current/verified/high confidence” metadata is absent from the main reading path; exceptions remain explicit.
- Core explanations are never hidden in a disclosure.
- Product, Features, Pages, and UX can be read in one-dimensional order at compact widths.
- Knowledge has a complete text-first representation before or without the canvas.
- Canvas zoom/pan outcomes are available through buttons and keyboard, and control targets meet the target-size rule.
- Every independent scroll region is keyboard reachable, visibly bounded, and does not trap focus or wheel scrolling.
- Sticky navigation does not obscure focused controls or programmatically focused destination headings.
- Search empty states and result counts are announced without moving focus.
- Selected, warning, boundary, partial, and legacy states are understandable without color.

## Research limits and remaining uncertainty

- No official source validates the exact visual hierarchy for Archestimator; the exact composition is a reasoned application of standards, first-party design-system guidance, the current code structure, and the user's stated preferences.
- GOV.UK notes that its tabs component still needs more direct user research, especially for small-screen and assistive-technology behavior. The route therefore still needs live keyboard and compact-viewport QA even if it follows the published guidance.
- The best wide-screen scroll model depends on real content length and viewport height. Source inspection cannot determine whether two panes or three panes feel best; verify with the longest Feature, UX path, Knowledge operation, and entity record.
- Whether the selected tab and record should persist in the URL is a product-navigation decision, not a prerequisite for the visual cleanup.
- The full-system canvas may remain valuable for agents and advanced users, but its frequency of use is unknown. Keep it available while measuring whether people use it after the readable operation guide is improved.

## Primary sources

- [WAI-ARIA APG Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
- [GOV.UK Design System: Tabs](https://design-system.service.gov.uk/components/tabs/)
- [GOV.UK Design System: Details](https://design-system.service.gov.uk/components/details/)
- [IBM Carbon Design System: Structured List](https://carbondesignsystem.com/components/structured-list/usage/)
- [U.S. Web Design System: Side Navigation](https://designsystem.digital.gov/components/side-navigation/)
- [U.S. Web Design System: Side Navigation Accessibility Tests](https://designsystem.digital.gov/components/side-navigation/accessibility-tests/)
- [U.S. Web Design System: Table](https://designsystem.digital.gov/components/table/)
- [WAI Complex Images Tutorial](https://www.w3.org/WAI/tutorials/images/complex/)
- [WCAG 2.2 Understanding Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html)
- [W3C ACT Rule: Scrollable Content](https://www.w3.org/WAI/standards-guidelines/act/rules/0ssw9k/proposed/)
- [WCAG 2.2 Understanding Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)
- [WCAG 2.2 Understanding Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
- [WCAG 2.2 Understanding Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
- [WCAG 2.2 Understanding Pointer Gestures](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html)
- [WCAG 2.2 Understanding Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [WCAG 2.2 Understanding Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
- [WCAG 2.2 Understanding Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
