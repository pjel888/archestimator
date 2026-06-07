# Gradual Rollout Strategy

**Status:** Future implementation guidance only. No feature flag or runtime switch exists yet.

## Rollout Principles

1. Ship unused pure utilities first.
2. Adopt read-only share surfaces before editable workshop surfaces.
3. Keep each phase revertable as one coherent commit.
4. Do not add environment flags unless the live risk justifies the operational overhead.
5. Do not combine performance code splitting with behavior extraction.

## Phase Rollout

| Step | Rollout shape | User risk | Rollback |
| --- | --- | --- | --- |
| Tree-core utilities | Add files/tests; no imports from live surfaces | None | Delete new files |
| Headless shell contracts | Add files/tests; optional story/test harness only | None to low | Delete new files |
| Share tree unification | Wire `/share/[token]` read-only panel/view | Low | Revert share commit |
| Library tree indexing | Wire library manager tree helpers | Medium | Revert library commit |
| Estimate tree extraction | Wire editable tree model/hooks | High | Revert estimate tree commit |
| Estimate sheet decomposition | Wire row/activity/proposal chunks | Critical | Revert sheet commit |
| Virtualization | Add only if measured and approved | High | Revert dependency/code; close Phase 8 |

## Feature Flag Guidance

Flags are optional for the MVP because tree-core can ship unused and share tree is read-only. If a flag is introduced later, it must:

- default to existing behavior;
- be removable after rollout;
- not require provider settings for local validation;
- not hide missing tests or measurement;
- be documented in this folder and `.ai/10_state/current-state.md`.

Do not add `NEXT_PUBLIC_TREE_CORE_ENABLED` by default. A compile/runtime flag is only justified if editable estimate-tree wiring needs canary exposure.
