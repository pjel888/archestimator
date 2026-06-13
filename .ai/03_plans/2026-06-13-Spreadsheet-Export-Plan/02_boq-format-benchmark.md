# 02 — Industry BOQ Format Benchmark & Gap Analysis

> **What this is:** the canonical comparison of Archestimator's XLSX output against **10 real industry Bill-of-Quantities / bid-form spreadsheets** the user supplied. It defines the **format target** the export should comply with.
> **Reference set:** `~/Library/Mobile Documents/com~apple~CloudDocs/Project BOQs` — 10 `.xlsx` files parsed (100%) with ExcelJS; ~17 `.pdf` renderings skimmed for structure only.
> **Full per-file extraction:** [`_research/02a-boq-reference-extraction.md`](_research/02a-boq-reference-extraction.md) · raw dump [`_research/02a-boq-raw-dump.txt`](_research/02a-boq-raw-dump.txt) (1,749 lines) · detailed gap table [`_research/02b-boq-format-gap.md`](_research/02b-boq-format-gap.md).
> All currency is Philippine Peso (₱/PHP). Inferences are tagged **INFERENCE**.

---

## 1. The reference set

| File | Sheets | Archetype | Most instructive for |
|---|---|---|---|
| `20-233D-RECIO FIT-OUT WORKS 5142021` | 6 (SUMMARY + GEN PRELIMS/SITE/ARCH/MEPF/JOINERY) | Abstract + per-division | Canonical multi-sheet model; MATERIAL/LABOR split; per-sheet Contingency+VAT block |
| `2022-06-09 BANSON BOQ_Rev-3` | 19 (SUM-A + A…N divisions + OPTIONS + QTYS) | Abstract + per-division | Richest: split costs, weighted %, embedded instructions + legend, value-engineering, provisional sums |
| `2020-02-26 AYALA FHL BID-TABULATIONS` | 6 | Multi-bidder tabulation | Split material/labor *and* amount; canonical add-on stack; tabulator notes |
| `BCMS - RR_RDL_BOQ` | 2 (FRONT PAGE + RFQ) | Front/summary + detail | Clean abstract; Grand Total **in words**; exclusions; signature block |
| `RGSP - boq_reciobroofdeck` | 2 (RDL-BID FORM + Sheet5) | Front/summary + detail | Cost/SQM + GFA; Line 1–7 totals block; amount in words |
| `CONMECH …E-FILE` | 1 | Single combined | Cost/SQM + GFA + duration; labor often `INCLUDED` |
| `6x6 …RECIO ROOFDECK` | 1 | Issued template | General Notes panel; MATERIAL/LABOR/COST TOTAL/LINE TOTAL schema |
| `RSC - 21-058-RECIO ROOF DECK` | 1 | Letter-style | Exclusions; terms/validity/warranty; conforme |
| `20-233D…ROOFDECK 051521` | 2 (RDL-ARCH + RDL-ENGG) | Per-discipline detail | `COST TOTAL`/`LINE TOTAL` naming = ours; mini-abstract per sheet |
| `022420 AYALA FHL - FILLED BID FORM` | 1 | Single combined (degraded import) | I/A/1 numbering; Contingency+12% VAT; enumerated exclusions; duration |

**Three sheet archetypes:** (1) single combined sheet [4/10]; (2) front/summary + 1–2 detail sheets [3/10]; (3) abstract + one sheet per trade/division [2/10]; plus the multi-bidder tabulation [1]. A **dedicated Summary/Abstract sheet appears in 5/10** and is the formal/issued style. **A "General Preliminaries / General Requirements" division is the first section in 10/10.**

---

## 2. The canonical column schema (7–8/10 files agree)

The reusable issued template (authored across the RSC/6x6/BCMS/RGSP family and the BANSON/RSC detail sheets) shares this exact shape:

| # | Header | Sub-header | Meaning | Formula |
|---|---|---|---|---|
| 1 | ITEM / ITEM NO. | — | hierarchical ref (`A` / `1` / `1.1` / `D-1` / `1.01`) | text |
| 2 | PARTICULARS / DESCRIPTION | — | item description | text |
| 3 | UNIT | — | uom (lot, m², lm, set, m³, sqm, mo.) | text |
| 4 | QTY | — | quantity | number |
| 5 | **UNIT COST** | **MATERIAL** | material unit rate | number / `OFCI` / `-` |
| 6 | **UNIT COST** | **LABOR** | labor unit rate | number / `INCLUDED` / `-` |
| 7 | COST TOTAL / AMOUNT | — | **combined unit rate** = MATERIAL+LABOR | `=SUM(mat,lab)` |
| 8 | LINE TOTAL / TOTALS / COST AMOUNT | — | **extended amount** = unit rate × QTY | `=qty*rate` |
| (+) | NOTES / REMARKS | — | specs, scope, supplier | text |

**Archestimator's `COST TOTAL` (=MAT+LAB unit) and `LINE TOTAL` (=qty×rate) match this exactly in name and meaning.** The structure is already right — the problem is the data filling it.

**Other conventions (with exhibiting-file counts):** per-section subtotal rows (10/10) · add-on stack Sub-Total→Contingency→VAT 12%→Grand Total (8/10) · scope keyword in the amount column (10/10) · Cost per SQM + GFA (≥4/10) · estimated construction duration (4/10) · signature/conforme block (5/10) · enumerated EXCLUSIONS (4/10) · General Notes/BOQ instructions (4/10) · Grand Total **in words** (2/10) · contractor letterhead/logo (≥4/10) · peso accounting number format (10/10) · frozen header + landscape fit-to-width (formal templates).

**Scope vocabulary seen in the amount/total column:** `INCLUDED` · `NOT INCLUDED` · `EXCLUDED` · `OMITTED` · `BY OTHERS` · `BY OWNER` · `BY CLIENT` · `BY GENCON` · `OFCI` · `OSCI`/`OSM` · `NOT IN PLAN` / `ITEM NOT NEEDED` · `N/A` · `PENDING` · `See: <section>` / `SEE ITEM n`.

---

## 3. Gap table — industry norm vs. Archestimator today

| # | Convention | Industry norm | Archestimator today | Severity |
|---|---|---|---|---|
| G1 | **Material/Labor split** | Both columns carry real unit rates; LINE TOTAL = (mat+lab)×qty | Columns exist; **LABOR always 0**; all cost dumped into MATERIAL (`build-…:89`) | **CRITICAL** |
| G2 | **Add-on stack: Contingency → VAT 12% → Grand Total** | Explicit computed lines; Grand Total includes them | `Contingency 0`, `VAT 0` hardcoded; **Grand Total == Direct Cost** (`create-…:303-307`) | **CRITICAL** |
| G3 | **Title block completeness** | Project·Location·Owner·Bidder·Architect·Date·Ref·Subject·Revision·Area | Owner blank; **Bidder = "Archestimator beta workbook"**; no Architect/Ref/Subject/Area (`projectCode` exists in types, unused) | **HIGH** |
| G4 | **Hierarchical item numbering** | `A` / `1` / `1.1` / `D-1` / `1.01` | Flat global `1..N` | **HIGH** |
| G5 | **Cost per SQM + GFA** | `Grand Total / GFA`, GFA shown | `Cost per sqm = "N/A"`; no GFA field | **HIGH** |
| G6 | **Real scope status** | INCLUDED/EXCLUDED/BY OTHERS/OFCI/BY OWNER/NOT IN PLAN/… | SCOPE column + formula exist but model **always sets "included"** | **HIGH** |
| G7 | **Section order: Preliminaries first** | General Preliminaries/Requirements is §1 | Sections ordered by data-encounter; no guarantee | **MEDIUM** |
| G8 | **Grand Total amount in words** | Spelled-out peso amount | Absent | **MEDIUM** |
| G9 | **Enumerated EXCLUSIONS block** | Numbered list grouped by division | One-line "Exclusions" qualifier only | **MEDIUM** |
| G10 | **Estimated construction duration** | Calendar/working days line | "To be confirmed" | **MEDIUM** |
| G11 | **Contractor branding** (logo/address/contact) | Letterhead band | Generic Archestimator metadata | **MEDIUM** |
| G12 | **Dedicated Summary sheet** | Rolls up division subtotals by formula | **Present** ✓ | **OK** (add `RUNNING TOTAL` to match BCMS/RGSP) |
| G13 | **One sheet per trade/division** | Large jobs split sheets | Per **estimate tab** (reasonable analog) ✓ | **OK / MEDIUM** (optional "split by division") |
| G14 | **General Notes / scope legend** | Don't-leave-blank, scope legend | **Present** ✓ | **OK** (add "don't insert rows") |
| G15 | **Signature / Conforme** | Prepared/Checked/Noted by + role + company | Prepared by / Accepted by ✓ | **LOW** (add Checked/Noted + company) |
| G16 | **Peso accounting number format** | `_(* #,##0.00…` / `[$₱-3409]` | `₱ #,##0.00;[Red]…` (leading-symbol) | **LOW** (switch to accounting alignment) |
| G17 | **Weighted % per division** | % of grand total (BANSON) | Absent | **LOW** |
| G18 | **Value engineering / provisional sums** | Options matrix (BANSON) | Absent | **LOW** (out of scope first pass) |
| G19 | **Multi-bidder tabulation** | One MAT/LAB/COST triplet per bidder (AYALA) | Absent (single-bidder) | **LOW** (different use case) |

---

## 4. Prioritized format recommendations

**Tier 1 — credibility blockers (the file is misleading without these)**
1. **G2 — Add real VAT (12%) and Contingency lines** to the totals block; make Grand Total include them. Today Grand Total == Direct Cost, understating every bid vs. all 10 references. Drive `% VAT` / `% contingency` from settings; allow an `INCLUDED` mode like the references.
2. **G1 — Split Material vs Labor for real.** The column shape is correct; the blocker is upstream data (estimate rows carry a single `itemCost`). Until source data supplies a labor rate (or a material:labor ratio), keep the "material-only" disclaimer *visible* (cell comment + NOTES), not just a hidden validation info.
3. **G3 — Finish the title block:** populate Owner/Client, replace the beta-placeholder bidder with real contractor identity, add Architect, Project Ref/Code (`projectCode`), Subject/RE, and Area/GFA.

**Tier 2 — clearly below norm**
4. **G4 — Hierarchical numbering** (`A` / `1` / `1.1`), restart per section.
5. **G5 — Cost per SQM** from a captured Gross Floor Area.
6. **G6 — Real scope status** into the SCOPE column; expand recognized vocabulary + legend.
7. **G7 — Canonical division order, Preliminaries first.**

**Tier 3 — formal-bid polish**
8. G8 Grand Total in words · 9. G9 enumerated EXCLUSIONS block · 10. G10 construction duration · 11. G11 contractor branding header.

**Tier 4 — optional / analyst**
12. G16 accounting-aligned peso format · `RUNNING TOTAL` column · G17 weighted % per division · G15 Checked/Noted-by roles · "don't insert rows" note.

---

## 5. Open product questions (block true 100% — see [00 index](00_INDEX.md) decision log)

1. **Labor data source** — can the estimate add a labor unit cost (or material:labor ratio) per row? Without it, G1 cannot be satisfied honestly.
2. **VAT/contingency policy** — VAT 12% default? Contingency configurable (10% common; BANSON used 5%)? Allow `INCLUDED`? Set where — exporter settings, project, or per-estimate?
3. **Gross Floor Area** — captured anywhere today? (Not in `ProposalExportMetadata`.) Needed for Cost/SQM.
4. **Contractor identity** — where does the real bidder/contractor profile (name, address, logo, signatories) live to replace the placeholder?
5. **Division taxonomy** — map free-text `category`/`discipline` onto a canonical, ordered division list?
6. **Scope semantics** — is scope a source-row field, or set at proposal-edit time?
7. **Currency generality** — references are 100% PHP; should non-PHP exports swap symbol/format, or is PHP the only supported case for now?
8. **Sheet-split strategy** — keep "one sheet per tab" as the per-trade analog, or also offer "split by division"?

> Recommended defaults for these (so the plan can proceed) are captured in [08_implementation-plan.md](08_implementation-plan.md) §"Decision gate."
