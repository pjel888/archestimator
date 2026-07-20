# UNIT-004 — Route forks through assertEstimateEditIntent (strict access)

## Goal

Route the forks that half-fork the access layer (calling the non-strict
`canEditEstimateInD1` / `isWorkspaceEditorInD1` directly from `authz/d1-access`)
through the strict `assertEstimateEditIntent` / `assertProjectEditIntent`
wrappers in `d1-intents/access.ts`, so the access check is uniform and throws
on denial rather than returning a boolean the caller must remember to check.

## Status

`READY` · depends on: `UNIT-002` · requirement: `DATA-004` · risks: `RISK-004`

## Why this matters

The canonical paths use `assertEstimateEditIntent` (which wraps the STRICT
`canEditEstimateStrictInD1` and THROWS on denial). Six forks import the
NON-STRICT `canEditEstimateInD1` / `isWorkspaceEditorInD1` directly from
`@/lib/authz/d1-access` and call them inline:

| Fork | Non-strict access import site |
|------|-------------------------------|
| `ai/package-builder/apply.ts` | `:5` (`canEditEstimateInD1`, `isWorkspaceEditorInD1`) |
| `estimates/express-promotion-actions.ts` | `:7` (`canEditEstimateInD1`, `isWorkspaceEditorInD1`); called `:1076-1080` |
| `component-library/template-instance-actions.ts` | `:7` (`canEditEstimateStrictInD1`, `canAccessEstimateInD1`); inline check `:94` |
| `component-library/template-lifecycle-actions.ts` | `:7` (`isWorkspaceEditorInD1`) |
| `reusable-sources/actions.ts` | `:6` (`canAccessEstimateInD1`, `canEditEstimateInD1`); inline `:631` |
| `component-library/component-mutation-d1.ts` | (access delegated to caller) |

The non-strict variants return `boolean`. If the caller forgets to throw on
`false`, the mutation proceeds unauthorized. The strict `assert*` wrappers
throw — fail-closed by construction.

## Current state

The primitives (from `src/lib/estimates/d1-intents/intent-context.ts`):

```ts
export async function assertProjectEditIntent(
  database, actor, projectId
): Promise<EstimateIntentProjectContext>  // throws on denial, line 84

export async function assertEstimateEditIntent(
  database, actor, estimateId
): Promise<EstimateIntentContext>  // throws on denial, line 97
```

And from `src/lib/estimates/d1-intents/access.ts`:

```ts
export async function canEditEstimate(database, actor | null, estimateId): Promise<boolean>  // line 57
export async function canEditProject(database, actor | null, projectId): Promise<boolean>   // line 66
```

Note: `prepareEstimateMutationIntent` (UNIT-002) ALREADY calls
`assertEstimateEditIntent` internally. So forks that adopt UNIT-002 get strict
access for free. This unit is for forks that are NOT adoption candidates for
UNIT-002 (background jobs, lifecycle ops) OR for the inline access checks that
happen before the intent primitive is called.

## Owned paths / resources

The 6 fork files above.

## Implementation boundary

For **each** fork:

1. Identify the inline `canEditEstimateInD1(...)` / `isWorkspaceEditorInD1(...)`
   call site.
2. Replace it with `assertEstimateEditIntent(database, actor, estimateId)` (or
   the project variant). The `assert*` form throws on denial — remove the
   `if (!allowed) throw ...` boilerplate around the old boolean call.
3. If the fork already adopts `prepareEstimateMutationIntent` (UNIT-002), the
   access check is redundant — delete the inline check entirely and let the
   intent primitive own it.
4. **RISK-004 — background jobs:** `template-propagation-d1.ts` runs without a
   user actor (the propagation job is the authority). Do NOT force-fit
   `assertEstimateEditIntent` here. Instead, document at the entry point WHY
   no actor check applies (the job was enqueued by an authorized user action;
   the job's authority derives from that enqueue). This is the documented
   exception, not the rule.
5. Do NOT change the access-control POLICY — only the SHAPE (throw-on-deny
   vs return-boolean).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Type-check | `bun run type-check` | exit 0 |
| Lint | `bun run lint` | exit 0 |
| Access audit | `rg -n "canEditEstimateInD1|isWorkspaceEditorInD1|canAccessEstimateInD1" src/lib/ai/package-builder/apply.ts src/lib/estimates/express-promotion-actions.ts src/lib/component-library/template-instance-actions.ts src/lib/component-library/template-lifecycle-actions.ts src/lib/reusable-sources/actions.ts` | matches only where a documented exception applies |

## Scope

**In scope:** the 5 non-background forks above (the 6th, `component-mutation-d1.ts`,
delegates access to its caller; if UNIT-002/003 land first, its caller is
already strict).

**Out of scope:**
- `template-propagation-d1.ts` — background job; documented exception.
- The canonical paths.
- Changing access policy.

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run lint` exits 0
- [ ] The 5 forks use `assertEstimateEditIntent` / `assertProjectEditIntent` (or have adopted `prepareEstimateMutationIntent` from UNIT-002 which wraps it)
- [ ] The access audit shows no non-strict direct imports in the 5 forks (except documented exceptions)
- [ ] `template-propagation-d1.ts` has a comment documenting why no actor check applies
- [ ] No access POLICY change (same users can do the same things; only the check shape changes)

## Acceptance evidence

- The access audit returns the expected reduced set.
- `git diff` shows inline boolean checks replaced with `assert*` calls.

## STOP conditions

- A fork's access decision is more nuanced than the strict check allows (e.g.
  it allows a read-only viewer to perform one specific action). Surface it;
  the fork may need to keep a custom check, documented.
- A fork runs without an actor and is NOT a background job (would be a real
  bug — surface it).
- The characterization suite fails — the access change broke a canonical
  path. Revert and reconcile.

## Recovery

Each fork is independent. Revert and reconcile.

## Maintenance notes

- After this unit, the only estimate-write paths that run without the strict
  access check are documented background jobs.
- A reviewer should confirm no access POLICY changed — the same users should
  be able to perform the same actions; only the check SHAPE (throw vs return)
  changed.
- The `template-propagation-d1.ts` documented exception is the single known
  load-bearing exception; if another appears, it must be justified or it's a
  bug.
