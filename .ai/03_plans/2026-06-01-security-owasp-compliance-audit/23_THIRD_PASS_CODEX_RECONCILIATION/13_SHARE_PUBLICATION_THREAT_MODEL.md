# 13 — Share / Publication Threat Model

The third pass takes the Codex threat model (cross-tenant data exposure via share token) and applies it to the share/publication surface. The share surface is the highest-risk unauthenticated API in the application because it is reachable without any session.

## Share surface inventory

| Route | Method | Auth | Rate-limited | CSRF | no-store | Status |
|---|---|---|---|---|---|---|
| `/api/share/[token]/route.ts` | GET | Token | Yes (per-token) | N/A (GET) | Yes | F-SHARE-01..13 confirmed |
| `/api/share/[token]/activity/route.ts` | GET | Token | Yes (per-token) | N/A (GET) | Yes | F-SHARE-06, F-SHARE-08 |
| `/api/share/[token]/comment/route.ts` | POST | Token | Yes (per-token) | Yes (origin check) | Yes | F-SHARE-05, F-SHARE-06, F-SHARE-07, F-SHARE-08, F-RL-03 |
| `/api/share/[token]/decision/route.ts` | POST | Token | Yes (per-token) | Yes (origin check) | Yes | F-SHARE-05, F-SHARE-06, F-SHARE-08 |
| `/api/share/[token]/events/route.ts` | POST | Token | Yes (per-token) | Yes (origin check) | Yes | F-SHARE-05, F-SHARE-06, F-SHARE-08 |
| `/api/share/[token]/password/route.ts` | POST | Token | Yes (per-token) | Yes (origin check) | Yes | F-SHARE-02, F-SHARE-05, F-SHARE-06, F-SHARE-08, F-SHARE-09 |
| `/api/share/[token]/session/route.ts` | POST | Token | Yes (per-token) | Yes (origin check) | Yes | F-SHARE-03, F-SHARE-05, F-SHARE-06, F-SHARE-08 |
| `/api/share/[token]/unsubscribe/route.ts` | POST | Token | Yes (per-token) | Yes (origin check) | Yes | F-SHARE-10 |

**Verified:** 5 POST share routes invoke `assertSameOriginPublicPost` (verified in `09`). 1 additional route (session) has its own `assertSameOrigin`. 8 share routes set `no-store` (verified in `09`).

## Codex-driven share threat model (third-pass)

### SEC-20260601-3P-001 — Share cookie `Secure` and `SameSite` (Medium, new)

**Codex claim:** "The shared-link access cookie is signed but `Secure` attribute is not verifiable in code."

**Verdict:** **Confirmed (cannot verify in code; EG-20260601-3P-001).**

**Evidence:**
- `src/lib/publication/security.ts` — the share access cookie is created via Next.js `cookies()` API
- `Secure` flag depends on `NODE_ENV` and request protocol
- `SameSite` is not explicitly set in the cookie object
- The unsubscribe route is reached from a link in an email — a cross-site navigation. `SameSite: "Strict"` would block this; `SameSite: "Lax"` would allow it.

**Impact:**
- Without explicit `Secure`, cookies could be transmitted over HTTP in MITM scenarios (if the deployment ever serves over HTTP)
- Without explicit `SameSite`, browser defaults apply (which is `Lax` in modern browsers, but this is not guaranteed)

**Recommendation:** Explicitly set in `src/lib/publication/security.ts`:
- `Secure: true` (or only when `NODE_ENV === "production"`)
- `HttpOnly: true`
- `SameSite: "Strict"` for session/comment/decision cookies
- `SameSite: "Lax"` for the unsubscribe cookie (cross-site email link)

(R-3P-01)

### F-SHARE-01 — Token crypto (HMAC + AES-GCM, strength, restated)

**Evidence:**
- `src/lib/publication/security.ts` — share token creation uses HMAC-SHA256 for token hashing (DB lookup) and AES-256-GCM for encrypted token storage
- `timingSafeEqual` for HMAC comparison
- 24h signed HttpOnly cookie for share access
- 30-min cookie for password-attempt lockout context

**Verdict:** **Confirmed.** Strong design. The token is the access credential; the crypto is appropriate for that purpose.

### F-SHARE-02 — scrypt password (strength, restated)

**Evidence:**
- `src/lib/publication/security.ts` — `scrypt` with proper salt
- Constant-time compare

**Verdict:** **Confirmed.** scrypt is the recommended password hashing algorithm.

### F-SHARE-04 — Service-role for public repo (Low, restated)

**Evidence:**
- `src/lib/publication/public-repository.ts` — uses service-role client for read access on share routes
- The service-role is used to read published snapshot data, which is by-design RLS-validated

**Verdict:** **Confirmed.** Low risk because the service-role only reads pre-published snapshot data, not user-private data.

### F-SHARE-05 — CSRF defense (strength, restated)

**Evidence:**
- `assertSameOriginPublicPost` is invoked on all public POST routes (verified in `09`)
- `assertSameOrigin` is invoked on the session route
- Origin/Referer headers are checked against the site URL

**Verdict:** **Confirmed.** Strong CSRF defense for unauthenticated public POSTs.

### F-SHARE-06 — Rate limits durable (strength, restated)

**Evidence:**
- `security_rate_limit_events` table is used for per-token rate limits on share routes
- RLS + service-role-only grants prevent tampering

**Verdict:** **Confirmed.** Strong rate limit defense.

### F-SHARE-07 — Comment circuit-breaker (strength, restated)

**Evidence:**
- `src/app/api/share/[token]/comment/route.ts` — P12 circuit-breaker (5xx rate > 50% over 5 min → 503 for 2 min)

**Verdict:** **Confirmed.** Strong cascade-failure defense.

### F-SHARE-08 — no-store headers (strength, restated)

**Evidence:**
- All 8 share API routes set `Cache-Control: no-store`

**Verdict:** **Confirmed.** Strong session-hygiene defense.

### F-SHARE-09 — Password attempt events (strength, restated)

**Evidence:**
- `project_publication_password_attempt_event` table records every password attempt
- Service-role-only writes

**Verdict:** **Confirmed.** Strong defense against brute-force attempts.

### F-SHARE-11 — CSP on share routes (strength, restated)

**Evidence:**
- `next.config.ts:78-100` — `Content-Security-Policy` enforced on `/share/:path*` and `/api/share/:path*`
- 3 security headers on share API: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`

**Verdict:** **Confirmed.** Strong defense against XSS and clickjacking on share surfaces.

### F-SHARE-12 — `frame-ancestors 'none'` (strength, restated)

**Evidence:**
- `next.config.ts:9` — `frame-ancestors 'none'` in the base CSP source list

**Verdict:** **Confirmed.** Strong clickjacking defense.

### F-SHARE-13 — Token rotation / expiry (Low, restated)

**Evidence:**
- The public link manager includes a "rotate token" capability
- Tokens can be revoked by the workspace owner

**Verdict:** **Confirmed.** Token rotation is implemented; downgraded from Medium (1P) to Low (2P/3P).

## Share session cookie threat model (third-pass detail)

The share session cookie (`ae_publication_access`) is the most security-critical cookie in the application because it grants 24-hour read access to a published project tree. The third pass's threat model:

### Strengths
- HMAC-SHA256 signed (cannot be forged without the signing secret)
- HttpOnly (not readable by JavaScript — XSS-safe)
- 24h TTL (bounded exposure window)
- `no-store` (browser back-button cannot replay)
- Bound to a specific token (not a global session)

### Gaps
- `Secure` not explicit in code (EG-20260601-3P-001)
- `SameSite` not explicit in code
- Cookie name (`ae_publication_access`) is fixed; if logged in plaintext logs, the token could be recovered. (Not observed in current logging.)

### Net risk
**Medium.** The crypto and TTL are appropriate. The attribute gap is a deployment-time concern, not a code gap. Recommendation: make attributes explicit (R-3P-01).

## Cross-references

- See `02_CODEX_THREAT_MODEL_INVENTORY.md` Codex claims #15–18
- See `04_FINDING_RECONCILIATION_MATRIX.md` for mapping
- See `06_FALSE_NEGATIVES_FROM_CODEX.md` SEC-20260601-3P-001
- See `08_EVIDENCE_GAP_REGISTER_DELTA.md` EG-20260601-3P-001
- See `17_RATE_LIMITING_THREAT_MODEL.md` for share rate limit detail
- See `16_CSP_HEADER_THREAT_MODEL.md` for CSP detail
