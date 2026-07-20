# Estimate Mutation Integrity Unification — Canonical Execution Plan

> Canonical execution artifact for the highest-leverage architecture move in the
> repo: extracting reusable `MutationIntent` primitives from the canonical
> `d1-intents/rows.ts` so that the four parallel estimate/component write paths
> share one integrity rule set.

## Status tuple

`IMPLEMENTATION_READY / NOT_STARTED / NOT_EVALUATED / N/A / ACTIVE`

- **Baseline HEAD:** `b8ec0edf3a144bcb49c2b5971a168ed30aecf2ab` (2026-07-20)
- **Suite version:** `2026-07-12`
- **Profile:** `high-blast-radius` (money-integrity layer; touches every estimate write path)
- **Action ceiling:** `IMPLEMENT_LOCAL` (pack is `PLAN_ONLY` at authoring; implementation awaits separate execution authorization AND the completion of prerequisite packs B + C)
- **Exact next unit:** `UNIT-001` (extract `MutationIntent` primitives — no callers changed yet)

## 1. Outcome and intent

Archestimator has **four parallel estimate/component write paths**, and only one
of them goes through the `d1-intents` integrity layer:

1. **Canonical** — `src/lib/estimates/d1-intents/rows.ts:2496`
   (`updateEstimateRowItemWithHistory`) centralizes revision checks, history
   events, mutation receipts, and attachment retention.
2. **AI Apply fork** — `src/lib/ai/package-builder/apply.ts:204-232,1348-1357`
   defines its own D1 helpers and re-implements `row_revision + 1` and the
   `estimate_sheet_row_revision_conflict` string inline.
3. **Express-promotion fork** — `src/lib/estimates/express-promotion-actions.ts:821-845`
   (15 raw SQL sites, own `requireExpressPromotionD1Database`).
4. **Component-mutation fork** — `src/lib/component-library/component-mutation-d1.ts:310-401,887`
   (26 raw SQL sites, own `runComponentRevisionGuardedBatch`).

The `archestimator-estimate-mutation-integrity` skill explicitly warns against
adding "a second mutation path" — there are now three extras. Mutation integrity
rules (revision-conflict fingerprinting, history events, mutation receipts,
attachment retention) must be remembered and re-implemented in each fork. A
future change to conflict semantics will silently diverge for AI-applied edits,
express promotions, and component mutations.

**This pack does NOT merge the four write paths.** Each fork exists for a reason
(atomic multi-table batches, idempotent AI replay). Merging them naively would
break idempotency or transactional boundaries. Instead, this pack **extracts the
integrity rules** — the revision-guard statement builder, the history-event
emitter, the receipt writer, the attachment-retention builder — from
`d1-intents/rows.ts` into composable primitives that all four paths import. One
place knows what "a row mutation" must always do; four places use it.

## 2. Task Contract

- **Objective:** extract `MutationIntent` primitives; route the three forks
  through them. Zero observable behavior change for the canonical path; the
  forks gain the integrity guarantees they currently re-implement (or skip).
- **Scope:** `src/lib/estimates/d1-intents/` (new primitives module + `rows.ts`
  refactor), `src/lib/ai/package-builder/apply.ts`, `src/lib/estimates/express-promotion-actions.ts`,
  `src/lib/component-library/component-mutation-d1.ts`.
- **Exclusions:** the `EstimateSheetContent.tsx` God-component decomposition
  (separate direction option). The D1 runtime consolidation (Pack C —
  prerequisite). The test baselines (Pack B — prerequisite). Any change to the
  UI layer.
- **Authority:** `AGENTS.md`, current source, `.ai/00_system`, the
  `archestimator-estimate-mutation-integrity` skill, this pack.
- **Owner:** lead single-agent. The integrity layer is tightly coupled; no
  parallel writers on the primitives module or `rows.ts`.
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
| DATA-001 | Shared `MutationIntent` primitives exist and the canonical path uses them | UNIT-001 | EVID-001 |
| DATA-002 | AI Apply fork routes through the primitives | UNIT-002 | EVID-002 |
| DATA-003 | Express-promotion fork routes through the primitives | UNIT-003 | EVID-003 |
| DATA-004 | Component-mutation fork routes through the primitives | UNIT-004 | EVID-004 |

## 5. Dependency order

`UNIT-001` (extract primitives, canonical path uses them) → `UNIT-002` (AI Apply)
→ `UNIT-003` (express-promotion) → `UNIT-004` (component-mutation).

UNIT-002/003/004 each depend on UNIT-001 but are independent of each other; they
can run in any order after UNIT-001, but doing them sequentially keeps the
"shared primitives are the single source of truth" invariant verifiable at each
step.

**Hard prerequisites from other packs:**
- Pack B UNIT-002 VERIFIED (the SQL characterization net).
- Pack C UNIT-001 + UNIT-002 VERIFIED (the shared D1 runtime).

## 6. Risks

- **RISK-001** (UNIT-001): extracting primitives from `rows.ts` without changing
  observable SQL is delicate — the revision guard, history event, and receipt
  statements must compose identically to today's monolithic batches. Mitigation:
  the characterization suite (Pack B UNIT-002) is the gate; if it fails, the
  extraction changed behavior.
- **RISK-002** (UNIT-002): the AI Apply path's idempotent replay keys on the
  event row; routing it through the primitives must preserve the replay
  contract. Mitigation: UNIT-002 updates the replay reader alongside the
  primitive adoption; Pack A UNIT-006 already established atomicity.
- **RISK-003** (UNIT-003): express-promotion has its own `requireExpressPromotionD1Database`
  and 15 raw SQL sites — some may be reads, not mutations. Only the mutation
  sites route through the primitives; reads use the shared D1 runtime directly.
- **RISK-004** (UNIT-004): component-mutation's 26 raw SQL sites include
  template-propagation logic that may not map cleanly onto row-mutation
  primitives. Some sites may need new primitives (e.g. a
  `ComponentVersionBumpIntent`); extract those only if the friction is real, not
  speculative.

## 7. Anti-scope (do NOT do)

- Do not merge the four write paths into one. The primitives are shared; the
  batch composition stays per-path.
- Do not decompose `EstimateSheetContent.tsx` (separate direction option).
- Do not change the optimistic-concurrency fingerprint string
  (`estimate_sheet_row_revision_conflict`) — clients depend on it.
- Do not add feature flags or a "new path vs old path" toggle. Fix forward.
- Do not skip the characterization suite — it is the gate.
