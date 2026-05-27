# 06 - Implementation Sequence And Test Plan

**Date:** 2026-05-27
**Scope:** future implementation handoff
**Mode:** planning only
**Second-pass note:** this first-pass companion doc is supplemental only. The current implementation sequence is `07-implementation-sequence-no-code-yet.md`; `/signup` references here are superseded by the `/login` canonical route contract, and `auth_events` naming is superseded by `account_security_events`.

## Implementation Contract

No implementation is authorized by this document. When implementation is approved, use test-first execution. Every production behavior change should start with a failing test or a schema validation test before app code changes.

## Expected File Surface

Likely create:

- `src/app/signup/page.tsx`
- `src/app/workshop/onboarding/page.tsx`
- `src/components/auth/AuthEntryPanel.tsx`
- `src/components/auth/AuthLegalFooter.tsx`
- `src/components/auth/AuthStateMessage.tsx`
- `src/lib/auth/events.ts`
- `src/lib/auth/policy.ts`
- `src/lib/auth/post-auth.ts`
- `tests/vitest/auth-entry-ui.test.tsx`
- `tests/vitest/auth-actions.test.ts`
- `tests/vitest/auth-callback-route.test.ts`
- `tests/vitest/auth-schema.test.ts`
- `tests/vitest/workspace-onboarding.test.tsx`
- `supabase/migrations/<timestamp>_auth_events_and_workspace_auth_policy.sql`

Likely modify:

- `src/app/login/page.tsx`
- `src/app/auth/callback/route.ts`
- `src/lib/auth/actions.ts`
- `src/lib/auth/session.ts`
- `src/proxy.ts`
- `src/lib/repositories/workspace-repository.ts`
- `tests/vitest/auth-magic-link.test.ts`
- `.env.example`
- `.ai/10_state/current-state.md`
- `.ai/10_state/decisions.md`

## Phase 0 - Pre-Implementation Gates

- [ ] Confirm Supabase Auth remains the v1 provider.
- [ ] Confirm public self-serve signup is allowed for launch, or set invite-only as the launch policy.
- [ ] Confirm production domain.
- [ ] Confirm Privacy Policy URL.
- [ ] Confirm Terms URL.
- [ ] Confirm Cookie Notice URL.
- [ ] Confirm support/security email.
- [ ] Confirm Google OAuth consent screen branding.
- [ ] Confirm Supabase redirect allow list for local, preview, and production.
- [ ] Confirm sender domain and email deliverability plan.

Validation:

```bash
git status --short --branch
git diff --check
```

Expected:

- Working tree scope is understood.
- No implementation starts from a blind dirty tree.

## Phase 1 - Auth Entry UI

Goal: create a production auth entry that supports both `/login` and `/signup` without passwords.

Test first:

- [ ] Add `tests/vitest/auth-entry-ui.test.tsx`.
- [ ] Assert `/login` mode renders "Log in", Google primary, email link fallback, no password field, and legal links.
- [ ] Assert `/signup` mode renders "Sign up", same auth methods, no password field, and legal acknowledgment copy.
- [ ] Assert sent state uses safe generic copy.
- [ ] Assert founder-specific CEO access copy is absent.

Implementation:

- [ ] Extract `AuthEntryPanel`.
- [ ] Update `src/app/login/page.tsx` to use it.
- [ ] Add `src/app/signup/page.tsx`.
- [ ] Add `AuthLegalFooter` and `AuthStateMessage`.

Validation:

```bash
bun run test:dom -- tests/vitest/auth-entry-ui.test.tsx
bun run lint:design-system
```

Expected:

- Auth UI tests pass.
- No design-system violations.

## Phase 2 - Server Actions And Callback Hardening

Goal: keep Google/email flows server-owned, generic, redirect-safe, and event-ready.

Test first:

- [ ] Add `tests/vitest/auth-actions.test.ts`.
- [ ] Assert `signInWithEmail` lowercases email and preserves sanitized path-only `next`.
- [ ] Assert `signInWithEmail` sends `emailRedirectTo` to `/auth/callback`.
- [ ] Assert no raw password fields or password methods exist in auth actions.
- [ ] Assert `signInWithGoogle` uses provider `google`, same callback route, and minimal Google scopes.
- [ ] Add callback tests for missing/invalid code, path-only redirects, and external redirect rejection.

Implementation:

- [ ] Add `src/lib/auth/post-auth.ts` for redirect resolution.
- [ ] Add `src/lib/auth/policy.ts` for allowed providers and signup policy defaults.
- [ ] Update `src/lib/auth/actions.ts` to use shared redirect and error mapping helpers.
- [ ] Update `src/app/auth/callback/route.ts` to call post-auth resolution and generic error mapping.

Validation:

```bash
bun run test:dom -- tests/vitest/auth-actions.test.ts tests/vitest/auth-callback-route.test.ts tests/vitest/auth-magic-link.test.ts
bun run type-check
```

Expected:

- Existing magic-link behavior remains covered.
- New redirect/error/provider policy coverage passes.

## Phase 3 - Auth Events And Policy Tables

Goal: add metadata-only auth/security events and workspace auth policy defaults.

Test first:

- [ ] Add `tests/vitest/auth-schema.test.ts`.
- [ ] Assert migration creates `auth_events`.
- [ ] Assert migration enables RLS on `auth_events`.
- [ ] Assert direct browser grants cannot forge auth events.
- [ ] Assert migration creates `workspace_auth_policies`.
- [ ] Assert policy defaults allow Google and email link.
- [ ] Assert no migration stores raw token/OTP fields.

Implementation:

- [ ] Add migration for `auth_events` and `workspace_auth_policies`.
- [ ] Add `src/lib/auth/events.ts` with server-only event recording.
- [ ] Wire best-effort event recording into email, Google, callback success/failure, signout, and invite acceptance paths.

Validation:

```bash
bun run test:dom -- tests/vitest/auth-schema.test.ts tests/vitest/auth-actions.test.ts
bun run type-check
```

Expected:

- Auth event schema is locked before events are written.
- Event writes do not become a browser-forgeable audit path.

## Phase 4 - First-Run Onboarding

Goal: distinguish sign-up success from workspace readiness.

Test first:

- [ ] Add `tests/vitest/workspace-onboarding.test.tsx`.
- [ ] Assert a user without default workspace routes to `/workshop/onboarding`.
- [ ] Assert invited collaborators can continue to invited project/sheet without creating an unnecessary company workspace.
- [ ] Assert onboarding asks required self-serve users for display name, organization/workspace name, organization type, user category/profession, and country/region.
- [ ] Assert user category/profession includes student/educator options without granting any authorization role.
- [ ] Assert optional fields such as primary use, company size, default currency, and student/school detail can be skipped.
- [ ] Assert onboarding creates owner membership through existing workspace repository boundary.
- [ ] Assert every onboarding field has an authenticated settings edit path.
- [ ] Assert profile fields can be edited by the signed-in user.
- [ ] Assert workspace fields can only be edited by workspace owner/admin users.

Implementation:

- [ ] Add `/workshop/onboarding`.
- [ ] Add `/workshop/settings/profile`.
- [ ] Add `/workshop/settings/workspace`.
- [ ] Add minimal onboarding client/server action.
- [ ] Add minimal profile/workspace settings client/server actions.
- [ ] Update post-auth destination to choose onboarding, invited resource, or sanitized `next`.
- [ ] Keep `ensureDefaultWorkspace()` behavior compatible with existing protected routes.

Validation:

```bash
bun run test:dom -- tests/vitest/workspace-onboarding.test.tsx tests/vitest/workspace-repository-estimate-tree.test.ts
bun run type-check
```

Expected:

- New-user flow is explicit.
- Existing workspace bootstrap tests continue to pass.

## Phase 5 - Invitation Acceptance Polish

Goal: make corporate/project invitations coherent in the auth flow.

Test first:

- [ ] Extend collaboration tests for invited new user post-auth flow.
- [ ] Assert pending project invite applies after auth user creation.
- [ ] Assert expired/revoked invite produces safe UI copy.
- [ ] Assert role rank cannot be escalated by callback parameters.

Implementation:

- [ ] Keep invite creation in `src/lib/collaboration/actions.ts`.
- [ ] Add post-auth pending invitation resolution helper if not already database-owned.
- [ ] Add role confirmation state on landing project/sheet page if needed.

Validation:

```bash
bun run test:dom -- tests/vitest/project-collaboration-actions.test.ts tests/vitest/project-collaboration-schema.test.ts tests/vitest/auth-actions.test.ts
```

Expected:

- Invitations work for existing and new users.
- No client-supplied auth/callback param grants access.

## Phase 6 - Production Config And Manual QA

Goal: prove real flows before release.

Configuration checks:

- [ ] Supabase Site URL set to production domain.
- [ ] Supabase Additional Redirect URLs include approved local/staging/prod callback URLs.
- [ ] Google OAuth client id/secret installed.
- [ ] Google OAuth consent screen has brand, privacy URL, terms URL, and minimal scopes.
- [ ] Email sender domain configured with SPF/DKIM/DMARC.
- [ ] Magic-link and invite templates are branded and safe.
- [ ] Vercel env vars are set per environment.

Manual QA:

- [ ] `/signup` with Google creates a user and lands on onboarding.
- [ ] `/signup` with email link creates a user and lands on onboarding.
- [ ] `/login?next=/workshop/projects` returns to projects.
- [ ] Expired link returns to safe error state.
- [ ] Authenticated user visiting `/login` or `/signup` redirects away.
- [ ] Invite for new user lands in invited project/sheet.
- [ ] Viewer cannot mutate protected project/sheet data.
- [ ] Dev auth bypass remains local-only.

Validation:

```bash
bun run validate
bun run build
git diff --check
```

Expected:

- Full validation passes.
- Build passes.
- No whitespace/check errors.

## Phase 7 - Documentation And State Sync

Goal: keep `.ai` truth current after implementation.

Update:

- `.ai/10_state/current-state.md`
- `.ai/10_state/decisions.md`
- This plan pack if implementation changes scope.
- `.env.example`
- Any README/startup docs that mention sign-up/login.

Validation:

```bash
git diff --check
```

Expected:

- Product state says exactly what shipped.
- No docs claim passwords, SSO, MFA, or enterprise readiness before those are implemented.

## Release Checklist

- [ ] Tests for UI, actions, callback, schema, onboarding, and invitations pass.
- [ ] `bun run validate` passes.
- [ ] `bun run build` passes.
- [ ] Google and email flows are manually verified in staging.
- [ ] Privacy/Terms/Cookie links are live.
- [ ] Auth events record metadata only.
- [ ] Service-role key remains server-only.
- [ ] Dev auth bypass disabled in production.
- [ ] Rollback plan is clear: route CTAs can point back to `/login`, and new `/signup` can be hidden without breaking protected route auth.

## Deletion Criteria

If Philip rejects the direction:

- Remove `/signup` route.
- Keep `/login` if current auth still needs it.
- Remove extracted auth UI components only if no route imports them.
- Keep Supabase callback/session infrastructure unless replacing the provider.
- Roll back new auth policy/event tables only if no production data has been written; otherwise write a forward migration that disables usage safely.
