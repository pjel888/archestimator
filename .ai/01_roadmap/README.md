# Roadmap

**Last updated:** 2026-05-29
**Status:** Pre-launch MVP. Supabase/Auth/Postgres are active for Archestimator project `ebxxqidacheyapmmzavr`; the protected workshop, invite-entry collaboration flow, project client publication, estimating sheet, component library, charts, proposal XLSX export, account-aware Ask route, and package-builder Draft/Apply AI slice are in active MVP hardening. The brand narrative is pivoting from construction-cost-estimator-only to structured quote, estimate, and proposal workflows for teams that build itemized commercial offers. Construction-style estimating remains the current implemented wedge. The local sign-up/login/authentication, project invite-entry, and project client publication implementations are reviewed at the focused-test level, but public/private launch remains NO-GO until provider, legal, Vercel, QA, support, owner, full validation/build, and storage/security evidence is complete.

## Current product baseline

The reset-era blank-workshop baseline is no longer current. Archestimator now preserves and actively builds on:

```txt
/                                                     public landing page
/about                                                public company/product page
/features                                             public feature page
/pricing                                              public pricing page
/contact                                              public contact page
/login                                                Supabase Auth entry: Google primary, email sign-in-link fallback, no password UI
/auth/callback                                        Supabase auth callback with safe redirect and stable public error handling
/invite/[token]                                      app-owned project/sheet invite entry route for pending collaborators
/share/[token]                                       public, view-only client publication receiver route with optional password gate
/privacy                                             pending-review Privacy Notice status page
/terms                                               pending-review Terms status page
/api/ai/ask                                           read-only account-aware AI copilot endpoint
/api/ai/package-builder                               package-builder Draft/Apply endpoint with signed preview and confirmation gates
/api/component-library/images                         component-library image upload API
/api/component-library/attachments                    component-library attachment upload API
/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx
/workshop                                             protected workshop entry and post-auth pending-invite bridge
/workshop/onboarding                                  compatibility redirect to /workshop/settings; not a required first-run gate
/workshop/projects                                    live project list/create route with owned/shared/sheet-only access labeling
/workshop/projects/[projectId]                        live project dashboard shell
/workshop/projects/[projectId]/estimates              live estimate list/create route
/workshop/projects/[projectId]/estimates/[nodeId]     live estimate workspace with project-scoped tree/row data
/workshop/projects/[projectId]/charts                 project cost charts
/workshop/library                                     component library workspace
/workshop/templates                                   reusable template workspace
/workshop/components                                  compatibility redirect to /workshop/library
/workshop/settings                                    account settings landing route
/workshop/settings/profile                            profile-owned intake correction route
/workshop/settings/workspace                          workspace-owned intake correction route
```

## Current codebase pillars

- Public website: landing plus About, Features, Pricing, and Contact pages, with quote/proposal-first wording and construction-style estimating kept as the current proof case.
- Auth and tenancy: Supabase Auth with Google OAuth primary and email sign-in-link fallback, protected `/workshop/*`, safe auth redirects, no required first-run onboarding, optional profile/workspace settings, workspace bootstrap guards, CEO/profile role foundation, server-owned account-security audit metadata, app-owned invite-entry tokens, and RLS-backed app tables.
- Project and estimate workspace: project dashboard, estimate list/create, project-scoped estimate tree, row items, inline edits, Activity History, proposal export, and chart route.
- Project publication: project-header `Shared link` controls (V2 Overhaul complete P0–P14 + post-P14 polish; see Phase 5A) and `/share/[token]` receiver route exist for token-scoped, view-only client snapshots with optional password protection, recipient management, tabbed navigation, comments/decisions, activity, and metadata-only open tracking. PDF/download publication artifacts are not implemented (future plan). V1 "Public link" terminology and basic controls superseded by V2 (additive, backwards compat for existing tokens). Post-P14: 2 in-scope publication TS issues resolved (event cast + auth context destructure); feature symbols now clean in tsc; pre-existing unrelated blockers remain (authorized, documented in current-state). All design lints 0, MCP graph impacts throughout, red-first + 2-stage reviews followed via subagent-driven-dev.
- Component Library/Templates: `/workshop/library` for components, `/workshop/templates` for reusable templates, shared estimate-sidebar data loading, variants, brands, suppliers, folders, images, attachments, cost entries, and component lifecycle/history foundations.
- Proposal output: current-estimate XLSX preview/download exists; immutable issued proposal snapshots and PDF package workflows are not implemented yet.
- AI: global Ask Flip copilot exists through `/api/ai/ask` for read-only account-aware questions and `/api/ai/package-builder` for signed package-builder Draft/Apply flows. Package-builder Draft can now use bounded comparable prior estimate packages as room/row/cost/source-coverage hints in addition to library components, templates, prior rows, and default-off memory ranking. Stored conversations, vector/RAG, provider-owned memory, autonomous actions, and broad persistent user memory remain unimplemented. The only memory slice is a default-off package-builder accepted/rejected source-signal ranking hint behind `AI_PACKAGE_BUILDER_MEMORY_ENABLED`.

## Phase 0 - Governance and design-system guardrails

Status: active and continuous.

Done:

- Non-landing product design system enforced by `bun run lint:design-system` (`lint:font-size` is an alias).
- App/workshop typography scale: SF Pro system stack and regular/medium only, while preserving the compact `12px` maximum with normal controls/body/table/input/button text around `10px`.
- Shared UI primitive reuse is mandatory.
- Code-review graph/GitNexus and `.ai` source-of-truth docs are part of the normal agent workflow.

Next:

- Continue moving repeated controls into `src/components/ui` before feature-local markup spreads.
- Keep current-state, decisions, roadmap, and feature specs synchronized after each durable product/code change.
- Treat docs-only changes as verified only after referenced paths exist and `git diff --check` passes.

## Phase 1 - Authenticated workspace foundation

Status: local implementation reviewed; launch blocked by external evidence and owner decisions.

Done:

- Supabase project linked: `ebxxqidacheyapmmzavr`.
- Canonical `/login` auth entry implemented with Google OAuth as primary and email sign-in link as fallback.
- App-owned password UI/actions remain absent; `/signup`, `/sign-in`, and `/sign-up` aliases are not implemented.
- Canonical `/auth/callback` exchanges Supabase auth codes, maps failures to stable public error codes, and hides raw provider errors.
- Central safe-next redirect handling rejects external URLs, protocol-relative URLs, encoded external URLs, CRLF, backslash paths, callback self-redirects, malformed input, and missing `next`.
- `/workshop/*` protected by `src/proxy.ts`.
- Profiles/CEO role bootstrap implemented in database migration.
- Migration `20260527072220_auth_account_data.sql` is applied to the linked remote and repaired into migration history; the auth-account tables are present in the PostgREST schema cache.
- Authenticated users land on `/workshop`; stale `/workshop/onboarding` visits redirect to `/workshop/settings`, and profile/workspace details are optional settings rather than a required first-run gate.
- Invited collaborators can reuse existing workspace, project, or estimate-sheet membership before any default workspace is inserted.
- Profile-owned intake and workspace-owned intake are separated through `user_onboarding_profiles` and `workspace_account_settings`.
- Server-owned auth/security audit metadata uses `account_security_events` with no browser write grants.
- `/privacy` and `/terms` exist only as truthful pending-review status pages.
- Auth setup checklist documented in `.ai/06_specs/supabase-auth-setup.md`.
- Project/sheet invite entry is implemented through app-owned `/invite/[token]` URLs, signed pending-invite bridge cookies, `/workshop` non-blocking access banners, and `/workshop/projects` shared-member labeling.
- Migration `20260527115342_project_invite_entry_tokens.sql` is applied to the linked remote and grant-verified: `anon` resolves only, `authenticated` accepts/manager-manages, and lifecycle materialization is service-owned.
- Invite-entry browser E2E passed locally against linked Supabase for signed-out accept through `/workshop`, signed-in accept, wrong-account recovery, expired, revoked, used, invalid, and shared-project card labeling.

Remaining:

- Capture redacted Supabase dashboard evidence for Site URL, redirect allow-list, Google provider, email provider, password/passwordless posture, signups policy, anonymous disabled, phone disabled, passkeys disabled, SAML disabled, OTP expiry, resend cooldown, rate limits, CAPTCHA decision, SMTP/templates, and audit retention.
- Capture Google Cloud OAuth evidence for consent screen, app identity, privacy/terms URLs, support email, authorized domains, redirect URIs, scopes, and verification state.
- Capture Vercel evidence for production/staging/preview URL policy, env var presence by environment, preview-auth policy, deployment protection, and redeploy requirements.
- Replace pending-review `/privacy` and `/terms` with reviewed Privacy Notice and Terms; add subprocessor list, retention schedule, DSAR/export/delete/correction workflow, cookie/analytics posture, student/minor posture, and launch-jurisdiction decisions.
- Add owner-backed support and incident evidence for auth failures, expired links, wrong-email invites, missing workspace/project, deleted/deactivated users, provider outage, service-role leak, redirect vulnerability, cross-workspace data access, invite abuse, and rollback execution.
- Run signed-in browser QA with real or staging Supabase credentials for `/login` redirect-away and settings correction paths; invite acceptance has local linked-Supabase E2E coverage but still needs staging/production provider evidence before launch.
- Keep local migration state and linked-remote migration state separately proven after any future schema change.

Current source/evidence:

- `.ai/09_archive/store/2026-05-27-sign-up-login-authentication-local-implementation-evidence/`
- `.ai/09_archive/store/2026-05-27-sign-up-login-authentication-local-implementation-evidence/14-go-no-go-evidence-and-owner-decision-record.md`
- `.ai/09_archive/store/2026-05-27-sign-up-login-authentication-local-implementation-evidence/15-local-implementation-and-validation-evidence.md`
- `.ai/09_archive/store/2026-05-27-sign-up-login-authentication-local-implementation-evidence/16-provider-config-audit-redacted.md`
- `.ai/09_archive/store/2026-05-27-sign-up-login-authentication-local-implementation-evidence/17-auth-runbooks-and-rollback.md`
- `.ai/09_archive/store/2026-05-27-project-workspace-invite-entry-complete/`

## Phase 2 - Live project and estimate foundation

Status: implemented.

Done:

- `/workshop/projects` reads authenticated workspace projects.
- `/workshop/projects` normalizes owned projects, shared project memberships, and sheet-only collaborator memberships into one list with `All` / `Owned` / `Shared` filtering.
- Shared project cards show explicit `Shared project` or `Sheet-only` badges, role context, and owner/shared-sheet context instead of making collaborator access look owned.
- Project creation server action inserts live Supabase project records.
- Live project cards render Supabase rows.
- Project dashboard route loads authenticated workspace project data.
- `/workshop/projects/[projectId]/estimates` lists live Supabase estimates.
- Estimate creation creates a draft estimate and bootstraps lot -> structure -> level -> area hierarchy.
- Estimate list cards link to the first area node.
- `/workshop/projects/[projectId]/estimates/[nodeId]` reads live Supabase `estimate_nodes` and `estimate_row_items`.
- Node route validation is project-scoped through the selected node's parent estimate.

Current source:

- `.ai/06_specs/live-project-estimate-bootstrap.md`
- `.ai/06_specs/current-project-estimates-component-library-spec.md`

## Phase 3 - Estimate workspace editing and Activity

Status: implemented core, hardening active.

Done:

- Insert, replace, delete, and update row mutations persist through TanStack Query mutation hooks backed by server actions.
- Row mutations validate project, estimate, node, row, and ownership before writing.
- Route-loaded estimate tree is seeded into TanStack Query cache and optimistic failures restore previous local state.
- React Complex Tree drag/drop reorder is active with hierarchy guards and reorder server action support.
- One unified `Activity History` modal exists for sheet and row activity.
- Named sheet `Versions`, `Compare`, restore-as-copy, and app-level named-version actions are intentionally absent from the current UI.

Remaining:

- Live mutation/atomicity proof needs local Supabase or an approved throwaway database. It must cover node create/rename, template event reads, rollback, and concurrency.
- Scalar edit latency benchmarking needs the same safe mutation harness before any production-runtime performance claim.
- Activity export/report, Supabase Realtime, retention pruning/archive compaction, and undo/redo remain future product slices.
- Do not add visible row-level save pills; preserve spreadsheet-like editing and the accepted compact sheet-level save state unless Philip approves a new interaction contract.

Current source:

- `.ai/09_archive/store/2026-05-29-estimate-sheet-version-control-complete/18-current-activity-contract.md`
- `.ai/09_archive/store/2026-05-29-estimate-sheet-version-control-complete/19-local-safe-completion-audit.md`

## Phase 4 - Component Library and Templates

Status: partially implemented, active hardening.

Done:

- `/workshop/library` is the current component-library workspace.
- `/workshop/templates` is the current reusable-template workspace.
- `/workshop/components` redirects to `/workshop/library`.
- Add Component flow persists component names, variants, brand/supplier metadata, images, attachments, cost entries, and linked thumbnails.
- Component/library data loading is shared with the estimate sidebar and must bootstrap the workspace once.
- Component lifecycle/history and versioning schema foundations are present.

Remaining:

- Prove the newest local component-library cleanup migration against the linked remote before claiming remote parity.
- Continue UI polish for dense component/template workflows.
- Tighten pricing/source trust metadata, supplier provenance, and lifecycle reporting before launch claims.

Current source:

- `.ai/09_archive/store/2026-05-29-workshop-library-components-templates-split-complete/`
- `.ai/09_archive/store/2026-05-29-workshop-library-component-creation-versioning-complete/`
- `.ai/09_archive/store/2026-05-29-component-variant-assets-and-cost-history-complete/`
- `.ai/06_specs/current-project-estimates-component-library-spec.md`

## Phase 5 - Proposal export and project charts

Status: implemented partials, launch hardening active.

Done:

- Proposal XLSX preview/download exists for the current mutable estimate.
- Proposal workbook generation uses project/estimate data and is covered by focused proposal tests.
- `/workshop/projects/[projectId]/charts` exists with project cost chart surfaces.

Remaining:

- Immutable issued proposal snapshots are not implemented.
- PDF/client-facing package workflow is not implemented.
- Revision comparison and issued-proposal audit policy need a product decision before public claims.
- Chart grouping, empty states, and drill-downs need beta-user validation before they become core launch positioning.

Current source:

- `.ai/09_archive/store/2026-05-29-industry-standard-excel-proposal-export-complete/`
- `.ai/09_archive/store/2026-05-29-project-charts-estimate-comparison-complete/`

## Phase 5A - Project client publication (V1 archived) + Shared Link Overhaul V2 (Complete, P0–P13)

**P14 (2026-05-28):** Shared Link Overhaul V2 marked Complete. V1 (`Public link` controls + basic `/share/[token]`) archived 2026-05-27. V2 delivers full production-grade manager/receiver experience with terminology standardization ("Shared link"), tabbed navigation (Link / Sheets / Access / Recipients / Activity), recipient management + Resend email delivery, session security (P5), client comments (P6), accept/reject/revise decisions (P7), owner activity feed + rate-limited digests + badge (P8), visual polish + hero images + responsive (P9), password hardening + progressive lockout + attempt audit (P10), CSP/headers/tracking (P11), error handling + retry + circuits + logging (P12), and full testing/validation (P13: focused vitest + sims for E2E/pen/load due to env gaps).

**Post-P14 Phase 5A addition (2026-05-29, Ralph Loop):** Share Page Estimate View Enhancement (P0–P5) delivered on top of the V2 receiver: per-sheet donut charts, Tree View | Grid Preview sub-tabs with keyboard isolation, designation-based Tree View (WorkshopTree reuse + reconstruction), floating nav. All client-side, 0 new errors from changes, design lint clean. See `.ai/09_archive/store/2026-05-29-share-page-estimate-view-enhancement-complete/`, TRACKER, COMPLETION-REPORT, and current-state.md Phase 5A section. Strict Ralph Loop with completion promise used for delivery.
- Redesigned the project publication (Shared Link) modal using a full-height sidebar grid layout and integrated WorkshopTreeTabs for Link/Sheets/Access/Recipients/Activity tabs. Polished RecipientEmailComposer with standard ControlInput primitives.
- Overhauled project creation flow: NewProjectForm accepts onSuccess callback (closes modal, creates estimate draft), NewProjectModal auto-dismisses, and ProjectTotalHeader rendering is centralized in WorkshopPageShell footer slot.

**Evidence (worktree HEAD 4c93bb1):**
- P0 foundation (red tests + Resend scaffold + route audit): 859285c
- P1 Rename 'Public link'→'Shared link' + Sheets tab + SheetPickerList: 95b2142
- P2 Receiver tabs spec/ARIA/impact fixes: 86e71b6
- P3 DB migration (shared_link_* tables, RPCs): 700a9f5
- P4 Email infra + RecipientEmailComposer + chips + graceful delivery: 32b612c (plus 205db2e quality fixes)
- P5 Recipient Session & Security Cookie (hook + blocking): 8a3dfd4
- P6 Comments API & UI (SharePageComments): 938c801
- P7 Decisions API & UI (SharePageDecision): 45673c8
- P8 Activity Feed & Notifications + digest + badge: e9dffa3
- P9 Visual Polish, Images & Hero (responsive, thumbnails, cover): 4c7c406
- P10 Password brute-force hardening (in-mem lockout 5-attempt 15min, progressive 1s/2s/4s/8s, 429, events): 75e176b
- P11 CSP Upgrade & Security Headers: 77e3550
- P12 Error Handling & Resilience (circuits, retry, logging, offline queue): 2d93eef
- P13 Testing & Validation (all publication tests updated for "Shared link" strings + route fixes to green; pre-edit MCP impacts; design lint 0; load/pen/E2E sims GREEN): 4c93bb1

**MCP / code-review-graph impacts (per AGENTS.md + Claude.md + Master Prompt + subagent protocol, performed before every packet + P14):**
- get_impact_radius_tool on core symbols (ProjectPublicationHeader, SharePageTabs, SharePage, actions.ts publication fns, page.tsx etc.): 46 direct nodes, 500 nodes impacted (2 hops), 120+ files, medium ~0.65 risk, 0 critical flows (blast isolated to public share surface; no upstream active execution flows affected).
- detect_changes_tool (P13): 7 files, 10 fns, 0 affected flows, 0 test gaps, 0.45 risk.
- All packets: search_tool for schemas first, then query_graph / get_minimal_context / get_affected_flows / semantic_search as needed; red tests first where applicable; additive only, backwards compat with V1 flows + existing tests; design lint 0 violations post every UI slice (bun run lint:design-system passed clean).
- P14 pre-edit: same MCP impacts + CLI gitnexus impact/detect on publication symbols + full worktree analyze (now 8409 nodes / 300 flows fresh).

**Worktree:** /Users/philiplewis/archestimator/.worktrees/feature/shared-link-overhaul-v2 (isolated for feature; all P0–P13 landed here).

**Divergence / Implementation reality notes (P14):** The 13 detailed plan docs + README + COMPLETION-REPORT.md + IMPLEMENTATION-MASTER-PROMPT.md for "project-shared-link-overhaul" live in main repo `.ai/09_archive/store/2026-05-29-project-shared-link-overhaul-complete/` (not present in this worktree's .ai/ due to feature-branch isolation). P14 closure used: worktree .ai/ roadmap/state/decisions, src/ inline P0–P13 self-review comments (// Pxx: ... red-first, MCP impact, design 0, additive), git log SHAs, prior V1 archive evidence, current-state mentions, AGENTS.md/Claude.md/DESIGN.md, and MCP graph. All decisions followed Master Prompt + subagent-driven-development (impacts before symbol edit, red tests, 0 design violations, no secrets, additive/backcompat, .ai/ as brain).

**Known limitations (documented in P0–P13 + code comments):**
- P3: Local Supabase/Docker verification blocked (authorized to proceed with linked remote `ebxxqidacheyapmmzavr` + focused tests/sims).
- Rate limiting, circuit breakers, lockout state: in-memory (sessionStorage + server in-mem); not durable/Redis until future infra.
- Some TS casts in email/Resend paths (temporary until full type regen).
- P13: Full live E2E/penetration/load via Playwright sims + vitest (env gaps for unauthed Docker/local DB matrix); all targeted publication tests green at 4c93bb1.
- No PDF/download artifacts (future plan per V1 remaining).
- Public launch still gated by Phase 7 (Privacy/Terms legal review, Vercel, provider evidence, etc.).

**P14 changes (this doc only):** Updated Phase 5A to V2 Complete status with full evidence cross-links. No code changes. Additive only. Backwards compat preserved (V1 flows + tests untouched except string polish in P13).

Current source (V1 archive + V2 implementation):
- `.ai/09_archive/store/2026-05-27-project-client-publication-complete/`
- `.ai/09_archive/store/2026-05-27-project-client-publication-complete/15-implementation-closeout-and-remaining-gates.md`
- Worktree src/lib/publication/*, src/components/share/*, src/components/workshop/ProjectPublicationHeader.tsx, src/app/share/[token]/page.tsx, tests/vitest/project-publication*.test.*
- P0–P13 commit SHAs above + P14 closure in `.ai/10_state/current-state.md`, `decisions.md`, and `walkthrough-shared-link-overhaul.md`.

## Phase 5B - Route transition performance optimization

Status: Active planning & Groundwork Phase complete.

Done:
- Formulated the comprehensive 34-document Route Transition Performance Master Plan under `.ai/03_plans/route-transition-performance-optimization/` covering audit data, blast radius analysis, performance ADRs, and implementation strategies for sub-100ms transitions.
- Created `BfcacheHandler` to handle pageshow events and restore navigation UI store from browser back-forward cache.
- Created `PerformanceMonitor` to log transition times in development mode.
- Created `usePrefetchOnHover` custom hook for anticipatory preloading of TanStack Query caches.
- Implemented `Skeleton` reusable loading UI primitive matching standard design tokens.
- Created native route loading skeletons (`loading.tsx`) for `/workshop`, `/workshop/library`, `/workshop/onboarding`, `/workshop/projects`, `/workshop/settings`, and `/workshop/templates` to eliminate full-screen transition overlays during data fetching.

Remaining:
- Implement Phase 1: Client routing prefetch wiring on navigation links.
- Implement Phase 2: React Server Component prefetching and query hydration.
- Implement Phase 3: Code splitting and bundle optimization for heavy components (e.g. Three.js dynamic loading, TanStack table dynamic loading).
- Implement Phase 4: Dynamic rendering, build-time caching, and performance budgets.

Current source:
- `.ai/03_plans/route-transition-performance-optimization/`
- `src/components/bfcache-handler.tsx`
- `src/components/performance-monitor.tsx`
- `src/components/ui/skeleton.tsx`
- `src/hooks/use-prefetch-on-hover.ts`
- `src/app/workshop/library/loading.tsx` etc.

## Phase 6 - AI copilot

Status: account-aware Ask and first package-builder Draft/Apply slice implemented; launch hardening and broader app actions remain active future work.

Done:

- Global floating copilot opens Ask Flip and routes ordinary read-only questions to `/api/ai/ask`.
- `/api/ai/ask` uses the approved first-slice provider path, server-only provider keys, and server-derived compact account context for authenticated workspace users.
- `/api/ai/package-builder` supports reviewable `draft`, bounded pre-Apply `refine`, rejected-draft `feedback`, and confirmation-gated `apply` modes for package creation and current-estimate edits.
- Package-builder Draft uses compact project/component/template/prior-row context, including linked prior-project component usage as a deterministic ranking hint for scoped library component selection.
- Package-builder Apply uses signed draft tokens, explicit confirmation, idempotency, metadata-only audit, and authenticated Supabase RPCs for approved app-owned mutations.
- Default-off package-builder memory ranking hints can store accepted/rejected library-item/template source signals when `AI_PACKAGE_BUILDER_MEMORY_ENABLED` is enabled; the local memory migration has not been applied to the linked remote.
- Workspace auth is required for real provider calls.
- Admin DB bypass is rejected for AI routes.
- Metadata-only audit persistence exists for real Supabase workspace users.

Remaining:

- Stored conversations, vector/RAG, provider-owned memory, resettable preference UI, broad persistent user memory, and autonomous mutations remain unimplemented.
- Broader write paths beyond the current package-builder contracts require confirmation UX, idempotency, audit trails, RLS compatibility, data-leakage tests, and rollback strategy.
- AI launch copy must stay honest: Ask Flip can answer scoped account questions and create/edit reviewed package-builder drafts after confirmation, but it is not a fully autonomous estimator.

Current source:

- `.ai/03_plans/ai-chatbot-agent-readiness/`

## Phase 7 - Pre-launch MVP readiness

Status: active next operating lane.

Launch gates:

- All P0 sign-up/login/authentication go/no-go rows are `PASS` or owner-backed `ACCEPTED_RISK`; no unresolved `FAIL` rows remain.
- Hosted Supabase auth redirects and provider settings verified with redacted evidence.
- Google OAuth, email sign-in link, callback, safe redirect, onboarding, settings, invite continuity, account security events, and no-password posture verified against a real or staging provider setup.
- Privacy Notice, Terms, subprocessor list, retention schedule, DSAR/export/delete/correction workflow, cookie/analytics posture, student/minor posture, and launch jurisdictions are reviewed and public where required.
- Vercel production/staging/preview auth URL policy, env vars, deployment protection, and redeploy procedure are documented.
- Support, incident, abuse, service-role leak, redirect-vulnerability, cross-workspace data access, and rollback runbooks have named owners and drill evidence.
- Executable storage/API/RLS denial tests prove no cross-workspace/profile/project/estimate/library/storage leak.
- Local and linked-remote migrations reconciled and documented.
- Protected workshop smoke passes for project create, estimate create, estimate edit, library/template access, charts, proposal export, and Ask-only copilot.
- Public pages claim only currently shipped, verified capability.
- Proposal export copy clearly distinguishes mutable current XLSX export from future issued snapshots.
- AI privacy, audit, and no-write posture are tested and documented.
- Pricing, customer segments, onboarding steps, and beta feedback loop are documented in the startup homebase and mirrored into `.ai` when they affect product scope.
- Known destructive cleanup, including linked-remote `V2` / `QA checkpoint` residue, is handled only by an explicit cleanup task with exact IDs and approval.
- The broad dirty worktree is isolated, reconciled, or intentionally closed out before any merge/release claim.
- Public narrative reflects the quote/proposal pivot without claiming purchase-order execution, legal-document automation, immutable issued snapshots, or mature compliance.

## Phase 8 - Landing page compliance and growth

Status: active planning — auth DRY cleanup plus first consent/CSP slice implemented; `/privacy` and `/terms` exist only as pending-review status pages. Reviewed legal artifacts, analytics, strict-CSP, and i18n proxy gates remain open; PostHog is deferred from the MVP landing stack.

Goals:

- Implement A/B testing infrastructure on the public landing page to measure and optimize conversion from landing to sign-up (Stack C: GA4 + Clarity + custom code; no PostHog or third-party experiment service for MVP)
- Implement GDPR-compliant cookie consent (custom component), CSP header (Report-Only), reviewed privacy policy, reviewed terms of service, and user data rights for EU/UK visitors
- Establish i18n strategy (next-intl) and locale routing for public marketing pages to support international launch
- Prepare multi-region legal compliance (GDPR, CCPA/CPRA, and other priority jurisdictions)
- 14 concrete tests planned across 3.5 hours, zero new test dependencies needed; first DRY auth-state, consent, and CSP header tests added

Current state:
- DRY public landing auth-state helper implemented (`src/lib/landing/get-landing-auth-state.ts`)
- Public consent banner/settings trigger and versioned `archestimator_cookie_consent` cookie implemented
- CSP Report-Only header implemented for `/`, `/about`, `/features`, `/pricing`, and `/contact`
- DPA verification checklist provided, but human/legal verification is still open
- GA4 custom dimension registration requirement documented (24-48 hr delay)
- GA4 conversion events must explicitly send `experiment_id` and `variant`; do not rely on automatic carry-forward from `experiment_view`
- PostHog official-doc review completed; defer unless product analytics, feature flags, native experiments, or analytics consolidation become explicit
- @firecms/neat replacement spec'd; current repo still uses pinned/patched `@firecms/neat@0.8.0`
- i18n must compose with existing Next 16 `src/proxy.ts`, not a new `src/middleware.ts`
- Strict CSP remains post-MVP until inline style/package blockers are removed

Current source:

- `.ai/03_plans/landing-page-improvement/ab-testing-gdpr-international-compliance/`
  - `00-blast-radius-implementation-analysis.md` — 30 files mapped, risk matrix
  - `01-dependency-graph.md` — full import tree
  - `02-cookie-csp-dpa-gap-closure.md` — cookie audit, CSP, DPA checklist
  - `03-residual-risk-resolution.md` — residual-risk register and open gates
  - `04-current-audit-and-corrections.md` — current audit corrections and implementation truth
  - `05-analytics-stack-decision.md` — GA4/Clarity/PostHog decision record
  - `ab-testing/README.md`, `gdpr-compliance/README.md`, `international-readiness/README.md`

## Permanent guardrails

- No merge to `main` without Philip approval.
- No deploy without Philip approval.
- Never touch SlateCamp Supabase resources.
- No app/workshop font above `12px`, no non-xs radius, no nonzero tracking, and no bold/fill icon weights.
- No duplicated feature-local buttons, search inputs, icon buttons, chips, cards, panels, dropdowns, or repeated controls; make/reuse shared UI primitives.
- No AI writes, autonomous actions, retrieval/RAG, or stored conversations by implication.
- Tests protect accepted behavior and key governance rules.
