# Professional SaaS Design Standards

**Status:** External primary-source benchmark for dense professional web SaaS
and B2B tools

**Sources checked:** 2026-07-19

**Applies to:** Product and workshop interfaces, not marketing pages or formal
proposal documents

This reference distills standards and durable conventions from WCAG/WAI, IBM
Carbon, Microsoft Fluent, Material Design, Shopify, Atlassian, and GOV.UK. It is
not a substitute for current source, `DESIGN.md`, the project-specific
`design-doctrine.md`, or an accessibility audit. External size and spacing
recommendations are comparison evidence, not automatic Archestimator token
changes.

## How to read this reference

- **Required** means a normative WCAG 2.2 Level A or AA obligation when the
  product targets WCAG 2.2 AA.
- **Recommended** means a product-design convention supported by one or more
  official design systems. It improves consistency or usability but is not, by
  itself, a WCAG requirement.
- **Contextual** means the right choice depends on task density, input modality,
  or content shape.

Important distinctions:

- WCAG does **not** set a minimum body font size, mandate a 4px or 8px grid, or
  require every control to be 40px, 44px, or 48px tall.
- WCAG 2.2 AA requires most pointer targets to contain at least a 24 by 24 CSS
  pixel area or satisfy an exception. Larger 44px to 48px touch targets are
  cross-platform product conventions.
- WCAG 2.4.7 requires visible keyboard focus at Level AA. The more measurable
  2px-perimeter and 3:1 change-of-contrast model belongs to WCAG 2.4.13 at
  Level AAA and is a useful quality target, not an AA requirement.
- A data table can qualify for WCAG's two-dimensional reflow exception, but the
  rest of the page, its toolbar, and each cell's readable content do not inherit
  that exception.

Archestimator currently declares WCAG 2.1 AA in `PRODUCT.md`. Treat the WCAG 2.2
target-size and focus-not-obscured criteria in this reference as forward product
standards unless a current task explicitly updates the declared baseline.

## 1. Normative accessibility baseline

For products that declare WCAG 2.2 AA, the official
[WCAG 2.2 recommendation](https://www.w3.org/TR/WCAG22/) is normative; the linked
Understanding and WAI tutorial pages are explanatory implementation guidance.
Archestimator's current 2.1 AA target remains controlling until project
authority changes it.

| Area | Required WCAG 2.2 baseline | Product consequence |
| --- | --- | --- |
| Text contrast | Normal text reaches 4.5:1; large text reaches 3:1 ([1.4.3 Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum)). | Check every text/background state, including hover, selected, disabled-readable, and inverse themes. |
| Non-text contrast | Visual information needed to identify active controls, states, and meaningful graphics reaches 3:1 against adjacent colors ([1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast)). | Borders, checks, focus indicators, chart marks, and state icons cannot fade below the threshold when they carry meaning. |
| Color | Color is not the only visual means of conveying information or state ([1.4.1 Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color)). | Pair status hues with text, icons, patterns, shape, or weight. |
| Structure and relationships | Information, structure, and relationships conveyed visually are programmatically determinable or available in text ([1.3.1 Info and Relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships)). | Preserve headings, labels, groups, table headers, and field descriptions in semantic markup. |
| Resize and spacing | Text can resize to 200% without loss of content or function; user overrides for line, paragraph, letter, and word spacing do not clip or overlap content ([1.4.4 Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text), [1.4.12 Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing)). | Avoid fixed-height text containers, single-line truncation for essential content, and layout assumptions tied to one font metric. |
| Reflow | Non-excepted content works at a width equivalent to 320 CSS pixels without two-dimensional scrolling ([1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow)). | Stack page regions and form columns; isolate genuinely two-dimensional tables in their own scroll container instead of making the whole page scroll horizontally. |
| Keyboard | All functionality is operable from a keyboard, focus can leave every component, focus is visible, and focused content is not entirely obscured ([2.1.1 Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard), [2.1.2 No Keyboard Trap](https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap), [2.4.7 Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible), [2.4.11 Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum)). | Hover-only actions need focus equivalents; sticky bars and overlays must not hide the active control. |
| Target size | Pointer targets meet the 24 by 24 CSS pixel minimum or a defined spacing, equivalent-control, inline, user-agent, or essential exception ([2.5.8 Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)). | Do not use densely packed undersized icon targets without sufficient separation or an equivalent larger control. |
| Labels and errors | Inputs have labels or instructions; detected errors identify the field and describe the problem in text; known corrections are suggested ([3.3.2 Labels or Instructions](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions), [3.3.1 Error Identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification), [3.3.3 Error Suggestion](https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion)). | Do not rely on a red border, placeholder, or generic “Invalid” message. |
| Programmatic state | Custom controls expose a determinable name, role, state, and value; status changes that do not take focus are available to assistive technology ([4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value), [4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages)). | Loading, saved, filtered-result, and validation messages need appropriate semantics rather than forced focus changes. |

### Baseline implementation stance

1. Prefer native HTML semantics before ARIA.
2. Keep DOM order aligned with reading and keyboard order.
3. Use visible labels for task-critical controls.
4. Associate helper and error text programmatically with the field.
5. Keep status announcements concise and avoid moving focus for routine updates.
6. Validate the entire state matrix, not only default colors and sizes.

## 2. Typography scale

### External productive-scale benchmark

Many professional systems use the following small, tokenized scale rather than
arbitrary per-component sizes. Archestimator deliberately uses a denser product
register; reconcile through `design-doctrine.md` instead of importing this table.

| Role | Recommended size / line height | Use |
| --- | --- | --- |
| Fine print / metadata | 12px / 16px | Secondary timestamps, compact captions, low-priority semantic messages; use sparingly. |
| Product body / control / table | 14px / 20px | Default body copy, labels, buttons, inputs, menus, and data-table cells. |
| Emphasized body / small title | 16px / 22px or 24px | Section introductions, modal titles, prominent totals. |
| Section title | 20px / 24px or 28px | Major panel and page sections. |
| Page title | 24px / 32px | Primary product-page heading. |

This is a synthesis, not a compliance threshold. Carbon's productive set uses a
14px base and 12px labels; Fluent Web uses 14px/20px body and 12px/16px captions;
Atlassian uses 14px/20px as its default component body and 12px/16px only for
secondary content. Shopify sets 13px as the minimum for body, headings, and
interactive text, with 12px reserved for smaller copy. See
[Carbon type sets](https://carbondesignsystem.com/elements/typography/type-sets/),
[Fluent typography](https://fluent2.microsoft.design/typography),
[Atlassian typography](https://atlassian.design/foundations/typography/applying-typography),
and [Shopify visual design](https://shopify.dev/docs/apps/design/visual-design).

### Typography rules

- In a system without a project-specific scale, **14px/20px is a common
  dense-product default**. In Archestimator, do not silently replace the
  established 10–12px operational register; review readability, zoom, reflow,
  and role assignment at the owning token or component.
- Reserve 12px for genuinely secondary content. Never force users to parse
  essential financial or estimating data at caption size.
- Keep text roles semantic. An `h2` can be styled modestly, but heading levels
  must remain logically ordered.
- Use regular weight for reading and medium or semibold for component emphasis.
  Avoid using weight alone to communicate state.
- Use sentence case for headings, buttons, labels, and column headers.
- Use tabular numerals for columns and changing metrics. Atlassian explicitly
  recommends tabular figures for tables and lists, while GOV.UK notes that equal
  digit widths improve comparison and prevent counters from visually shifting
  ([Atlassian product typefaces](https://atlassian.design/foundations/typography/product-typefaces-and-scale),
  [GOV.UK tabular numbers](https://design-system.service.gov.uk/styles/font-override-classes/)).
- Let text wrap. Truncate only user-generated or structurally constrained text,
  and provide a keyboard-accessible way to reveal the full value.

## 3. Spacing and density

### Recommended 4/8 system

Use 4px as the micro-alignment unit and 8px as the dominant layout rhythm.
For web UI, “4/8pt spacing” should be implemented as CSS-pixel or rem-based
tokens, not CSS `pt` units; `dp` and platform points are the corresponding
device-independent units in native systems.
Fluent's global spacing ramp is based on 4px, Shopify Admin uses a 4px grid,
Atlassian uses an 8px base with 2px/4px substeps, Carbon uses multiples of 2, 4,
and 8, and Material aligns most UI to 8dp with 4dp for type and icons
([Fluent layout](https://fluent2.microsoft.design/layout),
[Shopify layout](https://shopify.dev/docs/apps/design/layout),
[Atlassian spacing](https://atlassian.design/foundations/grid-beta/applying-grid),
[Carbon spacing](https://carbondesignsystem.com/elements/spacing/overview/),
[Android grids and units](https://developer.android.com/design/ui/mobile/guides/layout-and-content/grids-and-units)).

Recommended token set:

`0, 2, 4, 8, 12, 16, 24, 32, 48, 64`

- Use 2px only for hairline-adjacent optical correction or very tight internal
  separation.
- Use 4px to bind icon-to-label, field-to-helper, and related inline elements.
- Use 8px for normal internal gaps and compact control groups.
- Use 12px or 16px for component padding and field groups.
- Use 24px or 32px between sections or independent tasks.
- Use 48px or 64px for major page zones, not ordinary card internals.

Do not invent raw values because a single component looks slightly off. Adjust
the token, shared component, or row contract that owns the relationship.

### Density tiers

| Tier | Control height | Table row | Typical use |
| --- | --- | --- | --- |
| Compact desktop | 32px | 32px | High-frequency expert workflows using keyboard or precise pointer input. |
| Standard productive | 40px | 40px | Default B2B forms, filters, toolbars, and mixed-skill workflows. |
| Touch / spacious | 44px to 48px target; usually 48px control | 48px or more | Coarse pointer, mobile, high-stakes forms, or low-frequency tasks. |

These tiers are conventions. Carbon publishes 32px, 40px, and 48px text-input
heights and table rows from 24px through 64px; it recommends consistent field
heights on a page. Material and Android recommend 48dp touch targets, while
Fluent calls for 44 by 44 on web/iOS and 48 by 48 on Android
([Carbon text input](https://carbondesignsystem.com/components/text-input/usage/),
[Carbon data table style](https://carbondesignsystem.com/components/data-table/style/),
[Android touch target size](https://support.google.com/accessibility/android/answer/7101858),
[Fluent layout](https://fluent2.microsoft.design/layout)).

Rules:

- Do not mix density tiers within one table, form, or toolbar.
- A compact visual icon can live inside a larger target. Target size and visible
  glyph size are separate decisions.
- Compact 32px controls are desktop-first. Expand target areas for coarse
  pointer input rather than shrinking mobile UI to preserve desktop density.
- Keep select chevrons, clear buttons, and trailing actions inset by a tokenized
  8px to 12px and give each action a real target of at least 24px.

## 4. Responsive structure

### Required behavior

- At an equivalent 320 CSS pixel width, non-exempt content reflows without loss
  of information or function.
- Keep two-dimensional tables or canvases in their own scroll regions. Their
  headings, filters, search, pagination, and adjacent prose still reflow.
- Text enlargement and user spacing overrides must not clip fixed-height rows,
  sticky bars, side panels, or modal content.

See the W3C [Reflow explanation](https://www.w3.org/WAI/WCAG22/Understanding/reflow),
especially its data-table and persistent-toolbar examples.

### Recommended product behavior

- Design around task priority, not only device names. Preserve the primary work
  object, primary action, status, and recovery path first.
- Collapse secondary rails into labelled drawers or secondary pages; do not
  remove their information without an equivalent route.
- Stack paired form columns at narrow widths and preserve label/input/helper
  order within each field.
- Let toolbars wrap into logical groups or move lower-priority actions into an
  overflow menu. Never strand a primary action off-screen.
- Transform a table into a list only when row/column relationships remain clear.
  Otherwise keep the semantic table in a labelled scroll container. Shopify's
  table component explicitly supports automatic table-to-list adaptation on
  narrow screens ([Shopify table](https://shopify.dev/docs/api/app-home/web-components/layout-and-structure/table)).
- Avoid retaining desktop two-column density on mobile. Shopify's design
  requirements call out unstacked two-column mobile layouts and whole-page
  horizontal scrolling as failures of mobile-friendly design
  ([Built for Shopify design requirements](https://shopify.dev/docs/apps/launch/built-for-shopify/requirements)).

## 5. Controls and target size

### Current WCAG 2.1 AA requirement

- Provide keyboard access for every pointer action.

### Forward WCAG 2.2 target-size standard

- When applying WCAG 2.2, meet 2.5.8's 24 by 24 CSS pixel target or an
  explicit exception.
- Keep adjacent undersized targets far enough apart to satisfy the spacing
  exception.

### Recommended

- Use 40px controls by default in professional desktop forms and toolbars.
- Use 32px only for compact expert surfaces with low error cost and precise
  pointer/keyboard use.
- Use 44px to 48px targets for touch, even if the visible icon or checkbox is
  16px to 24px.
- Preserve at least 8px between independent touch targets. Material recommends
  48dp targets with 8dp separation as a usability convention
  ([Android touch target guidance](https://support.google.com/accessibility/android/answer/7101858)).
- Do not make an entire row clickable when it also contains nested controls
  unless event, focus, and accessible-name behavior is unambiguous.
- Keep destructive and high-frequency actions visually and spatially distinct.

## 6. Forms, helper text, and errors

### Field anatomy contract

Every field owns the same ordered slots:

1. Visible label and optional required/optional indicator.
2. Optional persistent instruction or helper text when it is needed before
   entry.
3. Control container with consistent height and internal padding.
4. Helper, warning, or error row associated with the control.

Do not use placeholder text as the label or as the only source of an essential
format instruction. Carbon, Fluent, and GOV.UK all keep labels visible and warn
against essential placeholder content
([Carbon text input](https://carbondesignsystem.com/components/text-input/usage/),
[Fluent field](https://fluent2.microsoft.design/components/web/react/core/field/usage),
[GOV.UK text input](https://design-system.service.gov.uk/components/text-input/)).

### Alignment contract

- Align label baselines, control tops, control heights, and supporting-message
  rows as one layout system.
- Paired fields in a two-column row respond as a unit. Reserve or share the
  supporting-message row so an error in one field does not misalign the adjacent
  control or push only one column downward.
- Keep control width proportional to expected input while aligning its outer
  edge to the form grid.
- Use one field component to own label, description IDs, error semantics,
  padding, icon insets, and disabled/read-only behavior.

Carbon's form guidance is explicit that when one item in a two-column row grows
to show an error, the paired item grows with it, and its text-input guidance says
helper text stays below the field while an error or warning can replace it
([Carbon form](https://carbondesignsystem.com/components/form/usage/),
[Carbon text input](https://carbondesignsystem.com/components/text-input/usage/)).

### Validation and recovery

- Identify the exact field and problem in text; add a known correction or valid
  format when possible.
- Use more than color: error text plus an icon, border, or other state cue.
- Keep the user's entered values after validation failure.
- Associate helper and error content with the field, commonly through
  `aria-describedby`; expose invalid state programmatically.
- For multiple submission errors, place a concise summary before the form and
  link each item to its field. Moving focus to that summary after submission is
  a well-established GOV.UK recovery convention, not a universal WCAG command
  ([GOV.UK error summary](https://design-system.service.gov.uk/components/error-summary/),
  [GOV.UK validation pattern](https://design-system.service.gov.uk/patterns/validation/)).
- Do not report an error before the user has had a reasonable chance to finish
  the value. Choose submit, blur, or committed-change validation consistently
  based on task and error cost.
- Distinguish disabled from read-only. A value users must review should remain
  perceivable and programmatically available rather than being rendered as an
  inaccessible disabled control.

## 7. Data tables and editable grids

### Choose the correct semantic model

- Use a native `<table>` for primarily read-only tabular data.
- Mark header cells and data cells correctly, associate row and column headers,
  and provide a caption when it helps identify the dataset. WAI's tables
  tutorial recommends `<th>`, `<td>`, `scope`, and explicit `headers` links for
  more complex structures ([WAI Tables Tutorial](https://www.w3.org/WAI/tutorials/tables/)).
- Use the ARIA `grid` pattern only for a truly interactive, spreadsheet-like
  widget that manages internal focus. A grid is a composite widget with one page
  tab stop and author-managed arrow-key navigation; it is not a styling synonym
  for a table ([WAI-ARIA Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)).

### External visual-contract benchmark

The following values describe a common productive SaaS table. They are not a
request to restyle Archestimator's specialized 9–10px estimate grid; use them to
evaluate role clarity, targets, spacing, and any explicit future type evolution.

- Default table text: 14px/20px. Header text: 14px, medium or semibold.
- Default productive row: 40px. Compact expert row: 32px. A 24px row is suitable
  only for very dense display-only content; interactive targets inside it still
  need their own compliant area.
- Keep one row density and one header-density rule across the table.
- Use 12px to 16px horizontal cell padding and 8px to 12px gaps around inline
  icons or controls.
- Left-align text; right-align numeric columns and their headers; use tabular
  numerals. Material explicitly recommends right-aligned numbers for faster
  scanning ([Material data tables](https://m2.material.io/design/components/data-tables.html)).
- Give the table the majority of available width. Avoid nesting a dense table
  inside a narrow card or another table. Carbon recommends placing data tables
  in the main content area and giving them room to avoid truncation
  ([Carbon data table](https://carbondesignsystem.com/components/data-table/usage/)).
- Keep column names short and specific. If essential content must truncate,
  reveal it on both hover and keyboard focus.

### Interaction contract

- Sorting uses a real button in the header, exposes the current direction, and
  retains a visible sorted state rather than showing the cue only on hover.
- Hover may help scan a row, but it cannot be the only indication that the row
  is selected, actionable, or contains controls.
- Selection uses a persistent control and a second selected-row cue. Batch
  actions appear only after selection and remain keyboard reachable.
- Global search, filters, display settings, and export actions belong in a table
  toolbar; row-specific actions use secondary styling or a row menu. Shopify
  likewise advises against primary-styled actions inside tables
  ([Shopify layout](https://shopify.dev/docs/apps/design/layout)).
- Do not hide row actions only on pointer hover. Show them on focus, and keep
  them persistent on touch/coarse-pointer layouts.
- Keep scroll containment obvious. Sticky headers and key columns must preserve
  focus visibility and must not cover cell content at zoom.

### Table states

- **Initial loading:** preserve column and row geometry with a table-shaped
  skeleton when the structure is known.
- **Sorting/filtering:** retain current content or structure, indicate the
  local operation, and announce result counts without moving focus.
- **Empty:** replace an unusable header/footer shell with one concise empty
  state that explains what data belongs there and the primary next step.
- **Error:** distinguish permission, configuration, connectivity, and system
  failures; provide the most likely recovery action.

Carbon recommends skeletons instead of spinners for delayed table data and
describes contextual empty states with a clear next action
([Carbon data table](https://carbondesignsystem.com/components/data-table/usage/),
[Carbon empty states](https://carbondesignsystem.com/patterns/empty-states-pattern/)).

## 8. Focus and keyboard behavior

### Required

- Every operation has a keyboard path and no component traps focus.
- The focused element has a visible indicator and is not fully hidden behind a
  sticky header, footer, drawer, or overlay.
- Custom components expose their name, role, value, state, and changes.

### Recommended focus treatment

- Adopt an AAA-inspired focus target: a solid indicator equivalent to at least
  a 2px perimeter with a 3:1 change from the unfocused state, while also keeping
  adequate adjacent contrast. This follows the measurable model in
  [WCAG 2.4.13 Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance).
- Use `:focus-visible` so keyboard focus is clear without suppressing focus for
  other input methods that need it.
- Do not communicate keyboard focus with a subtle shadow alone.
- Keep focus order aligned with visual reading order.
- Return focus to the invoking control when a modal, popover, drawer, or menu
  closes, unless the action intentionally moves the user to a new task.
- Distinguish focus from selection. A selected row may not currently have focus,
  and a focused option may not yet be selected.
- Follow platform key conventions. For complex widgets, use the relevant WAI-ARIA
  Authoring Practices pattern rather than inventing shortcuts
  ([WAI keyboard interface guidance](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)).

## 9. Semantic color

### Required

- Text and non-text contrast meet the ratios in Section 1.
- Meaning is never carried by hue alone.

### Recommended token model

Define color by role, not raw hue:

- `surface`, `surface-raised`, `surface-overlay`, `surface-sunken`
- `text-primary`, `text-secondary`, `text-disabled`, `text-on-color`
- `border-subtle`, `border-strong`, `border-interactive`, `focus`
- `interactive`, `interactive-hover`, `interactive-active`, `selected`
- `info`, `success`, `warning`, `danger`, and their foreground/border variants

Carbon separates background, layer, field, border, text, icon, support, focus,
and skeleton roles. Fluent uses global tokens plus semantically named alias
tokens. Atlassian warns against using accent colors where a semantic status role
exists
([Carbon color overview](https://carbondesignsystem.com/elements/color/overview/),
[Fluent design tokens](https://fluent2.microsoft.design/design-tokens),
[Atlassian color](https://atlassian.design/foundations/color-new/)).

State conventions:

- **Success:** completed or healthy, not generic promotion.
- **Warning:** risk, incomplete state, or action that may become harmful.
- **Danger:** blocked, destructive, failed, or invalid.
- **Information:** neutral guidance or in-progress context.
- **Selected:** a dedicated selection token, not a status color.

Pair every status color with text or an icon. For charts, use categorical colors
for categories and reserve semantic colors for semantic meaning; Atlassian notes
that status and severity hues can be difficult to distinguish and recommends
additional indicators
([Atlassian data-visualization color](https://atlassian.design/foundations/color-new/data-visualization-color/)).

## 10. Elevation and surface hierarchy

Use depth to express actual layering, not to decorate every container.

Recommended four-level model:

1. **Sunken:** wells, canvases, or grouping backdrops.
2. **Default:** page and ordinary content surfaces; use whitespace or a subtle
   border before adding a shadow.
3. **Raised:** movable cards or one intentionally emphasized region.
4. **Overlay:** menus, dialogs, popovers, floating toolbars, and drawers that sit
   above other UI.

Atlassian reserves raised surfaces for movable cards or limited emphasis and
warns that excessive elevation creates visual noise; overlays are reserved for
UI placed over other UI ([Atlassian elevation](https://atlassian.design/foundations/elevation/)).
Fluent similarly treats elevation as a hierarchy and focus cue rather than a
general card effect ([Fluent elevation](https://fluent2.microsoft.design/elevation)).

Rules:

- Prefer flat surfaces, dividers, and spacing for dense data work.
- Use one tokenized shadow ramp and one consistent light direction.
- Pair shadow with a surface-color change in dark mode, where shadows alone may
  be hard to see.
- Do not use elevation as the only hover, pressed, selected, or focus cue.
- Avoid nested card-on-card shadows and decorative depth inside data tables or
  forms.

## 11. Empty, loading, success, and error states

### Empty states

Name the cause before choosing the treatment:

| State | Message | Primary response |
| --- | --- | --- |
| First use / no data yet | Explain what will appear and why it matters. | One clear creation or import action. |
| No search or filter results | Explain that current criteria found nothing. | Clear or edit search/filter criteria. |
| Completed / cleared | Confirm that there is currently nothing requiring attention. | Usually no forced action. |
| Permission | Explain that data exists but is unavailable. | Request access or return to a safe surface. |
| Configuration | Name the missing setup. | Start the first configuration step. |
| System failure | State what could not load without exposing internal codes. | Retry, view status/activity, or contact support. |

Carbon recommends a concise title, explanation, and at most one primary next
step for basic empty states; Atlassian defines an empty state as both the absence
of data and an explanation of what the user can do next
([Carbon empty states](https://carbondesignsystem.com/patterns/empty-states-pattern/),
[Atlassian empty state](https://atlassian.design/components/empty-state)).

### Loading states

- Preserve layout dimensions to prevent content and controls from jumping.
- Use a skeleton when the destination structure is known and the initial load
  takes more than an instant.
- Use an inline indicator for a local action such as saving or inviting.
- Use determinate progress when meaningful progress can be measured.
- Keep cancel, retry, or background-continuation options available for long or
  interruptible work.
- Announce busy, progress, success, and failure states without repeatedly
  stealing focus.

Carbon distinguishes initial skeletons, local inline loading, full-page loading,
and progressive loading, and calls for screen-reader notification of loading or
failure ([Carbon loading](https://carbondesignsystem.com/patterns/loading-pattern/)).

### Error and success states

- Place a local error next to the surface it affects. Use a page or section
  message only when the scope is page- or section-wide.
- State what happened, what is affected, and what the user can do next.
- Do not blame the user, invent a cause, or expose raw stack traces and codes.
- Keep retry and alternative paths close to the message.
- Use routine success feedback as a non-blocking status message; reserve modal
  confirmation for consequential outcomes.

Atlassian's error guidance recommends concise, scannable messages that explain
the problem and a next action rather than a vague acknowledgement
([Atlassian error messages](https://atlassian.design/foundations/content/designing-messages/error-messages)).

## 12. Reduced motion

### Normative and optional levels

- WCAG 2.3.1 at Level A limits content that flashes more than three times in a
  one-second period unless it stays below defined thresholds
  ([Three Flashes or Below Threshold](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold)).
- Disabling non-essential motion animation triggered by interaction is WCAG
  2.3.3 Level AAA, not an AA requirement. W3C documents
  `prefers-reduced-motion` as a sufficient technique
  ([Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions),
  [Technique C39](https://www.w3.org/WAI/WCAG22/Techniques/css/C39)).

### Recommended product behavior

- Respect `prefers-reduced-motion: reduce` everywhere, including charts,
  drawers, table-row movement, progress effects, and route transitions.
- Replace large translations, parallax, zoom, and spring effects with an instant
  state change or short opacity transition.
- Keep essential spatial continuity without vestibular motion; do not remove
  status, focus, or progress information with the animation.
- Never animate blur. Avoid layout animation that moves unrelated content while
  the user is editing or scanning data.
- Keep motion short, local to the initiating control, and interruptible.
- Provide another signal for any information conveyed through movement.

Fluent recommends a no-motion mode, short natural durations, constrained motion,
and non-motion alternatives such as live-region announcements
([Fluent motion](https://fluent2.microsoft.design/motion)).

## 13. Professional SaaS acceptance checklist

### Current WCAG 2.1 AA requirements

- [ ] Text, control, state, and graphic contrast meet WCAG 2.1 AA.
- [ ] Color is never the only state or status cue.
- [ ] Text works at 200% resize and with WCAG text-spacing overrides.
- [ ] Non-exempt page content reflows at an equivalent 320 CSS pixel width.
- [ ] Every function is keyboard operable and focus is visible.
- [ ] Labels, errors, correction suggestions, and dynamic status messages are
      programmatically available.
- [ ] Native table semantics or the complete ARIA grid interaction model is used.

### Forward WCAG 2.2 standards

- [ ] Focus is not entirely obscured by sticky or overlay content.
- [ ] Pointer targets meet 24 by 24 CSS pixels or a documented exception.

### Product conventions

- [ ] The external 14px/20px product benchmark has been considered, while the
      active Archestimator type roles remain governed by `design-doctrine.md`.
- [ ] Spacing uses a shared 4/8-derived token scale with no arbitrary offsets.
- [ ] Density is intentionally compact, standard, or touch-safe per surface.
- [ ] Paired form fields share label, control, and helper/error row alignment.
- [ ] Numeric table columns are right-aligned and use tabular figures.
- [ ] Table actions remain available on keyboard focus and coarse-pointer layouts.
- [ ] Empty, loading, no-results, permission, configuration, and failure states
      are distinct.
- [ ] Semantic color and elevation tokens describe role rather than raw appearance.
- [ ] Reduced-motion preference removes non-essential movement without removing
      information.

Stop refining when the interface meets the normative baseline, uses one coherent
density and token system, keeps the primary task legible and operable at narrow
and zoomed layouts, and presents every state with an understandable recovery path.
