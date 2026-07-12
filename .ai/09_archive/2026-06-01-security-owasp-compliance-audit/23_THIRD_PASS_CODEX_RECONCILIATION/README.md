# Third-Pass Security Audit — Codex Threat-Model Reconciliation

**Date:** 2026-06-01
**Reviewer:** CommandCode third-pass security audit agent (Codex threat-model reconciliation)
**First-pass audit folder reviewed:** `.ai/03_plans/2026-06-01-security-owasp-compliance-audit/`
**Second-pass folder reviewed:** `.ai/03_plans/2026-06-01-security-owasp-compliance-audit/22_SECOND_PASS_REVIEW/`
**Git head:** `dc044465f5c20ca75c60cee6606717abf47eae41` (branch `main`)

## What the third pass did

The third pass takes the threat model and findings from the first two passes and reconciles them against an independent Codex-style threat model — a fresh, slightly more aggressive, primarily tenant-data-focused review. The third pass:

- Re-reads the first-pass documents (`00`–`21`) and the second-pass documents (`01`–`11`)
- Treats Codex claims as **leads**, not ground truth; every claim is verified against `src/`, `supabase/migrations/`, `next.config.ts`, `.env.example`, and `.github/workflows/ci.yml`
- Re-evaluates severity using the Codex production-readiness model: cross-tenant data exposure = Critical; single-tenant IDOR = High; limited CSRF / XLSX formula = Medium; header / metadata issues = Low
- Identifies false positives (Codex claims not supported by the repo) and false negatives (material risks Codex surfaced that the first two passes missed)
- Produces a final production-readiness decision: **Not compliant yet** / **Partially compliant** / **Compliance-ready pending remediation**
- Edits existing audit documents in-place to remove contradictions and align with the final posture

## Final production-readiness decision

**`Partially compliant`** — see `18_PRODUCTION_READINESS_GATE.md` for the formal gate and the conditions for promotion to `Compliance-ready pending remediation`.

## Top 5 reconciled findings (third-pass)

1. **SEC-20260601-3P-001 (Medium, was: Information)** — Share access cookie `ae_publication_access` is signed with HMAC-SHA256 but `Secure` and `SameSite` attributes cannot be verified in code; they depend on `next/headers` defaults at request time. **Hardening recommendation** added.
2. **SEC-20260601-3P-002 (Medium, was: Low)** — `/api/ai/ask` and `/api/ai/package-builder` are confirmed to invoke **no** rate limiter of any kind (durable or in-memory). This was accurately flagged in the first two passes as Medium; the third pass re-confirms and adds a Codex-style tenant-cost-amplification rationale that pushes the impact boundary higher.
3. **SEC-20260601-3P-003 (Medium, was: Information)** — `src/proxy.ts` short-circuits `/api/*` to `NextResponse.next({ request })` without invoking the auth gate. This is intentional (route handlers enforce their own auth), but Codex's claim that "API requests bypass the auth wall" is **literally true** at the proxy layer. RLS + handler-level auth provide the real defense. The risk is fully bounded by handler-level enforcement and RLS, so the rating is **Medium** (defense-in-depth gap), not High or Critical.
4. **SEC-20260601-3P-004 (Low, was: Medium)** — `Resend("re_webhook_verifier")` placeholder default in `src/lib/email/resend-webhooks.ts:40` remains. The `route.ts` handler returns 503 when the env var is missing, so the placeholder string is never actually used to send email in production. Risk is therefore **Low** (drift risk only), downgraded from Medium.
5. **SEC-20260601-3P-005 (Low, new)** — `dangerouslySetInnerHTML` is used in `src/components/landing/ClarityScript.tsx` for Microsoft Clarity analytics. Source is server-controlled (no user input). Documented as a controlled injection point, not a finding, but recorded for completeness.

## Index

| # | Doc | Description |
|---|---|---|
| 01 | [Third-Pass Method](./01_THIRD_PASS_METHOD.md) | Tools, commands, evidence standard, limitations |
| 02 | [Codex Threat-Model Inventory](./02_CODEX_THREAT_MODEL_INVENTORY.md) | Every Codex claim with verdict |
| 03 | [First/Second-Pass Correction Delta](./03_FIRST_SECOND_PASS_CORRECTION_DELTA.md) | What changed since second pass |
| 04 | [Finding Reconciliation Matrix](./04_FINDING_RECONCILIATION_MATRIX.md) | Codex claim → existing finding → action |
| 05 | [False Positives from Codex](./05_FALSE_POSITIVES_FROM_CODEX.md) | Codex claims rejected with evidence |
| 06 | [False Negatives from Codex](./06_FALSE_NEGATIVES_FROM_CODEX.md) | New findings Codex surfaced |
| 07 | [Severity Recalibration](./07_SEVERITY_RECALIBRATION.md) | Revised severity model and per-finding recalibration |
| 08 | [Evidence Gap Register Delta](./08_EVIDENCE_GAP_REGISTER_DELTA.md) | New and closed evidence gaps |
| 09 | [Attack Surface Delta](./09_ATTACK_SURFACE_DELTA.md) | Third-pass surface diff |
| 10 | [OWASP API Top 10 Delta](./10_OWASP_API_TOP10_DELTA.md) | API Top 10 corrections |
| 11 | [RLS / SECURITY DEFINER Audit Delta](./11_RLS_SECURITY_DEFINER_AUDIT_DELTA.md) | RLS reconfirmation |
| 12 | [AI / LLM Threat Model](./12_AI_LLM_THREAT_MODEL.md) | AI threat model |
| 13 | [Share Publication Threat Model](./13_SHARE_PUBLICATION_THREAT_MODEL.md) | Share threat model |
| 14 | [Invite Collaboration Threat Model](./14_INVITE_COLLABORATION_THREAT_MODEL.md) | Invite threat model |
| 15 | [Webhook Threat Model](./15_WEBHOOK_THREAT_MODEL.md) | Webhook threat model |
| 16 | [CSP / Header Threat Model](./16_CSP_HEADER_THREAT_MODEL.md) | CSP / header threat model |
| 17 | [Rate Limiting Threat Model](./17_RATE_LIMITING_THREAT_MODEL.md) | Rate-limit threat model |
| 18 | [Production Readiness Gate](./18_PRODUCTION_READINESS_GATE.md) | Final gate: Not / Partial / Compliance-ready |
| 19 | [Third-Pass Evidence Appendix](./19_THIRD_PASS_EVIDENCE_APPENDIX.md) | Evidence commands, grep output, and findings |

## Conventions

- Findings are tagged `SEC-20260601-3P-###` (third-pass) or `SEC-20260601-2P-###` (second-pass restated)
- Original first-pass IDs (`F-<DOMAIN>-NN`) are preserved on existing findings
- Severity uses Critical / High / Medium / Low / Informational per Codex model:
  - **Critical:** cross-tenant data exposure, full DB compromise, secret leakage to public
  - **High:** single-tenant IDOR, auth bypass, secret leakage to authenticated users
  - **Medium:** limited CSRF, XLSX formula injection, missing rate limit on a non-credential endpoint
  - **Low:** header / metadata issues, drift risk, hardening recommendations
- Likelihood and impact are Low / Medium / High
- A **claim** is anything the Codex assessment states; a **finding** is a claim verified against repo evidence

## What was NOT done (limitations)

- No source code, test, migration, package.json, config, CI, or env file was modified
- No `bun run type-check`, `bun run lint`, `bun run test`, `bun run build`, or `bun run test:e2e` was run (the second pass already produced these results — see `22_SECOND_PASS_REVIEW/10_SECOND_PASS_EVIDENCE_APPENDIX.md`)
- No Supabase state was mutated
- No email was sent
- No branches were created, no commits were made, no PRs were opened
