# Security Safeguards and Privacy Engineering

## Current-state grounding (confirmed controls)

- **Token cryptography** — publication/portal tokens are 256-bit random, HMAC-hashed at rest,
  AES-256-GCM encrypted (`src/lib/publication/security.ts`). Passwords use scrypt
  (`scrypt-sha256-v1`) with constant-time verify.
- **IP/UA hashing** — HMAC-SHA-256 keyed by `AUTH_AUDIT_HASH_PEPPER`
  (`src/lib/auth/account-audit.ts:38,51`) and `ARCHESTIMATOR_TELEMETRY_HASH_PEPPER`
  (`src/lib/publication/public-repository.ts`). Bare SHA-256 is explicitly forbidden (SEC-02).
- **Magic-link tokens stored hashed** — `storeToken: "hashed"` (SEC-1,
  `better-auth-cloudflare.ts:266`).
- **OAuth hardening** — `disableImplicitLinking`, `requireLocalEmailVerified`,
  `allowDifferentEmails: false`, `trustedProviders: ["google"]`
  (`better-auth-cloudflare.ts:188-197`) — SEC-14/DEC-7 anti-ATO.
- **CSRF** — admin mutations require strict same-origin (`src/lib/admin/require-admin.ts:36`);
  publication mutations require origin + `x-archestimator-csrf` header + cookie
  (`security.ts:374`). See `.ai/10_state/compliance/csrf-coverage.md`.
- **Cookie safety** — publication access cookies are HttpOnly, SameSite=Lax, Secure in prod,
  HMAC-signed, credential-versioned.
- **Admin gate** — `requireAdminContext` / `assertAdminApiAccess`
  (`src/lib/admin/require-admin.ts`); platform-admin role required.
- **Rate limiting** — D1-backed auth rate limit (60/60s), magic-link (10/60s)
  (`better-auth-cloudflare.ts:205-211`); `security_rate_limit_events` (`0006`).
- **Content security policy** — see `.ai/10_state/compliance/csp-decision-brief.md`.
- **File scanning** — ClamAV when reachable, policy-scanner fallback; see
  `.ai/10_state/compliance/file-scanner-status.md`.

## Confirmed gaps (require remediation)

### Identity and access

- **SEC-11 — raw session tokens in D1.** Better Auth 1.6.23 stores `session.token` raw
  (`better-auth-cloudflare.ts:24,198`). No hash config exists. Compensating controls
  (cookieCache off, 7d TTL, least-privilege binding) are documented but do not close the
  data-minimization gap. **P0 before beta.**
- **No MFA/2FA** for any account, including admin. Gap for DPA "reasonable security."
- **No session-revocation / logout audit event** in the `AccountSecurityEventType` enum
  (`src/lib/auth/account-data.ts:108-118`).
- **OAuth tokens plaintext at rest** in Better Auth `account` table (`accessToken`,
  `refreshToken`, `idToken`, `password` columns).
- **Legacy SHA-256 audit digests** still present in `account_security_events`; HMAC rotation
  incomplete (`account-audit.ts:59-62`).

### Data

- **Plaintext emails at rest** in D1 for `profiles`, `collaboration_invitations`,
  `shared_link_recipients`, `shared_link_comments.author_email`, `admin_audit_events.actor_email`,
  `beta_feedback_submissions.user_email`, `client_portal_recipients.email_normalized`. Assess
  encryption-at-rest / tokenization against DPA proportionality and breach harm.
- **Backups** — daily D1 backups; erasure does not survive until backup ages out. Must disclose
  in privacy notice and evidence the aging window.

### Logging

Current logging is strong (no secrets, minimized PII, request IDs, security events). Maintain:
no tokens, cookies, passwords, auth headers, full upload contents, or full privacy exports in
logs. Personal identifiers in logs must be minimized, hashed, tokenized, or omitted.

### Application security

Maintain OWASP ASVS-aligned controls: authorization matrix tests; CSRF; XSS; SSRF; secure
file handling; query safety; dependency review; supply-chain; secure headers; abuse/rate-limit.

## Privacy-by-Design Gates

Every feature must answer: can less data be used? can identifiers be pseudonymized? can
retention be shorter? can access be narrower? is public exposure necessary? is collection
expected by the user? can the feature work without cross-customer reuse? can the user control
or reverse the action?

## Known P0 priority

Any plaintext authentication, reset, invitation, or share token must be remediated before beta.
The one acknowledged case is **SEC-11 raw session tokens** — the highest-priority security item
in this pack.
