# UNIT-010 — `disableCookieCache: true` Forces Per-Request D1 Session Lookup · PERF-AUTH-001

**Finding:** PERF-AUTH-001 · **Priority:** P1 · **Wave:** 2 (W2-1 / HL-2) · **Effort:** M · **Risk:** Medium
**Roadmap item:** W2-1 · **Test decision:** `TEST_PROPOSAL` (auth surface; revocation correctness benefits from a test)
**local_implementation:** `NOT_STARTED` · **external_lifecycle:** `NOT_STARTED`

## Outcome

Authenticated workshop requests hit D1 0-1 times for session resolution on a
cache hit (Better Auth cookie cache re-enabled with a short TTL and explicit
revocation check), and the closed-beta + profile reads are batched into a
single round-trip. Modeled 50-70% reduction in D1 reads on authenticated
requests; reduced p95 TTFB on workshop navigation.

## Affected surface

- `src/lib/auth/better-auth-cloudflare.ts:317-319` — passes
  `disableCookieCache: true` to `auth.api.getSession`
- `src/lib/auth/session.ts:65-77` — issues 2 more sequential D1 reads
  (closed-beta + profile) after the session lookup
- `src/lib/auth/session.ts:98` — `cache()` collapses duplicates within a single
  request only (does not help across requests)

## Dependencies

- **Audit commit history first** to confirm why `disableCookieCache: true` was
  originally set (per PERF-AUTH-001 "Dependencies: Audit commit history for
  the reason `disableCookieCache: true` was added"). This is a prerequisite,
  not a code dependency — it determines whether the revocation replacement is
  KV-backed, D1-backed, or already covered.
- **Hosted D1 runtime proof extended to authenticated surfaces** (W0-5) —
  required to *measure* the 50-70% reduction. The static change can ship
  without it; `external_lifecycle` ACHIEVED needs the measurement.
- Constraints (from finding): must preserve session revocation semantics; must
  not weaken tenant isolation. No AUTH_BOUNDARY violation — local source +
  migration only.

## Implementation intent

From PERF-AUTH-001 "Recommendation" (do all three):

1. **Re-enable Better Auth cookie cache with a short TTL** (e.g. 60 s) and an
   **explicit revocation check**. The revocation list can live in KV or D1
   with periodic refresh — pick the storage that matches the original disable
   reason. Remove `disableCookieCache: true` at `:317-319` (or set it to
   `false`).
2. **Batch the closed-beta + profile reads** at `session.ts:65-77` into a
   single D1 query using `Promise.all` or a JOIN, so the post-session reads
   collapse from 2 to 1.
3. **Verify middleware reads session once** and React `cache()` at `:98`
   handles intra-request reuse (already in place — confirm, do not change
   unless broken).

**Do not** remove `disableCookieCache: true` without the revocation
replacement in step 1. The original disable was likely a revocation-safety
choice; removing it without a replacement weakens security.

## Expected evidence

Verification command from PERF-AUTH-001 "Verification":

```
# Hosted D1 query-count probe (cf:d1-runtime-proof extended to authenticated
# surfaces); p95 TTFB before/after on /workshop/*
bun run cf:d1-runtime-proof   # (once W0-5 extends it to authenticated routes)
```

Evidence class: `TEST_PROPOSAL` — auth-surface change with revocation
correctness risk materially benefits from a revocation test. Proposed test:
revoke a session, confirm the next authenticated request within the cookie
TTL is rejected (revocation check fires despite the cached cookie). Do NOT
execute without explicit user authorization. The static change itself
(diff + revocation-list wiring) is the non-test decisive signal for
implementation completion.

## Completion signal

- `better-auth-cloudflare.ts:317-319` no longer passes
  `disableCookieCache: true`; a short-TTL cookie cache is active with a
  revocation check wired to KV or D1.
- `session.ts:65-77` issues one batched query (or JOIN) instead of two
  sequential reads.
- A revocation test exists OR a `TEST_PROPOSAL` is recorded with the exact
  command (not auto-executed).

## Recovery path

**Required (Risk: Medium).** If the cookie cache surfaces a revocation gap
(session remains valid after explicit revoke within the TTL), restore
`disableCookieCache: true` immediately. The batched closed-beta + profile read
can stay (it is independent of the cache decision). If tenant isolation is
weakened in any observed case, revert the entire change and re-audit the
revocation design before re-attempting.
