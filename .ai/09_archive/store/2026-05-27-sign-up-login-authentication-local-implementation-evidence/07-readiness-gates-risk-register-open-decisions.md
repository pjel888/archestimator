# 07 - Readiness Gates, Risk Register, And Open Decisions

**Date:** 2026-05-27
**Scope:** final readiness, risks, explicit decisions, non-blocking questions
**Mode:** planning only
**Second-pass note:** this first-pass companion doc is supplemental only. The current readiness gates live in `08-testing-validation-and-release-gates.md` and `11-second-pass-adversarial-review-and-blast-radius.md`; `/signup` references here are superseded by the `/login` canonical route contract.

## Planning Status

This plan pack is ready for review. It does not authorize code implementation by itself.

## Accepted Planning Decisions

- Use Supabase Auth for immediate v1.
- Use Google sign-in as primary.
- Use email magic link as fallback.
- Do not add passwords in the current phase.
- Superseded by second pass: do not add `/signup`; keep `/login` canonical unless the primary auth pack is reopened.
- Keep workspaces as the corporate account boundary.
- Prepare, but do not implement, SAML SSO and MFA enforcement.
- Do not add non-essential analytics/marketing cookies until consent and policy are ready.
- Remove founder-specific auth copy from production UI during implementation.

## Readiness Gate A - Product

- [ ] Sign-up/log-in copy approved.
- [ ] `/signup` public CTA destination approved.
- [ ] Public self-serve signup policy approved.
- [ ] First-run onboarding fields approved.
- [ ] Invite flow copy approved.
- [ ] Corporate readiness scope accepted as "prepared, not fully built".

Blocker if not met:

- Implementation can still build internal components/tests, but public launch copy and routing must wait.

## Readiness Gate B - Provider Configuration

- [ ] Supabase project for Archestimator confirmed.
- [ ] Supabase Site URL confirmed.
- [ ] Supabase redirect URL allow list locked to approved URLs.
- [ ] Google Cloud OAuth app configured.
- [ ] Google consent screen includes privacy and terms URLs.
- [ ] Google scopes limited to openid/email/profile.
- [ ] Email sender domain configured.
- [ ] SMTP provider and deliverability validated.
- [ ] Vercel environment variables set per environment.

Blocker if not met:

- Real Google/email flow QA cannot complete.

## Readiness Gate C - Legal And Compliance

- [ ] Privacy Policy / Privacy Notice live.
- [ ] Terms of Service live.
- [ ] Cookie Notice live.
- [ ] Support/security contact live.
- [ ] Subprocessors list drafted.
- [ ] DPA posture reviewed.
- [ ] Retention schedule approved.
- [ ] DSAR/export/delete workflow accepted.
- [ ] Marketing consent not bundled with account creation.

Blocker if not met:

- Do not launch self-serve public sign-up.

## Readiness Gate D - Security

- [ ] Auth UI does not expose raw provider errors.
- [ ] Open redirect tests pass.
- [ ] Callback code exchange tests pass.
- [ ] Auth event logging stores metadata only.
- [ ] No service-role client import reaches client components.
- [ ] RLS tests cover workspace/project/sheet boundaries.
- [ ] Dev auth bypass is production-disabled.
- [ ] Rate limit/resend behavior is documented.
- [ ] Incident response path exists for account compromise.

Blocker if not met:

- Do not expose `/signup` publicly.

## Readiness Gate E - QA And Release

- [ ] `bun run validate` passes.
- [ ] `bun run build` passes.
- [ ] Local Google flow verified if configured.
- [ ] Staging magic-link flow verified.
- [ ] Staging invitation acceptance verified.
- [ ] Staging expired-link state verified.
- [ ] Authenticated `/login` and `/signup` redirect behavior verified.
- [ ] Protected `/workshop` redirect behavior verified.

Blocker if not met:

- Do not mark the feature production-ready.

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Google OAuth config mismatch breaks login | Medium | High | Exact redirect inventory, staging smoke, config checklist |
| Email deliverability is weak | Medium | High | Custom SMTP, SPF/DKIM/DMARC, branded templates, support fallback |
| Account enumeration through errors | Medium | Medium | Generic sent/error copy, server-side event logging |
| Open redirect via `next` | Low | High | Path-only sanitizer and tests |
| Service-role leakage | Low | Critical | Server-only imports, lint/review, tests for client import boundaries |
| Workspace bootstrap creates wrong tenant | Medium | High | Post-auth destination tests, workspace RLS tests, invitation-specific flow |
| Corporate customer asks for SSO before ready | Medium | Medium | Document SSO lane and do not overclaim |
| GDPR/CCPA/privacy docs lag behind public launch | Medium | High | Legal readiness gate before `/signup` public CTA |
| Optional analytics added without consent | Medium | Medium | Cookie gate and explicit non-goal |
| Dirty worktree causes unrelated changes to ship | High | Medium | Scope-limited staging, `git diff --check`, file inventory before implementation |

## Open Decisions Before Implementation

These do not block the planning pack. They do block final production launch.

1. **Public signup policy**
   - Recommended default: public self-serve signup enabled for launch.
   - Corporate workspaces can later choose invite-only.

2. **Production domain**
   - Needed for Supabase Site URL, Google consent screen, and email templates.

3. **Legal document owner**
   - Needed for Privacy, Terms, Cookie Notice, DPA posture, and subprocessors.

4. **Email sender**
   - Need to choose Supabase default email versus custom SMTP/transactional provider. Production should use a branded sender.

5. **Auth event retention**
   - Recommended startup default: 180 days for security event metadata.

6. **First-run onboarding fields**
   - Recommended v1: company/workspace name, optional display name confirmation, optional country/default currency only if estimating defaults need it immediately.

7. **MFA timing**
   - Recommended v1: not required at first launch.
   - Recommended corporate hardening: require TOTP MFA for owners/admins before selling enterprise.

## Future Decisions After V1

- Supabase SAML SSO versus Auth0/WorkOS/Clerk for enterprise SSO.
- Whether to support passkeys.
- Whether to support SCIM.
- Whether to support multiple workspaces per user in the visible account switcher.
- Whether to support regional data residency by workspace.
- Whether to support company-wide audit export in the UI or support-only tooling first.

## Implementation Start Criteria

Implementation may begin only after:

- This plan pack is accepted as the source of truth.
- The implementation owner has checked the dirty worktree.
- The first implementation task begins with tests from `06-implementation-sequence-and-test-plan.md`.
- Product code changes stay inside the auth/account scope.

## Completion Criteria For Future Implementation

The future auth feature is complete only when:

- `/signup` and `/login` both work without passwords.
- Google sign-in works.
- Email magic link works.
- Callback redirects are safe.
- New users get a workspace/onboarding path.
- Invited users land in the correct collaboration scope.
- Privacy/Terms/Cookie/support links are live.
- Auth events are recorded without secrets.
- RLS and role tests pass.
- `bun run validate`, `bun run build`, and `git diff --check` pass.
- `.ai/10_state/current-state.md` and `.ai/10_state/decisions.md` are updated with the actual shipped truth.
