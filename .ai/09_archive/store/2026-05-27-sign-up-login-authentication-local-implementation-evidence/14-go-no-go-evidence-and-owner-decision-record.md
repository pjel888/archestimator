# Go/No-Go Evidence And Owner Decision Record

**Status:** planning and release-readiness gate
**Date:** 2026-05-27
**Scope:** final auth strategy certainty pass, evidence ownership, launch decision records, residual-risk acceptance, and release gates
**Implementation status:** local auth implementation, tests, schema migration, and redacted readiness artifacts were added on 2026-05-27; the linked Supabase auth-account-data migration was applied after the local login callback exposed the missing remote table; Supabase dashboard, Google Cloud, Vercel, legal, analytics, and production deployment evidence remain launch-blocking unless owner-provided external evidence is attached.

## Purpose And Authority

This document is the final decision gate for the Sign Up / Log In planning pack. It does not replace the implementation plans; it decides when those plans have enough evidence to move from planning into implementation, private beta, or public launch.

Authority order after this file is added:

1. `README.md`
2. `14-go-no-go-evidence-and-owner-decision-record.md`
3. `13-user-intake-settings-and-account-data-strategy.md`
4. `12-phase-0-evidence-audit.md`
5. `11-second-pass-adversarial-review-and-blast-radius.md`
6. primary docs `01` through `10`
7. companion first-pass docs

If any older document says Archestimator is launch-ready, ready for enterprise sale, fully compliant, or safe for public self-serve auth without the evidence below, treat that statement as superseded.

## Current Verdict

| Release Mode | Current Decision | Why |
| --- | --- | --- |
| Local planning and docs | **GO** | Strategy pack is coherent and has official-source support. |
| Code implementation planning | **GO WITH GATES** | Implementation can be sliced only after owners accept this decision record and choose the first code slice. |
| Code implementation | **CONDITIONAL GO** | Allowed only for local/reviewable implementation after test-first scope is chosen; no production config writes. |
| Internal QA/staging | **NO-GO UNTIL OWNER EVIDENCE** | Supabase, Google, Vercel, legal-link, and env evidence are not yet captured. |
| Private beta | **NO-GO UNTIL LEGAL AND PROVIDER MINIMUMS PASS** | Private beta still needs real Terms/Privacy links, provider redirect proof, and support/DSAR handling. |
| Public self-serve launch | **NO-GO** | Hosted dashboard proof, Google OAuth proof, Vercel policy, legal artifacts, executable tests, QA evidence, and support runbooks remain pending. |

The strategy is strong enough to implement carefully. It is not strong enough to launch publicly.

## Decision Header Template

Every real release decision must start with this header. Until all required fields are filled, the decision is not final.

| Field | Required Value |
| --- | --- |
| Decision | `GO`, `NO-GO`, or `GO WITH ACCEPTED RISK` |
| Release scope | Local implementation, internal QA, private beta, public self-serve, or enterprise pilot |
| Environment | Local, staging, preview, production, or all |
| Commit SHA | Exact commit being evaluated |
| Deployment URL / deploy ID | Exact deployment or `N/A` for docs-only/local planning |
| Decision owner | Accountable Product/Engineering owner |
| Engineering reviewer | Reviewer and date |
| Security reviewer | Reviewer and date |
| Legal/Privacy reviewer | Reviewer and date |
| QA reviewer | Reviewer and date |
| Support/Ops reviewer | Reviewer and date |
| Evidence bundle ID | Private evidence-store bundle reference |
| Residual risk summary | `None`, or links to accepted-risk rows |
| Final decision date | Date signed |

## Status Values

Use these status values in all evidence rows:

| Status | Meaning |
| --- | --- |
| `PENDING` | Evidence or owner decision has not been provided. |
| `PASS` | Evidence was reviewed and satisfies the launch requirement. |
| `FAIL` | Evidence contradicts the strategy or exposes a blocker. |
| `ACCEPTED_RISK` | Owner explicitly accepts a known residual risk with compensating controls and a follow-up date. |
| `DEFERRED` | Not required for the current release mode and documented as post-MVP. |
| `N/A` | Not applicable to the chosen launch mode. |

`PASS` and `ACCEPTED_RISK` require an owner, reviewed date, evidence location, and reviewer.

## Public Launch Go/No-Go Rule

Public self-serve auth may launch only when:

- every P0 row in this document is `PASS` or `ACCEPTED_RISK`;
- every `ACCEPTED_RISK` row has an owner, compensating control, review date, and rollback path;
- no `FAIL` row remains unresolved;
- no private evidence required for launch is stored directly in `.ai`;
- legal/public copy avoids unsupported compliance or security claims;
- QA evidence covers both desktop and mobile auth paths.

One unresolved P0 row is a public-launch `NO-GO`.

## Private Evidence Handling

Provider dashboards, legal files, screenshots, and environment inventories may contain secrets or account-identifying details. Do not store them directly in `.ai`.

Private evidence belongs in the team's approved private evidence store. `.ai` should contain only a redacted summary with:

- evidence ID;
- source system;
- environment;
- version, commit, deployment ID, or document version where applicable;
- captured by;
- reviewed by;
- captured date;
- reviewed date;
- jurisdiction scope where legal/privacy evidence is involved;
- private evidence link or ticket reference;
- redaction note;
- decision: `PASS`, `FAIL`, `ACCEPTED_RISK`, `DEFERRED`, or `N/A`;
- residual risk and next action.

Never store these in `.ai`:

- service-role keys;
- anon keys if copied from dashboards;
- Google client secrets;
- SMTP credentials;
- magic links, OTPs, callback codes, access tokens, refresh tokens, or session cookies;
- unredacted dashboard screenshots that show secrets, private account IDs, billing details, or private user emails;
- full production environment variable values;
- private legal drafts unless counsel approves repository storage.

Required evidence ledger columns:

| Column | Requirement |
| --- | --- |
| Area | Provider, Google, Vercel, Legal, Engineering, QA, Support/Ops, or Product. |
| Environment | Local, staging, preview, production, all, or legal/all. |
| Owner | One accountable role. |
| Private artifact | Private evidence link, ticket, document ID, or `N/A` if redacted summary is sufficient. |
| Redacted summary | Short repo-safe proof statement. |
| Captured date | Date evidence was captured. |
| Reviewed date | Date owner reviewed it. |
| Source system | Supabase, Google Cloud, Vercel, Legal docs, test runner, browser QA, support system. |
| Decision | `PASS`, `FAIL`, `ACCEPTED_RISK`, `DEFERRED`, or `N/A`. |
| Residual risk | Required for accepted risk. |
| Follow-up ticket | Required for `FAIL`, `PENDING`, and `ACCEPTED_RISK`. |

## Owner Roster

| Owner | Owns |
| --- | --- |
| Product Owner | Launch mode, public/private beta decision, CTA routing, onboarding field labels, user-facing copy. |
| Engineering Owner | Implementation scope, tests, RLS/API/server-action/storage/service-role posture, rollback mechanics. |
| Security Owner | Threat model acceptance, rate limits, CAPTCHA decision, audit events, abuse monitoring, residual-risk review. |
| Legal/Privacy Owner | Terms, Privacy Notice, cookies/analytics posture, subprocessors, transfers, retention, DSAR, minors/student posture. |
| Supabase Owner | Hosted Auth settings, redirect allow-list, email provider, Google provider, rate limits, CAPTCHA, audit/log retention. |
| Google Cloud Owner | OAuth consent screen, authorized domains, scopes, redirect URIs, verification/brand status, support email. |
| Vercel Owner | Production/staging/preview domains, env vars, deployment protection, canonical app URL, preview-auth policy. |
| QA Owner | Browser flow matrix, mobile/desktop evidence, invite/wrong-email/expired-link/failure flows. |
| Support/Ops Owner | Support runbook, account recovery/deletion workflows, incident process, launch monitoring. |

## Decision Ledger

| ID | Decision | Owner | Current Status | Required Evidence | Release Impact |
| --- | --- | --- | --- | --- | --- |
| GNG-001 | Keep Supabase Auth for MVP. | Product + Engineering | `PENDING OWNER ACCEPTANCE` | Owner sign-off that Supabase-first remains preferred after dashboard evidence review. | Blocks implementation if rejected. |
| GNG-002 | Keep app passwordless: Google plus email link/OTP only. | Product + Security + Supabase Owner | `PENDING` | UI/app no-password proof plus hosted Supabase password/password-reset posture or accepted residual risk. | Blocks public launch. |
| GNG-003 | Use `/login` as canonical auth entry. | Product + Engineering | `PASS IN PLAN` | README/doc `14` authority plus route tests during implementation. | Blocks implementation if reopened. |
| GNG-004 | Use `/auth/callback` as canonical callback. | Engineering | `PASS IN PLAN` | Callback tests for safe `next`, missing code, exchange failure, and origin policy. | Blocks launch until tests pass. |
| GNG-005 | Public self-serve vs invite/private beta. | Product + Legal + Security | `PENDING` | Written launch-mode decision and `shouldCreateUser` policy. | Blocks beta and launch. |
| GNG-006 | Canonical app URL and allowed origins. | Engineering + Vercel Owner + Supabase Owner | `PENDING` | Env name, production URL, staging URL, preview policy, Supabase redirect allow-list. | Blocks implementation of redirect hardening. |
| GNG-007 | Google OAuth launch readiness. | Google Cloud Owner | `PENDING` | OAuth consent, authorized domains, scopes, redirect URIs, brand/verification/support email. | Blocks Google public launch. |
| GNG-008 | Email delivery launch readiness. | Supabase Owner + Support/Ops | `PENDING` | SMTP/custom sender decision, templates, sender domain, resend cooldown, OTP expiry, deliverability monitoring. | Blocks email-link public launch. |
| GNG-009 | Bot/abuse controls. | Security + Supabase Owner | `PENDING` | Rate limits, CAPTCHA/Turnstile/hCaptcha decision, abuse thresholds, lockout/cooldown copy. | Blocks public launch. |
| GNG-010 | Privacy/Terms/legal notice readiness. | Legal/Privacy | `PENDING` | Privacy Notice, Terms, notice at collection, cookie/analytics stance, subprocessors, jurisdiction scope. | Blocks private beta and public launch. |
| GNG-011 | Data rights and retention. | Legal/Privacy + Engineering | `PENDING` | DSAR/export/delete/correction process, retention schedule, backup handling, support-ticket handling. | Blocks public launch. |
| GNG-012 | Intake/settings data strategy. | Product + Engineering + Legal/Privacy | `PENDING` | Final fields/enums, settings edit paths, correction/export/delete inclusion, notice copy. | Blocks onboarding implementation. |
| GNG-013 | Engineering security test readiness. | Engineering + Security | `PENDING` | Executable action/callback/proxy/API/RLS/service-role/storage/audit tests. | Blocks launch. |
| GNG-014 | UX flow readiness. | Product + QA | `PENDING` | Mobile/desktop auth flow evidence for self-serve, invite, wrong email, expired link, Google cancel/failure, incomplete onboarding, settings edit. | Blocks launch. |
| GNG-015 | Support and incident readiness. | Support/Ops + Security | `PENDING` | Runbooks, incident contacts, account recovery/deletion handling, abuse response, rollback owner. | Blocks public launch. |
| GNG-016 | Corporate account readiness boundary. | Product + Engineering | `DEFERRED` | SSO/MFA/SCIM/domain controls explicitly deferred until customer trigger. | Does not block MVP. |

## Evidence Register

### P0 Provider Evidence

| Evidence ID | Owner | Required Evidence | Current Status | Minimum Pass Condition |
| --- | --- | --- | --- | --- |
| AUTH-SUPABASE-001 | Supabase Owner | Hosted Site URL and redirect allow-list for production, staging, preview, and local. | `PENDING` | Exact URLs approved; preview wildcard policy documented or rejected. |
| AUTH-SUPABASE-002 | Supabase Owner + Security | Passwordless-only posture. | `PENDING` | Password signup/sign-in/reset paths are disabled or app-level residual risk is accepted with controls. |
| AUTH-SUPABASE-003 | Supabase Owner | Email provider settings, OTP/magic-link expiry, resend cooldown, and templates. | `PENDING` | Email flow settings match product copy and abuse posture. |
| AUTH-SUPABASE-004 | Supabase Owner + Support/Ops | SMTP/custom sender and sender-domain decision. | `PENDING` | Sender identity and deliverability ownership are documented. |
| AUTH-SUPABASE-005 | Security + Supabase Owner | Auth rate limits and IP-forwarding posture. | `PENDING` | Rate-limit settings and server-side IP behavior are reviewed. |
| AUTH-SUPABASE-006 | Security + Supabase Owner | CAPTCHA/Turnstile/hCaptcha decision. | `PENDING` | Enable now, defer with threshold, or reject with compensating control. |
| AUTH-SUPABASE-007 | Security + Engineering | Supabase Auth audit logs plus app-owned `account_security_events` posture. | `PENDING` | Provider logs and app audit events have retention, redaction, and review owners. |
| AUTH-SUPABASE-008 | Supabase Owner | Disabled/non-MVP providers: phone/SMS, anonymous, passkeys, SAML/SSO, WorkOS. | `PARTIALLY PROVEN PUBLICLY` | Hosted dashboard confirms no user-facing non-MVP auth method is enabled. |
| AUTH-SUPABASE-009 | Supabase Owner + Engineering | API key and service-role storage posture. | `PENDING` | Service-role key exists only in server/private env scopes and never in browser bundles, logs, `.ai`, or public config. |
| AUTH-SUPABASE-010 | Supabase Owner | Auth dashboard export or dashboard review artifact. | `PENDING` | Private evidence captures settings without exposing secrets in `.ai`. |

### P0 Google OAuth Evidence

| Evidence ID | Owner | Required Evidence | Current Status | Minimum Pass Condition |
| --- | --- | --- | --- | --- |
| AUTH-GOOGLE-001 | Google Cloud Owner | OAuth consent screen status, app name, support email, authorized domain, homepage, privacy link, terms link. | `PENDING` | Consent screen is complete and matches public app identity. |
| AUTH-GOOGLE-002 | Google Cloud Owner | OAuth client redirect URI inventory. | `PENDING` | Redirect URIs exactly match Supabase/Auth callback requirements by environment. |
| AUTH-GOOGLE-003 | Google Cloud Owner + Security | Scope inventory and minimization. | `PENDING` | Only sign-in scopes needed for authentication are requested; sensitive/restricted scopes are absent or verified. |
| AUTH-GOOGLE-004 | Google Cloud Owner | Brand/app verification status. | `PENDING` | Launch mode documents whether Google verification is required and completed. |
| AUTH-GOOGLE-005 | QA Owner | Google cancel/failure/wrong-account behavior. | `PENDING` | Browser QA proves stable user-facing recovery states with no raw provider errors. |
| AUTH-GOOGLE-006 | Google Cloud Owner | OAuth client type and authorized JavaScript origins where applicable. | `PENDING` | Web client and origins match production/staging/local policy; no unused origins remain. |
| AUTH-GOOGLE-007 | Google Cloud Owner | Confirmation no Google client secret is copied into `.ai`. | `PENDING` | Redaction note exists in private evidence bundle. |

### P0 Vercel And Runtime Evidence

| Evidence ID | Owner | Required Evidence | Current Status | Minimum Pass Condition |
| --- | --- | --- | --- | --- |
| AUTH-VERCEL-001 | Vercel Owner | Production, staging, preview, and local URL policy. | `PENDING` | Canonical URLs are known and mapped to Supabase/Google redirect policy. |
| AUTH-VERCEL-002 | Vercel Owner + Engineering | Environment variable presence by environment. | `PENDING` | Required env vars exist in the correct Vercel environments; values remain private. |
| AUTH-VERCEL-003 | Vercel Owner + Security | Preview deployment protection and preview auth policy. | `PENDING` | Preview auth is either protected and explicitly allowed, or real auth is disabled on previews. |
| AUTH-VERCEL-004 | Engineering | Canonical origin helper decision. | `PENDING` | Production origin prefers configured allow-list over untrusted request origin. |
| AUTH-VERCEL-005 | Support/Ops | Logs/observability availability for auth incidents. | `PENDING` | Owners can inspect auth errors, redirects, and rate-limit incidents without exposing secrets. |
| AUTH-VERCEL-006 | Vercel Owner | Production branch and staging strategy. | `PENDING` | Production branch, custom environment or branch-specific staging workflow, and preview policy are documented. |
| AUTH-VERCEL-007 | Vercel Owner + Engineering | Vercel system environment variable exposure decision. | `PENDING` | App-owned canonical URL env is preferred where system values are unsuitable. |
| AUTH-VERCEL-008 | Vercel Owner | Redeploy requirement after env changes. | `PENDING` | Release checklist says env changes apply only to new deployments. |

### P0 Legal And Privacy Evidence

| Evidence ID | Owner | Required Evidence | Current Status | Minimum Pass Condition |
| --- | --- | --- | --- | --- |
| AUTH-LEGAL-001 | Legal/Privacy | Legal entity/operator and launch jurisdictions. | `PENDING` | Public docs identify operator and jurisdiction scope. |
| AUTH-LEGAL-002 | Legal/Privacy | Privacy Notice and Terms. | `PENDING` | Public routes/links are live before private beta or public launch. |
| AUTH-LEGAL-003 | Legal/Privacy + Product | Notice at collection for onboarding/profile/workspace fields. | `PENDING` | Intake fields, categories, purposes, correction routes, and privacy links are disclosed. |
| AUTH-LEGAL-004 | Legal/Privacy | Subprocessor list and transfer/data residency posture. | `PENDING` | Supabase, Vercel, Google, email provider, analytics, and AI providers are classified. |
| AUTH-LEGAL-005 | Legal/Privacy + Engineering | Retention schedule. | `PENDING` | Auth/security logs, invites, profiles, workspace settings, backups, support tickets, and legal events have periods. |
| AUTH-LEGAL-006 | Legal/Privacy + Support/Ops | DSAR/export/delete/correction workflow and SLA. | `PENDING` | Intake/settings data is covered and owner workflow exists. |
| AUTH-LEGAL-007 | Legal/Privacy + Product | Student/minor/COPPA posture. | `PENDING` | Product is not directed to children under 13; discovered child account path and school/minor trigger are documented. |
| AUTH-LEGAL-008 | Legal/Privacy + Product | Marketing consent and analytics/cookie posture. | `PENDING` | Marketing consent is optional/withdrawable; analytics launch posture is approved. |
| AUTH-LEGAL-009 | Legal/Privacy + Engineering | Legal acknowledgement record shape. | `PENDING` | Terms/privacy versions, timestamp, source route, locale/country if collected, and IP/user-agent hash posture are approved. |
| AUTH-LEGAL-010 | Legal/Privacy | Terms evidence. | `PENDING` | Minimum-age/business-use wording, account responsibility, acceptable use, termination/deactivation, content ownership, and no unsupported claims are reviewed. |
| AUTH-LEGAL-011 | Legal/Privacy | Subprocessor and transfer evidence. | `PENDING` | Supabase, Vercel, Google, email/SMTP, analytics if any, AI provider if any, purpose, data categories, region, DPA/SCC posture, and public notice listing are reviewed. |

### P0 Engineering And Security Evidence

| Evidence ID | Owner | Required Evidence | Current Status | Minimum Pass Condition |
| --- | --- | --- | --- | --- |
| AUTH-ENG-001 | Engineering | Test-first implementation plan for auth actions and callback. | `PENDING` | Tests exist and fail first before code changes; cover origin, redirects, errors, no-password UI. |
| AUTH-ENG-002 | Engineering + Security | `/api` auth/rate-limit/audit matrix. | `PENDING` | Every sensitive API route has auth, rate-limit, service-role, audit, and abuse posture. |
| AUTH-ENG-003 | Engineering + Security | Server action and browser repository auth-sensitive matrix. | `PENDING` | Non-API auth surfaces are inventoried and tested where needed. |
| AUTH-ENG-004 | Engineering | RLS and cross-workspace denial tests. | `PENDING` | RLS denies cross-user/profile/intake/workspace/project/estimate/library access. |
| AUTH-ENG-005 | Engineering + Security | Service-role usage audit. | `PENDING` | Every service-role path is server-only, scoped, audited, and tested. |
| AUTH-ENG-006 | Engineering | Intake/settings persistence and authorization tests. | `PENDING` | Own-profile edit and owner/admin workspace edit pass; unauthorized edits fail. |
| AUTH-ENG-007 | Engineering | Invited-user no-extra-workspace behavior. | `PENDING` | Tests prove invited collaborators do not create unnecessary organization workspaces. |
| AUTH-ENG-008 | Security | `account_security_events` redaction and retention posture. | `PENDING` | No raw tokens, magic links, callback codes, service-role details, or raw provider payloads are persisted. |
| AUTH-ENG-009 | Engineering + Security | Browser-write repository RLS tests. | `PENDING` | Browser Supabase repositories cannot read/write across users or workspaces. |
| AUTH-ENG-010 | Engineering + Security | Storage upload/delete gate. | `PENDING` | Ownership, path traversal, quota/rate limit, audit events, and server-only service-role proof are tested. |
| AUTH-ENG-011 | Engineering | Validation command evidence. | `PENDING` | `bun run validate`, `bun run build`, relevant tests, and `git diff --check` pass for the release commit. |
| AUTH-ENG-012 | Engineering + Security | Dev-auth production disablement. | `PENDING` | Tests or env checks prove dev-auth bypass cannot run outside localhost/non-production. |

### P0 Product, UX, QA, And Support Evidence

| Evidence ID | Owner | Required Evidence | Current Status | Minimum Pass Condition |
| --- | --- | --- | --- | --- |
| AUTH-UX-001 | Product | Final copy for `/login`, email submitted, Google failure, link expired/used, rate limit, invite wrong email, deactivated account. | `PENDING` | No internal-only copy, raw provider errors, or unsupported compliance/security claims. |
| AUTH-UX-002 | Product | Final onboarding enum labels and optional/required field decisions. | `PENDING` | Matches doc `13`; settings uses same labels. |
| AUTH-QA-001 | QA | Desktop browser matrix. | `PENDING` | Self-serve, invite, wrong email, expired/used link, Google cancel/failure, signed-in redirect, incomplete onboarding, settings edit. |
| AUTH-QA-002 | QA | Mobile browser matrix. | `PENDING` | Same core cases as desktop; form and email-link states are usable. |
| AUTH-QA-003 | QA + Support/Ops | Email deliverability and link handling. | `PENDING` | Emails render, links work once, expired/used states are clear, resend cooldown behaves. |
| AUTH-SUPPORT-001 | Support/Ops | Account access support runbook. | `PENDING` | Lost access, wrong email invite, deleted/deactivated user, discovered child account, deletion/export request. |
| AUTH-SUPPORT-002 | Security + Support/Ops | Abuse and incident runbook. | `PENDING` | Rate-limit spike, invite abuse, suspicious workspace access, provider outage, email outage. |
| AUTH-SUPPORT-003 | Support/Ops + QA | Support diagnosis proof. | `PENDING` | Support can diagnose common auth failures without direct database spelunking or secret exposure. |
| AUTH-OPS-001 | Support/Ops + Security | Monitoring thresholds. | `PENDING` | Alert thresholds are documented for auth error rate, callback failures, email send failures, rate-limit spikes, invite failures, and suspicious workspace access. |
| AUTH-OPS-002 | Support/Ops + Engineering | Rollback drill evidence. | `PENDING` | A named owner can execute each rollback action and evidence shows auth remains available. |

## Canonical Origin And Redirect Policy

The final implementation policy must be stated and tested in one place before code launch:

- production uses an exact configured canonical origin, not request-origin fallback;
- staging uses an exact configured origin;
- local development remains explicit and separate;
- Supabase Site URL equals the production canonical app origin;
- Supabase additional redirect URLs include exact production and staging callback paths;
- preview wildcards are disabled unless the Vercel/Supabase owners accept the risk in writing;
- Google authorized redirect URI matches the Supabase provider callback requirement;
- the app callback remains `/auth/callback`;
- unsafe, missing, cross-origin, callback-self, or malformed `next` paths fall back to `/workshop`;
- callback/user-facing errors use stable error codes and do not expose raw provider messages.

## Auth-Sensitive Surface Matrix Gate

The implementation is not release-ready until each surface has an owner, test evidence, and status.

| Surface | Required Evidence |
| --- | --- |
| Auth server actions | Tests for Google start, email start, invalid email, sent state, `shouldCreateUser`, canonical origin, and safe errors. |
| `/auth/callback` | Tests for missing code, exchange failure, unsafe `next`, callback self-redirect, encoded paths, and successful session redirect. |
| Next.js Proxy | Tests for signed-out `/workshop`, signed-in `/login`, auth aliases if implemented, and `/api` bypass awareness. |
| `/api` routes | Route-by-route auth, rate-limit, audit, service-role, and abuse posture. |
| Server actions | Unauthenticated, cross-workspace, and role-boundary tests for sensitive mutations. |
| Browser Supabase repositories | RLS tests for estimate, cost-library, profile/intake, and workspace settings reads/writes. |
| Service-role paths | Server-only import/bundle proof, scoped use, audit events, and no browser exposure. |
| Storage upload/delete routes | Ownership, path traversal, quota, MIME/size posture, cross-workspace denial, and deletion authorization. |
| Realtime/presence | Channel authorization and no cross-workspace presence leakage. |
| AI audit/auth paths | Ask-only auth guard, no admin DB bypass for AI, metadata-only audit unless retention is approved. |
| Legal/consent events | Server-only writes, versioned Terms/Privacy, separate marketing consent, and no overwrite of legal history. |

## Required Validation Evidence

At the implementation/release decision, the evidence bundle must include exact commands and outputs for the relevant commit.

Minimum release validation:

```bash
bun run validate
bun run build
git diff --check
```

Minimum targeted auth validation:

```bash
bun test --filter auth
bun test --filter callback
bun test --filter proxy
bun test --filter rls
```

The exact test commands may change to match repo scripts, but the evidence must cover:

- auth actions;
- callback behavior;
- route protection;
- API route security;
- RLS denial;
- invite acceptance and wrong-email behavior;
- onboarding/settings editability;
- service-role/storage safety;
- analytics/audit redaction.

## Monitoring Thresholds

Concrete values must be filled before private beta or public launch.

| Signal | Owner | Threshold Required Before Launch |
| --- | --- | --- |
| Callback failure rate | Support/Ops + Engineering | Pending owner value. |
| Email send failure rate | Support/Ops | Pending owner value. |
| Magic-link resend/rate-limit spike | Security + Supabase Owner | Pending owner value. |
| Google OAuth error spike | Support/Ops + Google Cloud Owner | Pending owner value. |
| Invite wrong-email or expired-link spike | Product + Support/Ops | Pending owner value. |
| Cross-workspace/RLS denial anomalies | Security + Engineering | Pending owner value. |
| Storage upload/delete denial or quota spike | Security + Engineering | Pending owner value. |
| Support tickets tagged auth/login | Support/Ops | Pending owner value. |

Do not ship public auth with metric names only. Thresholds and response owners are required.

## Residual Risk Acceptance

Use this template for any `ACCEPTED_RISK` row:

| Field | Required Value |
| --- | --- |
| Evidence ID | `AUTH-...` |
| Risk statement | What can go wrong and who is affected. |
| Why accepted | Why launch or implementation can proceed anyway. |
| Compensating controls | Monitoring, limits, manual review, private beta, feature flag, support path, or rollback. |
| Owner | One accountable person or role. |
| Reviewer | Security/legal/product/engineering reviewer as appropriate. |
| Review date | Date accepted. |
| Expiry date | Date when the risk must be revisited. |
| Rollback path | Exact reversible action. |

No residual risk may be accepted without an expiry date.

## Rollback And Kill-Switch Plan

Before private beta or public launch, Engineering and Support/Ops must document:

- how to disable public self-serve account creation;
- how to switch email auth from public signup to invite-only if `shouldCreateUser` changes;
- how to remove or hide public `Sign up` CTAs without breaking existing login;
- how to disable Google OAuth in an incident;
- how to pause email-link sending if deliverability or abuse fails;
- how to revoke sessions or force sign-out for affected users;
- how to disable onboarding analytics while keeping auth functional;
- how to preserve support access to DSAR/deletion workflows during rollback;
- who can execute each action and how it is audited.

Rollback must never require exposing service-role keys or dashboard secrets in chat, `.ai`, or logs.

Rollback drill evidence must include:

- drill date;
- environment;
- owner executing the drill;
- observer/reviewer;
- actions simulated or executed;
- evidence that existing users can still sign in where intended;
- evidence that public signup can be disabled without breaking login;
- restoration steps;
- residual risks.

## Implementation Start Gate

Auth code implementation may start only when:

- this document is reviewed by Product, Engineering, Security, and Legal/Privacy owners;
- the first implementation slice is chosen;
- the chosen slice has test-first acceptance criteria;
- code-review-graph/GitNexus impact analysis is run before editing impacted symbols;
- no credentialed provider/dashboard action is required to complete the local code slice;
- open external evidence is tracked as `PENDING`, `DEFERRED`, or `ACCEPTED_RISK` with owners.

Recommended first implementation slice after approval:

1. canonical origin and redirect helper;
2. safer auth action/callback error mapping;
3. no-password route/UI tests;
4. `/login` copy cleanup;
5. route/callback tests before broader onboarding work.

Do not start with provider migration or enterprise SSO.

## Private Beta Gate

Private beta may start only when:

- Privacy Notice and Terms links are live;
- launch mode is explicitly private beta;
- Supabase redirect allow-list and Google redirect URIs are verified for beta environments;
- email link sending and templates are verified;
- support knows how to handle failed login, wrong invite email, deletion/export/correction, and discovered child-account issues;
- beta user data collection is covered by notice at collection;
- analytics is disabled or consent/legal-approved.

## Public Launch Gate

Public launch may start only when:

- all P0 evidence rows are `PASS` or `ACCEPTED_RISK`;
- browser QA has passed on desktop and mobile;
- legal artifacts are public and reviewed;
- provider settings are captured in the private evidence store;
- Vercel environments and preview policy are reviewed;
- executable auth/security/RLS/API tests pass;
- support/incident/rollback owners are assigned;
- unsupported public claims are removed.

## Corporate Account Readiness Gate

Corporate-account features are not MVP blockers, but this decision record must be reopened before selling to teams that require:

- SAML/OIDC SSO;
- SCIM or directory sync;
- enforced MFA;
- verified domain auto-join;
- audit-log export;
- DPA/procurement packet;
- data residency commitment;
- owner transfer and last-owner guard;
- formal SOC/ISO/security claims.

## Source Notes From Official Checks

These source checks support the evidence requirements but do not replace owner evidence:

- Supabase passwordless docs state email magic links/OTPs are passwordless, magic links are one-time use, Site URL/additional redirect URLs constrain redirect destinations, and `shouldCreateUser` controls auto-signup behavior: https://supabase.com/docs/guides/auth/auth-email-passwordless
- Supabase redirect URL docs define URL configuration requirements for auth redirects: https://supabase.com/docs/guides/auth/redirect-urls
- Supabase Google login docs describe hosted Google provider setup: https://supabase.com/docs/guides/auth/social-login/auth-google
- Supabase rate-limit docs describe Auth rate limits, OTP defaults, resend windows, and IP-forwarding considerations: https://supabase.com/docs/guides/auth/rate-limits
- Supabase CAPTCHA docs describe hCaptcha and Cloudflare Turnstile support for sign-in/sign-up/password-reset forms: https://supabase.com/docs/guides/auth/auth-captcha
- Supabase production guidance is a required operational source before launch: https://supabase.com/docs/guides/platform/going-into-prod/
- Supabase API key docs are required for service-role and secret handling review: https://supabase.com/docs/guides/api/api-keys/
- Google OAuth web-server docs require redirect URIs to exactly match authorized redirect URIs: https://developers.google.com/identity/protocols/oauth2/web-server
- Google OAuth policies require owned/authorized domains and HTTPS-compliant web redirect origins; production apps need a homepage with Terms/Privacy links: https://developers.google.com/identity/protocols/oauth2/policies
- Google OAuth app verification and brand guidance should be checked before public launch: https://support.google.com/cloud/answer/13463073
- Vercel deployment protection docs describe preview/production access protection and plan-dependent protection scope: https://vercel.com/docs/deployment-protection
- Vercel environment-variable docs describe production, preview, and development environment scoping: https://vercel.com/docs/environment-variables
- Vercel custom environment docs should be checked for staging strategy: https://vercel.com/docs/deployments/custom-environments
- Vercel sensitive environment variable docs should be checked before storing auth secrets: https://vercel.com/docs/environment-variables/sensitive-environment-variables
- Vercel system environment variable docs should be checked before relying on generated deployment URLs: https://vercel.com/docs/environment-variables/system-environment-variables
- OWASP ASVS provides a requirements basis for testing web application security controls: https://owasp.org/www-project-application-security-verification-standard/
- California CCPA guidance describes notice-at-collection requirements and privacy-policy rights disclosures: https://oag.ca.gov/privacy/ccpa
- FTC COPPA guidance describes when COPPA applies to child-directed services or actual knowledge of children under 13: https://www.ftc.gov/business-guidance/resources/childrens-online-privacy-protection-rule-six-step-compliance-plan-your-business
- FTC CAN-SPAM guidance should be checked before marketing email launch: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business
- ICO PECR cookie guidance should be checked before non-essential analytics/cookies: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/
- Supabase, Vercel, and Google Cloud DPA pages should be checked for subprocessor/transfer evidence: https://supabase.com/legal/dpa, https://vercel.com/legal/dpa, https://cloud.google.com/terms/data-processing-addendum

## Final Planning Conclusion

The missing certainty is no longer strategic. The remaining work is external evidence collection, owner sign-off, and final launch QA/code-review closure.

Until those owner decisions are made:

- strategy: **GO**;
- local implementation: **GO WITH LOCAL EVIDENCE** as of 2026-05-27 for the implemented auth entry, callback, optional settings, stale onboarding redirect, schema, audit, and API-boundary test slice;
- private beta: **NO-GO**;
- public launch: **NO-GO**.

## 2026-05-27 Local Implementation Evidence Update

| Area | Status | Evidence | Remaining Launch Gate |
| --- | --- | --- | --- |
| Canonical routes | `PASS` local | `/login` remains canonical; `/auth/callback` remains canonical; `/signup`, `/sign-in`, and `/sign-up` routes were not added. | Browser QA and deployment URL evidence still required. |
| Passwordless app UI | `PASS` local | `/login` exposes Google and email-link flows only; no password UI or app-owned password action was added. | Hosted Supabase password/password-reset posture still requires owner evidence. |
| Redirect/origin safety | `PASS` local | Central sanitizer rejects external, protocol-relative, encoded external, CRLF, backslash, malformed, and callback-self redirects; origin helper prefers configured allow-listed origins over untrusted request origin and fails closed in production when no canonical origin is configured. | Supabase/Vercel redirect allow-list evidence still required. |
| Callback error safety | `PASS` local | Missing/exchange failures map to stable public error codes; raw provider errors are not rendered to users. | Provider-dashboard failure/cancel QA still required. |
| Settings and account data | `PASS` local | Optional profile settings, owner/admin workspace settings, stale `/workshop/onboarding` redirect to settings, shared text length limits, dormant marketing consent, and invited workspace/project/estimate collaborator membership reuse before fallback workspace creation were implemented and tested. Required first-run onboarding is not active. | Product/legal owner approval of field labels, notice copy, consent/legal records, and correction/export/delete workflow still required before launch. |
| Account security events | `PASS` local | `account_security_events` migration, RLS/no browser write grants, server-owned best-effort audit writer, hashed request metadata, and redacted metadata helpers were added. | Retention/review owner and hosted audit-log evidence still required. |
| Linked Supabase auth-account schema | `PASS` remote schema | `20260527072220_auth_account_data.sql` was applied to linked project `ebxxqidacheyapmmzavr`, repaired into remote migration history, and verified to expose `user_onboarding_profiles`, `workspace_account_settings`, and `account_security_events`. The login callback's prior `PGRST205` missing-table failure is no longer reproducible by authenticated table access. | Dashboard/provider settings, live Google QA, and owner evidence still required. |
| Sensitive API boundaries | `PASS` local | Executable tests cover AI auth rejection, proposal export no-store/current-workspace repository boundaries, component image/attachment storage delete ownership filters, auth-before-body-parsing on storage upload routes, and project image cross-workspace upload denial before storage writes. | Rate-limit, abuse, and audit decisions remain launch gates. |
| Legal links | `BLOCKED_FOR_LAUNCH` | `/privacy` and `/terms` are truthful launch-status pages that explicitly say public self-serve launch is blocked pending reviewed artifacts. | Reviewed Privacy Notice, Terms, subprocessor list, retention, DSAR, cookie/analytics, student/minor posture, and launch jurisdictions are required. |
| Provider/Vercel/Google evidence | `PENDING` | Redacted evidence placeholders are recorded in `16-provider-config-audit-redacted.md`. | Dashboard/cloud access and owner review are required before private beta or public launch. |
| Runbooks/rollback | `PASS` local draft | Support, incident, abuse, service-role leak, redirect vulnerability, cross-workspace data access, and rollback runbooks are recorded in `17-auth-runbooks-and-rollback.md`. | Named operational owners and incident contacts are still required. |

## 2026-05-27 Code Review Verdict

Local implementation review is clean for the scoped auth slice:

- code/security review recommendation: `APPROVE`;
- architecture review status: `CLEAR`;
- deterministic final local review verdict: `APPROVE + CLEAR`.

This does not change the release decision. Private beta and public launch remain `NO-GO` until the external provider, legal/privacy, Vercel, QA, support, and owner-evidence rows above are `PASS` or owner-backed `ACCEPTED_RISK`.
