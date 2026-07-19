# Unit 021 — `useEstimateWorkspaceState` Never Resets On Sign-Out (MEDIUM)

**Finding:** F-21 · **Severity:** MEDIUM · **Priority:** P2 · **Effort:** S · **Risk:** LOW
**Requirement:** `REQ-010` (item) · **Status:** TODO · **Depends on:** — · **Test:** NOT_REQUIRED

## Problem

`useEstimateWorkspaceState` is a module-scoped Zustand store with no persistence,
no logout reset, and no per-route scoping. `resetEstimateWorkspaceState()` exists
but is wired to nothing. After logout, the next user on the same browser tab
inherits the previous user's `selectedNodeIdByEstimateId` /
`activeTabIdByEstimateId` maps (keyed by estimate/tab UUIDs), leaking which
sheet/tab the prior user had open. This is a PII-leak-on-shared-device bug.

## Evidence

`src/hooks/use-estimate-workspace-state.ts:30`:
```ts
export const useEstimateWorkspaceState = create<...>((set) => ({ ... }));
```

`grep -rn resetEstimateWorkspaceState src/` returns only the definition at line 95
— **no callers**.

## Fix Direction

Call `resetEstimateWorkspaceState()` from the sign-out path and on user-id change.
Options:

1. Subscribe to auth state changes (if the auth provider exposes a hook) and reset
   when the user id changes or becomes null.
2. Call it explicitly in the sign-out server action / `signOutForPendingInvite`
   client path.

Prefer option 1 (catches all sign-out vectors) with option 2 as a belt-and-braces
explicit call.

Also audit other ephemeral in-memory stores for the same gap (`estimate-ui-store`,
`navigation-ui-store`, `workshop-sidebar-status-store`) and reset them on sign-out
too if they hold user-scoped state.

### Owned paths
- `src/hooks/use-estimate-workspace-state.ts`
- the sign-out path (find it: `signOutForPendingInvite` and Better Auth sign-out)

### Prohibited
- Do not persist this store (it is intentionally ephemeral).
- Do not reset stores that hold genuinely user-independent UI state.

## Acceptance Evidence

- `AC-001`: after sign-out, `useEstimateWorkspaceState` state is empty for the next
  user.

## Recovery

If the auth provider exposes no stable change-subscription, use the explicit
sign-out call (option 2) everywhere sign-out happens.
