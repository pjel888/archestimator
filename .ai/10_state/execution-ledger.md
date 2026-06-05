# Execution Ledger

## 2026-05-17 — Reset cleanup after rejected prototype

**Type:** destructive pre-MVP cleanup, docs rebaseline, validation

**Decision context:** OWNER_NAME_PLACEHOLDER stated the current Archestimator UI/UX is badly wrong and the best path is to start over. Only the landing page should remain acceptable. `/workshop` should become an empty page.

**Actions:**

- Wrote reset audit: `.ai/02_audits/2026-05-17-reset-cleanup-audit.md`.
- Wrote restart guardrails: `.ai/06_specs/restart-guardrails.md`.
- Updated current-state, known-issues, decisions, roadmap, validation, source-of-truth, plans, and task docs to prevent future agents from resuming the rejected prototype.
- Deleted all app routes except `/` and `/workshop`.
- Replaced `/workshop` with an intentionally empty page.
- Removed old app/project/estimate/proposal/component-library UI and local-first data implementation files.
- Removed obsolete route/feature tests and replaced them with reset-baseline tests.
- Pruned unused product-prototype dependencies from `package.json`/`bun.lock`.

**Validation:**

```bash
bun run validate
bun run build
git diff --check
```

Initial `bun run validate` failed because stale `.next/types/validator.ts` referenced deleted routes. The fix was to remove `.next` and `tsconfig.tsbuildinfo`, then rerun validation.

Latest results:

- `bun run validate` passed.
- `bun run build` passed; route list is `/`, `/_not-found`, `/workshop`.
- `git diff --check` passed.

**Remaining risk:** Historical `.ai` plans/specs still contain old prototype details for context. Current reset docs supersede them.

## 2026-05-18 — Supabase/Postgres Foundation

**Type:** architecture decision, schema migration, auth setup

**Decision context:** OWNER_NAME_PLACEHOLDER approved Supabase/Postgres as the canonical data layer. Archestimator's own Supabase project `ebxxqidacheyapmmzavr` linked. RLS, migrations, and auth activated.

**Deliverables:**
- Initial schema foundation (workspaces, projects, estimates, cost library, estimate nodes, estimate row items)
- Supabase Auth with Google OAuth primary + email sign-in link fallback
- Route protection via `src/proxy.ts`
- CEO/profile role bootstrap
- Local dev auth bypass for agent inspection

## 2026-05-19 — Live Project & Estimate Bootstrap (Phase 2)

**Type:** implementation

**Deliverables:**
- `/workshop/projects` — live project list/create with Supabase
- `/workshop/projects/[projectId]` — project dashboard
- `/workshop/projects/[projectId]/estimates` — estimate list/create
- `/workshop/projects/[projectId]/estimates/[nodeId]` — estimate workspace
- DEMO_PROJECT_PLACEHOLDER deterministic demo seed
- Two-node estimate tree model (Group + Area)

## 2026-05-21 — Estimate Tree DnD & shadcn Integration (Phase 3 partial)

**Type:** implementation

**Deliverables:**
- React Complex Tree drag/drop reorder
- shadcn/Radix Context Menu (Rename/Delete)
- Two-node hierarchy enforcement (Group/Area only)
- State-first persistence contract

## 2026-05-22–24 — Component Library & Activity History (Phases 3–4)

**Type:** implementation

**Deliverables:**
- `/workshop/library` — component library workspace
- `/workshop/templates` — reusable template workspace
- Add Component modal with variants, brands, suppliers, cost entries
- Component versioning, lifecycle states, image/attachment upload
- V3 component taxonomy (9 organizer categories)
- Activity History modal (unified sheet/node/row activity)
- Row revision protection, contingency/discount support

## 2026-05-23–25 — Charts, Proposal Export, Template Insertion (Phases 4–5)

**Type:** implementation

**Deliverables:**
- `/workshop/projects/[projectId]/charts` — D3 donut/bubble charts
- Proposal XLSX export (mutable current-estimate only)
- DEMO_PROJECT_PLACEHOLDER chart demo seed (83 library items, 83 rows)
- Template insertion into estimates

## 2026-05-26 — Teamspaces Collaboration

**Type:** implementation

**Deliverables:**
- Project-scoped collaboration with email invites
- App-owned `/invite/[token]` invite entry
- Signed pending-invite bridge cookies
- Realtime Presence (project) + Broadcast (estimate cursor)
- `/workshop` bento-grid homebase with favorites

## 2026-05-27 — Project Client Publication V1 + Invite Entry

**Type:** implementation

**Deliverables:**
- V1 "Public link" controls + `/share/[token]` receiver
- Token-scoped view-only snapshots with optional password
- Invite entry browser E2E passed against linked Supabase
- Shared/owned project labeling on `/workshop/projects`

## 2026-05-28 — Shared Link Overhaul V2 (Phase 5A, P0–P14)

**Type:** implementation (autopilot, Ralph Loop)

**Deliverables:**
- "Shared link" terminology standardization
- Tabbed manager (Link/Sheets/Access/Recipients/Activity)
- Recipient management + Resend email delivery
- Session security, client comments, accept/reject/revise decisions
- Owner activity feed + rate-limited digests + badge
- Visual polish + hero images + responsive
- Password hardening + progressive lockout + attempt audit
- CSP/headers, error handling + retry + circuits + logging
- Full testing (focused vitest + sims for E2E/pen/load)

## 2026-05-23–28 — AI Copilot (Phase 6)

**Type:** implementation

**Deliverables:**
- Ask Flip global copilot (`/api/ai/ask` + `/api/ai/package-builder`)
- Account-aware read-only Ask for authenticated workspace users
- Package-builder Draft/Apply with signed tokens, explicit confirmation, idempotency
- `fill_current_estimate` target-aware drafts
- Current-route update/replace/delete/rename/template-insert Apply
- Component-library create Apply
- Metadata-only AI audit foundation
- Default-off package-builder memory ranking hints
- Gated live browser/auth/database E2E smoke

## 2026-05-29 — Share Page Estimate View Enhancement (Phase 5A post-P14)

**Type:** implementation (Ralph Loop)

**Deliverables:**
- Per-sheet D3 donut chart (discipline aggregation)
- Tree View | Grid Preview sub-tabs with keyboard isolation
- Designation-based Tree View via WorkshopTree<TNode> reuse
- Floating navigation tree with scroll + IntersectionObserver
- Shared CostDonutChart extraction

## 2026-05-29 — Publication Modal Redesign & Project Creation UX

**Type:** implementation

**Deliverables:**
- Full-height sidebar grid layout for Shared Link manager
- WorkshopTreeTabs integration for tabbed navigation
- RecipientEmailComposer polish with ControlInput primitives
- ProjectTotalHeader centralized in WorkshopPageShell footer slot
- NewProjectForm onSuccess callback + auto-dismiss flow

## 2026-05-29 — Route Transition Performance Groundwork (Phase 5B)

**Type:** implementation

**Deliverables:**
- BfcacheHandler, PerformanceMonitor, usePrefetchOnHover
- Skeleton reusable primitive
- Loading skeletons for 6 workshop sub-routes
- 34-document Route Transition Performance Master Plan

## 2026-05-29 — Comprehensive Documentation Audit & Code Intelligence Refresh

**Type:** documentation

**Deliverables:**
- Full 19-folder `.ai/` audit against live codebase (279 source files, 48 migrations, 23 routes, 12 API routes, 112 test files)
- Refreshed `14_code_intelligence/README.md` and `blast-radius-analysis.md` with live graph data
- Live code-review-graph: 3,103 nodes, 44,110 edges, 120 communities, 1,912 functions, 835 tests
- Live GitNexus: 9,403 nodes, 17,358 edges, 300 flows
- Updated hub nodes (15) and bridge nodes (15) with fresh degree/betweenness data
- Updated execution ledger with post-reset phase history (Phases 1–8)
- Verified 15+ existing docs current; updated 4 docs
- Confirmed feature-inventory.md (270 lines), current-state.md (278 lines), decisions.md (143 lines), roadmap (377 lines) all accurate
- 0 undocumented features found; 0 flows affected by doc changes
