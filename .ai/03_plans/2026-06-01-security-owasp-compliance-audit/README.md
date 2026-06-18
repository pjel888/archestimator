# Archestimator — Security / OWASP / Compliance Audit

**Audit date:** 2026-06-01
**Second-pass review:** 2026-06-01 (see `22_SECOND_PASS_REVIEW/` for corrections)
**Git head:** `dc044465f5c20ca75c60cee6606717abf47eae41` (branch `main`)
**Methodology:** Read-only static review of `src/`, `supabase/migrations/`, `next.config.ts`, `src/proxy.ts`, `.github/workflows/`, `.env.example`; mapped to OWASP Top 10:2025, OWASP API Security Top 10:2023, OWASP ASVS 5.0.0

> **Note from second-pass review:** Several severity ratings have been corrected (downgraded where overstated). The single most impactful change is the addition of `search_path` hardening as a verified strength. The CSP `frame-ancestors` claim has been corrected — it IS present in `next.config.ts`. See `22_SECOND_PASS_REVIEW/README.md` for full corrections.

## 2026-06-18 Status Guardrail

This folder is a read-only audit/remediation roadmap, not a compliance closeout
or authorization to mutate provider settings. Some remediations have landed in
later work, but any release/security claim must be revalidated against current
source, CI, provider state, and the active launch-readiness gates.

## Index

| # | Doc | Description |
|---|---|---|
| 00 | [Executive Summary](./00-executive-summary.md) | Posture, top 5 findings, OWASP headline |
| 01 | [Scope and Methodology](./01-scope-and-methodology.md) | In/out of scope, evidence collection, limitations |
| 02 | [Architecture and Trust Boundaries](./02-architecture-and-trust-boundaries.md) | Stack snapshot, trust boundaries, service-role consumption points |
| 03 | [Authentication and Session Management](./03-authentication-and-session-management.md) | Dev bypass, session resolution, AI auth path |
| 04 | [Authorization and RLS Coverage](./04-authorization-and-rls-coverage.md) | Per-migration RLS matrix, SECURITY DEFINER audit |
| 05 | [Input Validation and Output Encoding](./05-input-validation-and-output-encoding.md) | Zod absence, XLSX filename, XSS surfaces |
| 06 | [Injection and Template Vulnerabilities](./06-injection-and-template-vulnerabilities.md) | SQLi, SSTI, SSRF, CSV/Excel formula injection |
| 07 | [Cryptography and Secrets Management](./07-cryptography-and-secrets-management.md) | HMAC, AES-GCM, scrypt, key handling |
| 08 | [Data Protection and Privacy](./08-data-protection-and-privacy.md) | Classification, AI data flow, deletion, share exposure |
| 09 | [Rate Limiting and DoS Resilience](./09-rate-limiting-and-dos-resilience.md) | Durable table, in-memory LRU, AI quotas |
| 10 | [Third-Party and Supply Chain](./10-third-party-and-supply-chain.md) | SCA gap, SAST gap, secret-scanning gap, providers |
| 11 | [API Security (OWASP API Top 10:2023)](./11-api-security-owasp-api-top10.md) | API1–API10 mapping |
| 12 | [AI / LLM Security](./12-ai-llm-security.md) | Draft token, audit, prompt injection, key rotation |
| 13 | [File Upload and Storage](./13-file-upload-and-storage.md) | Magic-byte, sharp re-encode, size caps, AV |
| 14 | [Shared-Link / Publication Surface](./14-shared-link-publication-surface.md) | Token crypto, CSRF, rate limit, circuit-breaker, CSP |
| 15 | [Collaboration / Invite Surface](./15-collaboration-invite-surface.md) | Config-blocked fail-closed, SECURITY DEFINER RPCs |
| 16 | [Webhooks and External Callbacks](./16-webhooks-and-external-callbacks.md) | Resend signature, replay, idempotency |
| 17 | [Error Handling and Information Disclosure](./17-error-handling-and-information-disclosure.md) | JSON shape, no-store, provider error mapping |
| 18 | [Logging, Monitoring, and Audit Trail](./18-logging-monitoring-audit-trail.md) | Audit tables, alerting gap, retention |
| 19 | [Secure SDLC and CI/CD](./19-secure-sdlc-and-ci-cd.md) | SAST/SCA/secret-scanning/DAST/SBOM, branch protection |
| 20 | [Compliance Mapping (OWASP ASVS 5.0.0)](./20-compliance-mapping-owasp-asvs.md) | Per-chapter ASVS map |
| 21 | [Remediation Roadmap](./21-remediation-roadmap.md) | All recommendation IDs grouped by effort |

## Conventions

- Findings are tagged `F-<DOMAIN>-<NN>` (e.g., `F-AUTH-04`)
- Recommendations are tagged `R-NN` (e.g., `R-08`)
- Severity uses Critical / High / Medium / Low / Informational
- Likelihood and impact are Low / Medium / High

## Top 5 Findings (cross-references)

1. **F-CI-02/F-CI-03/F-CI-04** (High) — CI lacks SAST, SCA, secret-scanning → [19](./19-secure-sdlc-and-ci-cd.md)
2. **F-LOG-02** (High) — No documented structured monitoring/alerting → [18](./18-logging-monitoring-audit-trail.md)
3. **F-AI-07** (High) — No documented key-rotation for `DEEPSEEK_API_KEY`; no kill-switch; no per-tenant AI cap → [12](./12-ai-llm-security.md)
4. **F-CRYPTO-06** (Medium) — `Resend` client constructor placeholder default; drift risk → [07](./07-cryptography-and-secrets-management.md), [16](./16-webhooks-and-external-callbacks.md)
5. **F-SHARE-13** (Medium) — Share-link token rotation / expiry not documented → [14](./14-shared-link-publication-surface.md)
