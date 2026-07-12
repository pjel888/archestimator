# 09 — Risks, Rollback, and Release

## 1. Risk register

| ID | Risk | Severity | Mitigation |
|---|---|---:|---|
| R-001 | Indexed component patch misses an instance | P0 | build identity map from confirmed tree; exact behavior test |
| R-002 | Shared patch propagates row-local fields | P0 | preserve explicit shared-field allowlist |
| R-003 | Rollback overwrites newer edit | P0 | operation IDs/revisions; grouped rollback only for current operation |
| R-004 | Draft store diverges from query cache | P0 | query remains confirmed authority; explicit confirm/reject/rebase actions |
| R-005 | Totals drift after many edits | P0 | delta invariant tests; rebuild on authoritative tree replacement |
| R-006 | Tab/estimate change leaks drafts | P0 | per-estimate provider identity/key; dispose store |
| R-007 | Proposal preview/export omits drafts | P1 | read complete store snapshot on demand; focused behavior coverage |
| R-008 | Store selector returns new object and rerenders | P1 | primitive/stable snapshots; immutable cached row snapshot |
| R-009 | Structural insert/move invalidates index | P0 | rebuild/patch index on structural operations |
| R-010 | Removing comparator exposes rerenders | P1 | remove only after row subscriptions; render probe |
| R-011 | Deferred search displays confusing stale data | P2 | only if needed; visible subtle stale state |
| R-012 | Virtualized focused editor unmounts | P1 | no virtualization change by default |
| R-013 | Cleanup deletes a useful normal helper | P1 | import search; extract minimal reusable helper first |
| R-014 | Route work becomes another speculative project | P1 | activation threshold and Server-Timing |
| R-015 | New store becomes a general app state dump | P1 | explicit state boundary; no server/query/modal data |
| R-016 | Index becomes a generic graph framework | P1 | fixed fields and consumers; no plugin/mode layer |
| R-017 | New tests grow into another suite | P1 | per-unit maximum and risk mapping |
| R-018 | Browser proof unavailable | P2 | source/component evidence; report user-perceived claim gap honestly |
| R-019 | Existing unrelated changes conflict | P1 | current branch; re-read files; small units; no auto-branch |
| R-020 | Performance improves synthetic fixture only | P1 | one realistic fixture + final real interaction when authorized |

## 2. Correctness invariants

### Row calculations

For every row:

```text
subtotal = quantity × unit cost
adjustment value = subtotal × adjustment percentage
total = subtotal + misc + adjustment
```

Quantity-contingency rules remain canonical.

### Tree totals

For every node:

```text
node total =
  direct row totals
  + child node totals
```

Project total is the sum of root totals.

Incremental totals must equal a full recomputation after any sequence of operations.

### Shared component

- shared fields propagate;
- local quantity/contingency/adjustment/misc remain local;
- initiating row gets the complete requested patch;
- identity/provenance remain correct.

### Optimistic updates

- UI responds before network;
- server result confirms row revision/value;
- stale conflict refreshes authoritative data;
- error rollback restores only the failed operation;
- later edits win over earlier rollback.

## 3. Unit rollback

### UNIT-001

Rollback by reverting indexed patch helper and mutation integration. No schema or persisted data change.

### UNIT-002

Keep old root draft state only until new path reaches focused behavior proof. Remove it in the same unit before completion.

Do not ship both paths behind a new mode. If rollback is needed, revert the unit commit.

### UNIT-003

Each gate is individually reversible.

### UNIT-004

Deleted framework is recoverable from Git history. It should not have a runtime rollback mode.

## 4. Rollout

### Local implementation

- one unit at a time;
- current branch/worktree;
- focused source diff;
- no provider mutation.

### Internal dogfood

After authorized evidence:

- use a real large estimate;
- normal row edits;
- project-component edits;
- search and expand;
- tab switch;
- proposal preview;
- save/conflict recovery.

### Beta

Use normal release flow. Do not expose a performance mode UI.

If a high-risk state refactor warrants a temporary deployment flag, use the existing feature-flag system and one boolean—not the retired five-mode framework. This requires a concrete rollout need and owner approval.

## 5. Monitoring

Existing signals:

- save failures;
- row revision conflicts;
- mutation durations;
- route Server-Timing;
- render probes in tests;
- user feedback.

Optional temporary dev metrics:

- input→paint;
- sheet/row render count;
- full-total call count;
- shared patch inspected rows.

Do not add paid APM or always-on detailed edit telemetry.

## 6. Failure handling

### Wrong total

- stop rollout;
- revert state/total unit;
- compare incremental map with full recomputation;
- preserve server data;
- add focused sequence regression.

### Missing shared instance update

- revert indexed fan-out;
- inspect identity source;
- rebuild index from authoritative tree;
- do not fall back silently to “best effort.”

### Draft loss

- stop;
- preserve query cache/server row;
- revert draft-store unit;
- inspect estimate/tab provider lifecycle and confirmation flow.

### Slow interaction remains

- do not add more caching blindly;
- take a new trace;
- rank next dominant cost;
- activate one conditional unit only.

## 7. Release gates

Required:

- named metric improved or target met;
- behavior invariant evidence;
- no known P0;
- old framework cleanup complete or explicitly scheduled immediately after product fix;
- no production mode plumbing left unused;
- current-state truth updated;
- honest test/browser gap.

Not required for every unit:

- full suite;
- hosted performance proof;
- bundle analyzer;
- broad Lighthouse;
- all fixtures;
- all old receipts.

Those become release-level evidence only when relevant and authorized.

## 8. No-regression claims

Use precise language.

Good:

> The active row edit no longer triggers a full node-total traversal, and unrelated row render probes remain zero on the large fixture.

Bad:

> The estimate editor is bug-free and fully optimized.

## 9. Conditional unit closure

Mark a conditional unit:

- `NOT_ACTIVATED — metric within target`, or
- `ACTIVATED — evidence <reference>`.

Do not leave it “pending” forever merely because the idea exists.

## 10. Final operational result

The desired end state is easier to operate:

- fewer scripts;
- fewer tests;
- no perf mode environment matrix;
- no evidence lifecycle;
- no custom reporter;
- one direct fixture;
- focused metrics;
- simple Git rollback;
- less runtime code.
