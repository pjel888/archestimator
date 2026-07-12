# 11 — Final Security Posture Restatement

**After second-pass verification, correction, and recalibration.**

---

## Overall posture

**Partially compliant** — the architecture has meaningful, well-implemented controls but several High/Medium gaps remain before production readiness, and 6 evidence gaps block definitive compliance claims.

The codebase demonstrates conscious defensive design across auth, RLS, crypto, shared-link security, and AI apply hardening. However, CI/CD security gates are entirely absent, AI endpoints lack rate limiting, and several provider-side configurations cannot be verified from the repo alone.

---

## Corrected top 10 risks (prioritized)

| # | Severity | Finding | Type |
|---|---|---|---|
| 1 | **High** | CI pipeline lacks SAST, SCA, secret-scanning, and `permissions:` declaration | Code gap |
| 2 | **High** | No documented structured security monitoring/alerting | Operational gap |
| 3 | **Medium** | AI endpoints lack rate limiting (`/api/ai/ask`, `/api/ai/package-builder`) | Code gap |
| 4 | **Medium** | LLM output used as state-changing payload in Apply path | Design risk |
| 5 | **Medium** | Prompt injection on Ask Flip and Package Builder | Design risk |
| 6 | **Medium** | Resend client constructor has placeholder default | Code gap |
| 7 | **Medium** | No data deletion/retention API or policy | Code + documentation gap |
| 8 | **Medium** | No log scrubbing policy for service-role key | Operational gap |
| 9 | **Medium** | `sharp` version needs CVE monitoring | Supply chain risk |
| 10 | **Low** | Comment text stored in `sessionStorage` offline queue | Code gap |

---

## Corrected production blockers

**Code-level blockers:**
1. CI pipeline security gates (SAST, SCA, secret-scanning) — no automated vulnerability detection
2. AI endpoint rate limiting — no per-user or global cap on DeepSeek API calls
3. `resend-webhooks.ts` placeholder default — remove before production

**Evidence-gap blockers (must verify before claims):**
4. Live Supabase migration state vs repo migrations (EG-01)
5. Supabase Auth provider configuration (EG-02)
6. Storage bucket RLS policies (EG-05)
7. DeepSeek DPA/data processing terms (EG-06)
8. Resend DPA/email compliance (EG-07)

**Operational blockers:**
9. Security monitoring/alerting pipeline (F-LOG-02)
10. `Secure` cookie attribute verification in production (EG-03)

---

## Corrected strengths (confirmed by second-pass evidence)

1. **RLS on all user-data tables** — verified across 48 migrations
2. **All SECURITY DEFINER functions set `search_path`** — 29+ migration files verified
3. **`revoke from public, anon` on all authenticated RPCs** — verified
4. **`revoke from service_role` on AI apply RPCs** — verified (defense-in-depth)
5. **HMAC + AES-256-GCM shared-link tokens** — `src/lib/publication/security.ts` verified
6. **scrypt password hashing** for share-link passwords — verified
7. **HMAC-signed 30-min TTL AI draft tokens** — `src/lib/ai/package-builder/draft-token.ts` verified
8. **CSRF protection on all public POST routes** — `assertSameOriginPublicPost` verified on all 6 share POST routes
9. **Durable rate limiting on share and invite routes** — `security_rate_limit_events` table with service-role-only access
10. **`no-store` headers on all public routes** — verified across 8 share API routes
11. **CSP with `frame-ancestors 'none'` on share routes** — `next.config.ts` verified
12. **Magic-byte file validation + `sharp` re-encode + size caps** — upload routes verified
13. **Filename sanitization in XLSX export** — `buildProposalWorkbookFilename` strips to `[a-zA-Z0-9]+`
14. **Dev auth bypass triple-gated** (non-prod + flag + loopback hostname)
15. **Invite system fail-closed** (disabled by default, empty pepper)
16. **AI auth admin-DB rejection** — explicit throw in `src/lib/ai/auth.ts`
17. **Svix webhook signature verification** — `src/lib/email/resend-webhooks.ts`
18. **Server-component invite entry** — smaller attack surface than API routes

---

## Corrected next remediation sequence

### Phase 1: Critical CI gates (before next merge to main)
1. Add `permissions: read-all` to CI workflow
2. Add `gitleaks` secret scanning step
3. Add `osv-scanner` SCA step (or `bun audit`)
4. Add SAST step (CodeQL or Semgrep)

### Phase 2: Code hardening (before production)
5. Add rate limiting to AI endpoints
6. Remove Resend placeholder default
7. Add rate limiting to XLSX export route (low priority)
8. Strip EXIF metadata explicitly in upload routes
9. Set `type: "text"` on ExcelJS string cells

### Phase 3: Operational readiness
10. Set up structured security monitoring/alerting
11. Verify log scrubbing for secrets
12. Verify `Secure` cookie attribute in production
13. Add HSTS header
14. Document audit retention windows

### Phase 4: Production verification
15. Run E2E test suite with live Supabase
16. Verify Supabase migration state matches repo
17. Verify Auth provider configuration
18. Verify Storage bucket RLS policies
19. Obtain and review provider DPAs (DeepSeek, Resend, Vercel)
20. Implement data deletion API and retention policy

---

## First-pass accuracy assessment

The first pass was **mostly accurate** with some severity inflation and a few factual errors that have been corrected.

**What was accurate (confirmed by second pass):**
- Architecture and trust boundary analysis
- RLS coverage assessment
- Cryptographic implementation review
- Service-role consumption point inventory
- CSRF defense verification
- Rate limit presence on share routes
- Upload route hardening
- CI/CD gap identification
- Webhook security

**What was inaccurate (corrected by second pass):**
- `dangerouslySetInnerHTML` claim (one controlled usage exists)
- CSP `frame-ancestors` claim (present, not absent)
- Zod absence severity (Medium → Low, validation exists)
- XLSX header injection severity (Medium → Low, sanitizer exists)
- Token rotation claim (rotation IS implemented)
- Finding count inflated by splitting CI gaps into separate High findings

**What was missed (added by second pass):**
- `search_path` hardening on all SECURITY DEFINER functions
- `ClarityScript` `dangerouslySetInnerHTML` (controlled, not a vulnerability)
- Invite route rate limiting coverage
- `localStorage`/`sessionStorage` usage for offline queue
- `@firecms/neat` patched dependency risk
- EXIF/metadata stripping in image uploads
- Proxy BFCache optimization (strips `no-store` from marketing pages)
- Server action error handling audit gap

---

## Recommended next action for Philip

1. **Immediate:** Add the CI pipeline security gates (Phase 1 above). This is the single highest-impact action — it prevents vulnerable code from reaching production.
2. **This week:** Add rate limiting to AI endpoints. The code patterns from share routes can be directly reused.
3. **Before production:** Close the 6 evidence gaps (EG-01 through EG-07) — these block definitive compliance claims.
4. **Ongoing:** Track findings through GitHub issues linked to the recommendation IDs in the remediation roadmap.
5. **Re-audit:** After Phases 1-3 are complete, re-run this audit against a clean working tree with E2E test evidence.
