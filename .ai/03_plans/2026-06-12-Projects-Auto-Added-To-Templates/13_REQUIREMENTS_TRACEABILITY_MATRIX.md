# 13 — Requirements Traceability Matrix

**Date:** 2026-06-12 · Status values: **planned** / **implemented (local-only)** / **assumption** / **deferred** / **product decision needed**.
Columns: Requirement ID · Source request / repo evidence · Planned architecture doc · Implementation phase ([10](10_IMPLEMENTATION_PHASES.md)) · Primary files/tables likely affected · Tests/validation ([09](09_TEST_AND_VALIDATION_PLAN.md)) · Risk linkage ([11](11_RISK_REGISTER.md)) · Status.

## Group 1 — Multi-tab estimate support

| ID | Source / evidence | Arch doc | Phase | Primary files/tables | Tests/validation | Risks | Status |
|---|---|---|---|---|---|---|---|
| R1.1 estimate_tabs entity + default-tab invariant | prompt §Core intent; no tab dimension today (`estimate-repository.ts:154,159`) | 02 §3; 03 §3 | 1 | `estimate_tabs`, migration M1 | schema contract; P1 proof; RLS harness | R-MIG1..3, R-RLS | **implemented (local-only)** — migration `20260612094734_estimate_tabs_foundation.sql`, generated type patch, `estimate-tabs-schema.test.ts`, and local Postgres proof enforce one default tab per estimate; linked apply/proof remains open. |
| R1.2 nodes belong to tabs | `estimate_nodes` schema (`types.ts:1461-1472`) | 03 §3–4 | 1 | `estimate_nodes.estimate_tab_id`, composite FK, constraint swap | P2–P4 proofs; reorder harness | R-MIG2 | **implemented (local-only)** — migration/types add `estimate_nodes.estimate_tab_id`, composite tab FK, parent-tab constraint, tab-scoped sibling logic, and P2–P4 local Postgres proof; linked apply/proof remains open. |
| R1.3 tab-aware loaders/actions/keys + compat wrappers | `workspace-repository.ts:1590-1671`; `use-estimate-query.ts:9-12` | 04 §2–4 | 2 | workspace-repository, estimates/actions, hooks | tab-action tests; wrapper equivalence | R-TEST | **implemented (local-only)** — `getEstimateTabs`, `getEstimateTabTree`, `fetchEstimateTabTree`, `estimateQueryKeys.tabTree/tabs`, row mutation tab invalidation, and compat fallback tests are present; provider proof remains open. |
| R1.4 tab CRUD UI (create/rename/duplicate/reorder/archive/delete) | prompt §05 spec | 05 §1–3 | 3 | `EstimateTabStrip.tsx`, `EstimateSheetContent.tsx`, `EstimateSheetTree.tsx` | strip DOM suite; e2e 1–4 | R-PERF1 | **implemented (local-only behind lifecycle gate)** — strip renders ARIA tabs plus create/rename/duplicate/reorder internals and archive/delete server actions exist; user-visible lifecycle controls remain release-gated pending browser/provider proof. |
| R1.5 per-tab selection/expansion + URL continuity | `use-estimate-workspace-state.ts:6-11`; `EstimateSheetTree.tsx:468-479` | 04 §11; 05 §4 | 2–3 | workspace-state hook, tree | switch-tab DOM cases; e2e 5 | R-URL | **implemented (local-only)** — workspace state stores active tab, selected node, and expansion per tab; route resolver derives tab from selected node/default tab; hosted/browser continuity proof remains open. |
| R1.6 per-tab tree isolation under load limits | route limits (`route.ts:12-13`) | 02 §12; 04 §3 | 2 | `getEstimateTabTree` | tab-tree unit tests | R-PERF2 | **implemented (local-only)** — `getEstimateTabTree` filters nodes by `estimate_tab_id`, export route reuses tab trees with sentinel limits, and Phase 6 benchmark passed 5 tabs × 500 rows in 443.59ms / 0.39 MiB. |
| R1.7 cross-tab node moves | — | 05 §6 | follow-up | new move RPC | — | R-PERM2 | **deferred** (D-7) |

## Group 2 — "Sheet" → "tab" user-facing rebrand

| ID | Source / evidence | Arch doc | Phase | Primary files/tables | Tests/validation | Risks | Status |
|---|---|---|---|---|---|---|---|
| R2.1 copy table applied (exhaustive bucket A) | 01 §16A sweep (1,289 src matches) | 05 §10 | 4 | copy clusters listed in 10 §Phase 4 | copy-coupled test batch; residue grep | R-NAME | **implemented (local-only)** — `.ai/05_logs/2026-06-12-estimate-tabs-phase4/vitest-phase4-targeted-final.log`; `.ai/05_logs/2026-06-12-estimate-tabs-phase4/terminology-exact-final.log` |
| R2.2 DELETE SHEET typed phrase atomic flip | `ProjectEstimatesTable.tsx:684` + `bulk-action.ts:76,82` | 05 §10 | 4 | both files together | `mass-deletion-ui-contract` update | R-NAME, R-TEST | **implemented (local-only)** — `.ai/05_logs/2026-06-12-estimate-tabs-phase4/vitest-phase4-targeted-final.log` |
| R2.3 `sheet_code` relabel "Estimate code" | audited meaning (01 §16 Task 3) | 05 §10 (D-12) | 4 | tables/strips/activity labels | copy tests | R-NAME | **implemented (local-only)** — `.ai/05_logs/2026-06-12-estimate-tabs-phase4/vitest-phase4-targeted-final.log`; `.ai/05_logs/2026-06-12-estimate-tabs-phase4/vitest-phase4-history-cursor-copy-rerun.log` |
| R2.4 marketing/landing copy alignment | `app/features/page.tsx` etc. | 05 §10 last row | 4 | landing components | owner review | R-NAME | **product decision needed** (Q-1) — local copy aligned in Phase 4; owner review still pending |
| R2.5 AI intent regexes match "tab" additively | `EstimateCopilotFloatingButton.tsx:103-145`; `draft.ts:128-179` | 01 §14; 10 §Phase 4 | 4 | AI surfaces | regex unit cases | R-AI | **implemented (local-only)** — `.ai/05_logs/2026-06-12-estimate-tabs-phase4/vitest-phase4-ai-package-builder.log`; `.ai/05_logs/2026-06-12-estimate-tabs-phase4/bun-run-type-check-final.log` |

## Group 3 — Existing DB/internal sheet-name compatibility

| ID | Source / evidence | Arch doc | Phase | Primary files/tables | Tests/validation | Risks | Status |
|---|---|---|---|---|---|---|---|
| R3.1 keep-list honored (tables/RPCs/event values/sheet_code/Excel/primitive/material) | 01 §17 | 01 §17; 04 §9 | all | — | Phase 4 residue grep; review checklist | R-NAME, R-DATA | **implemented (Phase 4 local-only portion)** — `.ai/05_logs/2026-06-12-estimate-tabs-phase4/terminology-exact-final.log`; standing check remains for later phases |
| R3.2 compat comments at every kept site | prompt §04 | 04 §9 | 2–8 | touched files | code review gate (15 §3) | — | **implemented (local-only governance)** — retained legacy `sheet` seams now carry plan-linked compatibility comments for `areaTree`, `sheet_code`, `fetchEstimateSheetVersionControl`, `EstimateSheetContent`, pre-tab `dataTabId`, and the narrow `estimate_tabs` cast boundary; `estimate-tabs-domain.test.ts` guards the comment set. |
| R3.3 shim deletion criteria for cleanup | — | 04 §12 | 8 | wrappers, dead stores/hooks | grep gates; contract batches | R-TEST | **implemented (docs + local guard)** — 04 §12 and 14 §6.1 define immediate vs one-release-cycle deletion gates, grep requirements, provider/manual proof requirements, owner approval, and rename-batch test updates; `estimate-tabs-domain.test.ts` guards those criteria. Actual shim deletion remains deferred until gates are satisfied. |

## Group 4 — Project-derived sources in templates panel

| ID | Source / evidence | Arch doc | Phase | Primary files/tables | Tests/validation | Risks | Status |
|---|---|---|---|---|---|---|---|
| R4.1 virtual/read-through sources (no auto-persistence) | prompt critical principle; `src/lib/reusable-sources/actions.ts` | 02 §2; 06 §2 (D-11) | 5 | reusable-sources types/actions | conversion unit tests | R-STALE | **implemented (local-only action contract)** — `.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-reusable-sources-actions.log`; no template-table persistence added |
| R4.2 unified tree (Custom Templates + Projects) | `TemplatesTree.tsx` section/project-source datum variants; `component-library/index.tsx` project-source props | 06 §3–4 | 5 | TemplatesTree, panel index | panel DOM suite | R-ACTIONS | **implemented (local-only UI seam)** — `.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-source-tree-ui.log`; read actions/RPC/provider proof remain tracked by R4.1, R4.2a, R4.3, R7.1-R7.2 |
| R4.2a Projects section shows all readable workspace projects by default | product clarification; `EstimateRightSidebar` consumes `listReusableProjectSources` for root sources and exposes opt-in current-project scope | 02 §12; 06 §5 | 5 | reusable-sources actions, TemplatesTree, panel filters | panel DOM default + current-project narrowing tests | R-PERF2, R-PERM1 | **implemented (local-only sidebar UI contract)** — `.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-source-default-load.log`; `.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-source-current-project-filter.log` |
| R4.3 lazy per-level read path | `listEstimateInsertTargets` (`actions.ts:1116`); `getReusableEstimateOutline` one-estimate loader consumed on sidebar and browse-route expansion | 06 §8 | 5 | new read actions, TemplatesTree, panel index, TemplatesBrowseManager | call-counting + browse-route lazy outline tests | R-PERF2 | **implemented (local-only action + UI contract)** — `.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-reusable-sources-actions.log`; `.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-source-outline-on-expand.log`; `.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-template-browse-lazy-project-outline.log` |
| R4.4 search/filter/preview incl. live metadata fields | `searchLibraryOverview` (`:1239`); `TemplatePreviewDock`; `ProjectSourcePreviewPanel` local seam; sidebar source filter chips; manual project-source refresh affordance; `searchReusableProjectSources` action contract + debounced sidebar reveal; browse-route Projects tree | 06 §5–6 | 5 | panel + dock | DOM tests | R-STALE | **planned (local filter chips + preview metadata/outline/refresh/search-action/search-UI/browse-tree/server-backed metadata seams implemented)** — `.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-source-preview-metadata.log`; `.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-source-filter-chips.log`; `.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-source-preview-outline.log`; `.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-source-refresh-affordance.log`; `.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-reusable-project-source-search-action.log`; `.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-source-search-ui.log`; `.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-template-browse-project-sources.log`; `.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-template-browse-lazy-project-outline.log`; `.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-source-outline-metadata.log`; `.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-source-updated-at-metadata.log`; linked/hosted provider freshness proof remains planned |
| R4.5 save-as-template from source (explicit only) | `createEstimateTemplateFromEstimateNode`; `createEstimateTemplateFromEstimateTab` | 06 §9 | 5 | NewTemplateModal, actions | modal handoff test | — | **planned (project-node + whole-tab local handoffs implemented)** — `.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-source-save-as-template.log`; `.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-tab-save-as-template.log`; provider-backed action proof remains planned |
| R4.6 sidebar vs route-browse parity/divergence defined | 01 §5 | 06 §10 | 5 | TemplatesBrowseManager, picker | gallery/picker tests | R-ACTIONS | **implemented (local-only route boundary proof)** — `.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-template-browse-route-divergence.log`; `.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-template-browse-project-sources.log`; `.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-template-browse-lazy-project-outline.log`; browse route may show and lazily expand read-only virtual project sources, but template management/editor/preview actions remain template-only |

## Group 5 — User-created custom templates preserved

| ID | Source / evidence | Arch doc | Phase | Primary files/tables | Tests/validation | Risks | Status |
|---|---|---|---|---|---|---|---|
| R5.1 template CRUD/category management unchanged | `component-library/actions.ts:831-1103` | 06 §9–10 | 5 | existing template surfaces | existing suites stay green | R-ACTIONS | **implemented (preserved local-only)** — `.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-template-preservation.log` (4 files / 75 tests passed); no template CRUD code changed in this proof slice |
| R5.2 template editor remains template-only | `TemplateEditorClient.tsx` | 06 §12 (D-8) | 5 | editor route | editor suite green | — | **implemented (local-only)** — `.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-template-editor-template-only.log` (2 files / 16 tests passed); editor sidebar receives scratch/template-only props with no project-source insertion callback |
| R5.3 template insert flow untouched for templates | `insert_…_with_history` (`20260524033151:1000`) | 06 §7 | 5 | — | template sidebar/gallery/drop-zone suites green | — | **implemented (preserved local-only)** — `.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-template-preservation.log` (sidebar, browse/gallery, modal, drop zones); provider/RPC proof remains separate |

## Group 6 — Drag/drop and non-drag insertion

| ID | Source / evidence | Arch doc | Phase | Primary files/tables | Tests/validation | Risks | Status |
|---|---|---|---|---|---|---|---|
| R6.1 new project-source mime + parser | `templates.ts:7,59-111` + `tests/vitest/reusable-source-drag.test.ts` | 06 §7 | 5 | templates.ts, drop-zones | payload unit tests | — | **implemented (local-only)** — `.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-reusable-source-drag.log`; `.ai/05_logs/2026-06-12-estimate-tabs-phase5/bun-run-type-check.log` |
| R6.2 keyboard/context-menu/bulk insertion parity for every drag action | `TemplatesTree.tsx`; bulk `index.tsx`; `getCheckedProjectSourceTargets` local seam | 05 §8; 06 §9 | 3, 5 | menus, bulk resolver | a11y DOM cases | — | **implemented (local-only UI parity contract)** — `.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-source-bulk-insert.log`; `.ai/05_logs/2026-06-12-estimate-tabs-phase5/vitest-project-source-keyboard-insert.log`; insert RPC/action remains R7.2 |
| R6.3 tab-strip spring-loaded drop targeting | `tree-external-drop` precedent | 05 §6 | 3 | strip | strip DOM case | — | **implemented (local-only)** — `EstimateTabStrip` switches to an inactive tab after a 450ms drag hover and cancels on drag-leave/drop; `tests/vitest/estimate-tab-strip.test.tsx` covers switch and cancel paths. Evidence: focused strip Vitest 1 file / 6 tests, `bun run type-check`, and `bun run lint:design-system` passed on 2026-06-13. |

## Group 7 — Permission-safe browsing and insertion

| ID | Source / evidence | Arch doc | Phase | Primary files/tables | Tests/validation | Risks | Status |
|---|---|---|---|---|---|---|---|
| R7.1 browse lists only readable sources (RLS-scoped reads, no admin client) | `can_access_estimate` (`20260526142913:365-386`) | 08 §5–6 | 5 | read actions | denial 1–2; RLS harness | R-PERM1 | **implemented (local-only)** — reusable-source reads use authenticated repository paths and local Postgres RLS harness proves readable-tab isolation; linked/provider proof remains open. |
| R7.2 insert verifies target edit + source read + same workspace | `20260522091621:250-262`; `assertCanEditEstimate` | 08 §5 (D-6) | 5 | insert RPC + action | denial 3–5 | R-PERM2 | **implemented (local-only action/RPC contract)** — project-source/template insertion flows route through authenticated edit/read checks and tab-aware history RPCs; linked/provider denial proof remains open. |
| R7.3 estimate_tabs RLS mirrors nodes | `20260526142913:740-746` | 08 §3 | 1 | M1 | harness allow/deny | R-RLS | **implemented (local-only)** — migration enables RLS/grants on `estimate_tabs`; local Postgres harness proves owner/viewer readable-tab boundaries and forbidden viewer mutation. |
| R7.4 tab-level ACLs | — | 08 §2 (D-5) | — | — | — | — | **deferred** |

## Group 8 — XLSX worksheet-tab export

| ID | Source / evidence | Arch doc | Phase | Primary files/tables | Tests/validation | Risks | Status |
|---|---|---|---|---|---|---|---|
| R8.1 one worksheet per tab; global Summary/Terms/Breakdown (Option C) | workbook audit (07 §1) | 07 §3 (D-10) | 6 | create-proposal-workbook, model | multi-tab suite | R-XLSX2 | implemented locally; provider/manual proof open |
| R8.2 single-tab byte-shape preserved | pinned tests (`proposal-workbook.test.ts:92-97`) | 07 §3 | 6 | same | unmodified assertions pass | R-XLSX2 | implemented locally; focused tests pass |
| R8.3 worksheet-name sanitizer (chars/31/dedupe/escape) | none exists (verified) | 07 §4 | 6 | new `worksheet-name.ts` | sanitizer unit suite | R-XLSX | implemented locally; focused tests pass |
| R8.4 route back-compat + `?tab=` + filename slug | `route.ts`; `filename.ts` | 07 §5 | 6 | route, filename | route tests; hosted smoke | R-URL | implemented locally; hosted smoke open |
| R8.5 preview/export model alignment | shared model (01 §10) | 07 §6, §9 | 6 | preview dialog, shared fixtures | aligned fixtures | R-TEST | implemented locally for active-tab preview/download; all-tabs scope-chip UX remains hardening follow-up |
| R8.6 large-estimate behavior (limits, benchmark, streaming escape hatch) | benchmark evidence | 07 §8 | 6 | benchmark script | 5-tab benchmark | R-PERF2 | implemented locally; 5×500 benchmark 443.59ms / 0.39 MiB |

## Group 9 — Backward-compatible routes

| ID | Source / evidence | Arch doc | Phase | Primary files/tables | Tests/validation | Risks | Status |
|---|---|---|---|---|---|---|---|
| R9.1 `/estimates/[nodeId]` node/estimate fallback preserved; tab derived | `workspace-repository.ts:1655` | 02 §13 (D-4) | 2–3 | resolver, page | route tests; QA #7 | R-URL | **implemented (local-only)** — `resolveProjectEstimateRoute` derives the tab from route node/default tab and `estimate-tabs-domain.test.ts` asserts the route resolver/page wiring; hosted route smoke remains open. |
| R9.2 export links unchanged | `route.ts` | 07 §5 | 6 | route | hosted smoke | R-URL | implemented locally; hosted smoke open |
| R9.3 invite/share deep links unchanged | `invite/[token]/page.tsx:68-72` | 02 §9 | 4, 7 | none (estimate-id URLs) | invite e2e | R-COLLAB | **implemented (local-only)** — invite route contracts still resolve `/invite/[token]` without tab URL rewrites, pending-invite bridge still returns to workshop, and shared-link email/API contracts still use `/share/[token]` + recipient query tokens. Focused invite/share suites passed; hosted invite/share e2e remains open. |

## Group 10 — Collaboration / versioning / publication / audit impacts

| ID | Source / evidence | Arch doc | Phase | Primary files/tables | Tests/validation | Risks | Status |
|---|---|---|---|---|---|---|---|
| R10.1 tab events (`tab_*`) + node/row event tab stamping | `estimate_sheet_events` free-text types | 04 §7; 03 §8 | 1–2 | RPCs, composer | activity tests | — | **implemented (local-only)** — migration adds `estimate_sheet_events.estimate_tab_id`, tab lifecycle RPC events, and node/row history stamping; the read DTO now selects/normalizes `estimate_tab_id` as `estimateTabId`, composer copy handles `tab_*`, and focused activity/version-control tests pass. Linked/provider proof remains open. |
| R10.2 activity UI tab scope | `activity-history.tsx:22-24` | 04 §7 | 3 | activity surfaces | version-control-ui ext | — | **implemented (local-only)** — Activity History keeps the scope tab labeled `Tabs`, exposes tab lifecycle event filters and accessibility labels, sanitizes new tab technical tokens from public-safe copy, and focused UI/action/composer suites pass. Hosted/manual activity proof remains open. |
| R10.3 cursor tabId filter; presence additive | `use-estimate-cursor-broadcast.ts:11-19` | 05 §7 | 3 | hooks, cursor layer | realtime test; 2-browser QA | R-COLLAB | **implemented (local-only)** — cursor payload/filter already includes `tabId`; project presence payload now accepts/tracks additive `activeTabId`; focused collaboration realtime + cursor tests pass. 2-browser hosted/manual QA remains open. |
| R10.4 publication snapshot v1.2 (tabs) + old-snapshot rendering | `snapshot.ts:118-187` | 02 §11 | 5/7 | publication builder, share components | v1.1/v1.2 side-by-side | R-PUB | **implemented (local-only)** — publication builder now reads active `estimate_tabs`, copies tab ids into v1.2 snapshot tabs/rows/tree nodes, and `SharePageTabs` renders nested estimate tabs when present while legacy snapshots without `tabs` render from estimate-level rows/tree nodes. Focused publication snapshot/page/action tests passed; provider/hosted shared-link proof remains open. |
| R10.5 dormant version stack guarded, v3 documented | zero call sites (01 §12) | 03 §8–9 | 1 (guard) | migration comment | schema test | R-VERS | **implemented (local-only guard; feature deferred)** — migration `20260612094734_estimate_tabs_foundation.sql` explicitly says the dormant `estimate_sheet_snapshot`/`create_estimate_sheet_version`/`restore_estimate_sheet_version_as_copy` v2 stack must not be awakened until a deliberate v3 carries `tabs[]` plus per-node `estimateTabId`; `estimate-tabs-schema.test.ts` asserts the guard and that those functions are not recreated. |
| R10.6 release gate prevents user-visible tab creation before export support | D-15 | 07 §10; 10 Phase 3/6; 14 §6 | 3/6 | editor controls, export preview | release checklist; browser QA | R-RELEASE | locally satisfied for export support; browser/provider release proof open |

## Group 11 — AI / Ask Flip / package-builder impacts

| ID | Source / evidence | Arch doc | Phase | Primary files/tables | Tests/validation | Risks | Status |
|---|---|---|---|---|---|---|---|
| R11.1 route-regex stability (no shape change) | `EstimateCopilotFloatingButton.tsx:165-172` | 02 §9; 12 D-4 | 2/7 | AI route parser, estimate route wrappers | Ask Flip live spec re-run; route regex unit check | R-AI | **implemented (local-only)** — route regex remains `/workshop/projects/{projectId}/estimates/{selectedNodeId}`; active tab is added from DOM as additive `activeTabId` route context, with focused copilot DOM regression. |
| R11.2 package-builder targets resolved tab root | `draft.ts:313-359` | 04 §3, §11; 11 R-AI | 7 | draft/apply | targeting unit test; package-builder live spec | R-AI | **implemented (local-only)** — package-builder route reads accept active tab context, scope current-estimate tree/rows to that tab, sign `activeTabId` into fill-current-estimate targets, and pass `target_tab_id` to `create_estimate_node_with_history` for AI-created missing Area Nodes. Evidence: focused copilot + package-builder suites passed (5 files / 109 tests). |
| R11.3 read-context tab grouping + audit tab attribution | `read-context.ts:1799-1826`; `audit.ts:11-23` | 08 §8; 11 R-AI | follow-up after core tab support | AI read-context/audit metadata | follow-up AI surface gate; no core release dependency | R-AI | **deferred** (additive) |

## Group 12 — Migration/backfill safety

| ID | Source / evidence | Arch doc | Phase | Primary files/tables | Tests/validation | Risks | Status |
|---|---|---|---|---|---|---|---|
| R12.1 backfill exactly-one-default-tab + full node attachment + boundary proofs | 03 §7 P1–P5 | 03 §7 | 1 | M1 | proof harness + linked runbook | R-MIG3 | **implemented (local-only)** — migration backfill and `scripts/prove-estimate-tabs-postgres.mjs` prove default tabs and full node attachment locally; linked runbook/apply proof remains open. |
| R12.2 constraint swap safety + rollback notes | `20260518090000:93`; `20260519192045:26-40` | 03 §3, §12 | 1 | M1b | harness reorder cases | R-MIG2 | **implemented (local-only)** — migration adds composite tab boundary constraints and scoped sibling/order logic; local schema and Postgres proof pass; linked rollback/apply proof remains open. |
| R12.3 local-vs-linked apply boundary + type regen | VALIDATION_MATRIX.md:165-179 | 03 §11, §14 | 1 | types.ts | type-check; **provider proof separate** | R-TYPES | **implemented (local-only) / provider proof open** — Docker typegen remains unavailable, so `types.ts` was patched from the migration contract and `bun run type-check` passes; linked Supabase apply/typegen proof remains blocked without explicit provider mutation approval. |

## Group 13 — Performance and accessibility

| ID | Source / evidence | Arch doc | Phase | Primary files/tables | Tests/validation | Risks | Status |
|---|---|---|---|---|---|---|---|
| R13.1 zero re-render guard holds with strip | perf suites (01 §15) | 05 §2 | 3 | EstimateSheetContent | perf suites + switch case | R-PERF1 | **implemented (local-only)** — existing perf suites pass with the strip mounted (`tests/vitest/perf`, 4 files / 14 tests). Browser/provider performance proof remains open. |
| R13.2 lazy source browsing scale | 02 §12 | 06 §8 | 5 | read actions | call-counting + timing | R-PERF2 | **implemented (local-only)** — reusable project sources now load project roots first, fetch one project's estimates only on project expansion, and fetch tab/node outline only on estimate expansion. 20-project × 5-estimate × 3-tab call-count tests and route/sidebar lazy UI suites passed; live DB p95/provider scale proof remains open. |
| R13.3 tablist a11y + non-drag paths + focus management + live regions | `SharePageTabs.tsx:245` precedent | 05 §8 | 3, 5 | strip, menus | a11y DOM cases | — | **implemented (local-only)** — `EstimateTabStrip` now has polite live-region announcements, keyboard reorder focus retention, and gated delete/archive focus fallback; prior R6.2 DOM coverage proves non-drag insertion paths. `estimate-tab-strip` now passes 8 DOM tests; browser/Storybook a11y proof remains open. |
| R13.4 design-system gate compliance | `enforce-app-design-system.mjs` | 05 §13 | 3–6 | all new UI | `bun run lint:design-system` | — | **implemented (local-only)** — `bun run lint:design-system` passed in focused R6.3 proof and fresh `bun run validate`; hosted visual/design proof remains open. |

**Coverage check:** every requirement group named by the prompt has rows; every row has either phase/files/tests/risk linkage or an explicit product-decision/deferred status with the owning follow-up gate named (R1.7, R2.4, R7.4, R8.6 assumption, R11.3).

## Evidence Used

Source columns cite [01_CURRENT_STATE_AUDIT.md](01_CURRENT_STATE_AUDIT.md) findings and direct repo paths; planning columns cite docs 02–09 of this pack; phases per [10_IMPLEMENTATION_PHASES.md](10_IMPLEMENTATION_PHASES.md); risks per [11_RISK_REGISTER.md](11_RISK_REGISTER.md).
