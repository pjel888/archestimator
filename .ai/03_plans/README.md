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

Active/current plans:

- `.ai/09_archive/store/2026-06-06-terms-and-conditions-sheet-implementation-complete/` — archived implemented planning pack for Terms and Conditions / Terms of Service sheet, versioned Terms acceptance, Supabase/RLS acceptance evidence, re-acceptance, legal-review handoff, and UI/auth/protected-route gating. Implementation has been completed on branch `codex/terms-and-conditions`; final Terms language still requires qualified legal review and must not claim absolute zero liability.
- `.ai/03_plans/2026-06-06-ui-component-optimization-componentization/` — refined docs-only planning pack for UI component optimization, tree-core componentization, share-tree MVP slicing, and future editable estimate-tree/sheet decomposition. **Implementers must read `CURRENT_CANONICAL_PLAN.md` and `README.md` first.** Refinement addressed the external audit gaps with plan metadata, measurement protocol, GitNexus/code-review graph blast-radius evidence, risk register, implementation matrix, route-transition deconfliction, API contracts, rollout strategy, owner sign-off gates, and handoff docs. No source code, dependencies, migrations, provider settings, secrets, or runtime configuration changed. MVP Phases 0-3 are the future implementation handoff; full editable-tree/performance work remains measurement- and owner-gated.
- `.ai/03_plans/database-indexing-and-query-performance/` — active database indexing and query-performance planning pack. **Planning pack created. No indexes implemented. No migrations created.** Exists to guide future DB indexing/query-performance work. Covers: estimate tree/editor, component library, collaboration invites, shared-link publication, AI audit logs, and future server-side search. BETA P0: query/index audit, migration parity, EXPLAIN protocol. BETA P1: candidate index migration draft (staging only). ENTERPRISE MVP: search/full-text index strategy. Do NOT treat this plan as implementation evidence.

Archived 2026-06-15 (plans-folder cleanup):

These plan packs were moved out of `.ai/03_plans/` into `.ai/09_archive/` on 2026-06-15 to declutter the active plans folder. Descriptions are preserved for history; paths now point at the archive.

- `.ai/09_archive/store/2026-06-15-Tree-And-Estimate-Sheet-Memoization/` — implemented memoization follow-up to the React/TanStack Virtual work. Source changes landed in `EstimateSheetContent`, `EstimateSheetBranch`, node-total/proposal-preview probes, `LibraryTree`, and `TemplateStructureTree`; focused performance, proposal preview, mixed-content, virtualization, tree, type-check, changed-file lint, and whitespace checks passed. See `.ai/05_logs/2026-06-15-tree-estimate-sheet-memoization-implementation.md` for implementation evidence.
- `.ai/09_archive/store/2026-06-14-React-TanStack-Virtual/` — implemented React/TanStack Virtual planning pack for default-on shared tree, estimate-branch, and estimate-row-table virtualization work. Follow-up memoization work is tracked in the archived 2026-06-15 memoization closeout above.
- `.ai/09_archive/2026-06-14-Estimate-Tree-Column-Improvement-Plan/` — docs-only audit/readiness pack for the **Estimate Master Column** (EMC = the middle column of the estimate sheet, `EstimateSheetContent`/`EstimateSheetBranch`). **Read `00-README.md` first.** Covers the four user asks (remove the "Own items" eyebrow, fix node/row spacing rhythm, fix the missing expand/collapse caret on rows-only nodes, and a 48-operation CRUD/interaction matrix) plus audit-surfaced defects (insert kind-gate P6 violation, the DBNET-1 committed-RPC drift **blocker**, missing `canEditEstimate` UI gating, a phantom row-reorder grip, and a destructive clear-on-failed-drag). 10 docs spanning UX/UI, performance, blast-radius, DB/network, feature-readiness, and a consolidated open-decisions register (OD-1..OD-19); both adversarial reviews passed (*ready-with-fixes*, applied). No source/migrations changed; implementation not started.
- `.ai/09_archive/2026-06-14-EMC-Performance-Optimization/` — docs-only Estimate Master Column performance planning pack.
- `.ai/09_archive/2026-06-14-Estimate-Sheet-Content-UI-Improvement-PLan/` — docs-only Estimate Sheet Content UI improvement planning pack.
- `.ai/09_archive/2026-06-14-Projects-Dashboard-UX-UI/` — docs-only Projects Dashboard UX/UI planning pack.
- `.ai/09_archive/2026-06-14-Templates-Panel-Projects-As-Templates-Performance/` — docs-only Templates Panel "projects as templates" performance planning pack.
- `.ai/09_archive/2026-06-14-Database-Migration-Check/` — docs-only database migration-check planning/evidence pack.
- `.ai/09_archive/2026-06-11-Unification-Plan-For-Components-And-Templates/` — docs-only unification plan for components and templates.
- `.ai/09_archive/2026-06-11-templates-panel-ux/` — docs-only templates panel UX planning pack.
- `.ai/09_archive/2026-06-11-Templates-Page-UX-UI-Audit/` — docs-only templates page UX/UI audit.
- `.ai/09_archive/2026-06-11-Library-Tree-UI-Replacement/` — docs-only library tree UI replacement planning pack.
- `.ai/09_archive/2026-06-11-Library-page-ux-and-ui-improvement/` — docs-only library page UX/UI improvement planning pack.
- `.ai/09_archive/2026-06-05-agentic-development-cicd-standardization/` — docs-only planning pack for future agentic development and CI/CD enforcement. Plans GitHub Actions restoration/hardening, PR/CODEOWNERS governance, GitHub branch protection/ruleset capability resolution, `codex/*`/`staging`/`main` branch model, and controlled Vercel staged deploy/promote release flow. No source/provider/GitHub/Vercel settings changed; implementation remains future work.
- `.ai/09_archive/2026-06-05-performance-and-speed/` — docs-only performance-and-speed planning pack.
- `.ai/09_archive/2026-06-04-archestimator-user-access-planning/` — docs-only user-access planning pack.
- `.ai/09_archive/2026-06-03-agentic-development-framework-rollout/` — completion pointer for the Agentic-Driven Development framework rollout. Phase 1A/1B are complete and archived at `.ai/09_archive/store/2026-06-03-agentic-development-framework-rollout/` with final status `PHASE_1A_COMPLETE_PHASE_1B_MIRRORED_ARCHIVED`, Phase 1A commit `539e32a`, and the Notion mirror at https://app.notion.com/p/3748e5dd822b8156a7f5f61da243579c. Global enforcement, GitHub rulesets, provider changes, and remaining closed-beta launch gates are separate future work.
- `.ai/09_archive/2026-06-06-notification-system/` — docs-only notification-system planning pack.
- `.ai/09_archive/2026-06-03-mass-deletion-projects-estimate-sheets-library-components.md` — mass-deletion planning note (projects / estimate sheets / library components).
- `.ai/09_archive/landing-page-improvement/` — public `/` landing-page improvement plan; replaced the archived Intercom/v4 broad plan and started from current source inventory. Locks the accepted hero, preserves the placeholder-safe full-width light company carousel immediately after the hero, keeps Lenis landing-only smooth scrolling, focuses remaining content with Tailwind containers, uses brand-source synthesis, and adds Kimi K2.6 frontend-design delegation plus functional-tabs/IntersectionObserver readiness planning with no new animation packages.
- `.ai/09_archive/2025-06-11-Landing-Page-Comprehensive-Improvement-Plan/` — broad comprehensive landing-page improvement planning pack.
- `.ai/09_archive/route-transition-performance-optimization/` — pre-implementation planning pack. **Implementers must read `CURRENT_CANONICAL_PLAN.md` first** — it supersedes conflicting legacy numbered docs. Includes performance audit (23 routes, 6 bottleneck categories), blast radius analysis, readiness assessment, implementation handoff, and benchmark protocols. Groundwork phase complete; remaining phases (prefetch wiring, code splitting, Suspense/error boundaries, proxy optimization) planned. Target: sub-100ms cold transitions, zero perceived lag, loading overlay relegated to safety net.
- `.ai/09_archive/ai-chatbot-agent-readiness/` — chatbot planning and context pack for local /api/ai/ask and /api/ai/package-builder routes.
- `.ai/09_archive/mvp-launch-readiness-2026-06-01/` — MVP launch-readiness planning pack.
- `.ai/09_archive/share-and-collaboration-implementation/` — combined share/collaboration implementation-readiness pack. **Analysis complete, implementation not started from this folder.** Consolidates the former collaboration/share audit and share-page UX maximization plan into one folder with a canonical implementation flow, source/conflict map, and validation handoff. Collaboration Invites remain config-blocked / non-functional until Supabase Auth email and invite env vars are proven; Shared Link is functional but needs production hardening; `/share/[token]` receiver UX is planning-ready for no-API layout slices. Do NOT treat this plan as evidence of implementation.

Archived closeout / superseded plans:

- `.ai/09_archive/store/2026-06-13-loop-engineering-mandate-and-research/` —
  implemented docs/governance plan pack that upgraded the
  agent/product-development mandate from prompt-by-prompt work toward
  agent-neutral loop-engineered development. Companion research note:
  `.ai/13_research/loop-engineering-agentic-product-development-2026-06-13.md`.
- `.ai/09_archive/store/2026-05-29-implemented-plan-cleanup/` — cleanup archive containing:
  - `current-post-reset-workshop-slice.md` — early workshop/projects/components route slice orientation.
  - `estimate-line-items-library-tree-plan.md` — planning for estimate line items and library tree integration.
  - `mvp-definition-plan.md` — early MVP definition, superseded by post-reset implementation.
  - `production-glide-workspace-migration-slice.md` — Glide workspace migration plan, superseded.
  - `production-model-space-proposal-bridge.md` — proposal bridge plan, superseded.
  - `project-estimates-component-library-improvement-plan.md` — UX/UI improvement plan for project estimates and Component Library integration.
  - `ui-componentization-and-storybook-plan.md` — UI component matrix and Storybook plan.
- `.ai/09_archive/store/2026-05-29-component-category-library-taxonomy-complete/` — completed taxonomy research and library tree organization plan.
- `.ai/09_archive/store/2026-05-29-component-library-identity-and-brand-view-complete/` — completed component identity cleanup and library brand views plan.
- `.ai/09_archive/store/2026-05-29-component-library-templates-complete/` — completed library/templates split and templates workspace plan.
- `.ai/09_archive/store/2026-05-29-component-library-variants-complete/` — completed price options and variant records database/UX plan.
- `.ai/09_archive/store/2026-05-29-component-variant-assets-and-cost-history-complete/` — completed variant cost history, image, and attachment details plan.
- `.ai/09_archive/store/2026-05-29-estimate-sheet-node-distinction-complete/` — completed Group Node vs Area Node distinction plan.
- `.ai/09_archive/store/2026-05-29-estimate-sheet-version-control-complete/` — completed Activity-first version history and sheet version control plan.
- `.ai/09_archive/store/2026-05-29-estimate-tree-dnd-reorganization-complete/` — completed React Complex Tree drag-and-drop reorganization plan.
- `.ai/09_archive/store/2026-05-29-industry-standard-excel-proposal-export-complete/` — completed ExcelJS proposal export plan.
- `.ai/09_archive/store/2026-05-29-lewis-residence-chart-demo-seed-complete/` — completed seed data migration plan.
- `.ai/09_archive/store/2026-05-29-project-charts-estimate-comparison-complete/` — completed comparison charts view plan.
- `.ai/09_archive/store/2026-05-29-project-shared-link-overhaul-complete/` — completed view-only shared link overhaul plan.
- `.ai/09_archive/store/2026-05-29-share-page-estimate-view-enhancement-complete/` — completed share page D3 donut, tabbed view, and tree reconstruction plan.
- `.ai/09_archive/store/2026-05-29-workshop-bento-favorites-complete/` — completed favorites shortcuts grid plan.
- `.ai/09_archive/store/2026-05-29-workshop-library-component-creation-versioning-complete/` — completed component creation persisted modal plan.
- `.ai/09_archive/store/2026-05-29-workshop-library-components-templates-split-complete/` — completed workspace routes split plan.
- `.ai/09_archive/store/2026-05-21-estimate-tree-dnd-reorganization-complete/` — completed audit, React Complex Tree API guide, implementation plan, QA strategy, and closeout evidence for seamless live estimate-tree drag/drop reorganization.
- `.ai/09_archive/store/2026-05-21-shadcn-context-menu-integration-complete/` — completed first shadcn/Radix integration closeout for estimate tree Group/Area row right-click Rename/Delete.
- `.ai/09_archive/store/2026-05-21-estimate-component-library-sidebar-audit-complete/` — completed P0-P4 closeout for the live estimate Component Library sidebar audit.
- `.ai/09_archive/store/2026-05-21-workshop-components-library-ux-ui-complete/` — completed `/workshop/components` global manager plan pack.
- `.ai/09_archive/store/2026-05-21-workshop-components-library-redesign-complete/` — completed replacement `/workshop/components` redesign plan.
- `.ai/09_archive/store/2026-05-21-intercom-v4-ui-ux-improvement-plan-superseded/` — superseded broad Intercom/v4 UI/UX plan.
- `.ai/09_archive/store/2026-05-21-implemented-plan-cleanup/` — implemented loose historical plans moved out of `.ai/03_plans` after the 2026-05-21 plan inventory cleanup.
- `.ai/09_archive/store/2026-05-27-sign-up-login-authentication-local-implementation-evidence/` — completed local Sign Up / Log In implementation and evidence pack.
- `.ai/09_archive/store/2026-05-27-project-workspace-invite-entry-complete/` — completed project workspace invite-entry plan and evidence.
- `.ai/09_archive/store/2026-05-27-project-client-publication-complete/` — completed V1 project client publication implementation.

Read first before planning new work:

1. `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`
2. `.ai/10_state/current-state.md`
3. `.ai/10_state/decisions.md`
4. `.ai/10_state/known-issues.md`
5. `.ai/02_audits/2026-05-17-reset-cleanup-audit.md`
6. `.ai/06_specs/restart-guardrails.md`
7. `.ai/09_archive/store/2026-05-29-estimate-tree-dnd-reorganization-complete/README.md`

## Rules for new plans

Advisor-generated plans, including `shadcn/improve` output, must be written as
dated plan packs under `.ai/03_plans/<YYYY-MM-DD>-<topic-slug>/`. Do not create
root `plans/` or parallel advisor backlogs for Archestimator.

A new plan must state:

- exact user job;
- route/screen affected;
- non-goals;
- files expected to change;
- validation gate;
- deletion criteria if Philip rejects the direction.
- loop surface selection when the work is non-trivial: direct, `ultrawork`,
  `ultragoal`, `omo:ulw-loop`, `autopilot`, `ultraqa`,
  `omo:ultraresearch`, `vercel:agent-browser`, or an agent-neutral equivalent;
- durable state/evidence path: `.ai` plan, `.ai/13_research` note,
  `.ai/05_logs` run log, `.omx`/`.omo` ledger, provider proof packet, or issue
  tracker link.

Do not create broad route families, dashboards, proposal systems, component libraries, grids, or persistence layers without explicit approval in the plan.

## Superseded historical plans

Remaining older plans in this folder may still mention Glide, proposal grouping, or broad MVP definition work. Treat them as proposed or incomplete historical context only unless a future plan explicitly reactivates a specific piece.
