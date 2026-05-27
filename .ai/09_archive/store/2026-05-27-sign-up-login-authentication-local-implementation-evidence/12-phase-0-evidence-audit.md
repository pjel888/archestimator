# Phase 0 Evidence Audit

**Status:** evidence audit complete for locally observable and public/read-only surfaces
**Date:** 2026-05-27
**Scope:** planning and readiness only; no product code, schema, Supabase dashboard, Google Cloud, Vercel, or legal configuration changes were made

## Executive Verdict

The auth strategy is still sound, but it is not yet launch-proven.

What is now proven:

- the current repo already has Google OAuth and email OTP/magic-link actions;
- `/login` is the canonical auth entry and `/auth/callback` is the canonical callback;
- `/workshop` is protected by `src/proxy.ts`;
- every known `/api` route touching sensitive app data has at least a route-local or repository-local auth boundary;
- the auth-sensitive blast radius is wider than `/api` and includes server actions, browser Supabase repositories, service-role collaboration paths, storage operations, RLS-dependent reads/writes, and AI audit paths;
- local Supabase config is passwordless-friendly but not passwordless-enforcing;
- the hosted Supabase public Auth settings endpoint is reachable and reports email plus Google enabled, phone and anonymous providers disabled, passkeys disabled, SAML disabled, and signups enabled.

What is still not proven:

- hosted Supabase password grants are impossible;
- hosted redirect allow-list, Site URL, SMTP sender, email templates, dashboard rate limits, security notifications, and audit retention match the plan;
- Google Cloud OAuth consent screen, app verification, scopes, brand assets, and redirect URI inventory are launch-ready;
- Vercel production/staging/preview canonical URL policy is configured;
- Privacy Notice, Terms, subprocessor list, retention schedule, DSAR workflow, and launch jurisdiction scope exist as reviewed artifacts.

## Evidence Ledger

| Area | Status | Evidence | Launch Meaning |
| --- | --- | --- | --- |
| Current auth UI route | Proven | `src/app/login/page.tsx` exists per prior inventory; `/login` is in `AUTH_ROUTES`. | Keep `/login` canonical for MVP. |
| Google OAuth action | Proven in repo; partially proven hosted | `signInWithGoogle()` calls Supabase OAuth with provider `google`; hosted public settings show `external.google = true`. | Google path is wired, but Google Cloud dashboard still needs verification. |
| Email passwordless action | Proven in repo; partially proven hosted | `signInWithEmail()` calls `supabase.auth.signInWithOtp()`; hosted public settings show `external.email = true`. | Email OTP/magic-link path is wired, but SMTP/template/rate-limit settings remain dashboard proof. |
| Passwordless-only enforcement | Not proven | Local Supabase config still has email signup and password policy fields; public settings do not expose a "password disabled" proof. | This remains a launch blocker unless accepted as app-level no-password only. |
| Anonymous auth | Proven disabled by local and public settings | Local `enable_anonymous_sign_ins = false`; hosted public settings show anonymous provider disabled. | Keep as non-negotiable. |
| Phone/SMS auth | Proven disabled as provider; dashboard still needs review | Local SMS signup disabled; hosted public settings show phone provider disabled, though `sms_provider` is present. | Verify dashboard has no accidental phone/SMS entry points before launch. |
| Passkeys | Proven not active publicly | Hosted public settings show `passkeys_enabled = false`. | Do not design passkey UX for MVP. |
| SAML/SSO | Proven not active publicly | Hosted public settings show `saml_enabled = false`; WorkOS external provider disabled. | SSO remains future enterprise readiness, not MVP. |
| Route protection | Proven for app routes | `src/proxy.ts` protects `/workshop` and redirects signed-out users to `/login?next=...`. | App route protection exists; API routes still need route-local tests. |
| `/api` route protection | Partially proven | Each known route uses auth/session/repository boundaries, but rate-limit/audit posture is incomplete. | Must add executable route tests and abuse controls before public launch. |
| Non-API mutation/data surfaces | Partially proven | Server actions, browser Supabase repositories, storage operations, collaboration actions, and AI audit paths exist outside `/api`. | Must add a full auth-sensitive surface matrix before implementation is considered complete. |
| Canonical origin policy | Not proven | `getRequestOrigin()` prefers request `origin`, then `NEXT_PUBLIC_APP_URL`, then localhost; `.env.local` lacks `NEXT_PUBLIC_APP_URL`. | Production needs one canonical origin helper and configured URL before auth launch. |
| Redirect allow-list | Partially proven locally only | Local config lists local callback URLs only; public endpoint does not expose hosted redirect URLs. | Supabase dashboard owner must export production/staging/preview redirect policy. |
| Legal artifacts | Not proven | No live app routes for privacy, terms, cookies, subprocessors, DPA, or DSAR were found. | Public self-serve launch is blocked until legal artifacts exist. |
| Runtime secrets hygiene | Partially proven | Redacted env audit found required public Supabase URL/anon key and service-role key present locally; no values were printed. | Need Vercel env inventory and secret ownership review before production. |

## Redacted Environment Audit

Read-only redacted check of `.env.local` found:

- `.env.local` exists.
- `NEXT_PUBLIC_SUPABASE_URL` is present and points to `ebxxqidacheyapmmzavr.supabase.co`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is present.
- `SUPABASE_SERVICE_ROLE_KEY` is present.
- `ARCHESTIMATOR_DEV_AUTH_EMAIL` is present.
- `NEXT_PUBLIC_APP_URL` is not present.
- `NEXT_PUBLIC_SITE_URL` is not present.
- `VERCEL_PROJECT_PRODUCTION_URL` is not present.
- `ARCHESTIMATOR_DEV_AUTH_BYPASS` is not present.
- `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB` is not present.
- local `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` env vars are not present in `.env.local`; Supabase-hosted provider config may still hold the Google OAuth credentials.

No secret values, key fragments, tokens, auth links, or provider credentials were printed or copied into this plan.

Production implication:

- the code currently has no local canonical app URL env value to prefer over request-origin behavior;
- Vercel production/staging/preview environments need a separate redacted inventory before launch;
- service-role usage must remain server-only and audited where used.

## Local Supabase Config Evidence

`supabase/config.toml` currently shows:

- Auth enabled.
- Site URL is local only: `http://localhost:3000`.
- Additional redirect URLs are local callback URLs only.
- JWT expiry is 3600 seconds.
- Refresh token rotation is enabled.
- Global signups are enabled.
- Anonymous sign-ins are disabled.
- Manual account linking is disabled.
- Email signup is enabled.
- Email confirmations are disabled locally.
- Email OTP length is 6 and expiry is 3600 seconds.
- Local email resend frequency is `1s`, which is not a launch-safe production proof.
- SMS signup is disabled.
- TOTP MFA enrollment and verification are disabled.
- Phone MFA enrollment and verification are disabled.
- Captcha is not enabled in local config.
- Session timebox and inactivity timeout are commented out.
- Google external provider settings are not visible in local config, so hosted dashboard is the source of truth.

Production implication:

- local config is useful for development but cannot prove hosted provider posture;
- email passwordless is configured, but passwordless-only enforcement is not proven;
- launch needs hosted dashboard screenshots/exported settings captured in a private evidence store, not in `.ai` if they contain secrets.

## Hosted Supabase Public Auth Settings

Safe public/read-only query to the hosted Auth settings endpoint succeeded with HTTP 200.

The redacted response showed:

- `disable_signup = false`.
- `mailer_autoconfirm = false`.
- `passkeys_enabled = false`.
- `saml_enabled = false`.
- `external.email = true`.
- `external.google = true`.
- `external.phone = false`.
- `external.anonymous_users = false`.
- `external.workos = false`.
- `sms_provider = "twilio"`.

This proves only what the public endpoint exposes. It does not prove:

- password grants are impossible;
- exact Site URL or redirect allow-list;
- production email template content;
- SMTP/custom sender correctness;
- dashboard rate limits;
- CAPTCHA/bot protection;
- security notification settings;
- auth audit log retention/export posture;
- Google Cloud consent screen state.

## Current Auth Code Evidence

### `src/lib/auth/actions.ts`

Current behavior:

- `signInWithEmail()` trims/lowercases email, sanitizes `next`, and calls `supabase.auth.signInWithOtp()`.
- `signInWithGoogle()` sanitizes `next` and starts Supabase Google OAuth.
- both flows use `/auth/callback?next=...`.
- `signOut()` signs out and redirects to `/login`.

Remaining risks:

- production origin resolution trusts request `origin` before configured app URL;
- user-facing errors currently redirect raw provider error messages;
- email success redirects include the submitted email address;
- no explicit `shouldCreateUser` policy is set for public versus private-beta signup;
- Google OAuth query params request `access_type=offline` and `prompt=select_account`; scopes are not explicitly narrowed in app code.

### `src/app/auth/callback/route.ts`

Current behavior:

- reads `code`;
- sanitizes `next`;
- exchanges code through `supabase.auth.exchangeCodeForSession(code)`;
- redirects to sanitized destination.

Remaining risks:

- callback errors redirect raw provider error messages;
- redirect origin still uses request URL origin;
- no executable test currently proves encoded path, missing code, exchange failure, callback self-redirect, or unsafe `next` behavior.

### `src/proxy.ts`

Current behavior:

- protects `/workshop`;
- treats `/login` as the only auth route;
- bypasses static assets, `/_next`, and `/api`;
- redirects signed-out users to `/login?next=<pathname>`;
- redirects signed-in users away from `/login` to `/workshop/projects`;
- dev auth bypass is host-gated through `isDevAuthBypassRequest()`.

Remaining risks:

- any future `/sign-in` or `/sign-up` alias must be added to `AUTH_ROUTES`;
- query-string preservation for `next` is pathname-only today;
- API security depends on each route or repository helper because proxy skips `/api`.

## `/api` Auth Boundary Matrix

| Route | Methods | Proven Boundary | Remaining Gate |
| --- | --- | --- | --- |
| `/api/ai/ask` | `POST` | Uses `getAiRequestUserContext()`, rejects admin DB bypass, blocks unauthenticated requests, requires workspace for real Supabase users, and records best-effort metadata audit events for eligible Supabase users. | Add rate limit, auth-failure audit posture, and route tests for unauthenticated, dev bypass, admin bypass, no-workspace, and workspace user cases. |
| `/api/component-library/images` | `POST`, `DELETE` | Calls `ensureDefaultWorkspace()` and `requireCurrentUserContext()`; storage paths are workspace/user owned; service-role fallback is server-side. | Add upload quota/rate limit, file abuse posture, storage audit event, and unauthenticated/cross-workspace route tests. |
| `/api/component-library/attachments` | `POST`, `DELETE` | Calls `ensureDefaultWorkspace()` and `requireCurrentUserContext()`; attachment paths are workspace/user owned; service-role fallback is server-side. | Add file scanning decision, size/quota/rate limit, storage audit event, and unauthenticated/cross-workspace route tests. |
| `/api/projects/images` | `POST`, `DELETE` | Calls `ensureDefaultWorkspace()` and `requireCurrentUserContext()`; verifies project belongs to current workspace; service-role fallback is server-side. | Add project image quota/rate limit, audit event, and cross-workspace route tests. |
| `/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx` | `GET` | Route calls `getProjectEstimateTreeByEstimate()`, which calls `getCurrentWorkspaceProject()`, which calls `ensureDefaultWorkspace()` and relies on Supabase/RLS-backed reads. Response is private/no-store. | Add direct route-level unauthenticated, not-found, cross-workspace, and confidential export tests; add download audit/rate-limit decision. |

## Non-API Auth-Sensitive Surface Matrix

The proxy's `/api` bypass is important, but it is not the whole auth blast radius. Before implementation starts, Engineering must maintain this wider matrix and keep it current as routes/actions move.

| Surface | Current Boundary Evidence | Risk | Required Follow-Up |
| --- | --- | --- | --- |
| `src/lib/auth/session.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts` | These are the shared session and Supabase client factories for server and browser execution. | Auth/session mistakes here affect every downstream protected surface. | Keep tests for dev bypass, production disablement, missing env behavior, cookie/session handling, and browser/server client separation. |
| `src/lib/auth/dev-auth.ts` | Local dev auth bypass can create service-role-backed development context when explicitly enabled. | A dev bypass leaking beyond localhost/non-production would be critical. | Keep production-disabled and localhost-only tests; verify AI/admin bypass restrictions remain intact. |
| `src/lib/projects/actions.ts` | Project create/update/delete actions use Supabase server clients; some paths call `ensureDefaultWorkspace()` and some rely on Supabase/RLS or upstream page/action context. | Project metadata, budget, and image storage can affect confidential customer data. | Add action-level tests for unauthenticated, cross-workspace, and storage cleanup behavior; require explicit user/workspace boundary before mutation. |
| `src/lib/workshop/actions.ts` | Workshop favorite/unfavorite actions use `ensureDefaultWorkspace()` and Supabase server clients. | Favorites can leak project/estimate existence or mutate another user's workspace state if scoping regresses. | Add unauthenticated and cross-workspace favorite tests. |
| `src/lib/estimates/actions.ts` | Estimate mutations use Supabase server clients and many paths call `requireCurrentUserContext()`; history RPCs and activity reads/writes are RLS-dependent. | Estimate rows, tree structure, activity history, and proposal data are core customer records. | Add RLS/RPC tests for cross-workspace denial, unauthenticated denial, actor attribution, and history/audit integrity. |
| `src/lib/component-library/actions.ts` | Component mutations call `ensureDefaultWorkspace()` and `requireCurrentUserContext()` for component operations; folder operations use workspace scoping and Supabase server clients. | Cost library writes affect reusable pricing, supplier, brand, lifecycle, and template data. | Add workspace isolation tests for RPCs and folder operations; audit lifecycle/state-changing operations. |
| `src/lib/collaboration/actions.ts` | Collaboration invite/access actions use `requireCurrentUserContext()`, role-rank checks, and a server-only service-role client. | Service-role bypass can grant project/sheet access if guards regress. | Add rate limits, invite abuse controls, service-role audit events, wrong-email tests, role-escalation tests, and owner/admin permission tests. |
| `src/lib/repositories/estimate-repository.ts` | Browser Supabase client reads/writes estimate nodes and row items directly. | Browser-side writes depend on RLS, not proxy/server-action guards. | Add RLS tests proving authenticated users cannot read/write another workspace's estimate tree or rows. |
| `src/lib/repositories/cost-library-repository.ts` | Browser Supabase client reads/writes cost library items directly. | Browser-side cost library writes depend on RLS. | Add RLS tests for workspace isolation and unauthorized creates/updates. |
| `src/lib/repositories/workspace-repository.ts` | Server repository uses `ensureDefaultWorkspace()` and Supabase/RLS-backed queries for workspaces, projects, estimates, collaboration summaries, and export data. | Default workspace bootstrap and project lookup can become cross-workspace leakage if assumptions drift. | Add multi-workspace, invited-user, missing-default, and cross-workspace read tests. |
| `src/lib/repositories/component-library-repository.ts` | Server repository uses `ensureDefaultWorkspace()` and Supabase queries for library, suppliers, brands, templates, and taxonomy data. | Shared taxonomy and workspace-owned library data must not mix. | Add tests distinguishing public taxonomy reads from workspace-owned library/template reads. |
| `src/hooks/use-project-presence.ts`, `src/hooks/use-estimate-cursor-broadcast.ts` | Browser realtime presence/cursor channels use Supabase client-side session context. | Presence can leak project/sheet activity or user metadata if channel authorization regresses. | Add private-channel authorization checks and no-cross-workspace presence smoke tests. |
| Storage helpers in API routes and project actions | Storage operations use owned path checks and server-side clients, with service-role fallback in upload routes. | Storage paths can leak or delete files if path checks regress. | Add path traversal, wrong-workspace, quota/rate-limit, and delete authorization tests. |
| `src/lib/ai/auth.ts` and `src/lib/ai/audit.ts` | AI route auth rejects admin DB bypass, requires workspace for real users, and writes metadata-only audit events with service role when eligible. | AI audit and provider calls must not become an authorization bypass or raw-data retention path. | Keep Ask-only guard, add auth-failure audit posture, verify no raw prompts/hidden prompts/full retrieved content are persisted without approved retention policy. |

This matrix does not mean each listed surface is currently broken. It means auth implementation readiness must cover all of them before the feature is called production-grade.

## UX/UI Certainty Result

The previous UX strategy is still correct:

- one unified auth surface is right for passwordless MVP;
- Google remains primary because it lowers startup-user friction;
- email link remains fallback because it supports users who avoid Google or are invited on a corporate email;
- no password fields should appear;
- signed-out invite, wrong-email invite, expired link, canceled Google, rate-limited email, already-signed-in auth route, and deactivated account states must all be designed before implementation.

New certainty from this pass:

- because hosted email and Google providers are both enabled, the UI can assume both sign-in methods are technically available;
- because phone, anonymous, passkeys, SAML, and WorkOS are not enabled, the MVP UI should not expose or tease those methods;
- because legal routes are not live, the auth UI cannot honestly ship final legal acknowledgement links until legal artifacts are created.

## Open Evidence Required For 95 Percent Confidence

"100 percent certainty" is not realistic for auth/compliance because provider settings, laws, threat models, customer requirements, and production environments change. The practical target is evidence-backed launch confidence with named residual risks.

Required next evidence:

| Owner Surface | Evidence Needed | Why It Can Change The Plan |
| --- | --- | --- |
| Supabase dashboard owner | Site URL, redirect allow-list, Google provider settings, email provider settings, SMTP/custom sender, email templates, rate limits, CAPTCHA, security notifications, auth audit retention, password/passwordless controls. | Could force canonical URL changes, provider hardening, or provider migration if passwordless-only cannot be enforced. |
| Google Cloud owner | OAuth consent screen status, app name/logo/domain verification, authorized redirect URIs, scopes, test/published status, support email. | Could block launch if consent/brand/redirect settings are incomplete. |
| Vercel owner | Production and staging URLs, preview auth policy, env var names/values present by environment, redirect origin policy, deployment protection posture. | Could change redirect allow-list and callback origin implementation. |
| Legal owner | Legal entity, Privacy Notice, Terms, Cookie Notice, subprocessors, transfer posture, retention schedule, DSAR/export/delete SLA, launch jurisdictions. | Could block public self-serve signup or change data collection/consent requirements. |
| Engineering owner | Executable action/callback/proxy/API/RLS tests, rate limits, security events, canonical origin helper, stable error mapping. | Needed before code can be called production-grade. |
| QA owner | Browser smoke matrix across desktop/mobile, invite flow, Google cancel/failure, email link expired/used, signed-in redirect, wrong-email invite. | Needed before release because most risk is flow/state-specific. |

## External Evidence Artifact Contract

Provider/legal evidence should not be stored in `.ai` if it contains secrets, client IDs, full redirect inventories tied to private environments, screenshots with keys, or account-identifying dashboard details. Store the private evidence in the team's approved private evidence store, and keep only a redacted summary in this plan pack.

Every external evidence artifact must include:

- source system: Supabase dashboard, Google Cloud, Vercel, Legal, or QA;
- environment: production, staging, preview, local, or all;
- captured by and reviewer;
- captured date and reviewed date;
- redaction note confirming no secrets are copied into `.ai`;
- exact settings or documents reviewed;
- decision: approved, rejected, or accepted with residual risk;
- residual risks and required follow-up ticket/link.

Minimum artifact contents:

| Source | Required Private Evidence | Redacted Summary Allowed In `.ai` |
| --- | --- | --- |
| Supabase dashboard | Site URL, redirect allow-list, provider enablement, password/passwordless controls, email/SMTP/templates, rate limits, CAPTCHA, security notifications, audit/log retention, project region. | Boolean/status table with no secrets, no full keys, and no credential screenshots. |
| Google Cloud | OAuth consent status, app name/logo/domain verification, support email, authorized redirect URIs, scopes, test/published status. | Status table, scope list, and whether redirect URIs match Supabase without exposing credentials. |
| Vercel | Production/staging/preview domains, env var presence by environment, preview auth policy, deployment protection, canonical URL policy. | Redacted hostnames or environment labels when needed, plus pass/fail on required env presence. |
| Legal | Privacy Notice, Terms, Cookie Notice, subprocessor list, DPA position, retention schedule, DSAR/export/delete SLA, launch jurisdictions. | Artifact names, owner, reviewed date, jurisdiction scope, and go/no-go status. |
| QA | Browser flow evidence, mobile/desktop screenshots, email-link cases, Google cancel/failure, invite/wrong-email/expired-link cases. | Test matrix result and artifact links without tokens or magic-link URLs. |

## Exact Go / No-Go Gates Before Implementation

Implementation may start when:

- the team accepts Supabase Auth as the MVP provider despite passwordless-only enforcement being dashboard-dependent;
- the first implementation slice is chosen as UI/action/callback hardening, not a provider migration;
- canonical app URL env name and allowed-origin list are chosen;
- legal link targets are either real URLs or explicitly deferred behind private beta only;
- tests are written first for origin, redirect, error, and no-password UI behavior.

Public launch must not start until:

- hosted Supabase redirect/provider/email settings are captured and reviewed;
- Google OAuth consent and redirect settings are reviewed;
- Vercel environment and preview policy are reviewed;
- public Privacy Notice and Terms are live;
- `/api`, server-action, browser-repository, service-role, storage, RLS, and audit-path tests/postures are complete;
- passwordless-only enforcement is proven or residual risk is explicitly accepted.

## Audit Commands Run

Commands were read-only and scoped:

- `sed` / `rg` inspection of `supabase/config.toml`.
- `sed` inspection of `src/lib/auth/actions.ts`.
- `sed` inspection of `src/app/auth/callback/route.ts`.
- `sed` inspection of `src/proxy.ts`.
- `rg` inspection of known `/api` route auth boundaries.
- `rg` and `sed` inspection of non-API server actions, browser Supabase repositories, service-role clients, storage helpers, RLS-dependent repository paths, collaboration actions, and AI audit paths.
- redacted Node script for `.env.local` presence and public Supabase Auth settings endpoint.
- legal route/link search across `src/app` and `src/components`.

No product implementation, schema migration, provider/dashboard edit, deployment, or secret dump was performed.
