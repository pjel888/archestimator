# 08 — OWASP Mapping Corrections

Corrections to the first-pass OWASP Top 10:2025, OWASP API Top 10:2023, and ASVS 5.0.0 mappings.

---

## OWASP Top 10:2025 Corrections

### A01: Broken Access Control

**First-pass mapping:** "Mostly compliant"
**Correction:** "Mostly compliant — verified strong RLS, CSRF on public routes, server-side auth walls. Evidence gaps in Storage RLS policies."
**Changed:** Added qualifier about Storage RLS gap.

### A02: Cryptographic Failures

**First-pass mapping:** "Mostly compliant"
**Correction:** "Mostly compliant — strong: HMAC+AES-GCM, scrypt, Node crypto. Gap: HSTS header not configured."
**Changed:** Added HSTS gap note.

### A03: Injection

**First-pass mapping:** "Compliant"
**Correction:** "Compliant — no raw SQL, React default escaping. Single controlled `dangerouslySetInnerHTML` for Clarity analytics. Excel formula injection mitigated (structured source data, not raw user input)."
**Changed:** Added formula injection and Clarity analytics notes.

### A04: Insecure Design

**First-pass mapping:** "Mostly compliant"
**Correction:** "Mostly compliant — rate limiting, CSRF, circuit-breaker present. Threat modelling absent."
**Changed:** No change.

### A05: Security Misconfiguration

**First-pass mapping:** "Mostly compliant"
**Correction:** "Mostly compliant — CSP enforced on share routes, Report-Only on landing. `search_path` hardened on all SECURITY DEFINER functions (strength not previously credited). HSTS missing."
**Changed:** Added `search_path` strength, HSTS gap.

### A06: Vulnerable & Outdated Components

**First-pass mapping:** "Unknown / partial"
**Correction:** "Unknown / partial — no SCA gate. Dependency pinning observed. `@firecms/neat` is a patched fork. `sharp`, `exceljs`, `next` versions need CVE monitoring."
**Changed:** Added `@firecms/neat` patch note.

### A07: Identification & Auth Failures

**First-pass mapping:** "Mostly compliant"
**Correction:** "Mostly compliant — Supabase auth, OAuth/OTP, cookie no-store, dev bypass triple-gated. Auth provider configuration not verified live."
**Changed:** Added live verification gap.

### A08: Software & Data Integrity Failures

**First-pass mapping:** "Mostly compliant"
**Correction:** "Mostly compliant — webhook sigs, draft token HMAC. No signed releases, no SBOM, `bun install --frozen-lockfile` in CI."
**Changed:** Added `--frozen-lockfile` as positive control.

### A09: Security Logging & Monitoring Failures

**First-pass mapping:** "Gap"
**Correction:** "Gap — audit tables exist (strong foundation). Alerting/forwarding absent. Log scrubbing unverified. Audit retention undocumented."
**Changed:** Minor clarifications.

### A10: Server-Side Request Forgery

**First-pass mapping:** "Compliant"
**Correction:** "Compliant — only hard-coded provider URLs (DeepSeek, Resend). No user-controlled URL fetch."
**Changed:** No change.

---

## OWASP API Top 10:2023 Corrections

### API1: Broken Object Level Authorization

**First-pass mapping:** "Mostly compliant"
**Correction:** "Mostly compliant — RLS everywhere. Service-role consumption points inventoried. Share-route access is by-design (not a finding). Missing: Storage RLS verification."
**Changed:** Moved share-route access from Medium finding to Informational. Added Storage gap.

### API2: Broken Authentication

**First-pass mapping:** "Mostly compliant"
**Correction:** No change.

### API3: Broken Object Property Level Authorization

**First-pass mapping:** Response shape not fully enumerated.
**Correction:** "Low — explicit select lists recommended. Not yet systematically verified across all routes."
**Changed:** No material change.

### API4: Unrestricted Resource Consumption

**First-pass mapping:** "Partial"
**Correction:** "Partial — durable rate limit on share routes AND invite routes (invite routes previously uncredited). AI endpoints under-protected."
**Changed:** Added invite route coverage.

### API5: Broken Function Level Authorization

**First-pass mapping:** No change needed.

### API6: Unrestricted Access to Sensitive Business Flows

**First-pass mapping:** No change needed.

### API7: Server Side Request Forgery

**First-pass mapping:** No change needed.

### API8: Security Misconfiguration

**First-pass mapping:** "Mostly compliant"
**Correction:** "Mostly compliant — CSP enforced on share, Report-Only on landing. `search_path` on SECURITY DEFINER functions. HSTS missing."
**Changed:** Added `search_path` strength.

### API9: Improper Inventory Management

**First-pass mapping:** "No API doc observed — Medium"
**Correction:** "Low — no API inventory doc. Downgraded from Medium." 
**Changed:** Downgraded severity.

### API10: Unsafe Consumption of APIs

**First-pass mapping:** No change needed.

---

## ASVS 5.0.0 Corrections

### V1.1 — Application security documentation

**First-pass:** "Partial — this audit is the closest artifact; no threat model."
**Correction:** Confirmed. The audit itself IS the security documentation.

### V1.4 — Threat modelling

**First-pass:** "Missing — no STRIDE/LINDDUN doc."
**Correction:** Confirmed. No change.

### V2.10 — Credential rotation

**First-pass:** "Partial — service-role key rotation undocumented."
**Correction:** "Partial — key rotation is operational (not code). Documented as evidence gap."
**Changed:** Clarified that this is operational, not a code gap.

### V4.2 — Access control

**First-pass:** No change needed.

### V5.1 — Input validation

**First-pass:** "Partial — manual, Zod recommended."
**Correction:** "Partial — extensive custom validation exists (validatePackageBuilderDraft, etc.), just not via Zod. Downgraded from Medium to Low."
**Changed:** Updated to reflect existing validation.

### V6.3 — RNG

**First-pass:** "Yes (presumed)."
**Correction:** "Yes (confirmed) — Node crypto used in publication/security.ts and AI draft-token.ts."
**Changed:** Confirmed from actual code.

### V11.1 — Rate limit/DoS

**First-pass:** "Partial — AI endpoints under-protected."
**Correction:** "Partial — durable rate limits on share AND invite routes. AI endpoints under-protected."
**Changed:** Added invite route coverage.

### V14.4 — HTTP security headers

**First-pass:** "Partial — CSP enforced on share; landing Report-Only."
**Correction:** "Partial — CSP on share routes includes `frame-ancestors 'none'` (verified). HSTS missing."
**Changed:** Added frame-ancestors verification, HSTS gap.

### V14.5 — Cookies

**First-pass:** "Secure not enumerated."
**Correction:** "Secure attribute can only be verified in production. Code creates cookies with standard attributes."
**Changed:** Clarified that Secure verification requires production deployment.

---

## OWASP LLM Top 10 (for AI features)

The first pass did not explicitly map to OWASP LLM Top 10. The second pass adds this mapping for the AI findings:

| OWASP LLM Top 10 | Archestimator relevance | Status |
|---|---|---|
| LLM01: Prompt Injection | F-AI-06 — user text forwarded to DeepSeek | Partially mitigated (read-only Ask, HMAC-signed Apply) |
| LLM02: Insecure Output Handling | F-AI-05 — LLM output as state-changing payload | Mitigated (HMAC token, Zod-like validation, SECURITY DEFINER RPC) |
| LLM03: Training Data Poisoning | N/A — no fine-tuning | N/A |
| LLM04: Model Denial of Service | F-RL-04 — no rate limit on AI endpoints | Gap |
| LLM05: Supply Chain Vulnerabilities | DeepSeek provider risk | Not evaluated |
| LLM06: Sensitive Information Disclosure | F-DATA-03 — PII minimization | Mitigated (server-derived context) |
| LLM07: Insecure Plugin Design | Read tools in package-builder | Mitigated (selected-column, DB-limited, user-scoped) |
| LLM08: Excessive Agency | Apply path requires explicit confirmation + HMAC | Mitigated |
| LLM09: Overreliance | N/A — deterministic Apply validation | Mitigated |
| LLM10: Model Theft | N/A | N/A |
