# 03 — UX/UI Audit: Spreadsheet (XLSX) "Proposal Export" Feature

**Scope:** Read-only UX/UI audit of the Preview Excel Export modal and its flow.
**Lens:** modal IA, flow, accessibility, copy, and — above all — the **truthfulness of the preview vs. the downloaded file**.
**Method:** Static code reading. No browser run (workshop dev-auth bypass disabled per project memory). Behavioral claims about rendering are inferred from code and marked ASSUMPTION where not directly observable.

**Primary files:**
- Modal: `src/components/workshop/ProposalExportPreviewDialog.tsx`
- Wiring/state: `src/components/workshop/EstimateSheetContent.tsx`
- Entry-point button: `src/components/ui/header-icon-toolbar.tsx`, `src/components/ui/toolbar-icon-button.tsx`
- Download route: `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`
- Workbook truth: `src/lib/proposal-export/create-proposal-workbook.ts`
- Model defaults/types: `src/lib/proposal-export/build-proposal-export-model.ts`, `src/lib/proposal-export/types.ts`

---

## Executive summary

The "Preview Excel Export" modal is visually tidy but **fundamentally dishonest about what the user will download**, and that is the headline UX failure. Three independent gaps stack on top of each other:

1. **Column mismatch [CRITICAL].** The HTML preview shows **12 columns** (NO/TAG/PARTICULARS/QTY/UNIT/MATERIAL UNIT COST/LABOR UNIT COST/MATERIAL SUBTOTAL/LABOR SUBTOTAL/MISC-OTHER/COST AMOUNT/REMARKS). The actual Bid Form sheet has **10 different columns** (ITEM/PARTICULARS/UNIT/QTY/MATERIAL/LABOR/COST TOTAL/LINE TOTAL/SCOPE/NOTES-REMARKS). Column count, order, names, and semantics all differ. The preview is not a preview of the file — it is a different table.
2. **Scope mismatch [CRITICAL].** When scope = "All tabs" (the default), the table renders **only the active tab's rows and the active tab's grand total**, while the file contains **every tab plus a multi-tab Summary**. The preview's prominent "Grand total" metadata is therefore wrong for the default action. A disclaimer admits this in 9px gray text, but the number is shown in the same weight as a trustworthy figure.
3. **No sheet preview [HIGH].** The file ships **4 sheet types** (Bid Form per tab, Summary, Commercial Terms, Source Breakdown). The preview shows none of these — no Summary, no Commercial Terms boilerplate, no Source Breakdown, no section subtotal rows, no formulas.

On top of the truth gaps: **zero export settings are exposed** (the rich `ProposalExportSettings` is hard-defaulted server-side), the **download is a bare `<a href>` with no loading/error handling** (a 413/404/500 JSON body will be saved as a "download" or shown as raw JSON), the modal has **no Esc key, no focus trap, no focus return, and no overlay-click-to-close** (while sibling modals in the same file have all of these), and the entire UI is rendered in **8–10px type** that fails contrast/legibility expectations.

Severity tally: **CRITICAL ×3, HIGH ×6, MEDIUM ×7, LOW ×4**.

---

## Entry points & discoverability

### How the user reaches the export
- The only entry point is a header action labeled **"Preview Excel Export"** wired in `EstimateSheetHeader` → `TreePanelHeader.addActions` (`EstimateSheetContent.tsx:494-500`). `onClick={onPreviewProposalExport}` → `openProposalPreview` (`:1079-1082`).
- The header is rendered in three branches — loading (`:1736`), populated (`:1752`), and a third (`:1821`) — all passing the same handler. So functionally there is **one** way in, repeated per render branch.
- There is **no direct "Download" entry point.** The download link only exists *inside* the modal (`ProposalExportPreviewDialog.tsx:108-118`). A user who just wants the file must open the preview first. ASSUMPTION: this is intentional ("preview-gates-download"), but it adds a step for the common "just give me the file" case.

### What it actually looks like (discoverability problem)
- The action is rendered by `ToolbarIconButton` as an **icon-only 24px button** (the `FileXls` glyph). `toolbar-icon-button.tsx:70-73` sets `size-6 ... p-0` and renders no visible text because the label does not start with "Add" and `visibleLabel` is unset (`header-icon-toolbar.tsx:145-146`). The words "Preview Excel Export" live **only** in `aria-label`/`title` and a hover tooltip (`toolbar-icon-button.tsx:67,69,86`).
- **[MEDIUM] Discoverability.** Export — a high-intent, high-value action — is a single unlabeled spreadsheet icon in a row of similar gray icons (Activity clock, expand, collapse, search). *Why it matters:* users hunting for "export"/"download"/"Excel" will scan for a word and find none; the feature is effectively hidden behind a guess-the-icon interaction.

### Disabled states — what turns it off
- `canPreviewProposalExport={canPreviewCurrentExport}` and `canPreviewCurrentExport = Boolean(resolvedProposalExportMetadata)` (`:1632`).
- `resolvedProposalExportMetadata` (`:737-752`) returns `null` **only** when `projectId`/`estimateId` are missing; otherwise it synthesizes placeholder metadata ("Untitled project" / "Untitled estimate"). So in practice the button is **almost never disabled** for a loaded sheet.
- **[MEDIUM] Misleading enabled state.** The button is enabled even when the estimate has **zero exportable rows**. Opening then yields the empty preview ("No Area Node rows are available…", `ProposalExportPreviewDialog.tsx:234-236`) but the **Download XLSX button is still shown** (it depends only on `proposalDownloadHref`, not on row count). *Why it matters:* the user can download an effectively empty/near-empty workbook with no warning.
- **[LOW] Disabled affordance.** `disabled` is forwarded to the underlying `Button` (`header-icon-toolbar.tsx:156`) but the hover-tooltip is the only place the label exists; a disabled button typically suppresses pointer events, so a disabled state would give the user **no explanation** of why export is unavailable. (Edge case, since it's rarely disabled.)

---

## Modal information architecture & visual hierarchy

Structure (top→bottom), all in `ProposalExportPreviewDialog.tsx`:
- **Header** (`:78-128`): eyebrow "Industry BOQ export" (8px), title "Read-only Excel preview" (10px), 2-line explainer (10px), then a right cluster: stale/current **status badge**, **Refresh preview**, **Download editable XLSX**, **× close**.
- **Scope strip** (`:132-169`, multi-tab only): "Export scope" label + "All tabs (N tabs)" / "{Tab} tab" chips + a 9px explanatory sentence.
- **Metadata strip** (`:171-188`): 4-column grid — Project / Estimate / Rows / Grand total.
- **Table** (`:190-251`): sticky dark header, body rows, `tfoot` grand-total row.
- **Footer** (`:253-256`): "{N} section summaries · {N} source rows retained…" and "{N} export notes".

### Findings
- **[HIGH] Tiny type throughout.** The modal uses `text-[8px]`, `text-[9px]`, `text-[10px]` for essentially **all** text — eyebrows/labels at 8px (`:80,134,173,177,181,185`), badges/buttons/chips/footer at 9px (`:43,45,48,64,148,164,208,242,253-255`), titles/body/cells at 10px (`:81,82,133,182,186,191,234,259`). *Why it matters:* 8–9px text is below comfortable reading size on most displays and is hostile to anyone with low vision; a dense financial table is exactly where legibility matters most. ASSUMPTION: these are deliberate to fit the wide table, but it is a poor tradeoff.
- **[MEDIUM] Title undersells / hierarchy inverted.** The `<h2>` "Read-only Excel preview" is 10px — the same size as body copy and *smaller* than the dark table header cells effectively read as. There is no clear focal point; the eye lands on the black table header, not the dialog title. *Why it matters:* weak hierarchy makes it hard to orient ("what am I looking at, and what's the primary action?").
- **[MEDIUM] Two competing primary actions in the header.** "Refresh preview" (accent-soft) and "Download editable XLSX" (solid primary) sit adjacent at equal size (`:95-118`). The download — the actual goal — is not clearly dominant, and refresh is given near-equal prominence. *Why it matters:* the CTA the user came for should be unmistakable.
- **[MEDIUM] "Rows" metadata is ambiguous.** `:182` shows "{N} consolidated BOQ rows" — but this count is for the **active tab only** even when scope is "All tabs", and it excludes section header/subtotal rows that the file adds. *Why it matters:* a user sizing up "how big is my export" gets a number that doesn't match the file.
- **[LOW] Footer is cryptic.** "{N} section summaries · {N} source rows retained for area traceability" and "{N} export notes" (`:253-255`) are jargon. "Export notes" is `validationIssues.length` (`:255`) but is never made clickable/expandable — the user sees a count of problems with no way to read them. *Why it matters:* surfacing a problem count without the problems is worse than not surfacing it.
- **[LOW] Currency formatting hack.** `formatMoney` does `.replace("₱", "₱ ")` (`:34-36`); `formatQuantity` has a no-op branch (`:38-40`, both branches return `String(value)`). Cosmetic/dead code, not user-facing harm.

---

## Preview-vs-download truth gaps (the big one)

This is the core of the audit. The modal's own copy says "Read-only Excel preview" and "Download editable XLSX" — strongly implying the table **is** the file. It is not.

### Gap A — Column mismatch [CRITICAL]
Preview columns (`ProposalExportPreviewDialog.tsx:194-207`):
`NO. · TAG · PARTICULARS · QTY · UNIT · MATERIAL UNIT COST · LABOR UNIT COST · MATERIAL SUBTOTAL · LABOR SUBTOTAL · MISC / OTHER · COST AMOUNT · REMARKS` (12 columns)

Actual Bid Form columns (`create-proposal-workbook.ts:18-29`, `BID_FORM_COLUMNS`):
`ITEM · PARTICULARS · UNIT · QTY · MATERIAL · LABOR · COST TOTAL · LINE TOTAL · SCOPE · NOTES / REMARKS` (10 columns)

Every divergence:
| # | Preview | File (Bid Form) | Divergence |
|---|---------|-----------------|-----------|
| 1 | NO. | ITEM | label differ; file uses `proposalRow.rowNumber` too, so values align but header name differs |
| 2 | TAG | — | **Preview-only.** No TAG column in the file. |
| 3 | PARTICULARS | PARTICULARS | match (file may append remarks differently) |
| 4 | QTY (3rd) | UNIT (3rd) | **column order differs** (preview QTY before UNIT; file UNIT before QTY) |
| 5 | UNIT | QTY | order swap (see above) |
| 6 | MATERIAL UNIT COST | MATERIAL | file column is the same per-unit material value but labeled "MATERIAL"; preview adds "UNIT COST" |
| 7 | LABOR UNIT COST | LABOR | same as above |
| 8 | MATERIAL SUBTOTAL | COST TOTAL | **different math.** File "COST TOTAL" = `MATERIAL+LABOR` per unit (`:235`), NOT a material subtotal. |
| 9 | LABOR SUBTOTAL | LINE TOTAL | **different math.** File "LINE TOTAL" = `qty*costTotal ± adjustments` with a SCOPE-aware `IF` (`:220,236`), NOT a labor subtotal. |
| 10 | MISC / OTHER | SCOPE | **completely different.** File has a SCOPE column (INCLUDED/EXCLUDED/BY OTHERS/OWNER SUPPLIED/OSM/OFCI/OSCI/OMITTED/NOT APPLICABLE, `:118-121,237`); preview has no scope at all. |
| 11 | COST AMOUNT | NOTES / REMARKS | offset; file folds misc/contingency into REMARKS text (`:221-227`). |
| 12 | REMARKS | — | preview has a 12th column the file doesn't. |

Additional file-only structure absent from the preview:
- **Section header rows** (merged, bold) and **per-section subtotal rows** (`create-proposal-workbook.ts:206-263`). The preview is flat — no section grouping is visible at all, even though the file groups by section and the footer counts "section summaries".
- **Live formulas** (`E+F`, the SCOPE-aware `IF` line total, `SUM` subtotals). The preview shows static computed numbers; it never communicates that the file is formula-driven (which is the whole point of "editable XLSX").
- **Title block / header fields** (Project, Location, Owner/Client, Bidder, Estimate/Revision, Date, General Notes) on rows 1–16 (`:192-201`).

*Why it matters to the user:* The preview teaches the user a mental model of the spreadsheet (these columns, this layout, this grand total) that the file then violates. A QS/estimator handing this to a client will be surprised by SCOPE, COST TOTAL/LINE TOTAL semantics, missing TAG, and section subtotals they never saw. This erodes trust in the tool's output — the single worst outcome for an estimating product.

### Gap B — Scope/multi-tab mismatch [CRITICAL]
- The preview model is built **client-side from the active tab only**: `buildProposalPreview` (`EstimateSheetContent.tsx:1064-1074`) calls `buildProposalExportModel({ nodes: materializeEditableEstimateTree(estimateTree, editableRows) })` where `estimateTree` is the currently-loaded tab's tree. There is no iteration over `persistedTabs`.
- The download, when scope = "all-tabs" (and there are ≥2 tabs), hits the route with no `?tab` param → `buildAllTabsResponse` (`route.ts:154-205`), producing a workbook with **one Bid Form sheet per tab + a multi-tab Summary** whose grand total `reduce`s across all tabs (`create-proposal-workbook.ts:397`).
- So with default scope:
  - Preview table = **tab 1's rows.**
  - Preview "Grand total" metadata (`:186`) and `tfoot` total (`:246`) = **tab 1's total.**
  - File = **all tabs**, with a **much larger** grand total the user never saw.
- The only signal is a 9px gray sentence: "Download includes all N estimate tabs; this preview is built from the active tab rows." (`ProposalExportPreviewDialog.tsx:164-168`) plus a sheet-level note "XLSX export includes all tabs by default…" (`EstimateSheetContent.tsx:1730-1732`).

*Why it matters:* The most prominent, highest-trust number in the modal — the **Grand total** — is **wrong for the default action** on any multi-tab estimate, and the correction is buried in the smallest text in the dialog. A user could quote a client the single-tab total believing it's the whole job.

- **[HIGH] Scope chips only appear for multi-tab estimates.** `proposalPreviewScopeControls` is `undefined` unless `hasMultiplePersistedTabs` (`EstimateSheetContent.tsx:1086-1093`), and the dialog renders the strip only when `scopeControls` exists (`:132`). Single-tab users see no scope context — fine — but multi-tab users get the dangerous default with the least-visible warning. *Why it matters:* the warning's prominence is inversely proportional to the risk.

### Gap C — Hidden sheets [HIGH]
The file always contains (single-tab path, `create-proposal-workbook.ts:537-542`): **Bid Form**, **Summary**, **Commercial Terms**, and **Source Breakdown** (since `defaultProposalExportSettings.includeSourceBreakdownSheet = true`, `build-proposal-export-model.ts:28`). The tabbed path (`:521-534`) adds a Bid Form per tab. **The preview shows none of these.** Commercial Terms ships boilerplate ("Payment Terms: To be confirmed", "Warranty: …", a Conforme/signature block, `create-proposal-workbook.ts:324-353`) that the user has never reviewed and cannot edit pre-download. *Why it matters:* the user may send a client a workbook containing placeholder commercial terms and an empty signature block they didn't know were there.

---

## Settings / control exposure

- `ProposalExportSettings` (`types.ts:20-29`) is rich: `audience` (client/internal), `mode` (detailed-boq/summary-only), `consolidationMode` (industry-standard/area-breakdown), `includeSourceBreakdownSheet`, `includeFormulas`, `includeZeroRows`, `includeExcludedRows`, `showSupplierInRemarks`.
- **[HIGH] None of these are exposed in the UI.** The modal offers only the scope toggle (all-tabs/active-tab). The download route **never reads settings from the request** — it always uses `defaultProposalExportSettings` (`route.ts:183` for tabbed; the single-tab path calls `buildProposalExportModel` with no `settings` so the builder's defaults apply). So:
  - The user **cannot** choose internal vs. client audience.
  - The user **cannot** suppress the Source Breakdown sheet (always on), zero rows, or excluded rows (`includeExcludedRows: true` means EXCLUDED items appear with SCOPE=EXCLUDED).
  - The user **cannot** turn off formulas or supplier-in-remarks.
- *Why it matters:* a feature with eight meaningful output knobs presents the user with **one** (scope), and even that only on multi-tab estimates. The product appears far less capable than it is, and users have no way to produce a client-safe vs. internal-detail variant.
- **[MEDIUM] Consolidation copy is unverifiable to the user.** The header promises "consolidates identical items across rooms/areas within each tab" (`ProposalExportPreviewDialog.tsx:83`). The preview's flat list gives no before/after, no count of "merged from N source rows" per row, so the user can't confirm consolidation did the right thing (the data exists — `ProposalExportRow.sources[]`, `types.ts:112` — but isn't surfaced).

---

## Accessibility audit

Sibling modals in the *same file* set the bar: `ActivityHistoryModal` and `RowDetailsModal` get **Esc handlers** (`EstimateSheetContent.tsx:1139-1163`) and **focus-return to opener** via `inspectorOpenerRef`/`rowDetailsOpenerRef` (`:970,981,991`). The proposal dialog gets **none** of these.

- **[CRITICAL] No keyboard close.** There is no Escape handler for the proposal dialog anywhere (grep: the only `handleEscape` blocks are for inspector and rowDetails). The user must mouse to the tiny × (`ProposalExportPreviewDialog.tsx:119-126`). *Why it matters:* Esc-to-dismiss is a baseline modal expectation; keyboard-only users are stranded if the × isn't reachable.
- **[HIGH] No focus trap.** Nothing constrains Tab focus to the dialog. With `createPortal` to `document.body` (`:267`), Tab will walk into the page behind the overlay. *Why it matters:* keyboard/screen-reader users lose their place and can interact with obscured content.
- **[HIGH] No initial focus / no focus return.** Opening doesn't move focus into the dialog; closing doesn't restore focus to the trigger icon. (Contrast `:970` which does `requestAnimationFrame(() => inspectorOpenerRef.current?.focus())` for the other modals.) *Why it matters:* screen-reader users may not be told the dialog opened, and on close focus drops to `<body>`.
- **[MEDIUM] Overlay click does not close.** The overlay `<div role="presentation">` (`:67-71`) has **no `onClick`**. So neither Esc nor backdrop-click dismisses — only the × button. *Why it matters:* both common dismissal affordances are absent; this is unusually trap-like for a modal.
- **[LOW-positive] Some ARIA is correct.** `role="dialog"`, `aria-modal="true"`, `aria-label="Excel export preview"` (`:72-75`); scope group has `role="group"` + `aria-label` and chips use `aria-pressed` (`:135-159`); close button has `aria-label="Close preview"` (`:121`); table headers use `scope="col"` (`:208`). Good — but `aria-modal` without an actual focus trap is a promise the implementation doesn't keep.
- **[HIGH] Contrast of tiny gray text.** The most important caveats are rendered in `text-tertiary`/`text-secondary` at 8–9px (e.g. the scope disclaimer `:164`, footer `:253`, eyebrows). ASSUMPTION (token values not read here): tertiary gray at 9px is very likely below WCAG AA for small text. *Why it matters:* the truth-correcting copy is exactly the copy hardest to read.
- **[MEDIUM] Status badge is text in color only — borderline.** Stale = amber, current = emerald (`:88-94`). The text differs too ("stale…" vs "Preview current"), so it's not purely color-coded — acceptable — but the amber/emerald on light tints at 9px may be low contrast.
- **[LOW] `×` glyph as close.** Using a literal `×` character (`:125`) rather than an icon is fine since `aria-label` is present, but it's visually thin at 9px.

---

## Failure / loading / empty states

- **[HIGH] Download has no failure handling.** "Download editable XLSX" is a plain `<a href={downloadHref}>` (`ProposalExportPreviewDialog.tsx:108-118`). The browser simply navigates to the route. If the route returns:
  - **413** (estimate exceeds `PROPOSAL_EXPORT_NODE_LIMIT=1200` nodes or `PROPOSAL_EXPORT_ROW_ITEM_LIMIT=3000` row-items, `route.ts:15-16,56-67`) → JSON `{error, limits}` with `Content-Type: application/json`. The browser will **render that JSON in a new navigation or attempt to display it**, not the friendly message. The user gets a raw `{"error":"Estimate is too large…"}` blob.
  - **404** (`route.ts:112,136,163`) → raw JSON `{"error":"Estimate not found."}`.
  - **5xx** (e.g. `throw new Error("Estimate tab export mapping failed.")` `:188`, or any ExcelJS failure) → an unstyled Next.js error page.
  - *Why it matters:* the modal proudly shows a green "Preview current" badge while the **actual** download silently fails or dumps JSON. There is no spinner, no disabled-while-generating, no toast, no inline error. For large estimates this is a guaranteed bad experience, and the preview gives **no hint** that the file is over the limit (the limit is enforced only server-side; the client-built preview ignores it entirely).
  - **[MEDIUM] No "generating…" state.** Building an all-tabs workbook fetches every tab tree (`route.ts:155-160`) and serializes via ExcelJS — potentially multi-second. The `<a>` gives no progress feedback; the user may click repeatedly. ASSUMPTION: large estimates take noticeable time.
- **[HIGH] Preview build is synchronous and unguarded.** `buildProposalPreview` (`EstimateSheetContent.tsx:1064`) runs `materializeEditableEstimateTree` (a full synchronous tree walk, `editable-row-model.ts:121`) + `buildProposalExportModel` (synchronous, no async in the file) on the main thread, with **no loading state**. Opening the preview on a large tree will **block/jank the UI** with no spinner. The "model" prop is set synchronously, so the modal flips straight from closed to fully rendered (or stutters). *Why it matters:* on the estimates this feature targets (potentially up to the 1200-node limit), opening the preview can freeze the tab.
- **[MEDIUM] Empty state.** With no exportable rows, the table body shows "No Area Node rows are available for proposal export." (`:234-236`) — clear enough — **but** the Download button stays enabled (depends only on href) and the Grand total reads ₱0.00. *Why it matters:* the empty message lives inside the table while the download CTA above it still invites action.
- **[LOW] Null-model state.** If `model` is null the dialog shows "Build a preview to see the consolidated workbook rows." (`:258-261`). In practice `openProposalPreview` only opens when a model exists (`:1079-1081`), so this is mostly unreachable from the normal flow — but `Refresh` could in principle clear it. Minor.

---

## Copy review (microcopy & truthfulness)

- **[HIGH] "Read-only Excel preview" + "Download editable XLSX" implies fidelity.** The pairing strongly signals "this table = your file, just locked." Given Gaps A–C, this is **misleading**. *Why it matters:* it actively builds the wrong expectation.
- **[HIGH] "The workbook becomes editable only after XLSX download." (`:84`)** is confusing and arguably untrue-by-implication. The downloaded XLSX is editable, yes, but the phrasing suggests the *preview* is a locked version of the *same* artifact — it isn't (different columns/sheets). It also doesn't tell the user the file has formulas/sections/extra sheets. *Why it matters:* reinforces the false equivalence.
- **[MEDIUM] "This preview consolidates identical items across rooms/areas within each tab." (`:83`)** — accurate to the model, but the preview shows no evidence of consolidation, so it reads as an unverifiable promise.
- **[MEDIUM] Scope disclaimer is correct but under-weighted.** "Download includes all N estimate tabs; this preview is built from the active tab rows." (`:166`) is the single most important sentence in the modal and it's 9px tertiary gray. Recommend promoting to an inline warning adjacent to the Grand total.
- **[MEDIUM] "Industry BOQ export" eyebrow (`:80`)** is internal jargon; "Bill of Quantities (BOQ)" expansion or plainer "Spreadsheet export" would orient non-expert users.
- **[LOW] Footer counts are unexplained jargon** ("section summaries", "source rows retained for area traceability", "export notes") — see IA section.
- **[LOW] Stale badge sentence is long for a badge.** "Preview is stale. Refresh to rebuild from current sheet rows." (`:89-91`) is a sentence crammed into a `whitespace-nowrap` 9px pill (`:48`) — it will be wide and may crowd the action buttons on narrower modals.

---

## Staleness model

- Staleness = `proposalPreviewModel && proposalPreviewSignature !== currentProposalPreviewSignature` (`EstimateSheetContent.tsx:1094`).
- The signature (`createProposalPreviewSignature`, `:202-…`) hashes metadata + every node id/kind/name + every row's material/description/category/designation/unit/itemCost/editable quantity/contingency, plus `dataTabId`, `tabScopeSignature`, and `scope` (`:768-776`).
- On build, `setProposalPreviewSignature(getProposalPreviewSignature(scope))` captures the snapshot (`:1072`); `currentProposalPreviewSignature` is recomputed live via `useMemo` (`:777-780`). So **editing rows while the modal is open** changes the live signature → the badge flips to "stale" automatically. Good — the model is sound.
- **[MEDIUM] Staleness is detected but not auto-applied, and the cue is weak.** The amber badge appears but the table still shows old numbers until the user clicks **Refresh preview** (`:101,1083-1085`). The badge is 9px and sits among the action buttons. *Why it matters:* a user who edited a quantity and glances at the (stale) Grand total before downloading may trust a number that's already wrong on screen — even before the separate all-tabs problem. Consider auto-refresh, or visually de-emphasizing/blurring stale figures.
- **[LOW] Refresh doesn't refetch tabs.** Refresh rebuilds from the **client** tree only; it cannot reflect changes in *other* tabs (which aren't loaded client-side). So even after Refresh, the all-tabs download can diverge from the preview. Consistent with Gap B but worth noting the refresh button can't fully resolve it.

---

## Responsive / mobile

- Dialog: `w-[min(1360px,98vw)]` × `h-[min(900px,94vh)]` (`ProposalExportPreviewDialog.tsx:76`). The table has `min-w-[1080px]` (`:191`).
- **[MEDIUM] Unusable on narrow viewports.** On a ~380px phone, the 1080px table forces horizontal scroll inside a 98vw shell; 12 financial columns at 9–10px are effectively unreadable. The header action cluster (status sentence-badge + Refresh + Download + ×) will wrap or overflow on narrow widths. *Why it matters:* even if export is a "desktop task", the modal can be opened on mobile and degrades badly with no responsive fallback (e.g. card list, or "best viewed on desktop" affordance). ASSUMPTION: not visually verified; inferred from fixed `min-w` + tiny type.
- **[LOW] Backdrop blur cost.** `backdrop-blur-md` over a full-screen overlay (`:68`) can be expensive on low-end devices, compounding the synchronous-build jank.

---

## Prioritized UX recommendations

**P0 — Truthfulness (fix or the feature misleads users)**
1. **Make the preview match the file, or relabel it.** Either (a) render the *actual* Bid Form columns (ITEM/PARTICULARS/UNIT/QTY/MATERIAL/LABOR/COST TOTAL/LINE TOTAL/SCOPE/NOTES) including section headers/subtotals, or (b) stop calling it a "preview" and frame it as a "summary of what's included," with an explicit "Full file contains: Bid Form, Summary, Commercial Terms, Source Breakdown" sheet list. *(Addresses Gaps A & C.)*
2. **Fix the multi-tab grand total.** When scope = "All tabs," either build the preview across all tabs or replace the single-tab Grand total with the true all-tabs total (or hide the number and show "All N tabs — total shown in downloaded Summary"). Promote the scope disclaimer from 9px gray to a visible inline warning next to the total. *(Addresses Gap B.)*
3. **Handle download failure.** Replace the bare `<a>` with a fetch-driven download: show a generating spinner, catch 413/404/5xx, and render the friendly limit message inline (the route already returns structured `{error, limits}`). Disable/guard the button for empty estimates and over-limit estimates (the client can pre-check against the documented limits).

**P1 — Accessibility & control**
4. **Add Esc-to-close, focus trap, initial focus, and focus-return** to match the sibling modals (reuse the `openerRef` + `handleEscape` patterns already in `EstimateSheetContent.tsx:1139-1163,970-991`). Add overlay-click-to-close on the `role="presentation"` div.
5. **Expose export settings.** Surface at least audience (client/internal), include/exclude Source Breakdown, include excluded/zero rows — and plumb them through the route (currently it ignores settings entirely). Even a small "Options" disclosure would multiply the feature's perceived value.

**P2 — Legibility, hierarchy, copy**
6. **Raise base font size** to ≥12px for body/cells and ≥11px for labels; reserve 9–10px for true micro-labels only. Verify contrast of tertiary gray and the amber/emerald badges at the chosen size.
7. **Make Download the single dominant CTA;** demote Refresh to a quieter control (or auto-refresh on edit and drop the manual button).
8. **Label the entry point.** Give the toolbar action a visible "Export" text label (or at least ensure the tooltip is reliable) so the feature is discoverable by word, not icon-guessing.
9. **Rewrite the header copy** to set correct expectations: name the sheets, mention formulas, and drop the "becomes editable only after download" line in favor of "Download an editable, formula-driven workbook (N sheets)."

**P3**
10. **Responsive fallback** for the modal/table on narrow viewports (card layout or explicit desktop hint).
11. **Surface validation issues** ("export notes") as an expandable list, and **surface consolidation evidence** (e.g. "merged from N source rows") so users can trust the output.

---

## Coverage & assumptions

- **Coverage: ~95%** of the requested surface. Fully verified by source: modal structure/copy/ARIA; all entry-point wiring and disabled logic; column lists for preview vs. file; multi-tab vs. single-tab download paths and grand-total math; settings non-exposure; download-link failure modes; staleness computation; synchronous client build; responsive dimensions.
- **Not verified (the ~5%):** exact rendered pixel contrast of the gray tokens and badge tints (token CSS values not opened); live rendering/jank on a real large estimate (no browser run — workshop dev-auth bypass disabled per project memory); exact browser behavior when a 413/404 JSON response is hit via `<a>` navigation (inferred from `Content-Type: application/json`, not observed).
- **Assumptions are tagged ASSUMPTION inline.** No fabricated file:line references; all citations are from the files read for this audit.
