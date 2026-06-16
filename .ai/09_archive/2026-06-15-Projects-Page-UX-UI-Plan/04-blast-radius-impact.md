---
title: Blast Radius and Impact
date: 2026-06-15
status: implementation-ready evidence
type: risk-analysis
scope: /workshop/projects
---

# Blast Radius and Impact

## Expected source edits

| File | Change | Blast radius |
| --- | --- | --- |
| `src/components/workshop/projects-page-client.tsx` | Replace four view buttons with View `DropdownSelect`; add Sort controls; add comparator inside display-project derivation. | Medium within page, low outside page. |
| `src/components/workshop/WorkshopCollectionLayout.tsx` | Add and forward `filterSlot`. | Low. The wrapper is projects-local in current usage. |
| `src/components/workshop/LiveProjectCard.tsx` | Add created-date meta only to large live-project card. | Low. Card modes and shared badges need regression coverage. |

## Expected test edits

| File | Change |
| --- | --- |
| `tests/vitest/projects-page-view-mode.test.tsx` | Rewrite old four-button expectations to one View combobox; keep persistence and all density values. |
| `tests/vitest/projects-page-access-tabs.test.tsx` | Update any old view-button interactions; add sort-within-tab coverage if not covered in sort test. |
| `tests/vitest/projects-page-shared-access.test.tsx` | Update density-switching helper to use the View combobox. |
| `tests/vitest/project-creation-ui.test.ts` | Static `readFileSync` governance test — edit named assertions only (see table below); do not rewrite the file's read model. |
| `tests/vitest/projects-page-sort-controls.test.tsx` | New focused sort test file. Also owns the projects-specific `filterSlot` coexistence coverage: View + Sort render alongside the existing Add action. `header-icon-toolbar-ui.test.tsx` only proves `filterSlot` + Group coexistence, NOT `filterSlot` + Add/leadingActions. |

### `project-creation-ui.test.ts` exact assertions (static `readFileSync` test)

This is a string-presence test against source text, so each assertion is a literal string match. Edit only these:

| Assertion (literal) | Action | Why |
| --- | --- | --- |
| `label: \`View projects as ${option.label}\`` | UPDATE | Templated four-button view label string is removed when the View `DropdownSelect` replaces the buttons. Replace with the new View-control assertion (`aria-label="View"` + `VIEW_SELECT_OPTIONS`). |
| `label: "Small thumbnails"` | UPDATE | This `PROJECT_VIEW_MODE_OPTIONS` label is no longer rendered on the trigger (RD1: the trigger uses the separate `VIEW_SELECT_OPTIONS` labels `View: List/Small/Medium/Large`). The `PROJECT_VIEW_MODE_OPTIONS` map itself stays in source; only its on-trigger usage assertion changes. |
| `PROJECT_VIEW_MODE_STORAGE_KEY` | KEEP | Storage key governance unchanged (RD1). |
| `data-project-view-mode={projectViewMode}` | KEEP | Live grid wrapper attribute unchanged. |
| `viewMode={projectViewMode}` | KEEP | Card prop wiring unchanged. |
| `toolbarPrefix="projects"` | KEEP / intentionally re-verify | Add-action wiring unchanged. |
| `label: "Add projects"` | KEEP / intentionally re-verify | Add-action label unchanged. |
| `grid grid-cols-[repeat(auto-fill,minmax(248px,1fr))] gap-3` | KEEP | Grid-class assertion unchanged. |
| `aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white` | RE-SYNC (UPDATE) | DRIFT: source now uses `aria-pressed:border-tertiary/40 aria-pressed:bg-surfaceMuted aria-pressed:text-ink` (`LiveProjectCard.tsx:216`). This assertion breaks independently of this work; update it to the current favorite pressed-class string in the same pass. |

> Sample-mode caveat: live and sample cards set `data-project-card-view`, and both the live grid wrapper and the sample grid wrapper set `data-project-view-mode`. But the sample `ProjectCard` does NOT set `data-project-card-view` — in zero-live/sample states only the wrapper `data-project-view-mode` attribute exists. Any density assertion that runs against a sample/zero-live render must target the wrapper attribute, not a per-card attribute.

## Explicitly untouched

- `src/components/ui/header-icon-toolbar.tsx`
- `src/components/ui/tree-panel-header.tsx`
- `src/components/ui/dropdown-select.tsx`
- `src/lib/repositories/workspace-repository.ts`
- Supabase schema, migrations, RLS, generated types, seed data
- Other workshop collection pages

## Risk table

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Old tests expect four `aria-pressed` view buttons | Certain, low cost | Rewrite tests to assert one combobox and all options. |
| Dropdown/control labels overflow fixed toolbar height | Medium | Max widths, truncation, no-wrap wrapper, browser smoke at desktop and narrow widths. |
| Sort mutates shared arrays | Medium | Always sort a copied array after search. |
| Null dates sort as 1970 | Medium | Null/invalid guard before `Date` construction. |
| Shared/pending cards lose badges or date copy | Medium | Re-run shared-access density tests. |
| Search and sort order becomes ambiguous | Medium | Specify search first, sort second, per active tab. |
| Placeholder Filter button creates noise | Medium | Defer Filter until real facets are specified. |
| Shared primitive change affects other pages | High | Do not edit shared toolbar/dropdown primitives. |
| Repository sort affects unrelated callers | High | Keep sort client-side only. |
| Bulk-selection breaks when sort or view reorders rows (RD6) | Low | Selection is `project.id`-keyed (`Set<string>`) so it survives reorder; checked rows visually relocate but the set persists. Accepted v1 behavior (clearing on sort change was rejected as more surprising). Add a unit test: sort while a bulk selection is active → selected IDs persist, checkboxes follow their rows. |

## Minimal-blast-radius path

The narrow path is:

1. Thread `filterSlot` through `WorkshopCollectionLayout`.
2. Compose existing `DropdownSelect` controls in `projects-page-client.tsx`.
3. Add local sort state and a page-local comparator.
4. Add large-card created date.
5. Rewrite targeted tests.

This path preserves the repository, design-system primitives, server data shape, and other collection pages.

## Filter-button impact

Adding a Filter button now would widen scope without improving the stated goal. Useful filters require at least one validated dimension and state model:

- access: owned/shared/pending
- client
- location
- favorite
- publication/share state

The page already has access tabs and search. Until the team chooses actual facets, a Filter button would be either redundant or empty. Keep it as a follow-up plan, not part of this MVP.

## Deletion criteria

If implementation discovers that `DropdownSelect` cannot fit in the toolbar without unacceptable clipping or wrapping, do not patch the shared primitive inside this work. Stop and either:

- switch the plan to a compact menu-button implementation using an existing portaled primitive, or
- reopen a design-system enhancement plan for `DropdownSelect` trigger customization.

That is a scope change and should be documented before coding further.
