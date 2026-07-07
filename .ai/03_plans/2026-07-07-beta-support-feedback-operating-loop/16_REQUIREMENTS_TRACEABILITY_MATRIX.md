# 16 — Requirements Traceability Matrix

Every requirement maps to source, task, acceptance, test, rollout check, and status. No requirement is untraced.

| Requirement ID | Source | User outcome | Phase / Task IDs | Code areas | Acceptance criteria | Test coverage | Rollout check | Status |
|---|---|---|---|---|---|---|---|---|
| FR-ACK-01 | brief | reporter sees honest ack + promise | P0-T1 | feedback/page.tsx, BetaFeedbackForm.tsx | AC1-3 (04) | beta-feedback-form DOM | sanity submit | ready |
| FR-ACK-02 | repo evidence | D1-fail preserves payload | P0-T2 | beta-feedback-actions.ts, beta-feedback.ts | AC1-2 | beta-feedback-actions unit | n/a | ready |
| FR-NOTIFY-01 | brief | operator alerted on blocker/high | P0-T3 | beta-feedback-notify.ts (new), actions.ts | AC1-4 | beta-feedback-notify unit | readiness check | ready |
| FR-SLA-01 | brief/persona | SLA tracked per submission | P1-T1,T2,T3 | migration 0039, beta-feedback-sla.ts (new), store | AC1-4 | beta-feedback-sla unit | readback | ready |
| FR-SLA-02 | derived | breaches auto-detected/alerted | P1-T4 | beta-feedback-sla-sweep.ts (new), worker.ts, alert.ts (new) | AC1-4 | sweep unit + perf | cron registered | ready |
| FR-FOLLOWUP-01 | brief | reporter emailed on resolve | P2-T1 | review-actions.ts, notify.ts | AC1-4 | review-actions unit | sanity resolve | ready |
| FR-QUEUE-01 | repo evidence/persona | queue paginates, no loss | P1-T3,T5 | store, review.ts, settings/feedback/page.tsx | AC1-4 | review store + DOM | n/a | ready |
| UX-A11Y-01 | repo evidence | Type/Severity labelled | P1-T5 | BetaFeedbackForm.tsx, dropdown-select.tsx | label asserted | DOM | n/a | ready |
| UX-A11Y-02 | repo evidence | ack live region + focus | P0-T1 | BetaFeedbackForm.tsx | role + activeElement | DOM | n/a | ready |
| UX-QUEUE-01 | derived | SLA badge + breach filter | P1-T5 | settings/feedback/page.tsx | badge renders; filter works | DOM | n/a | ready |
| ARCH-01 | brief | additive columns only | P1-T1 | migration 0039 | additive; rollback DROP | readback | n/a | ready |
| ARCH-02 | repo evidence | reuse email/alert clients | P0-T3,P1-T4 | notify.ts, alert.ts | no new clients beyond wrappers | n/a | n/a | ready |
| ARCH-03 | derived | cron sweep, not queue | P1-T4 | worker.ts | sweep under scheduled() | sweep test | cron registered | ready |
| DATA-01 | derived | migration 0039 columns | P1-T1 | migrations/0039 | applies; rollback; null-tolerant | readback | migration applied | ready |
| DATA-02 | privacy | retention TTL 365d archived-only | P3-T1 | retention registry, sweep rule | archived-only purge; non-archived kept | retention test | retention sweep runs | **CONDITIONALLY READY** (OPEN-RET-01/OPEN-DEC-004) |
| SEC-AUTHZ-01 | repo evidence | operator actions admin-gated | P1-T5,P0-T3 | review-actions, notify, sweep | denial matrix green | beta-admin-action-boundaries | n/a | ready |
| SEC-DATA-01 | privacy | PII redacted in logs | P0-T3,P1-T4 | notify, sweep, alert | no message in logs | notify/sweep unit | n/a | ready |
| SEC-DATA-02 | derived | fallback no payload leak to logs | P0-T2 | actions.ts | no raw message logged | actions unit | n/a | ready |
| REL-01 | derived | email/alert fail non-fatal | P0-T3,P2-T1 | notify.ts | graceful degradation | notify/followup unit | n/a | ready |
| OPS-01 | brief | readiness proof | P4-T1 | check-beta-feedback-loop-readiness.ts | exit 0 when configured | script | pre-beta gate | **CONDITIONALLY READY** (OPEN-MON-01) |
| OPS-02 | derived | structured loop events | P0-T3,P1-T4,P2-T1,P3-T1 | all loop modules | stable event names | log assertions | n/a | ready |
| TEST-01 | suite | submission shadow paths | P0 | tests | matrix green | beta-feedback-* | n/a | ready |
| TEST-02 | suite | SLA + sweep tests | P1 | tests | matrix green | beta-feedback-sla* | n/a | ready |
| TEST-03 | suite | operator denial matrix | P0/P1 | tests | non-admin denied | beta-admin-action-boundaries | n/a | ready |
| TEST-04 | suite | graceful-degradation tests | P0/P2 | tests | fail paths covered | notify/review-actions | n/a | ready |
| DOC-01 | brief | ack copy documented | P0-T1 | this pack + copy module | copy in constants | n/a | n/a | ready |
| DOC-02 | brief | SLA + business-day rule documented | P1-T2 | this pack + runbook (13) | documented | n/a | n/a | ready |

## Performance-sensitive requirements (evaluator mapping)

| Requirement | Baseline | Target | Measurement source | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| FR-SLA-02 (sweep) | n/a (new) | <500ms p95 @1000 rows | `beta-feedback-sla-sweep.perf.test.ts` | >2x recorded | disable cron branch + flag off |
| `/workshop/feedback` TTFB | current | no >20% regression | route probe / Workers Observability | >20% | revert page/a11y edits |

## Summary counts

- Total requirements: 27 (incl. TEST/DOC).
- Ready: 25.
- Conditionally ready: 2 (DATA-02, OPS-01) — both blocked on external owner/hosted decisions, not internal planning gaps.
- Untraced: 0.
