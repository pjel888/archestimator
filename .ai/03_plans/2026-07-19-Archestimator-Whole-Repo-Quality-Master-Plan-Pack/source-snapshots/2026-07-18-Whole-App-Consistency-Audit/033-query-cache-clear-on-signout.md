# Unit 033 (N-02) — TanStack Query Cache Not Cleared On Sign-Out (NEW, LOW)

**Finding:** N-02 (discovered during F-21 re-verification) · **Severity:** LOW · **Priority:** P3 · **Status:** TODO

## Problem

The sign-out path (`src/lib/auth/actions.ts:223` `signOut`) does: better-auth handler, clear
session cookies, `redirect("/login")`. It does **not** clear any client cache — neither Zustand
stores nor the TanStack Query cache. On a shared device, after user A signs out and user B signs
in on the same origin, user B can briefly see user A's cached estimate/notification data until
refetches overwrite it. Same class of cross-user leak as F-21 (workspace state store).

## Fix direction

Centralize sign-out client cleanup in one place:
1. Call `resetEstimateWorkspaceState()` (and the other ephemeral stores' resets) — fixes F-21.
2. Call `queryClient.clear()` (or `queryClient.invalidateQueries()` / `removeQueries()` with the
   root key) on sign-out — fixes this.

Both belong in the same sign-out client handler so they can't drift apart.

## Acceptance

After sign-out, no prior user's data remains in client stores or the query cache.
