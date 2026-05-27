# Current State And Blast Radius Audit

**Date:** 2026-05-27
**Status:** Implemented baseline audit. Use this for blast-radius context and compare against the current V1 implementation/closeout files.

## Current Visible Surface

The project detail route is protected under `/workshop/projects/[projectId]`. The current project header has:

- a left project code area;
- an optional center estimate metadata strip on estimate routes;
- a right action slot sized by `--estimate-library-panel-width`;
- a Teamspaces rail in the right action slot.

Current repo truth:

- `src/app/workshop/projects/[projectId]/layout.tsx` loads the project, loads `getProjectCollaborationSummary(projectId)`, and renders `ProjectWorkspaceHeaderRow`.
- `src/components/workshop/ProjectWorkspaceHeaderRow.tsx` passes only `ProjectTeamspaceHeader` into `rightContent`.
- `src/components/workshop/ProjectWorkspaceHeaderRow.tsx` renders the right action slot as an absolute right-side sibling with width `var(--estimate-library-panel-width)`.
- `src/components/workshop/ProjectTeamspaceHeader.tsx` owns the visible `Teamspaces` rail, access-management modal, project/sheet invite actions, and private realtime summary.
- `src/components/workshop/ProjectTeamspaceHeader.tsx` currently labels its authenticated internal URL copy as `Share page`, `Project share link`, and `Copy share link`. This is a concrete naming collision to fix before publication ships.
- `src/proxy.ts` protects only `/workshop` and bypasses `/api`.
- `src/components/workshop/WorkshopPageShell.tsx` is the internal app shell; receiver routes must not import it.
- No publication receiver route, publication schema, token/password gate, or open-tracking implementation exists in `src/app` or migrations yet.

## Existing Teamspaces Boundary

Teamspaces is internal collaboration:

- authenticated users;
- workspace/project/estimate membership;
- project roles;
- estimate-sheet access settings;
- invitations through Supabase Auth;
- private project Presence and estimate Broadcast channels.

Publication is external/client viewing:

- no membership creation;
- no collaborator role assignment;
- no private Realtime channel exposure;
- no Workshop shell;
- no internal edit/read authority beyond the sanitized receiver snapshot.

Important wording: "no membership creation" applies to publication links only. Existing Teamspaces invitations intentionally create project or estimate memberships after valid auth/invitation acceptance.

## Adjacent Active Plans

Read these before implementation:

- `.ai/09_archive/store/2026-05-27-project-workspace-invite-entry-complete/project-workspace-invite-entry/` - completed authenticated invitation entry. Reuse anti-enumeration thinking, not membership semantics.
- `.ai/09_archive/store/2026-05-27-sign-up-login-authentication-local-implementation-evidence/` - Supabase Auth, safe-next behavior, provider/legal blockers, account data tables, auth runbooks.
- `.ai/03_plans/landing-page-improvement/ab-testing-gdpr-international-compliance/` - public cookie/privacy/legal readiness and CSP thinking.
- `docs/superpowers/plans/2026-05-26-teamspace-collaboration-header.md` - Teamspaces header implementation history and current seam.

## Route And Proxy Facts

- `/workshop` and children are protected.
- `/share/[token]` should be outside `/workshop` and must not redirect to `/login`.
- `/api` routes bypass proxy auth, so future publication APIs must self-authorize.
- Public receiver routes must validate token, status, expiry, password/session, scope, and cache policy before resolving any private data.

## Data Facts

Current collaboration schema includes:

- `project_members`;
- `estimate_sheet_members`;
- `estimate_sheet_access_settings`;
- `collaboration_invitations`;
- member-based RLS helpers and policies.

Current public/anonymous publication access is intentionally absent. The first schema foundation and later collaboration migrations do not grant anonymous read access to core app tables.

Planning implications:

- Do not grant anon direct reads to projects, estimates, estimate nodes, estimate row items, cost library, collaboration, or publication management tables.
- Use server-only publication resolvers after token/password validation.
- Keep publication tables separate from collaboration membership tables.
- Verify both local migration files and linked remote state before claiming Supabase is updated.

## Proposal And Export Facts

Current proposal export is private/authenticated and reads current estimate data. It is not a publication artifact.

Planning implications:

- Do not use the private proposal XLSX route as a public download route.
- Do not imply published estimates are issued proposals.
- V1 disables downloads.
- Future downloads must use a publication-aware resolver, explicit permission, separate event type, and snapshot/artifact contract.

## Blast Radius

Risk rating: **High for implementation**, even though the header placement itself is medium. The feature crosses public routes, passwords, tracking, RLS, snapshot data, legal/privacy gates, and client-facing data exposure.

| Area | Likely files/modules | Risk | Required guard |
| --- | --- | --- | --- |
| Header composition | `ProjectWorkspaceHeaderRow.tsx`, future `ProjectPublicationHeader` | Medium | Placement tests prove `Publish` is left of Teamspaces |
| Teamspaces naming cleanup | `ProjectTeamspaceHeader.tsx`, `teamspace-collaboration-header.test.tsx` | Medium | Private link copy renamed and tested |
| Protected layout data | `[projectId]/layout.tsx`, `workspace-repository.ts` | Medium | Publication summary load does not widen collaboration reads |
| Publication actions | new `src/lib/publication/actions.ts` | High | Owner/admin checks and raw-secret tests |
| Publication repository | new `src/lib/publication/repository.ts` | High | Server-only reads/writes and no anon browser grants |
| Receiver resolver | new `src/lib/publication/receiver.ts` | Critical | Token/password/session validation before data access |
| Snapshot builder | new `src/lib/publication/snapshot.ts` | Critical | Whitelist-only safe DTO |
| Public route | new `src/app/share/[token]/page.tsx` and route helpers | Critical | No Workshop shell, noindex, no-store, generic failures |
| Password/API routes | new `/api/share/[token]/...` or route actions | Critical | CSRF, rate limits, no raw token/password logs |
| Supabase schema | new migration, generated types, RLS/grants | Critical | RLS enabled, browser grants denied, remote proof |
| Open tracking | event table, summary loader, manager UI | High | Metadata-only, retention, copy does not overclaim |
| Privacy/legal | `/privacy`, `/terms`, consent/tracking disclosure | High | Reviewed launch artifacts required |

## Files To Read Before Implementation

- `.ai/10_state/current-state.md`
- `.ai/10_state/decisions.md`
- `.ai/00_system/VALIDATION_MATRIX.md`
- `DESIGN.md`
- `.ai/09_archive/store/2026-05-27-project-workspace-invite-entry-complete/project-workspace-invite-entry/README.md`
- `docs/superpowers/plans/2026-05-26-teamspace-collaboration-header.md`
- `src/app/workshop/projects/[projectId]/layout.tsx`
- `src/components/workshop/ProjectWorkspaceHeaderRow.tsx`
- `src/components/workshop/ProjectTeamspaceHeader.tsx`
- `src/components/workshop/WorkshopPageShell.tsx`
- `src/lib/repositories/workspace-repository.ts`
- `src/lib/collaboration/actions.ts`
- `src/proxy.ts`
- `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`
- `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql`
- `supabase/migrations/20260527072220_auth_account_data.sql`
- `tests/vitest/teamspace-collaboration-header.test.tsx`
- `tests/vitest/auth-proxy.test.ts`
- `tests/vitest/project-collaboration-actions.test.ts`
- `tests/vitest/project-collaboration-schema.test.ts`
- `tests/vitest/project-collaboration-summary.test.ts`
- `tests/vitest/proposal-export-route.test.ts`
- `tests/vitest/proposal-export-model.test.ts`

## Do Not Change During This Planning Phase

- Product source files.
- Supabase migrations.
- Generated Supabase types.
- Tests.
- Current Teamspaces behavior.
- Current proposal export behavior.
- Remote Supabase state.
