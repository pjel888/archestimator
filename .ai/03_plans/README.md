# Plans

This folder contains historical and future implementation plans.

## Active status

The canonical current state is `.ai/10_state/current-state.md`.

Archestimator is no longer at the completely blank `/workshop` reset snapshot. The repo currently contains a small post-reset workshop route slice. Older plans in this folder that describe the rejected full prototype, local-first MVP, proposal/revision system, Glide migration, or broad workshop route family are historical context only unless a current plan explicitly reactivates a narrow piece.

Current planning baseline:

- `/` landing page is preserved.
- `/workshop`, `/workshop/projects`, `/workshop/library`, and `/workshop/templates` route slices exist in `src/app`; `/workshop/components` is a redirect to `/workshop/library`.
- The deleted full prototype remains superseded.
- Future work must be route-scoped, screen-scoped, and easy to delete if Philip rejects it.

Active/current plan:

- `.ai/03_plans/current-post-reset-workshop-slice.md` — historical orientation plan for the early workshop/projects/components route slice; current component-library route truth is `/workshop/library` plus `/workshop/templates`.
- `.ai/03_plans/component-category-library-taxonomy/` — active taxonomy research artifact for the `/workshop/library` category tree, supplier/category tabs, component metadata facets, standards crosswalks, and future custom-component organization.
- `.ai/03_plans/landing-page-improvement/` — active public `/` landing-page improvement plan; replaces the archived Intercom/v4 broad plan and starts from current source inventory. Current pass locks the accepted hero, preserves the placeholder-safe full-width light company carousel immediately after the hero, keeps Lenis landing-only smooth scrolling, focuses remaining content with Tailwind containers, uses brand-source synthesis, and now adds Kimi K2.6 frontend-design delegation plus functional-tabs/IntersectionObserver readiness planning with no new animation packages.
- `.ai/03_plans/project-estimates-component-library-improvement-plan.md` — research-backed UX/UI improvement plan for the current project estimate workspace and connected Component Library feature.
- `.ai/03_plans/workshop-library-component-creation-versioning/` — active readiness pack for persisted Add Component on `/workshop/library`, including Supabase component shape, modal UX, pricing options, component lifecycle state, version history, blast radius, and QA gates.
- `.ai/03_plans/component-variant-assets-and-cost-history/` — implemented follow-on pack for Add Component variant-owned measurement layout, per-variant/shared images, PDF/Excel attachments, and selectable dated cost entries.
- `.ai/03_plans/estimate-sheet-version-control/` — implemented Activity-first estimate sheet and row-level history pack for `/workshop/projects/[projectId]/estimates/[nodeId]`. Current UX is sheet `Activity` plus row details `Version History`; named sheet version, compare, and restore-as-copy artifacts exist only as dormant DB compatibility residue unless a future proposal/export snapshot plan revives them.
- `.ai/03_plans/industry-standard-excel-proposal-export/` — active research and implementation plan for contractor-standard consolidated Excel proposal export, read-only preview, ExcelJS package choice, and room/area source-breakdown traceability.
- `.ai/03_plans/ui-componentization-and-storybook-plan.md` — active UI component matrix, reusable-primitive pipeline, and Storybook organization plan.
- `.ai/03_plans/estimate-tree-dnd-reorganization/` — audit, React Complex Tree API guide, implementation plan, and QA strategy for seamless live estimate-tree drag/drop reorganization.

Archived closeout / superseded plans:

- `.ai/09_archive/store/2026-05-21-estimate-tree-dnd-reorganization-complete/` — completed audit, React Complex Tree API guide, implementation plan, QA strategy, and closeout evidence for seamless live estimate-tree drag/drop reorganization.
- `.ai/09_archive/store/2026-05-21-shadcn-context-menu-integration-complete/` — completed first shadcn/Radix integration closeout for estimate tree Group/Area row right-click Rename/Delete, inline optimistic rename, confirmed optimistic delete, route repair, shared action-menu foundation, and state-first rollback hardening.
- `.ai/09_archive/store/2026-05-21-estimate-component-library-sidebar-audit-complete/` — completed P0-P4 closeout for the live estimate Component Library sidebar audit, including target-aware insertion, command palette, assemblies/templates, bulk actions, import/export, keyboard navigation, native card buttons, and verification evidence.
- `.ai/09_archive/store/2026-05-21-workshop-components-library-ux-ui-complete/` — completed `/workshop/components` global manager plan pack and implementation evidence for the read-only seed-backed dense table, facets, price-health views, and inspector slice. Future persistence/CRUD remains deferred until the server action and schema boundary is explicitly approved.
- `.ai/09_archive/store/2026-05-21-workshop-components-library-redesign-complete/` — completed replacement `/workshop/components` redesign plan and implementation evidence for the estimate-workspace mirror: left category/supplier tree, center custom-component sheet, no right sidebar, no tree drag/drop/reorder, mobile component cards, classification helpers, Visual Verdict artifacts, and validation closeout.
- `.ai/09_archive/store/2026-05-21-intercom-v4-ui-ux-improvement-plan-superseded/` — superseded broad Intercom/v4 UI/UX plan; historical context only, replaced for landing work by `.ai/03_plans/landing-page-improvement/`.
- `.ai/09_archive/store/2026-05-21-implemented-plan-cleanup/` — implemented loose historical plans moved out of `.ai/03_plans` after the 2026-05-21 plan inventory cleanup. Includes pre-reset local MVP, proposal, Glide/dnd-kit spike, and completed estimate-tree stability planning files.
- `.ai/09_archive/store/2026-05-27-sign-up-login-authentication-local-implementation-evidence/` — completed local Sign Up / Log In implementation and evidence pack for canonical `/login`, `/auth/callback`, passwordless Google/email auth UI, safe redirects, optional profile/workspace settings, stale onboarding redirect, auth-account migration, account-security audit, storage/API boundary tests, runbooks, and launch go/no-go records. Remaining Supabase dashboard, Google Cloud, Vercel, legal/privacy, QA, support, owner, and provider evidence stays active in the roadmap/pre-launch gates.
- `.ai/09_archive/store/2026-05-27-project-workspace-invite-entry-complete/` — completed project workspace invite-entry plan and evidence for `/invite/[token]`, signed pending-invite `/workshop` bridge, linked Supabase invite-token migration/RPC grants, Teamspaces invite URL issuing/copying, `/workshop/projects` shared-member labeling, browser E2E, and validation closeout. Remaining provider/legal/Vercel/support launch evidence stays in the auth/pre-launch roadmap.
- `.ai/09_archive/store/2026-05-27-project-client-publication-complete/` — completed V1 project client publication implementation and evidence for project-header `Public link`, `/share/[token]`, optional password access, public-link/new-link/revoke/update manager actions, metadata-only open tracking, linked Supabase migration `20260527120000`, focused tests, full validation/build, and authenticated manager browser proof. Remaining Privacy/Terms, broad dirty-worktree release review, and future PDF/download artifacts stay in the roadmap.

Read first before planning new work:

1. `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`
2. `.ai/10_state/current-state.md`
3. `.ai/10_state/decisions.md`
4. `.ai/10_state/known-issues.md`
5. `.ai/03_plans/current-post-reset-workshop-slice.md`
6. `.ai/03_plans/project-estimates-component-library-improvement-plan.md`
7. `.ai/03_plans/ui-componentization-and-storybook-plan.md`
8. `.ai/09_archive/store/2026-05-21-estimate-tree-dnd-reorganization-complete/README.md`
9. `.ai/03_plans/estimate-tree-dnd-reorganization/README.md` (historical planning context; current implementation truth is the archived closeout above)
10. `.ai/02_audits/2026-05-17-reset-cleanup-audit.md`
11. `.ai/06_specs/restart-guardrails.md`

## Rules for new plans

A new plan must state:

- exact user job;
- route/screen affected;
- non-goals;
- files expected to change;
- validation gate;
- deletion criteria if Philip rejects the direction.

Do not create broad route families, dashboards, proposal systems, component libraries, grids, or persistence layers without explicit approval in the plan.

## Superseded historical plans

Remaining older plans in this folder may still mention Glide, proposal grouping, or broad MVP definition work. Treat them as proposed or incomplete historical context only unless a future plan explicitly reactivates a specific piece.
