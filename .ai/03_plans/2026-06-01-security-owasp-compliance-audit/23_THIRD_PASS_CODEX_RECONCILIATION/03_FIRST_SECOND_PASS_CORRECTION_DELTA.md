# 03 — First/Second-Pass Correction Delta

What the third pass changes relative to the first and second passes. The third pass is a **reconciliation** pass, not a re-audit: it re-reads every first-pass and second-pass document, validates every Codex claim against repo evidence, and edits the existing audit documents in-place only where the first/second pass contradicts the verified repo state or the new Codex-driven severity model.

## Edits to first-pass documents

The third pass does **not** re-write the first-pass documents. Where the first pass was correct, no edit is made. Where the first pass disagreed with the verified repo state or with the Codex threat model, the following edits are applied.

### `00-executive-summary.md`

- **No material change.** The 2P corrections are still accurate. The third pass re-validates the `search_path` hardening strength and the CSP `frame-ancestors` verification; both are still confirmed.
- **Added:** Reference to `18_PRODUCTION_READINESS_GATE.md` for the final posture decision.

### `01-scope-and-methodology.md`

- **No material change.** Methodology is consistent with the third pass.

### `02-architecture-and-trust-boundaries.md`

- **No material change.** The 2P correction (storage RLS as a gap, migration count note) is still accurate.
- **Added (informational):** The third pass confirms 32 migration files use SECURITY DEFINER, 32 use `set search_path`.

### `03-authentication-and-session-management.md`

- **No material change.** F-AUTH-01 through F-AUTH-06 are all confirmed.
- **Added:** SEC-20260601-3P-003 reference — `/api/*` proxy bypass is intentional but Codex-relevant.

### `04-authorization-and-rls-coverage.md`

- **No material change.** The 2P correction added `search_path` hardening; third pass re-confirms.
- **Added:** SEC-20260601-3P-010 reference — RLS audit delta.

### `05-input-validation-and-output-encoding.md`

- **No material change.** The 2P correction downgraded F-INPUT-02 (Zod) from Medium to Low and F-INPUT-04 (XLSX filename) from Medium to Low. Both still hold.
- **Added:** SEC-20260601-3P-021 reference — input validation delta.

### `06-injection-and-template-vulnerabilities.md`

- **No material change.** F-INJ-01 through F-INJ-06 are confirmed.

### `07-cryptography-and-secrets-management.md`

- **No material change.** F-CRYPTO-01 through F-CRYPTO-08 are confirmed.
- **Added:** SEC-20260601-3P-001 reference — share access cookie `Secure` attribute evidence gap.

### `08-data-protection-and-privacy.md`

- **No material change.** F-DATA-01 through F-DATA-08 are confirmed.

### `09-rate-limiting-and-dos-resilience.md`

- **No material change.** F-RL-01 through F-RL-08 are confirmed.
- **Added:** SEC-20260601-3P-002 reference — AI endpoint rate-limit gap re-confirmed.

### `10-third-party-and-supply-chain.md`

- **No material change.** F-SC-01 through F-SC-10 are confirmed.
- **Added:** SEC-20260601-3P-027 reference — supply-chain threat model.

### `11-api-security-owasp-api-top10.md`

- **No material change.** API1 through API10 mappings are confirmed; the 2P downgraded F-API9-01 from Medium to Low, which still holds.

### `12-ai-llm-security.md`

- **No material change.** F-AI-01 through F-AI-09 are confirmed.

### `13-file-upload-and-storage.md`

- **No material change.** F-UPLOAD-01 through F-UPLOAD-08 are confirmed; the 2P downgraded F-UPLOAD-06 and F-UPLOAD-07.

### `14-shared-link-publication-surface.md`

- **No material change.** F-SHARE-01 through F-SHARE-13 are confirmed; the 2P downgraded F-SHARE-12 (CSP frame-ancestors) and F-SHARE-13 (token rotation).

### `15-collaboration-invite-surface.md`

- **No material change.** F-INV-01 through F-INV-09 are confirmed.

### `16-webhooks-and-external-callbacks.md`

- **No material change.** F-WEB-01 through F-WEB-07 are confirmed.

### `17-error-handling-and-information-disclosure.md`

- **No material change.** F-ERR-01 through F-ERR-05 are confirmed.

### `18-logging-monitoring-audit-trail.md`

- **No material change.** F-LOG-01 through F-LOG-05 are confirmed. F-LOG-02 (no alerting) remains the highest-impact finding blocking production readiness.

### `19-secure-sdlc-and-ci-cd.md`

- **No material change.** F-CI-01 through F-CI-09 are confirmed; the 2P consolidated F-CI-01 through F-CI-04 into a single "no permissions block, no SAST, no SCA, no secret scanning" finding.

### `20-compliance-mapping-owasp-asvs.md`

- **No material change.** ASVS V1 through V14 mappings are confirmed.

### `21-remediation-roadmap.md`

- **No material change.** Recommendation classification (Quick Wins, High-Impact, Strategic, Out-of-repo) is confirmed.

## Edits to second-pass documents

The third pass does **not** re-write the second-pass documents. The 2P corrections are still accurate.

## New documents (third-pass folder)

The third pass produces 19 new documents (01–19) plus this README in `23_THIRD_PASS_CODEX_RECONCILIATION/`. These documents:

- Add Codex-specific threat-model content
- Add new findings where Codex surfaced risks not in 1P/2P
- Add evidence gaps where the 2P list was incomplete
- Add the formal production-readiness gate with promotion conditions

## Net change to the audit posture

| Aspect | 1P | 2P | 3P |
|---|---|---|---|
| Posture | Moderate | Partially compliant | **Partially compliant** (unchanged; gate conditions added) |
| Top 5 findings | CI gaps, monitoring, AI key rotation, Resend placeholder, share rotation | Same | Same + Share cookie `Secure` evidence gap (SEC-20260601-3P-001) |
| Codex claims reviewed | 0 | 0 | **41** |
| New findings | n/a | 8 (SEC-20260601-2P-001 through 008) | 5 (SEC-20260601-3P-001 through 005) + several threat-model detail docs |
| False positives from Codex | n/a | n/a | 5 (Codex claims not supported) |
| Production-readiness gate | absent | informal | **formal** with promotion conditions |
