# Archestimator Design Review Rubric

Use this rubric for source reviews, design-artifact reviews, implementation
reviews, and completion checks. Do not call a source-only review a visual audit.

## Evidence Class

Declare one class before reviewing:

- **Source review** — mounted route, components, tokens, semantics, and diff.
- **Artifact review** — supplied mockup, specification, or static design file.
- **Visual audit** — current screenshots of a specified flow and states.
- **Design QA** — source visual and rendered implementation captured at the same
  state and viewport.

`$product-design:audit` requires the visual-audit class. `$product-design:design-qa`
requires the design-QA class. Browser capture, screenshots, Storybook, and visual
QA are profile-selected local evidence under repository policy. If the
required evidence is absent, downgrade the claim rather than inventing proof.

## Severity

- **Critical** — blocks task completion, access, comprehension, recovery,
  security, or a normative accessibility requirement.
- **Important** — materially weakens the surface register, hierarchy, reuse,
  state clarity, responsive behavior, or project doctrine.
- **Minor** — localized polish issue with low task risk.
- **Observation** — evidence or future opportunity, not a defect claim.

Every finding names the surface, state, evidence, impact, and smallest owning
fix. Separate verified facts from inference.

## Review Gates

### 1. Authority And Register

- The mounted route and active imports were resolved.
- The surface is classified as workshop instrument, public editorial,
  interactive proposal review, or formal proposal document.
- Current user direction and source override stale prose, prototypes, and old
  screenshots.
- No visual rule has leaked from another register without a named reason.

### 2. Task And Hierarchy

- The primary work object, action, status, and recovery path are obvious.
- Order, proximity, alignment, and spacing establish hierarchy before size,
  color, shadow, or cards.
- Workshop chrome remains quiet and the active grid, tree, form, or document
  dominates.
- Public hierarchy is editorial but avoids oversized headline theater; the
  normal desktop primary heading stays within 40–48px and the default ceiling
  is 56px unless explicitly overridden.

### 3. Typography And Density

- Product type follows the compact 12/11/10/8–9px role system or an explicit
  scoped exception.
- 8–9px is reserved for short secondary metadata, never primary instructions,
  errors, actions, values, decisions, or totals.
- Tabular numerals are used where changing financial values must align.
- Weight, case, and tracking remain restrained; hierarchy is not all bold,
  uppercase, or oversized.
- Essential text can reveal fully, zoom to 200 percent, accept user text
  spacing, and reflow without overlap or loss of function.

### 4. Spacing And Geometry

- Gaps follow the 4/8-led project rhythm and consistently express grouping.
- Repeated keylines, baselines, control tops, numeric columns, and edges align.
- Surface padding is normally 16–20px in the workshop; 48px-plus gaps remain
  editorial exceptions rather than generic app whitespace.
- No negative margin, transform, or one-off offset compensates for a shared
  component or row-contract defect.

### 5. Components And States

- Existing export-hub primitives and assets are reused before local controls or
  new abstractions are introduced.
- Default, hover, focus, active or selected, disabled or read-only, loading,
  empty, error, success, responsive, and reduced-motion states are covered as
  applicable.
- Icon-only controls have an accessible name, visible focus, and discoverable
  meaning.
- Visual target size and hit target are evaluated separately. The current
  product target is WCAG 2.1 AA; review 24 by 24 CSS pixels or a valid exception
  as a forward WCAG 2.2 criterion, and expand touch surfaces.

### 6. Forms

- `$archestimator-form-alignment` was applied.
- Labels, control tops and heights, helper or error slots, and paired responsive
  wrapping form one row contract.
- Conditional messages do not shove one adjacent control out of alignment.
- Chevrons, clear buttons, suffixes, and status icons have reserved end padding
  and inset targets.
- Labels remain visible; errors identify the problem and remedy in text; helper
  and error relationships are programmatic; user input survives failure.

### 7. Tables, Trees, And Grids

- The semantic model matches the behavior: table for tabular content, ARIA grid
  only for a managed composite, specialized estimate sheet preserved.
- Headers, numeric alignment, sticky context, selection, focus, editing,
  invalid, drag, busy, and virtualization behavior are preserved.
- Keyboard traversal and focus recovery remain equivalent to pointer behavior.
- Two-dimensional scrolling is isolated to the real data region rather than
  forcing the entire page to scroll horizontally.

### 8. Overlays And Disclosure

- Modal, sheet, popover, menu, select, and combobox were chosen by modality,
  focus, and dismissal contract rather than shape.
- Blocking overlays trap and restore focus and prevent background interaction.
- Common actions remain visible; advanced controls use shallow progressive
  disclosure without hiding critical work.
- There is no nested modal depth, competing escape behavior, or stacked glass.

### 9. Color, Surfaces, Motion, And Feedback

- Semantic tokens carry meaning and state never depends on color alone.
- Text and meaningful non-text boundaries meet applicable contrast criteria in
  every relevant state.
- Orange remains a scoped signal, not a generic workshop CTA or decoration.
- Paper holds content; glass frames owning chrome; elevation maps to hierarchy
  and uses one shadow or blur stack per region.
- Motion is approximately 120–250ms, explains state, and has a reduced-motion
  equivalent. Loading preserves geometry; errors announce and offer recovery.

### 10. Responsive And Content Quality

- Structural adaptation preserves task context, primary action, status, and
  recovery rather than fluidly enlarging product typography.
- Fields stack as a unit, toolbars wrap by group, and secondary panes remain
  available through a labelled equivalent.
- Copy uses direct estimating language, controlled confidence, and clear action
  consequences.
- The result avoids generic SaaS hype, construction clichés, decorative cards,
  gradient text, emoji icons, thick side accents, and pill-shaped everything.

## Workflow Routing Check

- Product critique or polish: `$impeccable` inside the Archestimator register.
- Public or brand anti-slop review: `$hallmark`, subordinate to the public
  register and restrained type ceiling.
- External evidence: `$product-design:research` or `$research`, with primary
  sources and requirements separated from conventions.
- Current screenshot flow audit: `$product-design:audit` when selected.
- Source-to-rendered parity: `$product-design:design-qa` when selected.
- Any field-row or field-chrome work: `$archestimator-form-alignment`.

## Forward Tests

The skill should lead to these outcomes without extra hidden assumptions:

1. **Paired product form** — shared fields, aligned labels and controls, reserved
   helper or error slots, inset chevron and clear action, compact text, full
   keyboard and invalid states.
2. **Estimate grid** — existing specialized grid retained, 10px tabular values,
   sticky context, distinct selection and focus, keyboard-safe editing, no
   generic card conversion.
3. **Public landing** — editorial composition with real product evidence,
   40–48px primary heading, disciplined section gaps, no generic SaaS grid or
   construction cliché.
4. **Proposal work** — interactive review and formal document are classified
   separately; touch, security, print, and reading contracts are not conflated.
5. **Audit request without screenshots** — returns a source-review plan or
   explicit evidence gap, not a fabricated visual audit.
6. **Design-QA request without a reference pair** — identifies the missing
   source or rendered evidence and stops before claiming parity.

## Completion Standard

Pass only when there are no Critical or Important findings, the evidence class
matches the claim, the requested register and states are covered, the project
validators pass, and any unavailable visual proof is stated as a gap rather
than implied.
