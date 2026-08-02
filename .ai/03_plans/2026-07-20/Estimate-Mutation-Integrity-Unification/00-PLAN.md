# Estimate Mutation Integrity Unification — Historical Predecessor Plan

> **Historical provenance only — do not execute.** This predecessor was
> superseded without implementation by
> `.ai/03_plans/2026-07-31/Code-Improvement/`, the sole current execution
> authority. Current source has landed the relevant integrity work; successor
> `UNIT-028` owns revalidation. The original trace remains below as evidence.

## Status tuple

`NOT_READY / NOT_STARTED / NOT_EVALUATED / N/A / CANCELLED`

- **Baseline HEAD:** `b8ec0edf3a144bcb49c2b5971a168ed30aecf2ab` (2026-07-20)
- **Suite version:** `2026-07-12`
- **Profile:** `high-blast-radius` (money-integrity layer; touches every estimate write path)
- **Action ceiling:** `IMPLEMENT_LOCAL` (historical boundary only; this pack has no runnable unit)
- **Exact next unit:** none; continue only in `.ai/03_plans/2026-07-31/Code-Improvement/`

## 1. Outcome and intent

### What the deep trace found (reframes the pack)

The original framing — "extract `MutationIntent` primitives from `rows.ts`" —
was **wrong**. A full write-path trace (2026-07-21) established that:

- The shared primitives **already exist** across the `d1-intents/` family and
  two sibling modules. They are stable, exported, and used by the canonical
  paths.
- The canonical `rows.ts` is not the source of the primitives — it is one of
  several consumers that compose them manually at each write site.
- The forked paths do not lack a primitive to call — they **bypass** the
  existing ones and re-implement (or skip) the rules locally.

The existing primitive surface (all read-confirmed, see `references/primitive-map.md`):

| Primitive | Location | Role |
|-----------|----------|------|
| `runD1Batch` / `runD1Statement` / `firstD1Row` / `allD1Rows` / `runPreparedD1Batch` | `src/lib/estimates/d1-intents/database.ts` | Atomic D1 I/O |
| `prepareHistoryEventInsert` / `insertHistoryEvent` / `runMutationWithHistory` | `src/lib/estimates/d1-intents/history-events.ts` | History event + **`activity_event_outbox` row** (the outbox drain feeds the activity feed) |
| `prepareEstimateMutationIntent` / `readConcurrentEstimateMutationReceipt` / `buildEstimateMutationReceiptStatement` / `buildProjectPublicationRevisionForEstimate` / `buildProjectPublicationRevisionForProject` / `assertEstimateEditIntent` | `src/lib/estimates/d1-intents/intent-context.ts` | Access + intent + fingerprint + revision guard + receipt |
| `canEditEstimate` / `canEditProject` | `src/lib/estimates/d1-intents/access.ts` | Wraps `authz/d1-access.ts` strict checks |
| `createMutationRequestFingerprint` / `buildCommittedMutationReceiptStatement` / `readCommittedMutationReceipt` / `assertD1MutationStatementLimit` | `src/lib/estimates/mutation-receipts.ts` | Idempotency fingerprint + receipt + statement limit |
| `buildProjectComponentAttachmentDeleteRetentionStatements` / `buildProjectComponentAttachmentRestoreRetentionStatements` | `src/lib/estimates/project-component-attachment-retention.ts` | Attachment retention on row delete/restore |

### The actual problem: 9 forks bypass these primitives

The write-path trace found **9 forked write paths** that bypass one or more of
the primitives above (the original audit documented only 3). Each row is
evidence-backed:

| Fork | Database | History+Outbox | Intent/Receipt/Fingerprint | Revision guard | Statement limit | Access | Retention |
|------|----------|----------------|----------------------------|----------------|-----------------|--------|-----------|
| `ai/package-builder/apply.ts` | ✗ re-impl | ✗ re-impl (no outbox) | ✗ skip | ✗ skip | ✗ skip | half-fork | ✓ |
| `estimates/express-promotion-actions.ts` | ✗ re-impl | ✗ re-impl (no outbox) | ✗ skip | ✗ skip | ✗ skip | half-fork | — |
| `component-library/component-mutation-d1.ts` | ✗ re-impl | ✗ re-impl (no outbox) | partial (receipt only) | ✗ re-impl | ✓ | ✗ skip | — |
| `component-library/template-propagation-d1.ts` | ✗ re-impl | ✓ | ✗ skip | ✓ | ✓ | ✗ skip | — |
| `component-library/template-instance-actions.ts` | ✓ | ✓ | ✓ | ✓ | ✗ skip | half-fork | — |
| `component-library/template-lifecycle-actions.ts` | ✗ indirect | ✗ re-impl (no outbox) | partial (fingerprint only) | ✗ skip | ✓ indirect | half-fork | — |
| `component-library/component-permanent-delete.ts` | ✗ re-impl | ✗ re-impl (no outbox) | ✗ skip | ✗ re-impl | ✗ skip | ✗ skip | — |
| `reusable-sources/actions.ts` | ✓ | ✓ | ✓ | ✗ re-impl | ✓ | half-fork | — |
| `component-library/template-linked-mutation-d1.ts` | self-contained | n/a (snapshots only) | self-contained | self-contained | — | — | — |

### The single biggest integrity hole: the outbox

Every fork that hand-rolls the `estimate_sheet_events` INSERT
(`apply.ts:983,1487`, `express-promotion-actions.ts:1425`,
`component-mutation-d1.ts:1825`, `template-lifecycle-actions.ts:218`,
`component-permanent-delete.ts:954`) **silently drops the
`activity_event_outbox` write** that `prepareHistoryEventInsert` performs at
`history-events.ts:401-410`. The outbox row is what the cron drain
(`reconcileActivityOutbox` in `worker.ts`) reads to fan activity into the
workspace feed. These 5 forks produce history events that never reach the
activity feed. **UNIT-001 closes this hole first** — it is the smallest change
with the largest integrity payoff, and it requires no primitive extraction.

### What this pack does

1. **UNIT-001:** Route the 5 outbox-dropping forks through
   `prepareHistoryEventInsert`. No new primitive; just consume the existing one.
2. **UNIT-002:** Route the forks that skip the full intent+receipt+fingerprint
   flow (`apply.ts`, `express-promotion-actions.ts`, `component-permanent-delete.ts`)
   through `prepareEstimateMutationIntent` + `buildEstimateMutationReceiptStatement`
   so they gain idempotent replay and conflict detection.
3. **UNIT-003:** Route the forks that bump `publication_source_revision` inline
   (`component-mutation-d1.ts`, `component-permanent-delete.ts`,
   `reusable-sources/actions.ts`) through
   `buildProjectPublicationRevisionForEstimate` / `…ForProject`.
4. **UNIT-004:** Route the half-fork access paths through `assertEstimateEditIntent`
   / `assertProjectEditIntent` so the strict (not non-strict) check is the default.

The pack does NOT extract new primitives, NOT merge the write paths, and NOT
change the canonical `rows.ts`. The work is purely "make the forks consume what
already exists."

## 2. Task Contract

- **Objective:** route the 9 forked write paths through the existing shared
  integrity primitives in the `d1-intents/` family. Zero observable behavior
  change for the canonical paths; the forks gain the integrity guarantees they
  currently re-implement or skip — most concretely, the `activity_event_outbox`
  row that 5 forks silently drop.
- **Scope:** `src/lib/ai/package-builder/apply.ts`,
  `src/lib/estimates/express-promotion-actions.ts`,
  `src/lib/component-library/{component-mutation-d1,template-propagation-d1,template-instance-actions,template-lifecycle-actions,component-permanent-delete,template-linked-mutation-d1}.ts`,
  `src/lib/reusable-sources/actions.ts`. No new modules.
- **Exclusions:** the `EstimateSheetContent.tsx` God-component decomposition
  (separate direction option). The D1 runtime consolidation (Pack C —
  prerequisite). The test baselines (Pack B — prerequisite). Any change to the
  UI layer. **Do NOT extract new primitives** — the trace confirmed they exist.
- **Authority:** `AGENTS.md`, current source, `.ai/00_system`, and
  `.ai/03_plans/2026-07-31/Code-Improvement/`; this pack is historical only.
- **Owner:** none; all four predecessor units are `SUPERSEDED` and successor
  `UNIT-028` owns current-source revalidation.
- **Test authorization:** `NOT_REQUIRED` default, BUT Pack B's UNIT-002
  (`d1-intents/rows.ts` SQL characterization suite) is a **hard prerequisite**
  and must be VERIFIED before UNIT-001 starts. The characterization suite is the
  regression net for "zero observable behavior change."
- **Stop condition:** all four units VERIFIED; the three forks route through the
  shared primitives; the characterization suite stays green; the validator
  passes.

## 3. Repo conventions executors must match

- **Integrity skill:** read `.agents/skills/archestimator-estimate-mutation-integrity/SKILL.md`
  before starting. It owns the invariants this pack must preserve: revision-conflict
  fingerprinting, history-event emission, mutation-receipt writing, attachment
  retention, canonical-server-state-authoritative / optimistic-reversible.
- **`server-only` guard:** all `d1-intents` modules start with `import "server-only";`.
- **Batch semantics:** D1 `.batch([...])` is atomic (all-or-nothing). The
  primitives must compose into a single batch per mutation where possible;
  Pack A's UNIT-006 established the (data, event) atomicity pattern.
- **D1 runtime:** use `requireCloudflareD1Database`, `firstD1Row`, `allD1Rows`,
  `runD1Statement`, `runD1Batch` from `@/lib/cloudflare/d1-runtime` (Pack C's
  output). Do not introduce new local helpers.
- **Verification:**
  - `bun run type-check` — primary gate
  - `bun run lint`
  - `bunx vitest run tests/vitest/estimate-d1-intents-rows-sql.test.tsx --maxWorkers=1`
    (Pack B's UNIT-002 output) — the regression net; MUST stay green
- **No compatibility shims, flags, or dual paths** (AGENTS.md). Fix forward.

## 4. Requirements → units → evidence map

| REQ | Title | Units | Evidence |
|-----|-------|-------|----------|
| DATA-001 | All estimate-write forks emit the `activity_event_outbox` row | UNIT-001 | EVID-001 |
| DATA-002 | Forks that skip intent/receipt/fingerprint gain idempotent replay | UNIT-002 | EVID-002 |
| DATA-003 | Forks that bump `publication_source_revision` inline use the guard primitive | UNIT-003 | EVID-003 |
| DATA-004 | Forks that half-fork access use the strict `assert*EditIntent` primitive | UNIT-004 | EVID-004 |

## 5. Dependency order

UNIT-001 (outbox hole — smallest, highest payoff) → UNIT-002 (intent/receipt) →
UNIT-003 (revision guard) → UNIT-004 (access). All four are independent in
principle (each touches a different primitive), but UNIT-001 first is strongly
recommended: it is the smallest, most localized, and closes a real user-visible
bug (activity-feed items going missing). UNIT-002/003/004 can run in any order
after UNIT-001.

**Historical prerequisites from other packs (non-runnable):**
- Pack B UNIT-002 VERIFIED (the SQL characterization net) — confirms the
  canonical path's generated SQL stays identical when forks change around it.
- Pack C UNIT-001 + UNIT-002 VERIFIED (the shared D1 runtime) — the forks'
  re-implemented database helpers should already have been collapsed by Pack C.

## 6. Risks

- **RISK-001** (UNIT-001): `prepareHistoryEventInsert` resolves `workspaceId`
  via `readEstimateIntentProjectContext` when not supplied — the forks must
  supply enough context for this resolution, or the INSERT fails. Mitigation:
  each fork site already has `projectId`/`estimateId` in scope; pass them
  through.
- **RISK-002** (UNIT-002): `apply.ts`'s idempotent replay keys on the event
  row today; routing through `prepareEstimateMutationIntent` +
  `readConcurrentEstimateMutationReceipt` changes the replay key to the
  mutation receipt. The existing replay reader must be updated to check BOTH
  (receipt first, then event) during the transition. Mitigation:
  `readCommittedMutationReceipt` is the canonical replay reader; adopt it and
  delete the fork's local replay reader.
- **RISK-003** (UNIT-003): `buildProjectPublicationRevisionForEstimate` produces
  a guard statement that must be composed INTO the batch before the UPDATE;
  forks that currently bump the revision as a side-effect of the UPDATE must
  restructure to a separate guard statement. This changes the SQL shape but
  not the observable revision semantics.
- **RISK-004** (UNIT-004): some forks run in background-job contexts
  (`template-propagation-d1.ts`) where there is no user actor; the strict
  `assertEstimateEditIntent` requires an actor. These forks may need to
  document why they run without a user actor (the propagation job IS the
  authority) rather than force-fit the access primitive.

## 7. Anti-scope (do NOT do)

- Do NOT extract new primitives. The trace confirmed they already exist.
- Do NOT merge the 9 write paths into one. The primitives are shared; the batch
  composition stays per-path.
- Do NOT change `runMutationWithHistory`'s signature unless UNIT-001 reveals a
  concrete gap. It already composes mutation+history+outbox+batch.
- Do NOT decompose `EstimateSheetContent.tsx` (separate direction option).
- Do NOT change the optimistic-concurrency fingerprint string
  (`estimate_sheet_row_revision_conflict`) — clients depend on it.
- Do NOT add feature flags or a "new path vs old path" toggle. Fix forward.
- Do NOT skip the characterization suite — it is the gate for the canonical path.
