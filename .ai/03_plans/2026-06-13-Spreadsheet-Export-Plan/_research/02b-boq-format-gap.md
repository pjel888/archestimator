# 02b — BOQ Format-Gap Analysis (Archestimator export vs. industry references)

**Date:** 2026-06-13
**Inputs:** 10 industry `.xlsx` BOQs (see `02a-boq-reference-extraction.md`) vs. Archestimator's exporter
(`src/lib/proposal-export/create-proposal-workbook.ts`, `build-proposal-export-model.ts`, `types.ts`).
**Severity tags:** `[CRITICAL]` blocks credibility/correctness · `[HIGH]` clearly below industry norm · `[MEDIUM]` noticeable polish/UX gap · `[LOW]` nice-to-have · `[OK]` already compliant.

> Inferences are tagged **INFERENCE**. Everything else is grounded in the parsed files or the source code read this session.

---

## 1. Industry conventions synthesized (with exhibiting files)

| # | Convention | Files exhibiting it |
|---|-----------|---------------------|
| C1 | First division is always **General Preliminaries / General Requirements** | all 10 |
| C2 | Detail column order **ITEM · PARTICULARS · UNIT · QTY · MATERIAL(unit) · LABOR(unit) · combined-unit-rate · extended-amount · NOTES** | 6x6, BCMS, RGSP, RSC-roofdeck, RSC-20-233D, BANSON, CONMECH (7–8/10) |
| C3 | **MATERIAL & LABOR split as separate unit-rate columns** (both populated with real numbers) | RSC-20-233D, BANSON, AYALA `old BOQ`, AYALA tabulation; partially CONMECH (labor=INCLUDED) — 4–5/10 with real labor values |
| C4 | Hierarchical numbering **A / 1 / 1.1 / D-1 / 1.01** | all 10 |
| C5 | **Per-section subtotal rows** | all 10 |
| C6 | **Add-on stack: (Sub)Total → Contingency → VAT 12% → Grand Total** | AYALA-FILLED, AYALA-tab, 6x6/BCMS/RGSP/RSC/CONMECH template, BANSON |
| C7 | **Cost per SQM + Gross Floor Area** in the totals block | RGSP, CONMECH, RSC-roofdeck (₱/sqm format), RGSP Sheet5, BANSON (sqm format) |
| C8 | **Estimated Construction Duration** (calendar/working days) | AYALA-FILLED, AYALA-tab, RGSP, CONMECH |
| C9 | **Dedicated Summary/Abstract sheet** pulling division subtotals by formula | BCMS, RGSP, RSC-20-233D, BANSON, AYALA-tab (5/10) |
| C10 | **One sheet per trade/division** for large jobs | RSC-20-233D (6), BANSON (19) |
| C11 | **Scope keyword in the amount column** (INCLUDED/EXCLUDED/BY OTHERS/OFCI/BY OWNER/NOT IN PLAN/N/A…) | all 10 |
| C12 | **Title block: Project · Location · Owner/Client · Bidder/Contractor · Architect · Date · Ref/Code · Subject/RE · Revision · Area** | all 10 (subset varies) |
| C13 | **Contractor letterhead / logo / address / contact** (branding) | RSC-20-233D, RSC-roofdeck, BANSON (`(CONTRACTOR LOGO)`), BCMS/RGSP front pages |
| C14 | **Grand Total Amount in Words** | BCMS, RGSP |
| C15 | **Enumerated EXCLUSIONS section** | AYALA-FILLED, BCMS, RGSP, RSC |
| C16 | **Signature / Conforme block** (Prepared/Checked/Noted by + role + company) | BCMS, RGSP, CONMECH, RSC, RSC-20-233D |
| C17 | **General Notes / BOQ Instructions** (don't-leave-blank, scope legend, don't-insert-rows) | 6x6, BCMS, RGSP, BANSON |
| C18 | **Terms / validity / warranty / payment** notes | RSC, AYALA-FILLED |
| C19 | **Peso accounting number format** (`_(* #,##0.00…`, `[$₱-3409]`) | all 10 |
| C20 | **Weighted % of total per division** | BANSON |
| C21 | **Value-engineering / Options / Provisional sums matrix** | BANSON, AYALA-tab (bidder options) |
| C22 | **Multi-bidder tabulation** (MATERIAL/LABOR/COST triplet per bidder) | AYALA-tab |
| C23 | Header rows frozen; landscape + fit-to-width on detail | BANSON, BCMS, RGSP, RSC family |

---

## 2. Archestimator's current format (as built)

- **Sheets:** `Bid Form` → `Summary` → `Commercial Terms` → (optional) `Source Breakdown`. Tabbed variant: `Summary` first, then one `Bid Form`-style sheet per estimate tab, then `Commercial Terms` + `Source Breakdown`.
- **Bid Form columns:** `ITEM · PARTICULARS · UNIT · QTY · MATERIAL · LABOR · COST TOTAL · LINE TOTAL · SCOPE · NOTES / REMARKS`.
  - `COST TOTAL = MATERIAL+LABOR` (unit rate); `LINE TOTAL = IF(scope is excluded,0, QTY×COST TOTAL + contingency + misc)`. **Semantics match C2 exactly.**
  - **`LABOR` is hard-coded to `0`** (`build-proposal-export-model.ts:89` `const laborUnitCost = 0;`); existing item cost is exported entirely as MATERIAL. An info-level validation issue is emitted (`cost_split_compatibility_mode`).
- **Section grouping:** one merged section header row per `sectionLabel` (from row `category`/`discipline`), then a `… subtotal` row `=SUM(H..:H..)`. Matches C5.
- **Numbering:** flat global `1,2,3…` (`renumberProposalRows`), reset per — actually single global sequence across all sections. No A/1.1 hierarchy.
- **SCOPE column:** dedicated column; `scopeStatus` is **always `"included"`** in the model today (excluded/alternate exist in types but normalizeSourceRow hardcodes included). The Bid Form formula already understands EXCLUDED/BY OTHERS/OWNER SUPPLIED/OSM/OFCI/OSCI/OMITTED/NOT APPLICABLE if those values were present.
- **Summary sheet:** `SECTION · ROWS · AMOUNT`; cross-sheet formula to each subtotal; then `Direct Cost · Contingency(0) · VAT(0) · Grand Total · Cost per sqm(=N/A) · Estimated duration(=To be confirmed)`.
- **Commercial Terms sheet:** Exclusions / Qualifications / Payment / Validity / Warranty boilerplate + Signature/Conforme (`Prepared by` / `Accepted by`).
- **Title block (Bid Form):** Project · Location · Owner/Client(blank) · `Bidder / Contractor: "Archestimator beta workbook"` · Estimate/Revision · Date Submitted. General Notes panel (5 notes incl. scope-label legend).
- **Formatting:** PHP format `₱ #,##0.00;[Red]-₱ #,##0.00`; qty `#,##0.####`; dark header fill; landscape fit-to-width; frozen header (`ySplit:17`); print titles. Workbook metadata creator/company = "Archestimator".

---

## 3. Side-by-side gap table

| Convention | Industry norm | Archestimator today | Severity | Recommendation |
|-----------|---------------|---------------------|----------|----------------|
| **Material/Labor split (C3)** | Both columns carry real unit rates; LINE TOTAL = (mat+lab)×qty | LABOR column exists but **always 0**; all cost dumped into MATERIAL | **[CRITICAL]** | The column shape is already correct. Blocker is upstream data: estimate rows have a single `itemCost`. Add a labor unit-cost field to source data (or a material/labor split %), then populate `laborUnitCost`. Until then the export looks structurally right but is semantically a material-only quote — call this out in NOTES (already done via validation issue) and ideally in a cell comment. |
| **Add-on stack: Contingency → VAT 12% → Grand Total (C6)** | Contingency (10%, sometimes INCLUDED) and **12% VAT** are explicit, computed lines; Grand Total includes them | Summary shows `Contingency 0` and `VAT 0` hardcoded; Grand Total == Direct Cost. Per-row `contingencySubtotal`/`misc` are folded into LINE TOTAL but **no project-level 12% VAT and no overall contingency** | **[CRITICAL]** | Add real total-block rows: Direct Cost → Contingency (configurable %, default surfaced) → **VAT 12%** (`=(Direct+Cont)*0.12`) → Grand Total (`=SUM`). Make the % inputs settings on `ProposalExportSettings`. Omitting VAT understates the bid vs. every reference. |
| **Hierarchical item numbering (C4)** | `A / 1 / 1.1 / D-1 / 1.01` | Flat global `1..N` | **[HIGH]** | Emit a division letter/number per section and `n.m` sub-numbering within sections (e.g. `A`, then `1`, `1.1`). At minimum restart line numbers per section and prefix the section letter. |
| **Dedicated division Summary/Abstract sheet (C9)** | Summary sheet rolls up division subtotals by formula; formal style | **Present** (`Summary` sheet) | **[OK]** | Keep. Consider adding a `RUNNING TOTAL` column to mirror BCMS/RGSP. |
| **One sheet per trade/division (C10)** | Large jobs use per-division sheets | Tabbed-workbook variant gives one sheet **per estimate tab** (not per trade) | **[MEDIUM]** | Acceptable analog. INFERENCE: per-trade sheets only matter when an estimate is trade-organized; current per-tab split is a reasonable equivalent. Optionally offer "split sheets by section/division". |
| **Cost per SQM + Gross Floor Area (C7)** | `Cost per SQM = Grand Total / GFA`, GFA shown | `Cost per sqm = "N/A"`, no GFA field | **[HIGH]** | Capture project gross floor area (metadata) and compute `Grand Total / GFA`. This is a headline number clients expect. |
| **Estimated Construction Duration (C8)** | Calendar/working days line | `Estimated duration = "To be confirmed"` | **[MEDIUM]** | Add an optional duration metadata field; render days. Keep "TBC" fallback. |
| **Scope keyword column (C11)** | INCLUDED/EXCLUDED/BY OTHERS/OFCI/BY OWNER/NOT IN PLAN/N/A in amount or scope col | SCOPE column exists + formula honors the keywords, but model **always sets `included`** | **[HIGH]** | Wire real scope status from source rows into `scopeStatus` (the export plumbing already supports it). Add `BY OWNER`/`BY CLIENT`/`BY GENCON`/`PENDING`/`NOT IN PLAN` to the recognized vocabulary and the General Notes legend. |
| **Grand Total Amount in Words (C14)** | Spelled-out peso amount under Grand Total | Absent | **[MEDIUM]** | Add a peso-to-words line beneath Grand Total on the Summary (and front page if added). Common in formal/issued bids. |
| **Enumerated EXCLUSIONS section (C15)** | Numbered list of exclusions | `Commercial Terms` has a one-line "Exclusions" qualifier, not an enumerated list | **[MEDIUM]** | Render excluded rows (once scope wiring lands) as an enumerated EXCLUSIONS block, grouped by division, like BCMS/RSC. |
| **Signature / Conforme block (C16)** | Prepared by / Checked by / Noted by + role + company | `Prepared by` / `Accepted by` on Commercial Terms | **[LOW]** | Adequate. Optionally add `Checked by` / `Noted by` roles and company line to match QS-firm convention. |
| **General Notes / BOQ Instructions (C17)** | Don't-leave-blank, scope legend, don't-insert-rows | **Present** (5-note General Notes incl. scope legend) | **[OK]** | Strong. Add "do not insert rows between items" note (formula-safety) seen in 6x6/RGSP. |
| **Title block completeness (C12)** | Project·Location·Owner·Bidder·Architect·Date·Ref·Subject·Revision·Area | Has Project·Location·Owner(blank)·Bidder(placeholder)·Estimate/Revision·Date | **[HIGH]** | Populate Owner/Client from project, replace `"Archestimator beta workbook"` bidder placeholder with real contractor identity, and add **Architect**, **Project Ref/Code** (`projectCode` exists in types but unused), **Subject/RE**, and **Area/GFA**. The placeholder bidder string will read as unfinished to clients. |
| **Contractor branding / logo / letterhead (C13)** | Letterhead, logo, address, contact | None (generic Archestimator metadata) | **[MEDIUM]** | Add optional contractor profile (name, address, phone, email, logo image) to the header band. |
| **Peso accounting format (C19)** | `_(* #,##0.00…` / `[$₱-3409]` | `₱ #,##0.00;[Red]-₱…` (leading-symbol, not accounting-aligned) | **[LOW]** | Functional and clearly peso. Optionally switch to accounting alignment `_(₱* #,##0.00_)…` so decimals/symbols column-align like the references. |
| **Weighted % per division (C20)** | % of grand total per division (BANSON) | Absent | **[LOW]** | Optional Summary column `% OF TOTAL = AMOUNT/GrandTotal`. Cheap, adds analyst value. |
| **Value engineering / Provisional sums (C21)** | Options matrix, provisional sums (BANSON) | Absent | **[LOW]** | Out of scope for a first pass; revisit if VE workflows are productized. |
| **Multi-bidder tabulation (C22)** | One MATERIAL/LABOR/COST triplet per bidder (AYALA) | Absent (single-bidder export) | **[LOW]** | Different use case (owner-side evaluation). Not needed for a contractor-side bid export. |
| **Section ordering: Preliminaries first (C1)** | General Preliminaries/Requirements is section 1 | Sections ordered by data encounter; no guaranteed Preliminaries-first | **[MEDIUM]** | Add a canonical division sort order (Preliminaries/General Requirements → Site/Earth → Civil → Architectural → Finishes → Glass → Doors → Joinery → MEP → FFE → Misc) so output reads like an industry BOQ. |
| **Frozen header + print setup (C23)** | Frozen header, landscape, fit-to-width | **Present** | **[OK]** | Keep. |

---

## 4. Prioritized format recommendations

**Tier 1 — credibility blockers (do first)**
1. `[CRITICAL]` **Add a real VAT (12%) and Contingency line to the totals block** and make Grand Total include them. Today Grand Total == Direct Cost, which understates every bid vs. all references. Wire `% VAT` / `% contingency` through `ProposalExportSettings`.
2. `[CRITICAL]` **Split Material vs Labor for real.** The column shape is already correct; the data layer must supply a labor unit cost (or material/labor ratio). Until source data supports it, keep the explicit "material-only" disclaimer visible (cell comment + NOTES), not just a hidden validation info.
3. `[HIGH]` **Finish the title block:** populate Owner/Client, replace the `"Archestimator beta workbook"` bidder placeholder, add Architect, Project Ref/Code (`projectCode`), Subject/RE, Area/GFA.

**Tier 2 — clear below-norm**
4. `[HIGH]` **Hierarchical numbering** (`A` / `1` / `1.1`), restart per section.
5. `[HIGH]` **Cost per SQM** computed from a captured Gross Floor Area.
6. `[HIGH]` **Real scope status** flowing into the SCOPE column (excluded/by-others/by-owner/OFCI/pending), and expand recognized vocabulary + legend.
7. `[MEDIUM]` **Canonical division order, Preliminaries first.**

**Tier 3 — formal-bid polish**
8. `[MEDIUM]` Grand Total **amount in words**.
9. `[MEDIUM]` Enumerated **EXCLUSIONS** block (grouped by division).
10. `[MEDIUM]` **Estimated Construction Duration** field.
11. `[MEDIUM]` Optional **contractor branding** (logo/address/contact) header.

**Tier 4 — optional / analyst**
12. `[LOW]` Accounting-aligned peso format; `RUNNING TOTAL` column; weighted **% of total** per division; `Checked by`/`Noted by` signature roles; "don't insert rows" note.

---

## 5. Open questions

1. **Material/Labor data source:** Does the estimate domain have, or can it add, a labor unit-cost (or material:labor ratio) per row? Without it, C3 cannot be satisfied honestly. (Confirmed in code: `laborUnitCost = 0` hardcoded.)
2. **VAT/contingency policy:** Should VAT default to 12% and contingency to a configurable % (10% is most common; BANSON used 5%), and should either be expressible as `INCLUDED` like the references? Who sets these — exporter settings, project settings, or per-estimate?
3. **Gross Floor Area:** Is GFA captured anywhere today? (Not in `ProposalExportMetadata`.) Needed for Cost per SQM.
4. **Contractor identity:** Where does the real bidder/contractor profile (name, address, logo, signatories) live, to replace the placeholder?
5. **Division taxonomy:** Should we map free-text `category`/`discipline` onto a canonical division list (and order) to guarantee Preliminaries-first, industry-recognizable sectioning?
6. **Scope semantics:** `normalizeSourceRow` hardcodes `included`. Is there a source-row field for scope/exclusion to plumb through, or is scope set at proposal-edit time?
7. **Currency generality:** Metadata allows non-PHP currency; the references are 100% PHP. Should non-PHP exports swap the symbol/format, or is PHP the only supported case for now?
8. **Sheet split strategy:** Is "one sheet per tab" the intended analog to per-trade sheets, or should we offer "split by division/section" for trade-organized estimates?
