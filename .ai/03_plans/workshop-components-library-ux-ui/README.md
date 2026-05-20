# Workshop Components Library UX/UI Plan Pack

**Created:** 2026-05-20
**Route:** `/workshop/components`
**Purpose:** Research and plan the global Component Library manager UX/UI before implementation.

## Files

1. `01-research-synthesis.md`
   - External UX patterns
   - Current repo constraints
   - Construction taxonomy decision
   - What users likely want first
   - Recommended IA

2. `02-screen-by-screen-ux-spec.md`
   - Screen-by-screen spec for `/workshop/components`
   - Default browse view
   - Supplier view
   - Category/spec view
   - Price review flow
   - Detail/create/edit drawer
   - Empty/loading/error states

3. `03-implementation-plan.md`
   - Implementation-ready phased plan
   - Exact file ownership
   - Testing strategy
   - Validation commands
   - Risks and gates

4. `04-independent-review-and-readiness-gate.md`
   - Independent technical, UX/product, and testing/risk review summary.
   - Final Conditional Go gate.
   - Approved first implementation slice and no-go items.

5. `gemini-library-ux-research.md`
   - Gemini read-only research memo requested by Philip.

6. `gemini-library-ux-research.prompt.md`
   - Prompt used for Gemini research lane.

## Planning verdict

**Independent review status:** Conditional Go. The strategy is not 100% certain, but it is strong enough for a narrow read-only first implementation slice after the hardening patches in this folder. CRUD, archive/delete, schema expansion, import/export, saved views, and bulk workflows remain no-go until later gates pass.

Build `/workshop/components` as a compact, table-first global cost/component library manager, not as another estimate insertion sidebar.

Default user answer:

> “What reusable cost components do we have, are their prices trustworthy, and how can I filter/update them by supplier, category/trade, assembly, or spec code?”

Primary view should be a dense table/list with search, price-health status, supplier/category/type filters, and a right-side detail drawer. Supplier and category are essential pivots. MasterFormat/spec-format can be supported as a secondary taxonomy/view, but should not be the primary pre-MVP navigation spine.

## Important repo state at creation

- Branch observed: `fix/estimate-workspace-labels-alignment`.
- Working tree already had many uncommitted changes before this plan pack was created.
- This pack intentionally adds documentation only under `.ai/03_plans/workshop-components-library-ux-ui/` and does not modify production code.

## Source/research lanes used

- Existing Archestimator `.ai` docs and current code.
- Repo read-only subagent audit.
- External UX benchmark subagent.
- Construction taxonomy subagent.
- Gemini CLI read-only plan-mode research.
- Targeted source verification for CSI MasterFormat, CSI UniFormat, CSI OmniClass, and NIST UNIFORMAT II pages.
