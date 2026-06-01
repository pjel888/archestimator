# 20 — Compliance Mapping (OWASP ASVS 5.0.0)

This chapter is an indicative map, not an ASVS Level 1/2/3 attestation. The audit did not verify every ASVS requirement.

## V1 — Architecture

| Requirement | Status | Notes |
|---|---|---|
| V1.1 — Application security documentation | Partial | `[this audit]` is the closest artefact; no threat model document |
| V1.4 — Threat modelling | Missing | No STRIDE / LINDDUN doc observed |
| V1.14 — DAST | Missing | R-65 |

## V2 — Authentication

| Requirement | Status | Notes |
|---|---|---|
| V2.10 — Credential rotation | Partial | Service-role key rotation undocumented; deepseek key rotation undocumented (R-46) |
| V2.10 — Bypass hard to enable | Yes | Triple-gated dev bypass |

## V3 — Session Management

| Requirement | Status | Notes |
|---|---|---|
| V3.3 — Session expiration | Yes | 24h share cookie, 30-min AI draft token |
| V3.4 — Session storage hygiene | Yes | `no-store` on public routes |

## V4 — Access Control

| Requirement | Status | Notes |
|---|---|---|
| V4.1 — Object-level authorization | Yes | RLS + service-role discipline |
| V4.2 — Function-level authorization | Yes | RLS + middleware + dev-bypass gate |
| V4.2.4 — Open redirect defence | Yes | `redirects.ts` |

## V5 — Input Validation

| Requirement | Status | Notes |
|---|---|---|
| V5.1 — Server-side validation | Partial | Custom validation exists (validatePackageBuilderDraft, magic-byte sniffing, etc.), not centralized through Zod. Severity: Low. |
| V5.3 — Output encoding | Yes | React default escaping; one controlled `dangerouslySetInnerHTML` for Clarity analytics |

## V6 — Cryptography

| Requirement | Status | Notes |
|---|---|---|
| V6.2 — Authenticated encryption | Yes | AES-GCM, HMAC |
| V6.3 — RNG | Yes (confirmed) | Node `crypto` used in `src/lib/publication/security.ts` and AI draft-token.ts |
| V6.4 — Password hashing | Yes | scrypt (publication) + Supabase Auth (login) |
| V6.5 — Signature verification | Yes | Resend webhook (Svix) + AI draft token (HMAC) |

## V7 — Error Handling

| Requirement | Status | Notes |
|---|---|---|
| V7.4 — Sanitised errors | Yes | JSON `{ error }` shape; provider error mapping recommended (R-57) |

## V8 — Logging and Monitoring

| Requirement | Status | Notes |
|---|---|---|
| V8.1 — Audit log | Yes | Multiple audit tables |
| V8.3 — Alerting | Missing | R-60 |

## V9 — Data Protection

| Requirement | Status | Notes |
|---|---|---|
| V9.1 — Data classification | Partial | This audit summarises classes (F-DATA-01) |
| V9.2 — TLS | Yes (assumed) | Vercel TLS termination |
| V9.3 — At-rest encryption | Yes (assumed) | Supabase provider |

## V10 — Communications

| Requirement | Status | Notes |
|---|---|---|
| V10.x — TLS / certs | Yes (assumed) | Vercel-managed |

## V11 — Business Logic

| Requirement | Status | Notes |
|---|---|---|
| V11.1 — Rate limit / DoS | Partial | Durable table exists; AI endpoints under-protected (R-25) |

## V12 — Files and Resources

| Requirement | Status | Notes |
|---|---|---|
| V12.1 — Upload validation | Yes | Magic-byte, sharp re-encode, size cap |
| V12.6 — SSRF | Yes | No user-controlled URL fetch |

## V14 — Configuration

| Requirement | Status | Notes |
|---|---|---|
| V14.1 — Secret hygiene | Partial | Env contract correct; rotation undocumented (R-46) |
| V14.2 — Dependency hygiene | Partial | Pinned versions; no SCA (R-27) |
| V14.3 — Credential storage | Yes | Service-role server-only |
| V14.4 — HTTP security headers | Partial | CSP enforced on share (verified `frame-ancestors 'none'`), landing Report-Only; HSTS missing |
| V14.5 — Cookies | Partial | `Secure` attribute can only be verified in production deployment |
| V14.6 — CI hardening | Partial | `permissions:` not declared; no SAST/SCA/secret-scanning |

## Gap summary

The audit is **mostly aligned with ASVS Level 1**, with notable gaps in:

- Threat modelling (V1.4)
- Alerting (V8.3)
- SCA / SAST / DAST (V1.14, V14.2)
- Some input validation centralisation (V5.1)
- AI-specific DoS coverage (V11.1)

The audit did not assert Level 2 or Level 3 conformance.
