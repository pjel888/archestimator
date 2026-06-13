# P-1 Entry Gate — Evidence Log

Route: `/workshop/projects/[projectId]/estimates`
Captured: 2026-06-14 (pre-P0)

## Exit state

| Gate | Status |
|------|--------|
| P-1.1 DTO contract green (no sensitive column leaks to client row) | ✅ `project-estimate-list-row-contract` 3/3 |
| P-1.2 canonical action reconciliation payloads | ✅ `project-estimate-list-action-payload` 4/4 + `type-check` clean |
| P-1.3 optimistic store conflict policy green | ✅ `project-estimates-store` 12/12 |
| P-1.4 stale refresh assertions inverted, RED captured | ✅ (below) |

## P-1.4 captured RED (these must fail before P0, pass after)

Command: `bun run test:dom -- project-estimates-client-create project-estimates-table-inline-edit`

```
× saves an inline estimate name edit once when Enter blurs the field
× saves an inline project budget edit per estimate sheet
× saves an inline notes edit per estimate sheet
× duplicates an estimate sheet from the row actions once
× guards the create estimate action against rapid double-submit
× guides first-run users to create the first estimate sheet

AssertionError: expected "vi.fn()" (router.refresh) to not be called at all,
but actually been called 1 times
  - project-estimates-client-create.test.tsx:84  (create double-submit)
  - project-estimates-client-create.test.tsx:101 (first-run create)
  - project-estimates-table-inline-edit.test.tsx:158 (inline name)
  - project-estimates-table-inline-edit.test.tsx:193 (inline budget)
  - project-estimates-table-inline-edit.test.tsx:214 (inline notes)
  - project-estimates-table-inline-edit.test.tsx:268 (duplicate)

Test Files  2 failed (2)
     Tests  6 failed | 4 passed (10)
```

Interpretation: the current implementation still calls `router.refresh()` (which
shows the global blur overlay) after create / inline name+notes+budget /
duplicate. P0 turns these green by replacing refresh with optimistic store
reconciliation. P0 owns the green implementation (P0-3/P0-4/P0-5).
