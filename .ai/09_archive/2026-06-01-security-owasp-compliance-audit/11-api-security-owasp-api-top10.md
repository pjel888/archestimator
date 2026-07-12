# 11 — API Security (OWASP API Security Top 10:2023)

## API1:2023 — Broken Object Level Authorization (BOLA)

### F-API1-01 — RLS is the primary defense

- **Severity:** Informational (control)
- **Status:** Mostly compliant
- **Evidence:** RLS policies in `supabase/migrations/` scope by workspace / invitation. Repository functions (`src/lib/repositories/workspace-repository.ts`) rely on RLS for tenant isolation.
- **Residual risk:** any code path that uses service-role bypasses RLS. The service-role consumption points are inventoried in [02](./02-architecture-and-trust-boundaries.md).
- **Recommendation:** Add a regression test that confirms `getProjectEstimateTreeByEstimate` and similar functions are not reachable with a service-role client. (R-36)
- **CWE:** CWE-639
- **ASVS 5.0:** V4.1

### F-API1-02 — Share-route public access

- **Severity:** Medium
- **Likelihood:** Low
- **Impact:** High
- **Evidence:** Public share routes accept a token; if the token is leaked, anyone holding it has read access
- **Compensating control:** HMAC + AES-GCM token, password (optional), rate limits
- **Recommendation:** See [14](./14-shared-link-publication-surface.md)
- **CWE:** CWE-285

## API2:2023 — Broken Authentication

- Covered in [03](./03-authentication-and-session-management.md)
- **Status:** Mostly compliant

## API3:2023 — Broken Object Property Level Authorization (BOPLA)

### F-API3-01 — Public share `/comment` and `/decision` endpoints

- **Severity:** Low
- **Likelihood:** Low
- **Impact:** Medium (excess properties returned in JSON could leak internal fields)
- **Evidence:** Response shape was not enumerated in full; if a handler returns `select('*')`, internal fields (e.g., `created_by`, `audit_id`) could be exposed
- **Recommendation:** Audit the response shape of every public route; use explicit `select` lists. (R-37)
- **CWE:** CWE-213
- **ASVS 5.0:** V4.1

## API4:2023 — Unrestricted Resource Consumption

- Covered in [09](./09-rate-limiting-and-dos-resilience.md)
- **Status:** Partial — durable rate limit exists; AI endpoints under-protected (F-RL-04)

## API5:2023 — Broken Function Level Authorization

### F-API5-01 — Public routes are explicit; admin routes are not enumerated

- **Severity:** Low
- **Likelihood:** Low
- **Impact:** Medium
- **Evidence:** Reviewed route handlers are public or user-scoped; no clear "admin" surface observed in `src/app/api/`. `src/proxy.ts` wall protects `/app/*`.
- **Recommendation:** If an admin surface is added (e.g., `/api/admin/*`), add a dedicated middleware gate. (R-38)
- **CWE:** CWE-285
- **ASVS 5.0:** V4.2

## API6:2023 — Unrestricted Access to Sensitive Business Flows

### F-API6-01 — Public share flows are CSRF + rate-limited

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `assertSameOriginPublicPost` on every public POST, durable + in-memory rate limits
- **CWE:** CWE-352 (CSRF) — defended

### F-API6-02 — AI apply flow

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** HMAC-signed draft token, 30-min TTL, idempotency, SECURITY DEFINER RPC with workspace authorization cross-check
- **CWE:** CWE-285, CWE-863

## API7:2023 — Server Side Request Forgery (SSRF)

- Covered in [06](./06-injection-and-template-vulnerabilities.md) F-INJ-04
- **Status:** No finding

## API8:2023 — Security Misconfiguration

### F-API8-01 — Security headers via `next.config.ts`

- **Severity:** Informational (control)
- **Status:** Mostly compliant
- **Evidence:** `next.config.ts` sets CSP per-route — landing uses Report-Only, share routes use enforced CSP
- **Recommendation:** Confirm HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy are present. (R-19, R-39)
- **CWE:** CWE-693
- **ASVS 5.0:** V14.4

### F-API8-02 — Error responses are sanitised

- **Severity:** Informational
- **Evidence:** Spot-checked route handlers return JSON `{ error: "..." }` without stack traces
- **CWE:** CWE-209
- **ASVS 5.0:** V7.4

## API9:2023 — Improper Inventory Management

### F-API9-01 — API surface not formally documented

- **Severity:** Medium
- **Likelihood:** Medium
- **Impact:** Low
- **Evidence:** No OpenAPI / Zodios / route inventory doc observed
- **Recommendation:** Generate an OpenAPI doc from Zod schemas (R-08 enabler). (R-40)
- **CWE:** CWE-1059
- **ASVS 5.0:** V1.1

### F-API9-02 — Uncommitted working-tree changes

- **Severity:** Informational
- **Evidence:** 3 modified files at audit time, not enumerated
- **Recommendation:** Always run audits against a clean tree or explicitly enumerate modified files. (R-41)

## API10:2023 — Unsafe Consumption of APIs

### F-API10-01 — DeepSeek response handling

- **Severity:** Low
- **Likelihood:** Medium
- **Impact:** Medium (LLM may include prompt-injected text in tool-call payloads)
- **Evidence:** `src/lib/ai/deepseek.ts` returns parsed JSON; downstream code uses the result
- **Recommendation:** Treat all LLM output as untrusted; validate before any state change. (R-12)
- **CWE:** CWE-345
- **OWASP 2025:** A08
- **ASVS 5.0:** V6.5

### F-API10-02 — Resend response handling

- **Severity:** Low
- **Likelihood:** Low
- **Impact:** Low
- **Evidence:** Webhook handler in `src/app/api/webhooks/resend/route.ts` only verifies signature and reads specific fields
- **CWE:** CWE-345

## Recommendations

- R-36: Service-role consumption guard test
- R-37: Explicit `select` lists
- R-38: Admin surface gate (precautionary)
- R-39: Standard security headers
- R-40: OpenAPI doc
- R-41: Clean tree for audits
