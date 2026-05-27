# Second-Pass Adversarial Review And Blast Radius

**Status:** planning only
**Date:** 2026-05-27
**Inputs:** four read-only subagent lanes, Supabase official docs, Next.js App Router auth docs, Vercel auth integration skill, current repo route/API inventory, and code-review-graph impact analysis.

## Verdict

The strategy is still correct: keep Supabase Auth for the first production slice and ship Google plus email link only.

The wording must be tighter. The plan is enterprise-aware and production-lean, not fully enterprise-ready on day one. SSO, SCIM, MFA enforcement, audit export, domain verification, DPA packet, SOC/ISO posture, and procurement workflows are readiness tracks until real customer demand triggers them.

## Second-Pass Launch Blockers

| Blocker | Why It Matters | Required Before Public Launch |
| --- | --- | --- |
| Passwordless-only provider proof | App can hide passwords while Supabase Auth may still expose password APIs/settings. | Hosted Supabase evidence that password signup/sign-in/reset cannot be used, or documented residual-risk acceptance plus compensating controls. |
| Canonical origin allowlist | Current request-origin behavior can be wrong behind proxies/previews if not constrained. | One canonical URL helper, exact allowed origins, production fallback to configured app URL, and redirect tests. |
| Redirect inventory | Supabase only redirects to Site URL/additional allowed URLs; wildcard preview policy can widen risk. | Production exact callback, staging exact callback, local callback, and explicit preview policy. Avoid production globstar unless justified. |
| `/api` auth matrix | Next.js Proxy skips `/api`; every API must enforce auth itself. | Route-by-route matrix with helper, data, service-role reason, rate limit, audit, and abuse posture. |
| Legal artifacts | International auth launch requires real notices, subprocessors, retention, and rights workflows. | Privacy Notice, Terms, subprocessor list, retention schedule, DSAR/deletion workflow, jurisdiction scope, and owner/SLA. |
| Test depth | Existing auth tests are mostly source-string contracts. | Executable server action, callback, redirect sanitizer, `/api`, RLS, invite, and browser smoke tests. |

## Canonical Route Contract

| Route | Status | Behavior |
| --- | --- | --- |
| `/login` | Canonical MVP auth entry | Renders unified passwordless auth. Uses `mode=signin` or `mode=signup` for copy only. |
| `/auth/callback` | Canonical callback | Exchanges Supabase code, maps errors, applies sanitized `next`, then routes through post-auth destination contract. |
| `/sign-in` | Optional future alias | Redirects or renders same component as `/login?mode=signin`; must be in `AUTH_ROUTES` if added. |
| `/sign-up` | Optional future alias | Redirects or renders same component as `/login?mode=signup`; must be in `AUTH_ROUTES` if added. |
| `/signup` | Non-canonical | Appears in older companion docs only. Do not implement unless this plan is reopened. |

## Auth State Machine

| State | User Sees | Primary Action | Recovery Path | Security Rule |
| --- | --- | --- | --- | --- |
| Signed out, default | Google button, email field, legal links | Continue with Google or send link | Use alternate provider | Do not reveal account existence. |
| Signing in with Google | Stable loading state | Wait | Cancel/browser back | No raw provider details in UI. |
| Google canceled/failed | Generic failure | Try again | Email fallback/support | Map provider errors to stable codes. |
| Email submitted | Check your email | Wait | Resend after cooldown, change email | Message is same for existing and new users. |
| Rate-limited email | Cooldown message | Wait | Google fallback/support | No exact backend thresholds in UI. |
| Link expired/used | Link no longer works | Request a new link | Support | Do not retry old token. |
| Link opened in another browser/device | Callback completes or asks for new link | Continue | Request new link from the same device if needed | Invite/destination state must live in signed URL/server record, not localStorage only. |
| Invite, signed out | Sign in to accept invite | Authenticate | Decline/contact inviter | Show only safe workspace/project context. |
| Invite, wrong signed-in email | Invite was sent to another email | Switch account/request new invite | Sign out/reissue invite | Never grant mismatched email. |
| Invite expired/revoked | Invite unavailable | Request new invite | Return to workspace/login | Idempotent no-access result. |
| Authenticated user visits auth route | Brief redirect or no flash | Continue to destination | None | Unsafe/missing `next` falls back to `/workshop`. |
| Disabled/deactivated account | Account unavailable | Contact support | Sign out | Do not disclose workspace internals. |

## Post-Auth Destination Contract

| User Condition | Destination | Current Repo Truth | Required Planning Correction |
| --- | --- | --- | --- |
| Existing member with safe `next` | Sanitized `next` | Callback currently redirects to sanitized `next`. | Keep, with stronger sanitizer/origin tests. |
| Existing member with missing/unsafe `next` | `/workshop` | Current callback fallback is `/workshop`. | Keep. |
| New self-serve user | `/workshop` after default workspace | `ensureDefaultWorkspace()` creates a workspace when needed. | Do not promise no workspace for invited users unless code is changed. |
| New invited user | Invited project where possible | DB trigger applies pending invites; invite URL currently targets project route, not sheet route. | Correct docs: project destination exists; sheet-specific destination needs implementation. |
| Invite accepted by auth trigger | `/workshop/projects/{projectId}` where URL was issued | `handle_new_auth_user()` applies pending collaboration invites. | Do not describe invite application as only app-side post-auth bootstrap. |
| Signed in as wrong email | Recovery state | Needs explicit UI behavior. | Block grant; offer switch account/reissue. |
| User belongs to multiple workspaces | Workspace switch or default workspace | Current `default_workspace_id` is a default, not ownership. | Add multi-workspace contract before enterprise/domain routing. |

## Repo Blast Radius

Code-review-graph impact analysis for the likely auth implementation files reports high risk:

- likely changed files: `src/lib/auth/actions.ts`, `src/app/auth/callback/route.ts`, `src/proxy.ts`, `src/lib/auth/session.ts`, `src/lib/repositories/workspace-repository.ts`, `src/lib/collaboration/actions.ts`;
- direct nodes: 45;
- impacted nodes within two hops: 500 shown, 532 total reported;
- impacted files: 101;
- affected flows: `signInWithEmail`, `signInWithGoogle`, callback `GET`, and `proxy`.

This means auth implementation must be sliced. Do not edit all seams at once without tests.

## File And Symbol Risk Matrix

| Surface | Current Role | Risk | Required Before Edit |
| --- | --- | --- | --- |
| `src/lib/auth/actions.ts` | Starts email and Google auth, builds callback URL. | High: provider redirect, origin, public errors, no-password posture. | Impact analysis on `signInWithEmail`, `signInWithGoogle`, redirect helper; tests for origin, `next`, error mapping. |
| `src/app/auth/callback/route.ts` | Exchanges Supabase code and redirects. | High: callback trust boundary and token/session creation. | Tests for missing code, exchange failure, unsafe `next`, encoded paths, callback self-redirect. |
| `src/proxy.ts` | Protects `/workshop`, skips `/api`. | High: route gating and auth-route redirects. | Confirm canonical auth aliases; proxy tests; API route matrix because proxy does not protect APIs. |
| `src/lib/auth/session.ts` | Resolves current user/profile/workspace context. | High: tenant boundary and fallback profile creation. | RLS/session tests; no cross-workspace access; disabled user behavior. |
| `src/lib/repositories/workspace-repository.ts` | Bootstraps workspace and protected project data. | High: default workspace creation and broad data access. | Decide onboarding/default workspace contract; test invited/new user paths. |
| `src/lib/collaboration/actions.ts` | Sends and applies collaboration invitations with admin client. | High: service-role use, invite abuse, role escalation. | Invite truth table; rate limits; audit events; role-rank tests. |
| `supabase/migrations/*auth*/*collaboration*` | Profiles, workspaces, invitations, RLS, triggers. | High: RLS and automatic invite application. | Migration/RLS tests; trigger behavior proof; no broad grants. |

## `/api` Route Inventory Required Before Launch

| Route | Methods | Current Auth Posture From Repo Read | Data/Service Role | Required Follow-Up |
| --- | --- | --- | --- | --- |
| `/api/ai/ask` | `POST` | Uses `getAiRequestUserContext()` and blocks Supabase users without workspace. | AI provider call; server audit path uses service role in `src/lib/ai/audit.ts`. | Keep admin DB bypass rejected; rate-limit and audit auth failures. |
| `/api/component-library/images` | `POST`, `DELETE` | Calls `ensureDefaultWorkspace()` and `requireCurrentUserContext()`. | Storage upload/remove; service-role fallback for storage. | Add upload abuse/rate limits and audit storage operations. |
| `/api/component-library/attachments` | `POST`, `DELETE` | Calls `ensureDefaultWorkspace()` and `requireCurrentUserContext()`. | Storage upload/remove; service-role fallback for storage. | Add file scanning/size abuse posture and audit storage operations. |
| `/api/projects/images` | `POST`, `DELETE` | Calls `ensureDefaultWorkspace()` and `requireCurrentUserContext()`, verifies project in workspace. | Storage upload/remove; service-role fallback for storage. | Add per-workspace quota/rate limits and audit operations. |
| `/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx` | `GET` | Calls `getProjectEstimateTreeByEstimate()` from repository. | Generates confidential proposal workbook. | Verify repository helper enforces current auth/workspace access; add route-level tests for unauthenticated and cross-workspace users. |

## Provider Capability And Migration Triggers

| Provider | Keep/Evaluate When | Specific Trigger |
| --- | --- | --- |
| Supabase Auth | Default now. | Google/email, RLS-native auth, invitations, future SAML/MFA/session controls are enough. |
| Clerk | Evaluate if hosted UI/org UX becomes more valuable than Supabase continuity. | Need fastest polished auth UI, verified domains, org admin UX, Vercel Marketplace provisioning. |
| Auth0 | Evaluate for mature enterprise IAM/procurement. | Customer requires mature SAML/OIDC enterprise connections, advanced policies, broad procurement familiarity. |
| WorkOS | Evaluate as B2B enterprise add-on. | Customer requires Admin Portal, domain verification, SCIM/directory sync, enterprise SSO as blocker. |
| Descope | Evaluate for passwordless flow orchestration. | Customer/product requires advanced no-code passwordless journeys, tenant SSO/SCIM, bot/fraud features. |

Migration triggers:

- SCIM/directory sync required.
- IdP self-service setup required.
- Enterprise OIDC connection workflow required beyond Supabase's current fit.
- Supabase no-password enforcement cannot be proven and residual risk is unacceptable.
- Domain discovery/routing becomes too complex for app-owned tables.
- Procurement requires an identity vendor posture Supabase cannot satisfy cleanly.

## Enterprise-Aware Backlog, Not MVP

Before paid corporate accounts, plan these controls:

- multi-workspace account switcher and default workspace semantics;
- owner transfer and last-owner guard;
- platform/operator MFA and break-glass policy;
- session revocation/sign-out-all-devices;
- reauth for sensitive actions;
- server-owned app audit log export;
- verified domain conflict/dispute flow;
- SSO discovery by entered email domain;
- procurement packet: privacy notice, terms, DPA position, subprocessor list, security overview, incident response statement, retention/deletion, backup/restore, data residency statement, and no SOC/ISO claims until real.

## Official Source Checks

- Supabase passwordless docs confirm magic links/OTP are passwordless, one-time links, auto-signup is default unless `shouldCreateUser` is false, and Site URL/additional redirect URLs must be configured.
- Supabase redirect docs recommend exact production redirect paths and caution that wildcard preview redirects widen the allow-list.
- Supabase session docs confirm refresh token rotation, session controls on Pro+, `session_id` claim correlation, and configurable session lifetime/inactivity/single-session controls.
- Supabase audit docs confirm `auth.audit_log_entries` exists for auth events, but app-owned business/security events are still needed for workspace, invite, role, domain, and ownership changes.
- Next.js App Router auth docs show Proxy can skip `/api` and recommend route handlers verify sessions/authorization at the data layer.
- Vercel auth guidance confirms Clerk/Descope/Auth0 are viable Marketplace/evaluation lanes but would add identity-mapping and RLS integration work.

## QA Requirements Added By This Pass

- Placeholder/overclaim scan must pass.
- Route naming scan must show `/signup` only in first-pass companion docs or explicit non-canonical warnings.
- ASCII/whitespace checks must pass.
- `git diff --check` must pass for edited docs.
- Provider docs/source links must be current enough for implementation planning.
- Plan closeout must mention no code/schema/provider configuration was executed.
