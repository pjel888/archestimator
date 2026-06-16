---
title: Projects Page UX/UI Plan — Comprehensive Audit (Second Pass)
date: 2026-06-16
type: audit
status: actionable handoff
scope: /workshop/projects
audits: .ai/03_plans/2026-06-15-Projects-Page-UX-UI-Plan
method: 16-agent parallel verify + multi-lens scored critique + ledger-locked improvement pass
overall_score: 88
---

# Projects Page UX/UI Plan — Comprehensive Audit

This audit reviews the 9-document plan pack at `.ai/03_plans/2026-06-15-Projects-Page-UX-UI-Plan/`. It was produced by a second pass that (1) re-verified every code-specific claim against the actual codebase with parallel agents, (2) scored the pack across five lenses, and (3) applied verified, coherence-locked improvements to the docs in place. The pack is now **implementation-ready (88/100)**, up from 75/100 as first reviewed. One product decision remains open (View control pattern), documented below as a deliberate, reversible bet.

---

## ⬇️ DRAG-AND-DROP GOAL — paste this to the next codebase AI

> **/goal** You are improving and then executing the Projects Page UX/UI plan pack at `.ai/03_plans/2026-06-15-Projects-Page-UX-UI-Plan/` (read `00-README.md` first, then `06`, `07`, `08`). The pack is implementation-ready and internally coherent; an audit already verified its code claims (`.ai/02_audits/2026-06-16-projects-page-ux-ui-plan-audit.md`). Your job has three ordered parts. **Do not widen scope.**
>
> **Part A — Confirm the one open product decision (blocking, ~5 min).** The plan builds the View control as a single `DropdownSelect` (the explicitly requested consolidation). The repo already has a lower-interaction-cost alternative — `SegmentedControl` (used in `ProjectChartsClient`) — which keeps all four densities one click away for a captive power user. See `06-recommended-design.md → Premise & opportunity cost`. **Ask the user to confirm dropdown vs SegmentedControl before coding the View control.** Everything else proceeds regardless.
>
> **Part B — Apply the remaining P2 doc polish (~15 min).** Close the items in this audit's "Remaining actions → P2" list (mostly: record the F11 sort-volume threshold number, and one cross-doc tidy). These are doc edits only.
>
> **Part C — Implement, against this verified contract (the bulk of the work):**
> - **Touch only:** `src/components/workshop/projects-page-client.tsx`, `src/components/workshop/WorkshopCollectionLayout.tsx`, `src/components/workshop/LiveProjectCard.tsx`. **Do NOT edit** `header-icon-toolbar.tsx`, `tree-panel-header.tsx`, `dropdown-select.tsx`, `workspace-repository.ts`, Supabase schema/migrations/types.
> - **Mount:** add `filterSlot?: ReactNode` to `WorkshopCollectionLayout` props, destructure it, pass `filterSlot={filterSlot}` to `TreePanelHeader` (it already forwards to `HeaderIconToolbar`). Render View + Sort + direction toggle in a no-wrap flex wrapper inside `filterSlot`.
> - **View:** `DropdownSelect` with `aria-label="View"` (it has NO default accessible name — omitting this fails the named-combobox tests) and a SEPARATE page-local `VIEW_SELECT_OPTIONS = [{value:'list',label:'View: List'},{value:'small',label:'View: Small'},{value:'medium',label:'View: Medium'},{value:'large',label:'View: Large'}]`. Keep `PROJECT_VIEW_MODE_OPTIONS`, its labels, the storage key `archestimator_projects_view_mode_v1`, the change event, and read/write helpers UNCHANGED. `value={viewMode}`, `onValueChange` → `writeProjectViewModePreference(next as ProjectCardViewMode)`. `DropdownSelect` has no icon slot — the "View:" prefix lives in the label text.
> - **Sort:** `DropdownSelect` `aria-label="Sort field"`, options `Sort: Last updated | Sort: Date created | Sort: Client | Sort: Project name` (keys `updated_at | created_at | client_name | name`). The trigger always reflects the selected field. Separate compact direction toggle button (icon + visible text, NOT icon-only), NO `aria-pressed`, accessible name = current direction (`Newest first`/`Oldest first` for dates, `A to Z`/`Z to A` for text), ≥24×24px. In-memory state only: `sortField`, `sortDirection`, `sortTouched` — NO persistence, no localStorage key.
> - **Ordering (critical correctness):** when `sortTouched === false`, **skip the comparator entirely** and render the search-filtered `activeBaseProjects` unchanged (preserves exact repository order; equal-`updated_at` rows must NOT be reordered). Only after the user changes field/direction: copy the array (never mutate the memoized base), then sort — missing/null/invalid values last in both directions, dates by parsed timestamp only after a null guard, text via `localeCompare(b, undefined, {sensitivity:'base', numeric:true})`, name-ascending tiebreak (user-sorts only). Apply per active access tab, after search.
> - **Empty/sample states (single rule):** zero live projects / owned-tab sample fallback / empty shared tab → **View DISABLED** (preserves the persisted-preference affordance, accessible explanation), **Sort HIDDEN**. Search-miss in a populated tab → both enabled.
> - **Card:** add `Created {date}` to the LARGE live card secondary meta only (gated by `showSecondaryMeta`), visible text via `formatUpdatedAt(project.created_at)`, a `title` with the full date (`Intl.DateTimeFormat('en',{dateStyle:'long'})`), secondary color `#5D5D5D` (not tertiary — AA).
> - **Tests:** follow `07 → Unit U5`. Rewrite the four-button assertions in `projects-page-view-mode.test.tsx`, `projects-page-access-tabs.test.tsx` (`:366`), `projects-page-shared-access.test.tsx` (`:277-289` loop) to the View combobox; re-sync the static governance strings in `project-creation-ui.test.ts` (incl. the favorite pressed-class drift at `LiveProjectCard.tsx:216`); add `projects-page-sort-controls.test.tsx` plus a `filterSlot` View+Sort+Add coexistence test, a selection-persists-across-sort test, and an untouched-equal-`updated_at` order test.
> - **Done when:** `bunx vitest run tests/vitest/projects-page-view-mode.test.tsx tests/vitest/projects-page-access-tabs.test.tsx tests/vitest/projects-page-shared-access.test.tsx tests/vitest/projects-page-sort-controls.test.tsx tests/vitest/project-creation-ui.test.ts --maxWorkers=1` passes, `bun run type-check` passes, `git diff --check` is clean, source edits stay within the three files, and a browser smoke confirms the toolbar does not wrap/overflow and Add stays reachable at desktop and narrow widths (or the smoke is explicitly reported as auth-blocked).

---

## How this audit was produced (method)

- **Verification fan-out (4 agents, read-only):** re-checked every code-specific claim the revised docs introduced — `DropdownSelect` API, `filterSlot` wiring, the five named test files, the `data-project-card-view` attribute, `FilterPopover`, the projects schema/repository, and the comparator contract — against the live codebase with `file:line` evidence.
- **Scored critique (5 agents):** Strategy/Effectivity, Design/UX/Accessibility, Implementation-Readiness, Internal Coherence, Completeness — each scoring 1-100 with prioritized, doc-anchored gaps.
- **Improvement pass (7 agents, one per file):** applied the verified fixes via a single shared decision ledger so all nine docs stayed coherent.
- The scores below are reported as **baseline (as first reviewed) → current (after the second-pass fixes)**.

---

## Scorecard

| Dimension | Baseline | Current | Why |
| --- | :---: | :---: | --- |
| **Implementation readiness** | 72 | **91** | The P0 blocker — "View: Large" was unbuildable with `DropdownSelect` (renders `selectedOption.label` verbatim, no prefix/icon) — is resolved via a separate `VIEW_SELECT_OPTIONS` map; the exact `DropdownSelect` API + usage snippet is now embedded; direction toggle, untouched-skip, and the hide/disable rule are pinned; test anchors are named. Residual: the build itself + browser smoke. |
| **Internal coherence** | 82 | **93** | Every "Hidden or disabled" fork resolved to one rule; cross-doc contract aligned (View label map, `aria-label`, comparator, empty states) via the shared ledger; no stale "08 overrides / DropdownMenu / leadingActions / sort-persistence" language. |
| **Design / UX / accessibility** | 72 | **89** | Direction-toggle a11y pinned (no `aria-pressed`, field-aware accessible name, ≥24px target); Sort/View accessible-name strategy resolved (WCAG 2.5.3); state matrix de-ambiguated; created-date uses AA-safe `#5D5D5D`. Brand fit was already strong (no AI-slop). |
| **Completeness / edge cases** | 82 | **90** | Now covers the bulk-selection↔sort interaction (id-keyed, survives reorder), scroll position, telemetry (out-of-scope note), reset/`router.refresh` behavior, reduced-motion/keyboard (decided, not gaps), and the untouched equal-timestamp case. |
| **Strategy / effectivity** | 68 | **78** | The View-consolidation premise and the F11 opportunity cost are now documented as deliberate, reversible bets with a discoverability QA check — but the View change still serves a *stated request*, not a *validated user need*, so it is capped. Sort is the high-effectivity half and is well-grounded. |
| **Overall** | **75** | **88** | Weighted across the five lenses. |

### Per-document scorecard

| Doc | Baseline | Current | Notes |
| --- | :---: | :---: | --- |
| `00-README.md` | 80 | 88 | Crisp contract + read order; now carries the View label-map/`aria-label` contract, the single hide/disable rule, and a "Known tensions / deliberate bets" line. |
| `01-current-state-audit.md` | 86 | 89 | Accurate render-tree + source anchors; added the `toolbarPanel`-sibling and two-segment-repository clarifications. |
| `02-component-library-inventory.md` | 74 | 88 | Was the readiness weak point (no concrete API); now embeds the `DropdownSelect` API block, option shape, no-icon fact, and the accessible-name requirement. |
| `03-data-and-sorting-feasibility.md` | 81 | 90 | Strong comparator contract; added the untouched-skip mechanism, the tiebreak-only-on-user-sorts caveat, and the selection interaction. |
| `04-blast-radius-impact.md` | 87 | 92 | Honest touched/untouched lists; now names exact test assertions to update vs keep, the favorite pressed-class drift, and the selection risk row. |
| `05-best-practices-research.md` | 75 | 80 | Solid external evidence; added the SegmentedControl interaction-cost note so it does not read as if dropdown is unambiguously optimal. |
| `06-recommended-design.md` | 66 | 89 | Was the most-fixed doc: RD1–RD8 all landed (View label map, Sort/direction specs, single state rule, untouched-skip, created-date formatter, premise note). |
| `07-implementation-roadmap.md` | 75 | 90 | Units U1–U6 rewritten with the concrete API, the direction toggle, untouched-skip, and the expanded test set; verification commands intact. |
| `08-verification-and-revisions.md` | 79 | 91 | QA matrix de-ambiguated; new scenarios for selection-active sort, untouched equal-timestamp, refresh, and filterSlot+Add coexistence; strategic risks recorded. |

---

## What the second pass fixed (so the next AI knows current state)

All of these are **already applied** to the docs:

1. **View control is now buildable.** Separate `VIEW_SELECT_OPTIONS` map with `View:`-prefixed labels (the trigger renders the label verbatim; there is no prefix prop and no icon slot); `PROJECT_VIEW_MODE_OPTIONS` and storage left untouched.
2. **Controls are now named.** `aria-label="View"` / `aria-label="Sort field"` required, because `DropdownSelect` has no default accessible name.
3. **Bare-"Sort"-while-untouched dropped** as unbuildable; the Sort trigger always reflects the selected field. `sortTouched` is retained only as the internal flag for #4.
4. **Untouched repository-order equivalence guaranteed:** when `sortTouched === false`, skip the comparator entirely; the name-asc tiebreak runs on user-selected sorts only (equal-`updated_at` seed rows would otherwise visibly reorder).
5. **Empty/sample states resolved to one rule:** View DISABLED, Sort HIDDEN — with the intentional asymmetry documented.
6. **Direction toggle fully specified:** separate compact button, no `aria-pressed`, field-aware accessible name, ≥24px target, sets `sortTouched`.
7. **Bulk-selection↔sort interaction documented:** id-keyed selection survives reorder; accepted v1 behavior; QA + test added.
8. **Created-date formatter dead-end resolved:** reuse `formatUpdatedAt` for visible text + a separate full-date formatter for the `title`, with exact insertion point.
9. **Concrete `DropdownSelect` API embedded** in `02` (prop names, option shape, usage snippet).
10. **Exact test anchors named** in `04`/`07` (incl. the favorite pressed-class drift that would break independently) + new required tests.
11. **Strategic bets recorded:** dropdown-vs-SegmentedControl and the F11 client-side-sort opportunity cost.

---

## Remaining actions (prioritized, file-anchored)

### P0 — none
No buildability blockers remain after the second pass.

### P1 — one product decision (not a defect)
- **Confirm View control pattern** before coding it. The plan ships the requested `DropdownSelect`, but `SegmentedControl` keeps all four densities one click away for the captive estimator and reduces a high-frequency control from 2 clicks to 1. This is a genuine product-judgment fork, not a code issue. → *Owner: user/PM. Anchor: `06 → Premise & opportunity cost`.* The rest of the plan is pattern-agnostic.

### P2 — small doc polish (close before/with implementation)
- **Record the F11 threshold number.** The opportunity-cost note says "record the project-count/render threshold at which list+sort must move behind a paginated read boundary" but leaves it as a placeholder. Pick a concrete number (e.g. ~200 projects or a render-time budget) so it is a real tripwire, not a TODO. → `03`/`06`/`08`.
- **Confirm the new test filename** (`projects-page-toolbar-filterslot.test.tsx` was proposed in `04`; `07` folds the same coverage into the sort-controls test). Pick one location so the two docs name the same file.
- **(Optional) Add a one-screen implementer quickstart** to `00` or `07` that inlines the verified `DropdownSelect` View snippet + the `filterSlot` 3-line edit, so the implementer never opens a second doc.

### Post-implementation
- Capture the browser smoke evidence (toolbar fit at desktop + narrow widths, Add reachable, dropdown not clipped) into `08`, or explicitly mark it auth-blocked.

---

## Verified code facts (quick reference — do not re-verify)

- `DropdownSelect` (`src/components/ui/dropdown-select.tsx`): single-select, portaled to `document.body` with `position:fixed` (clip-safe), keyboard + typeahead, options carry `aria-selected`. `DropdownSelectOption = { value:string; label:string; disabled?:boolean }` — **no icon field**; trigger renders only the selected label + a built-in `CaretDown`. **No default accessible name** → pass `aria-label`. `onValueChange` skips when value unchanged; `disabled` = hard, `ariaDisabled` = transient.
- `filterSlot`: accepted+rendered by `HeaderIconToolbar` (`:41,114`), forwarded by `TreePanelHeader` (`:41,202`); `WorkshopCollectionLayout` currently **drops it** and must add+forward it. `toolbarPanel` (access tabs) renders as a sibling after `TreePanelHeader`, separate from `filterSlot`.
- Attributes: live grid wrapper sets `data-project-view-mode`; live cards set `data-project-card-view`; the **sample `ProjectCard` sets neither card attr** — in sample/zero-live states only the wrapper attribute exists.
- Data: `Tables<'projects'>` has `name`, `client_name`, `created_at`, `updated_at` (all four sort fields); `updated_at` is trigger-maintained; **no `status` column** (dropped). `listCurrentWorkspaceProjects` = 5 call sites / 3 modules, returns owned (`updated_at desc`) ++ shared (`updated_at desc`) ++ pending invites as separate segments, **no pagination** → full list loaded client-side. Seed rows can share an identical `updated_at` (so the untouched-skip in #4 above is load-bearing).
- `FilterPopover`/`Popover` is **not portaled at all** (absolute div in a relative span) → clippable; `SegmentedControl` exists and is used in `ProjectChartsClient`.

---

## Verification commands (from `07`/`08`)

```bash
bunx vitest run tests/vitest/projects-page-view-mode.test.tsx tests/vitest/projects-page-access-tabs.test.tsx tests/vitest/projects-page-shared-access.test.tsx tests/vitest/projects-page-sort-controls.test.tsx tests/vitest/project-creation-ui.test.ts --maxWorkers=1
bun run type-check
git diff --check
```

---

## Bottom line

The plan pack is **coherent, code-accurate, and implementation-ready at 88/100.** A competent codebase AI can build it from the docs alone with effectively zero re-decisions — the one thing worth a human beat is confirming **dropdown vs SegmentedControl** for the View control (a reversible product bet, not a blocker). Sort is the high-value half and is fully specified down to the comparator and its untouched-order edge case. Ship Part A confirmation, fold in the two P2 tidies, then execute Part C against the verified three-file contract.
