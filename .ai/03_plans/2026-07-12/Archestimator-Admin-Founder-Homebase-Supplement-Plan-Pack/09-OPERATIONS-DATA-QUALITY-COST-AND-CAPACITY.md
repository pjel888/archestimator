# 09 — Operations, Data Quality, Cost, and Capacity

## 1. Objective

Give the founder one operational view that distinguishes:

- user-visible symptoms;
- underlying causes;
- urgent action;
- planned maintenance;
- capacity risk;
- data-integrity risk;
- provider truth.

The Admin should reduce noise, not centralize every raw log.

## 2. Operations information architecture

### Operations Home

- service status;
- current incidents;
- golden signals;
- failed/stale jobs;
- queue/backlog;
- uploads/scans;
- data-quality findings;
- release correlation;
- cost/capacity;
- backups/restore;
- provider links.

### Incidents

- active;
- contained;
- resolved;
- postmortem pending;
- recurrence.

### Jobs & Queues

- cron;
- queue;
- outbox;
- notification runs;
- uploads/scans;
- cleanup;
- analytics aggregation;
- backups/recovery operations.

The current `wrangler.jsonc` already binds DLQs for upload jobs and client-portal notifications. Admin must read backlog/age/delivery evidence when an authorized provider source exists; it must not plan a second queue system or describe configured DLQs as observed healthy.

### Data Quality

- open findings;
- entity integrity;
- migration/schema;
- reconciliation;
- repair history.

### Cost & Capacity

- current usage;
- thresholds;
- forecast;
- known free-tier/provider limits;
- growth drivers;
- cleanup opportunities.

## 3. Reliability model

### Golden signals

For user-facing surfaces:

- **Latency** — route/API/action duration, successful and failed separately.
- **Traffic** — requests, active users, key workflow volume.
- **Errors** — failed requests, client errors, policy/business failures.
- **Saturation** — storage, CPU/time, queue backlog, rate limits, object counts, provider quotas.

### Product-level symptoms

Infrastructure metrics are not enough.

Track symptoms such as:

- login unavailable;
- estimate load/edit failure;
- calculation/output mismatch;
- export failure;
- publication/share unavailable;
- recipient decision failure;
- email/invitation failure;
- upload/scan unavailable;
- support message send failure.

### Black-box versus white-box

- Black-box: real health checks on critical user workflows where safe.
- White-box: logs, binding operations, D1 queries, queue runs, error events.

Critical alerts prefer user-visible symptoms.

## 4. Health check maturity

### Level 0 — Configuration

Binding/environment key present.

### Level 1 — Connectivity

D1 `SELECT 1`, provider/API reachable.

### Level 2 — Capability

R2 safe test object lifecycle, Queue enqueue/consume test, Email controlled test, DO request, Images transform.

### Level 3 — Product workflow

Authenticated route and representative read/write path.

### Level 4 — End-to-end outcome

Customer-facing result delivered and observed.

Admin must label the achieved level. Current binding checks are Level 0, D1 query is Level 1.

## 5. Incident model

Current `operational_incidents` supports severity/status/owner/summary/root cause/request IDs.

Expand workflow:

```text
Detected
→ Declared
→ Investigating
→ Contained
→ Monitoring
→ Resolved
→ Postmortem due
→ Closed
```

MVP may map to current states with supplemental events.

### Incident detail

- severity;
- user impact;
- start/detection/declaration/containment/resolution;
- affected services/routes/entities;
- current owner;
- timeline;
- related release;
- related errors/support/signals;
- mitigations;
- root cause;
- follow-ups;
- customer communication;
- postmortem.

### Severity

- **Sev 1:** broad outage, security/privacy/data-loss, core workflow unavailable.
- **Sev 2:** serious degradation or multiple important users blocked.
- **Sev 3:** limited degradation, workaround exists.

### Incident actions

- declare;
- update impact;
- add event;
- contain;
- resolve;
- link release/error/signal;
- create follow-up;
- start customer communication;
- open provider logs.

No complex on-call rotation is needed for one operator.

## 6. Operational jobs

A normalized job read model should cover:

- job name;
- type;
- source;
- run ID;
- scheduled/started/finished;
- status;
- progress/counts;
- retry;
- idempotency key;
- error class;
- next run;
- safe retry capability;
- source link.

### Job statuses

- scheduled;
- queued;
- running;
- succeeded;
- partially succeeded;
- failed retryable;
- failed permanent;
- cancelled;
- stale.

### Stale detection

A job becomes stale when:

- running beyond type-specific threshold;
- queued beyond threshold;
- heartbeat absent;
- occurrence expected but no run exists.

## 7. Queue and outbox operations

Show:

- backlog;
- oldest age;
- throughput;
- retry count;
- permanent failure/DLQ;
- poison-message dedupe;
- consumer last success;
- action item when threshold exceeded.

D1 remains the durable state for business jobs. Queue is dispatch.

Safe actions:

- retry one eligible run;
- retry selected permanent failures after cause resolved;
- cancel scheduled run;
- reconcile missing delivery;
- inspect payload metadata with sensitive fields redacted.

## 8. Upload and scan operations

Integrate existing workshop tools.

Home summaries:

- upload attempts/success/failure;
- scan pending/failed;
- cleanup backlog;
- storage growth;
- quota/backpressure;
- overrides requiring review;
- temporary overrides expiring.

Action Inbox items:

- permanent scan failure;
- unsupported format awaiting founder;
- cleanup failure;
- upload quota threshold;
- suspicious repeated failure.

Keep current mutation owners until Admin migration is deliberate.

## 9. Data-quality system

### Finding contract

```ts
type AdminDataQualityFinding = {
  id: string;
  checkKey: string;
  entityType: string;
  entityId: string | null;
  severity: "critical" | "high" | "medium" | "low";
  state: "open" | "acknowledged" | "repairing" | "resolved" | "accepted_risk" | "false_positive";
  title: string;
  summary: string;
  evidenceJson: string;
  firstSeenAt: string;
  lastSeenAt: string;
  occurrenceCount: number;
  repairKey: string | null;
  sourceRevision: string | null;
};
```

### Initial checks

#### Identity

- auth user missing profile;
- profile missing auth user;
- duplicate normalized email;
- role/status mismatch;
- active allowlist without account after threshold;
- suspended/banned user with active sessions;
- last admin/founder floor.

#### Membership

- membership references missing user/workspace/project/estimate;
- workspace without owner;
- corporate account manager-floor violation;
- pending invite duplicate/expired.

#### Estimates

- row missing parent node;
- row/estimate/project mismatch;
- invalid revision;
- impossible quantity/cost fields;
- broken source linkage;
- duplicated stable component identity;
- orphan attachment/image;
- calculation parity discrepancy where check exists.

#### Publications

- selected estimate not in project;
- publication recipient mismatch;
- active publication with invalid snapshot;
- response/comment target absent;
- delivery state inconsistent;
- stale source versus issued snapshot;
- revoked/expired contradictions.

#### Notifications/support

- definition without run/delivery where required;
- stuck pending delivery;
- duplicate idempotency key;
- support unread/status inconsistency;
- send_failed without action item.

#### Operations

- missing expected cron run;
- queue/outbox stale;
- backup/rehearsal overdue;
- migration ledger mismatch.

## 10. Checks and schedules

Checks can run:

- on domain mutation;
- scheduled daily;
- on-demand;
- during release readiness.

Store compact findings, not every successful scan row.

A check records:

- version;
- started/finished;
- scope;
- scanned count;
- findings count;
- error;
- source revision.

## 11. Repair commands

A repair command is registered code, not arbitrary SQL.

```ts
type AdminRepairDefinition = {
  key: string;
  title: string;
  capability: string;
  supportsDryRun: boolean;
  maxAffectedRows: number;
  requiresFreshAuth: boolean;
  reversible: boolean;
  description: string;
};
```

Execution flow:

1. select finding;
2. run dry preview;
3. show affected records and exact mutation;
4. require reason;
5. fresh auth if needed;
6. idempotency key;
7. execute bounded transaction/batch;
8. verify postcondition;
9. audit;
10. rerun check;
11. resolve or report partial failure.

## 12. Migration and schema center

Show:

- application expected migration;
- D1 applied migration;
- pending migrations;
- last migration time;
- failed/partial evidence;
- schema compatibility;
- restore/backup state;
- direct link/runbook.

Admin must not apply arbitrary migrations from the browser in MVP.

Later, a curated “apply known migration” control could exist only with:

- explicit standing authorization;
- fresh auth;
- preview;
- backup;
- environment confirmation;
- provider operation ID;
- audit;
- fix-forward plan.

## 13. Backup and recovery

Surface:

- latest D1 backup/snapshot evidence;
- retention;
- last restore rehearsal;
- rehearsal result;
- R2 object lifecycle/backup policy;
- critical export availability;
- overdue action.

A passing script artifact is not equal to provider recovery proof. Label evidence level.

## 14. Cost and capacity

### Metrics

#### Workers

- requests;
- errors;
- CPU time;
- wall time/duration;
- subrequests/binding calls where available.

#### D1

- database size;
- rows by major table;
- reads/writes;
- query duration/scan risk from local metrics;
- backup/restore;
- approaching limits.

#### R2 / Images

- storage bytes;
- object count;
- operations;
- transform count;
- growth rate;
- orphan/cleanup candidates.

#### Queues

- messages;
- retries;
- backlog;
- oldest age;
- operations/cost.

#### Email

- attempted;
- accepted/materialized;
- delivered evidence where available;
- failures;
- unsubscribes;
- volume.

#### AI

- model;
- requests;
- tokens;
- estimated cost;
- feature/user attribution;
- failure/latency.

### Source status

Each metric is:

- provider read;
- locally measured;
- estimated;
- manually entered;
- unavailable.

### Thresholds

Examples:

- 70% capacity: monitor;
- 85%: action;
- projected exhaustion within 30 days: urgent;
- unexplained cost spike: review.

Never hardcode provider limits without current source verification.

## 15. Cleanup opportunities

Admin may surface:

- orphan upload objects;
- expired temporary overrides;
- stale notification data per retention;
- old feature flags;
- dead saved views;
- inactive tokens/sessions;
- stale generated evidence;
- oversized event tables.

Cleanup must follow retention/legal policy.

## 16. Provider integration strategy

### MVP

- local first-party data;
- exact provider links;
- manual/as-of status;
- no blocking provider fetch on Home.

### P1

- scheduled credentialed provider snapshots;
- short cache;
- last success/error;
- action items on failure.

Every activated provider adapter also exposes one normalized integration-health record:

```ts
type AdminIntegrationHealth = {
  provider: string;
  capability: "traffic" | "billing" | "logs" | "metrics" | "deployments" | "email" | "queue";
  mode: "link_only" | "pull" | "webhook" | "hybrid";
  status: "not_configured" | "healthy" | "delayed" | "degraded" | "failed" | "disabled";
  sourceAsOf: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lagSeconds: number | null;
  pendingCount: number | null;
  failedCount: number | null;
  reconcileAction: string | null;
};
```

Webhook receipt, provider acceptance, local materialization, and user-visible outcome are distinct states. A provider failure creates an Action Inbox item only when the founder has a concrete next action.

### P2

- deeper query and controlled operations.

Cloudflare’s own observability remains the raw investigation system. Admin summarizes the health and links to it.

## 17. Metrics

- mean time to detect;
- mean time to acknowledge;
- mean time to contain/resolve;
- recurring incident rate;
- stale job count/age;
- repair success/partial failure;
- open data-quality findings by severity;
- backup/restore freshness;
- capacity threshold breaches;
- cost trend;
- alert/action precision;
- founder time spent on repeated toil.

## 18. MVP boundary

MVP:

- actionable operational summary;
- incident create/update;
- jobs/cron/DLQ aggregation;
- Workers invocation-error and log-freshness summary with exact Cloudflare deep links;
- provider integration-health states for every activated adapter;
- existing upload/scan links;
- deterministic data-quality checks;
- dry-run repairs for a small allowlist;
- backup/restore freshness;
- privacy-request queue and overdue-state visibility;
- local cost/capacity with provider links.

Later:

- provider command execution;
- full OTel warehouse;
- automatic root-cause AI;
- complex SLO/error-budget policy;
- multi-user on-call.
