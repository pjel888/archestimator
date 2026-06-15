# Estimate Sheet → Resizable TanStack Columns — Recommendation & Migration Plan

> **Status:** Planning / readiness study. No source code changed.
> **Date:** 2026-06-15
> **Scope:** Convert the `EstimateSheetContent` row rendering so users can **drag-resize columns**, with a resize in any node group applying to **all node groups in the sheet**, without regressing memoization or virtualization.
> **Verdict:** ✅ **GO, with conditions.** Medium readiness, low-to-medium risk. Build it CSS-variable-first, behind a flag, in 4 phases.

This document synthesizes five companion audits in this folder. Read them for evidence; read this for the decision.

- `01-current-architecture-audit.md` — as-built rendering
- `02-memoization-virtualization-audit.md` — perf machinery + risk register
- `03-tanstack-resizing-research.md` — TanStack v8 best practices; research background where it conflicts with this file
- `04-shared-width-state-design.md` — state / persistence / sync design
- `05-risk-edgecase-readiness.md` — integration risks, a11y, testing, rollout
- `07-ux-ui-interaction-spec.md` — shared header/ruler, pointer, keyboard, touch, and visual interaction contract
- `08-execution-and-traceability.md` — implementation units, file ownership, traceability, tests, rollback, and flag handoff
- `09-performance-measurement-plan.md` — workloads, render-probe budgets, browser budgets, and no-go signals

---

## 1. The decision in one paragraph

It is feasible and worth doing. The single most important architectural fact is that **the sheet is not one table — it is N independent CSS-Grid "tables," one per row-bearing node**, all sharing a single hardcoded column-track string (`ROW_COLUMNS` at `row-table.tsx:96`). Because the column definition is already a *single source of truth literal*, converting it to **CSS custom properties on a common ancestor** gives cross-group sync nearly for free: change 6 resizable data-column variables once while the 3 chrome tracks stay fixed, and all groups relayout in one pass. The resize drag should mutate those CSS variables **imperatively (outside React)** and commit to a shared store **only on pointer-up**, so the memo/virtualization machinery never sees a per-frame prop change. We do **not** need to adopt TanStack Table's full row model to get this; we can use it as a headless sizing/resize-handle engine (or even port the small, already-working resize handle from `ProjectEstimatesTable.tsx`) while keeping the existing virtualized grid renderer.

---

## 2. Why this is tractable (the three enabling facts)

| Fact | Source | Why it helps |
|------|--------|--------------|
| One shared column literal, not per-row duplication | `row-table.tsx:96` (`ROW_COLUMNS`), stamped on every `<thead>`/`<tr>` (`:243`, `:626`) | Replace one string with `var()`-driven `grid-template-columns`; every instance inherits automatically. |
| A working, accessible v8 resize impl already exists in-repo | `ProjectEstimatesTable.tsx` — `columnResizeMode:"onChange"` (1041), `getResizeHandler` (737-738), `role="separator"` keyboard handle + min/max clamp (702-704, 725), localStorage (77-92) | We have a proven port target with a11y + persistence already solved. Don't reinvent. |
| Cross-group sync is a CSS inheritance problem, not a React state problem | `04` design; common ancestor is `[data-estimate-pointer-surface]` (`EstimateSheetContent.tsx:2706`) | Set the 6 `--est-col-*` data-column vars on one ancestor → all groups synced with zero per-group React state while fixed chrome tracks stay literal. |

---

## 3. The one hard constraint: row height must stay fixed

The inner row virtualizer is a **fixed-height fast path**: `estimateSize: () => ... ?? 96` (`row-table.tsx:497`), reinforced by `[contain-intrinsic-size:96px] [content-visibility:auto]` (`:241`) and absolute `translateY` positioning (`:696`). It does **not** dynamically measure row height.

**Implication:** if narrowing a column causes cell text to *wrap*, row heights become width-dependent and the virtualizer will overlap/gap rows. Generic TanStack guidance (`03`) says "add `measureElement` for dynamic heights" — but doing so here would convert the fast path into a measured path and meaningfully increase virtualization cost.

**Decision: keep cells single-line / `truncate` (ellipsis) at all widths for the MVP.** This preserves the fixed-96px fast path and makes the CSS-variable approach a pure layout change with zero re-measure. Wrap-on-narrow is explicitly **out of scope** (revisit only if product demands it, and only with a dynamic-measurement spike first). This is the key reconciliation between audits `02` and `03`.

---

## 4. Recommended architecture

```
                        EstimateSheetContent
                                │
        ┌───────────────────────┼───────────────────────────────┐
        │ COMMITTED LAYER (store, low-frequency)                 │
        │  useEstimateColumnWidthsStore  (NEW zustand store)     │
        │   • columnWidths: Record<colId, number>  keyed/estimate│
        │   • commitColumnWidths()  ← fires once on pointer-up   │
        │   • persisted via safeSetJsonStorage (localStorage)    │
        └───────────────────────┬───────────────────────────────┘
                                │ on mount + on commit
                                ▼
            set 6 data-column CSS vars on [data-estimate-pointer-surface]
              --est-col-material, --est-col-subTotal, … (single source)
                                │  CSS inheritance (free sync)
        ┌───────────────────────┼───────────────────────────────┐
        ▼                       ▼                                ▼
   Branch/group 1          Branch/group 2        …          Branch/group N
   grid-template-columns: var(--est-col-*)  (read-only consumers)
        │
        │ TRANSIENT LAYER (drag, 60fps) — bypasses React + store:
        │   pointermove → ancestor.style.setProperty('--est-col-<id>', …)
        │   → browser relayout only, ZERO React renders / re-measures
        ▼
   resize handle (ported from ProjectEstimatesTable: role=separator,
   keyboard, min/max clamp) — lives in ONE shared header instance
```

Key choices (full rationale in `03`/`04`):

1. **Transient vs committed split.** Live drag = imperative CSS-var writes (no `setState`). Commit = one store write on `pointerup`. This is what protects the memo guards (`areEstimateRowItemsTablePropsEqual`, `row-table.tsx:66`) and the dual virtualizers (`virtual-branch-list.tsx:95`, `row-table.tsx:494`) from per-frame churn.
2. **New store, not `estimate-ui-store`.** Widths are *keyed by estimateId* and *persisted*; `estimate-ui-store` holds ephemeral unkeyed interaction state. Keep them separate (`04`).
3. **Scope = per-estimate, shared across all groups and all tabs.** "Adjust for all" means all node groups; column geometry is a view preference uniform across an estimate. A `__last-used` global seeds new estimates (`04`).
4. **One shared header owns the resize handles.** Node-group bodies are pure size-consumers. Avoids the "every group thinks it's resizing" trap (never share `columnSizingInfo`; share only committed `columnSizing`) (`03`).
5. **Preserve `data-estimate-cell-index` / `data-estimate-row-id`.** Collaboration cursors and keyboard nav anchor on these (`EstimateSheetContent.tsx:838-855`). Any refactor that drops them is a regression (`05`).

---

## 5. Implementation ownership map

| Unit | Primary file/surface | Decision |
|------|----------------------|----------|
| Column contract | `src/lib/estimate-sheet/column-model.ts` | Defines semantic IDs, bounds, defaults, CSS var names, and the var-driven grid template. Must follow the canonical ID/field table in `04`: `subTotal`, `adjustment` over contingency fields, and `totalItemCosts`. |
| Surface owner | `EstimateSheetContent.tsx` | Owns the feature flag, hydration, committed-width selector, and inline `--est-col-*` vars on `[data-estimate-pointer-surface]`. If no `estimateId` exists, do not persist. |
| Shared ruler/header | new estimate-sheet header/ruler component or row-table sibling | Owns resize handles, keyboard/touch logic, reset behavior, and live imperative CSS-var writes. It must render inside the pointer surface. |
| Row consumers | `rows/row-table.tsx` | Stops owning column widths. Rows read the shared `COLUMN_TEMPLATE`, preserve fixed-height virtualization, and retain every `data-estimate-*` attribute. |
| Branch / virtual lists | `src/components/workshop/estimate-sheet/rows/branch.tsx`, `src/components/workshop/estimate-sheet/rows/virtual-branch-list.tsx` | Width-agnostic. Must not receive per-frame width props or keys. |
| Persistence | new `estimate-column-widths-store.ts` plus `readJsonStorage` / `safeSetJsonStorage` from `@/components/workshop/component-library/helpers` | Commit-on-end only, versioned per-estimate keys, safe storage read/write, reset clears keys. |
| Downstream surfaces | proposal export, workbook/package, public share, template/project-source insertion, Storybook | Must either ignore widths or prove they inherit safely from the shared surface. See `08`. |

---

## 6. Feature flag and rollback contract

Introduce `NEXT_PUBLIC_ESTIMATE_COLUMN_RESIZE_ENABLED`, defaulting to `false`
until all gates pass.

Wire it through the existing flag pattern in
`src/lib/workshop/virtualization-flags.ts`:
`estimateColumnResize: readPublicFlag(process.env.NEXT_PUBLIC_ESTIMATE_COLUMN_RESIZE_ENABLED, false)`.
`EstimateSheetContent.tsx` consumes that value to decide whether to hydrate
column widths, render the shared ruler, and use the var-driven template.

Flag-off behavior is a hard compatibility mode:

- render the current hardcoded grid geometry;
- hide resize handles and the shared ruler affordance;
- skip width-store hydration and localStorage writes;
- ignore any previously persisted width payloads;
- leave export/workbook/public-share surfaces unchanged.

Rollback is therefore one env change plus redeploy. No migration or data cleanup
is needed because persisted widths are inert while the flag is off.

---

## 7. TanStack Table: how much to adopt

Two viable routes — recommend deciding at Phase 0:

| Route | What we use from `@tanstack/react-table` | Pros | Cons |
|-------|------------------------------------------|------|------|
| **A — Headless sizing only** | `columnSizing` state, `columnSizeVars` recipe, `getResizeHandler`, min/max | Smallest blast radius; keep current renderer/virtualizer untouched; reuse `ProjectEstimatesTable` patterns | Two mental models (table API + custom grid) |
| **B — Full row model** | Full `useReactTable` per group | "Canonical" | Re-architects the renderer; fights the existing memo/virtualization; high risk |

**Recommendation: Route A.** The win the user wants (resizable, synced columns) is a *sizing* feature, not a *row-model* feature. Route B's cost/risk is not justified. We may even skip `useReactTable` entirely and port the ~40-line resize handle from `ProjectEstimatesTable.tsx` driving our own `columnWidths` store — decide in Phase 0 based on whether the handle's ergonomics need the table's `header` object.

### CSS vars vs `<colgroup>`

| Mechanism | Fit for this sheet | Decision |
|---|---|---|
| Shared CSS vars feeding `grid-template-columns` | Matches the live CSS-grid row architecture, works with `tbody` as `block`, absolute virtual rows, and one shared pointer surface. | Use this as the canonical implementation path. |
| `<colgroup>` / table layout | Works in `ProjectEstimatesTable`, but this sheet does not use table layout for row geometry and virtualized rows are absolutely positioned grid `<tr>` elements. | Mine it for sizing, keyboard, clamp, and storage patterns only; do not make `<colgroup>` the sheet width mechanism. |

---

## 8. Phased rollout (flag-gated) with go/no-go gates

**Phase 0 — Headless layout refactor (no user-visible change).**
Replace `ROW_COLUMNS` static class with `grid-template-columns` driven by 6 data-column CSS vars set from spec defaults on `[data-estimate-pointer-surface]`, with `index`, `select`, and `actions` remaining fixed literal tracks. Header + every body grid derive from the same template.
- **Gate:** Pixel-identical layout to today; all `data-estimate-*` attributes preserved; **zero render-probe regression** (`estimate-sheet-render-probe.ts`) on scroll/expand/edit.

**Phase 1 — Private resize proof, transient CSS vars, no persistence.**
Add the ported resize handle to the shared header/ruler; drag mutates ancestor CSS vars; no store or storage write occurs during pointer movement. min/max per column.
- **Gate:** Drag is 60fps; render probe satisfies `09`'s exact live-drag budget: zero content, branch, table, row renders, and zero storage writes; keyboard resize works (`role="separator"`).

**Phase 2 — Cross-group sync via shared store.**
Commit final widths into `useEstimateColumnWidthsStore`; all groups still read the same ancestor vars. Hydration derives the surface vars from the committed store.
- **Gate:** Resizing one group updates all groups in one layout pass; **O(1) table renders, zero row renders** on commit; collaboration cursors re-anchor within one frame (`05`).

**Phase 3 — Persistence + reset.**
localStorage via `safeSetJsonStorage`, versioned per-estimate key envelope, debounced writes, reset-to-default.
- **Gate:** Reload restores widths; reset snaps to spec defaults via CSS var fallbacks; corrupt/missing storage degrades to defaults.

**Out of scope (named explicitly):** wrap-on-narrow rows, server-side persistence, per-tab divergent widths, column reorder/hide. All deferrable; none block MVP.

---

## 9. Default column geometry (derived from today's grid)

From `ROW_COLUMNS = grid-cols-[36px 32px minmax(160px,1fr) 58px 92px 106px 92px 108px 30px]` (`row-table.tsx:96`). Full semantic mapping + min/max in `01` (track table) and `04` (defaults table). The flexible Materials column (`minmax(160px,1fr)`) needs an explicit resolved default + a "remaining space" policy once neighbors become user-fixed — handled in `04`.

---

## 10. Top risks (consolidated)

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | Per-frame width as React prop → all groups re-render ~60×/s | High | Transient CSS-var writes; commit on pointer-up only (`02`, `04`) |
| 2 | Narrowing wraps text → row-height change breaks fixed-height virtualizer | High | Single-line/`truncate` cells; wrap out of scope (`02`, `03`, §3) |
| 3 | Refactor drops `data-estimate-cell-index/row-id` → cursors + keyboard nav break | High | Treat attributes as a contract; assert in tests (`05`) |
| 4 | Resize handle drag spawns ghost row/DnD drag | Medium | `stopPropagation` on handle; keep header non-draggable; handle `touch-none select-none` (`05`) |
| 5 | Sharing `columnSizingInfo` across instances → every group "resizing" | Medium | Share only committed `columnSizing`; keep info local (`03`) |
| 6 | Horizontal overflow has no autoscroll (`useDragEdgeAutoScroll` is vertical-only) | Low | Accept for MVP or add horizontal edge-scroll later (`05`) |

---

## 11. Default decisions, owner can override

1. **Wrap vs truncate:** Default to single-line/truncate for MVP. This is a load-bearing performance decision; `07` owns UX details and `09` owns budgets.
2. **Persistence scope:** Default to per-estimate shared across tabs, with a last-used fallback for new estimates.
3. **TanStack scope:** Default to Route A, sizing/handle patterns only; avoid a full row-model rewrite.
4. **Keyboard contract:** `07` owns the interaction spec: Arrow = 16px, Shift+Arrow = 48px, Home resets, and Escape either restores the session-start width or is omitted until deterministic.
5. **Reset affordance:** Default to Home/double-click per-column reset plus a visible "Reset column widths" menu item.

---

## 12. Recommendation summary

Build it. Route A (headless sizing), CSS-variable-driven, transient-drag + commit-on-end, shared per-estimate store, localStorage persistence, flag-gated in 4 phases with render-probe gates. The hard constraint is keep rows single-line. The biggest accelerant is that an accessible v8 resize implementation already lives in `ProjectEstimatesTable.tsx` and the column definition is already a single source of truth.
