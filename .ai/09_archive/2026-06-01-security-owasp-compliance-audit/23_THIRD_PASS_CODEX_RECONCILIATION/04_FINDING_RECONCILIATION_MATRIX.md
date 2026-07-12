# 04 — Finding Reconciliation Matrix

Each Codex claim is mapped to the existing first-pass or second-pass finding that already covers it. When an existing finding fully covers the Codex claim, the third pass restates it. When the Codex claim is new, it is recorded as SEC-20260601-3P-### in `06_FALSE_NEGATIVES_FROM_CODEX.md`. When the Codex claim is rejected, it is recorded in `05_FALSE_POSITIVES_FROM_CODEX.md`.

| Codex # | Codex claim | Existing finding | Third-pass action |
|---|---|---|---|
| 1 | Cross-tenant data exposure on missing `WHERE workspace_id = $1` | F-AUTHZ-01 (RLS primary defense), F-INJ-01 (no raw SQL) | Restate as SEC-20260601-3P-010 |
| 2 | SUPABASE_SERVICE_ROLE_KEY leak = full DB compromise | F-CRYPTO-04, F-LOG-03 | Restate (no change) |
| 3 | AI package-builder apply path could be coerced cross-tenant | F-AI-01 (HMAC draft token), F-AI-02 (audit), F-AUTHZ-02 | Reject — see SEC-20260601-3P-020 |
| 4 | Resend client placeholder default key | F-CRYPTO-06, F-WEB-03 | New — SEC-20260601-3P-004 (downgraded from Medium to Low) |
| 5 | DeepSeek API key no rotation policy | F-AI-07, F-CRYPTO-04 | Restate (Low — operational) |
| 6 | `node-cron` background job may run with no rate limit | (not in 1P/2P) | Reject — no `node-cron` in package.json |
| 7 | Webhook replay protection | F-WEB-05, F-WEB-06 | Restate (Low — evidence gap) |
| 8 | `/api/*` proxy short-circuit | (not in 1P/2P) | New — SEC-20260601-3P-003 (Medium) |
| 9 | Per-tenant AI spend caps missing | F-RL-07, F-AI-07 | Restate (Low — hardening) |
| 10 | `localStorage` comment text XSS | F-INPUT-06, F-DATA-03 | Reject — uses `sessionStorage`; values not rendered as HTML |
| 11 | CSP `'unsafe-inline'` and `'unsafe-eval'` on landing | F-SHARE-12, F-ERR-05 | New — SEC-20260601-3P-016 (Low — landing only) |
| 12 | CI has no SAST/SCA/secret-scanning | F-CI-02, F-CI-03, F-CI-04 (consolidated in 2P) | Restate (High) |
| 13 | CI no `permissions:` block | F-CI-01 (consolidated) | Restate (High) |
| 14 | `bun.lock` integrity not verified in CI | (mentioned in 2P 10) | Reject — `--frozen-lockfile` IS used |
| 15 | Share token uses AES-256-GCM + HMAC-SHA256 | F-CRYPTO-01, F-SHARE-01 | Restate (Informational — strength) |
| 16 | Share access cookie `Secure` not verifiable in code | EG-03 (2P) | New — EG-20260601-3P-001 (evidence gap, Medium impact) |
| 17 | Share password hash uses scrypt | F-CRYPTO-02, F-SHARE-02 | Restate (Informational — strength) |
| 18 | Password-attempt counter not tampered by anon | F-RL-01, F-SHARE-09 | Restate (Informational — strength) |
| 19 | Publish route SECURITY DEFINER without `search_path` | F-INJ-02, F-SHARE (strength) | Reject — every SECURITY DEFINER sets `search_path` |
| 20 | Collaboration invite RPCs SECURITY DEFINER could be exploited | F-INV-03, F-INV-04, F-INV-05, F-INV-08 | Restate (Informational — defense verified) |
| 21 | `dangerouslySetInnerHTML` for Clarity | (corrected in 2P) | New — SEC-20260601-3P-005 (Low — controlled) |
| 22 | XLSX formula injection | F-INJ-06, F-INPUT-04 | Restate (Low) |
| 23 | XLSX filename sanitized | F-INPUT-04 | Restate (Informational — strength) |
| 24 | Webhook signature verified via Svix | F-WEB-01, F-CRYPTO-05 | Restate (Informational — strength) |
| 25 | Webhook missing secret returns 503 | F-WEB-02 | Restate (Informational — strength) |
| 26 | AI auth rejects admin-DB | F-AUTH-05, F-AI-08 | Restate (Informational — strength) |
| 27 | AI auth allows dev-bypass with synthetic user | F-AUTH-01, F-AUTH-03 | Restate (Informational — design) |
| 28 | Dev bypass triple-gated | F-AUTH-01 | Restate (Informational — strength) |
| 29 | Redirect sanitizer helpers | F-AUTH-02, F-INPUT-03 | Restate (Informational — strength) |
| 30 | Supabase client versions | F-SC-09 | Restate (Informational) |
| 31 | Next.js version non-standard | F-SC-10 | Restate (Informational) |
| 32 | CSP enforced on share | F-SHARE-11 | Restate (Informational — strength) |
| 33 | CSP Report-Only on landing | F-ERR-05 | Restate (Informational — design) |
| 34 | CSP `frame-ancestors 'none'` | F-SHARE-12 | Restate (Informational — verified) |
| 35 | HSTS header missing | (mentioned in 2P 08) | Restate (R-19) |
| 36 | Durable rate-limit table service-role-only | F-RL-01 | Restate (Informational — strength) |
| 37 | AI endpoints no rate limit | F-RL-04 | New — SEC-20260601-3P-002 (Medium) |
| 38 | Invite routes rate-limited | F-RL-08 | Restate (Informational — strength) |
| 39 | Share routes `no-store` | F-SHARE-08, F-ERR-02 | Restate (Informational — strength) |
| 40 | Share routes `assertSameOriginPublicPost` | F-SHARE-05, F-API6-01 | Restate (Informational — strength) |
| 41 | Production readiness `Partially compliant` | 2P `11_FINAL_SECURITY_POSTURE_RESTATEMENT.md` | New — SEC-20260601-3P-018 (formal gate) |

## Summary

- **Restated (no new finding needed):** 27
- **New third-pass findings (SEC-20260601-3P-###):** 9
- **Rejected (Codex claim not supported):** 5
- **Total Codex claims reconciled:** 41
