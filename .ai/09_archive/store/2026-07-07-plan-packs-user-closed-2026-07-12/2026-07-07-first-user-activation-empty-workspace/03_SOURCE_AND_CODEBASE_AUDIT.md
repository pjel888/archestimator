# 03 — Source and Codebase Audit

Evidence-grounded map of every surface the activation ladder touches. All paths repo-relative unless noted. "State" = current behavior; "Impact" = required change / verification only / explicitly unaffected.

## 3.1 Auth, beta entry, and the first `/workshop` landing

| Path | Symbol | Current responsibility | Relevance / Impact |
|---|---|---|---|
| `src/app/signup/page.tsx` | `SignupPage` | Renders `<ClosedBetaGate>` request-access gate; no self-serve form. | **Beta entry rung.** Verification only — activation begins after this. Do not add a wizard here. |
| `src/lib/auth/closed-beta-access.ts` | `getClosedBetaAccessForEmail` | Allowlist gate, env-toggled by `CLOSED_BETA_ACCESS_ENABLED`. | Verification only. |
| `src/lib/auth/closed-beta-d1-store.ts` | `getClosedBetaAccessFromD1` | Reads `closed_beta_allowed_emails`; `revoked` → `/access-required`. | Verification only. |
| `src/lib/auth/actions.ts` | `signInWithEmail`, `signInWithGoogle` | Better Auth magic-link + Google; `callbackURL` = `resolvePostAuthDestination(next)`. | Verification only — post-auth destination already `/workshop`. |
| `src/lib/auth/redirects.ts:1` | `DEFAULT_AUTH_DESTINATION = "/workshop"` | Post-login target. | **Load-bearing.** The welcome surface lives at `/workshop`, not a new route. |
| `src/lib/auth/account-setup.ts:7` | `resolvePostAuthDestination` | Returns `/workshop`; preserves `/workshop/pending-invite`. | Verification only. |
| `src/proxy.ts` → `src/lib/auth/request-proxy.ts` | `proxy()` | `PROTECTED_PREFIXES=["/workshop"]`; unauth → `/login?next=…`. | Verification only. |
| `src/app/workshop/layout.tsx` | `WorkshopLayout` | Enforces protected-route + terms-acceptance gate; redirects to `/workshop/terms` if required. | Verification only — terms gate is correct; welcome surface renders after it. |
| `src/app/workshop/page.tsx` | `WorkshopPage` (async RSC) | Server-fetches homebase via `getWorkshopHomebaseData()` → **`getWorkshopHomebaseDataAppPath()`** (`workspace-repository.ts:1776/2129`), a single `Promise.all` wave of 6 reads (`projectFavoriteRows`, `estimateFavoriteRows`, `recentProjects`, `projectMembers`, `sheetMembers`, `workspaceMembership` at L2140). Renders `WorkshopPageShell` > `WorkshopHomebaseClient` > `WorkshopDashboard`; bridges pending-invite cookie. **Note:** `getWorkshopHomebaseDataRpcPath()` (L2125) is disabled (`return null`) and gated behind the unset `WORKSHOP_HOMEBASE_SUMMARY_RPC_ENABLED`; its SQL lives in the off-limits `supabase/migrations/20260618184856_workspace_homebase_summary.sql`. | **Required change.** Append the milestone read as a 7th parallel arm in the `Promise.all` at L2140; add the `activationMilestones`/`firstRun` fields to `WorkshopHomebaseData` (L296, `projects` field at L298). When `homebase.projects.length === 0` and not dismissed, render the welcome surface above the bento. |
| `src/app/workshop/loading.tsx` | `Loading` | Dashboard skeleton mirroring bento. | Probable change — add a lightweight welcome-surface skeleton to avoid layout shift. |
| `src/app/workshop/onboarding/page.tsx` | `WorkshopOnboardingPage` | `redirect("/workshop/settings")`. | **Explicitly unaffected.** Per owner decision it must remain a compatibility redirect; do not build the tour here. |
| `src/lib/repositories/workspace-repository.ts` (~`ensureDefaultWorkspace`) | `ensureDefaultWorkspace` | Lazily creates a personal workspace (`"My Archestimator Workspace"`) + `workspace_members` `owner` row on first protected-route access. | Probable change — this is the natural place to seed `workspace_activation_milestones` row 0 (`workspace_created`) and, if `OPEN-DEC-01` is accepted, offer the opt-in sample. |

## 3.2 Dashboard components (the empty-workspace surface)

| Path:Symbol | Current behavior | Impact |
|---|---|---|
| `src/components/workshop/dashboard/WorkshopDashboard.tsx:126` `WorkshopDashboard` | Full-bleed bento: Projects hero (count + published links), Components card (count or `—`), Templates `ImageDestinationCard`, `LibraryHubCard`, then desk of `FavoritesTree` + `RecentProjectsList` + `RecentSheetsList` + `ContinueCard`. **No empty state.** | **Required change.** Accept a `firstRun` flag/data; render `<WorkspaceWelcomePanel>` above the bento when `projectCount===0` and no dismissal milestone. |
| `src/components/workshop/dashboard/LibraryHubCard.tsx:72` `LibraryHubCard` | "New project" button (`setNewProjectOpen(true)` → `NewProjectModal`) always enabled; "New estimate sheet" button **disabled** when no project (`estimateTargetProject = recentProjects[0] ?? null`; tooltip/aria "Create a project first"/"New estimate sheet unavailable until a project exists", `:133-153`). | **Required change (minor).** The welcome panel's primary CTA should reuse the same `NewProjectModal` open path; ensure only one modal open state, not two. |
| `src/components/workshop/dashboard/LibraryHubCard.tsx:88` `createEstimateForLatestProject` | `createEstimateSheetDraft(recentProjects[0].id)` → `router.push(buildEstimateSheetHref(...))`. | Reuse — this is the "after first project, jump to first estimate" mechanism the welcome panel can lean on. |
| `src/components/workshop/dashboard/RecentProjectsList.tsx:37` `RecentProjectsList` | Renders `projects.slice(0,6)`; **no empty copy** (header only). | Verification only on dashboard; **required change** when rendered on `/workshop/projects` (see 3.3). |
| `src/components/workshop/dashboard/RecentSheetsList.tsx:39` `RecentSheetsList` | Same pattern for sheets; no empty copy. | Verification only on dashboard. |
| `src/components/workshop/dashboard/ContinueCard.tsx:25` `ContinueCard` | Returns `null` when no estimate (hidden for new users). | Explicitly unaffected. |
| `src/components/workshop/dashboard/lib.ts` | `pickContinueEstimate`, `estimateHref`, `formatShortDate`, types `WorkshopDashboardData`. | Probable change — extend `WorkshopDashboardData` with `activationMilestones` / `firstRun` fields. |

## 3.3 Projects list and project creation

| Path:Symbol | Current behavior | Impact |
|---|---|---|
| `src/app/workshop/projects/page.tsx` | Projects list page. | Verification only (route owner). |
| `src/components/workshop/projects-page-client.tsx:2953` | Search-only empty state (`data-project-search-empty-state` "No search results for {query}"). **No zero-projects empty state** — empty non-search grid renders no message/CTA. | **Required change.** Add a zero-projects `<EmptyState>` with primary CTA "Create your first project" (opens `NewProjectModal`) + secondary "Take a quick tour"/"Browse starter templates". |
| `src/components/workshop/NewProjectModal.tsx` | Dialog wrapping `NewProjectForm`. | Reuse — welcome panel + projects empty state both open this. |
| `src/components/workshop/NewProjectForm.tsx:176` `NewProjectForm` | Validates name → optimistic placeholder → `createProjectRecord(formData)` (`:283`) → optional location/image → **`createEstimateSheetDraft(project.id)`** (`:333`) → `router.refresh()` (`:336`). | **Load-bearing invariant.** Project creation auto-seeds the first empty estimate. The welcome panel's "Create your first project" CTA relies on this to advance the user to rung 2. |
| `src/lib/projects/actions.ts:774` `createProjectRecord`, `:833` `createProject` | D1 insert + `revalidatePath("/workshop/projects")`. | **Required change (small).** Emit `project_created` activation event; write `first_project_created_at` milestone (idempotent). |
| `src/lib/estimates/actions.ts:2334` `createEstimateSheetDraft` | Returns `{ row, estimateId, firstNodeId, sheetCode }`; no redirect; default name `{sheetCode} Estimate`. (Exact definition at line 2334; an earlier `:2301` reference pointed at an unrelated function and is corrected here.) | **Required change (small).** Emit `estimate_created` activation event; write `first_estimate_created_at` milestone (idempotent). |

## 3.4 Estimate editor — the "first area/template/line item" surface

| Path:Symbol | Current behavior | Impact |
|---|------|---|
| `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` (+ `loading.tsx`, `error.tsx`) | Estimate editor route. | Verification only. |
| `src/components/workshop/ProjectEstimatesClient.tsx:263,402` | `emptyMessage = hasActiveListFilter ? "No matching estimates" : "No estimates yet"` passed to the estimates table. | Already a per-project zero state. Verification only (connect to ladder copy). |
| Empty estimate tab affordance (asserted by `tests/vitest/estimate-empty-tab-state.test.tsx`) | "This tab is empty. Add an Area to start, or drag a template or project content here." + `Add Area` + `Browse templates` buttons for editors; read-only for viewers. | **Canonical "first area/template" surface — extend, don't rebuild.** Probable change: ensure the activation milestone `first_area_created`/`first_template_inserted` fires from `createEstimateNode` / `insertEstimateTemplateIntoEstimate`; ensure the empty-tab copy stays the source of truth. |
| `src/lib/estimates/actions.ts` `createEstimateNode`, `insertEstimateTemplateIntoEstimate`, `insertEstimateRowItemFromLibrary` | Tree-mutation actions. | **Required change (small).** Emit activation events + idempotent milestones for first area / first template insert / first line item. |
| `src/lib/component-library/estimate-templates.ts` `estimateTemplates` | In-code fixture templates incl. "Condo Fit-Out Starter" (Residential Rooms → Interior Fit-Out → Living + Dining → IKEA allowance rows). | **Reuse.** Closest existing "starter template"; the empty-tab "Browse templates" affordance already references this surface. `OPEN-DEC-01` may promote one fixture to an opt-in starter project. |
| `src/lib/estimates/actions.ts:1898` `createEstimateWithDefaultTree` | Seeded estimate path (diverges from `createEstimateSheetDraft` empty path). | **Document divergence; do not silently switch.** Recommend seeded path be offered only via explicit "start from template" choice. |

## 3.5 Cost library and templates (library surfaces)

| Path:Symbol | Current behavior | Impact |
|---|---|---|
| `src/app/workshop/library/page.tsx` → `src/components/workshop/library/overview/LibraryOverview.tsx` | **Intentionally empty** (`data-library-overview="empty"`); comment: cleared at owner's request. | **Required change (small).** When workspace has zero cost-library items, render a library-specific `<EmptyState>` ("Build your cost library" + "New component" + "Browse starter templates") instead of a blank overview. Respect the owner's "intentionally cleared" note — do not re-add overview content; add a first-run empty state only. |
| `src/app/workshop/library/components/` → `LibraryComponentsRoute` → `LibraryPageClient` | Components list. No dedicated first-run empty component found. | **Required change.** Add zero-components `<EmptyState>` with "New component" CTA (`/workshop/library/components?add=component`, matching `LibraryHubCard`). |
| `src/app/workshop/library/templates/` | Templates list, workspace-scoped (`getCurrentWorkspaceEstimateTemplatesSeed` → `estimate_templates WHERE workspace_id=?`). Empty for new workspace. | **Required change.** Add zero-templates `<EmptyState>` with "New template" + "Browse starter templates" CTAs. |
| `src/lib/component-library/actions.ts` `createCostLibraryComponent`, `createEstimateTemplate`, etc. | Library/template mutations. | **Required change (small).** Emit `component_created` / `template_created` activation events + milestones. |

## 3.6 Publishing — the terminal rung

| Path:Symbol | Current behavior | Impact |
|---|---|---|
| `src/app/workshop/publisher/page.tsx` → `PublisherRosterClient` | Workspace publications roster; `PublisherEmptyState` variants (`filtered`, `mobile`, `no-publications`: "No publishable projects / Projects you can manage will appear here once they are ready for shared pages."); `PublisherDisabledEmptyState` ("not in rollout"). | **Connect to ladder.** The `no-publications` variant should link the user back up the ladder ("Create or open a project → add estimates → publish"). Verification-only if copy already adequate; probable change to add ladder-aware secondary CTA. |
| `src/app/workshop/proposals/page.tsx` → `ProposalsPageClient` | Recipient proposals inbox; `ProposalsEmptyState` ("No proposals yet / Proposals sent to your signed-in email address will appear here"). | Verification only — this is the **receiver** side; not part of a creator's first-publish ladder. |
| `src/lib/publication/actions.ts:775` `createProjectPublication` | Builds snapshot, mints token, `/share/{token}` link via `replace_project_publication` D1 procedure; rejects zero estimates. | **Required change (small).** Emit `publication_created` activation event; write `first_publication_created_at` milestone (terminal rung). |
| `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` | Mutable XLSX export (Node runtime, `maxDuration=60`, rate-limited `checkProposalExportRateLimit`). | Verification only — already wired via `ProposalExportPreviewDialog` + `EstimateHeaderActions`. Activation ladder should surface "Export proposal (XLSX)" as the concrete first-publish affordance. |

## 3.7 Empty-state primitive and tour absence

| Path:Symbol | Current behavior | Impact |
|---|---|---|
| `src/components/ui/empty-state.tsx` `EmptyState({icon,title,description,action,className})` | Reusable empty-state shell (dashed border, muted surface, small text). Wired only into publisher/proposals today. | **Load-bearing reuse.** All new zero states in this pack extend this primitive; do not invent parallel components. |
| `react-joyride` / `driver.js` / `shepherd` / `intro.js` | **Not installed** (no tour dependency in `package.json`). | **Decision: do not add a tour library for closed beta.** Lightweight contextual hints + durable milestones replace a heavyweight tour. (Overrides stale Joyride plan.) |

## 3.8 Tests that constrain the design

| Test path | Asserts | Constraint it places on this plan |
|---|---|---|
| `tests/vitest/auth-onboarding-guard.test.ts` | Login lands on `/workshop`; `/workshop/onboarding?next=…` collapses to `/workshop`; invite bridge preserved. | **Must not introduce a required intake gate.** Welcome surface is dismissible/disappears once milestones exist. |
| `tests/vitest/estimate-empty-tab-state.test.tsx` | Empty tab renders "Add an Area … or drag a template …" + `Add Area` + `Browse templates` for editors; read-only for viewers. | **Must not regress this copy.** It is the canonical first-area affordance. |
| `tests/vitest/estimate-sheet-create-empty-tree.test.ts` | `createEstimateSheetDraft` creates estimate + default tab with **zero nodes**. | **Must not silently switch** the dashboard quick action to the seeded `createEstimateWithDefaultTree`. |
| `tests/vitest/workshop-dashboard-recent-favorites.test.tsx` | `RecentProjectsList`/`RecentSheetsList`/`FavoritesTree` star toggle, rollback, link targets. | Welcome panel must not break these — render above the bento, not inside these lists. |
| `tests/vitest/workshop-homebase-visibility.test.ts`, `…-summary-rpc-contract.test.ts` | Homebase summary payload contract + visibility fields. | Adding `activationMilestones`/`firstRun` to the payload must preserve the existing contract (additive only). |
| `e2e/workshop-library-demo-smoke.spec.ts` | Playwright, env-gated demo smoke of `/workshop/library` + templates. | Extends, not replaces; the empty-workspace e2e is a new sibling spec. |

## 3.9 Data model anchors (details in `07_DATA_DATABASE_API_NETWORK_PLAN.md`)

| Table | Defining migration | Role in ladder |
|---|---|---|
| `closed_beta_allowed_emails` | `0001_closed_beta_feedback.sql` | Beta entry gate. |
| `user` / `session` / `account` / `verification` | Better Auth D1 migration (evidence at `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/…schema.sql`) | Identity/session. |
| `profiles` | `0003_profiles.sql` (separate from Better Auth `user`) | App profile + `default_workspace_id` + platform role (default `member`). |
| `workspaces`, `workspace_members` | `0007_collaboration_invitations.sql` (+ `0030_workspace_owner_membership_backfill.sql`) | Tenant + ownership. |
| `legal_terms_acceptances` | `0002_legal_terms_acceptance.sql` | Terms clickwrap gate. |
| `projects`, `project_members` | `0007`, `0015`, `0016` | Rung 1. |
| `estimates`, `estimate_tabs` | `0007`, `0015`, `0021` | Rung 2. |
| `estimate_nodes`, `estimate_row_items` | `0015`, `0021`, `0025` | Rung 3 (areas + line items). |
| `cost_library_items` (+ `cost_library_item_*`, `library_folders`, `component_category_nodes`) | `0026`, `0028`, `0036`, `0037` | Rung 3 (cost library). |
| `estimate_templates` (+ nodes/rows) | `0024` | Rung 3 (templates). |
| `project_publications` (+ recipients/comments/responses/events) | `0014` | Rung 4 (publishable proposal). |

**New table proposed:** `workspace_activation_milestones` (workspace-scoped, one row per workspace, columns for `first_project_created_at`, `first_estimate_created_at`, `first_area_created_at`, `first_line_item_created_at`, `first_publication_created_at`, `welcome_dismissed_at`, `sample_opted_in_at`, plus `created_at`/`updated_at`). See `07_DATA_DATABASE_API_NETWORK_PLAN.md` for the blueprint.

## 3.10 Stale / superseded sources

| Source | Status | Why |
|---|---|---|
| `2026-06-03-react-joyride-onboarding-implementation-plan/` | **Superseded by this pack for the activation path.** | Targets Supabase persistence + a real `/workshop/onboarding` route; both now wrong. Its tour-registry + `data-tour` attribute design is noted but not adopted for closed beta (no tour library; product-led empty states instead). |
| `supabase/seed.sql`, `supabase/migrations/*` | Historical only (per `AGENTS.md`). | Do not run/extend as active remediation. |
| `data/local/seed.json` | Legacy local JSON data store. | Not loaded for authenticated D1 users. |
| `scripts/seed-performance-test-data.ts` | Perf-test generator. | Not a first-user starter seed. |

## 3.11 Document-impact matrix

| Document | Purpose | Affected by activation? | Update needed? |
|---|---|---|---|
| `.ai/01_roadmap/16-onboarding-activation-readiness.md` | 12-phase activation ladder + per-phase analytics events | Yes — this pack operationalizes it | After implementation: reconcile phase statuses + mark Required Analytics Events as emitted. |
| `.ai/06_specs/proposal-package-system.md` | XLSX + shared-link publication spec | Terminal rung references it | No spec change; ensure ladder surfaces the existing export. |
| `.ai/10_state/decisions.md` (2026-05-27 entry) | No required intake gate | Load-bearing for this pack | After implementation: append a decision entry recording the product-led activation approach + milestones table. |
| `.ai/10_state/known-issues.md` | First `/workshop` screen resolved; first export priority; immutable/PDF not implemented | Terminal rung boundary | After implementation: note activation ladder shipped; immutable/PDF still deferred. |
| `AGENTS.md` (Current stage) | "Preparing for first users" | Context | No change. |
