# 02 — Export Domain Model and Consolidation Plan

**Goal:** Define the model that converts Archestimator’s room/area estimate tree into a contractor-standard Excel proposal workbook.

---

## Current data reality

Current estimate workspace data is available as nested `EstimateTreeNode[]` from:

- `src/lib/estimates/types.ts`
- `src/lib/repositories/workspace-repository.ts`
- `src/hooks/use-estimate-query.ts`

Current UI estimate row fields include:

- `id`
- `material`
- `description`
- `supplier`
- `source`
- `unit`
- `itemCost`
- `quantity`
- `subTotal`
- `miscCost`
- `totalItemCosts`
- `category`
- `categoryNodeId`
- `categoryPath`
- `supplierId`
- `discipline`
- `designation`
- `tags`
- `pricingSource`
- `pricingDate`

Current durable/domain row fields include:

- `id`
- `estimateId`
- `nodeId`
- `sortOrder`
- `sourceLibraryItemId`
- `sourceSnapshot`
- `material`
- `description`
- `supplier`
- `unit`
- `quantity`
- `unitCost`
- `miscCost`
- `discipline`
- `designation`
- `linkState`

Important limitation:

- Current row model does **not yet fully separate material unit cost from labor unit cost**.
- Current UI has `itemCost` / `unitCost` and `miscCost`.
- The reference proposal format expects material and labor unit costs/subtotals as separate proposal columns.

---

## Required export model

Create a dedicated export model instead of exporting UI component state directly.

Recommended location:

- `src/lib/proposal-export/types.ts`

Core types:

```ts
export type ProposalExportModel = {
  metadata: ProposalExportMetadata;
  settings: ProposalExportSettings;
  summaryRows: ProposalSummaryRow[];
  proposalRows: ProposalExportRow[];
  sourceBreakdownRows: ProposalSourceBreakdownRow[];
  validationIssues: ProposalExportValidationIssue[];
  generatedAt: string;
};
```

### Metadata

```ts
export type ProposalExportMetadata = {
  projectId: string;
  estimateId: string;
  projectName: string;
  projectCode?: string | null;
  projectAddress?: string | null;
  estimateName: string;
  estimateSheetCode: string;
  versionLabel: string;
  currency: "PHP" | string;
  sourceNodeId?: string | null;
};
```

### Settings

```ts
export type ProposalExportSettings = {
  audience: "client" | "internal";
  mode: "detailed-boq" | "summary-only";
  consolidationMode: "industry-standard" | "area-breakdown";
  includeSourceBreakdownSheet: boolean;
  includeFormulas: boolean;
  includeZeroRows: boolean;
  includeExcludedRows: boolean;
  showSupplierInRemarks: boolean;
};
```

Default MVP settings:

- `audience`: `client`
- `mode`: `detailed-boq`
- `consolidationMode`: `industry-standard`
- `includeSourceBreakdownSheet`: `true`
- `includeFormulas`: `true`
- `includeZeroRows`: `false`
- `includeExcludedRows`: `true` if scope statuses exist later; visible but excluded from totals.

---

## Proposal row shape

```ts
export type ProposalExportRow = {
  exportRowId: string;
  rowNumber: string;
  sectionKey: string;
  sectionLabel: string;
  tag: string;
  particulars: string;
  quantity: number;
  unit: string;
  materialUnitCost: number;
  laborUnitCost: number;
  materialSubtotal: number;
  laborSubtotal: number;
  miscSubtotal: number;
  costAmount: number;
  remarks: string;
  scopeStatus: ProposalScopeStatus;
  includedInTotal: boolean;
  sourceRowIds: string[];
  sourceAreaPaths: string[];
};
```

### Cost compatibility rule for current data

Until `materialUnitCost` and `laborUnitCost` exist separately in persisted estimate rows:

- map existing `itemCost` / `unitCost` to `materialUnitCost`;
- set `laborUnitCost` to `0` unless a future field/source snapshot provides labor rate;
- carry `miscCost` as `miscSubtotal`;
- compute `costAmount = materialSubtotal + laborSubtotal + miscSubtotal`;
- if using the strict reference columns, show misc amount in the workbook with one of these explicit strategies:
  1. preferred for MVP: add an internal `MISC / OTHER` column before `COST AMOUNT` until split-cost fields exist;
  2. alternate: fold misc into `LABOR SUBTOTAL` only if the UI labels it as labor, which it currently does not;
  3. never hide misc inside `COST AMOUNT` without a visible explanation.

Recommended MVP workbook should include a visible `MISC / OTHER` column to avoid false labor classification. Later, once labor fields exist, the exported client-facing sheet can match the reference columns exactly.

---

## Source breakdown row shape

```ts
export type ProposalSourceBreakdownRow = {
  proposalExportRowId: string;
  proposalRowNumber: string;
  sourceRowId: string;
  sourceNodeId: string;
  areaPath: string;
  material: string;
  description: string;
  quantity: number;
  unit: string;
  materialUnitCost: number;
  laborUnitCost: number;
  miscCost: number;
  lineTotal: number;
  supplier: string;
  sourceLibraryItemId?: string | null;
};
```

Purpose:

- preserve room/area traceability;
- let a contractor answer “where did this quantity come from?”;
- keep the main BOQ consolidated and professional.

---

## Consolidation algorithm

Recommended location:

- `src/lib/proposal-export/build-proposal-export-model.ts`
- `src/lib/proposal-export/consolidate-proposal-rows.ts`

### Step 1 — Flatten the estimate tree

Input: nested `EstimateTreeNode[]`.

Output: flat source rows with path context:

```ts
type FlattenedEstimateSourceRow = {
  row: EstimateRowItem;
  nodeId: string;
  areaPath: string[];
  areaName: string;
  treeSortPath: number[];
};
```

Rules:

- Only area nodes own rows.
- Group nodes provide path context only.
- Preserve current UI order for source breakdown.

### Step 2 — Normalize row economics

For each source row, derive:

- `tag`: `designation` first, then source snapshot tag/spec code later, else blank;
- `sectionKey`: category path / discipline / fallback `General`;
- `particulars`: description plus material name where needed;
- `unit`: normalized unit text;
- `materialUnitCost`: current `itemCost`/`unitCost` fallback;
- `laborUnitCost`: future field fallback `0`;
- `miscSubtotal`: current `miscCost`;
- `scopeStatus`: future structured field fallback `included`;
- `remarks`: source note, supplier, verification note, OSM/OSCI note, or blank.

### Step 3 — Build consolidation key

Rows consolidate only when all commercially meaningful fields match.

Recommended key fields:

```ts
[
  sectionKey,
  tag,
  normalizeText(particulars),
  normalizeUnit(unit),
  moneyKey(materialUnitCost),
  moneyKey(laborUnitCost),
  normalizeText(remarks),
  scopeStatus,
  includedInTotal,
  sourceLibraryItemId ?? sourceComponentId ?? "manual-compatible"
]
```

Do **not** consolidate if:

- units differ;
- material/labor unit costs differ;
- scope statuses differ;
- remarks materially differ;
- one row is included and another is excluded/by-others/OSM;
- descriptions are only superficially similar but not equal after normalization;
- supplier/source constraints make the rows commercially different.

### Step 4 — Sum quantities and subtotals

For each consolidation group:

- quantity = sum source quantities;
- material subtotal = sum source material subtotals;
- labor subtotal = sum source labor subtotals;
- misc subtotal = sum source misc costs;
- cost amount = material + labor + misc;
- source row IDs = all member rows;
- source area paths = deduplicated member paths.

### Step 5 — Assign proposal row numbers

Recommended row numbering:

- major section: `A`, `B`, `C` or numeric `1`, `2`, `3`;
- line items: `1`, `2`, `3` within the detailed estimate sheet;
- MVP can use flat numeric `1..N` sorted by section then original encounter order.

Use stable sorting:

1. section sort rank;
2. tag/designation;
3. particulars;
4. original first source tree order.

---

## Workbook sheets

Recommended Excel workbook structure:

### 1. `Proposal Summary`

Purpose:

- project/estimate identity;
- grand total;
- section totals;
- validation notes or export warnings if any.

Rows:

- Project name;
- Estimate sheet code;
- Estimate name;
- Version label;
- Generated date/time;
- Currency;
- Direct cost subtotal;
- Misc/other subtotal if present;
- Grand total.

### 2. `Detailed Estimate`

This is the main contractor BOQ sheet.

Columns for MVP:

1. `NO.`
2. `TAG`
3. `PARTICULARS`
4. `QTY`
5. `UNIT`
6. `MATERIAL UNIT COST`
7. `LABOR UNIT COST`
8. `MATERIAL SUBTOTAL`
9. `LABOR SUBTOTAL`
10. `MISC / OTHER` — MVP compatibility column while current row model has `miscCost` instead of proper labor split.
11. `COST AMOUNT`
12. `REMARKS`

Later, when cost split exists, remove or hide `MISC / OTHER` if no values exist.

### 3. `Area Breakdown`

Purpose:

- source traceability;
- room/area quantities;
- useful for internal review or dispute defense.

Default:

- include but hide, or include visible under internal/audit mode.
- For MVP, visible may be better until users understand the consolidation behavior.

Columns:

- Proposal row no.;
- Area path;
- Source row ID;
- Material;
- Description;
- Quantity;
- Unit;
- Unit cost;
- Misc cost;
- Line total;
- Supplier/source.

### 4. `Terms / Notes` — optional Phase 1.5

Purpose:

- proposal validity;
- inclusions/exclusions;
- OSM/OSCI;
- payment terms;
- duration;
- warranty.

Phase 1 can defer this if proposal terms are not yet modeled in UI.

---

## Formula policy

For downloaded Excel:

- Include formulas for subtotals and grand totals where practical.
- Also write cached numeric values if supported by ExcelJS formula result objects.
- Use number formatting for PHP currency.
- Avoid volatile formulas.
- Do not rely on formulas for source-of-truth validation inside the app; app-side totals must already be computed and tested.

Recommended formula examples:

- material subtotal: `=D{row}*F{row}`
- labor subtotal: `=D{row}*G{row}`
- cost amount: `=H{row}+I{row}+J{row}`

App-side validation should compare expected numeric totals with workbook row outputs before generating the final buffer.

---

## Snapshot and versioning implications

Exports should become stable artifacts later.

Phase 1:

- generated on demand;
- no database export record required;
- filename includes date/time or version label.

Later:

- store `ProposalExport` records;
- store `snapshotJson`;
- store `grandTotalAtExport`;
- mark if current estimate has changed since last export;
- support issued proposal immutability.

This matches `.ai/06_specs/proposal-package-system.md` and `.ai/06_specs/initial-data-model.md` without forcing the full proposal package system into the first implementation.