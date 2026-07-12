# 00 — Executive Reset

## 1. Binding decision

The July 8 performance pack is retained only as historical research and evidence. It is not an active execution plan.

Its own current README records the correct conclusion:

- the eleven-unit chain was disproportionate;
- the execution budget went into a bespoke evidence pipeline;
- broad browser/runtime proof repeatedly preceded a measured bottleneck;
- only limited product fixes landed;
- no broad performance optimization was proven;
- future work must start with one user-visible symptom and a cheap baseline.

This plan formalizes that reset and converts it into a direct implementation strategy.

## 2. Root cause

The failure was not insufficient diligence. It was an inverted delivery order.

### Previous order

```text
Invent evaluator
→ invent evidence schemas
→ invent fingerprints
→ invent mode framework
→ add reporters
→ add fixtures
→ add many tests for the framework
→ generate receipts
→ reconcile plan state
→ try to measure product
→ eventually optimize
```

### New order

```text
Choose one slow interaction
→ take one focused trace
→ name the dominant function/subtree/query
→ edit the smallest production boundary
→ verify the exact behavior at risk
→ compare before/after
→ stop or choose the next symptom
```

## 3. Quantified imbalance

The first implementation commit of the old program added 4,073 lines across 39 files.

Approximately:

- **317 lines** were inert application plumbing for performance modes;
- **3,756 lines** were scripts, contracts, receipts, fixtures, reporters, configs, and tests.

The application plumbing did not activate an optimization:

- five modes were created;
- every mode defaulted to `off`;
- the route loaded the mode snapshot;
- the workspace rendered mode data attributes;
- the estimate hot paths did not consume the modes.

This is the definition of process overhead preceding product value.

## 4. Evidence quality finding

The old pack's current artifacts are uneven:

- `jsdom-baseline.json` contains a real failing metric: 4,000 unrelated rows inspected during a 5,000-row shared-component fan-out;
- `browser-baseline.json` is still a stale placeholder;
- `bottleneck-decision.json` is still a stale placeholder;
- numerous receipts prove the evidence pipeline executed, not that the estimate sheet became faster.

A synthetic metric also reports zero closed-dialog move-option work, while current source still memoizes `collectRowMoveNodeOptions(estimateTree)` without checking whether the move dialog is open. This demonstrates why source and real interaction traces remain authoritative over generated receipt status.

## 5. Product-first priorities

### Priority A — Already proven

Project-component fan-out traverses unrelated rows.

Fix this first.

### Priority B — Strong source evidence; confirm with one trace

A row keystroke updates a parent-owned `editableRows` record, clones that record, re-renders the giant sheet component, recomputes all node totals, and makes memo comparators inspect rows.

This is the likely editor-interaction bottleneck.

### Priority C — Low-risk dormant work

Several full-tree derivations can be gated by the UI feature that needs them:

- row move options;
- move source/target contexts;
- library catalogue inputs;
- flattened rows for activity/detail/move surfaces;
- filters and groupings not currently active.

### Priority D — Evidence-gated only

- route fast path;
- database indexes/query redesign;
- branch virtualization changes;
- row virtualizer replacement;
- Worker/provider optimization;
- React Compiler;
- web workers.

These are not authorized by dataset size alone.

## 6. Replacement architecture decisions

### DEC-001 — Keep TanStack Query as server-tree authority

The confirmed estimate tree remains in the existing query cache. Do not copy it into a new global state system.

### DEC-002 — Move transient high-frequency drafts out of the sheet root

Editable input drafts are high-frequency client UI state. The repository's own performance protocol assigns this class of state to Zustand or a local external store.

Use one store per mounted estimate, with row-level selectors. It is not a global cross-project store.

### DEC-003 — Build one narrow tree index

Build a lightweight index from each confirmed tree revision:

- row location/path;
- node path/parent;
- component identity → row IDs;
- row total;
- node ancestor path.

The index serves measured patch and total paths. It is not a general graph platform.

### DEC-004 — Update totals by delta

When one row draft changes:

1. compute old and new row total;
2. calculate the delta;
3. update the row total;
4. apply the delta to that row's node and ancestor totals.

Do not recursively total the entire tree on every keystroke.

### DEC-005 — Patch only affected structural paths

For one row, clone the containing node and ancestors only.

For a shared project component:

1. resolve matching row IDs from the index;
2. group rows by containing node;
3. clone affected nodes and shared ancestors once;
4. preserve all unrelated object references.

### DEC-006 — Defer non-urgent derived views, not controlled input state

Search/filter rendering may use `useDeferredValue` after structural work is minimized.

Controlled row inputs stay synchronous.

### DEC-007 — Remove custom memo comparators when subscription design makes them unnecessary

A comparator that loops through every row is itself work.

After row-level store subscriptions:

- pass stable server item props;
- let each row subscribe to its own draft/selection/status;
- prefer default `memo` equality or no memo when profiling shows it is unnecessary.

### DEC-008 — Simplify before introducing concurrency

Do not add workers, complex transitions, or compiler/toolchain changes while avoidable synchronous full-tree work remains.

## 7. Scope

### In scope

- shared component fan-out patching;
- rollback patching;
- editable draft ownership;
- incremental totals;
- row/table/root render boundaries;
- dormant derivation gates;
- selected-node/tree lookup index;
- current performance-mode/tooling cleanup;
- focused measurement and regression checks.

### Conditional scope

- route query optimization;
- D1 fast path;
- virtualizer behavior;
- component library cache projection;
- large export path.

Each conditional item requires a named metric showing it dominates after earlier slices.

### Out of scope

- estimate feature redesign;
- collaboration redesign;
- component-library redesign;
- database migration unless a measured query requires it;
- mobile editing redesign;
- React Compiler;
- new observability platform;
- hosted benchmarking framework;
- CI performance lab;
- broad codebase cleanup.

## 8. Completion rule

The plan ends when the named interactions meet target or no longer show a material regression.

It does not require all possible performance ideas to be implemented.

Unused conditional units remain `NOT_ACTIVATED`, not “incomplete.”
