# 05 - Corporate Accounts And Enterprise Readiness Plan

**Date:** 2026-05-27
**Scope:** corporate account model, organizations, domain verification, SSO, MFA, admin readiness
**Mode:** planning only

## Enterprise Principle

Do not build enterprise bulk before a customer needs it. Build v1 so corporate needs can be added without rewriting user identity, tenant isolation, roles, or audit history.

The immediate goal is not full enterprise SSO. The immediate goal is a self-serve account model that can graduate into corporate accounts.

## Current Account Foundation

Archestimator already has:

- `workspaces` as tenant/account boundary.
- `workspace_members` with owner/admin/member/viewer roles.
- `profiles` tied to Supabase auth users.
- Project-level collaboration via `project_members`.
- Estimate-sheet-level collaboration via `estimate_sheet_members`.
- Pending collaboration invitations.
- RLS on tenant-scoped data.

This is a strong base for corporate accounts.

## Corporate Account Model

Use `workspaces` as the corporate account root for now. Avoid adding a second `organizations` table unless billing/legal/account hierarchy later requires it.

Definitions:

- **User:** a Supabase auth user with a `profiles` row.
- **Workspace/account:** the company or solo contractor account boundary.
- **Workspace member:** a user with workspace-wide access.
- **Project collaborator:** a user with project-specific access.
- **Sheet collaborator:** a user with estimate-sheet-specific access.
- **Account owner/admin:** user who can manage members, domains, security policy, and SSO when enabled.

## Corporate Readiness Features

### 1. Verified Domains

Purpose:

- Let a corporate account claim `example.com`.
- Enable domain-based policy later.

Policy options:

- No autojoin by default.
- Invite-only for verified domains.
- Allow request-to-join later.
- Require Google account email domain match for domain-managed workspaces.

Implementation readiness:

- `workspace_verified_domains` table.
- DNS TXT verification token.
- Owner/admin-only domain management.
- No plaintext verification token after creation.

### 2. Invite-Only Workspace Policy

Purpose:

- Corporate accounts can block arbitrary self-join by domain.

Policy:

- `workspace_auth_policies.invite_required = true`.
- Existing invitations remain the main invitation path.
- New self-serve users without an invite create or join only their own workspace unless a verified-domain policy says otherwise.

### 3. MFA For Privileged Roles

Purpose:

- Reduce takeover risk for owners/admins.

Policy:

- Startup v1: no forced MFA at first sign-up.
- Hardening phase: require TOTP MFA for workspace owners/admins and project/sheet admins if the workspace policy enables it.
- Later enterprise: require MFA for SSO fallback accounts.

Supabase Auth supports MFA APIs. Keep the UI deferred until basic auth is stable.

### 4. SAML SSO

Purpose:

- Serve enterprise customers that require Okta, Microsoft Entra, Google Workspace, PingIdentity, OneLogin, Auth0, or another SAML 2.0 IdP.

Recommendation:

- Do not implement SAML SSO in v1.
- Prepare route and data shape so SSO can be enabled without changing tenant boundaries.
- Evaluate Supabase SAML SSO first because it preserves `auth.uid()` and RLS.
- Re-evaluate Auth0/WorkOS/Clerk only when Supabase SSO plan/features do not satisfy the customer.

Future user flow:

1. User enters work email.
2. App detects verified domain with SSO required.
3. App starts SSO with `signInWithSSO({ domain })` or provider-specific equivalent.
4. Supabase returns session.
5. App applies workspace policy and redirects.

### 5. Account Admin Security Page

Deferred route:

- `/workshop/account/security` or `/account/security`

Controls:

- Allowed sign-in methods.
- Invite-only toggle.
- Verified domains.
- MFA requirement.
- SSO status.
- Session revoke.
- Audit export.
- Legal/DPA information.

### 6. Enterprise Audit Export

Purpose:

- Let corporate admins see security-relevant events without exposing raw secrets.

Event types:

- `auth.email_link_requested`
- `auth.google_started`
- `auth.callback_success`
- `auth.callback_failed`
- `auth.sign_out`
- `auth.invite_sent`
- `auth.invite_accepted`
- `auth.role_changed`
- `auth.policy_changed`
- `auth.domain_verified`
- `auth.mfa_enrolled`
- `auth.sso_started`
- `auth.sso_success`

No event may store OTPs, tokens, full magic links, or OAuth codes.

## Enterprise Provider Strategy

### Current

Supabase Auth with Google OAuth and email magic link.

### First Corporate Upgrade

Supabase Auth:

- TOTP MFA.
- SAML SSO on the appropriate Supabase plan.
- Custom SMTP/domain.
- Auth hooks if needed for claims/policies.

### Re-Evaluate Vendor When

- Customer requires SCIM provisioning.
- Customer requires advanced IdP policy mapping not supported by Supabase.
- Customer requires contractual enterprise auth features that Supabase cannot provide.
- Multi-region auth/data residency requirements exceed current stack.

Potential later vendors:

- Auth0: mature SSO, enterprise identity, organizations.
- WorkOS: enterprise SSO/SCIM developer platform.
- Clerk: Vercel-native fast setup and UI, with future enterprise capabilities depending on product fit.
- Descope: visual flows and passwordless enterprise auth.

## Role Model Readiness

Keep roles explicit and ranked.

Workspace roles:

- owner
- admin
- member
- viewer

Project/sheet collaboration roles:

- owner
- admin
- editor
- viewer

Rules:

- Owner/admin manage access.
- Editor can mutate project/estimate data where authorized.
- Viewer can read only.
- No one can assign a role above their own rank.
- The last owner/admin cannot remove/demote themselves unless another manager remains.

## Corporate Data Boundaries

Hard boundaries:

- Workspace RLS.
- Project/sheet member RLS.
- Server-side role checks for all privileged actions.
- No cross-workspace search.
- No global contact directory in v1.
- No autojoining verified domains until policy is explicitly configured.

Soft boundaries:

- UI only shows account settings to owners/admins.
- Product copy should explain that project/sheet access can be narrower than workspace access.

## Legal / Procurement Readiness

Enterprise customers will likely ask for:

- DPA.
- Subprocessors list.
- Security overview.
- Incident response commitments.
- Data retention and deletion policy.
- SSO/MFA availability.
- Audit logs.
- Data residency statement.
- Backup/restore statement.
- SOC 2 or ISO 27001 roadmap.

Startup-lean approach:

- Prepare factual docs first.
- Do not claim certifications until achieved.
- Use vendor security pages and DPAs where appropriate.
- Keep Archestimator controls honest: RLS, server-side authorization, auth logs, least data collection, and no password handling.

## Non-Goals For Current Implementation

- SCIM provisioning.
- Just-in-time SAML account provisioning.
- Enterprise IdP metadata UI.
- Multiple workspaces per verified domain with routing rules.
- Account merger/split tooling.
- Advanced conditional access.
- Device posture checks.
- Full SIEM integration.
- SOC 2 certification project.

## Corporate Go/No-Go Gate

Do not sell or advertise enterprise SSO until:

- Supabase SAML or alternate IdP path is tested in staging.
- Workspace domain verification exists.
- Owner/admin MFA exists.
- Auth events are exportable.
- Support can revoke sessions and disable compromised accounts.
- Legal has approved DPA/subprocessor/retention language.
