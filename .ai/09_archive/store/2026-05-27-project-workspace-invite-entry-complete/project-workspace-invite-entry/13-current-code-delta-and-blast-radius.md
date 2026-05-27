# 13 - Current Code Delta And Blast Radius

## Purpose

This document maps the expected future implementation delta. It is not permission to edit code during this planning pass.

Before implementation, agents must rerun fresh GitNexus/code-review-graph impact checks for every function or module they modify.

## Known Current Contracts

- `/auth/callback` redirects successful auth to `/workshop`.
- `/workshop/onboarding` redirects to `/workshop/settings`.
- Teamspaces can invite by email, add existing users, manage roles, show/copy a readonly project link, and manage sheet access.
- `collaboration_invitations` exists but does not yet have app-owned invite tokens.
- `apply_pending_collaboration_invitations(target_user_id, target_email)` exists and is security-definer.
- `/workshop/projects` currently loads current workspace projects and does not intentionally merge cross-workspace shared projects.
- Shared/member cards do not yet have access-kind decoration.

## Expected Delta Table

| Area | Expected files | Future change | Risk |
| --- | --- | --- | --- |
| Invite schema | `supabase/migrations/*project_invite_entry*.sql`, `src/lib/supabase/types.ts` | add token table/fields, RPCs, grants, revokes, indexes | High |
| Invite route | `src/app/invite/[token]/page.tsx`, `src/components/workshop/ProjectInviteEntryPage.tsx` | create public route and compact invite UI | Medium |
| Invite server boundary | `src/lib/collaboration/invite-entry.ts` | hash token, resolve preview, accept token, map safe states | High |
| Pending bridge | `src/lib/collaboration/pending-invite-cookie.ts`, `src/app/workshop/page.tsx`, `src/components/workshop/WorkshopHomebaseClient.tsx` | set/consume/clear cookie and render non-blocking banner | Medium |
| Auth actions | `src/lib/auth/actions.ts`, `src/app/auth/callback/route.ts` | preserve `/workshop` destination, pass safe invite context only for retry/messaging | Medium |
| Teamspaces actions | `src/lib/collaboration/actions.ts` | generate invite token, send `/invite/[token]`, separate project link and invite link | Medium |
| Teamspaces UI | `src/components/workshop/ProjectTeamspaceHeader.tsx` | add pending-row `Copy invite link`, resend, revoke semantics | Medium |
| Project list repository | `src/lib/repositories/workspace-repository.ts` | merge workspace, project-member, and sheet-member projects into decorated list | High |
| Project list UI | `src/app/workshop/projects/page.tsx`, `src/components/workshop/projects-page-client.tsx`, `src/components/workshop/LiveProjectCard.tsx` | render shared/sheet-only badges, preserve view modes/search/favorites | Medium |
| Project route access | project detail, estimate list, estimate page, charts loaders | ensure sheet-only behavior is explicit and tests cover route outcomes | High |

## No-Touch Boundaries Unless Fresh Impact Analysis Justifies It

Do not change these as part of invite entry unless a smaller boundary fails and a fresh impact analysis approves it:

- `ensureDefaultWorkspace`;
- global auth success destination;
- route-wide protected shell;
- project tree/estimate row mutation semantics;
- component library loaders;
- chart aggregation internals.

Reason: invite entry must add access discovery without widening default workspace bootstrap or unrelated project behavior.

## Blast Radius By Future Slice

### Schema And RPC

Risk: High.

Reasons:

- touches RLS/security-definer posture;
- changes invite lifecycle;
- affects Supabase Auth trigger behavior;
- can create unauthorized access if token/email checks are wrong.

Required proof:

- migration tests;
- grants/revokes assertions;
- direct RPC wrong-account and replay tests;
- linked Supabase review before production apply.

### Auth Handoff

Risk: Medium.

Reasons:

- must preserve `/workshop`;
- pending cookie touches auth-adjacent flow;
- callback error retry may need safe invite path preservation.

Required proof:

- callback tests still assert success destination `/workshop`;
- no onboarding/profile/country form appears;
- pending cookie does not contain raw token or project data.

### Project List Merge

Risk: High.

Reasons:

- changes visible project inventory;
- cross-workspace shared projects must show without default workspace mutation;
- favorites/search/empty states depend on current list shape.

Required proof:

- repository tests for owned, project-member, sheet-member, duplicate merge, and role precedence;
- UI tests for every card density;
- manual/browser proof on `/workshop/projects`.

### Sheet-Only Access

Risk: High.

Reasons:

- sheet-only users need enough project shell context to navigate;
- project-wide routes may expose aggregate data if not scoped;
- charts are project-wide in current product direction.

Required proof:

- route tests for project dashboard, estimate list, estimate page, and charts;
- viewer/editor mutation tests remain blocked by RLS;
- browser proof that sheet-only UI does not show manager controls.

## File-Level Implementation Notes

`src/lib/collaboration/actions.ts`:

- separate `buildInviteRedirectUrl` from `buildProjectShareUrl`;
- do not treat existing profile detection as invite acceptance;
- expire/filter pending invitations in summaries.

`src/lib/repositories/workspace-repository.ts`:

- add a new decorated project-list loader rather than changing `ensureDefaultWorkspace`;
- keep current workspace projects as one input;
- add member projects and sheet-member projects as separate inputs;
- merge by project id and preserve highest access.

`src/components/workshop/LiveProjectCard.tsx`:

- accept access metadata through props;
- render text badges and access-kind data attributes;
- preserve existing density layouts and favorite behavior.

`src/app/workshop/page.tsx`:

- consume pending invite bridge server-side;
- pass banner state to client;
- keep workshop grid usable.

`src/app/auth/callback/route.ts`:

- success remains `/workshop`;
- only retry/error paths may preserve a safe invite route reference;
- do not log raw invite token.

