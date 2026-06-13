# After — /workshop/projects/[projectId]/estimates (post-optimization)

Acceptance table (from `05_MEASUREMENT_METHODOLOGY.md`) mapped to shipped evidence.
Baseline + repro commands: `metrics/baseline-estimates-list.md`.

| Metric | Target | Result / Evidence |
|--------|--------|-------------------|
| Overlay on in-place CRUD | 0 | ✅ Removed — create/inline-edit/duplicate/delete/reset no longer call `router.refresh()`; asserted by inverted DOM tests (`project-estimates-client-create`, `project-estimates-table-inline-edit`, `project-estimates-create-optimistic`, `project-estimates-inline-edit`, `project-estimates-delete-duplicate`) + `metrics/p-1-evidence.md` |
| create → row visible | < 400 ms (optimistic) | ✅ Synchronous "Creating…" placeholder before the action resolves (P0-3 test); browser stopwatch via `e2e/estimates-crud-latency.spec.ts` (session-gated) |
| reset column widths | local only, no refresh | ✅ `table.resetColumnSizing()` only; asserted no `router.refresh` |
| Supabase round-trips / cold load | ≤ 8 (from ~22–28) | ↓ F6 `ensureDefaultWorkspace` `cache()` (3×→1), F7 cached project reuse, F8 RPC replaces 2 of 3 list queries; live count via `PERF_TRACE=1` (session-gated) |
| EXPLAIN on row-item read | aggregate, O(estimates) out | ✅ `metrics/p2-explain-{before,after}.txt` — 5,000 rows → 1 row/estimate (result-set/network/JS-fold win; single-estimate buffer reads flat — recorded honestly) |
| RPC parity vs JS oracle | identical | ✅ `prove:estimate-list-summaries` PASS 5 (PG17) + real-data parity on hosted (node/row/total match) |
| RLS access decisions after initplan wrap | identical | ✅ `prove:rls-initplan` PASS 9 (owner/collaborator/non-member) |
| RSC payload (sensitive cols) | no `metadata`/`created_by` | ✅ explicit `ESTIMATE_LIST_COLUMNS` + DTO contract test |
| read-only collaborator mutation | clean edit-denied, no raw RLS | ✅ `assertCanEditProject`/`assertCanEditEstimate` (`estimate-sheet-actions-authz` test) |
| CLS / wrong-shape flash | < 0.1, no flash | ✅ table-shaped `ProjectEstimatesListSkeleton` (skeleton DOM test) |
| list-route render failure | sanitized retry UI | ✅ `estimates/error.tsx` (`workshop-route-error-boundaries` test) |

**Session-gated (require the user's authenticated Chrome — dev-auth disabled):**
live Web Vitals (FCP/LCP/INP/CLS), HAR, and the create→visible wall-clock. The
`traced()`/`WebVitalsProbe` scaffolding (behind `PERF_TRACE`/`NEXT_PUBLIC_PERF_TRACE`)
and the `e2e/estimates-crud-latency.spec.ts` + `e2e/estimates-shell-streaming.spec.ts`
specs ship ready to capture these in one command.
