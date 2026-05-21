# `/workshop/components` Independent Review & Readiness Gate (Second Pass)

**Date:** 2026-05-21
**Question reviewed:** Is the `/workshop/components` UX/UI strategy certain enough to implement efficiently and effectively?
**Verdict:** **CONDITIONAL GO — with amended preconditions**

**Auditor:** Claude (second pass, with full codebase and schema audit)

---

## Direct answer

The strategy is strong. The first pass correctly identified the core UX direction (dense table-first manager, supplier/category pivots, price-health visibility, right-side inspector). The second pass confirmed alignment with live code and DB schema, and found several critical preconditions that must be addressed before implementation.

---

## What the second pass found

### Confirmed correct from first pass
- Table/list-first default (not card grid) — current route is a card grid and must be replaced
- Supplier and category as primary pivots — correct for Philippine estimating workflows
- MasterFormat as secondary, not primary — supported by CSI/NIST research
- Right-side inspector for detail view — correct pattern for data managers
- Price-health review workflow — correct for construction cost libraries

### Issues corrected in second pass

| First Pass Claim | Reality (verified) | Impact |
|-----------------|-------------------|--------|
| Route currently shows a shell with search+grid | Route shows a **card grid** with "Content pending approved workflow" in the footer | Placeholder text is user-visible embarrassment — must fix immediately |
| `cost_library_items` schema is ready | Schema is ready but has **0 rows of real data** (4 seed rows only); `discipline`, `designation`, `tags` have no DB columns | Read-only slice must use seed `EstimateRowItem` adapter; schema needs expansion before CRUD |
| Server-side repository exists | **No server-side cost library actions exist.** `cost-library-repository.ts` is browser-only | Persistent CRUD blocked until `src/lib/cost-library/actions.ts` is created |
| `WorkshopCollectionLayout` supports all toolbar actions | It supports filter/group/add. **No sort or view-mode slots.** | Sort and view-mode toggles need `addActions` workaround or extension |
| Shared primitives support all needed UI | **No drawer/slideover, skeleton, dropdown, or inspector primitive exists** | Phase 2 must create these as shared primitives |
| "Edit" currently opens preview in sidebar | "Edit" in the estimate sidebar opens read-only preview — **no true edit mode exists anywhere in the codebase** | Component edit is a greenfield feature |

---

## Approved first implementation slice (amended)

Proceed only with:

- **Phase 0:** Fix placeholder footer text and search placeholder (immediately)
- **Phase 1:** Read-only manager with seed data adapter
  - Compact table/list default (replacing card grid)
  - Left facet panel (category, supplier, kind, health)
  - Right inline inspector (no drawer primitives needed yet)
  - Search across name, category, supplier, unit
  - Price-health derivation and display
- No server-side changes
- No DB writes
- No mutation controls (disabled/hidden with clear copy)
- No shared primitive extraction yet (use inline `<aside>` for inspector)

## No-go items (reconfirmed)

Do not implement yet:

- Persistent CRUD (create/edit/duplicate/archive/delete)
- Schema expansion (adding discipline, tags, imageUrl columns)
- Server-side cost library actions
- Editor form in the routed UI
- Import/export/bulk workflows
- Saved views/tabs
- Assemblies
- MasterFormat/spec code metadata UI
- Cross-reference to estimate usage
- Hard delete

---

## Review lanes completed

### Technical feasibility review
**Verdict:** Conditional Go.

**Findings:**
- Schema mismatch between `EstimateRowItem` (seed data) and `cost_library_items` (DB table) is the biggest risk
- Adapter layer handles this for read-only; must be resolved before CRUD
- No server-side cost library infrastructure exists — greenfield work for Phase 3
- `WorkshopCollectionLayout` + `WorkshopPageShell` provide the right shell; no shell work needed
- Shared UI primitives gap is manageable — use inline elements for first slice

### UX/product quality review
**Verdict:** Conditional Go.

**Findings:**
- North-star UX is well-defined: dense table, facets, inspector, health indicators
- Current placeholder ("Content pending approved workflow" visible to users) is an immediate fix
- Card grid must be replaced with table — non-negotiable for a cost library
- Three-pane layout (facets + table + inspector) will be tested in browser QA for density
- Read-only mode must not look editable — disabled controls with clear copy are critical
- "Needs Review" as a first-class workflow is a strong UX differentiator
- **Note:** All 66 seed items have `pricingDate: "2026-05-17"` or `"2026-05-18"` (3-4 days ago). None will appear stale in the Needs Review view. For UX validation of the stale-price workflow, consider adding a few intentionally-old items (e.g., `pricingDate: "2025-01-15"`) or using a shorter threshold during development.

### Testing/risk-control review
**Verdict:** Conditional Go.

**Findings:**
- Focused unit tests: adapters, helpers, UI smoke test
- Route-level test must assert placeholder copy is gone
- Estimate sidebar regression tests must still pass
- Browser/visual QA required for density verification (jsdom alone insufficient)
- Full validation pipeline: type-check, lint, validate, build, E2E, diff-check

---

## Implementation risks (amended)

1. **Schema mismatch** (HIGH) — `EstimateRowItem` has `discipline`, `designation`, `tags`, `imageUrl`, `notes`; `cost_library_items` does not. Adapter handles read-only. Before CRUD: decide whether to add DB columns, use `metadata` jsonb, or normalize at adapter.

2. **No server-side repository** (HIGH) — Blocking Phase 3. Must create `src/lib/cost-library/actions.ts` with workspace-scoped server actions. Cannot proceed with persistence without this.

3. **Only 4 DB seed rows** (MEDIUM) — The manager would show near-empty with DB data. Read-only slice uses 66 `EstimateRowItem` seed items for UX validation. Label clearly as "Demo seed."

4. **Missing shared primitives** (MEDIUM) — Drawer, skeleton, dropdown don't exist. Workaround: use inline `<aside>` for inspector, static content for loading (or skip), native `<select>` for sort/group. Extract shared primitives in Phase 2.

5. **Two separate "component library" UIs** (MEDIUM) — The estimate sidebar and global manager share data concepts but have different jobs. Keep types/helpers shared; keep UI components separate. Do not try to unify them prematurely.

6. **Three-pane density on laptop** (MEDIUM) — Facets (240px) + Table (flex) + Inspector (380px) = ~1100px minimum. Collapse facets on narrow viewports; inspector is conditional (only when item selected).

7. **Dirty working tree** (LOW) — Current branch has uncommitted changes. Implement in isolated branch or coordinate with branch owner.

8. **RLS policies allow full CRUD to workspace members** (LOW for read-only, MEDIUM for CRUD) — The "members can manage cost library items" policy grants all operations. This is correct for now but may need refinement (e.g., viewers shouldn't delete).

---

## Required plan patches applied

The following documents were updated in this second pass:

- `01-research-synthesis.md` — Corrected route reality, schema gap analysis, refined taxonomy
- `02-screen-by-screen-ux-spec.md` — Corrected for actual primitives, added density specs, clear read-only rules
- `03-implementation-plan.md` — Concrete file-level tasks, real schema alignment, Phase 0 placeholder fix
- `04-independent-review-and-readiness-gate.md` — This document, with second-pass findings
- `05-cross-surface-integration-map.md` — **New** — Documenting relationship between estimate sidebar, global manager, DB, and page layout

---

## Implementation-ready conclusion

The path is:

1. **Phase 0 (immediate):** Fix footer text, fix search placeholder — 2 files, trivial changes
2. **Phase 1 (implementation):** Build read-only manager with seed adapter — create 6 new files, rewrite 1 existing file
3. **Validate:** Browser QA for density; run full validation pipeline
4. **Phase 3 (deferred):** Only after Phase 1 UX is accepted, create server actions, expand schema if needed, enable CRUD

This is a stronger strategy than the original plan because it starts with a trivial fix (placeholder text), validates UX with real seed data before touching the DB, and doesn't require new shared primitives for the first slice.
