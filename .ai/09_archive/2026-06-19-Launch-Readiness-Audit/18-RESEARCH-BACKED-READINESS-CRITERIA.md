# Research-Backed Readiness Criteria

Date: 2026-06-20. Scope: external grounding for launch-readiness gates.

This file maps official standards and provider documentation to the audit's criteria. It does
not create compliance claims; it gives implementation agents a grounded checklist for what
"closed" should mean.

## Source map

| Source | What it contributes to this pack | Applied docs/gates |
|---|---|---|
| OWASP ASVS | Application security controls should be testable requirements, not general intentions. | B3, B5, B6, B8, C1, H1-H4, `10`, `20`. |
| OWASP Threat Modeling | Threat modeling identifies and communicates threats, mitigations, assets, and environment. | `10`, `19`, `21`. |
| NIST SP 800-30 Rev. 1 | Risk assessment needs impact, likelihood, communication, and residual-risk maintenance. | `19`, `20`, `21`. |
| Google SRE SLO/Monitoring | Reliability gates should use measurable SLIs/SLOs and actionable alerting. | B4, B7, H4, `15`, `20`. |
| W3C WCAG 2.2 | Accessibility gates need concrete success criteria such as target size, accessible authentication, and focus behavior. | B3, B5, V2, `12`, `13`, `20`. |
| GitHub required status checks docs | Required checks are meaningful only when enabled and passing on the protected branch/merge path. | B1, B2, `14`, `20`. |
| Vercel logs/drains/env docs | Runtime logs are short-retention by default; durable retention needs drains or another sink. Env proof is provider state. | B4, B5, B7, `09`, `15`, `20`. |
| Supabase RLS/API docs | Grants and RLS together determine access; exposed schemas need RLS. | B6, B8, V1, `09`, `16`, `20`. |
| Supabase Realtime limits docs | Realtime limits are configurable per project and must be read from provider state. | V1, `09`, `20`. |
| Resend domain/DMARC docs | Domain verification and SPF/DKIM/DMARC state affect sender authenticity and share-email reliability. | H2, B7, `09`, `20`. |

## Readiness principles

| Principle | Criteria |
|---|---|
| Testability | Every gate has a pass/fail test, provider read, owner decision, or dry-run artifact. |
| Traceability | Every gate links back to source surface, user surface, provider surface, and evidence artifact. |
| Blast-radius containment | Every high-risk change has preflight, rollback, kill switch, and observation window. |
| Residual-risk honesty | Remaining uncertainty is named and accepted by the right authority, not hidden in a 100% score. |
| Cohort fit | A gate can be cohort-specific, but the cohort restriction must be explicit and enforceable. |
| Provider specificity | Provider proof names exact project/account, environment, timestamp, actor, and read/mutation type. |
| Accessibility specificity | UX gates name interaction states, focus/keyboard behavior, target size, error announcement, and mobile width checks. |
| Operational actionability | Alerts should route to a human with a response path and threshold, not merely produce logs. |

## Source URLs

- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- OWASP Threat Modeling: https://owasp.org/www-community/Threat_Modeling
- NIST SP 800-30 Rev. 1: https://csrc.nist.gov/pubs/sp/800/30/r1/final
- Google SRE Monitoring Distributed Systems: https://sre.google/sre-book/monitoring-distributed-systems/
- Google SRE Service Level Objectives: https://sre.google/sre-book/service-level-objectives/
- W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/
- GitHub required status checks: https://docs.github.com/articles/about-status-checks
- Vercel logs: https://vercel.com/docs/logs
- Vercel drains: https://vercel.com/docs/drains
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Supabase securing your API: https://supabase.com/docs/guides/api/securing-your-api
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Realtime limits: https://supabase.com/docs/guides/realtime/limits
- Resend DMARC: https://resend.com/docs/dashboard/domains/dmarc
- Resend domains: https://resend.com/docs/dashboard/domains/introduction
