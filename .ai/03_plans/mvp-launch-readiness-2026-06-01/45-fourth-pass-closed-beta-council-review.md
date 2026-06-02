# Fourth-Pass Closed Beta Council Review

## Method

External model council tools were not used in this pass. This is an internal simulated council based on the repository audit, command baseline, graph/GitNexus evidence, and closed beta requirements.

## Council Roles And Findings

| Role | Finding | Decision |
| --- | --- | --- |
| Closed beta product manager | The plan must optimize for a manually curated cohort, not public growth. | Closed beta allowlist is P0. |
| Auth/security architect | Google Sign-In alone is insufficient because any Google user could authenticate. | Server-side email allowlist enforcement is P0. |
| Supabase/RLS reviewer | The allowlist must not be readable as a user directory. | Use `closed_beta_allowed_emails` with RLS and narrow server helper. |
| Vercel deployment reviewer | OAuth callback URLs and env separation are launch gates. | Production and preview envs need explicit closed beta flags. |
| Resend/email reviewer | Manual beta invites can avoid Resend as a blocker, but share/invite email visibility changes that. | Resend is P1 unless email-dependent product flows remain visible/required. |
| UX onboarding reviewer | Denied users need clear next steps and no redirect loop. | Add `/beta/access-required`; first-run whitelisted path stays `/workshop`. |
| Investor/incubator demo reviewer | Reviewers need access without public signup or paid-plan confusion. | Whitelist reviewers and use seeded demo workspace. |
| Construction estimating domain reviewer | Export, components, templates, and unlink are value-critical. | Keep these workflows P0 for beta usefulness. |
| QA/test architect | Current DOM baseline has 3 failing static-contract assertions. | Do not launch until auth/whitelist smoke and existing P0 failures are resolved or explicitly scoped. |
| Legal/beta terms reviewer | Paid SaaS terms are the wrong launch artifact. | Beta terms/privacy/AUP/disclaimers are P0. |

## Required Decisions

| Question | Decision |
| --- | --- |
| Is closed beta whitelist P0? | Yes. |
| Can payment be fully deferred? | Yes. No Stripe, checkout, subscriptions, invoices, or plan enforcement for closed beta. |
| Should pricing page be hidden or reframed? | Reframe as closed beta access/contact or hide from nav. If visible, no paid plans. |
| Is Resend P0 or P1? | P1 for manual beta invites; P0 only for visible share/invite email workflows that beta users must use. |
| Is Redis required? | Deferred for closed beta unless measured load or a specific distributed rate-limit/job need appears. |
| Is manual whitelist management acceptable? | Yes for MVP closed beta. Admin UI deferred. |
| Is beta feedback path P0 or P1? | P0. The local implementation now uses protected `/workshop/feedback` plus support email fallback; linked migration apply, hosted smoke, and monitored review proof remain launch gates. |
| Are legal beta terms P0? | Yes. |

## Final No-Go Conditions

- Non-whitelisted users can access `/workshop`.
- Whitelisted users cannot access `/workshop`.
- Google OAuth fails in production.
- Profile/workspace creation fails for whitelisted users.
- Ask Flip or AI routes are active by default while AI is deferred.
- Pricing/payment copy implies a paid product is live.
- Project-specific unlink can corrupt shared library data.
- Excel export is unprofessional or formulas are untested.
- Project/component/template core workflows are broken.
- No feedback/support path exists.
- Beta legal/privacy pages are misleading or missing.
- No backup exists before new migrations.
- No rollback path exists.
- No closed beta runbook exists.
