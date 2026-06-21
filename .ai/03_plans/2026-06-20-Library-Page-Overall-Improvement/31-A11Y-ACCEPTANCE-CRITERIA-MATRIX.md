# 31 — Accessibility Acceptance Criteria Matrix

> **Status:** Living document. Initialized 2026-06-21 by the Ultrawork audit
> loop. Defines the a11y acceptance criteria for every Library surface. Every
> actionable row must declare its a11y pass condition.
>
> **Scope:** Keyboard, screen reader, focus, contrast, motion, ARIA, live
> regions, and per-surface a11y acceptance criteria.
>
> **Companion docs:** [12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md](12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md),
> [06-QA-AND-VALIDATION-PLAN.md](06-QA-AND-VALIDATION-PLAN.md),
> [18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md](18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md),
> [27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md](27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md).

---

## 1. Purpose

Accessibility is a first-class contract, not a post-hoc check. This doc:

1. **Defines the a11y standard** — WCAG 2.1 AA + Library-specific requirements.
2. **Defines the testing matrix** — manual, axe, screen reader, keyboard.
3. **Defines per-surface acceptance criteria** — pass conditions for each surface.
4. **Resolves C-014** from [26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md) — axe harness is Phase 0A deliverable.
5. **Defines verification** — how to confirm a11y compliance.

---

## 2. A11y standard

### WCAG 2.1 AA (baseline)

| Principle | Requirement | How to verify |
|---|---|---|
| Perceivable | All content is programmatically determinable | axe + manual review |
| Operable | All functionality is keyboard accessible | Keyboard test (Tab, Enter, Space, Esc, Arrow) |
| Understandable | Content is readable and predictable | Manual review + copy review |
| Robust | Compatible with assistive technologies | Screen reader test (VoiceOver, NVDA) |

### Library-specific requirements

| Requirement | Standard | How to verify |
|---|---|---|
| Focus visible | Focus indicator ≥ 2px, contrast ≥ 3:1 | Manual review + axe |
| Touch target | ≥ 44×44px (mobile) | Playwright measurement |
| Color contrast | AA: 4.5:1 (normal text), 3:1 (large text) | axe + manual review |
| Motion | `prefers-reduced-motion` respected | Manual review |
| Live regions | State changes announced via `aria-live` | Screen reader test |
| Focus trap | Overlays trap focus, return on close | Keyboard test (Playwright) |
| Skip link | Skip to main content link present | Manual review |
| Heading hierarchy | H1 → H2 → H3, no skipped levels | axe |
| ARIA roles | Correct role per element | axe + manual review |
| Label association | Every input has associated label | axe |

---

## 3. Testing matrix

### Test types

| Test type | Tool | Phase | Gate |
|---|---|---|---|
| Manual keyboard | Keyboard + DevTools | 0A–5 | Pre-merge |
| Manual screen reader | VoiceOver (macOS), NVDA (Windows) | 1, 5b, 6 | Phase exit |
| axe automated | axe-core (jest-axe or Playwright) | 0A (config) → 5 | Pre-merge (post-0A) |
| Playwright a11y | Playwright + axe | 5b, 6 | Phase exit |
| Visual focus review | Screenshot focus state | 1, 5b, 6 | Phase exit |

### axe harness (Phase 0A deliverable)

Per [26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md) C-014:

- **Pre-0A:** axe is NOT configured. a11y is manual only.
- **0A:** configure axe-core via `jest-axe` for jsdom tests + `@axe-core/playwright` for Playwright.
- **Post-0A:** axe is a pre-merge gate. All Library components must pass `expect(await axe(page)).toHaveNoViolations()`.

### Screen reader testing

| Screen reader | Browser | Phase | Surfaces |
|---|---|---|---|
| VoiceOver | Safari (macOS) | 1, 5b, 6 | All Library surfaces |
| VoiceOver | Safari iOS | 6 | Mobile surfaces |
| NVDA | Firefox (Windows) | 6 | All Library surfaces |

---

## 4. Per-surface acceptance criteria

Every surface in [10-LIBRARY-SURFACE-SPECS.md](10-LIBRARY-SURFACE-SPECS.md) must pass:

| Surface | Keyboard | Screen reader | Focus | ARIA | Live region | Motion | Contrast |
|---|---|---|---|---|---|---|---|
| Library overview | Tab through grid, Enter opens inspector | H1 "Library", grid role="grid", items role="row" | Focus visible on grid + items | role="grid", aria-rowcount, aria-colindex | n/a | n/a | AA |
| Component card | Tab to card, Enter opens inspector, Shift+Tab reverse | role="gridcell", aria-label with component name + trust state | Focus visible | aria-selected on select | n/a | n/a | AA |
| Component inspector | Tab through fields, Esc closes | role="region", aria-label="Component inspector" | Focus trap inside, return to trigger on close | aria-labelledby for fields | n/a | Slide-in respects reduced-motion | AA |
| Quick add form | Tab through fields, Enter submits, Esc cancels | role="form", aria-label="Quick add component" | Focus first field on open, return to trigger on close | aria-required, aria-invalid, aria-describedby for errors | Error announcements via aria-live="polite" | n/a | AA |
| Folder management | Tab through tree, Arrow keys navigate, Enter opens, Context menu key | role="tree", role="treeitem", aria-expanded | Focus visible on tree items | aria-level, aria-expanded, aria-selected | n/a | n/a | AA |
| Template preview | Tab through preview, Enter inserts | role="region", aria-label="Template preview" | Focus trap in preview modal | aria-labelledby | n/a | n/a | AA |
| Overlay/modal | Tab trap, Esc close, Shift+Tab reverse | role="dialog", aria-modal="true", aria-labelledby | Focus trap, return to trigger | aria-modal, aria-labelledby | Open announcement via aria-live="polite" | Fade respects reduced-motion | AA |
| Trust chip | Tab to chip, Enter shows tooltip | role="img" or span with aria-label="{state} trust" | Focus visible | aria-label with full trust text | State change via aria-live="polite" | n/a | AA (amber on white: 4.5:1+) |
| Search/filter | Tab to input, type to search, Tab to filter chips | role="search", aria-label="Search library" | Focus visible on input + chips | aria-label, aria-placeholder | Results count via aria-live="polite" | n/a | AA |
| Dense mode row | Tab through rows, Arrow keys navigate | role="row", aria-label with summary | Focus visible | aria-selected | n/a | n/a | AA |
| Public snapshot | Tab through frozen view | role="region", aria-label="Public snapshot" | Focus visible | n/a | n/a | n/a | AA |

### Acceptance template (for every actionable row)

```
A11y: <criterion> | <test type> | <pass condition>
```

Examples:
```
A11y: focus-trap | Playwright | Tab cycles within overlay, Esc closes, focus returns to trigger
A11y: aria-live | Screen reader | State change announced by VoiceOver
A11y: contrast | axe | 4.5:1 minimum for text on background
A11y: keyboard-nav | Keyboard test | All actions reachable via Tab + Enter + Esc
A11y: n/a (non-interactive display only)
```

---

## 5. ARIA live region contract

State changes must be announced via `aria-live`:

| State change | aria-live value | Copy key | Example |
|---|---|---|---|
| Search results loaded | polite | `search.result_announcement` | "12 results found" |
| Filter applied | polite | `filter.applied_announcement` | "Filter applied: stale components" |
| Trust state changed | polite | `trust.state_change_announcement` | "Component trust updated to fresh" |
| Component added | polite | `component.added_announcement` | "Component added to library" |
| Component archived | polite | `component.archived_announcement` | "Component archived" |
| Component deleted | assertive | `component.deleted_announcement` | "Component permanently deleted" |
| Error occurred | assertive | `error.announcement` | "Error: unable to load library" |
| Overlay opened | polite | `overlay.opened_announcement` | "Component picker opened" |
| Overlay closed | polite | `overlay.closed_announcement` | "Component picker closed" |
| Permission denied | assertive | `permission.denied_announcement` | "You do not have permission to view this component" |

### Rules

1. **Use `polite` for non-urgent updates** — results, filters, state changes
2. **Use `assertive` for urgent updates** — errors, destructive actions, permission denied
3. **Never use `off`** — if it doesn't need announcement, don't add aria-live
4. **Test with real screen reader** — aria-live behavior varies across browsers
5. **Keep announcements short** — 1-3 words ideal, max 1 sentence

---

## 6. Focus management contract

### Overlay/modal

1. **On open:** focus moves to first focusable element inside overlay (or the overlay itself)
2. **While open:** Tab cycles within overlay (focus trap), Shift+Tab cycles in reverse
3. **On close:** focus returns to the element that triggered the overlay
4. **Esc:** closes the overlay (same as cancel button)

### Route transition

1. **On route change:** focus moves to page H1 (or main content)
2. **On back:** focus returns to the element that triggered the navigation

### List/grid navigation

1. **Tab:** enters the grid, focuses first item
2. **Arrow keys:** navigate within grid (up/down/left/right)
3. **Enter:** activates the focused item (opens inspector)
4. **Tab:** exits the grid to next focusable element

### Form navigation

1. **Tab:** moves to next field
2. **Shift+Tab:** moves to previous field
3. **Enter:** submits the form (or activates focused button)
4. **Esc:** cancels the form

---

## 7. Reduced motion contract

1. **Respect `prefers-reduced-motion: reduce`** — disable non-essential animations
2. **Overlay fade:** instant (0ms) when reduced motion is set
3. **Panel slide:** instant (0ms) when reduced motion is set
4. **Chip transitions:** instant (0ms) when reduced motion is set
5. **Skeleton shimmer:** static (no animation) when reduced motion is set
6. **Essential motion:** allowed (e.g., progress bar) but minimal

### Implementation

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 8. Verification

```bash
# axe harness configured (post-0A)
rg "jest-axe|@axe-core/playwright" package.json
# Expected: axe-core dependency present after Phase 0A

# Every Library component has an axe test
rg "toHaveNoViolations" src/components/library/ --type ts --type tsx
# Expected: every component has an axe test

# Every actionable row has an A11y: field
rg "A11y:" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" --count
# Expected: 26+ files with A11y: rows (after Wave 2)

# aria-live regions present for state changes
rg "aria-live" src/components/library/ --type tsx
# Expected: matches the live region contract in §5

# Focus management in overlays
rg "focus-trap|FocusTrap" src/components/library/ --type tsx
# Expected: every overlay uses a focus trap primitive
```

---

## 9. Gap closure

### Current state

- Doc 12 defines responsive/a11y contract but doesn't tabulate per-surface ✓
- Doc 06 warns axe harness is missing ✓
- Doc 18 has a11y-related ADV rows ✓
- No per-surface a11y acceptance criteria (this doc fills that gap)
- No live region copy table (this doc defines it)
- No focus management contract per surface (this doc defines it)

### Required updates to other docs

- [12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md](12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md): add per-surface a11y criteria references to this doc
- [06-QA-AND-VALIDATION-PLAN.md](06-QA-AND-VALIDATION-PLAN.md): add axe test matrix references to this doc
- [22-COPY-DECK-AND-MICROCOPY.md](22-COPY-DECK-AND-MICROCOPY.md): add live region copy keys from §5
- [10-LIBRARY-SURFACE-SPECS.md](10-LIBRARY-SURFACE-SPECS.md): add `A11y:` field per surface row
- Every doc with actionable rows: add `A11y:` field per row

---

## 10. Sign-off

| Reviewer | Verdict | Date | Notes |
|---|---|---|---|
| A11y lead | pending | — | — |
| Frontend lead | pending | — | — |
| Design lead | pending | — | — |
| Reviewer gate (Oracle) | pending | — | — |

The a11y matrix is complete when:
1. Every surface in §4 has a pass condition for each a11y dimension.
2. axe harness is configured (post-0A) and every component passes.
3. Every live region copy key from §5 is in [22](22-COPY-DECK-AND-MICROCOPY.md).
4. Every overlay implements the focus management contract (§6).
5. All four reviewers sign off above.
