# 06 — Component / Hook / Store Cleanup Audit

Covers `src/components/**`, `src/hooks/**`, `src/stores/**`, `src/lib/ui/**`. Method: per-file/per-export reference counting (runtime vs test vs story vs none). Hooks and stores are almost all live; the cleanup weight is in landing scaffolding and a few orphans.

---

### CLEAN-F01 — Dead project-workspace components

Category: DEAD_CODE · Severity: Medium · Confidence: Safe delete
Affected surface: `src/components/workshop/ProjectWorkspaceHeaderRow.tsx`, `ProjectWorkspaceProjectCode.tsx`
Current behavior: Former project-layout header row, removed during estimate-tabs Phase 5; replaced by `ProjectChromeAsync` in the layout actions slot.
Why dead: 0 runtime imports. **Absence is enforced** — `project-dashboard-core-ui.test.ts:33` and `project-dashboard-center-column-ui.test.ts:27` assert `not.toContain("ProjectWorkspaceHeaderRow")`. `ProjectWorkspaceProjectCode`'s only consumer was this row. (A `.next/` chunk reference is a stale build artifact.)
References: Runtime 0; Test = guard tests (assert absent); Story 0.
Action: Delete both files. Files modified: none (guard tests stay green). DB: none.
Benefit: −2 files, removes confusion. Risk: none (tests enforce). Gate: `type-check`+`build`+`test:dom`. Rollback: `git revert`. Decision: DELETE_NOW.

---

### CLEAN-F02 — Orphan `ArchestimatorMark.tsx`

Category: DEAD_CODE · Confidence: Safe delete
`src/components/sidebar/ArchestimatorMark.tsx`: 0 imports; `SidebarHeader` uses `ArchestimatorLogo`. Delete. Gate: `type-check`+`build`. Decision: DELETE_NOW.

---

### CLEAN-F03 — Dead landing-section graveyard

Category: DEAD_CODE · Severity: Medium · Confidence: Safe delete
Affected surface: `src/components/landing/**` (barrel `index.ts`)
Current behavior: `/` (`src/app/page.tsx`) renders only Hero, CompanyProofCarousel, SecondaryClaim, FinalCTA, Header, Footer, SmoothScrollProvider, ABExperimentProvider, PublicPageShell. These are exported but rendered nowhere:
- Sections: `PartnerSection`, `SolutionSection`, `TestimonialSection`, `ProductShowcaseSection`, `EstimatorEngineSection`, `FeaturesSection`, `PricingSection`, `FAQSection`, `ProcessBandSection`.
- Exclusive helpers: `ProductPreview`, `ProductPreviewVariants`, `AnnouncementBanner`, `SectionIntro`, `CtaLink`, `PlaceholderMedia`, `company-proof-data.ts`.
Why dead: each section has 0 runtime refs; helpers' only consumers are the dead sections. `/pricing` uses inline JSX, not `PricingSection`.
References: Runtime 0; Test: `landing-interactivity.test.tsx` imports some; `landing-amigo-redesign.test.tsx` asserts they're absent from `/` (guard — keep). Dynamic: none (static barrel; no `dynamic()`).
Action: Delete the section + helper files; prune `landing/index.ts`; update `landing-interactivity.test.tsx` (remove/retarget). Confirm `ab-testing` stays live via Hero/FinalCTA/Header/ABExperimentProvider (it does).
Files modified: `landing/index.ts`, `landing-interactivity.test.tsx`. DB: none.
Benefit: ~−2–3k LOC, smaller landing bundle/graph. Risk: barrel + test coupling (handled). Gate: `type-check`+`build`+`test:dom`+`e2e/landing-audit`. Rollback: `git revert`. Decision: DELETE_NOW (with barrel + test updates).
**KEEP (look dead, live):** `MotionReveal` (3 live sections), `LaunchFeatureHeading`, `AnimatedProposalRecordSection`, `NeatWireframeBackground`, `constants.ts`.

---

### CLEAN-F09 — Unused drag type exports

Category: UNUSED_EXPORT · Confidence: Safe delete
`src/stores/estimate-ui-store.ts` exports `EstimateDragIntent`, `EstimateDragType` — 0 external importers. Internalize (drop `export`). Gate: `type-check`. Decision: DELETE_NOW.

---

### CLEAN-F15 — Story-only UI primitives (OWNER_GATE)

Category: UNUSED_EXPORT · Severity: Low · Confidence: Owner gate
`src/components/ui/`: `confidence-indicator`, `financial-total-card`, `timeline`, `status-badge`, `data-table` (+ internal `pagination`). 0 runtime consumers; only their `*.stories.*`. Some plausibly serve deferred features (AI confidence, revision timeline, data browsing).
Coupling: `check-storybook-component-coverage.mjs` manifest + `storybook-plan-matrix` counts (809/703) must be updated **with** any removal or `storybook:validate` breaks.
Action: Owner decides keep-for-design-system vs cut. If cut, remove component + story + manifest entry + matrix count together. Gate: `storybook:validate`. Decision: OWNER_GATE.

---

### CLEAN-F28 — Duplicate `BulkActionToolbar` (OWNER_GATE)

Category: DUPLICATE_CODE · Severity: Medium · Confidence: Owner gate
Two implementations: `components/workshop/BulkActionToolbar.tsx` (simple single-action API; callers: `ProjectEstimatesTable`, `projects-page-client`, `ComponentLibraryManager`) and `components/ui/bulk-action-toolbar.tsx` (generic `actions[]` API; callers: `EstimateSheetContent`, `EstimateSheetTree`, `component-library/index.tsx`). APIs not drop-in compatible.
Action: Consolidate to the `ui/` generic version; migrate the 3 workshop callers, then delete the workshop variant. Not a safe delete without migration. Phase P3. Gate: `test:dom` after migration. Decision: OWNER_GATE.

---

### CLEAN-F27 (component portion) — `ProductPreviewVariants` dead

Covered in F03 (exclusive helper). Also the on-ramp for "Revision Intelligence / Proposal Comparisons" marketing visuals — doc/marketing remnants handled in `12`. Decision: DELETE_NOW (component).

---

## Hooks & stores — all verified live (KEEP)

Hooks (11): `use-estimate-query`, `use-estimate-row-mutations`, `use-estimate-cursor-broadcast`, `use-estimate-workspace-state`, `use-navigation-router`, `use-prefetch-on-hover`, `use-project-presence`, `use-shared-link-session`, `use-library-editor-chrome`, `use-project-collaboration-query`, `use-stable-callback` — each has ≥1 runtime consumer.
Stores (3): `estimate-ui-store` (EstimateSheetContent), `navigation-ui-store` (overlay/listener/bfcache/perf), `project-estimates-store` (ProjectEstimatesClient/Table) — all live.

## KEEP despite looking stale

`estimate-tree-data.ts` (20+ consumers; active unification corridor — transitional helpers are **Needs-migration-context**, not safe-delete), `workshop-tree.tsx`, `estimate-workshop-drag.ts`, `tree-row-affordances.tsx`, all `components/share/**` (security/publication), `SharedLinkActivityFeed`, `features/notifications/**`, `segmented-control` (charts), `dropdown-popup` (internal), navigation/perf/bfcache providers.
