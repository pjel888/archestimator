# 12 — Test and Validation Strategy

Choose the lightest proof that proves the claim. Repository-native scripts: `bun run type-check`, `bun run lint`, `bun run lint:design-system`, `bun run test`, `bun run test:dom`, focused `vitest`, `bun run build`. Playwright only for browser-only claims.

## Test layers

| Layer | Tool | Use for |
|---|---|---|
| Unit (pure) | vitest | SLA math, mailto builder, parsers, alert payload builder |
| DOM/RTL | vitest + React Testing Library | form ack/focus/labels, queue badge/pagination |
| Action/handler | vitest (call the Server Action / store fn directly) | submission, status update, notify, sweep |
| Authz/denial | vitest role-matrix | non-admin cannot trigger operator actions |
| Perf (focused) | vitest with fixtures | sweep latency at 1000 rows |
| Provider proof | scripts (D1 readback, alert delivery) | hosted/readback evidence (P4) |

## Test Execution Matrix

| Requirement | Test file path | Test type | New/existing | Fixture/setup | Command | Expected evidence | Known reds | Owner |
|---|---|---|---|---|---|---|---|---|
| FR-ACK-01 | `tests/vitest/beta-feedback-form.test.tsx` | DOM | extend | render form, drive submit | `bun run test:dom -- beta-feedback-form` | ack text + `role=status` asserted | none | impl |
| UX-A11Y-02 | `tests/vitest/beta-feedback-form.test.tsx` | DOM | extend | submit → assert `activeElement` | `bun run test:dom -- beta-feedback-form` | focus moved to output | none | impl |
| FR-ACK-02 | `tests/vitest/beta-feedback-actions.test.ts` | unit/action | extend | trigger fallback path | `bun run test -- beta-feedback-actions` | mailto contains message/type/severity | none | impl |
| FR-NOTIFY-01 | `tests/vitest/beta-feedback-notify.test.ts` | unit | **new** | mock `sendEmail`; blocker/high vs med/low | `bun run test -- beta-feedback-notify` | sendEmail called for blocker/high only; fail non-fatal | none | impl |
| SEC-DATA-01 | `tests/vitest/beta-feedback-notify.test.ts` | unit | new | capture logged record | same | log record has no `message` cleartext | none | impl |
| FR-SLA-01 | `tests/vitest/beta-feedback-sla.test.ts` | unit | **new** | fixed-time fixtures incl. weekend | `bun run test -- beta-feedback-sla` | correct on-track/due-soon/breached | none | impl |
| FR-QUEUE-01 | `tests/vitest/beta-feedback-review.test.ts` | store | extend | seed >50 rows | `bun run test -- beta-feedback-review` | pagination returns pages | none | impl |
| UX-QUEUE-01 | `tests/vitest/feedback-admin-review-page.test.tsx` | DOM | extend | render queue | `bun run test:dom -- feedback-admin-review` | badge renders; breach filter works | none | impl |
| FR-SLA-02 | `tests/vitest/beta-feedback-sla-sweep.test.ts` | unit | **new** | seed breached rows | `bun run test -- beta-feedback-sla-sweep` | alerted once; alert called; idempotent | none | impl |
| FR-SLA-02 perf | `tests/vitest/beta-feedback-sla-sweep.perf.test.ts` | perf | **new** | 1000 synthetic rows | `bun run test -- beta-feedback-sla-sweep.perf` | p95 < recorded threshold | none | impl |
| FR-FOLLOWUP-01 | `tests/vitest/beta-feedback-review-actions.test.ts` | action | extend | resolve → assert sendEmail; re-resolve no-op | `bun run test -- beta-feedback-review-actions` | follow-up sent once | none | impl |
| SEC-AUTHZ-01 | `tests/vitest/beta-admin-action-boundaries.test.ts` | denial | extend | non-admin role matrix | `bun run test -- beta-admin-action-boundaries` | non-admin denied all operator actions | none | impl |
| T-01 HTML injection | `tests/vitest/beta-feedback-notify.test.ts` | unit | new | message with `<script>` | same | email body escaped | none | impl |
| DATA-01 | manual + `scripts/generate-cloudflare-d1-beta-feedback-proof.ts` | provider | extend | apply `0039`, readback | script | columns present | none | impl |
| DATA-02 | `tests/vitest/retention-*.test.ts` (locate) | unit | extend | archived+old, non-archived | `bun run test -- retention` | correct purge | none | impl |
| OPS-01 | `scripts/check-beta-feedback-loop-readiness.ts` | script | **new** | run against env | `bun run tsx scripts/check-beta-feedback-loop-readiness.ts` | exit 0 when configured | none | impl |

## UltraQA adversarial scenario matrix (for future implementation)

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Status |
|---|---|---|---|---|---|---|
| QA-01 | reporter | submit with `<script>` message | form | RTL submit | ack rendered safely; email body escaped | planned |
| QA-02 | reporter | 4001-char message | form | action | rejected `message_too_long` | planned |
| QA-03 | reporter | 9-char message | form | action | rejected `message_too_short` | planned |
| QA-04 | reporter | invalid project UUID | form | action | rejected `invalid_project` | planned (existing) |
| QA-05 | non-admin | POST `updateBetaFeedbackReviewStatus` directly | action call | denial test | `authorized:false` | planned |
| QA-06 | anon | submit without session | action | denial test | redirect `/login` | planned (existing) |
| QA-07 | reporter | D1 write fails | mock store throw | action | `?fallback=1` + payload mailto | planned |
| QA-08 | reporter | rapid double-submit | two action calls | action | two rows (accepted); button disables client-side | planned |
| QA-09 | operator | resolve → re-resolve | two status updates | action | follow-up sent once (`responded_at` guard) | planned |
| QA-10 | sweep | two runs same day | two sweep calls | unit | `alerted_at` set once; one alert | planned |
| QA-11 | sweep | webhook 500 | mock fetch 500 | unit | `webhook_rejected` logged; `alerted_at` still set | planned |
| QA-12 | sweep | non-`https` webhook URL | env | unit | `sendFeedbackAlert` rejects | planned |
| QA-13 | retention | non-archived row past TTL | seed | retention test | NOT purged | planned |
| QA-14 | email | `sendEmail` circuit open | mock | unit | `ok:false CIRCUIT_OPEN`; submit succeeds | planned |
| QA-15 | reporter | email address invalid/stale | row `user_email` bad | action | follow-up `ok:false`; update still lands | planned |

## Validation gates per phase

| Phase | Gate | Commands |
|---|---|---|
| P0 | focused tests + type-check | `bun run test:dom -- beta-feedback-form`; `bun run test -- beta-feedback-actions beta-feedback-notify`; `bun run type-check` |
| P1 | tests + perf + readback | above + `beta-feedback-sla`, `beta-feedback-sla-sweep[.perf]`, `beta-feedback-review`; migration readback |
| P2 | follow-up test | `beta-feedback-review-actions` |
| P3 | retention test | retention suite |
| P4 | readiness script exit 0 | `check-beta-feedback-loop-readiness.ts` |

Broad `bun run validate`/`bun run build` is reserved for release/shared-logic risk (the cron + worker.ts change justifies one full build before merge — see `13`).

## Skipped validation policy

- Browser/Playwright: intentionally skipped for ack/labels/focus (RTL DOM tests prove these). Escalate only if RTL cannot capture a focus move (it can).
- Hosted/provider proof: deferred to P4 (`OPEN-MON-01`) — local checks cannot prove inbox monitoring.
