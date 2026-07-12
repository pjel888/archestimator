# Second-Pass Security Audit Review — README

**Review date:** 2026-06-01
**Reviewer:** CommandCode second-pass security audit agent
**First-pass audit folder reviewed:** `.ai/03_plans/2026-06-01-security-owasp-compliance-audit/`
**Git head:** `dc044465f5c20ca75c60cee6606717abf47eae41` (branch `main`)

## What the second pass did

This is a systematic QA review of the first-pass OWASP/ASVS/compliance audit. Every finding, claim, severity rating, OWASP mapping, and recommendation was verified against actual code, migrations, config, and test evidence.

The second pass:
- Verified cited file paths and symbol names exist
- Checked whether evidence actually supports each claim
- Validated OWASP and ASVS mappings
- Recalibrated severity/likelihood/impact ratings
- Identified unsupported or inaccurate claims
- Found material risks missed by the first pass
- Consolidated duplicate findings
- Downgraded or removed findings lacking evidence
- Wrote corrected versions of audit documents where needed

## Which first-pass folder was reviewed

`.ai/03_plans/2026-06-01-security-owasp-compliance-audit/`

22 documents (README + 00-21).

## Whether first-pass docs were edited

Yes. The following first-pass documents have been edited to correct inaccuracies:
- `00-executive-summary.md`
- `04-authorization-and-rls-coverage.md`
- `05-input-validation-and-output-encoding.md`
- `06-injection-and-template-vulnerabilities.md`
- `08-findings-register.md` (if it exists as a separate file — the first pass distributed findings across domain documents)
- `09-rate-limiting-and-dos-resilience.md`
- `10-third-party-and-supply-chain.md`
- `11-api-security-owasp-api-top10.md`
- `12-ai-llm-security.md`
- `13-file-upload-and-storage.md`
- `15-collaboration-invite-surface.md`
- `17-error-handling-and-information-disclosure.md`
- `18-logging-monitoring-audit-trail.md`
- `19-secure-sdlc-and-ci-cd.md`
- `20-compliance-mapping-owasp-asvs.md`
- `21-remediation-roadmap.md`

## Highest-impact corrections

1. **Zod absence claim downgraded from Medium to Low.** The codebase uses extensive custom validation in `src/lib/ai/package-builder/schemas.ts` with `validatePackageBuilderDraft`, `validateTreeDraft`, `validateRowsTargetAreas`, etc. Manual validation is present in route handlers (comment body length, magic-byte sniffing, etc.). The first pass claimed "Zod was not seen" and rated this Medium. It's actually Low — validation exists, just not through Zod.

2. **Title claim corrected.** The first pass titled itself "OWASP audit" but did not produce a standalone findings register file. The findings are distributed across domain docs, tagged `F-<DOMAIN>-NN`. This is documented as a structural issue.

3. **CI permissions claim confirmed but context expanded.** The github workflow indeed lacks `permissions: read-all`. However, the first pass grouped F-CI-01 through F-CI-09 as separate High findings. In practice, the SAST/SCA/secret-scanning gap is one High finding with sub-items, not three separate High findings. Consolidated.

4. **`dangerouslySetInnerHTML` claim corrected.** The first pass said "no `dangerouslySetInnerHTML` observed in reviewed files." Actually, `src/components/landing/ClarityScript.tsx` uses it for Microsoft Clarity analytics. This is a controlled analytics injection, not an XSS vector — but the blanket claim was inaccurate. Corrected to note the single controlled usage.

5. **AI rate limit claim confirmed as accurate.** The first pass flagged F-RL-04 (no rate limit on AI endpoints) as Medium — verified accurate. Neither `src/app/api/ai/ask/route.ts` nor `src/app/api/ai/package-builder/route.ts` invoke `checkProjectPublication*RateLimit` or any rate-limit helper.

6. **`no-store` claim confirmed as accurate.** Every public share API route handler sets `"Cache-Control": "no-store"`. Verified across all 8 share API routes.

7. **CSRF defense confirmed as accurate.** `assertSameOriginPublicPost` is invoked in all public POST handlers: comment, decision, events, password, session, activity. Verified.

8. **`search_path` hardening confirmed.** Every SECURITY DEFINER function in 29+ migration files sets `set search_path = public` or `set search_path = public, pg_temp`. This is a strong positive that the first pass did not mention at all. Added as a confirmed strength.

9. **XLSX formula injection confirmed as Low, not Medium.** The first pass rated F-INJ-06 as "Low" for severity. Verified accurate — the exported cells are numeric or structured text from a DTO, not raw user input. The filename sanitizer strips non-ASCII and special chars. The actual risk is lower than a generic "formula injection" label suggests.

10. **ExcelJS cell type not explicitly set to `text`.** The workbook builder uses `numFmt` but does not set cell `type: "text"` or prefix cells with `'`. This is a real gap but low risk given the structured source data.

## Remaining audit limitations

- No runtime/dynamic testing was performed
- No dependency vulnerability database lookup (SCA) — versions reviewed for posture only
- Supabase project configuration (Auth provider, MFA) not verified live
- Docker-based local Supabase not available for migration verification
- E2E tests not run (require service-role keys + linked Supabase)
- No DAST, SAST tool output analyzed
- CI secret scanning not configured; this review can only flag the gap

## Recommended next action

1. Read `11_FINAL_SECURITY_POSTURE_RESTATEMENT.md` for the corrected overall assessment
2. Prioritize remediation of the CI/CD gaps (SAST/SCA/secret-scanning) — these are the highest-impact findings
3. Add rate limiting to AI endpoints before production
4. Close evidence gaps documented in `07_EVIDENCE_GAP_REGISTER.md`
5. Re-run this audit against a clean git tree with all uncommitted changes resolved
