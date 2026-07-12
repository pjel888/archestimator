# 07 — Minimum Sufficient Testing

## 1. Principle

Testing exists to control a named product risk. It is not an implementation phase of equal size to the feature.

The previous program tested its evaluator, receipts, fingerprints, modes, reporters, and plan lifecycle. This plan tests:

- calculations;
- exact patch targets;
- optimistic update/rollback;
- render isolation;
- user interaction.

## 2. Repository authorization

Tests, builds, browser automation, and broad validation remain user-gated under `AGENTS.md`.

This document contains `TEST_PROPOSAL`s only.

An implementation agent must:

1. make all safe source changes;
2. name the risk and exact command;
3. wait for explicit `TEST_TASK`;
4. report the gap if authorization is not granted.

## 3. Test selection algorithm

For each production change:

```text
What can break?
→ Which existing test is closest?
→ Can one pure test prove the invariant?
→ Is one component test needed for React behavior?
→ Is browser evidence required for the performance claim?
```

Default maximum per unit:

- two pure/unit test files;
- one component/integration file;
- one final browser scenario for the whole flow, not each helper.

## 4. UNIT-001 risk matrix

| Risk | Minimum evidence |
|---|---|
| wrong shared rows patched | pure indexed patch test |
| unrelated row changed | structural/reference and value assertion |
| row-local fields propagated | patch allowlist test |
| rollback wrong | grouped rollback test |
| newer operation overwritten | existing operation-ID integration or one focused test |
| performance still scans | work-count assertion or focused before/after |

Do not add:

- test for index serialization;
- test for a new evidence schema;
- test for script output;
- E2E browser flow for a pure tree helper.

## 5. UNIT-002 risk matrix

| Risk | Minimum evidence |
|---|---|
| draft lost on typing | component or store test |
| row B rerenders when row A changes | existing render probe |
| totals incorrect | pure total delta test |
| ancestor rollup incorrect | deep-tree test |
| confirmation changes value | store confirm test |
| failure/conflict restores | integration/store test |
| drafts leak across estimate/tab | provider identity/reset test |
| proposal preview misses draft | existing preview behavior test if affected |

### Essential cases

1. update one row draft;
2. exact row total updates;
3. exact ancestor totals update;
4. unrelated row selector reference stable;
5. confirm clears dirty state without total jump;
6. reject reverses delta;
7. tree replacement rebuilds baseline once.

Do not build a generic state-store conformance suite.

## 6. UNIT-003 risk matrix

| Change | Minimum evidence |
|---|---|
| move options gated | source/work-count test; dialog behavior if existing |
| library catalogue gated | existing library-open behavior |
| path/code index | pure index test |
| deferred search | component search behavior |
| comparator removed | render probe + behavior |

One test can cover multiple closely related invariants.

## 7. Performance evidence levels

### Level A — Algorithmic

Use for UNIT-001:

- inspected row count;
- nodes/paths cloned;
- call count.

This is deterministic and cheap.

### Level B — React component

Use for UNIT-002/003:

- render probes;
- `<Profiler>` actual duration;
- input behavior.

### Level C — Browser

Required to claim user-perceived responsiveness:

- input event to next paint;
- search/expand interaction;
- route open.

Run only when authorized.

### Level D — Hosted

Required only for hosted/provider claim:

- real Cloudflare/D1 route timing;
- production-like asset/bundle.

Not required for local React state refactor completion.

## 8. Proposed focused test commands

Exact file names must be reconciled against current source immediately before implementation.

```bash
# Pure patch/index/store tests
bun run test -- \
  tests/unit/estimate-row-tree-patch.test.ts \
  tests/unit/estimate-tree-index.test.ts \
  tests/unit/estimate-edit-store.test.ts

# Targeted DOM behavior
bun run test:dom -- \
  tests/vitest/estimate-sheet-row-editing.test.tsx \
  tests/vitest/estimate-sheet-render-isolation.test.tsx

# Static verification
bun run type-check
bun run lint

# Final browser interaction, only once and only if authorized
bun run test:e2e -- e2e/estimate-sheet-performance.spec.ts
```

The old dedicated E2E file should be rewritten into a simple product scenario if retained. It must not depend on runtime manifests, receipts, reporter schemas, or performance modes.

## 9. Final browser scenario

One scenario is sufficient for the main flow:

1. open a deterministic large estimate;
2. edit a normal row;
3. verify input and totals;
4. edit a project component with multiple instances;
5. verify linked instances and unrelated rows;
6. search;
7. expand/collapse;
8. save/confirm;
9. capture interaction measurements.

Optional denial/recovery branch:

- force one row revision conflict;
- verify authoritative refresh and draft recovery.

Do not repeat the scenario for every mode. There are no modes.

## 10. Test quality rules

- assert behavior and state, not implementation filenames;
- avoid brittle source-string assertions unless proving absence of a dangerous import/path;
- no snapshot test for large component markup;
- no artificial sleeps;
- deterministic IDs/fixtures;
- no tests that mutate plan artifacts;
- no tests that require Git history/clean worktree;
- no broad suite repair unless the implementation actually breaks it;
- no pass claim based only on test existence.

## 11. When no new test is correct

No new test is needed when:

- removing inert mode data attributes;
- deleting unused scripts/config;
- replacing one equivalent derived constant;
- gating a pure calculation with an already-covered UI state;
- static call/import evidence proves cleanup.

Record why existing evidence is sufficient.

## 12. Completion evidence matrix

| Unit | Required without test authorization | Additional with TEST_TASK |
|---|---|---|
| 001 | source diff + deterministic work-count reasoning | focused patch/rollback tests |
| 002 | source architecture + dependency map | store/render/totals tests + optional browser |
| 003 | source gating + existing behavior map | focused UI/render tests |
| 004 | import/package search + deletion map | typecheck/lint |
| 005 | Server-Timing before/after | targeted route/hosted proof |
| 006 | source/trace design | one browser interaction |
| 007 | honest summary | authorized final focused checks |

## 13. Forbidden testing expansion

Do not recreate tests for:

- performance mode snapshots;
- plan manifest transitions;
- run lifecycle;
- evidence indices;
- fingerprints;
- test receipts;
- custom reporter;
- hosted proof script source;
- release decision JSON;
- quiet-window admission;
- multi-review receipts.
