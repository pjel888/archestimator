# 08 — Release, Launch, and Feature Delivery

## 1. Objective

Make every production change understandable, reversible, and connected to customer/product impact.

## 2. Current gap

The existing plan treats release readiness as implementation and hosted-proof units.

The founder needs a persistent Admin product surface that answers:

- What is running in production?
- Which commit/config/migrations produced it?
- What changed?
- What is still unproven?
- Which flags control exposure?
- Is anything degrading?
- How do I roll back?
- Which customers/signals does this release affect?

## 3. Release Center

Route:

`/admin/releases`

Views:

- Current production
- Draft releases
- Ready / blocked
- Deploying
- Health window
- Degraded
- Rolled back
- History

## 4. Release record

```ts
type AdminReleaseRecord = {
  id: string;
  versionLabel: string;
  environment: "preview" | "staging" | "production";
  status: "draft" | "ready" | "blocked" | "deploying" | "deployed" | "monitoring" | "healthy" | "degraded" | "rolled_back" | "closed";
  commitSha: string | null;
  branch: string | null;
  deploymentId: string | null;
  deploymentUrl: string | null;
  createdAt: string;
  deployedAt: string | null;
  monitoringEndsAt: string | null;
  summary: string;
  risks: string[];
  rollbackReference: string | null;
  decision: "pending" | "go" | "no_go" | "rollback";
  decisionReason: string | null;
  decidedAt: string | null;
  sourceLinks: AdminExternalLink[];
};
```

## 5. Release checklist

Typed checks:

### Code

- intended commit/branch;
- required review state;
- required CI status;
- no unresolved critical security issue;
- generated artifacts current where applicable.

### Database

- migrations identified;
- target schema known;
- backup/recovery state;
- migration compatibility;
- fix-forward/rollback strategy;
- data backfill state.

### Runtime

- required Cloudflare bindings/secrets;
- queue/cron compatibility;
- feature flag defaults;
- route protection;
- capacity consideration.

### Product

- acceptance criteria;
- critical workflows;
- calculations/output parity if touched;
- accessibility if relevant;
- release notes;
- customer communication.

### Operations

- logs/metrics available;
- support owner;
- incident/rollback runbook;
- post-deploy health window;
- known degraded capability.

### Governance

- privacy/retention impact;
- terms/claims update;
- owner/legal approval where required.

Checks have:

- state: pass/fail/warn/not_applicable/not_evaluated;
- evidence link;
- owner;
- timestamp;
- waiver reason.

No green release is inferred from absent evidence.

## 6. Go / no-go

A production decision records:

- exact release;
- blockers;
- warnings;
- known gaps;
- decision;
- reason;
- founder identity;
- timestamp;
- rollback plan.

A waiver is explicit and searchable.

## 7. Deployment integration

Archestimator deploys on Cloudflare Workers/OpenNext.

MVP:

- manually or script-created release record;
- GitHub commit link;
- Cloudflare deployment/log links;
- existing release-gate evidence links;
- status updated by founder or bounded webhook/script.

Later:

- GitHub webhook;
- Cloudflare API deployment read;
- automatic commit/deployment association;
- health-window status.

Provider APIs cannot be a hard dependency for the first release.

## 8. Post-deploy health window

For a configurable period after deploy, show:

- request/error/latency trend;
- client errors;
- Web Vitals;
- auth failures;
- critical workflow events;
- cron/queue failures;
- support/feedback spike;
- new incident;
- feature flag exposure/adoption.

A release can move:

- monitoring → healthy;
- monitoring → degraded;
- degraded → rolled back;
- degraded → healthy after fix.

## 9. Release correlation

Error/incident/support/signal records can reference release.

Correlation sources:

- occurred after deploy;
- affected route changed;
- same commit/source map;
- manual founder link;
- error system suspect commit where available.

Do not claim causality from temporal proximity alone.

## 10. Rollback

Admin does not need to execute rollback in MVP.

It must show:

- last known healthy release;
- rollback command/runbook;
- provider link;
- migrations compatibility;
- flag kill switch;
- customer communication draft;
- incident link.

If rollback execution is later added:

- fresh auth;
- exact target;
- impact;
- dual confirmation;
- provider operation ID;
- audit;
- post-rollback health check.

## 11. Feature delivery

Expand current boolean flags into an operational registry.

### Feature registry

```ts
type AdminFeatureDefinition = {
  key: string;
  name: string;
  description: string;
  owner: string;
  lifecycle: "planned" | "development" | "internal" | "early_access" | "rolling_out" | "general" | "sunsetting" | "retired";
  risk: "low" | "medium" | "high";
  consumerPaths: string[];
  createdAt: string;
  reviewAt: string | null;
  expiresAt: string | null;
  releaseId: string | null;
};
```

### Flag state

MVP:

- boolean;
- specific user/account allowlist;
- optional rollout percentage only if evaluation is deterministic and server-compatible;
- starts/expires;
- kill switch;
- reason;
- updated by;
- audit.

### Flag hygiene

Action items:

- past review date;
- expired;
- no consumer;
- always on/general;
- always off;
- no exposure data;
- blocking old code deletion.

## 12. Early access

A feature can define:

- eligible cohort;
- enrolled users/accounts;
- invited;
- enabled;
- feedback request;
- opt-out;
- release;
- success metric.

Do not build full self-serve early access until needed.

## 13. Experiments

Later/P2.

Required before implementation:

- hypothesis;
- primary metric;
- guardrail metrics;
- unit of assignment;
- exposure event;
- sample/decision rule;
- duration;
- data privacy;
- rollback.

Do not present feature-flag usage as an experiment without proper assignment/exposure/analysis.

## 14. Release notes and changelog

Release record generates:

- internal technical summary;
- founder support summary;
- customer-facing change draft;
- affected cohorts;
- known limitations;
- follow-up signals.

AI can draft from commits/PRs/signals, but founder approves.

## 15. Launch center

For a major launch, aggregate:

- product readiness;
- provider readiness;
- data/migration;
- support;
- legal/privacy;
- documentation;
- customer cohort;
- communications;
- rollback;
- monitoring;
- owner decisions.

Reuse current launch readiness artifacts rather than copying them into free text.

## 16. Product metrics

- releases per period;
- lead time from ready to production;
- blocked release reasons;
- rollback rate;
- incidents by release;
- errors/support after release;
- flag age;
- feature adoption;
- close-loop completion;
- deployment-to-healthy time.

## 17. MVP boundary

MVP:

- release records;
- checklist;
- go/no-go;
- commit/provider links;
- flags/release association;
- post-deploy health summary from local data;
- rollback reference;
- release notes;
- signal linkage.

Later:

- deployment API execution;
- rolling rollout automation;
- statistical experiments;
- autonomous release agent;
- multi-approver workflow.
