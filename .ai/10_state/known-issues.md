# Known Issues / Open Risks

**Last updated:** 2026-05-30

## Current blockers

- Public/private launch remains NO-GO until provider, legal, Vercel, QA, support, owner, full validation/build, and storage/security evidence is complete (see Roadmap Phase 7).
- **Collaboration invite system is config-blocked / non-functional.** Supabase Auth email provider not configured. `PROJECT_INVITE_ENTRY_ENABLED` and `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` missing or not verified. Invite acceptance path must be POST-only and fail closed. Old auto-grant RPC deliberately disabled. See `.ai/03_plans/collaboration-and-sharing-audit/`.
- **Invite endpoint rate limiting missing.** All invite endpoints lack rate limiting. GET-based acceptance mutation risk must be corrected to POST-only.
- **Shared-link rate limiting is in-memory / not durable.** Password lockout and access rate limiting do not survive server restarts. Must be persistent (Redis/Upstash) before external beta.
- **Shared-link lacks per-recipient open tracking and visibility signifiers.** Missing project-card/homebase link status indicators, one-click copy, and owner digest sender identity fix.
- **Route-transition performance has groundwork but not full baseline/optimization proof.** Phase 0 baseline measurement required before optimization claims. `.ai/03_plans/route-transition-performance-optimization/CURRENT_CANONICAL_PLAN.md` is the conflict-resolution source.
- **Database indexing strategy not yet implemented.** Supabase advisor and query-plan audit required before beta. Migration parity must be checked before shared-link recipient/comment/response/event index work. Critical estimate/library/collaboration/publication query flows need EXPLAIN evidence. See `.ai/03_plans/database-indexing-and-query-performance/`.
- Local Supabase/Docker verification blocked for mutation/atomicity proof and scalar edit latency benchmarking; must use linked remote `ebxxqidacheyapmmzavr` until Docker is available.
- Do not merge, deploy, or connect additional Supabase/Postgres resources without Philip's explicit approval.
- Agent performance degradation is an explicit operational risk; use `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` when quality slips.
- Privacy Notice and Terms are pending-review status pages only; legal review is required before public launch.
- The broad dirty worktree (`wip/post-shared-link-merge-recovery`) must be isolated, reconciled, or intentionally closed out before any merge/release claim.

## Resolved product decisions (since May 18)

These were previously listed as "open product decisions" and are now resolved:

- ✅ **Supabase/Postgres connection** — Approved 2026-05-18. Supabase project `ebxxqidacheyapmmzavr` is linked and active. RLS, migrations, and auth are live.
- ✅ **First restart workflow** — Resolved. The post-reset workshop slice is implemented with `/workshop`, `/workshop/projects`, estimate workspace, library, templates, charts, and proposal export.
- ✅ **First actual `/workshop` screen** — Resolved. `/workshop` is a full-width bento-grid homebase with search, favorite shortcuts, and post-auth invite bridge.
- ✅ **Primary first user/project type** — Resolved. Lewis Residence is the deterministic demo project. Construction-style estimating remains the current wedge, while the brand narrative now includes broader quote/proposal workflows.
- ✅ **First export priority** — Resolved. Proposal XLSX preview/download exists for the current mutable estimate. Immutable issued snapshots and PDF packages are future work.
- ✅ **AI role in v1** — Resolved. Ask Flip copilot is implemented with account-aware read-only Ask and signed package-builder Draft/Apply flows. Autonomous actions, stored conversations, and vector/RAG remain unimplemented.
- ✅ **Design system** — Resolved. Non-landing app/workshop design system is enforced by `bun run lint:design-system`. SF Pro, regular/medium weights, 12px max, xs-only radius.
- ✅ **Reusable UI primitives** — Resolved. Shared UI component library under `src/components/ui/` is mandatory. Component matrix in `.ai/09_archive/store/2026-05-29-implemented-plan-cleanup/ui-componentization-and-storybook-plan.md`.
- ✅ **Estimate tree drag/drop** — Resolved. React Complex Tree DnD is implemented with app-side hierarchy guards, optimistic updates, and `public.reorder_estimate_nodes`.
- ✅ **Collaboration/Teamspaces** — Resolved. Project-scoped access, email invites, app-owned invite-entry tokens, Presence/Broadcast channels, and role-based RLS are implemented.
- ✅ **Project client publication** — Resolved. Shared Link Overhaul V2 (P0–P13) complete with password protection, recipient management, comments, decisions, activity, and `/share/[token]` receiver route.

## Still open product decisions

- **Pricing/source policy** still needs final confirmation for launch.
- **Immutable issued proposal snapshots** — Not implemented. Current export is mutable XLSX only.
- **PDF/client-facing package workflow** — Not implemented. Requires a separate publication-aware artifact plan.
- **Chart grouping/drill-down validation** — Needs beta-user validation before core launch positioning.
- **Component-library pricing/source trust metadata** — Tighten supplier provenance and lifecycle reporting before launch claims.
- **AI broader write paths** — Beyond current package-builder contracts, future paths require confirmation UX, idempotency, audit trails, RLS compatibility, and rollback strategy.
- **Stored conversations, vector/RAG, persistent user memory** for AI — All remain unimplemented and require a retention/redaction policy first.

## Technical risks

- **Local Supabase/Docker gap** — Several validations (mutation atomicity, scalar edit latency, migration reset) are blocked without local Docker. The linked remote is used as the authoritative test surface for now.
- **In-memory state for Shared Link features** — Rate limiting, circuit breakers, and password lockout are in-memory (sessionStorage + server); not durable across restarts until Redis or similar infrastructure is added.
- **Type regeneration gap** — Some TS casts exist in email/Resend paths (temporary until full Supabase type regeneration is possible).
- **Historical `.ai` plans/specs** — Some older docs still describe pre-reset prototype state. Current-state, decisions, and roadmap supersede them where conflicts exist.
- **Tests** — Should protect only currently approved behavior. Add coverage for the current post-reset route slice only when behavior is accepted enough to preserve.
- **Removed or newly added dependencies** — May remain in `package.json` during exploration. Do not infer active product direction from installed packages alone.
- **Landing page** — Copy is recalibrated around public feature anchors. Visual product areas still use placeholders/mockup labels. The landing page is marketing copy direction, not approval to restore deleted app implementation.
- **@firecms/neat replacement** — Spec'd but current repo still uses pinned/patched `@firecms/neat@0.8.0`. Strict CSP remains post-MVP until inline style/package blockers are removed.

## Product risk controls

- Estimates must not imply false precision. Preserve assumptions, pricing dates, source/confidence metadata, and user editability.
- Issued proposals/exports must be immutable snapshots if proposal functionality returns.
- Do not connect additional Supabase/Postgres resources without Philip explicitly approving.
- Do not merge/deploy without Philip explicitly approving.
- No app/workshop font above 12px, no non-xs radius, no nonzero tracking, no bold/fill icon weights.
- No duplicated feature-local buttons, search inputs, icon buttons, chips, cards, panels, dropdowns, or repeated controls.
- No AI writes, autonomous actions, retrieval/RAG, or stored conversations without explicit approval.

## New technical considerations (since May 18)

- **Route transition performance** — Groundwork phase complete (BfcacheHandler, PerformanceMonitor, usePrefetchOnHover, Skeleton, loading.tsx files). Phases 1–4 (prefetch wiring, RSC hydration, code splitting, dynamic rendering) remain.
- **Landing A/B testing** — Stack C (GA4 + Clarity + custom code) is active. Consent banner and CSP Report-Only are implemented. PostHog is deferred.
- **Package-builder memory** — Default-off source-signal ranking hints behind `AI_PACKAGE_BUILDER_MEMORY_ENABLED`. Local migration not yet applied to linked remote.
- **Migration state** — Keep local migration state and linked-remote migration state separately proven after any future schema change.
- **Worktree cleanup** — `.worktrees/feature/shared-link-overhaul-v2` and `wip/post-shared-link-merge-recovery` branch exist and need eventual reconciliation.
