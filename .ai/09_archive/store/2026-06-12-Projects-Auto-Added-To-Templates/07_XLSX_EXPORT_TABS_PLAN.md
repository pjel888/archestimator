# 07 — XLSX Export Tabs Plan

**Date:** 2026-06-12 · Grounding: [01_CURRENT_STATE_AUDIT.md](01_CURRENT_STATE_AUDIT.md) §10; architecture: [02_TARGET_ARCHITECTURE.md](02_TARGET_ARCHITECTURE.md) §5.

---

## 1. Current export audit (what the change must not break)

- Route `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`: loads whole-estimate tree with limits 1200 nodes / 3000 rows (`:12-13, 46-49`), 404/413 paths (`:51-66`), buffered response, `private, no-store` (`:32-42`), filename `{project_code|name}-{sheet_code|name}-proposal.xlsx` (`filename.ts:1-14`, used `:84`).
- Workbook `createProposalWorkbook` (`src/lib/proposal-export/create-proposal-workbook.ts:383-401`) — four static worksheets in order: **"Bid Form"** (`:174`, header rows pinned, `DETAIL_HEADER_ROW = 17`, frozen `ySplit:17`, `printTitlesRow "17:17"`), **"Summary"** (`:265`, header row 14, fixed block A27–B32 `:290-302`), **"Commercial Terms"** (`:316`, static + signature block A13–B18), **"Source Breakdown"** (`:347`, gated by `includeSourceBreakdownSheet`, default true).
- Formulas: per-row `E{n}+F{n}` and `IF(OR(I{n}=…),0,D{n}*G{n}+{constants})` with contingency/misc baked as constants (`:107-110, 210-230`); section subtotal `SUM(H{a}:H{b})` (`:246`); Summary cross-sheet `'Bid Form'!H{subtotalRow}` (`:283`) — the **only** cross-worksheet reference; B27 `SUM(C15:C{last})`, B30 `B27+B28+B29` (`:292-298`). No named ranges, no hidden sheets.
- Model `buildProposalExportModel`: flattens area rows only (`build-proposal-export-model.ts:257-286`), consolidates identical items **across areas** (`:288-344`), per-section summary + totals (`:187-236`).
- **No worksheet-name sanitization/truncation/dedup exists anywhere** (verified, 01 §10).
- Preview shares the model client-side (`EstimateSheetContent.tsx:977-987`; `ProposalExportPreviewDialog`); staleness signature hashes the whole tree (`:191-221`).
- Tests pin worksheet names/order and exact cells (H19/H20/B27/B30, rows 14/15/17/19) — `tests/vitest/proposal-workbook.test.ts:92-139, 192-195`; `proposal-export-route-workbook.test.ts:123-128`; e2e scrapes rows via `workbook.eachSheet` (`e2e/workshop-project-specific-unlink-smoke.spec.ts:315-332`). `scripts/verify-hosted-export-route.ts` checks status/MIME/disposition/ZIP magic/size/cache only.
- Latent constraints: Summary fixed block collides beyond ~12 sections (`:290-302` padding loop only adds rows); currency hardcoded peso (`PHP_FORMAT` `:12`, ignores `metadata.currency`); version-label logic duplicated page vs route (`page.tsx:15-25` vs `route.ts:19-30`).

## 2. Behavior options

- **Option A — all tabs, one worksheet per tab:** every export contains every (unarchived) tab; per-tab bid-form worksheets.
- **Option B — active tab only:** export reflects the tab being viewed; param-driven.
- **Option C — all tabs + summary sheets:** A plus global Summary/Commercial Terms/Source Breakdown retained as workbook-level sheets.

**Recommended: Option C, with B available via query param, and a single-tab fast path that reproduces today's workbook exactly.** This is the prompt's preferred direction ("project/estimate workbook export, include all estimate tabs by default, one worksheet per tab for itemized data plus global summary") and the audit confirms it is the least disruptive: the existing four-sheet shape simply becomes the `tabCount === 1` case.

## 3. Recommended workbook shapes

**Single-tab estimate (every existing estimate post-backfill):** byte-shape-identical to today — `Bid Form / Summary / Commercial Terms / Source Breakdown`, same literals, same cells. All pinned tests keep passing unmodified for this case.

**Multi-tab estimate (all-tabs export):**

| Order | Worksheet | Content |
|---|---|---|
| 1 | `Summary` | global SUMMARY OF BID; one block per tab: tab name header row + that tab's section rows referencing `'{sanitized tab name}'!H{subtotal}`; grand-total block sums across tabs (B30-equivalent moves below the last block — the fixed A27 anchor is replaced by computed anchors, fixing the >12-section collision for multi-tab in passing) |
| 2..N+1 | `{sanitized tab name}` ×N | one bid-form-layout worksheet per tab, built from a **per-tab** `buildProposalExportModel` (consolidation stays within a tab — never across tabs, preserving the "consolidates across rooms/areas" meaning within one tree) |
| N+2 | `Commercial Terms` | unchanged static sheet (global) |
| N+3 | `Source Breakdown` | global, one row per consolidated source row, **plus a `Tab` column**; still gated by `includeSourceBreakdownSheet` |

Summary first (not after bid forms) so the workbook opens on the roll-up; "Bid Form" as a literal name disappears only in the multi-tab case, where each tab's worksheet carries the tab's own name — `'Bid Form'!` formula references are generated per actual worksheet name, so the formula builder takes the name as a parameter instead of the literal (`create-proposal-workbook.ts:283` refactor).

## 4. Worksheet tab naming rules (new sanitizer)

New module `src/lib/proposal-export/worksheet-name.ts`, pure + unit-tested:

1. Strip Excel-invalid characters `[ ] : * ? / \` and control chars; trim leading/trailing apostrophes and whitespace (Excel forbids edge apostrophes).
2. Collapse internal whitespace; empty result → `Tab`.
3. Reserve `History` (Excel-reserved) and the global names `Summary`, `Commercial Terms`, `Source Breakdown` — collide → dedupe step.
4. Truncate to **31 chars minus dedupe-suffix headroom** (Excel hard limit 31).
5. Dedupe case-insensitively across the workbook with ` (2)`, ` (3)`… suffixes; deterministic by tab `sort_order`.
6. Formula references quote and escape: `'{name with '' doubled}'!H{n}` — required because tab names may contain apostrophes.

Filename: unchanged builder for all-tabs export (`{project}-{sheet_code}-proposal.xlsx`); active-tab export appends the sanitized tab slug: `{project}-{sheet_code}-{tab-slug}-proposal.xlsx` via the same `buildProposalWorkbookFilename` normalization (add a third part — `filename.ts` accepts parts list today).

## 5. Route/API shape (backward compatible)

- `GET …/export/proposal.xlsx` → all tabs (existing links keep working and gain content only when users actually create more tabs).
- `GET …/export/proposal.xlsx?tab={tabId}` → that tab only, in today's exact four-sheet single-tab shape (its bid form named "Bid Form"). Unknown/archived `tabId` → 404 with a JSON body consistent with the current 404 (`route.ts:51-53`).
- No params change for existing consumers; `scripts/verify-hosted-export-route.ts` needs zero changes to keep passing (it never reads worksheet names), but **should** gain optional worksheet-name assertions (§9).
- Load limits: keep global ceilings across the whole export (sum over tabs vs 1200/3000) so the 413 contract stays meaningful (`route.ts:55-66`); per-tab exports check per-tab counts.

## 6. Preview parity

`ProposalExportPreviewDialog` gains a tab scope chip row (All tabs · per-tab) mirroring the route param; the client-side model build (`EstimateSheetContent.tsx:977-987`) runs per selected scope; staleness signature already hashes the whole tree — extend the hash input with tab list + active scope (`:191-221`). The preview's "consolidates identical items across rooms/areas" copy (`ProposalExportPreviewDialog.tsx:67`) gains "within each tab".

## 7. Existing fixed worksheets — disposition

| Worksheet | Disposition |
|---|---|
| Bid Form | becomes per-tab (named after the tab) in multi-tab exports; literal "Bid Form" retained in single-tab and `?tab=` exports |
| Summary | **global** workbook sheet (per-tab blocks inside it) |
| Commercial Terms | **global** (it consumes no model data — `create-proposal-workbook.ts:315-344`) |
| Source Breakdown | **global** with a new Tab column |

## 8. Large estimates across many tabs

- Memory: ExcelJS `writeBuffer` stays only while it meets the budget. Existing benchmark evidence is 2,500 rows ≈ 362 ms (`tests/vitest/proposal-workbook-benchmark.test.ts` + pinned docs). Phase 6 adds two gates: (1) the current single-tab fixture must stay within 10% of the existing benchmark; (2) a 5-tab × 500-row fixture must build under 1.5 s locally and produce a buffer under 10 MB. If either gate fails, use ExcelJS's streaming `WorkbookWriter` before exposing multi-tab export.
- 413 ceilings global (§5). The workbook `title` (`:389`) and per-worksheet print setup (`setPrintLayout`, `:130-146`) repeat per tab worksheet — fixed cost per tab, fine at these scales.

## 9. Test plan for export (detail merged into [09_TEST_AND_VALIDATION_PLAN.md](09_TEST_AND_VALIDATION_PLAN.md) §5)

- **Sanitizer unit tests** (new `tests/vitest/proposal-worksheet-name.test.ts`): invalid chars, 31-char truncation, dedupe determinism, reserved names, apostrophe escaping in formula refs, empty → `Tab`.
- **Workbook tests:** single-tab estimate produces today's exact four sheets (reuse existing assertions verbatim); multi-tab fixture → worksheet order/names, per-tab H-column formulas, Summary cross-sheet refs against sanitized names, Source Breakdown Tab column, hidden-sheet absence, print/frozen panes per sheet.
- **Route tests:** `?tab=` happy/404/archived; all-tabs Content-Length and ZIP-load round-trip (pattern `proposal-export-route-workbook.test.ts`); filename with tab slug.
- **Model/preview alignment:** per-tab model fixtures shared between `proposal-export-model.test.ts` and the workbook tests so preview/export assertions can't drift (the prompt's "keep proposal-preview/export model tests aligned" requirement); preview dialog test extends `proposal-export-preview.test.tsx` with scope chips.
- **ExcelJS inspection scenario (manual/QA):** download multi-tab export, verify tab strip order in Excel/Numbers, recalculate after editing a quantity (formulas remain live), check Summary links jump to the right worksheet.
- **Hosted:** `bun run launch:verify-hosted-export` unchanged as the smoke gate; optionally extend the script with `EXPECTED_WORKSHEETS` env assertion (additive) **[D]**.

## 10. Migration-window behavior

Phase ordering ([10](10_IMPLEMENTATION_PHASES.md)) puts export work after the editor and templates-panel phases only as an implementation sequence, not as a beta-release permission. **Release gate:** do not expose multi-tab creation/duplication to beta users until Phase 6 tab-aware export is complete in the same release train. During internal/dev QA, the export route may read through the compatibility wrapper (default tab) and the preview/export controls must show "Export currently includes the Main tab only" beside disabled all-tabs controls. A user-visible Phase 3 release without Phase 6 is **NOT_READY** unless tab creation remains unavailable outside internal QA.

## Evidence Used

- `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` + `filename.ts`
- `src/lib/proposal-export/create-proposal-workbook.ts` (worksheet literals, formulas, anchors, print setup)
- `src/lib/proposal-export/build-proposal-export-model.ts` (flatten/consolidate/summary)
- `src/components/workshop/EstimateSheetContent.tsx:977-987, 191-221`; `src/components/workshop/ProposalExportPreviewDialog.tsx`
- `tests/vitest/proposal-workbook.test.ts`; `proposal-export-route.test.ts`; `proposal-export-route-workbook.test.ts`; `proposal-workbook-benchmark.test.ts`; `e2e/workshop-project-specific-unlink-smoke.spec.ts:315-332`
- `scripts/verify-hosted-export-route.ts`; `scripts/benchmark-proposal-workbook.ts`
