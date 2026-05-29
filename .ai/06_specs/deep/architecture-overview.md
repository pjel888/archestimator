# Architecture Overview

**Last updated:** 2026-05-30
**Type:** Long-form reference (belongs in `06_specs/deep/`)

## Purpose

This document explains the high-level architecture of Archestimator — how Next.js App Router, Supabase, TanStack Query, Zustand, and the component tree compose into a working application. Read this before making cross-cutting changes.

---

## 1. Stack Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                      │
│  ┌──────────┐  ┌──────────┐  ┌─────────┐  ┌─────────┐  │
│  │  React   │  │ TanStack │  │ Zustand │  │Phosphor │  │
│  │Components│  │  Query   │  │ (UI st) │  │  Icons  │  │
│  └────┬─────┘  └────┬─────┘  └────┬────┘  └─────────┘  │
│       │              │             │                     │
├───────┼──────────────┼─────────────┼─────────────────────┤
│       │         Next.js 16 App Router                    │
│  ┌────┴──────────────────────────┐                      │
│  │     src/proxy.ts (auth gate)  │                      │
│  │  /workshop/* → require auth   │                      │
│  │  /api/* → bypass auth gate    │                      │
│  └───────────────┬───────────────┘                      │
│                  │                                       │
│  ┌───────────────┴───────────────┐                      │
│  │    Server Actions / API Routes│                      │
│  │  (src/lib/*/actions.ts,       │                      │
│  │   src/app/api/**/route.ts)    │                      │
│  └───────────────┬───────────────┘                      │
│                  │                                       │
├──────────────────┼───────────────────────────────────────┤
│                  │           Supabase                     │
│  ┌───────────────┴───────────────┐                      │
│  │   Postgres (RLS-protected)    │                      │
│  │   48 migrations applied       │                      │
│  │   Auth (Google OAuth + email) │                      │
│  │   Realtime (Presence/B'cast)  │                      │
│  │   Storage (images/attachments)│                      │
│  └───────────────────────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

## 2. Request Flow

### Protected Workshop Routes (`/workshop/*`)

```
Browser Request
  → src/proxy.ts (checks Supabase session cookie)
    → Valid session: pass through to Next.js route handler
    → No session: redirect to /login?next=<original>
  → Next.js Server Component (RSC) hydrates initial data
    → Supabase server client queries (RLS-filtered by auth.uid())
    → Returns serialized props to client
  → Client Component mounts
    → TanStack Query cache seeded from RSC props
    → UI renders from query cache
```

### Public Routes (`/`, `/share/[token]`, etc.)

```
Browser Request
  → Next.js route handler
    → No auth check (public surface)
    → Share routes: /share/[token] has optional password gate
  → Renders public content
```

### API Routes (`/api/*`)

```
Browser Request
  → src/proxy.ts (API routes bypass auth gate)
    → Auth enforced per-route internally
  → Route handler validates auth/session
    → AI routes: require real Supabase workspace session
    → Share routes: CSRF + session cookie validation
  → Performs action (read/write through Supabase)
  → Returns JSON response
```

### Server Actions (Form Submissions)

```
Browser Form Submit
  → Server Action function (src/lib/*/actions.ts)
    → Creates Supabase server client from cookies
    → Validates auth (auth.uid())
    → Validates ownership (workspace, project membership)
    → Performs mutation through RLS-protected tables or RPCs
    → Returns result or throws
  → Client receives result
    → TanStack Query cache updated optimistically or from response
```

## 3. Data Architecture

### Three-Layer Data Model

| Layer | Technology | Role |
|-------|-----------|------|
| **Persistence** | Supabase Postgres | Canonical data, RLS enforcement, audit trails |
| **Client Cache** | TanStack Query | Server-state cache, optimistic updates, deduplication |
| **UI State** | Zustand | High-frequency ephemeral state (selected node, cursor position) |

### Key Principle: State-First Persistence

After RSC hydration, the TanStack Query cache is the **live client source of truth**. Server actions validate and persist, but the UI reads from the cache:

```
RSC hydration → seeds TanStack Query cache
User interaction → optimistic cache update
Server action → validates + persists to Supabase
Server response → reconciles cache (canonical fields)
Failure → rolls back cache to previous state
```

**Anti-pattern:** Calling `revalidatePath()` or `router.refresh()` on every mutation. 

### Repository Pattern

Data access is mediated through repository functions in `src/lib/repositories/`:

```
src/lib/repositories/
├── workspace-repository.ts     → workspace, favorites, homebase data
├── estimate-repository.ts      → estimate nodes, rows, tree data
├── cost-library-repository.ts  → component library data
├── estimate-schema-compat.ts   → schema compatibility layer
```

Repositories provide typed, auth-aware data access. They use the Supabase server client (for RSC) or query functions (for client queries).

## 4. Component Architecture

### Layout Hierarchy

```
RootLayout (app/layout.tsx)
├── Providers (app/providers.tsx)
│   ├── QueryClientProvider (TanStack Query)
│   └── ThemeProvider (Tailwind)
│
├── Public Routes
│   ├── LandingPage (page.tsx)
│   │   └── Landing Components (HeroSection, etc.)
│   ├── LoginPage
│   ├── SharePage ([token]/page.tsx)
│   │   └── SharePageTabs + Share Components
│   └── InvitePage ([token]/page.tsx)
│
└── Workshop Shell (WorkshopPageShell)
    ├── MainSidebar
    ├── Workshop Content Area
    │   ├── ProjectsPage (list/create)
    │   ├── ProjectDashboardPage
    │   ├── ProjectEstimatesPage (list)
    │   ├── ProjectEstimateNodePage (workspace)
    │   │   ├── EstimateSheetTree
    │   │   ├── EstimateSheetContent
    │   │   │   └── EstimateRowItemsTable
    │   │   └── EstimateRightSidebar (component library)
    │   ├── ProjectChartsPage
    │   ├── LibraryPage
    │   ├── TemplatesPage
    │   └── SettingsPage
    └── AskFlipFooterAssistant (AI copilot)
```

### Shared UI Primitives

All repeated UI patterns MUST use components from `src/components/ui/`:

| Primitive | File | Use |
|-----------|------|-----|
| `Button`, `ButtonLink` | `button.tsx`, `button-link.tsx` | All button-like controls |
| `ControlInput`, `ControlSelect` | `control-input.tsx`, `control-select.tsx` | Form inputs/selects |
| `CreatableCombobox` | `creatable-combobox.tsx` | Searchable dropdowns with create |
| `SearchInput` | `search-input.tsx` | Search fields |
| `Badge`, `Chip` | `badge.tsx`, `chip.tsx` | Status/label elements |
| `Modal` | `modal.tsx` | Dialogs and overlays |
| `ContextMenu` | `context-menu.tsx` | Right-click actions (shadcn/Radix) |
| `ActionMenu` | `action-menu.tsx` | Reusable action menu adapter |
| `EmptyState` | `empty-state.tsx` | Zero-state displays |
| `Skeleton` | `skeleton.tsx` | Loading placeholders |
| `Toast` | `toast.tsx` | Notifications |
| `ToolbarIconButton`, `ToolbarIconSelect` | `toolbar-icon-button.tsx`, etc. | Toolbar controls |
| `ToolbarTooltip` | `toolbar-tooltip.tsx` | Toolbar tooltips |
| `HeaderIconToolbar` | `header-icon-toolbar.tsx` | Shared header toolbar layout |
| `RouteLoadingOverlay` | `route-loading-overlay.tsx` | Transition loading state |
| `Card` family | (card primitives) | Card containers |

## 5. Key Design Patterns

### Optimistic Mutation Pattern

Used for all estimate row edits (quantity, contingency, misc cost):

```typescript
// use-estimate-row-mutations.ts
const mutation = useMutation({
  mutationFn: updateEstimateRowItem,  // server action
  onMutate: async (vars) => {
    // 1. Cancel in-flight queries
    // 2. Snapshot current cache
    // 3. Optimistically update cache
    return { previousCache };  // rollback context
  },
  onError: (err, vars, context) => {
    // Rollback to previous cache snapshot
    queryClient.setQueryData(key, context.previousCache);
  },
  onSettled: () => {
    // Invalidate to ensure consistency
    queryClient.invalidateQueries({ queryKey });
  },
});
```

### History-Aware RPC Pattern

All mutations that need audit trails use Supabase RPCs with `_with_history` suffix:

```
create_estimate_node_with_history()   → writes node + estimates_sheet_events
insert_estimate_row_item_with_history() → writes row + events + revision
update_estimate_row_item_with_history() → writes update + events
delete_estimate_row_item_with_history() → writes delete + events
```

These RPCs are `SECURITY DEFINER` and revoke direct `anon`/`authenticated` table grants where audit integrity requires it.

### Signed Draft Token Pattern (AI Package Builder)

```
Client → POST /api/ai/package-builder (mode: "draft")
  → Server validates auth, builds context, generates draft
  → Server signs draft with HMAC (draftId + hash + user + workspace + expiry)
  → Returns { draft, draftHash, draftToken, productionWrite: false }

Client → POST /api/ai/package-builder (mode: "apply")
  → Server verifies draftHash + draftToken against user/workspace
  → Requires explicit confirmation flag
  → Uses idempotency key to prevent duplicate writes
  → Calls authenticated Supabase RPC
  → Returns created project/estimate/node/row IDs
```

### Two-Node Tree Model

The estimate tree uses exactly two technical node kinds:

| Kind | Role | Can contain |
|------|------|-------------|
| `group` | Organization | Other group nodes, area nodes |
| `area` | Row-owning leaf | Estimate row items only |

Domain labels (Lot, House, Floor, etc.) are user/UX content on group nodes, NOT separate technical kinds.

## 6. Route Map

### Public Routes (no auth)
| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/about`, `/features`, `/pricing`, `/contact` | Marketing pages |
| `/login` | Supabase Auth (Google + email) |
| `/auth/callback` | Auth code exchange |
| `/share/[token]` | Shared link receiver |
| `/invite/[token]` | Collaboration invite entry |
| `/privacy`, `/terms` | Pending-review legal pages |

### Protected Workshop Routes (auth required)
| Route | Purpose |
|-------|---------|
| `/workshop` | Bento-grid homebase |
| `/workshop/projects` | Project list/create |
| `/workshop/projects/[projectId]` | Project dashboard |
| `/workshop/projects/[projectId]/estimates` | Estimate list |
| `/workshop/projects/[projectId]/estimates/[nodeId]` | Estimate workspace |
| `/workshop/projects/[projectId]/charts` | Cost comparison charts |
| `/workshop/library` | Component library |
| `/workshop/templates` | Reusable templates |
| `/workshop/settings/profile` | Profile settings |
| `/workshop/settings/workspace` | Workspace settings |

### API Routes
| Route | Auth | Purpose |
|-------|------|---------|
| `/api/ai/ask` | Real Supabase session | Read-only AI copilot |
| `/api/ai/package-builder` | Real Supabase session | Package builder Draft/Apply |
| `/api/component-library/images` | Authenticated | Image upload |
| `/api/component-library/attachments` | Authenticated | Attachment upload |
| `/api/projects/images` | Authenticated | Project image upload |
| `/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx` | Authenticated | Proposal XLSX export |
| `/api/share/[token]` | Public (+ optional password) | Shared link access |
| `/api/share/[token]/comment` | CSRF + session | Client comments |
| `/api/share/[token]/decision` | CSRF + session | Client decisions |
| `/api/share/[token]/activity` | CSRF + session | Activity feed |
| `/api/share/[token]/events` | CSRF + session | Event stream |
| `/api/share/[token]/password` | CSRF | Password verification |
| `/invite/[token]/accept` | Authenticated | Accept invitation |
| `/invite/[token]/continue` | Authenticated | Continue with invite |
| `/invite/[token]/sign-out` | Authenticated | Sign out for invite |

## 7. Key Module Map

| Module | Path | Role |
|--------|------|------|
| `auth` | `src/lib/auth/` | Session management, dev auth bypass, redirects |
| `estimates` | `src/lib/estimates/` | Estimate CRUD, tree hierarchy, row mutations, activity |
| `component-library` | `src/lib/component-library/` | Library items, taxonomy, variants, brands, suppliers, templates |
| `projects` | `src/lib/projects/` | Project CRUD, metadata, project codes |
| `collaboration` | `src/lib/collaboration/` | Teamspaces, invites, presence, broadcast |
| `publication` | `src/lib/publication/` | Shared links, snapshots, tokens, security |
| `ai` | `src/lib/ai/` | Ask Flip, package builder, read context, audit |
| `proposal-export` | `src/lib/proposal-export/` | XLSX workbook generation, export model |
| `project-charts` | `src/lib/project-charts/` | Chart aggregation, types |
| `charts` | `src/lib/charts/` | Shared chart types (CostBucket, etc.) |
| `share` | `src/lib/share/` | Share page helpers, chart aggregation, tree reconstruction |
| `landing` | `src/lib/landing/` | Landing page helpers, consent, auth state |
| `domain` | `src/lib/domain/` | Domain logic (estimate totals, mutations, tree) |
| `repositories` | `src/lib/repositories/` | Data access layer (workspace, estimate, cost library) |
| `supabase` | `src/lib/supabase/` | Client/server creation, types |
| `email` | `src/lib/email/` | Resend email client |
| `ui` | `src/lib/ui/` | UI utilities (cn, tokens) |
| `workshop` | `src/lib/workshop/` | Workshop-specific actions |
| `ab-testing` | `src/lib/ab-testing/` | A/B testing utilities |
| `aec-classification` | `src/lib/aec-classification/` | Discipline classification |

## 8. Database Schema Summary

48 migrations applied to Supabase project `ebxxqidacheyapmmzavr`. Key tables:

| Table | Purpose |
|-------|---------|
| `workspaces` | Multi-tenant workspace |
| `workspace_members` | Workspace membership + roles |
| `user_onboarding_profiles` | User account details |
| `workspace_account_settings` | Workspace settings |
| `account_security_events` | Auth audit log |
| `projects` | Projects with metadata |
| `project_members` | Project-level collaboration |
| `collaboration_invitations` | Pending email invitations |
| `collaboration_invitation_tokens` | Hashed invite tokens |
| `estimates` | Estimate sheets |
| `estimate_nodes` | Tree nodes (group + area) |
| `estimate_row_items` | Line items with quantities/costs |
| `estimate_sheet_events` | Activity history |
| `estimate_sheet_versions` | Dormant named versions |
| `cost_library_items` | Component library |
| `cost_library_item_versions` | Component version history |
| `cost_library_item_price_options` | Variant pricing |
| `component_category_nodes` | V3 taxonomy |
| `component_suppliers` | Supplier organization |
| `component_brands` | Brand organization |
| `library_folders` | User-editable folders |
| `estimate_templates` | Reusable templates |
| `estimate_template_nodes` | Template structure |
| `estimate_template_row_items` | Template rows |
| `project_favorites` | User project favorites |
| `estimate_favorites` | User estimate favorites |
| `project_publications` | Shared links |
| `publication_sheets` | Published estimate scoping |
| `publication_recipients` | Recipient management |
| `publication_comments` | Client comments |
| `publication_decisions` | Client decisions |
| `publication_events` | Link event tracking |
| `ai_action_runs` | AI audit: actions |
| `ai_tool_calls` | AI audit: tool usage |
| `ai_data_access_events` | AI audit: data reads |
| `ai_package_apply_commands` | AI idempotency ledger |
| `ai_package_builder_memory` | AI ranking signals (default-off) |

All tables have RLS enabled. Browser roles (`anon`, `authenticated`) have limited grants. Sensitive mutations use `SECURITY DEFINER` RPCs.

## 9. Testing Strategy

| Layer | Tool | Location | Count |
|-------|------|----------|-------|
| Unit/Integration | Vitest | `tests/vitest/*.test.{ts,tsx}` | 100+ files |
| Browser E2E | Playwright | `e2e/*.spec.ts` | 7 files |
| Design System | Custom lint | `scripts/enforce-app-design-system.mjs` | 1 |
| Type Safety | TypeScript | `bun run type-check` | — |
| Linting | ESLint | `bun run lint` | — |

**Validation gate:** `bun run validate` (type-check + lint + design-lint + unit tests + vitest)

## 10. Key Constraints

1. **No font above 12px** in app/workshop (landing pages exempt)
2. **No non-xs border radius** in app/workshop
3. **No bold/fill icon weights** — use regular 1px outline Phosphor icons
4. **No duplicated controls** — always use/reuse `src/components/ui/` primitives
5. **No direct Supabase mutation** from client — use server actions or RPCs
6. **No `revalidatePath()` for scalar edits** — use TanStack Query cache patches
7. **No AI writes** beyond package-builder Draft/Apply contracts
8. **No Supabase/Postgres** beyond project `ebxxqidacheyapmmzavr`
9. **No merge to main** without Philip approval
