# 21 — Remediation Roadmap

The findings are tagged with recommendation IDs (R-NN). This roadmap groups them by effort and impact. Numbering is from the per-doc chapters; not strictly sequential.

## A — Quick wins (single PR, low risk)

| ID | Title | Doc | Effort |
|---|---|---|---|
| R-08 | Introduce Zod at API boundaries | [05](./05-input-validation-and-output-encoding.md) | M |
| R-09 | Sanitise XLSX export filename, RFC 5987 | [05](./05-input-validation-and-output-encoding.md) | S |
| R-10 | UUID / content-hash object keys | [05](./05-input-validation-and-output-encoding.md), [13](./13-file-upload-and-storage.md) | S |
| R-11 | Audit `dangerouslySetInnerHTML` | [05](./05-input-validation-and-output-encoding.md) | S |
| R-13 | Excel formula-injection mitigation | [06](./06-injection-and-template-vulnerabilities.md) | S |
| R-14 | Regression test: no `.raw()`, no `dangerouslySetInnerHTML` | [06](./06-injection-and-template-vulnerabilities.md) | S |
| R-15 | SQL-audit helper test | [06](./06-injection-and-template-vulnerabilities.md) | S |
| R-16 | Remove Resend placeholder default | [07](./07-cryptography-and-secrets-management.md), [16](./16-webhooks-and-external-callbacks.md) | S |
| R-17 | Forbid `Math.random()` in security-sensitive paths | [07](./07-cryptography-and-secrets-management.md) | S |
| R-18 | Runtime assertion: invite pepper non-empty when enabled | [07](./07-cryptography-and-secrets-management.md), [15](./15-collaboration-invite-surface.md) | S |
| R-19 | HSTS header in `next.config.ts` | [07](./07-cryptography-and-secrets-management.md), [11](./11-api-security-owasp-api-top10.md) | S |
| R-24 | Document in-memory vs durable rate-limit policy | [09](./09-rate-limiting-and-dos-resilience.md) | S |
| R-41 | Externalise AI model name + timeout | [11](./11-api-security-owasp-api-top10.md), [12](./12-ai-llm-security.md) | S |
| R-43 | Document feature flags | [12](./12-ai-llm-security.md) | S |
| R-48 | Document upload auth path | [13](./13-file-upload-and-storage.md) | S |
| R-49 | Confirm Storage RLS / object-prefix | [13](./13-file-upload-and-storage.md) | S |
| R-51 | Public-repository context check | [14](./14-shared-link-publication-surface.md) | S |
| R-52 | `frame-ancestors 'none'` in share CSP | [14](./14-shared-link-publication-surface.md) | S |
| R-55 | Confirm webhook timestamp tolerance | [16](./16-webhooks-and-external-callbacks.md) | S |
| R-56 | Webhook idempotency table | [16](./16-webhooks-and-external-callbacks.md) | M |
| R-57 | Allowlist DeepSeek error responses | [17](./17-error-handling-and-information-disclosure.md) | S |
| R-58 | Global error boundaries | [17](./17-error-handling-and-information-disclosure.md) | S |
| R-59 | Enforce CSP on landing | [17](./17-error-handling-and-information-disclosure.md) | S |
| R-61 | Log scrubbing policy for service-role key | [18](./18-logging-monitoring-audit-trail.md) | S |
| R-62 | Audit retention windows | [18](./18-logging-monitoring-audit-trail.md) | S |
| R-69 | Coverage gate | [19](./19-secure-sdlc-and-ci-cd.md) | S |

## B — High-impact (this quarter)

| ID | Title | Doc | Effort |
|---|---|---|---|
| R-25 | Apply rate limits to AI endpoints | [09](./09-rate-limiting-and-dos-resilience.md) | M |
| R-26 | Per-tenant quotas (RPS, AI tokens, storage MB) | [09](./09-rate-limiting-and-dos-resilience.md) | M |
| R-27 | SCA gate (osv-scanner / bun audit) | [10](./10-third-party-and-supply-chain.md), [19](./19-secure-sdlc-and-ci-cd.md) | M |
| R-28 | SAST gate (CodeQL / Semgrep) | [10](./10-third-party-and-supply-chain.md), [19](./19-secure-sdlc-and-ci-cd.md) | M |
| R-29 | Secret-scanning gate (gitleaks) | [10](./10-third-party-and-supply-chain.md), [19](./19-secure-sdlc-and-ci-cd.md) | M |
| R-30 | SBOM emission | [10](./10-third-party-and-supply-chain.md), [19](./19-secure-sdlc-and-ci-cd.md) | M |
| R-40 | OpenAPI doc | [11](./11-api-security-owasp-api-top10.md) | M |
| R-44 | Apply payload validation (Zod, key cap, audit) | [12](./12-ai-llm-security.md) | M |
| R-45 | Prompt-injection mitigations | [12](./12-ai-llm-security.md) | M |
| R-46 | Key rotation policy | [12](./12-ai-llm-security.md) | S |
| R-50 | AV scan for attachments | [13](./13-file-upload-and-storage.md) | M |
| R-60 | Alerting pipeline | [18](./18-logging-monitoring-audit-trail.md) | M |
| R-64 | `permissions:` at workflow level | [19](./19-secure-sdlc-and-ci-cd.md) | S |
| R-65 | DAST (nightly) | [19](./19-secure-sdlc-and-ci-cd.md) | M |
| R-66 | Dependabot / Renovate | [19](./19-secure-sdlc-and-ci-cd.md) | S |
| R-68 | Branch protection | [19](./19-secure-sdlc-and-ci-cd.md) | S |
| R-21 | Data deletion path / retention policy | [08](./08-data-protection-and-privacy.md) | M |
| R-23 | Share-link rotation / expiry enforcement | [08](./08-data-protection-and-privacy.md), [14](./14-shared-link-publication-surface.md) | M |

## C — Strategic (next quarter)

| ID | Title | Doc | Effort |
|---|---|---|---|
| R-01 | Document dev-bypass contract | [03](./03-authentication-and-session-management.md) | S |
| R-02 | Runtime test: dev bypass is off when NODE_ENV=production | [03](./03-authentication-and-session-management.md) | S |
| R-03 | `Secure` cookie in production | [03](./03-authentication-and-session-management.md), [14](./14-shared-link-publication-surface.md) | S |
| R-04 | `force row level security` on security-sensitive tables | [04](./authorization-and-rls-coverage.md) (see [04](./04-authorization-and-rls-coverage.md)) | S |
| R-05 | Regression: every table has RLS | [04](./04-authorization-and-rls-coverage.md) | S |
| R-06 | Comment blocks on SECURITY DEFINER functions | [04](./04-authorization-and-rls-coverage.md) | S |
| R-07 | Policy-of-record comment on each table migration | [04](./04-authorization-and-rls-coverage.md) | S |
| R-12 | AI prompt-construction policy | [05](./05-input-validation-and-output-encoding.md), [12](./12-ai-llm-security.md) | S |
| R-20 | Privacy notice + provider DPAs | [08](./08-data-protection-and-privacy.md) | M |
| R-22 | Confirm Supabase at-rest encryption | [08](./08-data-protection-and-privacy.md) | S |
| R-31 | Vercel DPA / privacy review | [10](./10-third-party-and-supply-chain.md) | S |
| R-32–R-35 | Subscribe to provider advisories | [10](./10-third-party-and-supply-chain.md) | S |
| R-36 | Service-role consumption guard test | [11](./11-api-security-owasp-api-top10.md) | M |
| R-37 | Explicit `select` lists in public responses | [11](./11-api-security-owasp-api-top10.md) | S |
| R-38 | Admin surface gate | [11](./11-api-security-owasp-api-top10.md) | S |
| R-39 | Standard security headers | [11](./11-api-security-owasp-api-top10.md) | S |
| R-42 | AI retry/jitter policy | [12](./12-ai-llm-security.md) | S |
| R-47 | Service-role key handling hardening | [12](./12-ai-llm-security.md) | S |
| R-53 | Pepper rotation policy | [15](./15-collaboration-invite-surface.md) | S |
| R-54 | Closure gate for invite system | [15](./15-collaboration-invite-surface.md) | S |
| R-63 | Audit tamper-evidence | [18](./18-logging-monitoring-audit-trail.md) | M |
| R-67 | Signed releases / SLSA | [19](./19-secure-sdlc-and-ci-cd.md) | M |
| R-41 (C) | Audit clean tree | [11](./11-api-security-owasp-api-top10.md) | S |

## D — Out-of-repo / hosting-side

These were flagged in scope but the fix is outside the repository:

- R-19 (Vercel HSTS edge config)
- R-22 (Supabase TDE)
- R-31 (Vercel DPA)
- R-61 (Vercel log scrubbing)

## Tracking

Each finding has a unique ID (F-…) and at least one recommendation ID (R-…). They should be migrated to the issue tracker and linked to PRs that close them.

## Acceptance criteria for re-audit

A future re-audit should close all **B** items and at least 80% of **A** items, and add:

- SAST, SCA, secret-scanning, DAST evidence in CI
- Alerting runbook
- OpenAPI doc
- Service-role consumption guard tests
- RLS coverage regression test
