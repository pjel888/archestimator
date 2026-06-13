# 02a — BOQ Reference Data Extraction

**Date:** 2026-06-13
**Source folder:** `/Users/philiplewis/Library/Mobile Documents/com~apple~CloudDocs/Project BOQs`
**Parser:** throwaway Node + installed `exceljs@4.4.0` (`/tmp/boq-parse.mjs`)
**Raw dump:** `_research/02a-boq-raw-dump.txt` (1,749 lines)
**Coverage:** 10 of 10 `.xlsx` files parsed successfully (100%). The other ~17 files in the folder are `.pdf` renderings (not parsed; out of scope).

> Currency note: all monetary values are Philippine Peso (₱ / PHP). Several files literally write `PHP` in a column or use `[$₱-3409]` number formats.
> All extracted headers/values below are quoted from the raw dump. Anything not directly observed is tagged **INFERENCE**.

---

## File-by-file extraction

### 1. `022420 AYALA FHL - FILLED BID FORM 3 - 6x6.xlsx`
- **Sheets (1):** `Table 1`. 412 rows × 145 cols (heavily merged: 5,416 merge regions — this is a PDF-table-import artifact, every logical column is split across ~7 physical columns).
- **Title block (rows 4–12, merged):** `Project: Filipinas Heritage Library`, `Location: Ayala Museum, Makati Avenue cor…`, `Client: Ayala Foundation Inc.`, `Area: ± 191 sqm.`, `Subject: AYALA FHL BID FORM`.
- **Header row (R15–17, repeated/merged):** `ITEM | DESCRIPTION` (cost columns lost in merge noise — this is a degraded import; treat structurally only).
- **Sectioning:** Roman-numeral divisions `I. PRELIMINARIES`, then letter sub-items `A`–`K` (Mobilization/Demobilization, Bonds, Safety, etc.), then numbered detail.
- **Totals block (R386–389):** `subtotal:` → `Total:` → `Contingencies` → `12% VAT`.
- **Exclusions block (R391–410):** `EXCLUSIONS:` with note "All items not stated…", numbered 1–18 (All Government Permits, All Bonds and Insurances, All Mechanical Works…). Ends with `CONSTRUCTION DURATION:`.
- **Notable:** confirms the **I / A / 1** numbering scheme, Contingency + 12% VAT add-on convention, and explicit Exclusions + Construction Duration sections. Low data fidelity (import artifact), high structural-convention value.

### 2. `20-233D-RECIO FIT-OUT WORKS 5142021.xlsx`  ← canonical multi-sheet model
- **Sheets (6):** `SUMMARY with Roofdeck` | `GEN PRELIMS` | `SITE WORKS` | `ARCH` | `MEPF` | `JOINERY`. creator=`RSCQS-DIO`.
- **Summary sheet:** letterhead (`RS CARSON GENERAL CONSTRUCTION CORPORATION`, address, ref `20-233D`, date `May 14, 2021`), addressee block (`RECIO + RECIO INC.`, `ATTENTION: MS. CHARISSE ONG / Project Manager`), `RE: RECIO+RECIO BUILDING PROPOSAL`, `BID FORM SUMMARY`.
  - **Summary header (R23):** `PARTICULARS | LINE TOTAL | RUNNING TOTAL | NOTES / REMARKS`.
  - Section rows reference detail sheets by formula, e.g. `A PRELIMINARIES PHP =+'GEN PRELIMS'!J44`, `B SITE WORKS PHP ='SITE WORKS'!J38`, `C GENERAL ARCHITECTURAL` with sub-items `C-1 Upper Ground Floor =+ARCH!J110`. Letter sections A/B/C… with `C-1` sub-codes.
- **Detail sheets — header block (rows 3–6):** `PROJECT | LOCATION | OWNER | BIDDER` + `DATE SUBMITTED`. Sheet banner e.g. `BID FORM A - PRELIMINARY AND GENERAL ARCHITECTURAL…`, `BID FORM B - ENGINEERING WORKS (ELECTRICAL…)`.
- **Detail column schema (two-row merged header, R10–11):**
  `[ITEM] | PARTICULARS | UNIT | QTY | UNIT COST→MATERIAL | UNIT COST→LABOR | LINE TOTAL | TOTALS`
  - **`LINE TOTAL` = `=SUM(G:H)`** (= combined unit rate, MATERIAL+LABOR per unit).
  - **`TOTALS` = `=I*F`** (= unit-rate × QTY = the extended amount).
  - Numbering: division letter (`C`), floor code (`C-1`), group (`1.1.`), then per-line integer (1,2,3…). Units seen: `m²`, `lm`, `lot`, `set`.
  - **Scope keywords appear in the TOTALS column instead of a number:** `Omitted`, `INCLUDED`, `OMITTED`, `BY OTHERS`, `By Owner`, `OFCI`, `noted`, `See : I -Mechanical Works`, `SEE ITEM 2`.
- **Per-section subtotal rows:** `Subtotal A - General Preliminaries =SUM(J14:J43)`, `Subtotal F - Furniture… =+J1752+J1737+…`.
- **Per-sheet grand total block (ARCH R1755–1758):** `Line A1 PART A - TOTAL =J1753+J1659+J1552` → `Line A2 10% Contingency INCLUDED` → `Line A3 12% VAT INCLUDED` → `Line A4 PART A - TOTAL AMOUNT =+J1755`.
- **Number formats:** accounting `_(* #,##0.00_);_(* (#,##0.00);…`, `0.00`, text `@`. Landscape, fit-to-width.

### 3. `20-233D-RECIO FIT-OUT WORKS ROOFDECK 051521.xlsx`
- **Sheets (2):** `RDL-ARCH` | `RDL-ENGG`. creator=`cobal`.
- Same letterhead/addressee block as #2.
- **Column schema (R21–22):** `PARTICULARS | UNIT | QTY | UNIT COSTS→MATERIAL | UNIT COSTS→LABOR | COST TOTAL | LINE TOTAL`.
  - **`COST TOTAL` = `=SUM(F,G)`** (combined unit rate), **`LINE TOTAL` = `=E*H`** (qty × unit rate). Note this file labels the two derived columns `COST TOTAL` / `LINE TOTAL` — exactly Archestimator's names — but uses them as (unit-rate / extended-amount). **Archestimator uses COST TOTAL = unit-rate and LINE TOTAL = extended; same semantics.**
  - **Mini-abstract at top of each sheet (R23–31):** sub-section roll-up, e.g. `Architectural Works =I254`, `Glass and Glazing =I279`, `Doors and Windows`, `Furniture, Fixture, and Equipment =I316 [BY OTHERS]`, `Total of General Architectural Works =SUM(I23:I26)`, then `Deductive Costs`, `Additive Costs`, `Net Total`.
- **Currency format present:** `_-[$₱-3409]* #,##0.00_-…` (explicit Peso symbol), plus custom `#,##0.00 "sqm"` and `##,#00 "calendar days"` formats.
- **Data quality caveat:** several `#REF!` errors in the deductive/additive rows.

### 4. `2020-02-26(AYALA FHL-BID-TABULATIONS).xlsx`  ← multi-bidder tabulation
- **Sheets (6):** `UNITS ONLY` | `Sheet1` | `Tabulation-EDITED` | `Tabulation-SUMMARY` | `old BOQ` | `FEB 26 TABULATION`. creator=`Ninya Racho`.
- **`UNITS ONLY`:** the blank quantity take-off — `ITEM | DESCRIPTION | UNIT | QTY` only (no prices). Title block Project/Location/Client/Area.
- **`old BOQ` header (R12–14, 3-row merged):** `ITEM | DESCRIPTION | UNIT | QTY | MATERIAL[UNIT|COST] | LABOR COST[UNIT|COST] | TOTAL COST`. Formulas `F=E*D` (material amt), `H=G*D` (labor amt), `I=H+F` (total). This is the **split material/labor with separate unit-rate AND amount per cost type** pattern.
- **`Tabulation-EDITED` / `FEB 26 TABULATION` (multi-bidder):** header band `BIDDER'S COSTING` over repeated triplets, one triplet per bidder: `MATERIAL COST | LABOR COST | COST`. Bidders seen: `BOQ by SOP`, `PAMPANGA BLOCK BUILDERS INC (PBBI)`, `6X6 BUILDERS CORP (6X6)`, `BCMS-ISCI (BCMS)`. `COST = MATERIAL+LABOR` per bidder. Scope words inline: `EXCLUDED`, `BY CLIENT`.
- **`Tabulation-SUMMARY`:** `I. FINANCIAL EVALUATION` with one column per bidder (`SOP PTE | PBBI | 6X6 BUILDERS CORP | BCMS`). Sections `A PRELIMINARIES`, `B ARCHITECTURAL` (with sub `1 CIVIL WORKS … 6 SIGNAGE`), `C ELECTRICAL`, `D AUXILIARY WORKS`, `E FIRE PROTECTION`. Each pulls subtotals from the detail sheet.
- **Totals block (R27–30):** `Total Cost` → `10% Contingencies (=*0.1)` → `12% VAT (=(Total+Cont)*0.12)` → `GRAND TOTAL =SUM`.
- **Notable:** demonstrates (a) split material/labor everywhere, (b) the **canonical add-on stack: Total Cost → 10% Contingency → 12% VAT → Grand Total**, (c) tabulator notes (`NOTES FROM TABULATOR`: VAT exceptions, double-counted items, omissions), (d) construction duration `90 Calendar Days`.

### 5. `2022-06-09 BANSON BOQ_Rev-3.xlsx`  ← most sophisticated / instructive template
- **Sheets (19):** `SUM-A` | `SUM`(hidden) | `OPTIONS (R2d)` | `OPTIONS Sum` | `A-Preliminaries` | `B-Mobilization` | `C-Site Works` | `D-Civil` | `E-AR Works` | `F-AR Finishes` | `G-Glass` | `H-Wood & Specialty` | `J-Mech` | `K-Elec` | `L-Plum` | `M-FDAS` | `N-FFE` | `QTYS` | `OPTIONS`. creator=`Ninya`.
- **One sheet per division, named with the division letter** (`A-…` through `N-…`); each banner reads `PART n OF 13`.
- **Title block (R2–6):** `PROJECT | LOCATION | CLIENT | ARCHITECT | SUBJECT`. SUBJECT = `=TODAY()` + revision tag (`BOQ SUMMARY (Rev-2)`, `INITIAL BOQ (Rev-1b)`). Contractor identity block: `STUDIO ONG PROJECTS`, address, phone, `info@studioong.com`, plus `(CONTRACTOR LOGO)` placeholder cells.
- **Embedded BOQ INSTRUCTIONS panel (SUM-A cols M–N):** numbered guidance — "Indicate the Bidder Name…", "ADDITIONAL LINE ITEMS… Others, please specify", "ITEMS NOT NEEDED", scope-label legend (`INCLUDED / EXCLUDED / BY OTHERS / NOT IN PLAN`), "COSTING REFERENCES". A **`LEGEND` color key** appears on every detail sheet: `BLUE - SUPPLIER COST`, `RED/GREEN - TO VERIFY`, and scope labels.
- **Summary header (SUM-A R8–9):** `ITEM NO. | PARTICULARS | WEIGHTED % | COST AMOUNT | REMARKS`. Each division row pulls from its sheet (`='A-Preliminaries'!K39`) and computes a **weighted % of grand total incl. add-ons:** `=(($K13*1.12)+($K13*0.05))/$K$42` (12% VAT + 5% contingency).
- **Detail column schema (two-row merged header, R9–10):**
  `ITEM NO. | PARTICULARS | QUANTITIES→[UNIT | QTY] | UNIT COSTS→[MATERIAL | LABOR | AMOUNT] | COST AMOUNT | REMARKS` (+ side `EVALUATION NOTES`).
  - **`AMOUNT` (unit) = `=SUM(H:I)`** (MATERIAL+LABOR per unit); **`COST AMOUNT` = `=J*G`** (unit rate × QTY). Group-header rows roll up children via `=SUM(K..:K..)`.
  - Numbering: division letter (`A`,`B`,`C`,`D`…) and sub-codes `D-1`…`D-11`; detail line numbers `1`, then `1.01/1.02`, `2.01`…; group totals at integer rows.
  - Units: `lot`, `mo.`, `sqm`, `m3`, `lm`, `set`, `cu.m.`.
  - **Scope words in COST AMOUNT col:** `INCLUDED`, `EXCLUDED`, `BY OTHERS`, `PENDING`, `NOT IN PLAN`, plus `% of CONST BUDGET`. REMARKS carry `3000 PSI`, `4000 PSI`, "during Earth works only", etc.
- **`OPTIONS (R2d)` / `OPTIONS Sum` — value-engineering matrix:** frozen panes `ySplit:9`. Columns: `INITIAL OVERALL COST (AA) | OVERALL VE COST (AB) | VARIANCE (AA LESS AB) | COST AMOUNT (A) | VALUE ENGINEERING COST (B) | LESS OSM RECO (C) | OTHER VE RECOMMENDATIONS | REMARKS | PROVISIONAL COSTS FOR CONSIDERATION (E)`. Per-division `CONTINGENCY 5%`, `SUBTOTAL … WITH VAT (=J*1.12+contingency)` and `VAT EX` rows. Roman-numeral mega-groups `I EARTH & SITE WORKS (GROUP C)`, `II GENERAL REQUIREMENTS (GROUP A,B)`, `III ARCHITECTURAL (GROUP D,E,F,G,H,N)`, `IV ENGINEERING (GROUP J,K,L,M)`.
- **Notable:** the richest source for (a) per-sheet-per-division architecture, (b) split material/labor + derived unit AMOUNT, (c) WEIGHTED %, (d) embedded instructions + legend + scope vocabulary, (e) value engineering / options, (f) provisional sums, (g) "General Requirements" division naming.

### 6. `6x6 - 032221 - RECIO ROOFDECK LEVEL QUOTATION EXCEL FILE.xlsx`  ← issued-template family
- **Sheets (1):** `RDL-BID FORM`. 811 rows × 141 cols (merge-heavy import). creator=`Ninya Racho`.
- **Title block (R2–5):** `PROJECT | LOCATION | OWNER | BIDDER` (`6x6 Builders Corp.`) + `DATE SUBMITTED 2021-03-22`.
- **GENERAL NOTES panel (R3–7):** "1. Please do not leave any item in the Line Total blank…", "Indicate as INCLUDED, EXCLUDED, BY OTHERS…", "2. Please double check all formulas…", "3. avoid inserting items between…", "4. Use the Bidder's Notes column…".
- **Column schema (R9–10):** `[ITEM] | PARTICULARS | UNIT | QTY | UNIT COSTS→MATERIAL | UNIT COSTS→LABOR | COST TOTAL | LINE TOTAL`.
- Sections: `A GENERAL PRELIMINARIES`, numbered `1`/`1.1`/`3.1`/`5.1`…; units `lot`. Scope words appear as text in COST TOTAL/LINE TOTAL.

### 7. `BCMS - RR_RDL_BOQ.xlsx`  ← issued-template family + clean front page
- **Sheets (2):** `FRONT PAGE` | `RFQ`. creator=`Ninya Racho`.
- **`FRONT PAGE` (abstract/summary):** title block Project/Location/Owner/Bidder (`BCMS INTERNATIONAL SPECIALTY CONTRACTOR…`) + DATE SUBMITTED.
  - **Summary header (R10):** `PARTICULARS | LINE TOTAL | RUNNING TOTAL | NOTES / REMARKS`.
  - Sections A–I, each with `PHP` currency tag and a value: `A GENERAL PRELIMINARIES PHP 2,367,261.11`, `B SITE WORKS`, `C ARCHITECTURAL WORKS`, `D GLASS AND GLAZING`, `E DOORS AND WINDOWS`, `F ELECTRICAL`, `G MECHANICAL`, `H PLUMBING`, `I MISCELLANEOUS WORKS`.
  - **`EXCLUSIONS` block (R43+)** with note "All items NOT…" subdivided `A Architectural Works` / `B MEP`.
  - **`NOTES`** explaining BID FORM A / BID FORM B split.
  - **`GRAND TOTAL AMOUNT AND AMOUNT IN WORDS` (R61–63):** numeric `11,842,634.32` + spelled out "ELEVEN MILLION EIGHT HUNDRED FORTY TWO THOUSAND…".
  - **Signature/conforme block (R67–71):** `Prepared by` (Julie Ann Ramos / Byron S. Salvador, `Quantity Surveyor`) and `Noted by` (Rea S. Soliman, `Head Quantity Surveyor`), with company name.
- **`RFQ` (detail):** frozen pane `ySplit:10`. Same `UNIT COSTS→MATERIAL/LABOR | COST TOTAL | LINE TOTAL` schema. Scope text values seen: `NOT INCLUDED`, `Office Support`.

### 8. `CONMECH - RECIO BLDG ROOF DECK LEVEL BID PROPOSAL E-FILE.xlsx`
- **Sheets (1):** `Sheet1`. creator=`Charlson`.
- **Title block (R3–7):** `DATE : MARCH 17, 2021`, `PROJECT :`, `LOCATION :`, `OWNER : RECIO+RECIO INC.`, `SUBJECT : ITEMIZED BID BREAKDOWN - ROOF DECK LEVEL`.
- **Column schema (R9–10) — note QTY/UNIT order swapped:** `ITEM | PARTICULARS | QTY | UNIT | UNIT COST→MATERIAL | UNIT COST→LABOR | LINE TOTAL | TOTALS`.
  - Here `LINE TOTAL` = MATERIAL+LABOR per unit and `TOTALS` = extended. Labor frequently literal `INCLUDED` (material-only pricing), or whole rows `BY OWNER` / `BY GENCON` / `N/A`.
- **Final totals block (R942–948):** `Line 1 TOTAL AMOUNT` → `Line 2 Contingency [INCLUDED]` → `Line 3 VAT` → `Line 4 GRAND TOTAL` → `Line 5 Cost per SQM` → `Line 6 Total Gross Floor Area` → `Line 7 ESTIMATED CONSTRUCTION DURATION (in Working… ) 240`.
- **Signature block:** `Submitted by:` (CONMECH…, Engineer-In-Charge), `Checked by:` (Technical Manager), `Noted by:` (General Manager / President).

### 9. `RGSP - boq_reciobroofdeck_18March2021.xlsx`  ← issued-template family + summary sheet
- **Sheets (2):** `RDL-BID FORM` | `Sheet5`(summary). creator=`Ninya Racho`. Frozen pane `xSplit:10` on detail.
- **Detail schema (R9–10):** `PARTICULARS | UNIT | QTY | UNIT COSTS→MATERIAL | UNIT COSTS→LABOR | COST TOTAL | LINE TOTAL`. `COST TOTAL = =SUM(G,H)`.
- **Per-section subtotals:** `… Subtotal =SUM(Jx:Jy)`, `SUBTOTAL G - MISCELLANEOUS WORKS =SUM(J371,J366)`.
- **Final totals block (R374–380):** `Line 1 TOTAL AMOUNT =SUM(...)` → `Line 2 10% Contingency [N/A]` → `Line 3 12% VAT [INCLUDED]` → `Line 4 GRAND TOTAL =SUM(J374:J376)` → `Line 5 Cost per SQM =J377/J379` → `Line 6 Total Gross Floor Area 138.295` → `Line 7 ESTIMATED CONSTRUCTION DURATION 120`.
- **`GRAND TOTAL AMOUNT IN WORDS` (R383–385):** number + "SIX MILLION FIVE HUNDRED FIFTY THOUSAND…".
- **Signature block:** `Prepared by` (Quantity Surveyor) / `Noted by` (Managing Direction - Engineering).
- **`Sheet5` summary:** header `PARTICULARS | LINE TOTAL | RUNNING TOTAL | NOTES / REMARKS`; sections A–G each with `PHP`; `C ID FIT-OUT WORKS` has room sub-codes `C-1 ELEVATOR LOBBY … C-5 AL FRESCO LOUNGE [EXCLUDED]`; `Cost per SQM`, `Cost per SQM with VAT`, EXCLUSIONS, NOTES, GRAND TOTAL + words + signatures. Currency format `[$-3409]mmmm dd, yyyy` (PH locale).

### 10. `RSC - 21-058-RECIO ROOF DECK.xlsx`  ← issued-template family (letter style)
- **Sheets (1):** `RDL-BID FORM`. creator=`Ninya Racho`. Landscape.
- **Letterhead + cover-letter style:** `RS CARSON GENERAL CONSTRUCTION CORPORATION` + address (R1–2), ref `21-058`, date `March 23, 2021`, addressee `RECIO + RECIO INC.` + `ATTENTION: MS. CHARISSE ONG / Project Manager`, `Dear Ma'am,` salutation, `RE: RECIO+RECIO BUILDING PROPOSAL / ROOF DECK LEVEL WORKS`.
- **Column schema (R24–25):** `[ITEM] | PARTICULARS | UNIT | QTY | UNIT COSTS→MATERIAL | UNIT COSTS→LABOR | COST TOTAL | LINE TOTAL`. `LINE TOTAL = =E*H` (qty × unit). Sections `A GENERAL PRELIMINARIES`, items `1.1`,`1.2`…
- **`EXCLUSIONS` (R750–761):** numbered 1–11 (Tiles/Carpet, Windows, Loose Furniture, Signages, Lighting Fixtures, Feeder Line/Panel Boards, Plumbing, HVAC, Fire Protection, levels not in scope, "All items not mentioned in the BOQ").
- **`TERMS OF PAYMENT` (R764):** "Twenty percent (20%) … balance on progress billing".
- **`NOTE` (R767–770):** "A. DUE TO UNPREDICTABLE COST OF MATERIALS … FOR SIXTY (60) DAYS ONLY UPON RECEIPT", "B. VAT INCLUSIVE", "C. ONE YEAR WARRANTY".
- **Closing/conforme:** `Very truly yours, SUSAN C. TUASON / Vice-President`, `Conforme____________`.

---

## Cross-file synthesis of conventions

### Sheet architecture (3 archetypes observed)
1. **Single combined sheet** — CONMECH, RSC, 6x6, AYALA-FILLED (1 sheet: header + sectioned detail + totals + exclusions + signatures). 4/10.
2. **Front/summary sheet + 1–2 engineering-vs-architectural detail sheets** — BCMS (FRONT PAGE+RFQ), RGSP (Sheet5+RDL-BID FORM), Roofdeck (RDL-ARCH+RDL-ENGG). 3/10.
3. **Abstract/summary + one sheet per trade/division** — RSC 20-233D (6 sheets: SUMMARY + GEN PRELIMS/SITE WORKS/ARCH/MEPF/JOINERY), BANSON (19 sheets: SUM-A + A…N divisions + OPTIONS + QTYS). 2/10. The AYALA tabulation is a 4th archetype (multi-bidder comparison).
- **A dedicated Summary/Abstract sheet appears in 5/10** files (BCMS, RGSP, RSC-20-233D, BANSON, AYALA-tab) and is the formal/issued style.
- **A "General Requirements" / "General Preliminaries" / "Preliminaries & General Requirements" section is universal (10/10)** and is always the first division.

### Canonical column schema (the issued template, 7/10 files)
The reusable template authored by `Ninya Racho` (6x6, BCMS, RGSP, RSC-roofdeck) and the RSC-20-233D / BANSON detail sheets all share:

| Order | Header (top row) | Sub-header | Meaning | Typical formula |
|------|------------------|-----------|---------|-----------------|
| 1 | ITEM / ITEM NO. | — | hierarchical ref (A / 1 / 1.1 / D-1 / 1.01) | text |
| 2 | PARTICULARS / DESCRIPTION | — | item description (often spans 2–3 merged cols) | text |
| 3 | UNIT | — | uom (lot, m², lm, set, m3, sqm, mo.) | text |
| 4 | QTY | — | quantity | number |
| 5 | UNIT COST(S) | **MATERIAL** | material unit rate | number / `OFCI`/`-` |
| 6 | UNIT COST(S) | **LABOR** | labor unit rate | number / `INCLUDED`/`-` |
| 7 | COST TOTAL / LINE TOTAL / AMOUNT | — | **combined unit rate** = `MATERIAL+LABOR` | `=SUM(mat,lab)` |
| 8 | LINE TOTAL / TOTALS / COST AMOUNT | — | **extended amount** = `unit rate × QTY` | `=qty*unitrate` |
| (+) | NOTES / REMARKS / Bidder's Notes | — | specs, scope, supplier | text |

- **MATERIAL and LABOR are split as separate UNIT-RATE columns in 7/10 files** (all except the degraded AYALA-FILLED import, and CONMECH which keeps both columns but fills LABOR with `INCLUDED`). The AYALA `old BOQ` sheet additionally splits into **unit rate AND amount for each of material/labor** (4 money columns).
- The two derived columns are **(unit rate)** then **(extended amount)** — Archestimator's `COST TOTAL` (=MAT+LAB unit) and `LINE TOTAL` (=qty×rate) match this exactly in name and meaning.

### Numbering scheme
- **Divisions:** capital letters (`A`,`B`,`C`…/`A-Preliminaries`) **or** Roman numerals (`I.`,`II.`) — letters dominate (7/10).
- **Sub-divisions:** `C-1`, `D-1`…`D-11` (letter-number).
- **Line items:** integer `1,2,3…`; **decimal sub-items `1.1`, `3.4.`, `1.01`, `2.01`** (2-decimal padding in BANSON). Detail rows under a group often restart at `1`.

### Sectioning / divisions actually used (union across files)
General Preliminaries / General Requirements · Mobilization · Site Works · Earth Works · Civil Works · Architectural Works · Architectural Finishes · Glass & Glazing · Doors & Windows · Joineries / Wood & Specialty · Signage · Electrical · Mechanical · Plumbing · Auxiliary · FDAS / Fire Protection · FFE (Furniture, Fixture & Equipment) · Miscellaneous Works. (CSI-ish but trade-grouped, not 16/50-division CSI.)

### Subtotals & totals
- **Per-section subtotal rows** are universal: `Subtotal <Section>` / `<SECTION> TOTAL:` / `SUBTOTAL X - <name>` via `=SUM(range)`.
- **Add-on stack (highly consistent):** `TOTAL AMOUNT / Total Cost` → **Contingency (10%, or 5% in BANSON; often `INCLUDED`/`N/A`)** → **VAT (12%; sometimes `INCLUDED`/6% special)** → **GRAND TOTAL** → **Cost per SQM** → **Total Gross Floor Area** → **Estimated Construction Duration (calendar/working days)**.
  - "Line 1…Line 7" labeling of this block appears in 4 files (6x6/BCMS/RGSP/RSC/CONMECH template).
- **Overhead/OCM:** not a separate explicit line in most; folded into Preliminaries/Field Overhead or into contingency+VAT. (BANSON SUM-A weights with `*1.12 + *0.05`.)

### Header / title block fields (union)
PROJECT · LOCATION · OWNER (or CLIENT) · BIDDER (or CONTRACTOR) · ARCHITECT · DATE SUBMITTED · PROJECT REF/CODE (`20-233D`,`21-058`) · SUBJECT/RE · REVISION (`Rev-3`,`Rev-1b`) · AREA / Gross Floor Area · contractor letterhead + address + phone + email + `(CONTRACTOR LOGO)` · addressee + ATTENTION + salutation (letter style).

### Totals-adjacent boilerplate (formal files)
- **GRAND TOTAL AMOUNT IN WORDS** (spelled-out peso amount): BCMS, RGSP.
- **EXCLUSIONS** enumerated list: AYALA-FILLED, BCMS, RGSP, RSC.
- **GENERAL NOTES / BOQ INSTRUCTIONS** (don't-leave-blank, scope-label legend, don't-insert-rows): 6x6, BCMS, RGSP, BANSON.
- **TERMS OF PAYMENT / NOTES** (validity 60 days, VAT inclusive, 1-yr warranty): RSC.
- **Signature / Conforme block** (`Prepared by` / `Checked by` / `Noted by` / `Submitted by` / `Conforme` with name + role + company): BCMS, RGSP, CONMECH, RSC, RSC-20-233D.

### Scope vocabulary (text values placed in the amount/total column)
`INCLUDED` · `NOT INCLUDED` · `EXCLUDED` · `OMITTED` · `BY OTHERS` · `BY OWNER` · `BY CLIENT` · `BY GENCON` · `OFCI` (owner-furnished, contractor-installed) · `OSCI`/`OSM`/`OFCI` (AYALA-FILLED notes) · `NOT IN PLAN` / `ITEM NOT NEEDED` · `NOT APPLICABLE` / `N/A` · `PENDING` · `Office Support` · `See : <other section>` / `SEE ITEM n`.

### Formatting
- **Currency:** PH peso. Accounting format `_(* #,##0.00_);_(* (#,##0.00);_(* "-"??_);_(@_)` dominates; explicit symbol via `[$₱-3409]` in roofdeck/6x6/BCMS/RGSP. Some sheets literally place `PHP` in a column.
- **Quantity:** `#,##0.00` / `0.00`.
- **Custom display formats:** `#,##0.00 "sqm"`, `##,#00 "calendar days"`, `#,##0 "days"`, `00 "months"`, `[$-3409]mmmm dd, yyyy` (PH date locale).
- **Page setup:** landscape + fit-to-width=1 on detail BOQ sheets; portrait for summaries/front pages. paperSize 9 (A4) mostly, 8 (A3) for wide tabulations.
- **Frozen panes:** header rows frozen on the formal templates (`ySplit:10` BCMS RFQ, `ySplit:9` BANSON OPTIONS; `xSplit:10` RGSP).
- **Two-/three-row merged header** (UNIT COSTS spanning MATERIAL|LABOR) is standard.
- **Color legend** (BANSON): blue = supplier cost, red/green = to verify.
