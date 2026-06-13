# 01 — Current-State Audit: Spreadsheet / XLSX Export

> **What this is:** the definitive "how the export works today" reference. Self-contained; full file:line evidence lives in [`_research/01-architecture-blast-radius.md`](_research/01-architecture-blast-radius.md).
> **Audit date:** 2026-06-13 · **Branch:** `main` @ `f1a80c8d` · **Method:** read-only static analysis + benchmark run. No code changed.

---

## 1. What the feature is

Internally the feature is called **"proposal export."** On any estimate sheet, the toolbar action **"Preview Excel Export"** (a `FileXls` icon) opens a read-only modal; a **"Download editable XLSX"** button in that modal hits a server route that streams a `*-proposal.xlsx` workbook built with **ExcelJS 4.4.0**. The workbook is styled as an industry **Bill of Quantities (BOQ) / bid form**.

It is a **beta-grade feature with a strong skeleton and several hollow interiors**: the data model, multi-tab plumbing, worksheet structure, formulas, print setup, and tests are genuinely good; but a cluster of declared capabilities (export settings, material/labor split, VAT/contingency totals, per-row scope) are **modelled but not wired**, so the file looks more complete than it is.

---

## 2. Code surface (the whole feature)

| Layer | File | Role |
|---|---|---|
| Library | `src/lib/proposal-export/types.ts` | Model + settings types, incl. `ProposalTabbedWorkbookModel` |
| Library | `src/lib/proposal-export/build-proposal-export-model.ts` | Tree → flatten → normalize → consolidate → model |
| Library | `src/lib/proposal-export/create-proposal-workbook.ts` | ExcelJS workbook (Bid Form / Summary / Commercial Terms / Source Breakdown; + tabbed variant) |
| Library | `src/lib/proposal-export/worksheet-name.ts` | Excel sheet-name sanitize / 31-char / uniqueness |
| API | `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` | `GET` handler: single-tab vs all-tabs dispatch, limits, streaming |
| API | `.../export/proposal.xlsx/filename.ts` | Download filename sanitizer |
| UI | `src/components/workshop/ProposalExportPreviewDialog.tsx` | The preview modal |
| UI | `src/components/workshop/EstimateSheetContent.tsx` | Toolbar wiring, client preview build, download href, scope toggle |
| Data | `src/lib/repositories/workspace-repository.ts` | `getEstimateTabs`, `getEstimateTabTree`, `getProjectEstimateTreeByEstimate` |
| Tests | `tests/vitest/proposal-*.test.ts(x)` (7 files) | Model, workbook, route, preview, worksheet-name, benchmark |
| Ops | `scripts/benchmark-proposal-workbook.ts`, `scripts/verify-hosted-export-route.ts` | Perf harness + live smoke |

**Blast radius is narrow.** The only production consumers of `src/lib/proposal-export/*` are the export route (server) and `EstimateSheetContent`/`ProposalExportPreviewDialog` (preview). Two other files import only the metadata *type*. Adding model fields is additive/safe; renaming or removing existing fields breaks the preview and all 7 tests. (The three repository functions are shared infrastructure used well beyond export — see [05](05_security-and-blast-radius.md).)

---

## 3. End-to-end data flow

### 3.1 Download (server) — `GET …/export/proposal.xlsx[?tab=<id>]`

```
Modal "Download editable XLSX" → <a href={proposalDownloadHref}>     EstimateSheetContent.tsx:781-787
   href appends ?tab=<dataTabId> ONLY when (≥2 persisted tabs) AND scope==="active-tab"
        │
        ▼
GET route.ts:207-216
   ├─ ?tab present              → buildSingleTabResponse(tabId)        route.ts:211
   └─ no ?tab → getEstimateTabs ─┬ ≤1 tab  → buildSingleTabResponse(null)   route.ts:214
                                 └ >1 tabs → buildAllTabsResponse(tabs)      route.ts:215
        │
        ▼
Repository (RLS-scoped cookie client — see §6)
   single+tab : getEstimateTabTree(p,e,tabId,{limits})
   single+null: getProjectEstimateTreeByEstimate(p,e,{limits})  → default tab tree or legacy
   all-tabs   : Promise.all(tabs.map getEstimateTabTree)
        │  returns { project, estimate, tab?, tree, loadLimitState }
        ▼
Limit gate didExceedExportLimit → 413 (per-tab AND summed across tabs)  route.ts:83-89,166-176
        │
        ▼
buildProposalExportModel({ metadata, nodes })   ← settings ALWAYS defaulted (route never forwards UI settings)
        │  flatten → normalize → consolidate → summary/breakdown/totals
        ▼
createProposalWorkbookBuffer(model | tabbedModel)  → ExcelJS → writeBuffer()
        │
        ▼
createXlsxResponse(buffer, filename)   Content-Type spreadsheetml.sheet; attachment; private,no-store
```

### 3.2 Preview (client) — built in the browser, never calls the route

```
"Preview Excel Export" → openProposalPreview() → buildProposalPreview(scope)   EstimateSheetContent.tsx:1064-1082
   model = buildProposalExportModel({
     metadata: resolvedProposalExportMetadata,
     nodes:    materializeEditableEstimateTree(estimateTree, editableRows)   ← ACTIVE TAB tree + unsaved edits
   })
   → <ProposalExportPreviewDialog model=… />
```

The preview is built **client-side from the active tab only** and renders a flat HTML table. It does **not** fetch other tabs and does **not** reflect the actual workbook layout. This produces the central UX problem documented in [03](03_ux-ui-audit.md).

---

## 4. What the workbook contains

**Single-tab workbook (4 sheets):**
1. **Bid Form** — title block (Project, Location, Owner/Client *(blank)*, `Bidder / Contractor: "Archestimator beta workbook"`, Estimate/Revision, Date) + General Notes panel + sectioned detail with per-section header rows and `SUM` subtotal rows. Columns: `ITEM · PARTICULARS · UNIT · QTY · MATERIAL · LABOR · COST TOTAL · LINE TOTAL · SCOPE · NOTES / REMARKS`. Frozen header (row 17), landscape A4 fit-to-width, print titles.
2. **Summary** — `SECTION · ROWS · AMOUNT`, each amount a cross-sheet formula to the Bid Form subtotal; then `Direct Cost · Contingency(0) · VAT(0) · Grand Total · Cost per sqm(N/A) · Estimated duration(TBC)`.
3. **Commercial Terms** — Exclusions/Qualifications/Payment/Validity/Warranty boilerplate + Prepared-by/Accepted-by signature block.
4. **Source Breakdown** (optional, default on) — per-source-row traceability incl. `SOURCE ROW ID`, `AREA`, `AREA PATH`, full cost composition.

**Multi-tab workbook:** `Summary` (combined, totals reduced across tabs) → one **Bid Form-style sheet per estimate tab** (named from the sanitized tab name) → `Commercial Terms` → `Source Breakdown` (with a leading `TAB` column).

**Formulas (live, editable):**
- `COST TOTAL = MATERIAL + LABOR` (per unit).
- `LINE TOTAL = IF(scope ∈ {EXCLUDED, BY OTHERS, OWNER SUPPLIED, OSM, OFCI, OSCI, OMITTED, NOT APPLICABLE}, 0, QTY×COST TOTAL + contingency + misc)`.
- Section subtotal `= SUM(H…:H…)`; Summary references `'<sheet>'!H<subtotalRow>`.

> **Format semantics match industry templates** (`COST TOTAL` = combined unit rate, `LINE TOTAL` = extended amount) — confirmed against 10 real BOQs in [02](02_boq-format-benchmark.md). The gaps are content, not structure.

---

## 5. What is real vs. declared-but-hollow

| Capability | Status | Evidence |
|---|---|---|
| Multi-tab → one worksheet per tab | **REAL & working** | route.ts:154-205; create-proposal-workbook.ts:521-534 |
| Bid Form / Summary / Commercial Terms / Source Breakdown sheets | **REAL** | create-proposal-workbook.ts:518-545 |
| Live formulas, frozen panes, print setup, peso format | **REAL** | create-proposal-workbook.ts:13-15,136-152,179-190 |
| Worksheet-name sanitize / 31-char / dedupe / reserved names | **REAL & tested** | worksheet-name.ts; proposal-worksheet-name.test.ts |
| Node/row limits + 413 (per-tab and summed) | **REAL** | route.ts:15-16,83-89,166-176 |
| `includeSourceBreakdownSheet`, `includeZeroRows`, `showSupplierInRemarks` | **REAL (honored by builder)** | create-proposal-workbook.ts:531,540; build-…:296,76 |
| **Material / Labor split** | **HOLLOW — `laborUnitCost = 0` hardcoded** | build-proposal-export-model.ts:89 |
| **VAT / project-level Contingency in totals** | **HOLLOW — hardcoded 0** | create-proposal-workbook.ts:303-307 |
| **Per-row SCOPE** (excluded/by-others/…) | **HOLLOW — `scopeStatus` always "included"** | build-…:96 |
| `audience` (client/internal) | **DEAD — read by no code** | (grep: no reads) |
| `mode` (detailed-boq/summary-only) | **DEAD — read by no code** | (grep: no reads) |
| `consolidationMode` (industry-standard/area-breakdown) | **DEAD — area-breakdown unimplemented** | build-… uses one strategy only |
| `includeFormulas` | **DEAD — formulas always written** | (grep: no reads) |
| `includeExcludedRows` | **NO-OP — nothing is ever excluded** | build-…:297 (dead branch given scope always "included") |
| UI exposure of any setting | **NONE — only a scope toggle** | ProposalExportPreviewDialog.tsx |
| Route honoring UI settings | **NONE — always `defaultProposalExportSettings`** | route.ts:117-120,141-144,183 |
| Cost per sqm / GFA | **PLACEHOLDER "N/A"** | create-proposal-workbook.ts:308-309 |
| Validation issues on download | **DISCARDED** — computed, surfaced only in preview footer, never written to the file | route.ts (no read of `.validationIssues`) |

---

## 6. Repository & data layer (summary)

- All three functions use **`createSupabaseServerClient()`** — the **RLS-scoped, cookie-session** client (not service-role). Auth is enforced indirectly: each resolves the project via `getCurrentWorkspaceProject` → `requireCurrentUserContext()` which `redirect("/login")` when unauthenticated. (Security implications: [05](05_security-and-blast-radius.md).)
- `getEstimateTabTree` scopes nodes by `estimate_tab_id`, fetches row items in **one bulk `IN` query** (no N+1), and uses `LIMIT max+1` overflow detection.
- `getProjectEstimateTreeByEstimate` delegates to the default tab's tree, or falls back to a legacy whole-estimate load when no tabs exist.
- Limits live in the route: `PROPOSAL_EXPORT_NODE_LIMIT = 1200`, `PROPOSAL_EXPORT_ROW_ITEM_LIMIT = 3000`.

---

## 7. Known correctness / fragility issues (carried into the findings register)

- **[MEDIUM] Single-tab Summary collides past ~11 sections.** `createSummaryWorksheet` pads to row 26 then writes the totals block at fixed cells **A27–B32**; a tab with >~11 sections writes body rows into 27+, corrupting the totals. The **tabbed** Summary computes `totalsStartRow` dynamically and is correct — the two paths are inconsistent. (create-proposal-workbook.ts:297-311 vs 395-420)
- **[MEDIUM] Bid Form formulas hardcode column letters** (D/E/F/G/I) decoupled from `BID_FORM_COLUMNS`; reordering columns silently breaks every formula. (create-proposal-workbook.ts:215-220)
- **[LOW] Single vs tabbed builders are duplicated** (two Summary builders, two Source Breakdown builders, two column arrays) — any column change must be made twice or the variants diverge.
- **[MEDIUM] Group-node rows are silently dropped.** Only `kind==="area"` rows export; rows on group nodes produce a `non_area_rows_skipped` warning that the download path discards.
- **[LOW] `legacy-main` magic string** lives in two client files + AI context, not centralized.

---

## 8. Test coverage (strong on current behavior, blind to the gaps)

7 proposal-export test files cover model math, workbook shape (incl. multi-tab, frozen panes, cross-sheet formulas, the TAB column), route happy/404/413 paths, real round-trip XLSX, preview rendering + href flip, and worksheet-name rules. **Gaps:** no test exercises non-default settings, `includeFormulas=false`, excluded-row filtering, the >11-section Summary overflow, or the preview≠download divergence — because the code doesn't implement those, the tests assert the *current* (partly hollow) behavior and will not catch the fixes regressing.

---

## 9. Bottom line

The export is **architecturally sound and safe to *run***, but it **over-promises in three client-visible ways** (no real labor split, no VAT/contingency, a preview that doesn't match the file) and **carries a large surface of dead configuration**. The improvement work is mostly *finishing wired-but-hollow features* and *reconciling preview with file* — not rebuilding.

> **Beta-gate clarification** (reconciled in the second pass): "safe to run" ≠ "client-presentable." A file generated today is **not** ready to hand to a client — the Grand Total understates the bid (no VAT), the bidder line reads `"Archestimator beta workbook"`, and internal data ships under a "client" label. **Narrow/internal beta** is fine now; **broad/client-facing beta** should wait for [08](08_implementation-plan.md) **Phase 1** (which now includes the presentability fix P1-T9). The plan defines the gate precisely.

See [02](02_boq-format-benchmark.md) and [09](09_target-format-spec.md) for the format target, [07](07_findings-register.md) for the consolidated issue list, and [08](08_implementation-plan.md) for the phased plan.
