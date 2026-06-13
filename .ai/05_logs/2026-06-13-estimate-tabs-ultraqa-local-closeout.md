# UltraQA Report — Estimate Tabs Local Closeout

## Goal and success criteria

- **Goal:** Adversarially re-check the local implementation state for `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates` before any merge-to-main decision.
- **Stop condition:** Stop when local implementation evidence is refreshed and only explicit owner/provider/hosted/manual proof gates remain, or continue fixing if local planned/failed implementation rows remain.
- **Safety bounds applied:** No Docker, no linked Supabase mutation/typegen, no hosted/Vercel/production deploy, no external provider writes, no destructive git operations.

## Scenario matrix

| ID | User/attacker model | Scenario | Command/harness | Expected signal | Actual result | Status | Evidence | Cleanup |
|----|---------------------|----------|-----------------|-----------------|---------------|--------|----------|---------|
| UQA-001 | Release operator | Dirty-worktree and branch closeout guard | `git status --short --branch`; `git rev-list --left-right --count origin/main...HEAD`; `git diff --check` | Worktree clean after commits; branch relation known; no whitespace errors | Clean branch `feat/estimate-tabs-phase5-templates-panel`; `origin/main...HEAD` = `3 54`; `git diff --check` exit 0 | Pass | Terminal closeout refresh on 2026-06-13 | No temporary artifacts |
| UQA-002 | Normal estimator | Template source search/filter/preview/save-as-template local seams | `bun x vitest run tests/vitest/reusable-sources-actions.test.ts tests/vitest/component-library-ui.test.tsx tests/vitest/template-browse-project-sources.test.tsx tests/vitest/library-overview.test.tsx --maxWorkers=1` | Project sources search, preview metadata, lazy browse route, refresh, and explicit save-as-template paths pass | 4 files / 77 tests passed | Pass | R4.4-R4.5 refresh | No temporary artifacts |
| UQA-003 | Unauthorized or stale collaborator | Project-source listing/search must not expose pending invites and must stay lazy | Same R4 command plus prior R13.2 focused command | Pending-invite sources excluded; 20-project path lazy until project/estimate expansion | Tests pass; action assertions cover pending-invite exclusion and 20-project lazy call counts | Pass | R4.4/R13.2 evidence | No temporary artifacts |
| UQA-004 | Deep-link recipient | Invite/share/export links must not be rewritten into tab-only URLs | `bun x vitest run tests/vitest/project-invite-entry-route.test.ts tests/vitest/workshop-pending-invite.test.tsx tests/vitest/project-publication-email-links.test.ts tests/vitest/share/share-page-get-routes-contract.test.ts tests/vitest/project-publication-actions.test.ts --maxWorkers=1` | `/invite/[token]` and `/share/[token]` contracts preserved | 5 files / 40 tests passed in R9.3/R13 refresh | Pass | `.ai/05_logs/2026-06-13-estimate-tabs-r9-3-r13-local-proof-run.md` | No temporary artifacts |
| UQA-005 | Performance-sensitive user | Tab strip and reusable-source browsing should not eagerly re-render or load every project outline | `bun x vitest run tests/vitest/perf --maxWorkers=1`; R13.2 lazy-source focused suite | Perf suite green; project-root, project-estimate, and estimate-outline reads remain staged | Perf 4 files / 14 tests passed; lazy-source focused 3 files / 67 tests passed | Pass | `.ai/05_logs/2026-06-13-estimate-tabs-r9-3-r13-local-proof-run.md` | No temporary artifacts |
| UQA-006 | Accessibility keyboard user | Tab lifecycle controls maintain focus/announcements without drag-only affordances | `bun x vitest run tests/vitest/estimate-tab-strip.test.tsx --maxWorkers=1` | Live region/focus paths, non-drag paths, and cross-tab rejection announcements pass | 1 file / 9 tests passed after the R1.7 rejection update | Pass | `.ai/05_logs/2026-06-13-estimate-tabs-r1-7-cross-tab-rejection-run.md` | No temporary artifacts |
| UQA-007 | Malicious prompt or misleading output | Do not confuse local proof with provider/manual proof or merge despite open gates | RTM grep for `planned`, `provider proof open`, and `hosted`; command exit codes checked | No non-legend `planned`; remaining gates explicitly marked provider/hosted/manual after R2.4 delegated review | Only legend contains `planned`; open rows are external proof gates | Pass | RTM closeout refresh plus R2.4 addendum | No temporary artifacts |
| UQA-008 | External/live-system verifier | Linked Supabase, hosted route smoke, browser/Storybook a11y, two-browser QA, production deploy | Blocked by safety boundary without explicit provider/hosted authorization | No external mutations or deploys performed; boundary recorded | External proof remains open; merge not performed | Blocked | RTM rows R1.5, R4.4, R4.5, R8.1, R8.4, R9.1-R9.3, R10.3-R10.4, R12.3, R13.3-R13.4 | No provider state touched |
| UQA-009 | Product owner delegate | R2.4 public marketing copy owner review | Source-text contract + targeted public copy residue grep | Public non-Excel product copy says estimates/tabs; Excel/spreadsheet wording remains only for external files | New contract passed and residue grep found only allowed FAQ/test hits | Pass | `.ai/05_logs/2026-06-13-estimate-tabs-r2-4-owner-review-copy-alignment.md` | No runtime artifacts |
| UQA-010 | Multi-tab estimator | Proposal preview/export scope chips mirror all-tabs default route and active-tab `?tab=` route | `bun x vitest run tests/vitest/proposal-export-preview.test.tsx tests/vitest/proposal-export-route.test.ts tests/vitest/proposal-export-route-workbook.test.ts tests/vitest/proposal-workbook.test.ts tests/vitest/proposal-export-model.test.ts --maxWorkers=1` | All-tabs chip selected by default; active-tab chip switches href to `?tab=tab-main`; workbook/model route tests still green | 5 files / 25 tests passed after a red preview-contract run | Pass | `.ai/05_logs/2026-06-13-estimate-tabs-r8-5-preview-scope-chips-run.md` | No runtime artifacts |
| UQA-011 | Ask/AI user | Current-estimate Ask context and activity audit should be tab-aware without leaking tab IDs to provider context | `bun x vitest run tests/vitest/ai-ask-read-context.test.ts tests/vitest/ai-ask-route.test.ts tests/vitest/ai-audit-flow.test.ts tests/vitest/ai-audit-schema.test.ts tests/vitest/ai-package-builder-read-tools.test.ts tests/vitest/ai-package-builder-draft.test.ts tests/vitest/ai-package-builder-route.test.ts --maxWorkers=1` | Provider context groups by tab names; raw tab IDs absent from provider JSON; audit inputs include `estimate_tabs` and tab IDs in hashed filters | 7 files / 118 tests passed after red read-context contract | Pass | `.ai/05_logs/2026-06-13-estimate-tabs-r11-3-ai-tab-context-run.md` | No runtime artifacts |
| UQA-012 | Multi-tab drag user | Estimate-tree node drop on another tab must reject instead of silently switching tabs | `bun x vitest run tests/vitest/estimate-tab-strip.test.tsx --maxWorkers=1` | Cross-tab tree-node drop keeps the current tab active and announces the D-7 workaround | 1 file / 9 tests passed; focused eslint passed | Pass | `.ai/05_logs/2026-06-13-estimate-tabs-r1-7-cross-tab-rejection-run.md` | No runtime artifacts |

## Commands run

- `[0] bun x vitest run tests/vitest/reusable-sources-actions.test.ts tests/vitest/component-library-ui.test.tsx tests/vitest/template-browse-project-sources.test.tsx tests/vitest/library-overview.test.tsx --maxWorkers=1` — R4.4-R4.5 local proof refresh; 4 files / 77 tests passed.
- `[0] bun x vitest run tests/vitest/proposal-export-preview.test.tsx --maxWorkers=1` — R8.5 preview scope-chip red/green contract; failed before implementation, then passed 1 file / 3 tests after implementation.
- `[0] bun x vitest run tests/vitest/proposal-export-preview.test.tsx tests/vitest/proposal-export-route.test.ts tests/vitest/proposal-export-route-workbook.test.ts tests/vitest/proposal-workbook.test.ts tests/vitest/proposal-export-model.test.ts --maxWorkers=1` — R8.5 adjacent export/model regression; 5 files / 25 tests passed.
- `[0] bun x vitest run tests/vitest/ai-ask-read-context.test.ts --maxWorkers=1` — R11.3 read-context red/green contract; failed before implementation, then passed 1 file / 9 tests after implementation.
- `[0] bun x vitest run tests/vitest/ai-ask-read-context.test.ts tests/vitest/ai-ask-route.test.ts tests/vitest/ai-audit-flow.test.ts tests/vitest/ai-audit-schema.test.ts tests/vitest/ai-package-builder-read-tools.test.ts tests/vitest/ai-package-builder-draft.test.ts tests/vitest/ai-package-builder-route.test.ts --maxWorkers=1` — R11.3 adjacent AI/package-builder regression; 7 files / 118 tests passed.
- `[0] bun x vitest run tests/vitest/estimate-tab-strip.test.tsx --maxWorkers=1` — R1.7/R13.3 tab-strip regression; 1 file / 9 tests passed.
- `[0] bunx eslint src/components/workshop/estimate-sheet/EstimateTabStrip.tsx src/components/workshop/EstimateSheetTree.tsx src/components/workshop/estimate-sheet/drag-types.ts tests/vitest/estimate-tab-strip.test.tsx` — R1.7 focused lint passed with 0 errors / 0 warnings.
- `[0] bun x vitest run tests/vitest/estimate-tab-strip.test.tsx tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-sheet-tree-dom.test.tsx tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/estimate-tabs-schema.test.ts --maxWorkers=1` — R1.7 adjacent tab/tree/reorder/schema regression; 5 files / 62 tests passed.
- `[0] bun run type-check` — TypeScript still passes after the R1.7 rejection update.
- `[0] git diff --check` — No whitespace errors after the R1.7 rejection update.
- `[1] bun run validate` — failed once in DOM Vitest on stale `ai-package-builder-security-contract` activity-read assertions from the R11.3 tab-context change.
- `[0] bun x vitest run tests/vitest/ai-package-builder-security-contract.test.ts --maxWorkers=1` — repaired R11.3 security contract; 1 file / 9 tests passed.
- `[0] bun run validate` — full validation passed: type-check passed; ESLint 0 errors / 549 warnings; design-system passed; design lint passed; unit tests 9 passed; DOM Vitest 243 files passed / 1 skipped and 1808 tests passed / 3 skipped.
- `[0] bunx eslint src/lib/ai/read-context.ts tests/vitest/ai-ask-read-context.test.ts` — R11.3 focused lint passed with 0 errors / 0 warnings.
- `[0] bun run type-check` — TypeScript still passes after the R11.3 AI tab-context update.
- `[0] git diff --check` — No whitespace errors after the R11.3 AI tab-context update.
- `[0] bunx eslint src/components/workshop/EstimateSheetContent.tsx src/components/workshop/ProposalExportPreviewDialog.tsx tests/vitest/proposal-export-preview.test.tsx` — R8.5 focused lint passed with 0 errors / 0 warnings.
- `[0] bun run type-check` — TypeScript still passes after the R8.5 scope-chip update.
- `[0] git diff --check` — No whitespace errors after the R8.5 scope-chip update.
- `[0] git status --short --branch` — Worktree clean on `feat/estimate-tabs-phase5-templates-panel`.
- `[0] git rev-list --left-right --count origin/main...HEAD` — Branch relation is `3 54` versus `origin/main`.
- `[0] rg -n "planned" 13_REQUIREMENTS_TRACEABILITY_MATRIX.md` — Only the status legend still contains `planned`.

## Failures found

- Full validation initially found one stale R11.3 AI package-builder security-contract assertion. It was fixed to expect tab-aware activity attribution while retaining bounded-read/no-snapshot guarantees, then focused security tests and full validation passed.
- The R1.7 cross-tab node-drop rejection gap, R8.5 preview scope-chip gap, and R11.3 AI tab-context gap are fixed and re-proven locally.
- Completion remains blocked by external provider/hosted/manual gates that cannot be safely satisfied in this session without explicit provider/deploy/manual authorization; the R2.4 owner/product-review gate, R8.5 preview scope-chip follow-up, and R11.3 AI tab-context follow-up are now closed locally.

## Fixes applied

- `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates/13_REQUIREMENTS_TRACEABILITY_MATRIX.md` now marks R4.4-R4.5 as local-only implemented with provider proof open instead of `planned`, records R1.7 as deferred move RPC with local v1 rejection implemented, and marks R8.5 preview scope-chip UX plus R11.3 AI tab context/audit attribution as locally implemented.
- `.ai/05_logs/2026-06-13-estimate-tabs-r4-template-source-local-proof-refresh.md` records the fresh R4.4-R4.5 local proof.
- `.ai/05_logs/2026-06-13-estimate-tabs-r1-7-cross-tab-rejection-run.md` records the R1.7 v1 rejection proof and the still-deferred move-RPC boundary.
- `.ai/05_logs/2026-06-13-estimate-tabs-r8-5-preview-scope-chips-run.md` records the R8.5 red/green and adjacent export regression evidence.
- `.ai/05_logs/2026-06-13-estimate-tabs-r11-3-ai-tab-context-run.md` records the R11.3 red/green, adjacent AI regression evidence, and the full-validation security-contract addendum.
- `.ai/05_logs/2026-06-12-estimate-tabs-implementation-ledger.md` and `.ai/10_state/current-state.md` now include the R4.4-R4.5, R8.5, and R11.3 status refreshes.

## Cleanup and rollback

- No generated harness, process, or temp fixture was created.
- Worktree cleanup is rechecked at each commit boundary; final verification completed before committing this R1.7/R11.3 closeout slice.
- No external provider state was changed.

## Residual risks

- Linked Supabase apply/typegen remains open because Docker typegen is unavailable and linked provider mutation was not explicitly authorized.
- Hosted route/export/publication/invite/share/browser/Storybook/two-browser/manual proof remains open.
- `origin/main` is not updated by this branch; merge/push is intentionally deferred because the plan pack still has external proof gates.

## Evidence

- Commit `8dc7699d` refreshed R4.4-R4.5 traceability and proof logs.
- Commit `6c9cbc53` added R3 compatibility governance proof.
- Commit `6fcbc8af` added R9.3/R13.1-R13.3 lazy-source, invite/share, perf, and a11y proof.
- This closeout slice adds cross-tab tree-node drop rejection proof and the R11.3 security-contract refresh.
