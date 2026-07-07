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

## Test Execution Matrix (proof-contract schema)

Mandated schema (Improve-Plan-Prompt §11): `Proof ID | Requirement IDs | Implementation unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green expectation | Cleanup/skip rule`.

**Existing test files (verified 2026-07-07 from `tests/vitest/`):** `beta-feedback.test.ts`, `beta-feedback-form-ui.test.tsx`, `beta-feedback-review-ui.test.tsx`, `beta-admin-action-boundaries.test.ts`, `support-contact-readiness.test.ts`, `support-monitoring-readiness-script.test.ts`, `cloudflare-d1-beta-feedback-proof-script.test.ts`. Repository scripts: `bun run test`, `bun run test:dom`, `bun run type-check`, `bun run lint`, `bun run lint:design-system`, `bun run build`, `bun run cf:d1-beta-feedback-proof`.

| Proof ID | Requirement IDs | Impl unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green | Cleanup/skip |
|---|---|---|---|---|---|---|---|---|---|
| PROOF-ACK-01 | FR-ACK-01, UX-A11Y-02 | P0-T1 | DOM | render `BetaFeedbackForm` inline, drive submit → success | ack text renders + `role="status"` + `aria-live="polite"` + `document.activeElement === outputRef` | `tests/vitest/beta-feedback-form-ui.test.tsx` (extend) | `bun run test:dom -- beta-feedback-form-ui` | red today (no ack copy/aria-live/focus); green after P0-T1 | none |
| PROOF-ACK-02 | FR-ACK-02, SEC-DATA-02 | P0-T2 | unit/action | trigger fallback path (mock D1 write fail) | mailto payload contains `message`/`type`/`severity`; no raw message logged | `tests/vitest/beta-feedback.test.ts` (extend) | `bun run test -- beta-feedback` | red today (static mailto drops payload); green after P0-T2 | none |
| PROOF-NOTIFY-01 | FR-NOTIFY-01, SEC-DATA-01 | P0-T3 | unit | mock `sendEmail`; cases: blocker, high, medium, low, sendEmail `ok:false` | `sendEmail` called for blocker/high only; submit succeeds on `ok:false`; log has no `message` | `tests/vitest/beta-feedback-notify.test.ts` (new) | `bun run test -- beta-feedback-notify` | red (file absent) → green | none |
| PROOF-NOTIFY-TIMEOUT | FR-NOTIFY-01, REL-01 | P0-T3 | unit | mock `sendEmail` hanging >2s | `Promise.race` timeout → submit still returns saved; log `code:TIMEOUT` | `tests/vitest/beta-feedback-notify.test.ts` | same | red → green | none |
| PROOF-SLA-01 | FR-SLA-01 | P1-T2 | unit | fixed-time fixtures: created Fri 17:00, now Mon 09:00 (weekend); null ts; already-responded | correct on-track/due-soon/breached classification | `tests/vitest/beta-feedback-sla.test.ts` (new) | `bun run test -- beta-feedback-sla` | red → green | none |
| PROOF-QUEUE-01 | FR-QUEUE-01 | P1-T3 | store | seed 75 rows; request page 2 | page 2 returns rows 51-75 ordered; status filter applies across pages | `tests/vitest/beta-feedback.test.ts` (extend store fns) or a new `beta-feedback-d1-store.test.ts` | `bun run test -- beta-feedback` | red today (`LIMIT 50`); green after P1-T3 | none |
| PROOF-QUEUE-UI | UX-QUEUE-01, UX-A11Y-01 | P1-T5 | DOM | render queue with seeded rows + badge | badge icon+text renders; breach filter returns only breached; Type/Severity labels associated | `tests/vitest/beta-feedback-review-ui.test.tsx` (extend) | `bun run test:dom -- beta-feedback-review-ui` | red today (no badge/filter/labels); green after P1-T5 | none |
| PROOF-SWEEP-01 | FR-SLA-02, ARCH-03 | P1-T4 | unit | seed breached rows (alerted_at null + non-null) | alerts once per null-alerted breached row; sets alerted_at; idempotent on re-run | `tests/vitest/beta-feedback-sla-sweep.test.ts` (new) | `bun run test -- beta-feedback-sla-sweep` | red → green | none |
| PROOF-SWEEP-TIMEOUT | T-10 | P1-T4 | unit | mock webhook hang | `AbortSignal.timeout(5000)` fires → alert skipped; `alerted_at` NOT set (retry next run) | `tests/vitest/beta-feedback-sla-sweep.test.ts` | same | red → green | none |
| PROOF-SWEEP-PERF | FR-SLA-02 | P1-T4 | perf | 1000 synthetic rows | p95 < 500ms (drop-highest, p50/p95 of remaining 4) | `tests/vitest/beta-feedback-sla-sweep.perf.test.ts` (new) | `bun run test -- beta-feedback-sla-sweep.perf` | n/a (baseline capture) | skip in CI if slow; record numbers in 19 |
| PROOF-FOLLOWUP-01 | FR-FOLLOWUP-01, T-13 | P2-T1 | action | resolve → assert sendEmail to validated `user_email`; re-resolve no-op; malformed email skipped | follow-up sent once on first resolve; `INVALID_RECIPIENT` skip on bad email | `tests/vitest/beta-feedback.test.ts` (extend review-action) | `bun run test -- beta-feedback` | red → green | none |
| PROOF-AUTHZ-01 | SEC-AUTHZ-01 | P0-T3/P1-T5 | denial | role matrix: `ceo`/`admin`/`member`/`collaborator`/anon × each operator action | non-admins denied; ceo/admin allowed | `tests/vitest/beta-admin-action-boundaries.test.ts` (extend) | `bun run test -- beta-admin-action-boundaries` | green today (existing); extend for new actions | none |
| PROOF-INJECT-01 | T-01 | P0-T3 | unit | message = `<script>alert(1)</script>` | email body escapes it (plain text / HTML-escaped) | `tests/vitest/beta-feedback-notify.test.ts` | same as PROOF-NOTIFY-01 | red → green | none |
| PROOF-SSRF-01 | T-04 | P1-T4 | unit | env `FEEDBACK_ALERT_WEBHOOK_URL` = `http://...` | `sendFeedbackAlert` rejects non-`https` | `tests/vitest/beta-feedback-sla-sweep.test.ts` | same | red → green | none |
| PROOF-DATA-01 | DATA-01 | P1-T1 | provider | apply `0039` locally, readback | 3 columns + `idx_beta_feedback_sla_sweep` present | `scripts/generate-cloudflare-d1-beta-feedback-proof.ts` (extend) | `bun run cf:d1-beta-feedback-proof` | red today (no cols) → green | local D1 only |
| PROOF-DATA-02 | DATA-02, T-11 | P3-T1 | unit | seed (archived+old, new+old, archived+new) | only archived+old purged; others survive | retention suite (locate via `rg "DEFAULT_RETENTION_RULES" tests/`) | `bun run test -- retention` | red → green | none |
| PROOF-OPS-01 | OPS-01, OPS-02 | P4-T1 | script | run against configured env + capture event logs | exit 0 when configured; 6 event names emit | `scripts/check-beta-feedback-loop-readiness.ts` (new) | `bun run tsx scripts/check-beta-feedback-loop-readiness.ts` | red → green (or operator-attested flag) | none |
| PROOF-CRON-GATE | ARCH-03 | P1-T4 | unit/static | inspect `worker.ts` new branch | branch gated `controller.cron === "45 3 * * *"` (not ungated `ctx.waitUntil`) | static review + worker unit if feasible | `rg "45 3" worker.ts` | red → green | none |

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
