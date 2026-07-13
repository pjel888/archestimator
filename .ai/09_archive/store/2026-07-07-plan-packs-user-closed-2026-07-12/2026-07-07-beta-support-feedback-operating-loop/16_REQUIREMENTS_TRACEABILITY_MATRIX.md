# 16 — Requirements Traceability Matrix

Mandated schema (Improve-Plan-Prompt §2): `Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision`.

Source strength legend: `brief` (PROMPT.md), `repo evidence` (current source), `derived` (inferred), `official docs` (framework/provider), `provider proof` (runtime readback), `owner-delegated` (planning decision). Every requirement maps to source evidence, an acceptance criterion, and a proof path.

| Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision |
|---|---|---|---|---|---|---|---|---|---|---|
| SRC-BRIEF-ack | FR-ACK-01 honest reporter acknowledgement | PROMPT.md "acknowledgement UX … status expectations" | brief | 04, 05 | P0-T1 | ack region renders with promise text; severity-aware; no guaranteed-fix promise | `tests/vitest/beta-feedback-form-ui.test.tsx` DOM | copy drift | ready | none |
| SRC-03-deadcode | FR-ACK-02 input preserved on D1 failure | `beta-feedback.ts:76` `buildBetaFeedbackMailto` dead code; `feedback/page.tsx:21` static mailto | repo evidence | 04, 11 P0-T2 | P0-T2 | fallback mailto carries message/type/severity; payload not logged | `tests/vitest/beta-feedback.test.ts` (extend) | URL-length limit on redirect params (P1) | ready | **P1**: 4000-char message exceeds URL limit → P0-T2 must truncate or use a short-lived signed token (see 11 P0-T2 revision) |
| SRC-BRIEF-alert | FR-NOTIFY-01 operator notify on blocker/high | PROMPT.md "support alert integration" | brief | 04, 11 P0-T3 | P0-T3 | blocker/high → `sendEmail` + log; non-fatal; idempotent within window | `tests/vitest/beta-feedback-notify.test.ts` (new) | email env unconfigured (OPEN-MON-01) | ready | OPEN-MON-01 (hosted proof) |
| SRC-PERSONA-SLA | FR-SLA-01 SLA definition + tracking | `admin-support-operator-use-cases.md` open question "What SLA…?" | repo evidence + owner-delegated | 04, 11 P1-T1/T2/T3 | P1-T1,T2,T3 | timestamps set (guarded once); business-day math; config-sourced | `tests/vitest/beta-feedback-sla.test.ts` (new) | SLA values owner-delegated | ready | OPEN-SLA-01 (defaults recorded; owner can override) |
| SRC-DERIVED-sweep | FR-SLA-02 daily breach sweep + alert | derived from FR-SLA-01 + brief | derived | 04, 11 P1-T4 | P1-T4 | sweep flags breaches; alerts once (`alerted_at`); perf budget met | `tests/vitest/beta-feedback-sla-sweep.test.ts` (new) + perf variant | webhook hang (T-10) | ready | webhook timeout must be ADDED (template lacks it) |
| SRC-BRIEF-followup | FR-FOLLOWUP-01 reporter follow-up on resolve | PROMPT.md "followed up" | brief | 04, 11 P2-T1 | P2-T1 | resolve → reporter email; non-fatal; no re-send | `tests/vitest/beta-feedback.test.ts` (extend review-action) | `user_email` malformed (T-13) | ready | T-13 validation gate added |
| SRC-PERSONA-001 | FR-QUEUE-01 paginated review queue | `SUPPORT-001` "avoid losing feedback beyond latest 50" | repo evidence | 04, 11 P1-T3/T5 | P1-T3,T5 | queue paginates; no loss beyond 50; status filter across pages | `tests/vitest/beta-feedback-review-ui.test.tsx` + store test | n/a | ready | none |
| SRC-03-a11y | UX-A11Y-01 label association Type/Severity | `BetaFeedbackForm.tsx:82,93` `aria-label` not `<label>` | repo evidence | 04, 05, 11 P1-T5 | P1-T5 | real `<label htmlFor>`/`aria-labelledby` | DOM test | `DropdownSelect` may need label prop | ready | DISCOVERY: check `dropdown-select.tsx` label passthrough |
| SRC-03-a11y | UX-A11Y-02 ack live region + focus | `BetaFeedbackForm.tsx` no `aria-live`, no focus move | repo evidence | 04, 05, 11 P0-T1 | P0-T1 | `aria-live`+`role`; focus moves on inline submit | `beta-feedback-form-ui.test.tsx` | n/a | ready | none |
| SRC-DERIVED-badge | UX-QUEUE-01 SLA badge + breach filter | derived from FR-SLA-01 | derived | 04, 05, 11 P1-T5 | P1-T5 | badge icon+text (non-color); breach filter returns breached rows | `beta-feedback-review-ui.test.tsx` | CLS on badge render (20) | ready | reserve cell width (20 CWV) |
| SRC-BRIEF-nocrm | ARCH-01 additive columns, no new tables | PROMPT.md "do not overbuild a CRM" | brief | 04, 06, 21 | P1-T1 | migration 0039 additive-only; rollback DROP COLUMN | migration readback | n/a | ready | none |
| SRC-03-email | ARCH-02 reuse email + alert clients | `transactional-email-client.ts:82`, `operational-telemetry.ts:131` | repo evidence | 04, 06 | P0-T3, P1-T4 | no new clients beyond thin wrappers | n/a | n/a | ready | none |
| SRC-DERIVED-cron | ARCH-03 cron sweep not queue | derived (low event frequency) | derived | 04, 06, 07 | P1-T4 | sweep under `scheduled()`; no queue producer | sweep test | n/a | ready | branch must be cron-gated (`=== "45 3 * * *"`) |
| SRC-21-db01 | DATA-01 migration 0039 columns | `migrations/0001` shape; `retention-core.ts` precedent | repo evidence + derived | 04, 21 | P1-T1 | applies cleanly; null-tolerant; rollback DROP | `cf:d1-beta-feedback-proof` readback | partial-apply non-idempotency | ready | 21 DB-01 idempotency note |
| SRC-RETENTION | DATA-02 retention TTL 365d archived-only | `retention-core.ts:44-50` RetentionRule shape; `privacy-notice-draft.md:33` consent basis | repo evidence + owner-delegated | 04, 21 DB-02, 07 | P3-T1 | archived-only purge; non-archived kept; 365d | retention test (locate via `rg`) | TTL not ratified | **CONDITIONALLY READY** | OPEN-RET-01 / OPEN-DEC-004 |
| SRC-03-roles | SEC-AUTHZ-01 operator actions admin-gated | `roles.ts:33` `isPlatformAdminRole`; `beta-feedback-review.ts:28-30` | repo evidence | 04, 22 | P0-T3, P1-T5 | denial matrix green for non-admins | `tests/vitest/beta-admin-action-boundaries.test.ts` | n/a | ready | none |
| SRC-PRIVACY | SEC-DATA-01 PII redacted in logs | `privacy-notice-draft.md:33`; `redact.ts` | repo evidence | 04, 08 | P0-T3, P1-T4 | log records have no `message` cleartext | notify/sweep unit | n/a | ready | none |
| SRC-DERIVED | SEC-DATA-02 fallback no payload leak to logs | derived from FR-ACK-02 | derived | 04, 08 | P0-T2 | no raw message logged in fallback | `beta-feedback.test.ts` | n/a | ready | none |
| SRC-DERIVED | REL-01 email/alert failures non-fatal | derived | derived | 04, 09 | P0-T3, P2-T1 | graceful-degradation tests | notify/review-action unit | n/a | ready | none |
| SRC-BRIEF-monitor | OPS-01 readiness proof | PROMPT.md "support monitoring" + "linked evidence" | brief + repo evidence | 04, 11 P4 | P4-T1 | check exit 0 when configured | `scripts/check-beta-feedback-loop-readiness.ts` | hosted proof external | **CONDITIONALLY READY** | OPEN-MON-01 |
| SRC-DERIVED | OPS-02 structured loop events | derived | derived | 04, 09 | P0-T3, P1-T4, P2-T1, P3-T1 | 6 stable event names emitted; redacted | log-assertion tests (extend notify/sweep tests) | n/a | ready | **P1**: add explicit per-event assertions (12) |
| SRC-SUITE | TEST-01 submission shadow paths | suite requirement | derived | 04 shadow matrix | P0 | matrix cells green | `beta-feedback.test.ts` + `beta-feedback-form-ui.test.tsx` | n/a | ready | none |
| SRC-SUITE | TEST-02 SLA + sweep tests | suite requirement | derived | 04, 12 | P1 | matrix green | `beta-feedback-sla.test.ts` + `beta-feedback-sla-sweep.test.ts` | n/a | ready | none |
| SRC-SUITE | TEST-03 operator denial matrix | suite requirement | derived | 04, 12 | P0/P1 | non-admin denied all operator actions | `beta-admin-action-boundaries.test.ts` | n/a | ready | none |
| SRC-SUITE | TEST-04 graceful-degradation tests | suite requirement | derived | 04, 12 | P0/P2 | fail paths covered | notify/review-action unit | n/a | ready | none |
| SRC-BRIEF | DOC-01 ack copy documented | PROMPT.md "status expectations" | brief | 04, 05 | P0-T1 | copy in constants module | static review | n/a | ready | none |
| SRC-SUITE | DOC-02 SLA + business-day rule documented | suite requirement | derived | 15, 13 | P1-T2 | documented in pack + runbook | static review | n/a | ready | none |

## Performance-sensitive requirements (evaluator mapping)

| Requirement | Baseline | Target | Measurement source | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| FR-SLA-02 (sweep) | n/a (new) | <500ms p95 @1000 rows; <5s @100k | `beta-feedback-sla-sweep.perf.test.ts` (n=5, drop-highest, p50/p95 of 4) | >2x recorded | disable cron branch + flag off |
| `/workshop/feedback` LCP/TTFB | current | no >20% regression | `cf:verify-hosted-performance` (lab) or route probe | >20% | revert page/a11y edits |
| `/workshop/settings/feedback` LCP | current | no regression | same | >20% | revert pagination |
| Inline submit INP | current | +<50ms p95 (notify 2s cap) | focused DOM test + manual | >2x | flag off notify |

## Summary counts

- Total requirements: 27.
- Ready: 25.
- Conditionally ready: 2 (DATA-02, OPS-01) — blocked on external owner/hosted decisions.
- Untraced: 0 (verified 1:1 against `04_REQUIREMENTS_SPECIFICATION.md`).
- Open gaps recorded: 5 (OPEN-MON-01, OPEN-RET-01, OPEN-SLA-01, P1 URL-length, P1 OPS-02 event assertions) — all with owners/effects.
