# Unit 008 — Onboarding "Create An Estimate" Gated On The Wrong Milestone (HIGH)

**Finding:** F-08 · **Severity:** HIGH · **Priority:** P1 · **Effort:** S · **Risk:** LOW
**Requirement:** `REQ-008` · **Status:** TODO · **Depends on:** — · **Test:** NOT_REQUIRED

## Problem

The "Create an estimate" checklist item is marked `complete` when
`hasMilestone(progress, "workspace_ready")` is true. But `workspace_ready` is
milestone rank 1 — reached right after `invite_accepted` (rank 0) and **before**
`project_created` (rank 2). So the checklist can report fully complete with **no
project and no estimate ever created**. The estimate item can also read "complete"
while the "project" item still reads "next", which is internally inconsistent.

## Evidence

`src/lib/onboarding/first-estimate-checklist.ts:11-24` (milestone rank):
```ts
const milestoneRank: Record<ActivationMilestone, number> = {
  invite_accepted: 0,
  workspace_ready: 1,
  project_created: 2,
  first_area_created: 3,
  first_row_priced: 4,
  first_valid_total: 5,
  // ...
};
```

`src/lib/onboarding/first-estimate-checklist.ts:37-38`:
```ts
{ id: "project", ..., status: hasMilestone(progress, "project_created") ? "complete" : "next" },
{ id: "estimate", ..., status: hasMilestone(progress, "workspace_ready") ? "complete" : "next" },  // ← wrong gate
```

The "project" item correctly gates on `project_created`, but the "estimate" item
gates on the **earlier** `workspace_ready`.

## Fix Direction

Gate the estimate item on a milestone that actually implies an estimate exists.
Two options, in order of correctness:

1. **Best:** add/use a real `first_estimate_created` milestone (if activation
   tracking already records estimate creation) and gate on it.
2. **Minimum:** gate on `project_created` (rank 2) so the estimate item can never
   be complete before the project item.

```ts
{ id: "estimate", ..., status: hasMilestone(progress, "first_estimate_created" /* or "project_created" */) ? "complete" : "next" },
```

Pick option 1 only if the milestone is already emitted somewhere; otherwise option
2 is the safe minimal fix. Verify against `activation-types.ts` /
`activation-repository.ts` for the real milestone set before choosing.

### Owned paths
- `src/lib/onboarding/first-estimate-checklist.ts`
- (option 1 only) `src/lib/onboarding/activation-repository.ts`, the place that
  emits milestones on estimate creation.

### Prohibited
- Do not reorder the milestone ranks to paper over the bug.
- Do not change `isComplete` semantics; fix the gate, not the aggregation.

## Acceptance Evidence

- `AC-001`: the "estimate" item's gate is at least as late as `project_created`
  (option 2) or a real estimate milestone (option 1).
- `AC-002`: with only `workspace_ready` reached, both "project" and "estimate"
  read "next"; `isComplete` is false.

## Recovery

If neither `first_estimate_created` nor a usable milestone exists, option 2
(`project_created`) is the floor and is safe.
