# Privacy And Compliance Readiness

**Status:** planning only
**Important:** this is engineering readiness, not legal advice. Public privacy, terms, DPA, subprocessor, or compliance claims need counsel review before launch.

## Compliance Strategy

Archestimator should be privacy-by-design from the first production auth slice:

- collect the minimum auth data needed;
- clearly explain why it is collected;
- keep project/client/estimate data workspace-scoped;
- use consent only where consent is truly required;
- rely on contract/legitimate interest where appropriate;
- keep logs useful but not invasive;
- provide data export/deletion workflows before broad public launch;
- keep subprocessors and international transfers documented.

## Data Inventory For Auth

### Identity Data

- `auth.users.id`
- email
- OAuth provider identity
- provider subject
- email verified status
- provider metadata such as name/avatar

### Profile Data

- `profiles.id`
- `profiles.email`
- `profiles.display_name`
- `profiles.avatar_url`
- `profiles.role`
- `profiles.default_workspace_id`

### Workspace / Account Data

- workspace name
- workspace slug
- creator id
- membership role
- project/sheet roles
- collaboration invitation email
- invited_by
- invite expiry/accept/revoke timestamps

### Security Metadata

Planned:

- auth event type;
- timestamp;
- result;
- provider;
- user id when known;
- workspace id when known;
- anonymized IP or keyed hash;
- user-agent hash/class;
- error class.

Do not store raw tokens, raw callback codes, magic links, or service-role details.

### Product Data With Privacy Impact

Even if auth data is small, Archestimator project data can include personal or confidential business information:

- client names;
- project addresses/locations;
- contractor/supplier names;
- cost estimates;
- proposal terms;
- uploaded project/component images and attachments.

The auth plan must not treat privacy as only an email-login issue.

## GDPR / UK GDPR Readiness

Engineering mapping:

| Principle | Product Requirement |
| --- | --- |
| Lawfulness, fairness, transparency | Privacy notice before/at sign-up; plain-language auth copy; no hidden marketing opt-ins |
| Purpose limitation | Use auth/profile data for account access, security, collaboration, support, and legally documented product purposes |
| Data minimization | Only request Google openid/email/profile; do not request Drive/Gmail/calendar scopes |
| Accuracy | Let users update display name/avatar source, onboarding persona, organization type, country/region, intended use, and student/school fields later; normalize email |
| Storage limitation | Define retention for inactive accounts, invitations, and auth/security logs |
| Integrity and confidentiality | RLS, server-only service-role, token hygiene, audited admin operations |
| Accountability | Maintain records of decisions, subprocessors, security controls, and review gates |

Likely lawful bases to validate with counsel:

- account creation/session management: contract or steps prior to contract;
- security/auth audit logs: legitimate interests;
- collaboration invitations: legitimate interests or contract depending customer relationship;
- marketing emails: consent or applicable soft opt-in rules by jurisdiction;
- analytics cookies: consent where required unless strictly necessary.

## CCPA / CPRA Readiness

For California users, prepare:

- notice at collection;
- categories of personal information collected;
- purpose of collection/use;
- retention disclosures;
- user rights workflow;
- `Do Not Sell or Share` assessment if ad/marketing tracking is added;
- vendor/service-provider terms for subprocessors.

Initial implementation should avoid selling/sharing personal information and avoid advertising trackers until consent and disclosure are ready.

## Philippines Data Privacy Act Readiness

Because Archestimator is likely Philippine-context early, prepare for:

- transparency through a privacy notice;
- legitimate purpose;
- proportionality/data minimization;
- data subject rights;
- security measures;
- breach response procedure;
- processor/subprocessor inventory;
- cross-border transfer awareness if data is hosted outside the Philippines.

## PIPEDA Readiness

For Canada-facing users/customers, prepare:

- accountability;
- identifying purposes;
- consent where appropriate;
- limiting collection/use/disclosure/retention;
- accuracy;
- safeguards;
- openness;
- individual access;
- challenge/compliance process.

## LGPD Readiness

For Brazil-facing users/customers, prepare:

- lawful basis mapping;
- purpose and necessity/data minimization;
- transparency;
- user rights;
- security measures;
- international transfer assessment;
- processor controls.

## Cookie And Analytics Consent

Auth cookies that are strictly necessary for session management can be treated differently from analytics/marketing cookies.

MVP rule:

- strictly necessary auth/session cookies only by default;
- no non-essential analytics/marketing cookies on auth pages unless consent is implemented;
- if analytics is added, document:
  - tool;
  - cookie names;
  - purposes;
  - expiry;
  - opt-out/withdrawal;
  - region behavior.

## Required Public Documents Before Production Launch

1. Privacy Notice
   - who operates Archestimator;
   - what data is collected;
   - why;
   - legal bases where applicable;
   - subprocessors;
   - international transfers;
   - retention;
   - user rights;
   - contact path.

2. Terms of Service
   - account responsibilities;
   - acceptable use;
   - no password currently offered;
   - user content/project data;
   - limitation language;
   - termination/deactivation.

3. Cookie Notice
   - required if non-essential cookies/analytics are used.

4. Subprocessor List
   - Supabase;
   - Vercel;
   - Google OAuth;
   - email provider/SMTP;
   - analytics provider if added;
   - AI provider if AI touches account/project data later.

5. DPA Posture
   - not necessarily a full self-serve DPA for MVP, but a clear internal position for business customers.

Each artifact needs an accountable owner, reviewed date, jurisdiction scope, support/contact path, and update process before public launch.

## Consent And Legal Acknowledgement Model

Authentication should record legal acknowledgement separately from marketing consent.

Minimum model or audit-event fields:

- user id;
- workspace id when applicable;
- privacy notice version;
- terms version;
- accepted/acknowledged at timestamp;
- locale/country if collected;
- source route;
- IP/user-agent hash policy;
- marketing consent status and timestamp if marketing opt-in exists;
- withdrawal timestamp if marketing consent is later withdrawn.

Rules:

- do not bundle marketing consent into account creation;
- legal acknowledgement copy can be part of the auth page, but acceptance records must be server-owned;
- do not claim consent as the lawful basis for everything if contract or legitimate interests is more appropriate.

## Records, Transfers, And Assessments

Before broad international launch, prepare:

- record of processing activities or lightweight internal data map;
- transfer impact assessment posture for cross-border hosting/providers where needed;
- DPA/subprocessor review process;
- data residency statement, even if the statement is that no residency option is currently offered;
- DPIA screening for high-risk processing if AI or sensitive project data expands.

For the MVP, the document can be concise, but it must exist and match the real provider stack.

## Data Subject Rights Workflows

Before broad international launch, define:

- export profile/workspace membership data;
- export workspace/project data for account owners/admins;
- correct profile data;
- delete/deactivate account;
- delete workspace;
- transfer workspace ownership;
- revoke invites;
- remove collaborator;
- audit security logs retained after deletion when legally/security justified;
- support identity verification for rights requests.
- jurisdiction-specific SLA targets for access, deletion, correction, and objection requests;
- legal hold exception path;
- how Supabase `auth.users`, storage objects, app rows, backups, audit logs, and support tickets are handled.

Minimum workflow:

1. Verify requester's identity without collecting unnecessary extra data.
2. Determine requester role: individual collaborator, workspace owner/admin, former member, or legal representative.
3. Scope export/delete to authorized workspaces only.
4. Queue export/delete job with audit record.
5. Confirm completion and document retained exceptions.

## Retention Recommendations

Initial policy to validate:

- pending invitations: expire after 14 days, purge or anonymize after 90 days;
- revoked invitations: keep minimal audit metadata for 180 days;
- auth/security events: 180-365 days depending launch risk;
- deactivated user profiles: retain while workspace/project records require attribution, then anonymize where possible;
- deleted workspace data: hard delete after recovery window or retain backup for documented period;
- backups: disclose retention and restore limitations;
- support tickets: separate retention policy.

## Children And Restricted Use

Archestimator should be positioned as a business/professional tool and not directed to children.

Launch docs should state:

- minimum user age or business-use requirement;
- no intentional collection from children;
- support path for deletion if a child account is discovered.

## Compliance Acceptance Criteria

- Auth page links to Privacy Notice and Terms before production launch.
- Google OAuth consent screen contains matching privacy/terms URLs.
- No analytics cookies on auth pages until cookie consent is ready.
- Subprocessor inventory exists.
- Data export/delete/deactivation plan exists before public beta.
- Settings/correction path exists for onboarding profile and workspace data.
- Public copy avoids unsupported claims like `GDPR compliant`, `SOC 2 ready`, or `enterprise secure` unless independently verified.
