# Industry-Standard Excel Proposal Export + Read-Only Preview

**Date:** 2026-05-23  
**Status:** Planning / research pack — implementation not started  
**Primary route:** `/workshop/projects/[projectId]/estimates/[nodeId]`  
**Primary user job:** Let a contractor keep estimating by room/area inside Archestimator, then preview and download an editable Excel proposal/BOQ in a contractor-standard consolidated format.

---

## Executive decision

Use **ExcelJS** for `.xlsx` generation and use the existing **TanStack Table** stack for the first read-only in-app preview.

Do **not** add a full browser spreadsheet editor for the MVP. The product requirement is not “edit Excel in the browser.” It is:

1. assemble an industry-standard proposal workbook from estimate data;
2. preview that assembled workbook safely in-app as a read-only export preview;
3. let the user refresh the preview when the estimate changes;
4. download an editable `.xlsx` file that opens normally in Excel/Numbers/Google Sheets.

The internal estimate can remain room/area-based. The export must default to **consolidated proposal rows**: if Bedroom A and Bedroom B use the same tile under the same commercial assumptions, the proposal workbook shows one combined tile line with total quantity, while source room/area quantities are preserved in an audit/breakdown sheet.

---

## Document index

| # | Document | Purpose |
|---|----------|---------|
| 01 | `01-reference-and-package-research.md` | Reference PDF findings, industry-format lessons, and npm package comparison. |
| 02 | `02-export-domain-model-and-consolidation.md` | Normalized export model, consolidation rules, workbook sheet structure, formula policy, and cost-split implications. |
| 03 | `03-preview-and-download-ux.md` | Read-only preview UX, stale/refresh behavior, user flows, empty/error states, and design constraints. |
| 04 | `04-implementation-plan.md` | Phased implementation tasks, affected files, data boundaries, migration cutlines, and acceptance criteria. |
| 05 | `05-testing-validation-risk-register.md` | TDD plan, validation gates, QA fixtures, risks, mitigations, and definition of done. |

---

## Non-goals for this plan

- Do not build a full spreadsheet editor inside Archestimator.
- Do not make the preview editable.
- Do not replace the estimate sheet with Excel-like freeform cells.
- Do not make room-by-room layout the client-facing default export.
- Do not silently mutate issued/exported proposal snapshots when the estimate or cost library changes later.
- Do not implement a broad proposal-package editor in this slice; this plan is scoped to Excel preview/download and the export model it requires.
- Do not connect new Supabase tables or migrations until Philip explicitly approves the persistence phase.

---

## Core product rule

**Estimate workspace ≠ proposal export.**

The estimate workspace is allowed to be organized by:

- lot;
- structure;
- floor/level;
- room/area;
- work zone;
- contractor working sequence.

The Excel proposal export should be organized by:

- division/trade/category;
- tag/spec code;
- item description/particulars;
- unit;
- consolidated quantity;
- material/labor unit costs;
- material/labor subtotals;
- total cost amount;
- remarks/scope status.

Room/area information remains important, but it belongs in a source breakdown/audit sheet, not as the primary client-facing BOQ shape.

---

## MVP recommendation

### Package stack

- Add: `exceljs`
- Use existing: `@tanstack/react-table`
- Optional later: `@glideapps/glide-data-grid` only if the preview needs high-volume virtualized grid behavior.

### Implementation shape

1. Create a pure transformer:
   - input: current estimate tree + project/estimate metadata + export settings;
   - output: normalized `ProposalExportModel`.

2. Create a consolidation function:
   - groups compatible area rows into proposal rows;
   - sums quantities and subtotals;
   - preserves source row/area traceability.

3. Create workbook generator:
   - input: `ProposalExportModel`;
   - output: `.xlsx` buffer/blob using ExcelJS.

4. Create read-only preview:
   - use the same `ProposalExportModel` as download;
   - render with TanStack Table and dense app styling;
   - show stale status when estimate changes after preview generation;
   - refresh on demand.

5. Create download action/route:
   - returns an editable `.xlsx` file;
   - generated from the same model as preview;
   - names file using project/estimate/sheet code/date.

---

## Required implementation discipline

Before code implementation:

1. Build in an isolated branch or worktree.
2. Read relevant Next.js 16 docs from `node_modules/next/dist/docs/` before adding route handlers/server actions.
3. If editing functions/classes/methods, run the project’s graph/impact workflow when available.
4. Use TDD for consolidation and workbook generation before UI wiring.
5. Keep preview and download driven by the same pure export model.
6. Do not add a heavy spreadsheet editor unless TanStack preview demonstrably fails.

---

## Deletion criteria if rejected

If Philip rejects this direction, the slice should be removable by deleting:

- new export domain files under `src/lib/proposal-export/` or equivalent;
- new preview components under `src/components/workshop/proposal-export/` or equivalent;
- new route handler/server action for `.xlsx` download;
- related tests;
- `exceljs` dependency if no other feature uses it.

No irreversible data migration should be part of Phase 1.