# Data Model And Account Lifecycle Plan

**Status:** planning only
**Principle:** preserve the current workspace/project/sheet model; add account lifecycle rails around it instead of inventing a second organization system.

## Current Model

### Identity

- `auth.users`
- `public.profiles`

### Workspace

- `public.workspaces`
- `public.workspace_members`

### Collaboration

- `public.project_members`
- `public.estimate_sheet_access_settings`
- `public.estimate_sheet_members`
- `public.collaboration_invitations`

### Product Data

- projects;
- estimates;
- estimate nodes;
- estimate row items;
- component library;
- templates;
- project/sheet favorites;
- AI audit tables.

## Account Lifecycle

### New User Through Google

1. User clicks `Continue with Google`.
2. Supabase OAuth redirects to Google.
3. Google redirects to Supabase callback.
4. App callback exchanges code for session.
5. `handle_new_auth_user()` creates/updates `profiles`.
6. App resolves current user context.
7. App bootstraps default workspace if none exists.
8. Database trigger/app workflow applies pending collaboration invitations for the normalized email if applicable.
9. User lands on requested `next` route or workshop home.

### New User Through Email Link

Same as Google, except:

- auth starts through `signInWithOtp()`;
- email link lands on callback;
- provider is email/otp rather than Google.

Open decision:

- should email-link auth allow automatic sign-up for any email, or should it be invite-only after private beta?

Recommended startup default:

- public self-serve allowed while waitlist/private-beta strategy is unsettled;
- keep an allowlist/domain policy hook ready if abuse or customer segmentation requires it.

### Existing User

1. User signs in with any allowed provider tied to the same verified email/user.
2. Profile is read.
3. Default workspace is resolved.
4. User lands on requested protected route.

### Invited User

1. Manager invites email to project or sheet.
2. Invite persists with role/scope/expiry.
3. Supabase invite email is sent when user does not already exist.
4. User signs in or signs up with the invited email.
5. Current repo trigger path applies pending invite through `handle_new_auth_user()` / `apply_pending_collaboration_invitations()`.
6. Current invite redirect URLs land on project routes; sheet-specific destination support is not proven by the current route builder.

Required behavior:

- authenticated email must match pending invite email;
- expired/revoked invites must not grant access;
- role assignment must be rank-checked;
- applying an invite should be idempotent.
- docs and implementation must distinguish project destination support from future sheet-specific destination support.

## Post-Auth Destination Matrix

| Condition | Destination | Notes |
| --- | --- | --- |
| Existing user with safe `next` | Sanitized `next`. | Reject external, encoded external, CRLF, backslash, and self-callback destinations. |
| Existing user with unsafe/missing `next` | `/workshop`. | Default safe fallback. |
| New self-serve user | `/workshop` after default workspace bootstrap. | Current `ensureDefaultWorkspace()` can create the workspace when protected data loads. |
| New invited user | Invited project route where current invite URL supports it. | Do not promise sheet route until route state exists. |
| Signed-in wrong email for invite | Recovery state. | No grant; switch account or request reissue. |
| Expired/revoked invite | No-access recovery state. | Idempotent denial. |
| Disabled/deactivated account | Account unavailable state. | Sign out/support path. |
| Multi-workspace user | Last/default workspace or explicit switcher later. | Default workspace is not ownership or domain proof. |

## Proposed Additions For Production Hardening

### `account_security_events`

Purpose:

- durable, server-owned auth/security audit log.

Potential columns:

- `id uuid`
- `event_type text`
- `user_id uuid null`
- `workspace_id uuid null`
- `email_hash text null`
- `provider text null`
- `result text`
- `error_code text null`
- `ip_hash text null`
- `user_agent_hash text null`
- `metadata jsonb`
- `created_at timestamptz`

Rules:

- insert server-side only;
- no browser grants;
- no tokens/codes/magic links;
- retention policy required.
- this is the canonical app-owned auth/security event table name for the first slice; avoid parallel `auth_events` naming unless this ADR is changed.

### `legal_acceptance_events`

Purpose:

- durable record of Terms/Privacy acknowledgement and optional marketing consent decisions.

Potential columns:

- `id uuid`
- `user_id uuid`
- `workspace_id uuid null`
- `terms_version text`
- `privacy_version text`
- `marketing_consent_status text null`
- `accepted_at timestamptz`
- `source_route text`
- `ip_hash text null`
- `user_agent_hash text null`
- `created_at timestamptz`

Rules:

- account legal acknowledgement is separate from marketing consent;
- insert server-side only;
- no raw IP/user-agent if hash policy is chosen;
- route copy and stored versions must match the public documents live at launch.

### `workspace_domains`

Purpose:

- future corporate domain verification and policy.

Potential columns:

- `id uuid`
- `workspace_id uuid`
- `domain text`
- `status text` (`pending`, `verified`, `failed`, `revoked`)
- `verification_method text`
- `verification_token_hash text`
- `verified_at timestamptz null`
- `verified_by uuid null`
- `auto_join_policy text` (`disabled`, `request`, `member`, `viewer`)
- `created_at timestamptz`
- `updated_at timestamptz`

MVP status:

- not required for first launch.
- reserve this as Phase 3.

Future domain rules:

- no email-domain-only trust;
- no auto-join until a domain is verified and owner policy is set;
- handle conflicts between workspaces claiming the same domain;
- support dispute/revocation when domain ownership changes.

### `workspace_account_settings`

Purpose:

- keep business/account settings out of `workspaces.metadata`.

Potential columns:

- `workspace_id uuid primary key`
- `company_name text null`
- `country_code text null`
- `timezone text null`
- `auth_policy jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

MVP status:

- required if first-run onboarding collects organization/workspace metadata.
- use this instead of overloading `workspaces.metadata` once organization type, country, default currency, or company size become product inputs.

### `user_onboarding_profiles`

Purpose:

- store first-party user-intake answers that Supabase Auth and Google profile metadata do not provide.
- keep product persona/profession fields separate from authorization roles.

Potential columns:

- `user_id uuid primary key references profiles(id)`
- `display_name_confirmed boolean default false`
- `user_category text`
- `profession_or_role text null`
- `organization_role text null`
- `primary_use text null`
- `experience_level text null`
- `is_student boolean null`
- `school_or_program text null`
- `marketing_consent_status text null`
- `onboarding_completed_at timestamptz null`
- `created_at timestamptz`
- `updated_at timestamptz`

Rules:

- do not store these values in `auth.users` metadata as the canonical product record;
- do not overload `profiles.role`, because that is an app/platform authorization role;
- use enumerated values for analytics where possible;
- allow correction from profile/account settings later;
- marketing consent remains separate from legal acknowledgement.

Recommended MVP required fields:

- display name confirmation;
- user category/profession;
- organization/workspace name;
- organization type;
- country/region.

Recommended optional fields:

- primary use;
- company size;
- default currency;
- student/school detail when `Student` or `Educator` is selected.

Privacy constraints:

- collect only what supports onboarding, support, defaults, segmentation, and product prioritization;
- explain the purpose in the UI;
- include these fields in export/delete/correction workflows;
- do not collect sensitive personal data in auth onboarding.

### Settings Editing Contract

Every onboarding field needs a post-onboarding edit path:

- profile-owned fields are edited by the signed-in user;
- workspace-owned fields are edited by workspace owners/admins;
- collaborators can update their own profile/persona without changing workspace identity;
- changing workspace name, organization type, country/region, default currency, or company size should update `workspace_account_settings`;
- changing user category/profession, primary use, student/school detail, or marketing consent should update `user_onboarding_profiles` or the consent table as appropriate;
- changing display name should update `profiles.display_name` and mark `display_name_confirmed`;
- marketing consent changes must be versioned or timestamped separately from Terms/Privacy acknowledgement.

Settings audit requirements:

- audit workspace identity/default changes;
- audit marketing consent changes;
- do not audit sensitive freeform details unless a field is approved and minimized;
- preserve previous values only when needed for security/legal/accountability, otherwise keep the latest value and event metadata.

Recommended settings route split:

- profile settings: display name, user category/profession, primary use, student/educator detail, marketing consent;
- workspace settings: organization/workspace name, organization type, country/region, default currency, company size;
- future admin/security settings: domains, SSO, MFA policy, ownership transfer, audit export.

## Ownership And Last-Owner Rules

Required:

- every workspace needs at least one owner/admin;
- every project with project-specific managers needs at least one owner/admin path;
- transferring ownership should be explicit and audited;
- deleting/deactivating the last owner should require transfer first;
- platform admin/CEO access must stay exceptional and audited.
- paid/team accounts should not launch without ownership transfer and last-owner guard.

## Multi-Workspace Identity Contract

Required before corporate/domain features:

- a user may belong to many workspaces;
- default workspace is a preference, not proof of ownership;
- invitations can add access to a workspace/project without changing global identity;
- SSO/domain routing should choose workspace context after verified policy, not mutate the user's global role;
- account switcher behavior must be defined before enforced SSO/domain policies.

## Account Deactivation

Recommended model:

- user can be deactivated from workspace/project access without deleting auth user immediately;
- deactivation should remove active memberships or mark them inactive;
- historical rows keep attribution by user id/profile snapshot where needed;
- profile display can become `Former user` after deletion/anonymization.

Avoid:

- hard-deleting a user and breaking project audit trails;
- leaving active invitations/memberships for deactivated accounts.

## Account Deletion

Deletion needs two paths:

### Individual collaborator

- remove/disable memberships;
- revoke pending invites;
- anonymize profile if legally required and no active ownership remains;
- retain security logs under defined retention if justified.

### Workspace owner

- require transfer or delete workspace;
- export data first if requested;
- delete workspace cascades project/estimate/library data only after explicit confirmation;
- backups retention must be disclosed.

Deletion workflow details to design:

- verify requester identity and authority;
- export data first when requested and legally appropriate;
- handle Supabase `auth.users` deletion/anonymization separately from app profile anonymization;
- delete or orphan-check storage objects;
- minimize audit logs without destroying security/legal retention;
- document backup retention and legal-hold exceptions.

## Data Export

Minimum export plan:

- user profile data;
- workspace memberships;
- collaboration invitations;
- owned workspace/project list;
- for workspace owner/admin: workspace/project/estimate/library export.

Do not expose cross-workspace data in export jobs.

## Provider Metadata Rules

Allowed from OAuth metadata:

- display name;
- avatar URL;
- provider name;
- email verification status.

Do not trust provider metadata for:

- app role;
- workspace role;
- project role;
- paid plan;
- admin status;
- company/domain ownership.

## Lifecycle Acceptance Criteria

- A new user gets exactly one appropriate default workspace unless accepting an invite into an existing workspace.
- Invite acceptance is idempotent.
- No email-domain-only auto-join exists before domain verification.
- Last-owner guards exist before deactivation/deletion features.
- Account deletion/export is designed before public beta, even if self-serve UI ships later.
