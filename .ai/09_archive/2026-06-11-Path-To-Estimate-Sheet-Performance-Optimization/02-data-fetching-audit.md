# 02 — Data Fetching Audit

**Date**: 2026-06-11 | **Status**: Source-audited; runtime measurement pending | **Prior Oracle**: 6 passes | **Last Update**: 2026-06-11 02:42 UTC
**Path**: `/workshop/projects/[projectId]/estimates/[nodeId]`

---

---

## Key Takeaways

1. **17 path-relevant `select('*')` queries, 48 across current `src`** — the single highest-ROI fix. Replace with explicit columns (see R2 in [06-prioritized-recommendations.md](./06-prioritized-recommendations.md)).
2. **Sequential waterfall is structural** — `getCurrentWorkspaceProject` blocks `Promise.all` of collaboration + publication + estimates. Cannot be parallelized without refactoring `ensureDefaultWorkspace()`.
3. **Component library is the largest eager-load** — 14 sub-queries on every page load, even when sidebar is closed. Lazy-load (R4) saves 8+ queries.
4. **3 realtime channels active** — cursor broadcast triggers re-renders at 80ms. Cursor overlay should be isolated from sheet state.
5. **No lazy/session cache for component library data yet** — component library data changes infrequently but is fetched fresh during initial sheet render. Prefer lazy load plus client/session cache before any remote/CDN cache decision.

---

## 1. Complete Data Fetching Waterfall

```
Request enters proxy.ts
  │
  ├─[Proxy] supabase.auth.getUser()                    ≈50-150ms
  │
  ├─[WorkshopLayout] getCurrentUserContext()                ≈30-80ms
  │   ├── supabase.auth.getUser()
  │   ├── closed_beta_users.select("status")
  │   ├── profiles.select("*")
  │   └── [RPC] ensure_current_user_profile
  │
  ├─[WorkshopLayout] getCurrentUserTermsAcceptanceStatus()  ≈10-30ms
  │   └── legal_terms_acceptances.select(...).maybeSingle()
  │
  ├─[ProjectLayout] getCurrentWorkspaceProject(projectId)   ≈30-60ms
  │   ├── [cache()] ensureCurrentWorkspace()
  │   │   ├── requireCurrentUserContext() [MEMOIZED]
  │   │   ├── workspaces.select("*").eq("created_by")
  │   │   └── [conditional] workspaces.insert(...)
  │   └── projects.select("*").eq("id", projectId)
  │
  ├─[ProjectLayout] Promise.all([                            ≈60-150ms
  │   ├── getProjectCollaborationSummary(projectId)
  │   │   ├── projects.select("id, workspace_id")
  │   │   ├── workspace_members.select(...)
  │   │   ├── estimates.select("id, project_id, name, ...")
  │   │   ├── project_members.select(...)
  │   │   ├── estimate_sheet_members.select(...)
  │   │   ├── estimate_sheet_access_settings.select(...)
  │   │   ├── collaboration_invitations.select(...)
  │   │   └── profiles.select("id, display_name, ...")
  │   │
  │   ├── getProjectPublicationSummary(projectId)
  │   │   ├── workspace_members.select("role")
  │   │   ├── project_publications.select(...).limit(1)
  │   │   ├── estimates.select("updated_at").limit(1)
  │   │   └── shared_link_recipients.select(...).limit(1)
  │   │
  │   └── listProjectEstimateSheets(projectId)
  │       └── estimates.select("id, name, sheet_code")
  │ ])
  │
  └─[EstimatePage] getProjectEstimateTreeByNode(             ≈40-100ms
       projectId, nodeId)
       ├── estimate_nodes.select("*, estimates!inner(*)")
       ├── [if found] estimate_nodes.select("*")
       ├── [if found] estimate_row_items.select("*")
       └── [if NOT found] getProjectEstimateTreeByEstimate()
           ├── estimates.select("*")
           ├── estimate_nodes.select("*")
           └── estimate_row_items.select("*")
    )

  └─[EstimatePage] getCurrentWorkspaceComponentLibrary()     ≈80-200ms
       ├── component_category_nodes.select("*")
       ├── component_suppliers.select("id, name, ...")
       ├── component_brands.select("id, name, ...")
       ├── cost_library_items.select("*")
       ├── library_folders.select("id, workspace_id, ...")
       ├── [if items exist] cost_library_item_price_options
       ├── [if items exist] cost_library_item_versions
       ├── [if items exist] cost_library_item_price_history
       ├── [if items exist] cost_library_item_state_history
       ├── [if items exist] cost_library_item_variant_cost...
       ├── [if items exist] cost_library_item_variant_attach...
       └── loadCurrentWorkspaceEstimateTemplates()
           ├── estimate_templates.select("*")
           ├── estimate_template_nodes.select("*")
           └── estimate_template_row_items.select("*")
    )
```

**Total estimated TTFB**: 300-750ms (depending on data size and network latency)

---

## 2. Over-Fetching: `select('*')` Audit

Every `select('*')` found in the rendering path. All of these fetch unnecessary columns, especially large JSONB fields:

| # | File | Line (approx) | Table | Problem |
|---|------|--------------|-------|---------|
| 1 | `src/lib/auth/session.ts` | 54 | `profiles` | `select("*")` — fetches `avatar_url`, `metadata` JSONB unnecessarily |
| 2 | `src/lib/repositories/workspace-repository.ts` | 1094 | `workspaces` | `select("*")` — fetches all workspace metadata |
| 3 | `src/lib/repositories/workspace-repository.ts` | 1083 | `projects` | `select("*")` — fetches large `metadata` JSONB |
| 4 | `src/lib/repositories/workspace-repository.ts` | 1640 | `estimate_nodes` | `select("*, estimates!inner(*)")` — nested star fetch |
| 5 | `src/lib/repositories/workspace-repository.ts` | 1651 | `estimate_nodes` | `select("*")` — fetches `metadata` JSONB on all nodes |
| 6 | `src/lib/repositories/workspace-repository.ts` | 1652 | `estimate_row_items` | `select("*")` — fetches `source_snapshot` JSONB, `metadata` JSONB |
| 7 | `src/lib/repositories/component-library-repository.ts` | 516 | `component_category_nodes` | `select("*")` |
| 8 | `src/lib/repositories/component-library-repository.ts` | 529 | `cost_library_items` | `select("*")` — fetches `metadata` JSONB |
| 9 | `src/lib/repositories/component-library-repository.ts` | 568 | `cost_library_item_price_options` | `select("*")` |
| 10 | `src/lib/repositories/component-library-repository.ts` | 576 | `cost_library_item_versions` | `select("*")` |
| 11 | `src/lib/repositories/component-library-repository.ts` | 582 | `cost_library_item_price_history` | `select("*")` |
| 12 | `src/lib/repositories/component-library-repository.ts` | 588 | `cost_library_item_state_history` | `select("*")` |
| 13 | `src/lib/repositories/component-library-repository.ts` | 594 | `cost_library_item_variant_cost_entries` | `select("*")` |
| 14 | `src/lib/repositories/component-library-repository.ts` | 603 | `cost_library_item_variant_attachments` | `select("*")` |
| 15 | `src/lib/repositories/component-library-repository.ts` | 709 | `estimate_templates` | `select("*")` |
| 16 | `src/lib/repositories/component-library-repository.ts` | 724 | `estimate_template_nodes` | `select("*")` |
| 17 | `src/lib/repositories/component-library-repository.ts` | 729 | `estimate_template_row_items` | `select("*")` |

**Measured `select('*')` instances**: Counted via `rg -n '\.select\("\*"\)'`. Current worktree results: 15 in `workspace-repository.ts`, 11 in `component-library-repository.ts`, 29 across repository files, **48 across all `src`**. The 17 documented below are those specifically in the rendering path for the estimate sheet page.

**Estimated waste** (unmeasured — based on typical JSONB sizes): `metadata` columns average 1-5KB, `source_snapshot` averages 1-10KB per row. With 17 path-relevant queries fetching unnecessary columns, the estimated payload overhead is 50-300KB per page load. **Actual measurement needed** — run `ANALYZE=true bun run build` and measure network tab payload sizes.

---

## 3. N+1 / Batched Query Patterns

### Acceptable (batched with `.in()`)
| Query | Batched By | Concern |
|-------|-----------|---------|
| `cost_library_item_price_options` → `.in("item_id", itemIds)` | Item IDs | OK for small libraries (<100 items). Problematic at scale. |
| `cost_library_item_versions` → `.in("item_id", itemIds)` | Item IDs | 6 parallel `.in()` queries on same itemIds — could be a single JOIN |
| `estimate_sheet_members` → `.in("estimate_id", estimateIds)` | Estimate IDs | OK |
| `estimate_template_nodes` → `.in("template_id", templateIds)` | Template IDs | OK for small template counts |

### Problematic (potential N+1 hidden in code)
- `loadCurrentWorkspaceEstimateTemplates()` — fetches templates, then template nodes, then template row items in 3 sequential queries
- 6 cost library sub-queries (price options, versions, price history, state history, cost entries, attachments) — all use same `itemIds`, could be a single query with JOINs

---

## 4. Realtime Subscriptions

| Subscription | File | Channel | Table(s) | Frequency |
|-------------|------|---------|----------|-----------|
| Cursor collaboration | `use-estimate-cursor-broadcast.ts:78` | `estimate:${estimateId}` | Broadcast | ~12.5/sec (80ms throttle) |
| Project presence | `use-project-presence.ts:51` | `project:${projectId}` | Presence | On join/leave only |
| Shared link activity | `SharedLinkActivityFeed.tsx:79` | `shared-link-activity-${publicationId}` | `shared_link_comments`, `shared_link_responses`, `shared_link_events` | On postgres_changes |

**Total active channels on estimate sheet page**: 3

---

## 5. Client-Side Data Fetching

| Hook/Component | Data | Strategy |
|---------------|------|----------|
| `useEstimateAreaTreeQuery` | Estimate tree nodes | TanStack Query — initialized from server props, refetches on invalidation |
| `SharedLinkActivityFeed` (owner) | Shared link activity | Server action `loadSharedLinkActivity()` with cursor pagination |
| `SharedLinkActivityFeed` (public) | Public activity feed | `fetch(/api/share/[token]/activity)` |
| `RowDetailsModal` Activity tab | Row version history | Server action `fetchEstimateSheetVersionControl({ scope: "row" })` |

---

## 6. Caching Analysis

| Mechanism | Where | What |
|-----------|-------|------|
| React `cache()` | `getCurrentUserContext` | Memoizes user context per request |
| React `cache()` | `getCurrentWorkspaceProject` | Memoizes project per request |
| TanStack Query | `useEstimateAreaTreeQuery` | Client-side cache for estimate tree |
| Proxy headers | `src/proxy.ts` | `no-store` on protected routes, `no-cache` on marketing |
| Route handler | `/api/share/[token]` | `Cache-Control: no-store`, `dynamic = "force-dynamic"` |
| Route handler | `/api/projects/images` | `Cache-Control: private, max-age=300` |

**Missing caching opportunities**:
- No lazy/session cache for component library data yet. Remote cache or `stale-while-revalidate` must pass the package/cache decision matrix first because the data is workspace-scoped.
- No request-level deduplication for duplicate Supabase queries across layouts
- No `unstable_cache` or `cacheTag` usage for component library data

---

## 7. API Routes Along the Path

| Route | Method | Caching | Notes |
|-------|--------|---------|-------|
| `/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx` | GET | `force-dynamic` | Excel export — loads entire estimate tree, ExcelJS runs on server |
| `/api/share/[token]/activity` | GET | `no-store` | Public shared link activity feed |
| `/api/projects/images` | GET | `max-age=300` | Project cover images |

---

## 8. Server Actions (Mutations)

20+ server actions used by components in this path. All are write operations triggered by user interaction (not loaded on initial render). Key actions:

- `createEstimateNode`, `deleteEstimateNode`, `renameEstimateNode` — Tree manipulation
- `updateEstimateRowItem`, `deleteEstimateRowItem` — Row item editing
- `insertEstimateRowItemFromLibrary`, `replaceEstimateRowItemWithLibrary` — Library integration
- `createProjectPublication`, `revokeProjectPublication` — Sharing
- `inviteProjectCollaborator`, `removeProjectCollaborator` — Collaboration

All server actions use `requireCurrentUserContext()` for auth — no additional overhead beyond user context lookup (already cached via `cache()`).
