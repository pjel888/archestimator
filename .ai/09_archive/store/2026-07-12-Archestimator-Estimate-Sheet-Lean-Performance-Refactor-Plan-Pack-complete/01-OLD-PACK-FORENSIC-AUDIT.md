# 01 — Old Pack Forensic Audit

## 1. Audit question

Why did an estimate-sheet optimization program consume roughly eleven hours while delivering only a small amount of direct product optimization?

## 2. Structural diagnosis

### 2.1 It planned the entire performance domain before validating one interaction

The old pack committed to eleven sequential units:

1. evaluator and fixtures;
2. route/server fast path;
3. graph;
4. incremental derivation;
5. render boundary;
6. entity patch;
7. project-component fan-out;
8. mutation snapshot removal;
9. virtualization;
10. correctness/performance matrix;
11. integration/release.

This makes every plausible bottleneck part of the critical path, even though profiling should eliminate most hypotheses.

### 2.2 Unit 1 was a platform project

Before a product optimization, Unit 1 required:

- many runtime scripts;
- multiple fixture profiles;
- environment-mode plumbing;
- a custom Vitest reporter;
- a dedicated Playwright config;
- browser and component interop specs;
- source and producer fingerprints;
- plan-state parsing;
- receipt schemas;
- supersession records;
- evidence indices;
- lifecycle validation;
- broad tests for the evaluator.

The evaluator became more complex than the first product fix.

### 2.3 It confused reproducibility with product truth

Reproducibility is valuable when the metric is decision-relevant. The old program made every source change, fixture, command, and test receipt part of a closed evidence world before the important runtime interactions were proven.

That created a paradox:

- enormous confidence in how the harness ran;
- weak confidence in what actually made the product slow.

### 2.4 It turned source drift into an artificial blocker

The evaluator fingerprint covered a broad application path set. Any unrelated concurrent change could stale the run and force regeneration.

In a fast-moving shared repository, that makes a performance task continuously restart.

The correct scope is the direct hot path and its behavior, not a hash of more than a thousand files.

### 2.5 It generated work to test generated work

The program added tests for:

- source fingerprints;
- evidence indices;
- performance contract schemas;
- run lifecycle;
- reporter behavior;
- plan state;
- decision artifacts;
- hosted proof scripts;
- mode contexts and route metadata.

These tests can pass while the product remains slow.

### 2.6 It inserted rollback modes before there was an optimization to roll back

The route now resolves five `off | shadow | on` modes and sends them through context and DOM attributes. The modes are observability plumbing; no hot path uses them.

A feature flag is justified when:

- the behavior is risky;
- a staged rollout is required;
- the old and new path must coexist.

It is not justified merely because a future optimization might exist.

### 2.7 It required broad browser proof per unit

Browser proof is appropriate for user-visible responsiveness, but the old plan made multiple browser scenarios mandatory across most units before the causal bottleneck was known.

One targeted trace of the slow interaction should come first. Full end-to-end proof belongs at final integration, not every utility step.

### 2.8 It created a self-maintaining plan

Recent commits continued to update:

- runtime evidence directories;
- command receipts;
- evidence indices;
- manifest state;
- reporter contracts;
- local D1 preparation;
- Playwright runtime configuration.

This is maintenance of the performance program rather than improvement of the estimate sheet.

## 3. What was useful and must be retained

The old work was not worthless. Keep these outcomes:

- current source map of the estimate sheet;
- realistic dataset ceilings of 1,500 nodes and 5,000 rows;
- render probes that are a single null check outside tests;
- existing Server-Timing spans;
- identification of project-component fan-out;
- corrected duplicate acknowledgement;
- source-snapshot preservation;
- detached-library classification;
- bounded benchmark timeout;
- row/branch virtualization already in product;
- focused fixture builders when they can be imported directly without the runtime-evidence framework.

## 4. What is not reliable enough to gate implementation

- stale browser baseline placeholder;
- stale bottleneck-decision placeholder;
- synthetic “pass” receipts that do not match source execution;
- broad source fingerprints;
- generated metadata lineage;
- receipt completeness as a proxy for user responsiveness;
- 30-sample jsdom timing as a substitute for browser interaction;
- all-off mode metadata as proof of a rollback strategy;
- “implementation-ready” plan status without an activated product change.

## 5. Current measured signal

The current jsdom baseline reports:

```text
5,000 total rows
1,000 matching component rows
4,000 nonmatching rows inspected
threshold: 0
status: FAIL
```

The source explains the result:

1. find the selected row by recursively walking the tree;
2. derive its component identity;
3. recursively walk every node and row;
4. inspect every row's project-component identity;
5. clone matching rows;
6. separately collect rollback patches with another full traversal;
7. restore rollback patches by repeatedly traversing the whole tree once per patch.

This is a concrete, bounded first optimization.

## 6. Process rules learned

### Keep

- focused source inspection;
- one realistic fixture;
- one browser trace when authorized;
- direct before/after metric;
- narrow correctness tests;
- append-only short ledger entry;
- rollback plan proportional to change.

### Remove

- universal evaluator;
- evidence schema platform;
- source fingerprints;
- mode matrix;
- per-unit broad E2E;
- custom reporter;
- generated run directories;
- mandatory multi-review lanes;
- plan-state self-parsing;
- tests for plan artifacts;
- hosted proof before local hot-path change;
- all-bottleneck sequential chain.

## 7. New plan quality bar

The replacement plan itself is considered efficient only if:

- it has one canonical implementation file;
- every unit changes product code or removes obsolete machinery;
- conditional work can remain unactivated;
- no unit exists solely to build a proof platform;
- test proposals map to a real regression risk;
- a failed hypothesis shrinks scope rather than expanding infrastructure;
- first implementation result is a production hot-path change.
