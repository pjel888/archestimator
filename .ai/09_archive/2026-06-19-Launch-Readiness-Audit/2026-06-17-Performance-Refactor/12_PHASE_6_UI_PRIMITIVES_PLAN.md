# 12 — Phase 6: UI Primitive Consolidation + Loading-State Cleanup + DS Duplication Lint

> **Authoring agent:** W10. **Status:** Phase plan (Wave 2). Implements contract `_SYNTHESIS.md §1 UI/design-system / §3 track (UI)`, target `04_TARGET_ARCHITECTURE.md §10` (loading/skeleton) + §2 (boundary rules) + §12.5 (DS reuse lint gate). Grounded in dossier `R6-ui-primitives.md`, audit `A-29`/`A-30`/`A-31`/`A-32`/`A-33`, patterns `PAT-16`/`PAT-17`/`PAT-18`/`PAT-19`/`PAT-20`/`PAT-21`/`PAT-24`, decision `D-006` (add duplication/reuse lint to the enforcing DS gate), risk **RISK-10** (DS drift / under-enforcement during consolidation).
>
> **Scope discipline (contract §4):** planning only — no `src/**` / `scripts/**` edits in this pack. Files named are *targets*; new lint rules are flagged "to be added in Phase 6." Validation uses only the existing command vocabulary.
>
> **Root-cause framing:** the DS linter (`scripts/enforce-app-design-system.mjs`) enforces **tokens, not reuse** (`A-29`, `PAT-21`). Every duplicate below passes CI today because each raw class string is individually token-compliant (`rounded-xs`, allowed sizes, allowed weights). `DESIGN.md:426` calls a visible duplicate "a blocking design-system defect" — **unenforced**. Phase 6 fixes the duplicates **and** closes the enforcement gap so they cannot return.

---

## 0. Goal & success definition

1. **Consolidate the 6 forked primitive families** (BulkActionToolbar, Card, icon-button, tab-strip, search/input, skeleton) onto single sources of truth (`R6`, `A-32`).
2. **Add a reuse/duplication lint rule** to the enforcing gate so re-introduced duplicates fail CI (`D-006`, `04 §12.5`).
3. **Standardize loading/skeleton + modal/dropdown/search/toolbar** patterns.

**Done when:** the new lint rule flags the known duplicates *before* migration and passes *after*; the 6 families resolve to canonical primitives; `bun run lint:design-system` + `bun run validate` + `bun run storybook:validate` pass.

### Enforcement reality (W3 correction — important)

The contract flagged `lint:design` as possibly a no-op. **W3 confirmed it is enforcing:** `.agents/skills/impeccable/scripts/detect.mjs` is a 21-line loader that resolves and runs a real engine at `.agents/skills/impeccable/scripts/detector/detect-antipatterns.mjs` (present in-tree, verified). So `lint:design` *does* gate something — **but neither it nor `enforce-app-design-system.mjs` has any component-reuse/duplication rule.** That gap is real and is this phase's lint work. Record in `19_OPEN_QUESTIONS.md`: Q-lint-design → answered (enforcing; reuse-gap stands).

**Where the new rule goes:** `scripts/enforce-app-design-system.mjs` — it is the *verifiable, in-repo, token-scoped* gate already wired into `validate` (`package.json:15,47`) and already does per-line regex matching via the exported `collectFileViolations(rel, text)` (`:141`), with `walk()` over `src/app`+`src/components` and a landing/share allowlist (`:6-25`). Adding regex-based reuse rules there is additive and low-risk. We do **not** extend the impeccable engine (out-of-repo bundle; harder to verify per contract §4).

---

## 1. Duplicate / forked primitive inventory (the worklist)

PINNED from R6 / `A-30..A-33` / `PAT-17..PAT-20`.

| Family | Duplicates | Evidence | Canonical target |
|---|---|---|---|
| **BulkActionToolbar** | 2 full impls (354 LOC) | `ui/bulk-action-toolbar.tsx:1-219` vs `workshop/BulkActionToolbar.tsx:1-135` (latter doesn't import former) | Delete workshop copy; consume ui primitive (`ui`) |
| **Card** | 0× adoption; 3 bespoke | `Card` imported 0× in workshop; `LiveProjectCard.tsx:1-722` (722 LOC, **un-memoized**), `ProjectCard.tsx:1-4`, `EstimateListCard.tsx` (45 LOC) | `Card` = structural base (header/media/body/footer slots); feature cards compose (`ui` base, feature variants local) |
| **Icon-button** | 3 ui modules + 1 dead + 19 raw strings | `ui/icon-button.tsx` (`IconButton` dead, 0 non-story uses), `toolbar-icon-button.tsx` (3 files), `header-icon-toolbar.tsx`; 19 raw `size-N place-items-center rounded-xs hover:bg-surface-muted` strings across ~12 files (`ProjectEstimatesTable.tsx:302,312,344`, `ProjectTeamspaceHeader.tsx:494`, `ComponentLibraryManager.tsx:451,581`, `EstimateColumnRuler.tsx:90`, `EstimateSheetContent.tsx:2753`, `AddComponentModal.tsx` ×4, `LiveProjectCard.tsx` ×2) | One `Button variant="icon"`; migrate 19 sites; delete dead `IconButton` (`ui`) — violates `DESIGN.md:421` |
| **Tab strip** | 3 ui primitives + 1 bespoke 654 LOC | `ui/tabs.tsx` (221), `tab-strip.tsx` (177), `segmented-control.tsx` (113); `EstimateTabStrip.tsx:1-655` imports neither, raw `<div className="… border-b border-hairline">` `:654-655` | `EstimateTabStrip` composes the strip primitive for visuals; keeps DnD/scroll/add-affordance behavior local (`ui` base, behavior local) — **see open Q** |
| **Search / input** | `SearchInput` 2× adopted; 70 raw `<input>`; ≥4 bespoke search | `SearchInput` only in `library/overview/LibraryOverviewSearch.tsx`, `estimate-sheet/activity-history.tsx`; 70 raw `<input>` (`ProjectDetailsModal.tsx` ×9, `beta-users/page.tsx` ×7, `ProposalExportPreviewDialog.tsx` ×6, …); bespoke search in `AddComponentModal.tsx`, `ProjectDetailsModal.tsx`, `CommandPalette.tsx` | Mandate `SearchInput`/`ControlInput`; migrate bespoke + high-value raw inputs (`ui`, exists, under-adopted) — violates `DESIGN.md:420` |
| **Skeleton** | 6 bespoke `animate-pulse`; divergent route shells | base `ui/skeleton.tsx:1-18` correct; bypassed in `data-table.tsx` ×2, `TemplatesTree.tsx`, `component-library/index.tsx`, 2 stories (product ones skip `motion-reduce`); `library/loading.tsx:1` has no shared shell vs `workshop/loading.tsx`/`projects/loading.tsx` using `StaticWorkshopLoadingShell`; bespoke `ProjectEstimatesListSkeleton.tsx` (46 LOC) | Mandate `Skeleton`; add `<Skeleton.List rows>`; one route-shell contract (`ui`) |
| **Dialog (consolidation review)** | 8 hand-rolled `role="dialog"` | `EstimateSheetContent.tsx`, `ProposalExportPreviewDialog.tsx`, `NewProjectModal.tsx`, `ProjectDetailsModal.tsx`, `CommandPalette.tsx`, `component-library/index.tsx`, `activity-history.tsx`, `ManageGroupsPopover.tsx` vs `overlays/dialog.tsx`/`modal.tsx`/`command-dialog.tsx` (11 files use `AppModal`/`Modal`) | Migrate non-special dialogs onto `overlays/*`; explicitly **bless** the genuinely bespoke (command palette, resizable inspector) |
| **Menu (consolidation review only)** | 5 modules (1477 LOC) | `dropdown-menu.tsx` (347), `dropdown-select.tsx` (473), `dropdown-popup.tsx` (298 shared core), `action-menu.tsx` (124), `context-menu.tsx` (235) | Likely keep — already share `dropdown-popup` core; **document the decision matrix**, do not collapse blindly |

---

## 2. Canonical primitive list — what moves vs stays feature-local

**Moves to / lives in `src/components/ui` (single source of truth):**

- **Square icon button** → one `Button variant="icon"` (collapse `icon-button.tsx` + `toolbar-icon-button.tsx`; delete dead `IconButton`). `header-icon-toolbar.tsx` reviewed — keep only if it adds a genuinely distinct composite affordance, else fold.
- **Card structural base** → `card.tsx` gains header/media/body/footer slots; the canonical surface (surface bg + `rounded-xs` + border).
- **BulkActionToolbar** → `ui/bulk-action-toolbar.tsx` only; workshop copy deleted.
- **Search field** → `SearchInput` (built on `ControlInput`); the mandated search primitive.
- **Skeleton + `<Skeleton.List rows>`** → `ui/skeleton.tsx`; plus the route-shell contract via `StaticWorkshopLoadingShell`.
- **Tab strip base** → the visual strip from `tab-strip.tsx`.

**Stays feature-local (genuinely domain-specific, not primitives):**

- `EstimateSheetContent`, `EstimateTabStrip` **behavior layer** (DnD reorder, horizontal scroll, orange add-affordance — composes the visual strip), `ProjectCursorLayer`, `workshop-tree.tsx` (being retired via Phase 2 anyway), publication/proposal composers, `CommandPalette` (blessed bespoke dialog), the resizable inspector dock.
- **Feature card variants** (`LiveProjectCard`, `ProjectCard`, `EstimateListCard`) stay feature-local *but compose the `Card` base* and become **memoized** (esp. `LiveProjectCard`, 722 LOC un-memoized — `A-30` churn+bloat target).

**Rule (`04 §2`, boundary checklist):** a primitive used 3+ times (R6 recurrence threshold) belongs in `ui`; a once-or-domain-specific composition stays feature-local but must *compose* the relevant primitive, not re-implement its shell.

---

## 3. Design-system enforcement — the reuse/duplication lint rule (D-006, root cause A-29)

**Add to `scripts/enforce-app-design-system.mjs`** (the enforcing, in-repo, `validate`-wired gate; extends `collectFileViolations` per-line scanning). New rule classes:

1. **Raw icon-button class-string ban.** Flag `<button>`/`<div>` with the square-icon signature (`size-N` or `grid/flex` + `place-items-center` + `rounded-xs` + `hover:bg-surface-muted`) outside `src/components/ui/**`. Targets the 19 raw sites (`PAT-17`). Implementation: a regex over the className run, like the existing `rounded`/`tracking` matchers (`:191-216`).
2. **Raw `role="dialog"` ban.** Flag `role="dialog"` outside `src/components/ui/overlays/**` and an explicit blessed-files allowlist (command palette, resizable inspector). Targets the 8 hand-rolled dialogs (`PAT-16`).
3. **Bare `animate-pulse` ban.** Flag `animate-pulse` outside `ui/skeleton.tsx`. Forces adoption of `Skeleton` (which carries `motion-reduce:animate-none`). Targets the 6 bypasses (`PAT-18`).
4. **Raw search/`<input>` watch (warn → error).** Flag `<input type="search">` and bare `<input>` in product surfaces outside `ui/**`, with an allowlist for genuinely-bespoke fields. Start as a reported count; promote to error after the 70-input migration lands (`PAT-21`). Avoids a flag-day failure.
5. **Dead-primitive detection.** A check that a `ui/` primitive exported but imported 0× outside stories (e.g. `IconButton`) is flagged — catches future dead forks.

**Mechanics & safety:**
- Each rule has a **file/line allowlist** (mirroring the existing `landingAllowlist`/`sharePxExempt` pattern at `:6-25`) for the explicitly-blessed bespoke cases, so the rule is precise, not blanket.
- The rule must be **calibrated against the current tree first**: run it, confirm it flags exactly the known `A-30..A-33` duplicates and nothing legitimate, then add allowlist entries only for blessed cases. This is the acceptance test for the rule itself (`A-29` validation: "the new lint must flag the known duplicates pre-migration, pass post-migration").
- Stays inside `lint:design-system` (already in `validate`) — no new top-level command needed; the gate tightens in place.

**RISK-10 mitigation:** the lint is added **alongside** the migration, not after — so the moment a family is consolidated, its rule prevents regression. Land the rule in *report-only* mode first (count, exit 0) for the input/dialog families that have large migration tails, flipping to *error* once the tail is cleared.

---

## 4. Loading / skeleton standards (04 §10, A-33, PAT-18)

- **One `Skeleton` primitive** (`ui/skeleton.tsx:1-18`, already correct). The 6 bespoke `animate-pulse` blocks adopt it; the product ones (`TemplatesTree.tsx`, `component-library/index.tsx`) currently **skip `motion-reduce:animate-none`** — a real a11y regression the migration fixes.
- **Add `<Skeleton.List rows={n} />`** — data-driven list skeleton so `ProjectEstimatesListSkeleton` and ad-hoc list pulses share one source.
- **One route-shell contract:** every `loading.tsx` composes `StaticWorkshopLoadingShell` + `Skeleton`. `library/loading.tsx:1` (bare `Skeleton`, no shell) is the layout-shift offender — align it. The streamed `Suspense` fallbacks (`04 §1.3`, Phase 7) reuse the **same** shell so `loading.tsx`, streamed skeleton, and real route are pixel-consistent (no CLS).
- **Enforced by:** lint rule #3 (bare `animate-pulse` ban) + the route-shell contract documented in `DESIGN.md` (Phase 10).

---

## 5. Modal / dropdown / search / toolbar standards

- **Modal/dialog (`PAT-16`):** non-special dialogs migrate onto `overlays/dialog.tsx` / `overlays/command-dialog.tsx` (focus-trap, escape, scrim, scroll-lock provided). Genuinely-bespoke ones (command palette, resizable inspector) are **explicitly blessed** in the lint allowlist with a comment justifying why they can't use the primitive. Decision matrix recorded in `DESIGN.md` (Phase 10).
- **Dropdown/menu (`R6` consolidation review):** the 5 menu modules already share `dropdown-popup.tsx` as portal core — **do not collapse**; instead document the decision matrix (when to use `dropdown-menu` vs `dropdown-select` vs `action-menu` vs `context-menu`) so future code picks correctly. This is a doc/clarity task, not a code merge (lowest priority in the phase).
- **Search (`PAT-21`):** `SearchInput` (on `ControlInput`) is the mandated search field. Bespoke search inputs (`AddComponentModal`, `ProjectDetailsModal`, `CommandPalette`) migrate where they don't need bespoke behavior; the 70 raw `<input>` are triaged — high-value/visible ones migrate to `ControlInput`/`SearchInput`, the rest are allowlisted with rule #4 in report mode.
- **Toolbar (`PAT-17`):** one `BulkActionToolbar` (ui); one `Button variant="icon"` for toolbar icon actions. The `EditGate`/`useEditCapability` consolidation (`PAT-24` — the `disabled+tooltip+guard` triad re-implemented per surface) is folded in here as a small `canEdit`-aware action-button variant (P3; do it only if it falls out cleanly of the icon-button consolidation).

---

## 6. Storybook / test requirements (storybook:validate coverage gate)

- **`storybook:validate`** (`package.json:12`) = `storybook:check-components` (`scripts/check-storybook-component-coverage.mjs`) + `storybook:check-boundary` (`scripts/check-storybook-boundary.mjs`) + a static Storybook build. It is **not** in `bun run validate` (contract §0) — so it must be invoked explicitly as a Phase-6 gate.
- **Coverage gate:** every consolidated `ui` primitive (the new `Button variant="icon"`, the slotted `Card`, `Skeleton.List`, the tab-strip base) must have a story so `storybook:check-components` passes. Migrating a feature card onto the `Card` base must not drop the existing story coverage.
- **Boundary check:** `storybook:check-boundary` enforces stories don't import disallowed surfaces — relevant because consolidation moves code between `ui` and feature dirs; run it after each family migration.
- **DOM tests (existing, `bun run test:dom`):** tab-strip + bulk-toolbar + card DOM tests must stay green; add a memoization render-count check for `LiveProjectCard` once memoized (`A-30` validation). Modal-migration files keep their focus-trap/accessibility DOM assertions.
- **Run order per family:** migrate → `bun run lint:design-system` (new rule passes) → `bun run test:dom` → `bun run storybook:validate`. Never batch multiple families into one commit (RISK-10 isolation).

---

## 7. Migration order (lowest-risk, enforcement-paired)

1. **BulkActionToolbar** — delete the workshop copy, point consumers at the ui primitive. Smallest, cleanest dedup (`A-32`). Land lint rule scaffolding alongside.
2. **Icon-button** — collapse into `Button variant="icon"`, migrate the 19 raw sites, delete dead `IconButton`. **Land lint rule #1 (raw icon-button ban) in error mode** once the 19 are migrated. High value, low risk (`A-31`).
3. **Skeleton + route shells** — adopt `Skeleton`, add `Skeleton.List`, align `library/loading.tsx`. **Land lint rule #3 (bare `animate-pulse` ban) in error mode.** (`A-33`)
4. **Card** — slot the base, recompose `LiveProjectCard`/`ProjectCard`/`EstimateListCard`, **memoize `LiveProjectCard`**. Medium risk (722 LOC) — do alone, with render-count check (`A-30`).
5. **Search / inputs** — adopt `SearchInput`/`ControlInput` for bespoke + high-value raw inputs; **land lint rule #4 in report mode**, flip to error when the tail clears.
6. **Dialog** — migrate non-special dialogs to `overlays/*`; **land lint rule #2 (raw `role="dialog"` ban)** with the blessed allowlist. Medium risk (focus-trap regressions) — `A-32`/`PAT-16`.
7. **Tab strip** — *gated on the open question*; if divergence is accidental, compose `EstimateTabStrip` on the strip base; if intentional, formally bless it and document. P3.
8. **Menu decision matrix + DESIGN.md** — doc-only; feeds Phase 10.

**Open questions (cross-ref `19_OPEN_QUESTIONS.md`):**
- *Q-tabstrip* — Is `EstimateTabStrip`'s divergence from `tab-strip.tsx` intentional (DnD + scroll + add-affordance) or accidental? Decides refactor-onto-primitive vs bless-as-local (`A-32` open Q). Determines step 7.
- *Q-iconbutton-target* — Is `IconButton` deprecated in favor of `ToolbarIconButton`, or should both merge into `Button variant="icon"`? (R6 open Q). This plan assumes the merge; confirm before deleting.
- *Q-menu-collapse* — Should the 5 menu modules collapse, or is `dropdown-popup` shared-core the intended end-state? This plan keeps them + documents; confirm with design owner.
- *Q-lint-design* — answered: `lint:design` is enforcing (W3); the reuse-gap is real (§0).

---

## 8. Validation & risk

- **Commands (existing vocabulary, contract §4):** `bun run lint:design-system` (now with the reuse rule), `bun run lint:design` (the impeccable engine — confirmed enforcing), `bun run test:dom`, `bun run storybook:validate`, `bun run validate`.
- **The lint rule is its own acceptance test (`A-29`):** it must flag exactly the known duplicates on the pre-migration tree and pass post-migration. Build it report-only first, calibrate, then promote per family.
- **RISK-10 (DS drift / under-enforcement):** mitigated by pairing each family migration with its enforcing rule, report-mode ramps for large tails (inputs/dialogs), per-family commits, and the `storybook:validate` coverage gate.
- **Bundle interaction:** memoizing `LiveProjectCard` and consolidating primitives reduces client churn but does not by itself change bundle topology — the provider/charts bundle work is Phase 7. Note the seam: do not regress dynamic-import boundaries (`A-06`) while moving components between dirs.
- **Decision refs:** `D-006` (duplication/reuse lint in the enforcing gate).

---

## 9. Design-system laws this pack owns (Bible §12.1–§12.3)

These three are stated in the Bible as design-system laws; the contract previously surfaced two of them only as Phase-3 sheet concerns. They live here too so the DS plan — not just the estimate-sheet plan — carries them.

### 9.1 Shared-primitive law (Bible §12.1) — reaffirmed

All new controls **start from `src/components/ui` primitives**: `Button` (not local `<button>` styling), `SearchInput` (not a bespoke search field), the shared dropdown/context-menu primitive, the shared `Tree` for trees, and shared cards / badges / modals / toasts. **One-off markup is both a design defect AND a performance defect** — it prevents shared memoization, shared tests, and shared bundle behavior (Bible §12.1; cf. `DESIGN.md:426` "blocking design-system defect"). This is the *why* behind §1–§5 above: every forked family is a perf liability, not just a style nit. Enforced by the duplication/reuse lint (**`D-006`**, §3) and the consolidation worklist; intentional, justified forks are **blessed explicitly** per **`D-020`** (allowlist entry + comment), never left implicit.

### 9.2 Component API law (Bible §12.2)

Component props must be **narrow and stable** — pass IDs and scalar flags, not whole objects, the entire store, or helper bags. Let a row/leaf component select or receive exactly what it needs.

```tsx
// Bad — whole object + entire store + helper bag (breaks memoization)
<TreeRow node={largeNodeObject} appState={entireStore} helpers={helpersObject} />

// Good — IDs + scalar flags + a stable callback
<TreeRow
  id={node.id}
  label={node.name}
  depth={depth}
  isSelected={node.id === selectedNodeId}
  onSelect={selectNode}
/>
```

Applies when consolidated primitives (slotted `Card`, `Button variant="icon"`, the tab-strip base, `Skeleton.List`) and any feature card composing them define their prop surfaces (§2, §7-step-4). A narrow API is what makes the §9.1 shared memoization actually fire.

### 9.3 RenderRow stability law (Bible §12.3)

Virtualized row renderers must be **stable**: avoid creating heavy inline closures / objects per row at high row counts; keep any custom `renderRow` a small adapter and move logic into memoized row components. This is the **design-system-level statement** of the load-bearing memo guards preserved in Phase 3 — `areEstimateSheetBranchPropsEqual` (`branch.tsx:111-156`) and `areEstimateRowItemsTablePropsEqual` (`row-table.tsx:86-116`), kept byte-for-byte in behavior (**cross-ref doc `09_PHASE_3_ESTIMATE_SHEET_PLAN.md` §"load-bearing memo guards"**). The tab-strip / `Tree` / `Card`-list primitives consolidated here must honor the same rule so no consolidation re-introduces per-row churn the Phase-3 guards exist to prevent.
