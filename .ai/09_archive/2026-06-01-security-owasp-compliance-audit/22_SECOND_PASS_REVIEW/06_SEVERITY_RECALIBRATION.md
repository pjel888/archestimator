# 06 — Severity Recalibration

## Severity model used

| Severity | Criteria |
|---|---|
| Critical | Direct path to full data compromise, no compensating controls |
| High | Significant data exposure or system compromise, limited compensating controls |
| Medium | Material risk with partial compensating controls |
| Low | Minor risk or well-mitigated by existing controls |
| Informational | Control verification, design characteristic, or hardening note |

## Findings upgraded

None. The first pass was generally conservative with severity ratings. No finding was upgraded during the second pass.

## Findings downgraded

| Original ID | Original Severity | New Severity | Reason |
|---|---|---|---|
| F-INPUT-02 | Medium | Low | Extensive custom validation exists (`validatePackageBuilderDraft`, etc.) |
| F-INPUT-04 | Medium | Low | Filename sanitizer strips to `[a-zA-Z0-9]+`, no injection possible |
| F-API1-02 | Medium | Info | Token crypto is 256-bit; shared-link access by design |
| F-AUTH-06 | Low | Info | Engineering hygiene, not security vulnerability |
| F-RL-07 | Medium | Low | Durable rate limiter provides per-token/IP scoping; per-tenant is hardening |
| F-UPLOAD-06 | Medium | Low | Auth-protected routes; path traversal requires auth bypass first |
| F-UPLOAD-07 | Medium | Low | Attachments not forwarded to consumers; internal-only surface |
| F-AI-07 | Medium | Low | Operational procedure gap, not code vulnerability |
| F-SHARE-13 | Medium | Low | Token rotation IS implemented; expiry enforcement is hardening |
| F-API9-01 | Medium | Low | Documentation gap, not security vulnerability |

## Findings split

None. No finding was split into multiple findings. The original granularity was appropriate.

## Findings merged

| Original IDs | New ID | Reason |
|---|---|---|
| F-CI-01, F-CI-02, F-CI-03, F-CI-04 | F-CI-CONSOLIDATED | All CI pipeline security gate gaps — one remediation story |
| F-CRYPTO-06, F-WEB-03 | F-CRYPTO-06 (kept) | Exact same finding in two docs |

## Findings that remained unchanged

Approximately 75 findings kept their original severity, status, and OWASP mapping. These were confirmed accurate by code evidence:
- All cryptographic findings (F-CRYPTO-01 through F-CRYPTO-05, F-CRYPTO-07, F-CRYPTO-08) — verified correct
- All RLS/authorization findings (F-AUTHZ-01 through F-AUTHZ-04) — verified correct
- Most injection findings (F-INJ-01 through F-INJ-05) — verified correct
- Upload route findings (F-UPLOAD-01 through F-UPLOAD-05) — verified correct
- Share-link findings (F-SHARE-01 through F-SHARE-11) — verified correct
- Webhook findings (F-WEB-01, F-WEB-02, F-WEB-04, F-WEB-06, F-WEB-07) — verified correct
- Error handling findings (F-ERR-01 through F-ERR-05) — verified correct
- Logging findings (F-LOG-01 through F-LOG-05) — verified correct
- Remaining CI findings (F-CI-05 through F-CI-09) — verified correct as Medium/Low

## Corrected top 10 final risks

After recalibration, the highest-priority risks are:

1. **F-CI-CONSOLIDATED (High)** — CI pipeline lacks SAST, SCA, secret-scanning, and `permissions:` declaration. Evidence: `.github/workflows/ci.yml` confirmed.
2. **F-LOG-02 (High)** — No documented structured security monitoring/alerting. Evidence: No alerting configuration in repo.
3. **F-RL-04 (Medium)** — AI endpoints (`/api/ai/ask`, `/api/ai/package-builder`) lack rate limiting. Evidence: Neither route invokes rate-limit helpers.
4. **F-AI-05 (Medium)** — LLM output used as state-changing payload (Apply path). Evidence: `src/lib/ai/package-builder/apply.ts` writes to DB.
5. **F-AI-06 (Medium)** — Prompt injection on Ask and Package Builder. Evidence: User text forwarded to DeepSeek.
6. **F-CRYPTO-06 (Medium)** — Resend client constructor has placeholder default. Evidence: `new Resend("re_webhook_verifier")`.
7. **F-DATA-04 (Medium)** — No data deletion/retention path. Evidence: No deletion API or scheduled job in repo.
8. **F-LOG-03 (Medium)** — No log scrubbing policy for service-role key. Evidence: Vercel log scrubbing not verifiable from repo.
9. **F-SC-07 (Medium)** — `sharp` CVEs require monitoring. Evidence: `sharp` used in upload routes, has history of memory-corruption CVEs.
10. **SEC-20260601-2P-003 (Low)** — `sessionStorage` stores comment text in offline queue. New finding from second pass.

## Disagreement with first pass

The primary methodological concern is that the first pass distributed findings across domain documents without a single consolidated findings register. This makes it harder to:
- Count total findings accurately
- Track duplicate findings
- Prioritize remediation across domains
- Report findings to stakeholders

The second pass has consolidated all findings into the validation matrix (03_FINDINGS_VALIDATION_MATRIX.md) but the original domain-doc structure has been preserved for traceability.

Additionally, the first pass over-counted by treating CI pipeline gaps (SAST, SCA, secret-scanning, permissions) as separate High findings when they're sub-items of one gap. Merging them produces a more honest risk count.

The first pass also did not distinguish between code-security vulnerabilities and operational/documentation gaps. The second pass makes this distinction clearer in the evidence gap register.
