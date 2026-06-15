---
title: Express Components — Gaps & Recommended Documents to Add
type: docs
date: 2026-06-15
auditor: Claude (Opus 4.8, 1M context)
purpose: Are 6 docs enough? No. Here are the documents to add, with ready-to-fill outlines, so the codebase AI can author them.
---

# Gaps & Recommended Documents

## Is the current pack sufficient?

The 6 docs + evidence form a strong **strategy → design → readiness** spine. For a
mission-critical day-0 feature they are **not sufficient**: they lack the **contract** and
**operational** layers an implementer needs to build without guessing, and they omit two whole
concern areas (realtime concurrency, permission boundaries). The 13-lane audit independently
proposed 19 documents that consolidate into the **6 high-value additions** below (plus 2 small
in-place additions). Add them before implementation starts.

> Priority key: **P0** = blocks a clean build · **P1** = needed for a safe day-0 ship · **P2** =
> strongly recommended.

---

## P0 — Add these before writing code

### 1. `07-rpc-and-row-patch-contract.md`  (P0)
**Why:** the exact data contract is scattered and partly wrong (`itemCost` vs `unitCost`), and
KTD7's merge premise is overstated. An implementer must code against a fixed interface.
**Outline:**
- Scope: `update_/insert_estimate_row_item_with_history`, `create_cost_library_component`,
  `unlink_..._with_history`.
- **Key map table**: app field → row-patch key → DB column (resolve `itemCost`/`unitCost`/`unit_cost`;
  `miscCost`/`misc_cost`; `contingencyPercentage`; `material/description/supplier/unit/discipline/designation`).
- **Update contract**: confirm **NO migration** (cite `20260524033151:466-479`); list every accepted
  patch key; state **per-top-level-key replace** semantics and that `metadata`/`source_snapshot` are
  preserved when the key is omitted.
- **Merge rule**: the exact server-merge the action must run when it *does* update `metadata`/
  `source_snapshot` (and the requirement to widen `getValidatedEstimateRow`'s SELECT, `actions.ts:691`).
- **Return-shape contract**: current `UpdateEstimateRowItemResult` + required widened fields;
  insert returns `rowRevision` already (snapshot helper).
- **Insert contract**: express template payload; the `row_blank_added` vs `row_added` branch and the
  migration to narrow it.
- **Promotion contract**: `create_cost_library_component` I/O; idempotency key location; folder target;
  name-required.
- **Worked JSON examples**: add-express-row insert, name+unitCost edit, promotion.

### 2. `08-traceability-matrix.md`  (P0)
**Why:** no doc ties requirements to units, acceptance examples, and QA scenarios; several R/U have
no AE or Q (e.g. R8 regression, R9 no-new-table, U8 dashboard).
**Outline:**
- **R × U × AE × Q grid** (R1–R11 / U1–U8 / AE1–AE6 / Q1–Q21 / RSK1–9).
- Coverage-gaps section listing every empty cell with severity.
- Add missing coverage: an AE+Q for **R8 regression** (move/clear/delete/select/keyboard/virtualization
  unaffected by the express template), an AE for **U8 dashboard aggregation**, and a "no migration
  required by default (else migration-gated)" assertion for **R9**.
- Bidirectional check: every AE and Q maps back to ≥1 R.

### 3. `09-virtualization-keyboard-focus-and-state-spec.md`  (P0)
**Why:** consolidates the three verified-critical/high UX mechanisms (§ in `03-...assessment.md`):
fixed-height virtualizer, arrow-vs-caret, focus-on-insert collision, plus the full state machine.
**Outline:**
- **Virtualization decision** (port `measureElement` vs cap ≤96px vs disable-on-active), with
  scroll-jump handling and the `data-estimate-row-virtualizer`/`data-index` QA hooks + ≥75-row repro.
- **Per-key behavior table** for express text fields vs numeric cells.
- **Focus**: redirect `pendingFocusRowId` to the name field; post-commit/Escape/failed/draft-retry focus.
- **Tab order** within the crowded cell.
- **State table** (~14 states) with visual + aria-live + contrast token per state; field labels and
  `aria-describedby` error wiring; all microcopy (labels, placeholder, failed-save sentence, button
  labels, promotion copy); i18n note.

---

## P1 — Add before a safe day-0 ship

### 4. `10-edge-cases-and-failure-modes.md`  (P1)
**Why:** converts the risk table into deterministic, testable behavior for a live editor.
**Outline (per failure: trigger / detection / user-visible result / data invariant / test):**
insert race (edit before insert returns); **two-tab stale-revision concurrent edit** (P0001 handling
+ rollback UX); large description / long name (length cap + virtualization height + narrow-width
overlap); image URL 404 (fallback, no broken-image leak); promotion partial failure (guard, retry,
de-dup); duplicate-detach race; offline/timeout on insert+update; **legacy blank rows after the
Add-row swap** (the 29 existing prod rows).

### 5. `11-concurrency-and-permissions-spec.md`  (P1, NEW concern area)
**Why:** the pack is single-client and unguarded on roles — the biggest systemic blind spot.
**Outline:**
- **Realtime**: how an in-flight optimistic express row (client-generated id, local React state, not
  yet in the TanStack cache) appears (or doesn't) to a peer; cursor anchoring to
  `data-estimate-row-id`/`data-estimate-cell-index`; reconnect/replay; whether express insert should
  write to the shared cache earlier.
- **Stale-revision UX** under concurrent multi-field edits (what the user sees, retry policy).
- **Permissions**: confirm viewer/read-only collaborators are UI-blocked from express authoring;
  gate **promotion** on `is_workspace_editor` (not just `can_edit_estimate`) — a user can author an
  express row but may not be allowed to promote it to the workspace library.

### 6. `12-rollout-migration-and-observability-runbook.md`  (P1, NEW concern area)
**Why:** day-0, live-project change with no kill-switch is an incident risk.
**Outline:**
- Unit dependency graph + independently-shippable slices.
- **Feature flag / kill-switch** to revert Add row to the blank placeholder if express regresses;
  how persisted express rows render under reverted code.
- **Migration decisions**: U3 needs none; U2 history reclassification = 1 RPC migration (up/down/verify
  SQL); U7 promotion RPC if chosen. Type-regen triggers. Provider scope (`ebxxqidacheyapmmzavr`, read-only
  evidence reminder).
- **Existing-data handling**: forward-only reclassification of the 29 legacy `unlinked` rows; prove they
  still render as placeholders and stay excluded from the Project folder.
- **Observability**: express insert success/failure rate, save-failure rate, promotion-conflict count,
  projection latency, alert thresholds; whether the current `row_blank_added` mislabel already pollutes
  activity/AI counts and whether the fix corrects retroactively or forward-only.

---

## P2 — Strongly recommended

### 7. Blast-Radius Matrix — fold `02-blast-radius-and-cross-app-impact.md` (this audit) into the plan
Promote the closure-set table in this audit into the plan as a living matrix so the U-unit file lists
are provably exhaustive, not illustrative.

### 8. Two small in-place additions to existing docs
- **Glossary / Field & State Vocabulary** (append to `INDEX.md`): canonical name per layer
  (`unit_cost`/`unitCost`/`itemCost`; `contingency_percentage` = UI "adjustment"; `link_state` values;
  express vs blank vs detached definitions).
- **Bug Reproduction Note** (append to doc 01 or a new `evidence/` note): the captured repro of the
  icon bug (both instances' `source_library_item_id`/`link_state`), so U5 stops shipping against a
  speculative cause. **This is a prerequisite for U5.**

---

## Summary: target document set

| # | Doc | Status | Priority |
|---|---|---|---|
| 01–06 | current pack | keep, apply corrections | — |
| 07 | RPC & row-patch contract | **add** | P0 |
| 08 | traceability matrix | **add** | P0 |
| 09 | virtualization/keyboard/focus/state/copy spec | **add** | P0 |
| 10 | edge-cases & failure modes | **add** | P1 |
| 11 | concurrency & permissions spec | **add** | P1 |
| 12 | rollout / migration / observability runbook | **add** | P1 |
| — | blast-radius matrix (from this audit) | fold in | P2 |
| — | glossary + bug-repro note | append in place | P2 / prereq for U5 |

A pack of **~12 focused docs** (not one mega-doc) keeps each concern reviewable and lets the
codebase AI improve them independently.
