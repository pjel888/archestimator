# R5 — Data Fetching + Supabase/DB Performance Dossier

Agent: R5 (data/Supabase). Repo: archestimator. Date: 2026-06-17.
Method: code-review-graph + `rg` + targeted reads + Supabase MCP read-only advisors
(`get_advisors` performance, project `ebxxqidacheyapmmzavr`). READ-ONLY. No migrations applied.

Every claim cites `path:line — observation`. Severity tags: [HIGH] [MED] [LOW] [OK].

---

## Repository inventory (per-function: file:line, columns, returns, risks)

### `src/lib/repositories/workspace-repository.ts` (2477 lines — the hub)

- **`ensureDefaultWorkspace`** `:760` — `cache()`-wrapped bootstrap; idempotent per request. [OK]
- **`getCurrentUserContext`** (`src/lib/auth/session.ts:31`) — `cache()`-wrapped. [OK]
- **`listCurrentWorkspaceProjects`** `:821-914` — 8-way `Promise.all` (`:834`). **`projects` selected with `.select("*")` at `:837` and again for shared projects at `:908`.** [MED — projects table carries every column incl. unused metadata across the sidebar/list boundary]. Shared-projects fetch (`:905-913`) is a sequential follow-up after the parallel batch (needs `sharedProjectIds` from members) — acceptable dependency. Returns owned+shared projects, favorites, group memberships, access ranks.
- **`getWorkshopHomebaseData`** `:1050-1261` — 6-way `Promise.all` (`:1061`) for favorites/recent/members, **then a long SEQUENTIAL await chain**: favoriteProjects `:1128`, recentEstimates `:1155`, favoriteEstimates `:1167`, missingProjects `:1184`, `readOptionalProjectPublications` `:1194`, `readPendingCollaborationVisibilitySummary` `:1204`, firstNodes `:1214`. [HIGH — 5–7 serial round-trips after the parallel batch; several are independent of each other (favoriteProjects vs favoriteEstimates vs recentEstimates) and could be one more `Promise.all` wave]. Columns are explicit (good): projects `:1078/1130/1186`, estimates `:1157/1170`, nodes `:1216`.
- **`listProjectEstimates`** `:1620-1683` — explicit `ESTIMATE_LIST_COLUMNS` (`:1635`); `Promise.all` of RPC `project_estimate_list_summaries` + narrow nodes query (`:1656`). [OK — this is the *fixed* F8/P2-1 path: aggregate counts/total cost now in SQL RPC, only the firstNodeId nodes query remains in JS]. Note the nodes query (`:1661-1665`) still fetches ALL nodes for ALL estimates in the project purely to compute first-node oracle in JS via `selectFirstEstimateNodeIds`.
- **`listMainSidebarFavoriteProjects`** `:1263` — `cache()`-wrapped; `.limit(MAIN_SIDEBAR_FAVORITE_PROJECT_LIMIT)` (`:1273`), explicit columns. [OK]
- **`getCurrentWorkspaceProject`** `:1347` — `cache()`-wrapped; `.select("*")` `:1356/1367`. [MED — projects/workspace `*`, but cached per request].
- **`getCachedProjectMembers`** `:1380` — `cache()`-wrapped to collapse repeated project-layout member loads. [OK]
- **Estimate-tree loaders** (`:1993-2466`) — use explicit `ESTIMATE_TREE_NODE_COLUMNS` (`:1733`) and `ESTIMATE_TREE_ROW_ITEM_COLUMNS` (`:1734`, includes `source_snapshot, metadata`). Node/row pairs fetched via `Promise.all` (`:1996/2421/2464`). [MED — `source_snapshot` + `metadata` JSON per row crosses the boundary on every tree load; load-bearing for linked-row display per the `:1730` comment, but heavy. Cross-check with R4 (sheet) on whether the sheet renders all of `source_snapshot`].
- **`can_edit_estimate` / pending-invites** `:368/2095` — RPC + `Promise.all`. [OK]

### `src/lib/repositories/component-library-repository.ts` (1197 lines)
- **`loadCurrentWorkspaceComponentRowsLibrary`** `:530-746` — **`.select("*")` on 8 tables: `:547` category_nodes, `:562` cost_library_items, `:606` price_options, `:614` variant_cost_entries, and (detail graph) `:634` versions, `:640` price_history, `:646` state_history, `:652` variant_attachments.** [HIGH]. **No `.limit()` on `cost_library_items` (`:562-566`)** — a large workspace loads the entire library. [HIGH]. **No per-item limit on audit/history tables (`:630-656`)** — versions/price_history/state_history grow unbounded per item. [HIGH]. Queries are parallelized (`Promise.all` `:546/602/630`) and client-side Maps group children (`:671-683`) — N+1-free but volume-unbounded.
- **`getCurrentWorkspaceComponentLibrary`** `:1146` — calls loader with `includeDetailGraph: true` (full audit graph). **`getCurrentWorkspaceComponentLibraryLite`** `:1169` — `includeDetailGraph: false` (skips audit tables but still loads price_options + cost_entries). [MED — confirm production list views call the Lite variant].
- **`loadCurrentWorkspaceEstimateTemplates`** `:748-793` — `.select("*")` templates `:757`, template_nodes `:771`, template_row_items `:776` (full `source_snapshot`); no `.limit()`. [MED]
- **`getLibraryOverview`** `:892-1096` — **well-built**: count queries with `{count:"exact", head:true}` (`:915-928`), `.limit(6/5/1)` on recents (`:936/942/1010`), explicit columns on hot reads (`:932`). `.select("*")` only on templates `:939` + conditional recent nodes/items `:1009/1014`. [OK / minor MED]
- **`getEstimateTemplateById`** `:1103` — `.select("*")` `:1110/1122/1128`, parallelized; single template so bounded. [LOW]
- **`buildEstimateTemplatesFromRows`** `:464-524` — pure JS tree rebuild + recursive total `.reduce` (`:457-461/512`); transform of pre-fetched rows, not a query. [LOW]

### `src/lib/repositories/project-charts-repository.ts` (325 lines)
- **`getProjectChartsData`** `:38-150` — **exemplary fetch discipline**: explicit columns everywhere (no `*`), every loader has `.limit(N+1)` overflow detection (`ESTIMATE_OPTION_LIMIT=100`, `ESTIMATE_ROW_LIMIT=5000`, `ESTIMATE_NODE_LIMIT=1500`, etc. `:15-20`, `:54/182/221/253/281`), 4-way `Promise.all` (`:88`). **BUT all aggregation is client-side**: `.reduce` per-estimate totals (`:101-111`) and `buildSeriesByEstimate` category/supplier bucketing (`:119-128`). Comment `:113-118` says an equivalent `get_project_chart_buckets` RPC "is provided as a ready migration" — **but no such migration exists** (`rg get_project_chart_buckets supabase/migrations` → 0 hits). [MED — push-down planned but unshipped; ships up to 5000 rows + 1500 nodes to compute buckets in JS].

### Smaller repos
- **`estimate-favorites-repository.ts:5`** `listCurrentUserEstimateFavoriteCreatedAtById` — explicit columns, `.in()` scoped, early-return on empty. [OK]
- **`estimate-repository.ts:165`** — `Promise.all` nodes+rows, named SELECT constants. [OK]
- **`cost-library-repository.ts`** (85 lines), **`project-data-repository.ts`** (104), **`project-estimate-sheets-repository.ts`** (26) — small, scoped. Spot-checked, no `*` on hot paths.

---

## Server actions & return shapes

23 `"use server"` files (`rg -l "use server" src`). Highlights:

- **`src/lib/estimates/actions.ts` (2742 lines)** — mostly thin RPC mutation wrappers (good; see RPC inventory). Notable READ paths:
  - `fetchEstimateSheetVersionControl` `:1237-1379` — event payload SELECT (`:1277`) pulls `old_snapshot, new_snapshot, payload` for every event row. [MED — heavy audit payloads; `.limit(boundedEventLimit+1)` ≤101 caps it]. **Actor-label N+1-ish**: after fetching events, a separate `profiles` `.in("id", actorUserIds)` round-trip (`:600-622`) — batched but a second hop that a left-join/RPC could fold. [MED]
  - `resolveEstimateActivityNodeScope` `:670-719` — **fetches EVERY node of the estimate** (`.select("id, parent_id, kind")` `:698-701`, no limit) then computes descendants in JS BFS (`collectDescendantNodeIds` `:640-662`). [MED — belongs in a `WITH RECURSIVE` SQL/RPC; wasted entirely when `includeDescendants=false`].
  - `fetchEstimateActivityRetentionMetrics` `:1395` — RPC `get_estimate_activity_retention_metrics` (aggregation in SQL). [OK]
  - Bulk-delete previews `:1772/1824` — RPC-backed, IDs capped at 100 via `normalizeBulkActionIds`. [OK]
- **`src/lib/publication/public-repository.ts` (1038 lines)** — **best-in-class**. `cache()` on service client `:85`, access-row reader `:99`, snapshot reader `:111` (comment `:87-95` documents collapsing 5+ redundant token_hash SELECTs into 1). Split `ACCESS_LOOKUP_COLUMNS` vs `SNAPSHOT_LOOKUP_COLUMNS` (`:96-97`) so the heavy `snapshot_json` blob is only read when needed. Comments `.limit(200)` (`:861`), `.maybeSingle()+limit(1)` (decisions), count via `head:true` (`:278`). [OK — use as the pattern reference for other domains].
- **`src/lib/projects/actions.ts`** — bulk delete via RPC `:182/209`; storage cleanup audit RPC `:239`. [OK]
- **`src/lib/favorites/sidebar-favorites-actions.ts`** (14 lines) — re-export shim. [OK]

No action observed returning literal `.select("*")` blobs straight to the client except via the repository functions flagged above (component library, projects).

---

## RPC inventory (`.rpc(` calls → SQL defs)

215 `create function` defs across migrations. Mutations are correctly RPC-encapsulated (history-tracked, SECURITY DEFINER where needed):

- **Estimate writes**: `create/rename/delete_estimate_node_with_history`, `insert/update/replace/delete/unlink_estimate_row_item_with_history`, `reorder_estimate_nodes_with_history`, tab CRUD `*_with_history`, `update_estimate_details_with_history` (`actions.ts:1898-2733`).
- **Aggregation reads (good push-down)**: `project_estimate_list_summaries` (`workspace-repository.ts:1658`; def `20260613201251_…rpc.sql` — `language sql stable security invoker`, GROUP BY counts + inlined line-total sum, revoked from anon, granted authenticated). `get_estimate_activity_retention_metrics` (`actions.ts:1395`). [OK]
- **Authz helpers**: `can_edit_estimate`, `can_edit_project`, `is_workspace_editor`, `check_closed_beta_access`, `ensure_current_user_profile`.
- **Collaboration/publication**: `issue/accept/resolve_collaboration_invitation*`, `insert_client_comment`, `submit_client_response`, `increment_project_publication_open`.
- **AI apply**: `create_ai_package_library_components_with_history`, `create_project_estimate_package_with_history`, etc. (`ai/package-builder/apply.ts`).
- **Bulk governance**: `preview/execute_bulk_delete_estimate_sheets`, `preview/execute_bulk_delete_projects`, `preview/execute_bulk_archive_library_components`.
- **MISSING / referenced-but-absent**: `get_project_chart_buckets` — cited in `project-charts-repository.ts:117` as a "ready migration" but **no migration defines it**. [Candidate to actually build].

---

## Schema / indexes / RLS notes (from migrations + live advisors)

- **Indexes**: 118 `create index` statements. Hot list paths covered: `projects(workspace_id, updated_at desc)` and `estimates(project_id, updated_at desc)` (`20260520051908_optimize_workspace_estimate_list_indexes.sql:2/5`).
- **Live performance advisors (Supabase MCP, project ebxxqidacheyapmmzavr)** — 101 INFO lints:
  - **87 × `unindexed_foreign_keys`** [HIGH in aggregate]. Most are write-heavy audit/AI tables (`ai_tool_calls`, `ai_data_access_events`, `cost_library_item_*_history`, `collaboration_audit_events`) where missing FK indexes mainly slow cascade deletes. **Hot-path FKs that matter for reads**: `estimate_nodes_parent_id_fkey`, `estimate_nodes_tab_same_estimate_fkey`, `estimate_favorites_*`, `project_favorites_project_workspace_fkey`, `project_members_project_workspace_fkey`, `project_group_memberships_project_workspace_fkey`, `notification_deliveries_{project,estimate,workspace}_id_fkey`, `estimate_sheet_members_*`. These back the sidebar/homebase/list queries above.
  - **13 × `unused_index`** [MED — wasted write cost]. Includes `estimate_nodes_tab_parent_sort_idx`, `estimate_nodes_tab_parent_sort` never used; `project_members_workspace_user_idx`, `shared_link_recipients_token_hash_idx`, `collaboration_invitations_estimate_email_idx`, several `notification_definitions_*`. Confirm with usage before dropping (advisor is statistics-based and may reflect low traffic on a young DB).
  - **1 × `auth_db_connections_absolute`** (connection strategy) [LOW/infra].
- **RLS initplan**: 211 total `auth.uid()` occurrences; 64 wrapped as `(select auth.uid())`, ~147 unwrapped — **but most unwrapped ones live inside SECURITY DEFINER helper bodies, not policy USING/CHECK clauses**, so they don't trigger the per-row initplan re-eval. The team has actively remediated this: `20260613192344_teamspace_rls_authuid_perf.sql`, `20260613201302_rls_initplan_is_workspace_member.sql`, `20260614162000_rls_initplan_auth_uid.sql` (rewrites `is_workspace_member`, `current_project_access_rank`, `can_access_estimate`), plus `20260614144000_consolidate_low_risk_permissive_policies.sql` and the `command_split_*_public_policies` pair (multiple-permissive-policy consolidation). There is a regression harness: `scripts/prove-rls-initplan-postgres.mjs` / `npm run prove:rls-initplan` (`package.json:27`) proving the rewrite changed no access decision. [OK — but worth a fresh `prove:rls-initplan` + advisor security pass to confirm no policy added since `20260614162000` reintroduced a bare `auth.uid()` in a USING clause].

---

## Client-side aggregation that should be SQL/RPC

1. **`project-charts-repository.ts:101-128`** — per-estimate totals `.reduce` + category/supplier bucketing in JS over up to 5000 rows / 1500 nodes. The `get_project_chart_buckets` RPC is designed but not shipped. [Top push-down candidate].
2. **`workspace-repository.ts:1672` / `listProjectEstimates`** — first-node oracle still fetches all nodes for all estimates to pick one node per estimate in JS (`selectFirstEstimateNodeIds`). The summaries RPC deliberately returns `first_node_id = NULL` (`…rpc.sql:14-17`) because a flat SQL pick would mis-target links. Real but bounded; a window-function RPC honoring depth/area ordering could fold it.
3. **`estimates/actions.ts:670-719`** — descendant-node scope via full-estimate node fetch + JS BFS; belongs in `WITH RECURSIVE`.
4. **`estimates/actions.ts:600-622`** — actor-label resolution as a second `profiles` round-trip after event fetch.
5. **`component-library-repository.ts:457-461,1021-1032`** — recursive template total `.reduce` (lower priority; transform not query).

---

## Candidate indexes / RPCs / read-models (planning only — NOT applied)

**Indexes (FK-backing, read-hot first):**
- `estimate_nodes(parent_id)`, `estimate_nodes(estimate_tab_id)` — tree + tab joins.
- `project_favorites(project_id)` / verify composite `(workspace_id,user_id)` exists; `estimate_favorites(estimate_id)`, `estimate_favorites(project_id)`.
- `project_members(project_id)`, `project_group_memberships(project_id)`, `estimate_sheet_members(estimate_id)`, `estimate_sheet_members(project_id)`.
- `notification_deliveries(project_id|estimate_id|workspace_id)`.
- Defer audit/AI-table FK indexes (`ai_*`, `*_history`) unless cascade-delete latency is observed — they cost writes for little read benefit.
- Re-evaluate the 13 `unused_index` entries for DROP after confirming traffic (esp. `estimate_nodes_tab_parent_sort_idx`).

**RPCs / read-models:**
- Ship `get_project_chart_buckets` (already designed + golden-master-proven per the comment).
- `estimate_activity_node_scope` recursive-CTE RPC to replace the JS BFS.
- Fold actor labels into the activity event read (join or RPC).
- A `workspace_homebase_summary` RPC or one extra `Promise.all` wave to flatten `getWorkshopHomebaseData`'s serial tail.

**Select discipline:**
- Replace `.select("*")` on `projects` (`workspace-repository.ts:837/908`) and the component-library hot reads with explicit column lists.
- Add `.limit()` to `cost_library_items` and the audit/history queries in `loadCurrentWorkspaceComponentRowsLibrary`.

---

## Top findings (ranked)

1. **[HIGH] `loadCurrentWorkspaceComponentRowsLibrary` is unbounded + `.select("*")` on 8 tables** (`component-library-repository.ts:530-746`). No `.limit()` on `cost_library_items` or per-item history; full-row payloads. Largest single blast radius for library-heavy workspaces.
2. **[HIGH] 87 unindexed foreign keys** (Supabase advisor). Hot-path subset (estimate_nodes.parent_id, favorites, members, notification_deliveries) backs sidebar/homebase/list queries; rest slow cascade deletes.
3. **[HIGH] `getWorkshopHomebaseData` serial round-trip tail** (`workspace-repository.ts:1126-1222`) — 5–7 sequential awaits after the parallel batch, several mutually independent.
4. **[MED] Chart aggregation in JS, push-down RPC designed but never shipped** (`project-charts-repository.ts:101-128`, missing `get_project_chart_buckets`). Ships up to 5000 rows/1500 nodes per chart load.
5. **[MED] `.select("*")` on `projects` in the sidebar/list path** (`workspace-repository.ts:837/908`) + activity-history descendant full-node fetch + actor N+1 (`estimates/actions.ts:670-719,600-622`).

Counter-note: publication repo, project-charts limit discipline, the `project_estimate_list_summaries` RPC, the `cache()` usage, and the active RLS-initplan remediation are all strong — this codebase already applies most of the patterns the refactor should generalize.

---

## Open questions

- Does the production component-library list actually call `getCurrentWorkspaceComponentLibraryLite` (`:1169`) or the full `getCurrentWorkspaceComponentLibrary` (`:1146`)? Determines whether finding #1 is live. (Hand to R4/sheet + caller trace.)
- Are the 13 `unused_index` entries genuinely dead or just untouched on a young/low-traffic DB? Need a longer pg_stat_user_indexes window before dropping.
- Has any policy added after `20260614162000` reintroduced a bare `auth.uid()` in a USING/CHECK clause? Run `npm run prove:rls-initplan` + advisor security scan to confirm.
- For the estimate-tree loads (`ESTIMATE_TREE_ROW_ITEM_COLUMNS:1734`), does the sheet UI actually consume `source_snapshot` + `metadata` for all rows, or only linked rows? (Overlap with R4.)
- Cache reconciliation: which of these server reads are also cached client-side via TanStack Query, and where do `cache()`-wrapped server reads vs query keys overlap/double-fetch? (Overlap with R2.)
