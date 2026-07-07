# 04 — Requirements Specification

Stable IDs. Priorities: **P0** blocks launch, **P1** should-have, **P2** defer-eligible.
Source-strength legend: `brief`=PROMPT, `repo`=file:line, `official`=Cloudflare docs,
`derived`=inferred, `assumption`. Acceptance criteria are objective and testable. Shadow-path
matrices follow each flow group.

---

## FR — Functional

### FR-01 (P0) — Alert scenario catalog
- **Statement:** A documented, version-controlled catalog of alert scenarios that *must* produce a
  delivered alert before launch, each with a severity, a signal source, a channel, and an owner.
- **Rationale:** "Alert delivery" is unprovable without an enumerated set of *what* alerts. Today
  only upload-ops has a real path.
- **Source:** brief ("alert scenarios") + repo (`operational-telemetry.ts` is the only example).
- **Priority:** P0.
- **Dependencies:** none.
- **Scenarios (S-*) — the catalog:** (full definitions + signal queries in `09_…` §2)
  - **S-01 Uptime**: site unreachable / 5xx spike. Signal: external probe or GraphQL error-rate.
    Channel: error-rate alert poller + email. Sev: critical.
  - **S-02 Error-rate**: route 5xx rate > threshold. Signal: Workers Observability GraphQL.
    Channel: self-poll → email-to-support + (optional) webhook. Sev: high.
  - **S-03 Upload backpressure**: admission rejected / cleanup backlog. Signal:
    `reportUploadAdmissionRejected` (existing). Channel: upload-ops webhook (existing, extended
    proof). Sev: warning/critical.
  - **S-04 Queue DLQ depth**: `archestimator-upload-jobs-dlq` message count > 0 sustained. Signal:
    Queue metadata / Wrangler API. Channel: email + dashboard. Sev: high.
  - **S-05 Cron failure**: `0 3`/`15 3`/`30 3` did not complete successfully. Signal: cron summary
    log `ok:false` (requires sibling pack FR-02/FR-03 to land first). Channel: email. Sev: high.
  - **S-06 Incident escalation**: a human-declared incident needs a second responder. Signal:
    incident record `escalated_to`. Channel: email + dashboard. Sev: critical.
  - **S-07 Retention-pass failure**: `30 3` retention run errored or hit `budget_reached`
    abnormally. Signal: `data_retention_events` / cron summary. Channel: email. Sev: medium.
- **Acceptance criteria:**
  - AC-FR-01a: `13_…` (runbook) lists all 7 scenarios with severity/signal/channel/owner/SLA.
  - AC-FR-01b: Each scenario has a matching `verify-*-alert-delivery.ts` (FR-04) OR is explicitly
    marked "platform-managed, proof = dashboard observation receipt" with a named observer.
- **Validation:** static review of `13_…`; FR-04 proof artifacts exist for each deliverable
  scenario.
- **Affected code:** new `src/lib/observability/alert-scenarios.ts` (catalog as typed const);
  runbook doc.
- **Risks:** catalog drifts from reality (mitigate: TEST-03 static check asserts the catalog and
  the proof-script registry agree).
- **Status:** planned.

### FR-02 (P0) — Alert channels defined and free-tier-bounded
- **Statement:** Each scenario maps to ≥1 delivery channel; channels are: (a) upload-ops webhook
  (existing), (b) email-to-support via EMAIL binding (new operational use), (c) self-poll GraphQL
  error-rate → email (sibling OBS-03 provides query; this pack proves delivery). No paid channel
  is enabled.
- **Rationale:** PROMPT free-tier constraint; need ≥1 channel that reaches a human per scenario.
- **Source:** brief + repo (`EMAIL` binding exists, `operational-telemetry.ts` webhook exists).
- **Priority:** P0.
- **Dependencies:** FR-01; sibling pack OBS-03 (GraphQL query defs) for S-02.
- **Acceptance criteria:**
  - AC-FR-02a: Every S-* scenario names ≥1 channel; no scenario relies solely on "operator will
    check the dashboard."
  - AC-FR-02b: Email operational alerts use the `EMAIL` binding with a circuit breaker
    (reuse `TransactionalEmailClient`) and a redacted log event `operational_alert_sent`.
  - AC-FR-02c: No paid add-on is enabled by this plan; paid upgrades are `OPEN-ALERT-02`/
    `OPEN-RET-01`.
- **Validation:** static review; FR-04 proof per channel.
- **Affected code:** `src/lib/email/` (new operational-alert helper, reuses client);
  `src/lib/observability/alert-scenarios.ts`.
- **Risks:** EMAIL binding deliverability unproven pre-launch (mitigate: FR-04 email proof + the
  existing `check-cloudflare-email-readiness.ts`).
- **Status:** planned.

### FR-03 (P0) — Delivery proof model (artifact, not flag)
- **Statement:** Readiness is proven by a **redacted JSON receipt artifact** produced by a real
  send→receive→acknowledged round-trip, never by an operator setting `*=1`. The artifact records:
  scenario id, channel, sent-at, received-ack signal, proof-class (local-automated vs
  provider-backed), and a redaction attestation.
- **Rationale:** PROMPT stop condition — "without hand-wavy operator claims." The current
  `check-support-monitoring-readiness.ts` `note` admits it proves nothing.
- **Source:** brief (stop condition) + repo (`verify-upload-alert-delivery.ts` is the model).
- **Priority:** P0.
- **Dependencies:** FR-01, FR-02, FR-04.
- **Acceptance criteria:**
  - AC-FR-03a: Each deliverable scenario has a receipt artifact at
    `.ai/99_scratch/alert-proof/<scenario-id>.json` (gitignored) OR an R2 proof object, containing
    `{scenarioId, channel, sentAt, ackSignal, ackObservedAt, proofClass, redactionAttestation}`.
  - AC-FR-03b: `proofClass ∈ {local-automated, provider-backed}`; launch gates (GATE-02) require
    `provider-backed` for S-01/S-02/S-05/S-06.
  - AC-FR-03c: `redactionAttestation` asserts the artifact was passed through `redactForLog` and
    contains no raw secret/email/token (TEST-02 scan proves it).
  - AC-FR-03d: A missing or stale (older than `ALERT_PROOF_MAX_AGE_HOURS=72`) receipt fails the
    readiness verifier with exit code 1.
- **Validation:** TEST-02 (verifier fails on missing/stale/unredacted artifact).
- **Affected code:** rewritten `scripts/check-support-monitoring-readiness.ts` (artifact-driven,
  backward-compatible flag fallback documented as deprecated); new receipt schema in
  `src/lib/observability/alert-proof-schema.ts`.
- **Risks:** round-trip needs a live destination (mitigate: provider-backed proof is an explicit
  launch gate, not claimed from local evidence).
- **Status:** planned.

### FR-04 (P0) — Per-scenario delivery-proof scripts
- **Statement:** A `verify-*-alert-delivery.ts` script per deliverable scenario, modeled on
  `verify-upload-alert-delivery.ts`, that performs the real round-trip and writes the receipt.
- **Rationale:** generalize the one working proof to the whole catalog.
- **Source:** brief + repo (`verify-upload-alert-delivery.ts`).
- **Priority:** P0.
- **Dependencies:** FR-03.
- **Acceptance criteria:**
  - AC-FR-04a: Scripts exist: `verify-uptime-alert-delivery.ts` (S-01),
    `verify-error-rate-alert-delivery.ts` (S-02), `verify-upload-alert-delivery.ts` (S-03,
    extended), `verify-queue-dlq-alert-delivery.ts` (S-04), `verify-cron-failure-alert-delivery.ts`
    (S-05), `verify-incident-escalation-alert-delivery.ts` (S-06),
    `verify-retention-alert-delivery.ts` (S-07).
  - AC-FR-04b: Each script redacts its output via `redactForLog`; each writes a receipt; each has
    a `note` scoping what it does/does not prove (mirroring the upload script's honesty).
  - AC-FR-04c: Each script gates on a `*_PROOF=1` + `*_HOSTED_OBSERVED=1` env pair so it cannot
    fire accidentally; absence of proof is the failing state, not the firing state.
- **Validation:** TEST-02 + TEST-03 (registry/catalog agreement).
- **Affected code:** new scripts under `scripts/`.
- **Risks:** webhook/email destinations need real endpoints (owner action `OPEN-ALERT-01`).
- **Status:** planned.

### FR-05 (P0) — Incident record format + declare/close runbook
- **Statement:** Declaring and closing an incident writes a canonical D1 record
  (`operational_incidents` + `operational_incident_events`) with severity, owner, status, related
  request-ids, and resolution. The declare/close steps are a documented runbook.
- **Rationale:** "we had an incident" must be queryable, not a memory; no incident table exists.
- **Source:** brief ("incident record format") + repo (no incident table found).
- **Priority:** P0.
- **Dependencies:** DATA-01.
- **Acceptance criteria:**
  - AC-FR-05a: `operational_incidents` columns: `id, declared_at, severity (sev1/sev2/sev3),
    status (open/contained/resolved/closed), owner, summary, root_cause (nullable, filled at
    close), related_request_ids (JSON array, redacted), closed_at (nullable)`.
  - AC-FR-05b: `operational_incident_events` columns: `id, incident_id, occurred_at, event_kind
    (declared/status_changed/escalated/note/closed), actor, detail (redacted)`.
  - AC-FR-05c: Runbook (`13_…`) documents declare/escalate/close steps with the exact SQL or a
    scoped admin action.
  - AC-FR-05d: An open incident older than its SLA (OPS-01) is surfaced by the readiness verifier
    as `stale_incident`.
- **Validation:** unit test of the record builder + redaction; migration `0040` applies cleanly.
- **Affected code:** migration `0040_operational_incidents.sql`; new
  `src/lib/observability/incident-record.ts`; runbook.
- **Risks:** admin-only write path (mitigate: scoped action, not a public route; authz required).
- **Status:** planned.

---

## DATA — Data / retention

### DATA-01 (P0) — Incident schema migration
- **Statement:** Migration `0040_operational_incidents.sql` creates `operational_incidents` +
  `operational_incident_events` with constraints + indexes, within `wrangler.jsonc` D1 bounds.
- **Source:** derived (no incident table exists).
- **Priority:** P0.
- **Dependencies:** none (next migration number is `0040` per beta-feedback pack's `0039` proposal).
- **Acceptance criteria:**
  - AC-DATA-01a: Migration applies to local D1 preview without error; `bun run cf:d1:migrate`
    (local) succeeds.
  - AC-DATA-01b: `data_retention_events.class_name` CHECK (migration `0034`) — confirm whether
    `operational_incidents` needs a new class entry (it does: add `operational_incidents` 7y to
    the schedule as compliance evidence, gated `OPEN-DEC-004`).
  - AC-DATA-01c: Index on `(status, declared_at)` for the stale-incident query.
- **Validation:** local migrate + `EXPLAIN` on the stale query.
- **Affected code:** `migrations/0040_operational_incidents.sql`;
  `retention-schedule.md` (add class).
- **Risks:** migration order collision with concurrent packs (mitigate: `0040` is the next free
  slot; coordinate in `LOOP_LEDGER`).
- **Status:** planned.

### DATA-02 (P1) — Enforce the 7 unenforced retention classes (draft TTLs)
- **Statement:** Add rules to `DEFAULT_RETENTION_RULES` for the 7 classes that currently have a
  schedule TTL but no rule, using the schedule's draft values (corrected for free-tier reality),
  gated on `OPEN-DEC-004` for final TTLs.
- **Source:** brief ("retention TTL") + repo (`retention-core.ts:79-143` has 7 rules; schedule
  has 14 classes).
- **Priority:** P1 (P0 for `uploads_orphaned`/`sessions_expired` which have live data).
- **Dependencies:** DATA-03 (the platform-managed nuance).
- **Acceptance criteria:**
  - AC-DATA-02a: `uploads_orphaned` rule added: purges `upload_assets` rows `status='deleted' AND
    updated_at <= cutoff` and `upload_sessions` expired beyond the cleanup policy's
    `deletedAssetRetentionDays=30`/`expiredSessionRetentionDays=1` — **coordinated with, not
    duplicating,** `src/lib/uploads/cleanup.ts` `DEFAULT_UPLOAD_RETENTION_POLICY`. The retention
    rule is the *audit-class* sweep; the upload-cleanup job is the *R2-object* sweep. This pack
    documents the seam to avoid double-delete.
  - AC-DATA-02b: `sessions_expired` rule added: purges Better Auth `session` rows past
    `sessionExpiresIn` (Better Auth default 7d + 30d grace = purge at 37d draft). Confirms the
    `session` table is D1-managed by Better Auth (it is — `compileCloudflareBetterAuthD1Migrations`).
  - AC-DATA-02c: `ai_action_runs`/`ai_tool_calls`/`ai_data_access_events` rules added (365d) as
    forward-compat no-ops (tables exist per migration `0006` but feature deferred).
  - AC-DATA-02d: `logs_worker_observability`/`logs_email_delivery` are **NOT** D1 DELETE rules —
    they are *policy acknowledgement rows* in the schedule with the corrected free-tier TTL + a
    documented paid upgrade path (DATA-03). The readiness verifier checks the acknowledgement
    exists, not that a DELETE ran.
  - AC-DATA-02e: Each new rule logs `{"event":"retention.rule",...}` (sibling pack REL-02
    pattern) and respects the time+row budget (sibling REL-02).
- **Validation:** unit test that each new rule selects the expected rows on a fixture; dry-run
  produces 0 deletes on an empty DB.
- **Affected code:** `src/lib/compliance/retention-core.ts`; `retention-schedule.md`.
- **Risks:** double-delete with upload-cleanup job (mitigate: documented seam + TEST);
    Better Auth session table shape (mitigate: confirm via generated migration readback).
- **Status:** planned.

### DATA-03 (P0) — Correct the `logs_worker_observability` free-tier TTL
- **Statement:** The schedule's `logs_worker_observability` "30d" is corrected to the free-tier
  reality (~3 days) with a documented note that 30d+ requires Logpush (paid) or Workers Paid.
- **Source:** official (Cloudflare Workers Logs free-tier retention ~3 days; Logpush is the
  durable path) + repo (`retention-schedule.md:31` says 30d).
- **Priority:** P0 (false retention claim before first users is a launch blocker).
- **Dependencies:** none.
- **Acceptance criteria:**
  - AC-DATA-03a: `retention-schedule.md` `logs_worker_observability` row updated: TTL
    `~3d (free) / 30d+ (Logpush/Workers Paid)`, action `platform-managed`, note explaining the
    free-tier ceiling and the `OPEN-RET-01` paid upgrade trigger.
  - AC-DATA-03b: `privacy-notice-draft.md` §5 cross-checked — no user-facing "we keep logs 30 days"
    promise exists (it does not; the notice says "audit logs 365d" which refers to D1 audit
    tables, not Workers Logs). If any doc conflates the two, correct it.
  - AC-DATA-03c: Runbook names the implication: an error older than ~3 days is not retrievable
    from Workers Logs unless Logpush is enabled → first-24h review (OPS-03) must capture
    incident-relevant logs promptly.
- **Validation:** official-doc citation in `19_…`; static doc review.
- **Affected code:** `retention-schedule.md`; runbook.
- **Risks:** none beyond the doc correction.
- **Status:** planned.

### DATA-04 (P1) — Evidence-artifact retention policy
- **Statement:** Proof artifacts (alert receipts, observability proof files) have a 90-day
  retention + redaction policy; stored under gitignored `.ai/99_scratch/` or R2 with redaction;
  never committed with raw content.
- **Source:** brief ("evidence retention policy", "no raw personal data or secrets in evidence").
- **Priority:** P1.
- **Dependencies:** SEC-02.
- **Acceptance criteria:**
  - AC-DATA-04a: Artifacts older than 90 days are pruned by a documented cleanup step (manual or
    cron-extended; not a new cron slot — reuse the retention-pass or a scripts/ cleanup).
  - AC-DATA-04b: `.gitignore` confirmed to exclude `.ai/99_scratch/alert-proof/`; R2 proof objects
    use a redacted key namespace.
  - AC-DATA-04c: Each artifact carries `redactionAttestation`; TEST-02 scans artifacts for secret-
    shaped strings.
- **Validation:** static review + TEST-02.
- **Affected code:** `.gitignore`; `scripts/check-support-monitoring-readiness.ts` (prune step);
  `retention-schedule.md` (add `evidence_artifacts` 90d class, platform-managed).
- **Status:** planned.

---

## OPS — Operations / triage

### OPS-01 (P0) — Triage ownership matrix
- **Statement:** A named-owner + SLA matrix for every signal class, recorded in the readiness
  output and the runbook.
- **Source:** brief ("triage ownership").
- **Priority:** P0.
- **Acceptance criteria:**
  - AC-OPS-01a: Matrix maps each S-* scenario + each audit-table error class to `{owner, ack-SLA,
    resolve-SLA, escalation-target}`. Owners are the env-supplied labels
    (`SUPPORT_MONITORING_SUPPORT_OWNER`, `_ALERT_OWNER`) but now *required* (verifier fails without).
  - AC-OPS-01b: SLA defaults: sev1 ack ≤15min/resolve ≤4h; sev2 ack ≤1h/resolve ≤1 business day;
    sev3 ack ≤1 business day/resolve ≤5 business days. Owner may override via env; override is
    logged in the readiness output.
- **Validation:** static review; readiness verifier asserts owners non-empty.
- **Affected code:** `scripts/check-support-monitoring-readiness.ts`; runbook.
- **Status:** planned.

### OPS-02 (P1) — Structured alert log events
- **Statement:** Every delivered alert emits a structured log event with the scenario id, channel,
  outcome (`delivered`/`failed`/`suppressed`), and a redacted target marker — never the raw target
  address/token.
- **Source:** brief ("incident delivery") + repo (`operational-telemetry.ts` swallows failures).
- **Priority:** P1.
- **Acceptance criteria:**
  - AC-OPS-02a: Events: `operational_alert_sent`, `operational_alert_failed`,
    `operational_alert_suppressed`, `incident_declared`, `incident_escalated`, `incident_closed`.
  - AC-OPS-02b: No event includes raw email address (hashed), webhook URL (host-only), or bearer
    token (never). TEST-02 proves it.
- **Validation:** unit test of event builders; TEST-02 scan.
- **Affected code:** `src/lib/observability/alert-events.ts`; `operational-telemetry.ts` (extend
  to log outcome instead of swallowing).
- **Status:** planned.

### OPS-03 (P0) — First-24h and first-72h post-launch review gates
- **Statement:** Launch is conditioned on a scheduled first-24h and first-72h operational review
  with named owners; the review checks alert receipts, incident count, error-rate, and retention
  pass health.
- **Source:** brief ("before first users") + repo (readiness script has `FIRST_24H_OWNER`/
  `FIRST_72H_OWNER` labels).
- **Priority:** P0.
- **Acceptance criteria:**
  - AC-OPS-03a: GATE-03 names the review owners, the exact checklist (alert receipts present,
    incident log empty or all `resolved`, error-rate within budget, last retention pass
    `ok:true`), and the rollback trigger if any check fails.
  - AC-OPS-03b: A missed review (no receipt within 72h of launch) is a documented launch
    degradation, not silent.
- **Validation:** GATE-03 static review.
- **Affected code:** runbook; readiness verifier (review-receipt check).
- **Status:** planned.

---

## SEC — Redaction / privacy (inventory + evidence)

### SEC-01 (P1) — Log redaction inventory (this pack inventories; sibling enforces)
- **Statement:** A complete catalog of every log/evidence emit path and what redaction covers and
  misses, delivered to the sibling observability pack's SEC-01 as input.
- **Source:** brief ("redaction ... review") + repo (`redact.ts` + console-bypass audit).
- **Priority:** P1.
- **Acceptance criteria:**
  - AC-SEC-01a: `08_…` lists every emit path (logger, console-bypass clusters, client-error
    route, Analytics Engine dims, Server-Timing labels, proof scripts) with coverage status.
  - AC-SEC-01b: The 5 `❌` gaps (credit-card, phone, IP, raw Set-Cookie/Authorization strings,
    server stack paths) are named with a recommended enforcement owner (= sibling SEC-01).
  - AC-SEC-01c: This pack does **not** edit `redact.ts` — it records the dependency in `16_…`.
- **Validation:** static review of `08_…`; cross-ref that no enforcement task is owned here.
- **Affected code:** none (inventory doc only).
- **Status:** planned.

### SEC-02 (P0) — Evidence redaction on all proof artifacts
- **Statement:** Every proof artifact this plan produces is passed through `redactForLog` and
  scanned for secret-shaped strings before being written/committed.
- **Source:** brief ("No raw personal data or secrets in evidence").
- **Priority:** P0.
- **Acceptance criteria:**
  - AC-SEC-02a: TEST-02 scans every artifact under `.ai/99_scratch/alert-proof/` (and any R2
    proof object reachable) for: emails, bearer tokens, JWTs, 32+ hex blobs, `password=`/`token=`
    patterns; non-empty match fails the verifier.
  - AC-SEC-02b: Proof scripts call `redactForLog` on their output object before writing.
  - AC-SEC-02c: No artifact is committed to git with raw content (`.gitignore` + TEST-03).
- **Validation:** TEST-02.
- **Affected code:** proof scripts; TEST-02.
- **Status:** planned.

---

## GATE — Launch-blocking criteria

### GATE-01 (P0) — Readiness verifier is artifact-driven and fails loud
- **Statement:** `scripts/check-support-monitoring-readiness.ts` exits 1 when any required
  artifact is missing/stale/unredacted or any owner label is empty.
- **Source:** brief ("launch blocking criteria", stop condition).
- **Priority:** P0.
- **Acceptance criteria:**
  - AC-GATE-01a: Verifier checks: 7 alert receipts (FR-03), 4 owner labels non-empty (OPS-01),
    incident table exists (DATA-01), retention rules count = 14 (DATA-02), no open stale
    incidents (FR-05d), evidence artifacts redacted (SEC-02), `logs_worker_observability` TTL
    corrected in schedule (DATA-03).
  - AC-GATE-01b: Output JSON includes `launchReady: boolean` + `missing: [...]` + `proofClass`
    per artifact.
- **Validation:** TEST-02.
- **Status:** planned.

### GATE-02 (P0) — Provider-backed proof required for critical scenarios
- **Statement:** S-01 (uptime), S-02 (error-rate), S-05 (cron failure), S-06 (incident
  escalation) require `proofClass: provider-backed` receipts; local-automated is insufficient for
  launch.
- **Source:** brief ("Separate local test proof from live alert proof").
- **Priority:** P0.
- **Acceptance criteria:**
  - AC-GATE-02a: GATE-01 verifier rejects `proofClass: local-automated` for those 4 scenarios.
  - AC-GATE-02b: Provider-backed proof is named as an *external* gate (cannot be claimed from
    local-only evidence per AGENTS.md verification policy).
- **Validation:** TEST-02 + honest external-gate recording.
- **Status:** planned.

### GATE-03 (P0) — First-24h/72h review gates (see OPS-03)
- **Status:** planned.

---

## TEST / DOC

### TEST-01 (P0) — Unit tests for new code
- **Statement:** Tests for: incident-record builder + redaction, alert-event builders, retention
  rule row-selection per new class, readiness-verifier fail/pass paths.
- **Source:** repo test patterns.
- **Priority:** P0.
- **Acceptance criteria:** files in `12_…` matrix, all green.
- **Status:** planned.

### TEST-02 (P0) — Readiness verifier + redaction-scan tests
- **Statement:** Tests proving the verifier fails on missing/stale/unredacted artifacts and passes
  on a valid artifact set; a redaction-scan test over a fixture artifact with planted secrets.
- **Priority:** P0.
- **Status:** planned.

### TEST-03 (P1) — Catalog/registry agreement static check
- **Statement:** A check that `alert-scenarios.ts` catalog IDs and the `verify-*-alert-delivery.ts`
  script registry agree; drift fails CI.
- **Priority:** P1.
- **Status:** planned.

### DOC-01 (P1) — Observability + incident runbook
- **Statement:** `13_…` runbook: find-by-request-id, read-an-error-log, declare/escalate/close
  incident, budget/retention thresholds, rollback, escalation contacts.
- **Priority:** P1.
- **Status:** planned.

---

## Shadow-path matrix — alert-delivery flow (FR-03/FR-04)

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Upload-ops webhook (S-03) | sent→200→receipt | missing URL/token → `suppressed` + receipt `failed` | n/a | bad severity → skip | n/a (worker internal) | webhook 500/timeout → `failed`, logged, **not swallowed silently** | duplicate event → idempotent receipt update | retry capped (no infinite loop) | receipt `delivered`/`failed` | unit + FR-04 script |
| Email alert (S-02/05/06) | EMAIL binding sends→inbox | missing `CLOUDFLARE_EMAIL_FROM` → `suppressed` | empty recipient list → skip | invalid email shape → redact+skip | n/a | circuit breaker open → `suppressed`, logged | n/a | circuit breaker cooldown | receipt `delivered`/`failed` | unit + FR-04 script |
| GraphQL error-rate poll (S-02) | query→rate>thr→alert | missing token → `suppressed` | 0 invocations → rate 0, no alert | bad query → `failed`, logged | token 401 → `failed` | API 5xx → retry w/ cap | overlapping polls → distinct run ids | idempotent within window | receipt `delivered`/`no-action` | unit + FR-04 script (provider-backed) |
| Incident declare (FR-05) | insert row→log event | missing severity → reject | n/a | bad status → CHECK fail | non-admin → 403 | D1 error → caught, `failed` | two declerations same root → distinct ids | n/a | row + event | unit |

## Shadow-path matrix — retention pass (DATA-02)

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Retention rule sweep | rows selected→deleted→audit | no rule → skip | 0 rows → 0 affected, audit `0` | bad SQL → `retention_pass_failed` | n/a (cron internal) | D1 timeout → caught, `budget_reached`/`failed` | single-flight via cron | DELETE idempotent | summary logged | unit (per new rule) |
