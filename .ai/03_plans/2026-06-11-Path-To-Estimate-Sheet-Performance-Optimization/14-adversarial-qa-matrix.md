# 14 - Adversarial QA Matrix

**Date**: 2026-06-11
**Purpose**: Define the behavior-level QA gates a future implementation must run before claiming the performance plan succeeded.
**Status**: Executed 2026-06-11 on branch `perf/path-to-estimate-sheet`. Per-row PASS/PARTIAL/DEFERRED/BLOCKED results with evidence paths: `.ai/09_archive/store/2026-06-11-path-to-estimate-sheet-performance-implementation/qa/qa-matrix-results.md`. Browser-channel rows are blocked by the recorded auth/DB environment boundary, not skipped silently.

---

## QA Policy

Green lint/typecheck/tests are supporting evidence, not completion proof. Each future optimization unit needs at least one real usage scenario: browser, HTTP, CLI/data dump, or provider metric, with artifacts saved and cleanup recorded.

---

## Scenario Matrix

| ID | User / attacker model | Scenario | Channel | Expected signal | Adversarial class | Evidence artifact |
|----|-----------------------|----------|---------|-----------------|-------------------|-------------------|
| QA-BASE-001 | Implementer | Open 50/200/500-row sheets and record first load plus ten-character quantity edit | Browser Performance | Baseline table filled before source edits | misleading_success_output | `.ai/09_archive/store/<date>-path-sheet-baseline/` |
| QA-BASE-002 | Implementer | Record current `wc -l`, hook counts, `select("*")` counts, package state, route path, dirty worktree | CLI/data dump | Static snapshot matches implementation branch | stale_state, dirty_worktree | `.ai/09_archive/store/<date>-path-sheet-static-snapshot.md` |
| QA-BLAST-001 | Agent editing shared code | Run pre-edit graph/GitNexus/manual impact analysis for each touched production symbol and post-diff `detect_changes` where available | CLI/data dump | Blast-radius receipt exists and names callers/tests/routes before the source change ships | dirty_worktree, misleading_success_output | `.ai/09_archive/store/<date>-path-sheet-blast-radius/` |
| QA-PKG-001 | Dependency skeptic | Attempt every proposed package/config change against the decision matrix before install/edit | CLI/data dump | No package or config change lands without metric target, bundle/cost/privacy analysis, and rollback plan | prompt_injection, misleading_success_output | `.ai/09_archive/store/<date>-path-sheet-package-decisions.md` |
| QA-CACHE-001 | Privacy/security reviewer | Evaluate Redis/Upstash/KV/remote-cache proposal for protected estimate data and component-library data | CLI/data dump + optional HTTP/browser | Redis remains rejected unless measured shared-cache trigger, invalidation, privacy safety, and cost approval exist | privacy, stale_state | `.ai/09_archive/store/<date>-path-sheet-cache-decision.md` |
| QA-IMAGE-001 | Performance reviewer | Replace or reject inline component thumbnail `backgroundImage` usage with `next/image` based on public URL compatibility and network proof | Browser + network log | Image bytes/layout/accessibility improve or the rewrite is rejected with evidence | regression, misleading_success_output | `.ai/09_archive/store/<date>-path-sheet-image-proof/` |
| QA-SHEET-001 | Estimator typing quickly | Type `1000000000` into quantity, tab away, and verify displayed value and totals | Browser | No lost focus, no cursor jump, totals correct after commit | repeated_interruptions, flaky_tests | Playwright trace or DevTools recording |
| QA-SHEET-002 | Estimator correcting mistakes | Enter invalid/empty numeric input, blur, and verify validation/rollback behavior | Browser | Existing validation semantics preserved | malformed_input | Playwright trace |
| QA-SHEET-003 | Estimator using discount | Switch Contingency/Discount and edit percentage | Browser | Positive contingency and negative discount semantics remain correct | regression | DOM test plus browser smoke |
| QA-SHEET-004 | Estimator editing structure | Add row, delete row, insert template, and undo/rollback a failed mutation | Browser + mocked failure | State restores without corrupting tree or totals | stale_state, misleading_success_output | Test output and trace |
| QA-SHEET-005 | Power user | Bulk-select rows, change visible node/filter/search, and verify hidden selections prune correctly | Browser | Bulk toolbar and selected row set remain coherent | edge_case | Playwright trace |
| QA-SHEET-006 | Drag/drop user | Drag component/template into sheet and move row/tree nodes | Browser | Drop zones and tree ordering still work after memoization/splitting/virtualization | edge_case | Playwright trace |
| QA-CURSOR-001 | Collaborator | Receive remote cursor broadcasts while typing locally | Browser or local mocked realtime | Cursor overlay updates without re-rendering every row or stealing focus | repeated_interruptions | Render-count evidence and trace |
| QA-LIB-001 | User who never opens library | Open estimate sheet and never open right sidebar | Browser + network log | Initial render skips component-library dataset fetch | misleading_success_output | Network HAR or Playwright request log |
| QA-LIB-002 | User who opens library later | Open sidebar after sheet load, then close/reopen | Browser | Skeleton -> content succeeds, second open uses cache, errors are non-blocking | hung_command, flaky_tests | Trace and request log |
| QA-LIST-001 | User with large project | Open estimate-list page with 50 estimates x 100 rows | Browser + SQL/HTTP log | Aggregate totals match old JS logic and payload drops | regression | SQL parity output and network log |
| QA-DB-001 | DB migration executor | Run EXPLAIN before/after proposed indexes | CLI/DB | Planner uses intended index or migration is rejected | misleading_success_output | SQL output with row counts redacted if needed |
| QA-LANDING-001 | Anonymous visitor | Load `/` with no auth cookies | Browser + network | No Supabase auth round-trip blocks anonymous first paint after future fix | privacy, regression | Trace/HAR |
| QA-LANDING-002 | Signed-in user | Load `/`, click app CTA, enter `/workshop` | Browser | Protected route still validates securely via `getUser()` | auth_regression | Trace |
| QA-PROVIDER-001 | Release operator | Query current production route metrics after deployment | Vercel CLI/dashboard | Route/window/device/deployment scoped metrics exist before hosted claim | stale_state | `vercel metrics` output or dashboard export |
| QA-DIRTY-001 | Agent in shared worktree | Run implementation with unrelated dirty files present | CLI | Only scoped files change; unrelated source/test edits are preserved | dirty_worktree | `git status --short` before/after |

---

## Stop Conditions

- Stop implementation if baseline measurements are missing.
- Stop a sprint if a future optimization improves local numbers but breaks any behavior scenario above.
- Stop provider claims if Vercel metrics cannot be tied to the current production deployment, route, date window, and device class.
- Stop database migration work if EXPLAIN does not prove planner benefit or linked-provider authority is missing.
- Stop Redis/remote-cache work if the data is protected/user-specific, invalidation is unclear, or cost/provider authority is missing.
- Stop package/config changes if bundle analyzer or route metrics do not prove benefit.
- Stop image rewrites if `next/image` breaks layout/accessibility or the source URL is private/not allowed by `remotePatterns`.
- Stop virtualization if Sprint 0-2 measurements already meet the agreed budgets without adding a new dependency.
