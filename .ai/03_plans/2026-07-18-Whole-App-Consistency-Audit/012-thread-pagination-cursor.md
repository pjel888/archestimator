# Unit 012 — Client Portal Thread Pagination Cursor Can Point At A Filtered-Out Row (MEDIUM)

**Finding:** F-12 · **Severity:** MEDIUM · **Priority:** P2 · **Effort:** M · **Risk:** MED
**Requirement:** `REQ-010` (item) · **Status:** TODO · **Depends on:** 004 · **Test:** NOT_REQUIRED

## Problem

`listClientPortalRecipientThreads` fetches `LIMIT limit+1` raw rows, then
policy-filters them into `visibleRows`. When filtering drops rows but
`rows.length > limit`, `hasMore` is true and the next cursor is computed as
`visibleRows[limit-1]` if `visibleRows.length > limit`, otherwise `rows.at(-1)` —
i.e. the (limit+1)-th **raw** row that may have been filtered out and was never
returned to the client. The next page is then keyed off that hidden row's
`(updated_at, id)`, producing skips or duplicate-free dead-ends.

## Evidence

`src/lib/client-portal/thread-repository.ts:335-386`:
```ts
const rows = result.results ?? [];
const visibleRows = rows.filter((thread) => { /* policy */ });
const pageRows = visibleRows.slice(0, limit);
...
const hasMore = rows.length > limit;
const cursorRow = hasMore ? (visibleRows.length > limit ? visibleRows[limit - 1] : rows.at(-1)) : null;
return { threads, hasMore, nextCursor: cursorRow ? encodePageCursor(cursorRow.updated_at, cursorRow.id) : null };
```

When `visibleRows.length <= limit < rows.length`, the cursor is `rows.at(-1)` — a
row the client never saw.

## Fix Direction

Paginate **after** filtering so the cursor always references a row the client
received. Options:

1. **Fetch in a loop:** keep fetching raw pages (offset or keyset) until
   `visibleRows.length >= limit` or raw rows are exhausted, then slice. More DB
   round-trips but correct.
2. **Keyset over visible rows only:** compute the cursor from `pageRows.at(-1)`
   (the last row actually returned), never from a raw filtered-out row. Set
   `hasMore` based on whether more **visible** rows likely exist (e.g. fetch
   `limit + N` raw rows to absorb filter drop).

Option 2 is cheaper; option 1 is fully correct under heavy filtering. Prefer
option 2 with a generous raw over-fetch (e.g. `limit * 3`), falling back to option
1's loop if a page still comes up short.

### Owned paths
- `src/lib/client-portal/thread-repository.ts`

### Prohibited
- Do not change the `(updated_at, id)` cursor encoding scheme.
- Do not remove the policy filter (security boundary).

## Acceptance Evidence

- `AC-001`: the cursor's `(updated_at, id)` always refers to a row present in the
  returned `threads` page.
- `AC-002`: paginating through a portal with mixed visible/hidden threads visits
  every visible thread exactly once, no skips, no infinite "hasMore but empty
  page" loops.

## Recovery

If the over-fetch approach still produces empty pages under pathological filter
ratios, switch to the fetch-loop variant.

## Notes

Easier to land after unit 004 (decision void recompute) so the thread/issue status
surface is stable.
