# 10 — Implementation Phases

**Date:** 2026-06-12 · Each phase: objective · affected files · DB changes · UI changes · tests · rollback · definition of done.
Validation shorthand: **VG** = no new failures vs the Phase 0 baseline across `bun run validate` + `bun run build` ([09](09_TEST_AND_VALIDATION_PLAN.md) §9; baseline caveat §0 there).

---

## Phase 0 — Current-state audit and terminology map (no product code changes)

- **Objective:** freeze the evidence base: confirm all "sheet" references and categorize user-facing / legacy-internal / Excel-related; record the failing-test baseline; produce the terminology migration map before any source edit.
- **Affected files:** none (docs only — this plan pack *is* the Phase 0 artifact: [01](01_CURRENT_STATE_AUDIT.md) §16–17 is the categorized terminology map; [05](05_ESTIMATE_TABS_UI_UX_PLAN.md) §10 is the migration map).
- **DB/UI changes:** none.
- **Tests:** run `bun run validate`, `bun run test`, `bun run test:dom`; record the failure list against `.ai/10_state/current-state.md:60-68`.
- **Rollback:** n/a.
- **DoD:** baseline failure list recorded in the implementation run log; terminology map reviewed; this pack's [15_REVIEW_CHECKLIST.md](15_REVIEW_CHECKLIST.md) passes its stale-claim section.

## Phase 1 — Database tab foundation

- **Objective:** `estimate_tabs` exists; every estimate has exactly one default tab; every node attached; constraints/RLS/indexes live; **old app behavior unchanged** (no app code reads tabs yet, except type regen).
- **Affected files:** new `supabase/migrations/<ts>_estimate_tabs_foundation.sql` (M1, [03](03_DATABASE_MIGRATION_PLAN.md) §3–8 incl. `validate_estimate_node_tree` update, constraint swap, tab RPCs, template-insert RPC tab fix, `estimate_sheet_events.estimate_tab_id`); new `scripts/prove-estimate-tabs-postgres.mjs`; new `tests/vitest/estimate-tabs-schema.test.ts`; regenerated `src/lib/supabase/types.ts` (after linked apply — separately authorized); `src/lib/estimates/actions.ts` minimal touch: `createEstimateWithDefaultTree` creates the default tab (`:962-1068`).
- **DB changes:** per [03](03_DATABASE_MIGRATION_PLAN.md) §10 M1 (split M1a/M1b allowed).
- **UI changes:** none.
- **Tests:** schema contract test; RLS/backfill proof harness (P1–P5 + denial cases); `bun run type-check` post-regen; VG.
- **Rollback:** [03](03_DATABASE_MIGRATION_PLAN.md) §12 notes (drop column/table before NOT NULL flip; constraint-recreate notes after). App rollback unnecessary — nothing reads tabs.
- **DoD:** proofs P1–P5 pass on local harness; linked apply done **or** explicitly deferred with local-only label; `estimate_tabs` visible in regenerated types; estimate editor, export, share, AI flows behave identically (smoke: open estimate, edit row, export).

## Phase 2 — Repository/domain tab support (compat wrappers on)

- **Objective:** tab-aware loaders/actions/keys exist; legacy call sites run through equivalence-proven wrappers.
- **Affected files:** `src/lib/repositories/workspace-repository.ts` (getEstimateTabs/getDefaultEstimateTab/getEstimateTabTree/resolveEstimateTabRouteContext + wrappers), `src/lib/repositories/estimate-repository.ts`, `src/lib/estimates/actions.ts` (tab CRUD actions, root-create tab param, reorder same-tab validation, event stamping), `src/lib/estimates/types.ts` + `src/lib/domain/estimate-tree.ts` (types, [04](04_DOMAIN_AND_REPOSITORY_PLAN.md) §1), `src/hooks/use-estimate-query.ts` (key factory + `useEstimateTabTreeQuery`), `src/hooks/use-estimate-row-mutations.ts` (invalidation targets), `src/hooks/use-estimate-workspace-state.ts` (per-tab records), `src/lib/activity/activity-composer.ts` (+ copy dictionary) for `tab_*` labels.
- **DB changes:** none (RPCs landed in Phase 1).
- **UI changes:** none visible (wrappers keep default-tab behavior).
- **Tests:** `estimate-tab-actions.test.ts`; wrapper-equivalence test; existing characterization suites untouched and green; VG.
- **Rollback:** revert the slice — wrappers mean no caller depends on new paths yet.
- **DoD:** all new functions unit-covered; `getProjectEstimateTreeByEstimate` callers (export route `route.ts:46`, AI read context, snapshot builder, `fetchEstimateTree`) verified byte-equivalent on single-tab fixtures.

## Phase 3 — Estimate editor multi-tab UI

- **Objective:** tab strip + tab CRUD live in the editor; per-tab trees/selection/expansion; current tree behavior preserved per selected tab.
- **Affected files:** new `src/components/workshop/estimate-sheet/EstimateTabStrip.tsx`; `src/components/workshop/EstimateSheetContent.tsx` (mount strip, per-tab keying, empty state, cursor tab filter); `src/components/workshop/EstimateSheetTree.tsx` (activeTabId, label, per-tab URL sync); `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` (use `resolveEstimateTabRouteContext`); `src/components/workshop/EstimateWorkspaceClient.tsx` (props); `src/hooks/use-estimate-cursor-broadcast.ts` (tabId in payload); `src/components/ui/tree-panel-header.tsx` or the tab-strip primitive (overflow/menu slots, [05](05_ESTIMATE_TABS_UI_UX_PLAN.md) §9).
- **DB changes:** none.
- **UI changes:** strip, lifecycle menus/dialogs, empty-tab state, spring-loaded drag-switch, a11y paths ([05](05_ESTIMATE_TABS_UI_UX_PLAN.md) §1–9, §12–13).
- **Tests:** `estimate-tab-strip.test.tsx`; extended dnd/cost-input/context-menu suites; perf suites green (zero re-render guard); e2e scenarios 1–5; VG.
- **Risks:** perf-suite trips from provider nesting; URL-sync races (mitigations: mount strip outside memoized tables; reuse existing replaceState path).
- **Rollback:** revert UI slice; Phases 1–2 stay (invisible).
- **DoD:** manual QA scenarios 1–8 of [05](05_ESTIMATE_TABS_UI_UX_PLAN.md) §14 pass on desktop + 375px; old node/estimate URLs land correctly; tab creation/duplication/reorder remains internal/dev-only until Phase 6 is complete in the same beta release train (D-15). If Phase 3 must ship alone, expose tab switching for the backfilled default tab only and hide create/duplicate controls.

## Phase 4 — Terminology rebrand (user-facing "sheet" → "tab"/"estimate")

- **Objective:** flip the copy table ([05](05_ESTIMATE_TABS_UI_UX_PLAN.md) §10) — user-facing only; legacy internal names stay (01 §17).
- **Affected files (copy clusters):** `ProjectEstimatesClient.tsx`, `ProjectEstimatesTable.tsx` **+ `src/lib/mass-deletion/bulk-action.ts` (atomic DELETE-phrase pair)**, `NewEstimateForm.tsx`, `EstimateSheetContent.tsx`, `EstimateWorkspaceClient.tsx`, `EstimateSheetTree.tsx`, `ProjectEstimateMetadataStrip.tsx`, `estimate-sheet/activity-history.tsx` + `src/lib/activity/activity-composer.ts`/`activity-formatters.ts`, `ProjectTeamspaceHeader.tsx` + `src/lib/collaboration/actions.ts` + invite surfaces (`src/app/invite/[token]/page.tsx`, `accept/route.ts`, pending-invite files), `LiveProjectCard.tsx`, `projects-page-client.tsx`, `WorkshopHomebaseClient.tsx`, `ProjectDashboardClient.tsx`, `ProjectPublicationHeader.tsx`, share components (`SharePageTabs.tsx`, `ShareEstimateTreePanel.tsx`, `share/[token]/page.tsx` OG copy), `InsertIntoEstimatePicker.tsx`, `TemplateGallery.tsx`/`TemplateEditorSheet.tsx`/`ComponentLibraryManager.tsx` aria families, `src/lib/estimates/actions.ts` error copy + default name, `src/lib/workshop/actions.ts`, AI label surfaces (`src/lib/ai/read-context.ts` labels; intent regexes gain "tab" **additively**, `EstimateCopilotFloatingButton.tsx:103-145`, `draft.ts:128-179`). Marketing pages per owner-reviewed sub-decision ([12](12_OPEN_QUESTIONS_AND_DECISIONS.md) D-10).
- **DB changes:** none (stored event types, table names, sheet_code untouched).
- **UI changes:** copy only.
- **Tests:** batched copy-coupled test updates ([09](09_TEST_AND_VALIDATION_PLAN.md) §10) in the same commits; e2e label assertions; VG.
- **Rollback:** revert copy commits (no data impact — stored names from `${sheetCode} Estimate Sheet` intentionally not rewritten, [12](12_OPEN_QUESTIONS_AND_DECISIONS.md) D-9).
- **DoD:** `rg -i 'sheet' src/` bucket-A residue = only intentional keeps (Excel/primitive/material/marketing-approved); copy table 100% applied; docs/tests updated.

## Phase 5 — Templates panel unified sources

- **Objective:** Custom Templates + Projects sections with preview/drag/drop/insert; custom-template management preserved; permission-safe browsing/insertion; all readable workspace projects visible by default in the Projects section.
- **Affected files:** new `src/lib/reusable-sources/types.ts`; new read/search actions (in `src/lib/component-library/actions.ts` or new `src/lib/reusable-sources/actions.ts`); new migration `<ts>_insert_estimate_subtree_rpc.sql` ([06](06_TEMPLATES_PANEL_UNIFICATION_PLAN.md) §7, [08](08_ACCESS_SECURITY_RLS_PLAN.md) §5); `src/lib/estimates/actions.ts` (`insertProjectSourceIntoEstimate`); `src/components/workshop/component-library/index.tsx`, `tree/TemplatesTree.tsx` (section wrapper + new datum variants), `templates.ts` (new mime/parser), `estimate-sheet/rows/drop-zones.tsx`; browse surface: `TemplatesBrowseManager.tsx`, `TemplateGallery.tsx`, `TemplatePreviewDock.tsx`, `InsertIntoEstimatePicker.tsx` (+ tab select); `NewTemplateModal.tsx` (save-as-template from source).
- **DB changes:** one migration: the insert RPC + `project_source_inserted` event support.
- **UI changes:** [06](06_TEMPLATES_PANEL_UNIFICATION_PLAN.md) §4–6, §9–10.
- **Tests:** panel DOM suite including all-readable-projects default plus optional current-project narrowing; insert-action suite incl. all denial scenarios ([08](08_ACCESS_SECURITY_RLS_PLAN.md) §7); drag-payload tests; e2e 6–7; perf scale check; VG.
- **Rollback:** revert app slice; the RPC is additive and inert without callers.
- **DoD:** required rule holds under test — no unreadable project/estimate/tab ever listed; insertion denied without target edit rights; custom-template management behavior unchanged (existing template suites green).

## Phase 6 — XLSX export tab support

- **Objective:** multi-tab exports per [07](07_XLSX_EXPORT_TABS_PLAN.md) §3; single-tab byte-shape preserved; `?tab=` param; sanitizer.
- **Affected files:** new `src/lib/proposal-export/worksheet-name.ts`; `create-proposal-workbook.ts` (per-tab worksheets, parameterized formula refs, global Summary blocks, Source Breakdown Tab column); `build-proposal-export-model.ts` (per-tab model entry); export `route.ts` (+ `?tab=`, all-tabs loader off the wrapper) + `filename.ts` (tab slug part); `EstimateSheetContent.tsx`/`ProposalExportPreviewDialog.tsx` (scope chips, signature input); `scripts/benchmark-proposal-workbook.ts` (multi-tab fixture).
- **DB changes:** none (optional index review only, [03](03_DATABASE_MIGRATION_PLAN.md) §10 M2).
- **UI changes:** preview scope chips.
- **Tests:** [09](09_TEST_AND_VALIDATION_PLAN.md) §5 full export suite; e2e 8; benchmark; hosted smoke (`bun run launch:verify-hosted-export`) when authorized — provider proof labeled separately; VG.
- **Rollback:** revert slice; route falls back to wrapper (default-tab export) which is the Phase 3–5 interim behavior ([07](07_XLSX_EXPORT_TABS_PLAN.md) §10).
- **DoD:** single-tab regression assertions pass unmodified; multi-tab workbook opens in a real spreadsheet app with correct worksheet tabs, live formulas, working Summary links; release gate D-15 cleared so beta users can create multiple tabs without export omission risk.

## Phase 7 — Hardening

- **Objective:** access/RLS verification, performance checks, regression sweep, e2e validation.
- **Affected files:** tests/scripts only (plus fixes they surface).
- **Tests:** full [09](09_TEST_AND_VALIDATION_PLAN.md) §8 matrix; `prove:estimate-tabs-rls`; perf suites + route-transition e2e; full manual QA ([05](05_ESTIMATE_TABS_UI_UX_PLAN.md) §14, [09](09_TEST_AND_VALIDATION_PLAN.md) §11); publication snapshot v1.2 + old-snapshot rendering checks ([02](02_TARGET_ARCHITECTURE.md) §11); collaboration cursor cross-tab check.
- **Rollback:** n/a (fix-forward phase).
- **DoD:** zero new failures vs baseline across the entire matrix; denial scenarios 1–9 of [08](08_ACCESS_SECURITY_RLS_PLAN.md) §7 proven; hosted export smoke green (or explicitly deferred with label).

## Phase 8 — Documentation, rollout, and cleanup

- **Objective:** truth surfaces updated; evidence archived; compatibility shims identified for removal once stable.
- **Affected files:** `.ai/10_state/current-state.md`, `.ai/10_state/decisions.md` (tab architecture + rebrand decisions), `.ai/06_specs/feature-inventory.md` if present-claims change; evidence bundle under `.ai/09_archive/store/` (post-implementation, not during this docs pass); shim deletions per criteria in [04](04_DOMAIN_AND_REPOSITORY_PLAN.md) §12 (legacy `areaTree` key, wrapper-only paths, dead `estimate-ui-store.ts`, dead `useEstimateQuery`/`useMoveEstimateRowItem`); optional rename batches (`EstimateSheet*` → `EstimateTab*`) **with** their source-contract test updates.
- **DB changes:** none.
- **Tests:** rename batches gated by green characterization + contract updates; VG.
- **Rollback:** per-batch reverts.
- **DoD:** `.ai` truth surfaces reflect shipped reality; shim-deletion grep gates pass; remaining "sheet" identifiers are the deliberate keep-list only.

---

**Sequencing rationale:** DB → repo → UI → copy → panel → export → hardening → cleanup keeps every phase invisible until its consumer ships, mirrors the rollout strategy in [02](02_TARGET_ARCHITECTURE.md) §14, and makes each phase independently revertable. The riskiest single artifact is the Phase 1 migration (constraint swap + validator update) — hence its dedicated proof harness before anything user-visible exists.

## Evidence Used

- [03](03_DATABASE_MIGRATION_PLAN.md) §10 (migration sequence), [04](04_DOMAIN_AND_REPOSITORY_PLAN.md) §3–6, §12 (repo surface + shim criteria), [05](05_ESTIMATE_TABS_UI_UX_PLAN.md) §9–10, §14 (UI ownership, copy table, QA), [06](06_TEMPLATES_PANEL_UNIFICATION_PLAN.md) §7–10, [07](07_XLSX_EXPORT_TABS_PLAN.md) §3–10, [08](08_ACCESS_SECURITY_RLS_PLAN.md) §5–7, [09](09_TEST_AND_VALIDATION_PLAN.md) §8–10
- `src/lib/estimates/actions.ts:962-1068` (Phase 1 app touch); `src/app/api/.../proposal.xlsx/route.ts:46` (wrapper caller list)
- `.ai/10_state/current-state.md:60-68` (baseline); `.ai/10_state/decisions.md` (no-flag posture precedent)
