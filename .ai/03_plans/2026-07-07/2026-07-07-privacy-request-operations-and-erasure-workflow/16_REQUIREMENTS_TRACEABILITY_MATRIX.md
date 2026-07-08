# 16 — Requirements Traceability Matrix

> *(Improved 2026-07-07.)* Column shape now matches the directive exactly: `Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision | User/system outcome`. Source-strength legend: `brief` / `repo evidence` / `official docs` / `owner-delegated planning decision` / `derived`. Source IDs: `SRC-BRIEF` (PROMPT.md), `SRC-REPO` (current source/migrations/tests), `SRC-DOCS` (local Next.js/Cloudflare docs), `SRC-DERIVED`, `SRC-OD` (owner-delegated planning decision).

| Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision | User/system outcome |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SRC-REPO | FR-1: intake accepts anon + authenticated | `route.ts:42`; repo:100-147 | repo evidence | 04, 07, 20-R1 | P0-T3 | AC-FR-1a/b/c | PC-01, PC-02 | RISK-10 | specified | none | requester can submit; authenticated auto-verified |
| SRC-REPO+SRC-BRIEF | FR-2: state-machine-guarded transitions | repo:17-24,38-55 | repo evidence | 04, 06, 07 | P0-T2 | AC-FR-2a-e | PC-05, PC-06 | RISK-09 | specified | none | lifecycle columns finally driven; illegal moves rejected |
| SRC-DERIVED | FR-3: queue + detail read endpoints | repo:149-163 | repo evidence | 04, 07, 20-R3/R4 | P1-T2 | AC-FR-3a-d | PC-15 | RISK-05 | specified | OPEN-OPS-01 | operator can see the queue |
| SRC-BRIEF | FR-4: export fulfillment | n/a | derived | 04, 07, 11 | P2-T1 | AC-FR-4a-d | PC-09, PC-10 | RISK-13 | specified | OPEN-OPS-01 | access/portability fulfilled with evidence |
| SRC-REPO+SRC-OD | FR-5: erasure dry-run + confirm | retention-core.ts | repo evidence + owner-delegated | 04, 07, 11 | P3-T1/T2 | AC-FR-5a-e | PC-11, PC-12 | RISK-01/02 | gated | OPEN-ERASE-01 | erasure never fires unverified/un-scoped |
| SRC-REPO+SRC-BRIEF | IDENT-1: hashed-token verify loop | account-audit.ts; better-auth-cloudflare.ts | repo evidence | 04, 08, 21-B | P0-T2 + P0-T5 | AC-IDENT-1a-d | PC-04 | RISK-04 | specified | none | anonymous identity verifiable before erasure |
| SRC-REPO | IDENT-2: authenticated fast path | session.ts | repo evidence | 04 | P0-T3 | AC-IDENT-2a | PC-02 | — | specified | none | signed-in users skip the email loop |
| SRC-BRIEF+SRC-OD | SLA-1: SLA clock model | n/a | brief + owner-delegated | 04, 07 | P4-T1 | AC-SLA-1a/b | PC-17 | RISK-11 | specified (30d default) | OPEN-LEGAL-02 | due date computed on triage |
| SRC-BRIEF+SRC-OD | SLA-2: breach + escalation | n/a | brief + owner-delegated | 04, 11 | P4-T2 | AC-SLA-2a/b | PC-17 | RISK-11 | gated | OPEN-LEGAL-02 | breaches surface to an owner |
| SRC-REPO | OPS-1: operator gate (platform-admin) | beta-allowlist-admin.ts | repo evidence | 04, 08, 21-A | P1-T1 | AC-OPS-1a/b | PC-07 | RISK-05 | specified | OPEN-OPS-01 | only platform admins operate |
| SRC-DERIVED | OPS-2: notes/history | n/a | derived | 04, 07 | P1-T3 | AC-OPS-2a/b | PC-16 | — | specified | none | operator decisions auditable |
| SRC-REPO+SRC-BRIEF | EMAIL-1: confirmation email | route.ts:101; transactional-email-client.ts | repo evidence | 04, 09, 20-R1 | P1-T5 | AC-EMAIL-1a-c | PC-14 | RISK-07 | specified (copy gated) | OPEN-LEGAL-01 | requester knows request was received |
| SRC-DERIVED | EMAIL-2: status-update email | n/a | derived | 04 | P1-T5 | AC-EMAIL-2a/b | PC-14 | RISK-07 | specified (copy gated) | OPEN-LEGAL-01 | requester learns of resolution |
| SRC-REPO | EVID-1: audit every transition/fulfillment | account-audit.ts; 0034 | repo evidence | 04, 07 | P1-T3, P2-T1, P3-T2 | AC-EVID-1a-c | PC-16 | RISK-10 | specified | none | evidence survives for retention period |
| SRC-REPO+SRC-BRIEF | EVID-2: no raw personal data in evidence | account-audit.ts | repo evidence + brief | 04, 08, 21-B | P0-T2 (invariant) | AC-EVID-2a | PC-13 | RISK-10 | specified | none | no PII in logs/storage/evidence |
| SRC-REPO | ABUSE-1: intake rate limit | ai/rate-limit.ts | repo evidence | 04, 07, 20-R1 | P0-T2/T3 | AC-ABUSE-1a-c | PC-03 | RISK-03/08 | specified | none | flooding throttled |
| SRC-DERIVED | ABUSE-2: Turnstile (deferred) | n/a | derived | 04 | deferred | AC-ABUSE-2a | n/a | RISK-03 | deferred | revisit trigger | bot protection if abuse appears |
| SRC-DERIVED | UX-1: requester status lookup | n/a | derived | 04, 05, 20-R2 | P0-T4 | AC-UX-1a/b | PC-08 | RISK-16 | specified | none | requester checks status w/o operator |
| SRC-REPO | A11Y-1: operator UI a11y | workshop/settings/users | repo evidence | 05 | P1-T4 | AC-A11Y-1a-c | PC-18 | RISK-15 | specified | OPEN-OPS-01 | keyboard/SR operable queue |
| SRC-DERIVED | ARCH-1: Server/Client boundary | n/a | derived | 06, 20 | P1-T4 | (boundary) | PC-18 | RISK-15 | specified | OPEN-OPS-01 | smallest client island |
| SRC-REPO | SEC-1: server-side authz | d1-access.ts | repo evidence | 08, 21-A | P1-T1 | (denial) | PC-07 | RISK-05 | specified | OPEN-OPS-01 | no UI-only gate |
| SRC-BRIEF | TEST-1: anon + auth coverage | n/a | brief | 12 | all phases | matrix | PC-01..18 | — | specified | none | behavior objectively proven |
| SRC-REPO | DOC-1: privacy notice links workflow | privacy/page.tsx | repo evidence | 04, 13 | doc-update (gated, not a code phase) | (link) | n/a | RISK-14 | gated | OPEN-LEGAL-01 | public points to the workflow |

**Completion rule.** Every requirement traces to a source, work item, acceptance criterion, test/proof, and a user/system outcome. Gated items (`FR-5`, `SLA-2`, `DOC-1`, parts of `FR-3/FR-4/EMAIL-*/A11Y-1/ARCH-1/SEC-1` via `OPEN-OPS-01`) are explicit; none is silently omitted. No requirement is untraced.

**Source-strength distribution:** `repo evidence` = 14; `derived` = 6; `brief`/`brief+repo` = 4; `owner-delegated` = 3 (overlapping with `OPEN-*`); none rests on `official docs` alone. Framework-sensitive claims (cache model) are grounded in `SRC-DOCS` evidence recorded in `20` (versions + `cacheComponents` off, verified from `package.json`/`next.config.ts`).
