# Executive Summary — Security / OWASP / Compliance Audit

**Audit date:** 2026-06-01
**Repo:** `archestimator` (`/Users/philiplewis/archestimator`)
**Git head:** `dc044465f5c20ca75c60cee6606717abf47eae41` (branch: `main`)
**Scope:** Application + data layer, no infra hosts reviewed
**Methodology:** Read-only static review of `src/`, `supabase/migrations/`, `next.config.ts`, `src/proxy.ts`, `.github/workflows/`, `.env.example`; OWASP Top 10:2025, OWASP API Security Top 10:2023, OWASP ASVS 5.0.0 mapping
**Mode:** Documentation only — no source code, test, migration, or config edits performed
**Passes:** First pass (1P) → Second pass correction review (`22_SECOND_PASS_REVIEW/`) → Third pass Codex threat-model reconciliation (`23_THIRD_PASS_CODEX_RECONCILIATION/`)
**Final production-readiness decision (3P):** `Partially compliant` — see `23_THIRD_PASS_CODEX_RECONCILIATION/18_PRODUCTION_READINESS_GATE.md` for the formal gate and promotion conditions.

---

## Posture

**Overall:** **Moderate, with concentrated High-severity gaps in supply-chain, monitoring, and AI tooling paths.** Authentication, authorization (RLS), and the public shared-link surface are comparatively mature and reflect conscious defensive design (HMAC + AES-GCM, scrypt, CSRF, circuit-breaker, RLS, draft-token HMAC for AI apply, `no-store` headers on public routes).

**Strongest areas (confirmed by second-pass review 2026-06-01)**

- Public shared-link cryptography (`src/lib/publication/security.ts`) — HMAC-SHA256 + AES-256-GCM
- AI apply path hardening (HMAC-signed draft token, 30-min TTL, SECURITY DEFINER RPCs, idempotency, feature flags, explicit `revoke from service_role` on apply RPCs)
- Server-component invite entry (`src/lib/collaboration/invite-entry.ts`) — fail-closed via `PROJECT_INVITE_ENTRY_ENABLED=false` and empty pepper
- Upload route defenses (magic-byte sniffing, sharp re-encode, size caps, per-route public CSRF check)
- Webhook signature verification on `/api/webhooks/resend` (Svix)
- RLS on all user-data tables across 48 migrations
- **All SECURITY DEFINER functions harden `search_path = public`** — prevents Postgres function hijacking (29+ migration files verified)
- CSP enforced on `/share/:path*` routes with `frame-ancestors 'none'`
- `no-store` headers on all public share and invite routes

**Weakest areas**

- CI/CD pipeline: no SAST, no SCA, no secret scanning, no DAST, no dependency review step
- No structured security monitoring / alerting documented for rate-limit, auth-failure, or webhook-verification events
- AI HTTP client (`src/lib/ai/deepseek.ts`) has no retry/jitter policy and no TLS pinning, and the choice of `deepseek-v4-flash` is hard-coded (low risk, but breaks the abstraction)
- Documented open risks in `.ai/10_state/known-issues.md` (invite system not live) have no documented closure gate
- HSTS header not configured in `next.config.ts`; share-cookie `Secure` / `SameSite` not explicit in code (R-19, EG-20260601-3P-001, EG-20260601-3P-002)
- AI endpoints (`/api/ai/ask`, `/api/ai/package-builder`) invoke no rate limiter of any kind (F-RL-04 / SEC-20260601-3P-002)

---

## Top 5 Findings (cross-references)

| # | Severity | Title | Doc |
|---|---|---|---|
| 1 | **High** | CI pipeline lacks SAST, SCA, secret-scanning, and dependency-review gates; `permissions:` not declared at workflow level | [19](./19-secure-sdlc-and-ci-cd.md) |
| 2 | **High** | No documented structured security monitoring / alerting pipeline for rate-limit events, auth failures, or webhook verification failures | [18](./18-logging-monitoring-audit-trail.md) |
| 3 | **Medium** | AI endpoints (`/api/ai/ask`, `/api/ai/package-builder`) have no rate limit and no per-tenant cost cap (F-RL-04 / SEC-20260601-3P-002) | [12](./12-ai-llm-security.md) |
| 4 | **Medium** | Share-cookie `Secure` and `SameSite` attributes are not explicit in code; HSTS header not configured (SEC-20260601-3P-001, EG-20260601-3P-001, EG-20260601-3P-002) | [13-shared-link-publication-surface.md](./14-shared-link-publication-surface.md) |
| 5 | **Medium** | `src/proxy.ts:33` short-circuits `/api/*` to `NextResponse.next({ request })` — API requests bypass the proxy auth wall (intentional, defense-in-depth gap; SEC-20260601-3P-003) | [03-authentication-and-session-management.md](./03-authentication-and-session-management.md) |

A full ranked list with one-line summaries is in [21-remediation-roadmap.md](./21-remediation-roadmap.md). See `23_THIRD_PASS_CODEX_RECONCILIATION/` for the third-pass Codex threat-model reconciliation.

A full ranked list with one-line summaries is in [21-remediation-roadmap.md](./21-remediation-roadmap.md).

---

## OWASP Top 10:2025 Headline Posture

| OWASP 2025 category | Posture | Note |
|---|---|---|
| A01 Broken Access Control | **Mostly compliant** | RLS + server-route guards; gaps in Cross-tenant-data-API risk (API1:2023) |
| A02 Cryptographic Failures | **Mostly compliant** | scrypt, AES-GCM, HMAC, draft-token HMAC; TLS termination at edge (assumed) |
| A03 Injection | **Compliant** | Parameterized SQL (Supabase client + RPC), no string concat; LLM-prompt boundaries documented |
| A04 Insecure Design | **Mostly compliant** | Threat modelling absent in repo; circuit-breaker, rate-limit, CSRF in place |
| A05 Security Misconfiguration | **Mostly compliant** | CSP `next.config.ts`, RLS on all reviewed tables, dev bypass loopback-bound |
| A06 Vulnerable & Outdated Components | **Unknown / partial** | No SCA gate in CI; pinned versions in `package.json` are not auto-updated |
| A07 Identification & Auth Failures | **Mostly compliant** | Supabase auth, OTP/OAuth, cookie `no-store` on public; dev bypass tightened |
| A08 Software & Data Integrity Failures | **Mostly compliant** | Webhook sigs, draft token HMAC; no signed releases; no SBOM |
| A09 Security Logging & Monitoring Failures | **Gap** | Audit tables exist; alerting/forwarding not documented |
| A10 Server-Side Request Forgery | **Compliant** | No user-controlled URL fetch paths identified |

Full mapping → [20](./20-compliance-mapping-owasp-asvs.md) and [11](./11-api-security-owasp-api-top10.md).

---

## What is **not** in scope of this audit

- Production host hardening, container image CVEs, network ACLs
- Supabase project configuration (Auth providers, MFA policy, RLS bypass via `postgres` role)
- Vercel / edge runtime configuration beyond `next.config.ts` and `src/proxy.ts`
- DeepSeek provider-side controls
- Mobile/native clients (none observed)
- Third-party penetration test results (none on file)

These are flagged in [21-remediation-roadmap.md](./21-remediation-roadmap.md) for follow-up.

---

## Reading order

1. [01-scope-and-methodology.md](./01-scope-and-methodology.md)
2. [02-architecture-and-trust-boundaries.md](./02-architecture-and-trust-boundaries.md)
3. Per-domain docs (03–18)
4. [20-compliance-mapping-owasp-asvs.md](./20-compliance-mapping-owasp-asvs.md)
5. [21-remediation-roadmap.md](./21-remediation-roadmap.md)
