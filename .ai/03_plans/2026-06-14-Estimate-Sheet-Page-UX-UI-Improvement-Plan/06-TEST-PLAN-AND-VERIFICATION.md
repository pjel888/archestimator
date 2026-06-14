# Test Plan & Verification

Companion to `05-IMPLEMENTATION-PLAN.md`. Every requirement lists: tests to **update** (existing assertions that change), tests to **add** (new guards), and **manual verification**. Plus the global validation gate and a pre-flight checklist.

---

## Validation gate (run after EVERY task land)

```bash
# use nvm node v25.8.0
vitest run                      # full suite (DOM-suite sensitive; run alone)
tsc --noEmit
eslint .                        # or the repo's lint script
```
Then: clear the **Codex review gate** (`/codex:review` per CLAUDE.md), then `git push origin HEAD:main` (never `checkout main` locally). High-risk tasks (C1) also require a manual smoke + a Codex adversarial pass.

**Perf suite must stay green** (run explicitly after Req 4 / Req 10-D2):
```bash
vitest run tests/vitest/perf/estimate-sheet-render-relief.test.tsx \
           tests/vitest/perf/estimate-sheet-render-baseline.test.tsx \
           tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx \
           tests/vitest/route-transition-peak-load-profile.test.tsx
```

---

## Per-requirement test matrix

### Req 1 — Relocate XLSX + Activity (HIGH)
- **Update:** `project-chrome-streaming.test.ts` (skeleton/chrome node-count parity — add the two buttons to both); `estimate-sheet-cost-inputs.test.tsx:681-689,279-281` (buttons now in chrome `banner`, not "Tab tools"); `proposal-export-preview.test.tsx:100-150` (opener locator → chrome).
- **Add:** `estimate-header-actions.test.tsx` — store register/clear; button renders beside Share with names "Activity"/"Preview Excel Export"; Excel disabled when `!canPreviewExport`; renders nothing off estimate route.
- **Manual:** open both dialogs from the new header; verify disabled state with no export metadata; navigate off-estimate → buttons gone; **no hydration warning in console**.

### Req 2 — Teamspace icon-only (MED)
- **Update:** `teamspace-collaboration-header.test.tsx:149-156` (single "Teamspace" icon button; no faces/"Manage access" text; opens Share modal; no settings gear).
- **Manual:** ShareModal still lists roster + online dots; `ProjectCursorLayer` identity resolves; presence hooks intact.

### Req 3 — Panel header borders (MED)
- **Add:** `tree-panel-header-border.test.tsx` (root has `border-b border-hairline`).
- **Confirm-unchanged:** `live-estimate-node-route.test.ts:77,81`.
- **Manual:** all 3 estimate panels + 9 other consumers — consistent bottom border; **no double-border** at `TemplateGallery.tsx:241`, `ComponentLibraryManager.tsx:875`.

### Req 4 — Node icon orange (LOW)
- **Add:** `estimate-tree-node-icon.test.tsx` — occupied area → `text-orange-600`, empty → `text-tertiary`; sidebar-mounted render-isolation (keystroke/selection doesn't re-render unrelated rows).
- **Confirm-unchanged:** `estimate-mixed-content.test.tsx:132` (sr-only label untouched).
- **Manual:** add/remove a component in the right table → left circle flips grey↔orange live (validates `localNodes` sync). If it lags, file a follow-up.

### Req 5 — Add-area orange (LOW)
- **Add:** assertion in B1's test that the add-area `addActions` button carries `ADD_BUTTON_CLASSNAME`.
- **Manual:** light-orange resting bg, darker on hover, pointer cursor.

### Req 6 — Add-tab orange → covered in **C3** (the button's new location). See Req 13.

### Req 7 — Right sidebar restructure (MED)
- **Update:** `component-library-ui.test.tsx:199-212` (top header no longer lists Add Component/Template), `:218-219` (sticky-header child count = 2 → new row is external sibling), `:242-255` (click "Add Component" resolves to new row).
- **Manual:** top header = search + Expand/Collapse only; new under-tabs row matches 38px header-icon-div height + bottom border.

### Req 8 — Source dropdown boxed (MED→LOW)
- **Update:** `component-library-ui.test.tsx:1086-1108` (combobox role + option clicks preserved; now `variant="boxed"`); `ui-dropdown-select.test.tsx` (default underline unchanged; new boxed case).
- **Manual:** dropdown looks like a real select box, height matches the 40px tabs above it, full-width.

### Req 9 — Middle padding (LOW)
- **Add (optional):** assert rows container className includes `pt-2`.
- **Manual:** 8px top gap below tab strip; sticky node/column headers pin correctly; no double-gap; empty-tab state matches.

### Req 10 — Filter/Group functional (MED-HIGH)
- **Update:** `header-icon-toolbar-ui.test.tsx:11-12,25-26,33+` (handler-gated render + separator); `estimate-sheet-cost-inputs.test.tsx:687-688` (Filter/Group now functional on middle header); `estimate-tree-modal.test.tsx:106` (left: Filter present, Group absent).
- **Add:** per-panel behavior — right facet filter narrows list + View-by groups; middle group-by buckets rows + filter hides non-matching; left structured filter hides empty areas. A new e2e exercising the wired controls.
- **Perf:** after middle group-by, re-run the perf suite — `rendersOutside === 0` and command-palette `totalTableRenders === 0` hold (grouping is a memoized transform, not per-row subscription).

### Req 11 — Filter↔Expand separator (LOW)
- **Add:** assertion in `header-icon-toolbar-ui.test.tsx` that a `border-r border-hairline` wrapper precedes Expand/Collapse when the Filter/Group cluster renders, and is **absent** when it doesn't.
- **Manual:** vertical divider matches the search separator weight/spacing.

### Req 12 — Right Filter/View-by relocation; drop Group (MED)
- **Update:** `component-library-ui.test.tsx` (Filter + View-by + Add live in the new row; **no "Group library tree" button** anywhere).
- **Manual:** Filter/View-by/Add in the new row; top header clean.

### Req 13 — Relocate New-tab button (MED)
- **Update:** `estimate-tabs-domain.test.ts` / `estimate-empty-tab-state.test.tsx` (New-tab in middle header, not strip); keep "New tab" name + viewer-gating.
- **Add:** test that header New-tab button creates a tab and is disabled when `!canCreate`.
- **e2e:** `estimate-tabs.spec.ts` create-tab flow from the new location.
- **Manual:** button sits where Preview-Excel was; orange treatment; gated for viewers.

### Req 14 — Editable title (LOW)
- **Add (optional):** assert input className has no `max-w-[320px]`, no border-hover/focus classes, has `field-sizing-content`; no `maxLength` attr.
- **Manual:** long name grows the field, no clip, no border; rename save/validation intact; Safari/Firefox — full name editable via horizontal scroll.

---

## New tests to author (summary)
| File (new) | Guards |
|---|---|
| `tests/vitest/add-button-style.test.ts` | A1 constant shape |
| `tests/vitest/tree-panel-header-border.test.tsx` | Req 3 border |
| `tests/vitest/estimate-tree-node-icon.test.tsx` | Req 4 color + render isolation |
| `tests/vitest/estimate-header-actions.test.tsx` | Req 1 store + buttons |
| (extend) `header-icon-toolbar-ui.test.tsx` | Req 10/11 gating + separator |
| (extend) `ui-dropdown-select.test.tsx` | Req 8 boxed variant |
| new e2e for wired filter/group | Req 10 behavior |

## Tests guaranteed to need edits (don't forget)
`project-chrome-streaming.test.ts` · `teamspace-collaboration-header.test.tsx` · `estimate-sheet-cost-inputs.test.tsx` · `proposal-export-preview.test.tsx` · `component-library-ui.test.tsx` · `header-icon-toolbar-ui.test.tsx` · `estimate-tree-modal.test.tsx` · `estimate-tabs-domain.test.ts` / `estimate-empty-tab-state.test.tsx`.

---

## Manual smoke script (full-page, after all phases)
1. Load an estimate with a **long title** → title fills naturally, no clip, no border (Req 14).
2. Header cluster: **Share · Teamspace(icon) · XLSX · Activity** all present beside each other; open XLSX + Activity (Req 1, 2).
3. Three panels each show a consistent **bottom border**; all borders same `#F2F2F2` (Req 3).
4. Left tree: areas with components show **orange** circle, empty show grey; **add-area** button is orange w/ pointer (Req 4, 5).
5. Middle header: **New-tab** button where Preview-Excel was, orange; creates a tab (Req 6, 13). Rows have **top padding** (Req 9).
6. Toolbars: vertical **separator** between Filter/Group and Expand/Collapse; **no dead buttons** anywhere (Req 11, D8).
7. Right sidebar: top header = search + expand/collapse only; **new under-tabs row** = Filter · View-by · Add (tab-conditional), orange Add; **source dropdown** is a proper boxed select at tabs height (Req 7, 8, 12).
8. Filter & Group **do something** on every panel that has them: right facet filter + View-by grouping; middle group-by + filter; left structured filter (no group) (Req 10).
9. Resize the window → header buttons/teamspace behave; **no hydration warnings** in console (Req 1).

---

## Pre-flight checklist (before executing)
- [ ] Rebase on latest `origin/main` (P0–P6 + templates-panel are committed; avoid stale base).
- [ ] Copy `.env.local` into any fresh worktree (else dev bounces to /login).
- [ ] Confirm gitnexus / code-review-graph index is fresh (`npx gitnexus analyze` if stale).
- [x] Owner sign-off recorded: D1 (DESIGN.md orange exception) **approved**; Req 14 **keeps the red error border**. (2026-06-14)
- [ ] Decide execution mode: Codex delegation (per CLAUDE.md, review gate ON) vs `superpowers:subagent-driven-development`.
- [ ] Land **Phase A first** (shared primitives) before any per-panel work.
