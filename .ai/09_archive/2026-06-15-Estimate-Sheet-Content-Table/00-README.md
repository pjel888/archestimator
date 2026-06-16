# Estimate Sheet Content → Resizable Columns (TanStack) — Planning Package

**Date:** 2026-06-15
**Type:** Planning / audit / readiness study — **no source code was modified.**
**Goal (as stated):** Convert `EstimateSheetContent`'s columnar rows into a TanStack-table-style layout so users can **drag-resize columns**, where a resize in one node group **applies to all node groups**, accounting for the existing **memoization and virtualization**.

---

## TL;DR verdict

✅ **GO, with conditions.** Feasible, worthwhile, medium readiness, low-to-medium risk.

- The sheet is **N independent CSS-Grid "tables" (one per row-bearing node)** sharing **one** column-track literal (`row-table.tsx:96`) — not a single table. That single literal is the lever.
- Cross-group sync is best done with **CSS custom properties on a common ancestor**, not React state — change 6 resizable data-column vars once while the 3 chrome tracks stay fixed.
- Live drag must mutate CSS vars **imperatively (outside React)** and **commit to a store only on pointer-up**, or every memoized group re-renders ~60×/s.
- **Hard constraint:** keep cells single-line/truncating — the inner virtualizer is a **fixed-96px fast path** (`row-table.tsx:497, 241, 696`); wrap-on-narrow would break it.
- **Accelerant:** a complete, accessible v8 resize implementation already exists in-repo at `ProjectEstimatesTable.tsx` (port target).

Full decision + 4-phase plan: **`06-recommendation-and-migration-plan.md`**.

---

## Documents in this package

| # | File | What it answers |
|---|------|-----------------|
| 00 | `00-README.md` | This index + TL;DR |
| 01 | `01-current-architecture-audit.md` | As-built: column tracks, DOM/grid structure, how many grid instances, render tree, memo inventory |
| 02 | `02-memoization-virtualization-audit.md` | The two nested virtualizers, the memo guards, and the re-render/re-measure risk register for shared widths |
| 03 | `03-tanstack-resizing-research.md` | TanStack v8 column-sizing API, the CSS-variable perf recipe, virtualization combo, multi-instance shared state, pitfalls (cited) |
| 04 | `04-shared-width-state-design.md` | Where width state lives, transient-vs-committed split, per-estimate scope, persistence, default geometry, selector identity rules |
| 05 | `05-risk-edgecase-readiness.md` | Integration risks (collab cursors, drag conflicts), edge cases, a11y spec, testing strategy, phased go/no-go gates |
| 06 | `06-recommendation-and-migration-plan.md` | **Synthesis: the recommendation, architecture diagram, TanStack-adoption decision, 4-phase rollout, open questions** |
| 07 | `07-ux-ui-interaction-spec.md` | User-facing contract: shared ruler placement, resize states, keyboard/touch/a11y, responsive behavior, and design-system fit |
| 08 | `08-execution-and-traceability.md` | Execution-ready implementation units, file ownership, test scenarios, traceability, blast radius, rollback, and validation gates |
| 09 | `09-performance-measurement-plan.md` | Concrete render, layout, virtualization, storage, and browser budgets with measurement methods |
| 10 | `10-implementation-worker-handoff.md` | Single worker-ready goal/prompt handoff that consolidates scope, units, invariants, gates, and final report requirements |

---

## How this study was produced

Five specialized agents ran in parallel, each against the live code, then findings were reconciled and verified (notably: confirmed `ProjectEstimatesTable.tsx` has the v8 resize impl, and confirmed the fixed-96px virtualization assumption). One cross-audit contradiction — generic "add dynamic measurement" guidance vs the fixed-height fast path — was resolved in favor of **single-line cells for the MVP** (see `06` §3).

## Updated readiness notes

- The added docs convert the audit into an implementation handoff: UX states (`07`), execution/traceability (`08`), measurable performance budgets (`09`), and a single worker prompt (`10`).
- `04` is the canonical column contract. It uses stable storage/CSS IDs tied to live headers and fields: `material`, `quantity`, `subTotal`, `adjustment`, `miscCost`, and `totalItemCosts`. `adjustment` is a semantic UI/storage ID over `contingencyPercentage` / `contingencyValue`, not a backing field. Earlier draft names such as `unit`, `unitCost`, `contingency`, and `lineTotal` were too generic and did not match the rendered headers/fields.
- `03` remains useful TanStack research, but `06` is the governing recommendation where generic TanStack guidance conflicts with this repo's memoized, multi-table, virtualized sheet.
- Audit-driven correction on 2026-06-16 resolved the `material` width bug by keeping default/min at 160 for a byte-identical Phase 0 rollout. The express-card floor remains a required U0 measurement before user-visible resize; if measurement proves the floor must be higher, raise default and min together and remove the byte-identical rollout claim.
- This remains a **plan-only package**. No production source, tests, migrations, provider settings, or runtime configuration were changed by this planning pass.

## Defaults to confirm / open product choices

1. Confirm single-line/truncate cells for MVP. This is the current default and is required for the fixed-height virtualization path.
2. Confirm persistence scope: per-estimate-across-tabs with last-used fallback. This is the current default; owner can override before implementation.
3. Adopt TanStack headlessly or just port the existing handle (Route A) vs full row-model rewrite (Route B)? (Route A recommended.)
4. Reset affordance: double-click auto-fit, menu item, or both?

## 2026-06-16 audit response changelog

- Applied the plan-audit corrections from the archived audit at `.ai/09_archive/audits/2026-06-16-Estimate-Sheet-Content-Table-plan-audit.md`.
- Normalized CSS variables to `--est-col-<id>` and the canonical 6-resizable-column / 3-fixed-track contract.
- Corrected field names to `subTotal` and `totalItemCosts`, and documented the `adjustment` column's contingency-backed fields.
- Reframed `material` width as default/min 160 pending U0 express-card measurement, preserving Phase 0's byte-identical rollout promise.
- Merged the prior implementation and blast-radius docs into `08-execution-and-traceability.md`.
- Added `10-implementation-worker-handoff.md` as the copy-ready implementation goal for codebase AI workers.
