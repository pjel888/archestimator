# Source And Codebase Audit

## Audit Boundary

This audit is grounded at git revision
`081a0757a9d7f34e75342a18e353f3014403de1e` and current uncommitted source as
observed on 2026-07-10. It covers estimate analytics, project analytical inputs,
component price governance, activity-history integration, and their tests. It
does not treat hosted/provider state as proven.

## Source Ledger

| ID | Source/location | Authority and freshness | Inspected fact | Contradiction or inference | Affected IDs |
|---|---|---|---|---|---|
| SRC-001 | `.ai/02_audits/archestimator_beta_readiness_audit_2026-07-10.md` and current source anchors below | Current audit input, verified against local files | Defines BETA-P1-01/02/03/08/10 and the expected health rules | Audit is directionally correct; its price-governance wording must be narrowed because provenance UI already exists | REQ-001, REQ-002, REQ-003, DATA-001, UX-001, PERF-001, REQ-004, OPS-001 |
| SRC-002 | `src/components/workshop/library/source-trust-model.ts`, `src/lib/repositories/component-library-repository.ts`, `migrations/0028_component_library_action_support.sql` | Current implementation | Source/date/confidence, lifecycle/version history, 90/180-day freshness, trust chips, and template dependency health exist | Source/date fields exist, but a durable pre-fallback origin marker, policy ownership, and estimate integration are absent | DATA-002, REQ-001, REQ-002 |
| SRC-003 | `../Activity-History-Mapping/` and current estimate event/history code | Current neighboring plan and current implementation | Activity normalization/restoration is separately owned; row revisions and estimate events exist | Revision analytics must consume a stable adapter and serialize shared-file edits | REQ-003, REQ-004 |
| SRC-004 | `src/lib/repositories/project-data-repository.ts`, `src/lib/project-charts/*`, `src/components/workshop/project-data/*` | Current implementation | Data route exposes sheet totals, row counts, currency, charts, truncation, and comparisons | No canonical health issue DTO, rule engine, risk table, or row-query drill-through is present | REQ-001, REQ-002, UX-001, PERF-001 |

## Existing Assets To Preserve

### Estimate calculation and tree

- `src/lib/estimates/estimate-row-total.ts` supplies the existing JS line-total
  oracle for list aggregation and D1 parity.
- `src/components/workshop/estimate-sheet/rows/editable-row-model.ts` computes
  editable row and node totals.
- The Estimate Sheet Tree work is implemented and heavily tested. This pack does
  not change tree ownership or row-mutation semantics.

### Project data and charts

- `getProjectDataRouteSummary` in
  `src/lib/repositories/project-data-repository.ts` loads estimates, totals,
  row counts, selected comparisons, grouping mode, chart series, truncation, and
  a single/mixed-currency rollup.
- `src/lib/repositories/project-charts-repository.ts` and
  `src/lib/project-charts/aggregate-project-charts.ts` already provide category,
  supplier, and space composition plus comparison helpers.
- `CostComparisonBoard.tsx` exposes baseline deltas and clearly disables them for
  mixed currencies.
- Tests under `tests/vitest/project-charts-*.test.*` and
  `tests/vitest/project-data-*.test.*` form the characterization base.

### Budget presentation

- `migrations/0017_estimate_sheet_summary_fields.sql` adds
  `estimates.project_budget`.
- `ProjectTotalHeader` presents empty, missing, under-budget, and over-budget
  states; `tests/vitest/project-total-header.test.tsx` verifies them.
- This is a per-estimate display contract. It does not supply project-level
  target budget, budget basis date, or a repository health DTO.

### Component price provenance

- `migrations/0028_component_library_action_support.sql` adds pricing source/date
  and variant cost-entry history with confidence and source URL.
- `component-library-repository.ts` exposes source, date, confidence,
  current price option, current version, lifecycle state, and overview health.
- `component-library-repository.ts:496-497` also synthesizes display values when
  recorded provenance is absent: pricing date falls back to component
  `created_at`, and source falls back to supplier name or `Component library`.
  `src/lib/estimates/actions.ts:1287-1308` then persists those normalized values
  into the estimate-row source snapshot without preserving whether they were
  recorded or synthesized.
- `source-trust-model.ts` defines `COMPONENT_FACET_STALE_DAYS=90` and
  `COMPONENT_FACET_VERY_STALE_DAYS=180`, classifies missing/stale/very-stale,
  and supplies commit trust gates.
- `library-source-trust.test.ts` verifies those current behaviors.

These facts make a broad "add provenance" project stale, but they also expose a
truth gap: a plausible fallback label/date must not satisfy provenance or
freshness. The implementation must preserve display compatibility, replace only
duplicated policy ownership, and retain evidence origin explicitly.

## Current Data Model

### Projects

Active `projects` schema originates in
`migrations/0007_collaboration_invitations.sql` with sidecars in
`migrations/0015_publication_admin_sidecars.sql` and status in
`migrations/0039_project_status.sql`. `ProjectRow` currently has:

- identity, workspace, owner, name, code, client, location, currency, status;
- generic JSON metadata; and
- timestamps.

`createProjectRecord` in `src/lib/projects/actions.ts` writes only name, client,
location, code, currency, and an empty metadata object. The following analytical
inputs are absent as typed columns and absent from create/edit contracts:

- project type;
- gross floor area and unit;
- project phase;
- market region;
- target budget and budget basis date;
- procurement status.

### Price policy

`workspaces` has no metadata/settings column. The only current policy is the
fixed 90-day overview/source-trust constant, with an additional 180-day UI tier.
There is no workspace default row, category override, policy revision, or
validated repository contract.

### Estimate facts

Rows already expose the facts required for deterministic Beta health:

- quantity, base quantity, quantity contingency, unit and unit cost;
- misc cost and adjustment percentage;
- pricing source/date/confidence;
- supplier/category/source component/version/link state;
- lifecycle/scope information where currently projected; and
- row revision and timestamps.

The facts live across row columns, source snapshots, and interim metadata. The
health engine must normalize at one repository boundary and reject invalid
untrusted shapes rather than spread optional-value interpretation into the UI.

## Current Control Flow

1. The Data route calls `getProjectDataRouteSummary`.
2. The repository loads project/estimate summary through
   `listProjectEstimates`, then chart series through `getProjectChartsData`.
3. `ProjectDataClient` owns URL state and passes the DTO to
   `CostComparisonBoard`.
4. The board derives display columns and chart buckets on the client.
5. No health domain module classifies rows. No canonical warning ID can be used
   as a URL filter. No repository response joins a warning to exact row IDs.

## Known-Red Baseline

| Red ID | Current failure | Proof/anchor | Required repair |
|---|---|---|---|
| RED-EST-001 | Health cockpit is absent | `ProjectDataRouteSummary` has no health field | Pure rules plus repository DTO and UI |
| RED-EST-002 | Drill-through contract is absent | No health rule/filter vocabulary in `src/lib/workshop/project-data-route-state.ts` | Stable rule/filter query schema and exact row links |
| RED-EST-003 | Revision intelligence is absent | Data route compares current totals only | Before/after decomposition over normalized events/snapshots |
| RED-EST-004 | Project analytical inputs are untyped | `ProjectRow`, create/update actions, and D1 schema omit them | Additive D1 columns, actions, repository types, validation |
| RED-EST-005 | Freshness policy is fixed and duplicated | 90/180 constants in UI and 90-day overview query | D1 policy owner plus shared evaluator |
| RED-EST-006 | Large analytics components concentrate changes | `CostComparisonBoard.tsx` combines route-level composition and presentation | Extract bounded health, risk, driver, and comparison capabilities |
| RED-EST-007 | Health query cost has no explicit budget | Existing chart path caps rows at 5,000 but health has no evaluator | One bounded fact query plus measured 5k/50k fixtures |

These are expected pre-implementation failures and must remain distinguishable
from regressions introduced by execution.

## Target Data And Domain Boundaries

### Project analytical columns

Add nullable, backward-compatible columns to `projects`:

- `project_type TEXT`;
- `gross_floor_area REAL CHECK (gross_floor_area IS NULL OR gross_floor_area >= 0)`;
- `floor_area_unit TEXT CHECK (floor_area_unit IS NULL OR floor_area_unit IN ('sqm','sqft'))`;
- `project_phase TEXT`;
- `market_region TEXT`;
- `target_budget REAL CHECK (target_budget IS NULL OR target_budget >= 0)`;
- `budget_basis_date TEXT` with application ISO-date validation; and
- `procurement_status TEXT`.

Values are nullable so existing projects migrate without invented facts.
Application types use closed enums for phase/procurement only after the executor
confirms the existing product vocabulary; unknown legacy values are represented
as explicit `other`, never silently discarded.

### Price freshness policy

Create `workspace_price_freshness_policies` rather than hiding policy in JSON:

- workspace ID and optional category node ID;
- stale and very-stale day thresholds;
- revision integer, actor, and timestamps;
- one default row per workspace and at most one row per workspace/category;
- constraints `stale_days > 0` and `very_stale_days > stale_days`.

Default behavior remains 90/180 when no row exists. This preserves current UI
behavior while making the policy queryable, testable, and configurable.

### Canonical health result

The pure engine returns:

- `EstimateHealthSummary`: grade, warning/error counts, priced/provenance/fresh
  ratios, budget state, total, row count, and evaluated policy revision;
- `EstimateHealthIssue`: stable rule ID, severity, message key, estimate ID,
  row IDs, count, amount impact, and drill-through filter;
- `EstimateCostDriver`: row/category/supplier driver with amount and share;
- `EstimateRevisionDelta`: total, quantity, rate, adjustment, misc, scope, and
  residual deltas with source event/snapshot references.

Normalized row provenance includes
`origin: recorded | inherited_snapshot | synthesized_fallback | missing`.
`recorded` means the selected price option or component row carried an explicit
source/date. `inherited_snapshot` means a previously persisted source snapshot
retains an explicit upstream origin. `synthesized_fallback` means the current
`created_at`/supplier/`Component library` compatibility fallback supplied a
display value. `missing` means no usable value exists. The repository must
capture raw nullness/origin before display normalization; a synthesized fallback
is display-only and never counts as provenance, freshness, or verified
confidence.

Origin is producer-owned durable data, not a post-load inference. The
umbrella-provisional `0052_estimate_intelligence_inputs.sql` adds nullable
`estimate_row_items.pricing_provenance_origin` with the closed enum above; new
library/component insert paths compute the origin before applying compatibility
fallbacks and persist it in both the row column and internal source snapshot.
Legacy rows with no marker remain `missing` for evidence even when their stored
source/date look plausible. Repository reads never infer `recorded` from those
normalized display values, and public publication sanitization remains unchanged.

Rule IDs are data contracts. Copy is presentation. Rules must never embed UI
phrasing or raw customer data into logs.

## Rule Baseline

| Rule ID | Condition | Severity | Drill-through |
|---|---|---|---|
| `unpriced` | Included row has `unitCost <= 0` | error | exact row IDs |
| `quantity-missing` | Included row has non-positive effective quantity | warning | exact row IDs |
| `provenance-missing` | Priced row has `missing` or `synthesized_fallback` origin, lacks an explicit source, or lacks a valid explicit pricing date | warning | exact row IDs |
| `price-stale` | Pricing date exceeds effective workspace/category stale threshold | warning | exact row IDs |
| `price-very-stale` | Pricing date exceeds effective very-stale threshold | error | exact row IDs |
| `confidence-low` | Confidence is missing or maps to low/unknown/unpriced | warning | exact row IDs |
| `source-changed` | Linked row reports source-changed state | warning | exact row IDs |
| `source-discontinued` | Source component lifecycle is discontinued/archived | error | exact row IDs |
| `budget-missing` | Neither estimate override nor project fallback budget exists | info | project/estimate settings action |
| `budget-near` | Included total is at least 90% and not above effective budget | warning | budget driver view |
| `budget-over` | Included total exceeds effective budget | error | budget driver view |

The grade is deterministic from severity and completeness; it is not an opaque
score. An error yields `needs_attention`, warnings yield `review`, no issues with
rows yields `healthy`, and zero rows yields `empty`.

## Blast Radius And Ownership

Likely direct write scope:

- one next-free migration under `migrations/`;
- `src/lib/types/database.ts`;
- `src/lib/projects/actions.ts` and project form/detail inputs;
- a new `src/lib/estimate-health/` domain boundary;
- `src/lib/repositories/project-data-repository.ts` plus a bounded health query
  helper;
- `src/lib/workshop/project-data-route-state.ts`;
- `src/components/workshop/project-data/` capability components;
- focused Vitest files.

Contended files:

- `workspace-repository.ts`, `projects/actions.ts`, database types, migrations,
  Project Data route DTO, and any Activity History adapter. The lead must lease
  these. No lane writes Activity History pack files.

## Framework And Provider Grounding Required At Execution

Before App Router or Server Action edits, the executing lane reads the relevant
installed Next.js 16 guides under `node_modules/next/dist/docs/`. Before migration
write, it re-reads `wrangler.jsonc`, generated Cloudflare types, the current
migration tail, and D1 repository helpers. Local migration proof does not prove a
hosted migration or release.
