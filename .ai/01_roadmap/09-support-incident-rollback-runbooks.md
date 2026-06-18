# Support Incident & Rollback Runbooks

Last updated: 2026-05-30

> **STATUS: Planning Templates.** All runbooks below are TEMPLATES. They document what procedures must exist before beta and production, not that drills have been performed. No incidents have been simulated, no test emails have been sent, and no production configuration has been modified.

---

## Summary Table

| Metric | Count |
|---|---|
| Total runbooks | 20 |
| Templates created | 20 |
| Runbooks requiring drill (before beta) | 4 (AUTH-001, SEC-001, SEC-003, DEP-002) |
| Runbooks requiring drill (before production) | 16 (all remaining) |
| Runbooks requiring automation | 5 (AUTH-001, SEC-001, DEP-002, EXP-001, DB-002) |

---

## Runbook Templates

### AUTH-001: Auth Failure — Google OAuth or Email Sign-In Outage

| Field | Detail |
|---|---|
| **Incident ID** | AUTH-001 |
| **Scenario** | Google OAuth callback fails or email magic-link sign-in returns errors. Users cannot authenticate. |
| **Symptoms** | Login page redirects loop; Supabase `signInWithOAuth` returns `provider_error`; magic-link emails arrive but link fails; elevated 4xx/5xx on `/auth/callback`; spike in `/login` page views without subsequent workspace loads. |
| **Severity** | Critical |
| **Owner** | OWNER_NAME_PLACEHOLDER (until delegated) |
| **First Response** | 1. Confirm scope via Supabase Dashboard > Authentication > Logs. 2. Check Google Cloud Console for OAuth consent screen / credential status. 3. Verify callback URL in Supabase Auth settings matches production domain. 4. Test sign-in manually in incognito window. 5. Post to `#incidents` channel: "AUTH-001: Investigating sign-in outage. ETA for status update: 10 min." |
| **Containment Steps** | If Google-side: switch to email magic-link as fallback (enable in Supabase Dashboard if disabled). If Supabase-side: enable maintenance-mode banner on login page. If credential leak suspected (see SEC-001): rotate OAuth client secret immediately. |
| **Customer Message Template** | "We're currently experiencing an issue with sign-in. Our team is investigating. If you need immediate access, try [alternate method] or contact SUPPORT_INBOX_PLACEHOLDER. We'll post updates here." |
| **Recovery Steps** | 1. Apply fix (credential rotation, config correction, or wait for provider recovery). 2. Verify sign-in with test accounts across OAuth and email flows. 3. Confirm session persistence works post-fix. 4. Remove maintenance banner. 5. Post resolution to `#incidents`. |
| **Evidence to Preserve** | Supabase Auth logs (export window covering incident + 1 hour prior); Google Cloud audit logs; any user-reported screenshots; timeline of detection-to-resolution. |
| **Post-Incident Action** | Write postmortem to `/.ai/postmortems/AUTH-001-YYYY-MM-DD.md`. Review OAuth credential rotation schedule. Add synthetic sign-in monitor. |

---

### AUTH-002: Provider Outage — Supabase Auth Service Disruption

| Field | Detail |
|---|---|
| **Incident ID** | AUTH-002 |
| **Scenario** | Supabase Auth experiences a platform-level outage. Authentication, session refresh, and user management APIs are unavailable. |
| **Symptoms** | Supabase status page shows degraded/auth-down; all auth API calls time out or return 503; existing sessions may still work (JWT validation is local) but new sign-ins fail; `/auth/v1/*` endpoints unreachable. |
| **Severity** | Critical |
| **Owner** | OWNER_NAME_PLACEHOLDER (until delegated) |
| **First Response** | 1. Check https://status.supabase.com. 2. Verify with `curl` against auth endpoint. 3. Determine if session refresh is affected (check JWT `exp` claims on active users). 4. Post to `#incidents`: "AUTH-002: Supabase Auth experiencing platform outage. Monitoring status page. Existing sessions stable for ~[N] minutes." |
| **Containment Steps** | Extend session durations temporarily if Supabase project settings allow. Display banner: "Sign-in is temporarily unavailable. Your existing session remains active." Do NOT attempt to restart or reconfigure auth mid-outage. |
| **Customer Message Template** | "Our authentication provider is experiencing a temporary outage. If you're already signed in, your session is unaffected. New sign-ins will be available as soon as the provider resolves the issue. We're monitoring closely." |
| **Recovery Steps** | 1. Wait for Supabase to resolve (do not apply local changes during provider outage). 2. After status page shows green, test sign-in and session refresh. 3. Verify no auth config drift occurred. 4. Post resolution. |
| **Evidence to Preserve** | Supabase status page screenshot (timeline); auth error logs from application side; any customer reports with timestamps. |
| **Post-Incident Action** | Evaluate multi-provider auth redundancy. Document maximum tolerable auth downtime in SLA. Add Supabase status page monitor to incident detection pipeline. |

---

### INV-001: Expired Invite — User Reports Invite Link Not Working

| Field | Detail |
|---|---|
| **Incident ID** | INV-001 |
| **Scenario** | A user reports that their workspace invitation link has expired and they cannot join. |
| **Symptoms** | User receives "Invite expired" or "Link invalid" error; invite record shows `expires_at < now()` in database; user cannot complete workspace onboarding. |
| **Severity** | Medium |
| **Owner** | OWNER_NAME_PLACEHOLDER (until delegated) |
| **First Response** | 1. Confirm invite exists in `collaboration_invitations` table (the actual invite table — there is no `workspace_invites` table; see `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql`). 2. Check `expires_at`, `accepted_at`, and `revoked_at` fields. 3. Verify user identity matches invite email. 4. Acknowledge to user within 1 business hour. |
| **Containment Steps** | If invite is genuinely expired and user is legitimate: do NOT extend the existing invite (audit trail). Instead, revoke the expired invite and issue a new one with a fresh window (current schema default is 14 days, not 7 — `expires_at default (now() + interval '14 days')` in the migration above). Log the reissue in an audit comment. |
| **Customer Message Template** | "Thanks for letting us know. Your invitation link has expired. We've sent a new invitation to [email]. It's valid for 14 days. Let us know if you run into any issues." |
| **Recovery Steps** | 1. Revoke old invite. 2. Create new invite to same email. 3. Confirm delivery. 4. Follow up after 24 hours if not accepted. |
| **Evidence to Preserve** | Original invite record (export); timestamps of expiration and reissue; user communication thread. |
| **Post-Incident Action** | Review invite expiry window. Consider automated re-invite nudge 48 hours before expiry. Add "resend invite" self-service for workspace admins. |

---

### INV-002: Wrong-Email Invite — Invite Sent to Wrong Address

| Field | Detail |
|---|---|
| **Incident ID** | INV-002 |
| **Scenario** | A workspace admin reports they invited the wrong email address and need to revoke access before the unintended recipient joins. |
| **Symptoms** | Admin reports incorrect email on invite dashboard; invite shows `accepted_at = NULL` (not yet claimed); unintended recipient may have clicked the link. |
| **Severity** | High |
| **Owner** | OWNER_NAME_PLACEHOLDER (until delegated) |
| **First Response** | 1. Immediately revoke the invite (set `revoked_at = now()`). 2. Check if invite was already accepted. 3. If accepted, escalate to SEC-003 (Cross-Workspace Data Access). 4. Confirm revocation with admin within 30 minutes. |
| **Containment Steps** | Revoke invite. If accepted: remove user from workspace, audit all actions taken by that user since acceptance, notify admin of any data exposed. |
| **Customer Message Template** | "We've revoked the invitation sent to [wrong email]. A new invitation has been sent to the correct address. If the unintended recipient accessed any data, we'll provide a full audit." |
| **Recovery Steps** | 1. Revoke wrong invite. 2. Issue correct invite. 3. Audit access if invite was accepted. 4. Coach admin on invite verification. |
| **Evidence to Preserve** | Full invite lifecycle (created, sent, revoked); any access logs if invite was accepted; admin communication. |
| **Post-Incident Action** | Add invite confirmation step: "You're inviting [email]. Is this correct?" Add "revoke invite" self-service button for admins. Consider invite preview before send. |

---

### WS-001: Missing Workspace — Authenticated User Sees No Workspace

| Field | Detail |
|---|---|
| **Incident ID** | WS-001 |
| **Scenario** | A user authenticates successfully but lands on an empty state with no workspaces visible. They cannot access any projects. |
| **Symptoms** | User reports "I signed in but see nothing"; workspace list API returns empty array; `workspace_members` table has no rows for the user's `auth.uid()`; user may have been removed or never added. |
| **Severity** | High |
| **Owner** | OWNER_NAME_PLACEHOLDER (until delegated) |
| **First Response** | 1. Verify user identity via Supabase Auth UID. 2. Query `workspace_members` for that UID. 3. Check if user was recently removed (audit log). 4. Check if user has orphaned invitations. 5. Respond to user within 2 hours. |
| **Containment Steps** | If user should have access: add them back to the workspace, log the action. If user should NOT have access: explain the situation clearly (they may need a new invite). If this is a data integrity issue (membership missing despite invite acceptance), escalate to DB-001. |
| **Customer Message Template** | "We've looked into your account and [explanation: restored access / you need a new invitation / we're investigating a data issue]. We'll follow up within [timeframe]." |
| **Recovery Steps** | 1. Restore membership or issue new invite. 2. Confirm user can see workspace and projects. 3. If systemic (multiple users affected), check for RLS policy misconfiguration or migration side effect. |
| **Evidence to Preserve** | `workspace_members` query results for user; audit log entries; user communication thread. |
| **Post-Incident Action** | Add "no workspaces" help state in UI with "Request Access" button. Review membership removal audit trail. Add alert if workspace member count drops unexpectedly. |

---

### WS-002: Missing Project — User Cannot Find Expected Project

| Field | Detail |
|---|---|
| **Incident ID** | WS-002 |
| **Scenario** | A user within a workspace cannot see a project they expect to have access to. |
| **Symptoms** | User reports project not in list; project exists in `projects` table but user has no `project_members` row; RLS may be filtering incorrectly. (NOTE — code reality: the current schema has **no project archive/soft-delete and no per-project visibility column** on `projects`; deletion is a hard-delete RPC, `execute_bulk_delete_projects` — see `supabase/migrations/20260603160000_mass_deletion_governance.sql`. So an "archived/visibility-changed" cause is not a current code path; the realistic causes are a missing `project_members` row or an RLS filter.) |
| **Severity** | Medium |
| **Owner** | OWNER_NAME_PLACEHOLDER (until delegated) |
| **First Response** | 1. Confirm project exists and is not soft-deleted. 2. Check `project_members` for user. 3. Check project visibility setting (workspace-wide vs. invited-only). 4. Verify RLS policy on `projects` table. 5. Respond within 4 hours. |
| **Containment Steps** | If user should have access: add `project_members` row or change project visibility. If project was accidentally archived: restore it. If RLS policy is buggy: apply fix and verify no other users affected. |
| **Customer Message Template** | "We found the issue with your project access. [Fix applied]. You should now see [project name] in your workspace. Let us know if anything else is missing." |
| **Recovery Steps** | 1. Apply access fix. 2. Confirm user sees project. 3. Spot-check other workspace members for similar access gaps. |
| **Evidence to Preserve** | Project record state; user membership state; RLS policy version at time of incident. |
| **Post-Incident Action** | Add project visibility indicator in UI. Add "missing a project?" help flow. Review project-access audit queries. |

---

### USR-001: Deleted/Deactivated User — User Account Removed

| Field | Detail |
|---|---|
| **Incident ID** | USR-001 |
| **Scenario** | A user reports their account no longer exists or they cannot sign in because their account was deleted or deactivated. |
| **Symptoms** | User receives "user not found" on sign-in; `auth.users` row has `deleted_at` set or is missing entirely; workspace shows user as "inactive" or removed from member list. |
| **Severity** | High |
| **Owner** | OWNER_NAME_PLACEHOLDER (until delegated) |
| **First Response** | 1. Check `auth.users` for the email (including soft-deleted). 2. Review audit log for who/what triggered deactivation. 3. Determine if deletion was intentional (admin action, user request, automated cleanup) or accidental. 4. Respond within 2 hours. |
| **Containment Steps** | If accidental: restore user account if soft-deleted; re-add workspace memberships. If intentional but contested: escalate to workspace admin for resolution; do not restore without admin approval. If malicious: escalate to SEC-001. |
| **Customer Message Template** | "We've investigated your account status. [Explanation and next steps]. If this was unexpected, we'll work with your workspace admin to restore access." |
| **Recovery Steps** | 1. Restore account (if soft-delete) or guide user through re-registration. 2. Restore workspace memberships. 3. Verify sign-in and data access. |
| **Evidence to Preserve** | Account lifecycle audit trail; deletion trigger and actor; user communication. |
| **Post-Incident Action** | Implement soft-delete with recovery window before hard-delete. Add "account deactivation" notification email. Add admin confirmation dialog before user removal. |

---

### SEC-001: Service-Role Leak — Suspected Service_Role Key Exposure

| Field | Detail |
|---|---|
| **Incident ID** | SEC-001 |
| **Scenario** | The Supabase `service_role` key may have been exposed in client-side code, a public repository, error logs, or a compromised environment variable. |
| **Symptoms** | Report of key found in public location; unexpected admin-level API calls; `service_role` usage in browser-network tab; GitHub secret scanning alert; anomalous database writes bypassing RLS. |
| **Severity** | Critical |
| **Owner** | OWNER_NAME_PLACEHOLDER (until delegated) |
| **First Response** | 1. **IMMEDIATE: Rotate the `service_role` key in Supabase Dashboard > Project Settings > API.** This revokes the old key. 2. Identify all places the old key was configured (Vercel env vars, `.env` files, CI/CD, local dev). 3. Update all references to the new key. 4. Redeploy affected services. 5. Declare incident in `#incidents` within 5 minutes of confirmation. |
| **Containment Steps** | 1. Rotate key (already done in first response). 2. Audit Supabase logs for any unauthorized `service_role` usage during the exposure window. 3. Check for unauthorized data access, user creation, or RLS bypass. 4. If data was modified: restore from backup if needed. 5. Revoke and rotate any other credentials that shared the same environment. |
| **Customer Message Template** | "We identified and resolved a security configuration issue. Out of an abundance of caution, we've rotated all affected credentials. There is no evidence of unauthorized data access. We'll share more details after our investigation completes." |
| **Recovery Steps** | 1. Confirm new key works across all services. 2. Verify RLS is enforced on all tables (spot-check). 3. Run full audit of `service_role` API calls during exposure window. 4. Confirm no new users/workspaces created during window. 5. Update incident log. |
| **Evidence to Preserve** | Full Supabase API logs for exposure window; GitHub/wherever key was found (screenshot before takedown); key rotation timestamp; audit query results; timeline of detection-to-rotation. |
| **Post-Incident Action** | Add pre-commit hook to scan for key patterns. Add Vercel env var masking. Configure GitHub secret scanning. Restrict `service_role` usage to server-side only (code review check). Schedule credential rotation cadence. Write postmortem. |

---

### SEC-002: Redirect Vulnerability — Suspected Open Redirect Exploit

| Field | Detail |
|---|---|
| **Incident ID** | SEC-002 |
| **Scenario** | An attacker may be exploiting an open redirect in the authentication flow or application URLs to phish users or bypass security controls. |
| **Symptoms** | Report or detection of unexpected redirect targets in auth callback URLs; phishing report from user who was redirected to external domain after sign-in; URL parameters containing external domains in `redirect_to` or `next` params; security scanner alert. |
| **Severity** | Critical |
| **Owner** | OWNER_NAME_PLACEHOLDER (until delegated) |
| **First Response** | 1. Immediately validate the redirect URL allowlist in Supabase Auth settings (Site URL, Redirect URLs). 2. Check application code for any `redirect()` calls that accept user-supplied URLs without validation. 3. Review server logs for redirect patterns in the last 24 hours. 4. Declare within 15 minutes of confirmation. |
| **Containment Steps** | 1. Strip or constrain all user-supplied redirect parameters to an allowlist of known-safe paths. 2. If exploitation is active: deploy hotfix that validates `redirect_to` against a static allowlist. 3. Notify affected users if phishing is confirmed. 4. Report malicious URLs to Safe Browsing if applicable. |
| **Customer Message Template** | "We've identified and fixed a vulnerability related to URL redirects. If you received an unexpected redirect after signing in, please do not interact with the destination page and report it to EMAIL_PLACEHOLDER. No account credentials were exposed through this issue." |
| **Recovery Steps** | 1. Deploy redirect validation fix. 2. Test all sign-in flows with valid and invalid redirect params. 3. Audit redirect allowlist in Supabase. 4. Verify no other redirect vectors exist in the application. |
| **Evidence to Preserve** | Server logs showing redirect patterns; Supabase Auth redirect configuration at time of incident; any phishing URLs reported; timeline of fix deployment. |
| **Post-Incident Action** | A centralized redirect validation utility already exists and is tested — `sanitizeNextPath` / `getAllowedAppOrigins` / `resolveAuthOrigin` in `src/lib/auth/redirects.ts`, covered by `tests/vitest/auth-redirect-sanitizer.test.ts` (so this is a harden/extend step, not a build-from-scratch). Add open-redirect test cases to the security test suite. Configure CSP headers with `form-action` directive. Add WAF rule for suspicious redirect patterns. |

---

### SEC-003: Cross-Workspace Data Access — Suspected Tenant Isolation Breach

| Field | Detail |
|---|---|
| **Incident ID** | SEC-003 |
| **Scenario** | A user reports seeing data from another workspace, or automated monitoring detects that a user accessed resources belonging to a different workspace than their own. |
| **Symptoms** | User reports seeing unfamiliar projects/estimates; API returns data with `workspace_id` not matching user's memberships; RLS policy test failures; audit log shows cross-workspace queries; bug report with screenshots of foreign data. |
| **Severity** | Critical |
| **Owner** | OWNER_NAME_PLACEHOLDER (until delegated) |
| **First Response** | 1. **IMMEDIATE: Take a database snapshot for forensic analysis.** 2. Verify the user report by reproducing with their account context. 3. Check RLS policies on all tables that returned cross-workspace data. 4. Audit all queries made by the affected user in the last 30 days. 5. Determine if this is a policy bug, a code-level join error, or a `service_role` bypass. 6. Declare incident within 10 minutes of confirmation. |
| **Containment Steps** | 1. If RLS policy is missing or misconfigured: apply fix immediately and deploy. 2. If code-level bug (e.g., query missing `workspace_id` filter): patch and deploy. 3. Identify all users/sessions that may have been affected. 4. If data was written cross-workspace: quarantine affected records, notify workspace owners. 5. Consider read-only mode while fix is deployed. |
| **Customer Message Template** | "We've identified and resolved an issue that could have allowed viewing of data outside your workspace. We've confirmed the scope and are notifying affected workspaces individually. No data was modified or deleted. A full security review is underway." |
| **Recovery Steps** | 1. Deploy RLS/code fix. 2. Verify all tables have correct RLS policies with `workspace_id` checks. 3. Run cross-workspace access audit across all tables. 4. Notify affected workspace owners individually with scope details. 5. Confirm fix with penetration test. |
| **Evidence to Preserve** | Database snapshot at detection; full audit logs for affected queries; RLS policy definitions before and after fix; user report and reproduction steps; notification records. |
| **Post-Incident Action** | Add automated cross-workspace access detection (periodic audit queries). Add RLS policy integration tests to CI pipeline. Schedule quarterly tenant-isolation penetration test. Write postmortem. Review data-classification and retention policies. |

---

### ABUSE-001: Shared Link Abuse — Unauthorized Sharing or Access Pattern

| Field | Detail |
|---|---|
| **Incident ID** | ABUSE-001 |
| **Scenario** | A shared proposal or estimate link is being accessed from unexpected IPs, shared outside intended recipients, or used in a pattern suggesting abuse. |
| **Symptoms** | Spike in views from unknown IPs/geographies; share link posted on public forums; recipient reports receiving link they shouldn't have; access pattern shows automated scraping. |
| **Severity** | Medium |
| **Owner** | OWNER_NAME_PLACEHOLDER (until delegated) |
| **First Response** | 1. Identify the shared resource from access logs. 2. Check share settings (public vs. restricted, expiry, password). 3. Review access log for IPs, user agents, geographies. 4. Determine if this violates terms or is a security concern. |
| **Containment Steps** | If unauthorized: immediately revoke the share link. Generate a new link with tighter restrictions (expiry, password, email verification). If scraping detected: rate-limit the share endpoint. Notify the resource owner. |
| **Customer Message Template** | "We detected unusual activity on a shared link for [resource name]. We've revoked the link and created a new one with additional security. Please reshare the new link with your intended recipients. Contact us if you need help." |
| **Recovery Steps** | 1. Revoke compromised link. 2. Issue new restricted link. 3. Confirm owner can access and reshare. 4. Monitor new link for 48 hours. 5. Review and tighten default share settings if needed. |
| **Evidence to Preserve** | Access logs for compromised link; IP/geography data; share settings at time of incident; communication with resource owner. |
| **Post-Incident Action** | Add share-link analytics dashboard. Implement anomaly detection on share-link access patterns. Add optional email verification for shared links. Review default link expiry settings. |

---

### ABUSE-002: Brute-Force/Password-Gate Abuse — Repeated Password Attempts

| Field | Detail |
|---|---|
| **Incident ID** | ABUSE-002 |
| **Scenario** | Monitoring detects a high volume of failed authentication/password attempts, suggesting a brute-force or credential-stuffing attack. (IMPORTANT code reality: there is **no password-based user sign-in** — auth is magic-link OTP `signInWithOtp` + Google OAuth `signInWithOAuth` only, `src/lib/auth/actions.ts`, so `grant_type=password` brute-force does not apply to user login. The real password-brute-force surface is the **shared-link password gate** `POST /api/share/[token]/password`, which already has progressive-delay + hard-lockout + durable per-IP rate limiting — `src/lib/publication/security.ts`. Target this runbook at that surface and the magic-link/OAuth request floods, not at a non-existent password login.) |
| **Symptoms** | Spike in Supabase Auth "failed login"/OTP-request events; elevated rate of failed share-link password attempts (`security_rate_limit_events` `password_failure` rows); multiple accounts/links targeted from same IP; user reports of unexpected "too many attempts" messages; Auth logs showing rapid-fire attempts. |
| **Severity** | High |
| **Owner** | OWNER_NAME_PLACEHOLDER (until delegated) |
| **First Response** | 1. Confirm attack via Supabase Dashboard > Authentication > Logs (filter by error type). 2. Identify target accounts and source IPs. 3. Check if any accounts were successfully compromised (successful login after burst of failures). 4. Declare within 30 minutes of detection. |
| **Containment Steps** | 1. Enable or tighten Supabase Auth rate limits (if not already configured). 2. Block attacking IPs at edge/WAF level. 3. Force password reset for any accounts with successful login from attacking IPs. 4. Enable CAPTCHA on sign-in page if not present. 5. Notify affected users. |
| **Customer Message Template** | "We detected a sign-in attack targeting multiple accounts. We've blocked the source and implemented additional protections. As a precaution, we've asked some users to reset their passwords. If you received a password reset email, please follow the instructions. Your data remains secure." |
| **Recovery Steps** | 1. Confirm rate limits and WAF rules are active. 2. Verify no unauthorized access occurred (audit successful logins from attacking IPs). 3. Notify users who need to reset passwords. 4. Monitor for 24 hours. |
| **Evidence to Preserve** | Attack IPs and patterns; Supabase Auth logs during attack window; rate-limit configuration at time of attack; any compromised account list. |
| **Post-Incident Action** | Review and harden Supabase Auth rate limits. Add WAF brute-force protection rules. Implement account locking after N failed attempts. Add monitoring alert for failed-login spikes. |

---

### AI-001: AI Provider Failure — DeepSeek API Unavailable

| Field | Detail |
|---|---|
| **Incident ID** | AI-001 |
| **Scenario** | The DeepSeek API is unreachable, returning errors, or experiencing degraded performance. The AI-powered features are unavailable. (Code reality: the real AI surfaces are the read-only **Ask** assistant `POST /api/ai/ask` and the **Package Builder** `POST /api/ai/package-builder` (draft/refine/apply); both are **OFF by default** behind `ARCHESTIMATOR_AI_ENABLED` — `src/lib/ai/feature-flags.ts` — and route to DeepSeek via `src/lib/ai/deepseek.ts`. There is no standalone "estimate generation" feature beyond the Package Builder.) |
| **Symptoms** | DeepSeek API returns 5xx or connection timeouts; Ask/Package-Builder requests hang or return errors; DeepSeek status page shows incident; elevated error rate in AI service logs. (NOTE: proposal/XLSX export does **not** call AI — it is exceljs-only `src/lib/proposal-export/create-proposal-workbook.ts` — so an AI outage does not break export; an export failure is EXP-001, not AI-001.) |
| **Severity** | High |
| **Owner** | OWNER_NAME_PLACEHOLDER (until delegated) |
| **First Response** | 1. Check DeepSeek status page. 2. Verify API key validity and rate limits. 3. Test a minimal API call. 4. Determine if this is provider-wide or key-specific. 5. Post to `#incidents` within 15 minutes. |
| **Containment Steps** | Display graceful degradation in UI: "AI-powered features are temporarily unavailable. You can still create estimates manually." Disable AI-dependent buttons (disable, don't remove). Queue requests for retry if provider outage is expected to be brief. If extended outage: activate fallback provider if configured. |
| **Customer Message Template** | "Our AI-powered features are temporarily unavailable due to an issue with our AI provider. All manual features remain fully operational. You can still create and edit estimates, and we'll notify you when AI features are restored." |
| **Recovery Steps** | 1. Wait for provider recovery or switch to fallback. 2. Test estimate generation and proposal export end-to-end. 3. Retry any queued requests. 4. Confirm AI features are responsive. 5. Post resolution. |
| **Evidence to Preserve** | DeepSeek API error logs; provider status page screenshots; timeline of impact; any queued/retried request outcomes. |
| **Post-Incident Action** | Implement AI provider health-check endpoint. Add fallback provider configuration. Define AI-feature SLA separate from core app SLA. Add circuit-breaker pattern for AI calls. |

---

### EXP-001: XLSX Export Failure — Proposal Export Fails

| Field | Detail |
|---|---|
| **Incident ID** | EXP-001 |
| **Scenario** | Users cannot export proposals or estimates as XLSX files. The export endpoint returns errors, generates corrupt files, or times out. |
| **Symptoms** | Export button spins indefinitely or returns 500; downloaded XLSX file is 0 bytes or corrupted; "file format invalid" error when opening; export logs show unhandled exceptions; specific estimate data causes export to fail (edge case). |
| **Severity** | High |
| **Owner** | OWNER_NAME_PLACEHOLDER (until delegated) |
| **First Response** | 1. Reproduce with the user's specific estimate/proposal. 2. Check server logs for export endpoint errors. 3. Determine if this is a data-specific issue (e.g., unusual characters, large data, special formatting) or a systemic outage. 4. Respond within 2 hours. |
| **Containment Steps** | If systemic: disable export temporarily, display "Export temporarily unavailable" message. If data-specific: identify the problematic field/value and apply sanitization. Offer PDF export as fallback if available. If file corruption: fix the generation logic and re-export. |
| **Customer Message Template** | "We're investigating an issue with proposal exports. Our team is working on a fix. In the meantime, you can [view online / use PDF export / copy data manually]. We'll notify you when XLSX export is restored." |
| **Recovery Steps** | 1. Apply fix (data sanitization, library update, timeout increase). 2. Test export with: small estimate, large estimate, edge-case data. 3. Verify downloaded file opens correctly in Excel, Google Sheets, and Numbers. 4. Re-enable export. |
| **Evidence to Preserve** | Failing export payload; server error logs; the specific estimate data that triggered the failure; fix details. |
| **Post-Incident Action** | Add export smoke test to CI. Add export size/timeout monitoring. Implement progressive export (stream large files). Add "export status" endpoint for async exports. |

---

### STO-001: Storage/Object Access Failure — Images/Attachments Unavailable

| Field | Detail |
|---|---|
| **Incident ID** | STO-001 |
| **Scenario** | Images, attachments, or uploaded files in Supabase Storage are not loading. Users see broken images or download failures. |
| **Symptoms** | Broken image thumbnails in UI; storage download URLs return 404 or 403; Supabase Storage API errors; newly uploaded files also fail; specific bucket or all buckets affected. |
| **Severity** | High |
| **Owner** | OWNER_NAME_PLACEHOLDER (until delegated) |
| **First Response** | 1. Check Supabase Storage status in Dashboard. 2. Verify bucket exists and is public (if intended). 3. Test a known-good file URL directly. 4. Check storage RLS policies. 5. Check if storage quota is exceeded. 6. Post within 30 minutes. |
| **Containment Steps** | If RLS misconfiguration: fix storage policies (ensure `SELECT` is allowed for authenticated or public as intended). If quota exceeded: upgrade plan or clean up unused files. If bucket deleted: restore from backup; prevent bucket deletion without confirmation. If provider outage: display graceful fallback placeholders. |
| **Customer Message Template** | "We're experiencing an issue with image and file loading. Our team is working to restore access. Your files are safe, and we expect resolution shortly." |
| **Recovery Steps** | 1. Apply fix (policy, quota, or wait for provider). 2. Verify images load across all affected views. 3. Test upload and download for all buckets. 4. Post resolution. |
| **Evidence to Preserve** | Storage error logs; bucket configuration at time of incident; RLS policy definitions; any deleted-file records. |
| **Post-Incident Action** | Add storage health-check monitor. Add bucket-level backup automation. Add storage quota alerts. Review storage RLS policies for least-privilege. |

---

### DB-001: Data Corruption — Suspected Data Integrity Issue

| Field | Detail |
|---|---|
| **Incident ID** | DB-001 |
| **Scenario** | Data appears inconsistent, missing, duplicate, or otherwise corrupted. This may be reported by a user or detected by automated integrity checks. |
| **Symptoms** | User reports data that doesn't match what they entered; duplicate records; foreign key violations in logs; estimates with missing line items; sums that don't add up; orphaned records; application errors on specific data reads. |
| **Severity** | Critical |
| **Owner** | OWNER_NAME_PLACEHOLDER (until delegated) |
| **First Response** | 1. **IMMEDIATE: Pause writes to affected tables if corruption is spreading.** 2. Take a database snapshot for forensic analysis. 3. Identify scope: which tables, which rows, which users/workspaces. 4. Determine if corruption is ongoing or a one-time event. 5. Check for recent migrations or deploys that could have caused it. 6. Declare within 15 minutes of confirmation. |
| **Containment Steps** | 1. Stop the corrupting process (disable feature flag, roll back migration, kill problematic job). 2. Quarantine corrupted records (mark with `corruption_flag` or move to audit table). 3. Identify all affected users. 4. Determine if point-in-time recovery is needed. |
| **Customer Message Template** | "We've identified a data integrity issue affecting [scope: specific feature / your workspace]. We've paused writes to prevent further impact and are working on restoration. Your data is backed up, and we'll restore affected records. We'll provide an update within [timeframe]." |
| **Recovery Steps** | 1. Fix root cause (code bug, migration, race condition). 2. Restore corrupted data from backups or reconstruct from audit logs. 3. Verify data integrity across all affected tables. 4. Re-enable writes. 5. Run full integrity check suite. 6. Notify affected users with restoration details. |
| **Evidence to Preserve** | Database snapshot at detection; corrupted vs. correct data examples; root cause analysis; migration history; deployment timeline. |
| **Post-Incident Action** | Add data integrity check queries to monitoring. Add application-level validation before writes. Implement soft-delete instead of hard-delete for critical entities. Schedule periodic integrity audits. Write postmortem. |

---

### DB-002: Failed Migration — Migration Fails on Linked Remote

| Field | Detail |
|---|---|
| **Incident ID** | DB-002 |
| **Scenario** | A Supabase migration (`supabase db push` or `supabase migration up`) fails against the linked remote database, leaving the schema in an inconsistent state. |
| **Symptoms** | Migration CLI returns error; database schema partially applied; application errors due to missing columns/tables; `supabase migration list` shows unapplied migration; local dev works but remote doesn't match. |
| **Severity** | Critical |
| **Owner** | OWNER_NAME_PLACEHOLDER (until delegated) |
| **First Response** | 1. **IMMEDIATE: Check if the application is still running. If migration left schema broken, consider rolling back or applying fix forward.** 2. Capture full migration error output. 3. Check `supabase_migrations.schema_migrations` table on remote to see what was applied. 4. Determine if this is a locking issue, constraint violation, data incompatibility, or syntax error. 5. Declare within 10 minutes if application is affected. |
| **Containment Steps** | If schema is broken: immediately determine whether to (a) complete the migration with a fix, or (b) manually revert the partial changes. Prefer fix-forward unless data loss is imminent. If application is down: enable maintenance mode. If only non-critical paths affected: keep app running, fix migration. |
| **Customer Message Template** | "We're performing urgent database maintenance. Some features may be temporarily unavailable. We expect resolution within [timeframe]. Your data is safe." |
| **Recovery Steps** | 1. Diagnose migration failure (lock timeout, constraint violation, data type mismatch). 2. Write fix-forward migration or manual repair script. 3. Apply and verify. 4. Run application test suite against remote. 5. Confirm all features functional. 6. Disable maintenance mode. 7. Document the failure and fix for future reference. |
| **Evidence to Preserve** | Full migration error output; remote schema state before and after fix; any data that was modified during recovery; migration file that failed. |
| **Post-Incident Action** | Add `supabase db lint` to CI to catch migration issues early. Add migration dry-run step before applying to remote. Require migration review on PRs. Maintain a migration rollback plan for each migration. Test migrations against a staging remote before production. |

---

### DEP-001: Bad Deploy — Production Deploy Causes Errors

| Field | Detail |
|---|---|
| **Incident ID** | DEP-001 |
| **Scenario** | A deployment to production introduces errors: broken pages, API failures, build errors, or runtime exceptions that affect users. |
| **Symptoms** | Spike in error rate after deploy; users report broken features; 500 errors on specific routes; client-side JS errors; build log warnings that were ignored; Vercel deployment shows increased error rate. |
| **Severity** | Critical |
| **Owner** | OWNER_NAME_PLACEHOLDER (until delegated) |
| **First Response** | 1. **IMMEDIATE: Assess whether to roll back (DEP-002) or fix forward.** If >50% of users affected or core feature broken: roll back immediately. 2. Identify the specific deploy (Vercel deployment ID, commit SHA). 3. Check error logs and Vercel analytics. (NOTE: there is **no Sentry/DataDog/error-tracking integration wired** today — `realtime-telemetry.ts` / `express-components-telemetry.ts` are `console.warn` seams marked "swap for Clarity/Sentry later", and `package.json` has no Sentry/DataDog deps. So rely on Vercel logs/analytics + `/api/health`; do not expect a Sentry dashboard until one is added.) 4. Determine scope: specific route, feature, or systemic. 5. Declare within 5 minutes. |
| **Containment Steps** | Option A (preferred for critical): Execute DEP-002 rollback to previous known-good deploy. Option B (for minor issues): Deploy hotfix forward. Enable maintenance mode if fix will take >15 minutes. Communicate status. |
| **Customer Message Template** | "We're aware of an issue introduced in our latest update and have reverted to the previous version. Service is being restored. We apologize for the disruption and will share details after our review." |
| **Recovery Steps** | 1. Roll back to last known-good deploy (DEP-002). 2. Verify core features (sign-in, workspace load, estimate creation, export). 3. Investigate root cause in the bad deploy. 4. Fix in a branch, test thoroughly, and re-deploy with increased monitoring. |
| **Evidence to Preserve** | Bad deploy commit SHA and deployment ID; error logs during impact window; Vercel deployment diff; rollback confirmation; timeline. |
| **Post-Incident Action** | Add deployment smoke tests (automated verification after each deploy). Add canary or staged rollout process. Require pre-deploy checklist. Add automated rollback trigger for error-rate spikes. Write postmortem. |

---

### DEP-002: Emergency Rollback — Need to Revert to Previous Deploy

| Field | Detail |
|---|---|
| **Incident ID** | DEP-002 |
| **Scenario** | A production deployment must be reverted to a previous version due to critical errors, data integrity issues, or security vulnerability. |
| **Symptoms** | Triggered by DEP-001, SEC-001, or DB-001; deliberate decision to roll back; Vercel dashboard shows deployment history; need to restore previous known-good state quickly. |
| **Severity** | Critical |
| **Owner** | OWNER_NAME_PLACEHOLDER (until delegated) |
| **First Response** | 1. **IMMEDIATE: Identify the last known-good deployment.** In Vercel: Project > Deployments, find the deployment before the bad one. Note the deployment URL and timestamp. 2. Determine if database migrations were part of the bad deploy (critical: rollback does NOT revert database). 3. Assess data integrity risk of rolling back application while database has new schema. 4. Initiate rollback within 5 minutes of decision. |
| **Containment Steps** | 1. Execute rollback: Vercel Dashboard > Deployments > [previous deployment] > "Promote to Production" (or use `vercel rollback`). 2. If database migrations ran in the bad deploy AND are incompatible with the rolled-back application: manually revert migrations OR deploy a compatibility shim. 3. Verify application loads and core features work. 4. If data was written in the bad deploy that the rolled-back application can't read: quarantine those records. |
| **Customer Message Template** | "We've reverted a recent update that caused unexpected issues. The application is now running on the previous stable version. All your data is intact. We're reviewing our deployment process to prevent this from happening again." |
| **Recovery Steps** | 1. Promote previous deployment to production. 2. Verify: sign-in, workspace load, project access, estimate CRUD, export. 3. Handle database migration compatibility (revert or shim). 4. Confirm error rates return to baseline. 5. Post resolution. 6. Keep bad deploy available for forensic review (do not delete). |
| **Evidence to Preserve** | Bad deploy details (SHA, deployment ID, timestamp); rollback deployment details; any manual database fixes applied; error logs from bad deploy window; decision timeline. |
| **Post-Incident Action** | Practice rollback drill monthly. Document rollback procedure with exact CLI/UI steps. Add database migration compatibility check to deploy process. Add "rollback plan" section to every deployment runbook. |

---

### SUP-001: User Support Escalation — User Reports Critical Issue

| Field | Detail |
|---|---|
| **Incident ID** | SUP-001 |
| **Scenario** | A user reports a critical issue via support channels that doesn't clearly map to an existing runbook. This is a catch-all escalation path requiring triage and possible runbook activation. |
| **Symptoms** | User reports data loss, inability to work, billing issue, or security concern; support agent can't resolve with standard procedures; issue may be a new incident class not yet covered by runbooks. |
| **Severity** | Variable (triage to determine) |
| **Owner** | OWNER_NAME_PLACEHOLDER (until delegated) |
| **First Response** | 1. Acknowledge to user within 1 hour (critical) or 4 hours (standard). 2. Gather: user identity, workspace, affected feature, steps to reproduce, screenshots, error messages, impact scope (just you or others?). 3. Attempt reproduction in staging with user's data context. 4. Triage severity: Critical (data loss, security, all users blocked), High (core feature blocked for user), Medium (workaround available), Low (cosmetic). 5. Determine if existing runbook applies; if not, follow ad-hoc incident procedure. |
| **Containment Steps** | If existing runbook matches: activate that runbook. If new incident class: contain by isolating affected user/workspace (disable feature flag for them, move to read-only mode for their workspace). Document steps as you go (this becomes a new runbook template). |
| **Customer Message Template** | "Thank you for reporting this. We're investigating and will update you within [timeframe based on severity]. In the meantime, [workaround if available]. Your case reference is SUP-[ID]." |
| **Recovery Steps** | 1. Triage and identify root cause. 2. Apply fix or activate appropriate runbook. 3. Verify fix with user. 4. Confirm no other users affected. 5. Close loop with user. |
| **Evidence to Preserve** | Full support thread; reproduction steps and results; any code or data changes made; resolution details. |
| **Post-Incident Action** | If this revealed a new incident class: draft a new runbook and add it to this document. Review support escalation path for gaps. Train team on new incident type. |

---

## Drill & Automation Requirements

### Runbooks Requiring Drill Before Beta

These four runbooks cover the highest-risk scenarios. Each must be drilled (tabletop or live in staging) before any external beta users are onboarded:

1. **AUTH-001 (Auth Failure)** — Simulate Google OAuth outage; practice fallback to email sign-in.
2. **SEC-001 (Service-Role Leak)** — Simulate key exposure; practice rotation and redeployment.
3. **SEC-003 (Cross-Workspace Data Access)** — Simulate RLS policy gap; practice detection, containment, and audit.
4. **DEP-002 (Emergency Rollback)** — Simulate bad deploy; practice Vercel rollback and database migration compatibility check.

### Runbooks Requiring Automation

These runbooks have steps that should be automated (scripts, webhooks, monitors) to reduce response time:

| Runbook | Automation Target |
|---|---|
| AUTH-001 | Synthetic sign-in monitor (every 5 minutes, alerts on failure) |
| SEC-001 | GitHub secret scanning + pre-commit hook + Vercel env var audit |
| DEP-002 | One-click rollback script; error-rate-based auto-rollback trigger |
| EXP-001 | Export smoke test in post-deploy verification |
| DB-002 | Migration dry-run in CI + pre-push validation hook |

### Drill Evidence Format

When a drill is performed, document it in `/.ai/postmortems/drills/` with:

- Drilled runbook ID and date
- Participants
- Scenario injected (what was simulated)
- Time to detection, time to containment, time to resolution
- What worked, what broke, what procedure needs revision
- Updated runbook (if procedure changed based on drill results)

---

> **Planning Note:** These are planning templates. No drills have been performed. Before beta, critical-path runbooks (AUTH-001, SEC-001, SEC-003, DEP-002) must be drilled. Before production, all runbooks must have named owners and drill evidence. Automation targets should be implemented alongside the corresponding monitoring infrastructure.
