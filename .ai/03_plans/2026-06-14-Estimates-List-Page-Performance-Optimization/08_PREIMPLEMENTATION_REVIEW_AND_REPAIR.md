# 08 — Preimplementation Review And Repair Gate

Date: 2026-06-14
Scope: `/workshop/projects/[projectId]/estimates`
Status: BLOCK for P0 implementation until the P-1 entry gate is satisfied.

This file records the second-pass audit requested before implementation. It
combines direct source inspection with three independent read-only lanes:
implementation surface, QA/test surface, and adversarial architecture review.

## Executive verdict

The performance diagnosis is strong: the route still uses full `router.refresh()`
for basic mutations, a global route overlay fires on those refreshes, the list
query still uses `select("*")`, and summary totals still pull all nodes and rows
into JavaScript.

The original plan was not safe to execute as-is. It optimized perceived latency
before freezing the row contract and rollout path. The required repair is now a
mandatory P-1 phase in `06_IMPLEMENTATION_PLAN.md`.

## Evidence snapshot

### Confirmed current implementation facts

| Fact | Evidence |
|------|----------|
| Create calls action then `router.refresh()` | `src/components/workshop/ProjectEstimatesClient.tsx:48-49` |
| Duplicate calls action then `router.refresh()` | `src/components/workshop/ProjectEstimatesTable.tsx:210-211` |
| Inline name/notes/code commit calls `router.refresh()` after action return | `src/components/workshop/ProjectEstimatesTable.tsx:318-328` |
| Budget commit calls `router.refresh()` after action return | `src/components/workshop/ProjectEstimatesTable.tsx:434-443` |
| Auto-code calls action then `router.refresh()` | `src/components/workshop/ProjectEstimatesTable.tsx:529-534` |
| Delete removes TanStack cache entries but still calls `router.refresh()` | `src/components/workshop/ProjectEstimatesTable.tsx:724-754` |
| Reset column widths calls `router.refresh()` for local state | `src/components/workshop/ProjectEstimatesTable.tsx:980-986` |
| List row type extends full Supabase estimates row | `src/components/workshop/ProjectEstimatesTable.tsx:33-38` |
| List query uses `select("*")` | `src/lib/repositories/workspace-repository.ts:1419-1422` |
| List summaries load all nodes and rows then fold in JS | `src/lib/repositories/workspace-repository.ts:1438-1470` |
| Current create action returns partial ids, not a canonical row | `src/lib/estimates/actions.ts:1440-1457` |
| `loading.tsx` still renders the generic project fallback | `src/app/workshop/projects/[projectId]/estimates/loading.tsx:1-5` |
| `loading.tsx` does not wrap the same segment `layout.tsx`; layout awaits still block shell streaming | Next docs `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md` and current `src/app/workshop/projects/[projectId]/layout.tsx:22-31` |

### Confirmed test/QA facts

| Fact | Evidence |
|------|----------|
| Create tests currently assert refresh after create | `tests/vitest/project-estimates-client-create.test.tsx:84`, `:104` |
| Inline edit tests currently assert refresh after save | `tests/vitest/project-estimates-table-inline-edit.test.tsx:159`, `:193`, `:213` |
| Duplicate test currently asserts refresh after duplicate | `tests/vitest/project-estimates-table-inline-edit.test.tsx:242-265` |
| Existing list repository test is static/string-level only | `tests/vitest/project-estimates-list-result.test.ts:6-10` |
| Existing DB perf migration test only proves older covering indexes | `tests/vitest/supabase-performance-migrations.test.ts:18-24` |
| Existing performance seed script is manifest-only and does not write DB fixtures | `scripts/seed-performance-test-data.ts:113-117` |
| Existing Playwright route-transition tests are generic/auth-gated, not CRUD-latency proof | `e2e/route-transition-performance.spec.ts` |

## Blocking findings

### HIGH — No canonical list-row DTO before optimistic state

The original optimistic-store plan used `ProjectEstimateTableRow` from the table
component and reconciled create from a partial action return. That can fabricate
canonical fields in the browser, lose server-normalized fields, or erase pending
optimistic rows during a server-prop reseed.

Required repair:
- Add `ProjectEstimateListRow` in a shared non-component module.
- Stop extending `Tables<"estimates">` in the client list row.
- Make create, duplicate, update, and regenerate return canonical row payloads.
- Store pending mutation metadata and define how reseed interacts with pending
  optimistic rows.

Implemented in plan: P-1.1, P-1.2, P-1.3.

### HIGH — Explicit-column security fix remains brittle without the DTO

The plan says to move from `select("*")` to explicit columns, but the table row
type still inherits the full table schema. That means future field usage can
silently pull sensitive columns back into the RSC payload.

Required repair:
- DTO contract test must fail if `metadata`, `created_by`, `workspace_id`, or
  legacy `assumptions` enters the client row.
- P2 explicit projection must map into the DTO, not into `Tables<"estimates">`.

Implemented in plan: P-1.1 and P2-2.

### MEDIUM — Acceptance metrics omitted visible mutation paths

The original stopwatch tracked create, rename, and delete but not duplicate,
auto-generate code, reset column widths, notes, budget, search-active mutation,
or read-only collaborator denial.

Required repair:
- Expand `05` and P0-7 to cover every mutation currently known to call refresh.
- Invert stale tests that assert refresh into no-overlay/no-refresh tests.

Implemented in plan: `05_MEASUREMENT_METHODOLOGY.md`, P-1.4, P0-7, and `09`.

### MEDIUM — Rollout/backout was too weak for a broad cutover

The plan touches client state, shared navigation hooks, layout streaming,
repository query shape, SQL RPCs, RLS helper bodies, headers, and auth checks.
The first draft had only a final validation checklist.

Required repair:
- Add phase-level rollback notes.
- Add a temporary optimistic-path cutover gate.
- Keep P0, P1, P2, and P3 independently revertible.

Implemented in plan: D10, P-1.3, and `09`.

## Added perspectives from this repair pass

1. **Large-list UX:** even after row-item aggregation moves to SQL, the list
   still fetches every estimate and builds hover-prefetch configs for every row.
   Add a post-P2 pagination/server-search decision point if row count becomes
   the dominant cost.
2. **Search-active optimistic state:** create/delete/duplicate must behave
   coherently while a filter is active.
3. **First-node parity:** `selectFirstEstimateNodeIds` is depth-first and
   area-first, not a simple `array_agg(sort_order)` pick. If Path B makes the RPC
   own `first_node_id`, the prove harness must compare that value to the JS
   oracle before swapping the first-node read path. Path A keeps first-node
   selection in the existing JS helper.
4. **Next 16 streaming reality:** `loading.tsx` wraps the page segment, not the
   same segment layout. Runtime layout work must move behind its own Suspense
   boundary or into a child component for the shell to stream.
5. **Real benchmark fixture:** the existing performance seed script is a
   manifest generator only. DB benchmark proof needs an actual disposable
   fixture plus teardown evidence.

## Repair completion checklist

- [ ] P-1.1 DTO contract exists and tests prove no full table row leaks to client.
- [ ] P-1.2 action return payloads provide canonical list rows.
- [ ] P-1.3 store conflict/reseed policy tests pass.
- [ ] P-1.4 stale refresh assertions are inverted and their expected red output
  is captured for P0 to turn green.
- [ ] `09_TRACEABILITY_AND_QA_MATRIX.md` is kept current as tasks move.
- [ ] No plan file says "implementation-ready" until P-1.1 through P-1.3 are
  green and P-1.4 has a documented red-output artifact.
