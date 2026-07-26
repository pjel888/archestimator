# Execution Handoff

## Intended user

A lead coding agent or engineering lead implementing the plan in `pjel888/archestimator`.

## First actions

From repository root:

```powershell
Get-Content -Raw AGENTS.md
Get-Content -Raw .ai/00_system/PLAN_PACK_EXECUTION_POLICY.md
Get-Content -Raw .ai/00_system/BETA_QUALITY_ENGINEERING_PROTOCOL.md
Get-Content -Raw .ai/00_system/VALIDATION_MATRIX.md
bun run supermemory:ensure
```

Copy this folder to:

```text
.ai/03_plans/2026-07-26/Project-Ledger-Commitment-Timeline/
```

Then:

```powershell
bun run validate:plan-pack -- --write .ai/03_plans/2026-07-26/Project-Ledger-Commitment-Timeline
```

Read:

```powershell
Get-Content -Raw .ai/03_plans/2026-07-26/Project-Ledger-Commitment-Timeline/00-PLAN.md
Get-Content -Raw .ai/03_plans/2026-07-26/Project-Ledger-Commitment-Timeline/01-CURRENT-STATE-AND-BLAST-RADIUS.md
Get-Content -Raw .ai/03_plans/2026-07-26/Project-Ledger-Commitment-Timeline/08-IMPLEMENTATION-WORKSTREAMS-AND-TASKS.md
```

## Baseline refresh

Before editing:

```powershell
git status --short
git rev-parse HEAD
git diff --stat
git diff --check
```

Record:

- current head;
- merge base;
- inherited dirty paths;
- task-owned paths;
- overlapping paths;
- scoped status/diff hashes.

Update `plan-pack.json` baseline and artifact hashes through the repository validator. Do not hand-edit stale hashes after content changes if `--write` can safely refresh them.

## Graph/source impact

Use current GitNexus workflow before central edits.

At minimum inspect:

```text
publishClientPortalIssue
publishClientPortalDraft
submitClientPortalDecision
resolveClientPortalPublicContext
evaluateClientPortalPolicy
readWorkspacePublicationsRoster
readProjectActivityFeed
recordUploadAsset
```

If graph evidence is stale, reindex according to `AGENTS.md`.

Search source directly for:

```text
project_publications
client_portals
current_issue_id
superseded
client_portal_issues
client_portal_decisions
client_portal_audit_events
CLIENT_PORTAL_CAPABILITIES
CLIENT_PORTAL_RECIPIENT_ROLE_TEMPLATES
client_portal_legacy_mappings
client_portal_legacy_write_freeze
upload_assets
upload_sessions
component-attachment
```

## Unit execution

Start only with:

```text
UNIT-001
```

Do not begin UI work while schema/state contracts are unsettled.

For each unit:

1. confirm dependencies are VERIFIED;
2. assign one writer per shared central file;
3. mark unit IN_PROGRESS;
4. record owned paths;
5. implement smallest coherent slice;
6. run focused evidence;
7. rerun invalidated evidence after later edits;
8. record review where required;
9. mark VERIFIED only when exit condition and mapped evidence pass;
10. advance `next_unit`.

## Recommended lane allocation

### Lead/integrator

Owns:

- plan state;
- central contracts;
- integration;
- requirement/evidence audit;
- final report.

### Schema/domain lane

Owns:

- migrations;
- contracts;
- state machines;
- backfills.

### Upload/artifact lane

Owns:

- upload policy;
- artifact repository;
- R2 routes;
- viewer.

### Request lane

Owns:

- request service;
- public request routes;
- request UI.

### Issue/baseline lane

Owns:

- issue drafts;
- package publication;
- change set;
- decision/baseline.

### Timeline lane

Owns:

- commitment events;
- internal timeline;
- public timeline projection.

### Access lane

Owns:

- roles;
- policy;
- exposures;
- security matrix.

### Publisher/cutover lane

Owns:

- workspace command center;
- legacy migration;
- onboarding copy.

### Review lanes

- read-only quality reviewer;
- distinct read-only security reviewer.

Avoid parallel writes to:

```text
src/lib/client-portal/contracts.ts
src/lib/client-portal/policy.ts
src/lib/client-portal/issue-builder.ts
src/lib/client-portal/publish-service.ts
src/lib/client-portal/decision-service.ts
src/lib/client-portal/public-repository.ts
src/components/client-portal/ClientPortalShell.tsx
migrations/*
```

## Evidence organization

Inside plan folder:

```text
evidence/
├── baseline/
├── migrations/
├── uploads/
├── requests/
├── issues/
├── baselines/
├── timeline/
├── policy/
├── legacy/
├── browser/
├── performance/
└── reviews/
```

Immutable machine evidence may live in repository `artifacts/quality` according to current quality tooling. The plan folder can contain summaries/links, not duplicated mutable evidence.

## Required implementation notes

### Schema note

Before each migration:

- current latest migration number;
- table/column collision;
- foreign-key behavior;
- preflight assertions;
- upgrade fixture;
- restore/fix-forward strategy.

### Public route note

For each public endpoint:

- token/session;
- role capability;
- resource relationship;
- policy;
- idempotency;
- rate limit;
- CSRF;
- no-store;
- sanitized DTO;
- error/existence leakage.

### Event note

For each domain mutation:

- authoritative source write;
- event type;
- correlation/idempotency;
- exposure;
- audit;
- notification;
- recovery if one fails.

### Publish note

For issue publication:

- draft revision;
- source revision/hash;
- artifact scan/hash;
- request version hash;
- baseline/comparison;
- statement count;
- final content hash;
- idempotency;
- no partial issue.

## Resume ledger

After every meaningful unit, update:

```markdown
## Resume state — <timestamp>

- Head:
- Unit:
- Status:
- Owned paths:
- Completed:
- Evidence:
- Open failures:
- Review:
- Next exact action:
- Next unit:
```

Also update `plan-pack.json`.

Do not rely on chat memory alone.

## Change control

### Allowed local decisions

An implementation agent may resolve an open non-blocking decision using the recorded decision rule.

### Requires product re-alignment

Escalate before changing:

- project/portal/workspace hierarchy;
- multi-artifact Issue;
- client request day-one scope;
- active baseline semantics;
- deterministic diff precedence;
- append-only exposed history;
- domain/permission/approval separation;
- modern Client Portal as target;
- AI draft-only boundary.

## Legacy rule

No new user-facing legacy publication authoring after the modern path is ready.

Do not delete legacy tables or public read support in this plan.

## AI rule

UNIT-013 is additive. If AI infrastructure is unavailable or fails acceptance:

- record explicit deferral;
- keep deterministic summary;
- do not block core completion;
- do not weaken issue package or narrative review.

## Viewer rule

The PDF viewer decision is a bounded spike. If PDF.js fails the defined compatibility/bundle gates:

- use safe native inline preview;
- keep artifact-level discussion;
- mark page-level discussion deferred;
- do not block artifacts, requests, issues, or timeline.

## Local validation cadence

### After contract/schema changes

- focused migration and contract tests;
- type check on affected paths;
- plan traceability.

### After each domain unit

- focused service/repository tests;
- concurrency/idempotency cases;
- relevant security checks.

### After each UI unit

- component tests;
- keyboard/a11y;
- focused browser journey;
- source boundary checks.

### Integrated

```powershell
bun run quality:critical
```

Also run explicit focused commands from the quality plan and any required Workers/migration/browser proofs not automatically captured.

## Independent review handoff

Quality reviewer receives:

- plan;
- diff;
- migration proof;
- focused results;
- Q2 manifest;
- known limitations.

Security reviewer receives:

- public route map;
- token/session flow;
- RBAC/exposure matrix;
- upload flow;
- R2 routes;
- retention;
- AI prompt boundary;
- negative tests.

Reviewers cannot be the author of the reviewed surface.

## Final report

Report:

1. implemented architecture;
2. requirements completed;
3. units and commits/local state;
4. schema/migration/backfill;
5. public/internal route changes;
6. legacy cutover state;
7. evidence commands and artifacts;
8. quality/security review verdicts;
9. AI/viewer decisions;
10. deferred items;
11. remaining risk;
12. hosted/provider work not performed;
13. exact next action if not complete.

## Stop/failure states

### PASS

All core units verified and Q2 aggregate pass.

### FAIL

A required test/evidence or high/critical finding is red. Fix cause.

### QUALITY_BLOCKED

Only an exact external/hosted/ownership boundary remains after all safe local work. Record it honestly.

### TECH_BLOCKED

A core implementation requirement is impossible after materially different valid local approaches fail. Optional AI/page-comments do not qualify.

### AUTH_BLOCKED

A required external action lacks explicit authorization. Do not perform it.

## Do not do

- do not implement a third publication stack;
- do not make workspace Publisher the master file library;
- do not expose internal ledger by default;
- do not use public opaque IDs for diff;
- do not mutate an issued artifact version;
- do not replace baseline on publication;
- do not let request submission authorize work;
- do not treat AI prose as fact;
- do not silently delete exposed history;
- do not weaken Q2 to finish faster;
- do not claim production or legal proof without evidence.
