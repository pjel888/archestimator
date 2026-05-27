# User Intake, Settings, And Account Data Strategy

**Status:** archived strategy; optional settings implemented locally
**Date:** 2026-05-27
**Scope:** first-run onboarding, editable profile/workspace settings, user/account data ownership, analytics boundaries, privacy rights, and launch gates
**Implementation status:** local settings/account-data code and schema exist; required first-run onboarding is not active; provider and legal artifacts remain launch-blocking

> 2026-05-27 implementation correction: the field/data strategy in this document remains useful for privacy and settings ownership, but the shipped local auth path no longer requires a first-run onboarding gate. Authenticated users land on `/workshop`; `/workshop/onboarding` redirects to `/workshop/settings`; profile/workspace details are optional settings until Product/Legal reopens a required intake decision.

## Purpose And Authority

This document is the auth pack's authority contract for user intake, settings correction paths, account data ownership, and privacy/data-lifecycle handling. It extends the MVP cutline in `README.md` and the data/privacy requirements in docs `02`, `05`, `06`, `11`, and `12`.

If older companion documents conflict with this file:

- `/login` remains the canonical auth entry route;
- `/auth/callback` remains the canonical callback route;
- `/signup` is non-canonical planning language only unless the pack is reopened;
- `account_security_events` is the canonical auth/security audit table name;
- older `auth_events` references are superseded by `account_security_events`;
- intake happens after authentication, not on the signed-out auth page.

## Executive Decision

Archestimator should keep the signed-out auth screen lean and collect first-party user data immediately **after** Google/email authentication.

The auth screen remains:

- Google OAuth;
- email one-time link;
- no password fields;
- no long pre-auth sales form.

The first authenticated onboarding step collects the minimum useful product/account data:

- who the user is professionally;
- whether they are a student/educator or professional user;
- what kind of organization/workspace they are creating;
- country/region and default workspace context;
- optional primary use for product defaults, support, segmentation, and roadmap prioritization.

Every collected field must also be editable later from settings. If the product cannot support correction/editing for a field, it should not collect that field in MVP.

## Strategy Principles

1. **Authenticate first, profile second.**
   - Do not make users fill a long form before knowing whether Google/email auth works.

2. **Collect operationally useful data, not curiosity data.**
   - Every field needs a product, support, compliance, or workspace-default purpose.

3. **Keep product persona separate from authorization.**
   - `Student`, `Estimator`, `Architect`, and similar labels are product metadata.
   - They must never grant permissions or map to `profiles.role`.

4. **Make correction first-class.**
   - Settings edit paths are part of MVP readiness, not a nice-to-have.

5. **Separate profile-owned and workspace-owned data.**
   - Users edit their own persona/profile fields.
   - Workspace owners/admins edit workspace organization fields.

6. **Do not collect sensitive personal data in auth onboarding.**
   - No government ID, birth date, phone number, address, payment data, or sensitive category data in MVP.

7. **Use stable enum values.**
   - Display labels can evolve, but stored values should be stable and versioned enough for analytics and support.

## Field Contract

Every field needs an owner, purpose, correction route, export/delete posture, retention posture, and audit behavior before implementation. "Likely basis" below is an engineering planning label only; counsel must confirm legal basis wording before public launch.

### Required MVP Fields

| Field | UI Label | Owner | Storage Target | Purpose | Editable By |
| --- | --- | --- | --- | --- | --- |
| Display name | `Your name` | User profile | `profiles.display_name` plus confirmation flag | Account display, collaboration attribution, support | Signed-in user |
| User category | `I am a...` | User profile | `user_onboarding_profiles.user_category` | Product segmentation, template defaults, support context | Signed-in user |
| Organization/workspace name | `Company, studio, school, or workspace name` | Workspace | `workspaces.name` and/or `workspace_account_settings.company_name` | Workspace identity, team collaboration, proposals | Workspace owner/admin |
| Organization type | `Organization type` | Workspace | `workspace_account_settings.organization_type` | Product defaults, support, segmentation | Workspace owner/admin |
| Country/region | `Country / region` | Workspace | `workspace_account_settings.country_code` | currency, locale, compliance, support routing | Workspace owner/admin |

### Optional MVP Fields

| Field | UI Label | Owner | Storage Target | Purpose | Editable By |
| --- | --- | --- | --- | --- | --- |
| Primary use | `What are you here to do first?` | User profile or workspace preference | `user_onboarding_profiles.primary_use` | activation path, onboarding tips, product prioritization | Signed-in user |
| Company size | `Team size` | Workspace | `workspace_account_settings.company_size_range` | collaboration defaults, support priority, future packaging | Workspace owner/admin |
| Default currency | `Default currency` | Workspace | `workspace_account_settings.default_currency_code` | estimating defaults | Workspace owner/admin |
| Student/educator detail | `School or program` | User profile | `user_onboarding_profiles.school_or_program` | education support and template decisions | Signed-in user |
| Marketing consent | `Send occasional product updates` | User consent | consent/legal table, not profile metadata only | optional marketing communications | Signed-in user |

### 2026-05-27 Local Implementation Field Decisions

The local implementation keeps the field ownership model above, with these launch-gated naming and consent decisions:

- `country_region` is the current local column name for user and workspace region intake. It stores a compact region value supplied through onboarding/settings until Legal/Product approve a strict country-code catalogue. Do not treat it as a verified jurisdiction claim.
- `workspace_account_settings.default_currency` is the current local column name and stores a 3-letter ISO-style currency code. A future migration may rename it to `default_currency_code` after the currency catalogue/export contract is approved.
- `company_size` is the current local enum column for team size; it maps to the planned company-size range concept.
- `student_educator_detail` is the current local profile column for school/program detail; it must remain optional and non-sensitive.
- `marketing_consent_at` remains a dormant nullable column. Current server parsing ignores forged `marketing_consent` form input and writes `null` until Legal/Privacy approves versioned consent records, withdrawal, notice copy, and audit/export/delete handling.

### Field Lifecycle Register

| Field | Required | Likely Basis | Correction Route | Export/Delete Handling | Retention And Audit |
| --- | --- | --- | --- | --- | --- |
| Display name | Yes | Account contract / legitimate interest for collaboration attribution | `/workshop/settings/profile` | Export with profile; delete/anonymize on account deletion except required audit attribution | Retain while account exists; audit profile changes without storing old sensitive values unless needed |
| User category/profession | Yes | Legitimate interest for product defaults, support, segmentation | `/workshop/settings/profile` | Export with intake profile; delete/anonymize with account deletion | Retain current value while account exists; retain aggregate analytics only where privacy posture allows |
| Organization/workspace name | Self-serve owner yes; invited collaborator no | Account contract / legitimate interest for workspace identity | `/workshop/settings/workspace` | Export for workspace owner/admin; preserve in workspace records while workspace exists | Retain while workspace exists; audit owner/admin changes with redacted metadata |
| Organization type | Self-serve owner yes; invited collaborator no | Legitimate interest for defaults, support, segmentation | `/workshop/settings/workspace` | Export with workspace account settings; delete/anonymize when workspace is deleted subject to legal hold | Retain current value while workspace exists; audit settings changes |
| Country/region | Self-serve owner yes; invited collaborator no | Account contract / legitimate interest for locale, currency, support, compliance | `/workshop/settings/workspace` | Export with workspace account settings; delete/anonymize with workspace deletion where allowed | Retain while workspace exists; use stable country code, not freeform text |
| Primary use | Optional | Legitimate interest for onboarding, support, roadmap | `/workshop/settings/profile` unless later made workspace-owned | Export with intake profile; delete/anonymize with account deletion | Retain current value while account exists; aggregate only if analytics posture permits |
| Company size | Optional | Legitimate interest for support, packaging, collaboration defaults | `/workshop/settings/workspace` | Export with workspace account settings; delete/anonymize with workspace deletion where allowed | Retain current value while workspace exists |
| Default currency | Optional or inferred | Account contract / legitimate interest for estimate defaults | `/workshop/settings/workspace` | Export with workspace settings; preserve historical estimate currency on existing estimates | Retain while workspace exists; changes affect future defaults unless explicitly migrated |
| Student/educator detail | Optional and conditional | Legitimate interest for education support; higher-risk operational data | `/workshop/settings/profile` | Export with intake profile; delete/anonymize with account deletion | Retain only current value; no grade level, school ID, parent data, or sensitive freeform detail |
| Marketing consent | Optional | Consent | `/workshop/settings/profile` or notification preferences | Export consent state/history where required; withdrawal stops future marketing but may retain evidence of prior consent | Versioned, timestamped, source-recorded, withdrawable, and separate from Terms/Privacy acknowledgement |

### Explicit Non-Fields For MVP

Do not collect:

- password;
- phone number;
- full mailing address;
- government ID;
- date of birth;
- school ID, grade level, parent/guardian details, classroom roster, or minor-status declaration;
- payment card;
- procurement questionnaire answers;
- health, biometric, financial, political, religious, union, or similar sensitive personal data;
- freeform personal biography.

## Enum Contract

### User Category

Store stable enum values, not display labels:

| Stored Value | Display Label | Notes |
| --- | --- | --- |
| `architect` | Architect | Design-side estimator user. |
| `contractor` | Contractor | Core target segment. |
| `engineer` | Engineer | Civil/structural/MEP users. |
| `quantity_surveyor` | Quantity surveyor | Estimator/QS users. |
| `owner_developer` | Owner / developer | Owner/developer users. |
| `student_educator` | Student / educator | Education users; do not infer age. |
| `other` | Other | Avoid freeform unless support needs it. |

### Organization Type

| Stored Value | Display Label |
| --- | --- |
| `architecture_design` | Architecture / design |
| `construction_contractor` | Construction contractor |
| `engineering_consultancy` | Engineering consultancy |
| `quantity_surveying` | Quantity surveying |
| `owner_developer` | Owner / developer |
| `education` | Education |
| `solo_practice` | Solo practice |
| `other` | Other |

### Primary Use

| Stored Value | Display Label |
| --- | --- |
| `project_estimating` | Project estimating |
| `cost_library` | Cost library |
| `proposal_packages` | Proposal packages |
| `learning` | Learning |
| `other` | Other |

### Company Size

| Stored Value | Display Label |
| --- | --- |
| `solo` | Solo |
| `2_10` | 2-10 |
| `11_50` | 11-50 |
| `51_200` | 51-200 |
| `201_plus` | 201+ |

## UX Flow Contract

### Self-Serve New User

1. User clicks landing CTA.
2. User signs in with Google or email link.
3. Callback creates/resolves session.
4. App detects onboarding required.
5. App shows first-run intake.
6. Required fields are completed.
7. A self-serve workspace is created or updated.
8. User lands in `/workshop`.

Rules:

- show one compact screen;
- required fields must be visibly required;
- optional fields can be skipped;
- default values may be suggested but must be editable;
- do not show billing, SSO, procurement, or enterprise admin controls.

Workspace bootstrap decision:

- MVP should use a self-serve provisional workspace only for users creating their own workspace.
- Required self-serve intake then names and classifies that workspace before normal `/workshop` use.
- Invited collaborators should not trigger default workspace creation before invite resolution.
- The current generic default-workspace behavior is an implementation conflict to resolve before launch; tests must prove invited users do not receive an unnecessary organization workspace.

### Invited Collaborator

1. User opens invite.
2. User authenticates.
3. App applies invite if email matches and invite is valid.
4. User confirms display name if needed.
5. User lands on invited project/sheet route where supported.

Rules:

- do not force invited users to create a new organization workspace just to accept an invite;
- do not ask organization type/company size unless the invited user later creates a workspace;
- wrong-email state blocks access and offers recovery.

### Student / Educator

Student and educator are valid user categories, but Archestimator remains a business/professional and education-adjacent tool, not a product directed to children.

Rules:

- `Student` does not equal minor.
- Do not collect date of birth in MVP.
- Do not collect school IDs, grade levels, parent/guardian information, classroom rosters, or freeform sensitive education details.
- Use minimum-age/business-use language in Terms before public launch.
- Do not intentionally target children under 13.
- Create a support deletion/escalation path for accounts discovered to belong to children where consent is not valid.
- If the team later markets to schools/classes or minors, reopen this plan for COPPA, school administrator consent, parental consent, classroom data, and student privacy review before launch.

### Returning User With Incomplete Intake

If a user authenticated earlier but did not finish intake:

- resume intake before first self-serve workspace session;
- avoid duplicate workspace creation;
- preserve safe `next` destination after completion;
- allow invited-resource continuation if invite acceptance does not require workspace creation.

## Settings Contract

### Profile Settings

Recommended route: `/workshop/settings/profile`

Editable fields:

- display name;
- user category;
- primary use;
- student/educator detail;
- marketing consent, if implemented.

Authorization:

- signed-in user edits only their own profile/intake data;
- platform/admin roles do not need a normal UI path for editing another user's profile in MVP;
- support/operator correction, if ever needed, must be audited separately.

### Workspace Settings

Recommended route: `/workshop/settings/workspace`

Editable fields:

- organization/workspace name;
- organization type;
- country/region;
- default currency;
- company size.

Authorization:

- workspace owner/admin can edit;
- member/viewer/collaborator cannot edit;
- settings access must be scoped to the active workspace;
- changing default currency should warn if it affects new estimates/templates only.

### Settings UI Rules

- Use the same enum values as onboarding.
- Show when a setting affects future defaults rather than existing project data.
- Include save success/failure states.
- Preserve keyboard and screen-reader accessibility.
- Do not expose internal table names or provider metadata.
- Do not let settings pages become an enterprise admin console in MVP.

## Data Model Strategy

### Canonical Tables

| Data Kind | Canonical Table | Notes |
| --- | --- | --- |
| Identity/session | `auth.users` | Provider-owned; do not store product persona here as canonical. |
| Email/display profile | `profiles` | App profile mirror; display name/avatar/email/default workspace/platform role only. |
| User intake/persona | `user_onboarding_profiles` | Proposed table for profession/persona/primary use/student detail. |
| Workspace organization info | `workspace_account_settings` | Proposed table for organization type/country/currency/company size. |
| Workspace membership | `workspace_members` | Authorization only; do not mix with persona. |
| Project membership | `project_members` or current project collaboration table | Authorization only; do not mix with persona. |
| Estimate sheet membership | `estimate_sheet_members` or current sheet collaboration table | Authorization only; do not mix with persona. |
| Legal acknowledgement | `legal_acceptance_events` | Terms/privacy versions and source route. |
| Marketing consent | consent/legal table or dedicated consent event | Separate from Terms/Privacy acknowledgement. |
| Security/account audit | `account_security_events` | Auth/security events, no raw tokens. |

### RLS And Write-Path Requirements

- `user_onboarding_profiles`: a user can read/update only their own row through approved app paths; workspace admins cannot rewrite another user's persona through normal UI.
- `workspace_account_settings`: authorized workspace members can read; only owner/admin/server paths can update.
- `profiles`: collaborator-visible fields must stay limited to shared workspace/project/sheet contexts.
- `legal_acceptance_events`: server-owned inserts only; no browser-writable legal history.
- `account_security_events`: server-owned inserts only; no anon/authenticated direct table grants.
- `workspace_members`, project memberships, and estimate-sheet memberships remain the only sources of authorization roles.

### Profile-Owned Versus Workspace-Owned

Profile-owned:

- display name;
- user category/profession;
- primary use;
- student/educator detail;
- marketing consent.

Workspace-owned:

- workspace name;
- organization type;
- country/region;
- default currency;
- company size;
- future domain/SSO/account policies.

Mixed or contextual:

- default workspace preference belongs to profile;
- membership role belongs to workspace membership;
- project/sheet role belongs to project/sheet collaboration tables.

## Data Rights And Retention Matrix

Data rights workflows must include more than the new intake tables. A launch-ready export/delete/correction design needs this authority matrix.

| Requester | Can Request | Must Include | Special Handling |
| --- | --- | --- | --- |
| Individual collaborator | Own profile, own intake answers, own consent history, own security/account metadata where disclosable | `auth.users`, `profiles`, `user_onboarding_profiles`, consent records, visible memberships, disclosable audit events | Do not leak other workspace members, project content, or owner-only workspace settings beyond what the requester can already access. |
| Workspace owner/admin | Workspace account settings and workspace-owned business records | `workspaces`, `workspace_account_settings`, memberships, invitations, projects, estimates, library records, storage objects owned by workspace | Do not export another user's private profile/intake beyond collaboration display fields unless legal basis and policy allow it. |
| Former member | Own profile/intake plus records still legally attributable to their past actions | Profile/intake/consent/security metadata and attribution records | Do not restore workspace access just to complete a data-rights request. |
| Legal representative or verified authority | Scope defined by validated request | Relevant user/workspace records under documented process | Require manual verification, ticketing, and audit trail before disclosure or deletion. |

The implementation plan must cover:

- `auth.users`, `profiles`, `user_onboarding_profiles`, `workspace_account_settings`, memberships, invitations, projects, estimates, component/library records, storage objects, AI audit metadata, support tickets, backups, legal acceptance, marketing consent, and account security events;
- legal-hold exceptions;
- backup deletion/expiration posture;
- support-ticket redaction and retention;
- deletion impact on project/estimate attribution.

Retention must become table/job-backed before launch, not prose-only. Candidate retention controls to validate:

| Data | Candidate Control To Validate |
| --- | --- |
| Pending invitations | Expire automatically and purge/redact after the approved invite retention window. |
| Account security events | Retain for abuse/security investigation, then purge or aggregate according to the security retention schedule. |
| Onboarding/profile values | Retain current canonical values while the account exists; delete/anonymize on account deletion where not needed for legal/audit attribution. |
| Workspace settings | Retain while the workspace exists; delete/anonymize after workspace deletion recovery window and legal-hold checks. |
| Legal acceptance events | Retain versioned evidence for the legal limitation period approved by counsel. |
| Marketing consent history | Retain current state and evidence of consent/withdrawal as required for compliance. |
| Deleted workspace recovery | Define a short recovery window, then run irreversible purge/redaction jobs. |
| Backups | Document backup expiry and restoration handling for deleted/corrected data. |
| Support tickets | Redact unnecessary personal data and expire according to support/legal retention policy. |

## Privacy And Compliance Contract

This is engineering readiness, not legal advice.

Requirements:

- provide notice at or before collection for onboarding fields;
- document categories and purposes in Privacy Notice / notice at collection;
- keep data adequate, relevant, and limited to stated purposes;
- keep data accurate and correctable through settings;
- include onboarding/settings data in access/export/delete/correction workflows;
- do not bundle marketing consent with account creation;
- no non-essential analytics/marketing cookies on auth/onboarding/settings until consent posture is approved;
- treat country/region as personal data when linked to a user/workspace;
- treat student/school data as higher sensitivity operationally, even if not a special-category field.

Legal/reference implications:

- GDPR-style principles require purpose limitation, minimization, accuracy, storage limitation, security, and accountability.
- California notice-at-collection requirements mean collected categories and purposes must be disclosed at or before collection for covered users.
- UK/EU rectification expectations support having settings/correction paths rather than support-only manual correction.
- COPPA risk stays low only if Archestimator is not directed to children and does not knowingly collect from children under 13; school/minor targeting must trigger a separate legal review.

## Analytics And Event Strategy

Analytics must help product decisions without turning onboarding into surveillance. Product analytics is separate from security/legal evidence.

Server-owned security/legal events may include:

- `auth_method_started`;
- `auth_callback_succeeded`;
- `auth_callback_failed`;
- `magic_link_requested`;
- `legal_acknowledged`;
- `marketing_consent_changed`;
- `workspace_settings_updated`;
- `profile_settings_updated`.

Security/legal event rules:

- write through server actions/routes only;
- store stable error codes, not raw provider errors;
- do not store raw IP, tokens, magic links, callback codes, refresh tokens, provider payloads, service-role details, or full user-agent unless a reviewed hash/redaction policy allows it;
- include actor, workspace where applicable, event type, source route, result, and coarse metadata only.

Allowed product events:

- `auth_intake_started`;
- `auth_intake_completed`;
- `auth_intake_optional_skipped`;
- `profile_settings_opened`;
- `profile_settings_saved`;
- `workspace_settings_opened`;
- `workspace_settings_saved`;
- `marketing_consent_changed`;
- `invite_collaborator_profile_confirmed`;
- `onboarding_abandoned`.

Rules:

- do not send raw email, name, school/program, workspace name, or freeform values to analytics;
- use internal user/workspace IDs only where analytics tooling and privacy policy allow;
- prefer event properties like enum values, completion status, and validation error class;
- keep legal acknowledgement and marketing consent as server-owned records, not analytics-only facts;
- analytics must be opt-out/consent-aware where required.

Useful event properties:

- `user_category`;
- `organization_type`;
- `primary_use`;
- `company_size_range`;
- `country_region`;
- `is_invited_flow`;
- `required_fields_completed`;
- `optional_fields_completed_count`;
- `error_class`;
- `settings_surface`.

Do not log:

- magic links;
- raw callback codes;
- access/refresh tokens;
- service-role details;
- raw IP;
- raw user-agent if hash policy is chosen;
- freeform support notes in analytics.

## Data Quality Rules

- enum stored values are lowercase snake-case;
- enum labels are centralized so onboarding and settings cannot drift;
- `other` should not open a freeform text field in MVP unless a support owner needs it and privacy review approves it;
- country/region should use a stable country code where possible;
- default currency should use ISO currency code;
- display name should preserve user capitalization and spacing after trimming unsafe extremes;
- email normalization should not alter display names;
- all user-input strings need max lengths;
- no field should be required if the app can operate without it and the user is accepting an invite.

## Implementation Readiness Gates

Do not implement intake/settings until these decisions are accepted:

- final enum values;
- required vs optional field list;
- storage table choice;
- settings route names;
- workspace owner/admin authorization rules;
- legal notice copy for why data is collected;
- privacy export/delete/correction inclusion;
- analytics tool and consent posture, if product analytics is implemented.

Do not launch public self-serve auth until:

- onboarding fields are editable from settings;
- workspace settings are owner/admin protected;
- invited collaborator path does not force organization creation;
- Privacy Notice / notice at collection describes the collected categories and purposes;
- DSAR/export/delete/correction workflow includes onboarding and settings data;
- marketing consent can be withdrawn if collected;
- tests prove profession/persona does not grant permissions.
- executable tests cover onboarding persistence, settings authorization, invited-user no-extra-workspace behavior, RLS denial, route aliases, and enum-label sync.

Related auth productization debt:

- the current login UI still needs review for internal-only copy before public launch;
- API route auth/rate-limit/audit posture remains a broader launch blocker from docs `11` and `12`.

## Test Requirements

### UI / Flow Tests

- self-serve user completes required intake and lands in `/workshop`;
- optional fields can be skipped;
- returning incomplete user resumes intake;
- invited collaborator can confirm display name and continue without organization setup;
- invited collaborator acceptance does not create an unnecessary organization workspace;
- optional `/sign-in` and `/sign-up` aliases, if implemented, converge on `/login` behavior;
- settings pages show the same enum labels as onboarding.

### Authorization Tests

- user can edit own profile fields;
- user cannot edit another user's profile fields;
- workspace owner/admin can edit workspace fields;
- member/viewer/collaborator cannot edit workspace fields;
- profession/persona values do not affect `profiles.role`, `workspace_members.role`, or project/sheet roles.

### Data / RLS Tests

- `user_onboarding_profiles` is readable/updateable only by the owning user and authorized server paths;
- `workspace_account_settings` is readable by authorized workspace members and editable only by owner/admin/server paths;
- RLS denies cross-user profile/intake writes and cross-workspace settings writes;
- marketing consent updates are server-owned and timestamped;
- legal acknowledgement versions are not overwritten by marketing consent changes.

### Privacy / Export Tests

- export includes profile/intake/workspace settings data;
- delete/anonymize handles user intake data without destroying required audit attribution;
- correction through settings updates canonical records;
- analytics does not receive raw names/emails/workspace names/school names.

### Analytics Tests

- expected events fire on intake completion and settings save if analytics is enabled;
- event properties use enum values and status flags only;
- no raw personal data is sent;
- analytics stays disabled or consent-aware on auth/onboarding/settings pages until consent posture is approved.

## Product Decisions Still Open

1. Final enum labels for user category, organization type, primary use, and company size.
2. Whether `Primary use` is user-owned or workspace-owned for team accounts.
3. Whether default currency is collected in onboarding or inferred from country/region.
4. Whether `school_or_program` is collected in MVP or deferred.
5. Minimum age / business-use wording in Terms.
6. Whether product analytics is enabled at launch or only after consent/legal review.
7. Whether `other` options should allow freeform text later.

## Sources Used

- EUR-Lex Regulation (EU) 2016/679, Article 5 principles: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679
- ICO right to rectification guidance: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-rectification/
- ICO data protection by design and by default guidance: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/guide-to-accountability-and-governance/data-protection-by-design-and-default
- California Attorney General CCPA notice-at-collection guidance: https://oag.ca.gov/privacy/ccpa
- FTC COPPA rule page: https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa
- FTC COPPA six-step compliance guidance: https://www.ftc.gov/business-guidance/resources/childrens-online-privacy-protection-rule-six-step-compliance-plan-your-business
