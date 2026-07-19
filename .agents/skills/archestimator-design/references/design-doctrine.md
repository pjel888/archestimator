# Archestimator Design Doctrine

## Status And Scope

This is the project-specific synthesis for current design decisions. It turns
repo evidence, Apple sensibilities, professional SaaS conventions, and the
user's preference for compact type and precise spacing into operational rules.

It is not a frozen design system, a claim that current source is fully
conformant, or authority to rewrite working surfaces. Current user direction and
mounted source remain higher authority. `DESIGN.md` is alpha guidance, not law.

## Product Character

Archestimator should feel like a well-made estimating instrument and a document
you would trust:

- precise rather than precious;
- architectural rather than construction-themed;
- compact rather than cramped;
- calm rather than empty;
- state-rich rather than decorative;
- professional rather than enterprise-generic;
- content-first rather than chrome-first.

The Apple influence is behavioral: clear purpose, familiarity, consistency,
visible feedback, preserved context, semantic color, reversible actions, and
careful alignment. Never copy native Apple chrome, materials, assets, type
metrics, or device-specific measurements.

## Evidence In The Current Product

Preserve these strong patterns before proposing replacements:

- Semantic color, state, typography, and proposal tokens are centralized in
  `src/app/globals.css`.
- `WorkshopShell` provides a true full-browser work surface with persistent
  navigation and one flexible canvas.
- Shared `Button`, field, dropdown, overlay, table, tree, empty, loading, and
  error primitives encode real interaction states rather than visual-only
  shells.
- `DropdownSelect` preserves native form behavior while implementing keyboard,
  virtual-focus, typeahead, validation, and reset contracts.
- The estimate sheet preserves semantic headers, inline editing, tabular
  numerics, keyboard traversal, virtualization, and dense scanning.
- Route skeletons mirror final geometry; route errors announce and focus a
  useful recovery action.
- The public proposal-review surface adapts its navigation and action targets
  without abandoning task or security context.
- The mounted landing route uses editorial composition, real product UI,
  semantic sections, visible focus, and reduced-motion fallbacks.

These are patterns to reuse, not proof that every route complies. Current drift
includes route-local controls, inconsistent radii, large Client Portal chrome,
weak generic-table keyboard semantics, and incomplete adoption of reserved form
message rows. Treat those as review prompts, not precedents.

## Surface Registers

### Workshop Instrument

- Full-browser workspace; the grid, tree, form, or active work object dominates.
- Persistent context, low modality, keyboard acceleration, and tabular numerics.
- Neutral paper for dense content; restrained glass only for owning chrome.
- Regular outline icons, semantic tokens, compact controls, and visible state.
- One route-level canvas wash. Child cards, tabs, headers, and footers do not
  introduce competing page gradients.

### Public Editorial

- Narrative hierarchy, real product evidence, controlled asymmetry, and more
  breathing room than the workshop.
- Use Archestimator language and assets, not generic SaaS card grids, abstract
  gradient blobs, construction stock clichés, or inflated headline theater.
- Keep the primary desktop heading normally within 40–48px. Treat 56px as the
  default ceiling unless the user explicitly requests a larger campaign moment.
- Large spacing tokens belong to section rhythm, not every container.

### Interactive Proposal Review

- A responsive review application, not merely a printable document.
- Preserve proposal identity, active estimate, status, navigation, discussion,
  decisions, password or recipient state, and mobile decision access.
- Use readable sans-serif interaction UI and touch-safe targets while keeping
  the content document-like and calm.
- Preview, print, password, invalid, locked, and decision states are functional
  contracts, not optional polish.

### Formal Proposal Document

- Stable reading order, clear document hierarchy, paper surfaces, formal data
  tables, predictable page breaks, and durable print or export behavior.
- Use document typography for sustained reading. Do not import workshop
  microcopy scale or dashboard chrome into client-facing prose.
- Keep ornamental treatment subordinate to project, scope, price, exclusions,
  terms, and acceptance information.

## Typography And Hierarchy

The user dislikes big fonts. Use the smallest scale that maintains an obvious
hierarchy and remains usable; do not manufacture importance through size alone.

### Project Defaults

- Workshop titles: 12px.
- Workshop subtitles: 11px.
- Workshop body, controls, table values, and numerics: 10px.
- Workshop labels and metadata: 8–9px only when short and genuinely secondary.
- Public desktop primary heading: normally 40–48px, with 56px as the default
  ceiling unless explicitly overridden.
- Proposal-review and formal-document type may be larger where sustained reading
  or touch interaction requires it; keep the hierarchy restrained.

These values preserve the current register; they are not WCAG minimums. External
systems often use larger productive scales, and Apple native point sizes are not
CSS pixels. Use the research references as comparison evidence, not automatic
token migrations.

For a narrow compatibility change, preserve the existing shared scale. A future
readability or type-system evolution must be an explicit product task that
updates shared tokens, primitives, documentation, and enforcement coherently;
never create a larger or smaller route-local type island in anticipation.

### Safety Rules

- Never shrink below the established token to create density.
- Never use 8–9px for primary instructions, errors, field values, actions,
  decisions, totals, or information needed to complete a task.
- Use regular and medium weights for most product text. Reserve semibold for
  local emphasis; do not make every heading bold.
- Keep sentence case and zero or near-zero tracking in product UI. Avoid
  repeated uppercase eyebrows and wide tracking as a substitute for hierarchy.
- Use tabular numerals for quantities, rates, money, percentages, and changing
  metrics.
- Let essential text wrap or reveal fully. Do not hide critical values behind
  pointer-only tooltips or destructive truncation.
- Browser zoom to 200 percent and user text-spacing overrides must preserve
  content and function. Stack, wrap, scroll the genuine data grid, or expose a
  detail view rather than clip text.

Visual font size and interactive target size are separate decisions. A compact
glyph or label can sit inside a larger accessible target.

## Spacing, Gaps, And Alignment

Use a deliberate 4/8-led rhythm with project-specific intermediate values:

- 2px: rare optical correction only.
- 4px: glyph-to-label and very tight internal relationships.
- 8px: related controls, compact groups, and normal internal gaps.
- 12px: field stacks, row relationships, and medium internal padding.
- 16–20px: owning surface padding and normal app gutters.
- 24px: separation between distinct tasks or section groups.
- 32px: major document or editorial grouping when 24px is insufficient.
- 48–64px: public editorial section rhythm, not ordinary workshop whitespace.

Rules:

- Group with proximity before adding a divider, card, shadow, or heading.
- Align shared keylines, label baselines, control tops, numeric columns, and
  repeated edges. Small alignment errors are more damaging than modest density.
- Use one gap token consistently within a group. Do not alternate 10, 11, 13,
  and 15px to compensate for local visual drift.
- Fix the component or row that owns the relationship. Avoid transforms,
  negative margins, and one-field nudges.
- Preserve enough inset for chevrons, clear buttons, status icons, and suffixes;
  reserve matching end padding so text never collides with the affordance.

## Controls And Actions

- Reuse `Button`, `IconButton`, `ToolbarIconButton`, `SearchInput`, `Tabs`, and
  the other export-hub primitives before writing route-local controls.
- Use controls for meaning, not just appearance. A button, link, checkbox,
  select, menu, combobox, tab, and disclosure each have different keyboard and
  state contracts.
- Keep one clearly primary action per decision area. Do not make every action
  orange, filled, or equally loud.
- Icon-only actions need an accessible name, visible focus, a familiar regular
  outline icon, and a discoverable tooltip when the meaning is not universal.
- Model hover, focus, pressed, selected or current, disabled or read-only,
  loading, destructive, and success states separately.
- The current product target is WCAG 2.1 AA. Use WCAG 2.2's 24 by 24 CSS pixel
  target-size criterion, including its documented exceptions, as a forward
  product standard rather than mislabeling it as current 2.1 conformance.
  Compact visual controls can use padded hit areas; mobile and proposal-decision
  surfaces should use larger touch-safe targets.
- Orange is a scoped signal: logo, active navigation, approved estimate add or
  occupancy affordances, and named owner-approved exceptions. It is not the
  default workshop CTA color.

## Forms

Route all form geometry through `$archestimator-form-alignment`.

- A paired row is one contract: label baselines, control tops, control heights,
  helper or error slots, and responsive wrapping move together.
- Keep visible labels. Place essential format or decision guidance outside the
  placeholder.
- Reserve a supporting-message row when conditional helper or error text would
  otherwise shift only one adjacent field. Replace helper with error in the same
  slot where practical; allow the slot to grow and the row to stack at enlarged
  text sizes.
- Associate descriptions and errors programmatically, expose invalid state, and
  state the problem and remedy in text. Never rely on a red border alone.
- Preserve user input after validation failure and distinguish disabled from
  read-only.
- Keep chevrons, clear buttons, units, and suffix actions inset from the border
  with explicit end padding and real targets.

## Tables, Trees, And Estimating Grids

- Use native table semantics for read-only tabular content. Use a managed ARIA
  grid only for a genuinely spreadsheet-like composite with its full keyboard
  contract.
- Preserve sticky or frozen context where it materially improves scanning.
- Keep headers concise, numbers right-aligned with their headers, and financial
  values tabular.
- Distinguish hover, current or selected, keyboard focus, editing, invalid,
  busy, drag source, and drop target states.
- Keep inline editing, keyboard traversal, virtualization, and focus recovery
  when they are part of the existing estimate or tree contract.
- Do not replace the specialized estimate sheet with generic `DataTable`.
- Genuinely two-dimensional data can scroll within a labelled region; the whole
  page, filters, instructions, and actions still reflow.

## Overlays And Disclosure

Choose by behavior, not visual resemblance:

- Modal or alert dialog: blocking decision, focus trap, background inertness,
  Escape and opener restoration, clear title and action order.
- Sheet: adjacent task or inspector with explicit modality and dismissal.
- Popover: lightweight contextual content anchored to a control.
- Menu: commands with roving focus.
- Select or combobox: value selection, form semantics, active-option behavior,
  typeahead, and reset rules.

Prefer persistent workspace context, inline editing, an inspector, or progressive
disclosure over modal depth. Never stack blur, nested glass, or multiple
independent escape contracts to make an ordinary task feel important.

## Color, Surfaces, And Elevation

- Use semantic tokens rather than raw decorative colors.
- Never communicate state with color alone; pair hue with text, icon, shape,
  pattern, or position as appropriate.
- Meet 4.5:1 contrast for normal text and 3:1 for large text and meaningful
  non-text boundaries where WCAG applies. Review every interactive state, not
  only the default appearance.
- Paper holds dense content. Glass frames owning chrome. Use one blur and one
  shadow stack per region, with reduced-transparency and unsupported-filter
  fallbacks.
- Default workshop radii remain 3px dense internals, 8px glass controls, and
  12px owning floating surfaces. Existing 6px or 10px local values are scoped
  implementation facts, not new system defaults.
- Avoid nested cards, rounded rectangles around every group, thick side accents,
  gradient text, decorative orange, and elevation without functional hierarchy.

## Motion And Feedback

- Motion explains state, continuity, or causality; it does not perform the brand.
- Keep ordinary UI transitions approximately 120–250ms and local to opacity,
  color, border, small transform, or geometry that clarifies a state change.
- Avoid page choreography, parallax, animated blur, repeated scaling, and layout
  transitions on dense grids.
- Respect `prefers-reduced-motion`; preserve the state change without large
  travel, spin, spring, or pulsing.
- Loading preserves geometry, uses status semantics, and does not erase current
  task context. Errors announce, explain recovery, and focus the next useful
  action when focus movement is warranted.

## Responsive Behavior

- Adapt structure by task priority, not by inflating or fluidly scaling product
  typography.
- Preserve the active work object, primary action, status, and recovery path.
- Stack paired fields together; wrap toolbars by logical group; move secondary
  panes to labelled drawers or routes without deleting their information.
- Keep genuine tables or canvases in their own deliberate scroll region rather
  than making the entire page scroll horizontally.
- Maintain stable names, grouping, order, and focus behavior as panes collapse.

## Copy And Content

- Use controlled confidence and concrete construction or estimating vocabulary.
- Prefer short verbs and direct labels. Explain consequences before destructive,
  irreversible, or externally visible actions.
- Avoid generic SaaS hype, fake precision, clever error copy, emojis as product
  icons, and jargon that hides the estimating task.
- Keep empty states useful: what is empty, why it matters, and the next relevant
  action. Do not fill them with decorative illustration by default.

## Anti-Patterns

Reject these unless the user explicitly requests and the register supports them:

- oversized hero or app typography used as the main composition;
- generic card grids for content that belongs in a table, tree, list, or document;
- construction clichés, blueprint wallpaper, hard-hat imagery, or orange as a
  generic theme;
- gradient text, glowing borders, decorative side rails, glass within glass,
  pill-shaped everything, and excessive rounding;
- repeated tiny uppercase eyebrows, arbitrary tracking, and semibold on every
  label;
- hidden primary actions, critical information in tooltips, or pointer-only row
  interactions;
- local copies of shared controls, one-off spacing offsets, or new design-token
  islands;
- copying Apple platform chrome or treating external design-system dimensions
  as universal requirements.

## Decision Test

Before accepting a design choice, ask:

1. Does it clarify the estimating or review task?
2. Does it preserve the correct surface register and current source reality?
3. Is hierarchy carried first by content, order, alignment, and spacing?
4. Does it reuse the owning primitive and model the complete state matrix?
5. Is the compactness achieved without inaccessible targets, hidden focus,
   clipped content, or microscopic essential text?
6. Would removing the decoration make the interface clearer? If yes, remove it.
