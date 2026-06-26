# 02 — Feature Brief and Scope

## Source brief (user's words, lightly edited for typos)

> "We have a new feature, `http://localhost:3000/workshop/publisher`. You will put everything [in `.ai/03_plans/2026-06-25-Publisher-Page/`]. This page will basically handle all the shared links, the published projects, including RBAC as in those people who can edit the estimate sheet or project or all estimate sheets or some estimate sheets under project etc. etc. This will be the main page for that.
>
> This page will also handle the access to the published estimate sheets — access to those who are clients that can view, edit, comment etc. etc.
>
> Our task now is not a coding / implementation task. Our task is to prepare for that feature: comprehensively study the whole codebase, audit, review, take notes and then put everything [in the plan folder]. You also need to study more on RBAC and OWASP if ever because we need to be able to secure this route properly."

---

## User outcomes (what success looks like)

| Persona | Outcome |
|---|---|
| Architect (project owner) | I can publish a project's estimate sheets to a client in under 30 seconds from one screen. |
| Cost estimator (editor) | I can see exactly which sheets I can edit, which I can only view, and which I cannot see — at a glance, on one page. |
| Workspace admin | I can audit every publication, comment, decision, grant change, and revoke across all projects from one timeline. |
| External client (recipient) | My access to a published sheet is clear — I can view, I can comment, I can submit a decision. (Edit-grant is a future cut-line.) |
| Founder (Philip) | The Publisher page is the trust surface — clients land on a clean, branded, secured view; builders manage it from a single home. |

## Scope (in)

1. **Read surfaces.** Unified roster of publications, members, grants, activity. Server-rendered; RLS-enforced.
2. **Action surfaces.** Publish / rotate / revoke / republish; add / remove recipients; grant / revoke sheet access; toggle access-mode (inherits-project / sheet-overrides / restricted); invite collaborators.
3. **Filtering / search.** Per workspace, per project, per status (published / expired / revoked / unpublished), per stale-snapshot, per activity-pressure.
4. **Activity feed.** Unified timeline across `shared_link_events`, `shared_link_comments`, `shared_link_responses`, `collaboration_audit_events`, `estimate_sheet_events`.
5. **Publication health.** Stale-snapshot warnings, open-count, latest-activity, recipient roster with per-recipient last-open.
6. **Routing.** Top-level `/workshop/publisher` (workspace-scoped) for Phase 1-3; project pages deep-link with query params rather than adding `/workshop/projects/[projectId]/publisher` now.
7. **Sidebar nav.** A `Publisher` item in `MainSidebar`.
8. **Feature flag.** Phased rollout via `ARCHESTIMATOR_PUBLISHER_ENABLED` (or similar) — page renders an empty state until enabled, never breaks existing routes.

## Scope (out / non-goals)

- **NOT** building a new token / cookie / crypto / lockout primitive. The existing `src/lib/publication/security.ts` is reused as-is.
- **NOT** changing the existing role hierarchy or rank values.
- **NOT** building CRDT / OT real-time collaborative editing. (Roadmap item in `teamspaces-collaboration-spec.md:124`.)
- **NOT** routing AI features (Ask Flip, Package Builder) through Publisher.
- **NOT** migrating the existing Teamspaces + Publication manager modals away in Phase 1 — they coexist until Phase 4 (decision D4).
- **NOT** external / unauthenticated access to Publisher. Every Publisher route is `/workshop/*` → protected by `src/proxy.ts:8 PROTECTED_PREFIXES = ["/workshop"]`.
- **NOT** mobile-first design. Workshop is desktop-first (builder persona). Responsive to tablet is the floor.
- **NOT** public / anonymous API. The Publisher calls existing server actions and existing `/api/share/[token]/*` endpoints; it does not add new public endpoints in Phase 1.
- **NOT** Phase 5 backlog work in the first build. Bulk ops, optional RPC scaling, notifications, DPoP research, mobile-native Publisher, i18n, and white-label portals are deferred in `20_PHASE_5_FUTURE_BACKLOG_2026-06-26.md`.
- **NOT** AI features. No Ask Flip, Package Builder, AI summaries, AI activity interpretation, or AI audit-table integration.

## Target users (canonical personas — see `teamspaces-collaboration-spec.md`)

| Persona | Project role | Workspace role | Publisher use |
|---|---|---|---|
| Maya — Architect / Founder | owner (40) | ceo / admin | Publish, manage recipients, rotate, revoke, audit |
| Rina — Cost estimator | editor (20) | member | View publications she has access to; comment internally |
| Carlo — Engineer | editor (20) | member | Same as Rina, project-scoped |
| Jun — Client / Owner | (external) | (external) | NOT a Publisher user — uses `/share/[token]` |
| Philip — Founder / CEO | owner | ceo | Workspace-wide audit + trust verification |

## Constraints

- **Stack:** Next.js 16.2.6 (App Router, RSC), React 19.2.6, Bun, TypeScript strict, Tailwind v4, Supabase Postgres 17, TanStack Query 5, Zustand 5. See `README.md` (root) stack table.
- **Design system:** SF Pro regular/medium, 12px max font, 3px radius, zero letter-spacing, neutral palette, Phosphor + Lucide icons. Enforced by `scripts/enforce-app-design-system.mjs`. See `DESIGN.md` (alpha-stage guide — defer to Philip).
- **Auth gate.** `src/proxy.ts:8 PROTECTED_PREFIXES = ["/workshop"]` — closed-beta auth required (`src/lib/auth/closed-beta-access.ts`).
- **DB mandate.** Standing authorization for project `ebxxqidacheyapmmzavr` only (AGENTS.md). No other provider projects. No secrets. No PITR.
- **Pre-launch posture.** Closed beta, owner-only, no external users yet (`current-state.md` FAST PATH). Bias to fast, useful iteration over heavyweight regression ceremony.
- **Concurrent-work check.** Branch names are time-sensitive. Before implementation, re-run branch/status checks and do not edit sidebar, project-delete, or project-dashboard files if another active branch owns them.

## Success metrics (post-launch, hypothesis — not launch gates)

| Metric | Target | Source |
|---|---|---|
| Builder time-to-publish (from project open → share link copied) | < 30s | Activity log |
| Builder switches between surfaces to manage a single publication | 0 (was 3+) | UX audit |
| Stale-snapshot publications (snapshot > 14 days behind latest estimate) | < 5% of active | Publication roster |
| Recipient open-rate within 7 days | > 60% | `shared_link_events` |
| Comment/decision latency (recipient → builder notification) | < 15 min (existing digest window) | Resend logs |

## Failure metrics (anti-success)

- Any privilege escalation (RLS regression) → block release.
- Any token leak (URL in logs, source maps, error messages) → block release.
- Any broken existing share-link receiver route → block release.
- Builder NPS on Publisher < neutral in closed beta → redesign.

## Dependencies

- **Hard.** Existing `src/lib/publication/*` (do not fork). Existing `src/lib/collaboration/*` (do not fork). Existing `src/lib/repositories/workspace-repository.ts` permission rollups. Existing RLS on `project_publications`, `shared_link_*`, `project_members`, `estimate_sheet_*`.
- **Soft.** Sidebar redesign branch (should not collide). Project-delete hardening branch (should not collide).
- **External.** Supabase project `ebxxqidacheyapmmzavr`. Resend (for digest emails — already wired).

## Assumptions

- Philip wants a **workspace-first** roster with project drill-down (vs project-first). Recommended in `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` D5; reversible if he disagrees.
- The existing `ProjectTeamspaceHeader` + `ProjectPublicationHeader` modals **coexist** with Publisher in Phase 1–3 and are **consolidated** into Publisher in Phase 4. (D4)
- Per-recipient "edit-grant" is **not** in MVP. (D1) The data model leaves room for it but the UI does not expose it.
- "All sheets" vs "some sheets" editor scope is expressed via the existing `estimate_sheet_access_settings.access_mode` enum; Publisher only adds UI on top. (D2)

## Out-of-scope variants (explicit)

- Public/API-driven publication from external systems. (Use Zapier-style integrations later.)
- White-label client portals (custom domain per client). (Enterprise tier future.)
- Multi-language publications. (i18n is separate.)
- Off-platform PDF generation. (ExcelJS XLSX export is the existing surface; PDF is roadmap.)
