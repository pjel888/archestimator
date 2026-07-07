# 16 — Requirements Traceability Matrix

Column contract: `Requirement ID | Source | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision`. Source-strength legend: `brief` / `repo evidence` / `official docs` / `owner-delegated planning decision` / `derived`.

| Requirement ID | Source | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision |
|---|---|---|---|---|---|---|---|---|---|---|
| FR-1 | brief + repo | route.ts:42; repo:100 | repo evidence | 04, 07 | P0-T3 | AC-FR-1a/b/c | PC-01, PC-02 | RISK-10 | specified | none |
| FR-2 | brief + repo | repo:17-24,38-55 | repo evidence | 04, 06, 07 | P0-T2 | AC-FR-2a-e | PC-05, PC-06 | RISK-09 | specified | none |
| FR-3 | derived | repo:149-163 | repo evidence | 04, 07 | P1-T2 | AC-FR-3a-d | PC-15 | RISK-05 | specified | none |
| FR-4 | brief | n/a | derived | 04, 07, 11 | P2-T1 | AC-FR-4a-d | PC-09, PC-10 | RISK-13 | specified | none |
| FR-5 | brief + repo | retention-core.ts | repo evidence + owner-delegated | 04, 07, 11 | P3-T1/T2 | AC-FR-5a-e | PC-11, PC-12 | RISK-01/02 | gated | OPEN-ERASE-01 |
| IDENT-1 | brief + repo | account-audit.ts | repo evidence | 04, 08 | P0-T2 | AC-IDENT-1a-d | PC-04 | RISK-04 | specified | none |
| IDENT-2 | derived | session.ts | repo evidence | 04 | P0-T3 | AC-IDENT-2a | PC-02 | — | specified | none |
| SLA-1 | brief | n/a | brief + owner-delegated | 04, 07 | P4-T1 | AC-SLA-1a/b | PC-17 | RISK-11 | specified (default) | OPEN-LEGAL-02 |
| SLA-2 | brief | n/a | brief + owner-delegated | 04, 11 | P4-T2 | AC-SLA-2a/b | PC-17 | RISK-11 | gated | OPEN-LEGAL-02 |
| OPS-1 | repo | beta-allowlist-admin.ts | repo evidence | 04, 08 | P1-T1 | AC-OPS-1a/b | PC-07 | RISK-05 | specified | OPEN-OPS-01 |
| OPS-2 | derived | n/a | derived | 04, 07 | P1-T3 | AC-OPS-2a/b | PC-16 | — | specified | none |
| EMAIL-1 | brief + repo | route.ts:101; email-client | repo evidence | 04, 09 | P1-T5 | AC-EMAIL-1a-c | PC-14 | RISK-07 | specified (copy gated) | OPEN-LEGAL-01 |
| EMAIL-2 | brief | n/a | derived | 04 | P1-T5 | AC-EMAIL-2a/b | PC-14 | RISK-07 | specified (copy gated) | OPEN-LEGAL-01 |
| EVID-1 | brief | account-audit.ts, 0034 | repo evidence | 04, 07 | P1-T3, P2-T1, P3-T2 | AC-EVID-1a-c | PC-16 | RISK-10 | specified | none |
| EVID-2 | brief | account-audit.ts | repo evidence + brief | 04, 08 | P0-T2 (invariant) | AC-EVID-2a | PC-13 | RISK-10 | specified | none |
| ABUSE-1 | repo | ai/rate-limit.ts | repo evidence | 04, 07 | P0-T2/T3 | AC-ABUSE-1a-c | PC-03 | RISK-03/08 | specified | none |
| ABUSE-2 | derived | n/a | derived | 04 | deferred | AC-ABUSE-2a | n/a | RISK-03 | deferred | revisit trigger |
| UX-1 | derived | n/a | derived | 04, 05 | P0-T4 | AC-UX-1a/b | PC-08 | RISK-16 | specified | none |
| A11Y-1 | derived | workshop/settings/users | repo evidence | 05 | P1-T4 | AC-A11Y-1a-c | PC-18 | RISK-15 | specified | none |
| ARCH-1 | derived | n/a | derived | 06 | P1-T4 | (boundary) | PC-18 | RISK-15 | specified | none |
| SEC-1 | derived | d1-access.ts | repo evidence | 08 | P1-T1 | (denial) | PC-07 | RISK-05 | specified | none |
| TEST-1 | brief | n/a | brief | 12 | all phases | matrix | PC-01..18 | — | specified | none |
| DOC-1 | repo | privacy/page.tsx | repo evidence | 04, 13 | P0-T4 (gated) | (link) | n/a | RISK-14 | gated | OPEN-LEGAL-01 |

**Completion rule.** Every requirement traces to a source, work item, acceptance criterion, and test/proof. Gated items (`FR-5`, `SLA-2`, `DOC-1`, parts of `EMAIL-1/2`) are explicitly marked with their `OPEN-*` decision; they are not silently omitted. No requirement is untraced.

**Source-strength distribution:** `repo evidence` = 14; `derived` = 6; `brief`/`brief+repo` = 4; `owner-delegated` = 3 (overlapping with `OPEN-*`). No requirement rests on `official docs` alone.
