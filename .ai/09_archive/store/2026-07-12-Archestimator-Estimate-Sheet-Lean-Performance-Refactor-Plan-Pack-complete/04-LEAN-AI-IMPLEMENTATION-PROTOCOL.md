# 04 — Lean AI Implementation Protocol

## 1. Objective

Make AI implementation fast by eliminating uncertainty, not by adding ceremony.

The agent must think deeply about the direct and evidence-backed blast radius, then execute the smallest coherent change.

## 2. Unit loop

Every unit follows exactly this loop:

```text
DISCOVER
  Read only the named files and direct callers.

BASELINE
  Capture one metric for the named interaction.

HYPOTHESIS
  Name one dominant cause and the expected code change.

IMPLEMENT
  Change the smallest coherent production boundary.

VERIFY
  Run only the authorized check that covers the regression risk.

COMPARE
  Record before/after and behavior result.

DECIDE
  Stop, revert, or activate the next unit.
```

No unit begins by building generic tooling.

## 3. Work-in-progress limit

Only one performance symptom is active at a time.

Allowed parallel work:

- one independent source-reading/research lane;
- one implementation lane;
- one bounded review lane only for a named high-risk mutation/state issue.

Not allowed:

- multiple agents modifying the same hot path;
- separate evaluator, test, documentation, and reviewer armies;
- concurrent speculative implementations of multiple bottlenecks;
- source-fingerprint reconciliation lanes.

## 4. Scope budget per unit

Default budget:

- one symptom;
- one hypothesis;
- one before/after metric;
- up to five primary production files;
- up to three focused behavior tests when authorized;
- no new dependency;
- no new migration unless required by the proven server bottleneck;
- no new feature flag unless rollout risk is concrete;
- one short ledger entry.

Exceeding the budget requires a written reason tied to correctness, not “completeness.”

## 5. Evidence budget

### Required

- source evidence;
- one direct metric;
- behavior risk statement;
- before/after result;
- known validation gap.

### Optional only when material

- React browser trace;
- query plan;
- heap profile;
- bundle report;
- hosted Worker proof;
- independent reviewer.

### Forbidden as default gates

- application-wide source hash;
- producer/evaluator hash;
- receipt schema;
- generated evidence index;
- test reporter;
- plan-state parser;
- per-command JSON receipt;
- multi-review admission packet;
- broad E2E per utility unit.

## 6. Stop rules

Stop a unit immediately when one is true:

1. target is met and behavior is preserved;
2. the hypothesis is disproven;
3. the measured cost is immaterial;
4. the change would require an unrelated architecture rewrite;
5. a user-gated test/browser boundary is reached after all safe source work;
6. two implementation attempts fail to improve the metric.

For a disproven hypothesis:

- remove temporary instrumentation;
- record the result in one paragraph;
- choose the next ranked hypothesis;
- do not broaden the evaluator.

## 7. Testing gate

Repository policy controls tests.

For this plan:

- source analysis and artifact creation require no tests;
- implementation units include exact `TEST_PROPOSAL` commands;
- no test/build/browser command is automatic;
- explicit user `TEST_TASK` is required;
- a test proposal is not a reason to stop safe code implementation.

## 8. Measurement discipline

### Before

Measure the exact operation under current source.

### During

Temporary inline timing or a focused profiler is acceptable.

### After

Repeat the same operation with the same fixture and environment.

### Do not

- change fixture, mode, and implementation simultaneously;
- claim p95 from a tiny or mixed sample;
- compare jsdom duration with browser duration;
- compare development and production builds as if equal;
- keep permanent instrumentation without product use.

## 9. AI decision format

Before editing, the agent writes internally or in the ledger:

```text
Symptom:
Metric:
Dominant evidence:
Hypothesis:
Files:
Behavior risk:
Test requirement:
Stop target:
```

After editing:

```text
Result:
Before:
After:
Behavior evidence:
Files changed:
Removed complexity:
Validation gap:
Next decision:
```

No larger packet is required.

## 10. Code-edit rules

- Re-read each touched file immediately before edit.
- Prefer pure helpers with explicit inputs.
- Preserve public types and call signatures where practical.
- Do not refactor names/layout outside the hot path.
- Preserve structural sharing.
- Delete superseded code in the same slice when safe.
- Avoid compatibility layers when all callers can be changed directly.
- Add comments only for non-obvious invariants.
- Keep temporary probes clearly removable.
- Do not leave both old and new state systems active indefinitely.

## 11. Review rules

Use independent review only for:

- optimistic update rollback correctness;
- shared component propagation;
- row revision/conflict handling;
- cross-tab query-cache consistency;
- data-loss risk.

Reviewer asks only:

1. Can the new path corrupt or lose edits?
2. Can rollback overwrite a newer mutation?
3. Are unrelated object references preserved?
4. Does the server remain authoritative?
5. Is any user-visible behavior changed?

A style review is not a release gate for this task.

## 12. Documentation rules

Update only:

- this plan ledger;
- current-state summary when implementation materially changes reality;
- a canonical technical decision if the state model changes.

Do not generate:

- per-run directories;
- JSON manifests;
- command receipts;
- hashes;
- duplicate reports;
- separate final audit documents.

## 13. Completion statement

The final implementation report must state:

- which interaction improved;
- which hot path was removed;
- before/after;
- behavior preserved;
- what was not tested due to authorization;
- whether a conditional unit is activated.

It must not claim the whole estimate sheet is optimized unless all named user interactions were measured.
