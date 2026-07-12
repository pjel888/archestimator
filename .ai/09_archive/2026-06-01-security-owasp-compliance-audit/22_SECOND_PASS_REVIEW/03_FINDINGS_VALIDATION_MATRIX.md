# 03 — Findings Validation Matrix

Row for every finding identified across the 22 first-pass documents. The first pass did not produce a single `08_FINDINGS_REGISTER.md` — findings are tagged `F-<DOMAIN>-NN` across domain docs. This matrix consolidates all of them.

| Original ID | Title | Orig Severity | 2P Decision | Corr Severity | Evidence | Action |
|---|---|---|---|---|---|---|
| F-AUTH-01 | Dev auth bypass triple-gated | Info | Keep as confirmed | Info | `src/lib/auth/dev-auth-gate.ts`, `src/proxy.ts` | None |
| F-AUTH-02 | Next path sanitization | Info | Keep as confirmed | Info | `src/lib/auth/redirects.ts` | None |
| F-AUTH-03 | Dev bypass uses service-role key | Low | Keep as confirmed | Low | `src/lib/auth/dev-auth.ts` | None |
| F-AUTH-04 | Share session 24h signed cookie | Low | Keep as confirmed | Low | `src/lib/publication/security.ts` | None |
| F-AUTH-05 | AI auth blocks admin-DB | Info | Keep as confirmed | Info | `src/lib/ai/auth.ts` | None |
| F-AUTH-06 | Session null handling | Low | Keep but downgrade | Info | `src/lib/auth/session.ts` | Downgraded — engineering hygiene, not security |
| F-AUTHZ-01 | force RLS inconsistent | Low | Keep as confirmed | Low | Migration review | None |
| F-AUTHZ-02 | AI apply SECURITY DEFINER | Info | Keep as confirmed | Info | `20260528003000_*.sql` | None |
| F-AUTHZ-03 | AI audit trigger SECURITY DEFINER | Info | Keep as confirmed | Info | `20260528120704_*.sql` | None |
| F-AUTHZ-04 | Invite RPC SECURITY DEFINER | Info | Keep as confirmed | Info | `20260601033000_*.sql` | None |
| F-INPUT-01 | No raw SQL | Info | Keep as confirmed | Info | grep verified | None |
| F-INPUT-02 | Zod not used at route boundary | Medium | Keep but downgrade severity | Low | `src/lib/ai/package-builder/schemas.ts` shows extensive custom validation | Downgraded — validation exists, just not Zod |
| F-INPUT-03 | Redirect param sanitized | Info | Keep as confirmed | Info | `src/lib/auth/redirects.ts` | None |
| F-INPUT-04 | XLSX filename header injection | Medium | Keep but downgrade severity | Low | `buildProposalWorkbookFilename` strips to `[a-zA-Z0-9]+` | Verified filename sanitizer exists |
| F-INPUT-05 | Upload filename normalization | Low | Keep as confirmed | Low | Upload routes use auth + magic-byte | None |
| F-INPUT-06 | Comment text XSS | Low | Keep as confirmed | Low | React default escaping applies | None |
| F-INPUT-07 | AI prompt input data leak | Low | Keep as confirmed | Low | `src/lib/ai/deepseek.ts` | None |
| F-INJ-01 | No raw SQL | Info | Keep as confirmed | Info | Supabase client everywhere | None |
| F-INJ-02 | Trigger SECURITY DEFINER scoped | Info | Keep as confirmed | Info | `search_path = public` on all | Added `search_path` hardening |
| F-INJ-03 | No SSTI | Info | Keep as confirmed | Info | No eval/template libs | None |
| F-INJ-04 | No SSRF | Info | Keep as confirmed | Info | Hard-coded provider URLs only | None |
| F-INJ-05 | RSC default escaping | Info | Keep as confirmed | Info | React default behavior | None |
| F-INJ-06 | Excel formula injection | Low | Keep as confirmed | Low | `numFmt` used; source is structured DTO | Verified actual workbook code |
| F-CRYPTO-01 | HMAC + AES-GCM share tokens | Info | Keep as confirmed | Info | `src/lib/publication/security.ts` | None |
| F-CRYPTO-02 | scrypt password hashing | Info | Keep as confirmed | Info | Same file | None |
| F-CRYPTO-03 | AI draft HMAC 30-min TTL | Info | Keep as confirmed | Info | `src/lib/ai/package-builder/draft-token.ts` | None |
| F-CRYPTO-04 | Env contract server-only | Info | Keep as confirmed | Info | `.env.example` | None |
| F-CRYPTO-05 | Resend webhook sig verification | Info | Keep as confirmed | Info | `src/lib/email/resend-webhooks.ts` | None |
| F-CRYPTO-06 | Resend placeholder default | Medium | Keep as confirmed | Medium | `new Resend("re_webhook_verifier")` default | None |
| F-CRYPTO-07 | Random ID sources | Low | Keep as confirmed | Low | Node `crypto` used | None |
| F-CRYPTO-08 | Invite pepper empty by design | Info | Keep as confirmed | Info | Fail-closed | None |
| F-DATA-01 | Data classification | Info | Keep as confirmed | Info | Classification table | None |
| F-DATA-02 | No PII exfiltration paths | Info | Keep as confirmed | Info | Only DeepSeek + Resend outbound | None |
| F-DATA-03 | PII minimization for AI | Low | Keep as confirmed | Low | Server-derived context, not raw PII | None |
| F-DATA-04 | Data deletion gap | Medium | Keep as confirmed | Medium | No deletion API | None |
| F-DATA-05 | Encryption at rest | Info | Keep as reclassified as missing evidence | Info | Supabase provider responsibility | Moved to evidence gap |
| F-DATA-06 | Encryption in transit | Info | Keep as confirmed | Info | HTTPS URLs, Vercel TLS | None |
| F-DATA-07 | Share data exposure | Medium | Keep as confirmed | Medium | Token = access credential by design | None |
| F-DATA-08 | Email addresses in audit | Low | Keep as confirmed | Low | RLS-protected, SECURITY DEFINER | None |
| F-RL-01 | Durable rate-limit table | Info | Keep as confirmed | Info | `security_rate_limit_events` | None |
| F-RL-02 | In-memory + durable limits | Low | Keep as confirmed | Low | Both layers present | None |
| F-RL-03 | Comment circuit-breaker | Info | Keep as confirmed | Info | P12 circuit-breaker | None |
| F-RL-04 | No rate limit on AI endpoints | Medium | Keep as confirmed | Medium | Neither ask nor package-builder routes invoke rate limiters | Verified — actual gap |
| F-RL-05 | DeepSeek 20s timeout | Low | Keep as confirmed | Low | `src/lib/ai/deepseek.ts` | None |
| F-RL-06 | Upload size caps | Info | Keep as confirmed | Info | 12MB image, 20MB attachment | None |
| F-RL-07 | No per-tenant DoS posture | Medium | Keep but reclassify as hardening | Low | Durable rate limiter provides per-token/IP scoping | Downgraded to hardening |
| F-SC-01 | Dependency pinning | Info | Keep as confirmed | Info | `package.json` exact versions | None |
| F-SC-02 | No SCA gate | High | Keep as confirmed | High | CI lacks SCA step | None |
| F-SC-03 | No SAST gate | High | Merge into F-SC-02 | High | Same CI gap category | Merged |
| F-SC-04 | No secret scanning | High | Merge into F-SC-02 | High | Same CI gap category | Merged |
| F-SC-05 | No SBOM | Medium | Keep as confirmed | Medium | No SBOM artifact | None |
| F-SC-06 | Third-party providers | Info | Keep as confirmed | Info | Provider inventory | None |
| F-SC-07 | sharp CVEs | Medium | Keep as confirmed | Medium | sharp used in upload routes | None |
| F-SC-08 | exceljs version | Low | Keep as confirmed | Low | exceljs for XLSX export | None |
| F-SC-09 | Supabase client versions | Info | Keep as confirmed | Info | @supabase/ssr@0.10.3 | None |
| F-SC-10 | next version | Info | Keep as confirmed | Info | next@16.2.6 | None |
| F-API1-01 | RLS primary defense | Info | Keep as confirmed | Info | RLS policies | None |
| F-API1-02 | Share-route public access | Medium | Keep but downgrade | Info | AES-256-GCM token | Design characteristic, not finding |
| F-API3-01 | Response shape BOPLA | Low | Keep as confirmed | Low | Explicit select not verified | None |
| F-API5-01 | Admin surface not enumerated | Low | Keep as confirmed | Low | No admin routes exist | None |
| F-API6-01 | Share flows CSRF + rate-limited | Info | Keep as confirmed | Info | `assertSameOriginPublicPost` on all POSTs | None |
| F-API6-02 | AI apply flow | Info | Keep as confirmed | Info | HMAC-signed token | None |
| F-API8-01 | Security headers | Info | Keep as confirmed | Info | CSP in next.config.ts | None |
| F-API8-02 | Error responses sanitized | Info | Keep as confirmed | Info | JSON error shapes | None |
| F-API9-01 | No API inventory doc | Medium | Keep as confirmed | Low | No OpenAPI doc | Downgraded — documentation gap |
| F-API9-02 | Uncommitted working-tree | Info | Keep as confirmed | Info | 3 modified files | None |
| F-API10-01 | DeepSeek response handling | Low | Keep as confirmed | Low | LLM output treated as untrusted | None |
| F-API10-02 | Resend response handling | Low | Keep as confirmed | Low | Webhook verified | None |
| F-AI-01 | AI apply HMAC token | Info | Keep as confirmed | Info | draft-token.ts + RPC | None |
| F-AI-02 | AI audit tables RLS | Info | Keep as confirmed | Info | SECURITY DEFINER triggers | None |
| F-AI-03 | Hard-coded provider/model | Low | Keep as confirmed | Low | deepseek-v4-flash hard-coded | None |
| F-AI-04 | Feature flags | Info | Keep as confirmed | Info | 6 boolean flags, env-driven | None |
| F-AI-05 | LLM output state-changing | Medium | Keep as confirmed | Medium | Apply path writes to DB | None |
| F-AI-06 | Prompt injection (Ask) | Medium | Keep as confirmed | Medium | Read-only path limits impact | None |
| F-AI-07 | No key rotation policy | Medium | Keep as reclassified as missing evidence | Low | Operational concern, not code gap | Downgraded |
| F-AI-08 | Admin-DB rejection in AI | Info | Keep as confirmed | Info | Explicit throw in auth.ts | None |
| F-AI-09 | Service-role for AI audit | Info | Keep as confirmed | Info | createAiAuditSupabaseClient | None |
| F-UPLOAD-01 | Magic-byte image sniffing | Info | Keep as confirmed | Info | image/jpeg, png, webp, avif | None |
| F-UPLOAD-02 | sharp re-encode | Info | Keep as confirmed | Info | Bounds pixel/max edge | None |
| F-UPLOAD-03 | Size caps | Info | Keep as confirmed | Info | 12MB image, 20MB attachment | None |
| F-UPLOAD-04 | Attachment magic-byte | Info | Keep as confirmed | Info | PDF, XLS, XLSX sniffing | None |
| F-UPLOAD-05 | Service-role for writes | Low | Keep as confirmed | Low | Server-mediated, auth-gated | None |
| F-UPLOAD-06 | Object key path | Medium | Keep but downgrade | Low | Auth-protected routes | Downgraded |
| F-UPLOAD-07 | No AV scanning | Medium | Keep as reclassified as hardening | Low | Attachments not forwarded to clients | Downgraded |
| F-UPLOAD-08 | XLSX export via exceljs | Medium | Keep as confirmed | Medium | Repeats F-INPUT-04 + F-INJ-06 | Duplicate, kept for tracking |
| F-SHARE-01 | Token crypto HMAC+AES | Info | Keep as confirmed | Info | security.ts | None |
| F-SHARE-02 | scrypt password | Info | Keep as confirmed | Info | security.ts | None |
| F-SHARE-03 | 24h HttpOnly cookie | Info | Keep as confirmed | Info | security.ts | None |
| F-SHARE-04 | Service-role public-repo | Low | Keep as confirmed | Low | public-repository.ts | None |
| F-SHARE-05 | CSRF defense | Info | Keep as confirmed | Info | assertSameOriginPublicPost | None |
| F-SHARE-06 | Rate limits durable | Info | Keep as confirmed | Info | security_rate_limit_events | None |
| F-SHARE-07 | Comment circuit-breaker | Info | Keep as confirmed | Info | P12 circuit-breaker | None |
| F-SHARE-08 | no-store headers | Info | Keep as confirmed | Info | All share routes set no-store | None |
| F-SHARE-09 | Password attempt events | Info | Keep as confirmed | Info | password_attempt_event table | None |
| F-SHARE-10 | Recipient unsubscribe | Info | Keep as confirmed | Info | unsubscribe route + table | None |
| F-SHARE-11 | CSP on share routes | Info | Keep as confirmed | Info | next.config.ts headers | None |
| F-SHARE-12 | frame-ancestors | Low | Rewrite | Info | CSP includes `frame-ancestors 'none'` | Corrected — CSP verified |
| F-SHARE-13 | Token rotation/revocation | Medium | Keep but reclassify as hardening | Low | Rotation exists in link manager | Downgraded |
| F-INV-01 | Config-blocked fail-closed | Info | Keep as confirmed | Info | invite-entry.ts | None |
| F-INV-02 | Invitation open audit | Info | Keep as confirmed | Info | open_audit table | None |
| F-INV-03 | Accept-by-id SECURITY DEFINER | Info | Keep as confirmed | Info | accept_by_id RPC | None |
| F-INV-04 | Resolve with sender contact | Info | Keep as confirmed | Info | sender_contact RPC | None |
| F-INV-05 | List pending expired visibility | Info | Keep as confirmed | Info | expired_visibility RPC | None |
| F-INV-06 | No API route for invite | Info | Keep as confirmed | Info | Server-component only | None |
| F-INV-07 | Pepper rotation | Low | Keep as confirmed | Low | Moot until enabled | None |
| F-INV-08 | Accept-by-id scope | Info | Keep as confirmed | Info | Token never crosses boundary | None |
| F-INV-09 | Invite not live | Low | Keep as confirmed | Low | known-issues.md | None |
| F-WEB-01 | Svix signature verification | Info | Keep as confirmed | Info | resend-webhooks.ts | None |
| F-WEB-02 | Missing secret returns 503 | Info | Keep as confirmed | Info | Handler check | None |
| F-WEB-03 | Resend placeholder default | Medium | Keep as confirmed | Medium | Same as F-CRYPTO-06 | Duplicate |
| F-WEB-04 | Delivery event persistence | Info | Keep as confirmed | Info | delivery_events table | None |
| F-WEB-05 | Replay protection | Low | Keep as reclassified as missing evidence | Low | Svix timestamp tolerance not verified | Moved to evidence gap |
| F-WEB-06 | Webhook idempotency | Low | Keep as confirmed | Low | No event_id dedup | None |
| F-WEB-07 | Auth callback route | Info | Keep as confirmed | Info | redirects.ts sanitizes | None |
| F-ERR-01 | JSON error sanitized | Info | Keep as confirmed | Info | { error: "..." } shapes | None |
| F-ERR-02 | no-store prevents error caching | Info | Keep as confirmed | Info | Share routes | None |
| F-ERR-03 | DeepSeek error leakage | Low | Keep as confirmed | Low | Error path not fully enumerated | None |
| F-ERR-04 | Unhandled exceptions | Low | Keep as confirmed | Low | Global error boundary needed | None |
| F-ERR-05 | CSP Report-Only on landing | Info | Keep as confirmed | Info | next.config.ts | None |
| F-LOG-01 | Audit tables exist | Info | Keep as confirmed | Info | Multiple audit tables | None |
| F-LOG-02 | No structured monitoring | High | Keep as confirmed | High | No alerting in repo | None |
| F-LOG-03 | No log scrubbing policy | Medium | Keep as confirmed | Medium | Vercel config not in repo | None |
| F-LOG-04 | Audit retention not doc'd | Low | Keep as confirmed | Low | Retention windows absent | None |
| F-LOG-05 | Audit table integrity | Low | Keep as confirmed | Low | No UPDATE/DELETE prevention | None |
| F-CI-01 | permissions not declared | High | Merge into consolidated CI finding | High | ci.yml no permissions block | Merged |
| F-CI-02 | No SAST | High | Merge into consolidated CI finding | High | ci.yml | Merged |
| F-CI-03 | No SCA | High | Merge into consolidated CI finding | High | ci.yml | Merged |
| F-CI-04 | No secret scanning | High | Merge into consolidated CI finding | High | ci.yml | Merged |
| F-CI-05 | No DAST | Medium | Keep as confirmed | Medium | No DAST in CI | None |
| F-CI-06 | No SBOM/dependency review | Medium | Keep as confirmed | Medium | No SBOM artifact | None |
| F-CI-07 | No signed releases | Medium | Keep as confirmed | Medium | No SLSA provenance | None |
| F-CI-08 | No branch protection | Medium | Keep as reclassified as missing evidence | Medium | GitHub setting, not in repo | Moved to evidence gap |
| F-CI-09 | No coverage gate | Low | Keep as confirmed | Low | No coverage threshold | None |
