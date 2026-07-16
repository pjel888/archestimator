- `.ai/09_archive/store/2026-07-12-Archestimator-Client-Portal-Audit-Plan-Pack-unresolved/` — archived by owner direction as `CANCELLED / INCOMPLETE / BOUNDARY`; its remaining live-cutover requirements are explicitly preserved in `ARCHIVE-DISPOSITION.md` and `LOOP_LEDGER.md`.
- `.ai/09_archive/store/2026-07-12-Publisher-Page-Audit-complete/` — archived completed Publisher audit; it is historical context only and does not certify the unresolved Client Portal cutover.
- `.ai/03_plans/2026-07-12/Archestimator-Admin-Founder-Homebase-Supplement-Plan-Pack/` — canonical active Admin Founder Homebase and Control Plane plan, conditionally ready with dependency-closed `UNIT-001`. It consolidates the July 11 Admin predecessor, starts at `13-IMPLEMENTATION-ROADMAP.md`, keeps advanced campaigns/providers/AI conditional, and uses `plan-pack.json` plus `LOOP_LEDGER.md` for status/resume.
- `.ai/09_archive/store/2026-07-12-Admin-Feature-Improvement-superseded/` — archived planning-only Admin predecessor after its useful correctness, identity, User 360, notification durability, security/privacy, migration, overlap, and provider-proof contracts were reconciled into the canonical Founder Homebase pack. Historical test commands and fixed staffing are not standing execution authority.
- `.ai/09_archive/store/2026-07-12-Shared-Estimate-Page-superseded/` — archived predecessor audit after all relevant current findings were reconciled into the canonical Client Portal pack's `21-SHARED-ESTIMATE-PAGE-AUDIT-DELTA.md`. Historical audit completion does not claim its remediation backlog was implemented.
- `.ai/09_archive/store/2026-07-10-Estimate-Sheet-Tree-complete/` — implemented estimate tree reorder hotfix, Move dialog parity, handle-only drag, D1 atomic restore/reorder history, and hook extraction. Local Vitest 192 + type-check green; hosted D1/authenticated browser remain release boundaries.
# Plans

This folder contains historical and future implementation plans.

## Active status

The canonical current state is `.ai/10_state/current-state.md`.

- `.ai/03_plans/2026-07-16/Master-Codebase-Architecture-Deepening-Plan-Pack/` — canonical conditionally-ready master for current codebase architecture deepening. Start at `IMPLEMENTATION_PLAN.md`; `UNIT-001` is next, `UNIT-001` through `UNIT-003` are the clean ready slice, and later component/Estimate units carry explicit single-writer leases.
- `.ai/09_archive/store/2026-07-16-Codebase-Architecture-Deepening-Plan-Pack-superseded/` and `.ai/09_archive/store/2026-07-16-Codebase-Improve-Audit-Plan-Pack-superseded/` — cancelled/incomplete planning predecessors retained only as historical evidence after every requirement was dispositioned into the master.

Archestimator is no longer at the completely blank `/workshop` reset snapshot. The repo currently contains a small post-reset workshop route slice. Older plans in this folder that describe the rejected full prototype, local-first MVP, proposal/revision system, Glide migration, or broad workshop route family are historical context only unless a current plan explicitly reactivates a narrow piece.

Current planning baseline:

- `/` landing page is preserved.
- `/workshop`, `/workshop/projects`, `/workshop/library`, and `/workshop/templates` route slices exist in `src/app`; `/workshop/components` is a redirect to `/workshop/library`.
- The deleted full prototype remains superseded.
- Future work must be route-scoped, screen-scoped, and easy to delete if Philip rejects it.

Current filesystem inventory, refreshed 2026-06-19:

| Path | Current status | Notes |
|---|---|---|
| `.ai/03_plans/000-Follow Ups/` | Backlog / deferred follow-ups | Parent efforts have shipped in pieces, but these items remain follow-up work unless a future dated plan selects one for execution. Do not silently promote backlog items. |
| `.ai/03_plans/2026-06-06-ui-component-optimization-componentization/` | Partially implemented | Component-library and Storybook layer implemented; production app migration remains explicitly deferred. See `00_STATUS.md`. |
| `.ai/03_plans/2026-06-14-Codebase-Cleanup-Plan/` | Audit / deletion-readiness only | Planning only. Do not delete code, deps, files, or DB objects from this pack without fresh proof and the owner gates it names. |
| `.ai/03_plans/2026-06-14-Overall-Site-Performance-And-Optimization/` | Audit / readiness only | Planning only. Do not mutate provider, database, Vercel, CI, or production from this pack without missing measurement gates. |
| `.ai/03_plans/2026-06-16-Project-Groups-Implementation/` | Implemented in repo; proof-bounded | Source, tests, generated types, and migrations exist in current repo. Provider/browser/manual proof must be checked separately for release claims. |
| `.ai/03_plans/2026-06-16-Sidebar-Favorite-Projects-And-Estimates/` | Implemented in repo; browser proof gap | Source and targeted tests exist; authenticated browser proof was recorded as unavailable. |
| `.ai/03_plans/2026-06-16-estimates-toolbar-functionality/` | Implemented in repo | Filter/sort/search projection source and focused tests exist; no provider/browser proof required. |
| `.ai/03_plans/2026-06-16-github-codex-comment-resolution/` | Historical resolution tracker; fresh audit required for release | Recorded evidence once showed zero active threads. A fresh 2026-06-18 GitHub audit found active unresolved Codex threads; see that folder's README before release. |
| `.ai/03_plans/2026-06-16-github-codex-comments/` | Partially implemented / blocked security-history runbook | Sensitive-history cleanup remains provider/GitHub-retention-sensitive. Do not resolve or release-gate from local evidence only. |
| `.ai/03_plans/2026-06-17-Agent-Mandate-And-Workflow-Optimization/` | Implemented docs/governance | Local docs/governance proof only; no provider/browser/runtime proof claimed. |
| `.ai/03_plans/2026-06-17-Performance-Refactor/` | Planning only | Large future performance refactor plan. No source, migrations, DB actions, or package changes were made by the plan pack. |
| `.ai/03_plans/2026-06-17-Workshop-Dashboard/` | Implemented in repo; visual/owner proof gap | Dashboard source/tests/build evidence is recorded. Live visual, device, and owner-signoff proof remain separate. |
| `.ai/03_plans/2026-06-17-loop-engineering-default-mandate/` | Implemented docs/governance | Instruction-level mandate; no CI/tool enforcement claimed. |
| `.ai/03_plans/2026-06-18-r1-graph-injector-neutralization/` | Implemented locally | Neutralizer and scripts exist. Real generator run was intentionally not performed. |
| `.ai/09_archive/2026-06-19-Workshop-Dashboard-Query-Batching/` | Archived planning context | Dashboard Supabase round-trip reduction (app-only wave-merge + lean library fetch first; gated `workspace_homebase_summary` RPC only if measured). Operationalizes Performance-Refactor A-23/RISK-20; its `01-…` supersedes that pack's stale homebase anchors. No source, migrations, or measurement performed. Adversarially reviewed (ready-with-fixes, applied). |
| `.ai/09_archive/2026-06-19-Projects-Page-Performance/` | Archived implemented-local evidence; follow-ups tracked | Start at `05_STATUS.md`. Phase 1-3 local work and proof are recorded: server wave parallelization, card thumbnail/lazy image path, render-count proof, content-visibility, skeleton parity, and local production-build Lighthouse with a real Supabase session. This is **not hosted Vercel proof** and does not authorize provider/source action by itself. Remaining follow-ups are route-transition auth harness, optional Slow-3G, large-list spot-check, and main-thread/image-proxy investigation if LCP becomes a release gate. |
| `.ai/03_plans/database-indexing-and-query-performance/` | Repo audit helper only | `DBIDX-001` repo audit helper exists. No indexes, candidate index migrations, or live EXPLAIN/provider proof are implemented. |
| `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/` | **Single consolidated launch-readiness audit folder (2026-06-19; 2026-06-20 readiness/certainty/execution-control/autonomy closeout)** | **Start at `01-MASTER-INDEX.md`**, then read `03-LAUNCH-GATE-DECISION-REGISTER.md`, `04-PROOF-TAXONOMY-AND-AUTHORITY.md`, `08-IMPLEMENTATION-HANDOFF.md`, `19-BLAST-RADIUS-AND-ROLLBACK-MATRIX.md`, `20-GATE-CRITERIA-TRACEABILITY-MATRIX.md`, `21-RESIDUAL-UNCERTAINTY-AND-CONFIDENCE-REGISTER.md`, `22-IMPLEMENTATION-EXECUTION-CONTROL-PLAN.md`, `23-IMPLEMENTATION-COORDINATION-LEDGER.md`, and `24-OVERNIGHT-AUTONOMOUS-IMPLEMENTATION-RUNBOOK.md` before implementation. Root docs `07`-`24` add beta strategy, provider proof, threat model, UX copy/a11y/responsive scope, B2 policy, ops runbook, high-blast DB/DSAR plans, ratings, official-source criteria, blast radius, gate traceability, confidence limits, least-risk-first execution sequencing, per-lane loop enforcement, multi-agent coordination, unanswered-question defaults, parked-lane handling, conflict logging, morning handoff, and archive-on-resolution. Contains **all 18 audit/remediation packs as subfolders**: 13 domain (`Auth-And-Session-Security`, `RLS-RPC-And-DB-Security`, `Database-Schema-Indexing-Query-Perf`, `API-Routes-And-Server-Actions`, `Frontend-Rendering-Performance`, `Bundle-And-Asset-Optimization`, `NextJS-Vercel-Deploy-And-Headers`, `Data-Fetching-Caching-RSC`, `Observability-Reliability-Ops`, `Testing-CI-Quality-Gates`, `Accessibility-SEO-Legal-Content`, `Dependencies-Supply-Chain-Code-Health`, `Email-Notifications-Integrations`) + 5 gap (`Realtime-Collaboration-Presence`, `Analytics-Consent-Privacy`, `DSAR-Account-Deletion-Data-Export`, `Storage-Buckets-And-Upload-Lifecycle`, `Share-Routes-And-Proxy-Self-Gating`). Every finding adversarially verified and the plan docs now rate 100/100/100 for planning handoff. **Audit/readiness/planning only — nothing was implemented**; follow each pack's evidence gates and current owner/provider constraints before any Supabase/Vercel/CI/prod action. Verdict: not yet wider/external-launch ready (~9 hard blockers + 2 verify-gates + 1 conditional, mostly S/M effort); security core verified strong but does not waive remaining gates. |

Archived entries that were previously mislisted as active:

- `.ai/09_archive/2026-06-15-Estimate-Sheet-Content-Table/` — archived docs-only planning pack for user-resizable estimate-sheet content columns.
- `.ai/09_archive/2026-06-16-Project-Data-Route-Feature-Plan/` — archived docs-only plan for replacing the project `/data` route's over-complex comparison page.
- `.ai/09_archive/store/2026-06-06-terms-and-conditions-sheet-implementation-complete/` — archived implemented Terms/Terms-of-Service evidence pack. Final Terms language still requires qualified legal review and must not claim absolute zero liability.

Current guardrails:

- Performance, cleanup, DB indexing, archives, and security packs are not permission to mutate provider state. Follow their evidence gates and current owner/provider constraints before any Supabase, Vercel, GitHub, DNS, env, CI, or production action.
- `000-Follow Ups` stays backlog unless a future dated plan explicitly selects and scopes a follow-up for execution.
- GitHub Codex comment status is release-sensitive. If it matters for release, run a fresh GitHub review-thread audit rather than relying on historical tracker evidence.

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

Archived 2026-07-12 (plans-folder cleanup):

These plan packs were moved out of `.ai/03_plans/` into `.ai/09_archive/` on 2026-07-12 to declutter the active plans folder. Descriptions are preserved for history; paths now point at the archive.

- `.ai/09_archive/2026-06-01-security-owasp-compliance-audit/` — Security / OWASP / compliance audit and remediation roadmap pack.
- `.ai/09_archive/2026-06-03-react-joyride-onboarding-implementation-plan/` — Planning-only pack for a React Joyride onboarding flow; no runtime dependency or table exists in current source.
- `.ai/09_archive/2026-06-07-archives-feature/` — Refined / not implemented multi-entity archives feature plan.
- `.ai/09_archive/2026-06-20-Library-Page-Overall-Improvement/` — Library page UX/UI improvement planning and audit pack; newer phase-0a evidence merged into the existing archive folder.
- `.ai/09_archive/2026-06-21-Ponytail-Pass-Plan/` — Ponytail Pass plan pack.
- `.ai/09_archive/2026-06-23-Full-App-User-Story-UX-Audit/` — Full-app user-story UX audit plan pack.
- `.ai/09_archive/2026-06-28-add-component-opendesign-field-contract/` — Component OpenDesign field contract plan pack.
- `.ai/09_archive/2026-06-29-Cloudflare-Migration-Codex/` — Cloudflare migration planning package.
- `.ai/09_archive/2026-07-02-Karpathy-Skills-Workflow-Contract/` — Karpathy skills workflow contract plan pack.
- `.ai/09_archive/2026-07-05-Brand-And-Landing-Page/` — Brand and landing page planning package.

Archived closeout / superseded plans:

- `.ai/09_archive/store/2026-07-11-frontier-agent-depth-and-context-efficiency-complete/` -
  locally implemented agent depth/context-efficiency upgrade with verified code
  and contract tests. The pack is `COMPLETE / ACHIEVED`; failed Supermemory
  exact-ID indexing remains recorded as auxiliary degraded-memory evidence and
  does not block the implementation.
- `.ai/09_archive/store/2026-07-11-agent-contract-speed-and-test-gate-complete/` -
  completed frontier agent-contract upgrade. Contains the conditional four-state
  test gate, current Cloudflare/D1 stack guidance, GPT-5.6 adapter pins, concise
  agent surfaces, deterministic validators, focused 32-test contract proof, and
  independent no-residual-P0/P1/P2 closeout review.
- `.ai/09_archive/store/2026-07-10-frontier-planning-prompt-autonomy/` -
  completed frontier planning-prompt autonomy upgrade. Contains the canonical
  implementation plan, loop ledger, deterministic manifest, 28-test validation
  receipt, three-trial semantic evaluation, independent no-P0/P1 review, and
  archive integrity proof.
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
- UX state coverage for user-facing work: success, loading, empty/not-found,
  error, permission/identity, mobile, keyboard/screen-reader, and copy/readability
  states as applicable;
- non-goals;
- files expected to change;
- validation gate and explicit `test_requirement` (`NOT_REQUIRED` by default;
  `TARGETED`, `BROADER`, or `TEST_TASK` only with the trigger named);
- deletion criteria if Philip rejects the direction.
- loop surface selection when the work is non-trivial: direct, `ultrawork`,
  `ultragoal`, `omo:ulw-loop`, `autopilot`, `ultraqa`,
  `omo:ultraresearch`, `vercel:agent-browser`, or an agent-neutral equivalent;
- durable state/evidence path: `.ai` plan, `.ai/13_research` note,
  `.ai/05_logs` run log, `.omx`/`.omo` ledger, provider proof packet, or issue
  tracker link.

Do not create broad route families, dashboards, proposal systems, component libraries, grids, or persistence layers without explicit approval in the plan.

### Lean plan packs

Plan packs follow the Lean Engineering Ethos in
`.ai/00_system/AGENT_OPERATING_PROTOCOL.md`: a plan scopes to the real job and
its acceptance criteria — no speculative features, gold-plating, or future-proof
abstractions the request does not justify. **Implementing a plan stays within its
acceptance criteria**: do not over-engineer beyond what the plan requires, and do
not over-test beyond its `test_requirement` (tests remain user-gated). A plan
pack is not a license to expand scope; it is a bounded contract for a bounded
job. If the analysis behind the plan finds real risk, deepen the analysis — do
not compensate with extra implementation surface or test ceremony.

Keep the pack token- and execution-efficient: one canonical goal, one bounded
blast-radius map, the minimum artifacts needed for distinct ownership or
freshness, and no duplicated requirement/test/evidence matrices. Stop adding
detail when a fresh executor can act without guessing. New criteria default to
`NOT_REQUIRED`; risk alone may produce a `TEST_PROPOSAL`, never an automatic test.

## Rules for archiving plan packs

When a plan pack is archived (moved to `.ai/09_archive/store/<archive-date>-<slug>/`):

- **Move the entire folder.** Do not leave a stub, tombstone, `ARCHIVED.md`, README redirect, or any other residual file at the original `.ai/03_plans/<YYYY-MM-DD>-<slug>/` path. The active plans folder must contain only active plans — no graveyard of empty stub folders.
- Verify every file is present at the archive destination before deleting the source.
- If inbound references elsewhere in `.ai/` point at the old path, update them as part of the same commit. Do not leave a tombstone "so the path resolves" — fix the references, then remove the source.
- The archive destination is the only canonical location after archiving. `git mv` or move-then-delete is the correct shape; copy-then-leave-stub is forbidden.

## Superseded historical plans

Remaining older plans in this folder may still mention Glide, proposal grouping, or broad MVP definition work. Treat them as proposed or incomplete historical context only unless a future plan explicitly reactivates a specific piece.
