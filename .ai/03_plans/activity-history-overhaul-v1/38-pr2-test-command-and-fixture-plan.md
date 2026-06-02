# 38 — PR 2 Test Command and Fixture Plan

**Date:** 2026-06-02
**Status:** Fifth pass — execution-ready test plan for PR 2
**Purpose:** Exact test files, mock setups, assertions, and commands for each PR 2 fix.

---

## Setup Commands

```bash
# Full validation gate (run before and after all changes)
bun run type-check
bun run lint
bun run validate     # type-check + lint + design-system + unit + dom

# Targeted test runs
bun run test         # Bun unit tests (tests/unit/)
bun run test:dom     # Vitest DOM tests (tests/vitest/)

# Specific test files (vitest)
npx vitest run tests/vitest/estimate-sheet-version-control-ui.test.tsx
npx vitest run tests/vitest/project-publication-activity.test.tsx
npx vitest run tests/vitest/project-publication-comments.test.tsx
npx vitest run tests/vitest/project-publication-decision.test.tsx
npx vitest run tests/vitest/project-publication-security.test.ts
```

**Note:** This is a planning-only audit pass. No production code or test changes have been made. All commands are for reference when implementation begins.

---

## Fix 1: row_inserted Filter

### Test file
`tests/vitest/estimate-sheet-version-control-ui.test.tsx`

### Existing tests to update
- Any test using `eventType: "row_inserted"` in mock data → change to `eventType: "row_added"` or `eventType: "row_blank_added"`

### New tests to add
- Filter dropdown renders "Added rows" label (not "Inserted rows")
- Filter dropdown renders "Added blank rows" label
- Filtering by "Added rows" matches `row_added` events
- Filtering by "Added blank rows" matches `row_blank_added` events
- No filter option for "row_inserted"

### Mock setup
Update mock events to use `row_added` and `row_blank_added` instead of `row_inserted`.

### Expected assertions
```ts
// Filter labels
expect(screen.getByText("Added rows")).toBeInTheDocument();
expect(screen.getByText("Added blank rows")).toBeInTheDocument();
expect(screen.queryByText("Inserted rows")).not.toBeInTheDocument();

// Filter behavior
// Select "Added rows" filter → events with event_type "row_added" are visible
```

### Acceptance criteria
- [ ] `row_inserted` no longer appears in filter values
- [ ] `row_added` and `row_blank_added` filter correctly
- [ ] All existing tests pass

---

## Fix 2: Realtime Subscription Filter

### Test files
- `tests/vitest/project-publication-activity.test.tsx` (existing — update)
- `tests/vitest/project-publication-header.test.tsx` (existing — update)

### Existing tests to update
- Tests that assert on Realtime subscription setup → update filter assertions
- Tests that mock SharedLinkActivityFeed → pass `publicationId` prop

### New tests to add
- SharedLinkActivityFeed receives `publicationId` prop
- Realtime channel filter includes `publication_id=eq.{publicationId}`
- When `publicationId` is undefined, no Realtime subscription created
- Realtime filter scoped to correct publication (not all publications)

### Mock setup
```ts
// Mock Supabase channel
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn(),
};
const mockSupabase = {
  channel: vi.fn().mockReturnValue(mockChannel),
  removeChannel: vi.fn(),
};
```

### Expected assertions
```ts
// Filter contains publication ID
expect(mockSupabase.channel).toHaveBeenCalledWith(
  expect.stringContaining("shared-link-activity")
);
// Channel.on called with correct filter
expect(mockChannel.on).toHaveBeenCalledWith(
  "postgres_changes",
  expect.objectContaining({
    filter: expect.stringContaining(`publication_id=eq.${publicationId}`),
  }),
  expect.any(Function)
);
```

### Acceptance criteria
- [ ] Realtime filter scoped to correct publication
- [ ] No cross-publication event leakage
- [ ] If no publicationId, Realtime skipped gracefully
- [ ] All existing tests pass

---

## Fix 3: event_type in Public API Response

### Test file
`tests/vitest/project-publication-activity.test.tsx`

### Existing tests to update
- Any test asserting on public API response shape → add `event_type` field to assertions

### New tests to add
- Public API response includes `event_type` for event items (for composer consumption in PR 3+)
- Comment items do NOT include `event_type` (irrelevant for comments)
- Decision items do NOT include `event_type` (irrelevant for decisions)

### Mock setup
Mock `shared_link_events` query to return events with `event_type` field.

### Expected assertions
```ts
// Event items have event_type
const eventItem = response.activities.find(a => a.type === "event");
expect(eventItem.event_type).toBe("open");

// Comment items don't have it
const commentItem = response.activities.find(a => a.type === "comment");
expect(commentItem.event_type).toBeUndefined();
```

### ⚠️ IMPORTANT: Public exposure decision

**Decision (from doc 34 Finding 3):** PR 2 should NOT expose `event_type` in the public API response. The route is currently unused by any client. Select `event_type` in the DB query internally but do NOT include it in the public JSON response until composer integration in PR 5.

**Rationale:** Prevents technical leakage before the composer can sanitize event_type into human-readable copy. The public route's role will change when composer integration happens (PR 5).

**If PR 2 adds event_type to response:** mark as temporary, add test to verify it's removed/transformed by PR 5, add TODO comment.

### Acceptance criteria (updated)
- [ ] `event_type` selected in DB query (for internal use)
- [ ] `event_type` NOT included in public JSON response (deferred to PR 5)
- [ ] OR: if included, marked as temporary with PR 5 TODO
- [ ] All existing tests pass

---

## Fix 4: GET /activity CSRF

### Test files
- `tests/vitest/project-publication-activity.test.tsx` (existing — update)
- `tests/vitest/project-publication-security.test.ts` (existing — update)

### Existing tests to update
- Tests that mock `assertSameOriginPublicPost` → mock new `assertSameOrigin` or extracted version
- Remove expectations for `x-archestimator-csrf` header on GET requests
- Remove expectations for `ae_publication_csrf` cookie on GET requests

### New tests to add
- GET /activity without Origin header → 200 (same-origin GET)
- GET /activity with matching Origin → 200
- GET /activity with mismatched Origin → 403
- GET /activity does NOT require x-archestimator-csrf header
- GET /activity does NOT require ae_publication_csrf cookie
- Invalid/revoked/expired token → 404
- Rate limit exceeded → 429

### Mock setup
```ts
// Mock request without Origin header (same-origin GET)
const req = new Request("https://archestimator.local/share/token/activity", {
  method: "GET",
  // No Origin header
});

// Mock request with matching Origin
const req2 = new Request("https://archestimator.local/share/token/activity", {
  method: "GET",
  headers: { Origin: "https://archestimator.local" },
});

// Mock request with mismatched Origin (cross-origin)
const req3 = new Request("https://archestimator.local/share/token/activity", {
  method: "GET",
  headers: { Origin: "https://evil.com" },
});
```

### Expected assertions
```ts
// Same-origin GET (no Origin) → 200
expect(response.status).toBe(200);

// Same-origin GET (matching Origin) → 200
expect(response2.status).toBe(200);

// Cross-origin GET → 403
expect(response3.status).toBe(403);
```

### Implementation note

`assertSameOrigin()` already exists inline in `src/app/api/share/[token]/session/route.ts` (lines 21-31). Extract to `src/lib/publication/security.ts` as an exported function. This provides a GET-safe origin check that allows absent Origin and rejects mismatched Origin.

### Acceptance criteria
- [ ] GET route no longer requires CSRF header/cookie
- [ ] Cross-origin protection still in place (Origin check)
- [ ] Route works for browser-based GET requests (no Origin header)
- [ ] `assertSameOrigin()` exported from security.ts
- [ ] All existing tests pass

---

## Fix 5: Comments/Decision CSRF

### Test files
- `tests/vitest/project-publication-comments.test.tsx` (existing — update)
- `tests/vitest/project-publication-decision.test.tsx` (existing — update)

### 3 Affected Fetch Paths

1. **SharePageComments.tsx line 136** — `postWithRetry()` normal POST
2. **SharePageComments.tsx line 84** — `flushQueue()` offline retry POST
3. **SharePageDecision.tsx line 67** — `confirmDecision()` POST

### Existing tests to update
- Remove mock expectations for hardcoded `"client-post"` header value
- Add mock expectations for random CSRF token matching cookie

### New tests to add

#### Comments normal POST
- Generates random CSRF token (not hardcoded)
- Sets `ae_publication_csrf` cookie with SameSite=Lax, max-age=3600
- Sends `x-archestimator-csrf` header matching cookie value

#### Comments flush queue
- Uses same CSRF token as normal POST (generated once per session)
- Sends correct header on queue flush

#### Decision POST
- Generates random CSRF token
- Sets cookie and sends matching header

#### Shared behavior
- Two consecutive requests use different CSRF tokens (one-time use, or session-scoped)
- Cookie path is `/`
- Fallback for `crypto.randomUUID()` if unavailable

### Mock setup

```ts
// Mock document.cookie
Object.defineProperty(document, "cookie", {
  writable: true,
  value: "",
});

// Mock crypto.randomUUID or crypto.getRandomValues
```

### Recommended implementation
Create shared utility `createPublicationCsrfHeaders()`:
```typescript
export function createPublicationCsrfHeaders(): { headers: Record<string, string> } {
  const token = crypto.randomUUID?.() ?? 
    Array.from(crypto.getRandomValues(new Uint8Array(16)), 
      b => b.toString(16).padStart(2, '0')).join('');
  document.cookie = `ae_publication_csrf=${token}; Path=/; SameSite=Lax; Max-Age=3600`;
  return { headers: { "x-archestimator-csrf": token } };
}
```

Or extract as `usePublicationCsrf()` hook if React state is needed.

### Expected assertions

```ts
// Token is random (not hardcoded)
expect(csrfToken).not.toBe("client-post");

// Cookie set correctly
expect(document.cookie).toContain("ae_publication_csrf=");
expect(document.cookie).toContain("SameSite=Lax");
expect(document.cookie).toContain("Max-Age=3600");

// Header matches cookie
const cookieToken = document.cookie.match(/ae_publication_csrf=([^;]+)/)[1];
expect(headers["x-archestimator-csrf"]).toBe(cookieToken);

// Flush queue uses correct CSRF
// (test that offline queued comment POST includes valid CSRF header)
```

### Acceptance criteria
- [ ] No hardcoded `"client-post"` CSRF token in any component
- [ ] Random token generated per request/session
- [ ] Cookie set with SameSite=Lax, Path=/, 1-hour expiry
- [ ] Header matches cookie value in ALL 3 fetch paths
- [ ] Shared utility (hook or function) used — not duplicated inline
- [ ] All existing tests pass

---

## PR 2 Complete Test Checklist

```bash
# Step 1: Run all existing tests — expect PASS (no production code changed yet)
bun run test
bun run test:dom

# Step 2: After Fix 1 (row_inserted)
npx vitest run tests/vitest/estimate-sheet-version-control-ui.test.tsx

# Step 3: After Fix 2 (Realtime)
npx vitest run tests/vitest/project-publication-activity.test.tsx

# Step 4: After Fix 3 (event_type)
npx vitest run tests/vitest/project-publication-activity.test.tsx

# Step 5: After Fix 4 (GET CSRF)
npx vitest run tests/vitest/project-publication-activity.test.tsx
npx vitest run tests/vitest/project-publication-security.test.ts

# Step 6: After Fix 5 (Comments/Decisions CSRF)
npx vitest run tests/vitest/project-publication-comments.test.tsx
npx vitest run tests/vitest/project-publication-decision.test.tsx

# Step 7: Full validation gate
bun run validate

# Step 8: Build check
bun run build
```

---

## Cross-References

- `31-pr2-preflight-implementation-brief.md` — PR 2 engineering brief (5 fix items)
- `35-code-truth-map.md` — Code truth map for affected files
- `37-final-blast-radius-and-rollback-map.md` — Blast radius for PR 2
- `40-final-implementation-handoff.md` — Implementation handoff with exact starting points
