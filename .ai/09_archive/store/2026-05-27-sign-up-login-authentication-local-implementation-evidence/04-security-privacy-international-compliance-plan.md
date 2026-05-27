# 04 - Security, Privacy, And International Compliance Plan

**Date:** 2026-05-27
**Scope:** auth security controls, privacy/data protection obligations, international readiness
**Mode:** planning only
**Second-pass note:** this first-pass companion doc is supplemental only. Planned `auth_events` naming here is superseded by `account_security_events`, and launch gates are now stricter in `08-testing-validation-and-release-gates.md` plus `11-second-pass-adversarial-review-and-blast-radius.md`.

## Legal Caveat

This is an engineering readiness plan, not legal advice. Before production launch, a qualified privacy/legal reviewer should approve the privacy notice, terms, cookie notice, subprocessors list, DPA posture, retention schedule, and jurisdiction-specific commitments.

## Security Objectives

The auth system must:

- Authenticate users without storing or handling passwords.
- Prevent open redirects and callback abuse.
- Prevent account enumeration in UI copy.
- Keep session cookies server-managed.
- Keep service-role keys server-only.
- Preserve workspace/project/sheet authorization through RLS and server-side checks.
- Record security-relevant auth events without storing secrets or raw tokens.
- Support stronger corporate controls later without a provider rewrite.

## Threat Model

### Account Takeover

Risks:

- Stolen Google account.
- Compromised email inbox.
- Reused magic link.
- Session theft.

Controls:

- Short-lived OTP/magic links.
- One-time callback code exchange.
- Refresh token rotation.
- HTTPS-only production.
- Device/session revocation later.
- MFA for owners/admins in a later hardening phase.
- Generic link failure copy and safe resend flow.

### Open Redirects

Risks:

- Attacker injects external `next` target.
- OAuth callback redirects to malicious URL.

Controls:

- Continue sanitizing `next` as path-only.
- Reject `//` and full URLs.
- Keep exact Supabase redirect allow list.
- Separate local, preview, and production callback URLs.
- Add tests for encoded external redirects.

### Tenant Leakage

Risks:

- Authenticated user sees another workspace's projects or estimates.
- Collaboration invite grants wrong scope.
- Admin client reads/writes without app-side role validation.

Controls:

- RLS on every tenant table.
- Workspace/project/sheet role validation in server actions.
- Metadata-only auth events.
- Service-role operations isolated to narrow server actions.
- Tests for invited viewer/editor/admin boundaries.

### Privilege Escalation

Risks:

- Editor grants themselves admin.
- Last owner/admin removed.
- Invite creates stronger role than inviter.

Controls:

- Preserve role-rank checks from collaboration actions.
- Add auth-policy tests for owner/admin-only settings.
- Require another owner/admin before demotion/removal.
- Never trust role values from client-only state.

### Abuse And Delivery Attacks

Risks:

- OTP spam.
- Email bombing.
- Credential stuffing equivalent through repeated provider attempts.
- Bot sign-ups.

Controls:

- Supabase auth rate limits.
- Resend timers in UI.
- Generic sent state.
- CAPTCHA/Turnstile only after abuse signals, not on first launch unless needed.
- Auth event log and alerts for repeated failures.

## Auth Data Inventory

### Data Collected

- Email address.
- Supabase auth user id.
- Google provider id and provider metadata stored by Supabase Auth.
- Display name from Google or user input.
- Avatar URL from Google, if available.
- Workspace membership and role.
- Project/sheet collaboration roles and invitations.
- Session cookies and refresh tokens managed by Supabase.
- Security metadata in planned `auth_events`: event type, hashed email/IP/user agent, provider, result, timestamps.

### Data Not Collected In V1

- Passwords.
- Phone numbers.
- Government IDs.
- Date of birth.
- Payment card details.
- Biometric data.
- Special category data.
- Precise geolocation.

### Data Minimization Rules

- Store raw email only where needed for login, profile, and pending invitations.
- Hash email/IP/user-agent in auth event logs where raw values are not needed.
- Do not store magic links, OTP codes, OAuth codes, access tokens, refresh tokens, or provider secrets.
- Keep Google scopes to `openid`, `email`, and `profile`.
- Do not add analytics identifiers before consent and analytics policy are ready.

## GDPR / UK GDPR Readiness

Engineering requirements:

- Identify lawful basis per processing purpose.
- Provide clear privacy information before sign-up.
- Minimize data collected during auth.
- Implement privacy by design/default.
- Keep processor/subprocessor records.
- Support access, correction, deletion, portability, restriction, and objection workflows where applicable.
- Maintain security controls proportionate to account data and project data.

Recommended lawful-basis mapping:

| Processing purpose | Data | Likely lawful basis | Product control |
| --- | --- | --- | --- |
| Create and operate account | email, user id, profile, workspace membership | contract | Terms/privacy acknowledgment in auth UI |
| Secure account and prevent abuse | auth event metadata, IP/user-agent hashes, failure events | legitimate interests | Security notice and retention limit |
| Send magic links and invites | email, invite metadata | contract or legitimate interests depending context | Generic sent copy, unsubscribe not required for transactional auth |
| Optional marketing emails | email, name | consent | Separate unchecked opt-in |
| Product analytics | cookie/device identifiers, event data | consent or legitimate interests depending tool/jurisdiction | Disable until policy and consent path are approved |

Data protection by design/default:

- Default to only essential auth cookies.
- Default to no marketing consent.
- Default to no broad profile collection.
- Default to no global public user visibility.
- Default to workspace isolation and RLS.

International transfers:

- Confirm Supabase project region and vendor DPA.
- Confirm Vercel deployment/data processing terms.
- Confirm Google OAuth as identity provider and its data role.
- Use SCCs/approved transfer mechanism where EU/UK personal data leaves the EEA/UK.
- Keep a transfer impact assessment record when required.

## ePrivacy / PECR / Cookie Rules

Essential auth/session cookies:

- Required for account login and protected route access.
- Disclose in Cookie Notice.
- Do not require a banner if only strictly necessary cookies are used.

Non-essential storage:

- Analytics cookies.
- Marketing pixels.
- Behavioral replay.
- Advertising identifiers.

Rules:

- Do not add non-essential cookies or scripts until consent management exists.
- Consent must be separate from account creation and easy to withdraw.
- "Reject all" must be as easy as "Accept all" for non-essential cookies in jurisdictions that require it.

## CCPA / CPRA Readiness

Engineering requirements for California users if threshold/applicability is met:

- Privacy notice at collection.
- Rights request intake for access, deletion, correction, and opt-out where applicable.
- Sensitive personal information minimization.
- Do not sell/share personal information unless the business explicitly implements that model and the required opt-out.
- Avoid dark patterns in privacy choices.

Current product position:

- No sale/share of auth personal information.
- No advertising cookies in auth v1.
- No sensitive personal information collected in auth v1.
- Need privacy request workflow before broad public launch.

## Philippines Data Privacy Act Readiness

Archestimator's product context and timezone/currency posture make Philippines readiness important.

Engineering requirements:

- Follow transparency, legitimate purpose, and proportionality.
- Provide a privacy notice.
- Collect only auth/profile data needed for account operation.
- Define personal information controller/processor roles.
- Secure personal data through access controls, RLS, and server-only secrets.
- Provide rights handling for access, correction, erasure/blocking, and complaints where applicable.
- Keep breach response and incident escalation procedures.

## Canada PIPEDA Readiness

Engineering requirements:

- Accountability for personal information under organizational control.
- Identify purposes.
- Obtain meaningful consent where required.
- Limit collection/use/disclosure/retention.
- Keep safeguards appropriate to sensitivity.
- Support access and correction.

Current product position:

- Auth v1 uses minimal profile information.
- Marketing and analytics consent should be separate.
- Security/audit retention must be documented.

## Brazil LGPD Readiness

Engineering requirements:

- Define processing purposes and legal bases.
- Support data subject rights.
- Minimize collected data.
- Maintain security and incident-response controls.
- Maintain processor/subprocessor records.

Current product position:

- No Brazil-specific launch claim yet.
- Avoid collecting unnecessary personal data so later LGPD support stays feasible.

## Security Standards Alignment

Use these as engineering references, not as launch certifications:

- OWASP ASVS areas:
  - V2 Authentication
  - V3 Session Management
  - V4 Access Control
  - V7 Error Handling and Logging
  - V14 Configuration
- NIST Digital Identity:
  - Use authenticator assurance concepts to decide when MFA is needed.
  - Treat Google/email-link auth as adequate for lean v1, but require stronger factors for corporate admins when enterprise commitments begin.

## Required Policies And Public Docs Before Launch

- Privacy Policy / Privacy Notice.
- Terms of Service.
- Cookie Notice.
- Support/security contact.
- Subprocessors list.
- Data retention schedule.
- DPA availability statement for business customers.
- Breach/incident response runbook.

## Retention Plan

Recommended starting values:

| Data | Retention |
| --- | --- |
| Active profile | account lifetime |
| Workspace/project memberships | account/workspace lifetime |
| Pending invitation | expires after 14 days; purge or anonymize after 90 days if not needed |
| Auth security events | 180 days for startup v1; revisit for enterprise/audit needs |
| Raw support auth diagnostics | 30 days unless attached to active incident |
| Deleted user profile | delete or anonymize after ownership transfer and legal retention checks |

## Data Subject Request Plan

Minimum workflow before production:

1. Verify requester identity through active session or secure support process.
2. Export profile, workspace memberships, invitations, and auth event summaries.
3. Correct profile display name/avatar/email where provider and policy allow.
4. Delete account only after:
   - transferring owned workspaces/projects or confirming workspace deletion;
   - revoking sessions;
   - removing pending invitations;
   - preserving legally required audit records in minimized/anonymized form.
5. Record request status in `user_account_closures` or equivalent.

## Production Launch Security Checklist

- HTTPS production domain.
- Supabase redirect allow list locked to approved URLs.
- Google OAuth consent screen verified/approved where needed.
- Custom sender domain with SPF/DKIM/DMARC.
- Generic auth error UI.
- Auth event logging in place.
- Tests for open redirects and callback failure.
- RLS tests for workspace/project/sheet access.
- Service-role key present only server-side.
- Dev auth bypass disabled in production.
- Optional analytics disabled until consent path exists.
