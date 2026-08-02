# Execution Guide

> **Historical only — do not execute.** This guide belongs to a predecessor
> superseded without implementation by
> `.ai/03_plans/2026-07-31/Code-Improvement/`. All 67 predecessor units are
> `SUPERSEDED`; there is no next unit or ready slice. The instructions below
> document the former operating model and grant no current authority.

## Former Recommended Mode

Use one leader-owned implementation run with a persistent goal and bounded
native subagents. In OMX CLI this corresponds to a Team execution surface with
Ultragoal-style persistence; in Codex App or a plain session, use native role
agents directly. Do not start multiple workflow runtimes against the same pack.

The leader owns integration, the unit ledger, GitNexus reconciliation, and the
final completion claim. Child agents own only explicit, non-overlapping paths
for one bounded unit or evidence slice.

## Former Start Contract

Before selecting a unit:

1. Run `bun run supermemory:ensure`.
2. Read the FAST PATH block in `.ai/10_state/current-state.md`.
3. Inspect `git status --short --branch` and preserve unrelated work.
4. Read `README.md`, `IMPLEMENTATION_PLAN.md`, and `LOOP_LEDGER.md`.
5. Select the lowest dependency-ready unit whose owned paths do not overlap an
   active lane.
6. Reread every shared file immediately before editing.

## Former Per-Unit Contract

Each executor must:

- reverify the cited current-source premise before editing;
- run GitNexus upstream impact for every function, class, or method that will be
  modified and report direct callers, affected flows, and risk to the leader;
- stop and escalate HIGH or CRITICAL impact to the leader before editing;
- read the local Next.js 16 guide before changing framework APIs or conventions;
- keep work inside the unit's owned paths and avoid new dependencies;
- prefer deletion, existing utilities, and current patterns;
- record a receipt containing changed paths, evidence, remaining risk, and the
  next dependency state;
- for evidence/contract gates, record the exact positive or negative outcome,
  apply the matching `plan-pack.json#outcome_transitions` mutations, then evaluate
  `#readiness_rules`; dependency completion alone must not imply the positive
  branch;
- apply mutations atomically with the manifest precedence contract:
  `SUPERSEDED` dominates `BLOCKED`, identical targets are idempotent no-ops, and
  all other unmet preconditions fail without a partial status update;
- never reactivate an authorization-blocked unit automatically; boundary
  resolution requires current-source revalidation, an explicit regenerated
  transition, refreshed hashes, and a passing pack validator;
- for high-risk data, queue, scanner, SQL, or refactor work, record the
  fix-forward/recovery path and evidence that recovery remains usable.

Source snapshots are evidence only. When a canonical unit conflicts with a
snapshot, the canonical unit wins.

## Former Verification Policy

The default product-test mode is `NOT_REQUIRED`. Use source inspection,
GitNexus, TypeScript/LSP evidence, lint/static checks, SQL dry runs, and narrow
runtime evidence as named by each unit.

Do not create, expand, repair, or run automated tests, builds as test gates,
Playwright, browser automation, screenshots, Storybook, or visual QA without a
current user-requested `TEST_TASK`. A `TEST_PROPOSAL` records the exact risk and
command but does not authorize execution.

Documentation and plan-pack validators are static contracts and may run when
their artifacts change.

## Former Parallelism Rules

- Parallelize only units with satisfied dependencies and disjoint owned paths.
- Security/auth, queue semantics, shared provider boundaries, and component
  propagation remain leader-reviewed integration lanes even when research is
  parallel.
- Evidence units may run beside implementation units when they are read-only.
- A child reports shared-file conflicts, scope expansion, missing authority, or
  HIGH/CRITICAL impact upward instead of absorbing adjacent work.
- One canonical receipt updates `LOOP_LEDGER.md`; agents do not maintain private
  competing status files.
- Ready slices advertise eligible ownership only; the leader still serializes
  shared paths and opens at most one writer per file.

## Historical Stop State

Do not resume this pack or recalculate predecessor readiness. Its manifest is
fixed at `NOT_READY` / `NOT_STARTED` / `N/A`, with `next_unit: null`, empty
`ready_slices`, and every unit `SUPERSEDED`. Follow the exact successor path
above for current execution and evidence requirements.
