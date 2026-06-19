# Archestimator Main Corpus

Last verified: 2026-06-19, against the local checkout in `/Users/philiplewis/Documents/archestimator`.

This is the durable app corpus for Archestimator: a source-grounded description of the software as it exists now. It is not an execution plan, sales page, roadmap, or replacement for source files. When this document conflicts with code, migrations, generated Supabase types, or the current-state fast path, those sources win and this document should be repaired.

## Reading Rules

- Treat the repo as a pre-launch closed-beta MVP unless a newer source explicitly changes that.
- Treat `.ai/10_state/current-state.md` as the fast current-state tie-breaker for recent work, and inspect source before relying on older specs.
- Treat `DESIGN.md` as alpha guidance, not immutable law; Philip's direction and shipped source can override older design text.
- Treat active uncommitted work as provisional current state. At verification time, the checkout was dirty with active project-dashboard/location/map changes in source, tests, migrations, and `.ai/10_state/current-state.md`.
- Do not use this document to justify provider, production, Vercel, Supabase, Resend, browser, or manual proof unless the cited source explicitly records that proof.

## Product In One Page

Archestimator is a contractor-first construction estimating, cost library, proposal, and collaboration workspace. Its core job is to help construction professionals build project estimates, reuse cost components and estimate templates, collaborate around project access and estimate activity, publish client-facing proposal views, and export proposal workbooks.

The product is primarily an authenticated desktop/laptop workspace. Public pages explain the product, collect interest/contact, and expose legal text. Shared-link recipients can review a published proposal-style view without joining the full workshop.

The current operating stage is pre-launch closed beta. Wider external beta and public self-serve acquisition remain blocked by launch-readiness items recorded in `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/`.

## Users And Jobs

| User or actor | Current or intended role in the product | Main jobs |
| --- | --- | --- |
| Contractors and estimators | Primary operators inside the workshop | Create projects, build estimates, insert cost components, edit rows, review totals, publish or export proposal material. |
| Design-build and fit-out teams | Primary operators or collaborators | Share project/estimate context, coordinate scope, compare estimate data, reuse package/template work. |
| Adjacent professional services teams | Likely beta audience for estimating/proposal workflows | Adapt the estimate and proposal workflow to client-facing service packages. |
| Workspace owners/admins | Access managers | Invite collaborators and manage access within implemented project/sheet scopes, preserve manager floors, review beta users where enabled. |
| Project editors | Estimate contributors | Edit estimates, rows, tabs, project details, exact project location when the current feature is enabled. |
| Project viewers | Read-only collaborators | View permitted projects/estimates and participate in presence/review surfaces without edit authority. |
| Shared-link recipients | External proposal reviewers | Open a tokenized shared proposal, optionally pass a password challenge, comment, decide, and unsubscribe from shared-link email updates. |
| Beta admins / platform admins | Closed-beta operators | Control access, troubleshoot provider readiness, and review operational evidence before broader exposure. |

Access roles currently visible in source and specs include app roles `ceo`, `admin`, and `member`; workspace roles `owner`, `admin`, `member`, and `viewer`; and collaboration roles `owner`, `admin`, `editor`, and `viewer`. Collaboration role rank is `owner > admin > editor > viewer`, with `admin` and above treated as access managers. Source anchors: `src/lib/supabase/types.ts`, `src/lib/collaboration/actions.ts`, `.ai/06_specs/teamspaces-collaboration-spec.md`.

## Current Product Surface

### Public, Legal, And Auth

- Public marketing and information pages: `/`, `/about`, `/features`, `/pricing`, `/contact`.
- Legal pages: `/privacy`, `/terms`, plus authenticated workshop terms at `/workshop/terms`.
- Auth routes: `/login`, `/auth/callback`, `/beta/access-required`, and invite entry at `/invite/[token]`.
- Auth gating is implemented through the app/proxy/auth helper layer and Supabase session handling. Source anchors: `src/app/login/page.tsx`, `src/app/auth/callback/route.ts`, `src/lib/auth/`, `src/proxy.ts`.
- The closed-beta gate exists, but the launch audit records fail-open risk if relevant environment configuration is missing. Do not describe access control as release-hardened for wider external beta until the launch gate register is updated.

### Workshop Shell And Dashboard

- Authenticated users enter through `/workshop`.
- The workshop is a full-browser, compact workspace with persistent navigation, route titles, scroll-contained content, and footer/action regions.
- The main sidebar includes Workshop, Projects, and Library navigation, favorites, hover prefetch, keyboard and focus handling, live regions, reduced-motion handling, and responsive collapse behavior.
- The current workshop dashboard is an active design exception: a bento-style command center with stronger visual treatment than the default compact app surfaces.
- Source anchors: `src/app/workshop/page.tsx`, `src/components/workshop/WorkshopPageShell.tsx`, `src/components/sidebar/MainSidebar.tsx`, `src/components/workshop/dashboard/`, `DESIGN.md`.

### Projects And Project Dashboard

- Project list and project shell routes live under `/workshop/projects`.
- Project detail route `/workshop/projects/[projectId]` is shifting from a simple detail page into a command surface.
- In the active dirty checkout, dashboard modules include project identity, recent sheets, published-link status, estimate activity, and private exact-location controls; linked-provider rollout still has the caveats listed below.
- Project groups and sidebar favorites are present in recent source work.
- Project data/charts source exists under `/workshop/projects/[projectId]/data` and `/workshop/projects/[projectId]/charts`, but `next.config.ts` currently redirects `/workshop/projects/:projectId/charts` to `/workshop/projects/:projectId/data`; treat `/data` as the canonical runtime route unless the redirect changes.
- Project image upload/serving exists through `/api/projects/images`. The route accepts authenticated project-scoped uploads, validates image bytes and dimensions, converts allowed image types to WebP full/thumbnail objects, serves private images through the same-origin API route, and supports deletion of owned uploaded paths.
- Exact project coordinates are private editor-visible data. They must not be treated as public, shared-link, export, or AI-context data unless source and privacy review explicitly change that boundary.
- Map rendering uses MapLibre/OpenFreeMap and is off by default behind `NEXT_PUBLIC_PROJECT_LOCATION_MAP_ENABLED`. The style URL is bounded to allowed `tiles.openfreemap.org` HTTPS URLs. Source anchors: `src/components/workshop/ProjectDashboardClient.tsx`, `src/components/workshop/ProjectLocationMap.tsx`, `src/lib/projects/location-map-config.ts`, `src/lib/repositories/project-location-repository.ts`, `src/app/api/projects/images/route.ts`, `next.config.ts`, `.ai/10_state/current-state.md`.

### Estimates, Sheets, Tabs, Tree, And Rows

- Estimate work starts from project context and routes into sheet/detail surfaces under `/workshop/projects/[projectId]/estimates` and estimate detail routes.
- The estimate workspace is the dense productivity surface: left hierarchy tree, central sheet content, right-side library/templates/data panel, and compact controls.
- The current durable hierarchy is a single user-facing node model: every estimate tree node is presented as an "Area." Internal `kind` values such as `group`, `area`, and older legacy labels remain compatibility/write-path labels, not user-facing containment rules.
- Rows, child Areas, and template insertions can target any valid estimate node under the current P6 mixed-node model. The remaining hard rules are estimate/project scope, tab scope, cycle rejection, cross-tab/self-drop rejection, missing-parent/orphan protection, and server-side authorization.
- Estimate tabs are implemented and tab-aware across estimate trees, XLSX export, activity, publication, and AI read context, with source-recorded caveats around provider proof and hosted schema probes.
- Tree drag/drop reorder is active for the estimate tree. The old single-pointer Move modal/button remains removed and should not be confused with the current drag/drop reorder path.
- Library components can be inserted into valid estimate nodes by click or drag/drop. Manual blank rows and Express/project-specific component flows exist in recent source history.
- State model: Supabase/Postgres is canonical, TanStack Query caches server state and optimistic mutations, and Zustand holds scoped UI interaction state.
- Source anchors: `src/components/workshop/EstimateWorkspaceClient.tsx`, `src/components/workshop/EstimateSheetContent.tsx`, `src/components/workshop/estimate-sheet/`, `src/lib/estimates/`, `src/lib/domain/estimate-tree.ts`, `src/lib/repositories/estimate-repository.ts`, `.ai/06_specs/current-project-estimates-component-library-spec.md`, `.ai/06_specs/live-project-estimate-bootstrap.md`, `.ai/10_state/current-state.md`.

### Component Library And Templates

- Library routes include `/workshop/library`, `/workshop/library/components`, `/workshop/library/templates`, and `/workshop/library/templates/[templateId]`.
- Legacy shortcuts `/workshop/components` and `/workshop/templates` still exist as route surfaces.
- The component library supports reusable cost components, taxonomy/category browsing, images/attachments API routes, supplier/category/grouping views, custom/project-specific components, and insertion into active estimates.
- Templates support reusable estimate structures and project-source/template insertion flows. The in-estimate right sidebar has a Templates tab, and template/project-source flows are tab-aware.
- Source anchors: `src/app/workshop/library/`, `src/app/api/component-library/`, `src/components/workshop/`, `.ai/06_specs/current-project-estimates-component-library-spec.md`, `.ai/10_state/current-state.md`.

### Collaboration, Invites, Presence, And Cursors

- Project-scoped collaboration is implemented through project members, sheet-level settings/members, invitation records, and realtime identity helpers.
- Invite entry is tokenized through `/invite/[token]` and accept/continue/sign-out routes.
- Implemented presence and supported cursor surfaces use Supabase Realtime-style topics and signed/bound identity envelopes in recent source history.
- Viewers stay presence-only by current decision; follow mode and project-wide page cursors specifically remain deferred/off unless newer decisions change that.
- Workspace-level collaboration management is still listed as a limitation in the teamspace spec.
- Source anchors: `src/lib/collaboration/`, `src/app/invite/[token]/`, `.ai/06_specs/teamspaces-collaboration-spec.md`, `.ai/10_state/current-state.md`.

### Shared Links, Publication, And Proposal Review

- Shared proposal/review links live at `/share/[token]` and API routes under `/api/share/[token]`.
- Shared links use hashed token/session workflows, optional password protection, comments, decisions, activity/events, unsubscribe handling, and security headers. Rate-limit and abuse-resistance proof remain launch-readiness concerns.
- Shared-link recipients are not full workshop members by default.
- The `/share` CSP is enforced more strictly than the workshop report-only CSP and was not widened for the map provider.
- Source anchors: `src/app/share/[token]/page.tsx`, `src/app/api/share/[token]/`, `src/lib/publication/`, `.ai/06_specs/shared-link-and-publication-spec.md`, `next.config.ts`.

### Proposal Export

- Proposal export is currently XLSX-based through `/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx`.
- Export transforms estimate data into a workbook model and writes formulas/sections for proposal material.
- Published shared views and exported workbooks are related but not identical proof surfaces.
- Source anchors: `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`, `src/lib/proposal-export/`, `.ai/06_specs/proposal-package-system.md`.

### Notifications And Email

- Notification tables, RLS, and delivery concepts are present in migrations/source history.
- Resend is used for email delivery and webhook handling.
- Current notification capability should be described as app/email infrastructure, not as fully proven customer support operations.
- Source anchors: `src/features/notifications/`, `src/lib/email/resend-client.ts`, `src/lib/email/resend-webhooks.ts`, `src/app/api/webhooks/resend/route.ts`, `supabase/migrations/`.

### AI Ask And Package Builder

- AI routes exist at `/api/ai/ask` and `/api/ai/package-builder`.
- AI routes are default-off for closed beta through `ARCHESTIMATOR_AI_ENABLED`; the Ask flip UI is controlled separately by `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED`.
- AI Ask is read-context oriented and has quota/audit behavior in source.
- Package Builder can draft package structures and has Apply paths guarded by feature flags and authenticated Supabase context.
- The launch audit records Package Builder rate limiting as a conditional hard blocker before AI is enabled.
- Do not describe AI as autonomous, always-on, or customer-facing in the closed-beta default state.
- Source anchors: `src/app/api/ai/`, `src/lib/ai/feature-flags.ts`, `src/lib/ai/rate-limit.ts`, `src/lib/ai/audit.ts`, `src/lib/ai/package-builder/`, `.ai/06_specs/ai-assistant-and-package-builder-spec.md`, `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/`.

### Feedback And Settings

- Feedback routes exist under `/workshop/feedback` and `/workshop/settings/feedback`.
- Settings routes include profile, workspace, beta users, feedback, and the settings index.
- Legal/account settings copy currently has launch-readiness caveats around deletion/export promises and procedures.
- Source anchors: `src/app/workshop/feedback/page.tsx`, `src/app/workshop/settings/`, `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/`.

## Capability Status Matrix

| Capability | Current status | Evidence/source | Caveat |
| --- | --- | --- | --- |
| Public marketing pages | Implemented | `src/app/page.tsx`, `src/app/about/page.tsx`, `src/app/features/page.tsx`, `src/app/pricing/page.tsx`, `src/app/contact/page.tsx` | Analytics consent and legal copy have launch-gate caveats. |
| Authenticated workshop | Implemented for closed beta | `src/app/workshop/`, `src/lib/auth/`, `.ai/10_state/current-state.md` | Closed-beta gate needs hardening before wider external beta. |
| Project management | Implemented and actively changing | `src/app/workshop/projects/`, `src/components/workshop/ProjectDashboardClient.tsx` | Dashboard activity/location map work is in dirty checkout and provider rollout is partially blocked by migration-history drift. |
| Project image upload/serving | Implemented private media surface | `src/app/api/projects/images/route.ts` | Private same-origin image route; do not treat private project image URLs as shared-link/export/public assets unless publication code explicitly snapshots a sanitized public image. |
| Project groups/favorites | Implemented in recent source work | `src/lib/workshop/group-actions.ts`, `src/components/workshop/ProjectGroupSection.tsx`, sidebar source | Treat as branch/current-checkout state until merged/recorded by newer state. |
| Estimates and sheet editing | Implemented | `src/components/workshop/EstimateWorkspaceClient.tsx`, `src/lib/estimates/tree-hierarchy.ts`, estimate current-state | Single-node "Area" model and drag/drop reorder are active; the old single-pointer Move modal/button remains removed. |
| Estimate tabs | Implemented locally and source-recorded | `.ai/10_state/current-state.md`, estimate specs | Hosted/provider proof has caveats in source history. |
| Component library | Implemented | `src/app/workshop/library/components/page.tsx`, `src/app/api/component-library/`, specs | Some raw controls and UX gaps remain in the spec. |
| Templates and project-source insertion | Implemented | `src/app/workshop/library/templates/`, template specs/current-state | Some large-fixture and authenticated provider proof items are deferred. |
| Project data/charts | Implemented as comparison/data surface | `src/app/workshop/projects/[projectId]/data/page.tsx`, `src/app/workshop/projects/[projectId]/charts/page.tsx`, `next.config.ts`, current-state | `/data` is canonical at runtime while `/charts` redirects there; broad route proof depends on current provider/schema state. |
| Collaboration/invites/presence | Implemented project-scoped | `src/lib/collaboration/`, invite routes, teamspace spec | Workspace-level collaboration and follow mode are deferred. |
| Shared links/publication | Implemented | `/share/[token]`, `/api/share/[token]`, `src/lib/publication/` | Public-route analytics/consent and rate-limit verification remain launch concerns. |
| XLSX proposal export | Implemented | `src/lib/proposal-export/`, export route | Do not imply PDF package workflows unless source adds them. |
| Notifications/email | Implemented infrastructure | `src/features/notifications/`, `src/lib/email/`, Resend webhook route | Support/monitoring readiness remains a launch blocker. |
| AI Ask | Implemented but default-off | `src/app/api/ai/ask/`, `src/lib/ai/feature-flags.ts` | Requires provider config and remains gated for closed beta. |
| AI Package Builder | Implemented but default-off | `src/app/api/ai/package-builder/`, `src/lib/ai/package-builder/` | Needs rate-limit work before enabling. |
| Validation browser/visual proof | Available, opt-in | `playwright.config.ts`, project proof scripts | Not a default gate for docs or minor UI edits. |
| Wider external beta | No-go by current audit | launch-readiness audit pack | B1-B9 and V1-V2 must close or be explicitly owner-accepted. |
| Public self-serve release | No-go by current audit | launch-readiness decision register | Requires legal, provider evidence, support/monitoring, CI, and owner go/no-go. |

## Architecture Overview

Archestimator is a Next.js 16 App Router application on React 19 and TypeScript, run with Bun scripts and Tailwind v4/PostCSS styling. The app uses React Server Components, server actions, API route handlers, and client components where interaction requires browser state.

The backend is Supabase/Postgres, with generated TypeScript types in `src/lib/supabase/types.ts`, environment/client separation in `src/lib/supabase/`, migrations in `supabase/migrations/`, and an explicit Archestimator-only provider boundary recorded in `AGENTS.md` and `.ai/10_state/current-state.md`.

The application state model has three main layers:

| Layer | Owner | Typical contents |
| --- | --- | --- |
| Supabase/Postgres | Canonical persistence | Workspaces, projects, estimates, estimate nodes, row items, tabs, component library data, templates, collaboration, invitations, publication, notifications, audit/activity. |
| TanStack Query | Client/server cache and optimistic reconciliation | Estimate trees, project summaries, collaboration summaries, library/template data, mutation invalidation. |
| Zustand/local state | Interaction state | Selected nodes, panels, transient edit state, scoped UI preferences. |

Important integration libraries and services include:

- Supabase Auth, Postgres, Realtime, Storage patterns, and generated schema types.
- TanStack Query, TanStack Table, and TanStack Virtual for data-heavy UI.
- Zustand for scoped client UI state.
- ExcelJS for XLSX proposal export.
- Resend for email delivery and webhook processing.
- Vercel Analytics in the app shell, with consent caveats in launch-readiness docs.
- MapLibre/OpenFreeMap for the optional project-location map.
- D3 for chart/data visualization work.
- Storybook 10 as a fixture-first design/component review surface.
- Vitest, Testing Library, Bun unit tests, and Playwright for proportional validation.

Source anchors: `package.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `src/lib/supabase/`, `supabase/config.toml`, `supabase/migrations/`.

## Data Model And Boundaries

The central product hierarchy is:

`workspace -> project -> estimate -> estimate tab / estimate node tree (user-facing Areas) -> estimate row items`

Related domains attach to that hierarchy:

- Component library: reusable components, taxonomy/category nodes, suppliers, images, attachments, project-specific components, and template sources.
- Templates: reusable estimate outlines and project-source insert structures.
- Collaboration: project members, estimate/sheet access settings, invitations, realtime identity/presence/cursors.
- Publication: shared links, published snapshots, token/session/password handling, public comments, decisions, events, and unsubscribe records.
- Activity/audit: estimate events, AI audit metadata, notification delivery data, project activity summaries.
- Project images: private WebP full/thumbnail objects served through `/api/projects/images` with authenticated project/workspace checks and private cache behavior for not-found/error paths.
- Project location: private exact coordinates for editor-visible project dashboard context in the current dirty checkout.

Security and boundary rules:

- Supabase work is bounded to the configured Archestimator Supabase project recorded in `AGENTS.md` and current-state. Do not apply DB changes to unrelated provider projects.
- RLS and RPC/server-action guards are required authorization boundaries; coverage must be verified per table/route before release claims. Browser clients should not be treated as trusted for authorization.
- Service-role/admin clients belong on server-only paths.
- Shared-link recipients should receive only the published/shared surface, not workshop-only private data.
- Private project image route URLs should not be copied into shared links, exports, or public pages. Publication code must snapshot only sanitized/allowlisted public image values when it displays proposal imagery.
- Exact project locations are private editor-visible data and should stay out of shared links, exports, and AI context unless the source changes.
- AI routes must require authenticated Supabase account context and remain feature-gated by default.
- No secrets, raw provider credentials, private session state, `.omx`, `.omo`, `.gitnexus`, or local machine artifacts belong in durable corpus content.

Source anchors: `src/lib/supabase/`, `src/lib/repositories/`, `src/lib/publication/`, `src/lib/collaboration/`, `src/lib/ai/`, `.ai/06_specs/state-and-supabase-foundation.md`, `.ai/06_specs/shared-link-and-publication-spec.md`.

## Design And UX System

Archestimator's product personality is precise, architectural, understated, and professional. It should avoid construction cliches and generic decorative dashboards in the authenticated app.

The default workshop design is compact premium SaaS:

- SF Pro/system font stack for app surfaces.
- Neutral ink palette with thin borders and dense information layout.
- Small type, generally 8-12px in app chrome and controls unless a named design exception applies.
- Tight radii, with 3px/`rounded-xs` as the default inner-control feel.
- 1px-outline icon style, primarily Phosphor where used by the product system.
- Full-browser workspace composition rather than centered marketing-card layouts.
- Explicit status, financial, and workflow state cues; do not rely on color alone.

Current active tension: shipped CSS includes Archestimator Signal orange as an active token family, while older `DESIGN.md` text treats orange as more limited. Use shipped source plus current owner direction when resolving that tension.

The public site can be more editorial and brand-forward. The authenticated workshop should remain compact, task-first, and scannable. The workshop dashboard is a named exploratory exception using bento/glass/warm visual language and different display/numeric treatment.

Accessibility posture is explicit but pragmatic: semantic regions, focus rings, keyboardable tabs/menus, status/live regions, reduced-motion and reduced-transparency fallbacks, non-color-only status, and screen-reader alternatives for chart data.

Source anchors: `DESIGN.md`, `src/app/globals.css`, `src/components/ui/`, `src/components/workshop/`, `src/components/sidebar/`, `src/stories/`.

## Operations And Environments

Local/default commands are Bun-first:

- `bun run dev` for local Next development.
- `bun run type-check` for TypeScript.
- `bun run lint` and design lint scripts for static checks.
- `bun run test` for Bun unit tests.
- `bun run test:dom` for Vitest DOM tests.
- `bun run test:e2e` for Playwright.
- `bun run validate` for the aggregate gate, with current-state caveats.
- `bun run gen:types` to regenerate Supabase types for the configured Archestimator Supabase project.

Provider/tooling posture:

- Supabase/Postgres is active and authorized for Archestimator pre-launch MVP work inside the configured Archestimator project only.
- Closed-beta cost posture keeps PITR disabled unless explicitly reapproved.
- Vercel deployment evidence, Resend readiness, browser proof, and provider proof are separate from local source presence.
- Full `bun run validate` is currently known red/noisy on `main` for pre-existing reasons recorded in `.ai/10_state/current-state.md`; use targeted validation for narrow docs/source changes.

Source anchors: `package.json`, `.ai/10_state/current-state.md`, `AGENTS.md`, `.ai/00_system/VALIDATION_MATRIX.md`.

## Validation State

The repo has validation surfaces for TypeScript, ESLint, design-system linting, Bun unit tests, Vitest DOM tests, Playwright browser tests, Storybook checks, Supabase type generation, provider-readiness scripts, and domain-specific proof scripts.

Current-state records that full `bun run validate` is known red/noisy on `main` for pre-existing reasons, so current work usually uses targeted evidence unless a broader release/security/auth/data-integrity risk requires the aggregate gate. This corpus changes no runtime behavior; its proof surface is source coverage, artifact shape, and absence of stale or unsupported claims.

## Current Gaps And Risks

The latest launch-readiness audit says owner-only closed beta is a possible current posture, but wider external beta and public self-serve exposure remain blocked.

Current hard/verification/conditional risk classes include:

- CI/validation posture is not ready as a broad release gate.
- Root error/not-found/global-error and durable error/log sink gaps remain.
- Closed-beta gate has fail-open risk if environment configuration is absent.
- Migration-ledger/schema drift exists, including current dashboard location/activity rollout drift.
- Support, uptime, incident, and monitoring evidence is not sufficient for wider external users.
- Account deletion and legal/privacy copy have promise-vs-capability gaps.
- Realtime rate-limit ceiling needs proof.
- Public-route analytics consent path needs a decision/proof.
- AI Package Builder rate limiting is a conditional hard blocker before AI is enabled.

Product/UX gaps recorded in current specs include:

- The old single-pointer Move modal/button remains removed; current movement is the drag/drop reorder path.
- Some component-library raw controls still need shared primitive cleanup.
- Some empty-node/sidebar drop-into and mixed-create QA follow-ups remain recorded around the single-node estimate tree.
- Workspace-level collaboration management is not the current implemented scope.
- Follow mode and project-wide page cursors are deferred/off.
- Some provider/browser/manual evidence remains deferred for current branches.

Source anchors: `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/01-MASTER-INDEX.md`, `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/03-LAUNCH-GATE-DECISION-REGISTER.md`, `.ai/06_specs/current-project-estimates-component-library-spec.md`, `.ai/06_specs/teamspaces-collaboration-spec.md`, `.ai/10_state/current-state.md`.

## Source Map

Use these sources to repair this corpus when the app changes:

| Domain | Primary sources |
| --- | --- |
| Current truth and recent work | `.ai/10_state/current-state.md`, `.ai/10_state/decisions.md` by targeted search |
| Product and roadmap | `README.md`, `PRODUCT.md`, `.ai/README.md`, `.ai/01_roadmap/README.md` |
| Feature inventory | `.ai/06_specs/feature-inventory.md`, `.ai/06_specs/current-project-estimates-component-library-spec.md`, `.ai/06_specs/live-project-estimate-bootstrap.md` |
| Architecture | `.ai/06_specs/deep/architecture-overview.md`, `.ai/06_specs/state-and-supabase-foundation.md`, `package.json`, `next.config.ts`, `src/app/`, `src/lib/` |
| Auth/Supabase | `.ai/06_specs/supabase-auth-setup.md`, `src/lib/auth/`, `src/lib/supabase/`, `supabase/migrations/`, `src/lib/supabase/types.ts` |
| Collaboration | `.ai/06_specs/teamspaces-collaboration-spec.md`, `src/lib/collaboration/`, `src/app/invite/[token]/` |
| Publication/share | `.ai/06_specs/shared-link-and-publication-spec.md`, `src/lib/publication/`, `src/app/share/[token]/`, `src/app/api/share/[token]/` |
| Proposal/export | `.ai/06_specs/proposal-package-system.md`, `src/lib/proposal-export/`, export API route |
| AI | `.ai/06_specs/ai-assistant-and-package-builder-spec.md`, `src/lib/ai/`, `src/app/api/ai/` |
| Design | `DESIGN.md`, `src/app/globals.css`, `src/components/ui/`, `src/components/workshop/`, `src/stories/` |
| Launch readiness | `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/` |
| Validation | `.ai/00_system/VALIDATION_MATRIX.md`, `package.json`, `tests/`, `playwright.config.ts`, `vitest.config.ts` |
