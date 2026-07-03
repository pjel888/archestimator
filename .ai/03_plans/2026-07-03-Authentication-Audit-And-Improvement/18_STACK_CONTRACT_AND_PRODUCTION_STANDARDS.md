# 18 - Stack Contract And Production Standards

## Stack Contract

| Layer | Contract |
|---|---|
| Next.js | Use local Next.js 16 docs before changing routing/proxy/route-handler behavior. Middleware is now documented as Proxy. |
| React | Keep server/client boundaries deliberate; secrets and server data stay server-side. |
| Better Auth | Use official docs and installed types for provider prompt, session, cookie, CSRF, and state strategy behavior. |
| Cloudflare Workers/OpenNext | Do not assume Node server process semantics. Module globals are not durable. |
| D1 | No RLS fallback; object authorization belongs in app SQL/repository/server action layers. |
| Durable Objects | Use for singleton coordination only with persisted important state. |
| R2/assets/email/webhooks | Verify signatures/scopes/redaction; do not treat provider encryption as authorization. |

## Standards Baseline

| Standard/source | Contract for this work |
|---|---|
| OWASP ASVS 5.0.0 | Use as the auth/session/access-control verification backlog. Pin requirement versions where implementation work expands. |
| OWASP Authentication Cheat Sheet | Account recovery, reauth, session invalidation, and throttling must be deliberate. |
| OWASP Session Management Cheat Sheet | Session IDs must be meaningless, protected, invalidated, rotated/renewed by policy, and server-controlled. |
| OWASP CSRF Cheat Sheet | State-changing browser routes need CSRF/origin/SameSite posture appropriate to auth context. |
| OWASP OAuth2 Cheat Sheet / OIDC Core | OAuth state, prompt, issuer, PKCE/code-flow assumptions must be checked against provider/library behavior. |
| OWASP API Security Top 10 2023 | Object-level, property-level, function-level auth and resource consumption are central risks. |
| NIST SP 800-63-4 / 63B-4 | Use for session lifetime, reauth, authenticator lifecycle, and assurance-tier decisions. |
| GDPR / EDPB | Minimize personal data, define retention and DSAR workflows, and prepare breach notification procedures where applicable. |
| Cloudflare Workers best practices | `waitUntil` is not for response-critical auth work; avoid global state for critical security decisions. |
| Better Auth security docs | Keep CSRF/origin/fetch metadata protections enabled unless there is a documented, tested exception. |

## Production Bar

Before production auth-hardening claims:
1. P0/P1 risks closed or explicitly accepted by owner.
2. Auth/session/authz tests pass.
3. Provider/browser claims have real proof.
4. Evidence artifacts pass redaction review.
5. Provider leftovers classified and cleaned or documented.
6. Retention/DSAR/breach response rules exist for auth artifacts.

## Source Links

Full source list and review evidence are maintained in `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md`.
