---
title: New Defects — Master Table (Pass 3)
type: docs
date: 2026-06-15
auditor: Claude (Opus 4.8, 1M context)
purpose: All 21 new findings deduped and severity-ranked, with the plan-vs-code theme. Each links to its deep dive (03/04) and to the fix queue (07).
---

# New Defects — Master Table

Findings keep the lane prefix from the verification workflow (`DB-`, `BR-`, `UX-`, `CO-`,
`SEC-`, `STRAT-`, `PERF-`, `DM-`, `OB-`). Each P1 was **adversarially confirmed** against live
code by an independent skeptic agent; DB-N1 was additionally verified by the orchestrator.

## The unifying theme: plan-says vs code-does

The remediation closed every *documented* gap. The new findings cluster into one root cause —
**the plan describes behavior the codebase does not currently have** — plus ordinary coherence
and specificity gaps. The first cluster is the important one because it converts "documented as
handled" into real implementation work.

## P1 — day-0 (resolve before building the affected unit)

| ID | Title | Plan-vs-code? | Where to fix |
|---|---|---|---|
| **DB-N1** | Express insert/update/replace actions skip `assertCanEditEstimate`; RPC checks membership only → **a viewer can write**; R14/AE10 viewer-block not enforced | **Yes** — "server actions are authoritative" but they don't gate | code (`actions.ts`) + doc 11 + doc 04 (R14/AE10/U9) |
| **BR-N1** | Drag/drop move/replace clobbers express metadata + source_snapshot server-side on the **primary** user path (`replace` RPC wholesale-overwrites) | **Yes** — V2 fixed only the AI twin | doc 04 U8 + doc 07 + doc 10 + code |
| **BR-N2** | No code rekeys `metadata.expressComponent.id` on project-source/template copy; the copy RPC preserves it verbatim → cross-project collision (the V6 hazard) | **Yes** — KTD2/U8/Q14 assert a rekey that doesn't exist | doc 04 U8 + doc 07 + doc 00 + code/migration |
| **SEC-N2** | doc 11 "Realtime Model" assumes a `postgres_changes` row-sync path that **doesn't exist**; peers don't see express rows live | **Yes** — "normal realtime/cache refresh paths" don't exist for rows | doc 11 (Realtime Model) |
| **PERF-N1** | The marquee "keystrokes must not rebuild the full row tree" claim never says **where** express editor text state lives — the decision that makes/breaks render isolation | **Yes** — claim has no enforcing mechanism; the numeric-only perf test won't catch a regression | doc 03 (perf) + doc 09 + a render-probe test |
| **DM-N1** | 29-legacy-row migration safety is asserted not proven; a renamed source-less row can leak into the Project folder; SQL vs client blank-predicate divergence | partial | doc 02 + doc 07 + doc 10 + evidence capture |
| **CO-N1** | Traceability matrix (doc 08) doesn't encode the day-0 cut; U5/U6/U7 read as flat equal-status units | coherence | doc 08 |
| **STRAT-N1** | Inline-vs-modal spike fail branch is unplanned — **no modal design** anywhere in the pack | scope | doc 03 (add modal fallback) |

## P1 — fast-follow (U7; not a day-0 blocker but resolve before promotion coding)

| ID | Title | Note |
|---|---|---|
| **SEC-N1** (= DB-N3 = CO-N4) | Promotion-gate predicate self-contradictory: the real library-write policy **is** `is_workspace_editor` (member-inclusive), which the plan both forbids and says to "match exactly" | Surfaced independently by 3 lanes. Pick one gate (parity `is_workspace_editor` or deliberate `is_workspace_admin`) and stop instructing a "stricter predicate" that doesn't exist. Also fixes the permission-matrix label (real cut is member-vs-viewer, not editor-vs-member). |

## P2 — correctness / specificity / cleanup

| ID | Title | Where |
|---|---|---|
| **DB-N2** | `replace_estimate_row_item_with_history` is a 2nd wholesale metadata/source_snapshot overwrite surface (NULLs source_snapshot on omit); doc 07 JSON Semantics documents only the update RPC | doc 07 + doc 10 |
| **BR-N3** | AI package-builder `read-tools.ts:719` row read not in U8 blast radius; empty-material express rows surface as empty to AI search | doc 04 U8 |
| **UX-N1** | Reused Project-specific badge (`cells.tsx:277` `#7F7F7F`) fails the V9 AA floor the revision just set; doc 09 grandfathers it | doc 09 + doc 03 + Q25 |
| **UX-N2** | Virtualization-disable scoped to "exactly one express editor"; two concurrent drafts (allowed by doc 10) are undefined | doc 09 + doc 10 |
| **CO-N2** | Q35 and Q40 unmapped in doc 08 Unit→Q half (V10 fixed only R→Q) | doc 08 |
| **CO-N3** | R↔AE / R↔RSK cross-table asymmetry (R2↔AE2/AE12, R6↔AE10, R11↔RSK12 don't reciprocate) | doc 08 |
| **CO-N5** | `category="Unassigned"` (string label) vs `categoryNodeId=null` (FK) conflated as a clean contrast | doc 02 |
| **SEC-N3** | V13 draft-broadcast suppression required but the **mechanism/seam** (a `data-row-persisted` attr or draft-set lookup in `handlePointerMove`) is unspecified | doc 11 + U9 |
| **SEC-N4** | Promotion idempotency relies on correlation-id retry-lookup with **no specified schema home** (where the id persists on the library item for the pre-create lookup) | doc 07 |
| **STRAT-N2** | Inline-vs-modal spike has no owner and no required evidence artifact (asymmetry vs U5's repro note) | doc 00 + new evidence file |
| **STRAT-N4** | Net-new stale-revision recovery UX kept inside "narrow" day-0 subset; the "narrow MVP" framing slightly oversells risk reduction | doc 00 |
| **OB-N1** | Observability defers to a non-existent product-event analytics surface; 16 event names have an owner but no concrete sink | doc 12 |
| **DM-N2** | `ESTIMATE_ROW_ITEM_SELECT` loads neither `tags` nor `metadata`; the tag-based blank/express discrimination has no client data source until metadata is added; `item.tags` ≠ `metadata.tags` | doc 04 U1 + doc 07 |
| **PERF-N2** | Disabling virtualization mounts all N rows on a long estimate when an editor opens; worst case (300–500 rows) unmodeled; spike only tests 75 | doc 09 + doc 00 |

## Counts

| Severity | Count | Day-0? |
|---|---|---|
| P1 | 9 | 8 day-0 + 1 fast-follow |
| P2 | 14 | mixed |

> Several P1s are the same root issue surfaced by multiple lanes — counted once:
> SEC-N1 = DB-N3 = CO-N4 (promotion gate); BR-N2 = V6-misapplied (express-id rekey);
> CO-N1 = STRAT-N3 (doc 08 day-0 cut). The "9 P1" count reflects the deduped set.
