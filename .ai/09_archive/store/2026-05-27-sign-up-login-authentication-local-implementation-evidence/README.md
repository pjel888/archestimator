# Sign Up / Log In Authentication Readiness Plan

**Date:** 2026-05-27
**Status:** local implementation evidence captured and archive-ready; private beta and public launch remain blocked by external evidence
**Implementation status:** local app code, tests, schema migration, account/security audit, optional profile/workspace settings, stale onboarding redirect, runbook, and redacted provider-evidence artifacts were added on 2026-05-27; Supabase dashboard, Google Cloud, Vercel, legal, and production provider configuration evidence still have not been completed in this repo
**Route scope:** signed-out auth entry routes, Supabase callback handling, protected `/workshop` session gating, workspace bootstrap, project/team access, and future corporate account controls

## Goal

Prepare a production-level, enterprise-aware but startup-lean authentication feature for Archestimator using:

- Google sign-up / sign-in as the primary path;
- email magic link / OTP sign-in as the passwordless fallback;
- no first-party passwords for now;
- account, workspace, and corporate-readiness rails that can grow into domain ownership, SSO, MFA, SCIM, audit trails, and legal compliance without forcing those features into the MVP.

## Core Recommendation

Keep **Supabase Auth** as the implementation path for the first production slice.

The repo already uses Supabase Auth, Supabase SSR clients, RLS, workspace membership, project collaboration invitations, protected `/workshop` routing, and Google/email auth server actions. Replacing this with Clerk/Auth0/WorkOS now would add migration cost before the current product needs it.

The plan still preserves an enterprise exit ramp:

- continue with Supabase Auth if Google, email magic links, invitations, MFA, and future Supabase SSO cover the need;
- evaluate Clerk only if the team wants fastest polished hosted auth UI and Vercel Marketplace provisioning over deep Supabase continuity;
- evaluate Auth0 or WorkOS when paid customers require mature enterprise SSO/SAML/OIDC, directory sync, domain policies, or procurement-friendly identity controls that Supabase cannot meet cleanly.

## Implementation Source Of Truth

This README plus the `01` through `17` primary docs below are the archived local implementation/evidence source for the next launch-readiness pass.

Older companion docs in this folder are first-pass context only. If they conflict with the primary docs, follow this source-of-truth chain:

1. `README.md`
2. `14-go-no-go-evidence-and-owner-decision-record.md`
3. `15-local-implementation-and-validation-evidence.md`
4. `16-provider-config-audit-redacted.md`
5. `17-auth-runbooks-and-rollback.md`
6. `13-user-intake-settings-and-account-data-strategy.md`
7. `12-phase-0-evidence-audit.md`
8. `11-second-pass-adversarial-review-and-blast-radius.md`
9. `01-current-state-and-repo-surface-audit.md` through `10-decisions-open-questions.md`
10. companion first-pass docs

Route naming is the most important conflict resolved by this second pass:

- canonical app auth route: `/login`;
- canonical callback route: `/auth/callback`;
- optional future aliases: `/sign-in` and `/sign-up`, both redirecting or rendering the same auth entry with mode hints;
- non-canonical/deprecated planning spelling: `/signup`;
- no product code should add `/signup` unless route IA is reopened and this pack is updated first.

## Non-Negotiable Constraints

- No passwords in the Archestimator UI or app-owned auth actions for now.
- No anonymous sign-ins.
- No broad auth provider migration unless a documented requirement exceeds Supabase Auth's practical fit.
- No service-role key in browser code, public config, `.ai`, logs, analytics events, or client bundles.
- No cross-workspace profile, project, estimate, library, AI, or collaboration reads.
- No legal/compliance claims in public copy until backed by a reviewed privacy notice, terms, DPA posture, subprocessors list, and counsel-reviewed scope.
- No enterprise features that add product drag before the first real startup users need them.

## Current Repo Facts

The current app is not greenfield:

- `/login` exists and exposes Google plus email magic-link sign-in.
- `/auth/callback` exchanges the Supabase auth code for a session and redirects to a sanitized `next` path.
- `src/proxy.ts` protects `/workshop` and redirects unauthenticated users to `/login`.
- `profiles`, `workspaces`, `workspace_members`, project collaboration tables, estimate-sheet collaboration tables, invitations, and RLS already exist.
- `ensureDefaultWorkspace()` and `requireCurrentUserContext()` are active workspace/session boundaries.
- Local dev auth bypass exists and must remain localhost-only and production-disabled.

## Pack Contents

Primary reading order:

- `01-current-state-and-repo-surface-audit.md` - current implementation inventory, existing strengths, and gaps.
- `02-product-ux-ui-plan.md` - user jobs, signed-out flows, UI states, accessibility, mobile, and copy requirements.
- `03-provider-and-enterprise-strategy.md` - Supabase-first decision, Clerk/Auth0/WorkOS comparison, SSO/MFA/domain/SCIM runway.
- `04-security-threat-model.md` - auth threat model, abuse controls, session safety, RLS boundaries, and service-role rules.
- `05-privacy-compliance-readiness.md` - GDPR/UK GDPR, CCPA/CPRA, Philippines DPA, PIPEDA, LGPD, cookies, subprocessors, data rights, retention.
- `06-data-model-and-account-lifecycle.md` - account/workspace lifecycle, invited users, ownership transfer, deactivation, deletion/export, corporate-domain structures.
- `07-implementation-sequence-no-code-yet.md` - staged implementation plan with file surfaces, test-first gates, and rollback points.
- `08-testing-validation-and-release-gates.md` - unit, integration, migration, browser, security, compliance, and production readiness gates.
- `09-operations-and-launch-readiness.md` - Supabase/Google/Vercel/email configuration, monitoring, support, incident response, rollout.
- `10-decisions-open-questions.md` - ADR-style decisions, assumptions, blocked external decisions, and future review triggers.
- `11-second-pass-adversarial-review-and-blast-radius.md` - second-pass subagent findings, blocker list, route/data/source corrections, and repo blast-radius matrix.
- `12-phase-0-evidence-audit.md` - read-only local/public evidence audit showing what is now proven, still not proven, or blocked on Supabase dashboard, Google Cloud, Vercel, Legal, Engineering, and QA access.
- `13-user-intake-settings-and-account-data-strategy.md` - planned intake fields, now implemented as optional settings edit paths, data ownership, privacy/export/delete/correction requirements, analytics boundaries, and launch gates for user/account data.
- `14-go-no-go-evidence-and-owner-decision-record.md` - final owner/evidence decision ledger for implementation, private beta, public launch, residual-risk acceptance, rollback, and release go/no-go status.
- `15-local-implementation-and-validation-evidence.md` - implementation evidence for auth entry, callback, onboarding/settings, schema, audit, API tests, and remaining validation gaps.
- `16-provider-config-audit-redacted.md` - repo-safe provider/runtime/legal evidence ledger with launch-blocking pending rows.
- `17-auth-runbooks-and-rollback.md` - support, security incident, provider outage, service-role leak, cross-workspace incident, and rollback runbooks.

Companion planning docs in this folder add useful additional detail and should be treated as supplemental. They are not implementation authority when they conflict with the primary docs above:

- `01-current-state-and-auth-surface-audit.md` - first-pass repo/auth surface audit with file-by-file implementation gaps.
- `02-product-ux-ui-flow-plan.md` - first-pass UX flow plan.
- `03-technical-architecture-and-data-plan.md` - technical architecture and data model expansion.
- `04-security-privacy-international-compliance-plan.md` - combined security/privacy/international compliance expansion.
- `05-corporate-accounts-enterprise-readiness-plan.md` - corporate account readiness expansion.
- `06-implementation-sequence-and-test-plan.md` - detailed checklist-style implementation/test plan.
- `07-readiness-gates-risk-register-open-decisions.md` - risk register, gates, and open decisions.

## Local MVP Cutline

The first local implementation shipped only:

1. polished unified auth entry for Sign up / Log in;
2. Google OAuth;
3. email magic link fallback;
4. safe callback and redirects;
5. first workspace bootstrap;
6. optional profile and workspace settings for display name, organization/workspace name, organization type, profession/user category, country/region, and optional primary use; `/workshop/onboarding` is a stale-link compatibility redirect to `/workshop/settings`, not a required first-run gate;
7. invite acceptance continuity;
8. visible privacy/terms links and consent copy;
9. server-owned auth/security audit events;
10. tests, route protection, `/api` auth inventory, and Supabase config verification.

Everything else is readiness, not MVP implementation:

- passwords;
- SMS;
- passkeys;
- SAML SSO or enterprise OIDC connection flows;
- SCIM;
- multiple corporate domains per workspace;
- self-serve billing-seat provisioning;
- admin console;
- public compliance badges.

## Launch Blockers Found In Second Pass

Do not launch public self-serve auth until these are resolved or explicitly accepted as residual risk:

1. Hosted Supabase passwordless-only posture is proven or documented as app-level no-password only.
2. Auth actions and callback use a canonical-origin allowlist instead of trusting request origin blindly in production.
3. Supabase Site URL and redirect allow-list are inventoried exactly for production, staging, preview, and local development.
4. Every `/api` route touching user/workspace/project data has an explicit auth, RLS, service-role, rate-limit, and audit posture.
5. Privacy Notice, Terms, subprocessor list, retention schedule, DSAR workflow, and launch jurisdiction scope are real artifacts, not headings.
6. Current string-contract auth tests are upgraded with executable action/callback/redirect/API/RLS behavior tests before implementation is considered production-ready.

## Phase 0 Evidence Result

The follow-up evidence audit is now captured in `12-phase-0-evidence-audit.md`.

That pass proves the hosted public Supabase Auth settings endpoint is reachable and currently reports email plus Google enabled, phone and anonymous providers disabled, passkeys disabled, SAML disabled, and signups enabled. It does **not** prove hosted password grants are impossible, redirect allow-lists are correct, SMTP/templates/rate limits are launch-ready, Google Cloud OAuth consent is complete, Vercel environments are configured, or legal artifacts are live.

## Sources Used

- Supabase passwordless email login docs: https://supabase.com/docs/guides/auth/auth-email-passwordless
- Supabase Google login docs: https://supabase.com/docs/guides/auth/social-login/auth-google
- Supabase email template docs: https://supabase.com/docs/guides/auth/auth-email-templates
- Supabase redirect URL docs: https://supabase.com/docs/guides/auth/redirect-urls
- Supabase session docs: https://supabase.com/docs/guides/auth/sessions
- Supabase auth audit logs docs: https://supabase.com/docs/guides/auth/audit-logs
- Supabase production checklist / rate-limit guidance: https://supabase.com/docs/guides/deployment/going-into-prod
- Supabase JavaScript auth/OAuth guidance from current docs.
- Next.js 16 App Router / Proxy auth guidance from current docs.
- Vercel auth integration skill guidance for Clerk, Descope, Auth0, and Marketplace tradeoffs.
- European Commission data protection overview: https://commission.europa.eu/law/law-topic/data-protection/data-protection-eu_en
- EDPB consent guidance: https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052020-consent-under-regulation-2016679_en
- UK ICO cookies guidance: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/cookies-and-similar-technologies/
- California CCPA/CPRA official page: https://oag.ca.gov/privacy/ccpa
- Philippines National Privacy Commission Data Privacy Act page: https://privacy.gov.ph/data-privacy-act/
- Canada PIPEDA official page: https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/
- Brazil ANPD official portal for LGPD guidance: https://www.gov.br/anpd/pt-br
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- NIST Digital Identity Guidelines: https://pages.nist.gov/800-63-4/

## Current Completion Gate

The first local implementation slice has been built test-first and with GitNexus/code-review-graph impact checks. No repo-local implementation remains in this plan pack as of 2026-05-27; the remaining work is launch readiness, external evidence, owner review, and broad-worktree closeout.

Do not mark this feature launch-ready until:

- code review returns clean `APPROVE + CLEAR`;
- Supabase, Google Cloud, Vercel, legal/privacy, QA, and support evidence rows in `16-provider-config-audit-redacted.md` and `14-go-no-go-evidence-and-owner-decision-record.md` are `PASS` or owner-backed `ACCEPTED_RISK`;
- the pending Privacy Notice and Terms status pages are replaced by reviewed launch artifacts;
- browser/manual QA evidence is recorded for desktop and mobile auth paths.
