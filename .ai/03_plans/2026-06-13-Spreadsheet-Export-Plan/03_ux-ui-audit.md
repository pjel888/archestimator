# 03 — UX / UI Audit: Export Modal & Flow

> **What this is:** the canonical UX audit of the "Preview Excel Export" modal and the export flow. Full evidence and the complete column-by-column divergence table are in [`_research/03-ux-ui-modal.md`](_research/03-ux-ui-modal.md).
> **Method:** read-only static analysis (no browser run — workshop dev-auth bypass is disabled; behavioral claims are inferred from source and marked ASSUMPTION in the research doc). **Severity tally: CRITICAL ×3, HIGH ×6, MEDIUM ×7, LOW ×4.**

---

## Headline

The modal is visually tidy but **fundamentally dishonest about what the user will download.** It is labelled "Read-only Excel preview" / "Download editable XLSX," strongly implying *the table is the file* — but it is a **different table** (different columns, no sheets, and for the default multi-tab case, the wrong grand total). For an estimating product, a preview the client output then contradicts is the single worst outcome: it erodes trust in the numbers.

---

## The three stacked truth gaps (P0)

### UX-1 [CRITICAL] Column mismatch — the preview is not a preview
Preview shows **12 columns**: `NO · TAG · PARTICULARS · QTY · UNIT · MATERIAL UNIT COST · LABOR UNIT COST · MATERIAL SUBTOTAL · LABOR SUBTOTAL · MISC/OTHER · COST AMOUNT · REMARKS` (`ProposalExportPreviewDialog.tsx:194-207`).
The actual Bid Form has **10 different columns**: `ITEM · PARTICULARS · UNIT · QTY · MATERIAL · LABOR · COST TOTAL · LINE TOTAL · SCOPE · NOTES/REMARKS` (`create-proposal-workbook.ts:18-29`).
Divergences: QTY/UNIT order swapped; preview-only TAG and REMARKS columns; **different math** (preview "MATERIAL/LABOR SUBTOTAL" vs file "COST TOTAL"=mat+lab unit and "LINE TOTAL"=scope-aware extended amount); the file's **SCOPE** column is absent from the preview entirely; the preview shows **no section header/subtotal rows** and **no formulas**, though the file is sectioned and formula-driven.

### UX-2 [CRITICAL] Multi-tab grand total is wrong for the default action
Default scope is **"all-tabs,"** but the preview is built **client-side from the active tab only** (`EstimateSheetContent.tsx:1064-1074`), while the download spans all tabs with a combined Summary (`route.ts:154-205`). So the modal's most prominent, highest-trust number — **Grand total** — is the *single tab's* total, while the file's is much larger. The only correction is a 9px gray sentence. A user could quote a client the single-tab total believing it's the whole job.

### UX-3 [HIGH] Hidden sheets → tracked as **F-35** (P1)
The file always ships **Bid Form + Summary + Commercial Terms + Source Breakdown** (multi-tab adds a Bid Form per tab). The preview shows **none** of these. Commercial Terms contains placeholder terms ("Payment Terms: To be confirmed") and an empty signature block the user never reviewed and cannot edit before sending.
> The second-pass review found this finding was missing from the [findings register](07_findings-register.md) on the first pass. It is now **F-35 (HIGH, P1)** with a task (P1-T2/P1-T9): the modal must **name every sheet** the file contains and flag Commercial Terms as boilerplate to review before sending.

---

## Other high-severity findings

| ID | Sev | Finding | Evidence | Why it matters |
|---|---|---|---|---|
| UX-4 | HIGH | **Download is a bare `<a href>`** with no loading/error handling. On 413/404/5xx the route returns JSON, which the browser saves under the `.xlsx` name or shows as raw JSON. | `ProposalExportPreviewDialog.tsx:108-118`; route returns `{error,limits}` | Large/oversize estimates get a corrupt "spreadsheet" with no message |
| UX-5 | HIGH | **No export settings exposed.** 8 meaningful `ProposalExportSettings` knobs exist; the UI offers only the scope toggle, and the route ignores settings anyway. | `types.ts:20-29`; route always defaults | Product looks far less capable than it is; no client-safe vs internal variant |
| UX-6 | CRITICAL (a11y) | **No keyboard close, no focus trap, no focus return, no overlay-click-to-close** — although sibling modals in the *same file* implement all of these. `aria-modal="true"` without a real trap. | `ProposalExportPreviewDialog.tsx:67-71,119-126`; cf. `EstimateSheetContent.tsx:1139-1163,970-991` | Keyboard/screen-reader users are stranded |
| UX-7 | HIGH | **Preview build is synchronous on the main thread** with no loading state — full tree walk + model build on open. | `EstimateSheetContent.tsx:1064-1074` | Opening on a large tree janks/freezes the tab |
| UX-8 | HIGH | **8–10px type throughout**, including the truth-correcting caveats in tertiary gray. | `ProposalExportPreviewDialog.tsx` (pervasive `text-[8px]`/`[9px]`/`[10px]`) | The most important warnings are the hardest to read; likely sub-WCAG-AA |

**Medium/low:** discoverability (export is an unlabeled 24px icon — no visible word "Export"); button enabled for empty estimates (download still offered); "Rows" metadata is active-tab-only and excludes section rows; two competing primary actions (Refresh vs Download at equal weight); staleness detected but not auto-applied; "export notes" count shown with no way to read the notes; consolidation promised but not evidenced; modal unusable on narrow viewports (`min-w-[1080px]` table); misleading copy ("becomes editable only after XLSX download").

---

## Prioritized UX recommendations

**P0 — Truthfulness**
1. **Make the preview match the file, or relabel it.** Either render the real Bid Form columns (incl. section headers/subtotals) or stop calling it a "preview" and frame it as "summary of what's included," explicitly listing the sheets the file will contain.
2. **Fix the multi-tab grand total.** When scope = all-tabs, either build the preview across all tabs or replace the single-tab total with the true all-tabs total (or hide it: "All N tabs — total in downloaded Summary"). Promote the scope disclaimer to a visible inline warning beside the total.
3. **Handle download failure.** Replace the bare `<a>` with a fetch-driven blob download: spinner while generating, catch 413/404/5xx, render the route's structured `{error,limits}` inline. Guard the button for empty and over-limit estimates.

**P1 — Accessibility & control**
4. Add Esc-to-close, focus trap, initial focus, focus-return, and overlay-click-to-close (reuse the sibling-modal patterns already in the file).
5. **Expose export settings** (audience client/internal, include/exclude Source Breakdown, include excluded/zero rows, VAT/contingency %) — and plumb them through the route.

**P2 — Legibility, hierarchy, copy**
6. Raise base font to ≥12px body / ≥11px labels; verify contrast at the chosen size.
7. Make **Download** the single dominant CTA; demote/auto-run Refresh.
8. Give the toolbar entry a visible "Export" label.
9. Rewrite header copy to name the sheets and mention formulas; drop the "becomes editable only after download" line.

**P3**
10. Responsive fallback (card layout or desktop hint).
11. Surface validation issues ("export notes") as an expandable list; show consolidation evidence ("merged from N source rows").

**Coverage: ~95%.** Not verified: exact rendered contrast of gray tokens; live jank on a large estimate; exact browser behavior on a 413/404 JSON via `<a>` (inferred from `Content-Type: application/json`).
