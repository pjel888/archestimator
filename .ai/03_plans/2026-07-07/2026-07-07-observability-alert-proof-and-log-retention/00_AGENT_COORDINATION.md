# 00 — Agent Coordination

**Plan folder:** `.ai/03_plans/2026-07-07-observability-alert-proof-and-log-retention`
**Date:** 2026-07-07 (Asia/Manila)
**Mode:** `planning-only`. No application code, tests, migrations, schemas, infrastructure, or
configuration is modified by this plan pack.
**Plan profile:** `exhaustive` — touches observability, security (redaction), data/compliance
(retention TTLs, evidence retention), Cloudflare provider surfaces, and launch readiness.

---

## Master `/goal`

**Outcome.** Before the first closed-beta user is exposed, Archestimator must be able to
**prove** — with concrete, non-hand-wavy evidence — that (a) alerts are actually delivered when
something goes wrong, (b) support and feedback channels are actually monitored by a named owner,
(c) errors are triageable from redacted logs, (d) log/evidence retention honors a documented TTL
policy, and (e) the launch cannot proceed until these readiness gates are independently verified.

**Problem being solved.** The current `scripts/check-support-monitoring-readiness.ts` records
five `*_CONFIRMED` env flags and four owner labels but states in its own `note` that *"it does not
verify inbox access, alert dashboards, linked feedback rows, hosted auth, or incident delivery by
itself."* Only one real alert-delivery mechanism exists today (the upload-operations webhook), and
it is fire-and-forget with swallowed delivery failures. Log retention is half-built: the
retention schedule declares 14 classes but `DEFAULT_RETENTION_RULES` enforces only 7; the 7 log/
platform classes (`logs_worker_observability`, `logs_email_delivery`, `uploads_orphaned`,
`sessions_expired`, three AI classes) have no enforced rule. The PROMPT's stop condition is that
support and alert readiness can be proven **without hand-wavy operator claims** — that bar is not
met today.

**Planning scope (this pack owns the *operational proof layer*):**

1. Alert **scenarios** + **delivery proof** that replace operator-flag theater with observable
   evidence (sent → received → acknowledged), staying free-tier.
2. **Triage ownership** matrix (who responds, within what SLA, to which signal).
3. **Incident record format** (the canonical row written when an incident is declared).
4. **Log redaction inventory** — a complete catalog of every log/evidence emit path and what
   redaction covers/gaps (not re-implementing redaction — that is the sibling observability pack).
5. **Retention TTL policy** lock-in for the 7 unenforced log/platform classes + evidence-retention
   policy for proof artifacts.
6. **Tests / static checks** that the readiness evidence is real, not self-asserted.
7. **Launch-blocking criteria** — the exact gates that must be green before first users.

**Non-goals.**

- **NOT** re-owning observability plumbing (request IDs, error taxonomy, budgets, Analytics Engine
  metrics, sampling tuning, redaction *enforcement*). Those are owned by
  `2026-07-07-cloudflare-worker-production-observability-and-budgets`. This pack *depends* on them
  and *consumes* their outputs, but does not duplicate them. Explicit boundary in `02_…` §Scope
  boundary with sibling pack.
- **NOT** building paid alerting (PagerDuty, Datadog, Logpush, Workers Paid). The PROMPT constrains
  to free-tier unless the owner approves paid services. Paid paths are documented as owner-gated
  decisions, not implemented.
- **NOT** implementing DSAR erasure propagation (owned by
  `2026-07-07-privacy-request-operations-and-erasure-workflow`, gated `OPEN-ERASE-01`).
- **NOT** re-deciding retention TTLs for the 7 already-enforced classes (those wait on
  `OPEN-DEC-004` counsel sign-off; this pack only locks the 7 *unenforced* log/platform classes to
  the schedule's existing draft values and adds enforcement rules).
- **NOT** building the beta-feedback SLA operating loop (owned by
  `2026-07-07-beta-support-feedback-operating-loop`). This pack references its `DATA-02`
  feedback-retention coupling but does not duplicate it.

**Required codebase analysis.** Full audit of: `src/lib/observability/*` (10 files),
`src/lib/compliance/*`, `src/lib/uploads/operational-telemetry.ts`, `src/lib/email/*`,
`scripts/check-support-monitoring-readiness.ts` + sibling `verify-*`/`check-*` proof scripts,
`wrangler.jsonc` observability config, `worker.ts` cron/queue handlers, all 38 migrations for
feedback/support/incident/audit tables, and `.ai/10_state/compliance/*`.

**Required specialist workstreams.** Product/ops strategy, codebase architecture, data/retention,
security/redaction, performance/reliability, test/QA, rollout/operations, blast radius,
adversarial review, final verification.

**Implementation-readiness criteria.** Every requirement has a stable ID, objective acceptance
criteria, a validation method that is *not* "manual QA," exact affected paths, and a rollout gate.
The package is `IMPLEMENTATION-READY` only if no task is `BLOCKED-*` on an internally resolvable
decision; owner-delegated decisions (`OPEN-*`) are isolated and named.

**Validation criteria.** Local static + targeted unit/vitest proof for the proof-script and
retention-rule changes; provider-backed proof is named as a *required external gate* (not claimed
from local evidence).

**Final planning deliverables.** Documents `00–19` + `README.md` + `LOOP_LEDGER.md` per the
exhaustive profile.

---

## Specialist workstream lanes (emulated — see verification mode below)

| # | Lane (emulated) | Goal | Scope | Owned artifacts |
|---|---|---|---|---|
| 1 | Lead coordinator | Scope, sequencing, integration, sibling-pack boundary, final claim | All docs | `00`, `01`, `README`, `LOOP_LEDGER` |
| 2 | Source & requirements analyst | Extract requirements from PROMPT + repo evidence; build traceability | PROMPT + observability/compliance source | `02`, `04`, `16` |
| 3 | Codebase architecture analyst | Map current logging/redaction/alert/retention surfaces; sibling-pack seams | `src/lib/observability`, `src/lib/compliance`, `src/lib/uploads`, `scripts/`, `wrangler.jsonc`, `worker.ts`, migrations | `03`, `06` |
| 4 | Data/retention planner | Lock the 7 unenforced TTL classes; evidence-retention policy; incident-record table | `retention-core.ts`, `retention-schedule.md`, migrations | `07` |
| 5 | Security/redaction reviewer | Log redaction inventory; PII/secret leak surface; denial tests | `redact.ts`, console-bypass audit | `08` |
| 6 | Perf/reliability reviewer | Alert-latency budgets; retention-pass cost; free-tier quota headroom | budgets, evaluator contract | `09` |
| 7 | Test/QA strategist | Test matrix replacing operator flags with real proof; adversarial scenarios | proof scripts, vitest | `12`, `19` |
| 8 | Operations/rollout planner | Launch-blocking gates; runbook; rollback; first-24h/72h review | `13` |
| 9 | Adversarial reviewer | Disprove readiness; find omissions; P0/P1/P2 findings | `17` (critique log) |
| 10 | Final verifier | Requirement-by-requirement audit | `17` |

**Native vs simulated.** No native subagents were spawned for authoring. Three read-only
`Explore` discovery agents were dispatched in parallel for the codebase audit (logging/redaction,
observability/alerting config, retention/compliance); their findings are cited throughout `03`.
The adversarial-review and final-verification passes are **emulated** (separated passes by the
same author agent) because true native delegation was not exercised for the review stages. This is
recorded honestly in `17` and caps the readiness score per the suite contract.

---

## Skills discovered and used

| Skill | Used? | Why |
|---|---|---|
| `archestimator-plan-pack` | yes | Binds generic planning to the dated `.ai/03_plans/` + `LOOP_LEDGER` contract; confirmed exhaustive profile triggers (security, data, launch). |
| `cloudflare` / `workers-best-practices` | referenced | Free-tier Workers Observability limits, sampling, Analytics Engine, Logpush paid-gating. Retrieved via the discovery agents + `wrangler.jsonc` readback; current official-doc research deferred to implementation. |
| `verification-before-completion` | yes | Drives the completion audit and the "do not accept operator-flag proxy signals" rule. |
| `gitnexus` | not used | Narrow read-only audit; `rg` + targeted reads were cheaper per the repo's proportional-graph policy. |

No fabricated skills, tool outputs, or agent executions. Unavailable native-review delegation is
recorded as emulated, not falsely independent.

---

## Coordination ledger

| Lane | Goal | Owned scope | Dependencies | Findings | Decisions/rejected alternatives | Conflicts | Validation evidence | Status |
|---|---|---|---|---|---|---|---|---|
| Discovery — logging/redaction | Inventory logging surface + redaction coverage | `src/lib/observability/*`, console-bypass audit | none | 10-file observability module; redact.ts covers email/password/token/JWT/share/invite but NOT credit-card/phone/IP/raw-Set-Cookie/stack-paths; ~88 logger-bypassing console.* calls; only 2 redact consumers | n/a | none | agent report (cited in `03` §1, §5) | complete |
| Discovery — observability/alerting | Map alert delivery + crons + proof scripts | `wrangler.jsonc`, `worker.ts`, `scripts/` | none | Only 1 real webhook (upload-ops, fire-and-forget); 3 crons; observability enabled but persist-only; no Logpush/tail-consumer/third-party sink | n/a | none | agent report (cited in `03` §2) | complete |
| Discovery — retention/compliance | Map retention TTLs + evidence + backups | `.ai/10_state/compliance/*`, migrations, `retention-core.ts` | none | 7/14 classes enforced; 7 log/platform classes unenforced; OPEN-DEC-004 gates final TTLs; daily backups aspirational (7-day Time Travel); feedback purge DATA-02 coupled | n/a | none | agent report (cited in `03` §3, `07`) | complete |
| Lead synthesis | Author pack + sibling boundary | all docs | discovery reports | Sibling observability pack owns plumbing; this pack owns proof layer | DEC-01..DEC-09 (in `15`) | none (boundary resolved) | cross-doc consistency check in review cycle | complete |
| Adversarial review (emulated) | Disprove readiness | all docs | lead synthesis | P0/P1 findings logged in `17` critique log; all P0/P1 resolved | n/a | none | `17` | complete |
| Final verification (emulated) | Requirement-by-requirement audit | all docs | adversarial pass | verdict + verification_mode recorded | n/a | none | `17` | complete |

---

## File/module ownership for *future implementation*

All future implementation edits are coordinated by the `11_IMPLEMENTATION_PLAN.md` phase ownership.
The proof-script and retention-rule changes are disjoint file scopes:

- `scripts/check-support-monitoring-readiness.ts` + new `scripts/verify-*-alert-delivery.ts` —
  owned by Phase 1 (alert delivery proof).
- `src/lib/compliance/retention-core.ts` (`DEFAULT_RETENTION_RULES`) — owned by Phase 3 (retention
  TTL enforcement).
- `src/lib/observability/redact.ts` gaps + `console.*` bypass — **owned by the sibling
  `2026-07-07-cloudflare-worker-production-observability-and-budgets` pack (SEC-01)**; this pack
  only *inventories* them (§`08`) and references the dependency.

No two implementation tasks edit the same file without a serialized, named owner.
