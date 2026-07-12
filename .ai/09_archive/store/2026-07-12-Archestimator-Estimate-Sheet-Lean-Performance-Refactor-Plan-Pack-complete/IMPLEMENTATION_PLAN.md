# Implementation Plan — Lean Estimate Sheet Performance Refactor

**This file is the sole implementation authority.**

## 1. Outcome

Improve the estimate sheet through direct, bounded production changes while deleting the obsolete performance framework.

The first deliverable is a real hot-path fix, not tooling.

## 2. Execution policy

- Units are executed in order only while their activation criteria remain true.
- `UNIT-001`, `UNIT-002`, `UNIT-003`, and `UNIT-004` are the default critical path.
- Conditional units can remain `NOT_ACTIVATED`.
- Tests/browser/builds are user-gated.
- Every unit ends with one ledger entry.
- Maximum two failed implementation attempts per hypothesis.
- No unit creates a reusable performance framework.

## 3. Status table

| Unit | Priority | Status | Product effect |
|---|---:|---|---|
| UNIT-001 | P0 | READY | Eliminate proven shared-component full-tree fan-out |
| UNIT-002 | P0 | READY after 001 | Isolate row drafts and update totals incrementally |
| UNIT-003 | P1 | READY after 002 | Gate dormant derivations and simplify render subscriptions |
| UNIT-004 | P1 | READY after first product fix | Remove old mode/evidence/tooling framework |
| UNIT-005 | Conditional | NOT_ACTIVATED | Route/server optimization |
| UNIT-006 | Conditional | NOT_ACTIVATED | Virtualization refinement |
| UNIT-007 | P0 release | PLANNED | Final integration and truth update |

---

# UNIT-001 — Indexed Shared Project-Component Patch

## Symptom

Updating one project component scans unrelated estimate rows and creates expensive rollback work.

## Existing evidence

Large fixture:

- 5,000 rows;
- 1,000 matching component instances;
- 4,000 nonmatching rows inspected;
- hard metric failure.

## Scope

Primary files:

- `src/lib/estimates/estimate-row-tree-patch.ts`
- `src/hooks/use-estimate-row-mutations.ts`
- new `src/lib/estimates/estimate-tree-index.ts` or a narrower colocated helper
- direct focused tests only if authorized

## Required change

### A. Build a narrow index

For a confirmed tree snapshot, index:

- row ID → node/path/row index;
- project component ID → exact row IDs;
- node path/parents.

The index can be created:

- once per query tree reference in the estimate sheet; and/or
- once per mutation snapshot if the persistent index integration would expand scope.

Choose the smaller implementation that removes repeat scans.

### B. Replace fan-out traversal

Refactor:

- `findProjectComponentIdentityForRow`;
- `patchProjectComponentInstanceRowsInTree`;
- `collectProjectComponentRollbackPatches`;
- `restoreEstimateRowPatchesInTree`.

New behavior:

1. resolve initiating row from index;
2. resolve component ID;
3. read exact row IDs;
4. collect exact previous patches;
5. patch affected nodes/ancestor paths in one grouped operation;
6. rollback affected rows in one grouped operation.

### C. Preserve behavior

- initiating row gets full patch;
- sibling instances get only shared fields;
- row-local quantity/adjustment/misc fields stay local;
- row revisions and source snapshots remain correct;
- unrelated rows and branches preserve reference identity;
- missing component identity falls back to indexed single-row patch, not full scan.

## Non-goals

- row draft store;
- route optimization;
- component library cache indexing;
- generic graph;
- D1 changes;
- feature modes.

## Metric

Before:

- 4,000 nonmatching inspections.

Target:

- 0 nonmatching project-component identity inspections during mutation after index build;
- exact match count updated;
- grouped rollback path.

## Acceptance

- linked instances receive shared patch;
- unrelated components unchanged;
- source row receives full patch;
- rollback restores exact prior values;
- rollback does not overwrite a newer operation;
- structural sharing outside affected paths;
- no new dependency.

## TEST_PROPOSAL

Risk: shared component update/rollback can corrupt multiple rows.

Proposed focused command, to be finalized against current test names:

```bash
bun run test -- tests/unit/estimate-row-tree-patch.test.ts
```

Add at most three tests if missing:

1. exact fan-out and zero unrelated identity calls;
2. grouped rollback;
3. structural sharing/unrelated values.

Do not run without `TEST_TASK`.

## Stop

Stop after this unit if:

- the measured user symptom was shared-component update and target is met; or
- the next user-visible symptom is not row editing.

Otherwise continue to UNIT-002.

---

# UNIT-002 — Per-Row Draft Subscriptions and Incremental Totals

## Activation

Run one focused row-edit trace after UNIT-001.

Activate if any is true:

- `EstimateSheetContent` re-renders on each keystroke;
- unrelated row/table renders occur;
- `computeNodeTotals` runs on each keystroke;
- input-to-paint exceeds target;
- full `editableRows` record cloning is material.

Source evidence strongly predicts activation, but the trace records the baseline.

## Scope

Primary files:

- `EstimateSheetContent.tsx`
- `estimate-sheet/rows/editable-row-model.ts`
- `estimate-sheet/rows/row-table.tsx`
- new narrow editing store/provider
- tree index from UNIT-001
- mutation integration

## Required change

### A. Create one per-estimate transient edit store

Move from the root:

- `editableRows`;
- dirty row IDs;
- row draft total state.

Rows subscribe by row ID.

Do not move confirmed query tree or server data.

### B. Initialize and reconcile

- initialize from current confirmed tree;
- reset on estimate/tab identity change;
- confirm a row from server result;
- restore on failure/conflict;
- rebuild on authoritative tree replacement;
- avoid an Effect that copies the whole tree after every render.

### C. Incremental totals

- initial O(n) total build;
- row update calculates delta;
- update exact ancestor node totals;
- update project total;
- node/header components subscribe to exact total.

Remove `computeNodeTotals(displayedSheetNodes, editableRows)` from the keystroke path.

### D. Simplify props

Remove broad `editableRows` propagation through:

- branch props;
- row table props;
- table comparator.

Each row reads its own draft.

### E. Preserve commit behavior

- controlled input state remains synchronous;
- blur/commit mutation unchanged semantically;
- dirty/save state remains visible;
- optimistic tree patch and server confirmation remain authoritative;
- proposal preview reads a complete store snapshot only when needed.

## Non-goals

- selection store unless trace shows selection causes broad churn;
- library server data migration;
- structural node actions;
- universal Zustand architecture;
- transition around controlled input.

## Metrics

Targets:

- unrelated row render count: 0 for one cell keystroke;
- full node-total traversals per keystroke: 0;
- input-to-paint: <100 ms target;
- active row total and ancestor totals update immediately;
- store update cost proportional to row depth.

## Acceptance

- all editable fields preserve behavior;
- quantity contingency and adjustment math unchanged;
- save/dirty/failed states correct;
- conflict/refetch resets draft safely;
- tab/estimate change does not leak drafts;
- project/area totals correct;
- proposal preview/export reads current intended values;
- no stale closure in row callbacks.

## TEST_PROPOSAL

Named risks:

- lost/incorrect drafts;
- incorrect totals;
- rollback/conflict overwrites;
- unrelated rerenders.

Proposed focused commands:

```bash
bun run test:dom -- tests/vitest/estimate-sheet-row-editing.test.tsx
bun run test -- tests/unit/estimate-edit-store.test.ts
```

At most:

- pure store total/delta tests;
- one row editing integration;
- one render-isolation probe.

Do not run without `TEST_TASK`.

## Stop

If input target is met and no remaining named symptom exists, skip UNIT-003 candidates that are immaterial.

---

# UNIT-003 — Dormant Derivation Gates and Render Simplification

## Activation

Activate low-risk items whose current source clearly performs work while the owning UI is closed, plus any derivation shown in the row-edit/search trace.

## Scope

Primary:

- `EstimateSheetContent.tsx`
- row table/branch props
- tree index helpers

## Required changes

### A. Move options

Do not call full-tree option collection when the dialog is closed.

Use indexed node metadata while open.

### B. Library catalogue

Do not collect component catalogue inputs before library intent/open.

Preserve lazy library query behavior.

### C. Selected node presentation

Replace separate recursive path and code calculations with index lookup.

### D. Search/filter dependencies

- search input stays synchronous;
- use normalized/deferred query only for the displayed tree if needed;
- inactive facet/group filters return original node reference;
- value-dependent filters subscribe to totals only while active;
- avoid whole draft-map dependency.

### E. Comparator simplification

After UNIT-002:

- remove O(rows) custom comparator checks tied to broad state;
- keep only cheap identity checks that profiling proves useful;
- rows own their subscription.

### F. Flattening

Keep full row flattening gated to open detail/activity/move surfaces.

Audit remaining callers and gate similarly.

## Metrics

- closed move-option work: 0 by source and runtime;
- unopened library catalogue work: 0;
- selected path/code recursive traversals: 0;
- search input-to-paint meets target;
- comparator work does not scale with unrelated rows on a keystroke.

## Acceptance

- dialogs and library open with correct data;
- search/facets/grouping behavior unchanged;
- selected breadcrumb/code correct after structural edits;
- no delayed input state;
- no inaccessible stale-results state.

## TEST_PROPOSAL

Focused only:

- closed-surface no-work probes;
- selected-node index correctness;
- search/filter behavior.

No new E2E suite per derivation.

---

# UNIT-004 — Retire the Obsolete Performance Framework

## Timing

Execute after UNIT-001 has landed, so cleanup is not the first product deliverable.

It may run in parallel with UNIT-002 only if files do not overlap and coordination is explicit.

## Scope

Remove inert application plumbing and dedicated evidence machinery listed in `08-CLEANUP-AND-SIMPLIFICATION-MAP.md`.

## Required changes

### Application

Remove:

- performance-mode server loader;
- mode definitions;
- client mode context/provider;
- route mode resolution;
- workspace props/data attributes.

### Scripts/config

Remove obsolete dedicated estimate performance framework:

- prepare/run/validate/gate/decision/release/supersession/fingerprint scripts;
- custom performance contracts/reporters;
- dedicated Playwright performance config/helpers/specs that exist only for the retired framework;
- package `perf:estimate:*` entries;
- custom Vitest reporter wiring used only by the framework.

### Tests

Remove tests whose subject is:

- mode plumbing;
- evidence contracts;
- fingerprints;
- plan state/lifecycle;
- receipts/reporters;
- hosted proof scripts;
- decision artifacts.

Keep behavior tests that exercise real estimate-sheet functionality.

### Plan/evidence

- mark old pack superseded by this pack;
- retain historical README/findings;
- archive or delete generated runtime runs according to repository archive policy;
- do not migrate every receipt.

## Acceptance

- no production import of retired modes;
- no dangling package script;
- no test imports deleted reporter/contracts;
- normal app behavior unchanged;
- net deletion substantial;
- no replacement framework added.

## TEST_PROPOSAL

Static checks only if authorized:

```bash
bun run type-check
bun run lint
```

Do not rebuild the old harness to prove its deletion.

---

# UNIT-005 — Conditional Route/Server Optimization

## Activation

Only if:

- direct route/navigation symptom remains;
- Server-Timing shows route/server work dominates;
- client render is no longer the main cost.

## Ranked hypotheses

1. avoidable serial access/edit query;
2. route context returns more data than initial selected tab needs;
3. node/row query or normalization dominates;
4. tree build dominates;
5. RSC serialization/client payload dominates.

## Rules

- optimize the dominant span only;
- use existing repository methods where possible;
- add an index/migration only with query evidence;
- do not implement the null fast-path stub merely to complete an old unit;
- do not create shadow/on modes;
- compare direct and internal navigation separately.

## Possible changes

- include edit capability in route context consistently;
- narrow selected-tab query;
- parallelize independent reads;
- reduce serialized fields;
- cache only safe request-local duplicate reads;
- add D1 index based on query plan.

## Stop

Do not proceed if server portion is already within target or <20% of ready time.

---

# UNIT-006 — Conditional Virtualization Refinement

## Activation

Only if a browser trace shows mount/commit dominates after UNIT-002/003.

## Candidate

When one express editor is active, keep other rows virtualized rather than disabling virtualization for the whole table.

## Requirements

- focused editor never unmounts while active;
- keyboard navigation remains correct;
- drag/drop remains correct;
- variable heights measured;
- no scroll jumps;
- accessibility semantics preserved.

## Rejected default

Do not rewrite tree/row virtualization because the fixture is large. Current virtualization is already functional.

---

# UNIT-007 — Final Integration and Truth Update

## Scope

- re-run only authorized focused measurements/checks;
- record before/after;
- update current-state and canonical performance note;
- classify conditional units;
- confirm old pack superseded;
- report net production/tooling lines added/removed;
- report known gaps.

## Completion criteria

- UNIT-001 complete;
- UNIT-002 complete if activated;
- UNIT-003 complete for activated derivations;
- obsolete framework removed;
- behavior risks covered by authorized focused evidence;
- row-edit and/or named symptom meets target;
- no P0 correctness issue;
- no broad unmeasured performance claim.

## Final report format

```text
User-visible symptoms addressed:
Measured bottlenecks removed:
Before/after:
Correctness evidence:
Net complexity:
Conditional units not activated:
Tests/browser not run:
Remaining risk:
```
