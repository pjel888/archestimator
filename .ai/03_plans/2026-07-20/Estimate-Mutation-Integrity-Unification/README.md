# Estimate Mutation Integrity Unification

**Historical provenance only.** This pack is non-runnable and was superseded
without implementation by `.ai/03_plans/2026-07-31/Code-Improvement/`. Current
source has landed the relevant mutation-integrity work; successor `UNIT-028`
owns revalidation. The original trace remains as evidence.

## Historical unit disposition

| Unit | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| UNIT-001 | Close the activity_event_outbox hole (5 forks → `prepareHistoryEventInsert`) | P1 | M | Pack B UNIT-002 | SUPERSEDED → landed current source; successor UNIT-028 revalidation |
| UNIT-002 | Route forks through `prepareEstimateMutationIntent` + receipt | P1 | M | UNIT-001, Pack A UNIT-006 | SUPERSEDED → landed current source; successor UNIT-028 revalidation |
| UNIT-003 | Route forks through `buildProjectPublicationRevisionFor*` | P2 | S | UNIT-001 | SUPERSEDED → landed current source; successor UNIT-028 revalidation |
| UNIT-004 | Route forks through `assertEstimateEditIntent` (strict access) | P2 | S | UNIT-002 | SUPERSEDED → landed current source; successor UNIT-028 revalidation |

Current status: all units `SUPERSEDED`; no implementation is claimed here.

## The reframe (load-bearing)

The original Pack D (v1) proposed "extract `MutationIntent` primitives from
`rows.ts`." A 2026-07-21 deep trace of every estimate-table write path found
that:

1. The primitives already exist across `d1-intents/{database,history-events,intent-context,access}.ts`
   + `estimates/{mutation-receipts,project-component-attachment-retention}.ts`.
2. The canonical `rows.ts` is one of several consumers that compose them, not
   their source.
3. There are **9 forked write paths** (not 3 as v1 documented), each bypassing
   a different subset of the primitives.
4. The single biggest integrity hole is the **`activity_event_outbox`** row
   dropped by 5 forks that hand-roll the history INSERT — their mutations
   never reach the workspace activity feed.

The full primitive surface map and fork gap matrix are in
`references/primitive-map.md`. The v1 unit files (extraction-from-rows framing)
were deleted; the v2 units address the real gaps.

## Dependency notes

- **Hard prerequisites (other packs):**
  - **Pack B UNIT-002** (`d1-intents/rows.ts` SQL characterization suite) MUST
    be VERIFIED. It is the regression net that confirms the canonical path's
    generated SQL is untouched when forks change around it.
  - **Pack C UNIT-001 + UNIT-002** (shared D1 runtime) MUST be VERIFIED. The
    forks' re-implemented database helpers should already be collapsed by
    Pack C before Pack D routes them through the canonical batch primitive.
- UNIT-001 is the foundation — it closes the outbox hole and establishes the
  `prepareHistoryEventInsert` consumption pattern UNIT-002/003 build on.
- UNIT-002 (intent/receipt) makes UNIT-004 (access) mostly redundant —
  `prepareEstimateMutationIntent` calls `assertEstimateEditIntent` internally.
  Forks that adopt UNIT-002 get strict access for free; UNIT-004 covers the
  remaining inline checks and the documented background-job exception.
- **Pack A UNIT-006** (AI Apply atomicity) should land before UNIT-002 — it
  established the `runBatch` pattern UNIT-002 composes into.

## Findings considered and rejected

- **Extracting new primitives from `rows.ts`** — rejected. The trace proved
  they already exist; v1 framing was wrong.
- **Extending `runMutationWithHistory` to be the single composed entrypoint**
  — deferred (possible future uplift). The per-fork composition à la `rows.ts`
  is sufficient and matches the canonical pattern. `runMutationWithHistory`
  has zero fork callers today, so extending it is greenfield — but not
  required for the integrity goal.
- **Merging the 9 write paths into one** — rejected. Each fork exists for a
  reason (atomic multi-table batches, idempotent AI replay, background
  propagation jobs). Sharing the primitives via composition preserves each
  path's batch shape.
- **A new `EstimateMutationService` class hierarchy** — over-engineered for
  alpha (carried over from v1 rejection).
- **Rewriting `EstimateSheetContent.tsx`** — separate direction option.

## Quality bar — check before finishing each unit

- Could a model that has never seen this repo execute the unit from `00-PLAN.md`
  + the unit file + `references/primitive-map.md` alone?
- Does the characterization suite stay green after every step?
- Is each fork's gap (per the matrix in `primitive-map.md`) actually closed?
- No new primitive extracted; no canonical path changed.
- The outbox row is written by every fork that UNIT-001 touches.
