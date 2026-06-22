# Current Evidence

This file records the evidence used to create the plan. Re-verify these anchors before implementation because the worktree was dirty when this pack was written and another coding agent was actively implementing the existing Library plan.

## Active Context

- `.ai/10_state/current-state.md:12` says the project is pre-launch closed-beta MVP and favors targeted validation over heavyweight ceremony.
- `.ai/10_state/current-state.md:27` records that full `bun run validate` is known red from unrelated baseline issues and all-DOM can hang.
- `.ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/README.md:27` scopes the active Library pack to the Library page, component library, template browser, template editor, and Library overlays.
- `.ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/README.md:99` already calls the in-estimate panel a tracked residual for native prompt/confirm cleanup.
- `.ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/README.md:100` says trust cues should be visible wherever a user reuses a component or template.

## UX Audit Evidence

- `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/post-fix-scenario-tests.md:31` defines `UX-013`: stale Library source replacement needs stale badge plus refresh/compare path.
- `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/post-fix-scenario-tests.md:48` defines `UX-030`: mobile or poor-network estimate edits need saved/pending/retry/resume clarity.
- `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/post-fix-scenario-tests.md:51` defines `UX-033`: stale or conflicting supplier/cost-source data needs assigned refresh, reconciliation, accepted cost, and audit trail.
- `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/post-fix-scenario-tests.md:52` defines `UX-034`: spec sheets need version metadata, approval state, rollback, and audit visibility.
- `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/post-fix-scenario-tests.md:59` defines `UX-041`: evidence status must distinguish related tests, browser proof, provider proof, and missing post-fix proof.
- `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/post-fix-scenario-tests.md:62` defines `UX-044`: invalid numeric data and keyboard tree actions need recoverable accessible tests.

## Code Anchors

### Estimate Sheet Reuse

- `src/components/workshop/EstimateSheetContent.tsx:1274` lazy-loads the Library dataset when the sidebar or command palette needs it.
- `src/components/workshop/EstimateSheetContent.tsx:1309` invalidates the scoped Library query prefix after sidebar Library mutations.
- `src/components/workshop/EstimateSheetContent.tsx:2067` inserts a Library item into the selected target node.
- `src/components/workshop/EstimateSheetContent.tsx:2415` replaces a row item with a Library item.
- `src/components/workshop/EstimateSheetContent.tsx:2512` promotes eligible project-specific rows back to the workspace Library.
- `src/components/workshop/EstimateSheetContent.tsx:3088` renders `EstimateRightSidebar` with Library items, templates, project sources, suppliers, brands, and folders.
- `src/lib/estimates/actions.ts:794` builds the source snapshot from Library item fields.
- `src/lib/estimates/actions.ts:2478` validates the insert target node before writing an estimate row.
- `src/lib/estimates/actions.ts:2559` replaces an estimate row with a Library payload using expected row revision.

### Right Sidebar And Source Labels

- `src/components/workshop/component-library/index.tsx:140` defines the `Library`, `Project`, and `Templates` tabs.
- `src/components/workshop/component-library/index.tsx:259` renders staleness/source label information in the preview panel.
- `src/components/workshop/component-library/index.tsx:1242` splits Library, Project, and Templates state paths.
- `src/components/workshop/component-library/index.tsx:1454` inserts Library items from the sidebar.
- `src/components/workshop/component-library/index.tsx:1560` adds project sources to the estimate target.
- `src/components/workshop/component-library/index.tsx:2150` derives source labels for the active sidebar tab.
- `src/components/workshop/estimate-sheet/rows/cells.tsx:76` detects project-specific rows.
- `src/components/workshop/estimate-sheet/rows/cells.tsx:107` maps row source tones to visible/screen-reader labels.
- `src/components/workshop/estimate-sheet/rows/cells.tsx:476` handles replacement drops from Library item drag payloads.
- `src/components/workshop/estimate-sheet/rows/row-table.tsx:309` preserves row quantity/contingency/misc values while replacing from a Library item.

### Cache, Source Trust, And Attachments

- `src/lib/component-library/query-keys.ts:7` defines the full workspace Library query key.
- `src/lib/component-library/query-keys.ts:20` defines the lite Estimate Sheet sidebar Library key.
- `src/lib/component-library/query-keys.ts:30` defines the rows management Library key.
- `src/lib/component-library/query-keys.ts:42` defines the templates cache key.
- `src/components/workshop/library/source-trust-model.ts:4` defines stale and very-stale day thresholds.
- `src/components/workshop/library/source-trust-model.ts:85` classifies pricing freshness.
- `src/components/workshop/library/source-trust-model.ts:160` returns component source-trust chips.
- `src/app/api/component-library/attachments/route.ts:125` uploads component attachments.
- `src/app/api/component-library/attachments/route.ts:175` deletes owned uploaded attachments.
- `src/components/workshop/component-library-manager/AddComponentModal.tsx:839` validates variant/cost/attachment inputs.
- `src/components/workshop/component-library-manager/AddComponentModal.tsx:1040` cleans up uploaded draft assets.
- `src/lib/component-library/actions.ts:299` validates attachment content type and size.
- `src/lib/component-library/actions.ts:415` normalizes attachments into variant payloads.

## Existing Tests To Extend

- `tests/vitest/estimate-sheet-library-insert.test.tsx`
- `tests/vitest/estimate-sheet-actions-authz.test.ts`
- `tests/vitest/estimate-sheet-library-lazy-load.test.tsx`
- `tests/vitest/project-component-projection.test.ts`
- `tests/vitest/estimate-sheet-row-details-crud.test.tsx`
- `tests/vitest/library-source-trust.test.ts`
- `tests/vitest/library-workspace-switch-cache.test.ts`
- `tests/vitest/library-components-cache.test.tsx`
- `tests/vitest/library-templates-cache.test.tsx`
- `tests/vitest/component-library-versioning-schema.test.ts`
- `tests/vitest/library-telemetry-emit.test.ts`
- `tests/vitest/share-snapshot-redaction.test.tsx`
- `e2e/workshop-library-routes.spec.ts`

## Known Drift Hazards

- Old Library docs may cite stale line numbers from before the current dirty implementation work. Re-run `rg` before relying on exact call-site line numbers.
- The current source-trust implementation appears in files that were untracked or dirty at pack creation time, so implementation should treat it as current worktree reality, not as merged baseline.
- Do not resurrect old unscoped-cache claims without checking `src/lib/component-library/query-keys.ts` and the related cache tests.
- Do not store new proof under `.ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/_evidence/`; use this pack's `_evidence/` folder when implementation starts.

## Readiness Repair Evidence

- UX/UI audit scored the original pack at `76/100`; repairs added `07-UX-IA-COPY-AND-A11Y-CONTRACT.md`.
- Security/data audit scored the original pack at `84/100`; repairs added `09-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md`.
- Performance/network/cache audit scored the original pack at `72/100`; repairs added `11-PERFORMANCE-NETWORK-AND-CACHE-BUDGETS.md`.
- DB/data-integrity audit scored the original pack at `74/100`; repairs added `10-DATABASE-MIGRATION-AND-RPC-READINESS.md`.
- QA/readiness audit scored the original pack at `78/100`; repairs added `12-IMPLEMENTATION-READINESS-CHECKLIST.md`.
- Blast-radius review flagged `EstimateSheetContent.tsx`, `EstimateRightSidebarBase`, `AddComponentModal`, and `EstimateSheetTree` as high-conflict integration surfaces; repairs added `08-BLAST-RADIUS-AND-INTEGRATION-MAP.md`.
- `06-PLAN-QUALITY-SCORECARD.md` records the repaired plan score and defines `100` as planning completeness, not app implementation.
