# Implementation Sequence

**Status:** no code implementation yet
**Execution style:** test-first, small slices, graph/impact analysis before touching auth/session/proxy/workspace symbols

## Pre-Implementation Gate

Before editing code:

1. Verify current branch and dirty worktree.
2. Read this pack plus `.ai/10_state/current-state.md`, `.ai/10_state/decisions.md`, and `DESIGN.md`.
3. Run GitNexus/code-review-graph impact analysis for symbols/files to edit.
4. Confirm hosted Supabase Auth settings if production behavior is in scope.
5. Choose the first slice:
   - recommended: `Auth UI + action hardening + tests`.
6. Read `11-second-pass-adversarial-review-and-blast-radius.md` and resolve its launch blockers or explicitly mark them as out of scope for the local slice.

## Phase 0: Provider And Config Audit

**Goal:** prove the current provider setup can support the intended passwordless production posture.

Expected work:

- Inspect hosted Supabase Auth settings:
  - Site URL;
  - redirect allow-list;
  - email provider;
  - Google provider;
  - signup policy;
  - anonymous disabled;
  - refresh token rotation;
  - OTP/magic-link expiration;
  - rate limits;
  - security notifications;
  - SMTP/custom sender.
- Inspect Google Cloud OAuth setup:
  - OAuth consent screen;
  - privacy/terms URLs;
  - scopes;
  - authorized origins;
  - redirect URIs.
- Decide whether provider-level no-password enforcement is available.
- Decide public self-serve vs invite-only email behavior and therefore `shouldCreateUser` policy.
- Decide exact production/staging/local/preview redirect allow-list.
- Decide canonical app URL env name and allowed-origin list.

Artifacts:

- add a provider-config checklist result under this plan pack or `.ai/02_audits`.
- no secrets in the repo.

Validation:

- documented dashboard screenshots or redacted notes;
- residual-risk memo if provider-level passwordless-only cannot be proven;
- `git diff --check` if docs are changed.

## Phase 1: Auth UI Productization

**Goal:** turn current `/login` into a polished Sign up / Log in entry that supports Google, email link, errors, and legal links.

Likely files:

- `src/app/login/page.tsx`
- optional `src/app/sign-in/page.tsx`
- optional `src/app/sign-up/page.tsx`
- `src/components/ui/*` only if a reusable auth primitive is truly needed
- `tests/vitest/auth-magic-link.test.ts`
- new auth UI test file if needed

Required behaviors:

- Google button remains first.
- Email link remains fallback.
- No password fields.
- No CEO/internal copy.
- Privacy/terms links present.
- Stable success/error states.
- Route mode hints for sign-up/sign-in aliases if added.
- Do not add `/signup` unless this plan is reopened.
- Works at mobile and desktop widths.

Test-first plan:

1. Add/adjust tests proving no password fields render.
2. Add tests proving Google and email-link forms render.
3. Add tests proving production copy does not include CEO/internal text.
4. Add tests proving legal links render.
5. Implement UI changes.
6. Run targeted tests, then `bun run validate`.

## Phase 2: Auth Action And Callback Hardening

**Goal:** centralize redirect/error handling and make provider flows production-safe.

Likely files:

- `src/lib/auth/actions.ts`
- `src/app/auth/callback/route.ts`
- new `src/lib/auth/redirects.ts`
- new `src/lib/auth/error-mapping.ts`
- `tests/vitest/auth-magic-link.test.ts`

Required behaviors:

- one shared safe-next sanitizer;
- raw provider errors mapped to public error codes/messages;
- canonical production origin preference and allowed-origin checks;
- invite/project/sheet next path preserved safely;
- callback failures land on stable UI states.

Test-first plan:

1. Write tests for dangerous `next` values.
   - Include external URLs, protocol-relative URLs, encoded external URLs, CRLF, backslash-prefixed paths, callback self-redirects, and malformed input.
2. Write tests for public error mapping.
3. Write callback success/failure tests with mocked Supabase client where feasible.
4. Implement helper extraction.
5. Run targeted tests and validation.

## Phase 3: Workspace Bootstrap And Invite Continuity

**Goal:** first sign-in lands users in the right workspace/project/sheet and collects required first-run profile/workspace data without leaking data or creating duplicate account state.

Likely files:

- `src/lib/auth/session.ts`
- `src/lib/repositories/workspace-repository.ts`
- `src/lib/collaboration/actions.ts`
- project/sheet collaboration tests
- migration only if pending invite application needs DB-side hardening

Required behaviors:

- default workspace created exactly once;
- self-serve users complete a compact first-run intake for display name, organization/workspace name, organization type, user category/profession, and country/region;
- optional intake fields can capture primary use, company size, default currency, and student/school detail;
- all onboarding fields are editable later from authenticated profile/workspace settings;
- profile-owned fields and workspace-owned fields use different authorization rules;
- product persona/profession is never treated as an authorization role;
- existing invited users get access immediately;
- pending invited new users get access on first auth;
- current DB trigger invite application is preserved and tested;
- project invite destinations match current route builder;
- sheet-specific destinations are not promised unless implemented;
- expired/revoked invites do not grant access;
- mismatch between signed-in email and invite email is handled clearly;
- invite application is idempotent.

Test-first plan:

1. Add tests for pending invite application.
2. Add tests for revoked/expired invite rejection.
3. Add tests for duplicate default workspace prevention.
4. Add tests that first-run self-serve onboarding stores required intake fields and does not require optional fields.
5. Add tests that invited collaborators can confirm display name and continue without creating an unnecessary organization workspace.
6. Add tests that users can edit profile-owned onboarding fields later.
7. Add tests that only workspace owner/admin users can edit workspace-owned onboarding fields.
8. Implement the smallest app or DB change.
9. Run collaboration, onboarding, settings, and auth tests.

### Phase 3B: Basic Profile And Workspace Settings

**Goal:** make first-run intake data correctable without building a full enterprise account console.

Likely files:

- `src/app/workshop/settings/profile/page.tsx`
- `src/app/workshop/settings/workspace/page.tsx`
- settings client components if needed
- server actions for profile and workspace settings
- `tests/vitest/workspace-settings.test.tsx`
- `tests/vitest/profile-settings.test.tsx`

Required behaviors:

- signed-in user can edit their own display name, user category/profession, primary use, and student/educator detail;
- workspace owner/admin can edit organization/workspace name, organization type, country/region, default currency, and company size;
- non-owner collaborator cannot edit workspace-owned settings;
- settings use the same enum labels as first-run onboarding;
- settings edits update the canonical tables, not only local UI state;
- settings edits participate in privacy correction/export/delete workflows.

Test-first plan:

1. Add tests for profile settings rendering and save behavior.
2. Add tests for workspace settings owner/admin authorization.
3. Add tests that non-owner collaborators are denied workspace settings edits.
4. Add tests that onboarding enum labels and settings enum labels stay in sync.
5. Implement the minimal settings routes/actions.
6. Run onboarding/settings/auth tests.

## Phase 4: Auth Audit Events

**Goal:** create minimal security observability without logging sensitive data.

Likely files:

- new Supabase migration for `account_security_events`
- new server helper under `src/lib/auth/audit.ts`
- `src/lib/auth/actions.ts`
- `src/app/auth/callback/route.ts`
- auth tests
- migration/schema tests

Required behaviors:

- server-only inserts;
- no direct browser grants;
- no raw token/code/link logging;
- event class and result recorded;
- failure logging best-effort and non-blocking where appropriate;
- retention documented.
- table naming is `account_security_events` unless the ADR is changed.

Test-first plan:

1. Add schema test for table, RLS, grants.
2. Add unit test ensuring helper strips forbidden fields.
3. Add route/action tests proving audit hook is invoked.
4. Implement migration/helper/action integration.
5. Run schema/auth tests and validation.

## Phase 5: Legal/Consent Surface

**Goal:** ensure users have minimum legal notice before continuing.

Likely files:

- `src/app/privacy/page.tsx` or public doc route if approved;
- `src/app/terms/page.tsx` or public doc route if approved;
- auth page links;
- landing/public nav links as needed;
- `.ai/06_specs` or `.ai/13_research` legal draft notes if requested.

Required behaviors:

- auth page links to privacy/terms;
- Google OAuth consent screen URLs match production public URLs;
- cookie notice exists if analytics/marketing cookies are active;
- no unsupported compliance claims.
- legal acknowledgement versioning and storage are designed before public launch.

Validation:

- link smoke;
- legal/copy review;
- no secrets or private customer data in docs.

## Phase 6: Corporate Readiness Foundations

**Goal:** add only the rails needed for future corporate accounts.

Do not build this in the first auth slice unless explicitly approved.

Likely future work:

- `workspace_domains` migration;
- domain verification flow;
- workspace account settings;
- owner transfer/deactivation;
- audit-log export;
- SSO provider evaluation.

Required behavior before shipping:

- domain must be verified before policy enforcement;
- no email-domain-only auto join;
- ownership transfer and last-owner guard;
- SSO is workspace-scoped, not global.

## Phase 7: Enterprise Provider Evaluation

Only start when a real requirement appears:

- customer requires SAML SSO or enterprise OIDC connection support;
- customer requires SCIM;
- customer requires IdP self-service setup or directory sync;
- customer requires enterprise MFA policy;
- procurement asks for audit log export or DPA terms;
- Supabase Auth cannot enforce required no-password/provider policy.

Outputs:

- provider decision memo;
- migration plan;
- user-id mapping plan;
- RLS trust model;
- rollback strategy.

## Implementation Stop Rules

Stop and re-plan if:

- provider settings cannot enforce the chosen auth policy;
- RLS impact is HIGH/CRITICAL;
- password flows appear in code or provider config and cannot be disabled;
- service-role use expands beyond server-only controlled helpers;
- `/api` routes are widened without explicit auth checks;
- legal/compliance copy starts making unsupported claims.
- `/signup` is introduced from older companion docs without updating the route contract.

## Closeout Validation

Minimum before claiming the first auth slice is ready:

```bash
bun run validate
bun run build
git diff --check
```

Also required for auth launch readiness:

- provider config audit evidence;
- `/api` auth inventory and tests;
- redirect/origin sanitizer tests;
- legal artifact checklist owner/status;
- route naming scan showing no accidental `/signup` implementation.

Plus manual/browser smoke:

- Google auth start path.
- Email link request path.
- Callback success path.
- Callback expired/error path.
- Protected `/workshop` redirects signed-out users.
- Signed-in users are redirected away from auth route.
- Invite acceptance path.
- Dev auth bypass still works locally and remains production-disabled.
