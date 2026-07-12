# 03 — Authentication and Session Management

## Findings

### F-AUTH-01 — Dev auth bypass is loopback- and flag-gated (control, not a finding)

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:**
  - `src/lib/auth/dev-auth-gate.ts` — `isDevAuthBypassEnabled` requires `NODE_ENV !== "production"` AND `ARCHESTIMATOR_DEV_AUTH_BYPASS=1` AND loopback hostname
  - `src/proxy.ts` — applies the gate before serving `/app/*`
  - `src/lib/auth/dev-auth.ts` — `getDevCurrentUserContext` resolves a profile via service-role when bypass is active
- **Strength:** Triple-gated; loopback check is the strongest of the three because it does not depend on env hygiene
- **Residual risk:** Containerised runtimes must ensure the loopback resolver (`hostname === "127.0.0.1" || hostname === "::1" || hostname === "localhost"`) is meaningful. In Vercel serverless functions, this is moot (no `NODE_ENV=development`).
- **CWE:** CWE-1188 (insecure default initialization) — not present
- **OWASP 2025:** A07
- **ASVS 5.0:** V2.10

### F-AUTH-02 — Next path sanitization is path-traversal aware

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `src/lib/auth/redirects.ts` sanitizes `next=` query param to a same-origin path
- **Strength:** Defends against open-redirect via `//evil.com` and absolute URLs
- **CWE:** CWE-601 (open redirect)
- **OWASP 2025:** A01
- **ASVS 5.0:** V4.2.4

### F-AUTH-03 — `getDevCurrentUserContext` uses service-role key on dev path

- **Severity:** Low
- **Likelihood:** Low (gated by F-AUTH-01 triple gate)
- **Impact:** Medium
- **Evidence:** `src/lib/auth/dev-auth.ts` constructs a service-role client to load a profile when bypass is active
- **Risk:** Service-role key is read into the running process; if logging or telemetry is misconfigured, the key may be exposed
- **Recommendation:** Confirm Vercel log scrubbing is enabled for `SUPABASE_SERVICE_ROLE_KEY` references; confirm no `console.log` of the client object
- **CWE:** CWE-522 (insufficiently protected credentials)
- **OWASP 2025:** A02
- **ASVS 5.0:** V14.3

### F-AUTH-04 — Public shared-link session is a 24h signed cookie

- **Severity:** Low
- **Likelihood:** Low
- **Impact:** Low
- **Evidence:** `src/lib/publication/security.ts` — 24h access cookie
- **Strength:** HttpOnly, scoped to share path; bounded TTL
- **Recommendation:** Confirm `Secure` attribute in production; review the cookie path scope to ensure it does not leak to non-share routes
- **CWE:** CWE-613 (insufficient session expiration)
- **OWASP 2025:** A07
- **ASVS 5.0:** V3.3

### F-AUTH-05 — AI auth path explicitly blocks admin-DB bypass

- **Severity:** Informational (control, defense-in-depth)
- **Status:** Implemented correctly
- **Evidence:** `src/lib/ai/auth.ts` — explicit throw if admin-DB bypass is requested; only `dev-bypass` (no DB) and `supabase` (real session) are allowed
- **Strength:** Prevents accidental service-role escalation in the AI path
- **CWE:** CWE-269 (improper privilege management)
- **OWASP 2025:** A01
- **ASVS 5.0:** V4.1

### F-AUTH-06 — Session resolution never returns null without explicit handling

- **Severity:** Low (engineering hygiene, not security)
- **Evidence:** `src/lib/auth/session.ts`
- **Recommendation:** Run `tsc --noEmit` to confirm all callers handle the `null`/`undefined` return; flagged in [21](./21-remediation-roadmap.md)
- **OWASP 2025:** A04
- **ASVS 5.0:** V4.2

## Controls observed (correctly implemented)

- [x] `getCurrentUser` resolution falls through dev bypass → real session
- [x] OAuth/OTP callback at `src/app/auth/callback/route.ts`
- [x] Login page at `src/app/login/page.tsx` does not perform auth client-side (server-mediated)
- [x] Public shared-link cookie is 24h, HttpOnly
- [x] No password storage in `users` (Supabase Auth owns credentials)

## Controls not observed / not in scope

- [ ] MFA policy — owned by Supabase Auth dashboard, not in repo
- [ ] Password policy — owned by Supabase Auth dashboard
- [ ] Session fixation countermeasures — Supabase Auth default behaviour assumed

## Recommendations

1. **Document the dev-bypass contract in `.ai/10_state/decisions.md`** with the exact env-var and hostname gates, so it cannot drift silently (R-01 in [21](./21-remediation-roadmap.md)).
2. **Add a runtime test** that asserts `isDevAuthBypassEnabled` is `false` in any environment where `NODE_ENV=production` regardless of flag (R-02).
3. **Confirm `Secure` attribute** on the share-access cookie in production builds (R-03).
4. **Confirm CSP in `next.config.ts` includes `frame-ancestors 'none'`** for the share path (already likely via `default-src`/frame block; verify).
