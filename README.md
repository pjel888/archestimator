# Archestimator

Contractor-first construction estimating, proposal, and collaboration workspace for teams that build itemized commercial offers. Rebuilt as a full-browser SaaS workspace from a post-reset workshop slice.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.6 (App Router, RSC) |
| UI | React 19.2.4 |
| Runtime | Bun (package manager, test runner, lockfile) |
| Language | TypeScript (strict, ES2017 target) |
| Styling | Tailwind CSS v4 (CSS-first config, no tailwind.config.ts) |
| Database | Supabase/PostgreSQL 17 (48 migrations, RLS everywhere) |
| Auth | Supabase Auth (Google OAuth, magic link, SSR helpers) |
| State | TanStack Query 5, Zustand 5 |
| Charts | D3 7 |
| Tree UI | React Complex Tree 2 |
| Icons | Phosphor Icons, Lucide (shadcn) |
| Email | Resend |
| Testing | Bun test, Vitest + jsdom, Playwright E2E |
| Linting | ESLint 9 (flat config), custom design-system linter, tsc |

## Quick start

```bash
bun install
bun run dev              # http://localhost:3000
```

Supabase local stack must be running for authenticated routes:

```bash
npx supabase start
```

## Commands

```bash
bun run type-check       # tsc --noEmit
bun run lint             # ESLint
bun run lint:design-system  # Custom design-system enforcement
bun run test             # Bun unit tests (tests/unit/)
bun run test:dom         # Vitest DOM tests (tests/vitest/)
bun run test:e2e         # Playwright E2E (Chromium)
bun run build            # Next.js production build
bun run validate         # Full gate: type-check + lint + design-system + unit + dom
```

Full pre-push validation:

```bash
bun run validate
bun run build
bun run test:e2e
```

## Project structure

```
src/
├── proxy.ts                       # Next.js middleware (auth gate, route protection)
├── app/                           # Next.js App Router
│   ├── layout.tsx                 # Root layout (fonts, metadata, providers)
│   ├── providers.tsx              # QueryClient, Toast, BFCache, perf monitoring
│   ├── page.tsx                   # Landing page (/)
│   ├── globals.css                # Design tokens, scrollbar, animations
│   ├── about/                     # About page
│   ├── features/                  # Features overview
│   ├── pricing/                   # Pricing page
│   ├── contact/                   # Contact page + form
│   ├── login/                     # Auth (Google OAuth, magic link)
│   ├── privacy/                   # Privacy placeholder
│   ├── terms/                     # Terms placeholder
│   ├── auth/callback/             # Supabase OAuth callback handler
│   ├── invite/[token]/            # Invite entry + accept/continue/sign-out routes
│   ├── share/[token]/             # Public shared link viewer
│   ├── workshop/                  # Authenticated workspace shell
│   │   ├── page.tsx               # Homebase dashboard (bento grid)
│   │   ├── onboarding/            # Redirect to settings
│   │   ├── settings/profile/      # Profile settings
│   │   ├── settings/workspace/    # Workspace/organization settings
│   │   ├── projects/              # Project list
│   │   ├── projects/[projectId]/  # Project dashboard + layout shell
│   │   │   ├── estimates/         # Estimate list
│   │   │   ├── estimates/[nodeId]/ # Estimate sheet editor (tree + grid)
│   │   │   └── charts/            # Project comparison charts (D3)
│   │   ├── library/               # Component library (cost items)
│   │   ├── templates/             # Estimate templates
│   │   └── pending-invite/        # Pending invite bridge handler
│   └── api/
│       ├── ai/ask/                # "Ask Flip" AI assistant
│       ├── ai/package-builder/    # AI package builder (draft/apply)
│       ├── component-library/attachments/  # PDF/XLS uploads
│       ├── component-library/images/       # Component images
│       ├── projects/images/                # Project cover images
│       ├── projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/  # Excel export
│       └── share/[token]/         # Publication APIs (comments, decisions, password, events)
├── components/
│   ├── ui/                        # Shared primitives (Button, Badge, Modal, Toast, etc.)
│   ├── brand/                     # ArchestimatorLogo
│   ├── charts/                    # CostDonutChart
│   ├── sidebar/                   # MainSidebar, sidebar nav items
│   ├── landing/                   # 32 landing page section components
│   ├── share/                     # Shared link viewer components
│   └── workshop/                  # 44+ core app components
│       ├── component-library/     # Component catalog (tree, cards, command palette)
│       ├── component-library-manager/  # Library management modals
│       ├── project-charts/        # D3 donut + bubble chart components
│       └── publication/           # Recipient email composer
├── hooks/                         # 8 custom hooks
│   ├── use-estimate-query.ts      # TanStack Query estimates (optimistic)
│   ├── use-estimate-row-mutations.ts  # Row CRUD with optimistic updates
│   ├── use-estimate-cursor-broadcast.ts  # Realtime cursor collaboration
│   ├── use-estimate-workspace-state.ts   # Zustand selection/expansion
│   ├── use-navigation-router.ts   # Route-loading overlay
│   ├── use-prefetch-on-hover.ts   # Link prefetch
│   ├── use-project-presence.ts    # Realtime user presence
│   └── use-shared-link-session.ts # Share link session state
├── lib/
│   ├── domain/                    # Core domain model (trees, rows, mutations, totals)
│   ├── estimates/                 # Estimate service layer (server actions, tree ops)
│   ├── repositories/              # Data access layer (estimate, library, charts, workspace)
│   ├── supabase/                  # Browser + server clients, generated types
│   ├── auth/                      # Auth gates, account management, dev bypass
│   ├── ai/                        # DeepSeek integration, ask/package-builder
│   ├── collaboration/             # Invites, access control, Realtime presence
│   ├── component-library/         # CRUD actions, taxonomy, templates
│   ├── project-charts/            # Chart aggregation
│   ├── projects/                  # Project actions, code generation
│   ├── publication/               # Share links, snapshots, security (P10 lockout)
│   ├── share/                     # Share tree reconstruction
│   ├── proposal-export/           # ExcelJS workbook builder
│   ├── aec-classification/        # AEC discipline taxonomy
│   ├── ab-testing/                # A/B experiment framework
│   ├── landing/                   # Landing auth state, consent
│   ├── email/                     # Resend client
│   ├── workshop/                  # Workshop-level actions
│   └── ui/                        # cn() helper, design tokens
└── stores/                        # Zustand stores
    ├── estimate-ui-store.ts       # Per-estimate selection, expansion
    └── navigation-ui-store.ts     # Route-loading overlay state
```

## Architecture

Archestimator follows a server-actions-first architecture with optimistic local-state mutations:

1. **Server actions** (`src/lib/*/actions.ts`) handle all writes, triggered from client components
2. **TanStack Query** caches server state with 30s staleTime, optimistic mutation rollbacks
3. **Zustand** stores high-frequency UI state (selections, expansions, loading overlays)
4. **Supabase Realtime** channels broadcast cursor positions and user presence
5. **RLS** on every user-data table enforces access at the database level

The app shell uses `WorkshopPageShell` and `PublicPageShell` React components rather than nested Next.js layouts (only `/workshop/projects/[projectId]` has a dedicated `layout.tsx` for the project sidebar + header).

## Database schema

40+ tables across 48 migrations, RLS on all user-data tables, 50+ RPC functions.

**Core hierarchy:** workspaces → projects → estimates → estimate_nodes (group/area tree) → estimate_row_items

**Component library:** cost_library_items → price_options → variant_cost_entries → variant_attachments. Supported by component_category_nodes (global taxonomy), component_suppliers, component_brands, and library_folders (workspace organization).

**Collaboration:** project_members, estimate_sheet_access_settings, estimate_sheet_members, collaboration_invitations (with hashed tokens).

**Publication:** project_publications (hashed tokens, optional passwords), shared_link_recipients, shared_link_comments, shared_link_responses, shared_link_events.

**Audit:** estimate_sheet_events (mutation history), account_security_events, ai_action_runs, ai_tool_calls, ai_data_access_events, collaboration_audit_events.

**Versioning:** estimate_sheet_versions (named snapshots), cost_library_item_versions, cost_library_item_price_history, cost_library_item_state_history.

## Key features

| Feature | Status |
|---------|--------|
| Hierarchical estimate tree (group/area nodes, drag-and-drop reorder) | Available |
| Reusable cost component library (brands, suppliers, variants, pricing, images, attachments) | Available |
| Inline sheet editing with optimistic local-state mutations | Available |
| Estimate templates | Available |
| Project comparison charts (D3 donut + bubble, grouped by space/category/supplier) | Available |
| Immutable project publication snapshots with shared links | Available |
| Shared link commenting, decisions, password protection (P10 brute-force lockout) | Available |
| Collaboration invitations (email invite, role-based access, Realtime cursors) | Available |
| AI Copilot "Ask Flip" (read-only workspace Q&A) | Available |
| AI Package Builder (draft + apply estimates from natural language) | Available |
| Excel proposal export (.xlsx workbook from estimate tree) | Available |
| Revision intelligence | Planned |
| Proposal comparisons | Planned |

## Design system

The app enforces a strict design system (enforced by `scripts/enforce-app-design-system.mjs`):

- **Font:** SF Pro, regular/medium weights only
- **Size:** 12px maximum font size in the app (landing pages exempt)
- **Radius:** xs-only (3px) border radius
- **Spacing:** zero letter-spacing
- **Palette:** Neutral (#292929 / #5D5D5D / #7F7F7F), custom surface/ink tokens
- **Icons:** Phosphor Icons (regular weight outline), Lucide via shadcn

Components grow from `src/components/ui/` shared primitives first — Button, Badge, Card, Modal, Toast, SearchInput, etc. Features must reuse these rather than creating one-off markup.

## Testing

**Vitest (jsdom):** 115 test files under `tests/vitest/`. Covers route handlers, server actions, RPC contracts, React components (RTL), schema migrations, security contracts, and AI audit trails.

**Bun test (unit):** 2 files under `tests/unit/`. Red-first migration guard + UI baseline regression that asserts exact source text presence/absence.

**Playwright E2E:** 7 spec files under `e2e/`. Landing page audit, auth smoke, tree DnD, AI package builder live, invite entry, teamspace collaboration, shared link receiver. Mutating E2E specs are gated behind environment flags and require service-role keys.

## E2E environment flags

Some mutating E2E specs require environment variables:

```bash
ARCHESTIMATOR_E2E_MUTATING_DND=1       # Tree drag-and-drop
ARCHESTIMATOR_E2E_AI_PACKAGE_BUILDER=1 # AI package builder
ARCHESTIMATOR_E2E_INVITE_ENTRY=1       # Collaboration invites
ARCHESTIMATOR_E2E_COLLABORATION=1      # Teamspace collaboration
ARCHESTIMATOR_E2E_SHARED_LINK=1        # Shared link receiver
```

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`): triggers on PRs and pushes to `main`/`feat/*`. Runs `bun install --frozen-lockfile` → `bun run validate` → `bun run build` → Playwright smoke.

## Project intelligence

Agents must read:

1. `AGENTS.md` — entry point
2. `DESIGN.md` — design philosophy
3. `.ai/10_state/current-state.md` — current project state
4. `.ai/10_state/decisions.md` — architecture decisions
5. `.ai/06_specs/` — feature specifications

GitNexus: ~9,400 symbols, ~17,400 relationships, 300 execution flows indexed.

## Local data

Tracked seed data in `data/local/seed.json`. Runtime edits written to `data/local/runtime.json` (git-ignored). Delete `runtime.json` to reset from seed. Set `ARCHESTIMATOR_DATA_PATH` to point at an alternative JSON file.

## Patch

`@firecms/neat@0.8.0` — adds `paused` property to pause/resume WebGL animation loop.
