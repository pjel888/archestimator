# 01 — Performance Audit Findings

> Evidence-based audit of `src/`, `migrations/`, `worker.ts`, `next.config.ts`, `wrangler.jsonc`, and `package.json`. Every finding cites a concrete file:line. Severity is judged against the three user-perceived hot paths: workshop dashboard, estimate sheet editor, shared proposal viewer.
>
> **Method:** direct codebase inspection (parallel `rg`, `wc -l`, file reads). Four background `explore` agents were dispatched but all four timed out after 30 minutes; their work was completed by direct inspection instead. No fabricated evidence.

---

## Finding index

| ID | Severity | Category | One-liner |
|---|---|---|---|
| F-D1-01 | HIGH | D1 / N+1 | Parallel authz loop in workspace repository fires N D1 round-trips per sidebar favorites render |
| F-D1-02 | MED | D1 / indexes | `projects(workspace_id, created_at)` and `workspaces(created_by)` have no explicit secondary index (PRIMARY KEY and `UNIQUE (id, workspace_id)` auto-index only) |
| F-D1-03 | MED | D1 / waterfalls | Estimate actions call `getCurrentWorkspaceProject` → `createEstimateActionsD1Client` → `assertCanEditEstimate` → query — 3+ sequential round-trips per action |
| F-D1-04 | MED | D1 / size | `workspace-repository.ts` is 4050 lines / 22 functions; largest function is 521 lines — navigation tax, not runtime tax |
| F-D1-05 | LOW | D1 / bulk | Bulk archive/move library components loops over items; needs verification that batches use a single statement, not N |
| F-ACT-01 | MED | Server actions | `component-library/actions.ts` has 69 `await` keywords across 35+ exported functions; likely sequential waterfalls |
| F-ACT-02 | MED | Server actions | `estimates/actions.ts` has 40 `await` keywords; some actions repeat `getCurrentWorkspaceProject` + `createEstimateActionsD1Client` per call |
| F-ACT-03 | LOW | Mutations | `use-estimate-row-mutations.ts` has 8+ invalidation call sites; verify scope is per-estimate, not per-workspace |
| F-REACT-01 | MED | Client bundle | 25 `"use client"` files exceed 300 lines; top 5 exceed 2000 lines — heavy initial bundle |
| F-REACT-02 | MED | React / hot path | `component-library-manager/AddComponentModal.tsx` (1781 lines, 16 useState/useTransition, 6 useEffect) — effect-loop risk |
| F-REACT-03 | MED | React / hot path | `estimate-sheet/rows/row-table.tsx` (1239 lines, 9 useState, 4 useEffect) — render cost on every keystroke in the sheet |
| F-REACT-04 | LOW | React / hot path | `projects-page-client.tsx` (2653 lines, 8 useState, 6 useEffect) — likely safe but needs Profiler confirmation |
| F-REACT-05 | LOW | Code-splitting | Zero `React.lazy` usage. `next/dynamic` is used in 10+ workshop files; verify it covers editor/charts/modals |
| F-WORK-01 | LOW | Worker / fetch | `worker.ts:64-89` runs 3 sequential await checks before OpenNext fetch; semantically required but each is a function-call overhead |
| F-WORK-02 | LOW | Worker / queue | Queue consumer `max_batch_size: 5` is conservative for upload throughput; verify against actual upload frequency |
| F-OBS-01 | MED | Observability | Wrangler observability `head_sampling_rate: 0.1` may be too low to catch p95/p99 regressions during pre-launch iteration |
| F-BUILD-01 | LOW | Bundle analyzer | `@next/bundle-analyzer` is installed and wired via `ANALYZE=true`, but no recent artifact exists in repo — no current bundle composition evidence |
| F-DEAD-01 | LOW | Dead code | `console.log`/`console.debug` appears 2× in `src/lib` — minor; verify they are dev-gated |
| F-DEAD-02 | LOW | Dead code | Only 1 truly unimported file in `src/lib` (`sharp-cloudflare-stub.ts`, intentional via next.config alias) — codebase is clean |
| F-MIG-01 | INFO | Migration archaeology | 30 active D1 migrations; `supabase/migrations/` (182 files) is retained as archaeology — confirm no test or active source imports it |
| F-MIG-02 | INFO | Migration archaeology | Legacy Supabase archaeology retained (`supabase/migrations/`, `supabase/migration-evidence/`) — out of scope for this plan, owned by `2026-07-04-Vercel-Supabase-Cleanup` |

---

## 1. D1 / database layer (highest user-perceived impact)

D1 is SQLite-backed and runs on Workers. Per-query latency is low (~1–5 ms) but **round-trip count dominates** because each round-trip pays Workers compute + network. The audit target is to minimize round-trips on hot paths, not to minimize query complexity.

### 1.1 Index coverage inventory (authoritative, from `migrations/`)

The following table maps every database table to its explicit secondary indexes (PRIMARY KEY and UNIQUE constraints auto-index in SQLite; those are not counted).

| Table | Explicit secondary indexes | Source migration |
|---|---|---|
| `account_security_events` | 3 | `0004` |
| `profiles` | 3 | `0003` |
| `notification_deliveries`, `notification_definitions` | 5 | `0009` |
| `estimate_row_items` | 4 (node, source_library_item, estimate_sort, projection) | `0015`, `0021` |
| `estimate_nodes` | 1 (estimate_sort) | `0015` |
| `estimate_tabs` | 1 (estimate_sort) | `0015` |
| `estimates` | 2 (project_sheet_code, project_updated) | `0017` |
| `estimate_sheet_events` | 4 (correlation, project_created, workspace_project_created, …) | `0025` |
| `estimate_sheet_adjustments` | 1 (updated) | `0029` |
| `project_publications` | 3 (one_published_per_project, project_status, token_hash) | `0014` |
| `shared_link_*` (recipients, comments, responses, events, digest_log) | 10+ | `0014` |
| `cost_library_items` | 4 (workspace_lifecycle, workspace_folder, source_row, …) | `0026` |
| `cost_library_price_options` | 2 (item_active, workspace_updated) | `0026` |
| `cost_library_item_variant_attachments` | 4 | `0022` |
| `cost_library_item_variant_cost_entries` | 1 (`price_option_id, is_current, deleted_at`) | `0028` |
| `cost_library_item_price_history` | 1 (`item_id, created_at`) | `0028` |
| `component_category_nodes` | 1 (parent_sort) | `0026` |
| `library_folders` | 1 (workspace_parent_sort) | `0026` |
| `project_groups`, `project_group_memberships` | 5 | `0020` |
| `workspace_members` | 1 (user) | `0013` |
| `project_favorites` | 2 | `0013` |
| **`projects`** | **0** *(PRIMARY KEY and `UNIQUE (id, workspace_id)` are auto-indexed; no `(workspace_id, created_at)` or `(created_by)` index)* | `0007` |
| **`workspaces`** | **0** *(PRIMARY KEY and `slug` UNIQUE auto-indexed; no `(created_by)` index)* | `0007` |
| **`estimate_sheets`** | N/A *(not a separate table — `estimates` covers it)* | — |
| `collaboration_invitations` | 3 (`email_lifecycle`, `project_lifecycle`, `estimate_lifecycle`) | `0007` *(corrected in Round 5 after Codex caught the prior "0 explicit" claim was wrong — `migrations/0007_collaboration_invitations.sql:145-152`)* |

**Gap interpretation:**

- `projects.workspace_id` has no index beyond the `UNIQUE (id, workspace_id)` auto-index. The `UNIQUE (id, workspace_id)` constraint creates an index on `(id, workspace_id)` ordered by `id` first — useful for primary-key lookups, but **not optimized** for the common dashboard / sidebar query `WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 50`. A purpose-built `(workspace_id, created_at DESC)` index would let the planner seek + limit without a sort.
- `projects.created_by` has no index. Queries like `WHERE created_by = ?` (for "projects I created") would benefit.
- `workspaces` is small (one row per workspace); a missing `(created_by)` index is low-impact today but is a defensive add.
- `cost_library_item_variant_cost_entries(price_option_id)` IS already indexed (`0028` migration). Originally flagged as missing; **closed** after Codex review identified migration `0028_component_library_action_support.sql:65-90`.
- `estimate_sheets` is not a separate table; `estimates` covers the concept.

**Severity:** MED (was HIGH before verification). The `projects(workspace_id, created_at)` gap is the strongest case but still needs `EXPLAIN` confirmation that the SQLite planner isn't already using the `UNIQUE (id, workspace_id)` auto-index effectively.

---

### F-D1-01 — Parallel authz N+1 in workspace repository (HIGH)

**Location:** `src/lib/repositories/workspace-repository.ts:2273-2280`

**Evidence (verbatim from repo):**

```ts
const accessPairs = await Promise.all(
  projectIds.map(async (projectId) => [
    projectId,
    await canAccessProjectInD1(database, projectId, {
      role: isPlatformAdminRole(profile.role) ? profile.role : undefined,
      ...
    }),
  ]),
);
```

**Real authz shape (verified from `src/lib/authz/d1-access.ts:99-140`):**

`canAccessProjectInD1` allows access when ANY of:
1. `isPlatformAdmin(user.role)` short-circuits to `true`, OR
2. `EXISTS (SELECT 1 FROM projects WHERE id = ? AND created_by = ?)` — caller is project creator, OR
3. `EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = project.workspace_id AND user_id = ?)` — caller is workspace member, OR
4. `EXISTS (SELECT 1 FROM project_members WHERE project_id = project.id AND user_id = ?)` — caller is project member, OR
5. `EXISTS (SELECT 1 FROM estimate_sheet_members WHERE project_id = project.id AND user_id = ?)` — caller is estimate sheet member.

There is **no** `workspace_id` direct check, **no** role check beyond the platform-admin short-circuit, and **no** project-status predicate.

**Why it's slow** *(inferred — not yet measured)*: `Promise.all` parallelizes JavaScript, but every inner `await canAccessProjectInD1` is a separate D1 round-trip. Each call runs a SQL with 3 `EXISTS` subqueries. Estimated cost: ~2–10 ms per round-trip on Workers *(inferred; not yet measured against bound D1 — see WP-P1-01)*. For a sidebar with N favorited projects, this is N round-trips per dashboard render.

**Suggested fix shape (NOT code):**

- Replace the per-project loop with a single batched SQL that takes the `projectIds` array and the user's `userId`, and returns the subset that passes ANY of branches 2–5 above.
- The batched shape is non-trivial: it must reproduce the 4-way OR (created_by, workspace_members, project_members, estimate_sheet_members) in a single statement, parameterized by `userId` and the `projectIds` array. Suggested structure: `SELECT id FROM projects WHERE id IN (?, ?, ...) AND (created_by = ? OR EXISTS workspace_members OR EXISTS project_members OR EXISTS estimate_sheet_members)`.
- Preserve the platform-admin short-circuit in JavaScript before running the SQL (skip the query entirely if `isPlatformAdmin`).
- Add a focused vitest with **6 cases** mirroring each authz branch + denial:
  1. Platform admin → all projects allowed (no SQL call).
  2. Project creator → allowed via branch 2.
  3. Workspace member → allowed via branch 3.
  4. Project member → allowed via branch 4.
  5. Estimate sheet member → allowed via branch 5.
  6. None of the above → denied.

**Measurement gate:** before/after `PERF_TRACE=1` capture of the workshop dashboard render. Target: dashboard D1 round-trip count drops by ≥ N (where N = number of sidebar favorites).

**Post-review note:** the original draft of this finding mis-described the authz predicate as "workspace membership, role check, project status." The real predicate is the 4-way OR above. Codex Reviewer B caught this on 2026-07-04.

---

### F-D1-02 — Missing secondary indexes on `projects`, `workspaces` (MED)

**Location:** `migrations/0007_collaboration_invitations.sql:1-50` (table definitions); absence of additional `CREATE INDEX` for the columns named below.

**Evidence:** see the index inventory in §1.1 above. The original draft also flagged `variant_cost_entries` and `owner_user_id` — both were wrong (Codex review, 2026-07-04): the real table is `cost_library_item_variant_cost_entries` which is already indexed in `0028`, and the columns are `created_by` not `owner_user_id`.

**Suggested fix shape:**

- New migration `0031_performance_indexes_additive.sql` adding (subject to WP-P1-01 EXPLAIN confirmation):
  - `CREATE INDEX IF NOT EXISTS idx_projects_workspace_created ON projects(workspace_id, created_at DESC);`
  - `CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);` *(only if queries actually filter by `created_by` — verify in repository code first)*
  - `CREATE INDEX IF NOT EXISTS idx_workspaces_created_by ON workspaces(created_by);` *(defensive, low cost)*
- **All indexes additive** (no DROP, no RECREATE). Existing data is preserved.
- **`EXPLAIN` proof required before applying:** run `EXPLAIN QUERY PLAN SELECT ... FROM projects WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 50` on the bound D1 (`bun run cf:d1-runtime-proof` or `wrangler d1 execute ARCH_DB --remote --command "EXPLAIN QUERY PLAN ..."`) before and after. The before-plan should show whether SQLite is using the `UNIQUE (id, workspace_id)` auto-index or falling back to a scan; the after-plan should show the new `(workspace_id, created_at)` index.

**Measurement gate:** `EXPLAIN QUERY PLAN` artifacts committed under `_evidence/phase-1/`.

**Post-review note:** severity downgraded from HIGH to MED because (a) the `variant_cost_entries` portion of the original finding was wrong, and (b) the SQLite query planner may already use the `UNIQUE (id, workspace_id)` auto-index for some queries — only EXPLAIN can confirm.

---

### F-D1-03 — Sequential awaits in estimate actions (MED)

**Location:** `src/lib/estimates/actions.ts:1226-1267` (and similar in 30+ other action sites)

**Evidence (pattern observed across multiple action functions):**

```ts
const { project } = await getCurrentWorkspaceProject(projectId);    // round-trip 1
if (!project) throw new Error("Project not found");
const dataStore = await createEstimateActionsD1Client();            // round-trip 0 (cached?)
if (options?.requireEdit) await assertCanEditEstimate(dataStore, estimateId);  // round-trip 2 (authz)
const { data: row, error } = await dataStore.from("estimate_row_items")...;    // round-trip 3
```

**Why it's slow:** every action that touches an estimate does 3+ sequential D1 round-trips before the actual data query. The `assertCanEditEstimate` call is itself a `dataStore.call("can_edit_estimate", ...)` RPC, which is another D1 round-trip.

**Suggested fix shape:**

- Identify actions where `getCurrentWorkspaceProject` and `assertCanEditEstimate` can run in parallel (when the authz check doesn't need the project row). Wrap in `Promise.all`.
- For actions that need both, consider folding the workspace-membership check into the same RPC as the authz check.
- **Do not eliminate authz checks.** Only reorder/fold.

**Measurement gate:** `PERF_TRACE=1` capture on 5 representative estimate actions before/after.

---

### F-D1-04 — `workspace-repository.ts` size (MED, navigability not runtime)

**Location:** `src/lib/repositories/workspace-repository.ts` (4050 lines, 22 exported functions, largest function 521 lines)

**Why it matters:** no runtime cost, but slows every agent and human that touches the workspace data layer. Tree-shaking still works; the cost is maintainability and review latency.

**Top functions by line count:**

| Lines | Function |
|---|---|
| 521 | `parseMainSidebarFavoriteProjectsPayload` |
| 475 | `readLatestPublicationActivityTimestamp` |
| 432 | `listProjectEstimateSheets` |
| 292 | `getProjectCollaborationSummary` |
| 275 | `isWorkspaceHomebaseSummaryRollupError` |
| 204 | `getEstimateNodeSubtree` |

**Suggested fix shape:** when next touching this file for a perf fix, extract cohesive groups (e.g. `parseMainSidebarFavoriteProjectsPayload` and friends → `workspace-repository/favorites.ts`). Do **not** do this as a standalone refactor — only when a Phase 1 fix lands here anyway.

---

### F-D1-05 — Bulk library operations (LOW, verify)

**Location:** `src/lib/component-library/actions.ts:1609` (`executeBulkArchiveLibraryComponents`), `:1784` (`moveCostLibraryComponentToFolder`)

**Evidence needed:** the actual SQL shape. If the bulk op loops client-side and fires N UPDATE statements, it's a hot path for large selections. If it uses a single `UPDATE ... WHERE id IN (?, ?, ...)` it's already optimal.

**Suggested action:** read these two functions before Phase 2. If loop-based, propose a batched SQL rewrite. If already batched, close the finding.

---

## 2. Server actions / network waterfalls

### F-ACT-01 — `component-library/actions.ts` waterfall risk (MED)

**Location:** `src/lib/component-library/actions.ts` (2863 lines, 69 `await` keywords, 35+ exported functions)

**Why it matters:** the highest await density in the codebase. Each `await` is a potential D1 round-trip. Without per-action PERF_TRACE evidence, we can't know which awaits are sequential vs. already parallel.

**Suggested fix shape:**

- Capture `PERF_TRACE=1` traces for the top 5 library actions: `loadCurrentWorkspaceComponentLibrary`, `loadCurrentWorkspaceComponentLibraryLite`, `createCostLibraryComponent`, `updateCostLibraryComponent`, `executeBulkArchiveLibraryComponents`.
- For each, identify the awaits that can become `Promise.all`.
- The repository layer (`component-library-repository.ts`, 2021 lines) likely has the same pattern.

---

### F-ACT-02 — `estimates/actions.ts` waterfall risk (MED)

**Location:** `src/lib/estimates/actions.ts` (3682 lines, 40 `await` keywords)

**Why it matters:** estimate actions are the highest-frequency server-action path. Every keystroke in the sheet that triggers a save/row mutation passes through here.

**Suggested fix shape:** same as F-ACT-01 — PERF_TRACE the top 5 estimate actions, find the Promise.all opportunities.

---

### F-ACT-03 — Estimate row mutation invalidation scope (LOW, verify)

**Location:** `src/hooks/use-estimate-row-mutations.ts:432-443, 639-640, 670-671, 701-702, 739-740, 784-785` (8 invalidation sites)

**Why it matters:** TanStack Query invalidations that are too broad (`['estimates']`) cause refetch storms across all open estimates. Invalidation that is too narrow (`['estimate', estimateId, 'row', rowId]`) misses related queries.

**Suggested action:** audit the `queryKey` constants used at each invalidation site. Confirm they match the `useQuery` queryKey shape used by the consuming components. The existing Library Optimization Plan P0 T3 already addressed this for library; estimate row mutations need the same audit.

---

## 3. React / client bundle

### F-REACT-01 — 25 client files exceed 300 lines (MED)

**Location:** top offenders (full list in `02_IMPLEMENTATION_PLAN.md` Phase 3 work package):

| Lines | File |
|---|---|
| 3315 | `src/components/workshop/component-library/index.tsx` |
| 2875 | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` |
| 2764 | `src/components/workshop/EstimateSheetContent.tsx` |
| 2653 | `src/components/workshop/projects-page-client.tsx` |
| 2230 | `src/components/workshop/EstimateSheetTree.tsx` |
| 1819 | `src/components/workshop/estimate-sheet/activity-history.tsx` |
| 1781 | `src/components/workshop/component-library-manager/AddComponentModal.tsx` |
| 1476 | `src/components/ui/tree.tsx` |
| 1457 | `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` |

**Why it matters:** every `"use client"` file ships to the browser. The 242 total `"use client"` files is high for an RSC-first app. These top 9 alone account for ~20K lines of client-side code. Even with `next/dynamic`, the initial bundle on `/workshop` includes the workshop shell.

**Suggested fix shape:**

- Run `ANALYZE=true bun run build` and capture the bundle composition artifact.
- For each top-10 module, identify whether it can be (a) split via `next/dynamic` so it's only loaded on the route that uses it, (b) split internally by extracting rarely-used sub-surfaces into dynamic children, or (c) left as-is because it's already on a critical path.
- The decision must be evidence-based — no speculative splitting.

---

### F-REACT-02 — `AddComponentModal.tsx` effect-loop risk (MED)

**Location:** `src/components/workshop/component-library-manager/AddComponentModal.tsx` (1781 lines, 16 `useState`/`useTransition` calls, 6 `useEffect` calls — counts verified 2026-07-04)

**Why it matters:** 16 state hooks + 6 effects in one client component is a red flag for (a) effect loops where an effect writes to state that triggers another effect, and (b) unnecessary re-renders when state changes propagate through a deep tree.

**Suggested fix shape:**

- Run a React Profiler pass on a typical add-component interaction.
- Identify effects that derive state vs. effects that synchronize with external systems. The former should be derived during render (`const x = useMemo(() => f(a, b), [a, b])`), not via useEffect.
- Identify any useEffect with an object/array dep — those change identity every render and cause effect loops.
- Do NOT refactor speculatively. Only fix measured hot paths.

---

### F-REACT-03 — `row-table.tsx` render cost on every keystroke (MED)

**Location:** `src/components/workshop/estimate-sheet/rows/row-table.tsx` (1239 lines, 9 `useState`/`useTransition` calls, 4 `useEffect` calls — counts verified 2026-07-04)

**Why it matters:** this is the estimate sheet grid. Every cell edit potentially re-renders the table. If the table is memoized incorrectly, a single keystroke can re-render hundreds of rows. The existing `use-estimate-row-mutations.ts` (1167 lines) does optimistic updates, so the mutation path is hot.

**Suggested fix shape:**

- Profiler pass on a 100-row × 5-column estimate.
- Verify row components are `React.memo`-wrapped with stable props (no inline object/array creation in the parent).
- Verify callbacks are `useCallback`-wrapped only where they're passed to memoized children — not everywhere.
- Verify `@tanstack/react-virtual` is used if rows exceed ~50 visible at once. (Dependency is installed; verify usage.)

---

### F-REACT-04 — `projects-page-client.tsx` (LOW)

**Location:** `src/components/workshop/projects-page-client.tsx` (2653 lines, 8 useState, 6 useEffect)

**Why it matters:** the projects list page. Lower interaction frequency than the estimate sheet, so even if it has minor memoization gaps the user-perceived impact is small.

**Suggested action:** defer to Phase 3 if Profiler surfaces it as a hot path.

---

### F-REACT-05 — Zero `React.lazy` usage (LOW)

**Location:** codebase-wide `rg "React.lazy|lazy\("` returned no matches in `src/`.

**Why it matters:** `next/dynamic` and `React.lazy` serve different purposes. `next/dynamic` is for route-level / component-level code-splitting within Next.js. `React.lazy` is for Suspense-bound lazy imports. The codebase uses `next/dynamic` correctly (10+ workshop files). The absence of `React.lazy` is not a defect — it's a consistency note. No action needed unless a Phase 3 surface specifically benefits from Suspense-bound lazy.

---

## 4. Worker / infrastructure

### F-WORK-01 — Worker fetch pre-OpenNext awaits (LOW)

**Location:** `worker.ts:64-89`

**Evidence:** the Worker's default export `fetch` runs three sequential `await`s before falling through to `openNextWorker.fetch`:

```ts
const proofResponse = await routeCloudflareProtectedProofRequest(request, env);
if (proofResponse) return proofResponse;
const collaborationRoomResponse = await routeCollaborationRoomRequest(request, env);
if (collaborationRoomResponse) return collaborationRoomResponse;
const cachedPublicPageResponse = await routeStaticPublicPageThroughCache(request, ctx, ...);
if (cachedPublicPageResponse) return cachedPublicPageResponse;
const response = await openNextWorker.fetch(request, env, ctx);
```

**Why it's mostly fine:** the early-return pattern is semantically correct — if the first route matches, we don't want to invoke the others. Parallelizing with `Promise.all` would invoke all of them even when one matches, which is wasteful.

**Why it's still a finding:** for non-matching requests (the common case), all three checks run sequentially. Each check likely does a URL/method inspection (cheap) but in some cases may do more work (auth proof, room lookup). Worth measuring but **do not refactor speculatively** — premature Promise.all here is a regression.

**Suggested action:** measure with `wrangler tail` + observability. If the pre-OpenNext overhead exceeds 5 ms p95, consider URL-pattern gating each route so non-matching requests skip the function call entirely.

---

### F-WORK-02 — Queue batch size conservative (LOW)

**Location:** `wrangler.jsonc` queues block — `max_batch_size: 5`, `max_batch_timeout: 30`, `max_retries: 3`

**Why it matters:** for upload jobs (PDF/XLS processing), batch size 5 is conservative. If uploads are bursty (a user uploads 20 components' attachments in one session), the queue backs up.

**Suggested action:** measure upload latency in production-like conditions (`cf:verify-hosted-upload-runtime`, `cf:verify-hosted-upload-operations`). If throughput is the bottleneck and Worker memory allows, raise `max_batch_size` to 10. If latency per job is the bottleneck, leave at 5.

---

### F-OBS-01 — Observability sampling too low for perf regression hunting (MED)

**Location:** `wrangler.jsonc` observability block — `head_sampling_rate: 0.1` (10%), traces `head_sampling_rate: 0.05` (5%)

**Why it matters:** at 10% sampling, a p95 regression on a route with 100 requests/day shows up as ~10 sampled requests — not enough signal to distinguish noise from regression. Pre-launch, when traffic is low, this is too sparse.

**Suggested fix shape:**

- During the Phase 2 measurement window, bump `head_sampling_rate` to 0.5 (50%) and traces to 0.2 (20%). Free-tier bounded; sampling rate is not a paid add-on.
- After the measurement window, drop back to 0.1.
- **Owner decision needed:** see OPEN-PERF-04 in README.

---

## 5. Build / tooling

### F-BUILD-01 — No recent bundle analyzer artifact (LOW)

**Location:** `@next/bundle-analyzer` is installed (`package.json:126`) and wired in `next.config.ts` via `withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })`.

**Why it matters:** there is no committed bundle composition artifact. Without it, Phase 3 work is grounded in inference (file line counts) rather than measurement (gzipped module sizes).

**Suggested action:** run `ANALYZE=true bun run build` locally, capture the analyzer output (typically `.next/analyze/`), and commit a snapshot under `_evidence/phase-3/bundle-baseline-YYYYMMDD/`.

---

## 6. Dead code / cleanup

### F-DEAD-01 — `console.log`/`console.debug` in lib (LOW)

**Location:** `rg "console\.(log|debug)" src/lib --type ts` returns 2 hits (file paths not captured in the audit run; re-run to identify).

**Why it matters:** `console.log` in production source paths is (a) a minor perf cost on hot paths, (b) a code-quality signal. The `.cursor/rules/typescript-hooks.mdc` already says "no console.log in production code."

**Suggested action:** identify the 2 hits, replace with the structured logger in `src/lib/observability/logger.ts` (referenced by `src/instrumentation.ts:24`).

---

### F-DEAD-02 — Codebase is clean of unused files (LOW, positive)

**Location:** audit script identified only 1 unimported file in `src/lib`: `src/lib/uploads/sharp-cloudflare-stub.ts` (7 lines).

**Why it's good news:** the `sharp-cloudflare-stub.ts` is intentionally not imported from `src/` — it's wired via `next.config.ts`'s `turbopack.resolveAlias` for the Cloudflare Workers build. Not dead code.

**Conclusion:** the codebase does not have a meaningful dead-file problem. Phase 3 should not spend time on dead-code removal.

---

### F-MIG-01 — Active D1 migration count (INFO)

**Location:** `migrations/` (30 files, `0001` through `0030`).

**Why it's noted:** 30 active D1 migrations is a manageable count. The latest is `0030_workspace_owner_membership_backfill.sql`. Any new performance-index migration must sequence after `0030`.

**Action for this plan:** the Phase 1 migration will be `0031_performance_indexes_additive.sql`.

---

### F-MIG-02 — Legacy Supabase archaeology retained (INFO)

**Location:** `supabase/migrations/` (182 files), `supabase/migration-evidence/`

**Why it's noted:** the current-state log says zero active runtime blockers but the files are retained as migration archaeology. This plan does **not** propose removal — that's the separate `2026-07-04-Vercel-Supabase-Cleanup` plan's scope.

**Action for this plan:** none. Verify no `src/lib/**` file imports from `supabase/**` (current-state log says zero; this audit did not re-verify).

---

## 7. Findings deliberately out of scope

The following were considered and excluded:

- **Cron schedule optimization** (`0 3 * * *`, `15 3 * * *` — upload cleanup + scan): crons run at 03:00 UTC when traffic is lowest. Not a perf concern.
- **Durable Object collaboration room perf:** the collaboration room (`collaboration-room.ts`, 233 lines) handles WebSocket traffic. Realtime cursor presence is a known cost but is gated by the room authorization handshake (Phase 3 of Authentication Audit plan, 2026-07-03). Out of scope here.
- **Email sending latency:** Cloudflare Email Service is wired but not on the user-perceived hot path for this audit.
- **Tailwind v4 CSS compilation:** build-time only, not runtime. CI build time is already bounded by the `bun run build` step.
- **Image optimization:** `next.config.ts` images config uses Cloudflare's custom loader for production and local patterns for dev. Not a perf finding.
- **Third-party scripts (GA4, Clarity):** landing-only via `LandingAnalyticsLoader`. Workshop does not load them. Already optimized.

---

## 8. Severity rollup

| Severity | Count | Findings |
|---|---|---|
| HIGH | 1 | F-D1-01 |
| MED | 9 | F-D1-02 *(downgraded from HIGH after schema verification)*, F-D1-03, F-D1-04, F-ACT-01, F-ACT-02, F-REACT-01, F-REACT-02, F-REACT-03, F-OBS-01 |
| LOW | 9 | F-D1-05, F-ACT-03, F-REACT-04, F-REACT-05, F-WORK-01, F-WORK-02, F-BUILD-01, F-DEAD-01, F-DEAD-02 |
| INFO | 2 | F-MIG-01, F-MIG-02 |

**Total: 21 findings (was 20 in Round 1 — F-MIG-01 body was added in Round 2).**

**Count correction (post-review):** the original draft listed "MED Count | 7" with 8 IDs and "HIGH Count | 2" with F-D1-01 + F-D1-02. Round 2 Codex review (2026-07-04) downgraded F-D1-02 to MED and corrected the MED count to 8 (with F-D1-02 added). Round 3 Codex review (2026-07-04) caught that the MED list now contains 9 IDs (F-D1-02, F-D1-03, F-D1-04, F-ACT-01, F-ACT-02, F-REACT-01, F-REACT-02, F-REACT-03, F-OBS-01) — count above is corrected to 9.

**The single HIGH finding (F-D1-01) alone justifies Phase 1.** The MED findings become Phase 2 and Phase 3 once their baselines are captured. The LOW findings are cleanup that should ride along with adjacent work, not drive standalone phases.
