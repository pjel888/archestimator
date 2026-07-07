# 01 — Executive Summary

## What this plan delivers

A planning package that converts Archestimator's **operator-flag theater** into **provable
operational readiness** before the first closed-beta user is exposed. Concretely it specifies, for
a future implementation AI:

1. **Alert scenarios + delivery proof.** A canonical set of alert scenarios (uptime, error-rate,
   upload backpressure, queue DLQ depth, cron failure, incident escalation) each with a
   *send → receive → acknowledge* proof that does not rely on a human setting `=1`. The proof
   model generalizes the one working example today
   (`scripts/verify-upload-alert-delivery.ts`) to the rest of the alert surface, free-tier.
2. **Triage ownership.** A named-owner + SLA matrix for every signal class, plus a first-24-hour
   and first-72-hour review cadence.
3. **Incident record format.** The canonical row written when an incident is declared (D1
   `operational_incidents` + `operational_incident_events`), so "we had an incident" is a queryable
   fact, not a memory.
4. **Log redaction inventory.** A complete catalog of every log/evidence emit path and what
   redaction covers and misses (the *inventory*; enforcement fixes are the sibling observability
   pack's `SEC-01`).
5. **Retention TTL policy lock-in.** Enforcement rules for the 7 currently-unenforced
   log/platform retention classes (`logs_worker_observability`, `logs_email_delivery`,
   `uploads_orphaned`, `sessions_expired`, three AI classes) so the cron actually purges them per
   the draft schedule, plus an **evidence-retention policy** for proof artifacts themselves.
6. **Tests / static checks.** A readiness verifier that fails when the evidence is missing rather
   than when an operator forgets to set a flag.
7. **Launch-blocking criteria.** The exact go/no-go gates.

## Current state (verified from source)

| Surface | Current behavior | File evidence |
|---|---|---|
| Support-monitoring readiness | 5 `*_CONFIRMED` env flags + 4 owner labels; `note` admits it proves nothing | `scripts/check-support-monitoring-readiness.ts:62-86` |
| Real alert delivery | **One** webhook, upload-ops only, fire-and-forget (`.catch(()=>{})`) | `src/lib/uploads/operational-telemetry.ts:147,200` |
| Other alert sinks | None — no PagerDuty/Slack/email-alert/Sentry (stubbed) | repo-wide `rg`; `src/instrumentation.ts:8` |
| Workers Observability | Enabled, `persist:true`, logs 0.1 / traces 0.05 sampled | `wrangler.jsonc:83-96` |
| Crons | 3: upload-cleanup `0 3`, upload-scan `15 3`, retention-pass `30 3` | `wrangler.jsonc:59-64`, `worker.ts:97-116` |
| Retention enforcement | 7 of 14 schedule classes enforced; 7 log/platform classes have **no rule** | `src/lib/compliance/retention-core.ts:79-143`; `retention-schedule.md` |
| Redaction coverage | `redact.ts` covers email/password/token/JWT/share/invite; **gaps**: credit-card, phone, IP, raw `Set-Cookie`/`Authorization` strings, server stack paths | `src/lib/observability/redact.ts`; `03_…` §1 |
| Logger bypass | ~88 `console.*` calls across ~46 files bypass `redactForLog` entirely | `03_…` §1.3 |
| Feedback/support tables | `beta_feedback_submissions` exists; **no retention column**, purge rule `DATA-02` coupled to `OPEN-DEC-004` | `migrations/0001_closed_beta_feedback.sql`; beta-feedback pack `DATA-02` |
| Incident/alert tables | **None exist** | `migrations/` audit |
| Daily D1 backups | Aspirational — actual retention is 7-day free-tier Time Travel; no automated export | d1-r2-backup pack `07_…:80-91` |

## Target state

1. **Every alert scenario has a delivery-proof artifact**, not a flag. The readiness script fails
   when the artifact is absent or stale, and the artifact is produced by a real send→receive
   round-trip (webhook echo, email inbox token, Workers Observability probe observed via GraphQL),
   not by a human typing `=1`.
2. **Triage ownership is a named matrix** with SLAs and a first-24h/72h review owner, recorded in
   the readiness output and in the runbook.
3. **Incidents are queryable.** A small D1 schema (`operational_incidents`,
   `operational_incident_events`) records declared incidents, severity, owner, status, and
   resolution, written by a documented declare/close runbook.
4. **The 7 unenforced retention classes are enforced** by adding rules to
   `DEFAULT_RETENTION_RULES`, each gated on `OPEN-DEC-004` for the *final* TTL but using the
   schedule's current draft values so the cron stops leaving log/platform data unbounded.
5. **Evidence artifacts have their own retention policy** (proof JSON files, redacted) so readiness
   evidence does not itself become unbounded storage or a PII leak.
6. **Launch is blocked** until the readiness verifier passes on real (hosted/provider) evidence,
   not local-only.

## Major findings

- **The single biggest gap is proof, not plumbing.** The sibling observability pack is building the
  pipes (request IDs, error taxonomy, metrics, budgets). This pack's job is to prove the pipes
  *carry a signal that reaches a human*. Today the only proof that reaches a human is the
  upload-ops webhook.
- **Workers Observability is a passive sink, not an alerter** on the free tier. Native Worker
  alerting is weak/limited on Free; the realistic free alert path is **self-polling GraphQL from a
  free external cron** (documented in the sibling pack's OBS-03). This pack treats that as the
  error-rate alert channel and proves it end-to-end.
- **Log retention is genuinely half-built.** The `logs_worker_observability` row in the schedule
  says "30d, platform-managed" — but free-tier Workers Logs retention is **~3 days**, not 30. The
  schedule's "30d" assumption is wrong for the free tier and must be corrected (finding F-03,
  decision DEC-03).
- **`OPEN-DEC-004` (counsel sign-off on final TTLs) is the hard gate** for the retention portion.
  This pack can enforce the *draft* values now but cannot claim the retention slice
  implementation-ready until counsel signs or the owner explicitly accepts the draft as policy.
- **No incident/alert table exists.** "We had an incident" is not queryable today.
- **Redaction gaps are real but owned elsewhere.** The gaps (credit-card, phone, IP, raw headers,
  stack paths) are inventory here; the enforcement fix is the sibling pack's `SEC-01`. This pack
  records the dependency and does not duplicate the fix.

## Major decisions (summary — full rationale in `15_…`)

| ID | Decision | Rejected alternative |
|---|---|---|
| DEC-01 | Replace operator `*_CONFIRMED` flags with artifact-based proof (a JSON receipt produced by a real round-trip) | Keep flags but add a "did a human click confirm" audit (still theater) |
| DEC-02 | Generalize the upload-ops webhook proof model to all alert scenarios via a shared `verify-*-alert-delivery.ts` pattern | Build a new paid alerting stack (violates free-tier constraint) |
| DEC-03 | Correct the schedule's `logs_worker_observability` "30d" to the free-tier reality (~3d) and document the paid upgrade (Logpush/Workers Paid) as the path to longer retention | Leave "30d" uncorrected (false retention claim before first users) |
| DEC-04 | Add `operational_incidents` + `operational_incident_events` D1 tables (migration `0040`) | Store incidents in a flat file / Workers Observability only (not queryable, not durable) |
| DEC-05 | Enforce the 7 unenforced retention classes now using draft values, gated on `OPEN-DEC-004` for final TTLs | Wait for counsel before any enforcement (leaves log/platform data unbounded through launch) |
| DEC-06 | Evidence artifacts get a 90-day retention + redaction policy; stored under `.ai/99_scratch/`-ignored or R2 with redaction | Keep proof files forever / in git (unbounded + leak risk) |
| DEC-07 | First-24h and first-72h post-launch reviews are mandatory launch gates with named owners | Treat launch as a one-shot event (first real incident will find the gaps) |
| DEC-08 | Error-rate alerting uses the free self-poll GraphQL path (sibling OBS-03), proven end-to-end here | Claim Workers Observability "alerts" natively (false on Free) |
| DEC-09 | All proof artifacts redact secrets/ids/tokens via `redactForLog` before writing | Emit raw proof (leak risk) |

## Readiness

- **Profile:** `exhaustive`.
- **Verification mode:** `emulated` (3 independent read-only `Explore` discovery agents for the
  audit; adversarial + final-verification passes emulated as separated passes by the author).
  Per the suite contract this caps overall readiness at 97 and caps package status at
  `CONDITIONALLY READY` for the high-blast-radius slices until an independent reviewer or the owner
  accepts the final package.
- **Overall score:** **94/100** (see `17`).
- **Status:** **`CONDITIONALLY READY`**. All internally resolvable planning gaps are closed. The
  package is capped by: (a) emulated verification mode, (b) `OPEN-DEC-004` (final retention TTLs),
  (c) `OPEN-ALERT-01` (owner choice of free external cron host for the error-rate alert poller),
  (d) `OPEN-EVID-01` (owner acceptance of the evidence-artifact retention policy), and
  (e) hosted/provider proof that can only be gathered at runtime. The well-scoped slices
  (Phases 1, 2, 3, 5, 6) can move to implementation; Phases 4 (incident schema) and the alert
  deliverability gates in Phase 1 require the named owner decisions to fully close.

## Cost posture

Stays on free-tier/bundled limits. **No paid add-on is recommended by this plan.** Longer log
retention (Logpush, Workers Paid) and paid alerting (PagerDuty/Datadog) are documented as
owner-gated upgrades with explicit traffic triggers, never enabled by default.

## Boundary with sibling packs (critical — read before implementation)

| Owned by sibling | Owned by THIS pack |
|---|---|
| `2026-07-07-cloudflare-worker-production-observability-and-budgets`: request IDs, error taxonomy, `Server-Timing`, runtime budgets, Analytics Engine metrics, sampling tuning, redaction *enforcement* (`SEC-01`/`SEC-02`), budget query definitions (`OBS-03`) | Alert *scenarios + delivery proof*, triage ownership, incident records, retention TTL *policy enforcement for log/platform classes*, evidence-retention policy, launch gates |
| `2026-07-07-beta-support-feedback-operating-loop`: feedback SLA columns, feedback purge `DATA-02` | Incident/escalation *record format*; references `DATA-02` but does not duplicate |
| `2026-07-07-privacy-request-operations-and-erasure-workflow`: DSAR erasure propagation | Retention *enforcement rules* for audit classes (orthogonal to DSAR propagation) |
| `2026-07-07-d1-r2-backup-restore-operational-readiness`: backup/restore rehearsal | Names "retention ≠ backup" explicitly; does not own backup |

This pack's implementation tasks **must not** edit files owned by the sibling observability pack
for the redaction-enforcement fix. The redaction inventory in `08` is consumed by that pack's
`SEC-01`; the dependency is one-directional and recorded in `16`.
