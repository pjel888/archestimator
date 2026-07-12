# 18 — Production Readiness Gate

The third pass introduces a **formal production-readiness gate** with three states:

- **Not compliant yet** — Critical findings are open; production launch is blocked
- **Partially compliant** — No Critical findings, but High or material Medium findings are open; production launch is conditional on remediation or documented risk acceptance
- **Compliance-ready pending remediation** — All Critical and High findings are closed; remaining Medium/Low findings have documented timelines

## Current state: **Partially compliant**

**Rationale:** No Critical findings are open. The following High findings remain open:

1. **F-LOG-02 (High)** — No documented structured monitoring / alerting pipeline
2. **F-CI-02 (High, consolidated)** — No SAST gate in CI
3. **F-CI-03 (High, consolidated)** — No SCA gate in CI
4. **F-CI-04 (High, consolidated)** — No secret-scanning gate in CI
5. **F-CI-01 (High, consolidated)** — CI `permissions:` not declared at workflow level

The following Medium findings remain open:

1. **F-RL-04 / SEC-20260601-3P-002** — AI endpoints no rate limit
2. **SEC-20260601-3P-001** — Share cookie `Secure` and `SameSite` not explicit in code
3. **SEC-20260601-3P-003** — `/api/*` proxy short-circuit (defense-in-depth)
4. **F-DATA-04** — No data deletion API
5. **F-DATA-07** — Share data exposure (design characteristic)
6. **F-CRYPTO-06 / F-WEB-03 / SEC-20260601-3P-004** — Resend placeholder (Low, but tracked)
7. **F-LOG-03** — No log scrubbing policy documented
8. **F-SC-05** — No SBOM
9. **F-SC-07** — sharp CVEs
10. **F-CI-05** — No DAST
11. **F-CI-06** — No SBOM
12. **F-CI-07** — No signed releases
13. **F-CI-08** — No branch protection (evidence gap)
14. **F-AI-05** — LLM output state-changing
15. **F-AI-06** — Prompt injection

The following Low findings remain open (selected):

1. **F-INPUT-02** — Zod not used (validation exists, just not Zod)
2. **F-INPUT-04** — XLSX filename injection (sanitizer verified)
3. **F-RL-05** — DeepSeek 20s timeout
4. **F-RL-07** — Per-tenant DoS posture (hardening)
5. **F-API3-01** — Response shape BOPLA
6. **F-API5-01** — Admin surface (precautionary)
7. **F-API9-01** — No OpenAPI doc
8. **F-API10-01** — DeepSeek response handling
9. **F-UPLOAD-06** — Object key path
10. **F-UPLOAD-07** — No AV scanning (hardening)
11. **F-SHARE-13** — Token rotation (low, hardening)
12. **F-ERR-03** — DeepSeek error leakage
13. **F-ERR-04** — Unhandled exceptions
14. **F-LOG-04** — Audit retention not documented
15. **F-LOG-05** — Audit table integrity
16. **F-CI-09** — No coverage gate
17. **SEC-20260601-3P-016** — Landing CSP `'unsafe-inline'` / `'unsafe-eval'`
18. **SEC-20260601-3P-005** — ClarityScript `dangerouslySetInnerHTML` (controlled)
19. **SEC-20260601-3P-004** — Resend placeholder (Low)

The following Informational findings are restated (strengths and design choices):

- F-AUTH-01, F-AUTH-02, F-AUTH-05, F-INPUT-01, F-INPUT-03, F-INPUT-05, F-INPUT-06, F-INPUT-07, F-INJ-01..05, F-CRYPTO-01..05, F-CRYPTO-07, F-CRYPTO-08, F-DATA-01..03, F-DATA-05, F-DATA-06, F-DATA-08, F-RL-01, F-RL-03, F-RL-06, F-RL-08, F-SC-01, F-SC-06, F-SC-08, F-SC-09, F-SC-10, F-API1-01, F-API5-01 (defensive), F-API6-01, F-API6-02, F-API8-01, F-API8-02, F-API9-02, F-API10-02, F-AI-01, F-AI-02, F-AI-03, F-AI-04, F-AI-08, F-AI-09, F-UPLOAD-01..05, F-SHARE-01..12, F-INV-01..09, F-WEB-01, F-WEB-02, F-WEB-04, F-WEB-07, F-ERR-01, F-ERR-02, F-ERR-05, F-LOG-01

## Promotion to **Compliance-ready pending remediation**

The audit can be promoted to `Compliance-ready pending remediation` when **all** of the following are true:

### Must close (High findings)

- [ ] **F-LOG-02** — Document and implement structured monitoring/alerting pipeline (R-60). Must include: rate-limit threshold breaches, password-attempt bursts, webhook signature verification failures, service-role client instantiation failures.
- [ ] **F-CI-02** — Add SAST gate to CI (R-28). Acceptable tools: `github/codeql-action`, `semgrep`.
- [ ] **F-CI-03** — Add SCA gate to CI (R-27). Acceptable tools: `osv-scanner`, `bun audit`.
- [ ] **F-CI-04** — Add secret-scanning gate to CI (R-29). Acceptable tools: `gitleaks`, `trufflehog`, GitHub native secret scanning.
- [ ] **F-CI-01** — Add `permissions: read-all` to CI workflow level (R-64). Escalate per-job as needed.

### Should close before launch (Medium findings)

- [ ] **SEC-20260601-3P-002** — Apply per-user and per-workspace durable rate limits on AI endpoints (R-25).
- [ ] **SEC-20260601-3P-001** — Explicitly set `Secure` and `SameSite` on share-related cookies in `src/lib/publication/security.ts` (R-3P-01).
- [ ] **F-DATA-04** — Document a data-retention policy and a deletion path (R-21).
- [ ] **F-LOG-03** — Document Vercel log scrubbing for secrets (R-61).
- [ ] **F-SC-05** — Emit SBOM (CycloneDX) on each release (R-30).

### Verify in production (evidence gaps)

- [ ] **EG-01** — Live Supabase project configuration matches migration posture.
- [ ] **EG-02** — Supabase Auth provider configuration (Google OAuth, magic link, MFA policy).
- [ ] **EG-20260601-3P-001** — Share cookie `Secure` and `SameSite` in production.
- [ ] **EG-20260601-3P-002** — HSTS header in production.
- [ ] **EG-20260601-3P-003** — Storage bucket RLS/policy configuration in Supabase.
- [ ] **EG-04** — Vercel log scrubbing for secrets.
- [ ] **EG-06** — DeepSeek data processing terms.
- [ ] **EG-07** — Resend DPA and email delivery compliance.
- [ ] **EG-08** — GitHub branch protection rules.
- [ ] **EG-09** — Supabase at-rest encryption confirmation.
- [ ] **EG-10** — HTTPS/TLS enforcement at Vercel edge.
- [ ] **EG-11** — E2E test coverage for security controls.

### Nice to have (Low findings, may remain open)

- F-INPUT-02, F-INPUT-04, F-RL-05, F-RL-07, F-API3-01, F-API5-01, F-API9-01, F-API10-01, F-UPLOAD-06, F-UPLOAD-07, F-SHARE-13, F-ERR-03, F-ERR-04, F-LOG-04, F-LOG-05, F-CI-05, F-CI-06, F-CI-07, F-CI-08, F-CI-09, F-AI-05, F-AI-06, F-AI-07, F-SC-07, F-SC-08, F-AUTH-06, F-DATA-07, SEC-20260601-3P-003, SEC-20260601-3P-004, SEC-20260601-3P-005, SEC-20260601-3P-016, F-AUTH-03

## Promotion to **Not compliant yet**

The audit is `Not compliant yet` if **any** of the following is true:

- A Critical finding is open
- A cross-tenant data exposure is possible (e.g., RLS missing on a tenant table, service-role key in client bundle)
- A direct auth bypass is present (e.g., dev-bypass that does not require localhost hostname)

**Current state: None of these conditions are met.** The audit is `Partially compliant`, not `Not compliant yet`.

## Summary

| Gate state | Status | Conditions |
|---|---|---|
| `Not compliant yet` | **Not reached** | Would require Critical finding or direct auth bypass |
| `Partially compliant` | **Current** | 5 High + ~15 Medium + ~32 Low findings open; no Critical |
| `Compliance-ready pending remediation` | **Not yet** | Requires 5 High findings closed, 5 Medium findings closed, and 12 evidence gaps verified |

## Recommendations for production launch

1. **Close the 5 High findings first** (CI gates, monitoring). These are the highest-impact, lowest-effort improvements.
2. **Apply AI endpoint rate limits** (R-25). This is the Medium finding with the strongest Codex-driven impact boundary.
3. **Explicitly set cookie attributes** (R-3P-01). This is a small code change with a clear evidence gap closure.
4. **Verify all 12 evidence gaps in production** before launch. Most are Vercel/Supabase dashboard settings.
5. **Document a launch runbook** that includes: secret rotation schedule, key rotation policy, audit retention policy, alerting configuration.

## Cross-references

- See `00-executive-summary.md` for top 5 findings
- See `07_SEVERITY_RECALIBRATION.md` for severity rationale
- See `08_EVIDENCE_GAP_REGISTER_DELTA.md` for evidence gaps
- See `22_SECOND_PASS_REVIEW/11_FINAL_SECURITY_POSTURE_RESTATEMENT.md` for the second-pass posture (which the third pass inherits and formalizes)
