---
title: Lane Scores, Verdicts & Method — Pass 3
type: docs
date: 2026-06-15
auditor: Claude (Opus 4.8, 1M context)
purpose: The 7-lane verification workflow, scores, adversarial verdicts, and method notes behind this audit.
---

# Lane Scores, Verdicts & Method

## Method

A background **Workflow** (16 agents, ~1.16M tokens, 448 tool calls) ran 7 ground-truth lanes
over the **revised** pack at HEAD `a110ea43`. Each lane verified pass-2 finding application +
hunted new defects against live code. Every P1/critical finding then went through an
**adversarial verifier** instructed to refute it and to cite the **latest** `create or replace`
for any RPC (the explicit guard against the V1 stale-migration error). The orchestrator
independently read all 14 plan docs and spot-checked the headline P1 (DB-N1).

## Lane scores

| Lane | Score | New P1s | New P2s |
|---|---:|---|---|
| DB / RPC / Supabase | **86** | DB-N1 | DB-N2, DB-N3* |
| Blast radius / cross-app | **74** | BR-N1, BR-N2 | BR-N3 |
| UX / frontend / a11y / virtualization | **88** | — | UX-N1, UX-N2 |
| Coherence / traceability / QA | **86** (absorption **92**) | CO-N1 | CO-N2, CO-N3, CO-N4*, CO-N5 |
| Security / permissions / concurrency | **86** | SEC-N1*, SEC-N2 | SEC-N3, SEC-N4 |
| Strategy / scope | **81** | STRAT-N1 | STRAT-N2, STRAT-N3*, STRAT-N4 |
| Completeness / perf / data-migration | **86** | PERF-N1, DM-N1 | OB-N1, DM-N2, PERF-N2 |

`*` = same root issue surfaced by multiple lanes; deduped in synthesis:
DB-N3 = CO-N4 = **SEC-N1** (promotion gate); STRAT-N3 = **CO-N1** (doc 08 day-0 cut);
**BR-N2** = the V6 "misapplied" status.

**Aggregate = 83.9/100** → synthesized **Overall 84**. Lowest lane: blast radius (74), driven by
the two confirmed identity-preservation P1s (BR-N1 drag/drop clobber, BR-N2 rekey-not-implemented).

## Adversarial verdicts on the P1s

All P1s sent to a skeptic returned **confirmed-real** at the latest code version (no
false-positives, no stale-migration errors). Calibration notes the verifiers added:

| Finding | Verdict | Calibration note |
|---|---|---|
| DB-N1 | confirmed-real | Verifier checked the P6 migration `20260614013638` only strips `node.kind`, preserving the membership-only resolve. Orchestrator also verified the 3 actions skip the gate. |
| BR-N1 | confirmed-real | Slightly understated: doc 07:67 already anticipates the SELECT-widening precondition but never connects it to the drag/drop path. |
| BR-N2 | confirmed-real | If anything understated — the same gap exists on the **template** copy path (`20260612094734:950`), which the finding didn't name. |
| SEC-N1 | confirmed-real | Strengthened: via the create RPC even a **viewer** can create library items today, so the matrix is more wrong than stated. |
| SEC-N2 | confirmed-real | Data integrity is NOT at risk (optimistic lock real); the defect is the ungrounded collaboration narrative + V7 rarely firing. |
| CO-N1 | confirmed-real | doc 08 day-0/fast-follow term count = 1 (the unrelated catalog fork) vs doc 00 = 10. |
| STRAT-N1 | confirmed-real | **Over-stated probability:** "~50% spike fail" is inflated — the V3 fallback eased the inline bar. Defect (no modal design) is real regardless. |
| PERF-N1 | confirmed-real | Strengthened: the more direct sibling gate is the per-row memo + `editableRow` prop (`:133/575`), proven by the numeric-only test that wouldn't catch a text regression. |
| DM-N1 | confirmed-real | One of three threads (SQL-predicate divergence) is **overstated** (new-insert-only); the evidence-gap + renamed-row-leak threads are solid. |

## Confirmed-sound (verified, do not re-litigate)

- No-new-table / U3-no-migration / JSON-merge / correlation-idempotency against the **live** RPC
  `20260524050746` (redefines `20260524033151`).
- Permission helpers, optimistic lock (`estimate_sheet_row_revision_conflict`), signed cursor
  frames, price-option NOT-NULL list, `create_cost_library_component` atomicity.
- Virtualization day-0 fallback is the primary path in docs 03 **and** 09; the ≥75-row harness
  (`tests/vitest/estimate-row-table-virtualization.test.tsx`) is real and **passes** (verifier ran it).
- Numeric keystroke isolation is **proven** today (`estimate-sheet-render-relief.test.tsx`).
- All named test files exist; all 48 Q rows map back to a requirement (R-direction).

## Structural context for the next reader

The entire 14-doc pack was authored **wholesale** in commit `7816be38` (+1,772 lines, all files
created, none edited from a prior version), so pass-2 findings were baked in at authoring time
rather than applied as diffs. "New contradictions the rewrite introduced" therefore means
"contradictions present in the freshly-authored pack." The working-tree changes
(`branch.tsx`/`expansion.ts`) are unrelated to this plan.

Raw lane output (full JSON, 901 lines) is preserved in the workflow task output; this file is the
distilled index.
