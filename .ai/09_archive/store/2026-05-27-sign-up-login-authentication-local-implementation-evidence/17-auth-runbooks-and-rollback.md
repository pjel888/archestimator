# Auth Support, Incident, And Rollback Runbooks

**Date:** 2026-05-27
**Scope:** authentication support and incident readiness for local implementation
**Launch status:** runbooks are drafted; public/private launch remains blocked until owners, contacts, escalation paths, and external provider evidence are filled.

## Owner Placeholders

| Role | Required Before Launch |
| --- | --- |
| Support/Ops Owner | Named person, support queue, escalation SLA, incident comms channel. |
| Engineering Owner | Named person for rollback, migrations, deploys, and hotfix review. |
| Security Owner | Named person for redirect/service-role/cross-workspace/security incident triage. |
| Supabase Owner | Dashboard access, auth logs access, provider settings authority. |
| Google Cloud Owner | OAuth consent/client access and verification authority. |
| Vercel Owner | Deploy/env/protection access and rollback authority. |
| Legal/Privacy Owner | Terms/Privacy, DSAR, deletion/export/correction, minors/student posture. |

## User Support Runbooks

### Failed Google Sign-In

1. Confirm affected environment and exact timestamp.
2. Ask user for public-safe details only: browser, route, visible public error, and whether they canceled Google.
3. Check app logs for `auth_google_started`, `auth_callback_failed`, or missing callback events.
4. Check Supabase Auth logs and Google OAuth status in private dashboards.
5. If redirect URI or provider config changed, freeze rollout and follow rollback.
6. Never request or store Google tokens, callback codes, cookies, screenshots with secrets, or raw provider payloads.

### Expired Or Invalid Email Link

1. Confirm user is on `/login` and sees a stable public error.
2. Instruct user to request a new sign-in link from `/login`.
3. Check Supabase email logs, OTP expiry, resend cooldown, and rate-limit status.
4. If multiple users affected, escalate to Supabase Owner and Support/Ops Owner.
5. Do not ask users to forward magic links, OTPs, or callback URLs.

### Wrong-Email Invite

1. Verify the invitation record privately by invite ID or invited email hash/reference, not by publicly exposed token.
2. If the authenticated email does not match the invited email, keep access denied and ask the inviter to revoke/reissue.
3. Confirm no workspace membership was created for the wrong email.
4. Audit for repeated wrong-email attempts and escalate abuse patterns.

### Expired Or Revoked Invite

1. Confirm invite status and expiry in private data.
2. Return only stable public copy to the user.
3. Ask an owner/admin to reissue if appropriate.
4. Confirm no workspace/project/sheet membership was created after expiry or revocation.

### No Workspace Or Project After Sign-In

1. Confirm whether the user is self-serve or invited collaborator.
2. Self-serve users should land on `/workshop`; optional profile/workspace details live under `/workshop/settings`.
3. Invited collaborators should not be forced to create an organization workspace just to accept an invite.
4. If membership exists but default workspace is absent, set a support task for Engineering to inspect membership/profile state without creating duplicate workspaces.

### Deleted Or Deactivated User

1. Confirm identity through the approved support process.
2. Check Supabase Auth user state and profile/workspace membership state.
3. If deletion was requested, follow the legal-approved DSAR/delete workflow.
4. If deactivation is accidental, restore only through owner-approved database/auth procedures.

## Security Incident Runbooks

### Redirect Vulnerability Suspected

1. Freeze auth launch and disable affected preview/public entry if needed.
2. Reproduce using external URL, protocol-relative URL, encoded external URL, CRLF, backslash, callback-self redirect, malformed input, and missing next.
3. Confirm `sanitizeNextPath` and callback/proxy/action callers reject the payload.
4. Search logs for suspicious `next` values, storing only redacted/hashes where possible.
5. Patch, run targeted redirect tests, `bun run validate`, `bun run build`, browser smoke, and code review before re-enable.
6. Roll back if patch cannot be verified quickly.

### Cross-Workspace Data Access Suspected

1. Freeze affected route/API/storage surface.
2. Identify user, workspace, route, and object IDs in private evidence only.
3. Run RLS/API/storage tests for profile, workspace settings, project, estimate, component library, proposal export, and storage paths.
4. Inspect membership and role-rank changes.
5. Revoke affected sessions if unauthorized access is confirmed.
6. Notify Legal/Privacy Owner for breach/privacy assessment.

### Service-Role Leak Suspected

1. Treat as a security incident immediately.
2. Rotate the Supabase service-role key in Supabase and all runtime environments.
3. Redeploy all affected environments.
4. Search git history, logs, `.ai`, analytics, and client bundles for leaked values.
5. Confirm service-role key is server-only and never in browser/public config.
6. Review server-only service-role uses: dev auth, AI audit, storage upload paths, collaboration invites, account security audit.

### Invite Abuse Or Account Enumeration

1. Check rate-limit, invite creation, and email-sending telemetry.
2. Temporarily disable invite creation or restrict to owners/admins if abuse is active.
3. Review stable public error copy for enumeration leaks.
4. Tune Supabase/Auth/email rate limits and CAPTCHA decision.
5. Capture evidence for Security and Support/Ops owners.

### Provider Outage

1. Confirm if Google, Supabase Auth, email provider, or Vercel is affected.
2. Keep Google and email fallback paths visible if only one provider is affected.
3. Post support status only after owner approval.
4. Do not change provider configuration without recording the external evidence row.

## Rollback Plan

### Local Code Rollback

1. Identify the auth implementation commit SHA.
2. Revert the application changes if no migration has been applied externally.
3. Run targeted auth tests, `bun run validate`, `bun run build`, and browser smoke.
4. Confirm `/login`, `/auth/callback`, and `/workshop` protected-route behavior.

### Database Rollback

If `20260527072220_auth_account_data.sql` has not been applied remotely, remove it before release.

If it has been applied remotely:

1. Do not drop tables until Legal/Privacy and Engineering owners confirm no required audit/profile/workspace evidence must be retained.
2. Disable app writes first by rolling back code or feature-routing settings writes away.
3. Export or retain `account_security_events`, `user_onboarding_profiles`, and `workspace_account_settings` according to the retention decision.
4. Apply a reviewed rollback migration that drops policies/triggers/tables in dependency order only after retention approval.

### Provider Config Rollback

1. Restore previous Supabase Site URL and redirect allow-list from private evidence.
2. Restore previous Google OAuth redirect URI/client configuration.
3. Restore previous Vercel env vars and redeploy.
4. Re-run auth callback and provider smoke before reopening access.

### Launch Freeze Criteria

Freeze private beta/public launch if any of these are true:

- missing reviewed Privacy Notice or Terms;
- unverified Supabase redirect allow-list;
- raw provider error visible to users;
- unsafe redirect accepted;
- password UI or app-owned password action appears;
- service-role value appears in browser/public config, logs, `.ai`, analytics, or client bundle;
- cross-workspace data read/write is confirmed or cannot be ruled out;
- account security audit is storing raw tokens, magic links, callback codes, OTPs, service-role details, or raw provider payloads;
- `bun run validate`, `bun run build`, or browser smoke fails.
