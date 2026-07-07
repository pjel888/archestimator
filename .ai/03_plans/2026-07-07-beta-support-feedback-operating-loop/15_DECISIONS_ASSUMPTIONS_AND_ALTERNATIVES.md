# 15 — Decisions, Assumptions, and Alternatives

## Major decisions (load-bearing)

### DEC-01 — Additive columns, no new tables
- **Problem**: track SLA without building a CRM.
- **Constraints**: brief says don't overbuild; existing 4-status lifecycle suffices.
- **Options**: (A) additive timestamp columns on `beta_feedback_submissions`; (B) new `feedback_sla_violations` table; (C) derive from `beta_feedback_status_events`.
- **Advantages of A**: minimal schema; zero downtime; trivial rollback.
- **Disadvantages of A**: SLA state co-located with submission (acceptable at beta).
- **Rejected**: B (CRM creep); C (the `UNIQUE(feedback_id,status)` means a status entered once — re-derivation is ambiguous and `first_response_at` is clearer).
- **Recommended**: A. (ARCH-01)
- **Conditions to revisit**: if SLA rules become multi-policy (per-customer SLAs), move to a dedicated table.

### DEC-02 — Reuse `isPlatformAdminRole` for the operator gate
- **Problem**: who triages?
- **Options**: (A) reuse existing platform-admin gate; (B) dedicated `support_operator` role; (C) Better Auth admin plugin.
- **Recommended**: A (`OPEN-OPS-01`, matches privacy-request pack). Bus-factor mitigation via breach alerting + second admin (owner).
- **Rejected**: B (role sprawl at beta); C (codebase doesn't use BA admin plugin).

### DEC-03 — Daily cron sweep, not a queue job
- **Problem**: how to detect SLA breaches.
- **Options**: (A) daily cron in `scheduled()`; (B) `UPLOAD_JOBS_QUEUE` job; (C) on-write check.
- **Recommended**: A (ARCH-03). Event frequency is low; cron matches the retention-pass precedent; avoids widening the queue `jobName` union.
- **Rejected**: B (over-engineering); C (on-write can't detect *elapsed-time* breaches).

### DEC-04 — Hybrid alerting: operator email always + optional webhook
- **Problem**: how to alert the operator.
- **Recommended**: email (lowest-common-denominator) on every new blocker/high + on breach; webhook optional via env (`OPEN-ALERT-01`).
- **Rejected**: webhook-only (single point of failure); email-only (no async/persistent channel).

### DEC-05 — In-process sweep, no internal HTTP route
- **Problem**: does the sweep need the `buildJobRequest` secret-bearer indirection the upload jobs use?
- **Recommended**: no — run `runFeedbackSlaSweep(env)` directly in `scheduled()` (trusted Worker context).
- **Rejected**: internal route (unnecessary secret indirection for a trusted-context job).

### DEC-06 — Match the manual parse-union pattern (no zod)
- **Problem**: validation convention.
- **Recommended**: extend the existing `parseBetaFeedbackSubmission` pattern. Do not introduce zod (zero usage in repo).
- **Rejected**: zod (cross-cutting change outside this scope).

### DEC-07 — Reporter follow-up on resolve, not on every status change
- **Problem**: when to email the reporter.
- **Recommended**: on `resolved` only (and guard `responded_at IS NULL`). Optional `reviewing` email deferred.
- **Rejected**: email on every status change (noise; CRM-adjacent).

### DEC-08 — Raw `process.env` for alert env (match precedent)
- **Problem**: typed vs raw env for the alert triplet.
- **Recommended**: raw `process.env` (matches `operational-telemetry.ts`), avoiding the `wrangler types` refresh step.
- **Rejected**: typed env (mismatched with precedent).

## Owner-delegated planning decisions (recorded, owner can override)

| ID | Decision | Recommended value | Effect if overridden |
|---|---|---|---|
| OPEN-OPS-01 | operator gate | reuse `isPlatformAdminRole` | if a new role is wanted, add auth work (out of scope) |
| OPEN-SLA-01 | SLA thresholds | 1bd (blocker/high FR), 3bd (med/low FR), 5bd resolution | re-tune SLA config constants + tests |
| OPEN-RET-01 | retention TTL | 365 days, archived-only | re-tune retention rule |
| OPEN-ALERT-01 | alert channels | email + optional webhook | add/remove channel modules |

## Assumptions

| ID | Assumption | Source strength | Validated? | Effect if wrong |
|---|---|---|---|---|
| ASSUMP-01 | Email env will be configured before beta widens | inferred | no — `OPEN-MON-01` | notify silently no-ops (RISK-01) |
| ASSUMP-02 | Beta feedback volume is <100 rows/month | inferred (pre-launch) | no | sweep still fine to 100k; no effect |
| ASSUMP-03 | `isPlatformAdminRole` semantics unchanged at impl time | repo evidence | re-verify at impl | gate breaks (denial tests catch) |
| ASSUMP-04 | `wrangler.jsonc` crons list is editable (3 crons today) | repo evidence | yes | none |
| ASSUMP-05 | The retention registry is discoverable via `rg "DEFAULT_RETENTION_RULES"` | inferred | `DISCOVERY-REQUIRED` at P3 | P3 placement shifts; no contract change |
| ASSUMP-06 | Cloudflare Email circuit breaker + graceful `ok:false` is sufficient reliability | repo evidence | yes | none |
| ASSUMP-07 | Business-day = Mon–Fri, no holiday calendar at beta | owner-delegated | recorded | SLA may mis-flag on holidays (RISK-02) |

## Alternatives rejected (summary)

See DEC-01..08 above and the alternatives table in `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md`. Key rejections: new tables (CRM), queue job (over-eng), zod (convention), Better Auth admin plugin (unused), toast-for-ack (wrong UX), public-feedback-into-D1 (scope), hourly sweep (unnecessary).
