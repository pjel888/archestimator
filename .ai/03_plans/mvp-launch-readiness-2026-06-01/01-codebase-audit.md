# 01 — Codebase Audit

**Date:** 2026-06-01
**Evidence basis:** Live repo inspection, graph tools, GitNexus, code review, test runs

## App Architecture Summary

**Stack:** Next.js 16.2.6 App Router, React 19.2.4, TypeScript (strict), Tailwind CSS v4, Bun
**Backend:** Supabase/PostgreSQL 17 (project `ebxxqidacheyapmmzavr`, 48 migrations, RLS everywhere)
**State:** TanStack Query 5 (server cache), Zustand 5 (high-frequency UI state)
**Auth:** Supabase Auth (Google OAuth primary, magic link fallback, SSR helpers, middleware session gate)
**Key packages:** React Complex Tree 2 (tree UI), D3 7 (charts), ExcelJS 4 (export), Phosphor Icons, Radix Context Menu

**Architecture pattern:** Server-actions-first with optimistic local-state mutations. Client components trigger server actions that validate and persist to Supabase via RPC functions. TanStack Query caches server state (30s staleTime). Zustand handles selections, expansions, loading overlays.

## Route Map

### Public (unauthenticated)
| Route | File | Status |
|-------|------|--------|
| `/` | `src/app/page.tsx` | Landing with A/B hero, pricing, features, FAQ |
| `/login` | `src/app/login/page.tsx` | Supabase Auth gate |
| `/auth/callback` | `src/app/auth/callback/route.ts` | OAuth callback handler |
| `/about`, `/features`, `/pricing`, `/contact` | `src/app/{route}/page.tsx` | Static marketing |
| `/terms`, `/privacy` | `src/app/{route}/page.tsx` | Pending-review status pages |
| `/share/[token]` | `src/app/share/[token]/page.tsx` | Client publication viewer |
| `/invite/[token]` | `src/app/invite/[token]/page.tsx` | Collaboration invite entry |

### Protected workshop (authenticated)
| Route | File | Status |
|-------|------|--------|
| `/workshop` | `src/app/workshop/page.tsx` | Homebase bento grid |
| `/workshop/projects` | `src/app/workshop/projects/page.tsx` | Project list with favorites |
| `/workshop/projects/[projectId]` | `src/app/workshop/projects/[projectId]/page.tsx` | Project dashboard |
| `/workshop/projects/[projectId]/estimates` | `.../estimates/page.tsx` | Estimate list |
| `/workshop/projects/[projectId]/estimates/[nodeId]` | `.../estimates/[nodeId]/page.tsx` | **Estimate workspace** |
| `/workshop/projects/[projectId]/charts` | `.../charts/page.tsx` | D3 comparison charts |
| `/workshop/library` | `src/app/workshop/library/page.tsx` | **Component library** |
| `/workshop/templates` | `src/app/workshop/templates/page.tsx` | **Templates** |
| `/workshop/settings/profile` | `src/app/workshop/settings/profile/page.tsx` | Profile settings |
| `/workshop/settings/workspace` | `src/app/workshop/settings/workspace/page.tsx` | Workspace settings |

### API routes
| Route | Method | Purpose | MVP? |
|-------|--------|---------|------|
| `/api/ai/ask` | POST | Ask Flip chat (read-only) | **Defer** |
| `/api/ai/package-builder` | POST | AI draft/apply pipeline | **Defer** |
| `/api/component-library/attachments` | POST/DELETE | Variant PDF/Excel uploads | Keep |
| `/api/component-library/images` | POST/DELETE | Component image uploads | Keep |
| `/api/projects/images` | POST/DELETE | Project cover images | Keep |
| `/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx` | GET | Excel export | **Rebuild** |
| `/api/share/[token]/*` | GET/POST/DELETE | Publication APIs | Keep as-is |
| `/api/webhooks/resend` | POST | Resend email webhook | Keep |

## Data Model Map

### Core hierarchy
```
workspaces → projects → estimates → estimate_nodes (group/area tree) → estimate_row_items
```

### Component library
```
component_category_nodes (global taxonomy, 9 top-level organizers)
  → component_suppliers (workspace-scoped)
  → component_brands (workspace-scoped)
  → library_folders (workspace-scoped, user-created)
  → cost_library_items (components with lifecycle states)
    → cost_library_item_versions
    → cost_library_item_price_options (variants with pricing, images, attachments)
      → cost_library_item_variant_cost_entries (selectable dated costs)
```

### Templates
```
estimate_templates → estimate_template_nodes → estimate_template_row_items
```

### Key row columns for MVP
`estimate_row_items`:
- `id: uuid` — PK
- `source_library_item_id: uuid?` — FK to cost_library_items, nullable
- `link_state: estimate_row_link_state` — enum: unlinked, linked-clean, linked-overridden, detached, source-changed
- `source_snapshot: jsonb` — frozen copy of library item at insert time
- `quantity: numeric`, `unit_cost: numeric`, `misc_cost: numeric`, `contingency_percentage: numeric`
- `row_revision: integer` — optimistic concurrency guard
- `material: text`, `description: text`, `unit: text`, `supplier: text`, `notes: text`

## Server Action / RPC Map

### Estimate mutations (`src/lib/estimates/actions.ts`)
- `createEstimateNode` → `create_estimate_node_with_history`
- `renameEstimateNode` → `rename_estimate_node_with_history`
- `deleteEstimateNode` → RPC cascade delete
- `reorderEstimateNodes` → `reorder_estimate_nodes`
- `insertEstimateRowItemFromLibrary` → `insert_estimate_row_item_with_history`
- `updateEstimateRowItem` → `update_estimate_row_item_with_history`
- `deleteEstimateRowItem` → `delete_estimate_row_item_with_history`
- `replaceEstimateRowItemWithLibrary` → `replace_estimate_row_item_with_history`
- `duplicateEstimateSheet` → server-side estimate/node/row copy
- `insertEstimateTemplateIntoEstimate` → `insert_estimate_template_into_estimate_with_history`

### Component library mutations (`src/lib/component-library/actions.ts`)
- `createCostLibraryComponent` → Component creation RPCs
- All RPCs use `SECURITY DEFINER`, require authenticated workspace membership

## Component Library Surface Map

- **Route:** `/workshop/library` (`src/components/workshop/LibraryPageClient.tsx`)
- **Tree:** Default (library_folders), Suppliers, Brand views via React Complex Tree
- **Center sheet:** Component rows filtered by selected folder/supplier/brand
- **Add Component modal:** Identity fields + variant tabs (SKU, unit, pricing, images, attachments)
- **Library sidebar (estimate page):** Category taxonomy tree + draggable/clickable rows in `EstimateSheetContent`
- **RLS:** authenticated workspace members can read; editors can mutate

## Templates Surface Map

- **Route:** `/workshop/templates` (`src/components/workshop/TemplatesPageClient.tsx`)
- **Data:** 3 seed templates (Condo Fit-Out, Powder Room, Roof Deck) + DB-created templates
- **Sidebar:** Templates tab on estimate page right sidebar
- **Insertion:** `insert_estimate_template_into_estimate_with_history` — copies nodes + rows atomically
- **Template source:** Immutable during insertion; row snapshots reference source template

## Estimate Editor Surface Map

- **Route:** `/workshop/projects/[projectId]/estimates/[nodeId]`
- **Left tree:** `EstimateSheetTree` — React Complex Tree, DnD reorder, inline rename, context menu
- **Center grid:** `EstimateSheetContent` — spreadsheet-like rows, inline quantity/contingency/miscCost editing
- **Right sidebar:** Component library with Categories, Suppliers, Brand trees + Templates tab
- **Row details modal:** Details/Component/Activity tabs (read-only currently)
- **State:** TanStack Query `estimateQueryKeys.areaTree(estimateId)` + Zustand per-estimate selection

## Export Surface Map

- **API:** `GET /api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx`
- **Engine:** `src/lib/proposal-export/build-proposal-export-model.ts` (flatten tree, consolidate rows, compute totals)
- **Workbook:** `src/lib/proposal-export/create-proposal-workbook.ts` (ExcelJS, 3 sheets)
- **Preview dialog:** `ProposalExportPreviewDialog`
- **Current state:** Generic data dump. No material/labor split (labor always 0). No industry bid form sections. No formula-driven subtotals. No exclusions/terms/warranty blocks.

## Auth / RLS / Security Notes

- **Middleware:** `src/proxy.ts` — session refresh, route gating for `/workshop/*`
- **RLS:** Every user-data table has RLS enabled with policies for workspace membership
- **Dev bypass:** `ARCHESTIMATOR_DEV_AUTH_BYPASS=1` (localhost only, NODE_ENV ≠ production)
- **AI routes internally auth-gated:** Reject dev-admin bypass
- **Invite entry:** Feature-flagged (`PROJECT_INVITE_ENTRY_ENABLED`), requires pepper
- **Rate limiting:** Durable `security_rate_limit_events` for share/invite routes

## Test Coverage Map

| Category | Count | Status |
|----------|-------|--------|
| Vitest DOM tests | 122 files, 989 tests | 2 failing (pre-existing, shared-link session) |
| Bun unit tests | 2 files, 4 tests | All passing |
| Playwright E2E | 7 spec files | Gated on env flags, not run |
| Design-system lint | 1 enforcement script | 0 violations |
| ESLint | 1 flat config | 0 errors, 14 warnings |

**Test gap areas:** No E2E for estimate-templates-export workflow. No tests for component unlink. No tests for export workbook structure. AI package builder live smoke gated on env flags with DEEPSEEK_API_KEY.

## Known Stale / Contradictory Docs

- `.ai/03_plans/current-post-reset-workshop-slice.md` — superseded, moved to archive
- `.ai/01_roadmap/README.md` — references pre-shared-link-overhaul state
- Some `.ai/09_archive/store/` folders reference features now implemented since archiving
- `DESIGN.md` — current and authoritative for app/workshop UI
- `src/lib/component-library/estimate-templates.ts` — hardcoded seed data, may need refresh

## Validation Baseline Results (2026-06-01)

| Command | Result |
|---------|--------|
| `bun install --frozen-lockfile` | ✅ Passed (no changes, 703 packages) |
| `bun run type-check` | ✅ Passed (0 errors) |
| `bun run lint` | ✅ Passed (0 errors, 14 warnings) |
| `bun run lint:design-system` | ✅ Passed (0 violations) |
| `bun run test` | ✅ Passed (4 tests, 2 files) |
| `bun run test:dom` | ⚠️ 2 files failing (3 tests, pre-existing shared-link session issue) |
| `bun run build` | ✅ Passed (all routes built) |
| `bun run test:e2e` | ❌ Not run (requires env flags, DEEPSEEK_API_KEY, service-role key) |
