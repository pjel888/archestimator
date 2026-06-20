# Archestimator Main Corpus

Last verified: 2026-06-20, against `main` at HEAD commit `3f0901ee` ("feat: make project location maps beta-ready") or later. Pin re-verification to a commit SHA, not a date alone — a date stamp cannot distinguish a doc commit from a later same-day code change (that ambiguity is exactly what hid the map-provider drift this revision repairs).

This is the durable app corpus for Archestimator: a source-grounded description of the software as it exists now. It is not an execution plan, sales page, roadmap, or replacement for source files. When this document conflicts with code, migrations, generated Supabase types, or the current-state fast path, those sources win and this document should be repaired **in the same change** (see "Corpus Maintenance Protocol").

## Reading Rules

- Treat the repo as a pre-launch MVP that is nonetheless **live in production in owner-only closed beta** (`www.archestimator.com`): every change touches a real deployment even though there are no external users yet. Do not read "pre-launch" as "not deployed."
- Treat `.ai/10_state/current-state.md` as the fast current-state tie-breaker for recent work, and inspect source before relying on older specs.
- Treat `DESIGN.md` as alpha guidance, not immutable law; Philip's direction and shipped source can override older design text.
- **Active verification gate.** Before acting on any claim in "Current Product Surface" or the "Capability Status Matrix," open at least one cited source anchor and confirm it exists and still matches. The fastest-rotting areas are marked VOLATILE in the Corpus Maintenance Protocol — re-verify those against HEAD before acting.
- **Conflict rule.** On any corpus-vs-source conflict, trust source/current-state, proceed, **and** repair the stale corpus line in the same change. Never silently override a stale line and leave it stale for the next reader.
- Treat genuinely uncommitted work as provisional. As of this verification the committed `main` tree was otherwise current, but the working tree was dirty with active dashboard **recent-estimate cost-strip and actual-vs-budget budget-health** polish (and unrelated launch-readiness pack edits). The Google Maps location provider, project groups, and sidebar favorites are **committed on `main`**, not provisional.
- Do not use this document to justify provider, production, Vercel, Supabase, Resend, Google, browser, or manual proof unless the cited source explicitly records that proof.

## Product In One Page

Archestimator is a **contractor-first** construction estimating, cost-library, proposal, and collaboration workspace. It replaces spreadsheets and fragmented cost databases with a single collaborative surface where teams build itemized estimates, source with confidence, and deliver client-ready proposals that close. The strategic bet (the wedge) is **reuse**: reusable cost components plus estimate templates plus proposal publication, so a contractor builds an estimate from saved components in minutes rather than hours and sends a proposal the client understands and trusts.

Its core job is to help construction professionals build project estimates, reuse cost components and estimate templates, collaborate around project access and estimate activity, publish client-facing proposal views, and export proposal workbooks.

The product is primarily an authenticated desktop/laptop workspace. Public pages explain the product, collect interest/contact, and expose legal text. Shared-link recipients can review a published proposal-style view without joining the full workshop.

**Operating stage (three gated tiers).** The current production posture is **owner-only closed beta, live on `www.archestimator.com`**. Two further tiers are gated:
1. **Wider/external beta** — blocked by hard blockers B1–B9 and verification items V1–V2 (see "Path To Wider Beta").
2. **Public self-serve acquisition** — a further tier, conditional on C1 plus legal, provider evidence, support/monitoring, CI, and an explicit owner go/no-go.

Source anchors: `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/01-MASTER-INDEX.md`, `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/03-LAUNCH-GATE-DECISION-REGISTER.md`, `PRODUCT.md`, `src/app/page.tsx`.

### Deliberate Non-Goals (current MVP)

These are **choices**, not unfinished work. Do not build them speculatively or assume they exist:

- **No PDF package workflow yet.** Proposal output is XLSX plus shared web links; PDF is deemed unnecessary for beta. (`.ai/01_roadmap/22-ruthless-prioritization-for-beta.md`)
- **No self-serve DSAR / account-data export flow.** Deletion/export is a launch-gate item (B8/B9), not a shipped capability.
- **No mobile editing.** The workshop is desktop/laptop-only (sidebar is hidden below 1024px with no mobile nav fallback).
- **No monetization.** There is no Stripe, checkout, subscription, or plan enforcement in this MVP; pricing is announced after beta. (`src/app/pricing/page.tsx:35,84`)

### Product Job And Success

The intended **north-star metric** is *weekly active workspaces with at least one estimate edit, export, or share* — every feature is meant to drive an estimate edit, export, or share. **This metric is not yet instrumented:** there is no product-analytics events table, no metric-materialization job, and no north-star dashboard; the only wired analytics are Vercel Web Analytics (page traffic, `/workshop` paths redacted) and landing-page A/B events to GA4/Clarity. Treat the north-star as aspirational direction, not a measured number. Source anchors: `.ai/01_roadmap/19-feature-adoption-success-metrics.md`, `src/lib/analytics/vercel-web-analytics.ts`, `src/lib/ab-testing/`.

## Users And Jobs

Each row states the user's **job-to-be-done / outcome** first; the in-app actions are the "how."

| User or actor | Role in the product | Job-to-be-done (outcome they want) | In-app "how" |
| --- | --- | --- | --- |
| Contractors and estimators | Primary operators inside the workshop | "Price a project accurately and fast, then turn it into a proposal that wins the job at the right margin." | Create projects, build estimates, insert cost components, edit rows, review totals, publish or export proposal material. |
| Design-build and fit-out teams | Primary operators / collaborators | "Coordinate scope and pricing across a team without emailing spreadsheet versions." | Share project/estimate context, compare estimate data, reuse package/template work. |
| Adjacent professional services teams | Likely beta audience | "Adapt the estimate→proposal workflow to client-facing service packages." | Reuse estimate/proposal structures for service scopes. |
| Workspace owners/admins | Access managers | "Control who can see and edit which projects without losing manager authority." | Invite collaborators, manage access within implemented project/sheet scopes, preserve manager floors, review beta users where enabled. |
| Project editors | Estimate contributors | "Contribute pricing and structure to a shared estimate." | Edit estimates, rows, tabs, project details, exact project location when implemented. |
| Project viewers | Read-only collaborators | "Review a project's estimate without risk of changing it." | View permitted projects/estimates and participate in presence/review surfaces without edit authority. |
| Shared-link recipients | External proposal reviewers | "Review and respond to a proposal without creating an account." | Open a tokenized shared proposal, optionally pass a password challenge, comment, decide, unsubscribe from shared-link email updates. |
| Beta admins / platform admins | Closed-beta operators | "Keep the closed beta healthy and gate exposure on real evidence." | Control access, troubleshoot provider readiness, review operational evidence before broader exposure. |

**First-success moment:** a contractor opens Archestimator, builds an estimate from reusable components in minutes, and sends a proposal the client understands and trusts.

Access roles currently visible in source and specs include app roles `ceo`, `admin`, and `member`; workspace roles `owner`, `admin`, `member`, and `viewer`; and collaboration roles `owner`, `admin`, `editor`, and `viewer`. Collaboration role rank is `owner > admin > editor > viewer`, with `admin` and above treated as access managers. The three vocabularies are distinct enum types and must not be conflated. Source anchors: `src/lib/supabase/types.ts` (enums `app_role`, `workspace_role`, `collaboration_role`), `src/lib/collaboration/actions.ts`, `.ai/06_specs/teamspaces-collaboration-spec.md`.

## Path To Wider Beta

The Launch-Readiness register is the source of truth; these one-line definitions are a navigation aid, not a re-derivation. An agent can use this to tell which work removes which gate.

| Gate | Class | One-line definition |
| --- | --- | --- |
| B1 | Hard blocker | CI is effectively disabled / has no real runs as a release gate. |
| B2 | Hard blocker | `bun run validate` is red-by-construction on `main` (known pre-existing reds). |
| B3 | Hard blocker | No root `error`/`not-found`/`global-error` boundaries (404/500 handling). |
| B4 | Hard blocker | No durable error/log sink (observability gap). |
| B5 | Hard blocker | Closed-beta access gate can fail **open** if env configuration is absent. |
| B6 | Hard blocker | Migration-ledger / schema-history drift threatens disaster recovery. |
| B7 | Hard blocker | Support, uptime, incident, and monitoring evidence insufficient for external users. |
| B8 | Hard blocker | Account deletion orphans PII (no safe delete/export path). |
| B9 | Hard blocker | Legal/privacy copy over-promises deletion/export vs. real capability. |
| V1 | Verification | Realtime rate-limit ceiling needs proof. |
| V2 | Verification | Public-route analytics consent path needs a decision/proof. |
| C1 | Conditional | AI Package Builder rate limiting required **before** AI is enabled. |

Source anchors: `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/01-MASTER-INDEX.md`, `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/03-LAUNCH-GATE-DECISION-REGISTER.md`.

## Current Product Surface

### Public, Legal, And Auth

- Public marketing and information pages: `/`, `/about`, `/features`, `/pricing`, `/contact`.
- Legal pages: `/privacy`, `/terms`, plus authenticated workshop terms at `/workshop/terms`.
- Auth routes: `/login`, `/auth/callback`, `/beta/access-required`, and invite entry at `/invite/[token]`.
- **Layered auth gate chain:** the proxy/middleware enforces session + closed-beta access; the workshop layout redirects unauthenticated users to `/login`; an accepted-terms gate redirects to `/workshop/terms?next=...` until terms are accepted. `/workshop/onboarding` is a redirect-only route to `/workshop/settings`. Source anchors: `src/proxy.ts`, `src/app/workshop/layout.tsx`, `src/lib/legal/terms-gate.ts`, `src/app/workshop/onboarding/page.tsx`, `src/lib/auth/`.
- The closed-beta gate exists, but the launch audit records **fail-open risk (B5)** if relevant environment configuration is missing. Do not describe access control as release-hardened for wider external beta until the launch gate register is updated.

### Workshop Shell And Dashboard

- Authenticated users enter through `/workshop`.
- The workshop is a full-browser, compact workspace with persistent navigation, route titles, scroll-contained content, and footer/action regions.
- The main sidebar includes Workshop, Projects, and Library navigation, favorites, hover prefetch, keyboard and focus handling, live regions, and responsive behavior. **Responsive behavior is desktop-only:** the sidebar is `hidden lg:flex` — hidden below the `lg` breakpoint (1024px) with **no mobile navigation fallback today**; the workshop content offsets via `lg:pl-[var(--sidebar-content-offset)]`. Source anchors: `src/components/sidebar/MainSidebar.tsx`, `src/components/workshop/WorkshopPageShell.tsx`.
- The current workshop dashboard is an active design exception: a bento-style command center with stronger visual treatment than the default compact app surfaces.
- Source anchors: `src/app/workshop/page.tsx`, `src/components/workshop/WorkshopPageShell.tsx`, `src/components/sidebar/MainSidebar.tsx`, `src/components/workshop/dashboard/`, `DESIGN.md`.

### Projects And Project Dashboard

- Project list and project shell routes live under `/workshop/projects`.
- Project detail route `/workshop/projects/[projectId]` is a command surface. Shipped dashboard modules include: project identity; an upper-left estimate-count + recent-sheets ledger; a right-rail **day-grouped activity feed** sourced from `estimate_sheet_events`; published-link status; and private exact-location controls. Two panels are **current uncommitted polish (2026-06-20)**: a lower-left recent-estimate **running-cost strip** (three freshest estimate sheets, each showing title + current sheet total) and, below it, an **actual-vs-budget budget-health panel** (bar meters with in-budget/over-budget/no-budget states). The cost-strip and budget-health panels are inline functions inside `ProjectDashboardClient.tsx` (not standalone files). Source anchors: `src/components/workshop/ProjectDashboardClient.tsx`, `src/lib/repositories/project-activity-repository.ts`, `.ai/10_state/current-state.md`.
- Project groups and sidebar favorites are committed on `main` (per-user groups + `organizeBy` mode; scoped TanStack Query cache for favorites reactivity).
- Project data/charts source exists under `/workshop/projects/[projectId]/data` and `/workshop/projects/[projectId]/charts`, but `next.config.ts` (lines ~102–103) redirects `/workshop/projects/:projectId/charts` to `/workshop/projects/:projectId/data`; treat `/data` as the canonical runtime route unless the redirect changes.
- Project image upload/serving exists through `/api/projects/images`. The route accepts authenticated project-scoped uploads, validates image bytes and dimensions (max 12MB / 24MP), resizes to a 1600px max edge (512px thumbnail), converts allowed image types to WebP (`quality: 82` full / `quality: 85` thumbnail), serves private images same-origin with `Cache-Control: private, max-age=300` on success (no-store on error/not-found), and supports deletion of owned uploaded paths. Source anchor: `src/app/api/projects/images/route.ts`.
- Exact project coordinates are **private editor-visible data with a precise role boundary**: they are readable only by users who pass `can_edit_project()` — workspace `owner`/`admin`/**`member`** roles plus project collaboration `owner`/`admin`/`editor`; workspace `viewer` and project `viewer` are excluded. ("Editor-visible" understates this — workspace `member` is broader than collaboration `editor`; anyone building a new coordinate-exposing surface must honor `can_edit_project()`.) Coordinates must not be treated as public, shared-link, export, or AI-context data unless source and privacy review explicitly change that boundary. Source anchor: `supabase/migrations/20260613192344_teamspace_rls_authuid_perf.sql` (`can_edit_project()`).
- **Project-location map uses Google Maps Platform** (the prior self-hosted tile-map stack was fully removed when the provider switched — do not reintroduce it). The Google Maps JavaScript API is loaded dynamically from `maps.googleapis.com` (no npm package) via `src/lib/google-maps/loader.ts`, with Google Places Autocomplete during address set/edit only. The map renders only when a Google Maps browser API key is configured (`GOOGLE_MAPS_API_KEY`, or `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` as a browser fallback; optional `GOOGLE_MAPS_MAP_ID` / `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`); with no key it shows an editable **address-only fallback**. An inline POI-free grayscale style is applied. Geocoding is one-time on save (persist formatted address + place_id + lat/lng) — never per view. The project-location/activity data depends on migration `20260619105250`, which has unresolved remote history drift; the dashboard ships a runtime schema-drift guard that degrades to empty activity / no pin when the migration is absent. Source anchors: `src/components/workshop/ProjectDashboardClient.tsx`, `src/components/workshop/ProjectLocationMap.tsx`, `src/components/workshop/ProjectAddressAutocomplete.tsx`, `src/lib/google-maps/loader.ts`, `src/lib/repositories/project-location-repository.ts`, `src/app/workshop/projects/[projectId]/page.tsx`, `next.config.ts`, `.ai/10_state/current-state.md`.

### Estimates, Sheets, Tabs, Tree, And Rows

- Estimate work starts from project context and routes into sheet/detail surfaces under `/workshop/projects/[projectId]/estimates` and estimate detail routes.
- The estimate workspace is the dense productivity surface: left hierarchy tree, central sheet content, right-side library/templates/data panel, and compact controls.
- The current durable hierarchy is a single user-facing node model: every estimate tree node is presented as an "Area." Internal `kind` values such as `group`, `area`, and older legacy labels remain compatibility/write-path labels, not user-facing containment rules.
- Rows, child Areas, and template insertions can target **any** valid estimate node under the current P6 mixed-node model. The remaining hard rules are estimate/project scope, tab scope, cycle rejection, cross-tab/self-drop rejection, missing-parent/orphan protection, and server-side authorization.
- **Do not reintroduce kind-guards.** The P5/P6 migrations deliberately removed the client-side and write-RPC `kind`-guards that blocked rows/Areas/templates from targeting a node (applied to prod, "point of no return crossed," forward-fix only). A single "Add Area" creates a child area of any node; insertion targets any node. Do not "helpfully" restore those guards — the only hard rules are the ones listed above. Source anchor: `.ai/10_state/current-state.md` (Estimate-Tree Single-Node Unification P0–P6).
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
- Implemented presence and supported cursor surfaces use Supabase Realtime-style topics and signed/bound identity envelopes. Sheet cursor broadcast ships today and defaults on (`NEXT_PUBLIC_TEAMSPACE_CURSOR_BROADCAST`, default on). Project-wide page cursors and follow mode are gated **off** by default (`NEXT_PUBLIC_TEAMSPACE_PROJECT_CURSORS`, `NEXT_PUBLIC_TEAMSPACE_FOLLOW_MODE`).
- Viewers stay presence-only by current decision; follow mode and project-wide page cursors specifically remain deferred/off unless newer decisions change that.
- Workspace-level collaboration management is still listed as a limitation in the teamspace spec.
- Source anchors: `src/lib/collaboration/`, `src/lib/collaboration/feature-flags.ts`, `src/app/invite/[token]/`, `.ai/06_specs/teamspaces-collaboration-spec.md`, `.ai/10_state/current-state.md`.

### Shared Links, Publication, And Proposal Review

- Shared proposal/review links live at `/share/[token]` and API routes under `/api/share/[token]`.
- Shared links use hashed token/session workflows, optional password protection, comments, decisions, activity/events, unsubscribe handling, and security headers. Rate-limit and abuse-resistance proof remain launch-readiness concerns.
- **Password brute-force lockout is per-instance only.** The progressive-delay + hard-lock logic uses an **in-memory `Map`** (`src/lib/publication/security.ts`, `passwordAttemptStore`) that does not persist across restarts or serverless instances — on Vercel each instance keeps its own store, so the lockout is per-instance, not global. Before relying on password-protected links at multi-instance scale, move the lockout to a durable backend (e.g. the existing `security_rate_limit_events` table).
- Shared-link recipients are not full workshop members by default.
- **CSP posture:** the workshop CSP is shipped **Report-Only** and **was widened to allow Google Maps/Places domains** (`script-src`/`img-src`/`connect-src` include `maps.googleapis.com`, `maps.gstatic.com`, `*.googleapis.com`, `*.gstatic.com`, `*.google.com`, `*.ggpht.com`, `*.googleusercontent.com`; `frame-src https://*.google.com`). The `/share` CSP is shipped **enforced** (not Report-Only) but **reuses the map-free landing policy value** ("kept identical, no tighten"), so shared proposal pages never load Google Maps or tracking scripts. The difference between workshop and `/share` is **enforcement mode plus the map-free value**, not a stricter `/share` value. Source anchors: `src/app/share/[token]/page.tsx`, `src/app/api/share/[token]/`, `src/lib/publication/`, `src/lib/publication/security.ts`, `next.config.ts`.

### Proposal Export

- Proposal export is currently XLSX-based through `/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx`.
- Export transforms estimate data into a workbook model and writes formulas/sections for proposal material. The route runs on the Node.js runtime (`runtime = "nodejs"`, `maxDuration = 60`); fan-out is bounded by estimate node/row caps.
- Published shared views and exported workbooks are related but not identical proof surfaces.
- Source anchors: `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`, `src/lib/proposal-export/`, `.ai/06_specs/proposal-package-system.md`.

### Notifications And Email

- Notification tables, RLS, and delivery concepts are present in migrations/source history.
- Resend is used for email delivery and webhook handling.
- Current notification capability should be described as app/email infrastructure, not as fully proven customer support operations.
- Source anchors: `src/features/notifications/`, `src/lib/email/resend-client.ts`, `src/lib/email/resend-webhooks.ts`, `src/app/api/webhooks/resend/route.ts`, `supabase/migrations/`.

### AI Ask And Package Builder

- AI routes exist at `/api/ai/ask` and `/api/ai/package-builder`.
- **The LLM provider is DeepSeek.** Both AI routes call the DeepSeek chat-completions endpoint (`api.deepseek.com`); server-side env vars `DEEPSEEK_API_KEY` and `DEEPSEEK_MODEL` (default model `deepseek-v4-flash`) must be configured. The provider is dynamically used server-side; it is not bundled to the client.
- AI routes are default-off for closed beta through `ARCHESTIMATOR_AI_ENABLED`; the Ask flip UI is controlled separately by `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED`.
- AI Ask is read-context oriented and has quota/audit behavior in source.
- Package Builder can draft package structures and has Apply paths guarded by feature flags and authenticated Supabase context.
- The launch audit records Package Builder rate limiting as a conditional hard blocker (C1) before AI is enabled.
- Do not describe AI as autonomous, always-on, or customer-facing in the closed-beta default state.
- Source anchors: `src/lib/ai/deepseek.ts`, `src/app/api/ai/ask/handler.ts`, `src/app/api/ai/package-builder/handler.ts`, `src/lib/ai/feature-flags.ts`, `src/lib/ai/rate-limit.ts`, `src/lib/ai/audit.ts`, `src/lib/ai/package-builder/`, `.ai/06_specs/ai-assistant-and-package-builder-spec.md`, `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/`.

### Feedback And Settings

- Feedback routes exist under `/workshop/feedback` and `/workshop/settings/feedback`.
- Settings routes include profile, workspace, beta users, feedback, and the settings index.
- Legal/account settings copy currently has launch-readiness caveats around deletion/export promises and procedures (B8/B9).
- Source anchors: `src/app/workshop/feedback/page.tsx`, `src/app/workshop/settings/`, `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/`.

## Capability Status Matrix

| Capability | Current status | Evidence/source | Caveat |
| --- | --- | --- | --- |
| Public marketing pages | Implemented | `src/app/page.tsx`, `src/app/about/page.tsx`, `src/app/features/page.tsx`, `src/app/pricing/page.tsx`, `src/app/contact/page.tsx` | Analytics consent (V2) and legal copy have launch-gate caveats. |
| Authenticated workshop | Implemented (live, owner-only closed beta) | `src/app/workshop/`, `src/lib/auth/`, `.ai/10_state/current-state.md` | Closed-beta gate needs hardening (B5) before wider external beta. |
| Project management | Implemented and actively changing | `src/app/workshop/projects/`, `src/components/workshop/ProjectDashboardClient.tsx` | Dashboard cost-strip/budget-health panels are current uncommitted polish; map provider/groups/favorites are committed. |
| Project location map | Implemented (Google Maps Platform) | `src/components/workshop/ProjectLocationMap.tsx`, `src/lib/google-maps/loader.ts`, `next.config.ts` | Billed third-party provider; key-gated with address-only fallback; provider-readiness items open (see Gaps). |
| Project image upload/serving | Implemented private media surface | `src/app/api/projects/images/route.ts` | Private same-origin image route (12MB/24MP→WebP, `private, max-age=300`); do not treat private project image URLs as shared-link/export/public assets unless publication code snapshots a sanitized public image. |
| Project groups/favorites | Implemented and committed on `main` | `src/lib/workshop/group-actions.ts`, `src/components/workshop/ProjectGroupSection.tsx`, sidebar source | Per-user groups + `organizeBy`; favorites use a scoped TanStack Query cache. |
| Estimates and sheet editing | Implemented | `src/components/workshop/EstimateWorkspaceClient.tsx`, `src/lib/estimates/tree-hierarchy.ts`, estimate current-state | Single-node "Area" model + drag/drop reorder active; P5/P6 kind-guards removed (do not reintroduce). |
| Estimate tabs | Implemented locally and source-recorded | `.ai/10_state/current-state.md`, estimate specs | Hosted/provider proof has caveats in source history. |
| Component library | Implemented | `src/app/workshop/library/components/page.tsx`, `src/app/api/component-library/`, specs | Some raw controls and UX gaps remain in the spec. |
| Templates and project-source insertion | Implemented | `src/app/workshop/library/templates/`, template specs/current-state | Some large-fixture and authenticated provider proof items are deferred. |
| Project data/charts | Implemented as comparison/data surface | `src/app/workshop/projects/[projectId]/data/page.tsx`, `next.config.ts`, current-state | `/data` is canonical at runtime while `/charts` redirects there. |
| Collaboration/invites/presence | Implemented project-scoped | `src/lib/collaboration/`, invite routes, teamspace spec | Workspace-level collaboration and follow mode are deferred/off by default. |
| Shared links/publication | Implemented | `/share/[token]`, `/api/share/[token]`, `src/lib/publication/` | `/share` CSP enforced + map-free; password lockout is in-memory/per-instance; rate-limit/consent (V1/V2) remain launch concerns. |
| XLSX proposal export | Implemented | `src/lib/proposal-export/`, export route (`nodejs`, `maxDuration=60`) | XLSX only; no PDF package workflow (deliberate non-goal). |
| Notifications/email | Implemented infrastructure | `src/features/notifications/`, `src/lib/email/`, Resend webhook route | Support/monitoring readiness (B7) remains a launch blocker. |
| AI Ask | Implemented but default-off | `src/app/api/ai/ask/`, `src/lib/ai/deepseek.ts`, `src/lib/ai/feature-flags.ts` | DeepSeek provider; requires provider config; gated for closed beta. |
| AI Package Builder | Implemented but default-off | `src/app/api/ai/package-builder/`, `src/lib/ai/package-builder/` | Needs rate-limit work (C1) before enabling. |
| Validation browser/visual proof | Available, opt-in | `playwright.config.ts`, project proof scripts | Not a default gate for docs or minor UI edits. |
| Wider external beta | No-go by current audit | launch-readiness audit pack | B1–B9 and V1–V2 must close or be explicitly owner-accepted. |
| Public self-serve release | No-go by current audit | launch-readiness decision register | Requires C1 plus legal, provider evidence, support/monitoring, CI, and owner go/no-go. |

## Architecture Overview

Archestimator is a Next.js 16 App Router application on React 19 and TypeScript, run with Bun scripts and Tailwind v4/PostCSS styling. The app uses React Server Components, server actions, API route handlers, and client components where interaction requires browser state.

The backend is Supabase/Postgres, with generated TypeScript types in `src/lib/supabase/types.ts`, environment/client separation in `src/lib/supabase/`, migrations in `supabase/migrations/`, and an explicit Archestimator-only provider boundary (Supabase project `ebxxqidacheyapmmzavr`) recorded in `AGENTS.md` and `.ai/10_state/current-state.md`.

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
- DeepSeek (server-side) as the LLM for AI Ask and Package Builder.
- Google Maps JavaScript API + Google Places (dynamically loaded, no npm package) for the project-location map and address autocomplete.
- Vercel Analytics in the app shell, with consent caveats (V2) in launch-readiness docs.
- D3 for chart/data visualization work.
- Storybook 10 as a fixture-first design/component review surface.
- Vitest, Testing Library, Bun unit tests, and Playwright for proportional validation.

### Key RPCs And Query Patterns

The performance story is RPC-driven: aggregate work is pushed into Postgres functions instead of N+1 JS folds, and TanStack Query keys are invalidated per repository boundary on mutation (optimistic `onMutate` + `invalidateQueries`). Load-bearing RPCs:

- `project_estimate_list_summaries` — per-estimate node/row counts plus `total_cost` in one call (replaces an N+1 JS fold; powers the recent-estimate cost strip).
- `workspace_homebase_summary` — workshop dashboard rollup (gated by `WORKSHOP_HOMEBASE_SUMMARY_RPC_ENABLED`).
- `reorder_estimate_nodes`, `insert_estimate_subtree(_into_estimate_with_history)`, and the atomic estimate-node move RPCs — server-side tree mutations under RLS.

Source anchors: `supabase/migrations/20260613201251_project_estimate_list_summaries_rpc.sql`, `supabase/migrations/20260618184856_workspace_homebase_summary.sql`, `supabase/migrations/20260520171544_reorder_estimate_nodes_rpc.sql`, `supabase/migrations/20260613134852_insert_estimate_subtree_rpc.sql`, `supabase/migrations/20260520052009_atomic_estimate_node_moves.sql`.

### CI And Deploy Topology

- CI is a GitHub Actions workflow (`.github/workflows/ci.yml`) on PR and push, running `bun run validate` (type-check + lint + design-system lint + design audit + Bun unit + Vitest DOM), `bun run build`, a Playwright Chromium e2e smoke, and a route-transition performance smoke.
- **Vercel auto-deploy is disabled** (`vercel.json` `deploymentEnabled: false`); production deploys are manual.
- CI is currently known-red on `main` for pre-existing reasons (B1/B2; see `.ai/10_state/current-state.md`), which is why it is not yet a trustworthy release gate.

Source anchors: `package.json`, `.github/workflows/ci.yml`, `vercel.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `src/lib/supabase/`, `supabase/config.toml`, `supabase/migrations/`.

## Data Model And Boundaries

The central product hierarchy is:

`workspace -> project -> estimate -> estimate tab / estimate node tree (user-facing Areas) -> estimate row items`

Related domains attach to that hierarchy:

- Component library: reusable components, taxonomy/category nodes, suppliers, images, attachments, project-specific components, and template sources.
- Templates: reusable estimate outlines and project-source insert structures.
- Collaboration: project members, estimate/sheet access settings, invitations, realtime identity/presence/cursors.
- Publication: shared links, published snapshots, token/session/password handling, public comments, decisions, events, and unsubscribe records.
- Activity/audit: estimate events (`estimate_sheet_events`), AI audit metadata, notification delivery data, project activity summaries.
- Project images: private WebP full/thumbnail objects served through `/api/projects/images` with authenticated project/workspace checks and private cache behavior for not-found/error paths.
- Project location: private exact coordinates plus geocoder metadata (formatted address, place_id), readable per `can_edit_project()` (see Projects section).

Indexing/perf boundaries (representative): `estimate_row_items(estimate_id, node_id, sort_order)` composite read index; workspace/project list-ordering indexes (`20260520051908_optimize_workspace_estimate_list_indexes.sql`); estimate-tree ordering indexes on `(estimate_id/estimate_tab_id, parent_id, sort_order)`. Reads are written to lead with the indexed key (e.g. row-item reads lead with `estimate_id`).

Security and boundary rules:

- Supabase work is bounded to the configured Archestimator Supabase project `ebxxqidacheyapmmzavr` recorded in `AGENTS.md` and current-state. Do not apply DB changes to unrelated provider projects.
- RLS and RPC/server-action guards are required authorization boundaries; coverage must be verified per table/route before release claims. Browser clients should not be treated as trusted for authorization.
- Service-role/admin clients belong on server-only paths.
- Shared-link recipients should receive only the published/shared surface, not workshop-only private data.
- Private project image route URLs should not be copied into shared links, exports, or public pages. Publication code must snapshot only sanitized/allowlisted public image values when it displays proposal imagery.
- Exact project locations are private (`can_edit_project()` scope) and should stay out of shared links, exports, and AI context unless the source changes.
- AI routes must require authenticated Supabase account context and remain feature-gated by default.
- No secrets, raw provider credentials, private session state, `.omx`, `.omo`, `.gitnexus`, or local machine artifacts belong in durable corpus content.

Source anchors: `src/lib/supabase/`, `src/lib/repositories/`, `src/lib/publication/`, `src/lib/collaboration/`, `src/lib/ai/`, `supabase/migrations/`, `.ai/06_specs/state-and-supabase-foundation.md`, `.ai/06_specs/shared-link-and-publication-spec.md`.

## Design And UX System

Archestimator's product personality is precise, architectural, understated, and professional. It should avoid construction cliches and generic decorative dashboards in the authenticated app.

The default workshop design is compact premium SaaS:

- SF Pro/system font stack for app surfaces.
- Neutral ink palette with thin borders and dense information layout.
- Small type, generally 8–12px in app chrome and controls unless a named design exception applies.
- Radius scale: 3px (`--radius-xs`) for inner controls, 8px (`--glass-nav-radius`) for chrome pills, 12px (`--glass-radius`) for floating surfaces.
- 1px-outline icon style, primarily Phosphor where used by the product system.
- Full-browser workspace composition rather than centered marketing-card layouts.
- Explicit status, financial, and workflow state cues; do not rely on color alone.

**Brand orange is resolved, not a tension.** Signal orange is the active primary brand token — `--brand-orange: #F24405` and `--brand-orange-dark: #C63804` (Signal×0.82, ~5.3:1 on white) — per the **2026-06-19 owner directive recorded in `src/app/globals.css`**, which supersedes the older campaign-only/clay (`#AA412A`) rule. The two-tone family exists because `#F24405` is mid-luminance (~3.75:1) and needs `--brand-orange-dark` for small text/icons on light backgrounds. `DESIGN.md` still carries a residual "orange is landing-only" rule that predates the directive; per the reading rules, the `globals.css` directive wins.

The public site can be more editorial and brand-forward. The authenticated workshop should remain compact, task-first, and scannable. The workshop dashboard is a named exploratory exception using bento/glass/warm visual language and different display/numeric treatment: dashboard display headline font is **Doto** (`--font-display`) and numeric/codes font is **Roboto Mono** (`--font-numeric`), loaded in `src/app/layout.tsx` and path-scoped (app surfaces stay on SF Pro). Note: `--glass-bg-sidebar`/`--on-rail` and Inter/Source Serif 4 are defined/specified but not currently loaded/applied — do not treat them as shipped.

Chart marks use the **Okabe-Ito** colorblind-safe 8-color palette as the named exception to orange-brand-only (`src/lib/project-charts/bucket-color.ts`). Chart accessibility pattern: SVG `role="img"` + `aria-describedby` to a data table, with an ~11px text floor for chart text.

Accessibility posture is explicit but pragmatic: semantic regions, focus rings, keyboardable tabs/menus, status/live regions, reduced-motion and reduced-transparency fallbacks, non-color-only status, and screen-reader alternatives for chart data. Note the desktop-only constraint: there is no mobile workshop navigation today (sidebar `hidden lg:flex`).

Source anchors: `DESIGN.md`, `src/app/globals.css`, `src/app/layout.tsx`, `src/lib/project-charts/bucket-color.ts`, `src/components/ui/`, `src/components/workshop/`, `src/components/sidebar/`, `src/stories/`.

## Operations And Environments

Local/default commands are Bun-first:

- `bun run dev` for local Next development.
- `bun run type-check` for TypeScript.
- `bun run lint` and design lint scripts for static checks.
- `bun run test` for Bun unit tests.
- `bun run test:dom` for Vitest DOM tests.
- `bun run test:e2e` for Playwright.
- `bun run validate` for the aggregate gate, with current-state caveats.
- `bun run gen:types` to regenerate Supabase types for the configured Archestimator Supabase project (note: `types.ts` carries a hand-added export and RPC drift — splice new tables additively rather than overwriting wholesale).

Provider/tooling posture:

- Supabase/Postgres is active and authorized for Archestimator pre-launch MVP work inside the configured Archestimator project `ebxxqidacheyapmmzavr` only.
- Closed-beta cost posture keeps PITR disabled unless explicitly reapproved.
- Vercel deployment is manual (auto-deploy disabled); Vercel deployment evidence, Resend readiness, Google Maps provider readiness, browser proof, and provider proof are separate from local source presence.
- Full `bun run validate` is currently known red/noisy on `main` for pre-existing reasons (B1/B2) recorded in `.ai/10_state/current-state.md`; use targeted validation for narrow docs/source changes.

### Feature Flags And Environment Variables

The full source-cited inventory of every runtime env var and feature flag lives in the companion doc **`.ai/00_corpus/feature-flag-and-env-inventory.md`** (kept separate so this corpus does not carry — and re-stale — that volatile detail). Headlines: AI is gated by `ARCHESTIMATOR_AI_ENABLED` (server) + `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` (client) and requires `DEEPSEEK_API_KEY`/`DEEPSEEK_MODEL`; the map requires a `GOOGLE_MAPS_API_KEY`/`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (+ optional `*_MAP_ID`); collaboration cursor broadcast defaults on while project cursors/follow mode default off; `.env.example` is incomplete (missing at least `GOOGLE_MAPS_API_KEY`, `DEEPSEEK_API_KEY`, and `WORKSHOP_HOMEBASE_SUMMARY_RPC_ENABLED`). Source anchors: `src/lib/ai/feature-flags.ts`, `src/lib/collaboration/feature-flags.ts`, `src/lib/ai/deepseek.ts`, `src/lib/google-maps/loader.ts`, `src/app/workshop/projects/[projectId]/page.tsx`.

Source anchors: `package.json`, `.ai/10_state/current-state.md`, `AGENTS.md`, `.ai/00_system/VALIDATION_MATRIX.md`.

## Validation State

The repo has validation surfaces for TypeScript, ESLint, design-system linting, Bun unit tests, Vitest DOM tests, Playwright browser tests, Storybook checks, Supabase type generation, provider-readiness scripts, and domain-specific proof scripts. CI (`.github/workflows/ci.yml`) orchestrates `validate` + `build` + e2e smoke + perf smoke.

Current-state records that full `bun run validate` is known red/noisy on `main` for pre-existing reasons (B1/B2), so current work usually uses targeted evidence unless a broader release/security/auth/data-integrity risk requires the aggregate gate. This corpus changes no runtime behavior; its proof surface is source coverage, artifact shape, and absence of stale or unsupported claims (see the anchor-existence sweep in the Corpus Maintenance Protocol).

## Current Gaps And Risks

The latest launch-readiness audit says owner-only closed beta is the current production posture, but wider external beta and public self-serve exposure remain blocked.

Current hard/verification/conditional risk classes include:

- CI/validation posture is not ready as a broad release gate (B1/B2).
- Root error/not-found/global-error and durable error/log sink gaps remain (B3/B4).
- Closed-beta gate has fail-open risk if environment configuration is absent (B5).
- Migration-ledger/schema drift exists, including project-location/activity migration `20260619105250` remote-history drift; a runtime schema-drift guard degrades the dashboard to empty activity / no pin when the migration is absent (B6).
- Support, uptime, incident, and monitoring evidence is not sufficient for wider external users (B7).
- Account deletion and legal/privacy copy have promise-vs-capability gaps (B8/B9).
- Realtime rate-limit ceiling needs proof (V1).
- Public-route analytics consent path needs a decision/proof (V2).
- AI Package Builder rate limiting is a conditional hard blocker before AI is enabled (C1).
- **Google Maps Platform (billed) third-party dependency.** Project-location maps now depend on Google Maps Platform. Open provider-readiness items: API-key restriction, domain restriction, budget alerts, quota caps, missing/disabled-key fallback (present), and Google branding/attribution proof. Geocoding must be one-time on save (persist formatted address + place_id + lat/lng) and never per view; do not add public Nominatim autocomplete or bulk geocoding.
- Share-password lockout is in-memory/per-instance and not multi-instance-safe.

Product/UX gaps recorded in current specs include:

- The old single-pointer Move modal/button remains removed; current movement is the drag/drop reorder path.
- Some component-library raw controls still need shared primitive cleanup.
- Some empty-node/sidebar drop-into and mixed-create QA follow-ups remain recorded around the single-node estimate tree.
- Workspace-level collaboration management is not the current implemented scope.
- Follow mode and project-wide page cursors are deferred/off.
- No mobile workshop navigation (desktop-only).
- Some provider/browser/manual evidence remains deferred for current branches.

Source anchors: `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/01-MASTER-INDEX.md`, `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/03-LAUNCH-GATE-DECISION-REGISTER.md`, `.ai/06_specs/current-project-estimates-component-library-spec.md`, `.ai/06_specs/teamspaces-collaboration-spec.md`, `.ai/10_state/current-state.md`.

## Corpus Maintenance Protocol

This corpus is only as trustworthy as its freshness. The map-provider drift that an earlier revision missed for ~1 day (a whole subsystem's provider swapped while the prose stayed put) is the canonical failure mode; this protocol exists to catch the next one.

**Volatility map** (verify against HEAD before acting on these; they rot fastest):

- **VOLATILE:** project dashboard, project location/map (provider + flags), project groups/favorites, dashboard cost-strip/budget-health overlays, feature-flag defaults.
- **SEMI-STABLE:** estimate-tree internals, collaboration flags, AI gating, design tokens.
- **STABLE:** proposal XLSX export, auth/session model, the core data-model hierarchy, the role taxonomy, framework/library versions, the privacy invariants.

**Re-verification triggers** — repair this corpus when any of these happen: a provider swap (map/LLM/email/analytics); a new migration touching a table this corpus describes; a feature flag added/removed/default-changed; a route added/removed/redirected; a design-token owner directive; an operating-stage or launch-gate change; or any merge of currently-dirty dashboard work.

**Anchor-existence sweep** (run before claiming the corpus is fresh; should print nothing):

```bash
rg -o '`[A-Za-z0-9_./\[\]-]+`' .ai/00_corpus/archestimator-app-bible.md \
  | tr -d '`' | rg '/' | rg -v '^/' | sort -u \
  | while read -r p; do [ -e "${p%%:*}" ] || echo "DEAD ANCHOR: $p"; done
```

**Staleness tripwires.** The strings `maplibre`, `openfreemap`, `tiles.openfreemap.org`, `location-map-config`, and `NEXT_PUBLIC_PROJECT_LOCATION_MAP_ENABLED` describe the removed tile-map stack and must not appear in any *claim* (they may appear only inside this protocol), and the verified-stamp must never read `2026-06-19` or older. The check scans only the claim region — everything above this protocol — so it ignores the intentional mentions here:

```bash
sed '/^## Corpus Maintenance Protocol/,$d' .ai/00_corpus/archestimator-app-bible.md \
  | rg -ni 'maplibre|openfreemap|location-map-config|NEXT_PUBLIC_PROJECT_LOCATION_MAP_ENABLED|Last verified: 2026-06-19'
# must print nothing
```

**Sign-off rule.** A revision is "done" only when every changed claim is confirmable by opening a single cited source file, the anchor sweep is clean, and the tripwire check above prints nothing.

## Source Map

Use these sources to repair this corpus when the app changes:

| Domain | Primary sources |
| --- | --- |
| Current truth and recent work | `.ai/10_state/current-state.md`, `.ai/10_state/decisions.md` by targeted search |
| Product, strategy, and roadmap | `PRODUCT.md`, `README.md`, `.ai/README.md`, `.ai/01_roadmap/README.md`, `.ai/01_roadmap/17-personas-jobs-to-be-done.md`, `.ai/01_roadmap/19-feature-adoption-success-metrics.md` |
| Feature inventory | `.ai/06_specs/feature-inventory.md`, `.ai/06_specs/current-project-estimates-component-library-spec.md`, `.ai/06_specs/live-project-estimate-bootstrap.md` |
| Environment & feature flags | `.ai/00_corpus/feature-flag-and-env-inventory.md`, `src/lib/ai/feature-flags.ts`, `src/lib/collaboration/feature-flags.ts`, `.env.example` |
| Architecture | `.ai/06_specs/deep/architecture-overview.md`, `.ai/06_specs/state-and-supabase-foundation.md`, `package.json`, `next.config.ts`, `vercel.json`, `.github/workflows/ci.yml`, `src/app/`, `src/lib/` |
| Auth/Supabase | `.ai/06_specs/supabase-auth-setup.md`, `src/lib/auth/`, `src/lib/supabase/`, `supabase/migrations/`, `src/lib/supabase/types.ts` |
| Collaboration | `.ai/06_specs/teamspaces-collaboration-spec.md`, `src/lib/collaboration/`, `src/app/invite/[token]/` |
| Publication/share | `.ai/06_specs/shared-link-and-publication-spec.md`, `src/lib/publication/`, `src/app/share/[token]/`, `src/app/api/share/[token]/` |
| Proposal/export | `.ai/06_specs/proposal-package-system.md`, `src/lib/proposal-export/`, export API route |
| AI | `.ai/06_specs/ai-assistant-and-package-builder-spec.md`, `src/lib/ai/`, `src/lib/ai/deepseek.ts`, `src/app/api/ai/` |
| Maps/location | `src/lib/google-maps/loader.ts`, `src/components/workshop/ProjectLocationMap.tsx`, `src/components/workshop/ProjectAddressAutocomplete.tsx`, `src/lib/repositories/project-location-repository.ts` |
| Design | `DESIGN.md`, `src/app/globals.css`, `src/app/layout.tsx`, `src/lib/project-charts/bucket-color.ts`, `src/components/ui/`, `src/components/workshop/`, `src/stories/` |
| Launch readiness & gates | `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/` (`01-MASTER-INDEX.md`, `03-LAUNCH-GATE-DECISION-REGISTER.md`) |
| Validation | `.ai/00_system/VALIDATION_MATRIX.md`, `.github/workflows/ci.yml`, `package.json`, `tests/`, `playwright.config.ts`, `vitest.config.ts` |
