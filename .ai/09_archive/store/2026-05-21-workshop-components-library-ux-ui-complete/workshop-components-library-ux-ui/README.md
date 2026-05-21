# Workshop Components Library UX/UI Plan Pack (Second Pass)

**Created:** 2026-05-20 (first pass by Kimi + Gemini)
**Updated:** 2026-05-21 (second pass by Claude — full codebase and schema audit)
**Route:** `/workshop/components`
**Purpose:** Research and plan the global Component Library manager UX/UI before implementation.

## Files

1. `01-research-synthesis.md` **(updated)**
   - External UX patterns from cost libraries, estimating tools, and data-heavy SaaS
   - **Corrected:** current route reality (it's a card-grid placeholder, not a manager), schema gaps (discipline/designation/tags missing from DB), server-side infrastructure gaps
   - Construction taxonomy decision: category/supplier as primary, MasterFormat as secondary
   - What users likely want first
   - Recommended IA with concrete layout using existing primitives
   - North-star UX definition

2. `02-screen-by-screen-ux-spec.md` **(updated)**
   - 7 screens: Default Browse, Supplier Pivot, Category View, Needs Review, Detail Inspector, Create/Edit (deferred), Import/Export (deferred)
   - **Corrected:** layout zones mapped to real `WorkshopCollectionLayout` slots, inspector as inline `<aside>` (no drawer primitive needed yet), concrete column specs with priorities
   - All states: loading, empty, no matches, error, read-only, demo/workspace
   - Accessibility and keyboard spec
   - Narrow viewport behavior

3. `03-implementation-plan.md` **(updated)**
   - Phase 0: Fix placeholder footer text (immediate, 2-line change)
   - Phase 1: Read-only manager with seed data adapter — types, adapters, helpers, table, facets, inspector, route rewrite
   - Phase 2: Shared primitives (skeleton, drawer, dropdown)
   - Phase 3: Persistence — server actions, DB adapter, wire data, enable CRUD
   - Phase 4: Advanced features (bulk, assemblies, templates, import/export)
   - **Corrected:** concrete file paths, real schema alignment, adapter code snippets, test strategy, validation pipeline
   - No DB writes in first slice

4. `04-independent-review-and-readiness-gate.md` **(updated)**
   - Second-pass findings: what the first pass got right vs. what was corrected
   - Amended approved first implementation slice
   - Implementation risks (8, with new findings on schema mismatch and missing server repo)
   - Required plan patches applied

5. `05-cross-surface-integration-map.md` **(NEW)**
   - Complete map of all "component library" surfaces: estimate sidebar, global manager, DB, seed data, pages
   - Data flow diagrams for insertion and browsing
   - Type relationships: `EstimateRowItem` ↔ `ComponentLibraryManagerItem` ↔ `CostLibraryItem`
   - File ownership: what lives where, what must not be shared
   - Anti-patterns to avoid
   - States to synchronize between surfaces

6. `gemini-library-ux-research.md` (unchanged) — Gemini read-only research memo
7. `gemini-library-ux-research.prompt.md` (unchanged) — Prompt used for Gemini research lane

## What the second pass changed

The second pass performed a line-level audit of the live route (`ComponentsPageClient.tsx`, `page.tsx`), the DB schema (`cost_library_items`), the repository layer, and all shared UI primitives. Key corrections:

| Finding | Impact |
|---------|--------|
| Route footer says "Content pending approved workflow" to users | **Phase 0**: immediate fix before anything else |
| Current page is a card grid, not a manager | Must be completely replaced with table/list |
| `discipline`, `designation`, `tags` have no DB columns | Adapter handles read-only; schema expansion needed before CRUD |
| No server-side cost library actions exist | Blocking Phase 3 persistence |
| No drawer, skeleton, or inspector primitive exists | Use inline `<aside>` for first slice; extract primitives later |
| `viewMode` and `sortMode` are frozen in sidebar | Separate bug (documented in sibling audit) |
| Only 4 seed rows in DB (66 in seed JS) | Use seed adapter for UX validation; label as "Demo seed" |
| **Corrected**: `estimate_row_items` HAS `source_library_item_id` FK + `source_snapshot` jsonb | Library-edit isolation already exists in DB schema. The "no link" claim in the sidebar audit's Error Path 4 was wrong — corrected. |
| **Added**: Bulk price updates are critical (Gemini memo) | Deferred to Phase 4 but must not be deferred indefinitely |
| **Added**: In-memory repository has phantom fields cast as `CostLibraryItem` | Type-cast hides schema mismatch; fix before CRUD |

## Planning verdict

**Independent review status:** Conditional Go. The strategy is strong enough for a narrow read-only first implementation slice.

Build `/workshop/components` as a compact, table-first global cost/component library manager, not as another estimate insertion sidebar.

Default user answer:

> "What reusable cost components do we have, are their prices trustworthy, and how can I filter/update them by supplier, category/trade, assembly, or spec code?"

Primary view: dense table/list with search, price-health status, supplier/category/kind filters, and a right-side detail inspector. Supplier and category are essential pivots. MasterFormat/spec-format is supported as a secondary taxonomy/view.

## Immediate next action

**Fix Phase 0:** Change the footer text in `src/app/workshop/components/page.tsx` from "Component library shell | Content pending approved workflow" to "Workspace library". This is a 1-line change visible to users now.

Then proceed with Phase 1 implementation following `03-implementation-plan.md`.

## Relationship to sibling audits

- `.ai/03_plans/estimate-component-library-sidebar-audit/` — Deep audit of the estimate insertion sidebar (`EstimateRightSidebar`). This plan covers the **separate** global manager route. The two surfaces are different jobs. See `05-cross-surface-integration-map.md` for the complete relationship.
