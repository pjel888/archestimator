---
title: Express Components — UX / UI & Accessibility Assessment
type: docs
date: 2026-06-15
auditor: Claude (Opus 4.8, 1M context)
purpose: Does the plan analyze UX/UI adequately? What states, keyboard behavior, virtualization, focus, a11y, and copy are missing?
---

# UX / UI & Accessibility Assessment

**Rating: UX coverage 52/100 · accessibility 55/100 · design-system compliance 60/100 ·
interaction-state completeness 48/100.** The UX doc (03) has the right *instincts* — inline
spreadsheet feel, blur/Enter commit, Escape revert, aria-live, tree-role reuse — but it states
goals where it needs mechanisms, and it omits the two hardest UX realities of this surface: a
**fixed-height virtualizer** and a **grid keyboard handler that will fight text editing**.

---

## 1. Interaction states — incomplete and partly invented

**Finding (B2-F3):** doc 03 says it reuses `saveState`, but `EstimateSaveState` has exactly **5
values** (`idle / dirty / saving / saved / failed`), is **hook-global, not per-row**
(`use-estimate-row-mutations.ts:11,103-122`), and the doc **invents a "Creating" indicator** that
doesn't exist.

The express editor actually needs ~14 states, none fully enumerated:

`new/empty (pre-keystroke)` · `creating (insert in flight)` · `draft-insert-failed (Retry/Delete)` ·
`clean` · `dirty (focused)` · `saving` · `saved` · `failed (inline error + retry)` · `detached` ·
`linked-clean` · `linked-overridden` · `source-changed` · `promoting` · `promote-failed`.

**Action:** add a **state spec** (recommended doc `09-express-editor-state-and-copy-spec.md`) with,
per state: visual treatment, which `saveState`/flag drives it, and the aria-live announcement.
Decide explicitly whether to extend the 5-value machine + add per-row tracking, or derive a
"creating" indicator from the buffered-insert flag.

## 2. Keyboard model — the critical unresolved conflict

**Finding (B2-F1, verified CRITICAL):** `handleEstimateCellKeyDown` (`cells.tsx:45-73`)
**unconditionally `preventDefault`s** Enter (then blur/commit) and ArrowLeft/Right (moves cells),
and is attached to numeric cells (`row-table.tsx:254/310/345`). doc 03 says "arrow nav should not
hijack text editing" but provides **no carve-out mechanism**. As written, caret movement inside an
express text input will be hijacked.

**Required policy (must be written into the plan):**
- Express text fields do **NOT** use `handleEstimateCellKeyDown`.
- `ArrowLeft/Right/Home/End` pass through to the caret.
- `ArrowUp/Down` move rows **only** when caret is at field boundary (or never, for text fields).
- `Enter` commits single-line fields; in a multi-line description, define Enter vs Shift+Enter.
- `Escape` reverts the focused field to last saved value.
- `Tab` order: express fields → numeric cells; decide tabbability of the icon rail / drag handle
  during edit.

## 3. Focus management — collides with existing behavior

**Finding (B2-F4):** the `pendingFocusRowId` effect (`EstimateSheetContent.tsx:1652-1664`)
hard-targets `[data-estimate-cell-index='0']` (the **quantity** input) and `scrollIntoView+focus`.
The express **name** field has no cell-index, so the effect can't focus it and would **override**
name focus on insert.

**Action:** branch the pending-focus effect for express rows to target the name input (e.g.
`data-express-field="name"`), suppress quantity-cell focus for express inserts, and define
post-commit / post-Escape / failed-save / draft-retry focus targets. Add focus assertions to QA Q1.

## 4. Virtualization vs an expanding editor — the silent layout bug

**Finding (A2-F1, verified CRITICAL):** the row virtualizer is **fixed-height**:
`row-table.tsx:421 estimateSize: () => virtualization.estimateRowHeight ?? 96`, **no
`measureElement`**, absolute `translateY(index*96 - scrollMargin)` stride
(`row-table.tsx:594-600`), engaging at **≥75 rows** (`:417`). An express editor that grows beyond
96px (multi-line description, inline error, image control) will **overlap the next row**. doc 03's
"keep height stable / disable virtualization for active rows" and RSK7's "verify with browser
smoke" are not a decision.

Sibling virtualizers **do** measure dynamically — `tree.tsx:1281` and `virtual-branch-list.tsx:143`
both attach `ref={rowVirtualizer.measureElement}`. row-table is the only one that doesn't.

**Action (pick ONE, write it into U4 + RSK7):**
- (A) Port `measureElement` + `data-index` from `tree.tsx:1281` (dynamic measurement) — handle
  scroll-jump when a measured row changes height mid-edit (`scrollToIndex` at `row-table.tsx:433/442`).
- (B) Hard-cap the active editor at ≤96px (truncate/scroll description internally).
- (C) Disable virtualization for the active row only.

**QA gap (A2-F4):** the browser-smoke "add a row, verify no overlap" runs in the **non-virtualized
path** (small estimate <75 rows) where overlap can't reproduce. Add a **≥75-row repro case** (seed
or lower `minRows`), confirm `data-estimate-row-virtualizer="true"`, then activate an editor on a
mid-list row.

## 5. Accessibility — right list, two real defects

- **Contrast (B2-F2):** existing material meta renders at `#7F7F7F` (~3.5:1) and `#5D5D5D@60%`
  (~2.6:1) on white at 10–11px — **both fail WCAG AA 4.5:1**. The plan reuses these for the new
  editor with no contrast floor. **Action:** require load-bearing express text (name, description,
  unit, supplier, unit cost) at **`#5D5D5D` secondary or stronger** (`#3D3D3D` ink for active
  values); reserve `#7F7F7F` for non-load-bearing decoration only. (Matches the standing project
  memo: `#7F7F7F` is DESIGN.md-sanctioned but fails AA.)
- **Good and should stay:** explicit field labels qualified by row name, focus rings, aria-live
  for create/save/fail/retry/promote, `aria-invalid`/`aria-describedby` on failed fields, reuse of
  `tree.tsx` `role="treeitem"`/`aria-*` wiring for the Project folder.
- **Add:** the live-region politeness level per event, and the error-id wiring shape
  (`aria-describedby` → inline error element id).

## 6. Microcopy — undefined

doc 03 leaves all new strings unspecified (B2-F5): field labels/placeholders, the replacement for
the "Drag or add a component here" empty-slot copy, the failed-save sentence, Retry/Delete-draft
button labels, and the promotion-confirmation copy. **Action:** put them in the state/copy spec
with their design token + AA-contrast note. (Also flags **i18n**: confirm whether the app has a
localization convention these must follow vs hard-coded English — currently unverified.)

## 7. Mobile / touch — zero coverage (and it makes the criticals worse)

No plan doc mentions mobile, touch, breakpoints, or on-screen keyboards. Touch has **no arrow
keys** (so the §2 keyboard escape hatch doesn't exist) and on-screen keyboards resize the viewport
mid-edit (worsens §4 overlap). **Action:** at minimum, state the supported viewport for day-0 and
add a narrow-width + touch row to QA, or explicitly descope mobile with a rationale.

---

## What the UX doc gets right (keep)

The inline-not-modal principle, blur/Enter-commit + Escape-revert, the project-folder IA
(Express / Project-specific children under a Project root), the make-project-specific behavior
table by link-state, the "no new top-level tab / no embedded library editor" non-goals, and the
explicit accessibility checklist are all sound and should be preserved verbatim. The gaps are in
**mechanism, not intent.**
