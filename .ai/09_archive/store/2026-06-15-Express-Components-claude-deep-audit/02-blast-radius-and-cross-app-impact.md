---
title: Express Components — Blast Radius & Cross-App Impact
type: docs
date: 2026-06-15
auditor: Claude (Opus 4.8, 1M context)
purpose: The complete surface area the U-units must cover. The plan's "Sources" lists are a sample, not a closure set.
---

# Blast Radius & Cross-App Impact

The plan's per-unit file lists are illustrative, not exhaustive. Below is the **closure set** —
every surface a reviewer should expect a diff to touch — grouped by change vector, with what
breaks and the severity if missed. Surfaces the plan **omits** are marked **[OMITTED]**.

---

## 1. Change vector: replacing the Add-row template / adding express identity

| Surface | What happens under express rows | Sev | In plan? |
|---|---|---|---|
| `EstimateSheetContent.tsx:220` `createBlankEstimateRowTemplate` | becomes/branches to `createExpressEstimateRowTemplate` | — | ✓ (U2) |
| `EstimateSheetContent.tsx:2065` `clearRowComponent` | **calls `createBlankEstimateRowTemplate()` to revert a row** — clearing an express row silently discards express identity/metadata | High | **[OMITTED]** |
| `EstimateSheetContent.tsx:2093` `moveRowComponent` | = `replaceRowItem(target) + clearRowComponent(source)` — **moving an express row reverts the source to a blank** | High | **[OMITTED]** |
| `EstimateSheetContent.tsx:352` `cloneLibraryItemForEstimate` | spreads `...libraryItem`; must preserve express/link fields | Med | partial (U5) |
| `EstimateSheetContent.tsx:398` `applyEditableValuesToLibraryItem` | re-applies **only** `quantity`/`contingencyPercentage`/`miscCost` — **replace/move drops inline express text edits** (material/desc/unit/unit_cost) | High | **[OMITTED]** |
| `activity-history.tsx:120-134` `isBlankEstimateRowItem` | material/cost/category heuristic; must yield to a positive express marker or it will mis-bucket unnamed express rows | High | partial (U1) |
| `estimate-repository.ts:45` `ESTIMATE_ROW_ITEM_SELECT` | **does not select `metadata`** — express identity unreadable client-side | High | **[OMITTED]** |
| `estimate-repository.ts:71-92` `toEstimateRowItem` | maps no `metadata` | High | **[OMITTED]** |
| `estimates/types.ts:81-136` `EstimateRowItem` (UI type) | **no `metadata`/`expressComponent` field** | High | **[OMITTED]** |
| `domain/estimate-tree.ts:25-44` `EstimateRowItem` (domain type) | **no `metadata` field** | Med | **[OMITTED]** |
| `workspace-repository.ts:1636-1683` main read mapping | reads `metadata` but extracts only `tags`/`laborUnitCost`/`scopeStatus` — express id must be added here or reuse `tags` | High | **[OMITTED]** |

## 2. Change vector: widening the row update contract

| Surface | Impact | Sev | In plan? |
|---|---|---|---|
| `use-estimate-row-mutations.ts:49/70/220` | add typed text/cost fields to allowed update inputs + optimistic patch + queue | Med | ✓ (U3) |
| `estimates/actions.ts:80/100/2561-2563` | widen server-action input type + forward new patch keys; fix `itemCost`→`unitCost` | Med | partial (U3) |
| `estimates/actions.ts:691-697` `getValidatedEstimateRow` | **SELECTs only id/node/estimate/source/link/revision — NOT `metadata`/`source_snapshot`**; KTD7 server-merge cannot work without widening this SELECT | High | **[OMITTED]** |
| `estimate-row-tree-patch.ts` | extend optimistic tree patch to cover new fields | Med | ✓ (U3) |
| update RPC `update_estimate_row_item_with_history` | already accepts all keys — **no migration** | — | ⚠ plan implies migration |

## 3. Change vector: history / activity classification

| Surface | Impact | Sev | In plan? |
|---|---|---|---|
| insert RPC `row_blank_added` branch (`...050746:422`) | **SQL migration** to narrow classification | High | partial (doc 05 escape clause) |
| `activity-composer.ts` (`BLANK_ESTIMATE_ROW_COMPONENT_LABEL`, title build ~:83) | new/changed event type → composer + title rendering | Med | ✓ (U8) |
| `activity-history.tsx` render (`:464` image, blank-label rendering) | express create/edit must not render as "added an empty row slot" | Med | ✓ (U8) |
| `ai/read-context.ts` (~:484) | source-less rows surfaced to AI context as blank — reclassification affects AI/analytics | Med | **[OMITTED]** |

## 4. Change vector: Components Project-folder projection

| Surface | Impact | Sev | In plan? |
|---|---|---|---|
| `app/workshop/library/components/page.tsx:8` | **net-new projectId plumbing** (route discards searchParams today) | Critical | **[OMITTED]** |
| `LibraryComponentsRoute.tsx:9` / `LibraryPageClient.tsx:66/86` | thread projectId; new project-scoped data action | High | partial (U6) |
| `ComponentLibraryManager.tsx:1062/1146` | accept project rows; build virtual node | High | ✓ (U6) |
| `LibraryFolderTree.tsx:189/282-303/540/553` | **de-positionalize synthetic-root; new datum kind; DnD/selection carve-outs** | High | **[OMITTED]** |
| `library-folder-reorder.ts:10` | virtual node must be excluded from reorder kinds | Med | partial |
| New project-scoped query (repository/action) | must use `can_access_estimate` parity, not workspace-membership | High | ✓ (U6) |
| estimate-side `component-library/index.tsx:608/777` | alternative host that **already has projectId** — consider for MVP | — | **[OMITTED]** (option) |

## 5. Change vector: promotion (express → library)

| Surface | Impact | Sev | In plan? |
|---|---|---|---|
| `create_cost_library_component` | atomic within library; requires name + 1 default option + folder; not idempotent | Critical | partial (U7) |
| `component-library/actions.ts:448` | promotion wrapper; idempotency guard timing | Critical | partial (U7) |
| `estimates/actions.ts:2571` relink | second transaction; **metadata server-merge required** (else clobbers expressComponent) | High | partial (U7) |
| cache fan-out | estimate-sheet row query + workspace library lite/rows query + library routes | Med | **[OMITTED]** |

## 6. Downstream / publication / dashboard / proposal (cross-app)

| Surface | Express-row consideration | Sev | In plan? |
|---|---|---|---|
| `publication/actions.ts:436`, `snapshot.ts:26/82` | image published from `source_snapshot.imageUrl` only → **express image MUST write to `source_snapshot.imageUrl`** (plan says so in U4 — keep explicit) | Med | partial |
| `project-dashboard-repository.ts:170-173` | category/supplier bucketing reads `source_snapshot.{categoryNodeId,supplierId}` → express rows need these populated or they bucket as "unassigned" | Med | partial (U8) |
| `build-proposal-export-model.ts:130` | proposal section from `row.category||row.discipline` → **decide default section/division for express rows** (ties to the unmentioned `discipline` column) | Med | **[OMITTED]** |
| totals / `estimate_row_line_total` | express `unit_cost`/`misc`/`quantity` feed totals correctly | Low | ✓ (verified correct, B4=92) |
| `share/SharePageTabs.tsx`, publication snapshot | published express rows must render client-facing | Low | partial |

## 7. Memoization & virtualization (perf-correctness)

| Surface | Impact | Sev | In plan? |
|---|---|---|---|
| `row-table.tsx:61` table comparator, `:133/:157` per-row memo + computedItem | express editable state must be in the comparison or edits won't re-render | Med | partial |
| `row-table.tsx:421/594` **fixed 96px virtualizer** | expanding editor overlaps next row (≥75 rows) — see UX doc C1 | Critical | **[OMITTED as critical]** |

## 8. Tests / fixtures (regression surface)

| Surface | Impact | Sev | In plan? |
|---|---|---|---|
| `estimate-sheet-cost-inputs.test.tsx:220/230` | assert blank-slot creation + persisted placeholder — assertions must invert for express | High | named, not enumerated |
| `estimate-sheet-library-insert.test.tsx:~247/251` | asserts unlinked manual template | High | named |
| seed fixtures (`estimate-tree-data.ts:155`, non-UUID `lib-*` ids) | the actual icon-bug-gate failure source (U5) | High | **[OMITTED]** |
| any test hardcoding the blank template shape | must update to express defaults while keeping a "legacy blank still renders" green test | High | partial |

---

## Net: blast-radius readiness = 58/100

The plan covers the **happy-path write surfaces** well but misses three classes of surface that
will cause real regressions: (1) the **revert-to-blank paths** (`clearRowComponent`,
`moveRowComponent`, `applyEditableValuesToLibraryItem`) that silently destroy express data on
clear/move/replace; (2) the **read path** (`SELECT`/mapping/types) where `metadata.expressComponent`
has *zero* representation today; and (3) the **fixed-height virtualizer**. Add an explicit
**Blast-Radius Matrix doc** (see `04-gaps-and-recommended-documents.md`) so the U-unit file lists
become a provable closure set, not a sample.
