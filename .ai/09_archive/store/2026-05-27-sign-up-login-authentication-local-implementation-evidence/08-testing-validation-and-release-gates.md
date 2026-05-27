# Testing, Validation, And Release Gates

**Status:** planning only
**Quality target:** auth is not complete until app behavior, RLS, provider settings, compliance surfaces, and production rollout controls are all verified.

## Test Pyramid

### Static / Contract Tests

Purpose:

- prevent password UI from appearing;
- preserve callback/action/proxy contracts;
- preserve dev-auth safety;
- prevent raw secrets in code.

Candidate tests:

- `tests/vitest/auth-magic-link.test.ts`
- new `tests/vitest/auth-entry-ui.test.tsx`
- new `tests/vitest/auth-redirect-sanitizer.test.ts`
- new `tests/vitest/auth-error-mapping.test.ts`
- existing reset baseline tests if route inventory changes.

Assertions:

- login page contains Google and email link paths;
- login page does not contain password inputs;
- internal CEO copy is absent;
- privacy/terms links are present;
- unsafe `next` paths fall back to safe default;
- callback exchanges code and redirects only to safe paths;
- dev bypass remains localhost-only and disabled in production.
- route naming remains canonical: `/login` required, `/sign-in` and `/sign-up` optional aliases only, `/signup` not introduced without plan update.

Current test gap:

- existing auth tests are mostly source-string/contract assertions;
- production readiness requires executable tests that call server actions, callback route handlers, redirect sanitizer behavior, and RLS/API authorization paths.

### Server Action / Route Tests

Purpose:

- verify form actions and callback behavior without live OAuth when possible.

Scenarios:

- email is normalized;
- empty email maps to stable error;
- provider errors map to public message codes;
- Google OAuth start failure maps to fallback message;
- callback missing code maps to stable error;
- callback exchange failure maps to stable error;
- sign out clears session and redirects.
- action callback URL uses canonical allowed origin in production;
- email flow applies selected `shouldCreateUser` policy;
- Google OAuth options request only approved scopes/options.

### Supabase Schema / RLS Tests

Purpose:

- prevent auth hardening from weakening tenant isolation.

Scenarios:

- `profiles` visible only to self/platform admins as intended;
- workspace members see their workspace;
- non-members cannot read workspace data;
- project members can access project only as policy intends;
- estimate-sheet restricted access behaves as intended;
- account security events are insertable only by server-owned path if added;
- no direct anon grants to app tables;
- security-definer RPCs validate workspace/project/sheet ownership.

### Collaboration / Invite Tests

Scenarios:

- manager can invite project collaborator;
- non-manager cannot invite;
- existing profile gets project membership;
- new invited email gets pending invite;
- pending invite expires;
- revoked invite does not apply;
- invite acceptance is idempotent;
- signed-in email mismatch does not grant invite access;
- role cannot exceed actor rank;
- last owner/admin cannot be removed without another manager.
- new invited Auth users get pending invitations through the existing trigger path;
- project invite destinations match the current project-route URL builder;
- sheet-specific destination support is tested only after implemented.

### API Route Tests

Every `/api` route is outside Proxy protection and needs explicit tests.

Required matrix:

| Route | Required Tests |
| --- | --- |
| `/api/ai/ask` | unauthenticated 401, auth-without-workspace 403, dev admin DB bypass rejected, audit success/failure. |
| `/api/component-library/images` | unauthenticated rejected, cross-workspace storage path rejected, size/type validation, delete ownership. |
| `/api/component-library/attachments` | unauthenticated rejected, size/type validation, delete ownership, service-role fallback remains server-only. |
| `/api/projects/images` | unauthenticated rejected, project workspace check, cross-workspace denied, delete ownership. |
| `/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx` | unauthenticated denied through repository/session path, cross-workspace denied, valid member gets private no-store workbook. |

### Browser / E2E Smoke

Use Playwright only for current approved behavior.

Scenarios:

- signed-out `/workshop` redirects to `/login?next=/workshop`;
- `/login` renders Google first and email fallback;
- invalid email shows accessible validation;
- email request shows success state;
- callback error renders recovery state;
- signed-in/dev-bypass user is redirected away from auth page;
- signed-in/dev-bypass user can load `/workshop`;
- invite link lands on auth if signed out and project after auth if signed in.

When real Google/email auth cannot be run in CI, keep:

- unit tests for action construction;
- browser tests under dev auth;
- manual production/staging auth checklist.

## Manual QA Checklist

### Local

- Auth page layout at desktop width.
- Auth page layout at mobile width.
- Keyboard-only flow.
- Screen reader labels for email and errors.
- Magic-link request state.
- Callback error state.
- Dev auth bypass still reaches protected route.
- `.next/dev` stale build issues ruled out if browser behavior conflicts with source.

### Staging / Preview

- Production-like Supabase project or staging project configured.
- Google OAuth starts and returns to the correct callback.
- Email sender domain is correct.
- Magic link returns to preview/staging URL only if allow-listed.
- Protected route redirect preserves path.
- Legal links work.
- Cookies are secure over HTTPS.

### Production

- Production domain and callback are allow-listed.
- Google OAuth consent screen shows correct app name/logo/domain.
- Privacy/terms URLs are correct.
- SMTP sender is correct.
- Rate limits are sane.
- No password UI.
- No unsupported compliance claims.
- Support contact path works.

## Security Review Gate

Before launch:

- review redirect sanitizer;
- review service-role usage;
- review `/api` route auth;
- review RLS policies;
- review audit log redaction;
- review invite role escalation;
- review dev bypass production disablement;
- review dependency diff if new auth packages are added.
- review hosted Supabase passwordless-only evidence or residual-risk memo;
- review canonical-origin and redirect allow-list tests.

## Compliance Review Gate

Before production:

- privacy notice exists;
- terms exist;
- cookie notice/consent is ready if non-essential cookies exist;
- subprocessor list exists;
- retention schedule is documented;
- user rights support process exists;
- Google consent screen links match public docs;
- public copy avoids `compliant` claims not reviewed by counsel.
- public legal artifacts have owner, reviewed date, jurisdiction scope, DSAR SLA, transfer/subprocessor map, and retention schedule.

## Release Gates

### Gate A: Readiness Complete

- this plan pack reviewed;
- provider config audit complete;
- implementation slice chosen;
- no unresolved blocker on no-password enforcement.
- canonical route contract accepted.
- `/api` route inventory accepted.
- legal launch artifacts assigned to owners.

### Gate B: Implementation Complete

- targeted tests pass;
- `bun run validate` passes;
- `bun run build` passes;
- `git diff --check` passes;
- browser smoke passes;
- migration tests pass if schema changed.

### Gate C: Production Config Complete

- Supabase hosted settings verified;
- Google OAuth configured;
- email sender/templates configured;
- Vercel env vars set;
- redirect allow-list exact;
- secrets not committed.

### Gate D: Launch Complete

- support runbook ready;
- rollback path ready;
- monitoring checks ready;
- auth incident path ready;
- legal links live.

## Failure Conditions

Do not ship if:

- passwords are exposed or provider policy cannot be explained;
- callback redirects can leave the app;
- service-role key reaches client code;
- `/api` routes touch user data without auth;
- signed-in users can access another workspace;
- invite acceptance grants the wrong email;
- auth page lacks privacy/terms before production;
- Google consent screen uses wrong app identity;
- production callback URL is missing from allow-list.
- public self-serve launch lacks Privacy Notice/Terms/subprocessor/retention/DSAR artifacts.
- `/signup` is introduced without updating the route contract.
