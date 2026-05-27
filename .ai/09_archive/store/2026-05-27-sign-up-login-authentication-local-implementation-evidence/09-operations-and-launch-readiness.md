# Operations And Launch Readiness

**Status:** planning only
**Goal:** make auth operable, supportable, and reversible before production users depend on it.

## Environment Variables

Current known env surfaces:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` or `NEXT_PUBLIC_SITE_URL` convention must be normalized
- `ARCHESTIMATOR_DEV_AUTH_BYPASS`
- `ARCHESTIMATOR_DEV_AUTH_EMAIL`
- `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB`

Production requirements:

- define one canonical public app URL env name;
- ensure auth actions/callback use canonical production URL where appropriate;
- define allowed app origins for production, staging, preview, and local;
- keep service-role key server-only;
- ensure Vercel env scopes are correct for production/preview/development;
- never expose dev bypass envs in production.

## Supabase Dashboard Checklist

Hosted project must be verified directly:

- Auth enabled.
- Anonymous sign-ins disabled.
- Google provider enabled.
- Email OTP/magic link enabled.
- Password behavior understood and documented.
- If passwordless-only cannot be enforced at provider level, residual risk is signed off before public launch.
- Site URL set to production domain.
- Redirect URLs include:
  - production callback;
  - approved preview callback policy if previews need auth;
  - localhost callback for development only in local/dev project.
- JWT expiry and refresh rotation reviewed.
- Auth rate limits reviewed.
- Magic link/OTP expiry reviewed.
- Resend cooldown reviewed and aligned with UI copy.
- Email templates branded.
- SMTP/custom sender configured.
- Security notifications reviewed.
- MFA availability documented for later.
- SSO availability documented for later.
- Auth audit log storage setting reviewed.
- Supabase organization MFA and owner coverage verified for operators.

## Google Cloud Checklist

- Google Cloud project belongs to Archestimator-owned account.
- OAuth consent screen configured.
- App name and logo correct.
- Support email correct.
- Privacy policy URL live.
- Terms URL live.
- Scopes limited to `openid`, email, profile.
- Authorized JavaScript origins set.
- Supabase provider callback URI set.
- Production and development OAuth clients separated where appropriate.
- Client secret stored only in Supabase/secret manager, not repo.
- Separate OAuth clients per environment are preferred over broad shared clients.
- Preview deployments either have no real auth or use an explicit preview allow-list policy.

## Email Deliverability

Before public launch:

- use custom sender/domain if possible;
- configure SPF/DKIM/DMARC for sender domain;
- test Gmail, Outlook, iCloud, corporate mailbox;
- test link clicks on mobile mail apps;
- avoid link tracking that rewrites auth links unless explicitly tested;
- align sender domain with app brand to reduce phishing risk;
- avoid project/client sensitive info in auth emails;
- include support contact and ignore-if-not-requested copy.

## Legal Artifact Launch Checklist

Before public self-serve auth:

- Privacy Notice live;
- Terms live;
- subprocessor list live or internally approved with public link plan;
- retention schedule approved;
- DSAR/export/delete workflow approved;
- breach/incident contact path defined;
- launch jurisdictions listed;
- transfer mechanism/data residency posture documented;
- no unsupported compliance badges or claims.

## Monitoring And Alerts

Minimum metrics/events:

- auth email requested;
- OAuth started;
- callback success;
- callback failure by class;
- invite sent;
- invite accepted;
- invite expired/revoked;
- sign-out;
- workspace bootstrap failure;
- RLS/auth denied errors in server logs.

Alert triggers:

- callback failures spike;
- email sends spike;
- invite sends spike;
- workspace bootstrap failures occur;
- service-role operation errors occur;
- repeated unauthorized access attempts against project/sheet routes.
- unusual auth-email resend pressure by email hash/IP/workspace.
- service-role storage/upload failures spike.

Provider outage posture:

- if Google is down, email link remains fallback;
- if email provider is down, Google remains fallback;
- if Supabase Auth is degraded, show status/support copy and avoid repeated resend loops;
- support should know where to check Supabase, Vercel, Google, and email provider status.

## Support Runbook

Common support cases:

### User did not receive email

Steps:

- check submitted address;
- ask user to check spam/quarantine;
- verify resend cooldown;
- check provider/email logs;
- resend if safe;
- offer Google path.

### Magic link expired

Steps:

- explain one-time link expiration;
- direct to request new link;
- do not manually reuse old link.

### Signed in but no workspace/project

Steps:

- verify email used;
- check profile exists;
- check default workspace;
- check pending invitations;
- check project/sheet membership.

### Invite went to wrong email

Steps:

- revoke old invite;
- issue new invite;
- do not transfer invite to mismatched signed-in email automatically.

### User left company

Steps:

- remove memberships;
- revoke pending invites;
- transfer ownership if needed;
- preserve audit attribution based on retention policy.

## Incident Response

Auth incidents include:

- service-role leak;
- OAuth client secret leak;
- redirect vulnerability;
- cross-workspace data access;
- compromised admin account;
- provider outage;
- mass invite abuse;
- email delivery compromise.

Immediate response:

1. Disable affected provider/path if needed.
2. Rotate compromised secret.
3. Revoke sessions if required.
4. Audit affected users/workspaces.
5. Preserve logs.
6. Notify affected users/regulators if legally required.
7. Patch and add regression tests.

Session/key response items:

- rotate service-role key if suspected leaked;
- revoke affected sessions where feasible;
- lower session lifetime temporarily if needed;
- preserve audit logs before cleanup;
- document regulator/user notification assessment.

## Rollback Plan

The first implementation should be reversible:

- keep `/login` route path stable;
- do not delete existing Supabase auth tables;
- add new tables with additive migrations;
- gate new UI modes behind route/query or feature flag if needed;
- retain email magic link fallback if Google breaks;
- retain dev-auth smoke path for local diagnosis.

Rollback cases:

- Google provider misconfigured: keep email link live.
- Email provider down: keep Google live.
- callback bug: revert route/action helper changes.
- audit migration bug: disable audit helper while preserving auth.
- legal links missing: block production launch, not local implementation.

## Launch Sequence

1. Complete provider config audit.
2. Implement and verify auth UI/action/callback hardening.
3. Add legal links and public docs.
4. Configure staging provider settings.
5. Run staging smoke.
6. Configure production provider settings.
7. Run production smoke with test account.
8. Enable landing CTAs.
9. Monitor first 24-72 hours.
10. Record launch evidence in `.ai/05_logs` or plan closeout.

## Operational Acceptance Criteria

- A support person can diagnose auth failures without database spelunking.
- Provider settings are documented and reproducible.
- Secrets are scoped and rotatable.
- There is a fallback if Google or email fails.
- Auth audit events make security incidents investigable.
- Production launch has a rollback path.
