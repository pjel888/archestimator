# 06 — Measurement and Budgets

## 1. Measurement philosophy

Measure only enough to make the next implementation decision.

The plan uses four metric classes:

1. user-perceived interaction;
2. React render work;
3. algorithmic work count;
4. server/query timing.

No universal evaluator is needed.

## 2. Canonical fixture

Reuse one deterministic large fixture representative of the product ceiling:

- up to 1,500 nodes;
- up to 5,000 rows;
- realistic depth/skew;
- at least one project component with many instances;
- several areas with row tables;
- no duplicate ownership between fixture systems.

Use a smaller fixture for behavior tests.

Do not generate seven profiles for every unit.

## 3. Interaction metrics

### M1 — Row edit response

**Action:** change one numeric cell in an existing row.

Measure separately:

- input event → next paint;
- `EstimateSheetContent` actual render duration;
- active row render duration/count;
- unrelated row render count;
- node/project total visible update;
- server save completion.

Targets:

- input → paint: <100 ms target, <200 ms maximum Beta tolerance;
- unrelated row renders: 0 for stable unaffected rows;
- full node-total traversal: 0 per keystroke;
- optimistic visual response precedes network completion.

### M2 — Shared project-component edit

**Action:** update a shared field on one component with many instances.

Measure:

- matching rows;
- nonmatching rows inspected;
- tree patch duration;
- rollback patch collection duration;
- references changed outside affected branches.

Targets:

- nonmatching row identity inspections: 0 after index build;
- affected rows updated exactly once;
- unrelated branch references preserved;
- rollback generation proportional to matches, not total rows;
- no repeated full-tree patch per rollback row.

### M3 — Search/filter response

**Action:** type into estimate search with large tree.

Measure:

- input → paint;
- filtered-tree calculation duration;
- branch render count;
- stale/deferred result state if used.

Targets:

- input remains synchronous;
- avoidable work gated;
- <100 ms target;
- deferred rendering used only after structural improvement if needed.

### M4 — Expand/collapse

**Action:** toggle a branch containing many descendants.

Measure:

- event → paint;
- branches rendered;
- branch flatten calculation;
- mounted DOM rows.

Targets:

- <300 ms for 100 children;
- only affected/visible branches render;
- virtualizer remains stable.

### M5 — Route open

**Action:** direct open and internal navigation to an estimate.

Use existing Server-Timing:

- route context;
- node read;
- row read;
- tree build;
- edit capability;
- RSC/client ready.

Targets follow current project budgets:

- transition <100 ms target where achievable;
- no new mode/config read;
- no avoidable serial query;
- no route rewrite if client render is dominant.

## 4. Diagnostic tools

### Source-level work counts

Preferred when the issue is algorithmic:

- rows inspected;
- nodes visited;
- affected paths cloned;
- total calculations called;
- component renders.

The current render probe can support focused tests.

### React Profiler

Use only around:

- `EstimateSheetContent`;
- active branch/table;
- active row.

Record:

- actualDuration;
- baseDuration;
- commit count;
- changed props.

### Browser Performance panel

Use one trace for the named interaction when explicitly authorized.

Inspect:

- input delay;
- JavaScript task;
- React render/commit;
- layout/paint;
- long tasks;
- next paint.

### Existing Server-Timing

Use for route work before adding new server instrumentation.

### Simple timing

A temporary `performance.now()` or `console.time` around one pure function is acceptable.

Remove it after the decision unless it becomes a focused reusable probe.

## 5. Sample policy

### Diagnosis

One clean trace is enough to identify a dominant subtree/function.

### Before/after claim

Default:

- one warm-up;
- five equivalent runs;
- report median;
- report range;
- same fixture/environment;
- no p95 claim from five runs.

Use more samples only when variance changes the decision.

### Do not mix

- jsdom and browser timings;
- development and production builds;
- different CPU throttle;
- different fixture;
- different open panels;
- cold and warm route loads.

## 6. Baseline reuse

Retain only the meaningful old baseline fact:

```text
M-MUTATE-CLIENT-FANOUT-NONMATCH-INSPECTIONS
value: 4000
rowCount: 5000
matchCount: 1000
status: FAIL
```

Do not reuse stale placeholders as release evidence.

The old 30-sample microtimings for ancestor/component lookup already show those isolated recursive operations are sub-millisecond in jsdom. They are not the first performance priority by themselves. The issue is repetition and invalidation across interactions.

## 7. Instrumentation budget

Permanent new production overhead:

- no always-on profiler;
- no new analytics beacon;
- no mode context;
- no DOM mode attributes;
- no source fingerprint;
- no runtime evidence writer.

Permitted:

- existing null-check render probes;
- existing server timing;
- optional dev-only focused mark behind the existing trace mechanism.

## 8. Decision thresholds

Activate a candidate only if one condition holds:

- it accounts for at least 20% of the interaction task;
- it causes a long task;
- it exceeds the product budget;
- it scales with total rows/nodes on a single-row interaction;
- it triggers unrelated renders;
- it introduces a user-visible pause.

Reject a candidate when:

- measured cost is below 1 ms and not repeated materially;
- it is already virtualized and mount does not dominate;
- it is a closed/unopened surface after gating;
- it requires broad architecture for marginal gain;
- the symptom disappears after an earlier unit.

## 9. Unit receipts

One Markdown ledger entry per unit:

```markdown
### UNIT-00X — <date>

- Symptom:
- Fixture:
- Before:
- Bottleneck:
- Change:
- After:
- Behavior evidence:
- Validation gap:
- Next:
```

No JSON receipt.

## 10. Final performance statement

Permitted:

> Row editing on the large fixture improved from X to Y median input-to-paint, unrelated row renders fell from A to B, and full-tree total traversals were removed.

Not permitted without evidence:

- “the estimate sheet is fully optimized”;
- “enterprise-ready”;
- “5,000 rows are instant”;
- “no regressions”;
- “p95” from tiny samples;
- hosted/production claims from jsdom.
