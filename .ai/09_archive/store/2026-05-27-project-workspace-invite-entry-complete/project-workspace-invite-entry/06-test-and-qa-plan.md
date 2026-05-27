# 06 - Test And QA Plan

## TDD Rule

No production implementation should start until the first failing test for that slice is written and run red.

Use small red-green slices:

1. route state model;
2. token persistence and resolution;
3. signed-out pending invite bridge;
4. signed-in acceptance;
5. `/workshop` pending invite banner;
6. `/workshop/projects` shared project listing;
7. Teamspaces copy invite URL;
8. browser QA.

## Unit And Static Tests

### Auth Callback Contract

Modify or add tests around `tests/vitest/auth-callback-route.test.ts`:

- successful auth with `next=/invite/token` still redirects to `/workshop`;
- audit metadata does not store raw invite token;
- login error redirect can preserve safe invite path for retry.

Expected red before implementation: missing invite-specific assertions or failing pending bridge.

### Invite Token Schema

Add `tests/vitest/project-invite-entry-schema.test.ts`:

- migration adds token hash or child invite-token table;
- raw token columns are absent;
- expiration, revocation, accepted, and invited user lifecycle remain present;
- acceptance RPC validates token hash and email match;
- RLS does not grant browser clients direct token lookup.
- `apply_pending_collaboration_invitations` has explicit revoke/grant hardening and is not callable by normal clients.

### Invite Entry Route

Add `tests/vitest/project-invite-entry-route.test.ts`:

- invalid token returns non-leaky invalid state;
- expired token returns expired state only after hash match;
- revoked token returns revoked state;
- signed-out valid token sets pending bridge and shows preview;
- signed-in matching user can accept;
- signed-in wrong account sees mismatch;
- already-member user sees open-project state.

### Pending Invite Bridge

Add `tests/vitest/workshop-pending-invite.test.tsx`:

- `/workshop` consumes a pending invite cookie for the authenticated matching user;
- accepted invite creates or confirms membership;
- no country/profile/workspace form appears;
- failure state is non-blocking.

### Teamspaces Invite Controls

Extend `tests/vitest/project-collaboration-actions.test.ts` and `tests/vitest/teamspace-collaboration-header.test.tsx`:

- `Copy invite link` exists for a pending email invite;
- copied invite URL starts with `/invite/`;
- project share URL remains available separately only as a readonly project link for members;
- invite send uses the invite-entry redirect, not direct project route.

### Project Listing Membership UI

Extend `tests/vitest/projects-page-view-mode.test.tsx` or add `tests/vitest/projects-page-shared-access.test.tsx`:

- shared project card renders `Viewer`, `Editor`, or `Admin`;
- shared project has a non-color-only text badge;
- `data-project-access-kind` is present for owned/shared states;
- empty state does not appear when only shared projects exist;
- search includes shared projects.

## Integration Tests

Add repository tests for the merged project list:

- default workspace projects are included;
- project-member projects from another workspace are included;
- estimate-sheet-member projects are included as sheet-only;
- duplicate projects merge to the highest role/access kind;
- favorites still map by project id.

Add collaboration acceptance tests:

- pending email-bound project invite creates `project_members`;
- pending email-bound estimate invite creates `estimate_sheet_members`;
- conflicting lower role does not downgrade existing role;
- accepted invite cannot be reused by a different user.
- expired invitations do not render as active pending invitations in Teamspaces summaries.
- existing-user direct grant does not get counted as recipient-click acceptance unless the recipient actually accepts through the route.

## Browser QA Gate

The in-app browser connector was unavailable during planning, so implementation must include fresh browser evidence later.

Manual/browser scenarios:

- signed-out `/invite/[token]` preview at desktop and mobile widths;
- Continue to `/login`, sign in, land on `/workshop`, see accepted invite banner;
- signed-in correct account opens `/invite/[token]` and accepts;
- signed-in wrong account opens `/invite/[token]` and sees mismatch;
- `/workshop/projects` shows shared project badge/border in large, medium, small, and list modes;
- viewer role cannot see or use manager-only controls;
- revoked/expired links show non-leaky states.

## Validation Commands For Implementation Closeout

Targeted first:

```bash
bunx vitest run tests/vitest/project-invite-entry-route.test.ts tests/vitest/workshop-pending-invite.test.tsx tests/vitest/projects-page-shared-access.test.tsx --maxWorkers=1
```

Then collaboration/auth related:

```bash
bunx vitest run tests/vitest/auth-callback-route.test.ts tests/vitest/auth-onboarding-guard.test.ts tests/vitest/project-collaboration-actions.test.ts tests/vitest/project-collaboration-schema.test.ts tests/vitest/project-collaboration-summary.test.ts tests/vitest/teamspace-collaboration-header.test.tsx --maxWorkers=1
```

Then static checks:

```bash
bun run type-check
bun run lint
bun run lint:design-system
git diff --check
```

Full closeout when implementation is broad:

```bash
bun run validate
bun run build
```

Known current caveat: prior validation had unrelated landing interactivity failures in the dirty worktree. Do not claim full validation until rerun output is clean or those failures are explicitly separated.
