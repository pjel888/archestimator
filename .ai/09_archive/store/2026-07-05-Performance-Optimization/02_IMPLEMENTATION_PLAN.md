# 02 — Implementation Plan

> Phase-by-phase work packages for the findings in `01_FINDINGS.md`. Every work package has: scope, evidence required, evaluator (measurement command), regression threshold, owner, stop condition, blocker condition.
>
> **This is a plan.** No code is changed by this document. Implementation requires a separate approved pass per work package.

---

## Phase order and dependency

```
Phase 1 (D1 indexes + N+1 fix)
    │
    ▼
Phase 2 (Server action waterfalls)   ──▶  Phase 4 (CI budget gate)
    │                                          ▲
    ▼                                          │
Phase 3 (Client bundle + React hot paths) ─────┘
```

- **Phase 1 is sequential.** Indexes must land before action waterfalls are measured (otherwise we measure noise).
- **Phases 2 and 3 can run in parallel** once Phase 1 is verified. They touch disjoint file scopes (server-side vs. client-side).
- **Phase 4 depends on Phases 1–3** for budget thresholds. It cannot set budgets without measurements.

---

## Phase 1 — D1 indexes + N+1 fix

**Goal:** eliminate the HIGH finding F-D1-01 (N+1 authz loop) and reduce the MED finding F-D1-02 (missing indexes), and reduce D1 round-trip count on the workshop dashboard render.

**Findings addressed:** F-D1-01 (HIGH), F-D1-02 (MED). *(Round 5 correction: previously drafted as "two HIGH findings"; F-D1-02 was downgraded to MED in Round 2 after schema verification.)*

**Out of scope for Phase 1:** F-D1-03 (action waterfalls), F-D1-04 (file size), F-D1-05 (bulk ops).

### WP-P1-01 — Confirm missing-index hypothesis via EXPLAIN

**Goal:** prove (or disprove) that the proposed indexes will help before applying them.

**Steps:**

1. Run `EXPLAIN QUERY PLAN` on the bound D1 (`ARCH_DB`) for these representative queries. *(Schema names verified against `migrations/0007_collaboration_invitations.sql:1-50` on 2026-07-04 — `projects` and `workspaces` use `created_by`, not `owner_user_id`.)*
   - `SELECT * FROM projects WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 50;`
   - `SELECT * FROM projects WHERE created_by = ? ORDER BY created_at DESC LIMIT 50;`
   - `SELECT * FROM workspaces WHERE created_by = ?;`
2. Capture each `EXPLAIN` output as a markdown artifact under `_evidence/phase-1/explain-before-YYYYMMDD.md`.
3. Classification:
   - If the plan shows `SCAN TABLE projects` (full scan) → index is justified.
   - If the plan shows `SEARCH TABLE projects USING INDEX ...` against the `UNIQUE (id, workspace_id)` auto-index AND no `TEMP B-TREE FOR ORDER BY` → SQLite is already using the auto-index effectively; the new index may not help. Close the finding for that query.
   - If the plan shows `SEARCH ... USING INDEX` + `TEMP B-TREE FOR ORDER BY` → auto-index is used but a sort still happens; a `(workspace_id, created_at DESC)` index would eliminate the sort.

**Required tools:** `wrangler d1 execute ARCH_DB --command "EXPLAIN QUERY PLAN ..." --remote` (read-only, in scope of standing authorization).

**Owner decision:** OPEN-PERF-01 in README.

**Evaluator / regression threshold (audit-only WP):** this WP produces EXPLAIN artifacts and a classification. No code change. The "regression" is failing to capture the artifacts — if any of the 3 EXPLAIN queries errors, fix the SQL and re-run.

**Stop condition:** all three EXPLAIN artifacts captured and classified.

**Blocker condition:** if `wrangler d1 execute --remote` is not authorized for the implementer, escalate to Philip.

---

### WP-P1-02 — Apply additive index migration

**Goal:** add the confirmed-justified indexes via a new D1 migration.

**Migration file:** `migrations/0031_performance_indexes_additive.sql` (new file).

**Content shape (placeholder — actual SQL depends on WP-P1-01 outcome. Schema verified against `migrations/0007_collaboration_invitations.sql:1-50` on 2026-07-04: `projects` and `workspaces` use `created_by`, not `owner_user_id`. The originally-proposed `variant_cost_entries` index is **dropped** because migration `0028` already indexes `cost_library_item_variant_cost_entries(price_option_id, is_current, deleted_at)`.):**

```sql
-- Additive indexes only. No DROP, no RECREATE, no schema change.
-- Each index verified by EXPLAIN in WP-P1-01.

CREATE INDEX IF NOT EXISTS idx_projects_workspace_created
  ON projects(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_projects_created_by
  ON projects(created_by);

CREATE INDEX IF NOT EXISTS idx_workspaces_created_by
  ON workspaces(created_by);
```

*(The `idx_projects_created_by` and `idx_workspaces_created_by` indexes are defensive. The implementer should verify in `src/lib/repositories/` whether any query actually filters by `created_by` before applying them. If not, drop them from the migration.)*

**Apply order:**

1. `wrangler d1 migrations apply ARCH_DB --local` — verify on local preview DB.
2. `bun run cf:d1-runtime-proof` — verify query budgets still pass.
3. `wrangler d1 migrations apply ARCH_DB --remote` — apply to bound D1.
4. Re-run `EXPLAIN QUERY PLAN` from WP-P1-01 and capture under `_evidence/phase-1/explain-after-YYYYMMDD.md`. Confirm `SEARCH ... USING INDEX` for each.

**Required tools:** `wrangler d1 migrations`, the `migrations/` directory.

**Owner decision:** OPEN-PERF-02 (additive-only confirmation).

**Stop condition:** migration applied locally and remotely, EXPLAIN before/after captured.

**Blocker condition:** if migration fails on remote, **do not retry blind**. Rollback path: D1 has no `DOWN` migration; additive indexes are safe to leave in place. If the migration itself errors, investigate the SQL syntax.

**Regression threshold:** `bun run cf:d1-runtime-proof` must continue to pass all query budgets. If any budget fails after the migration, the implementer must investigate before proceeding.

---

### WP-P1-03 — Fix N+1 authz loop in workspace-repository

**Goal:** replace the per-project authz loop with a single batched D1 statement.

**Findings addressed:** F-D1-01.

**Files touched:**

- `src/lib/repositories/workspace-repository.ts:2273-2280` (the loop)
- `src/lib/authz/d1-access.ts:99-140` (`canAccessProjectInD1` definition; lift the predicate — see real authz shape below)
- New test file: `tests/vitest/workspace-repository-batched-authz.test.ts`

**Real authz shape (verified from `src/lib/authz/d1-access.ts:99-140` on 2026-07-04):**

`canAccessProjectInD1` allows access when ANY of:
1. `isPlatformAdmin(user.role)` short-circuits to `true` (handle in JavaScript, before SQL), OR
2. `project.created_by = user.userId`, OR
3. `EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = project.workspace_id AND user_id = user.userId)`, OR
4. `EXISTS (SELECT 1 FROM project_members WHERE project_id = project.id AND user_id = user.userId)`, OR
5. `EXISTS (SELECT 1 FROM estimate_sheet_members WHERE project_id = project.id AND user_id = user.userId)`.

**Steps:**

1. Preserve the platform-admin JavaScript short-circuit (branch 1) before any SQL.
2. Lift branches 2–5 into a single batched SQL: `SELECT id FROM projects WHERE id IN (?, ?, ...) AND (created_by = ? OR EXISTS workspace_members WHERE workspace_id = projects.workspace_id AND user_id = ? OR EXISTS project_members WHERE project_id = projects.id AND user_id = ? OR EXISTS estimate_sheet_members WHERE project_id = projects.id AND user_id = ?)`.
3. Replace the `Promise.all(projectIds.map(...))` block with the batched query.
4. Preserve the return shape: the caller expects `Array<[projectId, hasAccess]>`. The batched result returns the accessible subset; the implementer must produce the full array (including `false` entries for denied projects) by set-differencing against the input `projectIds`.
5. Write a focused vitest with **6 cases** mirroring each branch + denial:
   - Platform admin → all projects allowed (no SQL call, JavaScript short-circuit).
   - Project creator → allowed via branch 2.
   - Workspace member → allowed via branch 3.
   - Project member → allowed via branch 4.
   - Estimate sheet member → allowed via branch 5.
   - None of the above → denied (`false` in the result array).

**Evaluator (measurement command):**

```bash
# Before
PERF_TRACE=1 PERF_TRACE_INPUT=/dev/null bun run dev   # then load /workshop, capture log
bun run perf:dashboard-query-count PERF_TRACE_INPUT=<captured-log-path>

# After (same capture, same workspace, same favorites count)
PERF_TRACE=1 bun run dev
bun run perf:dashboard-query-count PERF_TRACE_INPUT=<captured-log-path>
```

**Regression threshold:** dashboard D1 round-trip count must drop by ≥ N, where N = number of sidebar favorites for the test workspace (target: 5–20 round-trips saved). The 6 vitest cases must all pass.

**Stop condition:** before/after PERF_TRACE artifacts captured and compared; all 6 vitest cases pass; `bun run validate` passes; manual diff review confirms no branch of `canAccessProjectInD1` was omitted.

**Blocker condition:** if the batched SQL cannot preserve the exact authz semantics (e.g., the platform-admin short-circuit cannot be lifted cleanly), stop and propose an alternative. Do not silently weaken authz. The fallback is a per-row `canAccessProjectInD1` call behind a request-scoped cache so each project is checked at most once per render — not as fast as batched, but correct.

---

### WP-P1-04 — Phase 1 verification gate

**Goal:** confirm Phase 1 is done.

**Checklist:**

- [ ] `migrations/0031_performance_indexes_additive.sql` exists and was applied to bound D1.
- [ ] `_evidence/phase-1/explain-before-YYYYMMDD.md` and `explain-after-YYYYMMDD.md` committed.
- [ ] `src/lib/repositories/workspace-repository.ts:2273-2280` no longer contains the per-project authz loop.
- [ ] `tests/vitest/workspace-repository-batched-authz.test.ts` passes.
- [ ] PERF_TRACE before/after shows round-trip reduction on `/workshop` render.
- [ ] `bun run validate` passes.
- [ ] `bun run cf:d1-runtime-proof` passes.
- [ ] No authz check removed (manual diff review of the workspace-repository change).

**Readiness:** Phase 1 → `IMPLEMENTATION-READY` for the next phase.

---

## Phase 2 — Server action waterfalls

**Goal:** reduce D1 round-trip count on the top 5 estimate actions and top 5 library actions.

**Findings addressed:** F-ACT-01, F-ACT-02, F-D1-03 (partially), F-ACT-03 (audit only).

**Out of scope:** F-D1-04 (file size), F-D1-05 (bulk ops — defer to Phase 2 if measurement confirms).

### WP-P2-01 — Capture PERF_TRACE baselines for top 10 actions

**Goal:** know which actions have the worst waterfall cost before changing anything.

**Steps:**

1. Bump Wrangler observability sampling (OPEN-PERF-04).
2. For each of the top 5 estimate actions and top 5 library actions, capture a `PERF_TRACE=1` render log through a real browser session (`bun run cf:preview` then Playwright).
3. Run `bun run perf:dashboard-query-count` (and adapt for action scope if needed) to produce per-action round-trip reports.
4. Commit baselines under `_evidence/phase-2/action-baselines-YYYYMMDD/`.

**Action selection (top 5 estimate + top 5 library):**

| Estimate | Library |
|---|---|
| `loadEstimateSheet` | `loadCurrentWorkspaceComponentLibrary` |
| `createEstimateRow` | `loadCurrentWorkspaceComponentLibraryLite` |
| `updateEstimateRow` | `createCostLibraryComponent` |
| `deleteEstimateRow` | `updateCostLibraryComponent` |
| `reorderEstimateNodes` | `executeBulkArchiveLibraryComponents` |

(Actual function names to be confirmed by the implementer by reading `src/lib/estimates/actions.ts` and `src/lib/component-library/actions.ts` exports.)

**Stop condition:** 10 baseline artifacts committed.

---

### WP-P2-02 — Refactor waterfalls into Promise.all

**Goal:** for each action with a measured waterfall ≥ 3 sequential awaits where ≥ 2 are independent, refactor to `Promise.all`.

**Discipline:**

- Only refactor awaits that are **actually independent**. Two awaits are independent if neither reads the other's result.
- Do NOT remove authz checks. Do NOT batch authz with the data query unless the authz result is unused (it never is).
- Preserve the action's existing return shape and error semantics.
- For each refactored action, add or update a focused vitest that exercises the action end-to-end (not just one branch).

**Evaluator:** repeat WP-P1-03's PERF_TRACE capture for each refactored action.

**Regression threshold:** per-action round-trip count drops by ≥ 1 (the minimum meaningful improvement). If the refactor does not produce a measurable drop, revert the change (it added complexity without value).

**Stop condition:** each refactored action has before/after PERF_TRACE artifacts and a passing vitest.

**Blocker condition:** if a refactor cannot preserve semantics, leave the action as-is and document in `_evidence/phase-2/no-refactor-reasons.md`.

---

### WP-P2-03 — Audit estimate row mutation invalidation scope

**Goal:** verify `use-estimate-row-mutations.ts` invalidations are scoped to the active estimate, not the workspace.

**Files:** `src/hooks/use-estimate-row-mutations.ts` (the 8 invalidation sites at lines 432, 443, 639, 670, 701, 739, 784, and any others found).

**Steps:**

1. Read the `queryKey` constants used at each invalidation site.
2. Read the `useQuery` declarations in the consuming components (`use-estimate-query.ts` and friends).
3. Confirm the invalidation key shape matches the query key shape exactly. Broad keys (`['estimates']`) are too wide; narrow keys (`['estimate', estimateId, 'tree']`) are correct.
4. If mismatches are found, propose a tightening. Each tightening needs a vitest that proves the previously-broad invalidation still triggers the right refetch.

**Stop condition:** audit doc committed under `_evidence/phase-2/invalidation-audit.md` listing each site as OK / TIGHTENED / DEFERRED.

**Evaluator / regression threshold (audit-only WP):** this WP produces an audit doc; any tightening applied in follow-up commits must add or update a focused vitest proving the invalidation still triggers the right refetch. The audit doc itself is the artifact; "regression" means an invalidation site was mis-classified as OK when it was actually too broad or too narrow.

**Post-review note (Codex, 2026-07-04):** this WP is classified as audit/measurement-prep, not measured remediation. The evaluator is the audit doc, not a before/after PERF_TRACE capture.

---

### WP-P2-04 — Phase 2 verification gate

- [ ] All 10 action baselines captured.
- [ ] Each refactored action has before/after PERF_TRACE.
- [ ] Invalidation audit complete; tightenings applied where needed.
- [ ] `bun run validate` passes.
- [ ] Wrangler observability sampling returned to 0.1 (or owner decision to keep at 0.5).

---

## Phase 3 — Client bundle + React hot paths

**Goal:** reduce initial workshop JS bundle and eliminate render-cost hot paths on the estimate editor.

**Findings addressed:** F-REACT-01, F-REACT-02, F-REACT-03, F-BUILD-01.

**Out of scope:** F-REACT-04 (defer), F-REACT-05 (no action), F-DEAD-01 (ride along), F-DEAD-02 (no action).

### WP-P3-01 — Capture bundle composition baseline

**Steps:**

1. `ANALYZE=true bun run build` (local, no provider impact).
2. Capture `.next/analyze/` (or wherever the analyzer writes) under `_evidence/phase-3/bundle-baseline-YYYYMMDD/`.
3. Identify the top 10 modules by gzipped size in the workshop initial bundle.

**Owner decision:** OPEN-PERF-03.

**Stop condition:** baseline artifact committed.

---

### WP-P3-02 — React Profiler pass on estimate editor

**Goal:** find the actual render-cost hot paths in the estimate sheet.

**Files:** `src/components/workshop/EstimateSheetContent.tsx`, `EstimateSheetTree.tsx`, `estimate-sheet/rows/row-table.tsx`, `estimate-sheet/rows/cells.tsx`, related hooks.

**Steps:**

1. Run the dev server with React Profiler enabled.
2. Open a 100-row × 5-column estimate fixture (use `bun run perf:seed-fixture`).
3. Record a Profiler trace for 3 interactions:
   - Initial render.
   - Single cell edit (one keystroke).
   - Row reorder (drag and drop).
4. Identify the top 5 commit contributors per interaction.
5. Save Profiler traces under `_evidence/phase-3/profiler-traces-YYYYMMDD/`.

**Stop condition:** 3 traces captured and analyzed.

---

### WP-P3-03 — Fix measured hot paths in row-table.tsx

**Goal:** reduce per-keystroke render cost in the estimate editor.

**Discipline:**

- Only fix what the Profiler surfaced. **No speculative memoization.**
- `React.memo` only on components whose props are stable and whose render is measurably expensive.
- `useCallback` only on callbacks passed to memoized children.
- `useMemo` only for values that are (a) passed to memoized children, OR (b) computationally expensive, OR (c) deps of other hooks.
- Verify `@tanstack/react-virtual` is actually used by `row-table.tsx` (dependency is installed; verify import + usage). If not used, propose adoption for > 50 visible rows.

**Evaluator:** re-run WP-P3-02 Profiler traces after the fix. Per-keystroke commit time must drop.

**Regression threshold:** if any Profiler metric regresses, revert and re-analyze.

**Stop condition:** before/after Profiler traces show measurable improvement, or write a no-action justification if the original traces were already healthy.

---

### WP-P3-04 — Audit `AddComponentModal.tsx` for effect loops

**Goal:** determine whether the 16 `useState`/`useTransition` + 6 `useEffect` count is a real problem or a false positive. *(Count corrected in Round 6 to match `01_FINDINGS.md` F-REACT-02 body; was previously drafted as "15 useState / 6 useEffect" — Codex Round 6 caught the drift.)*

**Steps:**

1. Read the file.
2. For each `useEffect`, classify: synchronizing with external system (correct use) vs. deriving state (incorrect — should be `useMemo` or render-time computation).
3. For any effect with an object/array dep, verify the dep is stable (via `useMemo`/`useState`/`useRef`).
4. If issues found, propose minimal fixes — no speculative refactor of the 1781-line file.

**Stop condition:** audit doc committed; fixes applied only where measured.

**Evaluator / regression threshold (audit-only WP):** this WP produces an audit doc classifying each `useEffect`. Any fix applied in follow-up commits must cite the specific Profiler trace or effect-dep instability that justifies it. The audit doc itself is the artifact; "regression" means an effect was mis-classified as a synchronizing-effect when it was actually a deriving-effect.

**Post-review note (Codex, 2026-07-04):** this WP is classified as audit/measurement-prep, not measured remediation.

---

### WP-P3-05 — Phase 3 verification gate

- [ ] Bundle baseline captured.
- [ ] Profiler traces captured before/after.
- [ ] Each fix has a measured improvement.
- [ ] `bun run validate` passes.
- [ ] `bun run test:e2e:perf` (route transition perf smoke) still passes.

---

## Phase 4 — Measurement gaps + CI perf budget

**Goal:** close the measurement gaps that prevented Phases 2–3 from being implementation-ready, and add a CI advisory budget gate.

**Findings addressed:** F-OBS-01 (sampling), F-BUILD-01 (analyzer artifact).

**Note on `/share/[token]` (shared proposal viewer):** README §2 names this surface as a target, but the audit found no specific Phase 1–3 bottleneck on it — the existing optimizations (P11 CSP/no-store headers, `routeStaticPublicPageThroughCache` worker short-circuit, P10 durable password lockout) are already in place. Rather than create a placeholder phase, this plan treats `/share/[token]` as deferred to a **future Phase 5** that would baseline its TTFB after Phase 1–3 land. The README §2 target (≤ 800 ms TTFB) remains the post-Phase-5 acceptance criterion. Codex Reviewer B flagged the missing share-viewer lane on 2026-07-04; this note is the explicit scope decision.

### WP-P4-01 — Add CI perf-budget advisory

**Goal:** warn (not fail) when bundle size or route-transition p95 regresses beyond a threshold.

**Files:**

- New script: `scripts/check-performance-budgets.mjs` (or extend `scripts/check-route-transition-readiness.ts`).
- `.github/workflows/ci.yml`: add a step after the existing `bun run test:e2e:perf` step.

**Budget shape (initial — to be calibrated against Phase 1–3 baselines):**

| Metric | Initial advisory budget | Source |
|---|---|---|
| Workshop initial JS bundle (gzipped) | ≤ 350 KB | WP-P3-01 baseline + 10% |
| Route transition p95 (workshop dashboard → project) | ≤ 1500 ms | existing `perf:check-routes` baseline + 20% |
| Estimate sheet open p95 (100-row fixture) | ≤ 2000 ms | WP-P3-02 baseline + 20% |

**Owner decision:** OPEN-PERF-05 (advisory for 2 weeks, then promote to blocking).

**Stop condition:** CI step runs, posts a comment on the PR if a budget is exceeded, does not fail the build.

**Evaluator / regression threshold:** the gate's evaluator is itself: run on every PR via `.github/workflows/ci.yml`, post the bundle size and route-transition p95 numbers as a comment. Regression threshold: any PR that pushes the metric > 10% above the budget triggers an advisory comment; after the 2-week advisory window, the same threshold fails the build. Budgets are calibrated against the Phase 1–3 baseline artifacts (`_evidence/phase-1/`, `_evidence/phase-2/`, `_evidence/phase-3/`) and recomputed each release.

**Real script names** *(verified against `package.json:89-92` in Round 5)*: the repo exposes both `perf:measure-routes` (runs `scripts/measure-route-transitions.ts`) and `perf:check-routes` (runs `scripts/check-route-transition-readiness.ts`). Either is a valid baseline source for the route-transition p95 budget row.

**Post-review note (Codex Round 5, 2026-07-04):** this WP originally lacked an evaluator/regression section; added above. The Round 5 review also flagged the `perf:check-routes` reference as nonexistent — that flag was a false positive (`perf:check-routes` is wired at `package.json:90`).

---

### WP-P4-02 — Document the PERF_TRACE workflow

**Goal:** make it easy for the next implementer to capture baselines.

**File:** `.ai/11_skills/capture-perf-trace-baseline.md` (new skill doc).

**Content:** step-by-step for capturing PERF_TRACE on a route, running `perf:dashboard-query-count`, and committing the artifact.

**Stop condition:** skill doc committed; one example baseline committed under `_evidence/phase-4/example-baseline/`.

**Evaluator / regression threshold (documentation-only WP):** this WP produces a skill doc + example baseline. "Regression" means the doc has stale commands (verify by running the documented commands end-to-end).

**Post-review note (Codex, 2026-07-04):** this WP is documentation, not measured remediation. Classified as measurement-prep.

---

### WP-P4-03 — Phase 4 verification gate

- [ ] CI step merged.
- [ ] Skill doc committed.
- [ ] No budgets exceeded on a fresh main-branch CI run.

---

## Cross-cutting work packages

### WP-X-01 — Replace 2 `console.log` calls in `src/lib` (rides along)

**Finding:** F-DEAD-01.

**Action:** the next time any phase touches a file containing one of the 2 `console.log`/`console.debug` calls, replace it with the structured logger (`src/lib/observability/logger.ts`). No standalone PR for this.

---

## Effort summary

| Phase | Estimated effort | Blocking on |
|---|---|---|
| 1 | 1–2 days | OPEN-PERF-01, OPEN-PERF-02 |
| 2 | 2–3 days | Phase 1 done, OPEN-PERF-04 |
| 3 | 3–5 days | Phase 1 done, OPEN-PERF-03 |
| 4 | 1–2 days | Phases 1–3 baselines, OPEN-PERF-05 |
| **Total** | **7–12 days** of focused implementation, spread across 2–3 calendar weeks |

This is intentionally conservative. Ponytail mode: smallest coherent change. If Phase 1 lands and the dashboard render round-trip count drops from 25 to 6, the user-perceived improvement may already be sufficient to defer Phases 2–4 to post-launch.

---

## What this plan explicitly does NOT authorize

- Removing or weakening any authz check.
- Enabling any Cloudflare paid add-on.
- Touching `supabase/**` or `src/lib/supabase/**`.
- Migrating off D1, R2, DO, Queues, Better Auth, or Cloudflare Email.
- Refactoring `workspace-repository.ts` file structure beyond the F-D1-01 fix site.
- Refactoring `AddComponentModal.tsx` beyond the measured hot paths.
- Committing, pushing, merging, deploying, or altering Git history.
- Mutating provider state outside the bound resources in `wrangler.jsonc`.
