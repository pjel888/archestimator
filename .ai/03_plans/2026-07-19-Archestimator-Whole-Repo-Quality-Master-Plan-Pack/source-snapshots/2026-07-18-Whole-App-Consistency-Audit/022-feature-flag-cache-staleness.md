# Unit 022 — Feature-Flag Cross-Isolate Staleness (WEAKENED → LOW/hygiene)

**Finding:** F-22 · **Original severity:** MEDIUM · **Re-verdict (2026-07-19):** **WEAKENED → LOW (hygiene)** · **Status:** TODO (P4)

> **Re-verification:** Multi-isolate is real (runs on Cloudflare Workers), but the flags are
> admin-gated rollout switches (`isAdminDashboardEnabled`,
> `isClientPortalLegacyMigrationEnabled`, `isClientPortalLegacyWriteFreezeEnabled`) that are
> rarely toggled. `setFeatureFlag` already calls `revalidatePath("/admin/flags")`
> (`flag-actions.ts:46`) and nulls the local isolate's cache. Other isolates see the new value
> within 15s. For this use case (rare admin actions, not a security gate, and
> `isAdminDashboardEnabled` has an env override that takes precedence), 15s propagation is
> acceptable. The `loadFeatureFlagMap` fail-open-on-D1-outage path shows the design is
> intentional. Priority P4 — at most lower the TTL and document the window.

**Finding:** F-22 · **Severity:** MEDIUM · **Priority:** P3 · **Effort:** S · **Risk:** MED
**Requirement:** `REQ-010` (item) · **Status:** TODO · **Depends on:** — · **Test:** NOT_REQUIRED

## Problem

`featureFlagCache` is a module-level singleton shared across all requests in a
Worker isolate. For global flags this is fine, but two issues:

1. `setFeatureFlag` only nulls the cache on the isolate that performed the
   mutation; a second isolate continues to serve the old value for up to 15s.
2. `revalidatePath` does not bust other isolates' in-memory cache, so a flag toggle
   can appear "stuck" for some users until the TTL expires or the isolate recycles.

## Evidence

`src/lib/admin/feature-flags.ts`:
```ts
const FEATURE_FLAG_CACHE_TTL_MS = 15_000;          // 5
let featureFlagCache: FeatureFlagCacheEntry | null = null;  // 30
// reads: 66-67, 78, 83
setFeatureFlag { // ~130
  featureFlagCache = null; // local isolate only
}
```

## Fix Direction

This is an inherent limitation of in-isolate caching; pick the cheapest honest fix:

1. **Document and lower TTL:** drop `FEATURE_FLAG_CACHE_TTL_MS` to ~2-3s and add a
   comment that flag changes propagate within the TTL across isolates. Cheapest.
2. **Version-gate the cache:** include a cheap monotonic version (e.g. read from a
   D1 `flag_version` counter on writes) in the cache key, so a write anywhere
   invalidates reads everywhere on next D1 touch. More correct, more work.
3. **Drop the in-memory cache for admin-mutable flags** and read from D1 each
   time (acceptable if the read is cheap and indexed).

Prefer option 1 for now (flag toggles are rare and admin-initiated; 2-3s
propagation is honest). Add a clear comment so the behavior isn't mistaken for a
bug later.

### Owned paths
- `src/lib/admin/feature-flags.ts`

### Prohibited
- Do not add a new Durable Object or Queue just for cache invalidation (overkill
  for alpha).

## Acceptance Evidence

- `AC-001`: a comment documents the cross-isolate propagation window, and the TTL
  is set to the chosen value.

## Recovery

If option 1 is insufficient for a flag that gates a critical path, escalate to
option 2 for that flag only.
