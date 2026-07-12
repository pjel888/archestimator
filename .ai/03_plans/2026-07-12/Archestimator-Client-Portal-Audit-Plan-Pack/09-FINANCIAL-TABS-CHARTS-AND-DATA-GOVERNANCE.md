# 09 — Financial Tabs, Charts, and Data Governance

## 1. Current reusable foundation

Archestimator already has two relevant financial domains:

1. The shared page computes issue totals and renders a discipline-based cost donut.
2. The project chart domain aggregates estimates by:
   - space;
   - category;
   - supplier;
   - cost composition;
   - side-by-side estimate comparison and delta.

`project-charts-repository.ts` deliberately aggregates on the server and sends buckets instead of raw unit-cost facts. This is the right public-data posture.

## 2. Financial section catalog

### Financial Summary

Default cards:

- proposal/current issue total;
- selected estimate count;
- published row count;
- planned budget if available;
- variance and percentage;
- cost per area metric if floor area is explicitly available;
- prepared/issued date;
- validity.

Optional cards:

- base/misc/adjustment composition;
- priced/unpriced count;
- stale-price count;
- incomplete-scope count.

Do not show health metrics unless their definitions are stable and client-safe.

### Cost Breakdown

Owner selects grouping:

- space/area;
- category;
- discipline;
- supplier — explicit opt-in;
- brand/product — later.

Views:

- donut;
- horizontal bars;
- hierarchy table;
- treemap later.

### Estimate Comparison

- selected left/right estimate;
- totals;
- delta;
- delta percentage;
- bucket comparison;
- side-by-side table;
- visible scope labels;
- issue date basis.

### Budget Variance

- approved/planned budget;
- current issued total;
- variance;
- threshold;
- selected estimates;
- over/under state;
- optional owner note.

Budget is not inferred. It must come from an explicit project budget field and be snapshot into the issue.

### Top Cost Drivers

- top rows or buckets by total;
- percentage of issue;
- target deep link;
- “Discuss” action;
- owner-defined maximum count.

### Revision Comparison — later/P1

- added rows;
- removed rows;
- quantity changes;
- unit-rate changes;
- total changes;
- moved/reclassified scope;
- assumption/exclusion changes.

This requires a canonical row identity/matching policy across issues.

## 3. Top-level tabs versus nested views

Example portal navigation:

```text
Overview
Financial Summary
Cost Breakdown
Comparison
Estimates
Discussion
Activity
Decision
```

Inside Estimates:

```text
Estimate A | Estimate B
  Summary | Details
  Tab 1 | Tab 2
```

Inside Cost Breakdown:

```text
By Space | By Category | By Supplier
  Chart | Table
```

The visual hierarchy and ARIA labels must distinguish these levels.

## 4. Public snapshot contract

Every financial section payload includes:

```ts
type PublicFinancialSectionEnvelope<T> = {
  schemaVersion: number;
  sectionPublicId: string;
  issuePublicId: string;
  generatedAt: string;
  currencyCode: string;
  dataBasis: string;
  rounding: {
    displayDecimals: number;
    calculationPrecision: string;
  };
  completeness: {
    complete: boolean;
    warningCode?: string;
  };
  payload: T;
};
```

The payload is generated at issue time and hashed.

## 5. Row data policy

### Every selected row must be reachable

No silent `slice(0, 250)` can be the final accessibility contract. It is acceptable to initially render 250 rows if:

- total row count is visible;
- “Load more” and “Load all” are clear;
- direct links can reach any row;
- search covers the full immutable dataset;
- print/export includes all permitted rows;
- API pagination is deterministic.

### Fields are allowlisted

A portal section's row field policy is stored and snapshotted. The public serializer selects only allowed fields.

Never pass the full private row object and hide columns with CSS.

## 6. Safe and sensitive financial dimensions

### Generally safe when explicitly selected

- project/issue total;
- estimate total;
- area/group totals;
- category/discipline totals;
- quantities and units;
- line totals;
- comparison delta;
- budget variance.

### Sensitive, opt-in

- unit rates;
- misc cost detail;
- contingency/adjustment percentages;
- supplier names;
- product/brand provenance;
- price dates;
- rate confidence;
- source references.

### Never client-visible by standard portal configuration

- internal margins;
- seller markup formulas;
- draft alternatives not selected;
- supplier negotiation notes;
- hidden cost library records;
- source-system identifiers;
- internal confidence/audit metadata that reveals private operations.

## 7. Calculation invariants

Financial payload generation must use the same canonical functions as:

- estimate editor;
- project charts;
- proposal preview;
- XLSX export;
- publication snapshot.

No chart-specific formula duplication.

Required invariants:

- finite values only;
- consistent quantity and adjustment rules;
- defined rounding only at display/export boundary;
- bucket totals reconcile to section total;
- estimate totals reconcile to issue total;
- comparison delta equals right minus left;
- hidden fields do not change total semantics;
- currency is explicit and single-currency unless a future FX policy exists.

## 8. Chart reuse strategy

Create a public snapshot adapter around the existing project chart series:

```text
Private source facts
  → canonical server aggregation
  → owner-selected safe dimensions
  → sanitized public bucket IDs/labels
  → immutable issue-section payload
  → accessible chart + table
```

Do not call `getProjectChartsData` from an anonymous public route against live project data.

## 9. Chart interaction targets

A chart can be discussed at:

- entire chart;
- bucket;
- comparison row.

A target snapshot stores:

- section;
- chart kind;
- grouping mode;
- bucket public ID;
- label;
- value;
- issue;
- related estimate IDs if permitted.

The discussion target is historical. It does not recalculate when the current draft changes.

## 10. Chart accessibility

Every chart includes:

- visible title;
- issue/data basis;
- legend;
- text summary;
- table equivalent;
- keyboard-selectable buckets where interactive;
- no color-only meaning;
- high-contrast focus;
- screen-reader label with value and percentage;
- reduced-motion behavior;
- deterministic reading order.

## 11. Performance

- generate aggregates at publish, not every public view;
- lazy-load sections;
- limit displayed buckets and preserve “Other” with drill table;
- do not ship raw row facts for charts;
- virtualize very large comparison tables;
- cache only inside authenticated owner build operations; public responses remain no-store/private according to policy;
- record payload size and generation duration;
- fail publish if a required section is truncated without explicit handling.

## 12. Source freshness

Publisher shows:

- source estimate updated after current issue;
- number of changed selected estimates;
- whether financial sections need republish;
- issue remains unchanged;
- draft preview uses current source;
- current portal shows issued data until new issue.

Do not silently update charts while estimates remain old, or vice versa.

## 13. Financial acceptance criteria

- Owner can add Financial Summary, Cost Breakdown, and Estimate Comparison as top-level sections.
- Owner can choose safe dimensions and fields.
- Public chart totals equal issue totals.
- Supplier/rate detail is absent unless explicitly selected.
- All published rows are accessible.
- Chart/table views are equivalent and accessible.
- A chart bucket can open a contextual thread.
- Source changes mark portal draft stale but do not mutate the live issue.
- Print/export uses the same issued values.
