# 05 — OWASP / ASVS / API / AI Crosswalk

> **Historical audit provenance.** Current execution authority is
> `.ai/03_plans/2026-07-31/Code-Improvement/`; this crosswalk preserves the July
> 19 assessment and makes no remediation or certification claim.

Per master prompt §3, this is a **coverage map**, not a certification. Each framework category ends in exactly one of: `VERIFIED_NO_ACCEPTED_FINDING` · `ACCEPTED_FINDING` · `PARTIALLY_VERIFIED` · `NOT_APPLICABLE` · `EVIDENCE_BLOCKED`.

## 5.1 OWASP Top 10:2025

| Category | Status | Findings | Evidence |
|---|---|---|---|
| A01 Broken Access Control | `ACCEPTED_FINDING` | `SEC-COLLAB-003`, `SEC-AUTHZ-001`, `SEC-UPLOAD-002`, `SEC-COLLAB-001`, `SEC-OPS-001`, `SEC-SHARE-002`, `SEC-AUTH-003` | `d1-access.ts` centralizes app-layer authz; `CollaborationRoom` DO has revocation gap; support-conversations data layer lacks internal predicate; internal routes reachable from internet. |
| A02 Cryptographic Failures | `ACCEPTED_FINDING` | `SEC-AUTH-001`, `SEC-CRYPTO-001`, `SEC-CRYPTO-002`, `SEC-CRYPTO-003` | Raw session tokens at rest; non-constant-time bearer compares; secret reuse in legacy fallback. |
| A03 Software Supply Chain Failures | `ACCEPTED_FINDING` | `SEC-CI-001`, `SEC-CI-002`, `SEC-SUPPLY-001` | All CI disabled; Dependabot disabled; `npx -y` in dev script. |
| A04 Cryptographic Failures (2025 rename of "Insecure Design" composite) | `ACCEPTED_FINDING` | `SEC-UPLOAD-001/002/004/005`, `SEC-COLLAB-002`, `SEC-BROWSER-002`, `SEC-PRIV-001/002` | Scanner disabled; bind-accepts-pending; per-DO seat cap; marketing-page cache; PII plaintext; retention gaps. (Note: 2025 A04 is "Cryptographic Failures"; 2025 A06 is "Vulnerable and Outdated Components"; 2025 A03 is "Injection" — table updated below.) |
| A05 Injection | `ACCEPTED_FINDING` | `SEC-EXT-001/002/003` (CRLF + HTML), `SEC-COLLAB-004` (SupportInbox broadcast), `SEC-BROWSER-008` (storage XSS-exfil dependency) | Email boundary; DO message schema. **SQL injection specifically is `VERIFIED_NO_ACCEPTED_FINDING`** — all dynamic identifiers allowlisted; all values parameterized (verified by authz sweep). |
| A06 Security Misconfiguration | `ACCEPTED_FINDING` | `SEC-WORKER-002`, `SEC-WORKER-004`, `SEC-BROWSER-001`, `SEC-BROWSER-003`, `SEC-BROWSER-005`, `SEC-AUTH-004`, `SEC-AUTH-005`, `SEC-UPLOAD-001` (default config) | workers_dev exposure; static cache; CSP permissive; invite token cache; cookie NODE_ENV-conditional; beta gate opt-in; trusted-origin header derivation; scanner default-dry-run. |
| A07 Authentication Failures | `ACCEPTED_FINDING` | `SEC-SHARE-001` (timing oracle), `SEC-SHARE-002` (enumeration oracle), `SEC-AUTH-002`, `SEC-BROWSER-003` (token in URL) | All bounded by 256-bit CSPRNG token entropy — practical impact Low. |
| A08 Software and Data Integrity Failures | `ACCEPTED_FINDING` | `SEC-UPLOAD-003` (unverified checksum), `SEC-OPS-004` (unsigned queue messages) | Direct-upload finalize + queue provenance. |
| A09 Security Logging & Alerting Failures | `ACCEPTED_FINDING` | `SEC-LOG-001/002/003`, `SEC-OPS-007` | `console.error` bypasses redactor; admin audit PII; Workers Logs 100% sampling; swallowed cron errors. |
| A10 Mishandling of Exceptional Conditions | `ACCEPTED_FINDING` | `SEC-OPS-001` (internal routes fail-open on missing config), `SEC-OPS-005/006/008` (redelivery/overlap/unhandled) | Bounded by 20MB ingress cap + Worker 128MB limit + DLQ; residual hardening. |

## 5.2 OWASP API Security Top 10:2023

| Category | Status | Findings |
|---|---|---|
| API1 Broken Object Level Authorization | `ACCEPTED_FINDING` | `SEC-COLLAB-003`, `SEC-AUTHZ-001` (latent), `SEC-OPS-001` |
| API2 Broken Authentication | `ACCEPTED_FINDING` | `SEC-AUTH-001`, `SEC-SHARE-001/002`, `SEC-CRYPTO-001/002/003` |
| API3 Broken Object Property Level Authorization | `PARTIALLY_VERIFIED` | `SEC-SHARE-003` (manifest field minimization — token holder already authorized); no mass-assignment finding on the audit surface. |
| API4 Unrestricted Resource Consumption | `ACCEPTED_FINDING` | `SEC-COLLAB-001/002/006`, `SEC-UPLOAD-005`, `SEC-OPS-003/005/006` |
| API5 Broken Function Level Authorization | `ACCEPTED_FINDING` | `SEC-UPLOAD-002` (bind-accepts-pending) |
| API6 Unrestricted Access to Sensitive Business Flows | `VERIFIED_NO_ACCEPTED_FINDING` | Publication/share/decision flows re-derive state every mutation; invite accept has race-safety. |
| API7 Server-Side Request Forgery | `VERIFIED_NO_ACCEPTED_FINDING` | No `fetch(userControlledUrl)` exists; every external destination is hardcoded constant or platform binding. |
| API8 Security Misconfiguration | `ACCEPTED_FINDING` | `SEC-WORKER-002/004`, `SEC-BROWSER-001/002/003/005`, `SEC-AUTH-004/005`, `SEC-EXT-001/002/003`, `SEC-COLLAB-004` |
| API9 Improper Inventory Management | `PARTIALLY_VERIFIED` | Internal routes documented in `artifacts/route-action-surface.csv`; `SEC-PRIV-002` (retention registry gaps); shadow `workers.dev` surface (`SEC-WORKER-002`). |
| API10 Unsafe Consumption of APIs | `VERIFIED_NO_ACCEPTED_FINDING` | DeepSeek response is shape-validated and identity-key-rejected; provider errors swallowed in package-builder. |

## 5.3 OWASP ASVS 5.0.0 (Level 2 baseline; Level 3 where applicable)

The pack **does not claim ASVS conformance**. Selected Level 2/3 requirements assessed:

| Requirement | Status | Note |
|---|---|---|
| v5.0.0-2.4.1 (lookup timing equalization) | `PARTIALLY_VERIFIED` | `SEC-SHARE-001` (password verify timing); dummy scrypt not run on null branch. |
| v5.0.0-3.5.3 (invalidate session after privilege change) | `ACCEPTED_FINDING` | `SEC-COLLAB-003`. |
| v5.0.0-4.1.1, 4.1.3 (data-layer access control) | `PARTIALLY_VERIFIED` | Centralized via `d1-access.ts`; one latent gap (`SEC-AUTHZ-001` support-conversations). |
| v5.0.0-4.2.1 (CSRF on state-changing requests) | `VERIFIED_NO_ACCEPTED_FINDING` (with minor hardening noted in `SEC-SHARE-005`, `SEC-COLLAB` origin checks) | Origin + double-submit on share/portal/invite mutations. |
| v5.0.0-5.3.x (input validation / output encoding) | `PARTIALLY_VERIFIED` | SQL injection closed; `SEC-EXT-001/002/003` email boundary; `SEC-COLLAB-004` DO message schema. |
| v5.0.0-6.2.1, 6.2.6 (key separation, per-purpose keys, constant-time compare) | `ACCEPTED_FINDING` | `SEC-CRYPTO-001/002/003`. |
| v5.0.0-7.1.3 (logging on auth/security events) | `PARTIALLY_VERIFIED` | Structured logging exists; `SEC-LOG-001/002/003` residual gaps. |
| v5.0.0-8.1.x, 8.2.x, 8.3.x (data minimization, retention) | `ACCEPTED_FINDING` | `SEC-PRIV-001/002`. |
| v5.0.0-12.1.1, 12.3.1, 12.3.4 (resource limits, idempotency, async integrity) | `ACCEPTED_FINDING` | `SEC-COLLAB-001/002`, `SEC-OPS-003/004/005`. |
| v5.0.0-13.1.1, 13.4.1 (WebSocket origin verification, rate limiting) | `ACCEPTED_FINDING` | `SEC-COLLAB-001/002/006`. |
| v5.0.0-14.1.1, 14.2.x, 14.4.1 (build pipeline, dependency, secret scanning) | `EVIDENCE_BLOCKED` / `ACCEPTED_FINDING` | CI disabled (`SEC-CI-001`); hosted GitHub state is `AUTH-001` blocked. |

## 5.4 OWASP Web Security Testing Guide v4.2

Used for proposed dynamic validation identifiers only. **No dynamic testing was performed under this prompt.** Proposed WSTG IDs are noted in each unit's `acceptance_evidence` where a runtime check would materially raise confidence:

- WSTG-ATHZ-04 (BOLA) — `UNIT-001` reconnect-after-revoke test proposal.
- WSTG-ATHN-07 (session timeout) — `UNIT-001`.
- WSTG-INPV-07 (CSV/formula injection) — already verified clean (XLSX inline-string serializer); regression test proposed in `SEC-EXPORT-001`.
- WSTG-CONF-07 (CSP) — `UNIT-009`.

## 5.5 OWASP Top 10 for LLM Applications 2025

Reachability: the only LLM surface is DeepSeek (read-only context to model; advisory output only; no model-side tools that mutate). Mapping:

- LLM01 Prompt Injection — `PARTIALLY_VERIFIED`. Direct prompt injection bounded (user message only). Indirect prompt injection from uploaded docs/CSV/PDF/messages **not reachable** (no file-content extraction feeds into prompts; verified by grep). Residual: `SEC-AI-001` sub-flag fail-open is a launch-prep concern, not a present injection vector.
- LLM02 Sensitive Information Disclosure — `VERIFIED_NO_ACCEPTED_FINDING`. Audit is metadata-only; provider output is shape-validated and identity-key-rejected; no PII to provider.
- LLM03 Supply Chain — see A03 row.
- LLM04 Data and Model Poisoning — `NOT_APPLICABLE` (no model training; no fine-tuning).
- LLM05 Improper Output Handling — `VERIFIED_NO_ACCEPTED_FINDING`. AI output rendered as plain React text (no `dangerouslySetInnerHTML`); generated mutations are deterministic server-built drafts with HMAC draft-token gate.
- LLM06 Excessive Agency — `VERIFIED_NO_ACCEPTED_FINDING`. Model has no direct write capability; Apply path requires HMAC token + draftHash match + per-branch authz + idempotency.
- LLM07 System Prompt Leakage — `VERIFIED_NO_ACCEPTED_FINDING`. System prompt is server-built; not exposed to client.
- LLM08 Vector and Embeddings Weakness — `NOT_APPLICABLE` (no vector store).
- LLM09 Misinformation — `PARTIALLY_VERIFIED`. Generated drafts are advisory only; human confirmation required for apply.
- LLM10 Unbounded Consumption — `ACCEPTED_FINDING` (`SEC-AI-002`). `/api/ai/package-builder` has no quota.

## 5.6 OWASP Top 10 for Agentic Applications

Reachability: the codebase has no autonomous agent that can call tools, mutate state, or inherit privileged identities without per-step authorization. The closest surface is the AI Apply path, which is not agentic (deterministic draft + explicit human confirmation gate). Mapping:

- AG01-Agentic autonomous action — `NOT_APPLICABLE`.
- AG02-Privilege inheritance — `VERIFIED_NO_ACCEPTED_FINDING` (Apply path re-checks `requireCurrentUserContext()` + per-branch `canEdit`).
- AG03-Tool allowlist — `VERIFIED_NO_ACCEPTED_FINDING` (model has no tools; server-side read-tools only).

## 5.7 CWE mapping summary

Each accepted finding in `04-FINDINGS-REGISTER.md` carries a precise CWE. Most-frequent CWEs across accepted findings:

- CWE-770 / CWE-400 (resource exhaustion) — 6 findings.
- CWE-345 / CWE-326 / CWE-1188 (authenticity, weak crypto, insecure defaults) — 5 findings.
- CWE-208 / CWE-204 (timing/response oracle) — 4 findings.
- CWE-613 / CWE-294 / CWE-302 (session expiration, replay) — `SEC-COLLAB-003`.
- CWE-525 / CWE-532 / CWE-1021 (cache, log, clickjacking) — 4 findings.
- CWE-614 / CWE-1004 (cookie flags) — `SEC-BROWSER-005/006`.
- CWE-200 / CWE-359 (info exposure) — `SEC-PRIV-001/002`, `SEC-SHARE-002/003`.
- CWE-693 (protection mechanism failure) — `SEC-UPLOAD-001`.
- CWE-434 (unrestricted upload) — `SEC-UPLOAD-004`.
- CWE-89 — **NOT EXPLOITABLE** anywhere on the audited surface (verified by authz sweep).

## 5.8 CVSS v4.0

Vectors are omitted. Per master prompt §3.8, vectors are included only when the exploit path and prerequisites are understood well enough to avoid false precision. For an alpha/pre-beta product, severity/priority classifications in `04-FINDINGS-REGISTER.md` are authoritative for remediation ordering; CVSS vectors would add false precision without changing priority.
