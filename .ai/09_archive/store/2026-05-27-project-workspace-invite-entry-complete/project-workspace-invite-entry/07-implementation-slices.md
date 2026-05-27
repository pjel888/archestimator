# 07 - Implementation Slices

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` for implementation after this plan is approved. Steps are intentionally execution-ready but must not be started until implementation is requested.

**Goal:** Add project invitation entry through `/invite/[token]`, preserve `/workshop` as the post-auth landing page, and show shared projects clearly on `/workshop/projects`.

**Architecture:** Add a public invite resolver route backed by hashed invitation tokens, use a short-lived pending-invite bridge through auth, and merge accessible shared projects into the protected projects list. Keep authorization in server actions, RPCs, and RLS.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase Auth/RLS/RPC, Bun, Vitest, React Testing Library, Playwright/browser QA.

---

## Slice 1: Tokenized Invitation Contract

**Expected files:**

- Modify: `supabase/migrations/*_project_invite_entry_tokens.sql`
- Modify: `src/lib/supabase/types.ts`
- Create or modify: central server feature-flag helper for `PROJECT_INVITE_ENTRY_ENABLED`
- Create: `tests/vitest/project-invite-feature-flag.test.ts`
- Create: `tests/vitest/project-invite-entry-schema.test.ts`

Steps:

- [ ] Write failing feature-flag tests for disabled route, disabled token generation, and preserved project-link behavior.
- [ ] Write failing pepper-gate tests proving missing `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` disables invite entry.
- [ ] Write failing schema tests for token hash storage, no raw token storage, RPC names, and lifecycle fields.
- [ ] Write failing schema tests that `apply_pending_collaboration_invitations(uuid, text)` is revoked from `anon` and `authenticated`.
- [ ] Run the schema test and confirm red.
- [ ] Add `PROJECT_INVITE_ENTRY_ENABLED` gate, default disabled outside explicit development/test rollout.
- [ ] Add server-only invite-token pepper guard with no unpeppered fallback.
- [ ] Add the `collaboration_invitation_tokens` child table and required invitation lifecycle fields.
- [ ] Add atomic resolve/accept/revoke/issue-token/record-delivery RPCs with transaction safety.
- [ ] Add explicit grant posture for security-definer functions.
- [ ] Update generated Supabase types.
- [ ] Run schema test and confirm green.

## Slice 2: Invite Entry Route State Model

**Expected files:**

- Create: `src/app/invite/[token]/page.tsx`
- Create: `src/components/workshop/ProjectInviteEntryPage.tsx`
- Create: `src/lib/collaboration/invite-entry.ts`
- Create: `tests/vitest/project-invite-entry-route.test.ts`
- Modify: `src/proxy.ts` if route protection needs allowlist changes.

Steps:

- [ ] Write failing route-state tests for invalid, expired, revoked, signed-out, signed-in, wrong-account, already-member, and accepted states.
- [ ] Run route tests and confirm red.
- [ ] Implement the server-only resolver.
- [ ] Implement the compact invite page view.
- [ ] Allow `/invite/[token]` through route protection without making project data public.
- [ ] Run route tests and confirm green.

## Slice 3: Pending Invite Bridge Through Auth

**Expected files:**

- Create: `src/lib/collaboration/pending-invite-cookie.ts`
- Modify: `src/lib/auth/actions.ts`
- Modify: `src/app/auth/callback/route.ts` only if audit/retry metadata needs adjustment; do not change successful destination away from `/workshop`.
- Modify: `src/app/workshop/page.tsx`
- Modify: `src/components/workshop/WorkshopHomebaseClient.tsx`
- Create: `tests/vitest/workshop-pending-invite.test.tsx`
- Modify: `tests/vitest/auth-callback-route.test.ts`

Steps:

- [ ] Write failing tests proving success still lands on `/workshop`.
- [ ] Write failing tests for non-blocking pending invite acceptance on `/workshop`.
- [ ] Run tests and confirm red.
- [ ] Set and clear a short-lived httpOnly pending invite cookie.
- [ ] Resolve pending invite on `/workshop`.
- [ ] Render accepted/error invite banner without blocking the page.
- [ ] Run tests and confirm green.

## Slice 4: Teamspaces Email And Copy Invite Link

**Expected files:**

- Modify: `src/lib/collaboration/actions.ts`
- Modify: `src/components/workshop/ProjectTeamspaceHeader.tsx`
- Modify: `tests/vitest/project-collaboration-actions.test.ts`
- Modify: `tests/vitest/teamspace-collaboration-header.test.tsx`

Steps:

- [ ] Write failing tests that invite emails use `/invite/[token]`.
- [ ] Write failing tests for pending invite copy URL.
- [ ] Run tests and confirm red.
- [ ] Generate token on invite create/upsert.
- [ ] Use `/auth/callback` as the Supabase Auth redirect and preserve `/invite/[token]` only as the app-owned CTA/safe `next` context.
- [ ] Separate `Copy project link` from `Copy invite link` semantics.
- [ ] Filter expired invitations out of active pending invite lists and render expired rows only in an explicit expired section if shown.
- [ ] Run tests and confirm green.

## Slice 5: Shared Project Listing

**Expected files:**

- Modify: `src/lib/repositories/workspace-repository.ts`
- Modify: `src/app/workshop/projects/page.tsx`
- Modify: `src/components/workshop/projects-page-client.tsx`
- Modify: `src/components/workshop/LiveProjectCard.tsx`
- Create: `tests/vitest/projects-page-shared-access.test.tsx`
- Modify: `tests/vitest/projects-page-view-mode.test.tsx`

Steps:

- [ ] Write failing repository and UI tests for owned/shared/sheet-only project items.
- [ ] Run tests and confirm red.
- [ ] Add a decorated project list item type.
- [ ] Merge current workspace projects with project-member and sheet-member projects.
- [ ] Add shared role badges and a subtle shared-card signal.
- [ ] Preserve favorites, search, and view modes.
- [ ] Run tests and confirm green.

## Slice 6: Security And Lifecycle Hardening

**Expected files:**

- Modify: `src/lib/collaboration/invite-entry.ts`
- Modify: `src/lib/collaboration/actions.ts`
- Modify: `tests/vitest/project-invite-entry-route.test.ts`
- Modify: `tests/vitest/project-collaboration-schema.test.ts`

Steps:

- [ ] Add red tests for wrong-account, reused token, expired token, revoked token, and no raw token audit metadata.
- [ ] Run tests and confirm red.
- [ ] Add transactional guards and public-safe error mapping.
- [ ] Add audit metadata without raw tokens.
- [ ] Run tests and confirm green.

## Slice 7: Browser QA And Closeout

**Expected checks:**

- `e2e/project-invite-entry.spec.ts`;
- desktop invite preview;
- mobile invite preview;
- signed-out to `/login` to `/workshop` handoff;
- signed-in correct-account accept;
- wrong-account state;
- `/workshop/projects` shared badges in all card densities;
- viewer permissions stay read-only.

Closeout commands:

- [ ] targeted invite/auth/collaboration Vitest command;
- [ ] `bun run type-check`;
- [ ] `bun run lint`;
- [ ] `bun run lint:design-system`;
- [ ] `git diff --check`;
- [ ] `bun run validate` if unrelated dirty-worktree failures are resolved or explicitly isolated;
- [ ] browser screenshots or DOM evidence recorded in this plan folder.
