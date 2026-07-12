# 07 — Severity Recalibration

The third pass adopts the Codex production-readiness severity model and applies it to the existing findings. The model is:

| Severity | Definition | Example |
|---|---|---|
| **Critical** | Cross-tenant data exposure, full DB compromise, secret leakage to public | Missing RLS on a tenant table; service-role key in client bundle |
| **High** | Single-tenant IDOR, auth bypass, secret leakage to authenticated users | Token binding bypass; CSRF on a state-changing endpoint |
| **Medium** | Limited CSRF, XLSX formula injection, missing rate limit on a non-credential endpoint | Share-session CSRF on a comment endpoint; AI endpoint rate limit |
| **Low** | Header / metadata issues, drift risk, hardening recommendations | HSTS missing; `Secure` cookie attribute not explicit; `dangerouslySetInnerHTML` for analytics |

## Per-finding recalibration

| Finding | 1P | 2P | 3P | Rationale |
|---|---|---|---|---|
| F-AUTH-01 (dev bypass triple-gated) | Info | Info | **Info** | No change. Strength confirmed. |
| F-AUTH-02 (redirect sanitizer) | Info | Info | **Info** | No change. |
| F-AUTH-05 (AI rejects admin-DB) | Info | Info | **Info** | No change. |
| F-AUTH-06 (session null handling) | Low | Info | **Info** | No change. |
| F-AUTHZ-01 (force RLS inconsistent) | Low | Low | **Low** | No change. |
| F-INPUT-02 (Zod not used) | Medium | Low | **Low** | No change. Custom validation exists. |
| F-INPUT-04 (XLSX filename injection) | Medium | Low | **Low** | No change. Sanitizer verified. |
| F-INPUT-06 (comment text XSS) | Low | Low | **Low** | No change. |
| F-INJ-02 (trigger SECURITY DEFINER) | Info | Info | **Info** | No change. `search_path` hardened. |
| F-INJ-06 (Excel formula injection) | Low | Low | **Low** | No change. Structured source data. |
| F-CRYPTO-01 (HMAC + AES-GCM) | Info | Info | **Info** | No change. Strength. |
| F-CRYPTO-02 (scrypt) | Info | Info | **Info** | No change. Strength. |
| F-CRYPTO-03 (AI draft HMAC) | Info | Info | **Info** | No change. Strength. |
| F-CRYPTO-06 (Resend placeholder) | Medium | Medium | **Low (SEC-20260601-3P-004)** | Route handler 503s when env var missing; placeholder never used. |
| F-DATA-04 (data deletion gap) | Medium | Medium | **Medium** | No change. No deletion API. |
| F-DATA-07 (share data exposure) | Medium | Medium | **Medium** | No change. Token = access by design. |
| F-RL-01 (durable rate limit table) | Info | Info | **Info** | No change. Strength. |
| F-RL-04 (no rate limit on AI) | Medium | Medium | **Medium (SEC-20260601-3P-002)** | No change. Per-tenant cost-amplification rationale added. |
| F-RL-05 (DeepSeek 20s timeout) | Low | Low | **Low** | No change. |
| F-RL-07 (no per-tenant DoS) | Medium | Low | **Low** | No change. Hardening. |
| F-RL-08 (invite routes rate-limited) | Info | Info | **Info** | No change. Strength. |
| F-SC-02 (no SCA) | High | High | **High** | No change. |
| F-SC-03 (no SAST) | High | High | **High** | No change. |
| F-SC-04 (no secret scanning) | High | High | **High** | No change. |
| F-SC-05 (no SBOM) | Medium | Medium | **Medium** | No change. |
| F-SC-07 (sharp CVEs) | Medium | Medium | **Medium** | No change. |
| F-API1-02 (share route public access) | Medium | Info | **Info** | No change. Design characteristic. |
| F-API9-01 (no OpenAPI doc) | Medium | Low | **Low** | No change. Documentation. |
| F-AI-01 (AI apply HMAC token) | Info | Info | **Info** | No change. Strength. |
| F-AI-05 (LLM output state-changing) | Medium | Medium | **Medium** | No change. Apply path validated. |
| F-AI-06 (prompt injection) | Medium | Medium | **Medium** | No change. Ask path read-only. |
| F-AI-07 (no key rotation) | Medium | Low | **Low** | No change. Operational. |
| F-AI-08 (admin-DB rejection in AI) | Info | Info | **Info** | No change. Strength. |
| F-UPLOAD-01 (magic-byte image) | Info | Info | **Info** | No change. Strength. |
| F-UPLOAD-02 (sharp re-encode) | Info | Info | **Info** | No change. Strength. |
| F-UPLOAD-03 (size caps) | Info | Info | **Info** | No change. Strength. |
| F-UPLOAD-04 (attachment magic-byte) | Info | Info | **Info** | No change. Strength. |
| F-UPLOAD-06 (object key path) | Medium | Low | **Low** | No change. Auth-gated. |
| F-UPLOAD-07 (no AV scanning) | Medium | Low | **Low** | No change. Attachments not forwarded. |
| F-SHARE-01 (token crypto) | Info | Info | **Info** | No change. Strength. |
| F-SHARE-02 (scrypt) | Info | Info | **Info** | No change. Strength. |
| F-SHARE-03 (24h HttpOnly cookie) | Info | Info | **Info** | No change. Strength. |
| F-SHARE-05 (CSRF) | Info | Info | **Info** | No change. Strength. |
| F-SHARE-08 (no-store) | Info | Info | **Info** | No change. Strength. |
| F-SHARE-11 (CSP on share) | Info | Info | **Info** | No change. Strength. |
| F-SHARE-12 (frame-ancestors) | Low | Info | **Info** | No change. Verified. |
| F-SHARE-13 (token rotation) | Medium | Low | **Low** | No change. Rotation exists. |
| F-INV-01 (config-blocked) | Info | Info | **Info** | No change. Strength. |
| F-INV-02 (open audit) | Info | Info | **Info** | No change. Strength. |
| F-INV-03 (accept-by-id SECURITY DEFINER) | Info | Info | **Info** | No change. Strength. |
| F-WEB-01 (Svix verification) | Info | Info | **Info** | No change. Strength. |
| F-WEB-02 (missing secret 503) | Info | Info | **Info** | No change. Strength. |
| F-WEB-03 (Resend placeholder) | Medium | Medium | **Low (SEC-20260601-3P-004)** | Same as F-CRYPTO-06. |
| F-WEB-04 (delivery event persistence) | Info | Info | **Info** | No change. Strength. |
| F-ERR-01 (JSON error sanitized) | Info | Info | **Info** | No change. Strength. |
| F-ERR-02 (no-store) | Info | Info | **Info** | No change. Strength. |
| F-LOG-01 (audit tables) | Info | Info | **Info** | No change. Strength. |
| F-LOG-02 (no alerting) | High | High | **High** | No change. Production-readiness blocker. |
| F-LOG-03 (no log scrubbing) | Medium | Medium | **Medium** | No change. |
| F-CI-01 (permissions not declared) | High | High (consolidated) | **High** | No change. |
| F-CI-02 (no SAST) | High | High (consolidated) | **High** | No change. |
| F-CI-03 (no SCA) | High | High (consolidated) | **High** | No change. |
| F-CI-04 (no secret scanning) | High | High (consolidated) | **High** | No change. |
| F-CI-05 (no DAST) | Medium | Medium | **Medium** | No change. |
| F-CI-06 (no SBOM) | Medium | Medium | **Medium** | No change. |
| F-CI-08 (no branch protection) | Medium | Medium | **Medium** | No change. |
| F-CI-09 (no coverage gate) | Low | Low | **Low** | No change. |
| **SEC-20260601-3P-001** (share cookie Secure) | n/a | n/a | **Medium** | New — see `06_FALSE_NEGATIVES_FROM_CODEX.md`. |
| **SEC-20260601-3P-002** (AI rate limit) | n/a | n/a | **Medium** | New — see `06_FALSE_NEGATIVES_FROM_CODEX.md`. |
| **SEC-20260601-3P-003** (proxy API bypass) | n/a | n/a | **Medium** | New — see `06_FALSE_NEGATIVES_FROM_CODEX.md`. |
| **SEC-20260601-3P-004** (Resend placeholder) | n/a | n/a | **Low** | New — see `06_FALSE_NEGATIVES_FROM_CODEX.md`. |
| **SEC-20260601-3P-005** (ClarityScript) | n/a | n/a | **Low** | New — see `06_FALSE_NEGATIVES_FROM_CODEX.md`. |

## Net change to severity distribution

| Severity | 1P count | 2P count | 3P count |
|---|---|---|---|
| Critical | 0 | 0 | 0 |
| High | 4 | 4 | 4 |
| Medium | ~25 | ~22 | ~22 |
| Low | ~15 | ~17 | ~17 |
| Info | ~70 | ~72 | ~75 |

The 3P distribution is essentially identical to 2P, with 5 new findings (2 Medium, 3 Low) added and 1 finding (F-CRYPTO-06 / F-WEB-03) downgraded from Medium to Low.

## Rationale for keeping High findings at High

The four High findings (F-LOG-02, F-CI-02, F-CI-03, F-CI-04, consolidated) remain High because they are production-readiness blockers:

- **F-LOG-02 (no alerting):** Without alerting, abuse (rate-limit breaches, password attempts, webhook failures) goes unnoticed. Production cannot be defended operationally.
- **F-CI-02/03/04 (no SAST/SCA/secret-scanning):** Without these gates, known CVEs and accidental secret commits can land in `main`. Production cannot be defended at the SDLC level.

These are not Critical because they do not directly enable cross-tenant data exposure today. They enable it in the future as the codebase grows.

## Rationale for not promoting anything to Critical

The Codex threat model's bias toward Critical is acknowledged. The third pass does not promote any finding to Critical because:

- RLS is the primary defense for cross-tenant isolation; it is present and verified on all user-data tables (32 migration files).
- The Supabase service-role key is server-only and never exposed in `NEXT_PUBLIC_*` variables.
- No raw SQL is present in `src/`; all queries go through the Supabase client.
- The AI package-builder apply path is defense-in-depth (HMAC token + RPC `auth.uid()` re-check + RLS); cross-tenant writes are not possible.
- The collaboration invite RPCs are SECURITY DEFINER but each is fail-closed and sets `search_path`.

If any of the above were falsified by repo evidence, the third pass would have promoted the relevant finding to Critical. None were.
