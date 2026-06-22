# Research And Sources

## Local Code Sources

| Source | Evidence |
| --- | --- |
| `src/components/workshop/component-library/index.tsx` | Current two-tab sidebar, tab state, toolbar, search, tree rendering, preview, and bulk behavior. |
| `src/components/workshop/component-library/tree/buildLibraryTree.ts` | Current project-folder extraction and category tree injection. |
| `src/lib/component-library/project-component-projection.ts` | Strict project projection rules and project/estimate virtual folders. |
| `src/components/workshop/EstimateSheetContent.tsx` | Lazy sidebar loading through `loadProjectComponentLibraryLite(projectId)` and cache invalidation. |
| `src/lib/component-library/actions.ts` | Lite loader already returns project component rows plus templates. |
| `src/lib/component-library/query-keys.ts` | Existing lite cache key is workspace/project scoped. |
| `src/components/workshop/estimate-sheet/rows/cells.tsx` | User-facing `Library Component` / `Project Component` language. |
| `tests/vitest/component-library-ui.test.tsx` | Current two-tab UI and Templates project-source behavior are tested. |
| `tests/vitest/component-library-helpers.test.ts` | Current project folder behavior is tested in helper layer. |
| `tests/vitest/project-component-projection.test.ts` | Current projection inclusion/exclusion behavior is tested. |

## Project Memory Sources

| Source | Evidence |
| --- | --- |
| `.ai/10_state/current-state.md` | Closed-beta posture, targeted verification policy, known validate baseline reds, and prior Estimate Sheet sidebar/project-projection notes. |
| `.ai/10_state/decisions.md` | Estimate sidebar insertion ownership and Templates-as-structure decisions. |
| `DESIGN.md` | Compact estimate workspace guidance and sidebar visual constraints. |

## External Pattern References

These are product-pattern references only. They should not override local code or product language.

- Procore Cost Catalog overview: https://v2.support.procore.com/product-manuals/cost-catalog-company/
- Procore add items to Cost Catalog from Estimating: https://v2.support.procore.com/product-manuals/estimating-project/tutorials/add-items-to-a-cost-catalog-from-estimating
- Procore project template FAQ: https://v2.support.procore.com/faq-what-gets-copied-over-to-a-new-project-when-applying-a-project-template
- STACK Takeoff Library: https://support.stackct.com/hc/en-us/articles/47345131049875-Takeoff-Library-TE
- Autodesk Takeoff settings: https://help.autodesk.com/view/TAKEOFF/ENU/?guid=Configure_Takeoff_Settings

Pattern inference:

- Catalog/library content is reusable across projects.
- Project estimate content is local, mutable working data.
- Templates are reusable structures or starting points.
- Project-owned content can later be promoted/saved to reusable libraries, but that promotion should be explicit.

## Evidence Boundary

No browser screenshot, Product Design visual audit, or live-route QA is claimed in this pack. The owner explicitly redirected the work to code inspection, and the future implementation can copy the existing sidebar format.

