# 07 — Domain & Industry Standards (Money, UOM, Concurrency, Audit, Links)

> Archestimator is a construction/architecture **estimating** SaaS. This deep-dive
> audits industry-standard domain concerns an engineering-only audit would miss.
> Source read 2026-07-12; every claim cited `file:line`.
>
> The headline finding: **all money is stored and computed as IEEE-754 double
> (`REAL`)** with no integer-cents, no Decimal library, and rounding only at the
> proposal-export boundary. For an *estimating* product this is the highest-stakes
> domain risk in the whole audit.

## 1. Money / float precision — the estimating domain bug

### Storage: REAL (float) on the live D1 path
- `cost_library_items.unit_cost REAL`, `misc_cost REAL` — `migrations/0026:48-49`
- `cost_library_item_price_options.unit_cost REAL`, `misc_cost REAL` — `0026:83-84`
- `cost_library_item_variant_cost_entries.unit_cost REAL`, `misc_cost REAL` — `0028:70-71`
- `estimate_row_items` quantity/unit_cost/misc_cost/contingency/adjustment all `REAL` — `0015:19-26`
- (Legacy Postgres used exact `numeric(14,2)` — `supabase/migrations/...`; the D1 port dropped to float. The live path routes through D1.)

### The money oracle — raw float, no rounding
`src/lib/estimates/estimate-row-total.ts:28-33` — the single source of truth for line totals:
```
const subTotal = quantity * unitCost;
return subTotal + miscCost + (subTotal * adjustmentPercentage) / 100;
```
Summed un-rounded by `sumEstimateRowLineTotals` (`:36-38`). Consumed by project-estimate list aggregation (`project-estimate-sheets-repository.ts:221`, `project-charts-repository.ts:142`), the duplicate-action persisted total (`estimates/actions.ts:2565`), and every `totalDelta` (`d1-action-client.ts:1738,2006,2092,2134,2230`).

### Client-side mirrors the float math
- `editable-row-model.ts:300,306,307,320`: `subTotal = itemCost * quantity`; `totalItemCosts: subTotal + miscCost + contingencyValue + adjustmentValue`. Node/section totals are a float `.reduce` (`:378-379`).
- `template-editor-model.ts:8-20` — identical expression for template rows.
- `template-insertion-model.ts:27-40` — identical for template→estimate insertion.

### Where rounding DOES happen (the only guards)
- **Input ingest:** `roundQuickAddMoney = Math.round(v*100)/100` (`quick-add-validation.ts:96-98`) applied to `unitCost`/`miscCost` in `normalizePriceOptionInput` (`actions.ts:768-769,782-783,810-811`). So inputs are rounded to the cent *before* storage — but every downstream multiply/sum is un-rounded.
- **Proposal export only:** `roundMoney` (`proposal-export/settings.ts:3-5,41-44`, `build-proposal-export-model.ts:43-45,313`, `create-proposal-workbook.ts:6,619,623`) — round-then-sum at each tier.

### BUG-DOM-01 [P1] — money is float; persisted totals drift between client/server/export
- **What:** No integer-cents, no Decimal.js (confirmed: `grep` package.json = none), no SQL `numeric` on D1. The persisted estimate total is `sumEstimateRowLineTotals` over REAL rows; a client-computed grand total sums pre-rounded `totalItemCosts` then adds contingency/VAT; the exported workbook re-rounds at every tier. Sum order and round points differ.
- **Impact:** On large BOQs the on-screen estimate total, the persisted/server-aggregated total, and the exported proposal workbook can differ by sub-cent to a few centavos. On a *bid document* (proposal to a client), centavo-level discrepancies are reputation-critical and can cause disputes. `misc_cost` is added un-rounded into every line total (the classic 0.1+0.2 accumulation vector).
- **Recommended surface:** pick ONE canonical money representation (integer cents `INTEGER` + scale, or a Decimal library) and round identically at every tier boundary across the JS oracle, the client model, and the SQL function. Minimum: round at the model layer (`estimate-row-total.ts`) not the render layer. This is a cross-cutting data-integrity change touching migrations + the money oracle + client models — **high blast radius**.
- **Proof class:** source inspection. `TEST_PROPOSAL`: construct a BOQ where float accumulation produces a visible discrepancy (e.g. 0.1-costing rows) between estimate total and exported proposal total.

### Display rounding inconsistency (P3)
- `row-table.tsx:181` uses `toFixed(6)` (6 decimals); `:192` `toFixed(2)` for percentages; proposal path uses `roundMoney` (`*100/100`). Pick one and apply at the model layer.

## 2. Units of measure (UOM) — captured, not enforced, not priced

### Unit list exists but is free-text at write time
- Canonical option list: `COMPONENT_UNIT_OPTIONS` (~120 entries: each/LF/SF/CF/CY/ton/kg/m/m²/m³/box/pack/roll/pallet/hr/crew-day/…) — `src/lib/component-library/unit-options.ts:8-137`.
- `unitUsesContentConversion(value)` (`unit-options.ts:200-205`) true for package-style units (`box/carton/case/pack/bundle/roll/coil/...`, `:139-167`) or custom tokens (`:168-194`).
- **No validation that `unit` is a member of `COMPONENT_UNIT_OPTIONS`** — `validateQuickAddComponentInput` (`quick-add-validation.ts:136,149,153,160`) only checks non-empty/≤32 chars/no-spreadsheet-formula. `normalizePriceOptionInput` passes `unit` straight through (`actions.ts:809`). No DB CHECK (`0026:47` `unit TEXT NOT NULL DEFAULT ''`). A user can type "whatevs" and it persists.

### BUG-DOM-02 [P2] — content conversion (`packageQuantity`) is captured but never applied to pricing
- `package_quantity`/`package_unit` are stored + read (`actions.ts:821-822`; `repository.ts:613-614`) and collected in the modal (`AddComponentModal.tsx:869,1026,1120,1353,1451,1750,2191-2193`).
- **But no pricing computation ever divides by `packageQuantity`** — grep of estimates/repositories/proposal-export shows it's referenced only in `types.ts:63` and `repository.ts:613`. A "box of 10 tiles @ ₱1000/box" is priced at ₱1000 × quantity, never ₱100/each.
- **Impact:** estimators expecting per-each derived pricing from a box price are **silently mispriced**. This is a money-correctness bug disguised as an unfinished feature. Either finish it or stop collecting the input.

### Other UOM gaps (P3)
- Mixed imperial/metric with no normalization/cross-conversion (no in→mm, sqft→sqm). `DIMENSION_UNIT_OPTIONS` (`unit-options.ts:254-262`) + `MASS_UNIT_OPTIONS` (`:264-273`) likewise free-text at write.
- Compound coverage units (`sqm/box`, `sq ft/box`, `pcs/pack`, `kg/bag`, `:118-136`) exist in the list but nothing consumes their semantics.

### BUG-DOM-03 [P2] — units never validated against the enum
Typos and "whatevs" persist; silently break any future unit-aware feature (content conversion, coverage math, unit-normalized reporting). Add enum validation at write (server action + DB CHECK).

## 3. Estimate ↔ library bidirectional link

### Forward (estimate row → library promotion) — works
`promoteExpressRowToLibraryComponent` (`src/lib/estimates/express-promotion-actions.ts:339-399`) inserts a `cost_library_items` row with `source_estimate_row_item_id = rowId` (`:367-398`; column `0026:56`, `UNIQUE(workspace_id, source_estimate_row_item_id)` `:64`) + default price option, then **back-links** the estimate row: `UPDATE estimate_row_items SET source_library_item_id = ?, link_state = 'linked-clean', row_revision = row_revision + 1, source_snapshot_json = ? ...` (`:440-451`). Idempotent via `readPromotedLibraryItem` (`:146-159,286-300`).

### Reverse (library edit/archive → estimate rows) — NOTHING propagates
- The library side **never** issues `UPDATE estimate_row_items` when a component is edited/archived/deleted (`grep "UPDATE estimate_row_items" actions.ts` = empty). Library edits mutate only `cost_library_items*`.
- The only freshness guard is **commit-time, inbound** (estimate→library), not outbound: `assertCurrentLibrarySourceForEstimateCommit` (`estimates/actions.ts:1696-1720`) throws "Library source is archived"/"…changed" if, *at the moment an estimator inserts a component into an estimate*, the library row's `lifecycle_state='archived'` or `updated_at` differs from the client-held `updatedAt` (`:1713-1718`; callers `:3314,3455,3528-3529`). This protects *new* inserts; it does nothing for rows already in estimates.
- Link-state enum: `"unlinked"|"linked-clean"|"linked-overridden"|"detached"|"source-changed"` (`estimates/types.ts:4`). Written: promotion→`linked-clean` (`:443`); insert→`linked-clean`/`unlinked` (`actions.ts:1692,3347`); edit of linked row→`linked-overridden` (`:3434`); unlink→`unlinked` (`d1-action-client.ts:2679`).
- **`source-changed` and `detached` are NEVER persisted** — they're derived client-side only (`source-trust-model.ts:297-299,428-429`). So the "Source changed" trust chip is computed from `row_revision`/snapshot heuristics, not from any server signal triggered by a library edit.

### BUG-DOM-04 [P1] — no outbound propagation when a library component is edited/archived
- **What:** editing a library component's `unit_cost` leaves every referencing estimate row at the old price with `link_state` still `linked-clean` — visually indistinguishable from a fresh link. No re-sync, no stale-pricing flag, no notification/activity-feed entry to estimate owners (activity feed is project-scoped; library events don't fan out).
- **Impact:** an estimator's committed estimate silently carries stale library pricing with no signal. This is the *estimate-side* mirror of BUG-TM-01 (template stale-link blindness) and the same root cause: no live-join to `cost_library_items` for current state, no outbound write on library mutation.
- **Recommended surface:** add either an async stale-flag write on library edit/archive, or a derived "library moved since row_revision" signal the trust model reads server-side. Persist `source-changed`/`detached` rather than deriving them client-side.
- **Note:** estimates *intentionally* freeze a price at commit time (a snapshot is correct for a locked bid); the bug is the **lack of signal**, not the freezing.

## 4. Archive lifecycle / soft-delete

### Un-archive is allowed and trivial — and bypasses the audit trail
- `changeCostLibraryComponentLifecycleState` (`actions.ts:1583-1649`) UPDATEs `lifecycle_state`/`lifecycle_state_changed_at`/`lifecycle_state_changed_by` + bumps `current_version_number` (`:1597-1610`) + writes `cost_library_item_state_history` via `INSERT OR IGNORE` (`:1611-1632`) + a version row (`:1633-1642`). Any state → any state; **no transition guard**.
- The edit modal exposes all five states as a free dropdown (`AddComponentModal.tsx:178-184`) bound to `draft.lifecycleState` (`:1854-1856`). Selecting "Available" on an archived item calls `updateCostLibraryComponent`, which sets `lifecycle_state` directly (`actions.ts:1463`) **without** writing a `state_history` row.

### BUG-DOM-05 [P1] — bulk archive has no audit trail, no version bump, no referential check
- `executeBulkArchiveLibraryComponents` (`actions.ts:1705-1764`) — its ONLY write is a single bulk UPDATE setting `lifecycle_state='archived'` + `lifecycle_state_changed_at`/`_by` + `updated_at` (`:1739-1751`). It does **NOT** bump `current_version_number`, write `state_history`, write a `versions` row, or emit telemetry. The preview (`previewBulkArchiveLibraryComponents` `:1651-1703`) only blocks not-found/already-archived (`:1678-1685`) — **no referential-integrity check** against `estimate_row_items.source_library_item_id` or `estimate_template_row_items.source_library_item_id`.
- **Impact:** archiving a component used by 200 live estimates is silent and succeeds. The most common lifecycle operation is the one with the thinnest audit trail. Combined with BUG-DOM-04, an estimator's rows silently freeze with no signal.
- **Recommended surface:** make `executeBulkArchiveLibraryComponents` call the same history/version/telemetry writes as `changeCostLibraryComponentLifecycleState`; consult `getCostLibraryComponentUsage` (`actions.ts:2844-2879`) before archiving and warn/block on in-use components.

### Hard delete
- **No hard-delete of `cost_library_items` anywhere** (`grep "DELETE FROM cost_library_items" actions.ts` = empty). Only `deleteLibraryFolder` nulls `library_folder_id` + deletes the folder row (`:1843-1856`). `lifecycle_state='archived'` is the only tombstone. Good for referential safety, but the tombstone is the single point of failure for "is this component active."

## 5. Concurrency / optimistic locking

### BUG-DOM-06 [P2] — version column bumped but never used as a guard (last-write-wins)
- `current_version_number` is read then incremented as `nextVersion = numberValue(existing.current_version_number, 1) + 1` in three update sites (`actions.ts:1446,1523,1596`).
- **Every UPDATE's WHERE clause is `WHERE id = ? AND workspace_id = ?` only** (`:1467-1468,1548-1549,1606-1607`). **No `AND current_version_number = ?`.** No row-count check after UPDATE either.
- **Consequence:** two concurrent editors both read `version=N`, both compute `N+1`, both UPDATE successfully, both attempt `INSERT OR IGNORE INTO cost_library_item_versions(... UNIQUE(item_id, version_number))` (`:991-1009`, constraint `0028:59`) → second insert silently ignored → `current_version_number` is `N+1` regardless of how many concurrent edits landed, and the version table **loses one editor's snapshot**.
- **Client-side:** `versionNumber` is read back for display only (`AddComponentModal.tsx:1399,1408,1412`; `ComponentLibraryManager.tsx:2479` — `v${versionNumber}` label). No stale detection, no "modified by someone else" path.
- **Recommended surface:** add `AND current_version_number = ?` + a row-count check (409 conflict on mismatch), or a client-side optimistic-concurrency handshake. Fix the `INSERT OR IGNORE` version-row dedup so contention doesn't lose audit rows.

## 6. Price history / audit-trail completeness

Three audit tables (`0028:92-125`): `cost_library_item_price_history`, `cost_library_item_state_history`, `cost_library_item_versions`.

| Action | price_history | state_history | versions | Notes |
|---|---|---|---|---|
| CREATE (`createCostLibraryComponent`) | **NO** (`writeHistory:false` `:1341`) | no (correct) | yes ("Component created" `:1375-1384`) | **initial price never recorded** |
| Price-option upsert (non-create) | yes (`:1146-1165`, `UNIQUE(item_id, operation_key)`) | no | yes ("Price option changed" `:1565-1574`) | OK |
| `updateCostLibraryComponent` | **NO** | **NO** | yes ("Component updated" `:1490-1499`) | **bypasses both** — can change lifecycle + price |
| `changeCostLibraryComponentLifecycleState` | no | yes (`:1611-1632`) | yes (`:1633-1642`) | OK |
| `executeBulkArchiveLibraryComponents` | **NO** | **NO** | **NO** | writes nothing (BUG-DOM-05) |

### BUG-DOM-07 [P2] — audit trail is structurally incomplete
1. **Missing initial-price record** (`writeHistory:false` on create) — "price at time of estimate" reconstruction requires the version snapshot, not the price-history table.
2. **`updateCostLibraryComponent` bypasses `price_history` AND `state_history`** even though it can change lifecycle (the modal dropdown) and is the un-archive path.
3. **Bulk archive writes nothing** (BUG-DOM-05).
4. **`change_reason` frequently defaulted** to hardcoded strings (`AddComponentModal.tsx:540,562`); bulk archive captures none.
5. **Audit tables are CASCADE-deletable + mutable** (`0028:47,68,95,112` `ON DELETE CASCADE` off `cost_library_items`; no UPDATE/DELETE trigger). If a hard-delete path is ever added, the whole trail purges with the row.
6. **`operation_key` dedup is time-based** (`:${effectiveAt}`) — two legitimate changes at the same timestamp lose one record.

**Recommended surface:** route lifecycle-affecting field changes through `changeCostLibraryComponentLifecycleState`; write `price_history` on create; make bulk archive write audit rows; add a trigger or app guard making audit tables append-only.

## 7. Telemetry / observability — blind on mutations

### What's measured
`component_library_telemetry_events` written by `d1-store.ts:64-107`; `recordComponentLibraryTelemetryEvent` (`actions.ts:475-510`) is a client-callable event sink (gated by workspace membership). Event set (`library-telemetry.ts:1-43`) is **UX/anti-abuse only**: `library_find_started/resolved/abandoned`, `quick_add_*`, `insert_target_*`, `trust_chip_*`, `authz_denied`, `idor_attempt`, `cache_bleed_detected`, `xss_attempt`, `formula_injection_detected`, `bulk_archive_hash_mismatch`.

### BUG-DOM-08 [P2] — zero domain-event telemetry on mutations
**Missing:** `component_created`, `component_updated`, `component_archived`, `component_price_changed`, `component_lifecycle_changed`, `library_component_searched`. Body-scan of `createCostLibraryComponent`, `updateCostLibraryComponent`, `changeCostLibraryComponentLifecycleState`, `executeBulkArchiveLibraryComponents`, `upsertCostLibraryComponentPriceOption` shows **zero** telemetry calls. Create/edit/archive/delete/price-change are completely blind at the telemetry layer. (Detail in `08` §3.)

## Construction taxonomy note (strategic, not a bug)
The dead `component_category_nodes` table (purged by `0037`) was likely intended for **CSI MasterFormat / Uniformat** — the standard construction cost-classification taxonomy the industry uses for organizing estimates. Its absence means the library has no standard classification system. This is a *product-strategy* gap (how estimators organize/find components), not an engineering bug — flag for the owner. The dead `*_category_node_id` columns (`02` DEAD-SCHEMA-01) are its residue.

## TOP DOMAIN RISKS (summary)
- **BUG-DOM-01 [P1]** money-as-float — persisted estimate/proposal totals drift
- **BUG-DOM-04 [P1]** no outbound propagation on library edit/archive — estimates silently stale
- **BUG-DOM-05 [P1]** bulk archive: no audit trail, no version bump, no referential check
- **BUG-DOM-02 [P2]** content conversion captured but never priced (silent mispricing)
- **BUG-DOM-03 [P2]** units never validated against the enum
- **BUG-DOM-06 [P2]** no optimistic locking; concurrent edits lose audit rows
- **BUG-DOM-07 [P2]** audit trail structurally incomplete (create/update/bulk gaps)
- **BUG-DOM-08 [P2]** zero domain-event telemetry on mutations

## 8. Construction financial compliance (VAT, retention, progress billing)

> Archestimator is a Philippines-first construction/architecture estimating SaaS.
> Philippine construction bids carry specific financial-compliance expectations:
> 12% VAT (BIR), progress billing with retention/retainage, and contingency vs
> adjustment semantics. This section audits what exists vs what the industry
> expects.

### 8.1 VAT / tax — export-only, hardcoded, not in the estimate/library surface

**What exists (proposal export only):**
- `defaultProposalExportSettings.vatRate = 12` with comment "D2: Philippine VAT 12%" (`src/lib/proposal-export/settings.ts:20`); `vatMode: "percentage"` (`:21`).
- VAT computed round-then-sum only inside the proposal workbook pipeline: `vatAmount = roundMoney((vatBase * vatRate) / 100)` when `vatMode !== "included"` (`settings.ts:43`); `grandTotalWithTaxes = directCost + projectContingency + vatAmount` (`:44`). Applied in the workbook totals block (`create-proposal-workbook.ts:413-470`: contingency row → VAT row → grand total row; `vatIncluded` mode labels "VAT (INCLUDED)" and zeroes the line, `:460-462`).

**What's missing (the gaps):**
- **No `vat_rate` / `vat_mode` column in D1.** `grep "vat_rate|vatRate|vat_mode" migrations/ src/lib/repositories/` = empty. VAT is a hardcoded default in the export settings, NOT a per-workspace or per-proposal setting. A workspace billing a zero-rated or VAT-exempt client (common for certain PH government/educational projects) cannot configure it.
- **VAT is invisible in the live estimate/library surface.** The estimator sees line totals + contingency + adjustment in the sheet, but VAT is applied only when the XLSX is exported. There's no "VAT-inclusive total" in the estimate UI, so an estimator building a bid doesn't see the tax-loaded number they're committing to until export. The money oracle (`estimate-row-total.ts:28-33`) has no tax term.
- **No VAT on component/price-option rows.** A component stored in the library has no tax-code field (vatable / zero-rated / exempt). PH BIR compliance distinguishes these; the library cannot represent them.
- **`vatMode: "included"`** exists but computes `vatAmount = 0` (`settings.ts:43`) — so an "included" bid shows a zero VAT line rather than back-calculating the VAT component from the inclusive total. For a BIR-compliant invoice that must show the VAT component even when included, this is a reporting gap.

### BUG-DOM-09 [P2] — VAT is export-only, hardcoded, not configurable, not shown in the estimate
- **What:** 12% VAT is a hardcoded default in `proposal-export/settings.ts:20`; not stored per-workspace/proposal in D1; not surfaced in the estimate/library UI; no tax-code field on components; `vatMode:"included"` zeroes the line instead of back-calculating the component.
- **Impact:** (a) a workspace cannot configure VAT for zero-rated/exempt clients; (b) estimators don't see the tax-loaded total while building the bid; (c) BIR-compliant invoices that must show the VAT component of an inclusive price can't. For a PH-first estimating product this is a real compliance/UX gap.
- **Recommended surface:** add a workspace/proposal VAT setting (rate + mode) stored in D1; show a VAT-inclusive total in the estimate UI; add a tax-code field on components; for `included` mode, back-calculate the VAT component for display.
- **Proof class:** source inspection (no `vat_*` column in migrations; no VAT term in `estimate-row-total.ts`; hardcoded default in `settings.ts`).

### 8.2 Retention / retainage / progress billing — feature does not exist

**Finding:** `grep -rln "retainage|retention_percent|progress_billing|progress_payment|payment_application|billing_schedule" src/ migrations/` (excluding the data-privacy-retention domain) = **empty**. There is **no construction retention/retainage or progress-billing feature anywhere in the codebase.** Every "retention" hit (`compliance/retention-core.ts`, `privacy-request-repository.ts`, etc.) is *data-retention* (GDPR/privacy), a completely different domain.

**Industry expectation:** Philippine construction contracts typically include:
- **Progress billing** — billing against milestones/%-complete as work proceeds (the norm for multi-month contracts; lump-sum billing at completion is rare).
- **Retention / retainage** — 10% (standard PH) withheld from each progress billing, released at handover (½) and end of defect-liability period (½). This is a legal/contractual fixture of PH construction.
- **Payment applications** — formal schedules (ASP, AIA-style) tied to the BOQ.

**Status:** Archestimator has no model for any of these. The estimate/proposal produces a single lump-sum bid total + XLSX. For a contractor using this to manage an active project, there's no way to bill progressively, track retention, or reconcile payments against the BOQ. This is a **product-scope gap**, not a bug — flag for the owner as a roadmap decision. It may be intentionally out of MVP scope (the product is "preparing for first users" per AGENTS.md), but it should be a conscious decision, not an accidental omission.

### BUG-DOM-10 [P3 / product-scope] — no retention/retainage or progress-billing model
- **What:** no feature exists for progress billing, retainage withholding, or payment-application scheduling. The estimate/proposal is lump-sum only.
- **Impact:** for PH contractors managing active projects, the product can't model the contract's payment structure. This is a competitive gap vs dedicated construction-billing tools.
- **Recommended surface:** product decision — is progress billing in MVP scope? If yes, design the model (billing schedule against BOQ nodes, retention %, release milestones). If no, document it as a known limitation for first users.
- **Proof class:** source inspection (zero hits for retainage/progress-billing terms outside data-privacy).

### 8.3 Contingency vs adjustment — two overlapping concepts with a confusing legacy bridge

**What exists:**
- Two percentage fields on estimate/template rows: `contingency_percentage` (`REAL NOT NULL DEFAULT 0`, CHECK `>= 0 AND <= 100`, `migrations/0024:56-58`, `0015:25`) and `adjustment_percentage` (`REAL`, CHECK `>= -100 AND <= 100`, `0024:60-62`, `0015:26`). So contingency is 0–100 (additive buffer) and adjustment is -100 to +100 (can discount or mark up).
- The money oracle applies **adjustment** to line totals: `return subTotal + miscCost + (subTotal * adjustmentPercentage) / 100` (`estimate-row-total.ts:33`). `contingency_percentage` is NOT applied at the row level — it feeds a legacy bridge.
- Template editor has a **legacy migration bridge**: `legacyAdjustmentPercentage = quantityBase === null ? contingencyPercentage ?? 0 : 0` (`template-editor-model.ts:10`) — i.e. if the row has no `quantity_base`, the old `contingency_percentage` is silently reinterpreted as `adjustment_percentage`. This is a one-way migration shim; rows still carrying `contingency_percentage` get folded into adjustment.
- Proposal export has a **separate, project-level contingency** (`contingencyRate: 10`, `settings.ts:19`) applied after the sheet totals: `projectContingencyAmount = roundMoney(directCost * contingencyRate / 100)` (`:41`). This is distinct from the row-level `contingency_percentage`.

**The confusion:** there are **two different "contingency" concepts** (row-level `contingency_percentage`, which the legacy bridge folds into adjustment; and project-level export `contingencyRate`) plus **adjustment_percentage**. An estimator seeing both "contingency" and "adjustment" fields with overlapping semantics cannot be confident which one applies where. The row-level contingency is effectively deprecated (folded into adjustment) but still stored and shown.

### BUG-DOM-11 [P3] — contingency vs adjustment semantics are confusing/overlapping
- **What:** two row-level percentage fields (`contingency_percentage` 0–100, `adjustment_percentage` -100..100) with a legacy bridge that reinterprets one as the other (`template-editor-model.ts:10`); plus a separate project-level export contingency (`settings.ts:19`). The money oracle only applies `adjustment_percentage` (`estimate-row-total.ts:33`); row-level `contingency_percentage` is stored but folded into adjustment via the bridge.
- **Impact:** estimators see two overlapping "contingency/adjustment" fields and cannot confidently predict the math; the legacy bridge silently changes semantics for rows without `quantity_base`. Documentation/UX risk.
- **Recommended surface:** pick one canonical row-level adjustment field (deprecate `contingency_percentage` or clearly document the bridge); distinguish row-level from project-level contingency in the UI.
- **Proof class:** source inspection.

## 9. Mutation rate limiting — absent on library actions

> Moved from the README's ⚠ out-of-scope list: this IS source-investigable, and
> the finding is concrete.

**What exists (the pattern the library should follow):**
- `src/lib/estimates/action-rate-limit.ts` — a sliding-window rate limiter (40/10s, 120/60s per user+resource; `:14-18`) with `checkEstimateActionRateLimit` / `assertEstimateActionRateLimit`.
- Used by `estimates/actions.ts:9` (`import { assertEstimateActionRateLimit }`), `collaboration/actions.ts`, `publication/actions.ts`, `auth/better-auth-cloudflare.ts`. So every other mutation-heavy surface rate-limits.
- Uploads have their own admission control (`uploads/admission-control.ts`: 12/min, 3 active/actor, 6/workspace).

**The gap:**
- `grep "action-rate-limit|actionRateLimit|withRateLimit|limitAction" src/lib/component-library/` = **empty**. `component-library/actions.ts` and `template-editor-actions.ts` import neither `action-rate-limit` nor any equivalent.
- So **every library mutation — `createCostLibraryComponent`, `updateCostLibraryComponent`, `upsertCostLibraryComponentPriceOption`, `changeCostLibraryComponentLifecycleState`, `executeBulkArchiveLibraryComponents`, `createEstimateTemplateNode`, `insertTemplateIntoTemplate`, folder CRUD — has no rate limit.** A compromised or scripted editor session can fire unbounded creates/updates at the 10k-cap, the 2k-template-cap, or against the unbounded reads (BUG-OPS-02), with only the workspace quota as a ceiling.

### BUG-DOM-12 [P2] — no rate limiting on library server actions (unlike estimates/collab/publication)
- **Location:** absence in `src/lib/component-library/actions.ts`, `template-editor-actions.ts`; the reusable limiter at `src/lib/estimates/action-rate-limit.ts`.
- **What:** library mutations have no rate limit. Every comparable mutation surface (`estimates`, `collaboration`, `publication`, `auth`) uses `assertEstimateActionRateLimit` or an equivalent; the library does not.
- **Impact:** a scripted/compromised editor can hammer creates/updates/archives without throttling — CPU/CPU-time exhaustion on the Worker, D1 write amplification, and a faster path to the quota. Combined with BUG-DOM-08 (no domain telemetry on mutations), this abuse would also be invisible.
- **Recommended surface:** add a library-mutation rate-limit surface (reuse the `action-rate-limit` primitive with a `component-library-mutation` surface key); apply it to the create/update/archive/duplicate/reorder actions.
- **Proof class:** source inspection (grep confirms no import in the library action files; the primitive exists and is used by sibling domains).

## TOP DOMAIN RISKS (updated)
- **BUG-DOM-01 [P1]** money-as-float — persisted estimate/proposal totals drift
- **BUG-DOM-04 [P1]** no outbound propagation on library edit/archive — estimates silently stale
- **BUG-DOM-05 [P1]** bulk archive: no audit trail, no version bump, no referential check
- **BUG-DOM-02 [P2]** content conversion captured but never priced (silent mispricing)
- **BUG-DOM-03 [P2]** units never validated against the enum
- **BUG-DOM-06 [P2]** no optimistic locking; concurrent edits lose audit rows
- **BUG-DOM-07 [P2]** audit trail structurally incomplete (create/update/bulk gaps)
- **BUG-DOM-08 [P2]** zero domain-event telemetry on mutations
- **BUG-DOM-09 [P2]** VAT export-only/hardcoded/not configurable/not in estimate UI
- **BUG-DOM-12 [P2]** no rate limiting on library server actions
- **BUG-DOM-10 [P3/scope]** no retention/retainage or progress-billing model
- **BUG-DOM-11 [P3]** contingency vs adjustment semantics confusing/overlapping

## 10. Cost-type model (labor/material/equipment/subcontractor)

Construction estimating canonically separates **four cost types**: labor,
material, equipment, subcontractor. The data model does **not** implement this:
- **No `cost_type` / `cost_category` column** on `cost_library_items`
  (`migrations/0026:35-65`) or `estimate_row_items` (`migrations/0015:11-34`).
- A **partial material-vs-labor split** exists, loosely, in `metadata_json`
  (not a first-class column): `estimate-row-total.ts:40,163,177,196,212` parses
  `labor_rate` and computes a separate labor total; `publication/actions.ts:714`
  reads `laborUnitCost` from `row.metadata_json`; `proposal-export/create-
  proposal-workbook.ts:85-86` emits separate `MATERIAL` and `LABOR` columns.
- **Equipment and subcontractor are entirely absent** — grep for
  `equipment_rate`, `equipment_cost`, `subcontractor`, `subcontract` = zero.
- "Labor" appears only as a **unit option** (`unit-options.ts:109-110`: "person
  hr", "labor hr", "crew hr", "crew day") and in the export column header —
  there is no wage-rate model, no crew composition, no labor-cost-type
  discriminator.

### BUG-DOM-13 [P3] — no cost-type separation (only partial material/labor in metadata_json)
- **What:** no `cost_type` enum; 2 of 4 canonical types (material + labor) are
  loosely modeled via `metadata_json.labor_rate`; equipment + subcontractor are
  absent. A component is a single undifferentiated line item.
- **Impact:** PH contractors who track labor-vs-material for wage compliance,
  productivity analysis, or subcontractor management cannot represent it
  cleanly. The loose `metadata_json.labor_rate` is undocumented and fragile
  (same class as DATA-DRIFT-01).
- **Recommended surface:** add a `cost_type` enum (material/labor/equipment/
  subcontractor) to `cost_library_items` + `estimate_row_items`; promote
  `labor_rate` from `metadata_json` to a first-class column.
- **Proof class:** source inspection (no `cost_type` column; partial labor in
  metadata).

## 11. Data hygiene: duplicate detection, supplier/brand management, currency

### BUG-DOM-14 [P2] — duplicate detection is client-side only (bypassable)
- **Location:** client index `AddComponentModal.tsx:366,803-814` (keyed on
  name+category+supplier/brand); **absence** in `src/lib/component-library/
  actions.ts` (grep for duplicate/conflict/similar/already-exists = empty).
- **What:** duplicate detection builds an in-memory index in the modal and is
  "acknowledge-and-proceed" (`duplicateAcknowledged`, `:736`), not enforced.
  The server action `createCostLibraryComponent` has **zero** duplicate checks.
- **Impact:** a scripted client (or any non-modal caller: API, AI copilot,
  future import path) bypasses duplicate detection entirely, creating dupes
  silently. Combined with BUG-DOM-03 (no UNIQUE on names) and BUG-VA-08
  (local-catalogue suppliers), the library can accumulate near-duplicate
  components with no server-side guard.
- **Recommended surface:** add a server-side duplicate heuristic (normalized
  name+category+supplier within workspace) that warns or blocks in
  `createCostLibraryComponent`/`updateCostLibraryComponent`, independent of the
  modal.

### BUG-DOM-15 [P2] — suppliers/brands have no CRUD actions (no merge/rename/delete)
- **Location:** tables exist (`component_suppliers`/`component_brands`,
  `migrations/0028:9-43`, `UNIQUE(workspace_id, normalized_name)`) but grep for
  `createComponentSupplier`/`rename`/`merge`/`delete`/`upsert` = **zero** action
  functions.
- **What:** suppliers/brands are auto-populated when a component is created with
  a typed name (the modal's local-catalogue flow, `AddComponentModal.tsx:1301-
  1308`), but there is **no management surface** — no rename, no merge
  duplicates, no delete, no "show all components using this supplier." A typo'd
  supplier ("GROHE" vs "Grohe") lives forever and can't be reconciled.
- **Impact:** data-hygiene rot. Over time the supplier/brand directories
  accumulate case-variant and typo duplicates with no cleanup path. This is the
  kind of thing that makes a cost library feel untrustworthy after a few months.
- **Recommended surface:** add a supplier/brand management surface (list +
  rename + merge + reassign components + delete-if-unused).

### BUG-DOM-16 [P2] — currency mismatch: projects default to 'USD', library renders PHP-only
- **Location:** `projects.currency_code TEXT NOT NULL DEFAULT 'USD'`
  (`migrations/0015:3`); `estimates.currency_code DEFAULT 'PHP'` (`0029:2`);
  account `default_currency DEFAULT 'PHP'` (`0005:59`); library `currency
  DEFAULT 'PHP'` (`0026:85`); new-project form offers 20 currencies
  (`new-project-form-currency-options.ts`); library renders PHP-only
  (`formatPeso`, BUG-OPS-04).
- **What:** three different default currencies across the schema (USD for
  projects, PHP for estimates/library, PHP for account). The new-project form
  lets a user pick USD/EUR/etc. But the library surface renders **all** prices
  as PHP (`formatPeso`) with no awareness of the project's currency. A USD
  project pulling a component from the library gets a ₱-prefixed price with no
  conversion and no warning.
- **Impact:** silent currency mismatch on cross-currency estimates — a money-
  correctness bug compounding BUG-OPS-04. For a product whose new-project form
  explicitly offers USD/EUR/SGD/etc., this will hit any non-PHP project.
- **Recommended surface:** pick one source of truth for currency (project-level,
  flowing into estimate + library reads); render money in the project's currency
  or add explicit conversion; align the `projects.currency_code` default with
  the PH-first posture (PHP, not USD).

### Change-order marketing gap (same shape as BUG-OPS-08)
- The landing pages **market change orders** ("Change orders without the paper
  trail", "change orders price themselves later",
  `landing-v3/ArchestimatorLandingPage.tsx:325,383,385`;
  `landing-new/NewLandingPage.tsx:152,196`) but there is **no change-order /
  variation-order entity** in the schema or app logic (grep `change_order` /
  `variation_order` / `amendment` against `migrations/*.sql` = zero). Same
  marketing-overpromises shape as BUG-OPS-08 (exports). Filed as **BUG-DOM-17
  [P3/marketing]** — either build a lightweight variation entity or remove the
  landing-page claim.

## 12. Niche construction features — investigated and recorded as absent

> Definitive "investigated and absent" record (source grep-confirmed), so the
> pack can say each was checked. These are **deferred-future scope**, not bugs —
> none are MVP-blocking for a PH-first pre-launch estimating product. Recorded
> for completeness and to prevent re-investigation.

| Feature | Status | Evidence |
|---|---|---|
| Insurance / bonding / surety (performance/bid/payment bonds) | **ABSENT** | grep `insurance\|bond\|surety\|performance.bond` across `src/`+`migrations/` = zero (no false positives) |
| Lien waivers / mechanics liens | **ABSENT** | grep `lien` = only "cl**ien**t" substring; `mechanics.lien`/`builders.lien` = zero; sole `waiver` is arbitration copy (`terms-content.ts:129`) |
| Certified payroll / prevailing wage | **ABSENT** | grep `certified.payroll\|prevailing.wage\|wage.rate\|minimum.wage` = zero; "labor" is only a unit option + export header |
| LEED / sustainability / green building / embodied carbon / EPD | **ABSENT** | grep `leed\|sustainab\|green.build\|carbon\|embodied\|epd` = zero |
| BIM / IFC / Revit / model-based quantity takeoff | **ABSENT** | grep `\bbim\b\|\.ifc\|revit\|takeoff` = zero (only English-prose "takeoff" in template/marketing copy) |
| RFIs / submittals / shop-drawing approval | **ABSENT** | grep `\brfi\b\|submittal\|shop.draw` = zero; `review_status` is file-scan review, not construction submittal |
| Overhead / profit margins / markup (beyond contingency/adjustment/misc) | **ABSENT (as model)** | grep `overhead\|profit\|markup\|indirect.cost\|\bfee\b` = only CSS "margin", React "markup", client-portal visibility flags; the model is only `contingency_percentage`+`adjustment_percentage`+`misc_cost`+sheet-level `contingencyRate`/`vatRate` |
| Price-escalation clauses / CPI indexing | **ABSENT** | grep `price.escalat\|cpi\|inflation.adjust` = zero (price *history* exists but is an audit log, not an escalator) |

**MVP relevance:** none of the eight above are MVP-blocking. The genuinely
MVP-relevant gaps are already filed: BUG-DOM-13 (cost-type separation),
BUG-DOM-10 (retention/progress billing — §8.2), BUG-DOM-09 (VAT — §8.1). The
eight above are either US-centric constructs (Davis-Bacon certified payroll has
no PH equivalent; PH minimum-wage compliance is HR/payroll, not estimating) or
enterprise-grade features (BIM/IFC, LEED/EPD) targeting firms beyond pre-launch
SMB scope, or belong to a contract-administration phase (RFIs/submittals/lien
waivers/bonds) the product does not yet enter (it stops at proposal publication).

## TOP DOMAIN RISKS (updated)
- **BUG-DOM-01 [P1]** money-as-float — persisted estimate/proposal totals drift
- **BUG-DOM-04 [P1]** no outbound propagation on library edit/archive — estimates silently stale
- **BUG-DOM-05 [P1]** bulk archive: no audit trail, no version bump, no referential check
- **BUG-DOM-02 [P2]** content conversion captured but never priced (silent mispricing)
- **BUG-DOM-03 [P2]** units never validated against the enum
- **BUG-DOM-06 [P2]** no optimistic locking; concurrent edits lose audit rows
- **BUG-DOM-07 [P2]** audit trail structurally incomplete (create/update/bulk gaps)
- **BUG-DOM-08 [P2]** zero domain-event telemetry on mutations
- **BUG-DOM-09 [P2]** VAT export-only/hardcoded/not configurable/not in estimate UI
- **BUG-DOM-12 [P2]** no rate limiting on library server actions
- **BUG-DOM-14 [P2]** duplicate detection client-side only (bypassable)
- **BUG-DOM-15 [P2]** suppliers/brands have no CRUD actions (no merge/rename/delete)
- **BUG-DOM-16 [P2]** currency mismatch: projects default USD, library renders PHP-only
- **BUG-DOM-10 [P3/scope]** no retention/retainage or progress-billing model
- **BUG-DOM-11 [P3]** contingency vs adjustment semantics confusing/overlapping
- **BUG-DOM-13 [P3]** no cost-type separation (partial material/labor in metadata_json)
- **BUG-DOM-17 [P3/marketing]** change orders marketed on landing page but no backing model
- **§12** eight niche features (bonds/liens/payroll/LEED/BIM/RFIs/overhead/escalation) investigated + recorded as absent/deferred

## Key file references
- Money oracle: `src/lib/estimates/estimate-row-total.ts:28-33`
- Money storage: `migrations/0026:48-49,83-84`; `0028:70-71`; `0015:19-26`
- UOM: `src/lib/component-library/unit-options.ts`; `quick-add-validation.ts:96-160`
- Promotion: `src/lib/estimates/express-promotion-actions.ts:339-451`
- Commit-time guard: `src/lib/estimates/actions.ts:1696-1720`
- Concurrency: `src/lib/component-library/actions.ts:1446,1467-1468,991-1009`
- Audit tables: `migrations/0028:45-125`; writes in `actions.ts:1146-1165,1490-1499,1611-1642`
- VAT: `src/lib/proposal-export/settings.ts:19-21,42-45`; `create-proposal-workbook.ts:413-470`
- Contingency/adjustment: `migrations/0024:56-62`; `estimate-row-total.ts:33`; `template-editor-model.ts:10`; `settings.ts:19,41`
- Rate limiting: `src/lib/estimates/action-rate-limit.ts`; used at `estimates/actions.ts:9`; absent from `src/lib/component-library/`
- Telemetry: `src/lib/component-library/library-telemetry.ts:1-43`; `d1-store.ts:64-107`
- Cost-type/labor split: `estimate-row-total.ts:40,163,177,196,212`; `publication/actions.ts:714`; `create-proposal-workbook.ts:85-86`
- Duplicate detection: `AddComponentModal.tsx:366,803-814` (client-only); absent in `actions.ts`
- Suppliers/brands: `migrations/0028:9-43` (tables, no CRUD actions)
- Currency: `migrations/0015:3` (projects USD), `0029:2` (estimates PHP), `0005:59` (account PHP), `0026:85` (library PHP); `new-project-form-currency-options.ts`
- Change-order marketing: `landing-v3/ArchestimatorLandingPage.tsx:325,383,385`; `landing-new/NewLandingPage.tsx:152,196`
