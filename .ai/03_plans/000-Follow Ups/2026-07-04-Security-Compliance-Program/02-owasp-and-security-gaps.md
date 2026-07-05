# 02 — OWASP and Security Gaps

**Source:** Owner analysis Section 1
**Standards referenced:** OWASP ASVS 5.0.0, OWASP API Security Top 10 (2023)
**Codes:** [ASVS-L1], [ASVS-L2], [API-Top10], [CSP], [UPLOAD-RL], [SCAN], [TRUST-CLAIM]

---

## 2.1 Existing baseline (what is already in place)

The following controls are present in the repo and provide the strong starting point:

| Control | Where (verified by explore agent; see `01-current-state-baseline.md`) |
|---|---|
| Protected workshop routing + terms gating | `src/middleware.ts` (re-exports Better Auth route gate from `src/lib/auth/request-proxy.ts`) |
| App-layer D1 authorization | Repository helpers under `src/lib/repositories/`; server actions under `src/lib/*/actions.ts` |
| Prepared D1 access checks | Repository layer (parameterized statements; no string interpolation) |
| Private uploads (R2) | `src/app/api/component-library/attachments/`, `wrangler.jsonc` R2 binding `ARCH_UPLOADS_R2` |
| MIME / magic-byte validation | Upload admission path |
| `no-store` / `nosniff` responses | Security headers middleware |
| Signed share-link cookies | `src/lib/publication/` |
| CSRF on public share mutations | Publication API routes `src/app/api/share/[token]/` |
| Durable public rate limits | Public route middleware |
| CodeQL `security-extended` + `security-and-quality` | `.github/workflows/ci.yml` |
| Pinned GitHub Actions (by SHA) | `.github/workflows/*.yml` |
| Dependabot (npm + GitHub Actions) | `.github/dependabot.yml` |

CI runs `bun run validate` + `bun run build` + Playwright smoke. The Cloudflare migration is complete; `package.json` has zero `@supabase/*` packages.

## 2.2 The structural gap: no OWASP ASVS control matrix

OWASP ASVS provides a basis for testing application security controls and secure-development requirements — not just a "secure enough" checklist. Archestimator currently has the controls but **not the mapping**.

**Target state:**
- **Now (P0/P1 boundary):** Map Archestimator to **ASVS 5.0.0 Level 1** (opportunistic / low-assurance baseline appropriate for closed beta → public beta)
- **Before paid launch (P1 end):** Map to **ASVS 5.0.0 Level 1** fully verified, with Level 2 verification scoped for high-risk areas (auth, publication, uploads)
- **Before enterprise positioning (P2):** Map to **ASVS 5.0.0 Level 2** across the board

Reference: [OWASP Application Security Verification Standard (ASVS)](https://owasp.org/www-project-application-security-verification-standard/)

## 2.3 The structural gap: no OWASP API Security Top 10 (2023) test matrix

APIs should be mapped against the **OWASP API Security Top 10 (2023)**. Highest-priority categories for Archestimator:

| API Top 10 (2023) | Archestimator relevance |
|---|---|
| **API1:2023 — Broken Object Level Authorization (BOLA)** | Critical — every `/api/share/[token]/`, `/api/projects/[projectId]/...`, `/api/component-library/...` route must prove workspace/project ownership check |
| **API2:2023 — Broken Authentication** | Better Auth session handling; magic-link + Google OAuth; covered by sibling auth-audit pack |
| **API3:2023 — Broken Object Property Level Authorization** (added 2026-07-04) | **Critical for upload + share DTOs** — combines Excessive Data Exposure + Mass Assignment. Every Server Action / Route Handler returning a `cost_library_item`, `estimate_row_item`, or `shared_link_recipient` DTO must minimize properties (e.g., never return internal `workspace_id`, `cost_breakdown_secrets`, or unhashed recipient email). Every mutation endpoint must use a typed input schema (Zod) to reject unexpected fields. |
| **API4:2023 — Unrestricted Resource Consumption** | Upload admission; export endpoints (Excel); AI endpoints (deferred) |
| **API5:2023 — Broken Function Level Authorization** | Admin/service paths; closed-beta gate |
| **API6:2023 — Unrestricted Access to Sensitive Business Flows** | Publication flow, invite flow |
| **API7:2023 — Server Side Request Forgery (SSRF)** (added 2026-07-04) | **Relevant for future AI features** — if/when AI package-builder is enabled (deferred), any fetch to DeepSeek or other inference provider is an SSRF surface. Out of scope for closed-beta; P2 mapping required before AI features ship. |
| **API8:2023 — Security Misconfiguration** | CSP, security headers, CORS |
| **API9:2023 — Improper Inventory Management** | API inventory (newer endpoints, deprecated endpoints, legacy Supabase callback still present) |
| **API10:2023 — Unsafe Consumption of APIs** | Future AI providers; DeepSeek integration (deferred) |

Reference: [OWASP Top 10 API Security Risks – 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)

## 2.4 Immediate OWASP gaps (P0)

### 2.4.1 [CSP] Content-Security-Policy is not mature enough

**Current state:** Landing/workshop CSP is `Report-Only` and allows `'unsafe-inline'` and `'unsafe-eval'`. The repo itself states that nonce-based tightening is deferred.

**Risk:** Report-Only CSP does not block attacks; it only reports. `'unsafe-inline'` and `'unsafe-eval'` defeat most of CSP's XSS mitigation value.

**Target state:**
- Move to **enforced** CSP with per-request nonces for inline scripts/styles
- Remove `'unsafe-eval'` entirely (audit any code path that depends on `eval` or `new Function`)
- Remove `'unsafe-inline'` (replace with nonce- or hash-based allows)
- Apply a default hardening header set globally — not only to share/workshop/invite routes
- Decide architecture: enforce at Cloudflare edge (Workers transform) or in Next.js middleware (see `OPEN-DEC-007`)

**Open question for ASVS:** Does Archestimator need to support any third-party scripts (analytics, error reporting) that would require domain allowlisting in CSP? `OPEN-DEC-008`.

### 2.4.2 [UPLOAD-RL] Upload rate limiting is not durable

**Current state:** Upload admission uses in-memory `Map`s for request buckets and active upload quotas. Memory does not survive Cloudflare isolate restarts or horizontal scaling.

**Risk:** Under load or restart, rate limits reset, allowing quota bypass.

**Target state:** Keep the logic (it is correct), but back the buckets with one of:
- **Cloudflare Rate Limiting** (binding-based, native, free-tier covered) — preferred
- **Durable Object** counter (existing `COLLAB_ROOMS` pattern can be reused)
- **D1 row** keyed by `(workspace_id, user_id, day)` with periodic cleanup

The sibling pack `2026-07-02-API-Rate-Limiting-Security-Consolidation` should be checked for whether upload endpoints are already in its scope. If yes, this gap is already being addressed.

### 2.4.3 [SCAN] File scanning is only partially evidenced

**Current state:** Code has scan states (`pending`, `clean`, `infected`, `unsupported`, `failed`) and a gate that blocks pending/infected/unsupported/failed component attachments from being served. Good.

**Gap:** From inspected files, what is visible is policy/state/gating logic — not a concrete antivirus or scanning-provider implementation. The "scan" may currently be a state machine without a scanner behind it.

**Risk:** Before public client uploads, an infected file could be admitted and shared.

**Target state (before public beta):**
- Wire an actual scanner (Cloudflare doesn't ship a native AV; options: dedicated AV API provider, or wrapper around an open-source AV if running in a Worker/Crawler)
- **DLQ review:** failed scans go to a dead-letter queue with manual review path
- **Admin override expiry:** any "accept despite scan failure" decision must have a TTL and require re-auth
- **Scan-result audit trail:** every scan decision (clean/infected/unsupported/failed) recorded with timestamp, scanner version, file hash, decider identity

**Cost note:** Scanner provider selection is `OPEN-DEC-006` — owner decision; do not enable paid providers without explicit authorization.

### 2.4.4 [TRUST-CLAIM] Public Trust page claims need correction

**Current state:** The Trust page publicly claims:
- "Row-level security enforced on every table"
- "Postgres" rate limiting

The README (and the migration history) say D1 is the active database, **D1 has no Postgres RLS**, and authorization is enforced **at the app layer** via repository helpers and server actions.

**Risk:** Inaccurate security claims are a **compliance and liability risk**, not just a marketing issue. A regulator or customer who relied on the "RLS on every table" claim and suffered a bug in the app-layer authorization could treat the misclaim as deceptive.

**Target state (P0.1 — first P0 item to ship):**
- Remove "Row-level security enforced on every table" — replace with accurate wording such as "Authorization enforced at the application layer on every data path; D1 (Cloudflare's SQLite-based database) does not provide row-level security, so all access is gated by repository helpers that fail closed."
- Remove "Postgres" — Archestimator is on Cloudflare D1, not Postgres
- Keep the existing "no GDPR / DPA / SOC 2 claims yet" framing — it is correct
- Align with `2026-07-04-Vercel-Supabase-Cleanup` so the Trust page does not reintroduce Supabase/Postgres language

**Approval gate:** `OPEN-DEC-001` (owner sign-off on final wording)

## 2.5 P1+ OWASP items

- ASVS V1 (Architecture): documented threat model
- ASVS V2 (Authentication): session handling, magic-link TTL, OAuth state validation
- ASVS V3 (Session Management): cookie flags, idle/absolute timeout, session termination on password change
- ASVS V4 (Access Control): workspace/project/estimate authorization matrix tests
- ASVS V5 (Validation, Sanitization & Encoding): input validation at all trust boundaries
- ASVS V7 (Error Handling & Logging): no sensitive data in logs; structured logging with redaction
- ASVS V8 (Data Protection): cryptographic key management, secrets handling
- ASVS V9 (Communications): TLS, HSTS, mixed-content prevention
- ASVS V13 (API & Web Service): see API Top 10 (2023) mapping above
- ASVS V14 (Configuration): security headers, CSP, debug mode, admin pages

These will be populated as a control matrix in P2.1 (`05-compliance-roadmap-p0-p1-p2.md`).
