# 02 — First-Pass Correction Log

Document-level changelog of what was accurate, inaccurate, missing, and edited in each first-pass audit document.

---

## 00 — Executive Summary

**Accurate:** Overall posture assessment (Moderate, with CI and monitoring gaps). Top-level OWASP mapping mostly correct. Auth/RLS described as comparatively mature — verified accurate.

**Inaccurate:** "CSP enabled on share routes" was stated as `frame-ancestors 'none'` — confirmed accurate. No inaccuracies found.

**Missing:** Does not mention `search_path` hardening on SECURITY DEFINER functions as a strength. CSP enforcement detail should mention it exists in `next.config.ts` with a specific header configuration.

**Edited:** Added note about `search_path` hardening. Restated strengths with code references.

---

## 01 — Scope and Methodology

**Accurate:** Accurately describes scope and limitations. Correct about in-scope and out-of-scope items.

**Inaccurate:** None found.

**Missing:** Did not list which tools were specifically used for grep. Runtime validation commands not documented as being run.

**Edited:** No material edits needed. Methodology notes captured in second-pass method doc.

---

## 02 — Architecture and Trust Boundaries

**Accurate:** Trust boundary diagram matches actual architecture. Service-role consumption points correctly identified. Public share crypto path correctly described.

**Inaccurate:** Claims "19+ migrations reviewed" — actually more like 48 migrations exist, ~29 with SECURITY DEFINER functions reviewed. Minor labeling issue, not substance.

**Missing:** Storage RLS/policy discussion. Vercel edge runtime specifics.

**Edited:** Added note about actual migration count. Added storage policy gap mention.

---

## 03 — Authentication and Session Management

**Accurate:** F-AUTH-01 (dev bypass triple-gated) verified correct. F-AUTH-02 (redirect sanitizer) verified correct. F-AUTH-04 (24h share cookie) verified correct. F-AUTH-05 (AI auth blocks admin-DB) verified correct.

**Inaccurate:** F-AUTH-06 claims "Session resolution never returns null without explicit handling" — this is an engineering hygiene note, not a security finding. Should be downgraded to Informational.

**Missing:** No discussion of `Secure` cookie flag verification approach. No mention of the proxy removing `no-store` from marketing pages for BFCache compatibility.

**Edited:** Downgraded F-AUTH-06 to Informational. Added proxy BFCache handling as a control note.

---

## 04 — Authorization and RLS Coverage

**Accurate:** RLS coverage matrix mostly correct. F-AUTHZ-02 and F-AUTHZ-03 (AI SECURITY DEFINER triggers) verified correct. Service-role discipline correctly described.

**Inaccurate:** "force row level security not consistently asserted" — verified; only one migration uses it. Claim is accurate. "19+ migrations reviewed" is conservative; actual number is higher.

**Missing:** No mention that ALL SECURITY DEFINER functions set `search_path`. This is a significant hardening detail. Migration count is understated.

**Edited:** Added `search_path` hardening observation. Updated migration count note.

---

## 05 — Input Validation and Output Encoding

**Accurate:** F-INPUT-01 (no raw SQL) verified correct. F-INPUT-03 (redirect sanitized) verified correct. F-INPUT-06 (comment/decision text fields) verified correct.

**Inaccurate:** F-INPUT-02 claims "Zod is not used at the route boundary" and rates it Medium. The codebase uses extensive structured validation via `validatePackageBuilderDraft`, `validateTreeDraft`, `validateRowsTargetAreas`, `validateLinkedLibraryRows`, and many more. Route handlers validate with explicit conditionals. Severity should be Low (validation exists, just not through a centralized schema library).

F-INPUT-04 rates `Content-Disposition` header injection as Medium with High impact. The filename sanitizer (`buildProposalWorkbookFilename`) strips to `[a-zA-Z0-9]+` with `-` separator. Actual risk is Low.

F-INPUT-05 says "if the on-disk filename is derived from user input, it should be normalized." The upload routes use magic-byte validation and `sharp` re-encode. Object key construction was not fully verified but routes are auth-protected.

**Missing:** No mention of the custom validation functions that exist in the codebase. The claim "Zod was not seen" is true but misleading — it implies no validation, when plenty exists.

**Edited:** Corrected F-INPUT-02 severity to Low and noted existing validation functions. Corrected F-INPUT-04 severity to Low based on filename sanitizer analysis.

---

## 06 — Injection and Template Vulnerabilities

**Accurate:** F-INJ-01 (no raw SQL) verified. F-INJ-03 (no SSTI) verified. F-INJ-04 (no SSRF) verified.

**Inaccurate:** F-INJ-06 claims formula injection with "Low likelihood, Medium impact." The cell content in `create-proposal-workbook.ts` uses `numFmt` for formatting. Cells are not explicitly typed as `text` or prefixed with `'`. However, the source data is structured (project/estimate metadata, not raw user free-text). Actual formula injection risk is lower than Medium impact.

**Missing:** No discussion of how `exceljs` cell types work and whether default cell type mitigates formula injection. The first pass didn't read the workbook builder in detail.

**Edited:** Clarified that ExcelJS `numFmt` provides some formatting but explicit `type: "text"` or leading `'` is still the defense-in-depth recommendation.

---

## 07 — Cryptography and Secrets Management

**Accurate:** All crypto findings verified correct. F-CRYPTO-01 (HMAC + AES-GCM) verified. F-CRYPTO-02 (scrypt) verified. F-CRYPTO-03 (AI draft HMAC) verified. F-CRYPTO-06 (Resend placeholder) verified.

**Inaccurate:** None found.

**Missing:** No discussion of `AI_PACKAGE_BUILDER_DRAFT_SIGNING_SECRET` or `RESEND_WEBHOOK_SECRET` rotation. No mention of TLS version enforcement at edge.

**Edited:** Minor clarifications only.

---

## 08 — Data Protection and Privacy

**Accurate:** Data classification table mostly correct. F-DATA-04 (no deletion API) accurate.

**Inaccurate:** F-DATA-07 rates "Shared-link data exposure" as Medium with Low likelihood and High impact. The token uses AES-256-GCM so brute-force is infeasible. The actual data exposure window is bounded. Severity is correct but could be argued as Low given the crypto.

**Missing:** No discussion of EXIF data stripping in image uploads. No mention of `sharp` metadata handling.

**Edited:** Added EXIF/stripping note as an observation.

---

## 09 — Rate Limiting and DoS Resilience

**Accurate:** F-RL-01 (durable rate limit table) verified. F-RL-03 (comment circuit-breaker) verified. F-RL-04 (AI endpoints lacking rate limit) verified — confirmed accurate.

**Inaccurate:** F-RL-02 says "Public route handlers use both in-memory and durable rate limit checks." The password route and comment route use the durable `security_rate_limit_events`. The comment route also has a circuit-breaker. The snapshot, activity, and events routes use the durable rate limiter. This is accurate. However, F-RL-07 (no per-tenant DoS posture) is a Medium finding that is really more of a hardening recommendation — the durable rate limiter already provides per-token/per-IP scoping.

**Missing:** No mention of invite route rate limiting, which was verified present in `src/app/invite/[token]/page.tsx` and `continue/route.ts` and `accept/route.ts`.

**Edited:** Added invite rate-limit coverage note. Clarified that per-tenant quotas are hardening, not a current vulnerability.

---

## 10 — Third-Party and Supply Chain

**Accurate:** All SCA/SAST/secret-scanning/SBOM gaps verified accurate. Dependency pinning verified. CI workflow confirmed to lack these gates.

**Inaccurate:** None found. All claims verified against actual `.github/workflows/ci.yml`.

**Missing:** No mention of `@firecms/neat` being a patched dependency with `paused` property hack. No mention of `bun.lock` vs `package-lock.json` for integrity.

**Edited:** Added `@firecms/neat` patch note. Added `bun.lock` integrity observation.

---

## 11 — API Security (OWASP API Top 10:2023)

**Accurate:** API1-API10 mappings mostly correct. F-API1-01 (RLS defense) correct. F-API5-01 (no admin surface) correct. F-API6-01 (CSRF + rate limits) correct.

**Inaccurate:** F-API1-02 rates share-route public access as Medium with Low likelihood and High impact. The HMAC+AES-GCM token provides 256-bit security. This is a design characteristic, not a Medium finding — the token is the access credential by design, like any shared link system.

F-API9-01 says "no OpenAPI doc observed." This is Medium severity with Low impact. That's reasonable for documentation but should not inflate the overall risk profile.

**Missing:** No explicit list of all API routes. The first-pass attack surface inventory is in 02 (architecture doc) not a separate attack surface doc.

**Edited:** Clarified API1-02 as an Informational design note, not a Medium finding.

---

## 12 — AI / LLM Security

**Accurate:** F-AI-01 (HMAC draft token) verified. F-AI-02 (audit tables) verified. F-AI-04 (feature flags) verified. F-AI-05 (LLM output as state-changing) verified. F-AI-08 (admin-DB rejection) verified.

**Inaccurate:** F-AI-06 rates prompt injection as Medium with High likelihood — anyone with workspace access certainly can craft prompts. However, the Ask path is read-only by design, and the Apply path requires HMAC-signed tokens. Actual impact is bounded.

F-AI-07 rates missing key rotation as Medium. This is accurate as a procedural gap, but code-wise the key is loaded from env and rotation is an operational concern.

**Missing:** No discussion of DeepSeek data processing terms, model version pinning, or output validation depth. The first-pass mention of "no retry/jitter policy" on DeepSeek HTTP client is accurate.

**Edited:** Clarified that F-AI-06 impact is bounded by read-only design. Added note about DeepSeek model version being hard-coded.

---

## 13 — File Upload and Storage

**Accurate:** F-UPLOAD-01 through F-UPLOAD-05 all verified correct. Magic-byte sniffing, sharp re-encode, size caps all confirmed in code.

**Inaccurate:** F-UPLOAD-06 says "object key construction was not enumerated in full" and rates Medium. The upload routes are auth-protected and use service-role for writes. The actual risk of path traversal through object keys is Low given the auth gate.

**Missing:** EXIF metadata stripping in sharp. Image re-encode does strip EXIF by default when sharp resizes, but this should be explicitly confirmed.

**Edited:** Added EXIF note. Downgraded F-UPLOAD-06 to Low.

---

## 14 — Shared-Link / Publication Surface

**Accurate:** All F-SHARE findings verified correct. Token crypto, CSRF defense, rate limits, no-store headers, CSP enforcement all confirmed.

**Inaccurate:** F-SHARE-12 says "CSP not enumerated in full; if frame-ancestors is not 'none'" — verified from `next.config.ts` that `frame-ancestors 'none'` IS present in the CSP. The claim should be corrected.

F-SHARE-13 rates "token rotation / revocation" as Medium with Low likelihood and High impact. Token rotation exists in the public link manager (rotate to a new token). Actual risk is lower than stated.

**Missing:** No mention of the invite-rate-limit use of `security_rate_limit_events` for public routes.

**Edited:** Corrected F-SHARE-12 to reflect actual CSP header. Noted that token rotation IS implemented.

---

## 15 — Collaboration / Invite Surface

**Accurate:** F-INV-01 (config-blocked) verified. F-INV-03 through F-INV-05 (SECURITY DEFINER RPCs) verified. F-INV-08 (accept-by-id) verified.

**Inaccurate:** F-INV-07 rates "pepper rotation" as Low when system is disabled. This is correct posture since the system is fail-closed. If anything, the finding should note that rotation is moot until the system is enabled.

**Missing:** No mention of the `revalidateCollaborationRoutes` function that correctly scopes route invalidation.

**Edited:** Clarified F-INV-07 context.

---

## 16 — Webhooks and External Callbacks

**Accurate:** All findings verified correct. Svix signature verification present. Missing-secret returns 503.

**Inaccurate:** None found.

**Missing:** No mention of webhook idempotency table design.

**Edited:** Minor clarifications.

---

## 17 — Error Handling and Information Disclosure

**Accurate:** F-ERR-01 (sanitized JSON errors) verified. F-ERR-02 (no-store headers) verified.

**Inaccurate:** F-ERR-03 (DeepSeek error messages) is speculative — the error path "was not enumerated in full." Rated Low which is appropriate for speculative findings.

**Missing:** No error handling audit of server actions (not just API routes). Server action errors need the same sanitization review.

**Edited:** Added server action error audit recommendation.

---

## 18 — Logging, Monitoring, and Audit Trail

**Accurate:** F-LOG-01 (audit tables exist) verified. F-LOG-02 (no alerting) verified — operational gap, not code gap. Severity High is appropriate for production-readiness blocking.

**Inaccurate:** None found.

**Missing:** No mention of structured logging format or log level conventions.

**Edited:** Minor clarifications.

---

## 19 — Secure SDLC and CI/CD

**Accurate:** All findings verified against actual CI workflow. No SAST, SCA, secret-scanning, permissions declaration, branch protection, SBOM.

**Inaccurate:** The first pass creates 9 separate High/Medium findings (F-CI-01 through F-CI-09) for the CI pipeline. In practice, these are closely related gaps that could be consolidated into fewer findings. However, keeping them separate makes each actionable, which is defensible.

**Missing:** No mention of `bun.lock` hash verification in CI. No mention of `--frozen-lockfile` being used.

**Edited:** Noted that `bun install --frozen-lockfile` IS present in CI — verified.

---

## 20 — Compliance Mapping (OWASP ASVS 5.0.0)

**Accurate:** ASVS mapping mostly correct. Gaps correctly identified.

**Inaccurate:** V6.3 (RNG) marked as "Yes (presumed)" — should be "Yes (confirmed)" since Node `crypto` is used. V14.5 (Cookies) marked as "Secure not enumerated" — should note that `Secure` can only be confirmed in production.

**Missing:** No ASVS V12 (files/resources) mapping for storage RLS policies.

**Edited:** Corrected V6.3 and V14.5.

---

## 21 — Remediation Roadmap

**Accurate:** Recommendation classification into Quick Wins, High-Impact, Strategic, and Out-of-repo is reasonable.

**Inaccurate:** R-08 (Zod at API boundaries) is listed as a Medium-effort Quick Win. The actual effort to retrofit Zod across all routes while maintaining existing validation is larger than Medium.

**Missing:** No timeline or owner assignment for recommendations. No success criteria for remediation closure.

**Edited:** Added note about effort calibration for R-08.
