# Quantity + Adjustment Improvement

Date: 2026-06-26
Status: planning package; **no application code, tests, migrations, or schemas were modified**.
Branch at authoring: `feat/publisher-page` (concurrent work in flight — this plan writes only inside its own folder).

## Requested scope

Re-architect the QTY, ADJUSTMENT, and SUBTOTAL columns of the estimate sheet (`EstimateSheetContent` / `EstimateSheetBranch` / `EstimateRowItemsTable`) so that:

1. The existing per-row **ADJUSTMENT** column is moved to sit immediately **right of QTY** (it currently sits to the right of SUBTOTAL) and is renamed to **CONTINGENCY**. It is rebound from SUBTOTAL to QTY: its meaning becomes "extra quantity added on top of the base quantity," expressed both as an absolute amount and as a percentage of the base quantity.
2. A NEW percentage-based **ADJUSTMENT** (with contingency/discount mode, like the existing one) is added in the **totals area below the row table** and is bound to SUBTOTAL. If a separate surplus-row workstream later lands, this Adjustment row moves directly after it without changing the math.
3. The QTY cell accepts an inline expression syntax **`<base> + <contingency>`** (e.g. `100 + 20`). The contingency portion is reflected as a percentage in the renamed CONTINGENCY column, and the QTY cell displays the **total** (base + contingency). A small **editable breakdown chip** in the upper-right of the QTY cell shows the split (`100 + 20`) and lets the user edit either part independently.
4. The chip and the split are **opt-in**: a plain numeric entry (no `+`) leaves the row in legacy single-quantity mode with no chip.

## Primary decisions

- **QTY cell switches from `type="number"` to `type="text"` + `inputMode="decimal"`** so it can accept the `+` character. A new pure parser `parseQuantityExpression()` owns the grammar.
- **Per-row CONTINGENCY column is display-derived from the QTY expression** once a chip exists. Direct percentage entry is allowed only on a plain row with no chip, where it creates the initial `+N` quantity add-on.
- **Per-row CONTINGENCY loses the discount mode toggle** (the user said "renamed to contingency because that's all it will be"). Discount lives only in the new totals-area ADJUSTMENT row.
- **Surplus row does not yet exist in source** (verified — see `03_SOURCE_AND_CODEBASE_AUDIT.md`). This is no longer a blocker: the new Adjustment row ships in the totals area first, and a future surplus row can be inserted above it.
- **`EstimateRowItem` gains two additive, nullable columns**: `quantityBase`, `quantityContingencyAmount` (both `numeric(14,4)`). Existing `quantity` remains the persisted total. Existing `contingencyPercentage` remains a legacy subtotal-adjustment field only while `quantityBase IS NULL`; new quantity-contingency rows treat the displayed percentage as derived from `quantityContingencyAmount / quantityBase`. The new totals-area Adjustment is stored separately at estimate level.

## Implementation North Star

A user types `100 + 20` in a QTY cell. The cell still shows `120`, a small chip in its upper-right reads `100 + 20` and is editable, the next column (now **Contingency**) reads `20%`, and the subtotal updates to `120 × unitCost`. In the totals area below the row table, a separate **Adjustment** row with `contingency | discount` modes applies a percentage to the subtotal. Plain `100` entries remain unchanged: no chip, no split, no percentage.

## Document index

- `00_AGENT_COORDINATION.md` — master `/goal`, agent ledger, skills inventory, concurrency safety.
- `01_EXECUTIVE_SUMMARY.md` — recommendation in one page.
- `02_FEATURE_BRIEF_AND_SCOPE.md` — product scope, non-goals, scenarios.
- `03_SOURCE_AND_CODEBASE_AUDIT.md` — verbatim code evidence and affected seams.
- `04_REQUIREMENTS_SPECIFICATION.md` — FR / UX / A11Y / ARCH / DATA / API / SEC / PERF / REL / TEST / DOC requirements.
- `05_UX_UI_ACCESSIBILITY_PLAN.md` — chip UX, keyboard map, screen-reader semantics, focus, responsive.
- `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` — column model change, parser, types, sync flow.
- `07_DATA_DATABASE_API_NETWORK_PLAN.md` — migration, RPC, server action, broadcast, Excel export.
- `08_SECURITY_PRIVACY_THREAT_MODEL.md` — input validation, injection, authorization.
- `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` — rerender scope, parse cost, rollback.
- `10_BLAST_RADIUS_AND_DEPENDENCIES.md` — files, tests, dependents.
- `11_IMPLEMENTATION_PLAN.md` — phased, dependency-aware tasks with IDs and file paths.
- `12_TEST_AND_VALIDATION_STRATEGY.md` — per-scenario test IDs and commands.
- `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` — rollout, feature flags, rollback.
- `14_RISK_REGISTER.md` — risks with mitigations.
- `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` — decision log with considered alternatives.
- `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` — requirement → task → test → evidence.
- `17_FINAL_READINESS_REVIEW.md` — readiness scores and residual items.
- `LOOP_LEDGER.md` — planning loop evidence.

## Authority and boundaries

- Authoritative planning directive for this improvement pass: `.ai/08_prompts/000_Planning Prompts/Improve-Plan-Prompt.md`.
- Repository entry points read: `AGENTS.md`, `.ai/AGENTS.md`, `.ai/README.md`, `.ai/03_plans/README.md`, `.ai/03_plans/2026-06-26-Reorganize-Existing-Estimate-Row-Items/` (sister plan).
- Standing database mandate (`AGENTS.md`): Philip authorizes Archestimator Supabase project `ebxxqidacheyapmmzavr` schema changes without per-change approval. Migrations proposed by this plan are in-scope for a later implementation pass.
- No application code, tests, migrations, schemas, Storybook stories, or provider state were modified by this plan pack. All writes were confined to this folder.
