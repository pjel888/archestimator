# 09 — Traceability And QA Matrix

Date: 2026-06-14
Purpose: make the plan executable without allowing narrow green tests to hide
the original performance, security, or state-correctness problem.

## Finding-to-task traceability

| Finding | Required tasks | Required evidence |
|---------|----------------|-------------------|
| F1 global overlay on refresh | P-1.4, P0-2, P0-3, P0-4, P0-5, P0-7 | DOM tests assert no `router.refresh()` / no overlay for in-place actions; Playwright `metrics/p0-crud-latency.json` |
| F2 no optimistic UI | P-1.1, P-1.2, P-1.3, P0-1, P0-3, P0-5 | DTO/store tests; create/duplicate/delete rollback tests; browser proof |
| F3 inline edits refresh | P-1.4, P0-4 | Existing inline tests inverted from refresh to no-refresh; action return reconciles canonical row |
| F4 wrong skeleton | P0-6 | Skeleton DOM test; screenshot or Playwright assertion no right rail/2-column grid flash |
| F5 layout blocks shell | P1-2 | Next 16 layout/loading docs cited; shell-streaming Playwright proof |
| F6 repeated workspace lookup | P1-1 | query-count unit test and `[perf]` round-trip delta |
| F7 redundant project re-query | P1-3 | summary no-requery test and `[perf]` round-trip delta |
| F8 all nodes/rows JS aggregation | P2-1 | local/hosted DB prove harness; EXPLAIN before/after at 5/500/5000 rows |
| F9 full estimates row to client | P-1.1, P2-2 | DTO contract excludes sensitive fields; explicit select test; RSC payload diff |
| F10 RLS auth.uid per-row tax | P2-3 | owner/collaborator/non-member access proof; authenticated-role timing |
| F11 create double round-trip | P-1.2, P0-3, P0-7 | create placeholder visible before action resolves; create→visible threshold |
| F12 revalidate + refresh double-fetch | P0-3, P0-4, P0-5 | no client refresh for in-place actions; retained server revalidation documented where sibling routes need freshness |
| F13 missing list error boundary | P3-1 | route error boundary test proves sanitized retry UI |
| F14 workshop headers | P3-2 | config test plus browser/network header capture |
| F15 app-layer edit authZ gap | P3-3 | read-only collaborator denial test shows clean app error, no raw RLS text |
| F16 create/duplicate abuse/race | follow-up unless owner expands scope | documented deferral; insert retry remains tested |

## Adversarial scenario matrix

| ID | Scenario | Tool/channel | Expected signal | Evidence path |
|----|----------|--------------|-----------------|---------------|
| ADV-001 | Empty project, create first estimate | Playwright browser | placeholder row appears immediately; no overlay | `metrics/p0-create-empty.json` |
| ADV-002 | Search filter active during create | DOM + Playwright | matching placeholder appears or no-match copy remains coherent by spec | `metrics/p0-search-active-create.json` |
| ADV-003 | Action rejection after optimistic create | DOM test | temp row removed; inline error shown; no overlay | `tests/vitest/project-estimates-create-optimistic.test.tsx` |
| ADV-004 | Action rejection after optimistic delete | DOM test | rows restored; selection coherent | `tests/vitest/project-estimates-delete-duplicate.test.tsx` |
| ADV-005 | Duplicate double-click under slow network | DOM + Playwright | one action call; one temp row; canonical row on resolve | `metrics/p0-duplicate.json` |
| ADV-006 | Auto-generate code | DOM + Playwright | code reconciles from canonical row; no overlay | `metrics/p0-auto-code.json` |
| ADV-007 | Reset column widths | DOM + Playwright | no network refresh; local column sizing reset only | `metrics/p0-reset-widths.json` |
| ADV-008 | Blocked localStorage | DOM test | table still renders; reset does not crash | existing inline-edit storage test extended |
| ADV-009 | Read-only collaborator tries create/duplicate/edit/delete | unit/integration or Playwright with fixture role | clean edit-denied error, no raw SQL/RLS text | `metrics/p3-viewer-denial.json` |
| ADV-010 | Large estimate: 5 / 500 / 5000 row-items | PG prove harness + EXPLAIN | RPC returns same counts/totals as JS oracle; fewer buffers | `metrics/p2-explain-before.txt`, `metrics/p2-explain-after.txt` |
| ADV-011 | First-node ordering parity | PG prove harness | Path A: retained JS first-node query still matches current behavior. Path B: RPC `first_node_id` matches `selectFirstEstimateNodeIds` depth-first area-first oracle. | `scripts/prove-estimate-list-summaries-postgres.mjs` output |
| ADV-012 | Route render failure | route-boundary test | sanitized list-route error UI with retry; no raw PG details | `tests/vitest/workshop-route-error-boundaries.test.tsx` |
| ADV-013 | Header streaming | Playwright | shell/table skeleton visible before async header chrome settles | `metrics/p1-shell-streaming.json` |
| ADV-014 | High estimate count prefetch setup | browser profiling or targeted render test | bounded or accepted render setup cost; no 3-query prefetch config explosion without evidence | `metrics/pagination-prefetch-decision.md` |

## Existing tests that must change

These tests currently preserve the refresh regression and must be inverted before
P0 can pass:

- `tests/vitest/project-estimates-client-create.test.tsx:84`
- `tests/vitest/project-estimates-client-create.test.tsx:104`
- `tests/vitest/project-estimates-table-inline-edit.test.tsx:159`
- `tests/vitest/project-estimates-table-inline-edit.test.tsx:193`
- `tests/vitest/project-estimates-table-inline-edit.test.tsx:213`
- `tests/vitest/project-estimates-table-inline-edit.test.tsx:265`

## Phase rollback gates

| Phase | Rollback/backout requirement |
|-------|------------------------------|
| P-1 | Pure contract/test changes may be reverted without DB changes. Do not proceed if DTO causes broad unrelated type churn. |
| P0 | Keep a temporary local cutover switch/adapter until P0 browser QA passes. Revert P0 by restoring server-prop table path and refresh behavior only. |
| P1 | Each server-waterfall slice must be independently revertible. If `ensureDefaultWorkspace` caching regresses request scoping, revert only the `cache()` wrapper/test. If header chrome regresses, revert `ProjectChromeAsync`/Suspense changes while keeping P0. If summary optional-arg threading regresses another caller, remove that threading and keep omitted-arg compatibility. |
| P2 | RPC migration is additive; rollback app read path to JS aggregation if RPC proof fails. Do not drop old query path until hosted proof passes. RLS helper rewrite must have a forward-fix migration restoring previous bodies if access proof fails. |
| P3 | Error boundary and headers are additive. CSP starts Report-Only; enforcement is explicitly out of this slice. |

## Done means

The implementation is not complete until:

1. Every F1-F15 row above has current evidence.
2. F16 is either implemented or explicitly deferred with owner-accepted rationale.
3. Every adversarial scenario is passed, blocked with a safe substitute, or
   moved to a dated follow-up plan with rationale.
4. `bun run validate` and the targeted Playwright/DB proof commands pass or
   their pre-existing blockers are named.
5. `metrics/` contains before/after artifacts, not just test logs.
