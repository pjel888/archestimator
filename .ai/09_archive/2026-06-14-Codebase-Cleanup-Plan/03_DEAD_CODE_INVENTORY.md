# 03 — Dead Code Inventory

Consolidated inventory of dead / likely-dead / orphaned code, grouped by strength of proof. Full per-finding bodies (with the standard finding format) are in docs 05–12; the deletion matrix with all columns is `04_DELETION_CANDIDATE_MATRIX.md`. Every item below was checked against the 20 reference classes (`evidence/import-reference-index.md`).

## Tier A — Proven dead (zero references; safe delete, code-only)

| Item | Path | Proof | ID |
|---|---|---|---|
| `cost-library-repository.ts` (whole file) | `src/lib/repositories/cost-library-repository.ts` | `rg "cost-library-repository"` → 0 hits outside the file; superseded by server-side `component-library-repository.ts` | CLEAN-F04 |
| `domain/estimate-totals.ts` (whole file) | `src/lib/domain/estimate-totals.ts` | `rg "estimate-totals"` → 0 hits; duplicate of `estimates/estimate-row-total.ts#computeEstimateRowLineTotal` | CLEAN-F05 |
| `ArchestimatorMark.tsx` | `src/components/sidebar/ArchestimatorMark.tsx` | 0 imports; `SidebarHeader` uses `ArchestimatorLogo` | CLEAN-F02 |
| `ProjectWorkspaceHeaderRow.tsx` | `src/components/workshop/` | 0 runtime imports; **absence asserted** by `project-dashboard-core-ui.test.ts:33` + `project-dashboard-center-column-ui.test.ts:27` | CLEAN-F01 |
| `ProjectWorkspaceProjectCode.tsx` | `src/components/workshop/` | only consumer was the dead header row | CLEAN-F01 |
| `createProject`, `deleteProject` | `src/lib/projects/actions.ts` | 0 callers; `mass-deletion-ui-contract.test.ts:33` asserts `deleteProject` not form-bound; UI uses `createProjectRecord` + bulk-delete preview/execute | CLEAN-F06 |
| `componentLibraryDatasetVersion` | `src/lib/repositories/component-library-repository.ts` | 0 callers anywhere | CLEAN-F08 |
| `EstimateDragIntent`, `EstimateDragType` (type exports) | `src/stores/estimate-ui-store.ts` | 0 external importers | CLEAN-F09 |
| stale `revalidatePath("/workshop/components")` ×2 | `component-library/actions.ts:164`, `ai/package-builder/apply.ts:931` | targets a redirect-only route; no RSC cache to invalidate; correct `/workshop/library` call sits beside each | CLEAN-F10 |

## Tier B — Dead landing scaffolding (zero runtime refs; barrel + test coupling)

The home page renders only: `HeroSection`, `CompanyProofCarouselSection`, `SecondaryClaimSection`, `FinalCTASection`, `LandingHeader`, `LandingFooter`, `LandingSmoothScrollProvider`, `ABExperimentProvider`, `PublicPageShell`. The following are barrel-exported (`landing/index.ts`) but rendered by no route (CLEAN-F03):

Dead sections: `PartnerSection`, `SolutionSection`, `TestimonialSection`, `ProductShowcaseSection`, `EstimatorEngineSection`, `FeaturesSection`, `PricingSection` (the `/pricing` route uses inline JSX), `FAQSection`, `ProcessBandSection`.
Exclusive dead helpers (only consumed by the dead sections): `ProductPreview`, `ProductPreviewVariants`, `AnnouncementBanner`, `SectionIntro`, `CtaLink`, `PlaceholderMedia`, `company-proof-data.ts`.

**Coupling (must handle on delete):** update `landing/index.ts` barrel; update `landing-interactivity.test.tsx` (imports some of these); `landing-amigo-redesign.test.tsx` is a guard that asserts these are absent from `/` (it stays). Deleting these does **not** orphan `src/lib/ab-testing/**` (kept alive by Hero/FinalCTA/LandingHeader/ABExperimentProvider).

**KEEP (look dead, are live):** `MotionReveal` (3 live sections), `LaunchFeatureHeading` + `AnimatedProposalRecordSection` (CompanyProofCarousel), `NeatWireframeBackground` (Hero), `constants.ts` (Hero/FinalCTA/Header).

## Tier C — Likely dead (no caller found; dynamic/intent risk → local proof)

| Item | Path | Why likely dead | ID |
|---|---|---|---|
| `/api/share/[token]/events` route | `src/app/api/share/[token]/events/route.ts` | no client `fetch`; events recorded server-side via `after()` in `share/[token]/page.tsx`; 3 tests reference handler | CLEAN-F14 |
| `/workshop/onboarding` (page + loading) | `src/app/workshop/onboarding/` | pure `redirect("/workshop/settings")`; only `onboardingErrorUrl()` builds the path (and drops `?error=`) | CLEAN-F11 |
| `aec-classification/disciplines.ts` (module) | `src/lib/aec-classification/` | only `tests/vitest/aec-classification.test.ts` imports it; 0 runtime callsite | CLEAN-F17 |
| `ab-testing/results-calculator.ts` `calculateResults` | `src/lib/ab-testing/` | only `landing-ab-testing.test.tsx`; no dashboard/admin caller | CLEAN-F18 |

## Tier D — Unused exports inside live files (internalize/remove export)

Test-only exports (referenced only by tests, often as oracles — coordinate test rewrite): `buildProjectChartComparison`, `calculateProjectChartRowTotal` (`project-charts/aggregate-project-charts.ts`), `buildProjectChartComparisonViewFromFacts` (`project-charts/project-comparison-view.ts`), `summarizeProjectPublicationAccessTelemetryMetrics` (`publication/activity-helpers.ts`), `fetchEstimateActivityRetentionMetrics` (`estimates/actions.ts`). See CLEAN-F16.

Duplicate formula (3-way): canonical `computeEstimateRowLineTotal` (live) vs dead `domain/estimate-totals.ts` (CLEAN-F05) vs inline copy in `ai/read-context.ts:740` (CLEAN-F19, only matters if AI kept).

## Tier E — Story-only components (Storybook governance coupling → owner gate)

`src/components/ui/`: `confidence-indicator`, `financial-total-card`, `timeline`, `status-badge`, `data-table` (+ internal `pagination`). Zero runtime consumers; only their `*.stories.*`. Deleting requires simultaneous update of `check-storybook-component-coverage.mjs` manifest + `storybook-plan-matrix` counts or `storybook:validate` breaks. Some may be load-bearing for deferred features (AI confidence, revision timeline). **OWNER_GATE** (CLEAN-F15).

## Not dead — explicitly KEEP despite appearances

`estimate-schema-compat.ts` (+ `isMissingColumnError`/`isMissingRelationError`/`normalizeEstimateRecord`), `allowLegacyFallback`, `LEGACY_MAIN_TAB_ID`, `__legacy_default_tab__`, `domain/estimate-tree.ts` + `estimate-mutations.ts`, all `src/lib/{publication,collaboration,share,auth,proposal-export}/**`, `use-shared-link-session`, `use-project-presence`, `use-project-collaboration-query`, navigation/perf/bfcache providers, notification feature. Rationale in each audit doc and `16_RISK_REGISTER_AND_BLAST_RADIUS.md`.

## Rollup

- Tier A+B = **safe code-only deletion** (~30 files / exports). Tier C = local-proof. Tier D = export hygiene + test rewrite. Tier E = owner gate.
- Estimated removable LOC (Tiers A+B, conservative): ~2,500–3,500 (landing sections are sizable). Exact figure to be measured at implementation via `git diff --stat`.
