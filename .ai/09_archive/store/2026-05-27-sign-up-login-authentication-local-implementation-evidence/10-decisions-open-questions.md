# Decisions And Open Questions

**Status:** planning only

## Decisions

### Decision 1: Supabase Auth First

Use Supabase Auth for the first production auth slice.

Reason:

- already integrated;
- aligns with RLS;
- avoids premature provider migration;
- supports Google and email magic links;
- supports current collaboration invite path.

Rejected for now:

- Clerk/Auth0/WorkOS as immediate migration. These remain future options if corporate/enterprise requirements outgrow Supabase.

### Decision 2: Passwordless Only

Archestimator will not ship first-party password sign-up, password sign-in, or password reset for now.

Reason:

- reduces product/support burden;
- aligns with user request;
- reduces password storage and reset risk;
- keeps auth startup-lean.

Open risk:

- provider-level password enforcement must be verified in hosted Supabase. If Supabase cannot enforce no-password behavior at the provider/API level, the team must accept app-level no-password only or evaluate another auth provider.

### Decision 3: Unified Auth Entry

Use one auth entry surface for sign-up and login.

Reason:

- passwordless flows do not require separate systems;
- reduces duplicate UI/actions/tests;
- handles invites and protected-route redirects consistently.

Implementation note:

- `/login` remains canonical unless a future route IA explicitly chooses `/sign-in` and `/sign-up` aliases.
- `/signup` is not canonical and should not be implemented from older companion docs.

### Decision 4: Workspace Equals Account/Organization Boundary

Use existing `workspaces` as the future business/corporate account boundary.

Reason:

- avoids a parallel org model;
- aligns with RLS;
- aligns with current Teamspaces/project/sheet collaboration.

### Decision 5: Enterprise Features Are Readiness, Not MVP

Do not ship SSO, SCIM, domain verification, or MFA enforcement in the first slice.

Reason:

- early users need low-friction access;
- enterprise controls add operational and UX weight;
- no current requirement proves they are needed before the auth foundation is hardened.

### Decision 6: App-Owned Security Events Use `account_security_events`

Use `account_security_events` as the first app-owned auth/security audit table name if a new table is added.

Reason:

- avoids parallel `auth_events` naming drift;
- distinguishes app business/security events from Supabase Auth audit logs;
- supports workspace, invite, role, domain, and ownership events that Supabase Auth logs do not fully model.

### Decision 7: Collect First-Party Onboarding Data After Auth

Collect required product onboarding data after Google/email authentication and before the first self-serve workspace session.

Reason:

- Google/email identity does not reliably tell us profession, student status, organization type, company size, country, or intended use;
- Archestimator needs this data for workspace defaults, support, product prioritization, segmentation, and future corporate-readiness;
- keeping the signed-out auth page lean preserves conversion while still collecting the data at the first authenticated moment.

Required MVP intake:

- display name confirmation;
- organization/workspace name;
- organization type;
- user category/profession, including `Student` and `Educator`;
- country/region.

Optional MVP intake:

- primary use;
- company size;
- default currency;
- student/school detail when relevant;
- marketing consent as a separate unchecked opt-in.

Rules:

- do not collect passwords, phone numbers, addresses, IDs, or sensitive personal data in auth onboarding;
- do not overload `profiles.role`; profession/persona is product metadata, not authorization;
- invited collaborators should not be forced to create an organization workspace just to accept an invite;
- every collected onboarding field must be editable later from authenticated profile/workspace settings with correction/export/delete support.

## Open Questions

### Product / Go-To-Market

1. Should public self-serve sign-up be open immediately, or should email-link sign-up be invite/waitlist-only during private beta?
2. Should landing-page `Sign up` and `Log in` CTAs point to distinct aliases or the same `/login` route with different copy?
3. What exact enum labels should the first-run intake use for user category/profession and organization type?
4. Should profile and workspace settings ship in the same slice as onboarding, or can onboarding ship only if the edit path is implemented immediately after behind the same release gate?

### Provider / Security

5. Can hosted Supabase disable password grants while preserving email magic links/OTP?
6. Should production use separate Supabase projects for staging and production auth?
7. Should preview deployments support real auth, or only local/dev-auth style smoke?
8. Should Turnstile/hCaptcha be enabled before launch or only after abuse signals?
9. What canonical app URL env name and allowed-origin list should production auth use?
10. Should public email-link sign-up use `shouldCreateUser: true`, or should private beta/invite-only use `shouldCreateUser: false`?
11. What target magic-link/OTP expiry and resend cooldown should launch use?
12. Which `/api` routes require extra rate limits/audit events before public launch?

### Compliance / Legal

13. Who is the legal entity/operator named in Privacy Notice and Terms?
14. Which launch jurisdictions are in scope on day one?
15. What retention periods should be approved for auth/security logs, pending invites, and deleted workspaces?
16. Which subprocessors will be committed for launch: Supabase, Vercel, Google, email provider, analytics, AI provider?
17. What DSAR SLA and identity verification workflow will support access/delete/export requests?
18. What terms/privacy versioning and legal acknowledgement record will be stored?
19. Do Privacy Notice and DSAR/export workflows explicitly cover onboarding persona, organization type, country, intended use, and student/school fields?
20. What international transfer/data residency posture will be published?

### Corporate Accounts

21. When should domain verification become a real feature?
22. Should verified-domain users auto-join, request access, or remain invite-only?
23. Which enterprise provider should be evaluated first if SSO becomes urgent: Supabase SSO, Auth0, WorkOS, Clerk, or Descope?
24. What account ownership transfer workflow is required before paid teams onboard?
25. What is the trigger for SCIM/directory sync evaluation?
26. How should one user switch between multiple workspaces with different domain/SSO policies?

## Review Triggers

Reopen this plan if:

- the auth provider changes;
- production launch domain changes;
- a corporate customer requires SSO/MFA/SCIM;
- public self-serve signup is replaced by invite-only signup;
- analytics/marketing cookies are added;
- AI features start reading real customer project data through auth context;
- Supabase Auth passwordless-only enforcement cannot be proven;
- a security review finds auth or RLS concerns.

## Next Recommended Action

Do Phase 0 first: provider and production configuration audit. It is the one planning item that can materially change the implementation path before code is touched.
