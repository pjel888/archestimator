# Archestimator

**Your cost intelligence layer.** The more you estimate, the more it knows your clients, your project types, and your prices, so every new proposal starts ahead.

_A construction cost estimating platform — a cost proposal workspace for teams that build, send, revise, approve, and track commercial estimates._

> **From cost proposal to client approval.**

## What Archestimator is

Estimates contain reusable commercial knowledge: supplier choices, product assumptions, pricing logic, proposal revisions, and client decisions. Today, for most AEC teams, that intelligence dies inside spreadsheets.

Archestimator turns it into reusable commercial infrastructure.

**Brand promise:** _You never start from zero again. Your numbers hold up._

## Who it is for

Archestimator is AEC-committed. It serves the people who build and approve cost estimates and cost proposals across a project:

- **Builders of estimates:** architects, engineers, contractors, cost estimators / quantity surveyors, specialty and fit-out firms, interior designers, and suppliers.
- **Approvers of proposals:** clients, project owners, developers, project managers, and procurement.

Primary market is the Philippines and Southeast Asia, where these teams still run on spreadsheets and enterprise tools do not reach.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.6 (App Router, RSC) |
| UI | React 19.2.6 |
| Runtime | Bun (package manager, test runner, lockfile) |
| Language | TypeScript (strict, ES2017 target) |
| Styling | Tailwind CSS v4 (CSS-first config, no tailwind.config.ts) |
| Deploy | OpenNext for Cloudflare Workers (`@opennextjs/cloudflare` ^1.20.1), Wrangler ^4.105.0, Worker `archestimator-proof`, custom domain `archestimator.com` |
| Database | Cloudflare D1 (`ARCH_DB`, database `archestimator-proof-db`, 29 migrations in `./migrations/`) |
| Storage | Cloudflare R2 (`ARCH_UPLOADS_R2`, bucket `archestimator-proof-uploads`) |
| Realtime | Cloudflare Durable Objects (`COLLAB_ROOMS`, class `CollaborationRoom`, SQLite-backed) |
| Background jobs | Cloudflare Queues (`UPLOAD_JOBS_QUEUE` + DLQ) + Cron (`0 3 * * *`, `15 3 * * *`) |
| Auth | Better Auth 1.6.22 (Google OAuth + magic link, D1-backed, mounted at `/api/auth/[...all]`) |
| Email | Cloudflare Email Service (`EMAIL` binding, replaces Resend) |
| Images | Cloudflare Images (`IMAGES` binding) |
| State | TanStack Query 5, Zustand 5 |
| Charts | D3 7 |
| Tree UI | React Complex Tree 2 |
| Icons | Phosphor Icons, Lucide (shadcn) |
| Testing | Bun test, Vitest + jsdom, Playwright E2E |
| Linting | ESLint 9 (flat config), custom design-system linter, tsc |

> **Migration status:** Cloudflare migration is complete. `package.json` contains zero `@supabase/*` packages. Legacy Supabase migrations in `./supabase/migrations/` (182 files) are retained only as migration archaeology — do not run or extend them. Supabase project `ebxxqidacheyapmmzavr` is historical provider-exit evidence only.

## Quick start

```bash
bun install
bun run dev              # http://localhost:3000 (Next.js dev server)
```

For local D1 + Worker-parity preview against the OpenNext Cloudflare build:

```bash
bun run cf:preview       # opennextjs-cloudflare build + wrangler preview
bun run cf:typegen       # regenerate cloudflare-env.d.ts from wrangler.jsonc
```

Local Cloudflare bindings are defined in `wrangler.jsonc`. Apply new D1 migrations to the local preview DB with `wrangler d1 migrations apply ARCH_DB --local`.

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

Cloudflare / Worker / D1 operations (50+ `cf:*` scripts in `package.json`):

```bash
bun run cf:build                           # opennextjs-cloudflare build
bun run cf:preview                         # build + wrangler preview (local bindings)
bun run cf:deploy                          # build + wrangler deploy to archestimator-proof
bun run cf:typegen                         # regenerate cloudflare-env.d.ts
bun run cf:check-readiness                 # Worker readiness gate
bun run cf:check-provider                  # Cloudflare provider readiness
bun run cf:check-email                     # Cloudflare Email readiness
bun run cf:check-dns-delegation            # archestimator.com DNS gate
bun run cf:queues-cron-proof               # Queue + cron proof
bun run cf:better-auth-proof               # Better Auth on D1 proof
bun run cf:d1-runtime-proof                # D1 runtime performance proof
bun run cf:d1-restore-rehearsal            # D1 restore dry-run (cheaper recovery path)
bun run cf:provider-exit-pack              # legacy provider-exit evidence pack
bun run cf:release-gates                   # release-gate suite
bun run cf:inventory                       # Cloudflare migration inventory
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
├── middleware.ts                   # Next.js middleware re-exporting Better Auth route gate (proxy) from @/lib/auth/request-proxy
├── app/                           # Next.js App Router
│   ├── layout.tsx                 # Root layout (fonts, metadata, providers)
│   ├── providers.tsx              # QueryClient, Toast, BFCache, perf monitoring
│   ├── page.tsx                   # Landing page (/)
│   ├── globals.css                # Design tokens, scrollbar, animations
│   ├── about/                     # About page
│   ├── features/                  # Features overview
│   ├── pricing/                   # Pricing page
│   ├── contact/                   # Contact page + form
│   ├── login/                     # Auth (Better Auth Google OAuth + magic link)
│   ├── privacy/                   # Privacy placeholder
│   ├── terms/                     # Terms placeholder
│   ├── auth/callback/             # Legacy Supabase OAuth callback (migration archaeology; Better Auth handler lives at /api/auth/[...all])
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
│       ├── auth/[...all]/         # Better Auth route handler (Google OAuth + magic link, D1-backed)
│       ├── ai/ask/                # "Ask Flip" AI assistant (deferred; hidden unless enabled)
│       ├── ai/package-builder/    # AI package builder (deferred; hidden unless enabled)
│       ├── component-library/attachments/  # PDF/XLS uploads → R2
│       ├── component-library/images/       # Component images → Cloudflare Images / R2
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
│   ├── use-estimate-cursor-broadcast.ts  # Realtime cursor collaboration (Durable Objects)
│   ├── use-estimate-workspace-state.ts   # Zustand selection/expansion
│   ├── use-navigation-router.ts   # Route-loading overlay
│   ├── use-prefetch-on-hover.ts   # Link prefetch
│   ├── use-project-presence.ts    # Realtime user presence (Durable Objects)
│   └── use-shared-link-session.ts # Share link session state
├── lib/
│   ├── domain/                    # Core domain model (trees, rows, mutations, totals)
│   ├── estimates/                 # Estimate service layer (server actions, tree ops)
│   ├── repositories/              # D1 data-access layer (estimate, library, charts, workspace)
│   ├── auth/                      # Better Auth (better-auth-cloudflare.ts, request-proxy.ts, account-actions, account-audit-d1-store, account-settings-d1-store, closed-beta-d1-store, dev-auth)
│   ├── supabase/                  # Historical/migration-archaeology clients and generated types (not active runtime)
│   ├── ai/                        # DeepSeek integration, ask/package-builder (deferred)
│   ├── collaboration/             # Invites, access control, Durable Object presence
│   ├── component-library/         # CRUD actions, taxonomy, templates
│   ├── project-charts/            # Chart aggregation
│   ├── projects/                  # Project actions, code generation
│   ├── publication/               # Share links, snapshots, security (P10 lockout)
│   ├── share/                     # Share tree reconstruction
│   ├── proposal-export/           # ExcelJS workbook builder
│   ├── aec-classification/        # AEC discipline taxonomy
│   ├── ab-testing/                # A/B experiment framework
│   ├── landing/                   # Landing auth state, consent
│   ├── email/                     # Cloudflare Email client (cloudflare-email-client.ts, transactional-email-client.ts)
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
4. **Cloudflare Durable Objects** (`COLLAB_ROOMS`) broadcast cursor positions and user presence via WebSocket
5. **App-layer authorization** enforces access on every data path. D1 has no Postgres RLS, so authorization is enforced in repositories, Server Actions, and the Better Auth route gate (`src/lib/auth/request-proxy.ts` exported via `src/middleware.ts`) — fail-closed by default

The app shell uses `WorkshopPageShell` and `PublicPageShell` React components rather than nested Next.js layouts (only `/workshop/projects/[projectId]` has a dedicated `layout.tsx` for the project sidebar + header).

## Database schema

Tables spread across 29 D1 migrations in `./migrations/` (latest `0029_estimate_actions_d1_support.sql`), with app-layer authorization enforced on all data access (no RLS — D1 is not Postgres). 50+ RPC-style queries are scoped via repository helpers under `src/lib/repositories/`.

**Core hierarchy:** workspaces → projects → estimates → estimate_nodes (group/area tree) → estimate_row_items

**Component library:** cost_library_items → price_options → variant_cost_entries → variant_attachments. Supported by component_category_nodes (global taxonomy), component_suppliers, component_brands, and library_folders (workspace organization).

**Collaboration:** project_members, estimate_sheet_access_settings, estimate_sheet_members, collaboration_invitations (with hashed tokens).

**Publication:** project_publications (hashed tokens, optional passwords), shared_link_recipients, shared_link_comments, shared_link_responses, shared_link_events.

**Audit:** estimate_sheet_events (mutation history), account_security_events, ai_action_runs, ai_tool_calls, ai_data_access_events, collaboration_audit_events.

**Versioning:** estimate_sheet_versions (named snapshots), cost_library_item_versions, cost_library_item_price_history, cost_library_item_state_history.

Legacy Supabase schema (40+ tables, 182 migration files, 50+ RPC functions, RLS) is preserved as migration archaeology in `./supabase/migrations/` and is no longer authoritative.

## Key features

| Feature | Status |
|---------|--------|
| Hierarchical estimate tree (group/area nodes, drag-and-drop reorder) | Live |
| Reusable cost component library (brands, suppliers, variants, pricing, images, attachments) | Live |
| Inline sheet editing with optimistic local-state mutations | Live |
| Estimate templates | Live |
| Project comparison charts (D3 donut + bubble, grouped by space/category/supplier) | Live |
| Shared proposal snapshots (publication links with comments, decisions, password protection) | Live |
| Collaboration invitations (email invite, role-based access, Realtime cursors) | Live |
| Activity + Node Activity + row version history | Live |
| Excel proposal export (.xlsx workbook from estimate tree) | Live |
| Proposal snapshots / issued export policy | Partial / planned |
| Archiving and trash | Planned |
| Proposal open tracking | Planned |
| Beta onboarding flow | Planned |
| Revision intelligence | Planned |
| Proposal comparisons | Planned |
| Surfacing accumulated cost intelligence by client, project type, and supplier | Planned |
| AI Copilot "Ask Flip" | Deferred to roadmap; hidden unless `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED=true` |
| AI Package Builder (draft + apply estimates from natural language) | Deferred to roadmap; hidden unless `ARCHESTIMATOR_AI_ENABLED=true` |

### Claims discipline

- Exports are **working documents**, not immutable issued records, legal documents, or purchase orders. The immutable/issued-record policy is a future decision.
- AI is **not a launch capability**. It remains on the roadmap and, when it ships, will enter at Pro and up.
- The cost intelligence layer is the direction; the Live foundation (reusable library, structured estimates, version/Activity history, proposal handoff) is the proof.

## Business model

**Proposer-side SaaS wedge** today: architects, engineers, contractors, estimators, specialty/fit-out firms, interior designers, and suppliers pay for estimate creation, reusable components, proposal sharing, comments, approvals, and version/Activity history.

**Future layers:** client-side proposal-record subscriptions, enterprise portfolio plans, supplier catalogs and quote-request fees, and transaction-linked revenue.

**Pricing:** exploratory hypothesis. The working plan is freemium, seat-based, priced in pesos, with a Solo tier anchored at ₱239/month (the "cement anchor"). Prices are pre-publication hypotheses to validate; do not treat them as final.

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

**Playwright E2E:** 7 spec files under `e2e/`. Landing page audit, auth smoke, tree DnD, AI package builder live, invite entry, teamspace collaboration, shared link receiver. Mutating E2E specs are gated behind environment flags and require D1/Worker-parity local bindings (`bun run cf:preview`) or operator-scoped service credentials.

## E2E environment flags

Some mutating E2E specs require environment variables:

```bash
ARCHESTIMATOR_E2E_MUTATING_DND=1       # Tree drag-and-drop
ARCHESTIMATOR_E2E_AI_PACKAGE_BUILDER=1 # AI package builder (deferred feature)
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
