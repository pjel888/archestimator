# 23 — Critique and Improvement Log (v1 → v2)

**Purpose:** Honest record of the v1 pack's gaps, the v2 critique cycle, what was
upgraded, what was added, and what remains. Required by the Improve-Plan directive.

---

## V1 critical self-audit (what the original pack missed)

Running the adversarial + industry-standard lens against the v1 pack surfaced
these genuine gaps (not ceremony):

| # | V1 gap | Why it matters | Severity of omission |
|---|---|---|---|
| C1 | **No industry-standard mapping** (OWASP ASVS, NIST 800-63B, CWE, OWASP API Top 10) | A "all attack vectors covered" claim must be checkable against a recognized standard, not just the author's own threat list | High |
| C2 | **Session token at rest (SEC-11) not identified** | V1 found magic-link plaintext but missed that `session.token` (`internal-adapter.mjs:182,202`) is ALSO raw at rest — the same verifier-compromise class | **High (missed P1)** |
| C3 | **No full credential-material taxonomy** | Improve-Plan directive mandates distinguishing raw/hash/encrypted/derived/public/lookup-key for every credential — v1 had only a partial table in `04` | High |
| C4 | **Open-redirect control (CWE-601) undocumented** | v1 listed open-redirect as ✅ in the matrix but never explained the defense (`sanitizeNextPath` + BA `originCheck`) — an implementer might not know to preserve it | Medium |
| C5 | **Email-enumeration control (CWE-204) undocumented** | v1 didn't credit that `?sent=1` is uniform — an implementer might accidentally add email-existence feedback | Medium |
| C6 | **`BETTER_AUTH_SECRET` overload (SEC-13) not analyzed** | Secret used for session signing + terms-gate cookie + publication-cookie fallback — rotation blast radius unknown | Medium |
| C7 | **`accountLinking` policy (SEC-14) not analyzed** | ATO-via-merge uncertainty — BA default behavior unverified | Medium |
| C8 | **Magic-link token in Workers Logs (CWE-532 / SEC-12) not analyzed** | Token-in-URL is inherent; log-leak path unverified | Medium |
| C9 | **No "revoke all sessions" (SEC-8) / sign-out row-deletion (SEC-10)** | ASVS V3.3.1/V3.3.2 — v1 assumed sign-out was sufficient without verifying D1 row deletion | Low–Med |
| C10 | **No research-follow-up register** | Several Better Auth behaviors (accountLinking default, session-hash config, rate-limit backing) are assumptions labeled as fact | Medium |
| C11 | **Implementation plan lacked SEC-11–SEC-14 tasks** | v1 plan only covered SEC-1–SEC-7 | High |

## V2 actions taken

### Documents added (4 new)

| Doc | Purpose | Closes gap |
|---|---|---|
| `20_INDUSTRY_STANDARD_FACETS_ANALYSIS.md` | OWASP ASVS / NIST 800-63B / CWE / OWASP API mapping + new requirements | C1 |
| `21_CREDENTIAL_MATERIAL_TAXONOMY.md` | Full 18-material taxonomy (raw/hash/encrypted/derived/public/lookup-key, visibility, replay) | C3 |
| `22_ATTACKER_PLAYBOOK.md` | 14 end-to-end attack chains with verdicts | C1 + adversarial |
| `23_CRITIQUE_AND_IMPROVEMENT_LOG.md` | This document — honest gap record | directive requirement |

### Documents upgraded (in this cycle)

| Doc | Upgrade | Closes gap |
|---|---|---|
| `04_REQUIREMENTS_SPECIFICATION.md` | +SEC-8/9/10/11/12/13/14; source-strength per requirement | C11 |
| `11_IMPLEMENTATION_PLAN.md` | +Phase 0.5 (SEC-11/12/13/14 research+design); re-sequence SEC-11 as P1 | C11 |
| `08_SECURITY_PRIVACY_THREAT_MODEL.md` | +T-25..T-31 (session-at-rest, secret-overload, account-linking, log-leak, email-bombing, enumeration-credit, open-redirect-credit) | C4,C5,C6,C7,C8 |
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | +section H (industry-standard posture summary) | C1 |
| `01_EXECUTIVE_SUMMARY.md` | +second P1 (SEC-11); corrected "no current bypass" to "no current auth-method bypass; 2 verifier-compromise hardening items" | C2 |
| `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | +7 new requirement rows | C11 |
| `14_RISK_REGISTER.md` | +RISK-12..16 (session-hash feasibility, account-linking, log-leak, secret-overload, email-bombing) | C6,C7,C8 |
| `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | +DEC-6..9 (session-hash approach, account-linking, secret-separation, log-redaction) | C6,C7 |
| `17_FINAL_READINESS_REVIEW.md` | re-scored (security drops to reflect open SEC-11; roadmap to readiness) | honesty |
| `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | +RFU-1..4 research follow-ups labeled ASSUMPTION | C10 |
| `README.md` | +new docs in index; +SEC-11 to phase map; +honesty correction | consistency |
| `LOOP_LEDGER.md` | +v2 critique cycle entry | process |

### Documents consolidated / marked obsolete

None deleted — v1 docs were upgraded in place rather than duplicated. No redundancy introduced.

## Contradictions found and resolved

| Contradiction | Resolution |
|---|---|
| v1 said "no current exploitable auth bypass" | **Corrected:** "no current auth-METHOD bypass (Google+magic-link exclusivity holds). However, two verifier-compromise hardening items (SEC-1 magic-link plaintext, SEC-11 session plaintext) mean a DB read-exposure could mint sessions. These are hardening items, not active bypasses, but the v1 framing understated them." |
| v1 listed open-redirect as ✅ without evidence | **Resolved:** added evidence (sanitizeNextPath + BA originCheck) in `22` Chain 6 + `20` CWE table. |
| v1 listed email-enumeration implicitly | **Resolved:** credited explicitly as CWE-204 control. |

## V2 score impact (honest)

V1's security score (94, pending SEC-1) was **slightly inflated** because it
didn't account for SEC-11. V2 drops the security readiness to reflect SEC-11 as
an open P1 until resolved. This is the honest posture: the pack now *names* the
gap and the path to close it, rather than implying SEC-1 was the only token-at-rest issue.

## Remaining (after v2)

- SEC-11 design needs RFU-1 (Better Auth session-hash config) before it's implementation-ready — that's an explicit `DISCOVERY-REQUIRED` task, not a hidden blocker.
- SEC-14 needs RFU-2 (BA accountLinking default) — `DISCOVERY-REQUIRED`.
- SEC-5 needs RFU-3 (rate-limit backing on Workers) — `DISCOVERY-REQUIRED`.
- These are all bounded read-only research steps with falsifiable evidence targets.
