# 16 — Performance, Scale, Network, And Concurrency

> **Status:** Living document. Defines performance reality, scale assumptions, payload reduction, concurrency contracts, and the path to final budgets in `30-PERF-BUDGET-AND-REGRESSION-GATES.md`.
>
> **Scope:** Scale budgets, browse-payload reduction, future-if-budget server search, failure states, and concurrency behavior. All numeric thresholds are either measured Phase 0A values or explicit links to doc 30. Resolves `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md` C-004 (dense/virtualization flags) and C-015 (provisional vs final budgets).
>
> **Companion docs:** [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md), [30-PERF-BUDGET-AND-REGRESSION-GATES.md](30-PERF-BUDGET-AND-REGRESSION-GATES.md), [13-DATA-CONTRACTS-ROUTE-CACHE.md](13-DATA-CONTRACTS-ROUTE-CACHE.md), [21-FEATURE-FLAGS-AND-ROLLOUT.md](21-FEATURE-FLAGS-AND-ROLLOUT.md), [24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md), [27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md](27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md), [31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md](31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md), [28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md](28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md).

---

## 1. Current reality

Two facts re-scope this doc away from "fix a live race" toward "measure, then reduce payload":

| # | Fact | Implication | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Components-tab search/filter is 100% client-side synchronous filtering over an in-memory dataset (`ComponentLibraryManager.tsx:876-882` — `facetedItems` useMemo at `:876`, `sheetItems.filter(componentMatchesFacets)` at `:877`, `facetedItems.filter(itemMatchesSheetQuery)` at `:881-882`). | No out-of-order/stale-response race exists today. Server search is FUTURE-if-budget-exceeded only. | Backend lead | 0A | n/a | revert speculative server-search code | EV-BE-02 | n/a | n/a | n/a | see `30` | jsdom | n/a | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:877` |
| 2 | Real perf risk is the browse fetch payload. `loadCurrentWorkspaceComponentRowsLibrary` (`actions.ts:445`) calls `getCurrentWorkspaceComponentRowsLibrary` (`component-library-repository.ts:795`), which defaults to `includeDetailGraph: true` (`component-library-repository.ts:533`) and eagerly loads the full nested detail graph per item. | PRIMARY lever: fetch browse rows with `includeDetailGraph: false` and load detail lazily in `ComponentInspectorDock.tsx`. | Backend lead | 0B | n/a | revert to `includeDetailGraph: true` | EV-BE-05 | n/a | n/a | n/a | see `30` | Playwright | n/a | `src/lib/component-library/actions.ts:445` |

---

## 2. Scale assumptions

Closed-beta libraries may start small, but the UI should avoid patterns that break at realistic catalog scale.

| Tier | Assumption | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 100 components | Card and dense modes feel instant under normal conditions. | Perf lead | 0A | n/a | n/a | EV-PERF-01 | n/a | n/a | n/a | see `30` §3 | Playwright | n/a | `scripts/seed-performance-test-data.ts` |
| 500 visible rows | Dense mode remains usable with no layout instability. | Perf lead | 0A | `library_dense_mode` | redeploy flag=false | EV-PERF-01 | n/a | n/a | see `31` | see `30` §3 | Playwright | n/a | `src/lib/workshop/virtualization-flags.ts` |
| 5,000+ backing components | Client-side filtering may exceed budget; revisit server-side/indexed path (FUTURE). | Perf lead | 5 | `library_virtualization_enabled` | server-search fallback | EV-PERF-01 | n/a | n/a | n/a | see `30` §3 | Playwright | n/a | `src/lib/workshop/virtualization-flags.ts` |
| 10,000 components | `LIBRARY_COMPONENT_CAP = 10_000` (`actions.ts:212`, enforced via `assertWithinLibraryQuota` at `actions.ts:477`) is the existing hard cap. | Backend lead | all | n/a | raise cap only by product decision | EV-BE-06 | n/a | n/a | n/a | n/a | n/a | n/a | `src/lib/component-library/actions.ts:212` |

> **Budget provenance (PROVISIONAL — resolves C-015):** all numeric thresholds
> in this doc are **PROVISIONAL** and resolve to `30-PERF-BUDGET-AND-REGRESSION-GATES.md` §3.
> **No Phase 0A measurement exists yet** (§3 is where the seed + measure happens). Until
> `_PHASE-0A-PERF-BASELINE.md` is written, the 100 / 500 / 5,000 tiers carry **no pass/fail
> number an engineer can assert against** — they are placeholders that the 0A baseline will
> replace. To keep the gate testable before 0A lands, each tier carries a provisional default
> below; these defaults are NOT budgets and are superseded the moment the 0A baseline exists.
>
> | Tier | Provisional default (NOT a budget) |
> |---|---|
> | 100 components (card mode) | initial frame ≤ 200 ms, keystroke INP ≤ 50 ms — provisional |
> | 500 visible rows (dense mode) | initial frame ≤ 500 ms, keystroke INP ≤ 100 ms — provisional |
> | 5,000+ backing components | client filter still usable OR documented server-search fallback — provisional |
>
> Final budgets live in `30` §3 once the 0A baseline replaces these placeholders.

---

## 3. Phase 0A seed + measure

| Step | Action | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Extend `scripts/seed-performance-test-data.ts` to seed N `cost_library_items` (with optional folder + supplier/brand spread). Script currently does NOT cover `cost_library_items`. | Backend lead | 0A | n/a | revert seed extension | EV-BE-07 | n/a | n/a | n/a | n/a | n/a | n/a | `scripts/seed-performance-test-data.ts` |
| 2 | Seed at four tiers (100 / 500 / 5,000 / 10,000) and MEASURE before claiming any tier passes. | Perf lead | 0A | n/a | n/a | EV-PERF-01 | n/a | n/a | n/a | see `30` §3 | Playwright | n/a | `scripts/seed-performance-test-data.ts` |
| 3 | Record baselines at `.ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/evidence/perf/0A/_PHASE-0A-PERF-BASELINE.md` per `30` §5 artifact schema. | Perf lead | 0A | n/a | n/a | EV-PERF-01 | n/a | n/a | n/a | see `30` §3 | n/a | n/a | `30-PERF-BUDGET-AND-REGRESSION-GATES.md` §5 |
| 4 | Measure card-grid / dense-table initial render time via marked `performance.measure("library-grid-render")` in Playwright, following the existing `e2e/route-transition-performance.spec.ts` + `e2e/route-transition-performance-budgets.json` convention. | Perf lead | 0A | `library_dense_mode` | revert measurement harness | EV-PERF-01 | n/a | n/a | n/a | see `30` §3 | Playwright | n/a | `e2e/route-transition-performance.spec.ts` |
| 5 | Measure interaction latency for a keystroke in the client search box at 500 and 5,000 rows. | Perf lead | 0A | n/a | n/a | EV-PERF-01 | n/a | n/a | n/a | see `30` §3 | Playwright | n/a | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:881` |
| 6 | Measure browse fetch transfer size and parse time for `loadCurrentWorkspaceComponentRowsLibrary` with `includeDetailGraph` true vs false. Record BOTH `JSON.stringify(response).length` AND Playwright `Response.body()` byte length. | Perf lead | 0A | n/a | n/a | EV-PERF-01 | n/a | n/a | n/a | see `30` §3 | Playwright | n/a | `src/lib/component-library/actions.ts:445` |
| 7 | Owning command: `bun run test:e2e` (Playwright) for render/interaction timing; payload capture via seeded workspace. | Perf lead | 0A | n/a | n/a | EV-PERF-01 | n/a | n/a | n/a | n/a | Playwright | n/a | `24-EXECUTION-EVIDENCE-LEDGER.md` |

---

## 4. Rendering budget and mobile/a11y proof for dense mode

| Target | Proof | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Stable initial frame while data loads. | Phase 5 browser-proof row in `24`. | Frontend lead | 5 | `library_dense_mode` | redeploy flag=false | EV-FRONTEND-09 | n/a | `dense_mode.loading` | skeleton-frame | see `30` §3 | Playwright | key-based | `src/components/workshop/LibraryPageClient.tsx` |
| No toolbar/card/row overlap at target responsive widths. | `ADV-MOBILE-BROWSE`, `bun run test:e2e e2e/workshop-library-routes.spec.ts` at narrow viewport. | Frontend lead | 5 | `library_dense_mode` | redeploy flag=false | EV-FRONTEND-09 | n/a | n/a | responsive-layout | see `30` §3 | Playwright | key-based | `e2e/workshop-library-routes.spec.ts` |
| No unbounded row rendering if Phase 0A measurement fails the 500-row gate. | Fallback decision tree (§8). | Perf lead | 5 | `library_dense_mode` | redeploy flag=false | EV-PERF-01 | n/a | n/a | see `31` | see `30` §3 | Playwright | n/a | `src/lib/workshop/virtualization-flags.ts` |
| Reduced browse payload: fetch browse rows with `includeDetailGraph: false` and load detail only when inspector dock opens. | Payload-byte capture and DOM assert. | Backend lead | 0B | n/a | revert to `includeDetailGraph: true` | EV-BE-05 | n/a | n/a | n/a | see `30` §3 | Playwright | n/a | `src/lib/component-library/actions.ts:445` |

### Dense-mode a11y proof

| Criterion | Owner | Phase | Evidence | Binding |
|---|---|---|---|---|
| Dense table is keyboard-navigable (arrow keys, Tab, Enter). | A11y lead | 5 | EV-A11Y-05 | `31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md` |
| Screen reader announces row position and trust state. | A11y lead | 5 | EV-A11Y-05 | `31` |
| Focus indicator visible on 2px outline in dense rows. | A11y lead | 5 | EV-A11Y-05 | `31` |
| Mobile touch targets ≥ 44×44 px in dense mode. | A11y lead | 5 | EV-A11Y-05 | `31` |

### Dense / virtualization flag combinations (resolves C-004)

`library_dense_mode` and `library_virtualization_enabled` are **independent** build-time
env flags (default `false` each — see `21` §4). All four combinations are addressable and
must each be measured in Phase 0A / 5:

| `library_dense_mode` | `library_virtualization_enabled` | Rendered surface | Perf risk | Owner | Phase |
|---|---|---|---|---|---|
| false | false | Card grid only (default). | Lowest — card count bounded by viewport. | Frontend lead | default |
| true | false | Dense table/list, full DOM render. | Rises with row count; 500-row gate is the blocker. | Frontend lead | 5 |
| false | true | Card grid + virtualized list (defensive). | Low; virtualization with few off-screen rows is near-free. | Frontend lead | 5 |
| true | true | Dense table/list + `@tanstack/react-virtual`. | Intended large-list posture; reuses `WORKSHOP_VIRTUALIZATION_FLAGS`. | Frontend lead | 5 |

Operator flips each via its **own** env var (see `21` §4), so dense-on / virtualization-off
is reachable without touching the other. The fallback ladder in §8 moves a given combination
down a rung when its tier fails.

### One-blur-per-region GPU budget (cross-ref doc 35 §11)

The Library glass shell (doc 35 §12, Phase 1) and content-grade card glass (Phase 2 / 5) are
GPU-budgeted by the **one-blur-per-region** rule, not a parallel glass system. This binds the
perf doc to the material layer:

| Rule | Value | Binding |
|---|---|---|
| One blur per region | never stack `backdrop-filter` inside `backdrop-filter` | `35-LIQUID-GLASS-LIBRARY-UX-SPEC.md` §11; mirrors `estimate-surface-variant.tsx:21` slots |
| Blur cap | `18px` max (`--glass-blur`) | `src/app/globals.css:110` |
| Simultaneous glass panels | ≤ workspace shell + one drawer/modal — do NOT frost every card in Phase 1 | doc 35 §11 GPU budget |
| Deferred arming | blur armed only after `<html data-glass="ready">` (idle + first paint) | doc 35 §11; `35` §8 |
| Card glass posture | Phase-2 component cards / Phase-5 template cards are translucent fills (not extra blurs) unless the 0A-measured budget allows — measure in Phase 0A, see `30` | doc 35 §11 |

The 0A perf baseline (§3) MUST include a glass-on vs glass-off frame-time delta at the 500-row
tier so the GPU budget is measured, not assumed.

---

## 5. Browse payload reduction (PRIMARY perf lever, Phase 0B)

| Step | Action | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Browse list does not need per-item versions / price history / state history / attachments. Fetch with `includeDetailGraph: false` (`getCurrentWorkspaceComponentRowsLibrary({ includeDetailGraph: false })`, `component-library-repository.ts:795`). | Backend lead | 0B | n/a | revert to `includeDetailGraph: true` | EV-BE-05 | n/a | n/a | n/a | see `30` §3 | Playwright | n/a | `src/lib/repositories/component-library-repository.ts:795` |
| 2 | Widen `loadCurrentWorkspaceComponentRowsLibrary` (`actions.ts:445-448`) to accept `{ includeDetailGraph?: boolean }` and forward it, OR add a sibling lite action. Action body sits AFTER `requireCurrentUserContext()` (`:446`). | Backend lead | 0B | n/a | revert signature change | EV-BE-05 | n/a | n/a | n/a | n/a | jsdom | n/a | `src/lib/component-library/actions.ts:445` |
| 3 | Confirm NO consumer reads versions/price history/state history/attachments off the browse `WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY` cache except `ComponentInspectorDock.tsx`. | Backend lead | 0B | n/a | n/a | EV-BE-05 | n/a | n/a | n/a | n/a | `rg` | n/a | `src/lib/component-library/query-keys.ts` |
| 4 | `LibraryPageClient.tsx` passes `false` to the browse action. | Frontend lead | 0B | `library_component_deep_link` (route-state surface) | redeploy flag=false | EV-FRONTEND-02 | n/a | n/a | n/a | see `30` §3 | Playwright | n/a | `src/components/workshop/LibraryPageClient.tsx` |
| 5 | Load inspector-scoped detail graph lazily when `ComponentInspectorDock.tsx` opens for a given item, keyed off `?component=<id>` route state. **Lazy detail load (binding):** when `?component=<id>` resolves, `ComponentInspectorDock.tsx` calls `getCurrentWorkspaceComponentRowsLibrary` filtered to that one item with `includeDetailGraph: true` (reusing the existing repository path) under a **NEW** workspace-scoped query key `workspaceComponentDetailGraphQueryKey(workspaceId, itemId)` registered in `13-DATA-CONTRACTS-ROUTE-CACHE.md` §query-keys. If the 0A sub-seed shows the rows call still over-fetches for a single item, replace it with a new `getComponentDetailGraph(itemId)` RPC (Phase-0B decision — flag in `13`); until then reuse the existing call with the scoped key. Do NOT re-fetch the whole browse list to populate the inspector. | Frontend lead | 0B | `library_component_deep_link` | redeploy flag=false | EV-FRONTEND-02 | n/a | `component_inspector.loading_detail` | see `31` | see `30` §3 | Playwright | key-based | `src/components/workshop/library/ComponentInspectorDock.tsx` |

---

## 6. Query and search strategy (FUTURE — only if Phase 0A baseline exceeds budget)

| Condition | Action | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Client filtering exceeds keystroke-latency budget at seeded tiers. | Push search/filter/sort to server (net-new RPC). | Backend lead | 5 | `library_virtualization_enabled` | revert to client filtering | EV-BE-08 | n/a | n/a | n/a | see `30` §3 | Playwright | n/a | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:881` |
| Server search needed. | Add Postgres FTS or trigram index (requires migration, DEFERRED). | DB lead | Phase-later | n/a | drop index | EV-DB-01 | n/a | n/a | n/a | n/a | n/a | n/a | `supabase/migrations` |
| Semantic text search needed. | Consider Postgres full-text indexes (FUTURE migration). | DB lead | Phase-later | n/a | n/a | EV-DB-01 | n/a | n/a | n/a | n/a | n/a | n/a | `supabase/migrations` |

---

## 7. Network failure states

Every major surface needs loading skeleton/frame, retry action, preserved safe context, and permission-safe error copy.

| Surface | Fetch | Failure-copy key | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Overview | single dataset (`searchLibraryOverview` / overview repository read) | `library.error.network` | Frontend lead | 0B | n/a | n/a | EV-FRONTEND-10 | n/a | `library.error.network` | live-region | n/a | jsdom | key-based | `src/components/workshop/library/overview/LibraryOverview.tsx` |
| Component browse | `loadCurrentWorkspaceComponentRowsLibrary` | `components.error.network` | Backend lead | 0B | n/a | revert payload change | EV-BE-05 | n/a | `components.error.network` | live-region | see `30` §3 | Playwright | key-based | `src/lib/component-library/actions.ts:445` |
| Component inspector dock | lazy detail graph | `component_inspector.error.network` | Frontend lead | 0B | `library_component_deep_link` | redeploy flag=false | EV-FRONTEND-02 | n/a | `component_inspector.error.network` | live-region | n/a | Playwright | key-based | `src/components/workshop/library/ComponentInspectorDock.tsx` |
| Quick add | `createCostLibraryComponent` | `quick_add.error.network` | Frontend lead | 3 | `library_quick_add` | redeploy flag=false | EV-FRONTEND-08 | `quick_add_failed` | `quick_add.error.network` | see `31` | n/a | Playwright | key-based | `src/lib/component-library/actions.ts` |
| Folder actions | `createLibraryFolder` / `renameLibraryFolder` / `deleteLibraryFolder` | `folder.error.network` | Frontend lead | 0B | `library_folder_dialogs` | redeploy flag=false | EV-FRONTEND-02 | n/a | `folder.error.network` | alertdialog | n/a | Playwright | key-based | `src/lib/component-library/actions.ts` |
| Template preview | template-browse/editor path | `template.error.network` | Frontend lead | 4 | `library_trust_chips` | redeploy flag=false | EV-FRONTEND-07 | n/a | `template.error.network` | live-region | n/a | Playwright | key-based | `src/app/workshop/library/templates/[templateId]/page.tsx` |
| Insert action | `resolveEstimateTemplateInsertTarget` | `insert_target.stale_target` | Frontend lead | 4 | `library_trust_chips` | redeploy flag=false | EV-FRONTEND-07 | `insert_target_mismatch` | `insert_target.stale_target` | see `31` | n/a | Playwright | key-based | `src/lib/component-library/actions.ts` |

---

## 8. Fallback decision tree

When the Library page exceeds the Phase 0A-measured budget, choose the first applicable fallback:

```
1. Browse response body > doc-30 threshold (500 components)?
   → Yes: set includeDetailGraph=false. Re-measure.
   → Still > threshold? Go to step 2.

2. LCP > doc-30 target after payload reduction?
   → Yes: add route segment caching (unstable_cache with cacheTag). Re-measure.
   → NET-NEW infrastructure: no `unstable_cache`/`cacheTag` pattern exists in
     `src/app/workshop/library/` today; reaching this node requires an architecture
     decision (Phase 0A/0B), not a mechanical edit.
   → Still > target? Go to step 3.

3. LCP > target after caching?
   → Yes: split library overview into server-rendered summary + client-rendered detail. Re-measure.
   → NET-NEW component split: `LibraryOverview.tsx` is a single dataset today (§1 fact 1);
     reaching this node requires splitting it into a server summary + client detail
     component — an architecture decision, not a mechanical step. Flag for owner sign-off.
   → Still > target? Go to step 4.

4. Heap > doc-30 threshold (500 components)?
   → Yes: enable virtualization (library_virtualization_enabled=true). Re-measure.
   → Still > threshold? Go to step 5.

5. Heap > dense-mode threshold with virtualization?
   → Yes: paginate library query (50 components per page). Re-measure.
   → Still > threshold? Go to step 6.

6. Search INP > doc-30 threshold (client-side)?
   → Yes: move search to server-side RPC. Re-measure.
   → Still > threshold? Go to step 7.

7. All fallbacks exhausted?
   → No-go. Escalate to Perf lead + Planning lead. Re-scope or re-architect.
```

| Decision-tree node | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Node 1: includeDetailGraph=false | Backend lead | 0B | n/a | revert to true | EV-BE-05 | n/a | n/a | n/a | see `30` §3 | Playwright | n/a | `src/lib/component-library/actions.ts:445` |
| Node 4: virtualization on | Frontend lead | 5 | `library_virtualization_enabled` | redeploy flag=false | EV-FRONTEND-09 | n/a | n/a | see `31` | see `30` §3 | Playwright | n/a | `src/lib/workshop/virtualization-flags.ts` |
| Node 5: pagination | Backend lead | 5 | `library_virtualization_enabled` | revert to client list | EV-BE-09 | n/a | `components.pagination.*` | see `31` | see `30` §3 | Playwright | key-based | `src/lib/component-library/actions.ts` |
| Node 6: server search | Backend lead | 5 | `library_virtualization_enabled` | revert to client filtering | EV-BE-08 | n/a | n/a | n/a | see `30` §3 | Playwright | n/a | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:881` |
| Node 7: no-go escalation | Perf lead | any | n/a | hold release | EV-PERF-01 | n/a | n/a | n/a | n/a | n/a | n/a | `30-PERF-BUDGET-AND-REGRESSION-GATES.md` §4 |

---

## 9. Concurrency contracts

| Case | Surface | Action re-run | Invalidation/refetch key | Conflict behavior | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Component changed after inspector opened | `ComponentInspectorDock.tsx` | lazy detail fetch (inspector-scoped) | `?component=<id>` detail key per `13-DATA-CONTRACTS-ROUTE-CACHE.md` §224 (Mutation Cache Contract) + §Component Detail Payload | Compare `updated_at`; if advanced, surface conflict banner; do NOT clobber local edits. | Frontend lead | 0B | `library_component_deep_link` | redeploy flag=false | EV-FRONTEND-02 | n/a | `component_inspector.stale_after_open` | live-region | n/a | Playwright | key-based | `src/components/workshop/library/ComponentInspectorDock.tsx` |
| Component archived/deleted after insert picker opened | Insert picker | `resolveEstimateTemplateInsertTarget` | insert-target key per `13-DATA-CONTRACTS-ROUTE-CACHE.md` §193 (Insert Target Contract) | Check `estimate_row_link_state` health; warn/block/allow-override. | Frontend lead | 4 | `library_trust_chips` | redeploy flag=false | EV-FRONTEND-07 | `insert_target_mismatch` | `insert_target.stale_target` | see `31` | n/a | Playwright | key-based | `src/lib/component-library/actions.ts` |
| Folder renamed/deleted while dialog open | Folder dialog | `delete_library_folder` RPC | folder/tree key per `13-DATA-CONTRACTS-ROUTE-CACHE.md` §224 (Mutation Cache Contract) | Re-read tree and re-render dialog over fresh state. | Frontend lead | 0B | `library_folder_dialogs` | redeploy flag=false | EV-FRONTEND-02 | n/a | `folder.error.concurrent` | alertdialog | n/a | Playwright | key-based | `src/lib/component-library/actions.ts` |
| Template changed after preview opened | Template preview | template-browse/editor read | template key per `13-DATA-CONTRACTS-ROUTE-CACHE.md` §167 (Template Trust Payload) | Recompute computed-join trust summary. | Frontend lead | 4 | `library_trust_chips` | redeploy flag=false | EV-FRONTEND-07 | `trust_chip_rendered` | `template.trust_summary.*` | live-region | n/a | Playwright | key-based | `src/app/workshop/library/templates/[templateId]/page.tsx` |
| Estimate/project target changed after target picker opened | Insert picker | `resolveEstimateTemplateInsertTarget` | insert-target key per `13` | Re-resolve and re-guard with `rpc("can_edit_estimate",{target_estimate_id})`. | Frontend lead | 4 | `library_trust_chips` | redeploy flag=false | EV-FRONTEND-07 | `insert_target_mismatch` | `insert_target.permission` | see `31` | n/a | Playwright | key-based | `src/lib/component-library/actions.ts` |
| Local unsaved changes and source updates arrive | Any editable surface | n/a | n/a | Preserve local buffer, report conflict, require explicit choice; never silently overwrite. | Frontend lead | all | n/a | git revert of auto-merge | EV-FRONTEND-11 | n/a | `*.error.concurrent` | live-region | n/a | jsdom | key-based | `03-MODALS-POPOVERS-AND-OVERLAYS.md` |

Default behavior for every case: refetch or report conflict (never silently accept newer source), preserve local unsaved data, do not silently overwrite local overrides, do not silently mutate a different target.

---

## 10. Concurrency test matrix

| Scenario | Test command | Pass condition | Owner | Phase | Evidence |
|---|---|---|---|---|---|
| Inspector open + source updated concurrently | `bun run test:dom` | Conflict banner renders; local edits preserved. | Frontend lead | 0B | EV-FRONTEND-02 |
| Insert picker open + target deleted concurrently | `bun run test:e2e` | `insert_target_mismatch` fires; no mutation attempted. | Frontend lead | 4 | EV-FRONTEND-07 |
| Folder dialog open + folder deleted concurrently | `bun run test:dom` | Dialog refreshes to fresh tree; action disabled or retried. | Frontend lead | 0B | EV-FRONTEND-02 |
| Template preview + dependency changed concurrently | `bun run test:dom` | Trust summary recomputes; stale warning appears. | Frontend lead | 4 | EV-FRONTEND-07 |
| Local edit + source update race | `bun run test:dom` | Local buffer preserved; user must choose. | Frontend lead | all | EV-FRONTEND-11 |

### High-risk mutation-overlap matrix

The Library page has several mutations that can overlap on the same row / tree /
target. These are the highest-blast-radius overlap pairs and the exact pass
condition each must satisfy (canonical commands from keystone "Test Commands" —
never bare `bun test`):

| Overlap pair | Owning test + command | Pass condition | Owner | Phase | Evidence |
|---|---|---|---|---|---|
| Bulk archive (`executeBulkArchiveLibraryComponents`) while a single-component lifecycle change is in flight on the same item | `vitest run tests/vitest/library-bulk-vs-single-lifecycle.test.tsx` (net-new) | Second mutation is rejected or re-resolved; no row lands in a mixed `archived`/other state; `bulk_action_executed` and `component_lifecycle_changed` both fire with consistent final state. | Backend lead | 0B | EV-BE-12 |
| Quick Add save (`createCostLibraryComponent`) while the parent folder is being deleted (`deleteLibraryFolder`) | `vitest run tests/vitest/library-quickadd-vs-folder-delete.test.tsx` (net-new) | Save either attaches to a surviving folder or fails with `folder.error.concurrent`; the new component is never orphaned on a deleted folder_id. | Frontend lead | 3 | EV-FRONTEND-08 |
| Insert-into-estimate (`insertEstimateRowItemFromLibrary`) while the source component is archived mid-picker | `vitest run tests/vitest/library-insert-vs-source-archive.test.tsx` (net-new) + `ADV-XWS-ESTIMATE-TARGET` suite | `estimate_row_link_state` resolves to `source-changed`/`detached` not a silent clean insert; `insert_target_mismatch` fires. | Frontend lead | 4 | EV-FRONTEND-07 |
| Folder rename (`renameLibraryFolder`) + folder move (`moveCostLibraryComponentToFolder`) on the same folder concurrently | `vitest run tests/vitest/library-folder-rename-vs-move.test.tsx` (net-new) | Tree re-read after both settle; no component lands under a stale folder name; RLS rejects foreign folder id. | Frontend lead | 0B | EV-FRONTEND-02 |
| Workspace switch mid-bulk-archive | `vitest run tests/vitest/library-workspace-switch-cache.test.tsx` | `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` clears before the bulk result lands; no cross-workspace archive applied. | Backend lead | 0A | EV-18-003 |

---

## 11. Performance no-go conditions

| No-go condition | Measured threshold | Owning check | Status | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Dense/table mode locks up at 500-row tier | see `30-PERF-BUDGET-AND-REGRESSION-GATES.md` §3 | `bun run test:e2e` against seeded workspace reading `performance.measure("library-grid-render")` | BLOCKING (Phase 5) once 0A baseline replaces placeholder | Perf lead | 5 | `library_dense_mode` | redeploy flag=false | EV-PERF-01 | n/a | n/a | see `31` | see `30` §3 | Playwright | n/a | `src/lib/workshop/virtualization-flags.ts` |
| Browse fetch ships full nested detail graph for grid | browse payload not reduced vs `includeDetailGraph: false` baseline | payload-byte capture true vs false | BLOCKING (Phase 0B) | Backend lead | 0B | n/a | revert to true | EV-BE-05 | n/a | n/a | n/a | see `30` §3 | Playwright | n/a | `src/lib/component-library/actions.ts:445` |
| Query keys show old workspace data after switch | any cross-workspace bleed via un-scoped `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` (still the bare `["workspace-component-library"]` literal) | cache-scope test; `bun run test:dom` — scoping fix + all-call-site migration owned by `13-DATA-CONTRACTS-ROUTE-CACHE.md` §251 (Workspace-switch cache-bleed surface BLOCKER) + `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` §Cache And Session Risks | BLOCKING (today) | Backend lead | 0B | n/a | revert key-scoping change | EV-BE-10 | n/a | n/a | n/a | n/a | jsdom | n/a | `src/lib/component-library/query-keys.ts:5` |
| 5,000-row tier exceeds keystroke budget with no server path planned | see `30` §3 | `bun run test:e2e`; `_PHASE-0A-PERF-BASELINE.md` | BLOCKING (Phase 5) once 0A baseline replaces placeholder | Perf lead | 5 | `library_virtualization_enabled` | server-search fallback | EV-PERF-01 | n/a | n/a | n/a | see `30` §3 | Playwright | n/a | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:881` |
| Loading/error states remove navigation context | any surface drops skeleton/retry frame or loses active folder/filter context | `bun run test:dom`; manual browser proof | BLOCKING (today) | Frontend lead | all | n/a | revert offending state change | EV-FRONTEND-10 | n/a | `*.error.network` | live-region | n/a | Playwright | key-based | `src/components/workshop/LibraryPageClient.tsx` |

---

## 12. Perf artifact schema (repeated measurements + regression tracking)

All measurements follow the single canonical schema in
`30-PERF-BUDGET-AND-REGRESSION-GATES.md` §5:

```
.ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/evidence/perf/
  <phase>/
    <surface>/
      <measurement-id>.json
```

Each `<measurement-id>.json` carries the dimensions needed for **repeated
measurement + regression tracking** (schema owned by `30` §5): `phase`, `surface`,
`flag_combination` (one of the 4 dense × virtualization combos from §4, or
`card-default`), `row_count` (100 / 500 / 5,000 / 10,000), `glass` (on/off — §4 GPU
budget), `captured_at` (ISO), `git_sha`, `metrics` (initial-frame ms, keystroke INP
ms, browse-payload bytes, parse ms), and `environment` (dev / preview / prod,
device class). A measurement is **repeated** by writing a new file under the same
`<surface>` with a fresh `captured_at`; regression tracking compares files within a
`<surface>` across `captured_at`/`git_sha` (see `30` §5 comparison format).

JSON schema and comparison format are canonical in `30` §5. This doc adds no
duplicate schema; it only names the Library-specific dimension values above so
every Library measurement is repeatable and regressible.

---

## 13. Full validation gate

| Command | Runs | When to run | Owner | Evidence |
|---|---|---|---|---|
| `bun run validate` | `type-check && lint && lint:design-system && lint:design && test && test:dom` | Every PR touching Library. | QA lead | EV-QA-VALIDATE |
| `bun run test:dom` | `vitest run --maxWorkers=1` | jsdom suites. | QA lead | EV-QA-DOM |
| `bun run test:e2e` | Playwright | Browser/proof scenarios. | QA lead | EV-QA-E2E |
| `vitest run tests/vitest/<file>` | single jsdom suite | Targeted debugging. | QA lead | EV-QA-DOM |

> `bun test` runs `tests/unit` ONLY and will NOT execute the vitest suites; never use it for vitest.

---

## 14. Cross-references

- `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` — canonical bindings, phase map, performance reality.
- `30-PERF-BUDGET-AND-REGRESSION-GATES.md` — final budgets, measurement methodology, artifact schema, fallback tree.
- `13-DATA-CONTRACTS-ROUTE-CACHE.md` — query keys and mutation cache contracts.
- `21-FEATURE-FLAGS-AND-ROLLOUT.md` — `library_dense_mode` and `library_virtualization_enabled` flags.
- `24-EXECUTION-EVIDENCE-LEDGER.md` — pre-registered execution evidence.
- `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md` C-004, C-015 — resolved conflicts.
