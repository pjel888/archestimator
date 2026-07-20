# Commercial-Truth Model — Canonical (from source, baseline b2a9349)

> Authoritative derivation of the canonical commercial-truth contract from current
> source. Every line below is grounded in a `file:line` reference in the working
> tree. This document does not impose a new contract; it records what the code
> already computes. Where two implementations disagree, this document records the
> canonical path as `CANONICAL` and the divergent path as `DIVERGENT` and the
> divergence is filed in `findings.json`.

## 1. Money representation

### 1.1 Canonical

- **Representation:** money is computed as **signed integer minor units** (cents),
  scale 2, derived from `Number` inputs via `Math.round` after multiplying by 100.
  No `BigInt`, no `Decimal`. Overflow past `Number.MAX_SAFE_INTEGER` is rejected.
  Source: `src/lib/estimates/estimate-row-total.ts:8-17, 107-128`.
- **Currency scale:** `ESTIMATE_CALCULATION_CURRENCY_SCALE = 2` (always 2 — every
  supported currency is treated as 2-decimal regardless of real-world JPY/KRW
  conventions). Source: `estimate-row-total.ts:9`.
- **Minor-unit factor:** `MINOR_UNIT_FACTOR = 100`. Source: `estimate-row-total.ts:11`.
- **Quantity scale:** `QUANTITY_SCALE = 1_000_000` (6 decimal places). Quantity is
  normalized to 6 dp via `Math.round(value * 1e6) / 1e6`. Source: `estimate-row-total.ts:10, 114-120`.
- **Rounding mode:** `Math.round` (round-half-away-from-zero for positives;
  symmetric negate for negatives). Source: `estimate-row-total.ts:122-128`.
- **Addition:** `checkedAdd` — refuses results that overflow `Number.MAX_SAFE_INTEGER`. Source: `estimate-row-total.ts:130-133`.
- **Default currency:** `"PHP"` when input `currency_code` is null/undefined. Source: `estimate-row-total.ts:135-138`.
- **Supported currency set:** `AUD, CAD, EUR, GBP, HKD, NZD, PHP, SGD, USD`
  (9 codes). Any other code → `unsupported_currency` failure. Source: `estimate-row-total.ts:17`.

### 1.2 Storage representation (D1)

- `estimate_row_items.unit_cost`, `misc_cost`, `quantity`, `quantity_base`,
  `quantity_contingency_amount` are **REAL** (SQLite float).
  Source: `migrations/0082_estimate_row_integrity_constraints.sql`.
- `contingency_percentage`, `adjustment_percentage` are REAL with CHECK
  constraints (0..100 and -100..100 respectively at the storage layer).
- `cost_library_items.unit_cost`, `cost_library_item_price_options.unit_cost`,
  `cost_library_item_variant_cost_entries.unit_cost` are REAL.
- `project_publications.snapshot_json.total_cost_minor_units` is **INTEGER**
  (canonical); `totalCost` is a derived REAL display field.
  Source: `src/lib/publication/snapshot.ts:594, 633-637`.
- `client_portal_issues.total_cost` is REAL NOT NULL.
- **Implication:** money is REAL at rest but INTEGER in computation. The
  canonical path casts REAL → minor-unit integers before summing and divides
  back once. Drift between INTEGER-aggregated and REAL-aggregated totals is the
  core cross-surface risk (see §6 and finding F-02).

### 1.3 Removed / historical concepts

- **Labor cost field: REMOVED from canonical calculator.** `computeEstimateRowCostParts`
  has zero references to `labor`. Source: `src/lib/estimates/estimate-row-total.ts`
  (grep `labor` returns nothing in `src/`). The historical `labor_rate`,
  `laborMinorUnits`, and labor-inclusive totals no longer exist in the
  calculator.
- **Labor persists as a residue in tests/fixtures only.** The parity fixture
  `tests/vitest/estimate-unification-oracle.fixtures.ts:135-191` still encodes
  `labor_rate`, `laborMinorUnits`, and labor-inclusive expected totals
  (e.g. `totalMinorUnits: 17_000` for a row whose canonical answer is `14_250`).
  This is filed as **F-01** (broken canonical oracle test, not a product defect).
- `scripts/benchmark-proposal-workbook.ts:100, 102` emits `laborUnitCost: 0`,
  `laborSubtotal: 0` on benchmark fixtures. HISTORICAL.

## 2. Canonical row-total formula

### 2.1 The formula (verbatim contract)

For a single estimate row, the canonical row total is computed by
`computeEstimateRowCostParts` at `src/lib/estimates/estimate-row-total.ts:199-229`:

```
material_minor   = round( quantity * material_rate * 100 )           // integer
adjustment_minor = round( (material_minor / 100) * (adjustment_pct / 100) * 100 )
misc_minor       = round( misc_cost * 100 )                          // integer
with_adjustment  = material_minor + adjustment_minor                  // integer
total_minor      = with_adjustment + misc_minor                       // integer
total            = total_minor / 100                                  // float display
```

Where each `round()` is `Math.round` after the `toMinorUnits` boundary guard,
and each addition is the `checkedAdd` overflow guard. The four minor-unit
components are rounded **independently then summed as integers** — this is the
load-bearing invariant.

### 2.2 Field resolution (`validateEstimateCalculationInput`, lines 158-196)

- `quantity` = `parseNonNegative(input.quantity)`, then `normalizeQuantity`.
  Must be ≥ 0 and a 6-dp safe integer.
- `materialRate` = `parseNonNegative(input.material_rate ?? input.unit_cost)`.
  `material_rate` is the canonical alias; `unit_cost` is the legacy/storage name.
- `miscCost` = `parseNonNegative(input.misc_cost)`. Must be ≥ 0.
- `adjustmentPercentage` = `parsePercentage(
    input.adjustment_percentage ??
      (input.quantity_base === null || input.quantity_base === undefined
        ? input.contingency_percentage
        : 0),
    -100, 1000)`.
  **The legacy `contingency_percentage` is consulted ONLY when `quantity_base`
  is absent.** When a quantity-base exists, the contingency is "baked into" the
  quantity (see §3) and the cost-line percentage is forced to 0.
- `currencyCode` = `normalizeCurrency(input.currency_code)`.

### 2.3 Per-component rounding — the load-bearing invariant

The formula rounds each component (`material`, `adjustment`, `misc`) to minor
units **before** summing. A naive `quantity * rate + misc + adjustment` float
computation produces a different result whenever a component lands on a
half-cent boundary. The canonical path guarantees deterministic centavo-exact
totals regardless of float representation. This is what makes the canonical
oracle **the** truth.

## 3. Quantity and contingency truth

Two coexisting models in the data shape:

### 3.1 Legacy model (single quantity + scalar `contingency_percentage`)

- Row carries `quantity` and a cost-line `contingency_percentage`.
- The percentage is treated as a **cost-line adjustment** on the row subtotal.
- Used when `quantity_base IS NULL`.

### 3.2 Quantity-contingency model (`quantity_base` + `quantity_contingency_amount`)

- Row carries `quantity_base` and `quantity_contingency_amount`.
- **Invariant (`validateQuantityContingency`, lines 140-155):** final `quantity`
  MUST equal `max(0, base + contingency_amount)`, else
  `invalid_calculation_input`. This is the only place the relationship is
  enforced.
- The contingency is encoded **in the quantity** (a bigger quantity), so the
  cost-line `contingency_percentage` is **forced to 0** in the canonical formula
  (see §2.2).
- The displayed `contingencyPercentage` for these rows is a UI-computed display
  value: `(contingency_amount / base) * 100` (source:
  `estimate-tree-read-repository.ts:480-482`, `editable-row-model.ts:51-55`),
  NOT a stored cost-line percentage.

### 3.3 Mode switching, clearing, and stale optimistic state

- Switching from legacy to quantity-contingency requires the client to recompute
  `quantity = base + amount`. The UI does this; the server enforces it.
- Clearing to zero is explicit: `quantity_base = null` returns to legacy mode.
- Stale optimistic responses are protected by `editable-row-store.ts` protected
  draft phases (`isProtectedDraft` lines 142-149): the optimistic draft wins
  over the server response until the local commit settles.

## 4. Rate and component-cost truth

- **Selected unit cost:** `material_rate ?? unit_cost` (canonical alias, §2.2).
- **Misc cost:** `misc_cost`, validated `>= 0` (canonical line 174).
- **No tax/VAT at the row level.** VAT is a proposal-level charge only
  (`applyProposalCharges`, lines 245-264), computed on
  `(direct + proposal_contingency)`.
- **No labor cost in the canonical path.** Removed. (See §1.3, F-01.)
- **Selected variant:** the chosen price option's `unitCost` and `miscCost`
  are denormalized onto `EstimateRowItem.unitCost`/`miscCost` by the read
  projection. The canonical formula reads the denormalized scalar, not the
  option list. See §5.
- **Pricing provenance:** `estimate_row_items.pricing_provenance_origin` ∈
  `recorded, inherited_snapshot, synthesized_fallback, missing` records where
  the unit cost came from. Not used by the formula; used by health/audit UI.
- **Supplier/brand identity:** `supplier` (free text) and `supplier_id`
  (FK to `component_suppliers`) are stored but not used by the formula. They
  surface in the Source Breakdown sheet (internal audience only).

## 5. Variant and alternate preservation

### 5.1 Data shape

- `ComponentPriceOption` (`src/lib/estimates/types.ts:49-84`): `id, label, unit,
  unitCost, miscCost, currency, isActive, isDefault`, plus optional `sku`,
  `variantDescription`, `variantSortOrder`, `packageQuantity`, dimensions, mass,
  images, `attachments`, `costEntries: ComponentVariantCostEntry[]`,
  `activeCostEntryId`.
- `EstimateRowItem` carries the denormalized scalar cost set PLUS a hydrated
  `priceOptions?: ComponentPriceOption[]` and `priceOptionId?`,
  `priceOptionLabel?`.

### 5.2 Invariants

- **Exactly-one-active-default at project scope:** enforced in
  `src/lib/estimates/d1-intents/rows.ts:1404-1410` — counts defaults among
  active options; throws if the count is not 1.
- **Exactly-one-default at library scope:** enforced in
  `src/lib/component-library/component-mutation-d1.ts:1024-1035` — when a price
  option with `isDefault=true` is upserted, all sibling options are forced
  `is_default=0`.
- **At-least-one-active:** enforced at sync time in
  `component-mutation-d1.ts:1567-1572` — throws
  `"At least one active component variant is required."` if none.
- **Tabs:** similar exactly-one-default invariant, separate code path
  (`d1-intents/tabs.ts:217-410`).

### 5.3 Selected-variant resolution and deletion guard

- Library list projection (`component-library-repository.ts:635`):
  `priceOptions.find(o => o.isDefault && o.isActive) ?? priceOptions.find(o => o.isActive)`.
- Sync plan (`component-mutation-d1.ts:1567-1588`): falls back to
  `defaultPriceOptionId ?? isDefault ?? activeOptions[0]`; if the selected
  option is missing/removed, requires an explicit
  `removedPriceOptionReplacements[id]`; throws if a deleted variant is
  replaced with itself.
- **This invariant repair surface is owned by Quality Master UNIT-001** (variant
  disappearance on linked template rows). Cross-reference, do not duplicate.

### 5.4 Variant in client output

- The XLSX Bid Form has **no variant column**. The selected variant's
  denormalized `unitCost`/`miscCost` flow into the LINE TOTAL formula; the
  option list and alternates are not emitted. (MVP UNIT-006 owns adding an
  alternates column to BOQ export.)
- Publication snapshot stores the selected variant anchors
  (`componentAnchor`, `variantAnchor`, `variantLabel`,
  `componentVersionNumber`) on each row (`publication/types.ts`) but does not
  store the full option list.

## 6. Aggregation rules

| Surface | Function | Path | Sum mode |
|---|---|---|---|
| Canonical (per-row) | `computeEstimateRowCostParts` | `estimate-row-total.ts:199-229` | integer minor (per component, then sum) |
| Canonical (aggregate, test-only) | `computeEstimateTotals` | `estimate-row-total.ts:266-306` | integer minor sum |
| Publication snapshot estimate total | `sumMinorUnits` | `publication/snapshot.ts:234-241, 579, 633` | integer minor sum |
| Publication snapshot tab total | `buildSnapshotEstimateTab` | `snapshot.ts:507` | integer minor sum |
| Client Portal summary | `totalMinorUnits`, `estimateMinorUnits` | `client-portal/financial-sections.ts:51-69` | integer minor (with float fallback) |
| **Client Portal browser branch** | `buildClientPortalEstimateBrowserBranches` | `client-portal/estimate-browser.ts:117-157` | **FLOAT sum of `row.rowTotal`** |
| **Share tree branch** | `reconstructShareTree` | `share/reconstruct-share-tree.ts:71,116,155,304,324` | **FLOAT sum of `row.rowTotal`** |
| **Share donut** | `aggregateShareChartBuckets` | `share/aggregate-share-chart-buckets.ts:29,41` | **FLOAT sum** |
| **Sheet UI node total** | `computeNodeTotal`, `computeNodeTotals` | `editable-row-model.ts:396-424` | **FLOAT sum of `totalItemCosts`** |
| **Read-repo node total** | `computeTotals` | `estimate-tree-read-repository.ts:629-635` | **FLOAT sum** |
| **Estimate list / dashboard** | `computeEstimateRowLineTotal` | `estimate-row-total.ts:309-318` | **FLOAT, single row** |
| **Estimate list aggregate** | per-call sum of `computeEstimateRowLineTotal` | `workspace-repository.ts:3200`, `project-estimate-sheets-repository.ts:221`, `d1-intents/estimate-records.ts:332` | **FLOAT sum** |
| **Project charts** | `calculateProjectChartRowCostParts` | `aggregate-project-charts.ts:134-161` | canonical per-row, FLOAT aggregate |
| Proposal export row | `normalizeSourceRow` | `build-proposal-export-model.ts:96-122` | canonical per-row |
| Proposal export section/total | `buildTotals` | `build-proposal-export-model.ts:311-336` | FLOAT sum with `roundMoney` after each add |
| AI Copilot budget | `buildPackageBudgetSummary` | `ai/package-builder/schemas.ts:1423-1450` | **FLOAT, contingency-only** |
| Estimate health "amount" | `EstimateHealthRowFact.amount` | `estimate-health-repository.ts:135` | **FLOAT, omits contingency + adjustment** |

**Aggregate drift is the central cross-surface risk.** The canonical surfaces
(publication, XLSX, client-portal summary) use integer minor sums; the UI,
share tree, charts, and estimate list use float sums. On any estimate where
≥1 row's canonical minor has a half-cent residual, the float-aggregated totals
can drift by 1..N centavos from the canonical aggregate. The G19 golden case
proves a 1-centavo display divergence on a 3-row fixture.

## 7. Source-of-truth precedence

From most-volatile to most-durable:

1. **UI draft / optimistic editable row** (`editable-row-store.ts`) — the
   in-memory Zustand store. Wins over server truth while a draft is protected
   (`isProtectedDraft`).
2. **Optimistic mutation response** — returned by the server action before the
   next read.
3. **Server action input** (`actions.ts`, no Zod schema — inline TS types +
   `assertValidEstimateRowCalculationInput`).
4. **D1 intent repository** (`d1-intents/rows.ts` etc.) — the write path,
   guarded by `row_revision`, idempotency receipt, and `component impact
   fingerprint`.
5. **D1 persisted row** (`estimate_row_items`) — REAL storage.
6. **Read projection** (`estimate-tree-read-repository.ts:toUiRow`) — produces
   the `EstimateRowItem` consumed by the UI. Uses the float Variant C formula.
7. **Snapshot/export model** (`publication/snapshot.ts`,
   `build-proposal-export-model.ts`) — re-derives from source rows via the
   canonical Variant A formula; carries both `rowTotal` and
   `rowTotalMinorUnits`.

**The canonical truth for any client-facing artifact is the snapshot/export
model's `rowTotalMinorUnits`.** The UI's float `totalItemCosts` is a fast-path
display value that is reconciled to canonical on the next user interaction.

## 8. Commercial versioning

- **Estimate events:** `estimate_sheet_events` (append-only journal). Each
  estimate mutation inserts one event with `total_delta REAL`, `old_snapshot`,
  `new_snapshot`, `correlation_id` (idempotency key).
- **Library item versions:** `cost_library_item_versions` (immutable via app
  pattern, `UNIQUE(item_id, version_number)`, `snapshot_json`). Each component
  edit bumps `current_version_number` and inserts a new version row.
- **Library price history:** `cost_library_item_price_history`
  (`UNIQUE(item_id, operation_key)`).
- **Template versions:** `estimate_template_versions` (immutable via BEFORE
  UPDATE trigger `template_version_immutable`, `UNIQUE(template_id,
  version_number)`).
- **Linked template instances:** `estimate_template_instances` carry
  `applied_version_number`/`target_version_number`; propagation is async via
  `estimate_template_propagation_jobs` with lease + retry semantics.
- **Publication snapshots:** `project_publications.snapshot_json` is frozen at
  publish time. Editing estimates after publish bumps
  `projects.publication_source_revision`; the share page surfaces
  `staleSnapshotWarning`. Re-publish creates a new row with a new
  `snapshot_version` and revokes the old.

## 9. Export semantics

### 9.1 Working document vs issued/immutable record

- The workshop UI, project charts, and estimate list operate on **live** rows.
- The publication snapshot and the issued XLSX are **immutable records** of the
  estimate at a point in time.
- The XLSX download is regenerated on each request from current DB state (not
  from a stored artifact); `proposalPreviewSignature` blocks the download
  button if there are unsaved edits.

### 9.2 Formulas vs values (XLSX)

- Default: `includeFormulas = true` (`settings.ts:12`).
- LINE TOTAL formula: `IF(OR(scope in [excluded...]), 0, ROUND(qty*material,2) + adj + misc)`.
- Cached value is always written alongside the formula.
- `fullCalcOnLoad="1"` is set workbook-wide.
- **Parity holds today** because `round(qty*material*100) === ROUND(qty*material,2)*100`. This is documented but not contract-enforced (filed as F-08 latent risk).

### 9.3 Selected tab(s)

- Single-tab export: one Bid Form for the chosen tab.
- All-tabs export: one Bid Form per tab; tabbed summary aggregates per-tab
  grand totals.

### 9.4 Contractor identity and terms

- Bidder/Contractor defaults to workspace name (`route.ts:241`). No contractor
  profile lookup is wired. (MVP UNIT-010 owns adding this.)
- Commercial Terms sheet uses literal placeholder text ("To be confirmed…").
  (MVP UNIT-010 owns binding these.)

### 9.5 Variant labeling

- No variant column on the XLSX. The selected variant's cost is baked into the
  LINE TOTAL. (MVP UNIT-006 owns adding variant labels.)

---

## Summary verdict

The canonical commercial-truth contract is **well-defined, deterministic, and
centavo-exact** via `computeEstimateRowCostParts`. The canonical path is the
single source of truth for publication snapshots, XLSX export, proposal
preview, and the live UI editable row model.

**The audit's central finding is not that the canonical contract is wrong — it
is that the canonical contract is applied inconsistently across surfaces.** The
float-only legacy paths (estimate list, dashboard, share tree, project charts
aggregator, AI Copilot, estimate health) and the canonical paths produce
different totals for the same input on centavo-boundary rows. Sixteen distinct
cross-implementation divergences are catalogued in
`artifacts/data-invariant-matrix.csv` and filed individually in `findings.json`.
