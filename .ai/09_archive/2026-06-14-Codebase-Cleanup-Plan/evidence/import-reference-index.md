# Evidence — Import / Reference Index

Summary of reference analysis used to qualify every deletion candidate. A file is **not** safe to delete merely because TypeScript imports are absent — Next route files, SQL, Playwright selectors, dynamic string references, and provider callbacks can be externally reachable.

## Reference classes checked (per candidate)

1. Direct TS imports · 2. Dynamic imports (`import(...)`, `next/dynamic`) · 3. Next route filesystem conventions · 4. Server-action references · 5. Form action bindings · 6. API fetch URLs · 7. Link hrefs · 8. `router.push/replace/prefetch` · 9. Supabase `.rpc()` calls · 10. Table/column string refs (`.from('...')`, select strings) · 11. SQL migration refs · 12. Test imports · 13. Storybook imports · 14. Script imports · 15. Env-flag conditionals · 16. Docs/.ai refs · 17. Generated-types refs · 18. CSS class/data-attr refs · 19. Playwright selectors · 20. External provider/route expectations.

## No-reference files (zero imports anywhere — strongest delete candidates)

| File | Notes |
|---|---|
| `src/lib/repositories/cost-library-repository.ts` | 0 imports; superseded by server-side `component-library-repository.ts` |
| `src/lib/domain/estimate-totals.ts` | 0 imports; duplicate of `estimates/estimate-row-total.ts` |
| `src/components/sidebar/ArchestimatorMark.tsx` | 0 imports; `ArchestimatorLogo` used instead |
| `src/components/workshop/ProjectWorkspaceHeaderRow.tsx` | 0 runtime imports; **absence enforced by 2 governance tests** |
| `src/components/workshop/ProjectWorkspaceProjectCode.tsx` | only consumer was the dead header row |

## No-reference exports (file used, export not)

| Export | File | Refs |
|---|---|---|
| `createProject` | `src/lib/projects/actions.ts` | 0 (only `createProjectRecord` is bound) |
| `deleteProject` | `src/lib/projects/actions.ts` | 0 (contract test asserts not form-bound) |
| `isFollowModeEnabled`, `readTeamspaceFeatureFlags` | `src/lib/collaboration/feature-flags.ts` | 0 callers (deferred follow mode) |
| `componentLibraryDatasetVersion` | `src/lib/repositories/component-library-repository.ts` | 0 |
| `EstimateDragIntent`, `EstimateDragType` (types) | `src/stores/estimate-ui-store.ts` | 0 external |

## Test-only references (only imported by `tests/**`)

`calculateResults` (`ab-testing/results-calculator.ts`); `buildProjectChartComparison`, `calculateProjectChartRowTotal` (`project-charts/aggregate-project-charts.ts`); `buildProjectChartComparisonViewFromFacts` (`project-charts/project-comparison-view.ts`); `summarizeProjectPublicationAccessTelemetryMetrics` (`publication/activity-helpers.ts`); `fetchEstimateActivityRetentionMetrics` (`estimates/actions.ts`); entire `src/lib/aec-classification/disciplines.ts`.

## Story-only references (only imported by `*.stories.*`)

`src/components/ui/`: `confidence-indicator.tsx`, `financial-total-card.tsx`, `timeline.tsx`, `status-badge.tsx`, `data-table.tsx` (+ internal `pagination.tsx`).

## Docs-only / speculative references (named in docs, not built)

Revision Intelligence; Proposal Comparisons (as a product feature — distinct from the live project-charts comparison). Footprint: `src/app/features/page.tsx`, `src/app/pricing/page.tsx`, `.ai/06_specs/brand/*`, `src/components/landing/ProductPreviewVariants.tsx` (dead landing component).

## Dynamic / string references (evade static grep — handle with care)

- AI flags read via `process.env[name]` bracket notation in `src/lib/ai/feature-flags.ts` — values still greppable (string constants in same file).
- `next/dynamic` imports: `NeatWireframeBackground` (`@firecms/neat`), `ProjectCostDonutChart` (`d3-shape`).
- Component thumbnails referenced by path strings in `estimate-tree-data.ts` (`/component-thumbnails/...`).
- CSS classes/data-attrs: `data-motion-reveal`, `rough-annotation`, landing hero slide classes.

## Route-file exceptions (filesystem-reachable; never "safe-delete on no-import")

All `src/app/**/{page,route,layout,loading,error}.tsx` are reachable by Next.js convention. `/api/health` (monitoring), `/api/webhooks/resend` (Resend callback), `/auth/callback` (Supabase), `/share/[token]/*` & `/invite/[token]/*` (emailed links) are externally reachable even with no internal caller — **KEEP**.

## Landing barrel coupling note (cross-lane)

The 9 dead landing sections (`PartnerSection`, `SolutionSection`, `TestimonialSection`, `ProductShowcaseSection`, `EstimatorEngineSection`, `FeaturesSection`, `PricingSection`, `FAQSection`, `ProcessBandSection`) are re-exported by `src/components/landing/index.ts` and some are imported by `tests/vitest/landing-interactivity.test.tsx`. Deleting them requires updating the barrel **and** those tests first. Removing them does **not** remove `src/lib/ab-testing/**` usage — ab-testing stays live via `HeroSection`, `FinalCTASection`, `LandingHeader`, and `ABExperimentProvider`, which are rendered on `/`.
