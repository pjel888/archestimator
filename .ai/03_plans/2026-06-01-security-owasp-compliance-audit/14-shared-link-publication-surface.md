# 14 — Shared-Link / Publication Surface

## Findings

### F-SHARE-01 — Token cryptography is correct (HMAC + AES-GCM)

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `src/lib/publication/security.ts` — HMAC-SHA256 hashing, AES-256-GCM encryption
- **CWE:** CWE-327
- **OWASP 2025:** A02
- **OWASP API 2023:** API1
- **ASVS 5.0:** V6.2

### F-SHARE-02 — Optional password uses scrypt

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `src/lib/publication/security.ts` — scrypt for password hashing
- **CWE:** CWE-916
- **ASVS 5.0:** V6.4

### F-SHARE-03 — 24-hour HttpOnly access cookie

- **Severity:** Informational (control)
- **Status:** Mostly compliant
- **Evidence:** `src/lib/publication/security.ts` — 24h access cookie
- **Recommendation:** Confirm `Secure` in production; review cookie path scope. (R-03)
- **CWE:** CWE-613
- **ASVS 5.0:** V3.3

### F-SHARE-04 — Public read via service-role public-repository

- **Severity:** Low
- **Likelihood:** Low
- **Impact:** Medium
- **Evidence:** `src/lib/publication/public-repository.ts` — service-role client is used to look up the publication row, then perform authorisation in code (token + optional password)
- **Compensating control:** the application is the only path that may call the public-repository; the public route handlers are the only callers
- **Recommendation:** Add a defensive check in `public-repository.ts` to refuse calls when called outside a request context. (R-51)
- **CWE:** CWE-269
- **OWASP 2025:** A01
- **ASVS 5.0:** V4.1

### F-SHARE-05 — CSRF defense — `assertSameOriginPublicPost`

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** All public POST handlers invoke `assertSameOriginPublicPost`
- **CWE:** CWE-352
- **OWASP 2025:** A04
- **OWASP API 2023:** API6
- **ASVS 5.0:** V4.2

### F-SHARE-06 — Rate limits and durable rate-limit events

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `security_rate_limit_events` table; in-memory LRU for hot path
- **CWE:** CWE-770
- **OWASP API 2023:** API4
- **ASVS 5.0:** V11.1

### F-SHARE-07 — Comment circuit-breaker

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `src/app/api/share/[token]/comment/route.ts` — 5xx-rate circuit-breaker
- **CWE:** CWE-400
- **OWASP 2025:** A04

### F-SHARE-08 — `no-store` headers

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** Public route handlers set `no-store`
- **CWE:** CWE-525
- **OWASP 2025:** A05
- **ASVS 5.0:** V3.4

### F-SHARE-09 — Password-attempt events are durable and table-scoped

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `20260531010000_project_publication_password_attempt_event.sql`
- **CWE:** CWE-799
- **OWASP 2025:** A09
- **OWASP API 2023:** API4
- **ASVS 5.0:** V8.1

### F-SHARE-10 — Recipient unsubscribe + delivery webhooks

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `src/app/api/share/[token]/unsubscribe/route.ts`, `20260531175141_shared_link_recipient_unsubscribe.sql`, `20260601011500_resend_shared_link_delivery_webhooks.sql`
- **Strength:** Recipients can opt out; delivery events are recorded
- **CWE:** CWE-359
- **OWASP 2025:** A01

### F-SHARE-11 — CSP is enforced on share routes

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `next.config.ts` — `next.config.ts` `headers()` block enforces CSP on `/share/:path*` and `/api/share/:path*`
- **CWE:** CWE-693
- **OWASP 2025:** A05
- **ASVS 5.0:** V14.4

### F-SHARE-12 — `frame-ancestors` / clickjacking

- **Severity:** Informational (control — verified present)
- **Evidence:** CSP in `next.config.ts` includes `frame-ancestors 'none'` in the base source list (line 9). Verified by test `project-publication-security-headers.test.ts` line 13: `expect(csp).toContain("frame-ancestors 'none'")`. The share surface is protected against clickjacking.
- **CWE:** CWE-1021 (defended)
- **OWASP 2025:** A04
- **ASVS 5.0:** V14.4

### F-SHARE-13 — Token rotation / revocation

- **Severity:** Medium
- **Likelihood:** Medium
- **Impact:** High
- **Evidence:** No "rotate token" or explicit expiry enforcement observed; revocation flow not enumerated
- **Recommendation:** Document and test the revocation + rotation path. (R-23)
- **CWE:** CWE-613, CWE-200
- **OWASP 2025:** A01

## Recommendations

- R-03: `Secure` cookie attribute in production
- R-23: Token rotation / expiry
- R-51: Public-repository context check
- R-52: `frame-ancestors 'none'` in share CSP
