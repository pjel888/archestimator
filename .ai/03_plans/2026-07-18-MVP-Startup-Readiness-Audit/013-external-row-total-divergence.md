# UNIT-013 · (External) Row-total divergence

- **Requirement:** REQ-016
- **Priority:** P0 · **Effort:** M · **Risk:** HIGH · **Status:** EXTERNAL-OWNER
- **Depends on:** — (trust precondition for cohort recruitment; not a code
  dependency on any unit in this pack)
- **Evidence:** EVID-013
- **Owner:** `2026-07-18-Whole-App-Consistency-Audit` UNIT-001

## Goal

A single estimate row shows the same total across every surface (UI editor,
D1 authoritative, charts, proposal export, publication snapshot, duplication,
list summaries). Owned externally; this pack records it as a Stage-A trust
precondition.

## Source evidence (commit `a41a07d01`)

- Cross-reference only. The full defect, evidence, and remediation plan are
  in `.ai/03_plans/2026-07-18-Whole-App-Consistency-Audit/001-labor-cost-divergence.md`
  (consistency F-01, CRITICAL).

## Startup-side consequence

If a design partner catches divergent totals, trust collapses. The cohort
cannot be safely recruited until this is resolved. It is a precondition
for the bundled spike in verdict §12, not a unit this pack implements.

## Implementation

None in this pack. The consistency audit owns UNIT-001 there.

## Acceptance evidence

The consistency audit's UNIT-001 reaches `VERIFIED` status in its own
`plan-pack.json`.

## Test decision

Deferred to the owning pack.

## Recovery

n/a (external owner).

## Completion signal

Owning pack marks UNIT-001 `VERIFIED`; this pack's `LOOP_LEDGER.md` records
the cross-pack dependency as resolved.
