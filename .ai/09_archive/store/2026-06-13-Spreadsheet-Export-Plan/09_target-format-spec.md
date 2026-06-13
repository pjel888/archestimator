# 09 — Target Format Spec (cell/formula-level)

> **What this is:** the **cell- and formula-level TARGET** the P2 format tasks build to, so no subagent re-derives BOQ geometry from prose. It pins every column, header, number format, formula template, and totals-cell position for the *desired* output and shows **CURRENT vs TARGET** wherever they differ. The "industry-standard" side is taken verbatim from the 10 real reference BOQs in [`_research/02a-boq-reference-extraction.md`](_research/02a-boq-reference-extraction.md); reference formulas here are **quoted from 02a, not invented**.
> **Companion docs:** [02_boq-format-benchmark.md](02_boq-format-benchmark.md) (the gap analysis + format target), [07_findings-register.md](07_findings-register.md) (finding IDs), [08_implementation-plan.md](08_implementation-plan.md) (P2 tasks + decision gate).
> **Current-state file refs** are cited as `create-…:NN` for `src/lib/proposal-export/create-proposal-workbook.ts`, `build-…:NN` for `src/lib/proposal-export/build-proposal-export-model.ts`, `types-…:NN` for `src/lib/proposal-export/types.ts`, `route-…:NN` for the export route.
> All currency is Philippine Peso (₱/PHP). **Cell positions in this doc assume the *unified, dynamic* builder** (P1-T6 / F-16 merges the single-tab path onto the tabbed dynamic-start path) — do **not** hardcode the legacy `A27–B32` block.

---

## 0. Sheet inventory and where geometry is anchored

| Sheet | Builder fn (current) | Header row | Frozen split | TARGET changes here | Maps to |
|---|---|---|---|---|---|
| **Bid Form** (×N tabs) | `createBidFormWorksheet` (`create-…:179`) | `DETAIL_HEADER_ROW = 17` (`create-…:15`) | `ySplit: 17` (`create-…:181`) | MATERIAL/LABOR real split; 2-row merged sub-header; hierarchical item numbers; accounting numFmt; title-block completion | P2-T1/T4/T5; P3-T1 |
| **Summary** | `createSummaryWorksheet` (`create-…:270`, single) + `populateTabbedSummaryWorksheet` (`create-…:355`, tabbed) | `SUMMARY_HEADER_ROW = 14` (`create-…:16`) | `ySplit: 14` | Unify on dynamic `totalsStartRow`; real Contingency/VAT/Grand Total; Cost per SQM; Duration | P2-T1/T6; P1-T6 |
| **Commercial Terms** | `createCommercialTermsWorksheet` (`create-…:324`) | n/a (label/value, 2 cols) | `ySplit: 1` | Contractor identity in signature block; audience-gated | P2-T4 |
| **Source Breakdown** | `createSourceBreakdownWorksheet` (`create-…:425`) + `…WithTab` (`create-…:462`) | header row 6 (single) / 6 (tabbed) | `ySplit: 6` | **Dropped entirely** for `audience=client`; source IDs redacted | P2-T3 |

> The current code has **two** Summary builders and **two** Source Breakdown builders with **two** column arrays (`BREAKDOWN_COLUMNS` / `BREAKDOWN_COLUMNS_WITH_TAB`, `create-…:37,54`). P2-T8 (F-32) unifies them; this spec describes the **unified** target so the merge has one geometry to satisfy.

---

## 1. Per-sheet column tables (CURRENT vs TARGET)

### 1a. Bid Form — `BID_FORM_COLUMNS` (`create-…:18-29`)

Column letters are fixed by array order today and the formulas hardcode them (`create-…:215-220`, F-21). TARGET keeps the **same 10 columns in the same order** (so the formula refs D/E/F/G/H/I survive) but adds a **2-row merged sub-header** band (`UNIT COST → MATERIAL | LABOR`) like 7/10 reference files (02a §"Canonical column schema").

| Col | Header (top) | Sub-header (TARGET) | Meaning | numFmt (TARGET) | Formula template (TARGET) | CURRENT vs TARGET |
|---|---|---|---|---|---|---|
| **A** | ITEM | — | hierarchical ref `A` / `1` / `1.1` / `D-1` | `@` (text) | text (see §3) | **CHANGED**: flat `1..N` → hierarchical (`renumberProposalRows`, P2-T5) |
| **B** | PARTICULARS | — | `material — description` | `@` | text (CSV-defanged, P1-T7) | same shape |
| **C** | UNIT | — | uom (sqm, lot, lm, set…) | `@` | text | same |
| **D** | QTY | — | quantity | `#,##0.####` (`QUANTITY_FORMAT`, `create-…:14`) | number | same |
| **E** | UNIT COST | **MATERIAL** | material unit rate | accounting peso (§5) | number / `OFCI` / `-` | **CHANGED**: numFmt → accounting; data still material-heavy until P3-T1 |
| **F** | UNIT COST | **LABOR** | labor unit rate | accounting peso (§5) | number / `INCLUDED` / `-` | **CHANGED**: today **always `0`** (`build-…:89`); real split is P3-T1/D1. Until then keep `0` + **visible** material-only disclaimer (cell comment + NOTES) |
| **G** | COST TOTAL | — | combined **unit rate** = MATERIAL+LABOR | accounting peso | `=E{r}+F{r}` (matches 02a `COST TOTAL = =SUM(mat,lab)`) | numFmt only; formula unchanged (`create-…:235`) |
| **H** | LINE TOTAL | — | **extended amount** = qty × unit rate (± row adjustments, scope-gated) | accounting peso | scope-gated `IF(...)` — see below | numFmt only; formula logic unchanged (`create-…:220`) |
| **I** | SCOPE | — | scope keyword | `@` | text from `scopeLabel()` (`create-…:118`) | **data CHANGED**: today always `INCLUDED` (`build-…:96`); real scope is P3-T2/D5 |
| **J** | NOTES / REMARKS | — | specs, scope, supplier, pricing | `@` | text (audience-gated §6, CSV-defanged) | **data CHANGED**: client audience redacts supplier/pricing/confidence (P2-T3) |

**H (LINE TOTAL) formula — keep current shape, it already matches 02a (`LINE TOTAL = qty × unit rate`):**
```
IF(OR(I{r}="EXCLUDED",I{r}="BY OTHERS",I{r}="OWNER SUPPLIED",I{r}="OSM",I{r}="OFCI",I{r}="OSCI",I{r}="OMITTED",I{r}="NOT APPLICABLE"),0,D{r}*G{r}{contingencySuffix}{miscSuffix})
```
where `{contingencySuffix}` / `{miscSuffix}` come from `formulaAmountSuffix()` (`create-…:113`), e.g. `+200+100`. `{r}` = the data row number. (Verbatim current logic at `create-…:220`; the test pins it at `proposal-workbook.test.ts:134`.)

**Section header rows** (merged A→J, grey fill `FFF3F4F6`) and **per-section subtotal rows** are already emitted (`create-…:208-211, 244-256`). Subtotal formula stays `=SUM(H{firstDetailRow}:H{lastDetailRow})` (`create-…:252`) — matches 02a `Subtotal <Section> =SUM(range)` (universal, 10/10).

> **F-21 guard (P2-T8):** the D/E/F/G/H/I letters above are derived from `BID_FORM_COLUMNS` order. If the array is reordered, the formula builder must re-derive letters from column keys; add a guard test. Do **not** treat the letters in this doc as immutable — treat the *column keys* as the source of truth.

### 1b. Summary — `SUMMARY_COLUMNS` (`create-…:31-35`)

| Col | Header | Meaning | numFmt | Formula template | CURRENT vs TARGET |
|---|---|---|---|---|---|
| **A** | SECTION | section / tab label | `@` | text | same |
| **B** | ROWS | row count in section | `#,##0` | number | same |
| **C** | AMOUNT | section subtotal | accounting peso (§5) | `='<BidSheet>'!H{subtotalRow}` via `quoteWorksheetCellReference` (`create-…:290`) | numFmt → accounting; cross-sheet ref unchanged. Reference style: 02a `B SITE WORKS ='SITE WORKS'!J38` |
| (+) | **RUNNING TOTAL** *(optional, P3-T4)* | cumulative | accounting peso | `=C{firstSummaryRow}` then `=PREV+C{r}` | **NEW (optional)**: BCMS/RGSP front pages use `PARTICULARS | LINE TOTAL | RUNNING TOTAL | NOTES` (02a §2/§7/§9). Defer to P3; not required for P2. |

Each tab/section is written as a header-band row (merged A→C, `create-…:369-372`) followed by section AMOUNT rows. The **totals block** below these rows is specified as a fixed cell map in §2.

### 1c. Commercial Terms (2 cols: label / value, `create-…:328`)

| Col | Content | CURRENT | TARGET |
|---|---|---|---|
| **A** | label (Exclusions, Qualifications, Payment Terms, Validity, Warranty) | static strings (`create-…:331-336`) | keep; audience-gated wording |
| **B** | value | "To be confirmed" placeholders | keep placeholders OR seed from settings (P2-T2) |
| **A13+** | Signature / Conforme block | `Prepared by:` / `Accepted by:` (`create-…:347-350`) | **CHANGED**: add real **contractor identity** (name/role/company) from the contractor profile (P2-T4/D4); add `Checked by` / `Noted by` rows (02a §"Signature block", 5/10 files). DB-gated — see §4. |

### 1d. Source Breakdown — `BREAKDOWN_COLUMNS` (`create-…:37-52`)

14 columns single (+`TAB` = 15 tabbed, `create-…:54-57`). Columns: PROPOSAL NO. · SOURCE ROW ID · AREA · AREA PATH · PARTICULARS · QTY · UNIT · MATERIAL UNIT COST · LABOR UNIT COST · MATERIAL SUBTOTAL · LABOR SUBTOTAL · CONTINGENCY / DISCOUNT · MISC / OTHER · COST AMOUNT.

| TARGET change | Detail | Maps to |
|---|---|---|
| **Sheet dropped for `audience=client`** | Do not call `createSourceBreakdown*` when audience is client; `includeSourceBreakdownSheet` is forced off | P2-T3 (F-19) |
| **SOURCE ROW ID redacted** if sheet kept for a redacted internal variant | blank or hashed; ties to §6 matrix | P2-T3 |
| numFmt → accounting peso on all money cols | §5 | P2-T8 |

> Today this sheet **ships supplier/pricing/source IDs to a `client` export unconditionally** (`includeSourceBreakdownSheet` default `true`, `build-…:28`; `audience` is inert, F-12/F-19). That is the leak P2-T3 closes.

---

## 2. Totals block — FIXED CELL MAP for the TARGET (dynamic-start)

**Problem being resolved:** the **single-tab** Summary writes the totals to **hardcoded `A27–B32`** (`create-…:299-311`) and pads with blank rows until row 26 — this **collides/corrupts once a single tab has more than ~11 sections** (F-16). The **tabbed** Summary already computes a dynamic start (`totalsStartRow = worksheet.rowCount + 2`, `create-…:395`). **TARGET: both paths use the dynamic-start approach.** P1-T6 unifies; P2-T1 fills in real Contingency/VAT/SQM/Duration.

### Dynamic positioning rule (authoritative)

```
lastSectionRow = worksheet.rowCount        // after the last AMOUNT row is written
totalsStartRow = lastSectionRow + 2        // one blank spacer row → never collides
```
This is exactly `create-…:395` for the tabbed path; the single-tab path must adopt it (delete the `while (rowCount < 26)` padding + `A27..B32` literals at `create-…:299-311`).

### Cell map (relative to `totalsStartRow = S`)

| Cell | Label (col A) | Value cell (col B) | numFmt | Formula template (TARGET) | CURRENT |
|---|---|---|---|---|---|
| `A{S}` / `B{S}` | **Direct Cost** | sum of section amounts | accounting peso | `=SUM(C{r1},C{r2},…)` over the AMOUNT cells (`amountRows`, `create-…:396`) | same formula; CURRENT label "Direct Cost" |
| `A{S+1}` / `B{S+1}` | **Contingency** | `% × Direct Cost` **or** literal `INCLUDED` | accounting peso (or `@` if INCLUDED) | `% mode:` `=B{S}*{contingencyRate}` · `INCLUDED mode:` text `INCLUDED`, B = `0` | **CHANGED**: today `{formula:"0",result:0}` (`create-…:401`) |
| `A{S+2}` / `B{S+2}` | **VAT 12%** | `12% × (Direct + Contingency)` **or** `INCLUDED` | accounting peso (or `@`) | `% mode:` `=(B{S}+B{S+1})*{vatRate}` (matches 02a `12% VAT =(Total+Cont)*0.12`) · `INCLUDED mode:` text, B = `0` | **CHANGED**: today `{formula:"0",result:0}` (`create-…:403`) |
| `A{S+3}` / `B{S+3}` | **Grand Total** | sum of the three | accounting peso, **bold 12pt** | `=B{S}+B{S+1}+B{S+2}` (already the current Grand Total formula, `create-…:405-407`) | formula shape unchanged; **values now non-zero** because Contingency/VAT are real |
| `A{S+4}` / `B{S+4}` | **Cost per SQM** | Grand Total ÷ GFA | accounting peso, OR text `N/A` | `GFA present:` `=B{S+3}/{gfaCell-or-literal}` (matches 02a `Cost per SQM =J377/J379`) · `else:` text `N/A` | **CHANGED**: today literal `"N/A"` (`create-…:409-410`) |
| `A{S+5}` / `B{S+5}` | **Total Gross Floor Area** *(optional, when GFA captured)* | GFA value | `#,##0.00 "sqm"` (02a custom fmt) | number | **NEW**: 02a totals stack has GFA as its own line (`Line 6 Total Gross Floor Area`) feeding Cost/SQM. If present, Cost/SQM references this cell, not a literal. |
| `A{S+6}` / `B{S+6}` | **Estimated duration** | working/calendar days | `##,#00 "calendar days"` (02a custom fmt) OR text | number or text `To be confirmed` | **CHANGED**: today literal `"To be confirmed"` (`create-…:411-412`) |

> **Reference add-on stack (02a §"Subtotals & totals", verbatim):** `TOTAL AMOUNT → Contingency (10%/INCLUDED/N/A) → VAT 12% (=(Total+Cont)*0.12) → GRAND TOTAL → Cost per SQM (=GrandTotal/GFA) → Total Gross Floor Area → Estimated Construction Duration`. The "Line 1…Line 7" labeling appears in 4 files (CONMECH/6x6/BCMS/RGSP). Default rates from the decision gate (08 D2): **VAT 12%, contingency 10%**, both with an `INCLUDED` mode.

> **Styling carry-over:** the totals rows get `numFmt = accounting peso` on col B and bold on the Grand Total row (current loop `create-…:414-419` iterates `[S, S+1, S+2, S+3]` — extend to style the new SQM/GFA/duration rows' labels too). `styleTotalRow` is applied to `B{S+3}` (`create-…:420`).

---

## 3. Hierarchical numbering algorithm (A / 1 / 1.1 / D-1)

**CURRENT:** flat global `1..N` — `renumberProposalRows` sets `rowNumber = String(index + 1)` across the whole proposal (`build-…:157-162`). This is F-09 / G4.

**TARGET (P2-T5):** division letter per section + per-section line numbers, **restarting at each section**, matching 02a §"Numbering scheme" (`I/A/1` and `A / 1 / 1.1 / D-1 / 1.01`, letters dominate 7/10).

### Algorithm

1. Sections are emitted in canonical order (P3-T3/D6 supplies the order; until then, encounter order). Assign each section a **division letter** `A, B, C, …` by section index (after 26: `AA`, `AB`, … — unlikely in practice).
2. Within a section, **line items restart at `1`** and increment: `1, 2, 3, …` (02a: "Detail rows under a group often restart at 1").
3. **Sub-items** under a parent line use dotted decimals `1.1, 1.2, …` (02a: `1.1`, `3.4`, `1.01`). Archestimator's consolidated rows are currently **flat within a section** (no parent/child), so the first pass emits **`<sectionLetter>` on the section header row and integer `n` on each line** — `1.1`-style sub-numbering is only emitted if/when row grouping exists.
4. **Sub-division codes** `D-1 … D-11` (letter-number) are the *floor/area-subdivision* convention (02a #2/#5). Archestimator's analog is the **area path** — if a future "split by division/area" mode lands, emit `<letter>-<n>` for area subdivisions. Out of scope for P2-T5's first pass.

### Worked examples

| Section (index) | Division letter | Line items (restart per section) |
|---|---|---|
| General Preliminaries (0) | **A** | `1`, `2`, `3` |
| Architectural Finishes (1) | **B** | `1`, `2` (← restarts, not `4,5`) |
| Electrical (2) | **C** | `1`, `2`, `3`, `4` |
| (future grouped sub-items under B-line 1) | — | `1.1`, `1.2` |
| (future area subdivision of C) | — | `C-1`, `C-2` |

### Mapping to code

- `renumberProposalRows(rows)` (`build-…:157`) must change from a flat counter to a **section-aware** pass: group rows by `sectionKey` *in canonical section order*, assign the section's letter, then number lines `1..k` within the section. Output `rowNumber` becomes the **per-section line number string** (e.g. `"1"`), and the **division letter** is written on the **section header row** in column A by the workbook builder (`createBidFormWorksheet`, the `worksheet.addRow([summaryRow.sectionLabel])` at `create-…:208` → prepend the letter, e.g. `"A  General Preliminaries"`).
- Section iteration order today follows `model.summaryRows` (`create-…:206`), which follows `buildSummaryRows` Map insertion order (`build-…:187-214`) = encounter order. P3-T3 reorders this; P2-T5 must not assume the order is canonical yet — derive the letter from the **section's position in `model.summaryRows`** so it stays consistent with the Summary sheet.
- Per-section subtotal ranges (`create-…:252`) already restart per section, so they remain correct after renumbering.

> **Parity caution:** the **Summary sheet** lists sections in the same `model.summaryRows` order; the division letters on Bid Form section headers must match the order shown on Summary. Keep a single ordering source (`model.summaryRows`) so Bid Form `A/B/C` ↔ Summary rows never drift.

---

## 4. Title-block layout — cell-by-cell for the TARGET

The Bid Form title block is written by `addTitleRow` (row 1, merged A→J) + `addHeaderField` (label col A, value col B) at `create-…:192-198`, before `General Notes` (row 9) and the header row (row 17). **TARGET keeps the same row mechanics** but completes the fields (F-07/G3) and removes the **beta placeholder bidder** (`"Archestimator beta workbook"`, `create-…:196`).

| Row | Label (col A) | Value (col B) — TARGET source | DB-free now? | CURRENT |
|---|---|---|---|---|
| 1 | *(title, merged)* | `BID FORM / BILL OF QUANTITIES` | yes | same (`create-…:192`) |
| 2 | Project | `metadata.projectName` ← `projects.name` | **yes** | same (`create-…:193`) |
| 3 | Location | `metadata.projectAddress` ← `projects.location` | **yes** | same (`create-…:194`) |
| 4 | Owner / Client | **`projects.client_name`** | **yes — DB-free** | **EMPTY today** (`create-…:195`); `client_name` exists (`supabase/types.ts:2893`) but route's `ProposalExportProject` pick (`route-…:22`) omits it → **add to the pick + `buildMetadata`** |
| 5 | Bidder / Contractor | contractor profile name → fallback project/workspace name (**never** the beta string) | **no — decision-gated (D4)** | **`"Archestimator beta workbook"`** (`create-…:196`) — must be removed regardless |
| 6 | Architect | contractor/project metadata (e.g. `projects.metadata` or estimate metadata) | partial — needs a field decision | absent |
| 7 | Project Ref / Code | **`metadata.projectCode`** ← `projects.project_code` | **yes — DB-free** | absent in title block; **`projectCode` is already in metadata** (`types-…:11`, populated at `route-…:96`) but **never written to a cell** |
| 8 | Subject / RE | `BID FORM — {estimateName}` or settings-driven | yes | absent |
| 9 | Date Submitted | `model.generatedAt.slice(0,10)` | yes | present at current row 7 (`create-…:198`) |
| 10 | Area / GFA | **`grossFloorArea`** (new metadata) | **no — decision-gated (D3)** | absent; blank `N/A` until captured |

> **DB-free wins (do these in P2-T4 with no migration):** Owner/Client (`projects.client_name` — add to route pick + metadata), Project Ref/Code (`projectCode` — already in metadata, just emit the cell), Subject/RE, Date. **Decision-gated (design migration, defer apply — DB channel unavailable to agents):** Contractor identity (D4 — `workspaces` has **no** `metadata` column, verified `supabase/types.ts:2970-2978`; needs a real contractor-profile migration), GFA (D3), Architect field source.
> **Row-count caution:** completing the title block adds rows above the header. `DETAIL_HEADER_ROW = 17` (`create-…:15`) and `SUMMARY_HEADER_ROW = 14` are padded to with `while (rowCount < HEADER_ROW - 1)` loops (`create-…:201, 281`). If new title rows push past the pad target, **raise the header-row constants** rather than letting rows overflow — and update the test assertions that pin `A2/A4/A9/A11` and `getRow(17)` (`proposal-workbook.test.ts:110-115`).

---

## 5. Accounting peso numFmt + round-then-sum parity

**CURRENT:** leading-symbol format `'₱ #,##0.00;[Red]-₱ #,##0.00'` (`PHP_FORMAT`, `create-…:13`); quantity `'#,##0.####'` (`QUANTITY_FORMAT`, `create-…:14`). This is F-34/G16.

**TARGET (P3-T4, low severity but specified here so P2 numFmt edits land it once):** the **accounting** peso format that aligns symbols/decimals like 10/10 reference files (02a §"Formatting", explicit `[$₱-3409]`):

```
_-[$₱-3409]* #,##0.00_-;-[$₱-3409]* #,##0.00_-;_-[$₱-3409]* "-"??_-;_-@_-
```
(Positive · negative · zero-as-dash · text — the standard 4-part accounting mask; the `[$₱-3409]` is the Peso currency/locale token quoted from 02a roofdeck/6x6/BCMS/RGSP files. Apply as a single `numFmt` constant replacing `PHP_FORMAT` across columns E/F/G/H, Summary col C, totals col B, and Source Breakdown money cols.) Quantity format unchanged. Custom display masks for the totals block: `#,##0.00 "sqm"` (GFA), `##,#00 "calendar days"` (duration) — both quoted from 02a.

**Round-then-sum parity rule (F-34/PR-7):** the model already **rounds each component to 2 dp before summing** — `roundMoney` = `Math.round(value*100)/100` applied per field, then totals reduce over already-rounded values (`build-…:52, 205-209, 221-225`). The **TARGET invariant:** the workbook's stored `result` values (which Excel shows when formulas aren't recalced) must equal the **round-then-sum** model totals to the cent. Because formulas (`=SUM`, `=B+B+B`) recompute from the same rounded cell values, **Excel's recalc == the model result** — no drift. Any new computed cell (Contingency, VAT, Cost/SQM) must store a `result` computed by the **same round-then-sum** path so the pinned-result and the live-formula agree. Add/keep a test asserting `B{Grand Total}.result` equals the hand-rounded sum.

---

## 6. Audience-redaction matrix (`audience = client` vs `internal`)

**CURRENT:** `audience` is **inert** — read by no code (F-12); `showSupplierInRemarks` defaults `true` and `includeSourceBreakdownSheet` defaults `true` (`build-…:28, 32`), so a **client** export today leaks supplier, pricing, confidence, internal notes, **and** the whole Source Breakdown sheet (F-19). **TARGET (P2-T3):** a real gate.

| Cell / sheet | Field source | `audience = internal` | `audience = client` |
|---|---|---|---|
| Bid Form **J (NOTES)** → `Supplier: …` | `buildRemarks` + `showSupplierInRemarks` (`build-…:76`) | **kept** | **dropped** (force `showSupplierInRemarks=false`) |
| Bid Form **J** → `Pricing: …` (pricingSource) | `build-…:77` | kept | **dropped** |
| Bid Form **J** → `As of …` (pricingDate) | `build-…:78` | kept | **dropped** |
| Bid Form **J** → `Confidence: …` | `build-…:79` | kept | **dropped** |
| Bid Form **J** → free `notes` | `build-…:80` | kept | **kept** (client-facing notes) OR dropped if flagged internal — default keep |
| Bid Form **I (SCOPE)** | `scopeLabel` | kept | kept (scope is client-relevant) |
| **Source Breakdown sheet** (whole) | `createSourceBreakdown*` (`create-…:425/462`) | **kept** | **dropped** — do not add the worksheet |
| Source Breakdown **SOURCE ROW ID** | `breakdownRow.sourceRowId` | kept | n/a (sheet dropped); if a redacted internal variant is ever shown, **blank/hash** |
| Source Breakdown **AREA / AREA PATH** | source refs | kept | n/a (sheet dropped) |
| Commercial Terms signature **company/contractor** | contractor profile (D4) | kept | kept (client needs the bidder) |
| Validation issues block (P1-T2/F-20) | `model.validationIssues` | kept (full) | **kept but sanitized** (no internal node IDs in client-visible text) |

> **Implementation hook:** P2-T3 makes the `audience` setting force `showSupplierInRemarks=false` and `includeSourceBreakdownSheet=false` (and any future internal-only fields) when `audience==="client"`, before the model/workbook is built. Internal export = current behavior. This also retires the dead `audience` branch (F-12).

---

## Maps to tasks

**P2-T1** (VAT + contingency totals) → §2 totals cell map + §5 numFmt · **P2-T4** (title block) → §4 + Commercial Terms §1c · **P2-T5** (hierarchical numbering) → §3 · **P2-T6** (Cost per SQM) → §2 rows `S+4`/`S+5` + §4 row 10 (GFA) · **P2-T8** (builder unification + formula column-derivation) → §1a F-21 note + §0 unification note. Supporting: **P1-T6** (single-tab Summary on dynamic start) → §2 dynamic rule · **P2-T3** (audience gate) → §6 · **P3-T1** (real labor) → §1a col F · **P3-T2** (real scope/EXCLUSIONS) → §1a col I · **P3-T4** (accounting peso, RUNNING TOTAL, duration/words) → §5 + §1b + §2.

## Coverage note

Every numbered ask is pinned to a cell or formula: (1) per-sheet column tables for Bid Form / Summary / Commercial Terms / Source Breakdown with CURRENT vs TARGET; (2) the totals block as a dynamic-start cell map resolving the `A27–B32` fragility (`totalsStartRow = lastSectionRow + 2`); (3) the A/1/1.1/D-1 numbering algorithm with worked examples and the `renumberProposalRows` mapping; (4) the title-block cell-by-cell layout flagging DB-free (`client_name`, `projectCode`) vs decision-gated (contractor identity, GFA) fields; (5) the accounting peso `_-[$₱-3409]* #,##0.00_-…` format + round-then-sum parity rule; (6) the audience-redaction matrix. All reference formulas are quoted from [`_research/02a-boq-reference-extraction.md`](_research/02a-boq-reference-extraction.md); none invented. **Caveat:** §3 sub-item (`1.1`) and sub-division (`D-1`) numbering is specified but only *emitted* once row grouping / a split-by-area mode exists — the P2-T5 first pass delivers `<letter>` + per-section integers, which is the honest target for the current flat consolidated-row model.
