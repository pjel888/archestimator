# Auth Provider And Enterprise Strategy

**Status:** planning only
**Recommendation:** Supabase-first, provider-ready, enterprise-aware

## Decision

Use Supabase Auth for the first production authentication slice.

This is a strategic fit because Archestimator already has:

- Supabase Auth in app code;
- Supabase SSR session clients;
- Supabase RLS as the data-access boundary;
- profile and workspace tables tied to `auth.users`;
- project and estimate-sheet collaboration;
- Supabase Auth admin invitations for collaborators.

The risk of switching providers now is higher than the benefit. The right startup move is to harden the existing auth path and keep the architecture honest about future enterprise needs.

## Provider Matrix

| Provider | Fit Now | Strengths | Weaknesses / Triggers |
| --- | --- | --- | --- |
| Supabase Auth | Recommended | Already integrated; RLS-native; Google OAuth; email OTP/magic links; auth admin invitations; future SAML SSO/MFA/session-control paths; low vendor count | Hosted dashboard settings must be verified; no-password enforcement may need provider-level confirmation; SCIM/directory sync is not a native planning assumption; enterprise SSO maturity may not satisfy every procurement team |
| Clerk | Watchlist | Strong hosted auth UX; Vercel Marketplace; quick polished sign-in/up; organizations support | Adds identity vendor beside Supabase; requires user-id mapping; RLS must trust external identity tokens or mirror users; migration cost before need is proven |
| Auth0 | Future enterprise fallback | Mature enterprise identity, SAML/OIDC, orgs, MFA, compliance procurement familiarity | More setup, cost, vendor surface, and migration work; overkill for current startup MVP |
| WorkOS | Future enterprise fallback | Strong B2B SSO/directory sync/domain verification | Usually best when enterprise SSO is the core blocker; not needed before actual corporate customer demand |
| Descope | Future evaluation | Passwordless flow builder, bot/fraud features | Another identity system; less aligned with current Supabase/RLS model than keeping Supabase first |

## Provider Capability And Trigger Matrix

| Provider | Keep/Evaluate When | Migration Trigger |
| --- | --- | --- |
| Supabase Auth | Default for MVP and startup production. | Keep while Google/email, RLS, invitations, audit logs, and future SAML/MFA/session controls satisfy customers. |
| Clerk | Evaluate for hosted auth/org UX. | Need fastest polished auth UI, organizations, verified domains, and Vercel Marketplace provisioning more than Supabase continuity. |
| Auth0 | Evaluate for mature enterprise IAM. | Customer procurement requires mature SAML/OIDC enterprise connections, advanced policies, extensive IAM controls, or familiar vendor review. |
| WorkOS | Evaluate as B2B enterprise layer. | SCIM/directory sync, IdP self-service setup, Admin Portal, or domain verification becomes a paid customer blocker. |
| Descope | Evaluate for advanced passwordless journeys. | Product needs tenant-specific passwordless flows, fraud controls, SSO/SCIM, or custom auth orchestration beyond Supabase. |

Migration triggers that should reopen provider strategy:

- SCIM or directory sync is required.
- Customer requires self-service IdP setup.
- Enterprise OIDC connection management is required beyond Supabase's current practical fit.
- Supabase passwordless-only enforcement cannot be proven and app-level no-password residual risk is unacceptable.
- Domain discovery, verified-domain routing, or auto-join policies become too complex for app-owned tables.
- Procurement requires controls, reports, or vendor posture that Supabase Auth cannot meet cleanly.

## Lean Startup Auth Positioning

The product should offer:

- `Continue with Google`
- `Send sign-in link`
- no password management;
- no reset flow;
- no user-facing auth complexity;
- one default workspace after sign-up;
- project/team invites when collaboration is needed.

This is enough for early contractors, design-build firms, and small teams.

## Enterprise-Ready Architecture Without Enterprise Drag

Design now for future controls, but do not ship heavy features until there is demand.

### Phase 1: Startup Production

- Google OAuth.
- Email magic link / OTP fallback.
- Public privacy/terms links.
- Workspace bootstrap.
- Project/sheet invitations.
- Role-based access through current workspace/project/sheet model.
- Auth audit/security events.

### Phase 2: Business Team Controls

- Workspace owner/admin account settings.
- Workspace display name and company metadata.
- Seat/member listing.
- Invite resend/revoke.
- Last-owner guard.
- Account deactivation.
- Workspace ownership transfer.
- Domain capture warning: `example.com is not verified yet`.

### Phase 3: Corporate Domain Readiness

- `workspace_domains` table.
- Domain verification by DNS TXT or email-admin approval.
- Optional domain auto-join policy:
  - disabled;
  - request-to-join;
  - auto-join as viewer/member.
- Domain conflict handling.
- Verified domain badge inside admin UI only.

### Phase 4: Enterprise Identity

- SAML SSO and, only if provider fit is confirmed, enterprise OIDC connection support.
- Enforced SSO for verified domains.
- MFA policy.
- Session duration policy.
- Directory sync / SCIM if provider supports it.
- Audit log export.
- DPA/subprocessor procurement packet.

## Workspace Is The Organization Boundary

Do not add a parallel `organizations` abstraction in the first auth implementation.

Use current concepts:

- `workspaces` = account/company/team boundary;
- `workspace_members` = workspace role;
- `projects` = project data boundary;
- `project_members` = project collaboration overlay;
- `estimate_sheet_members` = sheet-specific collaboration overlay;
- `profiles` = user identity/profile mirror;
- future `workspace_domains` = corporate domain ownership linked to workspace.

This keeps corporate readiness aligned with Teamspaces instead of creating a second permission model.

Multi-workspace rule:

- one user can belong to multiple workspaces;
- `default_workspace_id` is a preference/default, not proof of ownership;
- a future SSO/domain policy chooses a workspace context for that session/action, not a global identity role;
- account switching must exist before verified-domain or SSO routing can be trusted at scale.

## Google OAuth Requirements

For production:

- Create a Google Cloud project for Archestimator.
- Configure OAuth consent screen branding.
- Add privacy policy and terms URLs.
- Request only minimum scopes:
  - `openid`
  - email
  - profile
- Avoid sensitive/restricted scopes.
- Add authorized JavaScript origins:
  - production domain;
  - Vercel preview domain policy if used;
  - localhost only in development client.
- Add Supabase provider callback URL to Google authorized redirect URIs.
- Configure Google provider in Supabase hosted dashboard.
- Use a custom domain for Supabase Auth if phishing/trust risk becomes material.

## Email Magic Link Requirements

- Use branded email templates.
- Use production SMTP/custom sender before public launch.
- Link expires in a short, clear window.
- Email copy should say:
  - what requested the sign-in;
  - link expiration;
  - ignore if not requested;
  - support path.
- Do not include project/client/estimate sensitive details in auth emails.

## No-Password Policy

The MVP must not include:

- password input;
- password sign-up action;
- password sign-in action;
- password reset route;
- password strength UI;
- password storage managed by Archestimator.

Required implementation due diligence:

1. Verify whether hosted Supabase can enforce passwordless-only email identities while preserving magic links/OTP.
2. If yes, configure it and document the dashboard setting.
3. If no, document residual risk:
   - app does not expose password flows;
   - no app-owned password endpoints exist;
   - RLS still enforces access;
   - provider API may still accept password-based auth if public Auth API permits it.
4. If that residual risk is unacceptable for launch, evaluate Clerk/Auth0/WorkOS/Descope before implementation.

## Enterprise SSO Runway

Do not build SSO in the MVP. Prepare for it by:

- making workspace membership independent from provider identity metadata;
- avoiding hardcoded provider-specific assumptions in app authorization;
- recording `auth_provider` and `provider_subject` in audit events when available;
- reserving domain verification tables;
- keeping role checks in database/app helpers, not in Google profile metadata;
- not using email domain alone as proof of corporate ownership.

### Future SSO Discovery Contract

The later enterprise flow should be:

1. User enters work email.
2. App normalizes domain and checks `workspace_domains` only for verified domains.
3. If one workspace requires SSO for that domain, route to the configured SSO provider.
4. If several workspaces claim related domains, show a safe workspace chooser only after auth or require invite/request-access.
5. If no verified domain policy exists, allow Google/email fallback unless invite-only mode is enabled.

Do not use email domain alone to auto-join or prove corporate ownership.

### Verified Domain Conflict Model

Before domain verification ships, define handling for:

- two workspaces claiming the same domain;
- parent/subsidiary domains;
- consultants using client domains;
- franchises and acquired companies;
- multiple workspaces under one corporate tenant;
- domain revocation when DNS proof is removed.

Default policy: no auto-join until the domain is verified and an owner explicitly chooses the policy.

## Enterprise Admin Controls Backlog

Not MVP, but required before serious corporate rollout:

- revoke sessions;
- sign out all devices;
- require reauth for ownership transfer, domain policy, provider changes, and deletion/export;
- require MFA for platform/operator accounts and later workspace admins;
- transfer ownership with last-owner guard;
- deactivate users without breaking historical attribution;
- export audit log;
- view SSO/domain status;
- rotate SCIM tokens if an external provider is adopted.

## Procurement Packet Checklist

Do not make enterprise claims until these artifacts exist:

- Privacy Notice;
- Terms of Service;
- subprocessor list;
- DPA position;
- security overview;
- incident response statement;
- data retention/deletion policy;
- backup/restore statement;
- data residency statement;
- support/security contact path;
- explicit no-claim posture for SOC 2, ISO, HIPAA, or similar until independently true.

## Provider Migration Principles

If Archestimator later migrates away from Supabase Auth:

- keep `profiles.id` / `auth.users.id` mapping strategy explicit;
- preserve workspace/project/sheet memberships;
- migrate sessions with forced re-login if needed;
- do not preserve or migrate passwords because there should be none;
- run tenant-leakage tests before enabling the new provider;
- keep a rollback window where old auth can be restored or users can re-login safely.

## Recommendation Summary

Proceed with Supabase Auth now, but write the implementation so Auth0/WorkOS/Clerk can be evaluated later without rewriting the workspace, project, estimate, or RLS model.
