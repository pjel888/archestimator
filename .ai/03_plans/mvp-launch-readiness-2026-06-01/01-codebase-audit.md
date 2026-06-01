# Codebase Audit

Audit commit: `b6184cf7123ed46f4cd8b9a467feb5232f0b46bf`
Audit mode: read-only evidence plus documentation edits only.

## Required Context Read

Read before editing this package:

- `AGENTS.md`
- `DESIGN.md`
- `.ai/README.md`
- `.ai/00_system/ai-folder-canonical-map.md`
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- `.ai/10_state/current-state.md`
- `.ai/10_state/decisions.md`
- `README.md`
- `package.json`
- `.env.example`
- `.github/workflows/ci.yml`
- `.ai/06_specs/`
- Every existing file in this plan folder.

## Route Map

| Route/surface | File evidence | Launch status |
| --- | --- | --- |
| `/workshop` shell | `src/components/workshop/WorkshopPageShell.tsx:5`, `src/components/workshop/WorkshopPageShell.tsx:123` imports/renders `AskFlipFooterAssistant`. | Needs AI footer hidden by default. |
| `/api/ai/ask` | `src/app/api/ai/ask/route.ts:3` calls `handleAiAskRequest(request)`. Handler does auth/API key/read/provider/audit at `handler.ts:105`, `handler.ts:122`, `handler.ts:173`, `handler.ts:187`. | Needs route-level disabled gate before handler/provider/context/audit. |
| `/api/ai/package-builder` | `src/app/api/ai/package-builder/route.ts:3` calls `handlePackageBuilderRequest(request)`. Handler does auth/flags/apply/read/provider/audit at `handler.ts:191`, `handler.ts:265`, `handler.ts:350`, `handler.ts:366`, `handler.ts:479`. | Needs route-level disabled gate before handler/provider/context/audit. |
| `/workshop/library` | `src/app/workshop/library/page.tsx:13` loads current workspace library; `LibraryPageClient.tsx:55` passes library data to `ComponentLibraryManager`. | In MVP, polish only. |
| `/workshop/templates` | `src/app/workshop/templates/page.tsx:6` loads `getCurrentWorkspaceEstimateTemplates`; `TemplatesPageClient.tsx:10` renders `TemplateLibraryManager`. | In MVP, preview/details and states only. |
| `/workshop/components` | Build output marks route static; memory and current repo indicate it is not the primary route. | Keep as compatibility/redirect surface; do not invest. |
| Export download | `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts:41` builds model/workbook and returns private no-store attachment. | Needs workbook rewrite. |
| Export preview | `src/components/workshop/ProposalExportPreviewDialog.tsx:40`; opened from `EstimateSheetContent.tsx:3357` and toolbar area around `EstimateSheetContent.tsx:3222`. | Must stay parity-checked with download. |

Build output on 2026-06-01 also confirmed both AI API routes are live route entries.

## Data Model Map

| Table/type | Verified columns | Notes |
| --- | --- | --- |
| `estimate_row_items` | Generated type at `src/lib/supabase/types.ts:1127` includes `node_id`, `source_library_item_id`, `source_snapshot`, `link_state`, `metadata`, `row_revision`, `misc_cost`, `contingency_percentage`. | No `area_node_id`. Current schema no longer has `labor_cost`; legacy migration consolidated `labor_cost` and `supplementary_cost` into `misc_cost` in `20260522025929_combine_misc_cost.sql`. |
| `estimate_sheet_events` | Generated type at `src/lib/supabase/types.ts:1241` includes `workspace_id`, `estimate_id`, `actor_user_id`, `target_row_id`, `estimate_node_id`, `old_snapshot`, `new_snapshot`, `row_context`, `payload`, `metadata`, `correlation_id`, `event_source`. | No `project_id`, `target_type`, `target_id`, `actor_id`, or `snapshot`. |
| `estimates` | Generated type at `src/lib/supabase/types.ts:1609` has `project_id`, not `workspace_id`. | Workspace resolves through `projects.workspace_id`. |
| `projects` | Generated type at `src/lib/supabase/types.ts:2432` has `workspace_id`. | Resolver joins estimates to projects in `20260524033151_estimate_sheet_version_control.sql:77`. |
| `estimate_row_link_state` | Generated enum at `src/lib/supabase/types.ts:2913`: `unlinked`, `linked-clean`, `linked-overridden`, `detached`, `source-changed`. | Use `detached` for explicitly unlinked project-specific rows. |

## RPC/Action Map

| Contract | Evidence | Launch implication |
| --- | --- | --- |
| `insert_estimate_row_item_with_history` | Generated RPC at `src/lib/supabase/types.ts:2595`; action at `src/lib/estimates/actions.ts:1677`; hook caller via `use-estimate-row-mutations.ts:114`. | Existing convention for new unlink RPC naming and args. |
| `update_estimate_row_item_with_history` | Generated RPC at `src/lib/supabase/types.ts:2606`; action at `src/lib/estimates/actions.ts:1745`. | Existing update path can express unlink-like patch, but dedicated unlink RPC is safer for event semantics. |
| `replace_estimate_row_item_with_history` | Generated RPC at `src/lib/supabase/types.ts:2618`; action at `src/lib/estimates/actions.ts:1771`. | Preserve replacement path separate from unlink. |
| `delete_estimate_row_item_with_history` | Generated RPC at `src/lib/supabase/types.ts:2630`; action at `src/lib/estimates/actions.ts:1808`. | Preserve delete path separate from unlink. |
| `insert_estimate_template_into_estimate_with_history` | Action at `src/lib/estimates/actions.ts:1645`, migration function at `20260524033151_estimate_sheet_version_control.sql:1000`. | Template insertion already exists through estimate workspace. |

## UI Surface Map

| Surface | Current state | Gap |
| --- | --- | --- |
| Ask Flip footer | Rendered unconditionally from `WorkshopPageShell`. | Gate with `NEXT_PUBLIC_ASK_FLIP_ENABLED=false` by default. |
| Estimate row component controls | Actual UI is row buttons/modal, not a generic row action menu. Evidence: `EstimateSheetContent.tsx` component cell button cluster around `EstimateSheetContent.tsx:889` and row details modal around `EstimateSheetContent.tsx:2504`. | Unlink action must live in current row details/component controls. |
| Row model | `src/lib/estimates/types.ts:80` defines `EstimateRowItem` without public `linkState`. | Add DTO mapping before badges. |
| Tree patch | `src/lib/estimates/estimate-row-tree-patch.ts` only patches scalar cost fields and revision today. | Extend optimistic patch for unlink/project-specific fields. |
| Library | `ComponentLibraryManager` already has state `localFolders`, `viewMode`, `selectedFolderId`, `selectedSupplierNodeId`, `selectedBrandNodeId`, `reorderStatus`, `sheetStatus`, `addComponentOpen`, `libraryItemState` at `ComponentLibraryManager.tsx:824`. | Polish states and trust fields; do not add broad new manager scope. |
| Templates | `TemplateLibraryManager` state is `searchQuery`, `expandedNodeIds`, `selectedTemplateNodeId` at `TemplateLibraryManager.tsx:58`, `TemplateLibraryManager.tsx:157`, `TemplateLibraryManager.tsx:299`. | Add preview/details and shared empty/error states. |
| Export | Current columns at `create-proposal-workbook.ts:15`; summary/detail/source sheets at `create-proposal-workbook.ts:271`. | Rewrite to bid-form workbook spec. |

## Command Baseline

| Command | Status | Summary |
| --- | --- | --- |
| `git status --short` | Dirty | Before docs edits: `.codex/config.toml`; later also `AGENTS.md` and `CLAUDE.md` were dirty and were not edited by this pass. |
| `git rev-parse HEAD` | Pass | `b6184cf7123ed46f4cd8b9a467feb5232f0b46bf`. |
| `bun install --frozen-lockfile` | Pass | Bun 1.3.10, checked 703 installs across 775 packages, no changes. |
| `bun run type-check` | Pass | `tsc --noEmit`, exit 0. |
| `bun run lint` | Pass with warnings | 0 errors, 14 warnings: unused variables in pitch deck script, unused eslint-disable in performance monitor, TanStack React Compiler warning, test unused vars. |
| `bun run lint:design-system` | Pass | Design-system enforcement passed. |
| `bun run test` | Pass | 2 files, 4 tests, 129 expects. |
| `bun run test:dom` | Fail | 2 failed files, 3 failed tests, 120 passed files, 984 passed tests, 2 skipped. |
| `bun run build` | Pass | Next.js 16.2.6 production build succeeded and listed AI routes. |

## Focused Test Baseline

| Bundle | Status | Summary |
| --- | --- | --- |
| AI routes/footer | Pass | 5 files, 87 tests. |
| Estimate rows/version control | Pass | 4 files, 69 tests. |
| Library/templates | Pass | 4 files, 26 tests. |
| Proposal export | Pass | 4 files, 15 tests. |

## Current `test:dom` Failure Triage

| Failure | File | Root-cause classification | Launch action |
| --- | --- | --- | --- |
| Package-builder security route source no longer contains real-session/apply guard strings. | `tests/vitest/ai-package-builder-security-contract.test.ts:55` | Source-contract drift after handler extraction; route delegates to handler. | In AI deferral PR, update tests to assert disabled gate and handler guard location. |
| Package-builder route source no longer contains `rowPreviews`. | `tests/vitest/ai-package-builder-security-contract.test.ts:88` | Source-contract drift after handler extraction. | Same as above. |
| Share recipient token source assertion cannot find `verifySharedLinkRecipientToken`. | `tests/vitest/project-publication-actions.test.ts:182` | Source-contract drift in share page implementation; outside MVP core but blocks launch gate until triaged. | Assign to MVP-QA-001 or separate share stabilization PR before launch. |

## Known Stale Docs

| Doc | Stale claim | Impact |
| --- | --- | --- |
| `README.md` | Presents Ask Flip/package-builder as available. | Needs launch-facing wording after AI deferral. |
| `.ai/06_specs/proposal-package-system.md:23` | Describes formula-driven export intent beyond current implementation. | Must not be treated as current-state proof; this package supersedes for MVP launch. |
| First-pass `07-project-specific-unlink-components-plan.md` | Used invalid `area_node_id`, `estimates.workspace_id`, and invalid event columns. | Rewritten in this pass. |

## Evidence Index

All detailed proof pointers are centralized in `14-evidence-index.md`.
