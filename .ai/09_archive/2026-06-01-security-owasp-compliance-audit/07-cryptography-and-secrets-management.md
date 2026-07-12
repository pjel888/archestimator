# 07 — Cryptography and Secrets Management

## Findings

### F-CRYPTO-01 — Shared-link token uses HMAC-SHA256 + AES-256-GCM

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `src/lib/publication/security.ts` — token hashing via HMAC-SHA256 with secret, encryption via AES-256-GCM
- **Strength:** Authenticated encryption; nonce stored with ciphertext
- **CWE:** CWE-327
- **OWASP 2025:** A02
- **ASVS 5.0:** V6.2

### F-CRYPTO-02 — Password hashing uses scrypt

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `src/lib/publication/security.ts` — scrypt for password hashing
- **Strength:** Memory-hard, tunable cost; salt per hash
- **CWE:** CWE-916
- **ASVS 5.0:** V6.4

### F-CRYPTO-03 — AI draft token is HMAC-SHA256 with 30-min TTL

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `src/lib/ai/package-builder/draft-token.ts`, `20260528003000_ai_package_builder_apply_rpc.sql`
- **Strength:** Server-signed token, short-lived, idempotency check in RPC
- **CWE:** CWE-330
- **ASVS 5.0:** V6.2, V3.3

### F-CRYPTO-04 — Env contract is server-only for privileged keys

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `.env.example` lists `SUPABASE_SERVICE_ROLE_KEY`, `DEEPSEEK_API_KEY`, `RESEND_API_KEY`, `ARCHESTIMATOR_INVITE_TOKEN_PEPPER`, `AI_PACKAGE_BUILDER_DRAFT_SIGNING_SECRET`, `RESEND_WEBHOOK_SECRET` — all server-only. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public.
- **Recommendation:** Confirm Vercel env-var scoping (Production vs Preview) for these secrets and that preview deploys do not use production keys.
- **CWE:** CWE-522
- **OWASP 2025:** A02
- **ASVS 5.0:** V14.1, V14.3

### F-CRYPTO-05 — Resend webhook signature verification

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `src/lib/email/resend-webhooks.ts` + `src/app/api/webhooks/resend/route.ts` — Svix signature, `RESEND_WEBHOOK_SECRET`
- **CWE:** CWE-345 (insufficient verification of data authenticity)
- **OWASP 2025:** A08
- **ASVS 5.0:** V6.5

### F-CRYPTO-06 — Resend client constructor uses placeholder default

- **Severity:** Low (downgraded from Medium in third pass — see `23_THIRD_PASS_CODEX_RECONCILIATION/07_SEVERITY_RECALIBRATION.md`)
- **Likelihood:** Low (current handler passes real key; route returns 503 when `RESEND_API_KEY` is missing)
- **Impact:** Low (drift risk only; placeholder string is never used to actually send email in production because the route handler fails closed)
- **Evidence:** `src/lib/email/resend-webhooks.ts` constructs `new Resend("re_webhook_verifier")` as default — at first read this looks like a stringly-typed stub rather than a real key. The handler explicitly passes the env key on call; defence in depth is preserved. The route handler at `src/app/api/webhooks/resend/route.ts` returns 503 when `RESEND_API_KEY` is missing, so the placeholder string is never used to send email in production.
- **Recommendation:** Replace the placeholder default with an explicit null/empty check in the `Resend` constructor call, or lazily instantiate the client only when `RESEND_API_KEY` is present. (R-16, R-3P-03)
- **CWE:** CWE-1188 (insecure default), CWE-547
- **OWASP 2025:** A05
- **ASVS 5.0:** V14.1
- **Third-pass restatement:** See SEC-20260601-3P-004 in `23_THIRD_PASS_CODEX_RECONCILIATION/06_FALSE_NEGATIVES_FROM_CODEX.md` and the dedicated `15_WEBHOOK_THREAT_MODEL.md` in the third-pass folder.

### F-CRYPTO-07 — Random ID generation — sources to verify

- **Severity:** Low
- **Likelihood:** Low
- **Impact:** Medium
- **Evidence:** Reviewed code uses Node `crypto` for token generation (good). No `Math.random()` for security purposes observed in the reviewed files.
- **Recommendation:** Add a code-search regression test that forbids `Math.random()` in `src/lib/publication/` and `src/lib/ai/`. (R-17)
- **CWE:** CWE-330
- **ASVS 5.0:** V6.3

### F-CRYPTO-08 — Invite entry pepper is empty by design

- **Severity:** Informational
- **Evidence:** `.env.example` sets `ARCHESTIMATOR_INVITE_TOKEN_PEPPER=` and `PROJECT_INVITE_ENTRY_ENABLED=false`; the system is fail-closed.
- **Strength:** Even if a migration is later applied that stores invite hashes, the absent pepper prevents real production use.
- **Recommendation:** Add a runtime assertion in `getInviteEntryConfig` that throws if `pepper` is empty AND `enabled` is true. (R-18)
- **CWE:** CWE-321
- **OWASP 2025:** A02
- **ASVS 5.0:** V6.2

## TLS

- **Posture:** TLS termination at Vercel edge (assumed; not in code)
- **Recommendation:** Confirm HSTS header in `next.config.ts` headers config and `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` for production. (R-19)

## Recommendations (numbered)

- R-16: Remove placeholder default in `Resend` constructor
- R-17: Forbid `Math.random()` in security-sensitive paths
- R-18: Runtime assertion in invite entry config
- R-19: HSTS header in `next.config.ts`
