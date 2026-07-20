# UNIT-003 — Consolidate 11 currency formatters into 2 parametric formatters

## Goal

Consolidate the 9 `formatPeso` and 2 `formatCurrency` definitions (11 total)
into 2 parametric formatters in `src/lib/estimates/domain/`. Migrate all
callers. Preserve per-surface formatting intent via parameters.

## Status

`READY` · depends on: `UNIT-001` · requirement: `UX-001` · risks: `RISK-003`

## Why this matters

The 2026-07-21 trace found 11 formatter definitions across 11 files. They
disagree: decimals (0 vs 2 vs no-max), locale (`en-PH` vs `en-US`), symbol
spacing (`.replace("₱","₱ ")` applied inconsistently), and multi-currency
support (only one is multi-currency-aware). A user sees subtly different
formatting on different surfaces. Consolidation to 2 parametric formatters
makes the formatting rule explicit and centralized.

## Current state

The 11 formatters (full table in `references/money-math-map.md`):

| # | File:line | Shape | Decimals | Locale | Multi-currency |
|---|-----------|-------|----------|--------|----------------|
| 1 | `components/workshop/ProjectEstimatesTable.tsx:301` | `pesoFormatter.format(v).replace("₱","₱ ")` | 2 | en-PH | no |
| 2 | `components/workshop/EstimateCopilotFloatingButton.tsx:192` | `copilotCurrencyFormatters` map | 0-2 | en-PH | **yes** |
| 3 | `components/workshop/ProjectTotalHeader.tsx:18` | own `pesoFormatter` + replace | 2 | en-PH | no |
| 4 | `components/workshop/estimate-sheet/activity-history-model.ts:98` | shared `pesoFormatter` (:63) + replace | 2 | en-PH | no |
| 5 | `components/landing/new-redesign/interactions/ExactEstimateWorkspace.client.tsx:83` | `` `PHP ${Math.round(v).toLocaleString("en-US")}` `` | **0 (rounds)** | **en-US** | no |
| 6 | `stories/fixtures/product-fixtures.ts:158` | en-PH currency | **0** | en-PH | no |
| 7 | `lib/estimates/estimate-tree-read-repository.ts:420` | en-PH currency | 2 (min, no max → sub-cent risk) | en-PH | no |
| 8 | `lib/activity/activity-formatters.ts:53` | en-PH currency | 2 | en-PH | no |
| 9 | `lib/repositories/component-library-repository.ts:618` | en-PH currency | 2 (min, no max → sub-cent risk) | en-PH | no |
| 10 | `lib/proposal-export/create-proposal-workbook.ts:169` (`formatCurrency`) | manual `₱${...}` / `${code} ${...}` | 2 | en-PH | **yes** |
| 11 | `components/ui/currency-input.tsx:25` (`formatCurrencyInputValue`) | number-only, no symbol | 2 | en-PH/en-US | per-locale map |

## Owned paths / resources

- `src/lib/estimates/domain/format-currency.ts` — CREATE (the 2 consolidated formatters).
- The 11 caller files — migrate.

## Implementation boundary

1. Create `src/lib/estimates/domain/format-currency.ts` with 2 formatters:

   ```ts
   export function formatCurrency(
     value: number,
     options: { currencyCode?: string; locale?: string; minimumFractionDigits?: number; maximumFractionDigits?: number; symbolSpacing?: boolean }
   ): string
   // The display formatter. Defaults: currencyCode from value context or "PHP",
   // locale "en-PH", min/max fraction digits 2, symbol-spacing true.

   export function formatCurrencyInputValue(
     value: number,
     options: { locale?: string; maximumFractionDigits?: number }
   ): string
   // The input formatter (no symbol). Defaults: locale "en-PH", max 2.
   ```

2. The display formatter handles multi-currency (uses `Intl.NumberFormat` with
   the `currency` style). The symbol-spacing rule (`.replace("₱","₱ ")`) is a
   parameter, not a per-call-site post-process.
3. Migrate each of the 11 callers to use the appropriate formatter, passing
   parameters that preserve the per-surface intent:
   - **Landing (#5):** `formatCurrency(v, { maximumFractionDigits: 0, locale: "en-US" })` — preserves the whole-peso rounded look.
   - **Stories (#6):** `formatCurrency(v, { maximumFractionDigits: 0 })`.
   - **Copilot (#2) and proposal-export (#10):** `formatCurrency(v, { currencyCode })` — multi-currency.
   - **Input (#11):** `formatCurrencyInputValue(v, { locale })`.
   - **All others (#1, #3, #4, #7, #8, #9):** `formatCurrency(v)` with defaults (2 decimals, en-PH, symbol-spaced).
4. Delete the 11 local definitions. Each caller imports from
   `@/lib/estimates/domain`.
5. The no-max-fraction-digit risk at #7 and #9 (sub-cent digits on float trash)
  is resolved by the consolidated formatter's explicit `maximumFractionDigits: 2`
   default.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Type-check | `bun run type-check` | exit 0 |
| Lint | `bun run lint` | exit 0 |
| Formatter audit | `rg "function formatPeso|const formatPeso|function formatCurrency|const formatCurrency" src/` | matches ONLY in `src/lib/estimates/domain/format-currency.ts` (and the input variant) |

## Scope

**In scope:** the new `format-currency.ts` + the 11 caller files.

**Out of scope:**
- The money-math oracle (UNIT-001/002).
- The AI budget (UNIT-002).
- Any UI layout change.

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run lint` exits 0
- [ ] The formatter audit returns matches only in the domain module
- [ ] Each of the 11 callers imports from `@/lib/estimates/domain`
- [ ] The landing page still renders whole-peso rounded totals (parameter preserved)
- [ ] The copilot and proposal-export still render multi-currency (parameter preserved)
- [ ] The input field still renders number-only (separate formatter)

## Acceptance evidence

- The formatter audit returns the expected single location.
- `git diff --stat` shows the new module + the 11 migrated callers.

## STOP conditions

- A caller's formatting intent cannot be expressed by the parametric formatter
  (e.g. it composes the currency symbol into a translation string). Surface it;
  the formatter may need an additional option, or that caller keeps a thin
  local wrapper that calls the domain formatter.
- A story fixture (#6) is shared across many stories and the format change
  breaks snapshot tests. Surface it; the fixture may need a version bump.

## Recovery

Each caller migration is independent. Revert and reconcile per caller.

## Maintenance notes

- **RISK-003:** the per-surface intent (landing rounds to whole pesos; sheet
  shows 2 decimals) is preserved via parameters, not forced uniform. A reviewer
  should walk each caller and confirm the parameter matches the prior behavior.
- After this unit, the formatting rule is centralized. New surfaces call
  `formatCurrency` with explicit parameters rather than rolling a local
  `pesoFormatter`.
- The input formatter is separate because input fields need number-only
  values (no symbol) for editing; conflating it with the display formatter
  would break the input UX.
