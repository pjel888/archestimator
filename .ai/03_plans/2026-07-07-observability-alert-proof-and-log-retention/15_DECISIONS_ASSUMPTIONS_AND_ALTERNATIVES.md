# 15 — Decisions, Assumptions, and Alternatives

## Major decisions (load-bearing)

### DEC-01 — Artifact-based proof replaces operator flags
- **Problem:** `check-support-monitoring-readiness.ts` records `*_CONFIRMED` flags but its own
  `note` admits it proves nothing → PROMPT stop condition unmet.
- **Options:** (a) keep flags + add human-click audit (still theater); (b) artifact-based receipts
  from real round-trips; (c) paid alerting stack (violates free-tier).
- **Selected:** (b).
- **Rationale:** generalizes the one working example (`verify-upload-alert-delivery.ts`); stays
  free-tier; the receipt is machine-checkable (TEST-02), so "did it deliver" is no longer a human
  claim.
- **Rejected alternatives:** (a) doesn't meet the stop condition; (c) violates PROMPT constraint.
- **Consequences:** requires real destinations (R-01); receipts need redaction (SEC-02).
- **Conditions to revisit:** if a free artifact source becomes unavailable.

### DEC-02 — Generalize the upload-ops webhook proof model
- **Problem:** one scenario has real proof; six don't.
- **Options:** (a) one generic verifier; (b) per-scenario verifiers modeled on the working one;
  (c) a new alerting framework.
- **Selected:** (b).
- **Rationale:** each scenario has a distinct channel/signal; per-scenario scripts keep the honest
  `note` scoping (what it does/doesn't prove) which the working script already does well.
- **Rejected:** (a) loses per-scenario honesty scope; (c) over-engineering.

### DEC-03 — Correct `logs_worker_observability` free-tier TTL to ~3d
- **Problem:** schedule says "30d"; free-tier Workers Logs retention is ~3 days. A false retention
  claim before first users is a launch blocker.
- **Options:** (a) leave "30d" (false); (b) correct to `~3d (free)/30d+ (Logpush/Workers Paid)`
  with `OPEN-RET-01` upgrade path; (c) enable Logpush now (paid, violates constraint).
- **Selected:** (b).
- **Rationale:** honesty over a convenient number; the runbook then correctly tells operators to
  capture incident logs within ~3d.

### DEC-04 — Add `operational_incidents` + `operational_incident_events` D1 tables
- **Options:** (a) D1 tables; (b) flat file; (c) Workers Observability only.
- **Selected:** (a).
- **Rationale:** incidents must be queryable, durable, and auditable (compliance evidence). D1 is
  the bounded relational store within `wrangler.jsonc`.

### DEC-05 — Enforce the 7 unenforced retention classes now (draft TTLs), gated `OPEN-DEC-004`
- **Options:** (a) wait for counsel before any enforcement (data unbounded through launch); (b)
  enforce draft values now, counsel adjusts later.
- **Selected:** (b).
- **Rationale:** the draft values are industry-default + already in the schedule; leaving
  log/platform data unbounded through launch is the worse risk. Dry-run + audit make it safe.

### DEC-06 — Evidence artifacts: 90d retention + redaction, gitignored or R2
- **Options:** (a) commit to git (leak risk + unbounded); (b) gitignored local; (c) R2 with
  redacted keys.
- **Selected:** (b) default, (c) `OPEN-EVID-01` option.
- **Rationale:** never commit raw proof; 90d bounds storage; `.ai/99_scratch/` is already
  local-only per AGENTS.md.

### DEC-07 — First-24h/72h reviews are mandatory launch gates
- **Options:** (a) one-shot launch; (b) mandatory review windows with named owners.
- **Selected:** (b).
- **Rationale:** the first real incident will find gaps; structured reviews force capture of
  incident-relevant logs within the ~3d window (R-11) and confirm alert delivery end-to-end.

### DEC-08 — Error-rate alerting uses free self-poll GraphQL (sibling OBS-03), proven here
- **Options:** (a) claim Workers Observability "alerts" natively (false on Free); (b) free
  self-poll GraphQL → email; (c) paid alerting.
- **Selected:** (b).
- **Rationale:** honest about free-tier limits; the sibling pack provides the query, this pack
  proves delivery end-to-end.

### DEC-09 — All proof artifacts redact via `redactForLog` + secret scan
- **Options:** (a) emit raw proof; (b) redact + scan.
- **Selected:** (b) (PROMPT constraint C-1).

## Assumptions (labeled A-1..A-5 in `02_…`)

Validated where possible; A-1 (sibling pack lands) and A-2 (free external cron host) carry the
most residual risk (R-04, R-08).

## Open decisions (owner-gated)

| ID | Decision | Owner | Options | Recommendation | Impact if unresolved |
|---|---|---|---|---|---|
| `OPEN-ALERT-01` | Free external cron host for S-02/S-05 poller | owner | GitHub Actions scheduled / cron-job.org / 2nd free CF Worker | GitHub Actions scheduled (already in repo toolchain) | S-02/S-05 provider-backed proof blocked → GATE-02 |
| `OPEN-ALERT-02` | Enable paid alerting (PagerDuty/Datadog) | owner | defer / enable at traffic trigger | defer until 24/7 coverage demand | free-tier path used |
| `OPEN-RET-01` | Enable Logpush/Workers Paid for >3d log retention | owner | defer / enable at RCA-need trigger | defer; capture logs in first-24h review | RCA window tight on free |
| `OPEN-EVID-01` | Evidence-artifact store: gitignored-local vs R2 | owner | local (default) / R2 redacted namespace | local for pre-launch volume; R2 if volume grows | low impact either way |
| `OPEN-DEC-004` | Final retention TTL sign-off (counsel) | owner+counsel | accept drafts / adjust per class | accept drafts as interim | final TTL values; enforcement uses drafts meanwhile |

`OPEN-DEC-004` is inherited from the compliance followups; this pack does not own it but its
DATA-02/DATA-03 slices are gated on it for *final* values.
