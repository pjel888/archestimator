# Spreadsheet / XLSX Export — Architecture, Data Flow, Blast Radius & Test Coverage

Research date: 2026-06-13. Lens: architecture, data flow, blast radius, test coverage, tabs→worksheet mechanics.
READ-ONLY audit. Every claim carries `file:line` evidence. Severity tags: [CRITICAL]/[HIGH]/[MEDIUM]/[LOW].

Scope of files actually opened and verified:
- `src/lib/proposal-export/types.ts`
- `src/lib/proposal-export/build-proposal-export-model.ts`
- `src/lib/proposal-export/create-proposal-workbook.ts`
- `src/lib/proposal-export/worksheet-name.ts`
- `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` + `filename.ts`
- `src/components/workshop/ProposalExportPreviewDialog.tsx`
- `src/components/workshop/EstimateSheetContent.tsx` (export-relevant regions)
- `src/components/workshop/EstimateWorkspaceClient.tsx` (fallback-tab region)
- `src/lib/repositories/workspace-repository.ts` (tab/tree functions + helpers)
- `src/lib/estimates/types.ts` (model types)
- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` (server wiring)
- All 7 `tests/vitest/proposal-*.test.ts(x)` plus the two related boundary/smoke tests
- Confirmed importer set via `grep` and code-review-graph `callers_of`.

---

## 1. Executive summary

The XLSX export ("proposal export") is a small, well-isolated subsystem: one library folder
(`src/lib/proposal-export/`), one API route, one preview dialog, and a few callers. Its blast
radius is **narrow** — the only production consumers of the library are the export route and
`EstimateSheetContent` (preview). Test coverage of the *pure* pieces (model build, workbook
shape, worksheet-name sanitization, route happy/limit/404 paths, multi-tab round-trip) is
**genuinely strong**. The weaknesses are not crashes; they are **silent correctness / fidelity
gaps**:

- **[HIGH] Settings are dead config.** The route NEVER passes `ProposalExportSettings` from the
  UI; it hardcodes `defaultProposalExportSettings`. Worse, even when settings *are* supplied,
  `audience`, `mode`, and `consolidationMode` are read by **no code at all** — confirmed by
  tracing every read. They are pure type surface. (Findings #1, #2 confirmed.)
- **[HIGH] `includeFormulas` is ignored.** Formulas are always written; the flag is never read in
  the builder. (Finding #3 confirmed.)
- **[MEDIUM] `scopeStatus` is hardcoded `"included"`**, so `includeExcludedRows` can never filter
  anything and the bid-form SCOPE column is always "INCLUDED". (Finding #4 confirmed.)
- **[MEDIUM] Only `kind==="area"` rows export.** Rows attached to `group` nodes are silently
  dropped (with a warning issue that the route discards). Data-loss risk is real but bounded by
  the data model. (Finding #5 confirmed.)
- **[HIGH] Preview ≠ download for multi-tab.** The "All tabs" download builds every tab
  server-side, but the client preview is *always* built from the active tab's tree only. Users
  see one tab, download many. (Finding #6 confirmed.)
- **[MEDIUM] Hardcoded Summary rows (A27–B32) collide** when a single tab has more than ~11
  sections. The fragility is latent today only because real section counts are small.
- **[LOW] Single-model vs tabbed-model code is duplicated** (`createSummaryWorksheet` vs
  `populateTabbedSummaryWorksheet`; `createSourceBreakdownWorksheet` vs
  `createTabbedSourceBreakdownWorksheet`), doubling the surface any column/layout change must touch.

Coverage gaps: no test exercises non-default settings, the formula-correctness of
`includeFormulas=false`, excluded-row filtering, the >11-section Summary overflow, the
multi-tab aggregate node/row limit (413 across tabs), or the preview/download divergence for
multi-tab. Tests assert the *current* (partly-broken) behavior, so they will not catch these.

---

## 2. Data flow

### 2.1 Download (server) — `GET …/export/proposal.xlsx`

```
Browser <a href> (proposalDownloadHref)
  EstimateSheetContent.tsx:781-787  builds href; appends ?tab=<dataTabId>
                                    only when (multi persisted tabs) AND scope==="active-tab"
        │
        ▼
GET route.ts:207-216
  ├─ tabId = ?tab param                                  route.ts:209
  ├─ if tabId:        buildSingleTabResponse(…, tabId)   route.ts:211
  ├─ else: tabs = getEstimateTabs(projectId,estimateId)  route.ts:213
  │        if tabs.length <= 1 → buildSingleTabResponse(…, null)  route.ts:214
  │        else                → buildAllTabsResponse(…, tabs)    route.ts:215
        │
        ▼
Repository (RLS-authed, cookie session — see §3)
  ├─ single + tabId : getEstimateTabTree(p,e,tabId,{limits})        route.ts:107-110
  ├─ single + null  : getProjectEstimateTreeByEstimate(p,e,{limits}) route.ts:130-133
  └─ all tabs       : Promise.all(tabs.map getEstimateTabTree)      route.ts:155-160
        │  returns { project, estimate, tab?, tree, loadLimitState }
        ▼
Limit gate  didExceedExportLimit(loadLimitState, tree)             route.ts:83-89
  → 413 createLimitResponse()  (per-tab AND aggregate for all-tabs) route.ts:115,139,169,174
        │
        ▼
Model build  buildProposalExportModel({ metadata, nodes:tree })    route.ts:117-120,141-144,193-198
  metadata via buildMetadata(project, estimate)                     route.ts:91-103
  ── settings ALWAYS defaulted: single-tab path passes NO settings  route.ts:117-120,141-144
     (defaults applied at build-proposal-export-model.ts:347)
  ── all-tabs path: settings: defaultProposalExportSettings         route.ts:183
        │  pipeline: flatten → normalize → consolidate → summary/breakdown/totals
        ▼  (build-proposal-export-model.ts:346-379)
Workbook  createProposalWorkbookBuffer(model | tabbedModel)        route.ts:121,145,202
  → createProposalWorkbook (ExcelJS)                               create-proposal-workbook.ts:518-545
  → workbook.xlsx.writeBuffer()                                    create-proposal-workbook.ts:547-551
        │
        ▼
Response  createXlsxResponse(buffer, filename)                     route.ts:44-54
  filename via buildProposalWorkbookFilename(code,sheet,tab?)      route.ts:122-126,146-149,203
  Content-Type spreadsheetml.sheet; Content-Disposition attachment;
  Cache-Control private,no-store                                   route.ts:46-52
```

Build pipeline internals (`build-proposal-export-model.ts`):
- `flattenEstimateTree` (257-286): DFS; **only `node.kind==="area"` rows are collected**
  (265-279). Group-node rows never enter the flat list. `sortIndex` is global insertion order.
- `normalizeSourceRow` (85-123): `materialUnitCost = roundMoney(row.itemCost)`,
  **`laborUnitCost = 0` hardcoded** (89), `materialSubtotal = unit*qty`,
  `contingencySubtotal = materialSubtotal*contingencyPercentage/100` (92),
  `miscSubtotal = row.miscCost` (93), `costAmount = mat+labor+conting+misc` (94).
  **`scopeStatus` hardcoded `"included"`** (96), `includedInTotal = scopeStatus==="included"` (121).
  Section label = `category || discipline || "Uncategorized"` (95).
- `consolidateProposalRows` (288-344): groups by `consolidationKey` (125-138) =
  section/tag/particulars/unit/unitcosts/remarks/scope; sums qty + subtotals; merges source
  refs; filters zero rows unless `includeZeroRows` (296) and excluded rows unless
  `includeExcludedRows` (297). Renumbers 1..N (157-162).
- `buildSummaryRows` (187-214): per-`sectionKey` aggregate.
- `buildSourceBreakdownRows` (164-185): one row per source reference (traceability).
- `buildTotals` (216-236): sums only `includedInTotal` rows.
- Validation issues: `non_area_rows_skipped` (242-248), `empty_estimate` (352-358),
  `cost_split_compatibility_mode` (360-367). **NOTE: the route discards `model.validationIssues`
  entirely** — they are never surfaced in the download path (no read of `.validationIssues` in
  route.ts).

### 2.2 Preview (client) — `EstimateSheetContent`

```
Toolbar "Preview Excel Export" → openProposalPreview()        EstimateSheetContent.tsx:1079-1082
  → buildProposalPreview(scope)                                EstimateSheetContent.tsx:1064-1074
      model = buildProposalExportModel({
        metadata: resolvedProposalExportMetadata,              :1067-1068
        nodes:    materializeEditableEstimateTree(estimateTree, editableRows)  :1069
      })
      setProposalPreviewModel(model)                           :1071
  → ProposalExportPreviewDialog model={proposalPreviewModel}   :1644-1650
```

- The preview reads **`estimateTree`** = the *active tab's* loaded tree, merged with unsaved
  edits via `materializeEditableEstimateTree` (defined in
  `src/components/workshop/estimate-sheet/rows/editable-row-model.ts`). It does NOT call the
  route and does NOT fetch other tabs.
- **[HIGH] Preview ≠ download (multi-tab).** `buildProposalPreview` ignores `scope` for data
  selection — it always uses `estimateTree` regardless of `proposalPreviewScope`
  (:1064-1074). The scope only flips the *download href* (:781-787) and the cache signature
  (:768-776). So with "All tabs" selected, the preview shows ONE tab while the download contains
  ALL tabs. The dialog copy admits this ("this preview is built from the active tab rows",
  ProposalExportPreviewDialog.tsx:166) — it is disclosed, not fixed.
- Preview columns differ from the workbook: dialog shows TAG + MISC and omits LABOR SUBTOTAL/
  contingency-as-column and SCOPE (ProposalExportPreviewDialog.tsx:194-211) whereas the Bid Form
  sheet has ITEM/MATERIAL/LABOR/COST TOTAL/LINE TOTAL/SCOPE (create-proposal-workbook.ts:18-29).
  The preview is a *different table* from the downloaded Bid Form, not a faithful render.
- Staleness: `isProposalPreviewStale` compares a content signature
  (`createProposalPreviewSignature`, :202) of tree+edits+metadata+tab+scope (:1094); refresh
  rebuilds (:1083-1085).
- Multi-tab scope chips appear only when `hasMultiplePersistedTabs` (persisted = tabs minus the
  synthetic `legacy-main`, :753-754, :1086-1093).

---

## 3. Repository & data layer

All three repo functions use **`createSupabaseServerClient()`** — the RLS / cookie-session
client, NOT the service role. Access is gated by `getCurrentWorkspaceProject` (RLS-scoped
`projects` select), and the export route adds no separate auth check; it relies entirely on the
repo boundary (asserted by `auth-sensitive-api-boundaries.test.ts:144-152`).
Evidence: `workspace-repository.ts:3` import; `:1062-1088` getCurrentWorkspaceProject;
`:1695,1718,1740` each function calls `await createSupabaseServerClient()`.

### `getEstimateTabs(projectId, estimateId)` — workspace-repository.ts:1691-1715
- Resolves project via `getCurrentWorkspaceProject` (1692), verifies estimate belongs to project
  (1696-1704).
- Returns `EstimateTabSummary[]` from `estimate_tabs` where `estimate_id` matches and
  `archived_at IS NULL`, ordered by `sort_order asc` (1706-1711). Maps via `toEstimateTabSummary`
  → `{id,name,sortOrder,isDefault}` (1579-1586). **No node/row counts loaded** (lightweight).
- Used by the route ONLY to decide single-vs-all (route.ts:213-215). It does NOT pass limits.

### `getEstimateTabTree(projectId, estimateId, tabId, options)` — workspace-repository.ts:1731-1804
- Verifies project + estimate (1737-1749) + tab (`id=tabId, estimate_id, archived_at IS NULL`,
  1751-1757). Unknown/archived tab → `{tab:null, tree:[]}` (1760) → route returns 404
  (route.ts:111-113, 162).
- Nodes scoped by **`estimate_tab_id = tab.id`** (1764-1771); rows fetched by `node_id IN
  (nodeIds)` (1779-1788). Both ordered by `sort_order asc`.
- Limit handling: fetches `limit+1` to detect overflow (1771,1785); `limitTreeRows` slices and
  flags `didExceedLimit` (1565-1571); `loadLimitState` records fetched counts + exceed flags
  (1791-1800). Tree assembled by `buildEstimateTree` (1593-1637), totals computed (1624-1635).

### `getProjectEstimateTreeByEstimate(projectId, estimateId, options)` — workspace-repository.ts:1806-1827
- Tries `getDefaultEstimateTab` (1812); if a default tab exists, delegates to
  `getEstimateTabTree(defaultTab.id)` (1814). If NO default tab → legacy path
  `getProjectEstimateTreeByEstimateLegacy` (1813,1639-1689) which loads ALL nodes/rows of the
  estimate (no tab scoping, 1660-1661). Schema-missing fallback also routes to legacy (1824).
- This is the single-tab/no-`?tab` download path (route.ts:130-133).

### Node / row limits
- Defined in the route, NOT the repo: `PROPOSAL_EXPORT_NODE_LIMIT = 1200`,
  `PROPOSAL_EXPORT_ROW_ITEM_LIMIT = 3000` (route.ts:15-16). Passed as `maxNodeCount` /
  `maxRowItemCount` (route.ts:108-109,131-132,157-158).
- `didExceedExportLimit` (route.ts:83-89) trips 413 if loadLimitState flags an overflow OR the
  fetched/computed count exceeds a limit. For all-tabs, **both per-tab (169) AND a summed
  aggregate across tabs (166-176)** are checked, so 10 tabs of 400 nodes each (4000) → 413 even
  though each tab is under-limit. [Observation, not necessarily a bug — but undocumented and
  untested.]

### Tabs data model — see §4. Row mapping `toUiRow` (1510-1559): `itemCost=unit_cost`,
`quantity`, `contingency_percentage`, `misc_cost`; category/discipline/designation/supplier
flow into section/tag/remarks. There is **no labor field in the source schema** — hence the
hardcoded `laborUnitCost=0` and the `cost_split_compatibility_mode` info issue.

---

## 4. Tabs → worksheet mechanics

### Storage / identity
- Table `estimate_tabs`, columns selected: `id, estimate_id, name, sort_order, is_default,
  archived_at, metadata, created_at, updated_at` (workspace-repository.ts:1708,1721,1753).
- `EstimateTabSummary = { id, name, sortOrder, isDefault, nodeCount?, rowCount?, totalCost? }`
  (estimates/types.ts:143-151). Repo populates only id/name/sortOrder/isDefault
  (workspace-repository.ts:1579-1586).
- **`legacy-main` synthetic id**: when no real tabs exist the *client* injects a fallback tab
  `{ id:"legacy-main", name:"Main", sortOrder:0, isDefault:true }`
  (EstimateWorkspaceClient.tsx:81; default active id :89; AI context fallback
  read-context.ts:1257). `EstimateSheetContent` filters it out of "persisted" tabs
  (:753), so the export scope UI and `?tab=` href never use `legacy-main` (download falls back to
  the no-`?tab` server path → `getProjectEstimateTreeByEstimate`). The route itself has NO
  knowledge of `legacy-main`; if a client ever sent `?tab=legacy-main` the repo would 404 (no
  such row). [LOW] latent coupling: the magic string lives in two client files + AI context, not
  centralized.
- Active tab resolution for preview/href: `dataTabId ?? activeTabId ?? isDefault ?? [0]`
  (EstimateSheetContent.tsx:755-762).

### Tab → worksheet name
- Multi-tab path builds names via `buildUniqueWorksheetNames(tabs.map({id,name}))`
  (route.ts:180) → one Bid Form sheet per tab named by the sanitized tab name
  (create-proposal-workbook.ts:525-528). Single-tab path uses the literal `"Bid Form"`
  (create-proposal-workbook.ts:179, 537).
- `worksheet-name.ts` rules:
  - `sanitizeWorksheetBaseName` (39-47): NFKD-normalize, strip combining marks, replace Excel-
    invalid `[ ] : * ? / \` and control chars with space, collapse whitespace, truncate to 31.
  - Empty/blank → `"Tab"` (36,46).
  - `> 31` chars truncated (16,33-37); dedupe suffix ` (n)` kept inside 31 by re-truncating base
    (58-59). Verified by tests (proposal-worksheet-name.test.ts:35-44).
  - Duplicate names → ` (2)`, ` (3)` … (49-68).
  - **Reserved names**: `"history"` + the three global sheet names `Summary`, `Commercial Terms`,
    `Source Breakdown` are pre-seeded into `usedKeys` (10-23,50), so a tab literally named
    "Summary" becomes "Summary (2)" — prevents collision with the global sheets. Verified
    (proposal-worksheet-name.test.ts:19-33). **Gap:** `"Bid Form"` is NOT reserved, but in the
    multi-tab layout there is no global "Bid Form" sheet, so no collision. In the *single-tab*
    layout the Bid Form sheet is named the constant "Bid Form" (not the tab name), so a tab named
    "Summary" never reaches that path.
  - Case-insensitive keys via `toLocaleLowerCase("en-PH")` (25-27).
- Formula cross-sheet references quote + escape apostrophes:
  `quoteWorksheetCellReference("Owner's Scope","H20") → 'Owner''s Scope'!H20` (71-73), used by
  Summary formulas (create-proposal-workbook.ts:290,386). Verified (test :50-52).

### Edge cases
- Empty tab (no exportable rows) in multi-tab Summary → "No exportable rows" placeholder row
  with `0` amount (create-proposal-workbook.ts:374-379). Good.
- Single empty estimate → empty model + `empty_estimate` issue (build…:352-358); preview shows
  empty-state row (ProposalExportPreviewDialog.tsx:232-238). Download still produces a valid
  (empty) Bid Form.

---

## 5. Blast radius

Authoritative dependent list (grep + code-review-graph `callers_of`). The code-review-graph
`get_impact_radius` over the 4 library files reported 552 "impacted nodes", but **inspection
shows that count is polluted by `.agents/skills/impeccable/scripts/*.mjs`** false positives
(name collisions on generic identifiers like `visit`, `detect`). The real production blast radius
is small and enumerated below.

### Production consumers of `src/lib/proposal-export/*`
| Dependent | Imports | What breaks if export model/columns/settings change | Risk |
|---|---|---|---|
| `…/export/proposal.xlsx/route.ts` | `buildProposalExportModel`, `defaultProposalExportSettings`, `createProposalWorkbookBuffer`, `buildUniqueWorksheetNames`, `ProposalExportMetadata`, `ProposalTabbedWorkbookModel` (route.ts:3-10) | Only server caller of the workbook builder; any model-shape or settings-signature change lands here first | **HIGH** (sole download path) |
| `EstimateSheetContent.tsx` | `buildProposalExportModel`, `ProposalExportMetadata`, `ProposalExportModel` (:22-23,41) | Preview render breaks if model field names change (it reads `proposalRows.*`, `totals.*`, `summaryRows`, `sourceBreakdownRows`, `validationIssues`, ProposalExportPreviewDialog.tsx:171-256) | **MEDIUM** |
| `ProposalExportPreviewDialog.tsx` | `ProposalExportModel` type + `ProposalExportPreviewScope` (:6) | Column/field renames in the model break the preview table | **MEDIUM** |
| `EstimateWorkspaceClient.tsx` | `ProposalExportMetadata` type only (:9) | Type-only; metadata shape change | **LOW** |
| `estimate-sheet/activity-history.tsx` | `ProposalExportMetadata` type only (:15, used at :1545) | Type-only | **LOW** |

### Consumers of the route / filename helper
| Dependent | Reference | Risk |
|---|---|---|
| `EstimateSheetContent.tsx:783` | builds `proposalDownloadHref` (the only UI that hits the route) | **HIGH** |
| `filename.ts` ← route.ts:10,122,146,203 | `buildProposalWorkbookFilename` | LOW |
| `scripts/verify-hosted-export-route.ts` | smoke-tests the live route URL | LOW (ops) |
| `scripts/benchmark-proposal-workbook.ts` | imports `createProposalWorkbookBuffer`, `worksheet-name`, types (perf harness) | LOW |

### Consumers of the three repo functions (broader than export)
`getEstimateTabs` / `getEstimateTabTree` / `getProjectEstimateTreeByEstimate` are **shared
infrastructure**, also used by:
- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` (getEstimateTabs)
- `src/lib/estimates/actions.ts` (all three)
- `src/lib/reusable-sources/actions.ts` (getEstimateTabs, getEstimateTabTree)
- `src/lib/repositories/estimate-repository.ts` (getEstimateTabTree)
- internal callers within `workspace-repository.ts`

**[HIGH] Implication:** changing the *signature or return shape* of these repo functions is a
cross-cutting change far beyond export (workshop page render, estimate actions, reusable
sources). Changing only the **export model / columns / settings** is contained to the route +
preview (low blast radius). Adding new model fields is additive and safe; renaming/removing
existing fields breaks the preview and all 7 tests.

---

## 6. Test coverage map & gaps

| Test file | Asserts | Notable |
|---|---|---|
| `proposal-export-model.test.ts` | flatten area-only + areaPath traceability; consolidation merge + non-merge on cost/unit/particulars mismatch; summary/breakdown/totals; contingency math; empty estimate → `empty_estimate`; `cost_split_compatibility_mode` issue | Pure-function math is well covered |
| `proposal-workbook.test.ts` | sheet order (Bid Form/Summary/Commercial Terms/Source Breakdown); header rows; frozen panes; bid-form formula strings incl. SCOPE IF(); H-col SUM; **Summary B27/B30 hardcoded cells**; loadable buffer; **multi-tab workbook shape, frozen panes, cross-sheet `'Main'!H20` formulas, TAB column** | Asserts the *current* hardcoded layout — see fragility §7 |
| `proposal-export-route.test.ts` | 200 single-estimate attachment + metadata + V3 version; `?tab=` single-tab path; **all-tabs default for >1 tab** with worksheetName mapping; 404 unknown/archived tab; 404 outside workspace; **413 oversize** (single); filename sanitization; "no dormant version snapshots" source guard | Strong route coverage (mocks the builder) |
| `proposal-export-route-workbook.test.ts` | builds a REAL xlsx through the route (no builder mock); 60-row single + 4-row×2-tab round-trip; sheet names; cross-sheet formulas; TAB column | Integration-level, real ExcelJS |
| `proposal-export-preview.test.tsx` | dialog renders read-only table, stale badge, refresh/download/close; scope chips; **multi-tab href flips to `?tab=` on active-tab**; toolbar wiring | Confirms preview/href behavior |
| `proposal-worksheet-name.test.ts` | sanitize, truncate-to-31, dedupe + reserved names, unicode, apostrophe-quoting | Thorough |
| `proposal-workbook-benchmark.test.ts` | benchmark fixture builder + tiny real runs (single + tabbed) | Perf harness sanity |
| `auth-sensitive-api-boundaries.test.ts:144-152` | route stays behind repo boundary; private,no-store; 404 | Boundary guard |
| `hosted-export-route-smoke-script.test.ts` | env parsing + encoded route + auth-as-headers-only | Ops smoke |

### Coverage GAPS (untested, ordered by importance)
- **[HIGH] Settings are never exercised.** No test passes non-default `ProposalExportSettings`
  (audience/mode/consolidationMode/includeFormulas/includeZeroRows/includeExcludedRows/
  showSupplierInRemarks). The route never forwards them, so behavior is untestable end-to-end.
- **[HIGH] `includeFormulas=false`** has no test asserting formulas are omitted — because the
  builder never honors it (§7).
- **[MEDIUM] `includeExcludedRows` / excluded scope**: untested; `scopeStatus` is always
  "included" so the branch (build…:297) is dead in practice.
- **[MEDIUM] Summary >11-section overflow**: no test creates enough sections to push body rows
  past A26, so the A27 collision (§7) is uncaught.
- **[MEDIUM] All-tabs aggregate 413**: route.ts:166-176 sums counts across tabs; only the
  single-estimate 413 path is tested (route.test.ts:290-332). No test for "many small tabs sum
  over limit".
- **[MEDIUM] Preview ≠ download divergence**: no test asserts the preview model differs from the
  all-tabs download contents; tests only check the *href* flips.
- **[LOW] Group-node row drop**: `non_area_rows_skipped` issue is produced but never asserted in
  any test, and the route discards `validationIssues`, so the data-loss warning is invisible.
- **[LOW] Large-estimate / near-limit performance** beyond the 60-row integration case.
- **[LOW] `legacy-main` download behavior** (client filters it; no regression test that a
  legacy/no-tab estimate still downloads via the no-`?tab` path end-to-end through the route with
  `getEstimateTabs` returning `[]`). The route test mocks `getEstimateTabs → []` (route.test.ts:68)
  which covers the dispatch but not the synthetic-tab interplay.

---

## 7. Coupling / duplication / fragility findings

- **[MEDIUM] Hardcoded Summary cells collide past ~11 sections.** `createSummaryWorksheet`
  writes the section body starting at row `SUMMARY_HEADER_ROW+1 = 15`
  (create-proposal-workbook.ts:297, with `SUMMARY_HEADER_ROW=14` at :16), pads to row 26
  (`while (rowCount < 26)`, :299), then writes the totals block at the **fixed** cells A27–B32
  (:300-311) with the Direct-Cost SUM spanning `C15:Clast` (:301). If `sectionRanges.length > 11`
  the body rows extend to row 27+ and **overwrite / interleave the totals block** (the `while`
  no-ops once rowCount ≥ 26, but the section `forEach` at :285-295 has already written past 26),
  producing a corrupted Summary. Real estimates rarely have >11 *distinct categories per tab*, so
  this is latent — but it is unguarded and untested. The tabbed variant
  `populateTabbedSummaryWorksheet` (:355-423) avoids this by computing
  `totalsStartRow = rowCount + 2` (:395) — i.e. the **tabbed path is correct and the single-tab
  path is the fragile one.** This inconsistency is itself a smell.
- **[LOW] Single vs tabbed duplication.** Two near-identical Summary builders
  (`createSummaryWorksheet` 270-322 vs `populateTabbedSummaryWorksheet` 355-423) and two Source
  Breakdown builders (`createSourceBreakdownWorksheet` 425-460 vs
  `createTabbedSourceBreakdownWorksheet` 462-500, the latter only prepends a TAB column). Any
  column add/rename or numFmt change must be made in both, or the single-tab and multi-tab
  workbooks silently diverge. `BREAKDOWN_COLUMNS` vs `BREAKDOWN_COLUMNS_WITH_TAB` (37-57) is the
  same duplication at the column-definition level.
- **[MEDIUM] Bid Form formula row math depends on column letters.** The line-total formula
  hardcodes column letters D/E/F/G/I and the row number computed as `worksheet.rowCount + 1`
  (create-proposal-workbook.ts:215-220). Reordering `BID_FORM_COLUMNS` (18-29) silently breaks
  every formula because the letters are not derived from the column keys. Tight, undocumented
  coupling between the column array and the formula strings.
- **[HIGH] Dead settings surface.** `ProposalExportSettings` (types.ts:20-29) declares 9 knobs.
  Tracing every read:
  - `includeSourceBreakdownSheet` — read (create-proposal-workbook.ts:531,540). LIVE.
  - `includeZeroRows` — read (build…:296). LIVE.
  - `includeExcludedRows` — read (build…:297) but no-op given `scopeStatus` always "included".
  - `showSupplierInRemarks` — read (build…:76). LIVE.
  - `audience` — **no read anywhere** in `src/lib/proposal-export/*` (grep). DEAD.
  - `mode` (`detailed-boq`/`summary-only`) — **no read**. DEAD.
  - `consolidationMode` (`industry-standard`/`area-breakdown`) — **no read**. DEAD; consolidation
    is always the single `consolidationKey` strategy (build…:125-138). `area-breakdown` is
    unimplemented.
  - `includeFormulas` — **no read**; formulas always written (Bid Form 235-236, Summary
    301,307). DEAD; the bool is a lie.
  And the route never forwards ANY settings from the UI: single-tab passes no `settings`
  (route.ts:117-120,141-144), all-tabs hardcodes `defaultProposalExportSettings`
  (route.ts:183). The preview likewise passes no settings (EstimateSheetContent.tsx:1067-1070).
  Net: settings are entirely cosmetic today.
- **[LOW] `scopeLabel` handles a value the data never produces.** `scopeLabel` special-cases
  `"owner"` (create-proposal-workbook.ts:118-121) and the line formula checks for EXCLUDED / BY
  OTHERS / OWNER SUPPLIED / OSM / OFCI / OSCI / OMITTED / NOT APPLICABLE (:220), but the model
  only ever emits `scopeStatus="included"` (build…:96). The whole scope machinery is built for a
  feature (per-row scope) that the data layer does not yet supply.
- **[LOW] Validation issues are computed then dropped on download.** `model.validationIssues`
  (build…:350-367) is surfaced in the preview footer (ProposalExportPreviewDialog.tsx:255) but
  the route never reads it, so a downloaded-only user never learns rows were skipped or that
  cost-split compatibility mode applied.
- **[LOW] Limits live in the route, not the repo.** `PROPOSAL_EXPORT_NODE_LIMIT/ROW_ITEM_LIMIT`
  (route.ts:15-16) are duplicated as literals in the 413 response body (route.ts:60-63) and in
  the test (route.test.ts:327-329). A single source of truth would be safer.

---

## 8. Open questions / uncertainties

- **ASSUMPTION:** `estimate_tabs.estimate_tab_id` on `estimate_nodes` is the live tab-scoping
  column. Confirmed by code (workspace-repository.ts:1768-1769) and by memory note
  "estimate_tabs unapplied → outline 500s"; I did NOT query the live DB (Docker absent + hosted
  SQL denied per memory). Whether `estimate_tab_id` is populated for legacy estimates in
  production is unverified — if NULL, multi-tab export of a legacy estimate returns empty trees.
- **ASSUMPTION:** the >11-section Summary collision triggers a visibly corrupt sheet rather than
  an ExcelJS error. I reasoned from the cell-write logic; I did not generate a 12-section
  workbook to observe the exact corruption. Severity is MEDIUM not HIGH because real category
  counts are typically small.
- The code-review-graph `get_impact_radius` output (552 nodes) is **not trustworthy** for this
  question due to `.agents/skills/impeccable` script name-collision pollution; I relied on grep +
  `callers_of` for the blast radius instead. If a cleaner graph (excluding `.agents/`) is
  available, re-running impact would be worthwhile.
- I did not measure actual performance at the 1200-node / 3000-row ceiling; the benchmark harness
  exists (`scripts/benchmark-proposal-workbook.ts`) but I did not execute it.
- Whether any *future* UI is intended to wire settings → route (making the dead config live) is a
  product question, not answerable from code.
