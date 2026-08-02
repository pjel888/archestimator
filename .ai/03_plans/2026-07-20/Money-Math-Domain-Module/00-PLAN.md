# Money-Math Domain Module — Historical Predecessor Plan

> **Historical provenance only — do not execute.** This predecessor was
> superseded without implementation by
> `.ai/03_plans/2026-07-31/Code-Improvement/`, the sole current execution
> authority. Successor `DEC-AUTO-008` rejects the directory relocation and
> blanket formatter consolidation; successor `UNIT-029` absorbs only the
> confirmed external aggregate subset of UNIT-002.

## Status tuple

`NOT_READY / NOT_STARTED / NOT_EVALUATED / N/A / CANCELLED`

- **Baseline HEAD:** `b8ec0edf3a144bcb49c2b5971a168ed30aecf2ab` (2026-07-20)
- **Suite version:** `2026-07-12`
- **Profile:** `standard` (money-math domain; touches display surfaces and 4 read repositories)
- **Action ceiling:** `IMPLEMENT_LOCAL` (historical boundary only; this pack has no runnable unit)
- **Exact next unit:** none; continue only in `.ai/03_plans/2026-07-31/Code-Improvement/`

## 1. Outcome and intent

### What the 2026-07-21 money-math trace found

The canonical oracle exists: `computeEstimateRowCostParts`
(`src/lib/estimates/estimate-row-total.ts:199`) uses integer minor units +
`checkedAdd` + independent rounding of material/adjustment/misc. It is
dependency-free (no `server-only`, no D1, no React) — a pure domain function.

But it lives in `src/lib/estimates/`, which creates ARCH-08: **read
repositories import upward** into `lib/estimates/` to call the legacy wrapper
`computeEstimateRowLineTotal` (3 repos + 1 d1-intent). And four user-facing
surfaces display float-derived totals because they call the legacy wrapper
instead of the oracle:

| Surface | Feed | Impact |
|---------|------|--------|
| Estimates list "Ongoing Project Cost" | `workspace-repository.ts:3200`, `project-estimate-sheets-repository.ts:221` (legacy) | cent-level drift vs the sheet view |
| Project charts (estimate subtotals) | `project-charts-repository.ts:132` (legacy) | cent-level drift; **same chart mixes canonical buckets with legacy subtotals** |
| AI package-builder budget summary | `draft.ts:2295` (raw float, no oracle at all) | ignores quantity, adjustment, currency; divergent number reaches the persisted estimate via `apply.ts:2667` |
| History event persisted `adjustmentValue`/`contingencyValue` | `d1-intents/rows.ts:345,347` (float, same file that computes the canonical total) | float-derived values stored beside a canonical total |

Plus **11 currency formatter definitions across 11 files** (the prior audit
said "8"; it undercounted). They disagree on decimals (0 vs 2 vs no-max),
locale (`en-PH` vs `en-US`), symbol spacing, and multi-currency support. See
`references/money-math-map.md` for the full table.

### What this pack does

1. **UNIT-001:** Create `src/lib/estimates/domain/` (neutral leaf, no infra
   imports) and relocate the canonical oracle + the `quantity_base`/`contingency`
   disambiguation rule there. The legacy `computeEstimateRowLineTotal` becomes
   a thin adapter that delegates to the oracle. No callers change.
2. **UNIT-002:** Flip the 4 float-fed surfaces to the oracle. Delete the
   upward repository imports (ARCH-08 resolved) and route the AI budget through
   the oracle.
3. **UNIT-003:** Consolidate the 11 formatters into 2 (one currency formatter
   with locale + fraction-digit params; one input formatter). Migrate callers.

The pack does NOT change the canonical oracle's arithmetic, NOT change currency
policy (PHP remains the default), and NOT add multi-currency UI (the oracle
already supports it; this pack just stops hardcoding PHP where the project
already has a `currency_code`).

## 2. Task Contract

- **Objective:** relocate the oracle to a neutral leaf; route 4 float surfaces
  through it; consolidate 11 formatters into 2. Resolves ARCH-08 and the
  cent-drift display bugs.
- **Scope:** new `src/lib/estimates/domain/` module; `estimate-row-total.ts`
  (oracle source, becomes a re-export shim); the 4 float-fed callers; the 11
  formatter files; the AI budget computation in `draft.ts`.
- **Exclusions:** Pack C (D1 runtime — independent). Pack D (integrity —
  independent). Any change to the proposal-export or publication paths (they
  already use the oracle correctly). UI layout changes.
- **Authority:** `AGENTS.md`, current source, `.ai/00_system`, and
  `.ai/03_plans/2026-07-31/Code-Improvement/`; this pack is historical only.
- **Owner:** none; no unit in this predecessor is runnable.
- **Test authorization:** `NOT_REQUIRED`. The pure-math tests
  (`estimate-row-total.test.ts`, `calculation-output-parity.test.ts`) are the
  regression net and should stay green without modification.
- **Stop condition:** all three units VERIFIED; no upward repository imports
  into `lib/estimates/`; exactly 2 currency formatters; the AI budget routes
  through the oracle.

## 3. Repo conventions executors must match

- **Module placement:** the new module is `src/lib/estimates/domain/`. It is a
  leaf — no `server-only`, no D1, no React. It can be imported by Pack C
  (`d1-runtime`), Pack D (`mutation-intents`), UI, export, and read
  repositories without any upward dependency.
- **Naming:** the domain vocabulary is "estimate row cost parts", "minor
  units", "currency code". Match the existing types (`EstimateRowCostInput`,
  `EstimateRowCostParts`).
- **`server-only` guard:** the new module must NOT have it (it is imported by
  client components). The existing `estimate-row-total.ts` correctly omits it.
- **Verification:**
  - `bun run type-check`
  - `bun run lint`
  - `bunx vitest run tests/vitest/estimate-row-total.test.ts tests/vitest/calculation-output-parity.test.ts --maxWorkers=1` — the pure-math regression net

## 4. Requirements → units → evidence map

| REQ | Title | Units | Evidence |
|-----|-------|-------|----------|
| DATA-001 | Canonical oracle relocated to neutral leaf; legacy becomes adapter | UNIT-001 | EVID-001 |
| DATA-002 | All 4 float-fed surfaces route through the oracle; ARCH-08 resolved | UNIT-002 | EVID-002 |
| UX-001 | Exactly 2 currency formatters; all callers migrated | UNIT-003 | EVID-003 |

## 5. Dependency order

`UNIT-001` (relocate oracle, no caller change) → `UNIT-002` (flip the 4
surfaces) → `UNIT-003` (formatter consolidation). Strictly sequential.

## 6. Risks

- **RISK-001** (UNIT-002): flipping the estimates-list and charts surfaces to
  the oracle will change displayed totals by cents. This is the intended fix
  but may confuse users who memorized the float-derived numbers. Mitigation:
  the drift is ≤1 cent per row; document in the unit's maintenance notes.
- **RISK-002** (UNIT-002): the AI budget (`draft.ts:2295`) currently sums
  `unitCost + miscCost` ignoring quantity and adjustment. Routing it through
  the oracle will change the budget number materially (it will now reflect
  quantity × unit cost). This is correct but is a user-visible behavior change
  for the AI copilot. Mitigation: confirm with the AI-tooling owner that the
  budget SHOULD reflect quantity (it should — a budget that ignores quantity
  is wrong).
- **RISK-003** (UNIT-003): the 11 formatters disagree on purpose in some cases
  (e.g. landing page rounds to whole pesos; sheet shows 2 decimals).
  Consolidating to 2 parametric formatters must preserve the per-surface
  formatting intent via parameters, not force one shape everywhere.

## 7. Anti-scope (do NOT do)

- Do NOT change the canonical oracle's arithmetic. Relocate it; do not rewrite it.
- Do NOT add multi-currency UI. The oracle supports it; this pack stops
  hardcoding `"PHP"` where a `currency_code` exists, but does not build a
  currency-picker.
- Do NOT touch the proposal-export or publication paths (already canonical).
- Do NOT change the `quantity_base IS NULL` / `contingency_percentage`
  disambiguation rule — relocate it, do not alter it (the trace confirmed it
  is handled consistently).
- Do NOT add tests beyond confirming the pure-math suite stays green.
