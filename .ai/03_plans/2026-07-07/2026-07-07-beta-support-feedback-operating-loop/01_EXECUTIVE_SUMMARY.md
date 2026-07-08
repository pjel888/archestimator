# 01 — Executive Summary

## Headline

The beta feedback **capture** infrastructure already exists end-to-end (D1 tables, Server Actions, an admin review queue, platform-admin gating, audit status events). What is missing is the **operating loop** around it: reliable operator notification, an honest acknowledgement + status-expectation promise to the reporter, a triage SLA with breach detection, reporter follow-up on status change, a privacy-compliant retention/TTL, and proof that the loop is monitored before beta widens.

This pack plans the **smallest loop that closes those gaps** without building a CRM. The implementation is deliberately minimal; the planning is exhaustive because the surfaces (D1, Cloudflare Email, auth gating, privacy/retention, launch-readiness proof) are high-blast-radius.

## What exists today (verified from source)

- **Capture**: `src/components/workshop/BetaFeedbackForm.tsx` (Client Component, two modes: `redirect` + `inline`/`useActionState`), surfaced on `/workshop/feedback` and via the always-on `WorkshopFeedbackModal` floating button on every workshop page.
- **Submission**: Server Actions `submitBetaFeedback` (redirect) and `submitBetaFeedbackInline` (`useActionState`) in `src/lib/workshop/beta-feedback-actions.ts`, validated via `parseBetaFeedbackSubmission` (manual parse + tagged union — **no zod** in the codebase).
- **Storage**: D1 `beta_feedback_submissions` + `beta_feedback_status_events` (migration `0001_closed_beta_feedback.sql`), with type/severity/status enums, indexes on `created_at`, `status`, `user_id`.
- **Review queue**: `src/app/workshop/settings/feedback/page.tsx` (Server Component, platform-admin gated via `canReviewBetaFeedback` → `isPlatformAdminRole`), per-row status update via `updateBetaFeedbackReviewStatus`.
- **Auth**: `requireCurrentUserContext()` / `requireAuth()` from `src/lib/auth/session.ts` (Better Auth session + D1 profile, closed-beta enforced).
- **Email plumbing**: `sendEmail()` in `src/lib/email/transactional-email-client.ts` (Cloudflare `EMAIL` binding, circuit breaker) — **wired only to publication flows today, not feedback**.
- **Alert plumbing**: `sendUploadOperationalAlert` in `src/lib/uploads/operational-telemetry.ts` (webhook triplet env) — **the proven alert template, not yet used for feedback**.
- **Cron**: `worker.ts scheduled()` dispatches 3 crons (`0 3`, `15 3`, `30 3` UTC). NOTE: `AGENTS.md` says "two cron triggers" — stale; there are three.

## What's missing (the loop gaps)

| Gap | Today | Target |
|---|---|---|
| Operator notification on new feedback | None — operator must visit the queue | Operator email + optional webhook on every new blocker/high; queue badge |
| Reporter acknowledgement | `<output>` box / redirect param only | Honest acknowledgement + status-expectation copy ("We review within…") |
| Triage SLA | None (explicit open question in persona report) | Defined first-response + resolution targets; `first_response_at`/`responded_at` columns; daily SLA sweep |
| SLA breach detection | None | Daily cron sweep → alert + queue flag |
| Reporter follow-up | None | Email to reporter on `resolved` (and optionally `reviewing`) |
| Retention / privacy TTL | No retention row for feedback | 365-day TTL added to retention registry + daily purge; DSAR-reachable |
| Queue scale | Hard `LIMIT 50`, no pagination/search | Pagination + (optional) search; no latest-50 loss |
| Monitoring proof | `check-support-monitoring-readiness.ts` is operator-attested only | Loop-specific readiness check proving inbox + alert + queue live |

## Plan profile

`exhaustive` — the loop touches D1 schema (additive columns + retention), Cloudflare Email, auth gating reuse, privacy/retention, and launch-readiness proof. Per the Creating-Plan-Prompt, these are exhaustive-trigger surfaces. The **implementation scope is intentionally minimal** to honor the brief's "do not overbuild a CRM" constraint.

## Implementation-ready slices

| Slice | Phase | Status | Blocked by |
|---|---|---|---|
| **P0 — Acknowledgement + operator email on new feedback** | P0 | `IMPLEMENTATION-READY` | none (email plumbing exists; env config may need provider proof) |
| **P1 — SLA columns + daily breach sweep + queue pagination** | P1 | `IMPLEMENTATION-READY` | OPEN-OPS-01, OPEN-SLA-01 (both owner-delegated, recommended values recorded) |
| **P2 — Reporter follow-up email + status-expectation copy** | P2 | `IMPLEMENTATION-READY` | none |
| **P3 — Retention TTL + DSAR reachability** | P3 | `CONDITIONALLY READY` | OPEN-RET-01 (couples to retention-schedule ratification `OPEN-DEC-004`) |
| **P4 — Monitoring/readiness proof** | P4 | `CONDITIONALLY READY` | OPEN-MON-01 (hosted inbox + alert delivery proof is external) |

## Headline architectural decision

**Additive columns, no new tables.** Extend `beta_feedback_submissions` with `first_response_at`, `responded_at`, and `alerted_at` timestamps (nullable, additive, zero downtime). Reuse the existing `beta_feedback_status_events` audit table. Do **not** introduce a tickets/threads/SLA-violations table — that is the CRM line the brief tells us not to cross at beta scale.

## Verification mode

`emulated` — single-session planner, no separate verifier agent. Read-only evidence was gathered by 4 concurrent `Explore` subagents (independent outputs). Per the suite authority contract, emulated verification caps readiness at 97 and limits the package to `CONDITIONALLY READY` for the high-blast-radius slices until a human or independent reviewer signs off.

## Key risks

1. **Email deliverability unproven** — `sendEmail` is wired but feedback has never sent mail; circuit-breaker + `EMAIL_NOT_CONFIGURED` graceful degradation protects the capture path, but operator notification could silently no-op if env is unset. Mitigation: readiness check + logged send result.
2. **SLA breach false positives** — a daily sweep computing breach by wall-clock could mis-fire across weekends/holidays/timezones. Mitigation: business-day SLA + UTC-anchored timestamps + explicit "grace" handling.
3. **Operator is a bus factor** — only platform admins (`ceo`/`admin`) triage; if the single operator is away, SLA breaches silently. Mitigation: alert on breach (not just on new), and the coupled `31-founder-ops-and-bus-factor-plan`.
4. **Retention purge vs. active support** — a 365-day purge could delete a row mid-conversation. Mitigation: purge only `archived` rows older than TTL; never purge `new`/`reviewing`.

## Confirmation

No application code, tests, migrations, or provider state were modified. All writes are confined to this plan folder.
