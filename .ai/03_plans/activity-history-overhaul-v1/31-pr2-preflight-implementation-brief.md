# 31 — PR 2 Preflight Implementation Brief

**Date:** 2026-06-02
**Status:** Fourth-pass final — execution-ready
**Purpose:** Narrow engineering brief for PR 2: preflight correctness cleanup. Safe, low-risk fixes that unblock composer work. No access telemetry. No privacy dependencies.

---

## PR 2 Scope: What's Included

5 fix items. All are bug fixes or correctness improvements. None add new features or change existing behavior beyond fixing what's broken.

| # | Fix | Risk | Lines changed |
|---|-----|------|---------------|
| 1 | Fix `row_inserted` filter mismatch | LOW | ~3 |
| 2 | Fix Realtime subscription filter | LOW | ~5 |
| 3 | Add `event_type` to public activity API select | LOW | ~2 |
| 4 | Fix GET /activity route CSRF mismatch | MEDIUM | ~5 |
| 5 | Fix Comments/Decision CSRF token handling | MEDIUM | ~10 per component |

---

## Fix 1: `row_inserted` filter mismatch

### Current code path
**File:** `src/components/workshop/EstimateSheetContent.tsx` ~line 156
```ts
{ value: "row_inserted", label: "Inserted rows" },
```
This value appears in `ACTIVITY_FILTER_EVENT_TYPES` but NO estimate event has type `"row_inserted"`. The actual event types are `"row_added"` (from library) and `"row_blank_added"` (empty placeholder).

### Problem
Filtering by "Inserted rows" returns zero results because no event matches `"row_inserted"`.

### Proposed fix
Replace with two filter values:
```ts
{ value: "row_added", label: "Added rows" },
{ value: "row_blank_added", label: "Added blank rows" },
```
Or keep single filter with both values in the query.

### Files touched
- **MODIFIED:** `src/components/workshop/EstimateSheetContent.tsx` — `ACTIVITY_FILTER_EVENT_TYPES` array
- **MODIFIED:** `tests/vitest/estimate-sheet-version-control-ui.test.tsx` — fix `eventType: "row_inserted"` in test mocks to `"row_added"`

### Tests
- [ ] Existing filter tests pass with corrected values
- [ ] Manual: Filter dropdown shows "Added rows" and "Added blank rows"
- [ ] Manual: Filtering by "Added rows" returns matching events

### Acceptance criteria
- [ ] `row_inserted` no longer appears in filter values
- [ ] `row_added` and `row_blank_added` filter correctly
- [ ] All existing tests pass
- [ ] `bun run type-check` passes

### Rollback
Revert `EstimateSheetContent.tsx` and test file changes.

---

## Fix 2: Realtime subscription filter

### Current code path
**File:** `src/components/share/SharedLinkActivityFeed.tsx`

The Realtime subscription filter is using an empty string or missing the publication ID, meaning it receives events for ALL publications, not just the current one.

### Problem
Realtime events from other publications could trigger unnecessary re-renders. The subscription is unfiltered.

### Proposed fix
**Option A (recommended):** Pass `publicationId` as prop and use in Realtime filter:
```ts
channel.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'shared_link_events',
  filter: `publication_id=eq.${publicationId}`
}, ...)
```

**Option B:** Remove Realtime from V1 claims. Add a feature flag or TODO comment. The component already works correctly with polling/refetch. Realtime is a nice-to-have.

### Files touched
- **MODIFIED:** `src/components/share/SharedLinkActivityFeed.tsx`
- **POTENTIALLY:** `src/components/workshop/ProjectPublicationHeader.tsx` — pass `publicationId`

### Tests
- [ ] Verify Realtime fires only for the correct publication
- [ ] Verify no cross-publication event leakage
- [ ] If Option B: verify no Realtime-related errors or broken behavior

### Acceptance criteria
- [ ] Realtime filter scoped to correct publication OR Realtime removed from V1
- [ ] No regressions in activity feed updates
- [ ] All existing tests pass

### Rollback
Revert `SharedLinkActivityFeed.tsx` changes.

---

## Fix 3: Add `event_type` to public activity API select

### Current code path
**File:** `src/app/api/share/[token]/activity/route.ts`

The query selects from `shared_link_events` but does not include `event_type` in the result. The composer (PR 3) needs `event_type` to generate correct copy.

### Problem
Without `event_type`, the composer cannot distinguish between `open`, `comment_add`, `accept_decision`, etc.

### Proposed fix
Add `event_type` to the SELECT clause:
```sql
SELECT id, publication_id, recipient_id, event_type, metadata_json, ...
```

### Files touched
- **MODIFIED:** `src/app/api/share/[token]/activity/route.ts`

### Tests
- [ ] Public API response now includes `event_type` field
- [ ] Existing tests updated if they assert on response shape
- [ ] No regression in public API behavior

### Acceptance criteria
- [ ] `event_type` present in public API response
- [ ] All existing tests pass
- [ ] `bun run type-check` passes

### Rollback
Revert route change.

---

## Fix 4: GET /activity route CSRF mismatch

### Current code path
**File:** `src/app/api/share/[token]/activity/route.ts` line 60
```ts
const sameOrigin = assertSameOriginPublicPost(request as unknown as Request);
```

`assertSameOriginPublicPost()` in `src/lib/publication/security.ts` lines 228-242 requires:
1. `Origin` header matching request origin
2. `x-archestimator-csrf` custom header
3. `ae_publication_csrf` cookie with matching value

### Problem
This is a **GET** endpoint. Browsers do NOT send custom headers on simple GET requests. The `Origin` header is also absent on same-origin GET. This means the route **always returns 403** for browser-based clients. The `SharedLinkActivityFeed` component's public path (`isOwner={false}`) would use this route — but it's never rendered in production (the component is owner-only).

### Proposed fix
Replace `assertSameOriginPublicPost` with a GET-safe alternative:

**Option A (recommended):** Use `assertSameOrigin()` — Origin-only check (like the session route does). The publication token in the URL already provides protection (high-entropy, unpredictable path).

```ts
function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  if (origin && origin !== requestOrigin) {
    return { ok: false, status: 403, message: "Cross-origin requests blocked." };
  }
  return { ok: true };
}
```

**Option B:** Validate CSRF token from query parameter (not needed for GET reads).

### Files touched
- **MODIFIED:** `src/app/api/share/[token]/activity/route.ts` — replace CSRF check
- **POTENTIALLY:** extract `assertSameOrigin` to `security.ts` if not already exported

### Tests
- [ ] GET /activity returns 200 for same-origin requests (no custom headers)
- [ ] GET /activity returns 403 for cross-origin requests
- [ ] No CSRF cookie or header required for GET
- [ ] Existing tests updated

### Acceptance criteria
- [ ] GET route no longer requires CSRF header/cookie
- [ ] Cross-origin protection still in place (Origin check)
- [ ] Route works for browser-based GET requests
- [ ] All existing tests pass

### Rollback
Revert route change.

---

## Fix 5: Comments/Decision CSRF token handling

### Current code path
**File:** `src/components/share/SharePageComments.tsx` lines 84, 136
**File:** `src/components/share/SharePageDecision.tsx` line 67

Both components hardcode:
```ts
"x-archestimator-csrf": "client-post",
```

But NEITHER component sets the `ae_publication_csrf` cookie. The CSRF check in `assertSameOriginPublicPost()` compares header value to cookie value — they won't match unless the user previously submitted the password form (which sets a random cookie, not "client-post").

### Problem
The double-submit cookie CSRF pattern requires: set cookie, send matching header. These components send the header but skip the cookie. The check may fail in production (tests mock `assertSameOriginPublicPost` so CI doesn't catch this).

### Proposed fix
Follow the same pattern as `ProjectPublicationPasswordForm.tsx` (the only component that does CSRF correctly):

```ts
// Generate random token
const csrfToken = window.crypto.randomUUID ? crypto.randomUUID() 
  : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');

// Set cookie
document.cookie = `ae_publication_csrf=${csrfToken}; path=/; SameSite=Lax; max-age=3600`;

// Send matching header
headers: { "x-archestimator-csrf": csrfToken, ... }
```

Or extract a shared `usePublicationCsrf()` hook.

### Files touched
- **MODIFIED:** `src/components/share/SharePageComments.tsx`
- **MODIFIED:** `src/components/share/SharePageDecision.tsx`
- **POTENTIALLY NEW:** `src/hooks/use-publication-csrf.ts`

### Tests
- [ ] Comments POST includes correct CSRF cookie and header pair
- [ ] Decision POST includes correct CSRF cookie and header pair
- [ ] CSRF token is randomly generated (not hardcoded)
- [ ] Existing tests pass

### Acceptance criteria
- [ ] No hardcoded `"client-post"` CSRF token
- [ ] Random token generated per request
- [ ] Cookie set with SameSite=Lax, 1-hour expiry
- [ ] Header matches cookie value
- [ ] All existing tests pass

### Rollback
Revert component changes.

---

## PR 2 Summary

| Metric | Value |
|--------|-------|
| Files modified | ~5-7 |
| Lines changed | ~30-50 |
| New files | 0-1 (optional CSRF hook) |
| Risk | LOW |
| Tests affected | 2-3 test files need updates |
| Dependencies | None — no other PRs required |
| Blocks | PR 3 (composer needs event_type from public API) |
| Privacy impact | None |
| Migration required | No |

---

## Pre-Merge Checklist

- [ ] All 5 fixes implemented
- [ ] All existing tests pass (`bun run test`, `bun run test:dom`)
- [ ] New regression tests pass
- [ ] `bun run type-check` passes
- [ ] `bun run lint` passes
- [ ] `bun run validate` passes
- [ ] Manual QA: Activity filter shows correct row event types
- [ ] Manual QA: Realtime subscription scoped correctly
- [ ] Manual QA: Public activity API returns event_type
- [ ] Manual QA: Activity GET route returns 200 (not 403)
- [ ] Manual QA: Comment and Decision POST succeed with correct CSRF

---

## Cross-References

- See `30-final-technical-reconciliation-audit.md` for contradiction audit that identified these issues
- See `32-final-implementation-readiness-scorecard.md` for overall go/no-go
- See `27-third-pass-master-implementation-blueprint.md` for full 9-PR sequence
- See `11-pr-sequencing-plan.md` for per-PR details
